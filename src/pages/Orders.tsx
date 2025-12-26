import { useEffect, useMemo, useState, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, X, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getOrders, deleteOrder, getOrderItems, subscribeToOrders, Order } from "@/services/firebase/orderService";
import { getCustomerById } from "@/services/firebase/customerService";
import { Timestamp } from "firebase/firestore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateOrderDialog } from "@/components/Orders/CreateOrderDialog";
import { OrderDetailModal } from "@/components/Orders/OrderDetailModal";
import { CustomerDetailModal } from "@/components/Customers/CustomerDetailModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { LoadingState } from "@/components/ui/loading-state";
import { CURRENCY_SYMBOLS, Currency } from "@/utils/currency";
import { useAuth } from "@/contexts/AuthContext";
import { canCreateResource, canDeleteResource, canUpdateResource } from "@/utils/permissions";
import { UserProfile } from "@/services/firebase/authService";

const Orders = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("order_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalData, setCustomerModalData] = useState<Awaited<ReturnType<typeof getCustomerById>> | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);


  // Gerçek zamanlı sipariş güncellemeleri için subscribe
  useEffect(() => {
    const filters: { status?: string } = {};
    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }
    
    // Gerçek zamanlı dinleme başlat
    const unsubscribe = subscribeToOrders(filters, async (firebaseOrders) => {
      try {
        // Null/undefined kontrolü
        if (!Array.isArray(firebaseOrders)) {
          setOrders([]);
          setTotalPages(1);
          setLoading(false);
          return;
        }
        
        // Performans için: totalAmount'u olanları önce işle, olmayanları sonra batch olarak işle
        // Önce totalAmount'u olanları filtrele
        const ordersWithTotal = firebaseOrders.filter(order => order?.totalAmount || order?.total_amount);
        const ordersWithoutTotal = firebaseOrders.filter(order => !order?.totalAmount && !order?.total_amount);
        
        // TotalAmount'u olanları hızlıca işle
        const processedWithTotal: Order[] = ordersWithTotal.map(order => ({
          ...order,
          totalAmount: order.totalAmount || order.total_amount,
          total_amount: order.totalAmount || order.total_amount,
        })) as Order[];
        
        // TotalAmount'u olmayanları batch olarak işle (performans için sadece görünen sayfa için)
        // Sadece görünen sayfadaki siparişler için totalAmount hesapla
        const startIndex = (page - 1) * 50;
        const endIndex = startIndex + 50;
        const visibleOrdersWithoutTotal = ordersWithoutTotal.slice(startIndex, endIndex);
        const ordersWithCalculatedTotals = await Promise.allSettled(
          visibleOrdersWithoutTotal.map(async (order) => {
            if (!order?.id) return null;
            try {
              const items = await getOrderItems(order.id);
              const calculatedTotal = (Array.isArray(items) ? items : []).reduce((sum, item) => {
                if (!item) return sum;
                const itemTotal = item.total || ((item.unitPrice || item.unit_price || 0) * (item.quantity || 0)) - (item.discount || 0);
                return sum + itemTotal;
              }, 0);
              
              const calculatedQuantity = (Array.isArray(items) ? items : []).reduce((sum, item) => sum + (item?.quantity || 0), 0);
              
              const taxRate = order.taxRate || order.tax_rate || 0;
              const subtotal = calculatedTotal;
              const taxAmount = subtotal * (taxRate / 100);
              const grandTotal = subtotal + taxAmount;
              
              return {
                ...order,
                totalAmount: grandTotal,
                total_amount: grandTotal,
                totalQuantity: calculatedQuantity,
                total_quantity: calculatedQuantity,
                subtotal: subtotal,
              } as Order;
            } catch (error: unknown) {
              // Sessizce handle et - performans için
              return {
                ...order,
                totalAmount: 0,
                total_amount: 0,
              } as Order;
            }
          })
        );
        
        // Görünmeyen siparişleri totalAmount=0 ile ekle
        const beforeVisible = ordersWithoutTotal.slice(0, startIndex).map(order => ({
          ...order,
          totalAmount: 0,
          total_amount: 0,
        })) as Order[];
        const afterVisible = ordersWithoutTotal.slice(endIndex).map(order => ({
          ...order,
          totalAmount: 0,
          total_amount: 0,
        })) as Order[];
        
        const calculatedOrders: Order[] = ordersWithCalculatedTotals
          .filter((result) => result.status === 'fulfilled' && result.value !== null)
          .map(result => (result as PromiseFulfilledResult<Order>).value);
        
        // Tüm siparişleri birleştir (sıralama: processedWithTotal, beforeVisible, calculatedOrders, afterVisible)
        const validOrders = [...processedWithTotal, ...beforeVisible, ...calculatedOrders, ...afterVisible];
        
        // Search ve sort işlemleri frontend'de yapılacak
        let filtered = validOrders;
        
        if (searchQuery) {
          const query = searchQuery.toLocaleLowerCase('tr-TR');
          filtered = filtered.filter((order) =>
            order.orderNumber?.toLocaleLowerCase('tr-TR').includes(query) ||
            order.customerName?.toLocaleLowerCase('tr-TR').includes(query) ||
            order.customerCompany?.toLocaleLowerCase('tr-TR').includes(query)
          );
        }
        
        // Sort
        filtered.sort((a, b) => {
          let aValue: unknown, bValue: unknown;
          if (sortBy === 'order_date') {
            aValue = a.orderDate || a.createdAt;
            bValue = b.orderDate || b.createdAt;
          } else if (sortBy === 'total') {
            aValue = a.totalAmount || 0;
            bValue = b.totalAmount || 0;
          } else if (sortBy === 'priority') {
            aValue = (a as Order & { priority?: number }).priority ?? 0;
            bValue = (b as Order & { priority?: number }).priority ?? 0;
          } else {
            aValue = a.orderNumber || '';
            bValue = b.orderNumber || '';
          }
          
          if (aValue instanceof Timestamp) aValue = aValue.toMillis();
          if (bValue instanceof Timestamp) bValue = bValue.toMillis();
          if (aValue instanceof Date) aValue = aValue.getTime();
          if (bValue instanceof Date) bValue = bValue.getTime();
          
          return sortOrder === 'asc' 
            ? (aValue > bValue ? 1 : -1)
            : (aValue < bValue ? 1 : -1);
        });
        
        // Pagination (startIndex ve endIndex zaten yukarıda hesaplandı)
        setOrders(filtered.slice(startIndex, endIndex));
        setTotalPages(Math.ceil(filtered.length / 50));
        setLoading(false);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Real-time orders update error:", error);
        }
        setLoading(false);
      }
    });
    
    // Cleanup: Component unmount olduğunda unsubscribe et
    return () => {
      unsubscribe();
    };
  }, [statusFilter, sortBy, sortOrder, searchQuery, page]);

  const handleShowCustomer = async (customerId: string | null) => {
    if (!customerId) return;
    try {
      const customer = await getCustomerById(customerId);
      if (customer) {
        setCustomerModalData(customer);
        setCustomerModalOpen(true);
      } else {
        toast.error("Müşteri bulunamadı");
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Get customer error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Müşteri bilgileri alınamadı");
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [statusFilter, sortBy, sortOrder, searchQuery]);

  // Permission kontrolü
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setCanCreate(false);
        setCanUpdate(false);
        setCanDelete(false);
        return;
      }

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email || "",
        emailVerified: user.emailVerified || false,
        fullName: user.fullName || "",
        displayName: user.fullName || "",
        phone: null,
        dateOfBirth: null,
        role: user.roles || [],
        createdAt: null,
        updatedAt: null,
      };

      const [canCreateOrder, canUpdateOrder, canDeleteOrder] = await Promise.all([
        canCreateResource(userProfile, "orders"),
        canUpdateResource(userProfile, "orders"),
        canDeleteResource(userProfile, "orders"),
      ]);

      setCanCreate(canCreateOrder);
      setCanUpdate(canUpdateOrder);
      setCanDelete(canDeleteOrder);
    };

    checkPermissions();
  }, [user]);

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "delivered":
      case "completed":
        return "default";
      case "in_production":
      case "in_progress":
      case "shipped":
      case "quality_check":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Taslak",
      pending: "Beklemede",
      confirmed: "Onaylandı",
      planned: "Planlanan",
      in_production: "Üretimde",
      in_progress: "Üretimde",
      quality_check: "Kalite Kontrol",
      on_hold: "Beklemede",
      completed: "Tamamlandı",
      shipped: "Kargoda",
      delivered: "Teslim Edildi",
      cancelled: "İptal",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800 border-gray-300",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      confirmed: "bg-blue-100 text-blue-800 border-blue-300",
      planned: "bg-indigo-100 text-indigo-800 border-indigo-300",
      in_production: "bg-orange-100 text-orange-800 border-orange-300",
      in_progress: "bg-orange-100 text-orange-800 border-orange-300",
      quality_check: "bg-cyan-100 text-cyan-800 border-cyan-300",
      on_hold: "bg-amber-100 text-amber-800 border-amber-300",
      completed: "bg-green-100 text-green-800 border-green-300",
      shipped: "bg-purple-100 text-purple-800 border-purple-300",
      delivered: "bg-emerald-100 text-emerald-800 border-emerald-300",
      cancelled: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const handleDelete = async () => {
    if (!selectedOrder) return;
    
    // Yetki kontrolü
    if (!canDelete) {
      toast.error("Sipariş silme yetkiniz yok.");
      setDeleteDialogOpen(false);
      return;
    }

    try {
      await deleteOrder(selectedOrder.id);
      toast.success("Sipariş silindi");
      // Real-time subscribe otomatik güncelleyecek
      setDeleteDialogOpen(false);
      setSelectedOrder(null);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Delete order error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Sipariş silinirken hata oluştu");
    }
  };

  const formatCurrency = (value?: number, currency?: Currency | string) => {
    if (value === undefined || value === null) {
      const symbol = currency ? (CURRENCY_SYMBOLS[currency as Currency] || "₺") : "₺";
      return `${symbol}0,00`;
    }
    
    const orderCurrency = (currency || "TRY") as Currency;
    const currencyCode = orderCurrency === "TRY" ? "TRY" : orderCurrency;
    const locale = orderCurrency === "TRY" ? "tr-TR" : "en-US";
    const symbol = CURRENCY_SYMBOLS[orderCurrency] || "₺";
    
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${symbol}${value.toFixed(2)}`;
    }
  };

  const getPriorityMeta = (priority?: number | null) => {
    if (priority === undefined || priority === null) {
      return { label: "Öncelik: 0", className: "bg-muted text-muted-foreground" };
    }
    if (priority >= 4) {
      return { label: `Öncelik: ${priority}`, className: "bg-destructive/15 text-destructive" };
    }
    if (priority >= 2) {
      return { label: `Öncelik: ${priority}`, className: "bg-amber-100 text-amber-800" };
    }
    return { label: `Öncelik: ${priority}`, className: "bg-slate-200 text-slate-800" };
  };

  if (loading) {
    return (
      <MainLayout>
        <LoadingState message="Siparişler yükleniyor..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-2 w-[90%] max-w-[90%] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] sm:text-[18px] font-semibold text-foreground">Siparişler</h1>
            <p className="text-muted-foreground mt-0.5 text-[11px] sm:text-xs">Sipariş takibi ve yönetimi</p>
          </div>
          {canCreate && (
            <Button 
              className="gap-1 w-full sm:w-auto min-h-[36px] sm:min-h-8 text-[11px] sm:text-xs" 
              onClick={() => {
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Yeni Sipariş</span>
              <span className="sm:hidden">Yeni</span>
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-1.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
              {/* Arama Kutusu */}
              <div className="flex-1 min-w-0 w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]">
                <SearchInput
                  placeholder="Sipariş ara..."
                  className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Durum Filtresi */}
              <div className="w-full sm:w-auto sm:min-w-[160px] md:min-w-[180px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Durum Filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Durumlar</SelectItem>
                    <SelectItem value="draft">Taslak</SelectItem>
                    <SelectItem value="pending">Beklemede</SelectItem>
                    <SelectItem value="confirmed">Onaylandı</SelectItem>
                    <SelectItem value="planned">Planlanan</SelectItem>
                    <SelectItem value="in_production">Üretimde</SelectItem>
                    <SelectItem value="in_progress">Üretimde</SelectItem>
                    <SelectItem value="quality_check">Kalite Kontrol</SelectItem>
                    <SelectItem value="on_hold">Beklemede</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="shipped">Kargoda</SelectItem>
                    <SelectItem value="delivered">Teslim Edildi</SelectItem>
                    <SelectItem value="cancelled">İptal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sıralama */}
              <div className="w-full sm:w-auto sm:min-w-[160px] md:min-w-[180px]">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Sırala" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order_date">Tarihe Göre</SelectItem>
                    <SelectItem value="total">Tutara Göre</SelectItem>
                    <SelectItem value="priority">Önceliğe Göre</SelectItem>
                    <SelectItem value="order_number">Sipariş No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sıralama Yönü */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              >
                {sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" /> : <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />}
                <span className="hidden sm:inline">{sortOrder === "asc" ? "Artan" : "Azalan"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Responsive Table View - Her zaman görünür */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <Table className="min-w-[800px] sm:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] font-semibold px-1.5 py-1">Sipariş No</TableHead>
                    <TableHead className="text-[11px] font-semibold px-1.5 py-1 hidden md:table-cell">Müşteri</TableHead>
                    <TableHead className="text-[11px] font-semibold px-1.5 py-1 hidden lg:table-cell">Tarih</TableHead>
                    <TableHead className="text-[11px] font-semibold px-1.5 py-1">Durum</TableHead>
                    <TableHead className="text-[11px] font-semibold px-1.5 py-1 hidden xl:table-cell">Öncelik</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold px-1.5 py-1">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell 
                        className="text-[11px] font-medium px-1.5 py-1.5 cursor-pointer"
                        onClick={() => {
                          setSelectedOrder(order);
                          setDetailModalOpen(true);
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span>{order.order_number}</span>
                          <span className="md:hidden text-[10px] text-muted-foreground">
                            {order.customer_name || "-"}
                          </span>
                          <span className="lg:hidden text-[10px] text-muted-foreground">
                            {order.order_date ? new Date(order.order_date).toLocaleDateString("tr-TR") : "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] font-medium px-1.5 py-1.5 hidden md:table-cell">
                        <button
                          type="button"
                          className="text-left hover:text-primary focus:outline-none truncate max-w-[200px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowCustomer(order.customer_id);
                          }}
                        >
                          {order.customer_name || "-"}
                          {order.customer_company && (
                            <span className="text-muted-foreground"> - {order.customer_company}</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-[11px] font-medium px-1.5 py-1.5 hidden lg:table-cell">
                        {order.order_date ? new Date(order.order_date).toLocaleDateString("tr-TR") : "-"}
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5">
                        <Badge className={`${getStatusColor(order.status)} text-[10px]`}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-2 sm:py-3 hidden xl:table-cell">
                        <Badge className={`${getPriorityMeta(order.priority || 0).className} text-[10px]`}>
                          {getPriorityMeta(order.priority || 0).label}
                        </Badge>
                      </TableCell>
                      <TableCell 
                        className="text-right text-[11px] font-semibold px-1.5 py-1.5 cursor-pointer"
                        onClick={() => {
                          setSelectedOrder(order);
                          setDetailModalOpen(true);
                        }}
                      >
                        {formatCurrency(order.totalAmount || order.total_amount || 0, order.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
                        {searchQuery || statusFilter !== "all" ? "Arama sonucu bulunamadı" : "Henüz sipariş bulunmuyor"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col gap-2 px-3 py-2 border-t md:flex-row md:items-center md:justify-between">
                <div className="text-xs sm:text-sm text-muted-foreground text-center md:text-left">
                  Sayfa {page} / {totalPages}
                </div>
                <div className="flex gap-2 justify-center md:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          // Real-time subscribe otomatik güncelleyecek
          setCreateDialogOpen(false);
        }}
      />

      {selectedOrder && (
        <OrderDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          order={selectedOrder}
          onEdit={() => {
            // OrderDetailModal içinde düzenleme yapılacak
          }}
          onDelete={() => {
            setDetailModalOpen(false);
            setDeleteDialogOpen(true);
          }}
        />
      )}

      <CustomerDetailModal
        open={customerModalOpen}
        onOpenChange={setCustomerModalOpen}
        customer={customerModalData}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Siparişi sil?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Sipariş ve bağlı ürünler kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Orders;
