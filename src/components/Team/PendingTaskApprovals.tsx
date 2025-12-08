import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Check, X, ListTodo, Loader2, Clock, CheckCircle2, XCircle, Eye, AlertCircle, Users, CalendarDays, Folder, ChevronDown, ChevronUp, FileText, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getTasks, approveTask, rejectTaskApproval, Task, getTaskAssignments, getTaskById, subscribeToTasks } from "@/services/firebase/taskService";
import { getUserProfile, getAllUsers } from "@/services/firebase/authService";
import { getDepartments } from "@/services/firebase/departmentService";
import { getProjects, Project, getProjectById } from "@/services/firebase/projectService";
import { getAuditLogs, AuditLog } from "@/services/firebase/auditLogsService";
import { getCustomerById } from "@/services/firebase/customerService";
import { getOrderById } from "@/services/firebase/orderService";
import { getProductById } from "@/services/firebase/productService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskInlineForm } from "@/components/Tasks/TaskInlineForm";
import { addDays, isAfter, isBefore, startOfDay } from "date-fns";
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
];

// Status helper fonksiyonları
const getStatusLabelHelper = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Yapılacak",
    in_progress: "Devam Ediyor",
    completed: "Tamamlandı",
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

// Tarih formatlama fonksiyonu
const formatDateSafe = (dateInput?: any) => {
  if (!dateInput) return "Tarih yok";
  try {
    let date: Date;
    if (dateInput?.toDate) {
      // Firebase Timestamp
      date = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === "string") {
      date = new Date(dateInput);
    } else {
      return "Geçersiz tarih";
    }
    
    if (isNaN(date.getTime())) {
      return "Geçersiz tarih";
    }
    
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return "Tarih hatası";
  }
};

