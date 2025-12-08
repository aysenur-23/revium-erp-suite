import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTasks,
  subscribeToTasks,
  deleteTask,
  updateTaskStatus,
  getTaskAssignments,
  acceptTaskAssignment,
  rejectTaskAssignment,
  requestTaskApproval,
  archiveTask,
  Task as FirebaseTask,
  TaskAssignment as FirebaseTaskAssignment,
} from "@/services/firebase/taskService";
import { getRequests, Request as UserRequest } from "@/services/firebase/requestService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { Timestamp } from "firebase/firestore";
import { CheckCircle2, Clock, AlertCircle, Users, Trash2, Loader2, X, Flame, CalendarDays, Plus, Archive, Lock, CheckSquare, MoreVertical, CircleDot, Send, Edit } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TaskDetailModal } from "@/components/Tasks/TaskDetailModal";
import { TaskInlineForm } from "@/components/Tasks/TaskInlineForm";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskBoard } from "@/components/Tasks/TaskBoard";
import { addDays, isAfter, isBefore, startOfDay } from "date-fns";
import { canCreateTask } from "@/utils/permissions";
import { getDepartments } from "@/services/firebase/departmentService";
import { onPermissionCacheChange } from "@/services/firebase/rolePermissionsService";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getProjectById, getProjects, Project } from "@/services/firebase/projectService";
import { ArrowLeft, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  due_date: string | null;
  created_at: string;
  production_order_number?: string | null;
  production_order_customer?: string | null;
  production_order_priority?: number | null;
  production_order_due_date?: string | null;
  approvalStatus?: "pending" | "approved" | "rejected";
  createdBy?: string;
  projectId?: string | null;
  isArchived?: boolean;
  is_archived?: boolean;
}

// Firebase Task'i UI Task formatına çevir
const convertFirebaseTaskToUITask = (
  firebaseTask: FirebaseTask,
  assignments: FirebaseTaskAssignment[],
  users: UserProfile[]
): Task & { assignment?: TaskAssignment; assignedUsers?: Profile[] } => {
  const assignedUsers = assignments
    .map((a) => {
      const user = users.find((u) => u.id === a.assignedTo);
      return user
        ? {
            id: user.id,
            full_name: user.fullName || user.displayName,
            email: user.email,
          }
        : null;
    })
    .filter((u): u is Profile => u !== null);

  return {
    id: firebaseTask.id,
    title: firebaseTask.title,
    description: firebaseTask.description || null,
    status: firebaseTask.status,
    priority: firebaseTask.priority,
    due_date: firebaseTask.dueDate
      ? (firebaseTask.dueDate instanceof Timestamp
          ? firebaseTask.dueDate.toDate().toISOString()
          : new Date(firebaseTask.dueDate).toISOString())
      : null,
    created_at: firebaseTask.createdAt instanceof Timestamp
      ? firebaseTask.createdAt.toDate().toISOString()
      : new Date(firebaseTask.createdAt).toISOString(),
    assignedUsers,
    approvalStatus: firebaseTask.approvalStatus,
    createdBy: firebaseTask.createdBy,
    projectId: firebaseTask.projectId,
    isArchived: firebaseTask.isArchived,
    is_archived: firebaseTask.isArchived, // Eski format desteği
  };
};

