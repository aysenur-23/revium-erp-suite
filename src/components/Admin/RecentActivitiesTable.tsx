import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecentActivities, AuditLog } from "@/services/firebase/auditLogsService";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import { Info, ExternalLink, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCustomerById, getCustomers } from "@/services/firebase/customerService";
import { getOrderById } from "@/services/firebase/orderService";
import { getTaskById } from "@/services/firebase/taskService";
import { getProjectById } from "@/services/firebase/projectService";
import { getWarrantyRecordById } from "@/services/firebase/warrantyService";
import { getProductById, getProducts } from "@/services/firebase/productService";
import { getAllUsers } from "@/services/firebase/authService";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Oluşturma",
  UPDATE: "Güncelleme",
  DELETE: "Silme",
};

const ACTION_COLORS: Record<string, "default" | "secondary" | "destructive"> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

const TABLE_LABELS: Record<string, string> = {
  tasks: "Görevler",
  user_roles: "Kullanıcı Rolleri",
  departments: "Departmanlar",
  production_orders: "Üretim Siparişleri",
  production_processes: "Üretim Süreçleri",
  profiles: "Profiller",
  notifications: "Bildirimler",
  shared_files: "Paylaşılan Dosyalar",
  task_assignments: "Görev Atamaları",
  role_permissions: "Rol Yetkileri",
  customers: "Müşteriler",
  orders: "Siparişler",
  warranty: "Garanti",
  projects: "Projeler",
  user_logins: "Giriş Kayıtları",
  raw_materials: "Hammaddeler",
  products: "Ürünler",
  customerNotes: "Müşteri Notları",
  users: "Kullanıcılar",
  materials: "Malzemeler",
};

// Alan isimlerini Türkçe'ye çevir
const FIELD_LABELS: Record<string, string> = {
  title: "Başlık",
  description: "Açıklama",
  status: "Durum",
  priority: "Öncelik",
  dueDate: "Bitiş Tarihi",
  assignedTo: "Atanan",
  createdBy: "Oluşturan",
  updatedAt: "Güncellenme Tarihi",
  customerId: "Müşteri",
  customerName: "Müşteri Adı",
  totalAmount: "Toplam Tutar",
  subtotal: "Ara Toplam",
  discountTotal: "İndirim",
  taxAmount: "KDV",
  grandTotal: "Genel Toplam",
  orderNumber: "Sipariş Numarası",
  deliveryDate: "Teslimat Tarihi",
  name: "İsim",
  email: "E-posta",
  phone: "Telefon",
  company: "Şirket",
  address: "Adres",
  role: "Rol",
  fullName: "Ad Soyad",
  department: "Departman",
  isActive: "Aktif",
  isArchived: "Arşivlendi",
  approvalStatus: "Onay Durumu",
  rejectionReason: "Red Nedeni",
  approvedBy: "Onaylayan",
  rejectedBy: "Reddeden",
  approvedAt: "Onay Tarihi",
  rejectedAt: "Red Tarihi",
  isInPool: "Görev Havuzunda",
  poolRequests: "Havuz İstekleri",
  reportType: "Rapor Tipi",
  startDate: "Başlangıç Tarihi",
  endDate: "Bitiş Tarihi",
};

// Durum değerlerini Türkçe'ye çevir
const STATUS_LABELS: Record<string, string> = {
  pending: "Beklemede",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
  confirmed: "Onaylandı",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  on_hold: "Beklemede",
  draft: "Taslak",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  none: "Yok",
  active: "Aktif",
  inactive: "Pasif",
  true: "Evet",
  false: "Hayır",
};

// Değişen alanları bul
const getChangedFields = (
  oldData?: Record<string, unknown> | null,
  newData?: Record<string, unknown> | null
): string[] => {
  if (!oldData || !newData) return [];
  return Object.keys(newData).filter((key) => {
    const previousValue = oldData[key];
    const currentValue = newData[key];
    return JSON.stringify(previousValue) !== JSON.stringify(currentValue);
  });
};