export const PendingTaskApprovals = () => {
  const { user, isAdmin, isTeamLeader } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [approvedTasks, setApprovedTasks] = useState<Task[]>([]);
  const [rejectedTasks, setRejectedTasks] = useState<Task[]>([]);
  const [requesterNames, setRequesterNames] = useState<Record<string, string>>({});
  const [approverNames, setApproverNames] = useState<Record<string, string>>({});
  const [rejecterNames, setRejecterNames] = useState<Record<string, string>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [taskDetailModalOpen, setTaskDetailModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  const [inlineFormMode, setInlineFormMode] = useState<"create" | "edit">("edit");
  const [projects, setProjects] = useState<Map<string, Project>>(new Map());
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userLogs, setUserLogs] = useState<Record<string, AuditLog[]>>({});
  const [expandedTaskLogs, setExpandedTaskLogs] = useState<Set<string>>(new Set());
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPendingTasks();
  }, [user, isAdmin]);

  // Dinamik güncelleme için real-time listener
  useEffect(() => {
    if (!user?.id) return;
    
    let unsubscribeTasks: (() => void) | null = null;
    let isMounted = true;

    // Tasks için real-time listener - tüm görevleri dinle
    unsubscribeTasks = subscribeToTasks({}, (tasks) => {
      if (!isMounted) return;
      // Sadece onay durumlarındaki görevleri filtrele ve güncelle
      const pending = tasks.filter(t => t.approvalStatus === "pending");
      const approved = tasks.filter(t => t.approvalStatus === "approved");
      const rejected = tasks.filter(t => t.approvalStatus === "rejected");
      
      // Ekip lideri için filtreleme yap
      if (!isAdmin) {
        // fetchPendingTasks içindeki filtreleme mantığını burada da uygula
        // Şimdilik basit bir yaklaşım: fetchPendingTasks'ı çağır
        fetchPendingTasks();
      } else {
        // Admin için direkt güncelle
        setPendingTasks(pending);
        setApprovedTasks(approved);
        setRejectedTasks(rejected);
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribeTasks) unsubscribeTasks();
    };
  }, [user, isAdmin]);

  const fetchPendingTasks = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Tüm onay durumlarındaki görevleri getir
      const [pending, approved, rejected, usersData, allDepts, projectsData] = await Promise.all([
        getTasks({ approvalStatus: "pending" }),
        getTasks({ approvalStatus: "approved" }),
        getTasks({ approvalStatus: "rejected" }),
        getAllUsers(),
        getDepartments(),
        getProjects(),
      ]);
      
      // Projeleri Map'e çevir
      const projectsMap = new Map<string, Project>();
      projectsData.forEach((p) => {
        projectsMap.set(p.id, p);
      });
      setProjects(projectsMap);
      setAllUsers(usersData);
      
      // Eğer admin değilse, ekip lideri için kendi ekibindeki üyelerin görevlerini filtrele
      const filterTasks = (taskList: Task[]) => {
        if (isAdmin) return taskList;
        
        // Ekip lideri için yönettiği departmanları bul
        const managedDepartments = allDepts.filter(d => d.managerId === user.id);
        
        if (managedDepartments.length === 0) {
          // Ekip lideri değilse veya hiç departman yönetmiyorsa boş liste
          return [];
        }
        
        const managedDeptIds = managedDepartments.map(d => d.id);
        
        // Ekip üyelerini bul
        const teamMemberIds = usersData
          .filter(u => {
            if (u.approvedTeams && u.approvedTeams.some(deptId => managedDeptIds.includes(deptId))) {
              return true;
            }
            if (u.pendingTeams && u.pendingTeams.some(deptId => managedDeptIds.includes(deptId))) {
              return true;
            }
            if (u.departmentId && managedDeptIds.includes(u.departmentId)) {
              return true;
            }
            return false;
          })
          .map(u => u.id);
        
        // Ekip lideri, kendi oluşturduğu görevleri ve yönettiği ekip üyelerinin onay bekleyen görevlerini görmeli
        return taskList.filter(t =>
          t.createdBy === user.id || // Kendi oluşturduğu görevler
          (t.approvalRequestedBy && teamMemberIds.includes(t.approvalRequestedBy)) // Ekip üyelerinin onay bekleyen görevleri
        );
      };

      const filteredPending = filterTasks(pending);
      const filteredApproved = filterTasks(approved);
      const filteredRejected = filterTasks(rejected);

      // Tüm görevler için assignments'ları al ve assignedUsers bilgisini ekle
      const allTasks = [...filteredPending, ...filteredApproved, ...filteredRejected];
      const tasksWithAssignments = await Promise.all(
        allTasks.map(async (task) => {
          try {
            const assignments = await getTaskAssignments(task.id);
            const assignedUsers = assignments
              .map((a) => {
                const user = usersData.find((u) => u.id === a.assignedTo);
                return user
                  ? {
                      id: user.id,
                      full_name: user.fullName || user.displayName || user.email || "Bilinmeyen",
                      email: user.email,
                    }
                  : null;
              })
              .filter((u): u is { id: string; full_name: string; email: string } => u !== null);
            
            return { ...task, assignedUsers };
          } catch (error) {
            console.error(`Error fetching assignments for task ${task.id}:`, error);
            return { ...task, assignedUsers: [] };
          }
        })
      );

      // Filtrelenmiş görevleri assignedUsers ile güncelle
      const pendingWithAssignments = tasksWithAssignments.filter(t => 
        filteredPending.some(ft => ft.id === t.id)
      );
      const approvedWithAssignments = tasksWithAssignments.filter(t => 
        filteredApproved.some(ft => ft.id === t.id)
      );
      const rejectedWithAssignments = tasksWithAssignments.filter(t => 
        filteredRejected.some(ft => ft.id === t.id)
      );

      setPendingTasks(pendingWithAssignments as unknown as Task[]);
      setApprovedTasks(approvedWithAssignments as unknown as Task[]);
      setRejectedTasks(rejectedWithAssignments as unknown as Task[]);

      // Tüm kullanıcı isimlerini al
      const requesterNamesMap: Record<string, string> = {};
      const approverNamesMap: Record<string, string> = {};
      const rejecterNamesMap: Record<string, string> = {};

      await Promise.all(
        allTasks.map(async (task) => {
          if (task.approvalRequestedBy && !requesterNamesMap[task.approvalRequestedBy]) {
            try {
              const profile = await getUserProfile(task.approvalRequestedBy, true);
              requesterNamesMap[task.approvalRequestedBy] = profile?.fullName || profile?.email || "Silinmiş Kullanıcı";
            } catch (error: any) {
              requesterNamesMap[task.approvalRequestedBy] = "Silinmiş Kullanıcı";
            }
          }
          if (task.approvedBy && !approverNamesMap[task.approvedBy]) {
            try {
              const profile = await getUserProfile(task.approvedBy, true);
              approverNamesMap[task.approvedBy] = profile?.fullName || profile?.email || "Silinmiş Kullanıcı";
            } catch (error: any) {
              approverNamesMap[task.approvedBy] = "Silinmiş Kullanıcı";
            }
          }
          if (task.rejectedBy && !rejecterNamesMap[task.rejectedBy]) {
            try {
              const profile = await getUserProfile(task.rejectedBy, true);
              rejecterNamesMap[task.rejectedBy] = profile?.fullName || profile?.email || "Silinmiş Kullanıcı";
            } catch (error: any) {
              rejecterNamesMap[task.rejectedBy] = "Silinmiş Kullanıcı";
            }
          }
        })
      );

      setRequesterNames(requesterNamesMap);
      setApproverNames(approverNamesMap);
      setRejecterNames(rejecterNamesMap);

      // Atanan kullanıcıların loglarını al
      const logsMap: Record<string, AuditLog[]> = {};
      const uniqueUserIds = new Set<string>();
      
      // Tüm görevlerdeki atanan kullanıcı ID'lerini topla
      for (const task of tasksWithAssignments) {
        const assignedUsers = (task as any).assignedUsers || [];
        for (const user of assignedUsers) {
          const userId = typeof user === 'string' ? user : user.id;
          if (userId) {
            uniqueUserIds.add(userId);
          }
        }
      }
      
      // Her kullanıcı için logları al
      await Promise.all(
        Array.from(uniqueUserIds).map(async (userId) => {
          try {
            const logs = await getAuditLogs({ userId, limit: 10 });
            logsMap[userId] = logs;
          } catch (error) {
            console.error(`Error fetching logs for user ${userId}:`, error);
            logsMap[userId] = [];
          }
        })
      );
      
      setUserLogs(logsMap);

      // Entity isimlerini topla ve çek
      const entityMap: Record<string, Set<string>> = {
        tasks: new Set(),
        projects: new Set(),
        customers: new Set(),
        orders: new Set(),
        products: new Set(),
      };
      
      const userIds = new Set<string>(); // Atanan kullanıcılar için
      
      Object.values(logsMap).flat().forEach(log => {
        if (log.recordId && entityMap[log.tableName]) {
          entityMap[log.tableName].add(log.recordId);
        }
        // task_assignments için taskId ve assignedTo'yu al
        if (log.tableName === "task_assignments") {
          if (log.newData?.taskId) {
            entityMap.tasks.add(log.newData.taskId);
          }
          if (log.newData?.assignedTo) {
            userIds.add(log.newData.assignedTo);
          }
        }
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

    } catch (error: any) {
      console.error("Fetch tasks error:", error);
      toast.error("Görevler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (task: Task) => {
    if (!user?.id) return;
    try {
      await approveTask(task.id, user.id);
      toast.success("Görev onaylandı");
      fetchPendingTasks();
    } catch (error: any) {
      toast.error("Onaylama hatası: " + error.message);
    }
  };

  const handleReject = async () => {
    if (!selectedTask || !user?.id) return;
    try {
      await rejectTaskApproval(selectedTask.id, user.id, rejectReason || null); 
      toast.success("Görev onayı reddedildi");
      setRejectDialogOpen(false);
      setSelectedTask(null);
      setRejectReason("");
      fetchPendingTasks();
    } catch (error: any) {
      toast.error("Reddetme hatası: " + error.message);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    // cancelled durumu artık yok, sadece pending, in_progress, completed var
    const validStatus = task.status === "cancelled" ? "completed" : task.status;
    setSelectedTaskStatus(validStatus as "pending" | "in_progress" | "completed");
    setInlineFormMode("edit");
    setTaskDetailModalOpen(true);
  };

  const handleTaskDetailUpdate = () => {
    fetchPendingTasks();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-warning" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
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

  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate) return false;
    let dueDate: Date;
    if (task.dueDate instanceof Timestamp) {
      dueDate = task.dueDate.toDate();
    } else if (task.dueDate && typeof task.dueDate === 'object' && 'toDate' in task.dueDate) {
      dueDate = (task.dueDate as any).toDate();
    } else {
      dueDate = new Date(task.dueDate as any);
    }
    return isBefore(dueDate, new Date()) && task.status !== "completed";
  };

  const isTaskDueSoon = (task: Task) => {
    if (!task.dueDate) return false;
    let dueDate: Date;
    if (task.dueDate instanceof Timestamp) {
      dueDate = task.dueDate.toDate();
    } else if (task.dueDate && typeof task.dueDate === 'object' && 'toDate' in task.dueDate) {
      dueDate = (task.dueDate as any).toDate();
    } else {
      dueDate = new Date(task.dueDate as any);
    }
    const today = startOfDay(new Date());
    const threeDaysAfter = addDays(today, 3);
    return (
      !isTaskOverdue(task) &&
      (isAfter(dueDate, today) || dueDate.getTime() === today.getTime()) &&
      isBefore(dueDate, threeDaysAfter) &&
      task.status !== "completed"
    );
  };

  const formatDueDate = (value?: string | Timestamp | null) => {
    if (!value) return "-";
    try {
      let date: Date;
      if (value instanceof Timestamp) {
        date = value.toDate();
      } else if (typeof value === 'string') {
        date = new Date(value);
      } else if (value && typeof value === 'object' && 'toDate' in value) {
        date = (value as { toDate: () => Date }).toDate();
      } else {
        return "-";
      }
      return date.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
      });
    } catch {
      return "-";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderTaskCard = (task: Task, showActions: boolean = true) => {
    const requesterName = requesterNames[task.approvalRequestedBy || ""] || "...";
    const approverName = task.approvedBy ? approverNames[task.approvedBy] || "..." : null;
    const rejecterName = task.rejectedBy ? rejecterNames[task.rejectedBy] || "..." : null;
    const approvalDate = task.approvedAt ? formatDateSafe(task.approvedAt) : null;
    const rejectionDate = task.rejectedAt ? formatDateSafe(task.rejectedAt) : null;
    const overdue = isTaskOverdue(task);
    const dueSoon = isTaskDueSoon(task);
    
    // Assigned users bilgisini al
    const assignedUsers = (task as any).assignedUsers || [];
    const assignedUsersWithDetails = assignedUsers
      .map((user: any) => {
        if (typeof user === 'string') {
          const userData = allUsers.find(u => u.id === user);
          return userData ? { id: userData.id, full_name: userData.fullName || userData.email || "Bilinmeyen" } : null;
        }
        return user;
      })
      .filter(Boolean);

    return (
      <div
        key={task.id}
        className="p-6 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div
            className="flex-1 cursor-pointer"
            onClick={() => handleTaskClick(task)}
          >
            <div className="flex items-start gap-3 mb-3">
              {getStatusIcon(task.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-lg">{task.title}</h3>
                  {task.projectId && projects.has(task.projectId) && (
                    <Badge 
                      variant="outline" 
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-300 hover:from-blue-100 hover:to-indigo-100 transition-all shadow-sm"
                    >
                      <Folder className="h-3 w-3 mr-1.5" />
                      <span className="font-semibold text-xs">
                        {projects.get(task.projectId)?.name}
                      </span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-2 mb-4 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary">{getStatusLabel(task.status)}</Badge>
              <Badge variant="outline" className="text-xs">
                Öncelik {task.priority}
              </Badge>
              {dueSoon && <Badge className="bg-amber-100 text-amber-900 border-amber-200">Yaklaşan Termin</Badge>}
              {overdue && <Badge variant="destructive">Termin Geçti</Badge>}
              {task.approvalStatus === "pending" && (
                <Badge className="bg-yellow-100 text-yellow-900 border-yellow-300">Görev Onayı Bekleniyor</Badge>
              )}
              {task.approvalStatus === "approved" && (
                <Badge className="bg-green-100 text-green-900 border-green-300">Görev Onaylandı</Badge>
              )}
              {task.approvalStatus === "rejected" && (
                <Badge className="bg-red-100 text-red-900 border-red-300">Görev Onayı Reddedildi</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              {task.dueDate && (
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Termin: {formatDueDate(task.dueDate)}
                </span>
              )}
              {assignedUsersWithDetails.length > 0 && (
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {assignedUsersWithDetails.length} kişi
                </span>
              )}
            </div>
            {assignedUsersWithDetails.length > 0 && (
              <div className="flex items-center gap-2 mt-4">
                <div className="flex -space-x-2">
                  {assignedUsersWithDetails.slice(0, 4).map((user: any) => (
                    <Avatar key={user.id} className="h-7 w-7 border-2 border-background">
                      <AvatarFallback className="text-[11px]">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {assignedUsersWithDetails.length > 4 && (
                  <span className="text-xs text-muted-foreground">
                    +{assignedUsersWithDetails.length - 4} daha
                  </span>
                )}
              </div>
            )}
            {(approverName || rejecterName || task.rejectionReason) && (
              <div className="flex flex-col gap-2 mt-4 p-3 bg-muted/30 rounded-lg border border-border">
                {approverName && approvalDate && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-emerald-700">Onaylayan Kişi:</span>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <span className="text-sm font-medium text-foreground">{approverName}</span>
                        <span className="text-xs text-muted-foreground">{approvalDate}</span>
                      </div>
                    </div>
                  </div>
                )}
                {rejecterName && rejectionDate && (
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-red-700">Reddeden Kişi:</span>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <span className="text-sm font-medium text-foreground">{rejecterName}</span>
                        <span className="text-xs text-muted-foreground">{rejectionDate}</span>
                      </div>
                    </div>
                  </div>
                )}
                {task.rejectionReason && (
                  <div className="text-sm text-red-700 font-medium mt-1 pt-2 border-t border-border">
                    <span className="font-semibold">Red Nedeni:</span> {task.rejectionReason}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ekip Üyelerinin Logları */}
          {assignedUsersWithDetails.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedTaskLogs(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(task.id)) {
                      newSet.delete(task.id);
                    } else {
                      newSet.add(task.id);
                    }
                    return newSet;
                  });
                }}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <FileText className="h-4 w-4" />
                <span>Ekip Üyelerinin Logları</span>
                {expandedTaskLogs.has(task.id) ? (
                  <ChevronUp className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                )}
              </button>
              
              {expandedTaskLogs.has(task.id) && (
                <div className="mt-3 space-y-3">
                  {assignedUsersWithDetails.map((user: any) => {
                    const logs = userLogs[user.id] || [];
                    if (logs.length === 0) {
                      return (
                        <div key={user.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px]">
                                {getInitials(user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{user.full_name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Henüz log bulunmuyor</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={user.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{user.full_name}</span>
                          <Badge variant="secondary" className="text-xs ml-auto">
                            {logs.length} log
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {logs.slice(0, 5).map((log) => {
                            const actionMeta = {
                              CREATE: { color: "bg-green-500", label: "Oluşturma" },
                              UPDATE: { color: "bg-blue-500", label: "Güncelleme" },
                              DELETE: { color: "bg-red-500", label: "Silme" },
                            }[log.action] || { color: "bg-gray-500", label: log.action };
                            
                            let logDate: Date;
                            if (log.createdAt instanceof Timestamp) {
                              logDate = log.createdAt.toDate();
                            } else if (log.createdAt && typeof log.createdAt === 'object' && 'toDate' in log.createdAt) {
                              logDate = (log.createdAt as any).toDate();
                            } else if (log.createdAt && typeof log.createdAt === 'object' && (log.createdAt as any).constructor === Date) {
                              logDate = log.createdAt as Date;
                            } else if (typeof log.createdAt === 'string' || typeof log.createdAt === 'number') {
                              logDate = new Date(log.createdAt);
                            } else {
                              logDate = new Date();
                            }
                            
                            return (
                              <div key={log.id} className="flex items-start gap-2 text-xs">
                                <div className={`w-2 h-2 rounded-full ${actionMeta.color} mt-1.5 flex-shrink-0`} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium">
                                    {(() => {
                                      const userName = log.userName || log.userEmail || "Sistem";
                                      const actionVerb = log.action === "CREATE" ? "oluşturdu" : 
                                                        log.action === "UPDATE" ? "güncelledi" : 
                                                        log.action === "DELETE" ? "sildi" : "yaptı";
                                      
                                      // Giriş logları
                                      if (log.tableName === "user_logins") {
                                        return `${userName} Giriş yaptı`;
                                      }
                                      
                                      // Görev atama logları - özel format
                                      if (log.tableName === "task_assignments" && log.action === "CREATE") {
                                        const taskId = log.newData?.taskId;
                                        const assignedToId = log.newData?.assignedTo;
                                        const taskName = taskId && entityNames[`tasks_${taskId}`] 
                                          ? entityNames[`tasks_${taskId}`] 
                                          : (log.newData?.taskTitle || "görev");
                                        const assignedUserName = assignedToId && entityNames[`users_${assignedToId}`]
                                          ? entityNames[`users_${assignedToId}`]
                                          : "bir kişiyi";
                                        
                                        // Proje bilgisini kontrol et - taskId'den projectId'yi bul
                                        if (taskId && entityNames[`task_project_${taskId}`]) {
                                          const projectId = entityNames[`task_project_${taskId}`];
                                          if (entityNames[`projects_${projectId}`]) {
                                            const projectName = entityNames[`projects_${projectId}`];
                                            return `${userName} "${projectName}" projesindeki "${taskName}" görevini oluşturdu ve ${assignedUserName} kişisini göreve atadı`;
                                          }
                                        }
                                        
                                        return `${userName} "${taskName}" görevini oluşturdu ve ${assignedUserName} kişisini göreve atadı`;
                                      }
                                      
                                      // Görev logları - proje bilgisi ile
                                      if (log.tableName === "tasks" && log.recordId) {
                                        const taskName = entityNames[`tasks_${log.recordId}`] || 
                                                        log.newData?.title || 
                                                        log.oldData?.title || 
                                                        "görev";
                                        
                                        // Proje bilgisini kontrol et
                                        const projectId = log.newData?.projectId || log.oldData?.projectId;
                                        if (projectId && entityNames[`projects_${projectId}`]) {
                                          const projectName = entityNames[`projects_${projectId}`];
                                          return `${userName} "${projectName}" projesindeki "${taskName}" görevini ${actionVerb}`;
                                        }
                                        return `${userName} "${taskName}" görevini ${actionVerb}`;
                                      }
                                      
                                      // Müşteri logları
                                      if (log.tableName === "customers" && log.recordId) {
                                        const customerName = entityNames[`customers_${log.recordId}`] || 
                                                           log.newData?.name || 
                                                           log.oldData?.name || 
                                                           "müşteri";
                                        return `${userName} "${customerName}" müşterisini ${actionVerb}`;
                                      }
                                      
                                      // Sipariş logları
                                      if (log.tableName === "orders" && log.recordId) {
                                        const orderName = entityNames[`orders_${log.recordId}`] || 
                                                         (log.newData?.orderNumber ? `Sipariş #${log.newData.orderNumber}` : null) ||
                                                         (log.oldData?.orderNumber ? `Sipariş #${log.oldData.orderNumber}` : null) ||
                                                         "sipariş";
                                        return `${userName} "${orderName}" siparişini ${actionVerb}`;
                                      }
                                      
                                      // Ürün logları
                                      if (log.tableName === "products" && log.recordId) {
                                        const productName = entityNames[`products_${log.recordId}`] || 
                                                          log.newData?.name || 
                                                          log.oldData?.name || 
                                                          "ürün";
                                        return `${userName} "${productName}" ürününü ${actionVerb}`;
                                      }
                                      
                                      // Proje logları
                                      if (log.tableName === "projects" && log.recordId) {
                                        const projectName = entityNames[`projects_${log.recordId}`] || 
                                                          log.newData?.name || 
                                                          log.oldData?.name || 
                                                          "proje";
                                        return `${userName} "${projectName}" projesini ${actionVerb}`;
                                      }
                                      
                                      // Diğer loglar - entity adı ile
                                      if (log.recordId && entityNames[`${log.tableName}_${log.recordId}`]) {
                                        const entityName = entityNames[`${log.tableName}_${log.recordId}`];
                                        return `${userName} "${entityName}" kaydını ${actionVerb}`;
                                      }
                                      
                                      // Fallback
                                      return `${userName} ${actionMeta.label} yaptı`;
                                    })()}
                                  </p>
                                  <p className="text-muted-foreground mt-0.5">
                                    {logDate.toLocaleDateString("tr-TR", {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          {logs.length > 5 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              +{logs.length - 5} log daha
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {showActions && task.approvalStatus === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprove(task);
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Onayla
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTask(task);
                    setRejectDialogOpen(true);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reddet
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleTaskClick(task);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Detay
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Bekleyen ({pendingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Onaylandı ({approvedTasks.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <XCircle className="h-4 w-4" />
                Reddedildi ({rejectedTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 mt-4">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="flex justify-center mb-3">
                    <Check className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                  <p>Onayınızı bekleyen görev bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingTasks.map((task) => renderTaskCard(task, true))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4 mt-4">
              {approvedTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="flex justify-center mb-3">
                    <CheckCircle2 className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                  <p>Onaylanmış görev bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedTasks.map((task) => renderTaskCard(task, false))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4 mt-4">
              {rejectedTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="flex justify-center mb-3">
                    <XCircle className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                  <p>Reddedilmiş görev bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rejectedTasks.map((task) => renderTaskCard(task, false))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi Reddet</DialogTitle>
            <DialogDescription>
              Görevi neden reddettiğinizi belirtebilirsiniz. Görev "Devam Ediyor" statüsüne geri dönecektir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Red Nedeni</Label>
            <Textarea 
              placeholder="Eksik kısımlar var, lütfen kontrol et..." 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>İptal</Button>
            <Button variant="destructive" onClick={handleReject}>Reddet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDetailModalOpen} onOpenChange={setTaskDetailModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Görev Detayları</DialogTitle>
            <DialogDescription>
              Görev detaylarını, ekibi ve checklist'i görüntüleyin.
            </DialogDescription>
          </DialogHeader>
          {selectedTaskId && (
            <TaskInlineForm
              key={`${inlineFormMode}-${selectedTaskId}`}
              mode={inlineFormMode}
              projectId={null}
              taskId={selectedTaskId}
              defaultStatus={selectedTaskStatus}
              onCancel={() => {
                setTaskDetailModalOpen(false);
                setSelectedTaskId(null);
                setSelectedTaskStatus("pending");
              }}
              onSuccess={() => {
                handleTaskDetailUpdate();
                setTaskDetailModalOpen(false);
                setSelectedTaskId(null);
                setSelectedTaskStatus("pending");
              }}
              className="border-0 shadow-none p-0"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

