import { useState, useEffect, useMemo, useCallback } from "react";
import { Timestamp } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getOrderItems, requestOrderCompletion, approveOrderCompletion, rejectOrderCompletion } from "@/services/firebase/orderService";
import { getCustomerById, Customer } from "@/services/firebase/customerService";
import type { LucideIcon } from "lucide-react";
import {
  Edit,
  Trash2,
  Calendar,
  User,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  Check,
  ClipboardList,
  PackageCheck,
  ShoppingCart,
  BarChart2,
  CreditCard,
  NotebookPen,
  CircleDot,
  X,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { updateOrder, addOrderComment, getOrderComments, getOrderActivities, Order, OrderItem } from "@/services/firebase/orderService";
import { useAuth } from "@/contexts/AuthContext";
import { canUpdateResource, canDeleteResource } from "@/utils/permissions";
import { UserProfile } from "@/services/firebase/authService";
import { formatPhoneForDisplay, formatPhoneForTelLink } from "@/utils/phoneNormalizer";
import { getAllUsers } from "@/services/firebase/authService";
import { CURRENCY_SYMBOLS, Currency } from "@/utils/currency";
import { ActivityCommentsPanel } from "@/components/shared/ActivityCommentsPanel";

type StatusItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
};

const statusWorkflow: StatusItem[] = [
  { value: "draft", label: "Taslak", icon: ClipboardList, color: "text-muted-foreground" },
  { value: "pending", label: "Beklemede", icon: Clock, color: "text-amber-500" },
  { value: "planned", label: "Planlandı", icon: Calendar, color: "text-blue-500" },
  { value: "confirmed", label: "Onaylandı", icon: CheckCircle2, color: "text-emerald-500" },
  { value: "in_production", label: "Üretimde", icon: Package, color: "text-blue-600" },
  { value: "quality_check", label: "Kalite Kontrolü", icon: CircleDot, color: "text-purple-500" },
  { value: "completed", label: "Tamamlandı", icon: Check, color: "text-emerald-600" },
  { value: "shipped", label: "Kargoda", icon: Truck, color: "text-sky-500" },
  { value: "delivered", label: "Teslim Edildi", icon: PackageCheck, color: "text-primary" },
];

const normalizeStatusValue = (status?: string) => {
  if (!status) return "draft";
  // column_ prefix'ini kaldır (örn: "column_1764448226762" -> "1764448226762")
  let normalized = status;
  if (normalized.startsWith("column_")) {
    normalized = normalized.replace("column_", "");
  }
  // Eğer sayısal bir ID ise, default olarak "pending" döndür
  if (/^\d+$/.test(normalized)) {
    return "pending";
  }
  // in_progress -> in_production dönüşümü
  if (normalized === "in_progress") return "in_production";
  return normalized;
};

const resolveDateValue = (value?: unknown): Date | string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const timestamp = value as { seconds: number; nanoseconds?: number };
    return new Date(timestamp.seconds * 1000);
  }
  return null;
};

const formatCurrency = (value?: number | null, currency?: Currency | string) => {
  const numericValue = typeof value === "number" ? value : Number(value) || 0;
  const orderCurrency = (currency || "TRY") as Currency;
  const currencyCode = orderCurrency === "TRY" ? "TRY" : orderCurrency;
  const locale = orderCurrency === "TRY" ? "tr-TR" : "en-US";
  const symbol = CURRENCY_SYMBOLS[orderCurrency] || "₺";
  
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return `${symbol}${numericValue.toFixed(2)}`;
  }
};

interface OrderDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const OrderDetailModal = ({ open, onOpenChange, order, onEdit, onDelete }: OrderDetailModalProps) => {
  const { user, isAdmin, isTeamLeader } = useAuth();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(normalizeStatusValue(order?.status));
  const [approvalStatus, setApprovalStatus] = useState<string | undefined>(order?.approvalStatus);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  
  // Personel kontrolü - Personel sipariş detayını görebilir ama düzenleyemez
  const isPersonnel = user?.roles?.includes("personnel") || false;

