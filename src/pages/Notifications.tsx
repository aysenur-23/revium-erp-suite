import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, XCircle, ClipboardList, RefreshCw, CheckCircle, Clock, AlertCircle, FileText, Package, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  getNotifications,
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateNotification,
  Notification as FirebaseNotification,
} from "@/services/firebase/notificationService";
import { acceptTaskAssignment, rejectTaskAssignment, approveTaskRejection, rejectTaskRejection, approveTask, rejectTaskApproval } from "@/services/firebase/taskService";
import { Timestamp } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MainLayout } from "@/components/Layout/MainLayout";

type TaskNotification = FirebaseNotification & {
  assignmentId?: string;
};

const getAssignmentId = (notification: FirebaseNotification): string | undefined => {
  const meta = notification.metadata;
  if (meta && typeof meta === "object" && "assignment_id" in meta) {
    const value = (meta as Record<string, unknown>).assignment_id;
    if (typeof value === "string") {
      return value;
    }
  }
  if (notification.type === "task_assigned" && typeof notification.relatedId === "string") {
    return notification.relatedId;
  }
  return undefined;
};

const hasActionMetadata = (notification: FirebaseNotification): boolean => {
  const meta = notification.metadata;
  if (meta && typeof meta === "object" && "action" in meta) {
    const value = (meta as Record<string, unknown>).action;
    return typeof value === "string" && (value === "accepted" || value === "rejected" || value === "rejection_approved" || value === "rejection_rejected" || value === "pool_request_approved" || value === "approved");
  }
  return false;
};

const isRejectionPendingApproval = (notification: FirebaseNotification): boolean => {
  const meta = notification.metadata;
  if (meta && typeof meta === "object" && "action" in meta) {
    const value = (meta as Record<string, unknown>).action;
    return value === "rejection_pending_approval";
  }
  return false;
};

const isRejectionByAssignee = (notification: FirebaseNotification): boolean => {
  const meta = notification.metadata;
  if (meta && typeof meta === "object" && "action" in meta) {
    const value = (meta as Record<string, unknown>).action;
    const hasAssignedUserId = "assigned_user_id" in meta;
    return value === "rejected" && hasAssignedUserId;
  }
  return false;
};

const mapNotification = (notification: FirebaseNotification): TaskNotification => ({
  ...notification,
  assignmentId: getAssignmentId(notification),
});

const isActionableAssignmentNotification = (notification: TaskNotification): boolean => {
  return (
    notification.type === "task_assigned" &&
    !!notification.assignmentId &&
    !hasActionMetadata(notification) &&
    !isRejectionPendingApproval(notification)
  );
};

