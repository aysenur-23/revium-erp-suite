import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Users, CheckSquare, Clock, TrendingUp, User, Mail, Phone } from "lucide-react";
import { getDepartmentById } from "@/services/firebase/departmentService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { getTasks, Task } from "@/services/firebase/taskService";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Department, DepartmentWithStats } from "@/services/firebase/departmentService";

interface DepartmentDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
}

export const DepartmentDetailModal = ({ open, onOpenChange, departmentId }: DepartmentDetailModalProps) => {
  const [department, setDepartment] = useState<DepartmentWithStats | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [manager, setManager] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (open && departmentId) {
      fetchDepartmentDetails();
    }
  }, [open, departmentId]);

  const fetchDepartmentDetails = async () => {
    setLoading(true);
    try {
      const [dept, allUsers, allTasks] = await Promise.all([
        getDepartmentById(departmentId),
        getAllUsers(),
        getTasks(),
      ]);

      setDepartment(dept);

      // Manager bilgisini al (sadece silinmemiş kullanıcılar)
      if (dept.managerId) {
        const managerUser = allUsers.find(u => u.id === dept.managerId && !(u as any).deleted);
        setManager(managerUser || null);
      } else {
        setManager(null);
      }

      // Departmana ait üyeleri bul (approvedTeams, pendingTeams veya departmentId ile)
      const deptMembers = allUsers.filter(u => {
        // Direkt departman ID'si eşleşiyorsa
        if (u.departmentId === departmentId) return true;
        // Onaylanmış ekiplerde varsa
        if (u.approvedTeams && u.approvedTeams.includes(departmentId)) return true;
        // Bekleyen ekiplerde varsa
        if (u.pendingTeams && u.pendingTeams.includes(departmentId)) return true;
        return false;
      });
      setMembers(deptMembers);

      // Departmana ait görevleri bul - birden fazla yöntemle
      const teamMemberIds = new Set(deptMembers.map(u => u.id));
      const deptTasks = allTasks.filter(t => {
        // 1. productionProcessId ile direkt bağlantı
        if (t.productionProcessId === departmentId) return true;
        
        // 2. Görev ekip üyelerinden birine atanmışsa
        if (t.assignedUsers && Array.isArray(t.assignedUsers)) {
          const hasAssignedMember = t.assignedUsers.some((u: any) => {
            if (typeof u === 'string') return teamMemberIds.has(u);
            if (u && typeof u === 'object') {
              const userId = u.id || u.assignedTo || u.userId;
              return userId && teamMemberIds.has(userId);
            }
            return false;
          });
          if (hasAssignedMember) return true;
        }
        
        // 3. Görev ekip üyelerinden biri tarafından oluşturulmuşsa
        if (t.createdBy && teamMemberIds.has(t.createdBy)) return true;
        
        return false;
      });
      setTasks(deptTasks);
    } catch (error) {
      console.error("Error fetching department details:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalMembers: members.length,
    activeTasks: tasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length,
    completedTasks: tasks.filter(t => t.status === "completed").length,
    pendingTasks: tasks.filter(t => t.status === "pending").length,
    inProgressTasks: tasks.filter(t => t.status === "in_progress").length,
    completionRate: tasks.length > 0 
      ? (tasks.filter(t => t.status === "completed").length / tasks.length) * 100 
      : 0,
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Tamamlandı";
      case "in_progress":
        return "Devam Ediyor";
      case "pending":
        return "Beklemede";
      case "cancelled":
        return "İptal Edildi";
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[100vw] sm:!max-w-[95vw] !w-[100vw] sm:!w-[95vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[2.5vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
        <div className="flex flex-col h-full min-h-0">
          <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground truncate">
                  {loading ? "Yükleniyor..." : department?.name || "Departman Detayları"}
                </DialogTitle>
                {department?.description ? (
                  <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                    {department.description}
                  </DialogDescription>
                ) : (
                  <DialogDescription className="sr-only">
                    Departman detayları ve bilgileri
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
            <div className="max-w-full mx-auto h-full overflow-y-auto">
              {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Genel Bilgiler */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Genel Bilgiler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Departman Adı</span>
                    <p className="text-base font-semibold mt-1">{department?.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Yönetici</span>
                    <p className="text-base font-semibold mt-1">
                      {manager ? (manager.fullName || manager.email) : "Atanmamış"}
                    </p>
                    {manager?.email && (
                      <p className="text-xs text-muted-foreground mt-1">{manager.email}</p>
                    )}
                  </div>
                  {department?.description && (
                    <div className="md:col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Açıklama</span>
                      <p className="text-sm mt-1">{department.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* İstatistikler */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Toplam Üye</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalMembers}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700">Aktif Görevler</p>
                      <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.activeTasks}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Tamamlanan</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">{stats.completedTasks}</p>
                    </div>
                    <CheckSquare className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Tamamlanma Oranı</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">{stats.completionRate.toFixed(0)}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tamamlanma Oranı Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Görev Tamamlanma Durumu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Genel İlerleme</span>
                    <span className="text-muted-foreground">{stats.completionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.completionRate} className="h-3" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Bekleyen:</span>
                    <span className="ml-2 font-semibold">{stats.pendingTasks}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Devam Eden:</span>
                    <span className="ml-2 font-semibold">{stats.inProgressTasks}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tamamlanan:</span>
                    <span className="ml-2 font-semibold">{stats.completedTasks}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Toplam:</span>
                    <span className="ml-2 font-semibold">{tasks.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Üyeler */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Ekip Üyeleri ({stats.totalMembers})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {members.length > 0 ? (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold">
                            {(member.fullName || member.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{member.fullName || member.email}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              {member.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {member.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {member.approvedTeams?.includes(departmentId) ? "Onaylı" : "Beklemede"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Bu departmanda henüz üye bulunmuyor
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Görevler */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Görevler ({tasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Başlık</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead>Öncelik</TableHead>
                          <TableHead>Oluşturulma</TableHead>
                          <TableHead>Bitiş Tarihi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.slice(0, 10).map((task) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeColor(task.status)}>
                                {getStatusLabel(task.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{task.priority || "Normal"}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {task.createdAt ? format(task.createdAt.toDate(), "dd MMM yyyy", { locale: tr }) : "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {task.dueDate ? format(task.dueDate.toDate(), "dd MMM yyyy", { locale: tr }) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {tasks.length > 10 && (
                      <p className="text-center text-sm text-muted-foreground mt-4">
                        +{tasks.length - 10} görev daha...
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Bu departmanda henüz görev bulunmuyor
                  </p>
                )}
              </CardContent>
            </Card>
              </div>
            )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

