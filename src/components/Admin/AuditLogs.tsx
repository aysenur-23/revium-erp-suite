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
import { getDepartments, Department } from "@/services/firebase/departmentService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { getCustomers, Customer } from "@/services/firebase/customerService";
import { getProducts, Product } from "@/services/firebase/productService";

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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Loglar yüklenemedi: " + message);
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
  const formatValue = (value: any, fieldName?: string): string => {
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
        return value.length > 0 ? `${value.length} öğe` : "Boş";
      }
      return JSON.stringify(value);
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

  const getRecordDisplayName = (data: any, tableName: string): string | null => {
    if (!data) return null;
    if (tableName === "orders" && data.orderNumber) return data.orderNumber;
    if (tableName === "tasks" && data.title) return data.title;
    if (tableName === "customers" && data.name) return data.name;
    if (tableName === "products" && data.name) return data.name;
    if (tableName === "projects" && data.name) return data.name;
    if (tableName === "reports" && data.title) return data.title;
    if (tableName === "task_assignments" && data.taskTitle) return data.taskTitle;
    if (tableName === "warranty") {
      // Warranty için müşteri ve ürün adlarını göster
      const customerId = data.customerId;
      const productId = data.productId;
      const customer = customerId ? customers.find(c => c.id === customerId) : null;
      const product = productId ? products.find(p => p.id === productId) : null;
      const customerName = customer?.name || "Bilinmeyen Müşteri";
      const productName = product?.name || "Bilinmeyen Ürün";
      return `${customerName} - ${productName}`;
    }
    if (data.name) return data.name;
    if (data.title) return data.title;
    if (data.id) return String(data.id);
    return null;
  };

  // Log mesajını oluştur
  const buildLogSummary = (log: AuditLog): { description: string; timestamp: string; metaLine: string } => {
    // Kullanıcı ismini belirle - userId yerine isim göster
    const userName = log.userName || (log.userEmail ? log.userEmail.split("@")[0] : null) || "Sistem";
    const menuName = MENU_LABELS[log.tableName] || TABLE_LABELS[log.tableName] || log.tableName;
    const actionMeta = ACTION_META[log.action];
    const recordName =
      getRecordDisplayName(log.newData || log.oldData, log.tableName) ||
      getRecordDisplayName(log.oldData, log.tableName);
    const actionVerb = actionMeta?.verb || "işlem yaptı";

    let description = `${userName}, ${menuName} bölümünde ${actionMeta?.short.toLowerCase() || "bir işlem"} yaptı.`;

    // UPDATE işlemleri için detaylı açıklama
    if (log.action === "UPDATE" && log.oldData && log.newData) {
      const changedFields = getChangedFields(log.oldData, log.newData);
      const humanReadableChanges = getHumanReadableChanges(log.oldData, log.newData, log.tableName, recordName);
      
      if (recordName) {
        if (humanReadableChanges.length > 0) {
          // İlk değişikliği ana mesaja ekle
          const firstChange = humanReadableChanges[0];
          description = `${userName}, "${recordName}" ${firstChange}.`;
          
          // Eğer birden fazla değişiklik varsa, diğerlerini de ekle
          if (humanReadableChanges.length > 1) {
            const otherChanges = humanReadableChanges.slice(1).join(", ");
            description += ` Ayrıca ${otherChanges}.`;
          }
        } else {
          description = `${userName}, "${recordName}" kaydını ${actionVerb}.`;
        }
      } else {
        // Kayıt adı yoksa, değişiklikleri göster
        if (humanReadableChanges.length > 0) {
          description = `${userName}, ${menuName} bölümünde ${humanReadableChanges[0]}.`;
          if (humanReadableChanges.length > 1) {
            description += ` Ayrıca ${humanReadableChanges.slice(1).join(", ")}.`;
          }
        } else {
          description = `${userName}, ${menuName} bölümünde bir kaydı ${actionVerb}.`;
        }
      }
    } else if (recordName) {
      // CREATE veya DELETE için kayıt adını göster
      description = `${userName}, ${menuName} bölümünde "${recordName}" kaydını ${actionVerb}.`;
    }

    const timestamp = format(log.createdAt.toDate(), "dd MMMM yyyy, HH:mm", { locale: tr });

    const metaParts = [
      log.userEmail ? `E-posta: ${log.userEmail}` : null,
      recordName ? `İsim: ${recordName}` : null,
    ].filter(Boolean);

    return {
      description,
      timestamp,
      metaLine: metaParts.join(" • "),
    };
  };

  // Kayıt adını al
  const getRecordName = (data: any, tableName: string): string => {
    if (!data) return "kayıt";
    
    // Tablo bazlı özel isimlendirme
    if (tableName === "orders" && data.orderNumber) {
      return `"${data.orderNumber}" numaralı siparişi`;
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
    
    // Genel fallback
    if (data.name) return `"${data.name}" kaydını`;
    if (data.title) return `"${data.title}" kaydını`;
    if (data.id) return `"${data.id}" ID'li kaydı`;
    
    return "kayıt";
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
      const oldValue = formatValue(oldData[field], field);
      const newValue = formatValue(newData[field], field);

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
                                    const recordName = getRecordDisplayName(log.newData || log.oldData, log.tableName) ||
                                                      getRecordDisplayName(log.oldData, log.tableName);
                                    if (recordName) {
                                      return <span className="font-semibold text-sm mt-1">{recordName}</span>;
                                    }
                                    return null;
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
                                  const oldValue = formatValue(log.oldData[field], field);
                                  const newValue = formatValue(log.newData[field], field);
                                  
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
                                    const formattedValue = formatValue(value, key);
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
                                    const formattedValue = formatValue(value, key);
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
