import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Check, X, Users, Calendar, Plus, User, CircleDot, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTasks,
  requestTaskFromPool,
  approvePoolRequest,
  rejectPoolRequest,
  Task,
  updateTaskStatus,
  requestTaskApproval,
  getTaskAssignments,
} from "@/services/firebase/taskService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { getProjects, Project } from "@/services/firebase/projectService";
import { canViewPrivateProject } from "@/utils/permissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { TaskInlineForm } from "@/components/Tasks/TaskInlineForm";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskBoard } from "@/components/Tasks/TaskBoard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timestamp } from "firebase/firestore";

// Status workflow tanımı
type StatusItem = {
  value: string;
  label: string;
  icon: typeof CircleDot;
  color: string;
};

const taskStatusWorkflow: StatusItem[] = [
  { value: "pending", label: "Yapılacak", icon: CircleDot, color: "text-amber-500" },
  { value: "in_progress", label: "Devam Ediyor", icon: Clock, color: "text-blue-500" },
  { value: "completed", label: "Tamamlandı", icon: CheckCircle2, color: "text-emerald-600" },
  { value: "approved", label: "Onaylandı", icon: CheckCircle2, color: "text-green-600" },
];

// Status helper fonksiyonları
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Yapılacak",
    in_progress: "Devam Ediyor",
    completed: "Tamamlandı",
    approved: "Onaylandı",
  };
  return labels[status] || status;
};

const getCurrentStatusIndex = (status: string) => {
  const index = taskStatusWorkflow.findIndex((statusItem) => statusItem.value === status);
  return index === -1 ? 0 : index;
};

const getNextStatus = (currentStatus: string) => {
  const currentIndex = getCurrentStatusIndex(currentStatus);
  if (currentIndex === -1 || currentIndex >= taskStatusWorkflow.length - 1) {
    return null;
  }
  return taskStatusWorkflow[currentIndex + 1];
};