const isActionableTaskApprovalNotification = (notification: TaskNotification): boolean => {
  return (
    notification.type === "task_approval" &&
    !!notification.relatedId &&
    !hasActionMetadata(notification)
  );
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<string>("all");
  const [processing, setProcessing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<TaskNotification | null>(null);
  const [rejectRejectionDialogOpen, setRejectRejectionDialogOpen] = useState(false);
  const [rejectionRejectionReason, setRejectionRejectionReason] = useState("");
  const [rejectApprovalDialogOpen, setRejectApprovalDialogOpen] = useState(false);
  const [rejectionApprovalReason, setRejectionApprovalReason] = useState("");

  // Gerçek zamanlı bildirim güncellemeleri için subscribe
  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);
    
    // Gerçek zamanlı dinleme başlat (performans için limit: 100)
    const unsubscribe = subscribeToNotifications(user.id, { limit: 100 }, (firebaseNotifications) => {
      try {
        setNotifications(firebaseNotifications.map(mapNotification));
        setLoading(false);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Real-time notifications update error:", error);
        }
        setLoading(false);
      }
    });
    
    // Cleanup: Component unmount olduğunda unsubscribe et
    return () => {
      unsubscribe();
    };
  }, [user]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filterType !== "all" && notification.type !== filterType) {
        return false;
      }
      if (filterRead === "read" && !notification.read) {
        return false;
      }
      if (filterRead === "unread" && notification.read) {
        return false;
      }
      return true;
    });
  }, [notifications, filterType, filterRead]);

  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Bildirim güncellenirken hata:", error);
      }
      toast.error("Bildirim güncellenemedi");
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("Tüm bildirimler okundu olarak işaretlendi");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Bildirimler güncellenirken hata: " + message);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-5 w-5";
    switch (type) {
      case "task_assigned":
        return <ClipboardList className={iconClass} />;
      case "task_updated":
        return <RefreshCw className={iconClass} />;
      case "task_completed":
        return <CheckCircle className={iconClass} />;
      case "task_approval":
        return <AlertCircle className={iconClass} />;
      case "order_created":
        return <Package className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getNotificationColor = (type: string, read: boolean) => {
    if (read) return "bg-slate-50 dark:bg-slate-900/50";
    
    switch (type) {
      case "task_assigned":
        return "bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500";
      case "task_updated":
        return "bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500";
      case "task_completed":
        return "bg-green-50 dark:bg-green-950/30 border-l-4 border-green-500";
      case "task_approval":
        return "bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500";
      default:
        return "bg-slate-50 dark:bg-slate-900/50 border-l-4 border-slate-400";
    }
  };

  const handleAcceptTask = async (notification: TaskNotification) => {
    if (!notification.assignmentId || !notification.relatedId) {
      toast.error("Görev bilgisi eksik. Lütfen bildirimi yenileyin.");
      return;
    }
    
    setProcessing(true);
    try {
      await acceptTaskAssignment(notification.relatedId, notification.assignmentId);
      
      const updatedMetadata = { ...notification.metadata, action: "accepted" };
      await updateNotification(notification.id, {
        metadata: updatedMetadata,
        read: true
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, read: true, metadata: updatedMetadata }
            : n
        )
      );

      toast.success("Görev kabul edildi");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Görev kabul edilemedi";
      toast.error("Görev kabul edilemedi: " + message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTask = async () => {
    if (
      !selectedNotification?.assignmentId ||
      !selectedNotification?.relatedId ||
      rejectionReason.trim().length < 20
    ) {
      return;
    }
    
    setProcessing(true);
    try {
      await rejectTaskAssignment(
        selectedNotification.relatedId,
        selectedNotification.assignmentId,
        rejectionReason.trim()
      );
      
      const updatedMetadata = { ...selectedNotification.metadata, action: "rejected" };
      await updateNotification(selectedNotification.id, {
        metadata: updatedMetadata,
        read: true
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === selectedNotification.id
            ? { ...n, read: true, metadata: updatedMetadata }
            : n
        )
      );

      toast.success("Görev reddedildi");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedNotification(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Görev reddedilemedi";
      toast.error("Görev reddedilemedi: " + message);
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveRejection = async (notification: TaskNotification) => {
    if (!notification.assignmentId || !notification.relatedId) {
      return;
    }

    setProcessing(true);
    try {
      await approveTaskRejection(
        notification.relatedId,
        notification.assignmentId
      );

      const updatedMetadata = { ...notification.metadata, action: "rejection_approved" };
      await updateNotification(notification.id, {
        metadata: updatedMetadata,
        read: true
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, read: true, metadata: updatedMetadata }
            : n
        )
      );

      toast.success("Görev reddi onaylandı");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Red onaylanamadı";
      toast.error("Red onaylanamadı: " + message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectRejection = async () => {
    if (
      !selectedNotification?.assignmentId ||
      !selectedNotification?.relatedId ||
      rejectionRejectionReason.trim().length < 20
    ) {
      return;
    }

    setProcessing(true);
    try {
      await rejectTaskRejection(
        selectedNotification.relatedId,
        selectedNotification.assignmentId,
        rejectionRejectionReason.trim()
      );

      const updatedMetadata = { ...selectedNotification.metadata, action: "rejection_rejected" };
      await updateNotification(selectedNotification.id, {
        metadata: updatedMetadata,
        read: true
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === selectedNotification.id
            ? { ...n, read: true, metadata: updatedMetadata }
            : n
        )
      );

      toast.success("Görev reddi reddedildi");
      setRejectRejectionDialogOpen(false);
      setRejectionRejectionReason("");
      setSelectedNotification(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Red reddedilemedi";
      toast.error("Red reddedilemedi: " + message);
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveTaskApproval = async (notification: TaskNotification) => {
    if (!notification.relatedId || !user?.id) {
      return;
    }

    setProcessing(true);
    try {
      await approveTask(notification.relatedId, user.id);

      const updatedMetadata = { ...notification.metadata, action: "approved" };
      await updateNotification(notification.id, {
        metadata: updatedMetadata,
        read: true
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, read: true, metadata: updatedMetadata }
            : n
        )
      );

      toast.success("Görev onaylandı");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Görev onaylanamadı";
      toast.error("Görev onaylanamadı: " + message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTaskApproval = async () => {
    if (
      !selectedNotification?.relatedId ||
      !user?.id ||
      !rejectionApprovalReason.trim()
    ) {
      return;
    }

    setProcessing(true);
    try {
      await rejectTaskApproval(
        selectedNotification.relatedId,
        user.id,
        rejectionApprovalReason.trim()
      );
      
      const updatedMetadata = { ...selectedNotification.metadata, action: "rejected" };
      await updateNotification(selectedNotification.id, {
        metadata: updatedMetadata,
        read: true
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === selectedNotification.id
            ? { ...n, read: true, metadata: updatedMetadata }
            : n
        )
      );

      toast.success("Görev onayı reddedildi");
      setRejectApprovalDialogOpen(false);
      setRejectionApprovalReason("");
      setSelectedNotification(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Görev onayı reddedilemedi";
      toast.error("Görev onayı reddedilemedi: " + message);
    } finally {
      setProcessing(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <MainLayout>
      <div className="space-y-2 w-full sm:w-[95%] md:w-[90%] lg:max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2 mb-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            <h1 className="text-[16px] sm:text-[18px] font-semibold text-foreground">Bildirimler</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 sm:h-6 px-2 text-[10px]">
                {unreadCount} okunmamış
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto min-h-[36px] sm:min-h-8 text-[11px] sm:text-xs"
              onClick={markAllAsRead}
              disabled={processing}
            >
              <span className="hidden sm:inline">Tümünü okundu işaretle</span>
              <span className="sm:hidden">Tümünü okundu</span>
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[160px] md:w-[180px] h-9 sm:h-10 min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs">
                  <SelectValue placeholder="Bildirim Tipi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Tipler</SelectItem>
                  <SelectItem value="task_assigned">Görev Atandı</SelectItem>
                  <SelectItem value="task_updated">Görev Güncellendi</SelectItem>
                  <SelectItem value="task_completed">Görev Tamamlandı</SelectItem>
                  <SelectItem value="task_approval">Görev Onayı</SelectItem>
                  <SelectItem value="order_created">Sipariş Oluşturuldu</SelectItem>
                  <SelectItem value="order_updated">Sipariş Güncellendi</SelectItem>
                  <SelectItem value="system">Sistem</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger className="w-full sm:w-[160px] md:w-[180px] h-9 sm:h-10 min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs">
                  <SelectValue placeholder="Okunma Durumu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="unread">Okunmamış</SelectItem>
                  <SelectItem value="read">Okunmuş</SelectItem>
                </SelectContent>
              </Select>
              {(filterType !== "all" || filterRead !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterType("all");
                    setFilterRead("all");
                  }}
                  className="h-9 sm:h-10 min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Temizle</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-card border rounded-lg">
            <Bell className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">Bildirim bulunamadı</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground/70 mt-2">
              {filterType !== "all" || filterRead !== "all"
                ? "Filtreleri değiştirerek tekrar deneyin"
                : "Henüz bildirim yok"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`group relative rounded-lg transition-all duration-200 hover:shadow-md ${
                  getNotificationColor(notification.type, notification.read)
                } ${!notification.read ? 'shadow-sm' : ''}`}
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    if (isActionableAssignmentNotification(notification)) {
                      return;
                    }
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    
                    // Yönlendirme mantığı
                    if (notification.relatedId) {
                      // Görev havuzu talebi bildirimleri - Ekip Yönetimi sayfasına yönlendir
                      if (notification.type === 'task_pool_request') {
                        navigate('/team-management?tab=approvals');
                        return;
                      }
                      // Görev ile ilgili bildirimler
                      if (['task_assigned', 'task_updated', 'task_completed', 'task_created', 'task_approval', 'task_deleted', 'comment_added'].includes(notification.type)) {
                        navigate(`/tasks?taskId=${notification.relatedId}&view=list`);
                      } 
                      // Sipariş bildirimleri
                      else if (['order_created', 'order_updated'].includes(notification.type)) {
                        // Metadata'dan sipariş tipini kontrol et (üretim siparişi mi normal sipariş mi)
                        const metadata = notification.metadata as { orderType?: string; [key: string]: unknown };
                        if (metadata?.orderType === 'production' || notification.message?.includes('üretim')) {
                          navigate(`/production?orderId=${notification.relatedId}`);
                        } else {
                          navigate(`/orders?orderId=${notification.relatedId}`);
                        }
                      } 
                      // Talep bildirimleri
                      else if (notification.type === 'system' && notification.metadata) {
                        const metadata = notification.metadata as { requestType?: string; [key: string]: unknown };
                        if (metadata.requestType || notification.message?.includes('talep')) {
                          navigate(`/requests?requestId=${notification.relatedId}`);
                        }
                      }
                      // Rol değişikliği
                      else if (notification.type === 'role_changed') {
                        navigate('/admin');
                      }
                    } else {
                      // relatedId yoksa tip bazlı yönlendirme
                      if (['order_created', 'order_updated'].includes(notification.type)) {
                        const metadata = notification.metadata as { orderType?: string; [key: string]: unknown };
                        if (metadata?.orderType === 'production' || notification.message?.includes('üretim')) {
                          navigate('/production');
                        } else {
                          navigate('/orders');
                        }
                      } else if (notification.type === 'system' && notification.metadata) {
                        const metadata = notification.metadata as { requestType?: string; [key: string]: unknown };
                        if (metadata.requestType || notification.message?.includes('talep')) {
                          navigate('/requests');
                        }
                      } else if (notification.type === 'role_changed') {
                        navigate('/admin');
                      } else if (notification.type === 'task_pool_request') {
                        navigate('/team-management?tab=approvals');
                      } else if (['task_assigned', 'task_updated', 'task_completed', 'task_created', 'task_approval', 'task_deleted', 'comment_added'].includes(notification.type)) {
                        navigate('/tasks');
                      }
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 mt-0.5 p-2.5 rounded-lg ${
                      !notification.read 
                        ? notification.type === "task_assigned" ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                        : notification.type === "task_updated" ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                        : notification.type === "task_completed" ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
                        : notification.type === "task_approval" ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-[11px] sm:text-xs font-semibold leading-tight ${
                              !notification.read 
                                ? "text-slate-900 dark:text-slate-100" 
                                : "text-slate-700 dark:text-slate-300"
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1 animate-pulse" />
                            )}
                          </div>
                        </div>
                      </div>
                      {notification.message && (
                        <p className={`text-[11px] sm:text-xs leading-relaxed ${
                          !notification.read 
                            ? "text-slate-700 dark:text-slate-300" 
                            : "text-slate-600 dark:text-slate-400"
                        }`}>
                          {(() => {
                            // Column ID'lerini kullanıcı dostu status isimlerine çevir
                            let message = notification.message;
                            
                            // Column ID pattern'ini bul ve değiştir
                            const columnIdPattern = /column_\d+/g;
                            const statusNames: Record<string, string> = {
                              pending: "Beklemede",
                              in_progress: "Devam Ediyor",
                              completed: "Tamamlandı",
                              cancelled: "İptal Edildi",
                            };
                            
                            // Eğer mesajda column ID varsa, bunu status ismine çevirmeye çalış
                            message = message.replace(columnIdPattern, (match) => {
                              // Metadata'dan status bilgisini al
                              if (notification.metadata) {
                                const meta = notification.metadata as { newStatus?: string; status?: string; new_status?: string; [key: string]: unknown };
                                // newStatus veya status olabilir
                                const status = meta.newStatus || meta.status || meta.new_status;
                                if (status && statusNames[status]) {
                                  return statusNames[status];
                                }
                                // Eğer status string olarak direkt metadata'da varsa
                                if (typeof meta === 'object') {
                                  for (const key in meta) {
                                    const value = meta[key];
                                    if (typeof value === 'string' && statusNames[value]) {
                                      return statusNames[value];
                                    }
                                  }
                                }
                              }
                              // Metadata yoksa veya status bulunamazsa "Yeni Durum" göster
                              return "Yeni Durum";
                            });
                            
                            return message;
                          })()}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {notification.createdAt 
                            ? formatDistanceToNow(notification.createdAt.toDate(), {
                                addSuffix: true,
                                locale: tr,
                              })
                            : "Yakın zamanda"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {isActionableAssignmentNotification(notification) && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptTask(notification);
                        }}
                        disabled={processing}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Kabul Et
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-9 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNotification(notification);
                          setRejectDialogOpen(true);
                        }}
                        disabled={processing}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reddet
                      </Button>
                    </div>
                  </div>
                )}
                {isRejectionPendingApproval(notification) && notification.assignmentId && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveRejection(notification);
                        }}
                        disabled={processing}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Reddi Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-9 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNotification(notification);
                          setRejectRejectionDialogOpen(true);
                        }}
                        disabled={processing}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reddi Reddet
                      </Button>
                    </div>
                  </div>
                )}
                {isRejectionByAssignee(notification) && notification.assignmentId && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveRejection(notification);
                        }}
                        disabled={processing}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Reddi Kabul Et
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-9 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNotification(notification);
                          setRejectRejectionDialogOpen(true);
                        }}
                        disabled={processing}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reddi Reddet
                      </Button>
                    </div>
                  </div>
                )}
                {isActionableTaskApprovalNotification(notification) && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveTaskApproval(notification);
                        }}
                        disabled={processing}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-9 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNotification(notification);
                          setRejectApprovalDialogOpen(true);
                        }}
                        disabled={processing}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reddet
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Task Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
          {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
          <DialogTitle className="sr-only">
            Görevi Reddet
          </DialogTitle>
          <DialogDescription className="sr-only">
            Görevi reddetmek için lütfen en az 20 karakterlik bir sebep belirtin.
          </DialogDescription>
          
          <div className="flex flex-col h-full min-h-0">
            <DialogHeader className="p-2 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-foreground">Görevi Reddet</h2>
              <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground">
                Görevi reddetmek için lütfen en az 20 karakterlik bir sebep belirtin.
              </p>
            </DialogHeader>
            <div className="flex-1 overflow-hidden bg-gray-50/50 p-2 min-h-0">
              <div className="max-w-full mx-auto h-full overflow-y-auto">
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="rejection_reason" className="text-[11px] sm:text-xs" showRequired>Reddetme Sebebi</Label>
                      <Textarea
                        id="rejection_reason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Görevi neden reddettiğinizi açıklayın (en az 20 karakter)..."
                        rows={4}
                        className={`min-h-[100px] sm:min-h-[120px] ${rejectionReason.length > 0 && rejectionReason.length < 20 ? "border-destructive" : ""}`}
                      />
                      {rejectionReason.length > 0 && rejectionReason.length < 20 && (
                        <p className="text-[11px] sm:text-xs text-destructive">
                          En az {20 - rejectionReason.length} karakter daha gerekli
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="p-2 border-t bg-white flex-shrink-0 flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason("");
                  setSelectedNotification(null);
                }}
                disabled={processing}
                className="min-h-[44px] sm:min-h-0"
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectTask}
                disabled={processing || rejectionReason.trim().length < 20}
                className="min-h-[44px] sm:min-h-0"
              >
                {processing ? "Reddediliyor..." : "Reddet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Rejection Dialog */}
      <Dialog open={rejectRejectionDialogOpen} onOpenChange={setRejectRejectionDialogOpen}>
        <DialogContent className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
          <div className="flex flex-col h-full min-h-0">
            <DialogHeader className="p-2 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
              <DialogTitle className="text-[14px] sm:text-[15px] font-semibold text-foreground">Görev Reddi Reddet</DialogTitle>
              <DialogDescription className="mt-1 text-[11px] sm:text-xs text-muted-foreground">
                Görev reddi reddedildiğinde görev tekrar atanan kişiye döner. Lütfen en az 20 karakterlik bir sebep belirtin.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden bg-gray-50/50 p-2 min-h-0">
              <div className="max-w-full mx-auto h-full overflow-y-auto">
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="rejection_rejection_reason" className="text-[11px] sm:text-xs" showRequired>Reddetme Sebebi</Label>
                      <Textarea
                        id="rejection_rejection_reason"
                        value={rejectionRejectionReason}
                        onChange={(e) => setRejectionRejectionReason(e.target.value)}
                        placeholder="Görev reddi neden reddedildiğini açıklayın (en az 20 karakter)..."
                        rows={4}
                        className={`min-h-[100px] sm:min-h-[120px] ${rejectionRejectionReason.length > 0 && rejectionRejectionReason.length < 20 ? "border-destructive" : ""}`}
                      />
                      {rejectionRejectionReason.length > 0 && rejectionRejectionReason.length < 20 && (
                        <p className="text-[11px] sm:text-xs text-destructive">
                          En az {20 - rejectionRejectionReason.length} karakter daha gerekli
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="p-2 border-t bg-white flex-shrink-0 flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectRejectionDialogOpen(false);
                  setRejectionRejectionReason("");
                  setSelectedNotification(null);
                }}
                disabled={processing}
                className="min-h-[44px] sm:min-h-0"
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectRejection}
                disabled={processing || rejectionRejectionReason.trim().length < 20}
                className="min-h-[44px] sm:min-h-0"
              >
                {processing ? "Reddediliyor..." : "Reddi Reddet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Task Approval Dialog */}
      <Dialog open={rejectApprovalDialogOpen} onOpenChange={setRejectApprovalDialogOpen}>
        <DialogContent className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
          <div className="flex flex-col h-full min-h-0">
            <DialogHeader className="p-2 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
              <DialogTitle className="text-[14px] sm:text-[15px] font-semibold text-foreground">Görev Onayını Reddet</DialogTitle>
              <DialogDescription className="mt-1 text-[11px] sm:text-xs text-muted-foreground">
                Görev onayını reddetmek için lütfen bir not ekleyin. Görev tekrar panoya dönecektir.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden bg-gray-50/50 p-2 min-h-0">
              <div className="max-w-full mx-auto h-full overflow-y-auto">
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="rejection_approval_reason" className="text-[11px] sm:text-xs" showRequired>
                        Reddetme Notu
                      </Label>
                      <Textarea
                        id="rejection_approval_reason"
                        value={rejectionApprovalReason}
                        onChange={(e) => setRejectionApprovalReason(e.target.value)}
                        placeholder="Görev onayını neden reddettiğinizi açıklayın..."
                        rows={4}
                        className="min-h-[100px] sm:min-h-[120px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="p-2 border-t bg-white flex-shrink-0 flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectApprovalDialogOpen(false);
                  setRejectionApprovalReason("");
                  setSelectedNotification(null);
                }}
                disabled={processing}
                className="min-h-[44px] sm:min-h-0"
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectTaskApproval}
                disabled={processing || !rejectionApprovalReason.trim()}
                className="min-h-[44px] sm:min-h-0"
              >
                {processing ? "Reddediliyor..." : "Reddet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

