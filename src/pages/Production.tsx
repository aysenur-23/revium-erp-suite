import { useEffect, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import {
  Plus,
  Edit,
  Trash2,
  ArrowUp01,
  ArrowDown01,
  ChevronsUpDown,
  CalendarDays,
  Flag,
  UserCircle2,
  Package,
  Clock3,
  X,
  MoreVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getOrders, deleteOrder, updateOrder, Order, subscribeToOrders, getOrderItems } from "@/services/firebase/orderService";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { canCreateResource, canUpdateResource, canDeleteResource } from "@/utils/permissions";
import { UserProfile } from "@/services/firebase/authService";
import { CURRENCY_SYMBOLS, Currency } from "@/utils/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { CreateOrderDialog } from "@/components/Production/CreateOrderDialog";
import { OrderDetailModal } from "@/components/Production/OrderDetailModal";
import { LoadingState } from "@/components/ui/loading-state";

interface ProductionOrder {
  id: string;
  order_number?: string;
  orderNumber?: string;
  product_name?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  customer_name?: string | null;
  customerName?: string | null;
  customer_company?: string;
  status: string;
  due_date?: string;
  dueDate?: Date | string | Timestamp;
  priority?: number;
  created_at?: string;
  createdAt?: Date | Timestamp;
  totalAmount?: number;
  total_amount?: number;
  currency?: string;
}

type SortKey = "order_number" | "customer_name" | "due_date" | "status" | "priority" | "created_at";
type SortOrder = "asc" | "desc";

const statusOptions: Array<{ value: ProductionOrder["status"]; label: string }> = [
  { value: "planned", label: "Planlanan" },
  { value: "in_production", label: "Üretimde" },
  { value: "quality_check", label: "Kalite Kontrol" },
  { value: "completed", label: "Tamamlandı" },
  { value: "on_hold", label: "Beklemede" },
];

const Production = () => {
  const { isAdmin, user } = useAuth();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };
  const [statusFilter, setStatusFilter] = useState<"all" | ProductionOrder["status"]>("all");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [canCreate, setCanCreate] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [ordersWithItems, setOrdersWithItems] = useState<Map<string, { productName?: string; quantity?: number; unit?: string }>>(new Map());

  // Reset to page 1 when filters change
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [statusFilter, sortBy, sortOrder]);

  // Yetki kontrolleri
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setCanCreate(false);
        setCanUpdate(false);
        setCanDelete(false);
        return;
      }
      try {
        const userProfile: UserProfile = {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          fullName: user.fullName,
          displayName: user.fullName,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          role: user.roles,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        const [createAllowed, updateAllowed, deleteAllowed] = await Promise.all([
          canCreateResource(userProfile, "orders"),
          canUpdateResource(userProfile, "orders"),
          canDeleteResource(userProfile, "orders"),
        ]);
        setCanCreate(createAllowed);
        setCanUpdate(updateAllowed);
        setCanDelete(deleteAllowed);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Production permission check error:", error);
        }
        setCanCreate(false);
        setCanUpdate(false);
        setCanDelete(false);
      }
    };
    checkPermissions();
  }, [user]);

  // Gerçek zamanlı sipariş güncellemeleri için subscribe
  useEffect(() => {
    const filters: { status?: string } = {};
    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }
    
    setLoading(true);
    
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
        
        // Search ve sort işlemleri frontend'de yapılacak
        let filtered = firebaseOrders;
        
        if (searchQuery) {
          const query = searchQuery.toLocaleLowerCase('tr-TR');
          filtered = filtered.filter((order: Order) => {
            const orderNum = (order.order_number || order.orderNumber || "").toLocaleLowerCase('tr-TR');
            const customerName = (order.customer_name || order.customerName || "").toLocaleLowerCase('tr-TR');
            // Order'da productName yok, items'da var - bu yüzden sadece orderNumber ve customerName ile arama yapıyoruz
            return orderNum.includes(query) || customerName.includes(query);
          });
        }
        
        // Sort
        filtered.sort((a, b) => {
          let aValue: unknown, bValue: unknown;
          if (sortBy === 'created_at') {
            aValue = a.createdAt;
            bValue = b.createdAt;
          } else if (sortBy === 'priority') {
            // Priority için order'da priority field'ı yok, şimdilik createdAt kullan
            aValue = a.createdAt;
            bValue = b.createdAt;
          } else if (sortBy === 'due_date') {
            aValue = a.dueDate || a.deliveryDate;
            bValue = b.dueDate || b.deliveryDate;
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
        const startIndex = (page - 1) * 50;
        const endIndex = startIndex + 50;
        const paginatedOrders = filtered.slice(startIndex, endIndex);
        setOrders(paginatedOrders);
        setTotalPages(Math.ceil(filtered.length / 50));
        
        // Her sipariş için items'ı yükle (sadece görünür olanlar için)
        const itemsMap = new Map<string, { productName?: string; quantity?: number; unit?: string }>();
        await Promise.all(
          paginatedOrders.map(async (order: Order) => {
            try {
              const items = await getOrderItems(order.id);
              if (items.length > 0) {
                const firstItem = items[0];
                itemsMap.set(order.id, {
                  productName: firstItem.productName || firstItem.product_name || undefined,
                  quantity: firstItem.quantity,
                  unit: "Adet", // OrderItem'da unit yok, varsayılan olarak "Adet"
                });
              }
            } catch (error: unknown) {
              if (import.meta.env.DEV) {
                console.error(`Error loading items for order ${order.id}:`, error);
              }
            }
          })
        );
        setOrdersWithItems(itemsMap);
        setLoading(false);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Real-time production orders update error:", error);
        }
        setLoading(false);
      }
    });
    
    // Cleanup: Component unmount olduğunda unsubscribe et
    return () => {
      unsubscribe();
    };
  }, [statusFilter, sortBy, sortOrder, searchQuery, page]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_production":
        return "secondary";
      case "planned":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planned: "Planlanan",
      in_production: "Üretimde",
      quality_check: "Kalite Kontrol",
      completed: "Tamamlandı",
      on_hold: "Beklemede",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: "bg-indigo-100 text-indigo-800 border-indigo-300",
      in_production: "bg-orange-100 text-orange-800 border-orange-300",
      quality_check: "bg-cyan-100 text-cyan-800 border-cyan-300",
      completed: "bg-green-100 text-green-800 border-green-300",
      on_hold: "bg-amber-100 text-amber-800 border-amber-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

