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
import { Download } from "lucide-react";
import { generateUserStatsPDF } from "@/services/pdfGenerator";

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Görev İstatistiklerim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Toplam Görev", value: stats.total },
              { label: "Aktif Görev", value: stats.active },
              { label: "Reddedilen Görev", value: stats.rejected },
              { label: "Tamamlanan Görev", value: stats.completed },
              { label: "Bekleyen Görev", value: stats.pending },
            ].map((item) => (
              <Card key={item.label} className="border-dashed">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Görevlerim</span>
            <Button size="sm" variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF İndir
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              Henüz size atanan görev bulunmuyor.
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
                    <TableRow key={`${assignment.taskId}-${assignment.id}`}>
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
                      <TableCell>{formatDate(assignment.assignedAt?.toDate?.())}</TableCell>
                      <TableCell>
                        {assignment.acceptedAt ? formatDate(assignment.acceptedAt.toDate()) : "-"}
                      </TableCell>
                      <TableCell>
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
        <Card>
          <CardHeader>
            <CardTitle>Reddetme Notlarım</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rejectionEntries.map((entry) => (
              <div
                key={`${entry.taskId}-${entry.id}`}
                className="rounded-lg border border-border p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{entry.taskTitle}</span>
                  <span>
                    {entry.assignedAt
                      ? formatDistanceToNow(entry.assignedAt.toDate(), {
                          addSuffix: true,
                          locale: tr,
                        })
                      : "-"}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-line">{entry.rejectionReason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>İşlem Geçmişim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              Henüz işlem kaydı bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İşlem</TableHead>
                    <TableHead>Bölüm</TableHead>
                    <TableHead>Açıklama</TableHead>
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
                    };

                    const actionLabel = actionLabels[log.action] || log.action;
                    const tableLabel = tableLabels[log.tableName] || log.tableName;

                    // Özel işlem: user_logins için açıklama
                    let description = log.recordId ? `Kayıt ID: ${log.recordId.slice(0, 8)}...` : "Bilinmiyor";
                    if (log.tableName === "user_logins") {
                      // Metadata'dan giriş bilgilerini al
                      const metadata = log.metadata as any;
                      if (metadata?.method) {
                        const methodLabels: Record<string, string> = {
                          EMAIL: "E-posta ile giriş",
                          GOOGLE: "Google ile giriş",
                        };
                        description = methodLabels[metadata.method] || `Giriş (${metadata.method})`;
                      } else {
                        description = "Sistem girişi";
                      }
                    }

                    return (
                      <TableRow key={log.id}>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="font-medium">{tableLabel}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {description}
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

