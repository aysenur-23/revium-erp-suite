import { useEffect, useMemo, useState, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, X, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable, ResponsiveTableColumn } from "@/components/shared/ResponsiveTable";
import { Card as ResponsiveCard } from "@/components/ui/card";
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
import { getPriorityMeta } from "@/utils/priority";

const Orders = () => {
  const isMobile = useIsMobile();
  const { user, isTeamLeader } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
<<<<<<< HEAD
  const [loading, setLoading] = useState(false); // Başlangıçta false - placeholder data ile hızlı render
=======
  const [loading, setLoading] = useState(true);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
    
<<<<<<< HEAD
    // Defer subscription: İlk render'dan 100ms sonra başlat (non-blocking)
    const timer = setTimeout(() => {
      setLoading(true);
      
      // Gerçek zamanlı dinleme başlat
      const unsubscribe = subscribeToOrders(filters, async (firebaseOrders) => {
=======
    // Gerçek zamanlı dinleme başlat
    const unsubscribe = subscribeToOrders(filters, async (firebaseOrders) => {
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD
=======
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
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        
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
        
<<<<<<< HEAD
        // İlk render için: totalAmount=0 ile göster, sonra hesapla
        const validOrdersInitial = [...processedWithTotal, ...beforeVisible, ...visibleOrdersWithoutTotal.map(o => ({ ...o, totalAmount: 0, total_amount: 0 })), ...afterVisible];
        
        // Defer totalAmount calculation: İlk render'dan sonra hesapla (200ms defer)
        setTimeout(async () => {
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
            } else if (sortBy === 'created_at') {
              aValue = a.createdAt;
              bValue = b.createdAt;
            } else if (sortBy === 'delivery_date') {
              aValue = a.deliveryDate || null;
              bValue = b.deliveryDate || null;
              // Null değerleri en sona al
              if (aValue === null && bValue === null) return 0;
              if (aValue === null) return 1;
              if (bValue === null) return -1;
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
          
          // Pagination
          setOrders(filtered.slice(startIndex, endIndex));
          setTotalPages(Math.ceil(filtered.length / 50));
        }, 200);
        
        // İlk render için: totalAmount=0 ile göster
        const validOrders = validOrdersInitial;
        
        // İlk render için: Search ve sort işlemleri frontend'de yapılacak
=======
        const calculatedOrders: Order[] = ordersWithCalculatedTotals
          .filter((result) => result.status === 'fulfilled' && result.value !== null)
          .map(result => (result as PromiseFulfilledResult<Order>).value);
        
        // Tüm siparişleri birleştir (sıralama: processedWithTotal, beforeVisible, calculatedOrders, afterVisible)
        const validOrders = [...processedWithTotal, ...beforeVisible, ...calculatedOrders, ...afterVisible];
        
        // Search ve sort işlemleri frontend'de yapılacak
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        let filtered = validOrders;
        
        if (searchQuery) {
          const query = searchQuery.toLocaleLowerCase('tr-TR');
          filtered = filtered.filter((order) =>
            order.orderNumber?.toLocaleLowerCase('tr-TR').includes(query) ||
            order.customerName?.toLocaleLowerCase('tr-TR').includes(query) ||
            order.customerCompany?.toLocaleLowerCase('tr-TR').includes(query)
          );
        }
        
<<<<<<< HEAD
        // Sort (totalAmount=0 olanlar için basit sort)
=======
        // Sort
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        filtered.sort((a, b) => {
          let aValue: unknown, bValue: unknown;
          if (sortBy === 'order_date') {
            aValue = a.orderDate || a.createdAt;
            bValue = b.orderDate || b.createdAt;
          } else if (sortBy === 'created_at') {
            aValue = a.createdAt;
            bValue = b.createdAt;
          } else if (sortBy === 'delivery_date') {
            aValue = a.deliveryDate || null;
            bValue = b.deliveryDate || null;
<<<<<<< HEAD
=======
            // Null değerleri en sona al
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            if (aValue === null && bValue === null) return 0;
            if (aValue === null) return 1;
            if (bValue === null) return -1;
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
        
<<<<<<< HEAD
        // Pagination
=======
        // Pagination (startIndex ve endIndex zaten yukarıda hesaplandı)
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
      
      // Ekip lideri her zaman ekleme/düzenleme/silme yapabilir
      if (isTeamLeader) {
        setCanCreate(true);
        setCanUpdate(true);
        setCanDelete(true);
      }
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


  if (loading) {
    return (
      <MainLayout>
        <LoadingState message="Siparişler yükleniyor..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
<<<<<<< HEAD
      <div className="space-y-2 w-full sm:w-[95%] md:w-[90%] lg:max-w-[1400px] mx-auto">
=======
      <div className="space-y-2 xs:space-y-2.5 sm:space-y-3 w-full max-w-full mx-auto px-1 xs:px-2">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Siparişler</h1>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">Sipariş takibi ve yönetimi</p>
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
                  className="w-full h-9 sm:h-10 text-[11px] sm:text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Durum Filtresi */}
              <div className="w-full sm:w-auto sm:min-w-[160px] md:min-w-[180px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full h-9 sm:h-10 text-[11px] sm:text-xs">
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
                  <SelectTrigger className="w-full h-9 sm:h-10 text-[11px] sm:text-xs">
                    <SelectValue placeholder="Sırala" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order_date">Sipariş Tarihine Göre</SelectItem>
                    <SelectItem value="created_at">Oluşturulma Tarihine Göre</SelectItem>
                    <SelectItem value="delivery_date">Teslimat Tarihine Göre</SelectItem>
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
                className="h-9 sm:h-10 text-[11px] sm:text-xs"
              >
                {sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" /> : <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />}
                <span className="hidden sm:inline">{sortOrder === "asc" ? "Artan" : "Azalan"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Responsive Table View */}
        <Card>
          <CardContent className="p-0">
            <ResponsiveTable
              data={orders}
              columns={[
                {
                  key: "order_number",
                  header: "Sipariş No",
                  accessor: (order) => (
                    <span className="font-medium text-sm whitespace-nowrap">
                      {order.order_number || "-"}
                    </span>
                  ),
                  priority: "high",
                  minWidth: 120,
                  sticky: true,
                  headerClassName: "text-left",
                  cellClassName: "text-left",
                },
                {
                  key: "status",
                  header: "Durum",
                  accessor: (order) => (
                    <Badge className={`${getStatusColor(order.status)} text-xs whitespace-nowrap`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  ),
                  priority: "high",
                  minWidth: 120,
                  headerClassName: "text-left",
                  cellClassName: "text-left",
                },
                {
                  key: "total",
                  header: "Tutar",
                  accessor: (order) => (
                    <span className="font-semibold whitespace-nowrap">
                      {formatCurrency(order.totalAmount || order.total_amount || 0, order.currency)}
                    </span>
                  ),
                  priority: "high",
                  minWidth: 120,
                  headerClassName: "text-left",
                  cellClassName: "text-left",
                },
                {
                  key: "customer_name",
                  header: "Müşteri",
                  accessor: (order) => (
                    <button
                      type="button"
                      className="hover:text-primary focus:outline-none truncate block text-left w-full"
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
                  ),
                  priority: "medium",
                  minWidth: 120,
                  headerClassName: "text-left",
                  cellClassName: "text-left",
                },
                {
                  key: "order_date",
                  header: "Tarih",
                  accessor: (order) => (
                    <span className="whitespace-nowrap">
                      {order.order_date ? new Date(order.order_date).toLocaleDateString("tr-TR") : "-"}
                    </span>
                  ),
                  priority: "medium",
                  minWidth: 120,
                  headerClassName: "text-left",
                  cellClassName: "text-left",
                },
                {
                  key: "priority",
                  header: "Öncelik",
                  accessor: (order) => (
                    <Badge className={`${getPriorityMeta(order.priority || 0).className} text-xs whitespace-nowrap`}>
                      {getPriorityMeta(order.priority || 0).label}
                    </Badge>
                  ),
                  priority: "low",
                  minWidth: 120,
                  headerClassName: "text-left",
                  cellClassName: "text-left",
                },
              ]}
              renderCard={(order) => (
                <ResponsiveCard 
                  className="p-3 sm:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedOrder(order);
                    setDetailModalOpen(true);
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{order.order_number}</h3>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {order.customer_name || "-"}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(order.status)} text-[10px] flex-shrink-0`}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {order.order_date ? new Date(order.order_date).toLocaleDateString("tr-TR") : "-"}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(order.totalAmount || order.total_amount || 0, order.currency)}
                      </span>
                    </div>
                  </div>
                </ResponsiveCard>
              )}
              emptyMessage={searchQuery || statusFilter !== "all" ? "Arama sonucu bulunamadı" : "Henüz sipariş bulunmuyor"}
              onRowClick={(order) => {
                setSelectedOrder(order);
                setDetailModalOpen(true);
              }}
              keyExtractor={(order) => order.id}
            />
            {totalPages > 1 && (
              <div className="flex flex-col gap-2 p-2 xs:p-3 border-t md:flex-row md:items-center md:justify-between">
                <div className="text-[11px] sm:text-xs text-muted-foreground text-center md:text-left">
                  Sayfa {page} / {totalPages}
                </div>
                <div className="flex gap-2 justify-center md:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 text-[11px] sm:text-xs min-h-[44px] sm:min-h-[36px]"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 text-[11px] sm:text-xs min-h-[44px] sm:min-h-[36px]"
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
          setSelectedOrder(null);
        }}
        order={selectedOrder} // Edit modu için mevcut sipariş
      />

      {selectedOrder && (
        <OrderDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          order={selectedOrder}
          onEdit={() => {
            // Düzenleme dialog'unu aç (selectedOrder zaten set edilmiş)
            setDetailModalOpen(false);
            setCreateDialogOpen(true);
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
