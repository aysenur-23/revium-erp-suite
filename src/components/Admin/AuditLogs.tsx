import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getAuditLogs, getTeamMemberLogs, AuditLog } from "@/services/firebase/auditLogsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Download, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { getDepartments, getDepartmentById, Department } from "@/services/firebase/departmentService";
import { getCustomers, Customer, getCustomerById } from "@/services/firebase/customerService";
import { getProducts, Product, getProductById } from "@/services/firebase/productService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { getTaskById } from "@/services/firebase/taskService";
import { getOrderById } from "@/services/firebase/orderService";
import { getProjectById } from "@/services/firebase/projectService";
import { getWarrantyRecordById } from "@/services/firebase/warrantyService";

const ACTION_META: Record<
  AuditLog["action"],
  {
    color: string;
    label: string;
    verb: string;
    short: string;
  }
> = {
  CREATE: {
    color: "bg-green-500",
    label: "Oluşturma",
    verb: "oluşturdu",
    short: "Yeni kayıt",
  },
  UPDATE: {
    color: "bg-blue-500",
    label: "Güncelleme",
    verb: "güncelledi",
    short: "Güncelleme",
  },
  DELETE: {
    color: "bg-red-500",
    label: "Silme",
    verb: "sildi",
    short: "Silme",
  },
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
  orders: "Siparişler",
  customers: "Müşteriler",
  products: "Ürünler",
  projects: "Projeler",
  reports: "Raporlar",
  warranty: "Garanti",
  user_logins: "Giriş Kayıtları",
  raw_materials: "Hammaddeler",
  customerNotes: "Müşteri Notları",
  users: "Kullanıcılar",
  materials: "Malzemeler",
};

