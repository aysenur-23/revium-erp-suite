import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { getTasks, getTaskAssignments, TaskAssignment, Task as FirebaseTask } from "@/services/firebase/taskService";
import { getAuditLogs, getTeamMemberLogs, AuditLog } from "@/services/firebase/auditLogsService";
import { Timestamp } from "firebase/firestore";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Loader2, UserCheck, ClipboardList, Download, Users, CheckCircle2, XCircle, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
// pdfGenerator will be dynamically imported when needed
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin, isMainAdmin } from "@/utils/permissions";
import { getDepartments } from "@/services/firebase/departmentService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface AssignmentWithTask extends TaskAssignment {
  taskId: string;
  taskTitle: string;
  taskStatus: FirebaseTask["status"];
}

interface UserStats {
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  completed: number;
  active: number;
}

const defaultStats: UserStats = {
  total: 0,
  accepted: 0,
  rejected: 0,
  pending: 0,
  completed: 0,
  active: 0,
};

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  completed: "Tamamlandı",
  in_progress: "Devam ediyor",
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
};

// Kayıt adını al
const getRecordDisplayName = (data: unknown, tableName: string): string | null => {
  if (!data || typeof data !== "object") return null;
  const dataObj = data as Record<string, unknown>;
  if (tableName === "orders" && typeof dataObj.orderNumber === "string") return dataObj.orderNumber;
  if (tableName === "tasks" && typeof dataObj.title === "string") return dataObj.title;
  if (tableName === "customers" && typeof dataObj.name === "string") return dataObj.name;
  if (tableName === "products" && typeof dataObj.name === "string") return dataObj.name;
  if (tableName === "projects" && typeof dataObj.name === "string") return dataObj.name;
  if (tableName === "reports" && typeof dataObj.title === "string") return dataObj.title;
  if (tableName === "task_assignments" && typeof dataObj.taskTitle === "string") return dataObj.taskTitle;
  if (typeof dataObj.name === "string") return dataObj.name;
  if (typeof dataObj.title === "string") return dataObj.title;
  return null;
};

const formatDate = (value?: Date | string | null) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("tr-TR");
};

