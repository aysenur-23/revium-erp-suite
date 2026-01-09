import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Check, X, ListTodo, Loader2, Clock, CheckCircle2, XCircle, Eye, AlertCircle, Users, CalendarDays, Folder, ChevronDown, ChevronUp, FileText, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getTasks, approveTask, rejectTaskApproval, Task, getTaskAssignments, getTaskById, subscribeToTasks, approvePoolRequest, rejectPoolRequest } from "@/services/firebase/taskService";
import { getUserProfile, getAllUsers, UserProfile } from "@/services/firebase/authService";
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

// Normalize status - remove "column_" prefix if present
const normalizeStatusHelper = (status: string | undefined | null): string => {
  if (!status) return "pending";
  // Eğer "column_" ile başlıyorsa, bu bir column ID'sidir (sayısal olabilir)
  if (status.startsWith("column_")) {
    const statusFromColumn = status.replace("column_", "");
    // Geçerli status değerlerini kontrol et (pending, in_progress, completed, approved, cancelled)
    if (["pending", "in_progress", "completed", "approved", "cancelled"].includes(statusFromColumn)) {
      return statusFromColumn === "cancelled" ? "pending" : statusFromColumn;
    }
    // Sayısal ID veya geçersiz değer ise "pending" olarak kabul et
    return "pending";
  }
  // Geçerli status değerlerini kontrol et
  if (["pending", "in_progress", "completed", "approved", "cancelled"].includes(status)) {
    return status === "cancelled" ? "pending" : status;
  }
  return "pending"; // Fallback
};