export const RecentActivitiesTable = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const [data, customersData, productsData] = await Promise.all([
          getRecentActivities(),
          getCustomers(),
          getProducts(),
        ]);
        setLogs(data);
        setCustomers(customersData);
        setProducts(productsData);
        
        // Tüm entity ID'lerini topla
        const entityMap: Record<string, Set<string>> = {
          customers: new Set(),
          orders: new Set(),
          tasks: new Set(),
          projects: new Set(),
          warranty: new Set(),
          task_assignments: new Set(),
        };
        const userIds = new Set<string>(); // Atanan kullanıcılar için
        
        data.forEach(log => {
          if (log.recordId && entityMap[log.tableName]) {
            entityMap[log.tableName].add(log.recordId);
          }
          // task_assignments için taskId ve assignedTo'yu al
          if (log.tableName === "task_assignments") {
            if (log.newData?.taskId) {
              entityMap.tasks.add(log.newData.taskId);
            }
            if (log.newData?.assignedTo) {
              userIds.add(log.newData.assignedTo);
            }
          }
        });
        
        // Entity adlarını çek
        const names: Record<string, string> = {};
        
        // Müşteriler
        if (entityMap.customers.size > 0) {
          await Promise.all(
            Array.from(entityMap.customers).map(async (id) => {
              try {
                const customer = await getCustomerById(id);
                if (customer?.name) {
                  names[`customers_${id}`] = customer.name;
                }
              } catch (error) {
                // Sessizce devam et
              }
            })
          );
        }
        
        // Siparişler
        if (entityMap.orders.size > 0) {
          await Promise.all(
            Array.from(entityMap.orders).map(async (id) => {
              try {
                const order = await getOrderById(id);
                if (order?.orderNumber) {
                  names[`orders_${id}`] = `Sipariş #${order.orderNumber}`;
                } else if (order?.customerName) {
                  names[`orders_${id}`] = order.customerName;
                }
              } catch (error) {
                // Sessizce devam et
              }
            })
          );
        }
        
        // Görevler - proje bilgisi ile birlikte
        if (entityMap.tasks.size > 0) {
          const projectIds = new Set<string>();
          await Promise.all(
            Array.from(entityMap.tasks).map(async (id) => {
              try {
                const task = await getTaskById(id);
                if (task?.title) {
                  names[`tasks_${id}`] = task.title;
                  // Proje ID'sini de kaydet - taskId -> projectId mapping
                  if (task.projectId) {
                    projectIds.add(task.projectId);
                    names[`task_project_${id}`] = task.projectId; // Mapping için
                  }
                }
              } catch (error) {
                // Sessizce devam et
              }
            })
          );
          // Görevlerin projelerini de çek
          if (projectIds.size > 0) {
            await Promise.all(
              Array.from(projectIds).map(async (projectId) => {
                try {
                  const project = await getProjectById(projectId);
                  if (project?.name) {
                    names[`projects_${projectId}`] = project.name;
                  }
                } catch (error) {
                  // Sessizce devam et
                }
              })
            );
          }
        }
        
        // Projeler
        if (entityMap.projects.size > 0) {
          await Promise.all(
            Array.from(entityMap.projects).map(async (id) => {
              try {
                const project = await getProjectById(id);
                if (project?.name) {
                  names[`projects_${id}`] = project.name;
                }
              } catch (error) {
                // Sessizce devam et
              }
            })
          );
        }
        
        // Garanti kayıtları
        if (entityMap.warranty.size > 0) {
          await Promise.all(
            Array.from(entityMap.warranty).map(async (id) => {
              try {
                const warranty = await getWarrantyRecordById(id);
                if (warranty) {
                  let name = "";
                  if (warranty.customerId) {
                    try {
                      const customer = await getCustomerById(warranty.customerId);
                      if (customer?.name) {
                        name = customer.name;
                      }
                    } catch (error) {
                      // Sessizce devam et
                    }
                  }
                  if (!name && warranty.productId) {
                    try {
                      const product = await getProductById(warranty.productId);
                      if (product?.name) {
                        name = product.name;
                      }
                    } catch (error) {
                      // Sessizce devam et
                    }
                  }
                  if (name) {
                    names[`warranty_${id}`] = name;
                  }
                }
              } catch (error) {
                // Sessizce devam et
              }
            })
          );
        }
        
        // Kullanıcı adlarını çek (task_assignments için)
        if (userIds.size > 0) {
          try {
            const allUsers = await getAllUsers();
            allUsers.forEach(user => {
              if (userIds.has(user.id)) {
                names[`users_${user.id}`] = user.fullName || user.displayName || user.email || "Bilinmeyen";
              }
            });
          } catch (error) {
            // Sessizce devam et
          }
        }
        
        setEntityNames(names);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Son Aktiviteler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detay bilgisi çıkar
  const getActivityDetails = (log: AuditLog, entityNames: Record<string, string>): string | null => {
    try {
      const newData = log.newData || {};
      const oldData = log.oldData || {};

      switch (log.tableName) {
        case "tasks":
          if (log.action === "CREATE") {
            return newData.title ? `"${newData.title}"` : null;
          } else if (log.action === "UPDATE") {
            if (newData.title && oldData.title && newData.title !== oldData.title) {
              return `"${oldData.title}" → "${newData.title}"`;
            }
            if (newData.status && oldData.status && newData.status !== oldData.status) {
              const statusLabels: Record<string, string> = {
                pending: "Yapılacak",
                in_progress: "Devam Ediyor",
                completed: "Tamamlandı",
                cancelled: "İptal Edildi",
              };
              return `Durum: ${statusLabels[oldData.status] || oldData.status} → ${statusLabels[newData.status] || newData.status}`;
            }
            return newData.title ? `"${newData.title}"` : null;
          }
          return newData.title || oldData.title ? `"${newData.title || oldData.title}"` : null;

        case "production_orders":
          if (log.action === "CREATE") {
            return newData.orderNumber ? `Sipariş #${newData.orderNumber}` : null;
          }
          return newData.orderNumber || oldData.orderNumber 
            ? `Sipariş #${newData.orderNumber || oldData.orderNumber}` 
            : null;

        case "departments":
          if (log.action === "CREATE") {
            return newData.name ? `"${newData.name}"` : null;
          } else if (log.action === "UPDATE") {
            if (newData.name && oldData.name && newData.name !== oldData.name) {
              return `"${oldData.name}" → "${newData.name}"`;
            }
            return newData.name ? `"${newData.name}"` : null;
          }
          return newData.name || oldData.name ? `"${newData.name || oldData.name}"` : null;

        case "profiles":
          if (log.action === "CREATE") {
            return newData.fullName || newData.displayName || newData.email || null;
          } else if (log.action === "UPDATE") {
            if (newData.fullName && oldData.fullName && newData.fullName !== oldData.fullName) {
              return `${oldData.fullName} → ${newData.fullName}`;
            }
            return newData.fullName || newData.displayName || newData.email || null;
          }
          return newData.fullName || newData.displayName || newData.email || oldData.fullName || oldData.displayName || oldData.email || null;

        case "task_assignments":
          if (log.action === "CREATE") {
            if (newData.taskId && entityNames[`tasks_${newData.taskId}`]) {
              return `Görev: ${entityNames[`tasks_${newData.taskId}`]}`;
            }
            return newData.taskId ? `Görev ID: ${newData.taskId.substring(0, 8)}...` : null;
          }
          return null;
        
        case "orders":
          if (log.action === "CREATE" || log.action === "UPDATE") {
            if (log.recordId && entityNames[`orders_${log.recordId}`]) {
              return entityNames[`orders_${log.recordId}`];
            }
            return newData.orderNumber ? `Sipariş #${newData.orderNumber}` : null;
          }
          if (log.recordId && entityNames[`orders_${log.recordId}`]) {
            return entityNames[`orders_${log.recordId}`];
          }
          return null;
        
        case "projects":
          if (log.action === "CREATE" || log.action === "UPDATE") {
            if (log.recordId && entityNames[`projects_${log.recordId}`]) {
              return entityNames[`projects_${log.recordId}`];
            }
            return newData.name ? `"${newData.name}"` : null;
          }
          if (log.recordId && entityNames[`projects_${log.recordId}`]) {
            return entityNames[`projects_${log.recordId}`];
          }
          return null;
        
        case "warranty":
          if (log.recordId && entityNames[`warranty_${log.recordId}`]) {
            return entityNames[`warranty_${log.recordId}`];
          }
          if (log.action === "CREATE" || log.action === "UPDATE") {
            return newData.reason || null;
          }
          return null;

        case "customers":
          if (log.action === "CREATE") {
            return newData.name ? `"${newData.name}"` : null;
          } else if (log.action === "UPDATE") {
            if (newData.name && oldData.name && newData.name !== oldData.name) {
              return `"${oldData.name}" → "${newData.name}"`;
            }
            return newData.name ? `"${newData.name}"` : null;
          }
          return newData.name || oldData.name ? `"${newData.name || oldData.name}"` : null;

        case "user_logins":
          // Metadata'dan giriş yöntemini al
          if (log.metadata && typeof log.metadata === 'object' && 'method' in log.metadata) {
            const methodLabels: Record<string, string> = {
              EMAIL: "E-posta ile giriş",
              GOOGLE: "Google ile giriş",
            };
            const method = (log.metadata as { method?: string }).method;
            return method ? (methodLabels[method] || `Giriş (${method})`) : "Sistem girişi";
          }
          return "Sistem girişi";

        case "products":
          if (log.action === "CREATE") {
            return newData.name ? `"${newData.name}"` : null;
          } else if (log.action === "UPDATE") {
            if (newData.name && oldData.name && newData.name !== oldData.name) {
              return `"${oldData.name}" → "${newData.name}"`;
            }
            return newData.name ? `"${newData.name}"` : null;
          }
          return newData.name || oldData.name ? `"${newData.name || oldData.name}"` : null;

        case "raw_materials":
          if (log.action === "CREATE") {
            return newData.name ? `"${newData.name}"` : null;
          } else if (log.action === "UPDATE") {
            if (newData.name && oldData.name && newData.name !== oldData.name) {
              return `"${oldData.name}" → "${newData.name}"`;
            }
            return newData.name ? `"${newData.name}"` : null;
          }
          return newData.name || oldData.name ? `"${newData.name || oldData.name}"` : null;

        case "customerNotes":
          if (log.action === "CREATE") {
            return newData.content || newData.note ? `"${(newData.content || newData.note).substring(0, 50)}${(newData.content || newData.note).length > 50 ? '...' : ''}"` : null;
          } else if (log.action === "UPDATE") {
            return newData.content || newData.note ? `"${(newData.content || newData.note).substring(0, 50)}${(newData.content || newData.note).length > 50 ? '...' : ''}"` : null;
          }
          return (newData.content || newData.note || oldData.content || oldData.note) 
            ? `"${((newData.content || newData.note || oldData.content || oldData.note) as string).substring(0, 50)}${((newData.content || newData.note || oldData.content || oldData.note) as string).length > 50 ? '...' : ''}"` 
            : null;

        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  };

  // Değeri anlaşılır formata çevir
  const formatValue = (value: any, fieldName?: string, tableName?: string): string => {
    if (value === null || value === undefined) return "Yok";
    if (typeof value === "boolean") return value ? "Evet" : "Hayır";
    if (value instanceof Date) {
      return format(value, "dd.MM.yyyy HH:mm", { locale: tr });
    }
    if (typeof value === "object" && value.toDate) {
      // Firebase Timestamp
      return format(value.toDate(), "dd.MM.yyyy HH:mm", { locale: tr });
    }
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        // Array içindeki ID'leri de kontrol et
        if (value.length > 0 && typeof value[0] === "string" && value[0].length > 20) {
          // Muhtemelen ID array'i
          const names = value.map((id: string) => {
            if (fieldName === "assignedUsers" || fieldName === "assignedTo") {
              return entityNames[`users_${id}`] || id.substring(0, 8) + "...";
            }
            if (fieldName === "taskIds") {
              return entityNames[`tasks_${id}`] || id.substring(0, 8) + "...";
            }
            return id.substring(0, 8) + "...";
          });
          return names.join(", ");
        }
        return value.length > 0 ? `${value.length} öğe` : "Boş";
      }
      return JSON.stringify(value);
    }
    
    // ID kontrolü - eğer değer uzun bir string ise ve entityNames'de varsa isim göster
    const stringValue = String(value);
    if (stringValue.length > 15 && stringValue.length < 30) {
      // Muhtemelen bir ID
      // Kullanıcı ID'leri
      if (fieldName === "assignedTo" || fieldName === "assignedBy" || fieldName === "userId" || fieldName === "createdBy" || fieldName === "updatedBy") {
        if (entityNames[`users_${stringValue}`]) {
          return entityNames[`users_${stringValue}`];
        }
      }
      // Görev ID'leri
      if (fieldName === "taskId" || fieldName === "task_id") {
        if (entityNames[`tasks_${stringValue}`]) {
          return entityNames[`tasks_${stringValue}`];
        }
      }
      // Proje ID'leri
      if (fieldName === "projectId" || fieldName === "project_id") {
        if (entityNames[`projects_${stringValue}`]) {
          return entityNames[`projects_${stringValue}`];
        }
      }
      // Müşteri ID'leri
      if (fieldName === "customerId" || fieldName === "customer_id") {
        if (entityNames[`customers_${stringValue}`]) {
          return entityNames[`customers_${stringValue}`];
        }
      }
      // Sipariş ID'leri
      if (fieldName === "orderId" || fieldName === "order_id") {
        if (entityNames[`orders_${stringValue}`]) {
          return entityNames[`orders_${stringValue}`];
        }
      }
      // Ürün ID'leri
      if (fieldName === "productId" || fieldName === "product_id") {
        if (entityNames[`products_${stringValue}`]) {
          return entityNames[`products_${stringValue}`];
        }
      }
      // Departman ID'leri
      if (fieldName === "departmentId" || fieldName === "department_id") {
        // Departman isimlerini entityNames'den al
        const deptName = entityNames[`departments_${stringValue}`];
        if (deptName) {
          return deptName;
        }
      }
      // Genel kontrol - tableName'e göre
      if (tableName) {
        if (entityNames[`${tableName}_${stringValue}`]) {
          return entityNames[`${tableName}_${stringValue}`];
        }
      }
    }
    
    // Durum değerlerini kontrol et
    if (fieldName === "status" && STATUS_LABELS[String(value)]) {
      return STATUS_LABELS[String(value)];
    }
    if (fieldName === "approvalStatus" && STATUS_LABELS[String(value)]) {
      return STATUS_LABELS[String(value)];
    }
    return String(value);
  };

  // Kayıt adını al
  const getRecordDisplayName = (data: any, tableName: string, recordId?: string | null): string | null => {
    if (!data && !recordId) return null;
    
    // Önce entityNames'den kontrol et
    if (recordId && entityNames[`${tableName}_${recordId}`]) {
      return entityNames[`${tableName}_${recordId}`];
    }
    
    // Sonra data'dan kontrol et
    if (tableName === "orders" && data?.orderNumber) return `Sipariş #${data.orderNumber}`;
    if (tableName === "tasks" && data?.title) return data.title;
    if (tableName === "customers" && data?.name) return data.name;
    if (tableName === "products" && data?.name) return data.name;
    if (tableName === "projects" && data?.name) return data.name;
    if (tableName === "reports" && data?.title) return data.title;
    if (tableName === "task_assignments" && data?.taskTitle) return `Görev: ${data.taskTitle}`;
    if (tableName === "raw_materials" && data?.name) return data.name;
    if (tableName === "customerNotes" && (data?.content || data?.note)) {
      const note = data.content || data.note;
      return note.length > 50 ? `${note.substring(0, 50)}...` : note;
    }
    if (tableName === "warranty") {
      const customerId = data?.customerId;
      const productId = data?.productId;
      const customer = customerId ? customers.find(c => c.id === customerId) : null;
      const product = productId ? products.find(p => p.id === productId) : null;
      const customerName = customer?.name || "Bilinmeyen Müşteri";
      const productName = product?.name || "Bilinmeyen Ürün";
      return `${customerName} - ${productName}`;
    }
    if (tableName === "user_logins") {
      if (data?.metadata && typeof data.metadata === 'object' && 'method' in data.metadata) {
        const methodLabels: Record<string, string> = {
          EMAIL: "E-posta ile giriş",
          GOOGLE: "Google ile giriş",
        };
        const method = (data.metadata as { method?: string }).method;
        return method ? (methodLabels[method] || `Giriş (${method})`) : "Sistem girişi";
      }
      return "Sistem girişi";
    }
    if (data?.name) return data.name;
    if (data?.title) return data.title;
    return null;
  };

  const handleLogClick = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle 
          className={cn(
            "text-base sm:text-lg",
            "cursor-pointer hover:text-primary transition-colors",
            "flex items-center gap-2"
          )}
          onClick={() => navigate("/admin?tab=logs")}
        >
          Son Aktiviteler
          <ExternalLink className="h-4 w-4 opacity-60" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 sm:space-y-3">
          {logs.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
              Henüz aktivite bulunmuyor
            </p>
          ) : (
            logs.map((log) => {
              return (
                <div
                  key={log.id}
                  className="p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => handleLogClick(log)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <Badge variant={ACTION_COLORS[log.action]} className="flex-shrink-0 text-xs">
                        {log.tableName === "user_logins" ? "Giriş Yapıldı" : ACTION_LABELS[log.action]}
                      </Badge>
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {(() => {
                          const userName = log.userName || log.userEmail || "Sistem";
                          const actionVerb = log.action === "CREATE" ? "oluşturdu" : 
                                            log.action === "UPDATE" ? "güncelledi" : 
                                            log.action === "DELETE" ? "sildi" : "yaptı";
                          
                          // Giriş logları
                          if (log.tableName === "user_logins") {
                            return `${userName} Giriş yaptı`;
                          }
                          
                          // Görev atama logları - özel format
                          if (log.tableName === "task_assignments" && log.action === "CREATE") {
                            const taskId = log.newData?.taskId;
                            const assignedToId = log.newData?.assignedTo;
                            const taskName = taskId && entityNames[`tasks_${taskId}`] 
                              ? entityNames[`tasks_${taskId}`] 
                              : (log.newData?.taskTitle || "görev");
                            const assignedUserName = assignedToId && entityNames[`users_${assignedToId}`]
                              ? entityNames[`users_${assignedToId}`]
                              : "bir kişiyi";
                            
                            // Proje bilgisini kontrol et - taskId'den projectId'yi bul
                            if (taskId && entityNames[`task_project_${taskId}`]) {
                              const projectId = entityNames[`task_project_${taskId}`];
                              if (entityNames[`projects_${projectId}`]) {
                                const projectName = entityNames[`projects_${projectId}`];
                                return `${userName} "${projectName}" projesindeki "${taskName}" görevini oluşturdu ve ${assignedUserName} kişisini göreve atadı`;
                              }
                            }
                            
                            return `${userName} "${taskName}" görevini oluşturdu ve ${assignedUserName} kişisini göreve atadı`;
                          }
                          
                          // Görev logları - proje bilgisi ile
                          if (log.tableName === "tasks" && log.recordId) {
                            const taskName = entityNames[`tasks_${log.recordId}`] || 
                                            log.newData?.title || 
                                            log.oldData?.title || 
                                            "görev";
                            
                            // Proje bilgisini kontrol et
                            const projectId = log.newData?.projectId || log.oldData?.projectId;
                            const projectPrefix = projectId && entityNames[`projects_${projectId}`] 
                              ? `"${entityNames[`projects_${projectId}`]}" projesindeki `
                              : "";
                            
                            if (log.action === "UPDATE" && log.oldData && log.newData) {
                              const changedFields = getChangedFields(log.oldData, log.newData);
                              if (changedFields.length > 0) {
                                const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
                                const fieldsText = fieldLabels.length === 1 
                                  ? `'${fieldLabels[0]}' alanını`
                                  : fieldLabels.length === 2
                                  ? `'${fieldLabels[0]}' ve '${fieldLabels[1]}' alanlarını`
                                  : `'${fieldLabels.join("', '")}'${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
                                return `${userName} ${projectPrefix}"${taskName}" görevinin ${fieldsText} ${actionVerb}`;
                              }
                            }
                            return `${userName} ${projectPrefix}"${taskName}" görevini ${actionVerb}`;
                          }
                          
                          // Müşteri logları
                          if (log.tableName === "customers" && log.recordId) {
                            const customerName = entityNames[`customers_${log.recordId}`] || 
                                               log.newData?.name || 
                                               log.oldData?.name || 
                                               "müşteri";
                            if (log.action === "UPDATE" && log.oldData && log.newData) {
                              const changedFields = getChangedFields(log.oldData, log.newData);
                              if (changedFields.length > 0) {
                                const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
                                const fieldsText = fieldLabels.length === 1 
                                  ? `'${fieldLabels[0]}' alanını`
                                  : fieldLabels.length === 2
                                  ? `'${fieldLabels[0]}' ve '${fieldLabels[1]}' alanlarını`
                                  : `'${fieldLabels.join("', '")}'${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
                                return `${userName} "${customerName}" müşterisinin ${fieldsText} ${actionVerb}`;
                              }
                            }
                            return `${userName} "${customerName}" müşterisini ${actionVerb}`;
                          }
                          
                          // Sipariş logları
                          if (log.tableName === "orders" && log.recordId) {
                            const orderName = entityNames[`orders_${log.recordId}`] || 
                                             (log.newData?.orderNumber ? `Sipariş #${log.newData.orderNumber}` : null) ||
                                             (log.oldData?.orderNumber ? `Sipariş #${log.oldData.orderNumber}` : null) ||
                                             "sipariş";
                            if (log.action === "UPDATE" && log.oldData && log.newData) {
                              const changedFields = getChangedFields(log.oldData, log.newData);
                              if (changedFields.length > 0) {
                                const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
                                const fieldsText = fieldLabels.length === 1 
                                  ? `'${fieldLabels[0]}' alanını`
                                  : fieldLabels.length === 2
                                  ? `'${fieldLabels[0]}' ve '${fieldLabels[1]}' alanlarını`
                                  : `'${fieldLabels.join("', '")}'${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
                                return `${userName} "${orderName}" siparişinin ${fieldsText} ${actionVerb}`;
                              }
                            }
                            return `${userName} "${orderName}" siparişini ${actionVerb}`;
                          }
                          
                          // Ürün logları
                          if (log.tableName === "products" && log.recordId) {
                            const productName = entityNames[`products_${log.recordId}`] || 
                                               log.newData?.name || 
                                               log.oldData?.name || 
                                               "ürün";
                            if (log.action === "UPDATE" && log.oldData && log.newData) {
                              const changedFields = getChangedFields(log.oldData, log.newData);
                              if (changedFields.length > 0) {
                                const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
                                const fieldsText = fieldLabels.length === 1 
                                  ? `'${fieldLabels[0]}' alanını`
                                  : fieldLabels.length === 2
                                  ? `'${fieldLabels[0]}' ve '${fieldLabels[1]}' alanlarını`
                                  : `'${fieldLabels.join("', '")}'${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
                                return `${userName} "${productName}" ürününün ${fieldsText} ${actionVerb}`;
                              }
                            }
                            return `${userName} "${productName}" ürününü ${actionVerb}`;
                          }
                          
                          // Proje logları
                          if (log.tableName === "projects" && log.recordId) {
                            const projectName = entityNames[`projects_${log.recordId}`] || 
                                              log.newData?.name || 
                                              log.oldData?.name || 
                                              "proje";
                            if (log.action === "UPDATE" && log.oldData && log.newData) {
                              const changedFields = getChangedFields(log.oldData, log.newData);
                              if (changedFields.length > 0) {
                                const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
                                const fieldsText = fieldLabels.length === 1 
                                  ? `'${fieldLabels[0]}' alanını`
                                  : fieldLabels.length === 2
                                  ? `'${fieldLabels[0]}' ve '${fieldLabels[1]}' alanlarını`
                                  : `'${fieldLabels.join("', '")}'${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
                                return `${userName} "${projectName}" projesinin ${fieldsText} ${actionVerb}`;
                              }
                            }
                            return `${userName} "${projectName}" projesini ${actionVerb}`;
                          }
                          
                          // Diğer loglar - entity adı ile
                          if (log.recordId && entityNames[`${log.tableName}_${log.recordId}`]) {
                            const entityName = entityNames[`${log.tableName}_${log.recordId}`];
                            const tableLabel = TABLE_LABELS[log.tableName] || log.tableName;
                            return `${userName} "${entityName}" ${tableLabel.toLowerCase()} kaydını ${actionVerb}`;
                          }
                          
                          // Fallback
                          const actionLabel = ACTION_LABELS[log.action] || "İşlem";
                          return `${userName} ${actionLabel} yaptı`;
                        })()}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(log.createdAt.toDate(), {
                        addSuffix: true,
                        locale: tr,
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>

      {/* Detay Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aktivite Detayları</DialogTitle>
            <DialogDescription>
              {selectedLog && (
                <>
                  {TABLE_LABELS[selectedLog.tableName] || selectedLog.tableName} - {ACTION_LABELS[selectedLog.action]}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              {/* Genel Bilgiler */}
              <div className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Genel Bilgiler
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kullanıcı</span>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
                        {(selectedLog.userName || selectedLog.userEmail || "S").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{selectedLog.userName || (selectedLog.userEmail ? selectedLog.userEmail.split("@")[0] : "Sistem")}</span>
                        {selectedLog.userEmail && (
                          <span className="text-xs text-muted-foreground">{selectedLog.userEmail}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kayıt Bilgileri</span>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">{TABLE_LABELS[selectedLog.tableName] || selectedLog.tableName}</span>
                      {(() => {
                        const recordName = getRecordDisplayName(selectedLog.newData || selectedLog.oldData, selectedLog.tableName, selectedLog.recordId) ||
                                          getRecordDisplayName(selectedLog.oldData, selectedLog.tableName, selectedLog.recordId);
                        if (recordName) {
                          return <span className="font-semibold text-sm mt-1">{recordName}</span>;
                        }
                        const tableLabel = TABLE_LABELS[selectedLog.tableName] || selectedLog.tableName;
                        return <span className="text-xs text-muted-foreground mt-1">{tableLabel}</span>;
                      })()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">İşlem Tipi</span>
                    <div>
                      <Badge variant={ACTION_COLORS[selectedLog.action]}>
                        {selectedLog.tableName === "user_logins" ? "Giriş Yapıldı" : ACTION_LABELS[selectedLog.action]}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tarih & Saat</span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{format(selectedLog.createdAt.toDate(), "dd MMMM yyyy", { locale: tr })}</span>
                      <span className="text-xs text-muted-foreground">{format(selectedLog.createdAt.toDate(), "HH:mm:ss", { locale: tr })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Değişiklik Detayları - UPDATE için */}
              {selectedLog.action === "UPDATE" && selectedLog.oldData && selectedLog.newData && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    Değişiklik Detayları
                    <Badge variant="outline" className="ml-auto text-xs">
                      {getChangedFields(selectedLog.oldData, selectedLog.newData).length} alan değiştirildi
                    </Badge>
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Alan</TableHead>
                          <TableHead>Eski Değer</TableHead>
                          <TableHead>Yeni Değer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getChangedFields(selectedLog.oldData, selectedLog.newData).map((field) => {
                          const fieldLabel = FIELD_LABELS[field] || field;
                          const oldValue = formatValue(selectedLog.oldData[field], field, selectedLog.tableName);
                          const newValue = formatValue(selectedLog.newData[field], field, selectedLog.tableName);
                          return (
                            <TableRow key={field}>
                              <TableCell className="font-medium">{fieldLabel}</TableCell>
                              <TableCell className="text-muted-foreground">{oldValue}</TableCell>
                              <TableCell className="font-medium text-green-600 dark:text-green-400">{newValue}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Oluşturulan Bilgiler - CREATE için */}
              {selectedLog.action === "CREATE" && selectedLog.newData && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                    Oluşturulan Bilgiler
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Alan</TableHead>
                          <TableHead>Değer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(selectedLog.newData)
                          .filter(([key]) => !key.startsWith('_') && key !== 'id')
                          .slice(0, 20)
                          .map(([key, value]) => {
                            const fieldLabel = FIELD_LABELS[key] || key;
                            const formattedValue = formatValue(value, key, selectedLog.tableName);
                            return (
                              <TableRow key={key}>
                                <TableCell className="font-medium">{fieldLabel}</TableCell>
                                <TableCell>{formattedValue}</TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Silinen Bilgiler - DELETE için */}
              {selectedLog.action === "DELETE" && selectedLog.oldData && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                    Silinen Bilgiler
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Alan</TableHead>
                          <TableHead>Değer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(selectedLog.oldData)
                          .filter(([key]) => !key.startsWith('_') && key !== 'id')
                          .slice(0, 20)
                          .map(([key, value]) => {
                            const fieldLabel = FIELD_LABELS[key] || key;
                            const formattedValue = formatValue(value, key, selectedLog.tableName);
                            return (
                              <TableRow key={key}>
                                <TableCell className="font-medium">{fieldLabel}</TableCell>
                                <TableCell className="text-muted-foreground">{formattedValue}</TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
