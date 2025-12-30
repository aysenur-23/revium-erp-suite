import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bell, CheckCircle2, XCircle, ClipboardList, RefreshCw, CheckCircle, Clock, AlertCircle, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  // Görevi veren kişiye gönderilen red bildirimi (action: "rejected" ve assigned_user_id var)
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

export const NotificationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectRejectionDialogOpen, setRejectRejectionDialogOpen] = useState(false);
  const [rejectApprovalDialogOpen, setRejectApprovalDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<TaskNotification | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionRejectionReason, setRejectionRejectionReason] = useState("");
  const [rejectionApprovalReason, setRejectionApprovalReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Gerçek zamanlı bildirim güncellemeleri için subscribe
  useEffect(() => {
    if (!user?.id) return;

    // Gösterilen bildirimleri takip etmek için localStorage key
    const shownNotificationsKey = `shown_notifications_${user.id}`;
    
    // Cache for shown notifications to avoid repeated localStorage reads
    let shownNotificationsCache: Set<string> | null = null;
    let cacheInitialized = false;
    
    // Gösterilen bildirim ID'lerini al (cached)
    const getShownNotifications = (): Set<string> => {
      if (!cacheInitialized) {
        try {
          const stored = localStorage.getItem(shownNotificationsKey);
          shownNotificationsCache = stored ? new Set(JSON.parse(stored)) : new Set();
          cacheInitialized = true;
        } catch {
          shownNotificationsCache = new Set();
          cacheInitialized = true;
        }
      }
      return shownNotificationsCache || new Set();
    };
    
    // Batch localStorage writes to improve performance
    let pendingWrites: Set<string> = new Set();
    let writeTimeout: NodeJS.Timeout | null = null;
    
    // Gösterilen bildirim ID'sini kaydet (debounced)
    const markAsShown = (notificationId: string) => {
      const shown = getShownNotifications();
      shown.add(notificationId);
      pendingWrites.add(notificationId);
      
      // Clear existing timeout
      if (writeTimeout) {
        clearTimeout(writeTimeout);
      }
      
      // Batch write after 500ms of inactivity
      writeTimeout = setTimeout(() => {
        try {
          const allShown = getShownNotifications();
          // Limit cache size to prevent localStorage bloat (keep last 1000)
          const shownArray = Array.from(allShown);
          const limitedArray = shownArray.slice(-1000);
          localStorage.setItem(shownNotificationsKey, JSON.stringify(limitedArray));
          shownNotificationsCache = new Set(limitedArray);
          pendingWrites.clear();
        } catch (error) {
          // Silently handle localStorage errors
        }
      }, 500);
    };

    // Gerçek zamanlı dinleme başlat
    const unsubscribe = subscribeToNotifications(user.id, { limit: 10 }, (firebaseNotifications) => {
      try {
        const mappedNotifications = firebaseNotifications.map(mapNotification);
        
        setNotifications((prev) => {
          // Show toast for new unread notifications
          const newNotifications = mappedNotifications.filter((n) => 
            !n.read && !prev.find(old => old.id === n.id)
          );
          
          const shownNotifications = getShownNotifications();
          
          newNotifications.forEach((notification) => {
            // Sadece görev atama bildirimleri sürekli gösterilsin
            const isTaskAssignment = notification.type === "task_assigned";
            
            // Eğer görev atama bildirimi ise veya daha önce gösterilmemişse toast göster
            if (isTaskAssignment || !shownNotifications.has(notification.id)) {
              toast.info(notification.title, {
                description: notification.message || undefined,
              });
              
              // Görev atama bildirimi değilse, gösterildi olarak işaretle
              if (!isTaskAssignment) {
                markAsShown(notification.id);
              }
            }
          });
          return mappedNotifications;
        });
        setUnreadCount(mappedNotifications.filter((n) => !n.read).length);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Real-time notifications update error:", error);
        }
      }
    });
    
    // Cleanup: Component unmount olduğunda unsubscribe et
    return () => {
      unsubscribe();
      if (writeTimeout) {
        clearTimeout(writeTimeout);
      }
      // Final write before cleanup
      if (pendingWrites.size > 0) {
        try {
          const allShown = getShownNotifications();
          const shownArray = Array.from(allShown);
          const limitedArray = shownArray.slice(-1000);
          localStorage.setItem(shownNotificationsKey, JSON.stringify(limitedArray));
        } catch (error) {
          // Silently handle
        }
      }
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Bildirim güncellenirken hata:", error);
      }
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      await markAllNotificationsAsRead(user.id);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
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
      
      // Bildirimi güncelle: action metadata ekle ve okundu işaretle
      const updatedMetadata = { ...notification.metadata, action: "accepted" };
      await updateNotification(notification.id, {
        metadata: updatedMetadata,
        read: true
      });

      // Yerel state'i güncelle
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, read: true, metadata: updatedMetadata }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast.success("Görev kabul edildi");
      setOpen(false);
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
      
      // Bildirimi güncelle: action metadata ekle ve okundu işaretle
      const updatedMetadata = { ...selectedNotification.metadata, action: "rejected" };
      await updateNotification(selectedNotification.id, {
        metadata: updatedMetadata,
        read: true
      });

      // Yerel state'i güncelle
      setNotifications(prev =>
        prev.map(n =>
          n.id === selectedNotification.id
            ? { ...n, read: true, metadata: updatedMetadata }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast.success("Görev reddedildi");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedNotification(null);
      setOpen(false);
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

      // Bildirimi güncelle
      const updatedMetadata = { ...notification.metadata, action: "rejection_approved" };
      await updateNotification(notification.id, {
        metadata: updatedMetadata,
        read: true
      });

      // Yerel state'i güncelle
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, read: true, metadata: updatedMetadata }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast.success("Görev reddi onaylandı");
      setOpen(false);
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

      // Bildirimi güncelle
      const updatedMetadata = { ...selectedNotification.metadata, action: "rejection_rejected" };
      await updateNotification(selectedNotification.id, {
        metadata: updatedMetadata,
        read: true
      });

      // Yerel state'i güncelle
      setNotifications(prev =>
        prev.map(n =>
          n.id === selectedNotification.id
            ? { ...n, read: true, metadata: updatedMetadata }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast.success("Görev reddi reddedildi, görev tekrar atanan kişiye döndü");
      setRejectRejectionDialogOpen(false);
      setRejectionRejectionReason("");
      setSelectedNotification(null);
      setOpen(false);
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

      // Bildirimi güncelle
      const updatedMetadata = { ...notification.metadata, action: "approved" };
      await updateNotification(notification.id, {
        metadata: updatedMetadata,
        read: true
      });

      // Yerel state'i güncelle
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, read: true, metadata: updatedMetadata }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast.success("Görev onaylandı");
      setOpen(false);
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
      
      // Bildirimi güncelle: action metadata ekle ve okundu işaretle
      const updatedMetadata = { ...selectedNotification.metadata, action: "rejected" };
      await updateNotification(selectedNotification.id, {
        metadata: updatedMetadata,
        read: true
      });

      // Yerel state'i güncelle
      setNotifications(prev =>
        prev.map(n =>
          n.id === selectedNotification.id
            ? { ...n, read: true, metadata: updatedMetadata }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast.success("Görev onayı reddedildi");
      setRejectApprovalDialogOpen(false);
      setRejectionApprovalReason("");
      setSelectedNotification(null);
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Görev onayı reddedilemedi";
      toast.error("Görev onayı reddedilemedi: " + message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Bildirimler</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary hover:text-primary/80"
                onClick={markAllAsRead}
              >
                Tümünü okundu işaretle
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[500px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Henüz bildirim yok</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Yeni bildirimler burada görünecek</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group relative mb-2 rounded-lg transition-all duration-200 hover:shadow-md ${
                    getNotificationColor(notification.type, notification.read)
                  } ${!notification.read ? 'shadow-sm' : ''}`}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (isActionableAssignmentNotification(notification)) {
                        return;
                      }
                      
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                      
                      // Debug
                      if (import.meta.env.DEV) {
                        console.log("Notification clicked:", {
                          type: notification.type,
                          relatedId: notification.relatedId,
                          notification
                        });
                      }
                      
                      // Yönlendirme mantığı
                      if (notification.relatedId) {
                        // Görev havuzu talebi bildirimleri - Ekip Yönetimi sayfasına yönlendir
                        if (notification.type === 'task_pool_request') {
                          setOpen(false);
                          navigate('/team-management?tab=approvals');
                          return;
                        }
                        // Görev ile ilgili bildirimler
                        if (['task_assigned', 'task_updated', 'task_completed', 'task_created', 'task_approval', 'task_deleted', 'comment_added'].includes(notification.type)) {
                          const url = `/tasks?taskId=${notification.relatedId}&view=list`;
                          if (import.meta.env.DEV) {
                            console.log("Navigating to:", url);
                          }
                          setOpen(false);
                          navigate(url);
                          return;
                        } 
                        // Sipariş bildirimleri
                        else if (['order_created', 'order_updated'].includes(notification.type)) {
                          // Metadata'dan sipariş tipini kontrol et (üretim siparişi mi normal sipariş mi)
                          const metadata = notification.metadata as { orderType?: string; [key: string]: unknown };
                          setOpen(false);
                          if (metadata?.orderType === 'production' || notification.message?.includes('üretim')) {
                            navigate(`/production?orderId=${notification.relatedId}`);
                          } else {
                            navigate(`/orders?orderId=${notification.relatedId}`);
                          }
                          return;
                        } 
                        // Talep bildirimleri
                        else if (notification.type === 'system' && notification.metadata) {
                          const metadata = notification.metadata as { requestType?: string; [key: string]: unknown };
                          if (metadata.requestType || notification.message?.includes('talep')) {
                            setOpen(false);
                            navigate(`/requests?requestId=${notification.relatedId}`);
                            return;
                          }
                        }
                        // Rol değişikliği
                        else if (notification.type === 'role_changed') {
                          setOpen(false);
                          navigate('/admin');
                          return;
                        }
                      } else {
                        // relatedId yoksa tip bazlı yönlendirme
                        if (['order_created', 'order_updated'].includes(notification.type)) {
                          const metadata = notification.metadata as { orderType?: string; [key: string]: unknown };
                          setOpen(false);
                          if (metadata?.orderType === 'production' || notification.message?.includes('üretim')) {
                            navigate('/production');
                          } else {
                            navigate('/orders');
                          }
                          return;
                        } else if (notification.type === 'system' && notification.metadata) {
                          const metadata = notification.metadata as { requestType?: string; [key: string]: unknown };
                          if (metadata.requestType || notification.message?.includes('talep')) {
                            setOpen(false);
                            navigate('/requests');
                            return;
                          }
                        } else if (notification.type === 'role_changed') {
                          setOpen(false);
                          navigate('/admin');
                          return;
                        } else if (notification.type === 'task_pool_request') {
                          setOpen(false);
                          navigate('/team-management?tab=approvals');
                          return;
                        } else if (['task_assigned', 'task_updated', 'task_completed', 'task_created', 'task_approval', 'task_deleted', 'comment_added'].includes(notification.type)) {
                          setOpen(false);
                          navigate('/tasks');
                          return;
                        }
                      }
                      
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 mt-0.5 p-2 rounded-lg ${
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
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-semibold leading-tight ${
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
                          <p className={`text-sm leading-relaxed line-clamp-3 ${
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
                          <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
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
                    <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-700">
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
                    <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-700">
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
                    <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-700">
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
                    <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-700">
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
        </ScrollArea>
        <div className="sticky bottom-0 z-10 bg-background border-t px-4 py-3">
          <Button
            variant="ghost"
            className="w-full h-9 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/5"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            <Bell className="h-4 w-4 mr-2" />
            Tüm bildirimleri gör
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

      {/* Reject Task Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi Reddet</DialogTitle>
            <DialogDescription>
              Görevi reddetmek için lütfen en az 20 karakterlik bir sebep belirtin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection_reason">Reddetme Sebebi *</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Görevi neden reddettiğinizi açıklayın (en az 20 karakter)..."
                rows={4}
                className={rejectionReason.length > 0 && rejectionReason.length < 20 ? "border-destructive" : ""}
              />
              {rejectionReason.length > 0 && rejectionReason.length < 20 && (
                <p className="text-xs text-destructive">
                  En az {20 - rejectionReason.length} karakter daha gerekli
                </p>
              )}
              {rejectionReason.length >= 20 && (
                <p className="text-xs text-muted-foreground">
                  {rejectionReason.length} / 20 karakter
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
                setSelectedNotification(null);
              }}
              disabled={processing}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectTask}
              disabled={processing || rejectionReason.trim().length < 20}
            >
              {processing ? "Reddediliyor..." : "Reddet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Rejection Dialog */}
      <Dialog open={rejectRejectionDialogOpen} onOpenChange={setRejectRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görev Reddi Reddet</DialogTitle>
            <DialogDescription>
              Görev reddi reddedildiğinde görev tekrar atanan kişiye döner. Lütfen en az 20 karakterlik bir sebep belirtin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection_rejection_reason">Reddetme Sebebi *</Label>
              <Textarea
                id="rejection_rejection_reason"
                value={rejectionRejectionReason}
                onChange={(e) => setRejectionRejectionReason(e.target.value)}
                placeholder="Görev reddi neden reddedildiğini açıklayın (en az 20 karakter)..."
                rows={4}
                className={rejectionRejectionReason.length > 0 && rejectionRejectionReason.length < 20 ? "border-destructive" : ""}
              />
              {rejectionRejectionReason.length > 0 && rejectionRejectionReason.length < 20 && (
                <p className="text-xs text-destructive">
                  En az {20 - rejectionRejectionReason.length} karakter daha gerekli
                </p>
              )}
              {rejectionRejectionReason.length >= 20 && (
                <p className="text-xs text-muted-foreground">
                  {rejectionRejectionReason.length} / 20 karakter
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectRejectionDialogOpen(false);
                setRejectionRejectionReason("");
                setSelectedNotification(null);
              }}
              disabled={processing}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectRejection}
              disabled={processing || rejectionRejectionReason.trim().length < 20}
            >
              {processing ? "Reddediliyor..." : "Reddi Reddet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Task Approval Dialog */}
      <Dialog open={rejectApprovalDialogOpen} onOpenChange={setRejectApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görev Onayını Reddet</DialogTitle>
            <DialogDescription>
              Görev onayını reddetmek için lütfen bir not ekleyin. Görev tekrar panoya dönecektir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection_approval_reason">
                Reddetme Notu <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection_approval_reason"
                value={rejectionApprovalReason}
                onChange={(e) => setRejectionApprovalReason(e.target.value)}
                placeholder="Görev onayını neden reddettiğinizi açıklayın..."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectApprovalDialogOpen(false);
                setRejectionApprovalReason("");
                setSelectedNotification(null);
              }}
              disabled={processing}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectTaskApproval}
              disabled={processing || !rejectionApprovalReason.trim()}
            >
              {processing ? "Reddediliyor..." : "Reddet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