// Menü isimleri
const MENU_LABELS: Record<string, string> = {
  tasks: "Görevler",
  orders: "Siparişler",
  customers: "Müşteriler",
  products: "Ürünler",
  production_orders: "Üretim Siparişleri",
  user_roles: "Kullanıcı Yönetimi",
  departments: "Departmanlar",
  profiles: "Profil Ayarları",
  notifications: "Bildirimler",
  shared_files: "Paylaşılan Dosyalar",
  task_assignments: "Görev Atamaları",
  role_permissions: "Rol Yetkileri",
  projects: "Projeler",
  reports: "Raporlar",
  warranty: "Satış Sonrası Takip",
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

interface AuditLogsProps {
  mode?: "admin" | "team" | "personal";
  userId?: string; // Team Leader ID for 'team' mode, User ID for 'personal' mode
}

export const AuditLogs = ({ mode = "admin", userId }: AuditLogsProps) => {
  const { user, isAdmin, isTeamLeader } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(100); // Başlangıç limiti
  const [hasMore, setHasMore] = useState(false);
  const [teamInfo, setTeamInfo] = useState<{
    managedTeams: Array<{ id: string; name: string }>;
    teamMembers: Array<{ id: string; name: string; email: string }>;
  } | null>(null);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("all");
  const [teamMemberIds, setTeamMemberIds] = useState<Set<string>>(new Set());
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});

  // Departmanları, ekip üyelerini, müşterileri ve ürünleri yükle
  useEffect(() => {
    const loadDepartmentsAndMembers = async () => {
      if (!user?.id) return;
      
      try {
        const [depts, users, customersData, productsData] = await Promise.all([
          getDepartments(),
          getAllUsers(),
          getCustomers(),
          getProducts(),
        ]);
        
        setAllDepartments(depts);
        setCustomers(customersData);
        setProducts(productsData);
        
        // Ekip lideri ise otomatik olarak kendi ekibini filtrele
        if (isTeamLeader && !isAdmin) {
          const managedDepts = depts.filter(d => d.managerId === user.id);
          const managedDeptIds = managedDepts.map(d => d.id);
          
          const memberIds = new Set(
            users
              .filter(u => {
                if (u.approvedTeams && u.approvedTeams.some(id => managedDeptIds.includes(id))) return true;
                if (u.pendingTeams && u.pendingTeams.some(id => managedDeptIds.includes(id))) return true;
                if (u.departmentId && managedDeptIds.includes(u.departmentId)) return true;
                return false;
              })
              .map(u => u.id)
          );
          
          setTeamMemberIds(memberIds);
          setSelectedTeamFilter("all"); // Ekip lideri için filtreleme yok
        } else if (isAdmin && selectedTeamFilter !== "all") {
          // Yönetici için seçilen ekibin üyelerini bul
          const selectedDept = depts.find(d => d.id === selectedTeamFilter);
          if (selectedDept) {
            const memberIds = new Set(
              users
                .filter(u => {
                  if (u.approvedTeams && u.approvedTeams.includes(selectedTeamFilter)) return true;
                  if (u.pendingTeams && u.pendingTeams.includes(selectedTeamFilter)) return true;
                  if (u.departmentId === selectedTeamFilter) return true;
                  return false;
                })
                .map(u => u.id)
            );
            setTeamMemberIds(memberIds);
          } else {
            setTeamMemberIds(new Set());
          }
        } else {
          setTeamMemberIds(new Set());
        }
      } catch (error) {
        console.error("Error loading departments:", error);
      }
    };
    
    loadDepartmentsAndMembers();
  }, [user, isAdmin, isTeamLeader, selectedTeamFilter]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let data: AuditLog[] = [];
      let teamData: {
        managedTeams: Array<{ id: string; name: string }>;
        teamMembers: Array<{ id: string; name: string; email: string }>;
      } | null = null;

      if (mode === "team" && userId) {
        const result = await getTeamMemberLogs(userId);
        data = result.logs;
        teamData = result.teamInfo;
        setTeamInfo(teamData);
      } else if (mode === "personal" && userId) {
        data = await getAuditLogs({ userId });
        setTeamInfo(null);
      } else {
        // Admin mode (default)
        data = await getAuditLogs({
          limit: limit,
          action: actionFilter !== "all" ? (actionFilter as AuditLog["action"]) : undefined,
          tableName: tableFilter !== "all" ? tableFilter : undefined,
        });
        
        // Ekip filtresi varsa logları filtrele
        if (teamMemberIds.size > 0) {
          data = data.filter(log => teamMemberIds.has(log.userId));
        }
        
        setTeamInfo(null);
        // Eğer limit kadar log geldiyse, daha fazla olabilir
        setHasMore(data.length === limit);
      }
      
      setLogs(data);

      // Entity isimlerini topla ve çek
      const entityMap: Record<string, Set<string>> = {
        tasks: new Set(),
        projects: new Set(),
        customers: new Set(),
        orders: new Set(),
        products: new Set(),
        warranty: new Set(),
        task_assignments: new Set(),
        departments: new Set(),
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
          if (log.newData?.assignedBy) {
            userIds.add(log.newData.assignedBy);
          }
        }
        // Tüm log verilerinden ID'leri topla
        const allData = { ...log.newData, ...log.oldData };
        Object.entries(allData || {}).forEach(([key, value]) => {
          if (typeof value === "string" && value.length > 15 && value.length < 30) {
            // Muhtemelen bir ID
            if (key === "assignedTo" || key === "assignedBy" || key === "userId" || key === "createdBy" || key === "updatedBy") {
              userIds.add(value);
            } else if (key === "taskId" || key === "task_id") {
              entityMap.tasks.add(value);
            } else if (key === "projectId" || key === "project_id") {
              entityMap.projects.add(value);
            } else if (key === "customerId" || key === "customer_id") {
              entityMap.customers.add(value);
            } else if (key === "orderId" || key === "order_id") {
              entityMap.orders.add(value);
            } else if (key === "productId" || key === "product_id") {
              entityMap.products.add(value);
            } else if (key === "departmentId" || key === "department_id") {
              entityMap.departments.add(value);
            }
          }
        });
      });
      
      // Entity adlarını çek
      const names: Record<string, string> = {};
      
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
      
      // Ürünler
      if (entityMap.products.size > 0) {
        await Promise.all(
          Array.from(entityMap.products).map(async (id) => {
            try {
              const product = await getProductById(id);
              if (product?.name) {
                names[`products_${id}`] = product.name;
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
      
      // Departmanlar
      if (entityMap.departments.size > 0) {
        await Promise.all(
          Array.from(entityMap.departments).map(async (id) => {
            try {
              const department = await getDepartmentById(id);
              if (department?.name) {
                names[`departments_${id}`] = department.name;
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
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      // Sadece kritik hatalarda toast göster, entity yükleme hatalarında sessizce devam et
      if (error instanceof Error && (
        error.message.includes("permission") || 
        error.message.includes("network") ||
        error.message.includes("Failed to fetch")
      )) {
        toast.error("Loglar yüklenemedi: " + message);
      } else {
        // Entity yükleme hataları kritik değil, logları göster
        console.warn("Entity names could not be loaded, but logs are available");
      }
    } finally {
      setLoading(false);
    }
  }, [mode, userId, actionFilter, tableFilter, limit, teamMemberIds]);
  
  const loadMore = useCallback(() => {
    setLimit(prev => prev + 100);
  }, []);

  // Filtreler değiştiğinde limit'i sıfırla
  useEffect(() => {
    setLimit(100);
  }, [actionFilter, tableFilter, mode, userId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) newSet.delete(logId);
      else newSet.add(logId);
      return newSet;
    });
  };

  const exportToCSV = () => {
    const headers = ["Tarih", "Kullanıcı", "İşlem", "Tablo", "Detaylar"];
    const rows = filteredLogs.map(log => [
      format(log.createdAt.toDate(), "dd.MM.yyyy HH:mm", { locale: tr }),
      log.userName || "Sistem",
      log.action,
      TABLE_LABELS[log.tableName] || log.tableName,
      log.action === "CREATE" ? "Yeni kayıt" : log.action === "UPDATE" ? "Güncelleme" : "Silme"
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();
    toast.success("Log'lar CSV olarak indirildi");
  };

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
              return entityNames[`users_${id}`] || id;
            }
            return id;
          }).filter((name: string) => name && name.length < 50); // ID'leri filtrele
          if (names.length > 0) {
            return names.join(", ");
          }
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
        if (entityNames[`departments_${stringValue}`]) {
          return entityNames[`departments_${stringValue}`];
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
      // Warranty için müşteri ve ürün adlarını göster
      const customerId = data?.customerId;
      const productId = data?.productId;
      const customer = customerId ? customers.find(c => c.id === customerId) : null;
      const product = productId ? products.find(p => p.id === productId) : null;
      const customerName = customer?.name || "Bilinmeyen Müşteri";
      const productName = product?.name || "Bilinmeyen Ürün";
      return `${customerName} - ${productName}`;
    }
    if (tableName === "user_logins") {
      // Metadata'dan giriş yöntemini al
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
    // ID gösterme - sadece entity ismi yoksa
    return null;
  };

  // Log mesajını oluştur - Kullanıcı dostu ve anlamlı
  const buildLogSummary = (log: AuditLog): { description: string; timestamp: string; metaLine: string } => {
    const userName = log.userName || (log.userEmail ? log.userEmail.split("@")[0] : null) || "Sistem";
    const actionMeta = ACTION_META[log.action];
    const actionVerb = actionMeta?.verb || "yaptı";
    
    let description = "";
    
    // Giriş logları
    if (log.tableName === "user_logins") {
      description = `${userName} Giriş yaptı`;
    }
    // Görev atama logları - özel format
    else if (log.tableName === "task_assignments" && log.action === "CREATE") {
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
          description = `${userName} "${projectName}" projesindeki "${taskName}" görevini oluşturdu ve ${assignedUserName} kişisini göreve atadı`;
        } else {
          description = `${userName} "${taskName}" görevini oluşturdu ve ${assignedUserName} kişisini göreve atadı`;
        }
      } else {
        description = `${userName} "${taskName}" görevini oluşturdu ve ${assignedUserName} kişisini göreve atadı`;
      }
    }
    // Görev logları - proje bilgisi ile
    else if (log.tableName === "tasks" && log.recordId) {
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
          description = `${userName} ${projectPrefix}"${taskName}" görevinin ${fieldsText} ${actionVerb}`;
        } else {
          description = `${userName} ${projectPrefix}"${taskName}" görevini ${actionVerb}`;
        }
      } else {
        description = `${userName} ${projectPrefix}"${taskName}" görevini ${actionVerb}`;
      }
    }
    // Müşteri logları
    else if (log.tableName === "customers" && log.recordId) {
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
          description = `${userName} "${customerName}" müşterisinin ${fieldsText} ${actionVerb}`;
        } else {
          description = `${userName} "${customerName}" müşterisini ${actionVerb}`;
        }
      } else {
        description = `${userName} "${customerName}" müşterisini ${actionVerb}`;
      }
    }
    // Sipariş logları
    else if (log.tableName === "orders" && log.recordId) {
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
          description = `${userName} "${orderName}" siparişinin ${fieldsText} ${actionVerb}`;
        } else {
          description = `${userName} "${orderName}" siparişini ${actionVerb}`;
        }
      } else {
        description = `${userName} "${orderName}" siparişini ${actionVerb}`;
      }
    }
    // Ürün logları
    else if (log.tableName === "products" && log.recordId) {
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
          description = `${userName} "${productName}" ürününün ${fieldsText} ${actionVerb}`;
        } else {
          description = `${userName} "${productName}" ürününü ${actionVerb}`;
        }
      } else {
        description = `${userName} "${productName}" ürününü ${actionVerb}`;
      }
    }
    // Proje logları
    else if (log.tableName === "projects" && log.recordId) {
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
          description = `${userName} "${projectName}" projesinin ${fieldsText} ${actionVerb}`;
        } else {
          description = `${userName} "${projectName}" projesini ${actionVerb}`;
        }
      } else {
        description = `${userName} "${projectName}" projesini ${actionVerb}`;
      }
    }
    // Diğer loglar - entity adı ile
    else if (log.recordId && entityNames[`${log.tableName}_${log.recordId}`]) {
      const entityName = entityNames[`${log.tableName}_${log.recordId}`];
      const tableLabel = TABLE_LABELS[log.tableName] || log.tableName;
      if (log.action === "UPDATE" && log.oldData && log.newData) {
        const changedFields = getChangedFields(log.oldData, log.newData);
        if (changedFields.length > 0) {
          const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
          const fieldsText = fieldLabels.length === 1 
            ? `'${fieldLabels[0]}' alanını`
            : fieldLabels.length === 2
            ? `'${fieldLabels[0]}' ve '${fieldLabels[1]}' alanlarını`
            : `'${fieldLabels.join("', '")}'${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
          description = `${userName} "${entityName}" ${tableLabel.toLowerCase()} kaydının ${fieldsText} ${actionVerb}`;
        } else {
          description = `${userName} "${entityName}" ${tableLabel.toLowerCase()} kaydını ${actionVerb}`;
        }
      } else {
        description = `${userName} "${entityName}" ${tableLabel.toLowerCase()} kaydını ${actionVerb}`;
      }
    }
    // Fallback - sadece işlem tipi
    else {
      const actionLabel = actionMeta?.label || "İşlem";
      const tableLabel = TABLE_LABELS[log.tableName] || log.tableName;
      description = `${userName} ${tableLabel.toLowerCase()} bölümünde ${actionLabel.toLowerCase()} ${actionVerb}`;
    }

    const timestamp = format(log.createdAt.toDate(), "dd MMMM yyyy, HH:mm", { locale: tr });

    return {
      description,
      timestamp,
      metaLine: "", // Meta bilgiyi kaldırdık
    };
  };

  // Kayıt adını al
  const getRecordName = (data: any, tableName: string, recordId?: string | null): string => {
    // Önce entityNames'den kontrol et
    if (recordId && entityNames[`${tableName}_${recordId}`]) {
      const entityName = entityNames[`${tableName}_${recordId}`];
      if (tableName === "orders") return `"${entityName}" siparişini`;
      if (tableName === "tasks") return `"${entityName}" görevini`;
      if (tableName === "customers") return `"${entityName}" müşterisini`;
      if (tableName === "products") return `"${entityName}" ürününü`;
      if (tableName === "projects") return `"${entityName}" projesini`;
      return `"${entityName}" kaydını`;
    }
    
    if (!data) return "kayıt";
    
    // Tablo bazlı özel isimlendirme
    if (tableName === "orders" && data.orderNumber) {
      return `"Sipariş #${data.orderNumber}" siparişini`;
    }
    if (tableName === "tasks" && data.title) {
      return `"${data.title}" görevini`;
    }
    if (tableName === "customers" && data.name) {
      return `"${data.name}" müşterisini`;
    }
    if (tableName === "products" && data.name) {
      return `"${data.name}" ürününü`;
    }
    if (tableName === "projects" && data.name) {
      return `"${data.name}" projesini`;
    }
    if (tableName === "reports" && data.title) {
      return `"${data.title}" raporunu`;
    }
    if (tableName === "task_assignments" && data.taskTitle) {
      return `"${data.taskTitle}" görev atamasını`;
    }
    if (tableName === "raw_materials" && data.name) {
      return `"${data.name}" hammaddesini`;
    }
    if (tableName === "customerNotes" && (data.content || data.note)) {
      const note = (data.content || data.note).substring(0, 30);
      return `"${note}${(data.content || data.note).length > 30 ? '...' : ''}" notunu`;
    }
    
    // Genel fallback
    if (data.name) return `"${data.name}" kaydını`;
    if (data.title) return `"${data.title}" kaydını`;
    
    // ID gösterme - sadece tableName göster
    const tableLabel = TABLE_LABELS[tableName] || tableName;
    return `${tableLabel} kaydını`;
  };

  // İnsan tarafından okunabilir değişiklik mesajları oluştur
  const getHumanReadableChanges = (
    oldData: any,
    newData: any,
    tableName: string,
    recordName?: string | null
  ): string[] => {
    if (!oldData || !newData) return [];
    
    const changes: string[] = [];
    const changedFields = getChangedFields(oldData, newData);

    changedFields.forEach((field) => {
      const fieldLabel = FIELD_LABELS[field] || field;
      const oldValue = formatValue(oldData[field], field, tableName);
      const newValue = formatValue(newData[field], field, tableName);

      // Özel durumlar için özel mesajlar
      if (field === "status" && tableName === "tasks") {
        // Görev adını da ekle
        const taskTitle = recordName || oldData.title || newData.title || "görev";
        changes.push(`"${taskTitle}" görevinin durumunu "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "status" && tableName === "orders") {
        const orderNum = recordName || oldData.orderNumber || newData.orderNumber || "sipariş";
        changes.push(`"${orderNum}" siparişinin durumunu "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "status" && tableName === "production_orders") {
        const orderNum = recordName || oldData.orderNumber || newData.orderNumber || "üretim siparişi";
        changes.push(`"${orderNum}" üretim siparişinin durumunu "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "approvalStatus") {
        const taskTitle = recordName || oldData.title || newData.title || "";
        const prefix = taskTitle ? `"${taskTitle}" görevinin ` : "";
        if (newValue === "Onaylandı") {
          changes.push(`${prefix}onay durumunu "Beklemede"den "Onaylandı"ya güncelledi`);
        } else if (newValue === "Reddedildi") {
          changes.push(`${prefix}onay durumunu "Beklemede"den "Reddedildi"ye güncelledi`);
        } else {
          changes.push(`${prefix}onay durumunu "${oldValue}"'den "${newValue}"'e değiştirdi`);
        }
      } else if (field === "rejectionReason") {
        const taskTitle = recordName || oldData.title || newData.title || "";
        const prefix = taskTitle ? `"${taskTitle}" görevi için ` : "";
        changes.push(`${prefix}red nedeni ekledi: "${newValue}"`);
      } else if (field === "title" && tableName === "tasks") {
        changes.push(`görev başlığını "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "description" && tableName === "tasks") {
        const taskTitle = recordName || oldData.title || newData.title || "";
        const prefix = taskTitle ? `"${taskTitle}" ` : "";
        changes.push(`${prefix}görev açıklamasını güncelledi`);
      } else if (field === "priority" && tableName === "tasks") {
        const taskTitle = recordName || oldData.title || newData.title || "";
        const prefix = taskTitle ? `"${taskTitle}" görevinin ` : "";
        changes.push(`${prefix}önceliği "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "dueDate" && tableName === "tasks") {
        const taskTitle = recordName || oldData.title || newData.title || "";
        const prefix = taskTitle ? `"${taskTitle}" görevinin ` : "";
        changes.push(`${prefix}bitiş tarihini "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "role") {
        changes.push(`rolünü "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "assignedTo" || field === "assignedUsers") {
        const taskTitle = recordName || oldData.title || newData.title || "";
        const prefix = tableName === "tasks" && taskTitle ? `"${taskTitle}" görevinin ` : "";
        changes.push(`${prefix}atanan kişiyi "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "totalAmount" || field === "grandTotal" || field === "subtotal") {
        const oldAmount = typeof oldValue === "string" ? oldValue : `₺${oldValue}`;
        const newAmount = typeof newValue === "string" ? newValue : `₺${newValue}`;
        changes.push(`${fieldLabel} ${oldAmount}'den ${newAmount}'e güncelledi`);
      } else if (field === "name" && (tableName === "customers" || tableName === "products" || tableName === "projects")) {
        changes.push(`${tableName === "customers" ? "müşteri" : tableName === "products" ? "ürün" : "proje"} adını "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "orderNumber" && tableName === "orders") {
        changes.push(`sipariş numarasını "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else {
        changes.push(`${fieldLabel} "${oldValue}"'den "${newValue}"'e değiştirdi`);
      }
    });

    return changes;
  };

  const filteredLogs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        normalizedSearch === "" ||
        log.action.toLowerCase().includes(normalizedSearch) ||
        log.tableName.toLowerCase().includes(normalizedSearch) ||
        log.userName?.toLowerCase().includes(normalizedSearch) ||
        log.userEmail?.toLowerCase().includes(normalizedSearch) ||
        JSON.stringify(log.oldData ?? {}).toLowerCase().includes(normalizedSearch) ||
        JSON.stringify(log.newData ?? {}).toLowerCase().includes(normalizedSearch);

      // In team/personal mode, filters are applied client-side here because fetch fetches all for that scope
      // In admin mode, basic filters are applied in fetch, but we re-apply here for consistency if fetched all
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesTable = tableFilter === "all" || log.tableName === tableFilter;
      
      return matchesSearch && matchesAction && matchesTable;
    });
  }, [logs, searchTerm, actionFilter, tableFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Yönetici için Ekip Seçimi */}
      {isAdmin && mode === "admin" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Ekip Seç:</label>
              <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Ekip seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Ekipler</SelectItem>
                  {allDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">
          {mode === "team" ? "Ekip Logları" : mode === "personal" ? "Kişisel Loglar" : "Sistem Logları"}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
          {mode === "team" 
            ? "Yönettiğiniz ekiplerdeki üyelerin ve sizin işlem geçmişiniz" 
            : mode === "personal" 
            ? "Kendi işlem geçmişiniz" 
            : "Sistemdeki tüm kullanıcıların tüm işlemlerinin detaylı kaydı"}
        </p>
        {mode === "team" && teamInfo && !isAdmin && (
          <Card className="bg-gradient-to-br from-blue-50/50 to-transparent border-blue-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    {teamInfo.managedTeams.length} Ekip Yönetiliyor
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {teamInfo.teamMembers.length} Ekip Üyesi
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {logs.length} Log Kaydı
                  </Badge>
                </div>
                {teamInfo.managedTeams.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">Yönettiğiniz Ekipler:</span>{" "}
                    <span className="text-muted-foreground">
                      {teamInfo.managedTeams.map(t => t.name).join(", ")}
                    </span>
                  </div>
                )}
                {teamInfo.teamMembers.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">Ekip Üyeleri:</span>{" "}
                    <span className="text-muted-foreground">
                      {teamInfo.teamMembers.map(m => m.name).join(", ")}
                    </span>
                  </div>
                )}
                {teamInfo.teamMembers.length === 0 && teamInfo.managedTeams.length > 0 && (
                  <div className="text-sm text-yellow-700 bg-yellow-100 p-3 rounded-lg border border-yellow-200">
                    <span className="font-medium">⚠️ Bilgi:</span> Yönettiğiniz ekiplerde henüz üye bulunmuyor. 
                    Üyeler eklendiğinde ve işlem yaptığında logları burada görebilirsiniz.
                  </div>
                )}
                {teamInfo.managedTeams.length === 0 && (
                  <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded-lg border border-blue-200">
                    <span className="font-medium">ℹ️ Bilgi:</span> Henüz yönettiğiniz bir ekip bulunmuyor. 
                    Ekip lideri olarak atandığınızda, o ekipteki üyelerin loglarını burada görebilirsiniz.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="pt-4 sm:pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <div className="text-xs sm:text-sm text-muted-foreground">
              {filteredLogs.length} kayıt bulundu
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="text-xs sm:text-sm">CSV İndir</span>
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <SearchInput
              placeholder="İçerikte ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              containerClassName="flex-1"
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-[44px] sm:min-h-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm İşlemler</SelectItem>
                <SelectItem value="CREATE">Oluşturma</SelectItem>
                <SelectItem value="UPDATE">Güncelleme</SelectItem>
                <SelectItem value="DELETE">Silme</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-[44px] sm:min-h-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Tablolar</SelectItem>
                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
                {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Hiç log bulunamadı</p>
              </div>
                ) : (
                  filteredLogs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                    const changedFields = log.action === "UPDATE" ? getChangedFields(log.oldData, log.newData) : [];
                    
                    return (
                  <Card key={log.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      <div 
                        className="cursor-pointer select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLogExpansion(log.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleLogExpansion(log.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Log detaylarını kapat" : "Log detaylarını aç"}
                      >
                        {(() => {
                          const summary = buildLogSummary(log);
                          return (
                            <div className="flex items-start justify-between gap-2 sm:gap-4">
                              <div className="flex-1 space-y-2 min-w-0">
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                  <Badge className={`${ACTION_META[log.action].color} text-xs sm:text-sm`} onClick={(e) => e.stopPropagation()}>
                                    {ACTION_META[log.action].label}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs" onClick={(e) => e.stopPropagation()}>
                                    {MENU_LABELS[log.tableName] || TABLE_LABELS[log.tableName] || log.tableName}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {summary.timestamp}
                                  </span>
                            </div>
                                <p className="text-xs sm:text-sm text-foreground leading-relaxed font-medium">
                                  {summary.description}
                                </p>
                                {summary.metaLine && (
                                  <p className="text-xs text-muted-foreground">
                                    {summary.metaLine}
                                  </p>
                                )}
                                {log.action === "UPDATE" && changedFields.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                                    {changedFields.slice(0, 5).map(field => (
                                      <Badge key={field} variant="secondary" className="text-xs pointer-events-none">
                                        {FIELD_LABELS[field] || field}
                            </Badge>
                                    ))}
                                    {changedFields.length > 5 && (
                                      <Badge variant="secondary" className="text-xs pointer-events-none">
                                        +{changedFields.length - 5} daha
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                        {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-4">
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
                                    {(log.userName || log.userEmail || "S").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-sm">{log.userName || (log.userEmail ? log.userEmail.split("@")[0] : "Sistem")}</span>
                                    {log.userEmail && (
                                      <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kayıt Bilgileri</span>
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">{MENU_LABELS[log.tableName] || TABLE_LABELS[log.tableName] || log.tableName}</span>
                                  {(() => {
                                    const recordName = getRecordDisplayName(log.newData || log.oldData, log.tableName, log.recordId) ||
                                                      getRecordDisplayName(log.oldData, log.tableName, log.recordId);
                                    if (recordName) {
                                      return <span className="font-semibold text-sm mt-1">{recordName}</span>;
                                    }
                                    // Entity ismi yoksa, tableName'i göster ama ID gösterme
                                    const tableLabel = TABLE_LABELS[log.tableName] || log.tableName;
                                    return <span className="text-xs text-muted-foreground mt-1">{tableLabel}</span>;
                                  })()}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">İşlem Tipi</span>
                                    <div>
                                  <Badge className={ACTION_META[log.action].color}>
                                    {ACTION_META[log.action].label}
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tarih & Saat</span>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm">{format(log.createdAt.toDate(), "dd MMMM yyyy", { locale: tr })}</span>
                                  <span className="text-xs text-muted-foreground">{format(log.createdAt.toDate(), "HH:mm:ss", { locale: tr })}</span>
                                </div>
                              </div>
                            </div>
                                          </div>

                          {log.action === "UPDATE" && log.oldData && log.newData && changedFields.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                                Değişiklik Detayları
                                <Badge variant="outline" className="ml-auto text-xs">
                                  {changedFields.length} alan değiştirildi
                                </Badge>
                              </h4>
                              <div className="space-y-3">
                                {changedFields.map(field => {
                                  const fieldLabel = FIELD_LABELS[field] || field;
                                  const oldValue = formatValue(log.oldData[field], field, log.tableName);
                                  const newValue = formatValue(log.newData[field], field, log.tableName);
                                  
                                  return (
                                    <div key={field} className="bg-gradient-to-r from-red-50/50 to-green-50/50 dark:from-red-950/20 dark:to-green-950/20 rounded-lg p-4 border border-red-200/50 dark:border-red-800/50 hover:shadow-md transition-shadow">
                                      <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                        {fieldLabel}
                                      </div>
                                      <div className="flex items-center gap-3 text-sm">
                                        <div className="flex-1 bg-white dark:bg-gray-900 rounded-md p-2 border border-red-200 dark:border-red-800">
                                          <div className="text-xs text-muted-foreground mb-1">Eski Değer</div>
                                          <span className="text-red-600 dark:text-red-400 line-through font-medium">{oldValue}</span>
                                    </div>
                                        <div className="text-muted-foreground text-lg">→</div>
                                        <div className="flex-1 bg-white dark:bg-gray-900 rounded-md p-2 border border-green-200 dark:border-green-800">
                                          <div className="text-xs text-muted-foreground mb-1">Yeni Değer</div>
                                          <span className="text-green-600 dark:text-green-400 font-semibold">{newValue}</span>
                                          </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                    </div>
                                  </div>
                                )}

                                {log.action === "CREATE" && log.newData && (
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                                Oluşturulan Bilgiler
                                <Badge variant="outline" className="ml-auto text-xs bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                                  {Object.keys(log.newData).length} alan
                                </Badge>
                              </h4>
                              <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4 border border-green-200/50 dark:border-green-800/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {Object.entries(log.newData).slice(0, 12).map(([key, value]) => {
                                    const fieldLabel = FIELD_LABELS[key] || key;
                                    const formattedValue = formatValue(value, key, log.tableName);
                                    return (
                                      <div key={key} className="bg-white dark:bg-gray-900 rounded-md p-3 border border-green-200/50 dark:border-green-800/50">
                                        <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">{fieldLabel}</div>
                                        <div className="text-sm font-medium text-foreground break-words">{formattedValue}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {Object.keys(log.newData).length > 12 && (
                                  <div className="mt-3 text-center text-xs text-muted-foreground italic bg-white dark:bg-gray-900 rounded-md p-2 border border-green-200/50 dark:border-green-800/50">
                                    +{Object.keys(log.newData).length - 12} alan daha...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                                {log.action === "DELETE" && log.oldData && (
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                                Silinen Bilgiler
                                <Badge variant="outline" className="ml-auto text-xs bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                                  {Object.keys(log.oldData).length} alan
                                </Badge>
                              </h4>
                              <div className="bg-gradient-to-r from-red-50/50 to-rose-50/50 dark:from-red-950/20 dark:to-rose-950/20 rounded-lg p-4 border border-red-200/50 dark:border-red-800/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {Object.entries(log.oldData).slice(0, 12).map(([key, value]) => {
                                    const fieldLabel = FIELD_LABELS[key] || key;
                                    const formattedValue = formatValue(value, key, log.tableName);
                                    return (
                                      <div key={key} className="bg-white dark:bg-gray-900 rounded-md p-3 border border-red-200/50 dark:border-red-800/50 opacity-75">
                                        <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">{fieldLabel}</div>
                                        <div className="text-sm font-medium text-red-600 dark:text-red-400 break-words line-through">{formattedValue}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {Object.keys(log.oldData).length > 12 && (
                                  <div className="mt-3 text-center text-xs text-muted-foreground italic bg-white dark:bg-gray-900 rounded-md p-2 border border-red-200/50 dark:border-red-800/50">
                                    +{Object.keys(log.oldData).length - 12} alan daha...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        )}
                    </CardContent>
                  </Card>
                    );
                  })
                )}
                
                {/* Daha fazla yükle butonu */}
                {hasMore && mode === "admin" && !loading && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={loadMore}
                      variant="outline"
                      className="gap-2"
                    >
                      <Loader2 className="h-4 w-4" />
                      Daha Fazla Yükle ({limit} / {filteredLogs.length})
                    </Button>
                  </div>
                )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
