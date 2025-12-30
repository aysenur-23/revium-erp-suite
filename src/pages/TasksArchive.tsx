import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  getTasks,
  Task as FirebaseTask,
  unarchiveTask,
  deleteTask,
} from "@/services/firebase/taskService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { Archive, CheckSquare, FolderKanban, Search, X, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TaskDetailModal } from "@/components/Tasks/TaskDetailModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  is_archived?: boolean;
  assignedUsers?: { id: string; full_name: string }[];
}

const STORAGE_KEY = "taskBoardState_v1";

const TasksArchive = () => {
  const { user } = useAuth();
  const [canAccess, setCanAccess] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [archivedLists, setArchivedLists] = useState<Array<{ id: string; name: string; isArchived?: boolean; [key: string]: unknown }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"tasks" | "lists">("tasks");
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Erişim kontrolü - Firestore'dan
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setCanAccess(false);
        setLoadingAccess(false);
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
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          role: user.roles,
          createdAt: null,
          updatedAt: null,
        };
        const [isMainAdminUser, canUpdateTasks] = await Promise.all([
          isMainAdmin(userProfile),
          canUpdateResource(userProfile, "tasks"),
        ]);
        setCanAccess(isMainAdminUser || canUpdateTasks);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Error checking archive access:", error);
        }
        setCanAccess(false);
      } finally {
        setLoadingAccess(false);
      }
    };
    checkAccess();
  }, [user]);

  // Sadece yönetici ve ekip lideri erişebilir
  if (loadingAccess) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Arşivlenmiş görevleri getir
      const allTasks = await getTasks();
      const archived = allTasks.filter((task: FirebaseTask) => task.isArchived === true);
      
      // Kullanıcı bilgilerini getir
      const allUsers = await getAllUsers();
      const userMap: Record<string, string> = {};
      allUsers.forEach((u) => {
        userMap[u.id] = u.fullName || u.displayName || u.email;
      });
      setUsersMap(userMap);

      // Görevleri formatla
      const formattedTasks: Task[] = archived.map((task: FirebaseTask) => ({
        id: task.id,
        title: task.title,
        description: task.description || null,
        status: task.status,
        priority: task.priority || 3,
        due_date: task.dueDate?.toDate?.()?.toISOString() || null,
        created_at: task.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updated_at: task.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        project_id: task.projectId || null,
        is_archived: task.isArchived,
        assignedUsers: task.assignedUsers?.map((userId: string) => ({
          id: userId,
          full_name: userMap[userId] || "Bilinmeyen",
        })) || [],
      }));

      setArchivedTasks(formattedTasks);

      // Arşivlenmiş listeleri localStorage'dan getir
      try {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
          const boardState = JSON.parse(savedState);
          const archivedColumns = boardState.columns?.filter((col: { id: string; name: string; isArchived?: boolean; [key: string]: unknown }) => col.isArchived === true) || [];
          setArchivedLists(archivedColumns);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error loading archived lists:", error);
        }
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Fetch archive data error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Arşiv verileri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchiveTask = async (taskId: string) => {
    if (!user?.id) return;
    try {
      await unarchiveTask(taskId, user.id);
      toast.success("Görev arşivden çıkarıldı");
      await fetchData();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Unarchive task error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Görev arşivden çıkarılamadı");
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete || !user?.id) return;
    try {
      await deleteTask(taskToDelete, user.id);
      toast.success("Görev silindi");
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
      await fetchData();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Delete task error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Görev silinemedi");
    }
  };

  const openTaskDetail = (taskId: string, initialStatus?: string) => {
    setSelectedTaskId(taskId);
  };

  const closeTaskDetail = () => {
    setSelectedTaskId(null);
  };

  const handleUnarchiveList = (listId: string) => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const boardState = JSON.parse(savedState);
        const updatedColumns = boardState.columns.map((col: { id: string; name: string; isArchived?: boolean; [key: string]: unknown }) =>
          col.id === listId ? { ...col, isArchived: false } : col
        );
        boardState.columns = updatedColumns;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(boardState));
        toast.success("Liste arşivden çıkarıldı");
        fetchData();
      }
    } catch (error) {
      console.error("Error unarchiving list:", error);
      toast.error("Liste arşivden çıkarılamadı");
    }
  };

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return archivedTasks;
    const term = searchTerm.toLowerCase();
    return archivedTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term) ||
        task.assignedUsers?.some((u) => u.full_name.toLowerCase().includes(term))
    );
  }, [archivedTasks, searchTerm]);

  const filteredLists = useMemo(() => {
    if (!searchTerm) return archivedLists;
    const term = searchTerm.toLowerCase();
    return archivedLists.filter((list) =>
      list.title?.toLowerCase().includes(term)
    );
  }, [archivedLists, searchTerm]);

  if (loading) {
    return (
      <MainLayout>
        <LoadingState message="Arşiv yükleniyor..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-3 sm:space-y-4">
        <div>
          <h1 className="text-[16px] sm:text-[18px] font-bold text-foreground flex items-center gap-1.5 sm:gap-2">
            <Archive className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
            Arşiv
          </h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
            Arşivlenmiş görevler ve listeler
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "tasks" | "lists")} className="w-full">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 md:gap-4">
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <SearchInput
                    placeholder="Arşivde ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="tasks" className="gap-1 sm:gap-2 flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 text-[14px] sm:text-[15px]">
                    <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Görevler</span>
                    <span className="ml-1">({filteredTasks.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="lists" className="gap-1 sm:gap-2 flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 text-[14px] sm:text-[15px]">
                    <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Listeler</span>
                    <span className="ml-1">({filteredLists.length})</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-5">
              <TabsContent value="tasks" className="mt-0">
              {filteredTasks.length === 0 ? (
                <EmptyState
                  icon={Archive}
                  title={searchTerm ? "Arama sonucu bulunamadı" : "Henüz arşivlenmiş görev yok"}
                  description={searchTerm ? "Farklı bir arama terimi deneyin" : "Arşivlenmiş görevler burada görünecek"}
                  variant="card"
                />
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 sm:p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openTaskDetail(task.id, task.status)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 mb-2">
                            <h3 className="font-semibold text-sm sm:text-base flex-1 break-words">{task.title}</h3>
                            <Badge variant="outline" className="flex-shrink-0 self-start sm:self-auto">
                              {task.status === "pending" && "Beklemede"}
                              {task.status === "in_progress" && "Devam Ediyor"}
                              {task.status === "completed" && "Tamamlandı"}
                              {task.status === "cancelled" && "İptal"}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2 break-words">
                              {task.description}
                            </p>
                          )}
                          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                            {task.due_date && (
                              <span className="whitespace-nowrap">
                                {format(new Date(task.due_date), "d MMMM yyyy", { locale: tr })}
                              </span>
                            )}
                            {task.assignedUsers && task.assignedUsers.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="hidden sm:inline">Atananlar:</span>
                                <div className="flex -space-x-2">
                                  {task.assignedUsers.slice(0, 3).map((user) => (
                                    <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                                      <AvatarFallback className="text-xs">
                                        {user.full_name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {task.assignedUsers.length > 3 && (
                                    <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
                                      +{task.assignedUsers.length - 3}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-70 hover:opacity-100"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnarchiveTask(task.id);
                                }}
                                className="cursor-pointer"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Arşivden Çıkar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTaskToDelete(task.id);
                                  setDeleteDialogOpen(true);
                                }}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="lists" className="mt-0">
              {filteredLists.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title={searchTerm ? "Arama sonucu bulunamadı" : "Henüz arşivlenmiş liste yok"}
                  description={searchTerm ? "Farklı bir arama terimi deneyin" : "Arşivlenmiş listeler burada görünecek"}
                  variant="card"
                />
              ) : (
                <div className="space-y-3">
                  {filteredLists.map((list) => (
                    <div
                      key={list.id}
                      className="p-3 sm:p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base mb-1 break-words">{list.title}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {list.taskIds?.length || 0} görev
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnarchiveList(list.id)}
                          className="flex-shrink-0 w-full sm:w-auto min-h-[44px] sm:min-h-0"
                        >
                          <X className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Arşivden Çıkar</span>
                          <span className="sm:hidden">Çıkar</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        {/* Task Detail Modal */}
        {selectedTaskId && (() => {
          const task = archivedTasks.find(t => t.id === selectedTaskId);
          return (
            <TaskDetailModal
              taskId={selectedTaskId}
              open={!!selectedTaskId}
              onOpenChange={(open) => {
                if (!open) closeTaskDetail();
              }}
              onUpdate={() => {
                fetchData();
              }}
              initialStatus={task?.status as "pending" | "in_progress" | "completed" | "cancelled" || "pending"}
            />
          );
        })()}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Görevi Sil</AlertDialogTitle>
              <AlertDialogDescription>
                Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve görev kalıcı olarak silinecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTask}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default TasksArchive;