  const formatDateSafe = (dateInput?: string | Date | Timestamp | null) => {
    if (!dateInput) return "-";
    let date: Date;
    if (dateInput instanceof Timestamp) {
      date = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      date = new Date(dateInput);
    }
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const orderNumber = order?.order_number || order?.orderNumber || order?.id;
  const orderDateValue = resolveDateValue(order?.order_date || order?.orderDate);
  const deliveryDateValue = resolveDateValue(order?.delivery_date || order?.deliveryDate);
  const receivedDateValue = resolveDateValue(order?.received_date || order?.receivedDate);
  const dueDateValue = resolveDateValue(order?.due_date || order?.dueDate);
  const createdAtValue = resolveDateValue(order?.created_at || order?.createdAt);
  const updatedAtValue = resolveDateValue(order?.updated_at || order?.updatedAt);
  const paymentTerms = order?.payment_terms || order?.paymentTerms || "-";
  const shippingAddress = order?.delivery_address || order?.shippingAddress || order?.shipping_address;
  const shippingNotes = order?.delivery_notes || order?.shippingNotes || order?.shipping_notes;
  const currency = order?.currency || "TRY";
  const totalQuantity = orderItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalDiscount = orderItems.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  const subtotalValue = Number(order?.subtotal ?? order?.totalAmount ?? 0);
  const taxValue = Number(order?.taxAmount ?? 0);
  const totalValue = Number(order?.totalAmount ?? subtotalValue + taxValue - totalDiscount);
  
  const [canUpdate, setCanUpdate] = useState(false);
  const [canDeleteState, setCanDeleteState] = useState(false);
  const [canApprove, setCanApprove] = useState(false);

  // Order değiştiğinde currentStatus'u güncelle (column_ prefix'ini kaldır)
  useEffect(() => {
    if (order?.status) {
      const normalized = normalizeStatusValue(order.status);
      setCurrentStatus(normalized);
    }
    if (order?.approvalStatus !== undefined) {
      setApprovalStatus(order.approvalStatus);
    }
  }, [order?.status, order?.approvalStatus]);

  // Yetki kontrolleri - Firestore'dan kontrol et
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user || !order) {
        setCanUpdate(false);
        setCanDeleteState(false);
        setCanApprove(false);
        return;
      }
      try {
        const userProfile: UserProfile = {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: user.fullName || user.email || "",
          fullName: user.fullName,
          phone: null,
          dateOfBirth: null,
          role: user.roles || [],
          createdAt: null,
          updatedAt: null,
        };
        const [canUpdateOrder, canDeleteOrder] = await Promise.all([
          canUpdateResource(userProfile, "orders"),
          canDeleteResource(userProfile, "orders"),
        ]);
        setCanUpdate(canUpdateOrder);
        setCanDeleteState(canDeleteOrder);
        
        // Admin ve ekip lideri her zaman düzenleyebilir
        if (isAdmin || isTeamLeader) {
          setCanUpdate(true);
          setCanDeleteState(true);
        }
        
        // Onaylama yetkisi: Güncelleme yetkisi varsa veya oluşturan kişi ise
        const isCreator = user.id === order.createdBy;
        setCanApprove(canUpdateOrder || isCreator || isTeamLeader);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Error checking order permissions:", error);
        }
        setCanUpdate(false);
        setCanDeleteState(false);
        setCanApprove(false);
      }
    };
    checkPermissions();
  }, [user, order]);

  const isManager = user?.roles?.includes('manager') || isAdmin;
  const isCreator = user?.id === order?.createdBy;

  const highlightCards = [
    {
      label: "Kalem Sayısı",
      value: orderItems.length || 0,
      icon: ShoppingCart,
      helper: "Siparişe bağlı ürün",
      accent: "from-blue-50/80 via-white to-white border-blue-100",
      tooltip: "Bu siparişe eklenmiş toplam satır sayısı",
    },
    {
      label: "Toplam Miktar",
      value: totalQuantity,
      icon: BarChart2,
      helper: "Siparişteki toplam adet",
      accent: "from-indigo-50/80 via-white to-white border-indigo-100",
      tooltip: "Ürün miktarlarının toplamı",
    },
    {
      label: "Ara Toplam",
      value: formatCurrency(order?.subtotal ?? order?.totalAmount ?? 0, currency),
      icon: CreditCard,
      helper: "Vergi & indirim öncesi",
      accent: "from-slate-50/80 via-white to-white border-slate-100",
      tooltip: "KDV ve indirim uygulanmadan önceki tutar",
    },
    {
      label: "İndirim",
      value: totalDiscount ? `-${formatCurrency(totalDiscount, currency)}` : "-",
      icon: NotebookPen,
      helper: "Ürün bazlı indirim",
      accent: "from-emerald-50/80 via-white to-white border-emerald-100",
      tooltip: "Kalemlere uygulanan toplam indirim",
    },
  ];
  const orderSummaryRows = [
    { label: "Sipariş No", value: orderNumber },
    { label: "Sipariş Edilen Tarih", value: formatDateSafe(orderDateValue as Date | string | Timestamp | null) },
    { label: "Teslimat Tarihi", value: formatDateSafe(deliveryDateValue as Date | string | Timestamp | null) },
    { label: "Teslim Alınan Tarih", value: formatDateSafe(receivedDateValue as Date | string | Timestamp | null) },
    { label: "Son Ödeme", value: formatDateSafe(dueDateValue as Date | string | Timestamp | null) },
    { label: "Para Birimi", value: currency },
    { label: "Ödeme Şartı", value: paymentTerms },
    { label: "Oluşturan", value: order?.createdBy 
      ? (usersMap[order.createdBy] || "-")
      : "-" },
    { label: "Son Güncelleme", value: formatDateSafe(updatedAtValue as Date | string | Timestamp | null) },
  ];
  const quickMetaChips = [
    orderNumber && { label: "Sipariş No", value: orderNumber },
    createdAtValue && { label: "Oluşturulma", value: formatDateSafe(createdAtValue as Date | string | Timestamp | null) },
    dueDateValue && { label: "Son Ödeme", value: formatDateSafe(dueDateValue as Date | string | Timestamp | null) },
    currency && { label: "Para Birimi", value: currency },
  ].filter(Boolean) as { label: string; value: string }[];

  useEffect(() => {
    if (order?.id && open) {
      fetchOrderDetails();
      setApprovalStatus(order.approvalStatus);
    }
  }, [order, open]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await getAllUsers();
        const userMap: Record<string, string> = {};
        allUsers.forEach((u) => {
          userMap[u.id] = u.fullName || u.email || "Bilinmeyen";
        });
        setUsersMap(userMap);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    if (open) {
      loadUsers();
    }
  }, [open]);

  useEffect(() => {
    setCurrentStatus(normalizeStatusValue(order?.status));
  }, [order?.status]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      // Fetch order items
      const items = await getOrderItems(order.id);
      setOrderItems(items);

      // Fetch customer details
      if (order.customer_id || order.customerId) {
        const customerId = order.customer_id || order.customerId;
        const customerData = await getCustomerById(customerId);
        setCustomer(customerData);
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("Fetch order details error:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Detaylar yüklenirken hata: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "draft":
        return "outline";
      case "pending":
        return "secondary";
      case "confirmed":
        return "default";
      case "in_production":
      case "in_progress":
        return "secondary";
      case "completed":
        return "default";
      case "shipped":
        return "secondary";
      case "delivered":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    // Önce status'ü normalize et
    const normalized = normalizeStatusValue(status);
    const labels: Record<string, string> = {
      draft: "Taslak",
      pending: "Beklemede",
      confirmed: "Onaylandı",
      planned: "Planlandı",
      in_production: "Üretimde",
      in_progress: "Üretimde",
      quality_check: "Kalite Kontrolü",
      completed: "Tamamlandı",
      shipped: "Kargoda",
      delivered: "Teslim Edildi",
      cancelled: "İptal Edildi",
      on_hold: "Beklemede",
    };
    return labels[normalized] || normalized;
  };

  const getCurrentStatusIndex = useCallback(() => {
    // currentStatus zaten normalize edilmiş olmalı ama yine de normalize et
    const normalized = normalizeStatusValue(currentStatus);
    const index = statusWorkflow.findIndex((statusItem) => statusItem.value === normalized);
    // Eğer bulunamazsa, "pending" olarak kabul et (index 1)
    if (index === -1) {
      // "pending" index'i 1 (draft'tan sonra)
      return 1;
    }
    return index;
<<<<<<< HEAD
  }, [currentStatus]);
=======
  }, [currentStatus, statusWorkflow]);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

  const nextStatus = useMemo(() => {
    const currentIndex = getCurrentStatusIndex();
    // currentIndex artık -1 dönmeyecek (minimum 1 döner), ama yine de kontrol et
    if (currentIndex < 0 || currentIndex >= statusWorkflow.length - 1) {
      return null;
    }
    return statusWorkflow[currentIndex + 1];
<<<<<<< HEAD
  }, [getCurrentStatusIndex]);
