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
import { Loader2, FileText, Download, ChevronDown, ChevronUp, Monitor, Globe, Shield } from "lucide-react";
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
  security_events: "Güvenlik Olayları",
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
  security_events: "Sistem Güvenliği",
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
  departmentId: "Departman",
  parentDepartmentId: "Üst Departman",
  managerId: "Yönetici",
  managerName: "Yönetici Adı",
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
  eventType: "Olay Tipi",
  targetUserId: "Hedef Kullanıcı",
  sessionId: "Oturum ID",
  userAgent: "Tarayıcı",
  ipAddress: "IP Adresi",
  severity: "Önem Derecesi",
  deleted: "Silindi",
  restoredAt: "Geri Yükleme Tarihi",
  deletedAt: "Silinme Tarihi",
  reason: "Sebep",
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
  selectedTeamFilter?: string; // Admin için seçilen ekip filtresi
}

export const AuditLogs = ({ mode = "admin", userId, selectedTeamFilter }: AuditLogsProps) => {
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
        if (mode === "team" && userId && !isAdmin) {
          const managedDepts = depts.filter(d => d.managerId === userId);
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

          // Ekip liderinin kendisini de ekle
          memberIds.add(userId);
          setTeamMemberIds(memberIds);
        } else if (mode === "admin" && selectedTeamFilter && selectedTeamFilter !== "all") {
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
        } else if (mode === "admin" && (!selectedTeamFilter || selectedTeamFilter === "all")) {
          // Admin için tüm ekipler seçiliyse filtreleme yok
          setTeamMemberIds(new Set());
        } else {
          setTeamMemberIds(new Set());
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.error("Error loading departments:", error);
          }
        }
      }
    };

    loadDepartmentsAndMembers();
  }, [user, isAdmin, isTeamLeader, selectedTeamFilter, mode, userId]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let data: AuditLog[] = [];
      let teamData: {
        managedTeams: Array<{ id: string; name: string }>;
        teamMembers: Array<{ id: string; name: string; email: string }>;
      } | null = null;

      if (mode === "team" && userId) {
        // Ekip lideri için: Sadece kendi ekibinin logları
        const result = await getTeamMemberLogs(userId);
        data = result.logs;
        teamData = result.teamInfo;

        // Ekip üyelerinin ID'lerine göre ek filtreleme yap
        if (teamMemberIds.size > 0) {
          data = data.filter(log => teamMemberIds.has(log.userId));
        }

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
          if (log.newData && typeof log.newData === 'object' && 'taskId' in log.newData && typeof log.newData.taskId === 'string') {
            entityMap.tasks.add(log.newData.taskId);
          }
          if (log.newData && typeof log.newData === 'object' && 'assignedTo' in log.newData && typeof log.newData.assignedTo === 'string') {
            userIds.add(log.newData.assignedTo);
          }
          if (log.newData && typeof log.newData === 'object' && 'assignedBy' in log.newData && typeof log.newData.assignedBy === 'string') {
            userIds.add(log.newData.assignedBy);
          }
        }
        // Tüm log verilerinden ID'leri topla
        const newDataObj = log.newData && typeof log.newData === 'object' ? log.newData as Record<string, unknown> : {};
        const oldDataObj = log.oldData && typeof log.oldData === 'object' ? log.oldData as Record<string, unknown> : {};
        const allData = { ...newDataObj, ...oldDataObj };
        Object.entries(allData || {}).forEach(([key, value]) => {
          if (typeof value === "string" && value.length > 15 && value.length < 30) {
            // Muhtemelen bir ID
            if (key === "assignedTo" || key === "assignedBy" || key === "userId" || key === "createdBy" || key === "updatedBy" || key === "managerId" || key === "manager_id" || key === "approvedBy" || key === "rejectedBy") {
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
      if (import.meta.env.DEV) {
        if (import.meta.env.DEV) {
          console.error("Error fetching logs:", error);
        }
      }
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
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.warn("Entity names could not be loaded, but logs are available");
          }
        }
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
  const formatValue = (value: unknown, fieldName?: string, tableName?: string): string => {
    if (value === null || value === undefined) return "Yok";
    if (typeof value === "boolean") return value ? "Evet" : "Hayır";
    if (value instanceof Date) {
      return format(value, "dd.MM.yyyy HH:mm", { locale: tr });
    }
    if (typeof value === "object" && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
      // Firebase Timestamp
      return format((value as { toDate: () => Date }).toDate(), "dd.MM.yyyy HH:mm", { locale: tr });
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
      if (fieldName === "assignedTo" || fieldName === "assignedBy" || fieldName === "userId" || fieldName === "createdBy" || fieldName === "updatedBy" || fieldName === "managerId" || fieldName === "manager_id" || fieldName === "approvedBy" || fieldName === "rejectedBy") {
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

  const getRecordDisplayName = (data: unknown, tableName: string, recordId?: string | null): string | null => {
    if (!data && !recordId) return null;

    // Önce entityNames'den kontrol et
    if (recordId && entityNames[`${tableName}_${recordId}`]) {
      return entityNames[`${tableName}_${recordId}`];
    }

    // Sonra data'dan kontrol et
    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (tableName === "orders" && typeof dataObj.orderNumber === 'string') return `Sipariş #${dataObj.orderNumber}`;
      if (tableName === "tasks" && typeof dataObj.title === 'string') return dataObj.title;
      if (tableName === "customers" && typeof dataObj.name === 'string') return dataObj.name;
      if (tableName === "products" && typeof dataObj.name === 'string') return dataObj.name;
      if (tableName === "projects" && typeof dataObj.name === 'string') return dataObj.name;
      if (tableName === "reports" && typeof dataObj.title === 'string') return dataObj.title;
      if (tableName === "task_assignments" && typeof dataObj.taskTitle === 'string') return `Görev: ${dataObj.taskTitle}`;
      if (tableName === "raw_materials" && typeof dataObj.name === 'string') return dataObj.name;
      if (tableName === "customerNotes") {
        const content = typeof dataObj.content === 'string' ? dataObj.content : (typeof dataObj.note === 'string' ? dataObj.note : null);
        if (content) {
          return content.length > 50 ? `${content.substring(0, 50)}...` : content;
        }
      }
      if (tableName === "warranty") {
        // Warranty için müşteri ve ürün adlarını göster
        const customerId = typeof dataObj.customerId === 'string' ? dataObj.customerId : null;
        const productId = typeof dataObj.productId === 'string' ? dataObj.productId : null;
        const customer = customerId ? customers.find(c => c.id === customerId) : null;
        const product = productId ? products.find(p => p.id === productId) : null;
        const customerName = customer?.name || "Bilinmeyen Müşteri";
        const productName = product?.name || "Bilinmeyen Ürün";
        return `${customerName} - ${productName}`;
      }
      if (tableName === "user_logins") {
        // Metadata'dan giriş yöntemini al
        if (dataObj.metadata && typeof dataObj.metadata === 'object' && dataObj.metadata !== null && 'method' in dataObj.metadata) {
          const methodLabels: Record<string, string> = {
            EMAIL: "E-posta ile giriş",
            GOOGLE: "Google ile giriş",
          };
          const method = typeof (dataObj.metadata as { method?: unknown }).method === 'string' ? (dataObj.metadata as { method: string }).method : null;
          return method ? (methodLabels[method] || `Giriş (${method})`) : "Sistem girişi";
        }
        return "Sistem girişi";
      }
      if (typeof dataObj.name === 'string') return dataObj.name;
      if (typeof dataObj.title === 'string') return dataObj.title;
    }
    // ID gösterme - sadece entity ismi yoksa
    return null;
  };

  // Değişiklik detaylarını anlaşılır formatta oluştur
  const getDetailedChangeDescription = (
    field: string,
    oldValue: unknown,
    newValue: unknown,
    tableName: string
  ): string => {
    const fieldLabel = FIELD_LABELS[field] || field;
    const formattedOldValue = formatValue(oldValue, field, tableName);
    const formattedNewValue = formatValue(newValue, field, tableName);

    // Özel durumlar için daha açıklayıcı mesajlar
    if (field === "status") {
      if (tableName === "tasks") {
        return `görev durumunu "${formattedOldValue}"'den "${formattedNewValue}"'e değiştirdi`;
      } else if (tableName === "orders" || tableName === "production_orders") {
        return `sipariş durumunu "${formattedOldValue}"'den "${formattedNewValue}"'e değiştirdi`;
      }
      return `${fieldLabel} değerini "${formattedOldValue}"'den "${formattedNewValue}"'e değiştirdi`;
    }

    if (field === "priority") {
      return `öncelik seviyesini "${formattedOldValue}"'den "${formattedNewValue}"'e güncelledi`;
    }

    if (field === "assignedTo" || field === "assignedUsers") {
      return `atanan kişiyi "${formattedOldValue}"'den "${formattedNewValue}"'e değiştirdi`;
    }

    if (field === "dueDate") {
      return `bitiş tarihini "${formattedOldValue}"'den "${formattedNewValue}"'e güncelledi`;
    }

    if (field === "approvalStatus") {
      if (formattedNewValue === "Onaylandı") {
        return `onay durumunu "Beklemede"den "Onaylandı"ya güncelledi`;
      } else if (formattedNewValue === "Reddedildi") {
        return `onay durumunu "Beklemede"den "Reddedildi"ye güncelledi`;
      }
      return `onay durumunu "${formattedOldValue}"'den "${formattedNewValue}"'e değiştirdi`;
    }

    if (field === "title" || field === "name") {
      return `${fieldLabel} değerini "${formattedOldValue}"'den "${formattedNewValue}"'e değiştirdi`;
    }

    if (field === "description") {
      return `${fieldLabel} içeriğini güncelledi`;
    }

    if (field === "role") {
      return `kullanıcı rolünü "${formattedOldValue}"'den "${formattedNewValue}"'e değiştirdi`;
    }

    if (field === "totalAmount" || field === "grandTotal" || field === "subtotal") {
      return `${fieldLabel} tutarını "${formattedOldValue}"'den "${formattedNewValue}"'e güncelledi`;
    }

    // Genel format
    return `${fieldLabel} değerini "${formattedOldValue}"'den "${formattedNewValue}"'e değiştirdi`;
  };

  // Log mesajını oluştur - Kullanıcı dostu ve anlamlı
  const buildLogSummary = (log: AuditLog): { description: string; timestamp: string; metaLine: string } => {
    const userName = log.userName || (log.userEmail ? log.userEmail.split("@")[0] : null) || "Sistem";
    const actionMeta = ACTION_META[log.action];
    const actionVerb = actionMeta?.verb || "yaptı";

    let description = "";

    // Security Events
    if (log.tableName === "security_events") {
      const data = (log.newData || {}) as Record<string, unknown>;
      const eventType = data.eventType as string;
      const targetUserId = data.targetUserId as string;
      const targetUser = targetUserId ? (entityNames[`users_${targetUserId}`] || "kullanıcı") : "kullanıcı";

      const eventLabels: Record<string, string> = {
        LOGIN: "sisteme giriş yaptı",
        LOGOUT: "sistemden çıkış yaptı",
        PASSWORD_RESET: "şifresini sıfırladı",
        EMAIL_VERIFY: "e-posta adresini doğruladı",
        ROLE_CHANGE: `${targetUser} kullanıcısının rollerini değiştirdi`,
        PERMISSION_CHANGE: `${targetUser} kullanıcısının yetkilerini değiştirdi`,
        ACCOUNT_DELETE: `${targetUser} hesabını sildi`,
        ACCOUNT_RESTORE: `${targetUser} hesabını geri yükledi`,
      };

      description = `${userName} ${eventLabels[eventType] || "güvenlik işlemi gerçekleştirdi"}`;
    }
    // Giriş logları
    else if (log.tableName === "user_logins") {
      const metadata = log.metadata && typeof log.metadata === 'object' ? log.metadata as Record<string, unknown> : {};
      const action = 'action' in metadata && typeof metadata.action === 'string' ? metadata.action : null;
      const method = 'method' in metadata && typeof metadata.method === 'string' ? metadata.method : null;

      if (action === "LOGOUT") {
        description = `${userName} sistemden çıkış yaptı`;
      } else if (action === "LOGIN") {
        if (method === "GOOGLE") {
          description = `${userName} Google hesabı ile giriş yaptı`;
        } else if (method === "EMAIL") {
          description = `${userName} e-posta ve şifre ile giriş yaptı`;
        } else {
          description = `${userName} sisteme giriş yaptı`;
        }
      } else {
        // Eski format için geriye dönük uyumluluk
        if (method === "GOOGLE") {
          description = `${userName} Google hesabı ile giriş yaptı`;
        } else if (method === "EMAIL") {
          description = `${userName} e-posta ve şifre ile giriş yaptı`;
        } else {
          description = `${userName} sisteme giriş yaptı`;
        }
      }
    }
    // Görev atama logları - özel format
    else if (log.tableName === "task_assignments" && log.action === "CREATE") {
      const newDataObj = log.newData && typeof log.newData === 'object' ? log.newData as Record<string, unknown> : {};
      const taskId = 'taskId' in newDataObj && typeof newDataObj.taskId === 'string' ? newDataObj.taskId : null;
      const assignedToId = 'assignedTo' in newDataObj && typeof newDataObj.assignedTo === 'string' ? newDataObj.assignedTo : null;
      const taskName = taskId && entityNames[`tasks_${taskId}`]
        ? entityNames[`tasks_${taskId}`]
        : ('taskTitle' in newDataObj && typeof newDataObj.taskTitle === 'string' ? newDataObj.taskTitle : "görev");
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
      const newDataObj = log.newData && typeof log.newData === 'object' ? log.newData as Record<string, unknown> : {};
      const oldDataObj = log.oldData && typeof log.oldData === 'object' ? log.oldData as Record<string, unknown> : {};
      const taskName = entityNames[`tasks_${log.recordId}`] ||
        ('title' in newDataObj && typeof newDataObj.title === 'string' ? newDataObj.title : null) ||
        ('title' in oldDataObj && typeof oldDataObj.title === 'string' ? oldDataObj.title : null) ||
        "görev";

      // Proje bilgisini kontrol et
      const projectId = ('projectId' in newDataObj && typeof newDataObj.projectId === 'string' ? newDataObj.projectId : null) ||
        ('projectId' in oldDataObj && typeof oldDataObj.projectId === 'string' ? oldDataObj.projectId : null);
      const projectPrefix = projectId && entityNames[`projects_${projectId}`]
        ? `"${entityNames[`projects_${projectId}`]}" projesindeki `
        : "";

      if (log.action === "CREATE") {
        description = `${userName} ${projectPrefix}"${taskName}" görevini oluşturdu`;
      } else if (log.action === "DELETE") {
        description = `${userName} ${projectPrefix}"${taskName}" görevini sildi`;
      } else if (log.action === "UPDATE" && log.oldData && typeof log.oldData === 'object' && log.newData && typeof log.newData === 'object') {
        const changedFields = getChangedFields(log.oldData as Record<string, unknown>, log.newData as Record<string, unknown>);
        if (changedFields.length > 0) {
          // Önemli alanlar için detaylı açıklama
          const importantFields = ["status", "priority", "assignedTo", "assignedUsers", "dueDate", "approvalStatus"];
          const hasImportantField = changedFields.some(f => importantFields.includes(f));

          if (hasImportantField && changedFields.length === 1) {
            // Tek önemli alan değiştiyse detaylı açıklama
            const field = changedFields[0];
            const changeDesc = getDetailedChangeDescription(
              field,
              log.oldData[field],
              log.newData[field],
              log.tableName
            );
            description = `${userName} ${projectPrefix}"${taskName}" görevinin ${changeDesc}`;
          } else if (changedFields.length === 1) {
            // Tek alan değiştiyse
            const field = changedFields[0];
            const fieldLabel = FIELD_LABELS[field] || field;
            description = `${userName} ${projectPrefix}"${taskName}" görevinin "${fieldLabel}" alanını güncelledi`;
          } else {
            // Birden fazla alan değiştiyse
            const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
            const fieldsText = fieldLabels.length === 1
              ? `"${fieldLabels[0]}" alanını`
              : fieldLabels.length === 2
                ? `"${fieldLabels[0]}" ve "${fieldLabels[1]}" alanlarını`
                : `"${fieldLabels.join('", "')}"${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
            description = `${userName} ${projectPrefix}"${taskName}" görevinin ${fieldsText} güncelledi`;
          }
        } else {
          description = `${userName} ${projectPrefix}"${taskName}" görevini güncelledi`;
        }
      } else {
        description = `${userName} ${projectPrefix}"${taskName}" görevini ${actionVerb}`;
      }
    }
    // Müşteri logları
    else if (log.tableName === "customers" && log.recordId) {
      const newDataObj = log.newData && typeof log.newData === 'object' ? log.newData as Record<string, unknown> : {};
      const oldDataObj = log.oldData && typeof log.oldData === 'object' ? log.oldData as Record<string, unknown> : {};
      const customerName = entityNames[`customers_${log.recordId}`] ||
        ('name' in newDataObj && typeof newDataObj.name === 'string' ? newDataObj.name : null) ||
        ('name' in oldDataObj && typeof oldDataObj.name === 'string' ? oldDataObj.name : null) ||
        "müşteri";
      if (log.action === "CREATE") {
        description = `${userName} "${customerName}" adlı müşteriyi oluşturdu`;
      } else if (log.action === "DELETE") {
        description = `${userName} "${customerName}" adlı müşteriyi sildi`;
      } else if (log.action === "UPDATE" && log.oldData && typeof log.oldData === 'object' && log.newData && typeof log.newData === 'object') {
        const changedFields = getChangedFields(log.oldData as Record<string, unknown>, log.newData as Record<string, unknown>);
        if (changedFields.length > 0) {
          if (changedFields.length === 1) {
            const field = changedFields[0];
            const changeDesc = getDetailedChangeDescription(field, log.oldData[field], log.newData[field], log.tableName);
            description = `${userName} "${customerName}" müşterisinin ${changeDesc}`;
          } else {
            const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
            const fieldsText = fieldLabels.length === 1
              ? `"${fieldLabels[0]}" alanını`
              : fieldLabels.length === 2
                ? `"${fieldLabels[0]}" ve "${fieldLabels[1]}" alanlarını`
                : `"${fieldLabels.join('", "')}"${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
            description = `${userName} "${customerName}" müşterisinin ${fieldsText} güncelledi`;
          }
        } else {
          description = `${userName} "${customerName}" müşterisini güncelledi`;
        }
      } else {
        description = `${userName} "${customerName}" müşterisini ${actionVerb}`;
      }
    }
    // Sipariş logları
    else if (log.tableName === "orders" && log.recordId) {
      const newDataObj = log.newData && typeof log.newData === 'object' ? log.newData as Record<string, unknown> : {};
      const oldDataObj = log.oldData && typeof log.oldData === 'object' ? log.oldData as Record<string, unknown> : {};
      const orderName = entityNames[`orders_${log.recordId}`] ||
        ('orderNumber' in newDataObj && typeof newDataObj.orderNumber === 'string' ? `Sipariş #${newDataObj.orderNumber}` : null) ||
        ('orderNumber' in oldDataObj && typeof oldDataObj.orderNumber === 'string' ? `Sipariş #${oldDataObj.orderNumber}` : null) ||
        "sipariş";
      if (log.action === "CREATE") {
        description = `${userName} ${orderName} siparişini oluşturdu`;
      } else if (log.action === "DELETE") {
        description = `${userName} ${orderName} siparişini sildi`;
      } else if (log.action === "UPDATE" && log.oldData && typeof log.oldData === 'object' && log.newData && typeof log.newData === 'object') {
        const changedFields = getChangedFields(log.oldData as Record<string, unknown>, log.newData as Record<string, unknown>);
        if (changedFields.length > 0) {
          const importantFields = ["status", "totalAmount", "grandTotal", "subtotal", "deliveryDate"];
          const hasImportantField = changedFields.some(f => importantFields.includes(f));

          if (hasImportantField && changedFields.length === 1) {
            const field = changedFields[0];
            const changeDesc = getDetailedChangeDescription(field, log.oldData[field], log.newData[field], log.tableName);
            description = `${userName} ${orderName} siparişinin ${changeDesc}`;
          } else if (changedFields.length === 1) {
            const field = changedFields[0];
            const fieldLabel = FIELD_LABELS[field] || field;
            description = `${userName} ${orderName} siparişinin "${fieldLabel}" alanını güncelledi`;
          } else {
            const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
            const fieldsText = fieldLabels.length === 1
              ? `"${fieldLabels[0]}" alanını`
              : fieldLabels.length === 2
                ? `"${fieldLabels[0]}" ve "${fieldLabels[1]}" alanlarını`
                : `"${fieldLabels.join('", "')}"${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
            description = `${userName} ${orderName} siparişinin ${fieldsText} güncelledi`;
          }
        } else {
          description = `${userName} ${orderName} siparişini güncelledi`;
        }
      } else {
        description = `${userName} ${orderName} siparişini ${actionVerb}`;
      }
    }
    // Ürün logları
    else if (log.tableName === "products" && log.recordId) {
      const newDataObj = log.newData && typeof log.newData === 'object' ? log.newData as Record<string, unknown> : {};
      const oldDataObj = log.oldData && typeof log.oldData === 'object' ? log.oldData as Record<string, unknown> : {};
      const productName = entityNames[`products_${log.recordId}`] ||
        ('name' in newDataObj && typeof newDataObj.name === 'string' ? newDataObj.name : null) ||
        ('name' in oldDataObj && typeof oldDataObj.name === 'string' ? oldDataObj.name : null) ||
        "ürün";
      if (log.action === "CREATE") {
        description = `${userName} "${productName}" adlı ürünü oluşturdu`;
      } else if (log.action === "DELETE") {
        description = `${userName} "${productName}" adlı ürünü sildi`;
      } else if (log.action === "UPDATE" && log.oldData && typeof log.oldData === 'object' && log.newData && typeof log.newData === 'object') {
        const changedFields = getChangedFields(log.oldData as Record<string, unknown>, log.newData as Record<string, unknown>);
        if (changedFields.length > 0) {
          if (changedFields.length === 1) {
            const field = changedFields[0];
            const changeDesc = getDetailedChangeDescription(field, log.oldData[field], log.newData[field], log.tableName);
            description = `${userName} "${productName}" ürününün ${changeDesc}`;
          } else {
            const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
            const fieldsText = fieldLabels.length === 1
              ? `"${fieldLabels[0]}" alanını`
              : fieldLabels.length === 2
                ? `"${fieldLabels[0]}" ve "${fieldLabels[1]}" alanlarını`
                : `"${fieldLabels.join('", "')}"${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
            description = `${userName} "${productName}" ürününün ${fieldsText} güncelledi`;
          }
        } else {
          description = `${userName} "${productName}" ürününü güncelledi`;
        }
      } else {
        description = `${userName} "${productName}" ürününü ${actionVerb}`;
      }
    }
    // Proje logları
    else if (log.tableName === "projects" && log.recordId) {
      const newDataObj = log.newData && typeof log.newData === 'object' ? log.newData as Record<string, unknown> : {};
      const oldDataObj = log.oldData && typeof log.oldData === 'object' ? log.oldData as Record<string, unknown> : {};
      const projectName = entityNames[`projects_${log.recordId}`] ||
        ('name' in newDataObj && typeof newDataObj.name === 'string' ? newDataObj.name : null) ||
        ('name' in oldDataObj && typeof oldDataObj.name === 'string' ? oldDataObj.name : null) ||
        "proje";
      if (log.action === "CREATE") {
        description = `${userName} "${projectName}" adlı projeyi oluşturdu`;
      } else if (log.action === "DELETE") {
        description = `${userName} "${projectName}" adlı projeyi sildi`;
      } else if (log.action === "UPDATE" && log.oldData && typeof log.oldData === 'object' && log.newData && typeof log.newData === 'object') {
        const changedFields = getChangedFields(log.oldData as Record<string, unknown>, log.newData as Record<string, unknown>);
        if (changedFields.length > 0) {
          if (changedFields.length === 1) {
            const field = changedFields[0];
            const changeDesc = getDetailedChangeDescription(field, log.oldData[field], log.newData[field], log.tableName);
            description = `${userName} "${projectName}" projesinin ${changeDesc}`;
          } else {
            const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
            const fieldsText = fieldLabels.length === 1
              ? `"${fieldLabels[0]}" alanını`
              : fieldLabels.length === 2
                ? `"${fieldLabels[0]}" ve "${fieldLabels[1]}" alanlarını`
                : `"${fieldLabels.join('", "')}"${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
            description = `${userName} "${projectName}" projesinin ${fieldsText} güncelledi`;
          }
        } else {
          description = `${userName} "${projectName}" projesini güncelledi`;
        }
      } else {
        description = `${userName} "${projectName}" projesini ${actionVerb}`;
      }
    }
    // Kullanıcı rolleri logları
    else if (log.tableName === "user_roles" || log.tableName === "users") {
      const newDataObj = log.newData && typeof log.newData === 'object' ? log.newData as Record<string, unknown> : {};
      const oldDataObj = log.oldData && typeof log.oldData === 'object' ? log.oldData as Record<string, unknown> : {};
      const userName_entity = ('fullName' in newDataObj && typeof newDataObj.fullName === 'string' ? newDataObj.fullName : null) ||
        ('fullName' in oldDataObj && typeof oldDataObj.fullName === 'string' ? oldDataObj.fullName : null) ||
        ('email' in newDataObj && typeof newDataObj.email === 'string' ? newDataObj.email.split("@")[0] : null) ||
        ('email' in oldDataObj && typeof oldDataObj.email === 'string' ? oldDataObj.email.split("@")[0] : null) ||
        (log.recordId && entityNames[`users_${log.recordId}`]) ||
        "kullanıcı";

      if (log.action === "CREATE") {
        description = `${userName} "${userName_entity}" adlı kullanıcıyı oluşturdu`;
      } else if (log.action === "DELETE") {
        description = `${userName} "${userName_entity}" adlı kullanıcıyı sildi`;
      } else if (log.action === "UPDATE" && log.oldData && typeof log.oldData === 'object' && log.newData && typeof log.newData === 'object') {
        const changedFields = getChangedFields(log.oldData as Record<string, unknown>, log.newData as Record<string, unknown>);
        if (changedFields.includes("role")) {
          const oldRole = formatValue(log.oldData["role"], "role", log.tableName);
          const newRole = formatValue(log.newData["role"], "role", log.tableName);
          description = `${userName} "${userName_entity}" kullanıcısının rolünü "${oldRole}"'den "${newRole}"'e değiştirdi`;
        } else if (changedFields.length > 0) {
          const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
          const fieldsText = fieldLabels.length === 1
            ? `"${fieldLabels[0]}" alanını`
            : fieldLabels.length === 2
              ? `"${fieldLabels[0]}" ve "${fieldLabels[1]}" alanlarını`
              : `"${fieldLabels.join('", "')}"${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
          description = `${userName} "${userName_entity}" kullanıcısının ${fieldsText} güncelledi`;
        } else {
          description = `${userName} "${userName_entity}" kullanıcısını güncelledi`;
        }
      } else {
        description = `${userName} "${userName_entity}" kullanıcısını ${actionVerb}`;
      }
    }
    // Departman logları
    else if (log.tableName === "departments" && log.recordId) {
      const newDataObj = log.newData && typeof log.newData === 'object' ? log.newData as Record<string, unknown> : {};
      const oldDataObj = log.oldData && typeof log.oldData === 'object' ? log.oldData as Record<string, unknown> : {};
      const deptName = entityNames[`departments_${log.recordId}`] ||
        ('name' in newDataObj && typeof newDataObj.name === 'string' ? newDataObj.name : null) ||
        ('name' in oldDataObj && typeof oldDataObj.name === 'string' ? oldDataObj.name : null) ||
        "departman";
      if (log.action === "CREATE") {
        description = `${userName} "${deptName}" adlı departmanı oluşturdu`;
      } else if (log.action === "DELETE") {
        description = `${userName} "${deptName}" adlı departmanı sildi`;
      } else if (log.action === "UPDATE" && log.oldData && typeof log.oldData === 'object' && log.newData && typeof log.newData === 'object') {
        const changedFields = getChangedFields(log.oldData as Record<string, unknown>, log.newData as Record<string, unknown>);
        if (changedFields.length > 0) {
          if (changedFields.length === 1) {
            const field = changedFields[0];
            const fieldLabel = FIELD_LABELS[field] || field;
            description = `${userName} "${deptName}" departmanının "${fieldLabel}" alanını güncelledi`;
          } else {
            const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
            const fieldsText = fieldLabels.length === 1
              ? `"${fieldLabels[0]}" alanını`
              : fieldLabels.length === 2
                ? `"${fieldLabels[0]}" ve "${fieldLabels[1]}" alanlarını`
                : `"${fieldLabels.join('", "')}"${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
            description = `${userName} "${deptName}" departmanının ${fieldsText} güncelledi`;
          }
        } else {
          description = `${userName} "${deptName}" departmanını güncelledi`;
        }
      } else {
        description = `${userName} "${deptName}" departmanını ${actionVerb}`;
      }
    }
    // Diğer loglar - entity adı ile
    else if (log.recordId && entityNames[`${log.tableName}_${log.recordId}`]) {
      const entityName = entityNames[`${log.tableName}_${log.recordId}`];
      const tableLabel = TABLE_LABELS[log.tableName] || log.tableName;
      if (log.action === "CREATE") {
        description = `${userName} "${entityName}" adlı ${tableLabel.toLowerCase()} kaydını oluşturdu`;
      } else if (log.action === "DELETE") {
        description = `${userName} "${entityName}" adlı ${tableLabel.toLowerCase()} kaydını sildi`;
      } else if (log.action === "UPDATE" && log.oldData && typeof log.oldData === 'object' && log.newData && typeof log.newData === 'object') {
        const changedFields = getChangedFields(log.oldData as Record<string, unknown>, log.newData as Record<string, unknown>);
        if (changedFields.length > 0) {
          if (changedFields.length === 1) {
            const field = changedFields[0];
            const fieldLabel = FIELD_LABELS[field] || field;
            description = `${userName} "${entityName}" ${tableLabel.toLowerCase()} kaydının "${fieldLabel}" alanını güncelledi`;
          } else {
            const fieldLabels = changedFields.map(field => FIELD_LABELS[field] || field).slice(0, 3);
            const fieldsText = fieldLabels.length === 1
              ? `"${fieldLabels[0]}" alanını`
              : fieldLabels.length === 2
                ? `"${fieldLabels[0]}" ve "${fieldLabels[1]}" alanlarını`
                : `"${fieldLabels.join('", "')}"${changedFields.length > 3 ? ` ve ${changedFields.length - 3} alan daha` : ''} alanlarını`;
            description = `${userName} "${entityName}" ${tableLabel.toLowerCase()} kaydının ${fieldsText} güncelledi`;
          }
        } else {
          description = `${userName} "${entityName}" ${tableLabel.toLowerCase()} kaydını güncelledi`;
        }
      } else {
        description = `${userName} "${entityName}" ${tableLabel.toLowerCase()} kaydını ${actionVerb}`;
      }
    }
    // Fallback - sadece işlem tipi
    else {
      const actionLabel = actionMeta?.label || "İşlem";
      const tableLabel = TABLE_LABELS[log.tableName] || log.tableName;
      if (log.action === "CREATE") {
        description = `${userName} ${tableLabel.toLowerCase()} bölümünde yeni bir kayıt oluşturdu`;
      } else if (log.action === "DELETE") {
        description = `${userName} ${tableLabel.toLowerCase()} bölümünden bir kayıt sildi`;
      } else {
        description = `${userName} ${tableLabel.toLowerCase()} bölümünde ${actionLabel.toLowerCase()} işlemi ${actionVerb}`;
      }
    }

    const timestamp = format(log.createdAt.toDate(), "dd MMMM yyyy, HH:mm", { locale: tr });

    return {
      description,
      timestamp,
      metaLine: "", // Meta bilgiyi kaldırdık
    };
  };

  // Kayıt adını al
  const getRecordName = (data: unknown, tableName: string, recordId?: string | null): string => {
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
    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (tableName === "orders" && typeof dataObj.orderNumber === 'string') {
        return `"Sipariş #${dataObj.orderNumber}" siparişini`;
      }
      if (tableName === "tasks" && typeof dataObj.title === 'string') {
        return `"${dataObj.title}" görevini`;
      }
      if (tableName === "customers" && typeof dataObj.name === 'string') {
        return `"${dataObj.name}" müşterisini`;
      }
      if (tableName === "products" && typeof dataObj.name === 'string') {
        return `"${dataObj.name}" ürününü`;
      }
      if (tableName === "projects" && typeof dataObj.name === 'string') {
        return `"${dataObj.name}" projesini`;
      }
      if (tableName === "reports" && typeof dataObj.title === 'string') {
        return `"${dataObj.title}" raporunu`;
      }
      if (tableName === "task_assignments" && typeof dataObj.taskTitle === 'string') {
        return `"${dataObj.taskTitle}" görev atamasını`;
      }
      if (tableName === "raw_materials" && typeof dataObj.name === 'string') {
        return `"${dataObj.name}" hammaddesini`;
      }
      if (tableName === "customerNotes") {
        const content = typeof dataObj.content === 'string' ? dataObj.content : (typeof dataObj.note === 'string' ? dataObj.note : null);
        if (content) {
          const note = content.substring(0, 30);
          return `"${note}${content.length > 30 ? '...' : ''}" notunu`;
        }
      }

      // Genel fallback
      if (typeof dataObj.name === 'string') return `"${dataObj.name}" kaydını`;
      if (typeof dataObj.title === 'string') return `"${dataObj.title}" kaydını`;
    }

    // ID gösterme - sadece tableName göster
    const tableLabel = TABLE_LABELS[tableName] || tableName;
    return `${tableLabel} kaydını`;
  };

  // İnsan tarafından okunabilir değişiklik mesajları oluştur
  const getHumanReadableChanges = (
    oldData: unknown,
    newData: unknown,
    tableName: string,
    recordName?: string | null
  ): string[] => {
    if (!oldData || !newData) return [];

    const changes: string[] = [];
    const oldDataObj = oldData && typeof oldData === 'object' ? oldData as Record<string, unknown> : {};
    const newDataObj = newData && typeof newData === 'object' ? newData as Record<string, unknown> : {};
    const changedFields = getChangedFields(oldDataObj, newDataObj);

    changedFields.forEach((field) => {
      const fieldLabel = FIELD_LABELS[field] || field;
      const oldValue = formatValue(oldDataObj[field], field, tableName);
      const newValue = formatValue(newDataObj[field], field, tableName);

      // Özel durumlar için özel mesajlar
      if (field === "status" && tableName === "tasks") {
        // Görev adını da ekle
        const taskTitle = recordName || (typeof oldDataObj.title === 'string' ? oldDataObj.title : null) || (typeof newDataObj.title === 'string' ? newDataObj.title : null) || "görev";
        changes.push(`"${taskTitle}" görevinin durumunu "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "status" && tableName === "orders") {
        const orderNum = recordName || (typeof oldDataObj.orderNumber === 'string' ? oldDataObj.orderNumber : null) || (typeof newDataObj.orderNumber === 'string' ? newDataObj.orderNumber : null) || "sipariş";
        changes.push(`"${orderNum}" siparişinin durumunu "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "status" && tableName === "production_orders") {
        const orderNum = recordName || (typeof oldDataObj.orderNumber === 'string' ? oldDataObj.orderNumber : null) || (typeof newDataObj.orderNumber === 'string' ? newDataObj.orderNumber : null) || "üretim siparişi";
        changes.push(`"${orderNum}" üretim siparişinin durumunu "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "approvalStatus") {
        const taskTitle = recordName || (typeof oldDataObj.title === 'string' ? oldDataObj.title : null) || (typeof newDataObj.title === 'string' ? newDataObj.title : null) || "";
        const prefix = taskTitle ? `"${taskTitle}" görevinin ` : "";
        if (newValue === "Onaylandı") {
          changes.push(`${prefix}onay durumunu "Beklemede"den "Onaylandı"ya güncelledi`);
        } else if (newValue === "Reddedildi") {
          changes.push(`${prefix}onay durumunu "Beklemede"den "Reddedildi"ye güncelledi`);
        } else {
          changes.push(`${prefix}onay durumunu "${oldValue}"'den "${newValue}"'e değiştirdi`);
        }
      } else if (field === "rejectionReason") {
        const taskTitle = recordName || (typeof oldDataObj.title === 'string' ? oldDataObj.title : null) || (typeof newDataObj.title === 'string' ? newDataObj.title : null) || "";
        const prefix = taskTitle ? `"${taskTitle}" görevi için ` : "";
        changes.push(`${prefix}red nedeni ekledi: "${newValue}"`);
      } else if (field === "title" && tableName === "tasks") {
        changes.push(`görev başlığını "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "description" && tableName === "tasks") {
        const taskTitle = recordName || (typeof oldDataObj.title === 'string' ? oldDataObj.title : null) || (typeof newDataObj.title === 'string' ? newDataObj.title : null) || "";
        const prefix = taskTitle ? `"${taskTitle}" ` : "";
        changes.push(`${prefix}görev açıklamasını güncelledi`);
      } else if (field === "priority" && tableName === "tasks") {
        const taskTitle = recordName || (typeof oldDataObj.title === 'string' ? oldDataObj.title : null) || (typeof newDataObj.title === 'string' ? newDataObj.title : null) || "";
        const prefix = taskTitle ? `"${taskTitle}" görevinin ` : "";
        changes.push(`${prefix}önceliği "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "dueDate" && tableName === "tasks") {
        const taskTitle = recordName || (typeof oldDataObj.title === 'string' ? oldDataObj.title : null) || (typeof newDataObj.title === 'string' ? newDataObj.title : null) || "";
        const prefix = taskTitle ? `"${taskTitle}" görevinin ` : "";
        changes.push(`${prefix}bitiş tarihini "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "role") {
        changes.push(`rolünü "${oldValue}"'den "${newValue}"'e değiştirdi`);
      } else if (field === "assignedTo" || field === "assignedUsers") {
        const taskTitle = recordName || (typeof oldDataObj.title === 'string' ? oldDataObj.title : null) || (typeof newDataObj.title === 'string' ? newDataObj.title : null) || "";
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
    <div className="space-y-1 h-full flex flex-col">
      <div className="space-y-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 mb-1">
          <div className="text-xs sm:text-sm text-muted-foreground">
            {filteredLogs.length} kayıt bulundu
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm" className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="text-xs sm:text-sm">CSV İndir</span>
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-1.5">
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

        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Hiç log bulunamadı</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto overscroll-contain pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <div className="space-y-1">
              {/* Tüm loglar - Scroll edilebilir */}
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                const changedFields = log.action === "UPDATE" && log.oldData && typeof log.oldData === 'object' && log.newData && typeof log.newData === 'object'
                  ? getChangedFields(log.oldData as Record<string, unknown>, log.newData as Record<string, unknown>)
                  : [];

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
                            <h4 className="font-semibold text-[11px] sm:text-xs mb-3 flex items-center gap-2 leading-tight">
                              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                                    <span className="font-semibold text-[11px] sm:text-xs">{log.userName || (log.userEmail ? log.userEmail.split("@")[0] : "Sistem")}</span>
                                    {log.userEmail && (
                                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">{log.userEmail}</span>
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

                          {/* Teknik Detaylar */}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-dashed border-gray-200 dark:border-gray-800">
                              <h4 className="font-semibold text-xs flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                                <Monitor className="h-3.5 w-3.5" />
                                Teknik Detaylar
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {Object.entries(log.metadata).map(([key, value]) => {
                                  // Bazı alanları gizle veya zaten gösterilenleri atla
                                  if (key === "changesSummary" || key === "performedBy" || key === "timestamp" || key === "action" || key === "method") return null;

                                  const fieldLabel = FIELD_LABELS[key] || key;
                                  let displayValue = "";

                                  if (typeof value === 'object' && value !== null) {
                                    displayValue = JSON.stringify(value);
                                  } else {
                                    displayValue = String(value);
                                  }

                                  if (key === "userAgent") {
                                    // User agent çok uzunsa kısalt
                                    displayValue = displayValue.length > 60 ? displayValue.substring(0, 60) + "..." : displayValue;
                                  }

                                  return (
                                    <div key={key} className="bg-gray-50 dark:bg-gray-900/50 rounded p-2 border border-gray-100 dark:border-gray-800 text-xs">
                                      <span className="font-medium text-muted-foreground block mb-0.5">{fieldLabel}</span>
                                      <span className="break-all font-mono text-gray-600 dark:text-gray-400">{displayValue}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Daha fazla yükle butonu */}
            {hasMore && mode === "admin" && !loading && (
              <div className="flex justify-center mt-2">
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
        )}
      </div>
    </div>
  );
};