// Status helper fonksiyonları
const getStatusLabelHelper = (status: string) => {
  // Önce status'ü normalize et (column_ prefix'ini kaldır)
  const normalized = normalizeStatusHelper(status);
  const labels: Record<string, string> = {
    pending: "Yapılacak",
    in_progress: "Devam Ediyor",
    completed: "Tamamlandı",
  };
  return labels[normalized] || normalized;
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
const formatDateSafe = (dateInput?: Timestamp | Date | string | null) => {
  if (!dateInput) return "Tarih yok";
  try {
    let date: Date;
    if (dateInput instanceof Timestamp) {
      // Firebase Timestamp
      date = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === "string") {
      date = new Date(dateInput);
    } else if (typeof dateInput === 'object' && 'toDate' in dateInput && typeof (dateInput as { toDate: () => Date }).toDate === 'function') {
      date = (dateInput as { toDate: () => Date }).toDate();
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
  const [poolRequestTasks, setPoolRequestTasks] = useState<Task[]>([]);
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
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
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
      // Real-time güncellemeler için fetchPendingTasks'ı çağır (görev havuzu talepleri de dahil)
      fetchPendingTasks();
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
      // Tüm onay durumlarındaki görevleri ve görev havuzu taleplerini getir
      const [pending, approved, rejected, allTasksForPool, usersData, allDepts, projectsData] = await Promise.all([
        getTasks({ approvalStatus: "pending" }),
        getTasks({ approvalStatus: "approved" }),
        getTasks({ approvalStatus: "rejected" }),
        getTasks(), // Görev havuzu talepleri için tüm görevleri al
        getAllUsers(),
        getDepartments(),
        getProjects(),
      ]);
      
      // Görev havuzu taleplerini filtrele - sadece görevi oluşturan kişi için
      const poolTasks = allTasksForPool.filter(t => 
        t.isInPool === true && 
        t.poolRequests && 
        Array.isArray(t.poolRequests) && 
        t.poolRequests.length > 0 &&
        t.createdBy === user.id // Sadece görevi oluşturan kişi görebilir
      );
      
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
          } catch (error: unknown) {
            if (import.meta.env.DEV) {
              if (import.meta.env.DEV) {
                console.error(`Error fetching assignments for task ${task.id}:`, error);
              }
            }
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
      
      // Görev havuzu taleplerini de assignments ile birlikte al
      const poolTasksWithAssignments = await Promise.all(
        poolTasks.map(async (task) => {
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
          } catch (error: unknown) {
            if (import.meta.env.DEV) {
              console.error(`Error fetching assignments for pool task ${task.id}:`, error);
            }
            return { ...task, assignedUsers: [] };
          }
        })
      );
      setPoolRequestTasks(poolTasksWithAssignments as unknown as Task[]);

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
            } catch (error: unknown) {
              requesterNamesMap[task.approvalRequestedBy] = "Silinmiş Kullanıcı";
            }
          }
          if (task.approvedBy && !approverNamesMap[task.approvedBy]) {
            try {
              const profile = await getUserProfile(task.approvedBy, true);
              approverNamesMap[task.approvedBy] = profile?.fullName || profile?.email || "Silinmiş Kullanıcı";
            } catch (error: unknown) {
              approverNamesMap[task.approvedBy] = "Silinmiş Kullanıcı";
            }
          }
          if (task.rejectedBy && !rejecterNamesMap[task.rejectedBy]) {
            try {
              const profile = await getUserProfile(task.rejectedBy, true);
              rejecterNamesMap[task.rejectedBy] = profile?.fullName || profile?.email || "Silinmiş Kullanıcı";
            } catch (error: unknown) {
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
        const taskWithAssignments = task as Task & { assignedUsers?: Array<{ id: string; full_name: string; email: string }> };
        const assignedUsers = taskWithAssignments.assignedUsers || [];
        for (const user of assignedUsers) {
          if (typeof user === 'string') {
            uniqueUserIds.add(user);
          } else if (user && typeof user === 'object' && 'id' in user) {
            const userId = (user as { id: string }).id;
            if (userId) {
              uniqueUserIds.add(userId);
            }
          }
        }
      }
      
      // Her kullanıcı için logları al
      await Promise.all(
        Array.from(uniqueUserIds).map(async (userId) => {
          try {
            const logs = await getAuditLogs({ userId, limit: 10 });
            logsMap[userId] = logs;
          } catch (error: unknown) {
            if (import.meta.env.DEV) {
              if (import.meta.env.DEV) {
                console.error(`Error fetching logs for user ${userId}:`, error);
              }
            }
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
        if (log.tableName === "task_assignments" && log.newData) {
          const newData = log.newData as Record<string, unknown>;
          if (typeof newData.taskId === 'string') {
            entityMap.tasks.add(newData.taskId);
          }
          if (typeof newData.assignedTo === 'string') {
            userIds.add(newData.assignedTo);
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

    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        if (import.meta.env.DEV) {
          console.error("Fetch tasks error:", error);
        }
      }
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Onaylama hatası oluştu";
      toast.error(errorMessage);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Reddetme hatası oluştu";
      toast.error(errorMessage);
    }
  };

  const handleApprovePoolRequest = async (task: Task, requestingUserId: string) => {
    if (!user?.id || !task?.id) return;
    try {
      await approvePoolRequest(task.id, requestingUserId, user.id, true);
      toast.success("Görev havuzu talebi onaylandı");
      fetchPendingTasks();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Onaylama hatası oluştu";
      toast.error(errorMessage);
    }
  };

  const handleRejectPoolRequest = async (task: Task, requestingUserId: string) => {
    if (!user?.id || !task?.id) return;
    try {
      await rejectPoolRequest(task.id, requestingUserId);
      toast.success("Görev havuzu talebi reddedildi");
      fetchPendingTasks();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Reddetme hatası oluştu";
      toast.error(errorMessage);
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

  // Normalize status - remove "column_" prefix if present
  const normalizeStatus = (status: string | undefined | null): string => {
    if (!status) return "pending";
    // Eğer "column_" ile başlıyorsa, bu bir column ID'sidir (sayısal olabilir)
    if (status.startsWith("column_")) {
      const statusFromColumn = status.replace("column_", "");
      // Geçerli status değerlerini kontrol et (pending, in_progress, completed, approved, cancelled)
      if (["pending", "in_progress", "completed", "approved", "cancelled"].includes(statusFromColumn)) {
        return statusFromColumn === "cancelled" ? "pending" : statusFromColumn;
      }
      // Sayısal ID veya geçersiz değer ise "pending" olarak kabul et
      return "pending";
    }
    // Geçerli status değerlerini kontrol et
    if (["pending", "in_progress", "completed", "approved", "cancelled"].includes(status)) {
      return status === "cancelled" ? "pending" : status;
    }
    return "pending"; // Fallback
  };

  const getStatusLabel = (status: string) => {
    // Önce status'ü normalize et (column_ prefix'ini kaldır)
    const normalized = normalizeStatus(status);
    const labels: Record<string, string> = {
      pending: "Beklemede",
      in_progress: "Devam Ediyor",
      completed: "Tamamlandı",
      cancelled: "İptal",
    };
    return labels[normalized] || normalized;
  };

  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate) return false;
    let dueDate: Date;
    if (task.dueDate instanceof Timestamp) {
      dueDate = task.dueDate.toDate();
    } else if (task.dueDate && typeof task.dueDate === 'object' && 'toDate' in task.dueDate) {
      dueDate = (task.dueDate as { toDate: () => Date }).toDate();
    } else if (typeof task.dueDate === 'string' || typeof task.dueDate === 'number') {
      dueDate = new Date(task.dueDate);
    } else {
      return false;
    }
    return isBefore(dueDate, new Date()) && task.status !== "completed";
  };

  const isTaskDueSoon = (task: Task) => {
    if (!task.dueDate) return false;
    let dueDate: Date;
    if (task.dueDate instanceof Timestamp) {
      dueDate = task.dueDate.toDate();
    } else if (task.dueDate && typeof task.dueDate === 'object' && 'toDate' in task.dueDate) {
      dueDate = (task.dueDate as { toDate: () => Date }).toDate();
    } else if (typeof task.dueDate === 'string' || typeof task.dueDate === 'number') {
      dueDate = new Date(task.dueDate);
    } else {
      return false;
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
    const taskWithAssignments = task as Task & { assignedUsers?: Array<{ id: string; full_name: string; email?: string }> };
    const assignedUsers = taskWithAssignments.assignedUsers || [];
    const assignedUsersWithDetails = assignedUsers
      .map((user: { id: string; full_name: string; email?: string } | string) => {
        if (typeof user === 'string') {
          const userData = allUsers.find(u => u.id === user);
          return userData ? { id: userData.id, full_name: userData.fullName || userData.email || "Bilinmeyen" } : null;
        }
        return user;
      })
      .filter((u): u is { id: string; full_name: string; email?: string } => u !== null);

    return (
      <Card
        key={task.id}
        className="group border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
      >
        <CardContent className="p-2">
          <div className="flex flex-col gap-2">
            {/* Header */}
            <div
              className="flex-1 cursor-pointer"
              onClick={() => handleTaskClick(task)}
            >
              <div className="flex items-start gap-2 mb-1.5">
                <div className="p-2 rounded-lg bg-primary/10">
                  {getStatusIcon(task.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                    <h3 className="font-semibold text-[14px] sm:text-[15px] leading-tight line-clamp-2 flex-1 min-w-0">{task.title}</h3>
                    {task.projectId && projects.has(task.projectId) && (
                      <Badge 
                        variant="outline" 
                        className="bg-blue-50 text-blue-700 border-blue-200 text-xs flex-shrink-0 ml-2"
                      >
                        <Folder className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate max-w-[100px] inline-block">
                          {projects.get(task.projectId)?.name}
                        </span>
                      </Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-1.5">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Badges */}
              <div className="flex flex-wrap gap-1 mb-1.5">
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal border-0 leading-tight py-0">{getStatusLabel(task.status)}</Badge>
                <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal border leading-tight py-0">Öncelik {task.priority}</Badge>
                {dueSoon && <Badge className="h-4 px-1.5 text-[10px] font-normal border-0 leading-tight py-0 bg-amber-100 text-amber-900 border-amber-200">Yaklaşan</Badge>}
                {overdue && <Badge variant="destructive" className="h-4 px-1.5 text-[10px] font-normal border-0 leading-tight py-0">Gecikti</Badge>}
                {task.approvalStatus === "pending" && (
                  <Badge className="h-4 px-1.5 text-[10px] font-normal border-0 leading-tight py-0 bg-yellow-100 text-yellow-900 border-yellow-300">Onay Bekliyor</Badge>
                )}
                {task.approvalStatus === "approved" && (
                  <Badge className="h-4 px-1.5 text-[10px] font-normal border-0 leading-tight py-0 bg-green-100 text-green-900 border-green-300">Onaylandı</Badge>
                )}
                {task.approvalStatus === "rejected" && (
                  <Badge className="h-4 px-1.5 text-[10px] font-normal border-0 leading-tight py-0 bg-red-100 text-red-900 border-red-300">Reddedildi</Badge>
                )}
              </div>
              
              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1.5">
                {task.dueDate && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDueDate(task.dueDate)}
                  </span>
                )}
                {assignedUsersWithDetails.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {assignedUsersWithDetails.length} kişi
                  </span>
                )}
              </div>
              
              {/* Assigned Users */}
              {assignedUsersWithDetails.length > 0 && (
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex -space-x-2">
                    {assignedUsersWithDetails.slice(0, 4).map((user) => {
                      if (typeof user === 'string') return null;
                      return (
                        <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      );
                    }).filter(Boolean)}
                  </div>
                  {assignedUsersWithDetails.length > 4 && (
                    <span className="text-xs text-muted-foreground">
                      +{assignedUsersWithDetails.length - 4}
                    </span>
                  )}
                </div>
              )}
              
              {/* Approval/Rejection Info */}
              {(approverName || rejecterName || task.rejectionReason) && (
                <div className="flex flex-col gap-1.5 p-2 bg-muted/30 rounded-lg border border-border text-xs">
                  {approverName && approvalDate && (
                    <div className="flex items-start gap-2 min-w-0">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-emerald-700">Onaylayan:</span>
                        <span className="ml-1.5 text-foreground break-words">{approverName}</span>
                        <span className="ml-1.5 text-muted-foreground whitespace-nowrap">({approvalDate})</span>
                      </div>
                    </div>
                  )}
                  {rejecterName && rejectionDate && (
                    <div className="flex items-start gap-2 min-w-0">
                      <XCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-red-700">Reddeden:</span>
                        <span className="ml-1.5 text-foreground break-words">{rejecterName}</span>
                        <span className="ml-1.5 text-muted-foreground whitespace-nowrap">({rejectionDate})</span>
                      </div>
                    </div>
                  )}
                  {task.rejectionReason && (
                    <div className="text-red-700 font-medium pt-2 border-t border-border break-words">
                      <span className="font-semibold">Neden:</span> <span className="break-words">{task.rejectionReason}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
              {showActions && task.approvalStatus === "pending" && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprove(task);
                    }}
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Onayla
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTask(task);
                      setRejectDialogOpen(true);
                    }}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Reddet
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTaskClick(task);
                }}
              >
                <Eye className="h-4 w-4 mr-1.5" />
                Detay
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
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
    <div className="w-full space-y-1 min-w-0">
      <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="pending" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Clock className="h-4 w-4" />
                Bekleyen
                {(pendingTasks.length + poolRequestTasks.length) > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-xs">
                    {pendingTasks.length + poolRequestTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
                Onaylandı
                {approvedTasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-xs">
                    {approvedTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <XCircle className="h-4 w-4" />
                Reddedildi
                {rejectedTasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-xs">
                    {rejectedTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-1 mt-1 max-h-[60vh] overflow-y-auto">
              {pendingTasks.length === 0 && poolRequestTasks.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <div className="flex justify-center mb-2">
                    <Check className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                  <p className="text-sm">Onayınızı bekleyen görev bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Görev Onayları */}
                  {pendingTasks.map((task) => renderTaskCard(task, true))}
                  
                  {/* Görev Havuzu Talepleri */}
                  {poolRequestTasks.map((task) => {
                    const poolRequests = task.poolRequests || [];
                    if (!Array.isArray(poolRequests) || poolRequests.length === 0) return null;
                    
                    return (
                      <Card
                        key={task.id}
                        className="border-amber-200 bg-amber-50/30 hover:bg-amber-50/50 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-start gap-2">
                              <div className="p-2 rounded-lg bg-amber-100">
                                <ListTodo className="h-5 w-5 text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h3 className="font-semibold text-[14px] sm:text-[15px] leading-tight line-clamp-2">{task.title}</h3>
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs flex-shrink-0">
                                    Havuz Talebi
                                  </Badge>
                                </div>
                                {task.projectId && projects.has(task.projectId) && (
                                  <Badge 
                                    variant="outline" 
                                    className="bg-blue-50 text-blue-700 border-blue-200 text-xs mb-2"
                                  >
                                    <Folder className="h-3 w-3 mr-1" />
                                    {projects.get(task.projectId)?.name}
                                  </Badge>
                                )}
                                {task.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-1.5">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Requests */}
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-amber-900">
                                {poolRequests.length} talep var:
                              </p>
                              <div className="space-y-2">
                                {poolRequests.map((requestingUserId: string) => {
                                  const requestingUser = allUsers.find(u => u.id === requestingUserId);
                                  const userName = requestingUser?.fullName || requestingUser?.displayName || requestingUser?.email?.split("@")[0] || "Bilinmeyen Kullanıcı";
                                  
                                  return (
                                    <div key={requestingUserId} className="flex items-center justify-between gap-1.5 p-2 bg-white rounded-lg border border-amber-200 hover:border-amber-300 transition-colors min-w-0">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                          <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                                            {getInitials(userName)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                                          <p className="text-xs text-gray-500 truncate">Görevi talep etti</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="border-red-300 text-red-700 hover:bg-red-50 h-8 px-2"
                                          onClick={() => handleRejectPoolRequest(task, requestingUserId)}
                                        >
                                          <X className="h-3.5 w-3.5 mr-1" />
                                          Reddet
                                        </Button>
                                        <Button
                                          size="sm"
                                          className="bg-amber-600 hover:bg-amber-700 text-white border-none h-8 px-3"
                                          onClick={() => handleApprovePoolRequest(task, requestingUserId)}
                                        >
                                          <Check className="h-3.5 w-3.5 mr-1" />
                                          Onayla
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Action */}
                            <div className="pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-1 mt-1 max-h-[60vh] overflow-y-auto">
              {approvedTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="flex justify-center mb-1.5">
                    <CheckCircle2 className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                  <p>Onaylanmış görev bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {approvedTasks.map((task) => renderTaskCard(task, false))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-1 mt-1 max-h-[60vh] overflow-y-auto">
              {rejectedTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="flex justify-center mb-1.5">
                    <XCircle className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                  <p>Reddedilmiş görev bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {rejectedTasks.map((task) => renderTaskCard(task, false))}
                </div>
              )}
            </TabsContent>
          </Tabs>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogTitle className="sr-only">Görevi Reddet</DialogTitle>
          <DialogDescription className="sr-only">
              Görevi neden reddettiğinizi belirtebilirsiniz. Görev "Devam Ediyor" statüsüne geri dönecektir.
            </DialogDescription>
          <DialogHeader>
            <h2 className="text-[14px] sm:text-[15px] font-semibold text-foreground">Görevi Reddet</h2>
            <p className="text-sm text-muted-foreground">
              Görevi neden reddettiğinizi belirtebilirsiniz. Görev "Devam Ediyor" statüsüne geri dönecektir.
            </p>
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
        <DialogContent className="!max-w-[100vw] sm:!max-w-[95vw] md:!max-w-[90vw] lg:!max-w-4xl !w-[100vw] sm:!w-[95vw] md:!w-[90vw] lg:!w-[80vw] !h-[100vh] sm:!h-[90vh] md:!h-[85vh] !max-h-[100vh] sm:!max-h-[90vh] md:!max-h-[85vh] !left-0 sm:!left-[2.5vw] md:!left-[5vw] lg:!left-1/2 !top-0 sm:!top-[5vh] md:!top-[7.5vh] lg:!top-1/2 !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 sm:!translate-x-0 md:!translate-x-0 lg:!-translate-x-1/2 !translate-y-0 sm:!translate-y-0 md:!translate-y-0 lg:!-translate-y-1/2 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
          <DialogTitle className="sr-only">Görev Detayları</DialogTitle>
          <DialogDescription className="sr-only">
            Görev detaylarını, ekibi ve checklist'i görüntüleyin.
          </DialogDescription>
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
              <h2 className="text-[14px] sm:text-[15px] font-semibold text-foreground">Görev Detayları</h2>
              <p className="text-sm text-muted-foreground">
                Görev detaylarını, ekibi ve checklist'i görüntüleyin.
              </p>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-4 sm:px-6 py-4 sm:py-6">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