=======
  }, [getCurrentStatusIndex, statusWorkflow]);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

  const handleStatusChange = async (nextStatus: string) => {
    if (!order?.id || !user?.id) {
      return;
    }

    setUpdatingStatus(true);
    try {
      // Yetki kontrolü
      if (!canUpdate && !isCreator) {
        toast.error("Sipariş durumunu değiştirme yetkiniz yok.");
        setUpdatingStatus(false);
        return;
      }

      // Eğer tamamlandı durumuna geçiliyorsa ve yetkili değilse onaya gönder
      if (nextStatus === "completed") {
        const canCompleteDirectly = canUpdate || isCreator;
        
        if (!canCompleteDirectly) {
          await requestOrderCompletion(order.id, user.id);
          setApprovalStatus("pending");
          toast.success("Sipariş tamamlandı olarak işaretlendi ve onay için yöneticiye gönderildi.");
          setUpdatingStatus(false);
          return;
        }
        
        // Yetkili ise direkt onayla (completed + approved)
        await approveOrderCompletion(order.id, user.id);
        setCurrentStatus("completed");
        setApprovalStatus("approved");
        toast.success(`Sipariş durumu ${getStatusLabel("completed")} olarak güncellendi.`);
        setUpdatingStatus(false);
        return;
      }

      await updateOrder(
        order.id,
        {
        status: nextStatus as Order["status"],
        },
        user.id,
        canUpdate // Yetkili kullanıcılar için durum geçiş validasyonunu atla
      );
      setCurrentStatus(nextStatus);
      toast.success(`Sipariş durumu ${getStatusLabel(nextStatus)} olarak güncellendi.`);
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("Order status update error:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Durum güncellenemedi: " + errorMessage);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleApprove = async () => {
    if (!order?.id || !user?.id) return;
    try {
      await approveOrderCompletion(order.id, user.id);
      setCurrentStatus("completed");
      setApprovalStatus("approved");
      toast.success("Sipariş onayı kabul edildi.");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Onaylama başarısız: " + errorMessage);
    }
  };

  const handleReject = async () => {
    if (!order?.id || !user?.id) return;
    try {
      await rejectOrderCompletion(order.id, user.id);
      setCurrentStatus("in_production"); // Geri döndür
      setApprovalStatus("rejected");
      toast.success("Sipariş onayı reddedildi.");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Reddetme başarısız: " + errorMessage);
    }
  };

  const handleRevertStatus = async (targetStatus: string) => {
    if (!order?.id || !user?.id) {
      return;
    }
    
    // Yetki kontrolü
    if (!canUpdate && !isCreator) {
      toast.error("Sipariş durumunu değiştirme yetkiniz yok.");
      return;
    }

    setUpdatingStatus(true);
    try {
      await updateOrder(
        order.id,
        {
          status: targetStatus as Order["status"],
        },
        user.id,
        canUpdate
      );
      setCurrentStatus(targetStatus);
      toast.success(`Sipariş durumu ${getStatusLabel(targetStatus)} olarak güncellendi.`);
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("Order status revert error:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Durum güncellenemedi: " + errorMessage);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
<<<<<<< HEAD
      <DialogContent className="!max-w-[100vw] sm:!max-w-[95vw] md:!max-w-[85vw] !w-[100vw] sm:!w-[95vw] md:!w-[85vw] !h-[100vh] sm:!h-[90vh] md:!h-[85vh] !max-h-[100vh] sm:!max-h-[90vh] md:!max-h-[85vh] !left-0 sm:!left-[2.5vw] md:!left-[7.5vw] !top-0 sm:!top-[5vh] md:!top-[7.5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
=======
      <DialogContent className="!max-w-[100vw] sm:!max-w-[80vw] !w-[100vw] sm:!w-[80vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[10vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
        <DialogTitle className="sr-only">
          Sipariş Detayı - {orderNumber}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Sipariş detayları ve bilgileri
        </DialogDescription>
        
        <div className="flex flex-col h-full min-h-0">
<<<<<<< HEAD
          <DialogHeader className="p-2 sm:p-3 md:p-4 border-b bg-white flex-shrink-0 relative pr-10 sm:pr-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h2 className="text-[14px] sm:text-[18px] md:text-xl lg:text-2xl font-semibold text-foreground truncate flex-1 min-w-0">
                  Sipariş Detayı - {orderNumber}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0 relative z-10 w-full sm:w-auto justify-start sm:justify-end">
=======
          <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground truncate">
                  Sipariş Detayı - {orderNumber}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0 relative z-10 pr-10 sm:pr-12">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                {approvalStatus === "pending" && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50 text-xs px-2 sm:px-3 py-1 relative z-10">
                    Onay Bekliyor
                  </Badge>
                )}
                <Badge variant={getStatusVariant(normalizeStatusValue(currentStatus))} className="text-xs px-2 sm:px-3 py-1 relative z-10">
                  {getStatusLabel(normalizeStatusValue(currentStatus))}
                </Badge>
              </div>
            </div>
          </DialogHeader>
          {quickMetaChips.length > 0 && (
<<<<<<< HEAD
            <div className="px-2 sm:px-3 md:px-4 py-2 border-b bg-gray-50/50 flex flex-wrap items-center gap-1.5 sm:gap-2 flex-shrink-0 overflow-x-auto scrollbar-hide">
              {quickMetaChips.map((chip) => (
                <div
                  key={`${chip.label}-${chip.value}`}
                  className="flex items-center gap-1 rounded-full border bg-muted/40 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap"
=======
            <div className="px-3 sm:px-4 py-2 border-b bg-gray-50/50 flex flex-wrap items-center gap-2 flex-shrink-0">
              {quickMetaChips.map((chip) => (
                <div
                  key={`${chip.label}-${chip.value}`}
                  className="flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                >
                  <span className="text-muted-foreground/70">{chip.label}:</span>
                  <span className="text-foreground">{chip.value}</span>
                </div>
              ))}
            </div>
          )}

<<<<<<< HEAD
          <div className="flex-1 overflow-hidden bg-gray-50/50 p-2 sm:p-3 md:p-4 min-h-0">
            <div className="max-w-full mx-auto h-full overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
=======
          <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
            <div className="max-w-full mx-auto h-full overflow-y-auto">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-6">
            {approvalStatus === "pending" && (
<<<<<<< HEAD
              <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] sm:text-sm font-semibold text-yellow-900">Sipariş Tamamlanma Onayı Bekliyor</h4>
                    <p className="text-[11px] sm:text-sm text-yellow-700 mt-1">
=======
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-900">Sipariş Tamamlanma Onayı Bekliyor</h4>
                    <p className="text-sm text-yellow-700">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      Bu sipariş tamamlandı olarak işaretlendi ve onayınızı bekliyor.
                    </p>
                  </div>
                  {canApprove && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
<<<<<<< HEAD
                        className="flex-1 sm:flex-none border-yellow-300 text-yellow-900 hover:bg-yellow-100 h-9 sm:h-10 min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
=======
                        className="flex-1 sm:flex-none border-yellow-300 text-yellow-900 hover:bg-yellow-100"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        onClick={handleReject}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reddet
                      </Button>
                      <Button
                        size="sm"
<<<<<<< HEAD
                        className="flex-1 sm:flex-none bg-yellow-600 hover:bg-yellow-700 text-white border-none h-9 sm:h-10 min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
=======
                        className="flex-1 sm:flex-none bg-yellow-600 hover:bg-yellow-700 text-white border-none"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        onClick={handleApprove}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Onayla
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

<<<<<<< HEAD
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 auto-rows-fr">
=======
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 auto-rows-fr">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              {highlightCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Tooltip key={card.label} delayDuration={150}>
                    <TooltipTrigger asChild>
                      <div
                        className={`rounded-2xl border bg-gradient-to-br text-card-foreground p-4 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 h-full ${card.accent}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                            <p className="text-2xl font-semibold mt-1 leading-tight">{card.value}</p>
                          </div>
                          <div className="rounded-full border p-2 bg-white/75 shadow-inner shrink-0">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">{card.helper}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{card.tooltip}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Status Timeline */}
            <Card>
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg sm:text-xl font-semibold">Sipariş Durumu</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const normalizedStatus = normalizeStatusValue(currentStatus);
                        if (nextStatus) {
                          return `${getStatusLabel(normalizedStatus)} aşamasındasınız. Sıradaki adım: ${nextStatus.label}`;
                        }
                        return "Workflow tamamlandı.";
                      })()}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    Son güncelleyen: {order?.statusUpdatedBy 
                      ? (usersMap[order.statusUpdatedBy] || order.statusUpdatedBy)
                      : (user?.fullName || "-")}
                    <br />
                    <span className="text-[11px]">
                      {order?.statusUpdatedAt ? formatDateSafe(order.statusUpdatedAt as Timestamp | Date | string | null) : ""}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {/* Status Timeline */}
                  <div className="flex items-center justify-between overflow-x-auto overflow-y-visible pt-2 pb-4">
                    {statusWorkflow.map((statusItem, index) => {
                      const Icon = statusItem.icon;
                      const currentIndex = getCurrentStatusIndex();
                      const isActive = index === currentIndex;
                      const isCompleted = index < currentIndex;
                      const isClickable = !isPersonnel && (canUpdate || isCreator) && isCompleted && statusItem.value !== "cancelled" && approvalStatus !== "pending";
                      
                      return (
                        <div key={statusItem.value} className="flex items-center flex-1 min-w-0">
                          <div className="flex flex-col items-center flex-1 min-w-0">
                            <Tooltip delayDuration={150}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`
                                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all relative z-10
                                    ${isActive ? "bg-primary text-primary-foreground border-primary scale-110" : ""}
                                    ${isCompleted ? "bg-green-500 text-white border-green-500" : ""}
                                    ${!isActive && !isCompleted ? "bg-muted border-muted-foreground/20" : ""}
                                    ${isClickable ? "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-primary/50" : ""}
                                  `}
                                  onClick={() => {
                                    if (isClickable) {
                                      handleRevertStatus(statusItem.value);
                                    }
                                  }}
                                >
                                  <Icon className={`h-5 w-5 ${isActive || isCompleted ? "text-white" : statusItem.color}`} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isClickable
                                  ? `${statusItem.label} durumuna geri dönmek için tıklayın`
                                  : statusItem.label}
                              </TooltipContent>
                            </Tooltip>
                            <p className={`text-xs mt-2 text-center font-medium ${isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
                              {statusItem.label}
                            </p>
                          </div>
                          {index < statusWorkflow.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Next Status Button */}
                  {(() => {
                    const normalizedCurrentStatus = normalizeStatusValue(currentStatus);
                    // Buton gösterilme koşulları: next status var, delivered/cancelled değil, approval pending değil
                    const shouldShowButton = nextStatus && 
                      normalizedCurrentStatus !== "delivered" && 
                      normalizedCurrentStatus !== "cancelled" && 
                      approvalStatus !== "pending" &&
                      !isPersonnel && // Personel durum değiştiremez
                      (canUpdate || isCreator); // Yetki kontrolü
                    
                    if (!shouldShowButton) {
                      // Debug için konsola yaz (sadece dev modda)
                      if (import.meta.env.DEV && nextStatus) {
<<<<<<< HEAD
                        // Debug log could go here if needed
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      }
                      return null;
                    }
                    
                    return (
                      <div className="flex justify-center pt-4 border-t">
                        <Button
                          onClick={() => handleStatusChange(nextStatus.value)}
                          disabled={updatingStatus}
                          className="gap-2"
                        >
                          {updatingStatus ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Güncelleniyor...
                            </>
                          ) : (
                            <>
                              {(() => {
                                const NextIcon = nextStatus.icon;
                                return <NextIcon className="h-4 w-4" />;
                              })()}
                              {nextStatus.label} Durumuna Geç
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Customer Information */}
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg sm:text-xl font-semibold">Müşteri Bilgileri</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    İletişim ve teslimat detayları
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{customer?.name || order?.customerName || order?.customer_name || "-"}</span>
                    </div>
                    {(customer?.company || order?.customerCompany) && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{customer?.company || order?.customerCompany || order?.customer_company}</span>
                  </div>
                )}
                    {(customer?.phone || order?.customerPhone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{formatPhoneForDisplay(customer?.phone || order?.customerPhone || order?.customer_phone)}</span>
                  </div>
                )}
                    {(customer?.email || order?.customerEmail) && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{customer?.email || order?.customerEmail || order?.customer_email}</span>
                      </div>
                    )}
                  </div>

                  {(customer?.phone || customer?.email || order?.customerPhone || order?.customerEmail) && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {(customer?.phone || order?.customerPhone) && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`tel:${formatPhoneForTelLink(customer?.phone || order?.customerPhone || order?.customer_phone)}`}>
                            Ara
                          </a>
                        </Button>
                      )}
                      {(customer?.email || order?.customerEmail) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const email = customer?.email || order?.customerEmail || order?.customer_email;
                            if (email) {
                              window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`, '_blank');
                            }
                          }}
                        >
                          E-posta Gönder
                        </Button>
                      )}
                    </div>
                  )}

                  {(shippingAddress || shippingNotes) && (
                    <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Teslimat Bilgileri
                      </p>
                      {shippingAddress && (
                        <p className="text-sm">{shippingAddress}</p>
                      )}
                      {shippingNotes && (
                        <p className="text-xs text-muted-foreground">{shippingNotes}</p>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl font-semibold">Sipariş Bilgileri</CardTitle>
              </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {orderSummaryRows.map((row) => (
                      <div key={row.label} className="rounded-lg border bg-muted/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{row.label}</p>
                        <p className="text-sm font-medium mt-1">{row.value || "-"}</p>
                    </div>
                    ))}
                  </div>
                  {order?.notes && (
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                        <CircleDot className="h-4 w-4" />
                        İç Not
                      </p>
                      <p className="text-sm leading-relaxed">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl font-semibold">Ürünler</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {orderItems.length ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ürün</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead className="text-right">Miktar</TableHead>
                          <TableHead className="text-right">Birim Fiyat</TableHead>
                          <TableHead className="text-right">İndirim</TableHead>
                          <TableHead className="text-right">Toplam</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.productName || item.product_name || "-"}
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>{item.category || "-"}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unit_price ?? item.unitPrice, currency)}</TableCell>
                            <TableCell className="text-right text-destructive">
                              {item.discount ? `-${formatCurrency(item.discount, currency)}` : "-"}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.total, currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                          </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-6">
                    Bu siparişe ait ürün bulunamadı.
                        </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl font-semibold">Finansal Özet</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Ara Toplam:</span>
                    <span>{formatCurrency(subtotalValue, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>KDV:</span>
                    <span>{formatCurrency(taxValue, currency)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Genel Toplam:</span>
                    <span>{formatCurrency(totalValue, currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {order?.createdBy && usersMap[order.createdBy] && (
              <p className="text-xs text-muted-foreground text-right">
                Siparişi ekleyen: <span className="font-medium">
                  {usersMap[order.createdBy] || "Bilinmeyen"}
                </span>
              </p>
            )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2">
                    {!isPersonnel && canDeleteState && onDelete && (
                      <Button variant="outline" onClick={onDelete} className="gap-2 h-10">
                        <Trash2 className="h-4 w-4" />
                        Sil
                      </Button>
                    )}
                    {!isPersonnel && (canUpdate || isAdmin || isTeamLeader) && onEdit && (
                      <Button onClick={onEdit} className="gap-2 h-10 bg-primary hover:bg-primary/90 text-white">
                        <Edit className="h-4 w-4" />
                        Düzenle
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Activity Comments Panel */}
          {order?.id && user && (
            <ActivityCommentsPanel
              entityId={order.id}
              entityType="order"
              onAddComment={async (content: string) => {
                await addOrderComment(
                  order.id,
                  user.id,
                  content,
                  user.fullName,
                  user.email
                );
              }}
              onGetComments={async () => {
                return await getOrderComments(order.id);
              }}
              onGetActivities={async () => {
                return await getOrderActivities(order.id);
              }}
              currentUserId={user.id}
              currentUserName={user.fullName}
              currentUserEmail={user.email}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