const TaskPool = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);
  
  // Permission state'lerini Firestore'dan kontrol et
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        setCanUpdate(false);
        return;
      }
      try {
        const { isMainAdmin, canUpdateResource } = await import("@/utils/permissions");
        const userProfile: UserProfile = {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          fullName: user.fullName,
          displayName: user.fullName,
          phone: null,
          dateOfBirth: null,
          role: user.roles || [],
          createdAt: null,
          updatedAt: null,
        };
        const [isMainAdminUser, hasUpdatePermission] = await Promise.all([
          isMainAdmin(userProfile),
          canUpdateResource(userProfile, "tasks"),
        ]);
        setIsSuperAdmin(isMainAdminUser);
        setCanUpdate(hasUpdatePermission);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Error checking permissions:", error);
        }
        setIsSuperAdmin(false);
        setCanUpdate(false);
      }
    };
    checkPermissions();
  }, [user]);
  const [loading, setLoading] = useState(true);
  const [poolTasks, setPoolTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "dueDate" | "createdAt">("createdAt");
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [newTaskDefaultStatus, setNewTaskDefaultStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  
  // Yeni state'ler
  const [viewTaskDialogOpen, setViewTaskDialogOpen] = useState(false);
  const [viewTaskId, setViewTaskId] = useState<string | null>(null);
  const [confirmApproveState, setConfirmApproveState] = useState<{
    isOpen: boolean;
    taskId: string;
    userId: string;
    userName: string;
    keepInPool: boolean;
  }>({
    isOpen: false,
    taskId: "",
    userId: "",
    userName: "",
    keepInPool: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterAndSortTasks();
  }, [poolTasks, searchTerm, sortBy]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allTasks, allProjects, allUsersData] = await Promise.all([
        getTasks(),
        getProjects(),
        getAllUsers(),
      ]);

      // Görev havuzunda sadece isInPool=true olan görevler gösterilir
      // onlyInMyTasks görevleri görev havuzunda görünmez
      const poolTasksData = allTasks.filter((task) => 
        task.isInPool === true && !task.onlyInMyTasks
      );
      setPoolTasks(poolTasksData);

      const projectsMap: Record<string, Project> = {};
      allProjects.forEach((p) => {
        if (p.id === "general" || p.name?.toLowerCase() === "genel görevler" || p.name?.toLowerCase() === "genel") {
          return;
        }
        projectsMap[p.id] = p;
      });
      setProjects(projectsMap);
      // Gizli projeleri filtrele: Sadece yönetici, oluşturan ve projede görevi olanlar görebilir
      // Ekip lideri sadece kendi oluşturduğu gizli projeleri görebilir
      const visibleProjects = await Promise.all(
        allProjects.map(async (project) => {
          if (!project.isPrivate) return project; // Gizli olmayan projeler herkes görebilir
          if (isSuperAdmin) return project; // Super Admin tüm projeleri görebilir
          if (user?.id && project.createdBy === user.id) return project; // Oluşturan görebilir
          
          // Ekip lideri için projede görevi olan kullanıcılar kontrolü yapılmaz (sadece kendi oluşturduğu gizli projeleri görebilir)
          // Team Leader kontrolü - Firestore'dan (canUpdate projects)
          if (canUpdate && !isSuperAdmin) {
            return null; // Ekip lideri sadece kendi oluşturduğu gizli projeleri görebilir (yukarıda kontrol edildi)
          }
          
          // Projede görevi olan kullanıcılar görebilir (ekip lideri hariç)
          if (user?.id) {
            try {
              const { getTasks, getTaskAssignments } = await import("@/services/firebase/taskService");
              const projectTasks = await getTasks({ projectId: project.id });
              
              // Kullanıcının bu projede görevi var mı kontrol et
              for (const task of projectTasks) {
                // Görevi oluşturan kişi
                if (task.createdBy === user.id) return project;
                
                // Atanan kullanıcılar
                if (task.assignedUsers && task.assignedUsers.includes(user.id)) return project;
                
                // Assignments kontrolü
                const assignments = await getTaskAssignments(task.id);
                const isAssigned = assignments.some(
                  (a) => a.assignedTo === user.id && (a.status === "accepted" || a.status === "pending")
                );
                if (isAssigned) return project;
              }
            } catch (error: unknown) {
              // Hata durumunda gösterilmesin
              if (import.meta.env.DEV) {
                if (import.meta.env.DEV) {
                  console.error("Error checking project tasks:", error);
                }
              }
            }
          }
          
          return null; // Diğer kullanıcılar gizli projeleri göremez
        })
      );

      // Otomatik oluşturulan "Gizli Görevler" projesini listeden kaldır
      // Sadece kullanıcının manuel oluşturduğu gizli projeler gösterilmeli
      const finalProjects = visibleProjects.filter(
        (p): p is typeof allProjects[0] => {
          if (p === null) return false;
          // Status ve genel proje filtrelemesi
          if (p.status !== "active" || p.id === "general" || 
              p.name?.toLowerCase() === "genel görevler" || 
              p.name?.toLowerCase() === "genel") {
            return false;
          }
          // Otomatik oluşturulan "Gizli Görevler" projesini filtrele
          if (p.name === "Gizli Görevler" && p.isPrivate === true && 
              p.description === "Projesi olmayan gizli görevler için otomatik oluşturulan proje") {
            return false;
          }
          return true;
        }
      );
      
      setProjectList(finalProjects);

      const usersMap: Record<string, UserProfile> = {};
      allUsersData.forEach((u) => {
        usersMap[u.id] = u;
      });
      setUsers(usersMap);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Görev havuzu yüklenirken hata oluştu";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTask = async (taskId: string) => {
    if (!user?.id) {
      toast.error("Kullanıcı bilgisi bulunamadı");
      return;
    }

    try {
      await requestTaskFromPool(taskId, user.id);
      toast.success("Görev talebi gönderildi");
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Talep hatası oluştu";
      toast.error(errorMessage);
    }
  };

  // Eski fonksiyon yerine yeni initiateApprove kullanıyoruz
  /*
  const handleApproveRequest = async (taskId: string, userId: string) => {
    // ...
  };
  */

  const initiateApprove = (taskId: string, userId: string, userName: string) => {
    setConfirmApproveState({
      isOpen: true,
      taskId,
      userId,
      userName,
      keepInPool: false
    });
  };

  const handleConfirmApprove = async () => {
    const { taskId, userId, keepInPool } = confirmApproveState;
    if (!user?.id) return;

    try {
      await approvePoolRequest(taskId, userId, user.id, keepInPool);
      toast.success("Görev talebi onaylandı");
      
      // State'i manuel güncelle
      if (selectedTask) {
        const updatedPoolRequests = (selectedTask.poolRequests || []).filter(id => id !== userId);
        const updatedAssignedUsers = [...(selectedTask.assignedUsers || []), userId];
        
        const updatedTask = {
          ...selectedTask,
          poolRequests: keepInPool ? updatedPoolRequests : [], 
          isInPool: keepInPool,
          assignedUsers: updatedAssignedUsers
        };
        
        setSelectedTask(updatedTask);
      }

      setConfirmApproveState(prev => ({ ...prev, isOpen: false }));
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Onaylama hatası oluştu";
      toast.error(errorMessage);
    }
  };

  const handleRejectRequest = async (taskId: string, userId: string) => {
    try {
      await rejectPoolRequest(taskId, userId);
      toast.success("Görev talebi reddedildi");
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Reddetme hatası oluştu";
      toast.error(errorMessage);
    }
  };

  const openApproveDialog = (task: Task) => {
    setSelectedTask(task);
    setApproveDialogOpen(true);
  };

  const openViewTask = (taskId: string) => {
    setViewTaskId(taskId);
    setViewTaskDialogOpen(true);
  };

  const handleBoardTaskClick = (taskId: string, initialStatus?: string) => {
    if (taskId === "new") {
      if (
        initialStatus &&
        ["pending", "in_progress", "completed"].includes(initialStatus)
      ) {
        setNewTaskDefaultStatus(initialStatus as "pending" | "in_progress" | "completed");
      } else {
        setNewTaskDefaultStatus("pending");
      }
      setAddTaskDialogOpen(true);
      return;
    }
    openViewTask(taskId);
  };

  const filterAndSortTasks = () => {
    let filtered = [...poolTasks];

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLocaleLowerCase('tr-TR');
      filtered = filtered.filter(
        (task) =>
          (task.title?.toLocaleLowerCase('tr-TR') || "").includes(searchLower) ||
          (task.description?.toLocaleLowerCase('tr-TR') || "").includes(searchLower)
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      } else if (sortBy === "dueDate") {
        const aDate = a.dueDate?.toMillis() || 0;
        const bDate = b.dueDate?.toMillis() || 0;
        return aDate - bDate;
      } else {
        const aDate = a.createdAt?.toMillis() || 0;
        const bDate = b.createdAt?.toMillis() || 0;
        return bDate - aDate;
      }
    });

    setFilteredTasks(filtered);
  };

  const canManagePool = isSuperAdmin || canUpdate;

  const boardTasks = useMemo(() => {
    return filteredTasks.map((task) => {
      const toISO = (value: Timestamp | Date | string | null | undefined) => {
        if (!value) return null;
        if (value instanceof Timestamp) return value.toDate().toISOString();
        if (typeof value?.toDate === "function") return value.toDate().toISOString();
        try {
          return new Date(value).toISOString();
        } catch {
          return null;
        }
      };

      let labels: Array<{ name: string; color: string }> = [];
      if (Array.isArray(task.labels)) {
        labels = task.labels.map((label: string | { name: string; color: string }) =>
          typeof label === "string" ? { name: label, color: "#61BD4F" } : label
        );
      } else if (typeof task.labels === "string") {
        try {
          const parsed = JSON.parse(task.labels);
          if (Array.isArray(parsed)) {
            labels = parsed.map((label: string | { name: string; color: string }) =>
              typeof label === "string" ? { name: label, color: "#61BD4F" } : label
            );
          }
        } catch {
          labels = [];
        }
      }

      const assignments = (task.assignedUsers || []).map((userId: string) => {
        const assignedUser = users[userId];
        return {
          assigned_to: userId,
          assigned_to_name: assignedUser?.fullName || assignedUser?.email || "Kullanıcı",
          assigned_to_email: assignedUser?.email || "",
        };
      });

      return {
        id: task.id,
        title: task.title,
        description: task.description || "",
        status: (task.status as "pending" | "in_progress" | "completed") || "pending",
        priority: task.priority || 0,
        due_date: toISO(task.dueDate),
        created_at: toISO(task.createdAt) || new Date().toISOString(),
        createdBy: task.createdBy,
        labels,
        assignments,
      };
    });
  }, [filteredTasks, users]);

  const handleBoardStatusChange = async (taskId: string, status: string) => {
    if (!user) return;

    try {
      const normalizedStatus = status as "pending" | "in_progress" | "completed";
      const targetTask = poolTasks.find((task) => task.id === taskId);
      
      if (!targetTask) {
        toast.error("Görev bulunamadı");
        return;
      }

      // Yetki kontrolü: Sadece atanan kullanıcılar ve adminler durum değiştirebilir
      if (!isSuperAdmin && !canUpdate) {
        // Görevin atanan kullanıcılarını kontrol et
        const taskAssignments = await getTaskAssignments(taskId);
        const assignedUserIds = taskAssignments.map(a => a.assignedTo);
        const isAssigned = assignedUserIds.includes(user.id);
        
        if (!isAssigned) {
          toast.error("Bu görevin durumunu değiştirme yetkiniz yok. Sadece size atanan görevlerin durumunu değiştirebilirsiniz.");
          return;
        }
      }

      const isCreator = targetTask?.createdBy === user.id;
      const canDirectComplete = isSuperAdmin || canUpdate || isCreator;

      if (normalizedStatus === "completed" && !canDirectComplete) {
        await requestTaskApproval(taskId, user.id);
        toast.success("Görev tamamlandı olarak işaretlendi ve onay için gönderildi.");
        fetchData();
        return;
      }

      await updateTaskStatus(taskId, normalizedStatus);
      toast.success("Görev durumu güncellendi");
      fetchData();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        if (import.meta.env.DEV) {
          console.error("Task pool status change error:", error);
        }
      }
      const errorMessage = error instanceof Error ? error.message : "Durum güncellenemedi";
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Görev Havuzu</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Henüz atanmamış görevleri görüntüleyin ve talep edin
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "list" | "board")}>
              <TabsList>
                <TabsTrigger value="list">Liste</TabsTrigger>
                <TabsTrigger value="board">Pano</TabsTrigger>
              </TabsList>
            </Tabs>
            {canManagePool && (
              <Button
                onClick={() => {
                  setNewTaskDefaultStatus("pending");
                  setAddTaskDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Havuza Görev Ekle
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <CardTitle>Açık Görevler</CardTitle>
                </div>
                <Badge variant="secondary">{filteredTasks.length} görev</Badge>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <SearchInput
                  placeholder="Görev ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  containerClassName="flex-1 w-full"
                />
                <Select value={sortBy} onValueChange={(value: "title" | "dueDate" | "createdAt") => setSortBy(value)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sırala" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Yeni Önce</SelectItem>
                    <SelectItem value="title">Başlığa Göre</SelectItem>
                    <SelectItem value="dueDate">Bitiş Tarihine Göre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "list" ? (
              filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                  {searchTerm ? "Arama sonucu bulunamadı" : "Görev havuzunda şu an açık görev yok."}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map((task) => {
                  const poolRequests = task.poolRequests || [];
                  const hasUserRequest = user?.id && poolRequests.includes(user.id);
                  const isTaskCreator = task.createdBy === user?.id;
                  const dueDate = task.dueDate ? task.dueDate.toDate() : null;
                  const project = task.projectId ? projects[task.projectId] : null;

                    return (
                      <div
                        key={task.id}
                        className="flex flex-col gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer"
                        onClick={() => openViewTask(task.id)}
                      >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-lg">{task.title}</h3>
                            {project && (
                              <Badge variant="secondary" className="text-xs font-normal">
                                {project.name}
                              </Badge>
                            )}
                            {task.priority === 5 && (
                              <Badge variant="destructive" className="text-xs">Kritik</Badge>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {dueDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{dueDate.toLocaleDateString("tr-TR")}</span>
                              </div>
                            )}
                            {task.createdBy && users[task.createdBy] && (
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>Oluşturan: {users[task.createdBy].fullName || users[task.createdBy].email || "Bilinmeyen"}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{poolRequests.length} talep</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-start" onClick={(e) => e.stopPropagation()}>
                          {hasUserRequest ? (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              Talep Gönderildi
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleRequestTask(task.id)}
                              disabled={poolRequests.includes(user?.id || "")}
                            >
                              Görevi Talep Et
                            </Button>
                          )}
                          
                          {(canManagePool || isTaskCreator) && poolRequests.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openApproveDialog(task)}
                            >
                              Talepleri Yönet
                            </Button>
                          )}
                        </div>
                      </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="-mx-4 sm:mx-0">
                <TaskBoard
                  tasks={boardTasks}
                  onTaskClick={handleBoardTaskClick}
                  onStatusChange={handleBoardStatusChange}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Görev Taleplerini Yönet</AlertDialogTitle>
              <AlertDialogDescription>
                "{selectedTask?.title}" görevi için gelen talepleri onaylayın veya reddedin.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedTask?.assignedUsers && selectedTask.assignedUsers.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Atanan Kullanıcılar</h4>
                  <div className="space-y-2">
                    {selectedTask.assignedUsers.map((userId) => {
                      const assignedUser = users[userId];
                      return (
                        <div key={`assigned-${userId}`} className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                              {assignedUser?.fullName?.charAt(0) || assignedUser?.email?.charAt(0) || "?"}
                            </div>
                            <div>
                              <div className="font-medium text-green-900">{assignedUser?.fullName || "Bilinmeyen Kullanıcı"}</div>
                              <div className="text-xs text-green-700">{assignedUser?.email}</div>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                            Onaylandı
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Bekleyen Talepler</h4>
                <div className="space-y-2">
                  {selectedTask?.poolRequests?.map((userId) => {
                    const requestingUser = users[userId];
                    return (
                      <div key={`request-${userId}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            {requestingUser?.fullName?.charAt(0) || requestingUser?.email?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="font-medium">{requestingUser?.fullName || "Bilinmeyen Kullanıcı"}</div>
                            <div className="text-xs text-muted-foreground">{requestingUser?.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRejectRequest(selectedTask.id, userId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-600 hover:bg-green-50"
                            onClick={() => initiateApprove(selectedTask.id, userId, requestingUser?.fullName || "Kullanıcı")}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {(!selectedTask?.poolRequests || selectedTask.poolRequests.length === 0) && (
                    <div className="text-center text-muted-foreground py-4 bg-muted/30 rounded-lg border border-dashed">Henüz bekleyen talep yok.</div>
                  )}
                </div>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setApproveDialogOpen(false)}>Kapat</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={confirmApproveState.isOpen} onOpenChange={(open) => setConfirmApproveState(prev => ({ ...prev, isOpen: open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Onaylama İşlemi</DialogTitle>
              <DialogDescription>
                {confirmApproveState.userName} kullanıcısının talebini onaylamak üzeresiniz.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="keepInPool" 
                  checked={confirmApproveState.keepInPool}
                  onCheckedChange={(checked) => setConfirmApproveState(prev => ({ ...prev, keepInPool: checked as boolean }))}
                />
                <label
                  htmlFor="keepInPool"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Görevi havuzda tut (Diğer kişiler de talep edebilir)
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Eğer işaretlemezseniz, görev havuzdan kaldırılacak ve sadece atanan kullanıcıya görünecektir.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmApproveState(prev => ({ ...prev, isOpen: false }))}>İptal</Button>
              <Button onClick={handleConfirmApprove}>Onayla</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
          <DialogContent className="max-w-4xl w-[95vw] overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Havuza Görev Ekle</DialogTitle>
              <DialogDescription>
                Görev havuzuna yeni bir görev ekleyin. Bu göreve uygun ekip üyeleri başvurabilir.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mb-4">
              <Label htmlFor="project-select">Proje Seçimi *</Label>
              <Select
                value={selectedProjectId || ""}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger id="project-select" className="mt-1">
                  <SelectValue placeholder="Bir proje seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {projectList.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProjectId ? (
            <TaskInlineForm
                mode="create"
                projectId={selectedProjectId}
              defaultStatus={newTaskDefaultStatus}
                onCancel={() => {
                  setAddTaskDialogOpen(false);
                  setSelectedProjectId(null);
                }}
                onSuccess={() => {
                  setAddTaskDialogOpen(false);
                  setSelectedProjectId(null);
                  fetchData();
                }}
                className="border-0 shadow-none p-0"
                isInPool={true}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                Lütfen devam etmek için bir proje seçin.
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={viewTaskDialogOpen} onOpenChange={setViewTaskDialogOpen}>
          <DialogContent className="max-w-4xl w-[95vw] overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Görev Detayı</DialogTitle>
              <DialogDescription>
                Görevi inceleyin ve talep oluşturun.
              </DialogDescription>
            </DialogHeader>
            {viewTaskId && (
              <TaskInlineForm
                mode="edit"
                projectId={null}
                taskId={viewTaskId}
                onCancel={() => setViewTaskDialogOpen(false)}
                onSuccess={() => {
                    fetchData();
                    setViewTaskDialogOpen(false);
                }}
                className="border-0 shadow-none p-0"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default TaskPool;