const formatDate = (value?: string | Date | Timestamp | null | undefined) => {
  if (!value) return "-";
  
  let date: Date | null = null;
  
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string") {
    date = new Date(value);
  } else if (value && typeof value === "object") {
    if ("seconds" in value && typeof value.seconds === "number") {
      date = new Date(value.seconds * 1000);
    } else if ("toDate" in value && typeof value.toDate === "function") {
      try {
        date = value.toDate();
      } catch {
        return "-";
      }
    } else if ("_seconds" in value && typeof value._seconds === "number") {
      date = new Date(value._seconds * 1000);
    }
  }
  
  if (!date || isNaN(date.getTime())) return "-";
  
  try {
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
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
const priorityOptions = [
  { value: 0, label: "0 - Düşük" },
  { value: 1, label: "1" },
  { value: 2, label: "2 - Orta" },
  { value: 3, label: "3" },
  { value: 4, label: "4 - Yüksek" },
  { value: 5, label: "5 - Kritik" },
];

  const handleDelete = async () => {
    if (!selectedOrder) return;

    try {
      await deleteOrder(selectedOrder.id);
      toast.success("Sipariş silindi");
      // Subscription otomatik güncelleyecek
      setDeleteDialogOpen(false);
      setSelectedOrder(null);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Delete production order error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Sipariş silinirken hata oluştu");
    }
  };

  const handleUpdateOrder = async (orderId: string, payload: Partial<ProductionOrder>) => {
    setUpdatingOrderId(orderId);
    try {
      // Yetki kontrolü
      if (!canUpdate && !isAdmin) {
        toast.error("Sipariş güncelleme yetkiniz yok.");
        setUpdatingOrderId(null);
        return;
      }
      // Üst yöneticiler için durum geçiş validasyonunu atla
      const skipValidation = isAdmin === true || canUpdate;
      await updateOrder(orderId, payload as Partial<Order>, user?.id, skipValidation);
      toast.success("Sipariş güncellendi");
      // Subscription otomatik güncelleyecek
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Update order error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Sipariş güncellenemedi");
    } finally {
      setUpdatingOrderId(null);
    }
  };


  if (loading) {
    return (
      <MainLayout>
        <LoadingState message="Üretim siparişleri yükleniyor..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-2 w-[90%] max-w-[90%] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] sm:text-[18px] font-semibold text-foreground">Üretim Siparişleri</h1>
            <p className="text-muted-foreground mt-0.5 text-[11px] sm:text-xs">Üretim süreçlerini yönetin</p>
          </div>
          {canCreate && (
            <Button className="gap-1 w-full sm:w-auto min-h-[36px] sm:min-h-8 text-[11px] sm:text-xs" onClick={() => setCreateDialogOpen(true)}>
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
                <Select value={statusFilter === "all" ? "all" : statusFilter} onValueChange={(value) => setStatusFilter(value as Order["status"] | "all")}>
                  <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Durum Filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Durumlar</SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sıralama */}
              <div className="w-full sm:w-auto sm:min-w-[160px] md:min-w-[180px]">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortKey)}>
                  <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Sırala" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Tarihe Göre</SelectItem>
                    <SelectItem value="priority">Önceliğe Göre</SelectItem>
                    <SelectItem value="due_date">Termin Tarihine Göre</SelectItem>
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
                {sortOrder === "asc" ? <ArrowUp01 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" /> : <ArrowDown01 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />}
                <span className="hidden sm:inline">{sortOrder === "asc" ? "Artan" : "Azalan"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Responsive Table View - Her zaman görünür */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="inline-block min-w-full align-middle">
                <Table className="min-w-[1000px] sm:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] font-semibold px-1.5 py-1">Sipariş No</TableHead>
                    <TableHead className="text-[11px] font-semibold px-1.5 py-1 hidden md:table-cell">Müşteri</TableHead>
                    <TableHead className="text-[11px] font-semibold px-1.5 py-1 hidden lg:table-cell">Termin</TableHead>
                    <TableHead className="text-[11px] font-semibold px-1.5 py-1">Durum</TableHead>
                    <TableHead className="text-[11px] font-semibold px-1.5 py-1 hidden xl:table-cell">Öncelik</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold px-1.5 py-1">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const priorityMeta = getPriorityMeta(order.priority);
                    return (
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
                            <span>{order.order_number || order.orderNumber || "-"}</span>
                            <span className="md:hidden text-[10px] text-muted-foreground">
                              {order.customer_name || order.customerName || "-"}
                            </span>
                            <span className="lg:hidden text-[10px] text-muted-foreground">
                              {formatDate(order.due_date || order.dueDate || order.created_at || order.createdAt)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] font-medium px-1.5 py-1.5 hidden md:table-cell">
                          <div className="flex flex-col">
                            <span className="font-medium">{order.customer_name || order.customerName || "-"}</span>
                            {order.customer_company && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground">{order.customer_company}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] font-medium px-1.5 py-1.5 hidden lg:table-cell">
                          {formatDate(
                            order.due_date || order.dueDate || order.created_at || order.createdAt
                          )}
                        </TableCell>
                        <TableCell className="px-1.5 py-1.5">
                          <Badge className={`${getStatusColor(order.status)} text-[10px]`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 sm:px-4 py-2 sm:py-3 hidden xl:table-cell">
                          <Badge className={`${priorityMeta.className} text-[10px]`}>
                            {priorityMeta.label}
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
                    );
                  })}
                  {orders.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
                        {searchQuery || statusFilter !== "all" ? "Arama sonucu bulunamadı" : "Henüz üretim siparişi bulunmuyor"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
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
          // Subscription otomatik güncelleyecek
        }}
      />

      {selectedOrder && (
        <OrderDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          order={selectedOrder as unknown as Order}
          onDelete={() => {
            setDetailModalOpen(false);
            setDeleteDialogOpen(true);
          }}
          onUpdate={() => {
            // Subscription otomatik güncelleyecek
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Siparişi sil?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Sipariş kalıcı olarak silinecek.
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

export default Production;
