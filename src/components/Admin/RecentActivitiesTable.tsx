import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecentActivities, AuditLog } from "@/services/firebase/auditLogsService";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Info } from "lucide-react";
import { getCustomerById } from "@/services/firebase/customerService";
import { getOrderById } from "@/services/firebase/orderService";
import { getTaskById } from "@/services/firebase/taskService";
import { getProjectById } from "@/services/firebase/projectService";
import { getWarrantyRecordById } from "@/services/firebase/warrantyService";
import { getProductById } from "@/services/firebase/productService";

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
};

export const RecentActivitiesTable = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getRecentActivities();
        setLogs(data);
        
        // Tüm entity ID'lerini topla
        const entityMap: Record<string, Set<string>> = {
          customers: new Set(),
          orders: new Set(),
          tasks: new Set(),
          projects: new Set(),
          warranty: new Set(),
          task_assignments: new Set(),
        };
        
        data.forEach(log => {
          if (log.recordId && entityMap[log.tableName]) {
            entityMap[log.tableName].add(log.recordId);
          }
          // task_assignments için taskId'yi de al
          if (log.tableName === "task_assignments" && log.newData?.taskId) {
            entityMap.tasks.add(log.newData.taskId);
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
        
        // Görevler
        if (entityMap.tasks.size > 0) {
          await Promise.all(
            Array.from(entityMap.tasks).map(async (id) => {
              try {
                const task = await getTaskById(id);
                if (task?.title) {
                  names[`tasks_${id}`] = task.title;
                }
              } catch (error) {
                // Sessizce devam et
              }
            })
          );
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

        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Son Aktiviteler</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 sm:space-y-3">
          {logs.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
              Henüz aktivite bulunmuyor
            </p>
          ) : (
            logs.map((log) => {
              const details = getActivityDetails(log, entityNames);
              return (
                <div
                  key={log.id}
                  className="p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors space-y-1.5 sm:space-y-2"
                >
                  <div className="flex items-start sm:items-center justify-between gap-2">
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <Badge variant={ACTION_COLORS[log.action]} className="flex-shrink-0 text-xs">
                        {ACTION_LABELS[log.action]}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {TABLE_LABELS[log.tableName] || log.tableName}
                        </p>
                        {details && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {details}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(log.createdAt.toDate(), {
                        addSuffix: true,
                        locale: tr,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground flex-wrap">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {log.userName || log.userEmail || "Sistem"}
                    </span>
                    {log.recordId && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        {entityNames[`${log.tableName}_${log.recordId}`] ? (
                          <span className="truncate">{entityNames[`${log.tableName}_${log.recordId}`]}</span>
                        ) : (
                          <span className="truncate hidden sm:inline">ID: {log.recordId.substring(0, 8)}...</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
