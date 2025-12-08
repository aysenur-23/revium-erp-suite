import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getTasks, getTaskAssignments, TaskAssignment, Task as FirebaseTask } from "@/services/firebase/taskService";
import { getAuditLogs, AuditLog } from "@/services/firebase/auditLogsService";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, Clock, XCircle, ListTodo, TrendingUp, ArrowRight } from "lucide-react";
import { generateUserStatsPDF } from "@/services/pdfGenerator";
import { useNavigate } from "react-router-dom";

interface AssignmentWithTask extends TaskAssignment {
  taskId: string;
  taskTitle: string;
  taskStatus: FirebaseTask["status"];
}

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  completed: "Tamamlandı",
  in_progress: "Devam ediyor",
};

const formatDate = (value?: Date | string | null) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("tr-TR");
};

export const UserPersonalInsights = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentWithTask[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Tasks için limit ekle (performans için)
        const tasksData = await getTasks();
        const limitedTasks = tasksData.slice(0, 500); // Max 500 task
        
        // Assignments'ları batch processing ile al
        const batchSize = 10;
        const assignmentArrays: AssignmentWithTask[] = [];
        
        for (let i = 0; i < limitedTasks.length; i += batchSize) {
          const batch = limitedTasks.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (task) => {
              try {
                const taskAssignments = await getTaskAssignments(task.id);
                return taskAssignments
                  .filter((assignment) => assignment.assignedTo === user.id)
                  .map((assignment) => ({
                    ...assignment,
                    taskId: task.id,
                    taskTitle: task.title,
                    taskStatus: task.status,
                  }));
              } catch (error) {
                console.error(`Error fetching assignments for task ${task.id}:`, error);
                return [];
              }
            })
          );
          assignmentArrays.push(...batchResults.flat());
        }

        setAssignments(assignmentArrays);
        // Logs için limit ekle
        const logsData = await getAuditLogs({ userId: user.id, limit: 200 }).catch(() => []);
        setLogs(logsData);
      } catch (error: any) {
        console.error("User personal insights error:", error);
        toast.error(error?.message || "Profil istatistikleri alınamadı");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const stats = useMemo(() => {
    const stat = {
      total: assignments.length,
      accepted: assignments.filter((a) => a.status === "accepted").length,
      rejected: assignments.filter((a) => a.status === "rejected").length,
      completed: assignments.filter((a) => a.status === "completed").length,
      pending: assignments.filter((a) => a.status === "pending").length,
      active: assignments.filter((a) => ["pending", "accepted"].includes(a.status)).length,
    };
    return stat;
  }, [assignments]);

  const rejectionEntries = assignments.filter(
    (assignment) =>
      assignment.status === "rejected" &&
      assignment.rejectionReason &&
      assignment.rejectionReason.trim().length > 0
  );

  const handleExportPDF = async () => {
    if (!user) return;
    try {
      const pdfBlob = await generateUserStatsPDF({
        userName: user.fullName || user.email,
        userEmail: user.email,
        total: stats.total,
        accepted: stats.accepted,
        rejected: stats.rejected,
        pending: stats.pending,
        completed: stats.completed,
        active: stats.active,
        assignments: assignments.map((a) => ({
          taskTitle: a.taskTitle,
          status: a.status,
          assignedAt: a.assignedAt.toDate(),
          completedAt: a.completedAt?.toDate() || null,
        })),
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kullanici-istatistikleri-${user.fullName || user.email}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF raporu indirildi");
    } catch (error: any) {
      console.error("PDF export error:", error);
      toast.error("PDF oluşturulurken hata: " + error.message);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const handleStatClick = (filter?: string) => {
    navigate(`/tasks${filter ? `?filter=${filter}` : ''}`);
  };

  const statCards = [
    { 
      label: "Toplam Görev", 
      value: stats.total, 
      icon: ListTodo, 
      color: "primary",
      gradient: "from-primary/10 via-primary/5 to-white",
      borderColor: "border-primary/20",
      onClick: () => handleStatClick()
    },
    { 
      label: "Aktif Görev", 
      value: stats.active, 
      icon: TrendingUp, 
      color: "blue",
      gradient: "from-blue-50 via-blue-10 to-white",
      borderColor: "border-blue-200",
      onClick: () => handleStatClick("active")
    },
    { 
      label: "Tamamlanan", 
      value: stats.completed, 
      icon: CheckCircle2, 
      color: "emerald",
      gradient: "from-emerald-50 via-emerald-10 to-white",
      borderColor: "border-emerald-200",
      onClick: () => handleStatClick("completed")
    },
    { 
      label: "Bekleyen", 
      value: stats.pending, 
      icon: Clock, 
      color: "amber",
      gradient: "from-amber-50 via-amber-10 to-white",
      borderColor: "border-amber-200",
      onClick: () => handleStatClick("pending")
    },
    { 
      label: "Reddedilen", 
      value: stats.rejected, 
      icon: XCircle, 
      color: "red",
      gradient: "from-red-50 via-red-10 to-white",
      borderColor: "border-red-200",
      onClick: () => handleStatClick("rejected")
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              Görev İstatistiklerim
            </CardTitle>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExportPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF İndir</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              const getIconBgClass = () => {
                switch(stat.color) {
                  case "primary": return "bg-primary/10";
                  case "blue": return "bg-blue-500/10";
                  case "emerald": return "bg-emerald-500/10";
                  case "amber": return "bg-amber-500/10";
                  case "red": return "bg-red-500/10";
                  default: return "bg-primary/10";
                }
              };
              const getIconColorClass = () => {
                switch(stat.color) {
                  case "primary": return "text-primary";
                  case "blue": return "text-blue-600";
                  case "emerald": return "text-emerald-600";
                  case "amber": return "text-amber-600";
                  case "red": return "text-red-600";
                  default: return "text-primary";
                }
              };
              return (
                <Card 
                  key={stat.label} 
                  className={`bg-gradient-to-br ${stat.gradient} border-2 ${stat.borderColor} hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1`}
                  onClick={stat.onClick}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`h-8 w-8 rounded-lg ${getIconBgClass()} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${getIconColorClass()}`} />
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-1.5 font-medium">
                      {stat.label}
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
          <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ListTodo className="h-5 w-5 text-primary" />
            </div>
            Görevlerim
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm font-medium">Henüz size atanan görev bulunmuyor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Görev</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Atama</TableHead>
                    <TableHead>Kabul</TableHead>
                    <TableHead>Tamamlanma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow 
                      key={`${assignment.taskId}-${assignment.id}`}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/tasks?taskId=${assignment.taskId}`)}
                    >
                      <TableCell className="font-medium">{assignment.taskTitle}</TableCell>
                      <TableCell>
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
                      <TableCell className="text-sm text-muted-foreground">{formatDate(assignment.assignedAt?.toDate?.())}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {assignment.acceptedAt ? formatDate(assignment.acceptedAt.toDate()) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {assignment.completedAt ? formatDate(assignment.completedAt.toDate()) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {rejectionEntries.length > 0 && (
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-50/50 to-white border-b">
            <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              Reddetme Notlarım
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rejectionEntries.map((entry) => (
              <div
                key={`${entry.taskId}-${entry.id}`}
                className="rounded-lg border-2 border-red-200 bg-red-50/30 hover:bg-red-50/50 p-4 space-y-2 transition-colors cursor-pointer"
                onClick={() => navigate(`/tasks?taskId=${entry.taskId}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{entry.taskTitle}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.assignedAt
                      ? formatDistanceToNow(entry.assignedAt.toDate(), {
                          addSuffix: true,
                          locale: tr,
                        })
                      : "-"}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{entry.rejectionReason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
          <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            İşlem Geçmişim
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm font-medium">Henüz işlem kaydı bulunmuyor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İşlem</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.slice(0, 20).map((log) => {
                    const actionLabels: Record<string, string> = {
                      CREATE: "Oluşturuldu",
                      UPDATE: "Güncellendi",
                      DELETE: "Silindi",
                    };

                    const tableLabels: Record<string, string> = {
                      tasks: "Görevler",
                      users: "Kullanıcılar",
                      departments: "Departmanlar",
                      orders: "Siparişler",
                      production_orders: "Üretim Siparişleri",
                      customers: "Müşteriler",
                      products: "Ürünler",
                      projects: "Projeler",
                      audit_logs: "Loglar",
                      role_permissions: "Yetkiler",
                      raw_materials: "Hammaddeler",
                      materials: "Malzemeler",
                      user_logins: "Giriş Kayıtları",
                      task_assignments: "Görev Atamaları",
                      warranty: "Garanti",
                      customerNotes: "Müşteri Notları",
                      user_roles: "Kullanıcı Rolleri",
                      production_processes: "Üretim Süreçleri",
                      profiles: "Profiller",
                      notifications: "Bildirimler",
                      shared_files: "Paylaşılan Dosyalar",
                      reports: "Raporlar",
                    };

                    const actionLabel = actionLabels[log.action] || log.action;

                    // Basit açıklama
                    let description = "";
                    if (log.tableName === "user_logins") {
                      description = "Giriş yaptı";
                    } else {
                      description = `${actionLabel} yaptı`;
                    }

                    return (
                      <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                log.action === "DELETE"
                                  ? "destructive"
                                  : log.action === "UPDATE"
                                  ? "secondary"
                                  : log.tableName === "user_logins"
                                  ? "default"
                                  : "default"
                              }
                            >
                              {log.tableName === "user_logins" ? "Giriş Yapıldı" : actionLabel}
                            </Badge>
                            <span className="text-sm font-medium">{description}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.createdAt
                            ? formatDistanceToNow(log.createdAt.toDate(), {
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

