import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getTaskById, getTaskAssignments } from "@/services/firebase/taskService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { Timestamp } from "firebase/firestore";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface AssignedUser {
  id: string;
  full_name: string;
  email: string;
  accepted_at: string | null;
  completed_at: string | null;
}

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Awaited<ReturnType<typeof getTaskById>>>(null);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTaskDetails();
    }
  }, [id]);

  const fetchTaskDetails = async () => {
    if (!id) return;
    
    try {
      const [taskData, assignments, allUsers] = await Promise.all([
        getTaskById(id),
        getTaskAssignments(id),
        getAllUsers(),
      ]);

      if (!taskData) {
        toast.error("Görev bulunamadı");
        navigate("/tasks");
        return;
      }

      // UI formatına çevir
      const taskUI = {
        ...taskData,
        due_date: taskData.dueDate
          ? taskData.dueDate instanceof Timestamp
            ? taskData.dueDate.toDate().toISOString()
            : new Date(taskData.dueDate).toISOString()
          : null,
        created_at: taskData.createdAt instanceof Timestamp
          ? taskData.createdAt.toDate().toISOString()
          : new Date(taskData.createdAt).toISOString(),
      };

      setTask(taskUI);

      const users: AssignedUser[] = assignments.map((assignment) => {
        const userProfile = allUsers.find((u) => u.id === assignment.assignedTo);
        return {
          id: assignment.assignedTo,
          full_name: userProfile?.fullName || userProfile?.displayName || "",
          email: userProfile?.email || "",
          accepted_at: assignment.acceptedAt
            ? assignment.acceptedAt instanceof Timestamp
              ? assignment.acceptedAt.toDate().toISOString()
              : new Date(assignment.acceptedAt).toISOString()
            : null,
          completed_at: assignment.completedAt
            ? assignment.completedAt instanceof Timestamp
              ? assignment.completedAt.toDate().toISOString()
              : new Date(assignment.completedAt).toISOString()
            : null,
        };
      });

      setAssignedUsers(users);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Fetch task details error:", error);
      }
      toast.error("Görev detayları yüklenirken hata: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
      navigate("/tasks");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-6 w-6 text-success" />;
      case "in_progress":
        return <Clock className="h-6 w-6 text-warning" />;
      default:
        return <AlertCircle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Beklemede",
      in_progress: "Devam Ediyor",
      completed: "Tamamlandı",
      cancelled: "İptal",
    };
    return labels[status] || status;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!task) return null;

  return (
    <MainLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" onClick={() => navigate("/tasks")}>
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] sm:text-[24px] font-bold text-foreground">Görev Detayı</h1>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
          <div className="md:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">{getStatusIcon(task.status)}</div>
                    <CardTitle className="text-[14px] sm:text-[15px] truncate">{task.title}</CardTitle>
                  </div>
                  <Badge variant={task.priority >= 3 ? "destructive" : "secondary"} className="text-xs sm:text-sm flex-shrink-0">
                    Öncelik {task.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                <div>
                  <h3 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base">Durum</h3>
                  <Badge variant="outline" className="text-xs sm:text-sm">{getStatusLabel(task.status)}</Badge>
                </div>

                {task.description && (
                  <div>
                    <h3 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base">Açıklama</h3>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground">{task.description}</p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <h3 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Oluşturulma Tarihi
                    </h3>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                      {format(task.createdAt.toDate(), "dd MMMM yyyy HH:mm")}
                    </p>
                  </div>
                  {task.dueDate && (
                    <div>
                      <h3 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Bitiş Tarihi
                      </h3>
                      <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                        {format(task.dueDate.toDate(), "dd MMMM yyyy HH:mm")}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-[14px] sm:text-[15px]">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  Görevdeki Kişiler ({assignedUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="space-y-2 sm:space-y-3">
                  {assignedUsers.map((assignedUser) => (
                    <div
                      key={assignedUser.id}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-border"
                    >
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarFallback className="text-xs sm:text-sm">
                          {getInitials(assignedUser.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-xs sm:text-sm md:text-base">{assignedUser.full_name}</div>
                        <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">
                          {assignedUser.email}
                        </div>
                        <div className="mt-1">
                          {assignedUser.completed_at && (
                            <Badge variant="default" className="bg-success text-[10px] sm:text-xs">
                              Tamamlandı
                            </Badge>
                          )}
                          {assignedUser.accepted_at && !assignedUser.completed_at && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">
                              Kabul Edildi
                            </Badge>
                          )}
                          {!assignedUser.accepted_at && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs">
                              Bekliyor
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {assignedUsers.length === 0 && (
                    <p className="text-center py-4 text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                      Henüz kimse atanmadı
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TaskDetail;