export const UserInsights = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithTask[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tasks, setTasks] = useState<FirebaseTask[]>([]);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isUserMainAdmin, setIsUserMainAdmin] = useState(false);
  const [isTeamLeader, setIsTeamLeader] = useState(false);

  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [rejectionSearch, setRejectionSearch] = useState("");
  const [logActionFilter, setLogActionFilter] = useState<string>("all");
  const [logSearch, setLogSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    userName: string;
    userEmail: string;
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
    completed: number;
    active: number;
    assignments: Array<{
      taskTitle: string;
      status: string;
      assignedAt: Date;
      completedAt: Date | null;
    }>;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // İlk olarak departments ve users'ı al (yetki kontrolü için)
        const [departments, usersData] = await Promise.all([
          getDepartments(),
          getAllUsers(),
        ]);
        
        // Kullanıcı yetkilerini kontrol et
        const userProfile: UserProfile = {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          fullName: user.fullName,
          displayName: user.fullName,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          role: user.roles,
          createdAt: null,
          updatedAt: null,
        };
        
        const admin = await isAdmin(userProfile);
        const mainAdmin = await isMainAdmin(userProfile);
        const teamLeader = departments.some((dept) => dept.managerId === user.id);
        
        setIsUserAdmin(admin);
        setIsUserMainAdmin(mainAdmin);
        setIsTeamLeader(teamLeader);
        
        // Ekip liderleri için sadece ekip üyelerini göster
        let filteredUsers = usersData;
        if (teamLeader && !admin && !mainAdmin) {
          const managedTeams = departments.filter((dept) => dept.managerId === user.id);
          const teamIds = managedTeams.map((team) => team.id);
          const teamMemberIds = new Set(
            usersData
              .filter((u) => {
                const approvedTeams = u.approvedTeams || [];
                const pendingTeams = u.pendingTeams || [];
                return [...approvedTeams, ...pendingTeams].some((teamId) => teamIds.includes(teamId));
              })
              .map((u) => u.id)
          );
          filteredUsers = usersData.filter((u) => teamMemberIds.has(u.id) || u.id === user.id);
        }
        setUsers(filteredUsers);
        
        // Paralel olarak tasks, assignments ve logs'u al
        // Tasks için limit ekle (performans için)
        const tasksData = await getTasks();
        // onlyInMyTasks görevlerini de dahil et (adminler görebilir)
        const limitedTasks = tasksData.slice(0, 500); // Max 500 task
        setTasks(limitedTasks);
        
        // Logları yetkiye göre getir (limit ile)
        let logsData: AuditLog[] = [];
        if (mainAdmin || admin) {
          logsData = await getAuditLogs({ limit: 200 }).catch(() => []);
        } else if (teamLeader) {
          const teamLogsResult = await getTeamMemberLogs(user.id).catch(() => ({ logs: [], teamInfo: { managedTeams: [], teamMembers: [] } }));
          logsData = (teamLogsResult.logs || []).slice(0, 200); // Limit
        } else {
          logsData = await getAuditLogs({ userId: user.id, limit: 200 }).catch(() => []);
        }
        setLogs(logsData);
        
        // Assignments'ları paralel olarak al (batch processing ile)
        // Her 10 task için bir batch
        const batchSize = 10;
        const assignmentArrays: AssignmentWithTask[] = [];
        
        for (let i = 0; i < limitedTasks.length; i += batchSize) {
          const batch = limitedTasks.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (task) => {
              try {
                // onlyInMyTasks görevleri için özel assignment oluştur
                if (task.onlyInMyTasks && task.createdBy) {
                  return [{
                    id: `only-my-tasks-${task.id}`,
                    taskId: task.id,
                    assignedTo: task.createdBy,
                    assignedBy: task.createdBy,
                    status: "accepted" as const,
                    rejectionReason: null,
                    rejectionApprovedBy: null,
                    rejectionApprovedAt: null,
                    rejectionRejectedBy: null,
                    rejectionRejectedAt: null,
                    rejectionRejectionReason: null,
                    notes: null,
                    assignedAt: task.createdAt,
                    acceptedAt: task.createdAt,
                    completedAt: task.status === "completed" ? task.updatedAt : null,
                    taskTitle: task.title,
                    taskStatus: task.status,
                  }];
                }
                
                const taskAssignments = await getTaskAssignments(task.id);
                return taskAssignments.map((assignment) => ({
                  ...assignment,
                  taskId: task.id,
                  taskTitle: task.title,
                  taskStatus: task.status,
                }));
              } catch (error: unknown) {
                if (import.meta.env.DEV) {
                  console.error(`Error fetching assignments for task ${task.id}:`, error);
                }
                return [];
              }
          })
        );
          assignmentArrays.push(...batchResults.flat());
        }

        setAssignments(assignmentArrays);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("User insights fetch error:", error);
        }
        const errorMessage = error instanceof Error ? error.message : "Kullanıcı analiz verileri alınamadı";
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const analyticsByUser = useMemo(() => {
    const map: Record<string, UserStats> = {};
    assignments.forEach((assignment) => {
      if (!assignment.assignedTo) return;
      if (!map[assignment.assignedTo]) {
        map[assignment.assignedTo] = { ...defaultStats };
      }

      map[assignment.assignedTo].total += 1;
      if (assignment.status === "accepted") map[assignment.assignedTo].accepted += 1;
      if (assignment.status === "rejected") map[assignment.assignedTo].rejected += 1;
      if (assignment.status === "pending") map[assignment.assignedTo].pending += 1;
      if (assignment.status === "completed") map[assignment.assignedTo].completed += 1;
      if (["pending", "accepted"].includes(assignment.status)) {
        map[assignment.assignedTo].active += 1;
      }
    });
    return map;
  }, [assignments]);

  const selectedUserStats = selectedUser !== "all" ? analyticsByUser[selectedUser] || defaultStats : null;

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      if (selectedUser !== "all" && assignment.assignedTo !== selectedUser) return false;
      if (statusFilter !== "all" && assignment.status !== statusFilter) return false;
      if (
        taskSearch.trim() &&
        !assignment.taskTitle.toLowerCase().includes(taskSearch.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [assignments, selectedUser, statusFilter, taskSearch]);

  const rejectionEntries = useMemo(() => {
    return assignments
      .filter(
        (assignment) =>
          assignment.status === "rejected" &&
          assignment.rejectionReason &&
          assignment.rejectionReason.trim().length > 0 &&
          (selectedUser === "all" || assignment.assignedTo === selectedUser)
      )
      .filter((assignment) =>
        assignment.rejectionReason
          ?.toLowerCase()
          .includes(rejectionSearch.trim().toLowerCase() || "")
      );
  }, [assignments, selectedUser, rejectionSearch]);

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => (selectedUser === "all" ? true : log.userId === selectedUser))
      .filter((log) => (logActionFilter === "all" ? true : log.action === logActionFilter))
      .filter((log) => {
        if (!logSearch.trim()) return true;
        const haystack = `${log.tableName} ${log.action} ${log.userName ?? ""} ${
          log.recordId ?? ""
        }`.toLowerCase();
        return haystack.includes(logSearch.trim().toLowerCase());
      });
  }, [logs, selectedUser, logActionFilter, logSearch]);

  const userRows = useMemo(() => {
    return users
      .map((user) => {
        const stats = analyticsByUser[user.id] || defaultStats;
        const fullName = user.fullName || user.displayName || user.email || "Bilinmeyen";
        return {
          id: user.id,
          name: fullName,
          email: user.email,
          stats,
        };
      })
      .sort((a, b) => b.stats.total - a.stats.total);
  }, [users, analyticsByUser]);
  
  const prepareUserStats = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return null;
    }
    
    const userAssignments = assignments.filter((a) => a.assignedTo === userId);
    const userStats = analyticsByUser[userId] || defaultStats;
    
    // onlyInMyTasks görevlerini de dahil et
    const onlyMyTasksCount = tasks.filter(t => t.onlyInMyTasks && t.createdBy === userId).length;
    const onlyMyTasksActive = tasks.filter(t => 
      t.onlyInMyTasks && 
      t.createdBy === userId && 
      t.status !== "completed" && 
      t.status !== "cancelled"
    ).length;
    
    return {
      userName: user.fullName || user.displayName || user.email,
      userEmail: user.email,
      total: userStats.total + onlyMyTasksCount,
      accepted: userStats.accepted + onlyMyTasksCount,
      rejected: userStats.rejected,
      pending: userStats.pending,
      completed: userStats.completed,
      active: userStats.active + onlyMyTasksActive,
      assignments: userAssignments.map(a => ({
        taskTitle: a.taskTitle,
        status: a.status,
        assignedAt: a.assignedAt instanceof Timestamp ? a.assignedAt.toDate() : (typeof a.assignedAt === 'string' ? new Date(a.assignedAt) : new Date()),
        completedAt: a.completedAt instanceof Timestamp ? a.completedAt.toDate() : (a.completedAt ? (typeof a.completedAt === 'string' ? new Date(a.completedAt) : new Date(a.completedAt)) : null),
      })),
    };
  };

  const handlePreviewPDF = async (userId: string) => {
    setLoadingPreview(true);
    try {
      const stats = prepareUserStats(userId);
      if (!stats) {
        toast.error("Kullanıcı bulunamadı");
        return;
      }
      setPreviewData(stats);
      setPreviewOpen(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Rapor yüklenemedi";
      toast.error(errorMessage);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExportPDF = async (userId: string) => {
    setGeneratingPdfId(userId);
    try {
      const stats = prepareUserStats(userId);
      if (!stats) {
        toast.error("Kullanıcı bulunamadı");
        return;
      }
      
      const { generateUserStatsPDF } = await import("@/services/pdfGenerator");
      const pdfBlob = await generateUserStatsPDF(stats);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kullanici-istatistikleri-${stats.userName}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF başarıyla indirildi");
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("PDF export error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "PDF oluşturulurken hata oluştu";
      toast.error(errorMessage);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleDownloadFromPreview = async () => {
    if (!previewData) return;
    setGeneratingPdfId("preview");
    try {
      const { generateUserStatsPDF } = await import("@/services/pdfGenerator");
      const pdfBlob = await generateUserStatsPDF(previewData);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kullanici-istatistikleri-${previewData.userName}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF başarıyla indirildi");
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("PDF export error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "PDF oluşturulurken hata oluştu";
      toast.error(errorMessage);
    } finally {
      setGeneratingPdfId(null);
    }
  };
  
  // Görüntülenebilir kullanıcılar (yetkiye göre)
  const viewableUsers = useMemo(() => {
    if (isUserMainAdmin || isUserAdmin) {
      return users; // Yöneticiler tüm kullanıcıları görebilir
    }
    if (isTeamLeader) {
      // Ekip liderleri sadece ekip üyelerini görebilir
      return users; // Zaten setUsers'da filtrelenmiş
    }
    // Normal kullanıcılar sadece kendilerini görebilir
    return users.filter((u) => u.id === user?.id);
  }, [users, isUserMainAdmin, isUserAdmin, isTeamLeader, user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-80" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Card>
        <CardContent className="pt-3">
          <div className="grid gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Kullanıcı</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Kullanıcı seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isUserMainAdmin || isUserAdmin ? "Tüm kullanıcılar" : isTeamLeader ? "Tüm ekip üyeleri" : "Kendi loglarım"}
                  </SelectItem>
                  {viewableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName || user.displayName || user.email || "Bilinmeyen"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Görev Durumu</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="accepted">Kabul edildi</SelectItem>
                  <SelectItem value="rejected">Reddedildi</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Görev Araması</Label>
              <Input
                placeholder="Görev veya proje adı"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Log Araması</Label>
              <Input
                placeholder="Log içeriğinde ara"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedUser !== "all" ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[
            { 
              label: "Toplam Görev", 
              value: selectedUserStats?.total ?? 0,
              sub: "Tüm görevler",
              icon: FileText,
              variant: "primary" as const
            },
            { 
              label: "Aktif Görev", 
              value: selectedUserStats?.active ?? 0,
              sub: "Devam eden görevler",
              icon: CheckCircle2,
              variant: "success" as const
            },
            { 
              label: "Reddedilen Görev", 
              value: selectedUserStats?.rejected ?? 0,
              sub: "Reddedilen görevler",
              icon: XCircle,
              variant: "warning" as const
            },
            { 
              label: "Kendine Özel Görev", 
              value: tasks.filter(t => t.onlyInMyTasks && t.createdBy === selectedUser).length,
              sub: "Kişisel görevler",
              icon: UserCheck,
              variant: "info" as const
            },
          ].map((item) => (
            <Card 
              key={item.label} 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 border-2"
            >
              <CardContent className="pt-4 pb-4 px-4 sm:pt-6 sm:pb-6 sm:px-6">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 truncate">{item.label}</p>
                    <div className="text-2xl sm:text-3xl xl:text-4xl font-bold mb-1 sm:mb-2">{item.value}</div>
                    <p className="text-xs font-medium text-muted-foreground line-clamp-2">{item.sub}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${
                    item.variant === "primary" ? "bg-blue-100 text-blue-600" :
                    item.variant === "success" ? "bg-emerald-100 text-emerald-600" :
                    item.variant === "warning" ? "bg-amber-100 text-amber-600" :
                    "bg-cyan-100 text-cyan-600"
                  }`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 border-2">
            <CardContent className="pt-4 pb-4 px-4 sm:pt-6 sm:pb-6 sm:px-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 truncate">Aktif Kullanıcı Sayısı</p>
                  <div className="text-2xl sm:text-3xl xl:text-4xl font-bold mb-1 sm:mb-2">{users.length}</div>
                  <p className="text-xs font-medium text-muted-foreground line-clamp-2">Sistemdeki aktif kullanıcılar</p>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 border-2">
            <CardContent className="pt-4 pb-4 px-4 sm:pt-6 sm:pb-6 sm:px-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 truncate">Toplam Atanan Görev</p>
                  <div className="text-2xl sm:text-3xl xl:text-4xl font-bold mb-1 sm:mb-2">{assignments.length}</div>
                  <p className="text-xs font-medium text-muted-foreground line-clamp-2">Tüm atanan görevler</p>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 border-2">
            <CardContent className="pt-4 pb-4 px-4 sm:pt-6 sm:pb-6 sm:px-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 truncate">Reddedilen Görev</p>
                  <div className="text-2xl sm:text-3xl xl:text-4xl font-bold mb-1 sm:mb-2">
                    {assignments.filter((assignment) => assignment.status === "rejected").length}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground line-clamp-2">Reddedilen görev sayısı</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-100 text-amber-600">
                  <XCircle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 border-2">
            <CardContent className="pt-4 pb-4 px-4 sm:pt-6 sm:pb-6 sm:px-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 truncate">Kabul Edilen Görev</p>
                  <div className="text-2xl sm:text-3xl xl:text-4xl font-bold mb-1 sm:mb-2">
                    {assignments.filter((assignment) => assignment.status === "accepted").length}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground line-clamp-2">Kabul edilen görev sayısı</p>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-[13px] sm:text-[14px]">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Kullanıcı Görev Özeti
            </div>
            {selectedUser !== "all" && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handlePreviewPDF(selectedUser)}
                  disabled={loadingPreview}
                >
                  {loadingPreview ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Ön İzleme
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleExportPDF(selectedUser)}
                  disabled={generatingPdfId === selectedUser}
                >
                  {generatingPdfId === selectedUser ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  PDF İndir
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Kullanıcı</TableHead>
                    <TableHead className="whitespace-nowrap">Toplam</TableHead>
                    <TableHead className="whitespace-nowrap">Kabul</TableHead>
                    <TableHead className="whitespace-nowrap">Reddetme</TableHead>
                    <TableHead className="whitespace-nowrap">Bekleyen</TableHead>
                    <TableHead className="whitespace-nowrap">Aktif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn("cursor-pointer transition-colors", {
                        "bg-primary/5": selectedUser === row.id,
                      })}
                      onClick={() => setSelectedUser((prev) => (prev === row.id ? "all" : row.id))}
                    >
                      <TableCell className="min-w-[150px]">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">{row.name}</span>
                          <span className="text-xs text-muted-foreground truncate">{row.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap">{row.stats.total}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.stats.accepted}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.stats.rejected}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.stats.pending}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.stats.active}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[13px] sm:text-[14px]">
            <ClipboardList className="h-5 w-5 text-primary" />
            Görev Detayları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredAssignments.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              Filtrelere uygun görev bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Görev</TableHead>
                      <TableHead className="min-w-[120px] whitespace-nowrap">Kullanıcı</TableHead>
                      <TableHead className="whitespace-nowrap">Durum</TableHead>
                      <TableHead className="whitespace-nowrap">Atanma</TableHead>
                      <TableHead className="whitespace-nowrap">Kabul</TableHead>
                      <TableHead className="whitespace-nowrap">Tamamlanma</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignments.map((assignment) => {
                      const user = users.find((u) => u.id === assignment.assignedTo);
                      const userName = user?.fullName || user?.displayName || user?.email || "Bilinmeyen";
                      return (
                        <TableRow key={`${assignment.taskId}-${assignment.id}`}>
                          <TableCell className="font-medium min-w-[200px]">
                            <div className="truncate max-w-[200px]">{assignment.taskTitle}</div>
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="truncate max-w-[120px]">{userName}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge
                              variant={
                                assignment.status === "rejected"
                                  ? "destructive"
                                  : assignment.status === "accepted"
                                  ? "default"
                                  : assignment.status === "completed"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {statusLabels[assignment.status] || assignment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                            {formatDate(assignment.assignedAt?.toDate?.())}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                            {assignment.acceptedAt ? formatDate(assignment.acceptedAt.toDate()) : "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                            {assignment.completedAt ? formatDate(assignment.completedAt.toDate()) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-[13px] sm:text-[14px]">Reddetme Notları</CardTitle>
            <p className="text-sm text-muted-foreground">
              Kullanıcıların reddetme gerekçeleri
            </p>
          </div>
          <div className="w-full md:w-72">
            <Input
              placeholder="Not içinde ara"
              value={rejectionSearch}
              onChange={(e) => setRejectionSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rejectionEntries.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              Reddetme notu bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px] whitespace-nowrap">Kullanıcı</TableHead>
                      <TableHead className="min-w-[150px] whitespace-nowrap">Görev</TableHead>
                      <TableHead className="min-w-[200px]">Not</TableHead>
                      <TableHead className="whitespace-nowrap">Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectionEntries.map((entry) => {
                      const user = users.find((u) => u.id === entry.assignedTo);
                      const userName = user?.fullName || user?.displayName || user?.email || "Bilinmeyen";
                      return (
                        <TableRow key={`${entry.taskId}-${entry.id}`}>
                          <TableCell className="min-w-[120px]">
                            <div className="truncate max-w-[120px]">{userName}</div>
                          </TableCell>
                          <TableCell className="min-w-[150px]">
                            <div className="truncate max-w-[150px]">{entry.taskTitle}</div>
                          </TableCell>
                          <TableCell className="max-w-[200px] sm:max-w-2xl whitespace-pre-line text-sm">
                            <div className="break-words">{entry.rejectionReason}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                            {entry.assignedAt
                              ? formatDistanceToNow(entry.assignedAt.toDate(), {
                                  addSuffix: true,
                                  locale: tr,
                                })
                              : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-[13px] sm:text-[14px]">
              {isUserMainAdmin || isUserAdmin 
                ? "Kullanıcı Logları" 
                : isTeamLeader 
                  ? "Ekip Üyeleri Logları" 
                  : "Loglarım"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isUserMainAdmin || isUserAdmin
                ? "Tüm işlemler kayıt altında. Filtreleyerek inceleyebilirsiniz."
                : isTeamLeader
                  ? "Ekip üyelerinizin işlemleri kayıt altında. Filtreleyerek inceleyebilirsiniz."
                  : "Kendi işlemleriniz kayıt altında. Filtreleyerek inceleyebilirsiniz."}
            </p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Select value={logActionFilter} onValueChange={setLogActionFilter}>
              <SelectTrigger className="md:w-40">
                <SelectValue placeholder="İşlem türü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              Log bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>İşlem</TableHead>
                    <TableHead>Kayıt</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.userName || "Bilinmeyen"}</span>
                          <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.action === "DELETE"
                              ? "destructive"
                              : log.action === "UPDATE"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {log.action}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {log.tableName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const recordName = getRecordDisplayName(log.newData || log.oldData, log.tableName) ||
                                            getRecordDisplayName(log.oldData, log.tableName);
                          if (recordName) {
                            return <span className="text-sm font-medium">{recordName}</span>;
                          }
                          return (
                            <span className="text-xs text-muted-foreground">
                              {TABLE_LABELS[log.tableName] || log.tableName}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {log.createdAt
                          ? formatDistanceToNow(log.createdAt.toDate(), {
                              addSuffix: true,
                              locale: tr,
                            })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rapor Önizleme Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-full max-w-[80vw] md:max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogTitle className="sr-only">Kullanıcı Raporu Önizleme</DialogTitle>
          <DialogDescription className="sr-only">Kullanıcı istatistikleri ve görev detayları</DialogDescription>
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <h2 className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Kullanıcı Performans Raporu - {previewData?.userName || previewData?.userEmail}
            </h2>
            <p>
              {previewData?.userEmail} - {new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </DialogHeader>

          {previewData && (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 min-h-0 overscroll-contain">
              {/* İstatistik Kartları */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Toplam Görev</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">{previewData.total}</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Tamamlanan</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">{previewData.completed}</p>
                        <p className="text-xs text-green-600 mt-1">
                          {previewData.total > 0 
                            ? `%${Math.round((previewData.completed / previewData.total) * 100)}`
                            : "%0"}
                        </p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-700">Aktif Görevler</p>
                        <p className="text-2xl font-bold text-yellow-900 mt-1">{previewData.active}</p>
                      </div>
                      <Users className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detaylı İstatistikler */}
              <Card>
                <CardHeader>
                  <CardTitle>Detaylı İstatistikler</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metrik</TableHead>
                        <TableHead className="text-center">Değer</TableHead>
                        <TableHead className="text-center">Oran</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Toplam Görev</TableCell>
                        <TableCell className="text-center">{previewData.total}</TableCell>
                        <TableCell className="text-center">%100</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Tamamlanan</TableCell>
                        <TableCell className="text-center">{previewData.completed}</TableCell>
                        <TableCell className="text-center">
                          {previewData.total > 0 
                            ? `%${Math.round((previewData.completed / previewData.total) * 100)}`
                            : "%0"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Kabul Edilen</TableCell>
                        <TableCell className="text-center">{previewData.accepted}</TableCell>
                        <TableCell className="text-center">
                          {previewData.total > 0 
                            ? `%${Math.round((previewData.accepted / previewData.total) * 100)}`
                            : "%0"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Beklemede</TableCell>
                        <TableCell className="text-center">{previewData.pending}</TableCell>
                        <TableCell className="text-center">
                          {previewData.total > 0 
                            ? `%${Math.round((previewData.pending / previewData.total) * 100)}`
                            : "%0"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Reddedilen</TableCell>
                        <TableCell className="text-center">{previewData.rejected}</TableCell>
                        <TableCell className="text-center">
                          {previewData.total > 0 
                            ? `%${Math.round((previewData.rejected / previewData.total) * 100)}`
                            : "%0"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Aktif Görevler</TableCell>
                        <TableCell className="text-center">{previewData.active}</TableCell>
                        <TableCell className="text-center">
                          {previewData.total > 0 
                            ? `%${Math.round((previewData.active / previewData.total) * 100)}`
                            : "%0"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Görev Detayları */}
              {previewData.assignments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Görev Detayları</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Görev Başlığı</TableHead>
                            <TableHead className="text-center">Durum</TableHead>
                            <TableHead className="text-center">Atanma Tarihi</TableHead>
                            <TableHead className="text-center">Tamamlanma Tarihi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.assignments.map((assignment, index) => {
                            const statusLabels: Record<string, string> = {
                              "pending": "Beklemede",
                              "accepted": "Kabul Edildi",
                              "rejected": "Reddedildi",
                              "completed": "Tamamlandı",
                              "in_progress": "Devam Ediyor",
                            };

                            const assignedDate = assignment.assignedAt instanceof Date
                              ? assignment.assignedAt
                              : new Date(assignment.assignedAt);
                            const completedDate = assignment.completedAt
                              ? (assignment.completedAt instanceof Date
                                ? assignment.completedAt
                                : new Date(assignment.completedAt))
                              : null;

                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{assignment.taskTitle}</TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant={
                                      assignment.status === "completed" ? "default" :
                                      assignment.status === "accepted" || assignment.status === "in_progress" ? "secondary" :
                                      assignment.status === "rejected" ? "destructive" : "outline"
                                    }
                                  >
                                    {statusLabels[assignment.status] || assignment.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {format(assignedDate, "dd.MM.yyyy", { locale: tr })}
                                </TableCell>
                                <TableCell className="text-center">
                                  {completedDate ? format(completedDate, "dd.MM.yyyy", { locale: tr }) : "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Özet */}
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>{previewData.userName}</strong> kullanıcısı toplam{" "}
                    <strong>{previewData.total}</strong> görev almış,{" "}
                    <strong>{previewData.completed}</strong> görevi tamamlamıştır.{" "}
                    Tamamlanma oranı:{" "}
                    <strong>
                      %{previewData.total > 0 
                        ? Math.round((previewData.completed / previewData.total) * 100)
                        : 0}
                    </strong>
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Kapat
            </Button>
            <Button 
              onClick={handleDownloadFromPreview}
              disabled={!previewData || generatingPdfId === "preview"}
            >
              {generatingPdfId === "preview" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  İndiriliyor...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  PDF İndir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