interface TaskAssignment {
  id: string;
  task_id: string;
  assigned_to: string;
  assigned_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

// Görev durum workflow'u - 4 aşama
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

const Tasks = () => {
  const { user, isSuperAdmin, isAdmin, isTeamLeader } = useAuth();
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');
  const taskTypeFromUrl = searchParams.get('type');
  const filterFromUrl = searchParams.get('filter');
  const viewFromUrl = searchParams.get('view');

  const [myTasks, setMyTasks] = useState<(Task & { assignment: TaskAssignment; assignedUsers?: Profile[] })[]>([]);
  const [createdTasks, setCreatedTasks] = useState<(Task & { assignedUsers?: Profile[] })[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<(Task & { assignedUsers?: Profile[] })[]>([]);
  const [userRequests, setUserRequests] = useState<UserRequest[]>([]);
  const [allTasks, setAllTasks] = useState<(Task & { assignedUsers?: Profile[] })[]>([]);
  const [allFirebaseTasks, setAllFirebaseTasks] = useState<FirebaseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  // Cache için state'ler
  const [cachedUsers, setCachedUsers] = useState<UserProfile[]>([]);
  const [cachedProjects, setCachedProjects] = useState<Project[]>([]);
  const [usersCacheTimestamp, setUsersCacheTimestamp] = useState<number>(0);
  const [projectsCacheTimestamp, setProjectsCacheTimestamp] = useState<number>(0);
  // Assignment cache - taskId -> assignments mapping (ref kullanarak re-render'ı önle)
  const assignmentsCacheRef = useRef<Map<string, FirebaseTaskAssignment[]>>(new Map());
  const assignmentsCacheTimestampRef = useRef<number>(0);
  // Filterable projects cache (ref kullanarak re-render'ı önle)
  const filterableProjectsCacheRef = useRef<Project[]>([]);
  const filterableProjectsCacheTimestampRef = useRef<number>(0);
  // Project task checks cache - projectId -> boolean (kullanıcının projede görevi var mı)
  const projectTaskChecksCacheRef = useRef<Map<string, boolean>>(new Map());
  const [selectedTaskInitialStatus, setSelectedTaskInitialStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  const [inlineFormVisible, setInlineFormVisible] = useState(false);
  const [inlineFormMode, setInlineFormMode] = useState<"create" | "edit">("create");
  const [inlineFormTaskId, setInlineFormTaskId] = useState<string | null>(null);
  const [inlineFormDefaultStatus, setInlineFormDefaultStatus] = useState<"pending" | "in_progress" | "completed">("pending");
  
  const openInlineForm = useCallback((
    mode: "create" | "edit",
    taskId?: string | null,
    status: "pending" | "in_progress" | "completed" = "pending"
  ) => {
    setInlineFormMode(mode);
    setInlineFormTaskId(taskId || null);
    setInlineFormDefaultStatus(status);
    setInlineFormVisible(true);
  }, []);
  
  const closeInlineForm = useCallback(() => {
    setInlineFormVisible(false);
    setInlineFormTaskId(null);
  }, []);
  
  const scrollToInlineForm = useCallback(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);
  
  const openTaskDetail = useCallback((taskId: string, initialStatus?: string) => {
    if (taskId === "new") {
      const normalizedStatus: "pending" | "in_progress" | "completed" =
        initialStatus && ["pending", "in_progress", "completed"].includes(initialStatus)
          ? (initialStatus as "pending" | "in_progress" | "completed")
          : "pending";
      openInlineForm("create", null, normalizedStatus);
      return;
    }
    
    // Eski modal yerine inline form kullan
    openInlineForm("edit", taskId);
  }, [openInlineForm]);
  
  const handleInlineSuccess = useCallback(async () => {
    // Real-time subscribe otomatik güncelleyecek
    closeInlineForm();
  }, [closeInlineForm]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openDropdownMenuId, setOpenDropdownMenuId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "board">(
    viewFromUrl === "board" ? "board" : "board"
  );
  const [focusFilter, setFocusFilter] = useState<"all" | "due_soon" | "overdue" | "high_priority">("all");
  // "all" ve "my-tasks" sekmeleri kullanılıyor (arşiv ayrı sayfada)
  const [activeListTab, setActiveListTab] = useState<"all" | "my-tasks" | "archived">(
    filterFromUrl === "my-tasks" ? "my-tasks" : "all"
  );
  const [statFilter, setStatFilter] = useState<"all" | "active" | "completed" | "risky" | "pending_approval" | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingAssignment, setRejectingAssignment] = useState<TaskAssignment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [projects, setProjects] = useState<Map<string, Project>>(new Map());
  const [filterableProjects, setFilterableProjects] = useState<Project[]>([]);

  useEffect(() => {
    // URL'deki filter parametresine göre sekme değiştir
    if (filterFromUrl === "my-tasks") {
      setActiveListTab("my-tasks");
    } else {
      setActiveListTab("all");
    }
  }, [filterFromUrl]);

  useEffect(() => {
    if (taskIdFromUrl && allTasks.length > 0) {
      const task = allTasks.find(t => t.id === taskIdFromUrl);
      if (task) {
        openTaskDetail(taskIdFromUrl, task.status);
      }
    }
  }, [taskIdFromUrl, allTasks, openTaskDetail]);

  // URL'den view parametresini oku ve viewMode'u ayarla
  useEffect(() => {
    if (viewFromUrl === "board") {
      setViewMode("board");
    } else if (viewFromUrl === "list") {
      setViewMode("list");
    }
    // viewFromUrl yoksa varsayılan olarak board kalır
  }, [viewFromUrl]);

  useEffect(() => {
    if (user) {
      // "Genel Görevler" sayfasındaysak (type=general), proje detay sayfası değil
      // Bu durumda projectId undefined olmalı ve fetchProject çağrılmamalı
      if (taskTypeFromUrl === 'general') {
        // "Genel Görevler" sayfasındaysak, proje filtresini "general" yap
        // Ama proje detay sayfası değil, bu yüzden fetchProject çağrılmayacak
        setProjectFilter("general");
      } else if (projectId) {
        // Sadece gerçek bir proje ID'si varsa (ve "general" değilse) fetchProject çağır
        fetchProject();
        // Proje detay sayfasındaysak, proje filtresini otomatik olarak o projeye ayarla
        setProjectFilter(projectId);
      } else {
        // Proje detay sayfasında değilsek ve "Genel Görevler" sayfasında değilsek, proje filtresini "all" yap
        setProjectFilter("all");
      }
      checkCreatePermission();
    }
  }, [user, projectId, taskTypeFromUrl]);

  // Gerçek zamanlı görev güncellemeleri için subscribe
  useEffect(() => {
    if (!user) return;

    // Eğer 'type=general' ise sadece "general" projesine ait görevleri al
    // "Benim Görevlerim" sekmesi için (filterFromUrl === 'my-tasks') tüm görevleri al (proje filtresi olmadan)
    // Proje detay sayfasındayken: projectId filtresi ile görevleri al
    // Diğer durumlarda tüm görevleri al
    const taskFilters = taskTypeFromUrl === 'general' 
      ? { projectId: "general" }
      : filterFromUrl === 'my-tasks'
        ? {} // "Benim Görevlerim" sekmesi için tüm görevleri al
        : projectId 
          ? { projectId } // Proje detay sayfasındayken projectId filtresi ile al
          : {}; // Normal "Tüm Görevler" sayfasında tüm görevleri al

    // Gerçek zamanlı dinleme başlat
    const unsubscribe = subscribeToTasks(taskFilters, async (firebaseTasks) => {
      try {
        // Kullanıcıları ve projeleri cache'den al veya yeniden yükle (cache 5 dakika geçerli)
        const now = Date.now();
        const USERS_PROJECTS_CACHE_DURATION = 5 * 60 * 1000; // 5 dakika
        const shouldRefreshUsers = !cachedUsers.length || (now - usersCacheTimestamp) > USERS_PROJECTS_CACHE_DURATION;
        const shouldRefreshProjects = !cachedProjects.length || (now - projectsCacheTimestamp) > USERS_PROJECTS_CACHE_DURATION;
        
        // Cache'den veya API'den al
        let allUsers = cachedUsers;
        let allProjectsData = cachedProjects;
        
        if (shouldRefreshUsers) {
          allUsers = await getAllUsers();
          setCachedUsers(allUsers);
          setUsersCacheTimestamp(now);
        }
        
        if (shouldRefreshProjects) {
          allProjectsData = await getProjects();
          setCachedProjects(allProjectsData);
          setProjectsCacheTimestamp(now);
        }
        
        const myRequestsData = await getRequests({ createdBy: user.id });

        // Projeleri Map'e çevir (hızlı erişim için)
        const projectsMap = new Map<string, Project>();
        (Array.isArray(allProjectsData) ? allProjectsData : []).forEach((p) => {
          if (p?.id) {
            projectsMap.set(p.id, p);
          }
        });
        setProjects(projectsMap);

        // Filtrelenebilir projeleri belirle (gizli projeler için yetki kontrolü) - Cache kullan
        const FILTERABLE_PROJECTS_CACHE_DURATION = 5 * 60 * 1000; // 5 dakika
        const shouldRefreshFilterableProjects = !filterableProjectsCacheRef.current.length || 
          (now - filterableProjectsCacheTimestampRef.current) > FILTERABLE_PROJECTS_CACHE_DURATION;
        
        let validProjects: Project[] = [];
        
        if (shouldRefreshFilterableProjects) {
          const filterableProjectsList = await Promise.allSettled(
            (Array.isArray(allProjectsData) ? allProjectsData : []).map(async (project) => {
              if (!project?.id) return null;
              
              try {
                // Otomatik oluşturulan "Gizli Görevler" projesini filtrele
                if (project.name?.toLowerCase() === "gizli görevler") {
                  return null;
                }
                
                // Gizli olmayan projeler herkes görebilir
                if (!project.isPrivate) return project;
                
                // Üst yöneticiler tüm projeleri görebilir
                if (isSuperAdmin) return project;
                
                // Yöneticiler tüm projeleri görebilir
                const userIsAdmin = user?.roles?.includes("admin");
                if (userIsAdmin) return project;
                
                // Oluşturan görebilir
                if (user?.id && project.createdBy === user.id) return project;
                
                // Ekip lideri için projede görevi olan kullanıcılar kontrolü yapılmaz
                const isTeamLeader = user?.roles?.includes("team_leader");
                if (isTeamLeader) {
                  return null;
                }
                
                // Projede görevi olan kullanıcılar görebilir - Cache kullan
                if (user?.id) {
                  // Cache'den kontrol et
                  const cachedCheck = projectTaskChecksCacheRef.current.get(project.id);
                  if (cachedCheck !== undefined) {
                    return cachedCheck ? project : null;
                  }
                  
                  try {
                    // Sadece görevlerin varlığını kontrol et - assignments kontrolünü atla (performans için)
                    const projectTasks = await getTasks({ projectId: project.id });
                    const hasTaskInProject = Array.isArray(projectTasks) && projectTasks.some((task) => {
                      if (!task) return false;
                      if (task.createdBy === user.id) return true;
                      if (Array.isArray(task.assignedUsers) && task.assignedUsers.includes(user.id)) return true;
                      return false;
                    });
                    
                    // Cache'e kaydet
                    projectTaskChecksCacheRef.current.set(project.id, hasTaskInProject);
                    
                    if (hasTaskInProject) return project;
                  } catch {
                    // Hata durumunda projeyi gösterme
                    projectTaskChecksCacheRef.current.set(project.id, false);
                  }
                }
                
                return null;
              } catch (error) {
                console.error(`Error processing project ${project.id}:`, error);
                return null;
              }
            })
          );
          
          // Promise.allSettled sonuçlarını işle
          validProjects = filterableProjectsList
            .filter((result): result is PromiseFulfilledResult<Project | null> => result.status === 'fulfilled')
            .map(result => result.value)
            .filter((p): p is Project => p !== null);
          
          // Cache'e kaydet
          filterableProjectsCacheRef.current = validProjects;
          filterableProjectsCacheTimestampRef.current = now;
        } else {
          // Cache'den al
          validProjects = filterableProjectsCacheRef.current;
        }
        
        setFilterableProjects(validProjects);

        setUserRequests(myRequestsData);

        // Her görev için assignments'ları al - Cache kullan ve sadece yeni/değişen görevler için al
        const ASSIGNMENTS_CACHE_DURATION = 2 * 60 * 1000; // 2 dakika
        const validFirebaseTasks = (Array.isArray(firebaseTasks) ? firebaseTasks : []).filter(t => t?.id);
        
        // Hangi görevler için assignment alınması gerektiğini belirle
        const tasksNeedingAssignments = validFirebaseTasks.filter((firebaseTask) => {
          const cached = assignmentsCacheRef.current.get(firebaseTask.id);
          const cacheAge = now - assignmentsCacheTimestampRef.current;
          // Cache yoksa veya cache eskiyse veya görev güncellenmişse assignment al
          return !cached || cacheAge > ASSIGNMENTS_CACHE_DURATION || 
            (firebaseTask.updatedAt && cached && firebaseTask.updatedAt.toMillis() > assignmentsCacheTimestampRef.current);
        });
        
        // Sadece gerekli görevler için assignment'ları al (batch)
        if (tasksNeedingAssignments.length > 0) {
          const newAssignments = await Promise.all(
            tasksNeedingAssignments.map(async (firebaseTask) => {
              if (!firebaseTask?.id) return null;
              try {
                const assignments = await getTaskAssignments(firebaseTask.id);
                return { taskId: firebaseTask.id, assignments: Array.isArray(assignments) ? assignments : [] };
              } catch (error) {
                console.error(`Error fetching assignments for task ${firebaseTask.id}:`, error);
                return { taskId: firebaseTask.id, assignments: [] };
              }
            })
          );
          
          // Cache'i güncelle
          newAssignments.forEach((item) => {
            if (item) {
              assignmentsCacheRef.current.set(item.taskId, item.assignments);
            }
          });
          assignmentsCacheTimestampRef.current = now;
        }
        
        // Tüm görevler için assignment'ları cache'den al
        const tasksWithAssignments = validFirebaseTasks.map((firebaseTask) => {
          const assignments = assignmentsCacheRef.current.get(firebaseTask.id) || [];
          return { firebaseTask, assignments };
        });
        
        // Null değerleri filtrele
        const validTasksWithAssignments = tasksWithAssignments.filter((t): t is { firebaseTask: FirebaseTask; assignments: FirebaseTaskAssignment[] } => t !== null);

        // Görevleri kategorilere ayır
        const myTasksList: (Task & { assignment: TaskAssignment; assignedUsers?: Profile[] })[] = [];
        const createdTasksList: (Task & { assignedUsers?: Profile[] })[] = [];
        const archivedTasksList: (Task & { assignedUsers?: Profile[] })[] = [];
        const allTasksList: (Task & { assignedUsers?: Profile[] })[] = [];

        validTasksWithAssignments.forEach(({ firebaseTask, assignments }) => {
          if (!firebaseTask) return;
          const uiTask = convertFirebaseTaskToUITask(firebaseTask, Array.isArray(assignments) ? assignments : [], Array.isArray(allUsers) ? allUsers : []);
          allTasksList.push(uiTask);

          // Arşivlenmiş görevler
          if (firebaseTask.isArchived) {
            archivedTasksList.push(uiTask);
            return;
          }

          // "Benim Görevlerim" sekmesi için: Sadece kullanıcıya atanan görevler
          const activeAssignments = (Array.isArray(assignments) ? assignments : []).filter((a) => a?.status !== "rejected");
          const myAssignment = activeAssignments.find((a) => a?.assignedTo === user?.id);

          if (myAssignment) {
            myTasksList.push({
              ...uiTask,
              assignment: {
                id: myAssignment.id,
                task_id: myAssignment.taskId,
                assigned_to: myAssignment.assignedTo,
                assigned_at: myAssignment.assignedAt instanceof Timestamp
                  ? myAssignment.assignedAt.toDate().toISOString()
                  : new Date(myAssignment.assignedAt).toISOString(),
                accepted_at: myAssignment.acceptedAt instanceof Timestamp
                  ? myAssignment.acceptedAt.toDate().toISOString()
                  : myAssignment.acceptedAt
                    ? new Date(myAssignment.acceptedAt).toISOString()
                    : null,
                completed_at: myAssignment.completedAt instanceof Timestamp
                  ? myAssignment.completedAt.toDate().toISOString()
                  : myAssignment.completedAt
                    ? new Date(myAssignment.completedAt).toISOString()
                    : null,
                rejected_at: myAssignment.rejectionReason ? new Date().toISOString() : undefined,
                rejection_reason: myAssignment.rejectionReason || undefined,
              },
            });
          }

          // Oluşturulan görevler
          if (firebaseTask.createdBy === user.id) {
            createdTasksList.push(uiTask);
          }
        });

        setMyTasks(myTasksList);
        setCreatedTasks(createdTasksList);
        setArchivedTasks(archivedTasksList);
        setAllTasks(allTasksList);
        setAllFirebaseTasks(firebaseTasks);
        setLoading(false);
      } catch (error: any) {
        console.error("Real-time tasks update error:", error);
        setLoading(false);
      }
    });

    // Cleanup: Component unmount olduğunda unsubscribe et
    return () => {
      unsubscribe();
    };
  }, [user, projectId, taskTypeFromUrl, filterFromUrl, isSuperAdmin]);


  const fetchProject = async () => {
    if (!projectId) return;
    try {
      const projectData = await getProjectById(projectId);
      setProject(projectData);
    } catch (error: any) {
      console.error("Fetch project error:", error);
      toast.error(error.message || "Proje yüklenirken hata oluştu");
    }
  };

  const checkCreatePermission = async () => {
    if (!user) {
      setCanCreate(false);
      return;
    }
    try {
      const departments = await getDepartments();
      // User'ı UserProfile formatına çevir
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        fullName: user.fullName,
        displayName: user.fullName,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        role: user.roles,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const hasPermission = await canCreateTask(userProfile, departments);
      setCanCreate(hasPermission);
    } catch (error) {
      console.error("Permission check error:", error);
      setCanCreate(false);
    }
  };

  // Listen to permission changes in real-time
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onPermissionCacheChange(() => {
      // Re-check permissions when they change
      checkCreatePermission();
    });
    return () => unsubscribe();
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Eğer 'type=general' ise sadece "general" projesine ait görevleri al
      // "Benim Görevlerim" sekmesi için (filterFromUrl === 'my-tasks') tüm görevleri al (proje filtresi olmadan)
      // Proje detay sayfasındayken: projectId filtresi ile görevleri al (yeni eklenen görevlerin görünmesi için)
      // Diğer durumlarda tüm görevleri al
      const taskFilters = taskTypeFromUrl === 'general' 
        ? { projectId: "general" }
        : filterFromUrl === 'my-tasks'
          ? {} // "Benim Görevlerim" sekmesi için tüm görevleri al
          : projectId 
            ? { projectId } // Proje detay sayfasındayken projectId filtresi ile al
            : {}; // Normal "Tüm Görevler" sayfasında tüm görevleri al
      
      // Tüm görevleri, kullanıcıları, projeleri ve talepleri paralel olarak al
      const [allFirebaseTasks, allUsers, allProjectsData, myRequestsData] = await Promise.all([
        getTasks(taskFilters),
        getAllUsers(),
        getProjects(),
        getRequests({ createdBy: user.id }),
      ]);

      // Projeleri Map'e çevir (hızlı erişim için)
      const projectsMap = new Map<string, Project>();
      allProjectsData.forEach((p) => {
        projectsMap.set(p.id, p);
      });
      setProjects(projectsMap);

      // Filtrelenebilir projeleri belirle (gizli projeler için yetki kontrolü) - Promise.allSettled ile güvenli
      const filterableProjectsList = await Promise.allSettled(
        (Array.isArray(allProjectsData) ? allProjectsData : []).map(async (project) => {
          if (!project?.id) return null;
          
          try {
            // Otomatik oluşturulan "Gizli Görevler" projesini filtrele
            if (project.name?.toLowerCase() === "gizli görevler") {
              return null;
            }
            
            // Gizli olmayan projeler herkes görebilir
            if (!project.isPrivate) return project;
            
            // Üst yöneticiler tüm projeleri görebilir
            if (isSuperAdmin) return project;
            
            // Yöneticiler tüm projeleri görebilir
            const userIsAdmin = user?.roles?.includes("admin");
            if (userIsAdmin) return project;
            
            // Oluşturan görebilir
            if (user?.id && project.createdBy === user.id) return project;
            
            // Ekip lideri için projede görevi olan kullanıcılar kontrolü yapılmaz (sadece kendi oluşturduğu gizli projeleri görebilir)
            const isTeamLeader = user?.roles?.includes("team_leader");
            if (isTeamLeader) {
              return null; // Ekip lideri sadece kendi oluşturduğu gizli projeleri görebilir (yukarıda kontrol edildi)
            }
            
            // Projede görevi olan kullanıcılar görebilir (ekip lideri hariç)
            if (user?.id) {
              try {
                const projectTasks = await getTasks({ projectId: project.id });
                const hasTaskInProject = Array.isArray(projectTasks) && projectTasks.some((task) => {
                  if (!task) return false;
                  if (task.createdBy === user.id) return true;
                  if (Array.isArray(task.assignedUsers) && task.assignedUsers.includes(user.id)) return true;
                  return false;
                });
                
                if (hasTaskInProject) return project;
                
                // Daha detaylı kontrol için assignments'ları da kontrol et
                for (const task of projectTasks) {
                  if (!task?.id) continue;
                  try {
                    const assignments = await getTaskAssignments(task.id);
                    const isAssigned = Array.isArray(assignments) && assignments.some(a => a?.assignedTo === user?.id);
                    if (isAssigned) return project;
                  } catch {
                    // Hata durumunda devam et
                  }
                }
              } catch {
                // Hata durumunda projeyi gösterme
              }
            }
            
            return null;
          } catch (error) {
            console.error(`Error processing project ${project.id}:`, error);
            return null;
          }
        })
      );
      
      // Promise.allSettled sonuçlarını işle
      const validProjects = filterableProjectsList
        .filter((result): result is PromiseFulfilledResult<Project | null> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter((p): p is Project => p !== null);
      
      setFilterableProjects(validProjects);

      setUserRequests(myRequestsData);

      // Her görev için assignments'ları al - Promise.allSettled ile güvenli
      const tasksWithAssignments = await Promise.allSettled(
        (Array.isArray(allFirebaseTasks) ? allFirebaseTasks : []).map(async (task) => {
          if (!task?.id) return null;
          try {
            const assignments = await getTaskAssignments(task.id);
            return { task, assignments: Array.isArray(assignments) ? assignments : [] };
          } catch (error) {
            console.error(`Error fetching assignments for task ${task.id}:`, error);
            return { task, assignments: [] };
          }
        })
      );
      
      // Promise.allSettled sonuçlarını işle
      const validTasksWithAssignments = tasksWithAssignments
        .filter((result): result is PromiseFulfilledResult<{ task: FirebaseTask; assignments: FirebaseTaskAssignment[] } | null> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value as { task: FirebaseTask; assignments: FirebaseTaskAssignment[] });

      // UI formatına çevir
      const incomingTasks = validTasksWithAssignments.map(({ task, assignments }) =>
        convertFirebaseTaskToUITask(task, Array.isArray(assignments) ? assignments : [], Array.isArray(allUsers) ? allUsers : [])
      );

      // Eğer 'type=general' ise, sadece "general" projesine ait görevleri göster
      // (projectId null veya undefined olan görevler dahil edilmemeli)
      let filteredIncomingTasks = taskTypeFromUrl === 'general' 
        ? incomingTasks.filter(t => t.projectId === "general" && t.projectId !== null && t.projectId !== undefined) 
        : incomingTasks;

      // KRİTİK: Eğer bir proje detay sayfasındaysak, sadece o projeye ait görevleri göster
      // Bu filtreleme en başta yapılmalı, diğer filtrelemelerden önce
      if (projectId) {
        const currentProject = projectsMap.get(projectId);
        filteredIncomingTasks = filteredIncomingTasks.filter((task) => {
          // projectId kesin olarak eşleşmeli, null veya undefined olmamalı
          if (!task.projectId || task.projectId !== projectId) {
            return false;
          }
          
          // KRİTİK: "general" projesine ait görevler hiçbir projede görünmemeli (sadece "Genel Görevler" sayfasında)
          if (task.projectId === "general") {
            return false; // "general" projesine ait görevler proje detay sayfalarında görünmemeli
          }
          
          // KRİTİK: Gizli projeler için sadece gizli görevler görünmeli
          // Bu kontrolü burada yapmalıyız, çünkü gizli olmayan görevler gizli projeye atanmış olsa bile görünmemeli
          if (currentProject?.isPrivate) {
            const firebaseTask = allFirebaseTasks.find((t) => t.id === task.id);
            // Gizli projede sadece gizli görevler görünmeli
            if (!firebaseTask?.isPrivate) {
              return false; // Gizli olmayan görevler gizli projede görünmemeli
            }
          }
          
          return true;
        });
      }
      
      // KRİTİK: Eğer 'type=general' ise, visibleTasks filtresinde de kontrol yapılmalı
      // Çünkü bazı görevler yukarıdaki filtrelemelerden geçmiş olabilir ama hala "general" projesine ait olmayabilir

      // Arşivlenmiş görevleri ayır
      // KRİTİK: Eğer bir proje detay sayfasındaysak veya "Genel Görevler" sayfasındaysak, 
      // arşivlenmiş görevler de o filtreye göre filtrelenmeli
      const archived = filteredIncomingTasks.filter((task) => {
        const firebaseTask = allFirebaseTasks.find((t) => t.id === task.id);
        if (firebaseTask?.isArchived !== true) {
          return false;
        }
        
        // Eğer bir proje detay sayfasındaysak, sadece o projeye ait arşivlenmiş görevleri göster
        if (projectId) {
          if (!task.projectId || task.projectId !== projectId) {
            return false;
          }
          // "general" projesine ait görevler proje detay sayfalarında görünmemeli
          if (task.projectId === "general") {
            return false;
          }
        }
        
        // Eğer "Genel Görevler" sayfasındaysak, sadece "general" projesine ait arşivlenmiş görevleri göster
        if (taskTypeFromUrl === 'general') {
          if (task.projectId !== "general") {
            return false;
          }
        }
        
        return true;
      });
      setArchivedTasks(archived);

      // Arşivlenmemiş görevleri göster
      const active = filteredIncomingTasks.filter((task) => {
        const firebaseTask = allFirebaseTasks.find((t) => t.id === task.id);
        return firebaseTask?.isArchived !== true;
      });

      // "Tüm Görevler" sekmesi için: Gizli görevleri ve onlyInMyTasks görevlerini tamamen filtrele
      // Eğer bir proje detay sayfasındaysak (projectId varsa), sadece o projeye ait görevleri göster
      // Eğer "Tüm Görevler" sekmesindeysek (projectId yoksa), gizli olmayan görevleri göster
      // Eğer "Genel Görevler" sayfasındaysak (taskTypeFromUrl === 'general'), sadece "general" projesine ait görevleri göster
      const visibleTasks = active.filter((task) => {
        const firebaseTask = allFirebaseTasks.find((t) => t.id === task.id);
        
        // onlyInMyTasks görevleri "Tüm Görevler" sekmesinde ve proje detay sayfasında görünmez
        if (firebaseTask?.onlyInMyTasks) {
          return false;
        }
        
        // KRİTİK: "Genel Görevler" sayfası kontrolü
        // Eğer 'type=general' ise, sadece "general" projesine ait görevler gösterilmeli
        if (taskTypeFromUrl === 'general') {
          // Sadece "general" projesine ait görevler gösterilmeli
          if (task.projectId !== "general" || !task.projectId) {
            return false;
          }
          // Gizli görevler "Genel Görevler" sayfasında gözükmemeli
          if (firebaseTask?.isPrivate) {
            return false;
          }
          return true;
        }
        
        // Eğer bir proje detay sayfasındaysak, sadece o projeye ait görevleri göster
        // NOT: Bu filtreleme zaten yukarıda yapıldı ama ekstra güvenlik için burada da kontrol ediyoruz
        if (projectId) {
          // KRİTİK: Görevin bu projeye ait olup olmadığını kesin olarak kontrol et
          // projectId null, undefined veya farklı bir değer ise gösterilmemeli
          if (!task.projectId || task.projectId !== projectId) {
            return false;
          }
          
          // KRİTİK: "general" projesine ait görevler hiçbir projede görünmemeli (sadece "Genel Görevler" sayfasında)
          if (task.projectId === "general") {
            return false; // "general" projesine ait görevler proje detay sayfalarında görünmemeli
          }
          
          // Gizli projeler için: Sadece gizli görevler görünmeli
          const currentProject = projectsMap.get(projectId);
          if (currentProject?.isPrivate) {
            // Gizli projede sadece gizli görevler görünmeli
            if (!firebaseTask?.isPrivate) {
              return false; // Gizli olmayan görevler gizli projede görünmemeli
            }
          }
          
          // Normal projelerde: Görev bu projeye ait
          return true;
        }
        
        // "Tüm Görevler" sekmesi: Gizli görevler hiç gözükmemeli
        if (firebaseTask?.isPrivate) {
          return false; // Gizli görevler "Tüm Görevler" sekmesinde gözükmemeli
        }
        
        // Gizli olmayan görevler "Tüm Görevler" sekmesinde gözükmeli
        return true;
      });

      // KURAL: Her görev sadece kendi bulunduğu projenin içerisinde ve "Tüm Görevler" sekmesinde gözükmeli
      // Gizli görevler sadece kendi projelerinde gözükmeli, "Tüm Görevler" sekmesinde gözükmemeli
      // Eğer bir proje detay sayfasındaysak, allTasks o projeye ait tüm görevleri içermeli
      // Eğer "Genel Görevler" sayfasındaysak, allTasks boş olmalı (çünkü myTasks kullanılacak)
      if (taskTypeFromUrl === 'general') {
        // "Genel Görevler" sayfasında "Tüm Görevler" sekmesi gösterilmemeli
        // Bu durumda allTasks boş olmalı
        setAllTasks([]);
      } else if (projectId) {
        // Proje detay sayfasında, o projeye ait tüm görevleri allTasks'a ekle
        // Bu sayede proje detay sayfasında tüm görevler görünebilir
        const projectTasks = visibleTasks.filter((task) => {
          // Zaten visibleTasks içinde proje filtresi uygulanmış, ama ekstra kontrol
          return task.projectId === projectId;
        });
        setAllTasks(projectTasks);
      } else {
        // Normal "Tüm Görevler" sayfasında tüm görevleri göster
        setAllTasks(visibleTasks);
      }

      // KRİTİK: "Benim Görevlerim" sekmesi için sadece o anki profil tarafından oluşturulan veya o profile atanmış görevler
      // 1. Kullanıcının oluşturduğu görevler
      // 2. Kullanıcıya atanan ve kabul edilen görevler
      // 3. onlyInMyTasks flag'li görevler (sadece oluşturan görebilir)
      const myAcceptedTasks: (Task & { assignment: TaskAssignment; assignedUsers?: Profile[] })[] = [];
      const addedTaskIds = new Set<string>(); // Duplicate'leri önlemek için
      
      for (const { task, assignments } of validTasksWithAssignments) {
        // Arşivlenmiş görevleri atla
        if (task.isArchived) {
          continue;
        }
        
        // KRİTİK: Eğer bir proje detay sayfasındaysak, sadece o projeye ait görevleri dahil et
        if (projectId) {
          if (!task.projectId || task.projectId !== projectId) {
            continue; // Bu projeye ait değilse atla
          }
          // "general" projesine ait görevler proje detay sayfalarında görünmemeli
          if (task.projectId === "general") {
            continue;
          }
        }
        
        // KRİTİK: Eğer "Genel Görevler" sayfasındaysak, sadece "general" projesine ait görevleri dahil et
        if (taskTypeFromUrl === 'general') {
          if (task.projectId !== "general") {
            continue; // "general" projesine ait değilse atla
          }
          // Gizli görevler "Genel Görevler" sayfasında görünmemeli
          if (task.isPrivate) {
            continue;
          }
        }
        
        // Zaten eklenmiş görevleri atla (duplicate kontrolü)
        if (addedTaskIds.has(task.id)) {
          continue;
        }
        
        // 1. Kullanıcının oluşturduğu görevler (oluşturan kişi her zaman görebilir)
        if (task.createdBy === user.id) {
          const uiTask = convertFirebaseTaskToUITask(task, assignments, allUsers);
          
          // Eğer kullanıcıya atanmış bir assignment varsa onu kullan, yoksa oluşturan olarak ekle
          const userAssignment = assignments.find(
            (a) => a.assignedTo === user.id && a.status === "accepted"
          );
          
          if (userAssignment) {
            // Kullanıcıya atanmış ve kabul edilmiş
            myAcceptedTasks.push({
              ...uiTask,
              assignment: {
                id: userAssignment.id,
                task_id: userAssignment.taskId,
                assigned_to: userAssignment.assignedTo,
                assigned_at: userAssignment.assignedAt instanceof Timestamp
                  ? userAssignment.assignedAt.toDate().toISOString()
                  : new Date(userAssignment.assignedAt).toISOString(),
                accepted_at: userAssignment.acceptedAt instanceof Timestamp
                  ? userAssignment.acceptedAt.toDate().toISOString()
                  : userAssignment.acceptedAt
                    ? new Date(userAssignment.acceptedAt).toISOString()
                    : null,
                completed_at: userAssignment.completedAt instanceof Timestamp
                  ? userAssignment.completedAt.toDate().toISOString()
                  : userAssignment.completedAt
                    ? new Date(userAssignment.completedAt).toISOString()
                    : null,
                rejected_at: undefined,
                rejection_reason: userAssignment.rejectionReason || null,
              },
            });
          } else {
            // Sadece oluşturan, atanmamış
          myAcceptedTasks.push({
            ...uiTask,
            assignment: {
              id: "",
              task_id: task.id,
              assigned_to: user.id,
              assigned_at: task.createdAt instanceof Timestamp
                ? task.createdAt.toDate().toISOString()
                : new Date(task.createdAt).toISOString(),
              accepted_at: task.createdAt instanceof Timestamp
                ? task.createdAt.toDate().toISOString()
                : new Date(task.createdAt).toISOString(),
              completed_at: null,
              rejected_at: undefined,
              rejection_reason: null,
            },
          });
          }
          
          addedTaskIds.add(task.id);
          continue;
        }
        
        // 2. Sadece benim görevlerim flag'ine sahip görevleri ekle (sadece oluşturan görebilir)
        // ÖNEMLİ: onlyInMyTasks flag'li görevler sadece oluşturan kişiye gösterilmeli
        if (task.onlyInMyTasks) {
          // Sadece oluşturan kişi görebilir (yukarıda zaten kontrol edildi ama ekstra güvenlik)
          if (task.createdBy === user.id) {
            const uiTask = convertFirebaseTaskToUITask(task, assignments, allUsers);
            myAcceptedTasks.push({
              ...uiTask,
              assignment: {
                id: "",
                task_id: task.id,
                assigned_to: user.id,
                assigned_at: task.createdAt instanceof Timestamp
                  ? task.createdAt.toDate().toISOString()
                  : new Date(task.createdAt).toISOString(),
                accepted_at: task.createdAt instanceof Timestamp
                  ? task.createdAt.toDate().toISOString()
                  : new Date(task.createdAt).toISOString(),
                completed_at: null,
                rejected_at: undefined,
                rejection_reason: null,
              },
            });
            addedTaskIds.add(task.id);
          }
          // onlyInMyTasks flag'li görevler için devam et (başka kontrol yapma)
          continue;
        }
        
        // 3. Kullanıcıya atanan ve kabul edilen görevleri bul
        // ÖNEMLİ: Sadece kabul edilen (accepted) görevler "Benim Görevlerim" sekmesinde gösterilmeli
        const userAssignment = assignments.find(
          (a) => a.assignedTo === user.id && a.status === "accepted"
        );
        
        if (userAssignment) {
          const uiTask = convertFirebaseTaskToUITask(task, assignments, allUsers);
            myAcceptedTasks.push({
              ...uiTask,
              assignment: {
                id: userAssignment.id,
                task_id: userAssignment.taskId,
                assigned_to: userAssignment.assignedTo,
                assigned_at: userAssignment.assignedAt instanceof Timestamp
                  ? userAssignment.assignedAt.toDate().toISOString()
                  : new Date(userAssignment.assignedAt).toISOString(),
                accepted_at: userAssignment.acceptedAt instanceof Timestamp
                  ? userAssignment.acceptedAt.toDate().toISOString()
                  : userAssignment.acceptedAt
                    ? new Date(userAssignment.acceptedAt).toISOString()
                    : null,
                completed_at: userAssignment.completedAt instanceof Timestamp
                  ? userAssignment.completedAt.toDate().toISOString()
                  : userAssignment.completedAt
                    ? new Date(userAssignment.completedAt).toISOString()
                    : null,
                rejected_at: undefined,
                rejection_reason: userAssignment.rejectionReason || null,
              },
            });
          addedTaskIds.add(task.id);
        }
      }
      
      setMyTasks(myAcceptedTasks);

      // Oluşturduğum görevler - BOŞ (artık gösterilmiyor, sadece proje altında ve "Tüm Görevler" sekmesinde gözüküyor)
      setCreatedTasks([]);
    } catch (error: any) {
      console.error("Fetch tasks error:", error);
      toast.error(error.message || "Görevler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingId(taskId);
    try {
      await deleteTask(taskId);
      toast.success("Görev başarıyla silindi");
      // Real-time subscribe otomatik güncelleyecek
    } catch (error: any) {
      console.error("Delete task error:", error);
      toast.error(error.message || "Görev silinirken hata oluştu");
    } finally {
      setDeletingId(null);
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    if (!user?.id) return;
    try {
      await archiveTask(taskId, user.id);
      toast.success("Görev arşivlendi");
      // Real-time subscribe otomatik güncelleyecek
    } catch (error: any) {
      console.error("Archive task error:", error);
      toast.error(error.message || "Görev arşivlenirken hata oluştu");
    }
  };

  const handleRejectTask = async () => {
    if (!rejectingAssignment || !rejectionReason.trim() || rejectionReason.trim().length < 20) {
      toast.error("Reddetme sebebi en az 20 karakter olmalıdır");
      return;
    }

    setRejecting(true);
    try {
      // Task ID'yi assignment'tan al
      const taskId = rejectingAssignment.task_id;
      await rejectTaskAssignment(taskId, rejectingAssignment.id, rejectionReason.trim());
      toast.success("Görev reddedildi");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setRejectingAssignment(null);
      // Real-time subscribe otomatik güncelleyecek
    } catch (error: any) {
      console.error("Reject task error:", error);
      toast.error(error.message || "Görev reddedilemedi");
    } finally {
      setRejecting(false);
    }
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
      pending: "Yapılacak",
      in_progress: "Devam Ediyor",
      completed: "Tamamlandı",
      approved: "Onaylandı",
    };
    return labels[status] || status;
  };

  // Tarih formatlama fonksiyonu
  const formatDateSafe = (dateInput?: string | Date | Timestamp | null) => {
    if (!dateInput) return "-";
    let date: Date;
    if (dateInput instanceof Timestamp) {
      date = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      date = new Date(dateInput);
    }
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 3) return "text-destructive";
    if (priority === 2) return "text-warning";
    return "text-muted-foreground";
  };

  const isTaskOverdue = (task: Task) => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    return isBefore(dueDate, new Date()) && task.status !== "completed";
  };

  const isTaskDueSoon = (task: Task) => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const today = startOfDay(new Date());
    const threeDaysAfter = addDays(today, 3);
    return (
      !isTaskOverdue(task) &&
      (isAfter(dueDate, today) || dueDate.getTime() === today.getTime()) &&
      isBefore(dueDate, threeDaysAfter) &&
      task.status !== "completed"
    );
  };

  const formatDueDate = (value?: string | null) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
      });
    } catch {
      return value;
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

  const filterTasks = (tasks: any[], skipFocusFilter: boolean = false, skipOtherFilters: boolean = false) => {
    return tasks.filter(task => {
      // Panoda sadece proje filtresi uygulanır, diğer filtreler atlanır
      if (skipOtherFilters) {
        // Proje filtresi
        let matchesProject = true;
        if (projectId) {
          // Proje detay sayfasındaysak, sadece o projeye ait görevler gösterilmeli
          matchesProject = task.projectId === projectId;
        } else {
          // Proje detay sayfasında değilsek, proje filtresine göre filtrele
          if (projectFilter === "all") {
            matchesProject = true;
          } else if (projectFilter === "general") {
            matchesProject = task.projectId === "general";
          } else {
            matchesProject = task.projectId === projectFilter;
          }
        }
        return matchesProject;
      }
      
      const searchLower = searchTerm.toLocaleLowerCase('tr-TR');
      const taskTitle = task.title?.toLocaleLowerCase('tr-TR') || "";
      const taskDesc = task.description?.toLocaleLowerCase('tr-TR') || "";
      
      const matchesSearch = taskTitle.includes(searchLower) || taskDesc.includes(searchLower);
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesFocus = skipFocusFilter ? true : (
        focusFilter === "all" ||
        (focusFilter === "due_soon" && isTaskDueSoon(task)) ||
        (focusFilter === "overdue" && isTaskOverdue(task)) ||
        (focusFilter === "high_priority" && task.priority >= 4)
      );
      
      // Proje filtresi
      // Eğer proje detay sayfasındaysak (projectId varsa), zaten o projeye ait görevler gösteriliyor
      // Bu durumda proje filtresi sadece ekstra bir filtreleme sağlar
      // Eğer proje detay sayfasında değilsek, proje filtresine göre filtrele
      let matchesProject = true;
      if (projectId) {
        // Proje detay sayfasındaysak, sadece o projeye ait görevler gösterilmeli
        matchesProject = task.projectId === projectId;
      } else if (taskTypeFromUrl === 'general') {
        // "Genel Görevler" sayfasındaysak, sadece "general" projesine ait görevler gösterilmeli
        matchesProject = task.projectId === "general";
      } else {
        // Proje detay sayfasında değilsek ve "Genel Görevler" sayfasında değilsek, proje filtresine göre filtrele
        if (projectFilter === "all") {
          matchesProject = true;
        } else if (projectFilter === "general") {
          matchesProject = task.projectId === "general";
        } else {
          matchesProject = task.projectId === projectFilter;
        }
      }
      
      // İstatistik filtrelemesi artık filteredAndSortedMyTasks, filteredAndSortedAllTasks ve filteredAndSortedArchivedTasks içinde uygulanıyor
      // Burada sadece diğer filtreleri uyguluyoruz
      return matchesSearch && matchesStatus && matchesFocus && matchesProject;
    });
  };

  const sortTasks = (tasks: any[]) => {
    if (!Array.isArray(tasks)) {
      return [];
    }
    return [...tasks].sort((a, b) => {
      if (sortBy === "priority") {
        return b.priority - a.priority;
      }
      if (sortBy === "due_date") {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  // İstatistiklerin baz aldığı görev setini hesapla (tüm görevler ve panoda kullanılacak)
  // Bu görev seti, istatistiklerin hesaplandığı ve görevlerin gösterildiği aynı kaynak olmalı
  const tasksForStatsAndDisplay = useMemo(() => {
    // Aktif sekmeye göre görev listesini belirle (sadece sekme bazlı filtreleme)
    let tasks: any[] = [];
    if (activeListTab === "archived") {
      tasks = archivedTasks;
    } else if (activeListTab === "my-tasks") {
      // "Benim Görevlerim" sekmesinde görevleri kullan
      tasks = myTasks.map((task) => {
        const { assignment, ...taskWithoutAssignment } = task;
        return taskWithoutAssignment;
      });
    } else {
      // "Tüm Görevler" sekmesi veya proje detay sayfası
      // Eğer "Genel Görevler" sayfasındaysak, myTasks kullan
      // Eğer proje detay sayfasındaysak, allTasks kullan (o projeye ait tüm görevler)
      if (taskTypeFromUrl === 'general') {
        tasks = myTasks.map((task) => {
          const { assignment, ...taskWithoutAssignment } = task;
          return taskWithoutAssignment;
        });
      } else if (projectId) {
        // Proje detay sayfasında, allTasks o projeye ait tüm görevleri içeriyor
        tasks = allTasks;
      } else {
        // Normal "Tüm Görevler" sayfasında
        tasks = allTasks;
      }
    }
    
    // Eğer statFilter seçiliyse, önce o filtreyi uygula
    if (statFilter && statFilter !== "all") {
      tasks = tasks.filter((task: any) => {
        if (statFilter === "active") {
          return task.status !== "completed";
        } else if (statFilter === "completed") {
          return task.status === "completed";
        } else if (statFilter === "risky") {
          return isTaskDueSoon(task) || isTaskOverdue(task);
        } else if (statFilter === "pending_approval") {
          return task.approvalStatus === "pending";
        }
        return true;
      });
    }
    
    return tasks;
  }, [allTasks, myTasks, archivedTasks, activeListTab, projectId, taskTypeFromUrl, statFilter]);

  const filteredAndSortedMyTasks = useMemo(() => {
    // İstatistiklerin baz aldığı görev setini kullan (tasksForStatsAndDisplay)
    // Ama sadece "Benim Görevlerim" sekmesi için
    if (activeListTab !== "my-tasks") {
      return [];
    }
    
    // İstatistiklerin kullandığı filtrelemeyi koru, sadece ek filtreleri uygula (arama, durum, odak, proje)
    // Liste görünümü için sıralama uygula, pano görünümü için sıralama gerekmez
    const filtered = filterTasks(tasksForStatsAndDisplay);
    return viewMode === "list" ? sortTasks(filtered) : filtered;
  }, [tasksForStatsAndDisplay, searchTerm, statusFilter, focusFilter, sortBy, viewMode, activeListTab, projectFilter]);

  const filteredAndSortedCreatedTasks = useMemo(() => {
    if (viewMode !== "list") return [];
    return sortTasks(filterTasks(createdTasks));
  }, [createdTasks, searchTerm, statusFilter, focusFilter, sortBy, viewMode]);

  const filteredAndSortedAllTasks = useMemo(() => {
    // İstatistiklerin baz aldığı görev setini kullan (tasksForStatsAndDisplay)
    // "Tüm Görevler" sekmesi veya proje detay sayfası için
    if (activeListTab !== "all" && (activeListTab || taskTypeFromUrl === 'general')) {
      return [];
    }
    
    // İstatistiklerin kullandığı filtrelemeyi koru, sadece ek filtreleri uygula (arama, durum, odak, proje)
    // Liste görünümü için tüm filtreleri uygula, pano görünümü için sadece proje filtresini uygula
    const filtered = viewMode === "board" 
      ? filterTasks(tasksForStatsAndDisplay, false, true) // Pano görünümünde sadece proje filtresi
      : filterTasks(tasksForStatsAndDisplay); // Liste görünümünde tüm filtreler
    return viewMode === "list" ? sortTasks(filtered) : filtered;
  }, [tasksForStatsAndDisplay, searchTerm, statusFilter, focusFilter, sortBy, viewMode, activeListTab, taskTypeFromUrl, projectFilter]);

  // Arşiv artık ayrı sayfada, burada kullanılmıyor

  // Görevler "Tüm Görevler" ve "Benim Görevlerim" sekmelerinde gözüküyor
  // Proje detay sayfasındayken "Tüm Görevler" sekmesi o projeye ait tüm görevleri gösterir (allTasks kullanır)
  // "Genel Görevler" sayfasındayken "Tüm Görevler" sekmesi yerine "Benim Görevlerim" gösterilir
  const listData = useMemo(() => {
    return activeListTab === "my-tasks"
      ? filteredAndSortedMyTasks
      : taskTypeFromUrl === 'general'
      ? filteredAndSortedMyTasks // "Genel Görevler" sayfasında "Tüm Görevler" yerine "Benim Görevlerim" göster
      : filteredAndSortedAllTasks; // Proje detay sayfasında veya normal "Tüm Görevler" sayfasında allTasks kullan
  }, [activeListTab, filteredAndSortedMyTasks, filteredAndSortedAllTasks, projectId, taskTypeFromUrl]);

    const boardTasks = useMemo(() => {
    // Listeyi baz alarak panoyu senkronize et
    // listData zaten tüm filtreleri (arama, durum, odak, proje, statFilter) uygulamış durumda
    
    // listData'dan görevleri al (zaten filtrelenmiş ve sıralanmış)
    // Arşivlenmiş görevleri board'dan çıkar (arşiv ayrı sayfada gösteriliyor)
    // allFirebaseTasks Map'e çevirerek daha hızlı lookup yap
    const firebaseTasksMap = new Map(allFirebaseTasks.map(t => [t.id, t]));
    let tasksToShow = listData.filter((task) => {
      // Task objesinde isArchived veya is_archived property'si varsa kontrol et
      // Ayrıca allFirebaseTasks'tan da kontrol et
      const firebaseTask = firebaseTasksMap.get(task.id);
      const isArchived = task.isArchived === true || task.is_archived === true || firebaseTask?.isArchived === true;
      return !isArchived;
    });
    
    // Pano formatına çevir (assignment'ı kaldır)
    return tasksToShow.map((task) => {
      const { assignment, ...taskWithoutAssignment } = task;
      return taskWithoutAssignment;
    });
  }, [listData, allFirebaseTasks]);

  // İstatistikler aktif sekmeye göre hesaplanmalı
  // İstatistikler, görevlerin gösterildiği aynı filtrelemeye sahip olmalı
  // Ancak statFilter hariç - istatistikler her zaman tüm görevler üzerinden hesaplanmalı
  const stats = useMemo(() => {
    // tasksForStatsAndDisplay kullan ama statFilter'ı kaldır
    // İstatistikler her zaman tüm görevler üzerinden hesaplanmalı (statFilter hariç)
    let tasksForStats: any[] = [];
    
    // Aktif sekmeye göre görev listesini belirle (statFilter hariç)
    if (activeListTab === "archived") {
      tasksForStats = archivedTasks;
    } else if (activeListTab === "my-tasks") {
      tasksForStats = myTasks.map((task) => {
        const { assignment, ...taskWithoutAssignment } = task;
        return taskWithoutAssignment;
      });
    } else {
      if (taskTypeFromUrl === 'general') {
        tasksForStats = myTasks.map((task) => {
          const { assignment, ...taskWithoutAssignment } = task;
          return taskWithoutAssignment;
        });
      } else if (projectId) {
        tasksForStats = allTasks;
      } else {
        tasksForStats = allTasks;
      }
    }
    
    // Proje filtresi uygula (eğer varsa)
    if (projectFilter && projectFilter !== "all") {
      if (projectFilter === "general") {
        tasksForStats = tasksForStats.filter((task: any) => task.projectId === "general" || !task.projectId);
      } else {
        tasksForStats = tasksForStats.filter((task: any) => task.projectId === projectFilter);
      }
    }
    
    // İstatistikleri hesapla (statFilter hariç - tüm görevler üzerinden)
    const total = tasksForStats.length;
    const active = tasksForStats.filter((task: Task) => task.status !== "completed").length;
    const completed = tasksForStats.filter((task: Task) => task.status === "completed").length;
    const dueSoon = tasksForStats.filter((task: Task) => isTaskDueSoon(task)).length;
    const overdue = tasksForStats.filter((task: Task) => isTaskOverdue(task)).length;
    const pendingApproval = tasksForStats.filter((task: any) => task.approvalStatus === "pending").length;
    return { total, active, completed, dueSoon, overdue, pendingApproval };
  }, [allTasks, myTasks, archivedTasks, activeListTab, projectId, taskTypeFromUrl, projectFilter]);

  // Quick filters için de stats ile aynı görev setini kullan (statFilter hariç)
  const quickFilters = useMemo(() => {
    // İstatistiklerle aynı görev setini kullan (statFilter hariç)
    let tasksForQuickFilters: any[] = [];
    
    if (activeListTab === "archived") {
      tasksForQuickFilters = archivedTasks;
    } else if (activeListTab === "my-tasks") {
      tasksForQuickFilters = myTasks.map((task) => {
        const { assignment, ...taskWithoutAssignment } = task;
        return taskWithoutAssignment;
      });
    } else {
      if (taskTypeFromUrl === 'general') {
        tasksForQuickFilters = myTasks.map((task) => {
          const { assignment, ...taskWithoutAssignment } = task;
          return taskWithoutAssignment;
        });
      } else if (projectId) {
        tasksForQuickFilters = allTasks;
      } else {
        tasksForQuickFilters = allTasks;
      }
    }
    
    // Proje filtresi uygula (eğer varsa)
    if (projectFilter && projectFilter !== "all") {
      if (projectFilter === "general") {
        tasksForQuickFilters = tasksForQuickFilters.filter((task: any) => task.projectId === "general" || !task.projectId);
      } else {
        tasksForQuickFilters = tasksForQuickFilters.filter((task: any) => task.projectId === projectFilter);
      }
    }
    
    return [
      { id: "all", label: "Tümü", description: "Tüm görevleri göster", count: tasksForQuickFilters.length },
      { id: "due_soon", label: "Yaklaşan", description: "3 gün içinde termin", count: tasksForQuickFilters.filter((task: Task) => isTaskDueSoon(task)).length },
      { id: "overdue", label: "Geciken", description: "Termin geçmiş görevler", count: tasksForQuickFilters.filter((task: Task) => isTaskOverdue(task)).length },
      { id: "high_priority", label: "Öncelikli", description: "Öncelik 4+", count: tasksForQuickFilters.filter((task: Task) => task.priority >= 4).length },
  ] as const;
  }, [allTasks, myTasks, archivedTasks, activeListTab, projectId, taskTypeFromUrl, projectFilter]);

  // Mevcut durumun index'ini bul
  const getCurrentStatusIndex = (status: string, approvalStatus?: "pending" | "approved" | "rejected") => {
    // Eğer görev tamamlandı ve onaylandıysa, "Onaylandı" aşamasını göster
    if (status === "completed" && approvalStatus === "approved") {
      return 3; // "Onaylandı" index'i
    }
    // Eğer görev tamamlandı ama onaylanmadıysa, "Tamamlandı" aşamasını göster
    if (status === "completed") {
      return 2; // "Tamamlandı" index'i
    }
    const index = taskStatusWorkflow.findIndex((statusItem) => statusItem.value === status);
    return index === -1 ? 0 : index;
  };

  // Bir sonraki durumu bul
  const getNextStatus = (currentStatus: string) => {
    const currentIndex = getCurrentStatusIndex(currentStatus);
    if (currentIndex === -1 || currentIndex >= taskStatusWorkflow.length - 1) {
      return null;
    }
    return taskStatusWorkflow[currentIndex + 1];
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    if (!user) return;

    try {
      // Yetki kontrolü: Sadece atanan kullanıcılar ve adminler durum değiştirebilir
      const task = allTasks.find(t => t.id === taskId);
      if (!task) {
        toast.error("Görev bulunamadı");
        return;
      }

      // Alt yetki kontrolü - durum değiştirme
      try {
        const { canPerformSubPermission } = await import("@/utils/permissions");
        const userProfile: UserProfile = {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          fullName: user.fullName,
          displayName: user.fullName,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          role: user.roles || [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        const hasPermission = await canPerformSubPermission(userProfile, "tasks", "canChangeStatus");
        if (!hasPermission && !isSuperAdmin && task.createdBy !== user.id) {
          // Görevin atanan kullanıcılarını kontrol et
          const taskAssignments = await getTaskAssignments(taskId);
          const assignedUserIds = taskAssignments.map(a => a.assignedTo);
          const isAssigned = assignedUserIds.includes(user.id);
          
          if (!isAssigned) {
            toast.error("Durum değiştirme yetkiniz yok");
            return;
          }
        }
      } catch (error) {
        console.error("Permission check error:", error);
        // Hata durumunda eski kontrolü yap
      }

      // Üst yönetici kontrolü - üst yöneticiler hariç kullanıcılar sadece kendilerine atanan görevlerin durumunu değiştirebilir
      if (!isSuperAdmin) {
        // Görevin atanan kullanıcılarını kontrol et
        const taskAssignments = await getTaskAssignments(taskId);
        const assignedUserIds = taskAssignments.map(a => a.assignedTo);
        const isAssigned = assignedUserIds.includes(user.id);
        
        if (!isAssigned) {
          const { showPermissionErrorToast } = await import("@/utils/toastHelpers");
          showPermissionErrorToast("update", "task");
          return;
        }
      }

      // Durum güncellemesini yap
      await updateTaskStatus(
        taskId,
        status as "pending" | "in_progress" | "completed"
      );
      
      // Başarı mesajı göster
      const statusNames: Record<string, string> = {
        pending: "Yapılacak",
        in_progress: "Devam Ediyor",
        completed: "Tamamlandı",
      };
      toast.success(`Görev durumu "${statusNames[status] || status}" olarak güncellendi`);
      
      // subscribeToTasks zaten real-time güncellemeleri dinliyor, 
      // bu yüzden fetchTasks() çağrısına gerek yok
    } catch (error: any) {
      console.error("Update task status error:", error);
      toast.error(error.message || "Durum güncellenemedi");
    }
  };

  // Onaya gönder butonu için handler
  const handleRequestApproval = async (taskId: string) => {
    if (!user) return;

    try {
      await requestTaskApproval(taskId, user.id);
      toast.success("Görev onay için yöneticiye gönderildi.");
    } catch (error: any) {
      console.error("Request approval error:", error);
      toast.error("Onay isteği gönderilemedi: " + (error?.message || "Bilinmeyen hata"));
    }
  };

  // Geri alma işlemi - sadece yöneticiler için, belirli bir duruma geri alır
  const handleRevertStatus = async (taskId: string, targetStatus: string) => {
    if (!user) return;

    if (!isSuperAdmin) {
      toast.error("Sadece yöneticiler durumu geri alabilir.");
      return;
    }

    // "Onaylandı" durumuna geri alınamaz
    if (targetStatus === "approved") {
      toast.error("Onaylandı durumuna geri alınamaz.");
      return;
    }

    try {
      const task = allTasks.find(t => t.id === taskId);
      if (!task) {
        toast.error("Görev bulunamadı");
        return;
      }

      // Eğer onay bekleniyorsa, geri alınamaz
      if (task.approvalStatus === "pending") {
        toast.error("Onay bekleyen görevler geri alınamaz.");
        return;
      }

      const currentIndex = getCurrentStatusIndex(task.status, task.approvalStatus);
      const targetIndex = taskStatusWorkflow.findIndex(s => s.value === targetStatus);
      
      if (targetIndex === -1) {
        toast.error("Geçersiz durum.");
        return;
      }

      // Sadece geriye doğru geri alınabilir (mevcut durumdan önceki durumlara)
      if (targetIndex >= currentIndex) {
        toast.error("Sadece önceki durumlara geri alabilirsiniz.");
        return;
      }

      const targetStatusItem = taskStatusWorkflow[targetIndex];
      await updateTaskStatus(
        taskId,
        targetStatusItem.value as "pending" | "in_progress" | "completed"
      );
      
      toast.success(`Görev durumu ${targetStatusItem.label} olarak geri alındı.`);
    } catch (error: any) {
      console.error("Revert status error:", error);
      toast.error("Durum geri alınamadı: " + (error?.message || "Bilinmeyen hata"));
    }
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

  return (
    <MainLayout disableScroll={false}>
      <div className={cn(
        "space-y-2 sm:space-y-3 md:space-y-4",
        viewMode === "board" ? "pb-0" : "pb-8"
      )}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {projectId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.history.back()}
                  className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground truncate">
                  {project ? `${project.name} - Görevler` : "Görevler"}
                </h1>
              <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
                  {project ? "Proje görevleri" : "Görev takibi ve yönetimi"}
                </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Tabs value={viewMode} onValueChange={(value) => {
              setViewMode(value as "list" | "board");
            }}>
              <TabsList className="h-9 sm:h-10">
                <TabsTrigger value="list" className="text-xs sm:text-sm min-h-[44px] sm:min-h-0">Liste</TabsTrigger>
                <TabsTrigger value="board" className="text-xs sm:text-sm min-h-[44px] sm:min-h-0">Pano</TabsTrigger>
              </TabsList>
            </Tabs>
            {canCreate && (
            <Button 
              className="gap-1.5 sm:gap-2 flex-1 sm:flex-initial min-h-[44px] sm:min-h-10 text-xs sm:text-sm" 
                onClick={async () => {
                  // Double-check permission before opening form
                  if (!user) return;
                  try {
                    const departments = await getDepartments();
                    const userProfile: UserProfile = {
                      id: user.id,
                      email: user.email,
                      emailVerified: user.emailVerified,
                      fullName: user.fullName,
                      displayName: user.fullName,
                      phone: user.phone,
                      dateOfBirth: user.dateOfBirth,
                      role: user.roles,
                      createdAt: Timestamp.now(),
                      updatedAt: Timestamp.now(),
                    };
                    const hasPermission = await canCreateTask(userProfile, departments);
                    if (!hasPermission) {
                      toast.error("Görev oluşturma yetkiniz yok");
                      return;
                    }
                    openInlineForm("create");
                  } catch (error) {
                    console.error("Permission check error:", error);
                    toast.error("Yetki kontrolü yapılamadı");
                  }
                }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Yeni Görev</span>
              <span className="sm:hidden">Yeni</span>
            </Button>
            )}
          </div>
        </div>

        <Dialog open={inlineFormVisible} onOpenChange={setInlineFormVisible}>
          <DialogContent className="!max-w-[100vw] sm:!max-w-[95vw] !w-[100vw] sm:!w-[95vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[2.5vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
            <div className="flex flex-col h-full min-h-0">
              <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0">
                <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground">
                  {inlineFormMode === "edit" ? "Görevi Düzenle" : "Yeni Görev"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {inlineFormMode === "edit" ? "Görev bilgilerini düzenleyin" : "Yeni görev oluşturun"}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
                <div className="max-w-full mx-auto h-full overflow-y-auto">
                  <div className="space-y-6">
                    {/* Status Timeline - Sadece edit modunda ve task verisi varsa göster */}
                    {inlineFormMode === "edit" && inlineFormTaskId && (() => {
                      const currentTask = allTasks.find(t => t.id === inlineFormTaskId);
                      if (!currentTask) return null;
                      
                      const currentStatus = currentTask.status || "pending";
                      const currentIndex = getCurrentStatusIndex(currentStatus, currentTask.approvalStatus);
                      const nextStatus = getNextStatus(currentStatus);
                      const usersMap = cachedUsers.reduce((acc, u) => {
                        acc[u.id] = u.fullName || u.email || u.id;
                        return acc;
                      }, {} as Record<string, string>);
                      
                      return (
                        <Card>
                          <CardHeader className="space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <CardTitle className="text-lg">Görev Durumu</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {(() => {
                                    // Eğer görev onaylandıysa
                                    if (currentStatus === "completed" && currentTask.approvalStatus === "approved") {
                                      return "Görev onaylandı ve tamamlandı.";
                                    }
                                    // Eğer görev tamamlandı ve onaya gönderildiyse
                                    if (currentStatus === "completed" && currentTask.approvalStatus === "pending") {
                                      return "Görev tamamlandı ve onay bekleniyor.";
                                    }
                                    // Eğer görev tamamlandı ama onaya gönderilmediyse
                                    if (currentStatus === "completed") {
                                      return "Görev tamamlandı. Onaya göndermek için butona tıklayın.";
                                    }
                                    // Diğer durumlar için normal mesaj
                                    if (nextStatus) {
                                      return `${getStatusLabel(currentStatus)} aşamasındasınız. Sıradaki adım: ${nextStatus.label}`;
                                    }
                                    return "Workflow tamamlandı.";
                                  })()}
                                </p>
                              </div>
                              <div className="text-xs text-muted-foreground text-right">
                                Son güncelleyen: {(currentTask as any).statusUpdatedBy 
                                  ? (usersMap[(currentTask as any).statusUpdatedBy] || (currentTask as any).statusUpdatedBy)
                                  : (user?.fullName || "-")}
                                <br />
                                <span className="text-[11px]">
                                  {(currentTask as any).statusUpdatedAt ? formatDateSafe((currentTask as any).statusUpdatedAt as any) : ""}
                                </span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 sm:p-6">
                            <div className="space-y-4">
                              {/* Status Timeline */}
                              <div className="flex items-center justify-between overflow-x-auto overflow-y-visible pt-2 pb-4">
                                {taskStatusWorkflow.map((statusItem, index) => {
                                  const Icon = statusItem.icon;
                                  const isActive = index === currentIndex;
                                  const isCompleted = index < currentIndex;
                                  // Onaylandı durumuna geri alınamaz, sadece yöneticiler diğer durumlara geri alabilir
                                  const canRevert = isSuperAdmin && index < currentIndex && 
                                                    statusItem.value !== "approved" && 
                                                    currentTask.approvalStatus !== "pending";
                                  
                                  return (
                                    <div key={statusItem.value} className="flex items-center flex-1 min-w-0">
                                      <div className="flex flex-col items-center flex-1 min-w-0">
                                        <div
                                          onClick={canRevert ? () => handleRevertStatus(inlineFormTaskId, statusItem.value) : undefined}
                                          className={`
                                            w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all relative z-10
                                            ${isActive ? "bg-primary text-primary-foreground border-primary scale-110" : ""}
                                            ${isCompleted ? "bg-green-500 text-white border-green-500" : ""}
                                            ${!isActive && !isCompleted ? "bg-muted border-muted-foreground/20" : ""}
                                            ${canRevert ? "cursor-pointer hover:scale-110 hover:shadow-md" : ""}
                                          `}
                                          title={canRevert ? `${statusItem.label} durumuna geri al` : undefined}
                                        >
                                          <Icon className={`h-5 w-5 ${isActive || isCompleted ? "text-white" : statusItem.color}`} />
                                        </div>
                                        <p className={`text-xs mt-2 text-center font-medium ${isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
                                          {statusItem.label}
                                        </p>
                                      </div>
                                      {index < taskStatusWorkflow.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Next Status Button / Onaya Gönder Button */}
                              {(() => {
                                // Eğer görev onaylandıysa, buton gösterilmez
                                if (currentStatus === "completed" && currentTask.approvalStatus === "approved") {
                                  return null;
                                }
                                
                                // Tamamlandı durumunda ve onaya gönderilmemişse "Onaya Gönder" butonu göster
                                if (currentStatus === "completed" && currentTask.approvalStatus !== "pending" && currentTask.approvalStatus !== "approved") {
                                  return (
                                    <div className="flex justify-center pt-4 border-t">
                                      <Button
                                        onClick={() => handleRequestApproval(inlineFormTaskId)}
                                        className="gap-2"
                                      >
                                        <Send className="h-4 w-4" />
                                        Onaya Gönder
                                      </Button>
                                    </div>
                                  );
                                }
                                
                                // Diğer durumlar için normal geçiş butonu (Tamamlandı'ya geçiş)
                                if (nextStatus && currentTask.approvalStatus !== "pending" && currentTask.approvalStatus !== "approved") {
                                  // Tamamlandı'ya geçiş yapılırken direkt geçiş yapılır (onaya gönder butonu ayrı gösterilir)
                                  if (nextStatus.value === "completed") {
                                    return (
                                      <div className="flex justify-center pt-4 border-t">
                                        <Button
                                          onClick={() => handleStatusChange(inlineFormTaskId, nextStatus.value)}
                                          className="gap-2"
                                        >
                                          {(() => {
                                            const NextIcon = nextStatus.icon;
                                            return <NextIcon className="h-4 w-4" />;
                                          })()}
                                          {nextStatus.label} Durumuna Geç
                                        </Button>
                                      </div>
                                    );
                                  }
                                }
                                
                                return null;
                              })()}

                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}
                    
                    <TaskInlineForm
                      key={`${inlineFormMode}-${inlineFormTaskId || "new"}`}
                      mode={inlineFormMode}
                      projectId={projectId || null}
                      taskId={inlineFormMode === "edit" ? inlineFormTaskId : undefined}
                      defaultStatus={inlineFormDefaultStatus}
                      onCancel={closeInlineForm}
                      onSuccess={handleInlineSuccess}
                      className="border-0 shadow-none p-0"
                      showOnlyInMyTasks={activeListTab === "my-tasks"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 flex-shrink-0">
          {[
            { 
              label: "Toplam Görev", 
              value: stats.total, 
              sub: "Genel yük", 
              badgeClass: "text-primary",
              filterType: "all" as const,
              onClick: () => {
                setStatusFilter("all");
                setFocusFilter("all");
                setStatFilter("all");
                setViewMode("list");
              }
            },
            { 
              label: "Aktif", 
              value: stats.active, 
              sub: "Devam eden süreçler", 
              badgeClass: "text-amber-600",
              filterType: "active" as const,
              onClick: () => {
                setStatusFilter("all");
                setFocusFilter("all");
                setStatFilter("active");
                setViewMode("list");
              }
            },
            { 
              label: "Tamamlanan", 
              value: stats.completed, 
              sub: "Kapatılan işler", 
              badgeClass: "text-emerald-600",
              filterType: "completed" as const,
              onClick: () => {
                setStatusFilter("completed");
                setFocusFilter("all");
                setStatFilter("completed");
                setViewMode("list");
              }
            },
            { 
              label: "Riskli (Yaklaşan/Geciken)", 
              value: stats.dueSoon + stats.overdue, 
              sub: `${stats.dueSoon} yaklaşan · ${stats.overdue} geciken`, 
              badgeClass: "text-destructive",
              filterType: "risky" as const,
              onClick: () => {
                setStatusFilter("all");
                setFocusFilter("all");
                setStatFilter("risky");
                setViewMode("list");
              }
            },
            { 
              label: "Onay Bekleyen", 
              value: stats.pendingApproval, 
              sub: "Onay için bekleyen görevler", 
              badgeClass: "text-yellow-600",
              filterType: "pending_approval" as const,
              onClick: () => {
                setStatusFilter("all");
                setFocusFilter("all");
                setStatFilter("pending_approval");
                setViewMode("list");
              }
            },
          ].map((stat) => (
            <Card 
              key={stat.label} 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 border-2"
              onClick={stat.onClick}
            >
              <CardContent className="pt-2 pb-2 px-2.5 sm:pt-3 sm:pb-3 sm:px-3 md:pt-4 md:pb-4 md:px-4">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-1.5 truncate">{stat.label}</p>
                <div className="text-lg sm:text-xl md:text-2xl font-bold mb-0.5 sm:mb-1">{stat.value}</div>
                <p className={`text-[10px] sm:text-xs font-medium ${stat.badgeClass} line-clamp-2 hidden sm:block`}>{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {viewMode === "list" ? (
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            <Card className="border-2 relative z-10 overflow-visible">
              <CardContent className="p-3 sm:p-4 md:p-6 overflow-visible">
                <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4">
                  {quickFilters.map((filter) => (
                    <Button
                      key={filter.id}
                      variant={focusFilter === filter.id ? "default" : "outline"}
                      className="justify-between w-full sm:w-auto sm:min-w-[160px] md:min-w-[180px] min-h-[44px] sm:min-h-10 text-xs sm:text-sm"
                      onClick={() => setFocusFilter(filter.id)}
                    >
                      <span className="flex items-center gap-1.5 sm:gap-2">
                        {filter.id === "high_priority" ? <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                        <span className="truncate">{filter.label}</span>
                      </span>
                      <Badge variant={focusFilter === filter.id ? "secondary" : "outline"} className="text-[10px] sm:text-xs ml-1">{filter.count}</Badge>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 relative z-10 overflow-visible">
              <CardContent className="p-3 sm:p-4 md:p-6 overflow-visible">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
                  {/* Arama Kutusu */}
                  <div className="flex-1 min-w-0 w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]">
                    <SearchInput
                      placeholder="Görev ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-9 sm:h-10 min-h-[44px] sm:min-h-0 text-xs sm:text-sm"
                    />
                  </div>
                  
                  {/* Durum Filtresi */}
                  <div className="w-full sm:w-auto sm:min-w-[160px] md:min-w-[180px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full h-9 sm:h-10 min-h-[44px] sm:min-h-0 text-xs sm:text-sm">
                        <SelectValue placeholder="Durum filtrele" />
                      </SelectTrigger>
                      <SelectContent className="z-[10003]">
                        <SelectItem value="all">Tüm Durumlar</SelectItem>
                        <SelectItem value="pending">Beklemede</SelectItem>
                        <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                        <SelectItem value="completed">Tamamlandı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Sıralama */}
                  <div className="w-full sm:w-auto sm:min-w-[160px] md:min-w-[180px]">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full h-9 sm:h-10 min-h-[44px] sm:min-h-0 text-xs sm:text-sm">
                        <SelectValue placeholder="Sırala" />
                      </SelectTrigger>
                      <SelectContent className="z-[10003]">
                        <SelectItem value="created_at">Tarihe Göre</SelectItem>
                        <SelectItem value="priority">Önceliğe Göre</SelectItem>
                        <SelectItem value="due_date">Bitiş Tarihine Göre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Proje Filtresi - Sadece "Tüm Görevler" sekmesinde göster */}
                  {activeListTab === "all" && (
                    <div className="w-full sm:w-auto sm:min-w-[160px] md:min-w-[180px]">
                      <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="w-full h-9 sm:h-10 min-h-[44px] sm:min-h-0 text-xs sm:text-sm">
                          <SelectValue placeholder="Proje Seçiniz" />
                        </SelectTrigger>
                        <SelectContent className="z-[10003]">
                          <SelectItem value="all">Tüm Projeler</SelectItem>
                          <SelectItem value="general">Genel Görevler</SelectItem>
                          {filterableProjects
                            .filter(p => p.name?.toLowerCase() !== "genel görevler" && p.name?.toLowerCase() !== "genel")
                            .map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.isPrivate ? (
                                  <span className="flex items-center gap-2">
                                    <Lock className="h-3 w-3" />
                                    {project.name}
                                  </span>
                                ) : (
                                  project.name
                                )}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Filtreleri Temizle */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { 
                      setSearchTerm(""); 
                      setStatusFilter("all"); 
                      setSortBy("created_at"); 
                      setFocusFilter("all"); 
                      setStatFilter(null); 
                      setProjectFilter("all");
                    }} 
                    className="h-9 sm:h-10 min-h-[44px] sm:min-h-0 text-xs sm:text-sm"
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Temizle</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 relative z-0 overflow-visible">
              <CardHeader className="pb-3 sm:pb-4 md:pb-6 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6">
                <div className="space-y-3 sm:space-y-4 sm:flex sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg md:text-xl mb-1 sm:mb-2">
                      {activeListTab === "archived"
                        ? "Arşivlenmiş Görevler"
                        : activeListTab === "my-tasks"
                        ? "Benim Görevlerim"
                        : "Tüm Görevler"}{" "}
                      <span className="text-sm sm:text-base md:text-lg text-muted-foreground font-normal">({listData.length})</span>
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {activeListTab === "my-tasks"
                        ? "Bana atanan ve kabul ettiğim görevler"
                        : "Tüm projelerdeki görevlerin listesi"}
                    </p>
                  </div>
                  <Tabs value={activeListTab} onValueChange={(value) => setActiveListTab(value as "all" | "my-tasks")} className="w-full sm:w-auto">
                    <TabsList className="w-full flex flex-col sm:flex-row h-auto">
                      <TabsTrigger value="all" className="flex-1 min-h-[44px] sm:min-h-0 text-xs sm:text-sm">
                        Tüm Görevler ({filteredAndSortedAllTasks.length})
                      </TabsTrigger>
                      <TabsTrigger value="my-tasks" className="flex-1 min-h-[44px] sm:min-h-0 text-xs sm:text-sm">
                        Benim Görevlerim ({filteredAndSortedMyTasks.length})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-4 md:px-6 pb-4 sm:pb-6 overflow-visible">
                {/* "Bana Atanan" sekmesi kaldırıldı - görevler sadece proje altında ve "Tüm Görevler" sekmesinde gözüküyor */}
                {false && userRequests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Taleplerim
                    </h3>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {userRequests.map(req => (
                            <div key={req.id} className="p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate('/requests')}>
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline">{req.type === 'leave' ? 'İzin' : req.type === 'purchase' ? 'Satın Alma' : 'Diğer'}</Badge>
                                    <Badge className={
                                        req.status === 'approved' ? 'bg-emerald-500' : 
                                        req.status === 'rejected' ? 'bg-destructive' : 'bg-yellow-500'
                                    }>
                                        {req.status === 'approved' ? 'Onaylandı' : req.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                                    </Badge>
                                </div>
                                <h4 className="font-medium truncate">{req.title}</h4>
                                <p className="text-sm text-muted-foreground truncate">{req.description}</p>
                                <div className="mt-2 text-xs text-muted-foreground">
                                    {req.createdAt instanceof Object ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : '-'}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="my-4 border-b" />
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Görevlerim
                    </h3>
                  </div>
                )}

                {(Array.isArray(listData) ? listData : []).map((task: any) => {
                  const assignment = (task as Task & { assignment?: TaskAssignment }).assignment;
                  // "Bana Atanan" sekmesi kaldırıldı - assignment durumları artık gösterilmiyor
                  const isPendingAssignment = false;
                  const isAcceptedAssignment = false;
                  const isRejectedAssignment = false;
                  const overdue = isTaskOverdue(task);
                  const dueSoon = isTaskDueSoon(task);

                  return (
                    <div
                      key={task.id}
                      className="p-4 sm:p-6 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow-md relative group"
                    >
                      {/* 3 Nokta Menü - Sağ Üst Köşe */}
                      {(isSuperAdmin || isAdmin || isTeamLeader || task.createdBy === user?.id) && (
                        <div 
                          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-[9999]"
                          style={{
                            visibility: 'visible',
                            display: 'block',
                            zIndex: 9999,
                          }}
                        >
                          <DropdownMenu 
                            open={openDropdownMenuId === task.id} 
                            onOpenChange={(open) => {
                              if (open) {
                                setOpenDropdownMenuId(task.id);
                              } else {
                                setOpenDropdownMenuId(null);
                              }
                            }}
                          >
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                id={`task-menu-trigger-${task.id}`}
                                data-menu-open={openDropdownMenuId === task.id ? "true" : "false"}
                                className={cn(
                                  "task-menu-trigger",
                                  "inline-flex items-center justify-center",
                                  "h-8 w-8 sm:h-9 sm:w-9 rounded-lg",
                                  "transition-colors duration-200",
                                  "border",
                                  openDropdownMenuId === task.id 
                                    ? "border-border bg-muted/80 opacity-100" 
                                    : "border-transparent bg-transparent opacity-70 hover:opacity-100",
                                  "hover:bg-muted/80 hover:border-border",
                                  "focus:bg-muted/80 focus:border-border focus:outline-none focus:ring-0",
                                  "active:bg-muted/80 active:border-border"
                                )}
                                style={{
                                  WebkitTapHighlightColor: 'transparent',
                                  backgroundColor: openDropdownMenuId === task.id ? 'hsl(var(--muted) / 0.8)' : 'transparent',
                                  borderColor: openDropdownMenuId === task.id ? 'hsl(var(--border))' : 'transparent',
                                  opacity: openDropdownMenuId === task.id ? 1 : 0.7,
                                  visibility: 'visible',
                                  display: 'inline-flex',
                                  pointerEvents: 'auto',
                                  position: 'relative',
                                  zIndex: 9999,
                                } as React.CSSProperties}
                                onMouseEnter={(e) => {
                                  const btn = e.currentTarget;
                                  if (openDropdownMenuId !== task.id) {
                                    btn.style.opacity = '1';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  const btn = e.currentTarget;
                                  if (openDropdownMenuId !== task.id) {
                                    btn.style.opacity = '0.7';
                                  }
                                }}
                              >
                                <MoreVertical 
                                  className="h-4 w-4 sm:h-[18px] sm:w-[18px] stroke-[2.5] text-foreground" 
                                  style={{
                                    opacity: 1,
                                    visibility: 'visible',
                                    display: 'block',
                                  }}
                                />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              align="end" 
                              onClick={(e) => e.stopPropagation()}
                              className="w-44 rounded-lg shadow-lg border border-border bg-popover p-1.5 z-[10000]"
                              onCloseAutoFocus={(e) => e.preventDefault()}
                            >
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownMenuId(null);
                                  openInlineForm("edit", task.id, task.status as "pending" | "in_progress" | "completed");
                                  scrollToInlineForm();
                                }}
                                className="cursor-pointer rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                              >
                                <Edit className="h-4 w-4 mr-2.5 stroke-[2]" />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownMenuId(null);
                                  handleArchiveTask(task.id);
                                }}
                                className="cursor-pointer rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                              >
                                <Archive className="h-4 w-4 mr-2.5 stroke-[2]" />
                                {task.isArchived || task.is_archived ? "Arşivden Çıkar" : "Arşivle"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownMenuId(null);
                                  if (confirm(`"${task.title}" görevini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
                                    handleDeleteTask(task.id);
                                  }
                                }}
                                className="cursor-pointer rounded-md px-3 py-2.5 text-sm font-medium text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="h-4 w-4 mr-2.5 stroke-[2]" />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => openTaskDetail(task.id, task.status)}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            {getStatusIcon(task.status)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-semibold text-lg">{task.title}</h3>
                                {task.projectId && projects.has(task.projectId) && (
                                  <>
                                    <Badge 
                                      variant="outline" 
                                      className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-300 hover:from-blue-100 hover:to-indigo-100 transition-all shadow-sm"
                                    >
                                      <Folder className="h-3 w-3 mr-1.5" />
                                      <span className="font-semibold text-xs">
                                        {projects.get(task.projectId)?.name}
                                      </span>
                                    </Badge>
                                    {/* Gizli etiketi sadece gizli proje sayfasında göster */}
                                    {projectId && projects.get(projectId)?.isPrivate && (
                                      <Badge variant="outline" className="gap-1">
                                        <Lock className="h-3 w-3" />
                                        Gizli
                                      </Badge>
                                    )}
                                  </>
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
                            {isPendingAssignment && <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Atama Onayı Bekleniyor</Badge>}
                            {isAcceptedAssignment && <Badge variant="outline" className="bg-green-50 text-green-700">Kabul Edildi</Badge>}
                            {isRejectedAssignment && <Badge variant="outline" className="bg-red-50 text-red-700">Reddedildi</Badge>}
                            {task.approvalStatus === "pending" && (
                              <Badge className="bg-yellow-100 text-yellow-900 border-yellow-300">Görev Onayı Bekleniyor</Badge>
                            )}
                            {task.approvalStatus === "approved" && (
                              <Badge className="bg-green-100 text-green-900 border-green-300">Görev Onaylandı</Badge>
                            )}
                            {task.approvalStatus === "rejected" && (
                              <Badge className="bg-red-100 text-red-900 border-red-300">Görev Onayı Reddedildi</Badge>
                            )}
                            {task.production_order_number && (
                              <Badge variant="outline" className="bg-primary/5 text-primary">
                                Sipariş #{task.production_order_number}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                            {task.due_date && (
                              <span className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4" />
                                Termin: {formatDueDate(task.due_date)}
                              </span>
                            )}
                            {!!task.assignedUsers?.length && (
                              <span className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {task.assignedUsers.length} kişi
                              </span>
                            )}
                          </div>
                          {task.assignedUsers && task.assignedUsers.length > 0 && (
                            <div className="flex items-center gap-2 mt-4">
                              <div className="flex -space-x-2">
                                {(Array.isArray(task.assignedUsers) ? task.assignedUsers.slice(0, 4) : []).map((user) => (
                                  <Avatar key={user.id} className="h-7 w-7 border-2 border-background">
                                    <AvatarFallback className="text-[11px]">
                                      {getInitials(user.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                              {task.assignedUsers.length > 4 && (
                                <span className="text-xs text-muted-foreground">
                                  +{task.assignedUsers.length - 4} daha
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* "Oluşturduklarım" sekmesi kaldırıldı */}
                          {false && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={deletingId === task.id}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {deletingId === task.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Görevi Sil</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    "{task.title}" görevini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>İptal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id);
                                    }}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Sil
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {isPendingAssignment && assignment && (
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={async () => {
                                  try {
                                    await acceptTaskAssignment(assignment.task_id, assignment.id);
                                    toast.success("Görev kabul edildi");
                                    // Real-time subscribe otomatik güncelleyecek
                                  } catch (error: any) {
                                    console.error("Accept task error:", error);
                                    toast.error(error.message || "Görev kabul edilemedi");
                                  }
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Kabul Et
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setRejectingAssignment(assignment);
                                  setRejectionReason("");
                                  setRejectDialogOpen(true);
                                }}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reddet
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {listData.length === 0 && (
                  <div className="py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30">
                    <div className="flex flex-col items-center gap-3">
                      <CheckSquare className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-base font-medium">
                        {searchTerm || statusFilter !== "all" || focusFilter !== "all"
                          ? "Filtre kriterlerinize uyan görev bulunamadı"
                          : activeListTab === "my-tasks"
                          ? "Henüz size atanan ve kabul ettiğiniz görev yok"
                          : "Henüz görev bulunmuyor"}
                      </p>
                      {(searchTerm || statusFilter !== "all" || focusFilter !== "all") && (
                        <p className="text-sm text-muted-foreground/70">
                          Filtreleri değiştirerek tekrar deneyin
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
            {/* Panoda sadece proje filtresi gösterilir - Sadece "Tüm Görevler" sekmesinde */}
            {activeListTab === "all" && (
              <Card className="border-2 flex-shrink-0">
                <CardContent className="pt-3 sm:pt-4 md:pt-6 pb-3 sm:pb-4 md:pb-6 px-3 sm:px-4 md:px-6">
                  <div className="grid grid-cols-1 gap-2 sm:gap-3 md:gap-4">
                    {/* Proje Filtresi - Sadece "Tüm Görevler" sekmesinde göster */}
                    <div className="w-full">
                      <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="w-full h-9 sm:h-10">
                          <SelectValue placeholder="Proje filtrele" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tüm Projeler</SelectItem>
                          <SelectItem value="general">Genel Görevler</SelectItem>
                          {filterableProjects
                            .filter(p => p.name?.toLowerCase() !== "genel görevler" && p.name?.toLowerCase() !== "genel")
                            .map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.isPrivate ? (
                                  <span className="flex items-center gap-2">
                                    <Lock className="h-3 w-3" />
                                    {project.name}
                                  </span>
                                ) : (
                                  project.name
                                )}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          <div>
            <TaskBoard
              tasks={boardTasks}
              onTaskClick={(taskId, initialStatus) => openTaskDetail(taskId, initialStatus)}
              onStatusChange={handleStatusChange}
              showProjectFilter={activeListTab === "all"}
            />
          </div>
          </div>
        )}


        {/* Reject Task Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Görevi Reddet</DialogTitle>
              <DialogDescription>
                Görevi reddetmek için lütfen en az 20 karakterlik bir sebep belirtin.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection_reason">
                  Reddetme Sebebi <span className="text-destructive">*</span> (En az 20 karakter)
                </Label>
                <Textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Görevi neden reddettiğinizi açıklayın (en az 20 karakter)..."
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {rejectionReason.length}/20 karakter
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason("");
                  setRejectingAssignment(null);
                }}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectTask}
                disabled={rejecting || rejectionReason.trim().length < 20}
              >
                {rejecting ? "İşleniyor..." : "Reddet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Tasks;

