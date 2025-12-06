import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { getTasks, Task as FirebaseTask } from "@/services/firebase/taskService";
import { getTaskAssignments } from "@/services/firebase/taskService";

export const TaskHistory = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user?.id) return;

      try {
        const allTasks = await getTasks();
        // Filter tasks assigned to current user
        const userTasks: FirebaseTask[] = [];
        for (const task of allTasks) {
          const assignments = await getTaskAssignments(task.id);
          const isAssigned = assignments.some(a => a.assignedTo === user.id);
          if (isAssigned) {
            userTasks.push(task);
          }
        }
        setTasks(userTasks);
      } catch (error: any) {
        console.error("Görevler yüklenirken hata:", error);
        toast.error("Görevler yüklenirken hata: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Geçmiş Görevlerim</CardTitle>
        <CardDescription>Size atanan görevlerin geçmişi</CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Henüz size atanmış görev bulunmuyor</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {task.due_date && (
                      <span>
                        Bitiş: {format(new Date(task.due_date), "dd MMM yyyy", { locale: tr })}
                      </span>
                    )}
                    {task.created_at && (
                      <span>
                        Oluşturulma: {format(new Date(task.created_at), "dd MMM yyyy", { locale: tr })}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={getStatusColor(task.status)}>
                  {task.status === "completed" && "Tamamlandı"}
                  {task.status === "in_progress" && "Devam Ediyor"}
                  {task.status === "pending" && "Beklemede"}
                  {task.status === "cancelled" && "İptal Edildi"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

