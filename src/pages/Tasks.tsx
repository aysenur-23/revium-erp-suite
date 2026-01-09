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
import { usePermissions } from "@/hooks/usePermissions";
<<<<<<< HEAD
import { useTaskPermissions } from "@/hooks/useTaskPermissions";
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
import {
  getTasks,
  subscribeToTasks,
  deleteTask,
  updateTaskStatus,
  updateTask,
  assignTask,
  getTaskAssignments,
  acceptTaskAssignment,
  rejectTaskAssignment,
<<<<<<< HEAD
=======
  requestTaskApproval,
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  archiveTask,
  getTaskComments,
  Task as FirebaseTask,
  TaskAssignment as FirebaseTaskAssignment,
} from "@/services/firebase/taskService";
import { getRequests, Request as UserRequest } from "@/services/firebase/requestService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { Timestamp } from "firebase/firestore";
<<<<<<< HEAD
import { CheckCircle2, Clock, AlertCircle, Users, Trash2, Loader2, X, Flame, CalendarDays, Plus, Archive, Lock, CheckSquare, MoreVertical, CircleDot, Edit, Check, Square, BarChart3, ChevronUp, ChevronLeft, Bell, Filter, Zap, LayoutGrid, ArrowLeft, Folder, ChevronDown, Home, ChevronRight, List, RefreshCw, ArrowRight, MessageSquare, Activity, Minus } from "lucide-react";
=======
import { CheckCircle2, Clock, AlertCircle, Users, Trash2, Loader2, X, Flame, CalendarDays, Plus, Archive, Lock, CheckSquare, MoreVertical, CircleDot, Send, Edit, Check, Square, BarChart3, ChevronUp, ChevronLeft, Bell, Filter, Zap, LayoutGrid, ArrowLeft, Folder, ChevronDown, Home, ChevronRight, List, RefreshCw, ArrowRight, MessageSquare, Activity, Minus } from "lucide-react";
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
<<<<<<< HEAD
=======
import { TaskDetailModal } from "@/components/Tasks/TaskDetailModal";
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
import { TaskInlineForm } from "@/components/Tasks/TaskInlineForm";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskBoard } from "@/components/Tasks/TaskBoard";
import { addDays, isAfter, isBefore, startOfDay } from "date-fns";
<<<<<<< HEAD
import { canCreateTask, canCreateProject, canDeleteProject, isMainAdmin, canUpdateResource, canViewPrivateTask, canEditTask, canDeleteTask, isAdmin } from "@/utils/permissions";
=======
import { canCreateTask, canCreateProject, canDeleteProject, isMainAdmin, canUpdateResource, canViewPrivateTask, canEditTask } from "@/utils/permissions";
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
import { getDepartments } from "@/services/firebase/departmentService";
import { onPermissionCacheChange } from "@/services/firebase/rolePermissionsService";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getProjectById, getProjects, createProject, deleteProject, Project } from "@/services/firebase/projectService";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getPriorityOption, convertOldPriorityToNew, convertNewPriorityToOld, PRIORITY_OPTIONS, PriorityLevel } from "@/utils/priority";
// PieChart kaldırıldı - artık kullanılmıyor
<<<<<<< HEAD
// Yeni modüler import'lar
import {
  getFirstName as getFirstNameHelper,
  normalizeStatus as normalizeStatusHelper,
  getStatusLabel as getStatusLabelHelper,
  formatDateSafe as formatDateSafeHelper,
  isTaskOverdue as isTaskOverdueHelper,
  isTaskDueSoon as isTaskDueSoonHelper,
  getInitials as getInitialsHelper,
  formatTaskKey as formatTaskKeyHelper,
  getPriorityDisplay as getPriorityDisplayHelper,
  getPriorityColor as getPriorityColorHelper,
  getStatusConfig,
  TASK_STATUS_WORKFLOW,
} from "@/utils/taskHelpers";
import { logError, getErrorMessage } from "@/utils/errorHandling";

=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

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

// Tam isimden sadece ismi çıkar (soyisim olmadan)
const getFirstName = (fullName: string | null | undefined): string => {
  if (!fullName) return "";
  return fullName.split(" ")[0] || fullName;
};

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
<<<<<<< HEAD
          id: user.id,
          full_name: user.fullName || user.displayName,
          email: user.email,
        }
=======
            id: user.id,
            full_name: user.fullName || user.displayName,
            email: user.email,
          }
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD
        ? firebaseTask.dueDate.toDate().toISOString()
        : new Date(firebaseTask.dueDate).toISOString())
=======
          ? firebaseTask.dueDate.toDate().toISOString()
          : new Date(firebaseTask.dueDate).toISOString())
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);
<<<<<<< HEAD

=======
  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  // Permission state'lerini Firestore'dan kontrol et
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        setCanUpdate(false);
        return;
      }
      try {
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
  const { canRead } = usePermissions();
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');
  const taskTypeFromUrl = searchParams.get('type');
  const filterFromUrl = searchParams.get('filter');
  const viewFromUrl = searchParams.get('view');
  const projectFromUrl = searchParams.get('project');

  const [myTasks, setMyTasks] = useState<(Task & { assignment: TaskAssignment; assignedUsers?: Profile[] })[]>([]);
  const [createdTasks, setCreatedTasks] = useState<(Task & { assignedUsers?: Profile[] })[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<(Task & { assignedUsers?: Profile[] })[]>([]);
  const [userRequests, setUserRequests] = useState<UserRequest[]>([]);
  const [allTasks, setAllTasks] = useState<(Task & { assignedUsers?: Profile[] })[]>([]);
  const [allFirebaseTasks, setAllFirebaseTasks] = useState<FirebaseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  // Optimistic updates için state
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, { status: string; timestamp: number }>>(new Map());
  // Toplu işlemler için state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  // Advanced search için state
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [advancedSearchFilters, setAdvancedSearchFilters] = useState({
    title: "",
    description: "",
    status: "all",
    priority: "all",
    projectId: "all",
    assignedTo: "all",
    dueDateFrom: "",
    dueDateTo: "",
  });
  // Performans optimizasyonu: Liste görünümü için görünen öğe sayısı
  const [visibleItemsCount, setVisibleItemsCount] = useState(50);
  const listContainerRef = useRef<HTMLDivElement>(null);
  // Mini dashboard için state
  const [statsExpanded, setStatsExpanded] = useState(false); // Başlangıçta kapalı
  // Browser notifications için state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const previousTaskStatusesRef = useRef<Map<string, string>>(new Map());
  // Undo özelliği için state
  const [deletedTasks, setDeletedTasks] = useState<Array<{ task: FirebaseTask; timestamp: number }>>([]);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Filtreler için collapsible state
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [advancedFiltersExpanded, setAdvancedFiltersExpanded] = useState(false);
  // Uyarılar için state
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingAssignmentsCount, setPendingAssignmentsCount] = useState(0);
  const [upcomingDeadlinesCount, setUpcomingDeadlinesCount] = useState(0);
  // Cache için state'ler
  const [cachedUsers, setCachedUsers] = useState<UserProfile[]>([]);
  const [cachedProjects, setCachedProjects] = useState<Project[]>([]);
  const [usersCacheTimestamp, setUsersCacheTimestamp] = useState<number>(0);
  const [projectsCacheTimestamp, setProjectsCacheTimestamp] = useState<number>(0);
  // Comment counts cache - taskId -> comment count
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());
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
<<<<<<< HEAD
  const [viewMode, setViewMode] = useState<"list" | "board">(
    viewFromUrl === "list" ? "list" : (viewFromUrl === "board" ? "board" : "list")
  );

=======
  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  const closeInlineForm = useCallback(() => {
    setInlineFormVisible(false);
    setInlineFormTaskId(null);
  }, []);
<<<<<<< HEAD

=======
  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  const scrollToInlineForm = useCallback(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);
<<<<<<< HEAD

=======
  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  const openTaskDetail = useCallback((taskId: string, initialStatus?: string) => {
    if (taskId === "new") {
      const normalizedStatus: "pending" | "in_progress" | "completed" =
        initialStatus && ["pending", "in_progress", "completed"].includes(initialStatus)
          ? (initialStatus as "pending" | "in_progress" | "completed")
          : "pending";
      openInlineForm("create", null, normalizedStatus);
      return;
    }
<<<<<<< HEAD

    // Hem liste hem pano görünümünde TaskInlineForm açılacak
    openInlineForm("edit", taskId);
  }, [openInlineForm]);

=======
    
    // Görev detayı açıldığında liste görünümüne geç
    setViewMode("list");
    setSelectedTaskId(taskId);
    
    // Eski modal yerine inline form kullan
    openInlineForm("edit", taskId);
  }, [openInlineForm]);
  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  const handleInlineSuccess = useCallback(async () => {
    // Real-time subscribe otomatik güncelleyecek
    closeInlineForm();
  }, [closeInlineForm]);
  const [searchTerm, setSearchTerm] = useState("");
  // Arama geçmişi ve favori filtreler için state
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [favoriteFilters, setFavoriteFilters] = useState<Array<{ name: string; filters: Record<string, unknown> }>>([]);
  const [recentlyViewedTasks, setRecentlyViewedTasks] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  // Jira tarzı sıralama için state'ler
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openDropdownMenuId, setOpenDropdownMenuId] = useState<string | null>(null);
<<<<<<< HEAD
=======
  const [viewMode, setViewMode] = useState<"list" | "board">(
    viewFromUrl === "list" ? "list" : (viewFromUrl === "board" ? "board" : "list")
  );
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  // Sabit sütun genişlikleri
  const columnWidths = {
    title: 250,
    project: 180,
    status: 140,
    assignee: 140,
    priority: 110,
    dueDate: 110,
  };
  const [focusFilter, setFocusFilter] = useState<"all" | "due_soon" | "overdue" | "high_priority">("all");
  // Filtre tipi: all, my-tasks, general, pool, archive
  const [activeFilter, setActiveFilter] = useState<"all" | "my-tasks" | "general" | "pool" | "archive">(
<<<<<<< HEAD
    filterFromUrl === "my-tasks" ? "my-tasks" :
      filterFromUrl === "general" ? "general" :
        filterFromUrl === "pool" ? "pool" :
          filterFromUrl === "archive" ? "archive" : "all"
=======
    filterFromUrl === "my-tasks" ? "my-tasks" : 
    filterFromUrl === "general" ? "general" :
    filterFromUrl === "pool" ? "pool" :
    filterFromUrl === "archive" ? "archive" : "all"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  );
  // Seçili proje: "all", "general", veya proje ID'si
  const [selectedProject, setSelectedProject] = useState<string>(
    projectFromUrl || (projectId ? projectId : (taskTypeFromUrl === 'general' ? "general" : "all"))
  );
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [assignedUserFilter, setAssignedUserFilter] = useState<string>("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingAssignment, setRejectingAssignment] = useState<TaskAssignment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [canCreateProjectState, setCanCreateProjectState] = useState(false);
  const [canDeleteProjectState, setCanDeleteProjectState] = useState(false);
  const [canAccessTeamManagement, setCanAccessTeamManagement] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Map<string, Project>>(new Map());
  const [filterableProjects, setFilterableProjects] = useState<Project[]>([]);
  // En son işlem yapılan projeyi takip et
  const lastUsedProjectRef = useRef<string | null>(null);
  // Proje dropdown için state
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");

  useEffect(() => {
    // URL'deki filter parametresine göre sekme değiştir
    if (filterFromUrl === "my-tasks") {
      setActiveFilter("my-tasks");
    } else if (filterFromUrl === "general") {
      setActiveFilter("general");
    } else if (filterFromUrl === "pool") {
      setActiveFilter("pool");
    } else if (filterFromUrl === "archive") {
      setActiveFilter("archive");
    } else {
      setActiveFilter("all");
    }
  }, [filterFromUrl]);

  // URL'deki project parametresine göre seçili projeyi ayarla
  useEffect(() => {
    if (projectFromUrl) {
      setSelectedProject(projectFromUrl);
      setProjectFilter(projectFromUrl === "general" ? "general" : projectFromUrl);
    } else if (projectId) {
      setSelectedProject(projectId);
      setProjectFilter(projectId);
    } else if (taskTypeFromUrl === 'general') {
      setSelectedProject("general");
      setProjectFilter("general");
    } else {
      setSelectedProject("all");
      setProjectFilter("all");
    }
  }, [projectFromUrl, projectId, taskTypeFromUrl]);

  useEffect(() => {
    if (taskIdFromUrl && allTasks.length > 0) {
      const task = allTasks.find(t => t.id === taskIdFromUrl);
      if (task && selectedTaskId !== taskIdFromUrl) {
        // Sadece farklı bir görev seçildiyse aç (sonsuz döngüyü önle)
        openTaskDetail(taskIdFromUrl, task.status);
      }
    }
  }, [taskIdFromUrl, allTasks, openTaskDetail, selectedTaskId]);

  // Klavye kısayolları ve navigasyon
  const [focusedTaskIndex, setFocusedTaskIndex] = useState<number>(-1);
  const taskRefs = useRef<(HTMLElement | null)[]>([]);


  // URL'den view parametresini oku ve viewMode'u ayarla (sadece ilk yüklemede)
  const viewModeInitialized = useRef(false);
  useEffect(() => {
    if (!viewModeInitialized.current) {
      if (viewFromUrl === "board") {
        setViewMode("board");
      } else if (viewFromUrl === "list") {
        setViewMode("list");
      } else {
        // viewFromUrl yoksa varsayılan olarak list açılır
        setViewMode("list");
      }
      viewModeInitialized.current = true;
    }
  }, [viewFromUrl]);
<<<<<<< HEAD
=======
  
  // Modal açıldığında liste görünümüne geç
  useEffect(() => {
    if (selectedTaskId && viewMode === "board") {
      setViewMode("list");
    }
  }, [selectedTaskId, viewMode]);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

  // View mode değiştiğinde URL'i güncelle (sadece kullanıcı etkileşimi sonrası)
  useEffect(() => {
    // İlk yüklemede URL güncellemesi yapma
    if (!viewModeInitialized.current) return;
<<<<<<< HEAD

    const newParams = new URLSearchParams(searchParams);
    const currentView = newParams.get("view");
    const newView = viewMode === "board" ? "board" : "list";

=======
    
    const newParams = new URLSearchParams(searchParams);
    const currentView = newParams.get("view");
    const newView = viewMode === "board" ? "board" : "list";
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Sadece değişiklik varsa güncelle (sonsuz döngüyü önle)
    if (currentView !== newView) {
      if (newView === "list") {
        // Liste varsayılan olduğu için URL'den kaldır
        newParams.delete("view");
      } else {
        newParams.set("view", newView);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [viewMode, searchParams, setSearchParams]);

  // Seçili proje değiştiğinde URL'i güncelle
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    const currentProject = newParams.get("project");
    const newProject = selectedProject === "all" ? null : selectedProject;
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Sadece değişiklik varsa güncelle (sonsuz döngüyü önle)
    if (currentProject !== newProject) {
      if (newProject === null) {
        newParams.delete("project");
      } else {
        newParams.set("project", newProject);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [selectedProject, searchParams, setSearchParams]);

  // Filtre değiştiğinde URL'i güncelle
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    const currentFilter = newParams.get("filter");
    const newFilter = activeFilter === "all" ? null : activeFilter;
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Sadece değişiklik varsa güncelle (sonsuz döngüyü önle)
    if (currentFilter !== newFilter) {
      if (newFilter === null) {
        newParams.delete("filter");
      } else {
        newParams.set("filter", newFilter);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [activeFilter, searchParams, setSearchParams]);

  // Browser notifications izni kontrolü
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

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

  // Kullanıcıları ve projeleri yükle (subscription callback'inden ayrı)
  useEffect(() => {
    if (!user) return;
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    const loadUsersAndProjects = async () => {
      const now = Date.now();
      const USERS_PROJECTS_CACHE_DURATION = 5 * 60 * 1000; // 5 dakika
      const shouldRefreshUsers = !cachedUsers.length || (now - usersCacheTimestamp) > USERS_PROJECTS_CACHE_DURATION;
      const shouldRefreshProjects = !cachedProjects.length || (now - projectsCacheTimestamp) > USERS_PROJECTS_CACHE_DURATION;
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      if (shouldRefreshUsers) {
        try {
          const allUsers = await getAllUsers();
          setCachedUsers(allUsers);
          setUsersCacheTimestamp(now);
        } catch (error: unknown) {
          if (import.meta.env.DEV) {
            console.error("Error loading users:", error);
          }
        }
      }
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      if (shouldRefreshProjects) {
        try {
          const allProjectsData = await getProjects();
          setCachedProjects(allProjectsData);
          setProjectsCacheTimestamp(now);
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // Projeleri Map'e çevir (hızlı erişim için)
          const projectsMap = new Map<string, Project>();
          (Array.isArray(allProjectsData) ? allProjectsData : []).forEach((p) => {
            if (p?.id) {
              projectsMap.set(p.id, p);
            }
          });
          setProjects(projectsMap);
        } catch (error: unknown) {
          if (import.meta.env.DEV) {
            console.error("Error loading projects:", error);
          }
        }
      }
    };
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    loadUsersAndProjects();
  }, [user, cachedUsers.length, cachedProjects.length, usersCacheTimestamp, projectsCacheTimestamp]);

  // Requests'i yükle
  useEffect(() => {
    if (!user?.id) return;
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    const loadRequests = async () => {
      try {
        const myRequestsData = await getRequests({ createdBy: user.id });
        setUserRequests(myRequestsData);
      } catch (error) {
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.error("Error loading requests:", error);
          }
        }
      }
    };
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    loadRequests();
  }, [user?.id]);

  // Filtrelenebilir projeleri hesapla (ayrı useEffect - performans için)
  useEffect(() => {
    if (!user || !cachedProjects.length) return;
<<<<<<< HEAD

    const calculateFilterableProjects = async () => {
      const now = Date.now();
      const FILTERABLE_PROJECTS_CACHE_DURATION = 5 * 60 * 1000; // 5 dakika
      const shouldRefresh = !filterableProjectsCacheRef.current.length ||
        (now - filterableProjectsCacheTimestampRef.current) > FILTERABLE_PROJECTS_CACHE_DURATION;

=======
    
    const calculateFilterableProjects = async () => {
      const now = Date.now();
      const FILTERABLE_PROJECTS_CACHE_DURATION = 5 * 60 * 1000; // 5 dakika
      const shouldRefresh = !filterableProjectsCacheRef.current.length || 
        (now - filterableProjectsCacheTimestampRef.current) > FILTERABLE_PROJECTS_CACHE_DURATION;
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      if (!shouldRefresh) {
        // Cache'den al
        const lastUsedProjectId = localStorage.getItem('lastUsedProjectId');
        if (lastUsedProjectId) {
          lastUsedProjectRef.current = lastUsedProjectId;
        }
        const sortedProjects = [...filterableProjectsCacheRef.current].sort((a, b) => {
          if (a.id === lastUsedProjectRef.current) return -1;
          if (b.id === lastUsedProjectRef.current) return 1;
          return 0;
        });
        setFilterableProjects(sortedProjects);
        return;
      }
<<<<<<< HEAD

      const filterableProjectsList = await Promise.allSettled(
        cachedProjects.map(async (project) => {
          if (!project?.id) return null;

=======
      
      const filterableProjectsList = await Promise.allSettled(
        cachedProjects.map(async (project) => {
          if (!project?.id) return null;
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          try {
            if (project.name?.toLowerCase() === "gizli görevler") return null;
            if (!project.isPrivate) return project;
            if (isSuperAdmin) return project;
            if (user?.id && project.createdBy === user.id) return project;
            // Team Leader kontrolü - Firestore'dan (canUpdate projects)
            // Bu kontrol async olduğu için burada yapılamaz, yukarıda zaten kontrol ediliyor
<<<<<<< HEAD

=======
            
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            if (user?.id) {
              const cachedCheck = projectTaskChecksCacheRef.current.get(project.id);
              if (cachedCheck !== undefined) {
                return cachedCheck ? project : null;
              }
<<<<<<< HEAD

=======
              
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              try {
                const projectTasks = await getTasks({ projectId: project.id });
                const hasTaskInProject = Array.isArray(projectTasks) && projectTasks.some((task) => {
                  if (!task) return false;
                  if (task.createdBy === user.id) return true;
                  if (Array.isArray(task.assignedUsers) && task.assignedUsers.includes(user.id)) return true;
                  return false;
                });
                projectTaskChecksCacheRef.current.set(project.id, hasTaskInProject);
                if (hasTaskInProject) return project;
              } catch {
                projectTaskChecksCacheRef.current.set(project.id, false);
              }
            }
            return null;
          } catch (error: unknown) {
            if (import.meta.env.DEV) {
              console.error(`Error processing project ${project.id}:`, error);
            }
            return null;
          }
        })
      );
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      const validProjects = filterableProjectsList
        .filter((result): result is PromiseFulfilledResult<Project | null> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter((p): p is Project => p !== null);
<<<<<<< HEAD

      filterableProjectsCacheRef.current = validProjects;
      filterableProjectsCacheTimestampRef.current = now;

=======
      
      filterableProjectsCacheRef.current = validProjects;
      filterableProjectsCacheTimestampRef.current = now;
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      const lastUsedProjectId = localStorage.getItem('lastUsedProjectId');
      if (lastUsedProjectId) {
        lastUsedProjectRef.current = lastUsedProjectId;
      }
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      const sortedProjects = [...validProjects].sort((a, b) => {
        if (a.id === lastUsedProjectRef.current) return -1;
        if (b.id === lastUsedProjectRef.current) return 1;
        return 0;
      });
<<<<<<< HEAD

      setFilterableProjects(sortedProjects);
    };

=======
      
      setFilterableProjects(sortedProjects);
    };
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    calculateFilterableProjects();
  }, [user, cachedProjects.length, isSuperAdmin]);

  // Gerçek zamanlı görev güncellemeleri için subscribe
  useEffect(() => {
    if (!user) return;

    // Eğer 'type=general' ise sadece "general" projesine ait görevleri al
    // "Benim Görevlerim" sekmesi için (filterFromUrl === 'my-tasks') tüm görevleri al (proje filtresi olmadan)
    // Proje detay sayfasındayken: projectId filtresi ile görevleri al
    // Diğer durumlarda tüm görevleri al
<<<<<<< HEAD
    const taskFilters = taskTypeFromUrl === 'general'
      ? { projectId: "general" }
      : filterFromUrl === 'my-tasks'
        ? {} // "Benim Görevlerim" sekmesi için tüm görevleri al
        : projectId
=======
    const taskFilters = taskTypeFromUrl === 'general' 
      ? { projectId: "general" }
      : filterFromUrl === 'my-tasks'
        ? {} // "Benim Görevlerim" sekmesi için tüm görevleri al
        : projectId 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          ? { projectId } // Proje detay sayfasındayken projectId filtresi ile al
          : {}; // Normal "Tüm Görevler" sayfasında tüm görevleri al

    // Gerçek zamanlı dinleme başlat
    const unsubscribe = subscribeToTasks(taskFilters, async (firebaseTasks) => {
      try {
        const now = Date.now();
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Kullanıcıları ve projeleri cache'den al (ayrı useEffect'lerde yükleniyor)
        const allUsers = cachedUsers;

        // Her görev için assignments'ları al - Cache kullan ve sadece yeni/değişen görevler için al
        const ASSIGNMENTS_CACHE_DURATION = 2 * 60 * 1000; // 2 dakika
        const validFirebaseTasks = (Array.isArray(firebaseTasks) ? firebaseTasks : []).filter(t => t?.id);
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Hangi görevler için assignment alınması gerektiğini belirle
        const tasksNeedingAssignments = validFirebaseTasks.filter((firebaseTask) => {
          const cached = assignmentsCacheRef.current.get(firebaseTask.id);
          const cacheAge = now - assignmentsCacheTimestampRef.current;
          // Cache yoksa veya cache eskiyse veya görev güncellenmişse assignment al
<<<<<<< HEAD
          return !cached || cacheAge > ASSIGNMENTS_CACHE_DURATION ||
            (firebaseTask.updatedAt && cached && firebaseTask.updatedAt.toMillis() > assignmentsCacheTimestampRef.current);
        });

=======
          return !cached || cacheAge > ASSIGNMENTS_CACHE_DURATION || 
            (firebaseTask.updatedAt && cached && firebaseTask.updatedAt.toMillis() > assignmentsCacheTimestampRef.current);
        });
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Sadece gerekli görevler için assignment'ları al (batch)
        if (tasksNeedingAssignments.length > 0) {
          const newAssignments = await Promise.all(
            tasksNeedingAssignments.map(async (firebaseTask) => {
<<<<<<< HEAD
              if (!firebaseTask?.id) return null;
              try {
                const assignments = await getTaskAssignments(firebaseTask.id);
                return { taskId: firebaseTask.id, assignments: Array.isArray(assignments) ? assignments : [] };
              } catch (error: unknown) {
                if (import.meta.env.DEV) {
                  console.error(`Error fetching assignments for task ${firebaseTask.id}:`, error);
                }
                return { taskId: firebaseTask.id, assignments: [] };
              }
            })
          );

=======
            if (!firebaseTask?.id) return null;
            try {
              const assignments = await getTaskAssignments(firebaseTask.id);
                return { taskId: firebaseTask.id, assignments: Array.isArray(assignments) ? assignments : [] };
            } catch (error: unknown) {
              if (import.meta.env.DEV) {
                console.error(`Error fetching assignments for task ${firebaseTask.id}:`, error);
              }
                return { taskId: firebaseTask.id, assignments: [] };
            }
          })
        );
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // Cache'i güncelle
          newAssignments.forEach((item) => {
            if (item) {
              assignmentsCacheRef.current.set(item.taskId, item.assignments);
            }
          });
          assignmentsCacheTimestampRef.current = now;
        }
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Yorum sayılarını yükle (batch - performans için sadece görünen görevler için)
        const commentCountsMap = new Map<string, number>();
        try {
          // Sadece görünen görevler için yorum sayısı yükle (ilk 50 görev)
          const tasksToLoad = validFirebaseTasks.slice(0, Math.min(50, validFirebaseTasks.length));
          const batchSize = 10;
          for (let i = 0; i < tasksToLoad.length; i += batchSize) {
            const batch = tasksToLoad.slice(i, i + batchSize);
            await Promise.all(
              batch.map(async (firebaseTask) => {
                if (!firebaseTask?.id) return;
                try {
                  const comments = await getTaskComments(firebaseTask.id);
                  commentCountsMap.set(firebaseTask.id, Array.isArray(comments) ? comments.length : 0);
                } catch (error: unknown) {
                  if (import.meta.env.DEV) {
                    console.error(`Error fetching comments for task ${firebaseTask.id}:`, error);
                  }
                  commentCountsMap.set(firebaseTask.id, 0);
                }
              })
            );
          }
          setCommentCounts(commentCountsMap);
        } catch (error: unknown) {
          if (import.meta.env.DEV) {
            console.error("Error loading comment counts:", error);
          }
        }
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Tüm görevler için assignment'ları cache'den al
        const tasksWithAssignments = validFirebaseTasks.map((firebaseTask) => {
          const assignments = assignmentsCacheRef.current.get(firebaseTask.id) || [];
          return { firebaseTask, assignments };
        });
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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

        // Firebase'den gelen görevler zaten silinmemiş görevler (deleteDoc ile silinenler Firestore'dan kaldırılıyor)
        setAllFirebaseTasks(firebaseTasks);
        setMyTasks(myTasksList);
        setCreatedTasks(createdTasksList);
        setArchivedTasks(archivedTasksList);
        setAllTasks(allTasksList);
        setLoading(false);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.error("Real-time tasks update error:", error);
          }
        }
        const errorMessage = error instanceof Error ? error.message : String(error) || "Görevler güncellenirken hata oluştu";
        setError(errorMessage);
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
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        if (import.meta.env.DEV) {
          console.error("Fetch project error:", error);
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Proje yüklenirken hata oluştu");
    }
  };

  // Check permissions for team management access
  useEffect(() => {
    const checkTeamManagementPermission = async () => {
      if (!user) {
        setCanAccessTeamManagement(false);
        return;
      }
      try {
        const canReadDepts = await canRead("departments");
        // Team Leader kontrolü - Firestore'dan (canUpdate departments)
        const { canUpdateResource } = await import("@/utils/permissions");
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
        const canUpdateDepts = await canUpdateResource(userProfile, "departments");
        setCanAccessTeamManagement(canReadDepts || canUpdateDepts);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error checking team management permission:", error);
        }
        setCanAccessTeamManagement(false);
      }
    };
    checkTeamManagementPermission();
  }, [user, canRead]);

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
      if (import.meta.env.DEV) {
        console.error("Permission check error:", error);
      }
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

  // Proje oluşturma ve silme yetkilerini kontrol et
  useEffect(() => {
    const checkProjectPermissions = async () => {
      if (!user) {
        setCanCreateProjectState(false);
        setCanDeleteProjectState(false);
        return;
      }
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
        const canCreate = await canCreateProject(userProfile, departments);
        // canDeleteProject için bir dummy project objesi oluştur (sadece yetki kontrolü için)
        const dummyProject: Project = {
          id: "",
          name: "",
          description: null,
          status: "active",
          isPrivate: false,
          createdBy: user.id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        const canDelete = await canDeleteProject(dummyProject, userProfile);
        setCanCreateProjectState(canCreate);
        setCanDeleteProjectState(canDelete);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error checking project permissions:", error);
        }
        setCanCreateProjectState(false);
        setCanDeleteProjectState(false);
      }
    };
    checkProjectPermissions();
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;
<<<<<<< HEAD

    try {
      setLoading(true);

=======
    
    try {
      setLoading(true);
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Eğer 'type=general' ise sadece "general" projesine ait görevleri al
      // "Benim Görevlerim" sekmesi için (filterFromUrl === 'my-tasks') tüm görevleri al (proje filtresi olmadan)
      // Proje detay sayfasındayken: projectId filtresi ile görevleri al (yeni eklenen görevlerin görünmesi için)
      // Diğer durumlarda tüm görevleri al
<<<<<<< HEAD
      const taskFilters = taskTypeFromUrl === 'general'
        ? { projectId: "general" }
        : filterFromUrl === 'my-tasks'
          ? {} // "Benim Görevlerim" sekmesi için tüm görevleri al
          : projectId
            ? { projectId } // Proje detay sayfasındayken projectId filtresi ile al
            : {}; // Normal "Tüm Görevler" sayfasında tüm görevleri al

      // Tüm görevleri, kullanıcıları, projeleri ve talepleri paralel olarak al
      // Performans için: İlk yüklemede sadece 100 görev yükle (pagination için)
      const [allFirebaseTasks, allUsers, allProjectsData, myRequestsData] = await Promise.all([
        getTasks({ ...taskFilters, limit: 100 }), // Limit ekle (100 görev)
=======
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
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          try {
            // Otomatik oluşturulan "Gizli Görevler" projesini filtrele
            if (project.name?.toLowerCase() === "gizli görevler") {
              return null;
            }
<<<<<<< HEAD

            // Gizli olmayan projeler herkes görebilir
            if (!project.isPrivate) return project;

            // Üst yöneticiler tüm projeleri görebilir
            if (isSuperAdmin) return project;

            // Oluşturan görebilir
            if (user?.id && project.createdBy === user.id) return project;

            // Ekip lideri için projede görevi olan kullanıcılar kontrolü yapılmaz (sadece kendi oluşturduğu gizli projeleri görebilir)
            // Team Leader kontrolü - Firestore'dan (canUpdate projects)
            // Bu kontrol async olduğu için burada yapılamaz, yukarıda zaten kontrol ediliyor

=======
            
            // Gizli olmayan projeler herkes görebilir
            if (!project.isPrivate) return project;
            
            // Üst yöneticiler tüm projeleri görebilir
            if (isSuperAdmin) return project;
            
            // Oluşturan görebilir
            if (user?.id && project.createdBy === user.id) return project;
            
            // Ekip lideri için projede görevi olan kullanıcılar kontrolü yapılmaz (sadece kendi oluşturduğu gizli projeleri görebilir)
            // Team Leader kontrolü - Firestore'dan (canUpdate projects)
            // Bu kontrol async olduğu için burada yapılamaz, yukarıda zaten kontrol ediliyor
            
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

                if (hasTaskInProject) return project;

=======
                
                if (hasTaskInProject) return project;
                
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
            
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            return null;
          } catch (error: unknown) {
            if (import.meta.env.DEV) {
              console.error(`Error processing project ${project.id}:`, error);
            }
            return null;
          }
        })
      );
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Promise.allSettled sonuçlarını işle
      const validProjects = filterableProjectsList
        .filter((result): result is PromiseFulfilledResult<Project | null> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter((p): p is Project => p !== null);
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      setFilterableProjects(validProjects);

      setUserRequests(myRequestsData);

      // Her görev için assignments'ları al - Promise.allSettled ile güvenli
      const tasksWithAssignments = await Promise.allSettled(
        (Array.isArray(allFirebaseTasks) ? allFirebaseTasks : []).map(async (task) => {
          if (!task?.id) return null;
          try {
            const assignments = await getTaskAssignments(task.id);
            return { task, assignments: Array.isArray(assignments) ? assignments : [] };
          } catch (error: unknown) {
            if (import.meta.env.DEV) {
              console.error(`Error fetching assignments for task ${task.id}:`, error);
            }
            return { task, assignments: [] };
          }
        })
      );
<<<<<<< HEAD

      // Promise.allSettled sonuçlarını işle
      const validTasksWithAssignments = tasksWithAssignments
        .filter((result): result is PromiseFulfilledResult<{ task: FirebaseTask; assignments: FirebaseTaskAssignment[] } | null> =>
=======
      
      // Promise.allSettled sonuçlarını işle
      const validTasksWithAssignments = tasksWithAssignments
        .filter((result): result is PromiseFulfilledResult<{ task: FirebaseTask; assignments: FirebaseTaskAssignment[] } | null> => 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value as { task: FirebaseTask; assignments: FirebaseTaskAssignment[] });

      // UI formatına çevir
      const incomingTasks = validTasksWithAssignments.map(({ task, assignments }) =>
        convertFirebaseTaskToUITask(task, Array.isArray(assignments) ? assignments : [], Array.isArray(allUsers) ? allUsers : [])
      );

      // Eğer 'type=general' ise, sadece "general" projesine ait görevleri göster
      // (projectId null veya undefined olan görevler dahil edilmemeli)
<<<<<<< HEAD
      let filteredIncomingTasks = taskTypeFromUrl === 'general'
        ? incomingTasks.filter(t => t.projectId === "general" && t.projectId !== null && t.projectId !== undefined)
=======
      let filteredIncomingTasks = taskTypeFromUrl === 'general' 
        ? incomingTasks.filter(t => t.projectId === "general" && t.projectId !== null && t.projectId !== undefined) 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // KRİTİK: "general" projesine ait görevler hiçbir projede görünmemeli (sadece "Genel Görevler" sayfasında)
          if (task.projectId === "general") {
            return false; // "general" projesine ait görevler proje detay sayfalarında görünmemeli
          }
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // KRİTİK: Gizli projeler için sadece gizli görevler görünmeli
          // Bu kontrolü burada yapmalıyız, çünkü gizli olmayan görevler gizli projeye atanmış olsa bile görünmemeli
          if (currentProject?.isPrivate) {
            const firebaseTask = allFirebaseTasks.find((t) => t.id === task.id);
            // Gizli projede sadece gizli görevler görünmeli
            if (!firebaseTask?.isPrivate) {
              return false; // Gizli olmayan görevler gizli projede görünmemeli
            }
          }
<<<<<<< HEAD

          return true;
        });
      }

=======
          
          return true;
        });
      }
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Eğer "Genel Görevler" sayfasındaysak, sadece "general" projesine ait arşivlenmiş görevleri göster
        if (taskTypeFromUrl === 'general') {
          if (task.projectId !== "general") {
            return false;
          }
        }
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // onlyInMyTasks görevleri "Tüm Görevler" sekmesinde ve proje detay sayfasında görünmez
        if (firebaseTask?.onlyInMyTasks) {
          return false;
        }
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Eğer bir proje detay sayfasındaysak, sadece o projeye ait görevleri göster
        // NOT: Bu filtreleme zaten yukarıda yapıldı ama ekstra güvenlik için burada da kontrol ediyoruz
        if (projectId) {
          // KRİTİK: Görevin bu projeye ait olup olmadığını kesin olarak kontrol et
          // projectId null, undefined veya farklı bir değer ise gösterilmemeli
          if (!task.projectId || task.projectId !== projectId) {
            return false;
          }
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // KRİTİK: "general" projesine ait görevler hiçbir projede görünmemeli (sadece "Genel Görevler" sayfasında)
          if (task.projectId === "general") {
            return false; // "general" projesine ait görevler proje detay sayfalarında görünmemeli
          }
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // Gizli projeler için: Sadece gizli görevler görünmeli
          const currentProject = projectsMap.get(projectId);
          if (currentProject?.isPrivate) {
            // Gizli projede sadece gizli görevler görünmeli
            if (!firebaseTask?.isPrivate) {
              return false; // Gizli olmayan görevler gizli projede görünmemeli
            }
          }
<<<<<<< HEAD

          // Normal projelerde: Görev bu projeye ait
          return true;
        }

=======
          
          // Normal projelerde: Görev bu projeye ait
          return true;
        }
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // "Tüm Görevler" sekmesi: Gizli görevler hiç gözükmemeli
        if (firebaseTask?.isPrivate) {
          return false; // Gizli görevler "Tüm Görevler" sekmesinde gözükmemeli
        }
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      for (const { task, assignments } of validTasksWithAssignments) {
        // Arşivlenmiş görevleri atla
        if (task.isArchived) {
          continue;
        }
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Zaten eklenmiş görevleri atla (duplicate kontrolü)
        if (addedTaskIds.has(task.id)) {
          continue;
        }
<<<<<<< HEAD

        // 1. Kullanıcının oluşturduğu görevler (oluşturan kişi her zaman görebilir)
        if (task.createdBy === user.id) {
          const uiTask = convertFirebaseTaskToUITask(task, assignments, allUsers);

=======
        
        // 1. Kullanıcının oluşturduğu görevler (oluşturan kişi her zaman görebilir)
        if (task.createdBy === user.id) {
          const uiTask = convertFirebaseTaskToUITask(task, assignments, allUsers);
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // Eğer kullanıcıya atanmış bir assignment varsa onu kullan, yoksa oluşturan olarak ekle
          const userAssignment = assignments.find(
            (a) => a.assignedTo === user.id && a.status === "accepted"
          );
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD
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

=======
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
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // 3. Kullanıcıya atanan ve kabul edilen görevleri bul
        // ÖNEMLİ: Sadece kabul edilen (accepted) görevler "Benim Görevlerim" sekmesinde gösterilmeli
        const userAssignment = assignments.find(
          (a) => a.assignedTo === user.id && a.status === "accepted"
        );
<<<<<<< HEAD

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

=======
        
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
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      setMyTasks(myAcceptedTasks);

      // Oluşturduğum görevler - BOŞ (artık gösterilmiyor, sadece proje altında ve "Tüm Görevler" sekmesinde gözüküyor)
      setCreatedTasks([]);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Fetch tasks error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error) || "Görevler yüklenirken hata oluştu";
      setError(errorMessage);
      setLoading(false);
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Offline durumu kontrolü
      const isOffline = !navigator.onLine;
      if (isOffline) {
        toast.error("İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edin.", {
          action: {
            label: "Cache'den Göster",
            onClick: () => {
              // Cache'den görevleri göster (zaten allTasks state'inde var)
              toast.info("Cache'den görevler gösteriliyor");
            }
          },
          duration: 5000,
        });
      } else {
        toast.error(errorMessage, {
          action: {
            label: "Tekrar Dene",
            onClick: () => {
              setError(null);
              fetchTasks();
            }
          },
          duration: 5000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!taskId || taskId.trim() === "") {
      toast.error("Geçersiz görev ID");
      return;
    }
    if (!user?.id) {
      toast.error("Kullanıcı bilgisi bulunamadı");
      return;
    }
    setDeletingId(taskId);
    try {
      await deleteTask(taskId, user.id);
      toast.success("Görev başarıyla silindi");
      // Real-time subscribe otomatik güncelleyecek
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Delete task error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Görev silinirken hata oluştu", {
        action: {
          label: "Tekrar Dene",
          onClick: () => handleDeleteTask(taskId),
        },
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error("Proje adı gereklidir");
      return;
    }
    if (!user?.id) {
      toast.error("Kullanıcı bilgisi bulunamadı");
      return;
    }
    try {
      await createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || null,
        status: "active",
        isPrivate: false,
        createdBy: user.id,
      });
      toast.success("Proje oluşturuldu");
      setCreateProjectDialogOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");
      // Projeleri yeniden yükle
      const projects = await getProjects({ status: "active" });
      setFilterableProjects(projects);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Create project error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Proje oluşturulurken hata oluştu");
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete || !user?.id) return;
<<<<<<< HEAD

    // Proje ID kontrolü
    if (!projectToDelete.id || projectToDelete.id.trim() === "") {
      toast.error("Proje ID'si geçersiz");
      setDeleteProjectDialogOpen(false);
      setProjectToDelete(null);
      return;
    }

=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    try {
      await deleteProject(projectToDelete.id, user.id);
      toast.success("Proje silindi");
      setDeleteProjectDialogOpen(false);
      setProjectToDelete(null);
      // Eğer silinen proje seçiliyse, "Tüm Projeler"e geç
      if (selectedProject === projectToDelete.id) {
        setSelectedProject("all");
        setProjectFilter("all");
      }
      // Projeleri yeniden yükle
      const projects = await getProjects({ status: "active" });
      setFilterableProjects(projects);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Delete project error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
<<<<<<< HEAD

      // Eğer proje zaten silinmişse, sessizce devam et
      if (errorMessage.includes("Proje bulunamadı") || errorMessage.includes("zaten silinmiş")) {
        toast.success("Proje silindi");
        setDeleteProjectDialogOpen(false);
        setProjectToDelete(null);
        // Projeleri yeniden yükle
        const projects = await getProjects({ status: "active" });
        setFilterableProjects(projects);
        return;
      }

=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      toast.error(errorMessage || "Proje silinirken hata oluştu");
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    if (!user?.id) {
      toast.error("Kullanıcı bilgisi bulunamadı");
      return;
    }
    if (!taskId || taskId.trim() === "") {
      toast.error("Geçersiz görev ID");
      return;
    }
    try {
      await archiveTask(taskId, user.id);
      toast.success("Görev arşivlendi");
      // Real-time subscribe otomatik güncelleyecek
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Archive task error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Görev arşivlenirken hata oluştu", {
        action: {
          label: "Tekrar Dene",
          onClick: () => handleArchiveTask(taskId),
        },
      });
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
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Reject task error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Görev reddedilemedi");
    } finally {
      setRejecting(false);
    }
  };

  // Standardize edilmiş durum renkleri ve ikonları
  const getStatusIcon = (status: string) => {
    const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; bgColor: string }> = {
<<<<<<< HEAD
      pending: {
        icon: CircleDot,
        color: "text-amber-500",
        bgColor: "bg-amber-50 border-amber-200"
      },
      in_progress: {
        icon: Clock,
        color: "text-blue-500",
        bgColor: "bg-blue-50 border-blue-200"
      },
      completed: {
        icon: CheckCircle2,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 border-emerald-200"
      },
      approved: {
        icon: CheckCircle2,
        color: "text-green-600",
        bgColor: "bg-green-50 border-green-200"
      },
    };

    const config = statusConfig[status] || {
      icon: AlertCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted border-border"
    };
    const Icon = config.icon;

=======
      pending: { 
        icon: CircleDot, 
        color: "text-amber-500", 
        bgColor: "bg-amber-50 border-amber-200" 
      },
      in_progress: { 
        icon: Clock, 
        color: "text-blue-500", 
        bgColor: "bg-blue-50 border-blue-200" 
      },
      completed: { 
        icon: CheckCircle2, 
        color: "text-emerald-600", 
        bgColor: "bg-emerald-50 border-emerald-200" 
      },
      approved: { 
        icon: CheckCircle2, 
        color: "text-green-600", 
        bgColor: "bg-green-50 border-green-200" 
      },
    };
    
    const config = statusConfig[status] || { 
      icon: AlertCircle, 
      color: "text-muted-foreground", 
      bgColor: "bg-muted border-border" 
    };
    const Icon = config.icon;
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return (
      <div className={cn("rounded-full p-1.5 border", config.bgColor)} aria-label={getStatusLabel(status)}>
        <Icon className={cn("h-3 w-3", config.color)} />
      </div>
    );
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
      pending: "Yapılacak",
      in_progress: "Devam Ediyor",
      completed: "Tamamlandı",
      approved: "Onaylandı",
    };
    return labels[normalized] || normalized;
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

  const isTaskOverdue = (task: Task | FirebaseTask) => {
<<<<<<< HEAD
    const dueDate = 'due_date' in task && task.due_date
      ? new Date(task.due_date)
      : ('dueDate' in task && task.dueDate
=======
    const dueDate = 'due_date' in task && task.due_date 
      ? new Date(task.due_date) 
      : ('dueDate' in task && task.dueDate 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        ? (task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate))
        : null);
    if (!dueDate) return false;
    return isBefore(dueDate, new Date()) && task.status !== "completed";
  };

  const isTaskDueSoon = (task: Task | FirebaseTask) => {
<<<<<<< HEAD
    const dueDate = 'due_date' in task && task.due_date
      ? new Date(task.due_date)
      : ('dueDate' in task && task.dueDate
=======
    const dueDate = 'due_date' in task && task.due_date 
      ? new Date(task.due_date) 
      : ('dueDate' in task && task.dueDate 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        ? (task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate))
        : null);
    if (!dueDate) return false;
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

  // Tablo toplam genişliğini hesapla
  const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Jira tarzı Key formatı (örn: TASK-123)
  const formatTaskKey = (taskId: string) => {
    // ID'nin son 6 karakterini al ve büyük harfe çevir
    const shortId = taskId.slice(-6).toUpperCase();
    return `TASK-${shortId}`;
  };

  // Öncelik gösterimi için helper - Eski sistem (1-5) varsa yeni sisteme (0-5) çevir
  const getPriorityDisplay = (priority: number | undefined) => {
    if (!priority) {
      const option = getPriorityOption(0);
      return { label: option.label, icon: ChevronDown, color: option.color };
    }
    // Eski sistem (1-5) varsa yeni sisteme (0-5) çevir
    const newPriority = convertOldPriorityToNew(priority);
    const option = getPriorityOption(newPriority);
    // Icon seçimi: 0-1 = down, 2-3 = minus, 4-5 = up
    const icon = newPriority <= 1 ? ChevronDown : newPriority <= 3 ? Minus : ChevronUp;
    return { label: option.label, icon, color: option.color };
  };

  const filterTasks = (tasks: (Task | FirebaseTask)[]) => {
    if (!Array.isArray(tasks)) {
      return [];
    }
    return tasks.filter(task => {
      if (!task) return false;
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Silinmiş görevleri filtrele: allFirebaseTasks içinde olmayan görevler silinmiş demektir
      if (Array.isArray(allFirebaseTasks) && allFirebaseTasks.length > 0) {
        const firebaseTaskIds = new Set(allFirebaseTasks.map(t => t?.id).filter((id): id is string => !!id));
        if (!firebaseTaskIds.has(task.id)) {
          return false; // Silinmiş görev
        }
      }
<<<<<<< HEAD

      const searchLower = (searchTerm || "").toLocaleLowerCase('tr-TR');
      const taskTitle = (task.title || "").toLocaleLowerCase('tr-TR');
      const taskDesc = (task.description || "").toLocaleLowerCase('tr-TR');

      const matchesSearch = !searchTerm || searchTerm.trim() === "" || taskTitle.includes(searchLower) || taskDesc.includes(searchLower);

=======
      
      const searchLower = (searchTerm || "").toLocaleLowerCase('tr-TR');
      const taskTitle = (task.title || "").toLocaleLowerCase('tr-TR');
      const taskDesc = (task.description || "").toLocaleLowerCase('tr-TR');
      
      const matchesSearch = !searchTerm || searchTerm.trim() === "" || taskTitle.includes(searchLower) || taskDesc.includes(searchLower);
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Status filtresi: cancelled görevler "approved" kolonunda gösterildiği için özel kontrol
      let matchesStatus = statusFilter === "all" || task.status === statusFilter;
      if (statusFilter === "approved") {
        // "approved" filtresi seçildiğinde, hem approved hem cancelled görevleri göster
<<<<<<< HEAD
        matchesStatus = task.status === "approved" || task.status === "cancelled" ||
=======
        matchesStatus = task.status === "approved" || task.status === "cancelled" || 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          (task.status === "completed" && (task as any).approvalStatus === "approved");
      } else if (statusFilter !== "all") {
        // Diğer filtreler için normal kontrol
        matchesStatus = task.status === statusFilter;
      }
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      const matchesFocus = (
        focusFilter === "all" ||
        (focusFilter === "due_soon" && isTaskDueSoon(task)) ||
        (focusFilter === "overdue" && isTaskOverdue(task)) ||
        (focusFilter === "high_priority" && (() => {
          const taskPriority = task.priority || 0;
          // Eski sistem (1-5) varsa yeni sisteme (0-5) çevir
          const newPriority = convertOldPriorityToNew(taskPriority);
          // Yüksek öncelik: 3 (Yüksek) ve üzeri
          return newPriority >= 3;
        })())
      );
<<<<<<< HEAD

      // Proje filtresi - selectedProject state'ine göre
      let matchesProject = true;
      if (selectedProject === "all") {
        matchesProject = true;
      } else if (selectedProject === "general") {
        matchesProject = task.projectId === "general" || !task.projectId;
      } else {
        matchesProject = task.projectId === selectedProject;
      }

=======
      
      // Proje filtresi - selectedProject state'ine göre
      let matchesProject = true;
      if (selectedProject === "all") {
          matchesProject = true;
      } else if (selectedProject === "general") {
        matchesProject = task.projectId === "general" || !task.projectId;
        } else {
        matchesProject = task.projectId === selectedProject;
      }
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Kişi filtresi - atanan kişilere göre
      let matchesAssignedUser = true;
      if (assignedUserFilter !== "all") {
        const taskAssignments = assignmentsCacheRef.current.get(task.id) || [];
        const assignedUserIds = taskAssignments.map(a => a.assignedTo);
        matchesAssignedUser = assignedUserIds.includes(assignedUserFilter);
      }
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // activeFilter kontrolleri kaldırıldı çünkü:
      // - pool, archive, my-tasks filtreleri zaten tasksForStatsAndDisplay içinde uygulanmış
      // - general filtresi zaten selectedProject === "general" ile uygulanmış
      // Burada sadece arama, durum, odak, proje ve kişi filtrelerini uyguluyoruz
      // Hem liste hem pano görünümünde aynı filtreler uygulanır
      return matchesSearch && matchesStatus && matchesFocus && matchesProject && matchesAssignedUser;
    });
  };

  const sortTasks = (tasks: (Task | FirebaseTask)[]) => {
    if (!Array.isArray(tasks)) {
      return [];
    }
    return [...tasks].sort((a, b) => {
      if (!a || !b) return 0;
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      if (sortBy === "priority") {
        const aPriority = a.priority || 0;
        const bPriority = b.priority || 0;
        return bPriority - aPriority;
      }
      if (sortBy === "due_date") {
        const aDueDate = 'due_date' in a && a.due_date ? a.due_date : ('dueDate' in a && a.dueDate ? (a.dueDate instanceof Timestamp ? a.dueDate.toDate().toISOString() : new Date(a.dueDate).toISOString()) : null);
        const bDueDate = 'due_date' in b && b.due_date ? b.due_date : ('dueDate' in b && b.dueDate ? (b.dueDate instanceof Timestamp ? b.dueDate.toDate().toISOString() : new Date(b.dueDate).toISOString()) : null);
        if (!aDueDate) return 1;
        if (!bDueDate) return -1;
        const aDate = typeof aDueDate === 'string' ? new Date(aDueDate).getTime() : 0;
        const bDate = typeof bDueDate === 'string' ? new Date(bDueDate).getTime() : 0;
        if (isNaN(aDate)) return 1;
        if (isNaN(bDate)) return -1;
        return aDate - bDate;
      }
      // created_at sıralaması
      const aCreatedVal = 'created_at' in a && a.created_at ? a.created_at : ('createdAt' in a && a.createdAt ? (a.createdAt instanceof Timestamp ? a.createdAt.toDate() : a.createdAt) : null);
      const bCreatedVal = 'created_at' in b && b.created_at ? b.created_at : ('createdAt' in b && b.createdAt ? (b.createdAt instanceof Timestamp ? b.createdAt.toDate() : b.createdAt) : null);
      const aCreated = aCreatedVal ? (aCreatedVal instanceof Date ? aCreatedVal.getTime() : (typeof aCreatedVal === 'string' ? new Date(aCreatedVal).getTime() : 0)) : 0;
      const bCreated = bCreatedVal ? (bCreatedVal instanceof Date ? bCreatedVal.getTime() : (typeof bCreatedVal === 'string' ? new Date(bCreatedVal).getTime() : 0)) : 0;
      if (isNaN(aCreated)) return 1;
      if (isNaN(bCreated)) return -1;
      return bCreated - aCreated;
    });
  };

  // İstatistiklerin baz aldığı görev setini hesapla (tüm görevler ve panoda kullanılacak)
  // Bu görev seti, istatistiklerin hesaplandığı ve görevlerin gösterildiği aynı kaynak olmalı
  const tasksForStatsAndDisplay = useMemo(() => {
    // Filtre tipine göre görev listesini belirle
    let tasks: (Task | FirebaseTask)[] = [];
    if (activeFilter === "archive") {
      tasks = Array.isArray(archivedTasks) ? archivedTasks.filter(t => t) : [];
    } else if (activeFilter === "my-tasks") {
      // "Benim Görevlerim" filtresinde görevleri kullan
      tasks = (Array.isArray(myTasks) ? myTasks : [])
        .filter(t => t)
        .map((task) => {
          if (!task) return null;
          const taskWithAssignment = task as Task & { assignment?: TaskAssignment; assignedUsers?: Profile[] };
          const { assignment, ...taskWithoutAssignment } = taskWithAssignment;
          return taskWithoutAssignment;
        })
        .filter((t): t is Task & { assignedUsers?: Profile[] } => t !== null);
    } else if (activeFilter === "pool") {
      // Görev havuzunda sadece isInPool=true olan görevler
      tasks = (Array.isArray(allTasks) ? allTasks : [])
        .filter(task => {
          if (!task?.id) return false;
          const firebaseTask = (Array.isArray(allFirebaseTasks) ? allFirebaseTasks : []).find(t => t?.id === task.id);
          return firebaseTask?.isInPool === true && !firebaseTask?.onlyInMyTasks;
<<<<<<< HEAD
        });
=======
      });
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    } else {
      // all veya general
      tasks = Array.isArray(allTasks) ? allTasks.filter(t => t) : [];
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Silinmiş görevleri filtrele: allFirebaseTasks içinde olmayan görevler silinmiş demektir
    // Firebase'de deleteDoc ile silinen görevler Firestore'dan kaldırılıyor, bu yüzden allFirebaseTasks'ta olmayan görevler silinmiş demektir
    // allFirebaseTasks yüklenmişse, silinmiş görevleri kesinlikle filtrele
    if (Array.isArray(allFirebaseTasks) && allFirebaseTasks.length > 0) {
      const firebaseTaskIds = new Set(allFirebaseTasks.map(t => t?.id).filter((id): id is string => !!id));
      tasks = tasks.filter((task: FirebaseTask) => {
        if (!task?.id) return false;
        // Eğer görev allFirebaseTasks içinde yoksa, silinmiş demektir - kesinlikle filtrele
        return firebaseTaskIds.has(task.id);
      });
    }
    // allFirebaseTasks boşsa (henüz yüklenmemiş), görevleri olduğu gibi bırak
    // Çünkü henüz yüklenmediği için silinmiş görevleri filtreleyemeyiz
    // Ama filterTasks içinde de kontrol yapılıyor, bu yüzden çift kontrol var
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Arşivlenmiş görevleri filtrele (archive filtresi aktif değilse)
    if (activeFilter !== "archive") {
      tasks = tasks.filter((task: FirebaseTask) => task && !task.isArchived && !('is_archived' in task && task.is_archived));
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Proje filtresi uygula (selectedProject state'ine göre)
    if (selectedProject && selectedProject !== "all") {
      if (selectedProject === "general") {
        tasks = tasks.filter((task: FirebaseTask) => task && (task.projectId === "general" || !task.projectId));
      } else {
        tasks = tasks.filter((task: FirebaseTask) => task && task.projectId === selectedProject);
      }
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return tasks;
  }, [allTasks, myTasks, archivedTasks, activeFilter, allFirebaseTasks, selectedProject]);

  const filteredAndSortedMyTasks = useMemo(() => {
    // İstatistiklerin baz aldığı görev setini kullan (tasksForStatsAndDisplay)
    // Ama sadece "Benim Görevlerim" filtresi için
    if (activeFilter !== "my-tasks") {
      return [];
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // İstatistiklerin kullandığı filtrelemeyi koru, sadece ek filtreleri uygula (arama, durum, odak, proje, kişi)
    // Hem liste hem pano görünümünde aynı filtreleri ve sıralamayı uygula
    const filtered = filterTasks(tasksForStatsAndDisplay);
    return sortTasks(filtered);
  }, [tasksForStatsAndDisplay, searchTerm, statusFilter, focusFilter, sortBy, activeFilter, selectedProject, assignedUserFilter, allFirebaseTasks]);

  const filteredAndSortedAllTasks = useMemo(() => {
    // İstatistiklerin baz aldığı görev setini kullan (tasksForStatsAndDisplay)
    // "Tüm Görevler" sekmesi veya proje detay sayfası için
    if (activeFilter === "my-tasks" || activeFilter === "archive") {
      return [];
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // İstatistiklerin kullandığı filtrelemeyi koru, sadece ek filtreleri uygula (arama, durum, odak, proje, kişi)
    // Hem liste hem pano görünümünde aynı filtreleri ve sıralamayı uygula
    const filtered = filterTasks(tasksForStatsAndDisplay);
    return sortTasks(filtered) as (Task | FirebaseTask)[];
  }, [tasksForStatsAndDisplay, searchTerm, statusFilter, focusFilter, sortBy, activeFilter, selectedProject, assignedUserFilter, allFirebaseTasks]);

  // Arşivlenmiş görevler için filtrelenmiş ve sıralanmış liste
  const filteredAndSortedArchivedTasks = useMemo(() => {
    if (activeFilter !== "archive") {
      return [];
    }
    // İstatistiklerin baz aldığı görev setini kullan (tasksForStatsAndDisplay)
    // Hem liste hem pano görünümünde aynı filtreleri ve sıralamayı uygula
    const filtered = filterTasks(tasksForStatsAndDisplay);
    return sortTasks(filtered) as (Task | FirebaseTask)[];
  }, [tasksForStatsAndDisplay, searchTerm, statusFilter, focusFilter, sortBy, activeFilter, selectedProject, assignedUserFilter, allFirebaseTasks]);

  // Sıralama fonksiyonu
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Aynı kolona tıklandığında yönü değiştir
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Yeni kolona tıklandığında varsayılan olarak desc
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Sıralama uygulama fonksiyonu
  const applySorting = (data: (Task | FirebaseTask)[]): (Task | FirebaseTask)[] => {
    if (!sortColumn) return data;
<<<<<<< HEAD

    const sorted = [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

=======
    
    const sorted = [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      switch (sortColumn) {
        case "key":
          aValue = a.id;
          bValue = b.id;
          break;
        case "title":
          aValue = (a.title || "").toLowerCase();
          bValue = (b.title || "").toLowerCase();
          break;
        case "status":
          aValue = normalizeStatus(a.status || "pending");
          bValue = normalizeStatus(b.status || "pending");
          break;
        case "priority":
          aValue = a.priority || 0;
          bValue = b.priority || 0;
          break;
        case "dueDate":
          const aDue = (a as any).dueDate || (a as any).due_date;
          const bDue = (b as any).dueDate || (b as any).due_date;
          aValue = aDue ? (aDue instanceof Timestamp ? aDue.toDate().getTime() : new Date(aDue).getTime()) : 0;
          bValue = bDue ? (bDue instanceof Timestamp ? bDue.toDate().getTime() : new Date(bDue).getTime()) : 0;
          break;
        case "createdAt":
          const aCreated = (a as any).createdAt || (a as any).created_at;
          const bCreated = (b as any).createdAt || (b as any).created_at;
          aValue = aCreated ? (aCreated instanceof Timestamp ? aCreated.toDate().getTime() : new Date(aCreated).getTime()) : 0;
          bValue = bCreated ? (bCreated instanceof Timestamp ? bCreated.toDate().getTime() : new Date(bCreated).getTime()) : 0;
          break;
        default:
          return 0;
      }
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
<<<<<<< HEAD

    return sorted;
  };

  // Optimize: Memoize firebaseTaskIds to avoid rebuilding Set on every render/filter change
  const firebaseTaskIds = useMemo(() => {
    if (!Array.isArray(allFirebaseTasks)) return new Set<string>();
    return new Set(allFirebaseTasks.map(t => t?.id).filter((id): id is string => !!id));
  }, [allFirebaseTasks]);

=======
    
    return sorted;
  };

>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  // Filtre tipine göre görev listesini belirle
  const listData = useMemo(() => {
    let data: (Task | FirebaseTask)[] = [];
    if (activeFilter === "my-tasks") {
      data = filteredAndSortedMyTasks;
    } else if (activeFilter === "archive") {
      data = filteredAndSortedArchivedTasks;
    } else {
      // all, general, pool için filteredAndSortedAllTasks kullan
      data = filteredAndSortedAllTasks;
    }
<<<<<<< HEAD

    // Son bir kontrol: Silinmiş görevleri kesinlikle filtrele
    if (firebaseTaskIds.size > 0) {
=======
    
    // Son bir kontrol: Silinmiş görevleri kesinlikle filtrele
    if (Array.isArray(allFirebaseTasks) && allFirebaseTasks.length > 0) {
      const firebaseTaskIds = new Set(allFirebaseTasks.map(t => t?.id).filter((id): id is string => !!id));
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      data = data.filter((task: Task | FirebaseTask) => {
        if (!task || typeof task !== 'object' || !('id' in task)) return false;
        return firebaseTaskIds.has(task.id as string);
      });
    }
<<<<<<< HEAD

    // Sıralama uygula
    data = applySorting(data);

=======
    
    // Sıralama uygula
    data = applySorting(data);
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return data;
  }, [activeFilter, filteredAndSortedMyTasks, filteredAndSortedAllTasks, filteredAndSortedArchivedTasks, allFirebaseTasks, sortColumn, sortDirection]);

  // Yorum sayılarını lazy load et (görünen görevler için) - listData tanımından sonra
  useEffect(() => {
    if (!listData || listData.length === 0) return;
<<<<<<< HEAD

    const loadCommentCounts = async () => {
      const visibleTasks = listData.slice(0, visibleItemsCount);
      const tasksToLoad = visibleTasks.filter((task) => !commentCounts.has(task.id));

      if (tasksToLoad.length === 0) return;

=======
    
    const loadCommentCounts = async () => {
      const visibleTasks = listData.slice(0, visibleItemsCount);
      const tasksToLoad = visibleTasks.filter((task) => !commentCounts.has(task.id));
      
      if (tasksToLoad.length === 0) return;
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Batch olarak yükle (10'ar 10'ar)
      const batchSize = 10;
      for (let i = 0; i < tasksToLoad.length; i += batchSize) {
        const batch = tasksToLoad.slice(i, i + batchSize);
        const counts = await Promise.all(
          batch.map(async (task) => {
            try {
              const comments = await getTaskComments(task.id);
              return { taskId: task.id, count: Array.isArray(comments) ? comments.length : 0 };
            } catch {
              return { taskId: task.id, count: 0 };
            }
          })
        );
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        setCommentCounts(prev => {
          const newMap = new Map(prev);
          counts.forEach(({ taskId, count }) => {
            newMap.set(taskId, count);
          });
          return newMap;
        });
      }
    };
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    loadCommentCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listData, visibleItemsCount]);

<<<<<<< HEAD
  // Silme yetkilerini lazy load et (görünen görevler için)
  // Task Permissions handling via hook
  const taskPermissionsHook = useTaskPermissions(user ? {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    fullName: user.fullName,
    roles: user.roles || [],
  } : null);

  const [taskDeletePermissions, setTaskDeletePermissions] = useState<Map<string, boolean>>(new Map());
  const [taskEditPermissions, setTaskEditPermissions] = useState<Map<string, boolean>>(new Map());

  // Load permissions for visible tasks
  useEffect(() => {
    if (!listData || listData.length === 0 || !user) return;

    const loadPermissions = async () => {
      const visibleTasks = listData.slice(0, visibleItemsCount);

      // Filter tasks that need permission check
      const tasksToCheck = visibleTasks.filter((task) =>
        !taskDeletePermissions.has(task.id) || !taskEditPermissions.has(task.id)
      );

      if (tasksToCheck.length === 0) return;

      // Batch load
      const batchSize = 10;
      for (let i = 0; i < tasksToCheck.length; i += batchSize) {
        const batch = tasksToCheck.slice(i, i + batchSize);

        const deleteUpdates = new Map<string, boolean>();
        const editUpdates = new Map<string, boolean>();

        await Promise.all(batch.map(async (task) => {
          try {
            const fTask = task as FirebaseTask;
            const [canDelete, canEdit] = await Promise.all([
              taskPermissionsHook.checkTaskDeletePermission(fTask),
              taskPermissionsHook.checkTaskEditPermission(fTask)
            ]);
            deleteUpdates.set(task.id, canDelete);
            editUpdates.set(task.id, canEdit);
          } catch (e) {
            deleteUpdates.set(task.id, false);
            editUpdates.set(task.id, false);
          }
        }));

        setTaskDeletePermissions(prev => {
          const newMap = new Map(prev);
          deleteUpdates.forEach((val, key) => newMap.set(key, val));
          return newMap;
        });

        setTaskEditPermissions(prev => {
          const newMap = new Map(prev);
          editUpdates.forEach((val, key) => newMap.set(key, val));
          return newMap;
        });
      }
    };

    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listData, visibleItemsCount, user, taskPermissionsHook]);

=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  // Liste değiştiğinde visible items count'u sıfırla (listData tanımından sonra taşındı)

  // Görev durumu değişikliklerinde browser notification gönder
  useEffect(() => {
    if (notificationPermission === "granted" && user && allTasks.length > 0) {
      allTasks.forEach((task) => {
        const previousStatus = previousTaskStatusesRef.current.get(task.id);
        if (previousStatus && previousStatus !== task.status && task.status) {
          // Durum değişti, bildirim gönder
          const statusNames: Record<string, string> = {
            pending: "Yapılacak",
            in_progress: "Devam Ediyor",
            completed: "Tamamlandı",
          };
          try {
            new Notification("Görev Durumu Güncellendi", {
              body: `${task.title} görevi "${statusNames[task.status] || task.status}" durumuna güncellendi`,
              icon: "/rev-favicon.png",
              tag: `task-${task.id}`,
              badge: "/rev-favicon.png",
            });
          } catch (error: unknown) {
            if (import.meta.env.DEV) {
              console.error("Browser notification error:", error);
            }
          }
        }
        previousTaskStatusesRef.current.set(task.id, task.status);
      });
    }
  }, [allTasks, notificationPermission, user]);

  const boardTasks = useMemo(() => {
    // listData zaten tüm filtreleri (arama, durum, odak, proje) ve sıralamayı uygulamış durumda
    // tasksForStatsAndDisplay içinde zaten allFirebaseTasks ile senkronize edilmiş
    // Direkt olarak listData'yı kullan, ek filtreleme yapma - liste ve pano aynı görevleri göstermeli
<<<<<<< HEAD

    if (!Array.isArray(listData) || listData.length === 0) {
      return [];
    }

=======
    
    if (!Array.isArray(listData) || listData.length === 0) {
      return [];
    }
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Son bir kontrol: Silinmiş görevleri kesinlikle filtrele
    let filteredListData = listData;
    if (Array.isArray(allFirebaseTasks) && allFirebaseTasks.length > 0) {
      const firebaseTaskIds = new Set(allFirebaseTasks.map(t => t?.id).filter((id): id is string => !!id));
      filteredListData = listData.filter((task: FirebaseTask) => {
        if (!task?.id) return false;
        return firebaseTaskIds.has(task.id);
      });
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // listData zaten filtrelenmiş ve sıralanmış, TaskBoard'un beklediği formata çevir
    // Ek filtreleme yapma - listData zaten doğru şekilde filtrelenmiş
    const boardTasksResult = filteredListData
      .map((task) => {
        // assignment'ı kaldır ve TaskBoard formatına çevir
        const taskWithExtras = task as unknown as Task & { assignment?: TaskAssignment; assignedUsers?: Profile[] };
        const { assignment, assignedUsers, ...taskWithoutAssignment } = taskWithExtras;
<<<<<<< HEAD

        // Firebase task'ı bul (isInPool ve poolRequests için)
        const firebaseTask = Array.isArray(allFirebaseTasks) ? allFirebaseTasks.find(t => t?.id === task.id) : null;

=======
        
        // Firebase task'ı bul (isInPool ve poolRequests için)
        const firebaseTask = Array.isArray(allFirebaseTasks) ? allFirebaseTasks.find(t => t?.id === task.id) : null;
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // TaskBoard'un beklediği formata çevir (assignments array'i oluştur)
        const boardTask: { id: string; title: string; status: string; priority: number; dueDate?: string; createdAt: string; assignedUsers?: Array<{ id: string; full_name: string }>; labels?: Array<{ name: string; color: string }>; projectId?: string | null; isInPool?: boolean; poolRequests?: string[]; createdBy?: string } = {
          id: task.id,
          title: task.title || "",
          status: task.status || "pending",
          priority: task.priority || 0,
          dueDate: (() => {
            const taskObj = task as { due_date?: string; dueDate?: Timestamp | Date | string };
            if ('due_date' in taskObj && taskObj.due_date && typeof taskObj.due_date === 'string') return taskObj.due_date;
            if ('dueDate' in taskObj && taskObj.dueDate) {
              if (taskObj.dueDate instanceof Timestamp) return taskObj.dueDate.toDate().toISOString();
              if (taskObj.dueDate instanceof Date) return taskObj.dueDate.toISOString();
              if (typeof taskObj.dueDate === 'string') return taskObj.dueDate;
            }
            return undefined;
          })(),
          createdAt: (() => {
            const taskObj = task as { created_at?: string; createdAt?: Timestamp | Date | string };
            if ('created_at' in taskObj && taskObj.created_at && typeof taskObj.created_at === 'string') return taskObj.created_at;
            if ('createdAt' in taskObj && taskObj.createdAt) {
              if (taskObj.createdAt instanceof Timestamp) return taskObj.createdAt.toDate().toISOString();
              if (taskObj.createdAt instanceof Date) return taskObj.createdAt.toISOString();
              if (typeof taskObj.createdAt === 'string') return taskObj.createdAt;
            }
            return new Date().toISOString();
          })(),
          projectId: task.projectId || null,
          assignedUsers: Array.isArray(assignedUsers) ? assignedUsers
            .filter((u): u is Profile => {
              if (!u || typeof u !== 'object') return false;
              return 'id' in u && 'full_name' in u && typeof (u as { id: unknown; full_name: unknown }).id === 'string' && typeof (u as { id: unknown; full_name: unknown }).full_name === 'string';
            })
            .map((u: Profile) => ({
              id: u.id as string,
              full_name: u.full_name as string,
            })) : [],
          labels: [],
          // Görev havuzu bilgilerini ekle
          isInPool: firebaseTask?.isInPool === true,
          poolRequests: Array.isArray(firebaseTask?.poolRequests) ? firebaseTask.poolRequests : [],
          // Görevi oluşturan kişi bilgisini ekle
          createdBy: firebaseTask?.createdBy || task.createdBy || (task as { created_by?: string }).created_by,
        };
<<<<<<< HEAD

        return boardTask;
      });

=======
        
        return boardTask;
      });
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return boardTasksResult;
  }, [listData, allFirebaseTasks]);

  // quickFilters kaldırıldı - artık kullanılmıyor (öncelikli filtre istatistiklerde)

  // Mevcut durumun index'ini bul
  const getCurrentStatusIndex = (status: string, approvalStatus?: "pending" | "approved" | "rejected") => {
    // Önce status'ü normalize et (column_ prefix'ini kaldır)
    const normalized = normalizeStatus(status);
    // Eğer görev tamamlandı ve onaylandıysa, "Onaylandı" aşamasını göster
    if (normalized === "completed" && approvalStatus === "approved") {
      return 3; // "Onaylandı" index'i
    }
    // Eğer görev tamamlandı ama onaylanmadıysa, "Tamamlandı" aşamasını göster
    if (normalized === "completed") {
      return 2; // "Tamamlandı" index'i
    }
    const index = taskStatusWorkflow.findIndex((statusItem) => statusItem.value === normalized);
    // Eğer bulunamazsa, "pending" olarak kabul et (index 0)
    if (index === -1) {
      if (import.meta.env.DEV) {
        console.warn("Tasks: Status workflow'da bulunamadı:", {
          original: status,
          normalized,
          availableStatuses: taskStatusWorkflow.map(s => s.value),
        });
      }
      return 0;
    }
    return index;
  };

  // Bir sonraki durumu bul
  const getNextStatus = (currentStatus: string, approvalStatus?: "pending" | "approved" | "rejected") => {
    const currentIndex = getCurrentStatusIndex(currentStatus, approvalStatus);
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Eğer görev "completed" durumundaysa, "approved" durumuna direkt geçiş yapılamaz
    // Sadece "Onaya Gönder" butonu gösterilir
    const normalizedStatus = normalizeStatus(currentStatus);
    if (normalizedStatus === "completed") {
      return null;
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    if (currentIndex === -1 || currentIndex >= taskStatusWorkflow.length - 1) {
      return null;
    }
    const nextStatus = taskStatusWorkflow[currentIndex + 1];
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // "approved" durumuna direkt geçiş yapılamaz - sadece onay süreci ile geçilebilir
    if (nextStatus && nextStatus.value === "approved") {
      return null;
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return nextStatus;
  };

  // Proje seçildiğinde sıralamayı güncelle (sadece proje değiştiğinde)
  useEffect(() => {
    if (selectedProject && selectedProject !== "all" && selectedProject !== "general" && filterableProjects.length > 0) {
      const lastUsedProjectId = localStorage.getItem('lastUsedProjectId');
      if (lastUsedProjectId && lastUsedProjectId !== selectedProject) {
        // En son kullanılan projeyi güncelle
        lastUsedProjectRef.current = selectedProject;
        localStorage.setItem('lastUsedProjectId', selectedProject);
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Projeleri yeniden sırala
        const sortedProjects = [...filterableProjects].sort((a, b) => {
          if (a.id === selectedProject) return -1;
          if (b.id === selectedProject) return 1;
          return 0;
        });
        setFilterableProjects(sortedProjects);
      }
    }
  }, [selectedProject]);

  // Dropdown kapandığında arama sorgusunu temizle
  useEffect(() => {
    if (!projectDropdownOpen) {
      setProjectSearchQuery("");
    }
  }, [projectDropdownOpen]);

  const handleStatusChange = async (taskId: string, status: string) => {
    if (!user?.id) {
      toast.error("Kullanıcı bilgisi bulunamadı");
      return;
    }
    if (!taskId || taskId.trim() === "" || !status || status.trim() === "") {
      toast.error("Geçersiz görev veya durum");
      return;
    }

    // Status'ü normalize et (column_ prefix'ini kaldır)
    const normalizedStatus = normalizeStatus(status);
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // "approved" durumuna direkt geçiş yapılamaz - sadece onay süreci ile geçilebilir
    if (normalizedStatus === "approved") {
      toast.error("Görev 'Onaylandı' durumuna direkt geçirilemez. Lütfen 'Onaya Gönder' butonunu kullanın.");
      return;
    }

    // Optimistic update: UI'ı hemen güncelle
    const task = Array.isArray(allTasks) ? allTasks.find(t => t?.id === taskId) : null;
<<<<<<< HEAD
    if (!task) {
      toast.error("Görev bulunamadı");
      return;
    }

    const previousStatus = task.status || "pending";

=======
      if (!task) {
        toast.error("Görev bulunamadı");
        return;
      }

    const previousStatus = task.status || "pending";
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Optimistic update state'ini güncelle (normalize edilmiş status ile)
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(taskId, { status: normalizedStatus, timestamp: Date.now() });
      return newMap;
    });

    // Optimistic update: Local state'i güncelle (normalize edilmiş status ile)
    const updateTaskInState = <T extends { id: string; status: string }>(taskList: T[]): T[] => {
<<<<<<< HEAD
      return taskList.map(t =>
        t.id === taskId ? { ...t, status: normalizedStatus } as T : t
      );
    };

=======
      return taskList.map(t => 
        t.id === taskId ? { ...t, status: normalizedStatus } as T : t
      );
    };
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    setAllTasks(prev => updateTaskInState(prev as Array<{ id: string; status: string }>) as typeof prev);
    setMyTasks(prev => updateTaskInState(prev as Array<{ id: string; status: string }>) as typeof prev);
    setCreatedTasks(prev => updateTaskInState(prev as Array<{ id: string; status: string }>) as typeof prev);
    setArchivedTasks(prev => updateTaskInState(prev as Array<{ id: string; status: string }>) as typeof prev);

    try {
      // Yetki kontrolü: SADECE görev üyeleri (rejected hariç) ve görevi oluşturan durum değiştirebilir
      // Yöneticiler için özel durum YOK - sadece görev üyeleri durum değiştirebilir
      // Personel, ekip lideri, yönetici - görev üyesi olduğu görevin durumunu değiştirebilir
<<<<<<< HEAD

      const isCreator = task.createdBy === user.id;

      // Görevin atanan kullanıcılarını kontrol et (rejected hariç)
      const taskAssignments = await getTaskAssignments(taskId);
      const assignedUserIds = Array.isArray(taskAssignments)
        ? taskAssignments
          .filter(a => a?.status !== "rejected")
          .map(a => a?.assignedTo)
          .filter((id): id is string => !!id)
        : [];
      const isAssignedFromAssignments = assignedUserIds.includes(user.id);

=======
      
      const isCreator = task.createdBy === user.id;
      
      // Görevin atanan kullanıcılarını kontrol et (rejected hariç)
      const taskAssignments = await getTaskAssignments(taskId);
      const assignedUserIds = Array.isArray(taskAssignments) 
        ? taskAssignments
            .filter(a => a?.status !== "rejected")
            .map(a => a?.assignedTo)
            .filter((id): id is string => !!id) 
        : [];
      const isAssignedFromAssignments = assignedUserIds.includes(user.id);
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Fallback: task.assignedUsers array'inden kontrol
      const isInTaskAssignedUsers = Array.isArray(task.assignedUsers) && task.assignedUsers.some((u) => {
        if (typeof u === 'string') {
          return u === user.id;
        }
        if (typeof u === 'object' && u !== null && 'id' in u) {
          return (u as { id: string }).id === user.id;
        }
        return false;
      });
<<<<<<< HEAD

      const isAssigned = isAssignedFromAssignments || isInTaskAssignedUsers;

=======
      
      const isAssigned = isAssignedFromAssignments || isInTaskAssignedUsers;
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Sadece görev üyesi (rejected hariç) veya oluşturan ise izin var
      if (!isAssigned && !isCreator) {
        toast.error("Durum değiştirme yetkiniz yok. Sadece görev üyesi olduğunuz görevlerin durumunu değiştirebilirsiniz.");
        return;
      }

      // Durum güncellemesini yap (normalize edilmiş status ile)
      await updateTaskStatus(
        taskId,
        normalizedStatus as "pending" | "in_progress" | "completed"
      );
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Başarı mesajı göster
      const statusNames: Record<string, string> = {
        pending: "Yapılacak",
        in_progress: "Devam Ediyor",
        completed: "Tamamlandı",
      };
      toast.success(`Görev durumu "${statusNames[status] || status}" olarak güncellendi`);
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Optimistic update'i temizle (başarılı oldu)
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(taskId);
        return newMap;
      });
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // subscribeToTasks zaten real-time güncellemeleri dinliyor, 
      // bu yüzden fetchTasks() çağrısına gerek yok
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Firestore izin hatasını kullanıcıya göster
      if (errorMsg.includes("Missing or insufficient permissions") || errorMsg.includes("permission-denied") || errorMsg.includes("Firestore güvenlik kuralları")) {
        toast.error("Görev durumunu değiştirme izniniz yok. Firestore güvenlik kuralları görev üyelerine izin vermiyor. Lütfen yöneticinizle iletişime geçin.");
      } else {
        toast.error(errorMsg || "Görev durumu güncellenemedi");
      }
<<<<<<< HEAD

      if (import.meta.env.DEV) {
        console.error("Update task status error:", error);
      }

      // Rollback: Hata durumunda önceki duruma geri dön
      const rollbackTaskInState = <T extends { id: string; status: string }>(taskList: T[]): T[] => {
        return taskList.map(t =>
          t.id === taskId ? { ...t, status: previousStatus } as T : t
        );
      };

=======
      
      if (import.meta.env.DEV) {
        console.error("Update task status error:", error);
      }
      
      // Rollback: Hata durumunda önceki duruma geri dön
      const rollbackTaskInState = <T extends { id: string; status: string }>(taskList: T[]): T[] => {
        return taskList.map(t => 
          t.id === taskId ? { ...t, status: previousStatus } as T : t
        );
      };
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      setAllTasks(prev => rollbackTaskInState(prev as Array<{ id: string; status: string }>) as typeof prev);
      setMyTasks(prev => rollbackTaskInState(prev as Array<{ id: string; status: string }>) as typeof prev);
      setCreatedTasks(prev => rollbackTaskInState(prev as Array<{ id: string; status: string }>) as typeof prev);
      setArchivedTasks(prev => rollbackTaskInState(prev as Array<{ id: string; status: string }>) as typeof prev);
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Optimistic update'i temizle
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(taskId);
        return newMap;
      });
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      const errorMessage = error instanceof Error ? error.message : "Durum güncellenemedi";
      toast.error(errorMessage, {
        action: {
          label: "Tekrar Dene",
          onClick: () => {
            handleStatusChange(taskId, status);
          }
        },
        duration: 5000,
      });
    }
  };

<<<<<<< HEAD
=======
  // Onaya gönder butonu için handler - double-click koruması ile
  const [requestingApproval, setRequestingApproval] = useState<Set<string>>(new Set());
  
  const handleRequestApproval = async (taskId: string) => {
    if (!user) return;

    // Double-click koruması - eğer bu görev için zaten işlem yapılıyorsa, tekrar çalıştırma
    if (requestingApproval.has(taskId)) {
      return;
    }

    setRequestingApproval(prev => new Set(prev).add(taskId));
    try {
      await requestTaskApproval(taskId, user.id);
      toast.success("Görev onay için yöneticiye gönderildi.");
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Request approval error:", error);
      }
      toast.error("Onay isteği gönderilemedi: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    } finally {
      setRequestingApproval(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

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

      // Status'ü normalize et
      const normalizedTaskStatus = normalizeStatus(task.status);
      const normalizedTargetStatus = normalizeStatus(targetStatus);
<<<<<<< HEAD

      const currentIndex = getCurrentStatusIndex(normalizedTaskStatus, task.approvalStatus);
      const targetIndex = taskStatusWorkflow.findIndex(s => s.value === normalizedTargetStatus);

=======
      
      const currentIndex = getCurrentStatusIndex(normalizedTaskStatus, task.approvalStatus);
      const targetIndex = taskStatusWorkflow.findIndex(s => s.value === normalizedTargetStatus);
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
      // normalizedTargetStatus zaten yukarıda tanımlanmış, tekrar tanımlamaya gerek yok
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      await updateTaskStatus(
        taskId,
        normalizedTargetStatus as "pending" | "in_progress" | "completed"
      );
<<<<<<< HEAD

      // Optimistic update: Local state'i güncelle
      const updateTaskInState = <T extends { id: string; status: string }>(taskList: T[]): T[] => {
        return taskList.map(t =>
          t.id === taskId ? { ...t, status: normalizedTargetStatus } as T : t
        );
      };

=======
      
      // Optimistic update: Local state'i güncelle
      const updateTaskInState = <T extends { id: string; status: string }>(taskList: T[]): T[] => {
        return taskList.map(t => 
          t.id === taskId ? { ...t, status: normalizedTargetStatus } as T : t
        );
      };
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      setAllTasks(prev => updateTaskInState(prev as Array<{ id: string; status: string }>) as typeof prev);
      setMyTasks(prev => updateTaskInState(prev as Array<{ id: string; status: string }>) as typeof prev);
      setCreatedTasks(prev => updateTaskInState(prev as Array<{ id: string; status: string }>) as typeof prev);
      setArchivedTasks(prev => updateTaskInState(prev as Array<{ id: string; status: string }>) as typeof prev);
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      toast.success(`Görev durumu ${targetStatusItem.label} olarak geri alındı.`);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Revert status error:", error);
      }
      toast.error("Durum geri alınamadı: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    }
  };

  // Sayfa başlığı için aktif filtreyi belirle
  const getPageTitle = () => {
    if (activeFilter === "my-tasks") return "Benim Görevlerim";
    if (activeFilter === "general") return "Genel Görevler";
    if (activeFilter === "pool") return "Görev Havuzu";
    if (activeFilter === "archive") return "Arşiv";
    if (selectedProject && selectedProject !== "all" && selectedProject !== "general") {
      const project = filterableProjects.find(p => p.id === selectedProject);
      return project?.name || "Görevler";
    }
    return "Görevler";
  };

  // Breadcrumb için proje adını al
  const getProjectName = () => {
    if (selectedProject && selectedProject !== "all" && selectedProject !== "general") {
      const project = filterableProjects.find(p => p.id === selectedProject);
      return project?.name || null;
    }
    return null;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          {/* Skeleton: Başlık ve Breadcrumb */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-64" />
          </div>
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          {/* Skeleton: Filtre Card */}
          <Card className="border">
            <CardContent className="p-3">
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-full" />
              </div>
            </CardContent>
          </Card>
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          {/* Skeleton: Görev Kartları */}
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="border">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout disableScroll={false}>
<<<<<<< HEAD
      <div className={cn(
=======
        <div className={cn(
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        "space-y-2 w-[90%] max-w-[90%] mx-auto",
        viewMode === "board" ? "pb-0" : "pb-8"
      )}>
        {/* Hata Durumu */}
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive mb-1">Hata Oluştu</h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mb-3">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                      fetchTasks();
                    }}
                    className="h-8"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tekrar Dene
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        {/* Sayfa Başlığı - Sade */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[16px] sm:text-[18px] font-semibold text-foreground" id="page-title">
            {getPageTitle()}
          </h1>
          {/* İstatistikler Açılma Butonu */}
          {!statsExpanded ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatsExpanded(true)}
              className="h-7 px-2 gap-1 text-[11px] sm:text-xs"
              aria-label="İstatistikleri göster"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatsExpanded(false)}
              className="h-7 px-2 gap-1 text-[11px] sm:text-xs"
              aria-label="İstatistikleri gizle"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Uyarılar Banner - Kompakt */}
        {(pendingApprovalsCount > 0 || pendingAssignmentsCount > 0 || upcomingDeadlinesCount > 0) && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs px-2 py-1.5 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/30 rounded-md">
            {pendingApprovalsCount > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-100/50 dark:bg-amber-900/50 border-amber-300/50 dark:border-amber-700/50">
                {pendingApprovalsCount} onay
              </Badge>
            )}
            {pendingAssignmentsCount > 0 && (
              <Badge variant="outline" className="text-xs h-5 px-1.5 bg-blue-100/50 dark:bg-blue-900/50 border-blue-300/50 dark:border-blue-700/50">
                {pendingAssignmentsCount} atama
              </Badge>
            )}
            {upcomingDeadlinesCount > 0 && (
              <Badge variant="outline" className="text-xs h-5 px-1.5 bg-orange-100/50 dark:bg-orange-900/50 border-orange-300/50 dark:border-orange-700/50">
                {upcomingDeadlinesCount} deadline
              </Badge>
            )}
          </div>
        )}

        {/* İstatistikler - Sade */}
        {statsExpanded && (
          <Card className="border shadow-sm -mt-2">
            <CardContent className="p-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {/* Tümü */}
<<<<<<< HEAD
                <div
=======
                <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  className="flex items-center gap-2 p-2 rounded border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setStatusFilter("all");
                    setFocusFilter("all");
                    setSelectedProject("all");
                    setProjectFilter("all");
                  }}
                >
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Tümü</p>
                    <p className="text-lg sm:text-xl font-semibold">{listData.length}</p>
                  </div>
                </div>

                {/* Aktif */}
<<<<<<< HEAD
                <div
=======
                <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  className="flex items-center gap-2 p-2 rounded border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setStatusFilter("all");
                    setFocusFilter("all");
                  }}
                >
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Aktif</p>
                    <p className="text-lg sm:text-xl font-semibold text-blue-600">
                      {listData.filter((task: Task | FirebaseTask | unknown) => {
                        if (!task || typeof task !== 'object') return false;
                        const t = task as { status?: string; isArchived?: boolean; is_archived?: boolean };
                        return (t.status === "pending" || t.status === "in_progress") &&
<<<<<<< HEAD
                          !t.isArchived && !t.is_archived;
=======
                        !t.isArchived && !t.is_archived;
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      }).length}
                    </p>
                  </div>
                </div>

                {/* Onay Bekleyen */}
<<<<<<< HEAD
                <div
=======
                <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  className="flex items-center gap-2 p-2 rounded border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setStatusFilter("completed");
                  }}
                >
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Onay Bekleyen</p>
                    <p className="text-lg sm:text-xl font-semibold text-orange-600">
                      {listData.filter((task: Task | FirebaseTask | unknown) => {
                        if (!task || typeof task !== 'object') return false;
                        const t = task as { status?: string; approvalStatus?: string };
                        return t.status === "completed" && t.approvalStatus === "pending";
                      }).length}
                    </p>
                  </div>
                </div>

                {/* Tamamlanan */}
<<<<<<< HEAD
                <div
=======
                <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  className="flex items-center gap-2 p-2 rounded border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setStatusFilter("completed");
                    setFocusFilter("all");
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Tamamlanan</p>
                    <p className="text-lg sm:text-xl font-semibold text-emerald-600">
                      {listData.filter((task: Task | FirebaseTask | unknown) => {
                        if (!task || typeof task !== 'object') return false;
                        return (task as { status?: string }).status === "completed";
                      }).length}
                    </p>
                  </div>
                </div>

                {/* Geciken */}
<<<<<<< HEAD
                <div
=======
                <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  className="flex items-center gap-2 p-2 rounded border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setStatusFilter("all");
                    setFocusFilter("overdue");
                  }}
                >
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Geciken</p>
                    <p className="text-lg sm:text-xl font-semibold text-red-600">
                      {listData.filter((task: Task | FirebaseTask | unknown) => {
                        if (!task || typeof task !== 'object') return false;
                        return isTaskOverdue(task as Task | FirebaseTask);
                      }).length}
                    </p>
                  </div>
                </div>

                {/* Yaklaşan */}
<<<<<<< HEAD
                <div
=======
                <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  className="flex items-center gap-2 p-2 rounded border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setStatusFilter("all");
                    setFocusFilter("due_soon");
                  }}
                >
                  <CalendarDays className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Yaklaşan</p>
                    <p className="text-lg sm:text-xl font-semibold text-amber-600">
                      {listData.filter((task: Task | FirebaseTask | unknown) => {
                        if (!task || typeof task !== 'object') return false;
                        return isTaskDueSoon(task as Task | FirebaseTask);
                      }).length}
                    </p>
                  </div>
                </div>

                {/* Öncelikli */}
<<<<<<< HEAD
                <div
=======
                <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  className="flex items-center gap-2 p-2 rounded border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setStatusFilter("all");
                    setFocusFilter("high_priority");
                  }}
                >
                  <Flame className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Öncelikli</p>
                    <p className="text-lg sm:text-xl font-semibold text-purple-600">
                      {listData.filter((task: Task | FirebaseTask | unknown) => {
                        if (!task || typeof task !== 'object') return false;
                        const t = task as { priority?: number };
                        const taskPriority = t.priority || 0;
                        // Eski sistem (1-5) varsa yeni sisteme (0-5) çevir
                        const newPriority = convertOldPriorityToNew(taskPriority);
                        // Yüksek öncelik: 3 (Yüksek) ve üzeri
                        return newPriority >= 3;
                      }).length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Toplu İşlemler Toolbar */}
        {isMultiSelectMode && selectedTaskIds.size > 0 && (
          <Card className="border bg-primary/5 flex-shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] sm:text-xs font-medium text-foreground">
                    {selectedTaskIds.size} görev seçildi
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTaskIds(new Set());
                      setIsMultiSelectMode(false);
                    }}
                    className="h-7 text-[11px] sm:text-xs"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Seçimi Temizle
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (selectedTaskIds.size === 0) return;
                      const status = prompt("Yeni durum seçin:\n1. pending (Yapılacak)\n2. in_progress (Devam Ediyor)\n3. completed (Tamamlandı)");
                      if (!status || !["pending", "in_progress", "completed"].includes(status)) return;
<<<<<<< HEAD

=======
                      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      const tasksToUpdate = Array.from(selectedTaskIds);
                      for (const taskId of tasksToUpdate) {
                        try {
                          await handleStatusChange(taskId, status);
                        } catch (error: unknown) {
                          if (import.meta.env.DEV) {
                            console.error(`Failed to update task ${taskId}:`, error);
                          }
                        }
                      }
                      setSelectedTaskIds(new Set());
                      setIsMultiSelectMode(false);
                      toast.success(`${tasksToUpdate.length} görev durumu güncellendi`);
                    }}
                    className="h-7 text-[11px] sm:text-xs"
                    disabled={selectedTaskIds.size === 0}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Durum Değiştir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (selectedTaskIds.size === 0) return;
                      if (!confirm(`${selectedTaskIds.size} görevi arşivlemek istediğinize emin misiniz?`)) return;
<<<<<<< HEAD

=======
                      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      const tasksToArchive = Array.from(selectedTaskIds);
                      for (const taskId of tasksToArchive) {
                        try {
                          if (user) {
                            await archiveTask(taskId, user.id);
                          }
                        } catch (error: unknown) {
                          if (import.meta.env.DEV) {
                            console.error(`Failed to archive task ${taskId}:`, error);
                          }
                        }
                      }
                      setSelectedTaskIds(new Set());
                      setIsMultiSelectMode(false);
                      toast.success(`${tasksToArchive.length} görev arşivlendi`);
                    }}
                    className="h-7 text-[11px] sm:text-xs"
                    disabled={selectedTaskIds.size === 0}
                  >
                    <Archive className="h-3.5 w-3.5 mr-1" />
                    Arşivle
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (selectedTaskIds.size === 0) return;
                      if (!confirm(`${selectedTaskIds.size} görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
<<<<<<< HEAD

=======
                      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      const tasksToDelete = Array.from(selectedTaskIds);
                      for (const taskId of tasksToDelete) {
                        try {
                          await deleteTask(taskId);
                        } catch (error: unknown) {
                          if (import.meta.env.DEV) {
                            console.error(`Failed to delete task ${taskId}:`, error);
                          }
                        }
                      }
                      setSelectedTaskIds(new Set());
                      setIsMultiSelectMode(false);
                      toast.success(`${tasksToDelete.length} görev silindi`);
                    }}
                    className="h-7 text-[11px] sm:text-xs"
                    disabled={selectedTaskIds.size === 0}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Sil
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Kompakt Filtre Bar - Profesyonel Tek Satır Tasarım */}
        <Card className="border shadow-sm my-0">
          <CardContent className="p-1.5">
            <div className="flex flex-col gap-1">
              {/* Üst Satır: Proje Tabs ve Ana Aksiyonlar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Temizle Butonu - Sadece aktif filtre varsa göster */}
                {(statusFilter !== "all" || focusFilter !== "all" || selectedProject !== "all" || assignedUserFilter !== "all") && (
<<<<<<< HEAD
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusFilter("all");
                      setSortBy("created_at");
                      setFocusFilter("all");
                      setSelectedProject("all");
                      setProjectFilter("all");
                      setAssignedUserFilter("all");
                    }}
=======
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => { 
                      setStatusFilter("all"); 
                      setSortBy("created_at"); 
                      setFocusFilter("all"); 
                      setSelectedProject("all");
                      setProjectFilter("all");
                      setAssignedUserFilter("all");
                    }} 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                    className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Filtreleri temizle"
                    title="Filtreleri Temizle"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Temizle</span>
                  </Button>
                )}
                {/* Proje Seçimi - Arama Yapılabilen Dropdown */}
                <Popover open={projectDropdownOpen} onOpenChange={setProjectDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={projectDropdownOpen}
                      className="h-7 text-xs px-2.5 border-border/50 hover:border-primary/50 transition-colors min-w-[180px] justify-between"
                    >
                      <div className="flex items-center gap-1.5">
                        <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">
<<<<<<< HEAD
                          {selectedProject === "all" ? "Tüm Projeler" :
                            selectedProject === "general" ? "Genel Görevler" :
                              filterableProjects.find(p => p.id === selectedProject)?.name || "Proje Seçin"}
=======
                          {selectedProject === "all" ? "Tüm Projeler" : 
                           selectedProject === "general" ? "Genel Görevler" :
                           filterableProjects.find(p => p.id === selectedProject)?.name || "Proje Seçin"}
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        </span>
                      </div>
                      <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] sm:w-[400px] p-0" align="start" side="bottom" sideOffset={4}>
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Proje ara..."
                        value={projectSearchQuery}
                        onValueChange={setProjectSearchQuery}
                        className="text-[11px] sm:text-xs"
                      />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>
                          {projectSearchQuery ? "Proje bulunamadı." : "Proje bulunamadı."}
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setSelectedProject("all");
                              setProjectFilter("all");
                              setProjectDropdownOpen(false);
                              setProjectSearchQuery("");
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <CheckSquare className="h-4 w-4" />
                              <span>Tüm Projeler</span>
                              {selectedProject === "all" && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </div>
                          </CommandItem>
                          <CommandItem
                            value="general"
                            onSelect={() => {
                              setSelectedProject("general");
                              setProjectFilter("general");
                              setActiveFilter("general");
                              setProjectDropdownOpen(false);
                              setProjectSearchQuery("");
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Folder className="h-4 w-4" />
                              <span>Genel Görevler</span>
                              {selectedProject === "general" && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </div>
                          </CommandItem>
                        </CommandGroup>
                        {filterableProjects.length > 0 && (
                          <CommandGroup heading="Projeler">
                            {filterableProjects
                              .filter((project) => {
                                if (!projectSearchQuery) return true;
                                const query = projectSearchQuery.toLowerCase();
                                return project.name?.toLowerCase().includes(query);
                              })
                              .map((project) => (
                                <CommandItem
                                  key={project.id}
                                  value={project.id}
                                  onSelect={() => {
                                    setSelectedProject(project.id);
                                    setProjectFilter(project.id);
                                    setProjectDropdownOpen(false);
                                    setProjectSearchQuery("");
                                    // En son kullanılan projeyi localStorage'a kaydet
                                    localStorage.setItem('lastUsedProjectId', project.id);
                                    lastUsedProjectRef.current = project.id;
                                    // Projeleri yeniden sırala
                                    const sortedProjects = [...filterableProjects].sort((a, b) => {
                                      if (a.id === project.id) return -1;
                                      if (b.id === project.id) return 1;
                                      return 0;
                                    });
                                    setFilterableProjects(sortedProjects);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 w-full group">
                                    {project.isPrivate && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                                    <span className="flex-1">{project.name}</span>
                                    {project.id === lastUsedProjectRef.current && (
                                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                                        Son
                                      </Badge>
                                    )}
                                    {selectedProject === project.id && (
                                      <Check className="ml-2 h-4 w-4" />
                                    )}
                                    {canDeleteProjectState && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
<<<<<<< HEAD
                                        className="h-6 w-6 p-0 ml-auto"
=======
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setProjectToDelete(project);
                                          setDeleteProjectDialogOpen(true);
                                          setProjectDropdownOpen(false);
                                        }}
<<<<<<< HEAD
                                        title="Projeyi sil"
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        )}
                        {/* Proje Ekle Seçeneği - Yöneticiler ve Ekip Liderleri için */}
                        {canCreateProjectState && (
                          <CommandGroup>
                            <CommandItem
                              value="create-project"
                              onSelect={() => {
                                setCreateProjectDialogOpen(true);
                                setProjectDropdownOpen(false);
                              }}
                              className="cursor-pointer text-primary"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Plus className="h-4 w-4" />
                                <span>Proje Ekle</span>
                              </div>
                            </CommandItem>
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Kişi Filtresi - Atanan kişilere göre */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="h-7 text-xs px-2.5 border-border/50 hover:border-primary/50 transition-colors min-w-[160px] justify-between"
                    >
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">
<<<<<<< HEAD
                          {assignedUserFilter === "all"
                            ? "Tüm Kişiler"
                            : cachedUsers.find(u => u.id === assignedUserFilter)
=======
                          {assignedUserFilter === "all" 
                            ? "Tüm Kişiler" 
                            : cachedUsers.find(u => u.id === assignedUserFilter) 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                              ? getFirstName(cachedUsers.find(u => u.id === assignedUserFilter)?.fullName || cachedUsers.find(u => u.id === assignedUserFilter)?.displayName) || cachedUsers.find(u => u.id === assignedUserFilter)?.email || "Kişi Seçin"
                              : "Kişi Seçin"}
                        </span>
                      </div>
                      <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] sm:w-[300px] p-0" align="start" side="bottom" sideOffset={4}>
                    <Command>
                      <CommandInput placeholder="Kişi ara..." className="text-[11px] sm:text-xs !h-9 !py-2" />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty className="text-[10px] sm:text-[11px] py-4">Kişi bulunamadı</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setAssignedUserFilter("all");
                            }}
                            className="cursor-pointer px-2 py-1.5"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Users className="h-3 w-3" />
                              <span className="text-[11px] sm:text-xs">Tüm Kişiler</span>
                              {assignedUserFilter === "all" && (
                                <Check className="ml-auto h-3 w-3" />
                              )}
                            </div>
                          </CommandItem>
                        </CommandGroup>
                        <CommandGroup heading="Kişiler">
                          {cachedUsers.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.id}
                              onSelect={() => {
                                setAssignedUserFilter(user.id);
                              }}
                              className="cursor-pointer px-2 py-1.5"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-[9px]">
                                    {getInitials(user.fullName || user.email)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="flex-1 truncate text-[11px] sm:text-xs" title={user.fullName || user.email}>
                                  {user.fullName || user.displayName || user.email}
                                </span>
                                {assignedUserFilter === user.id && (
                                  <Check className="ml-auto h-3 w-3" />
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Sağ Taraf: Kategori - İyileştirilmiş */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Kategori Filtresi - İyileştirilmiş */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
<<<<<<< HEAD
                      <Button
                        variant="outline"
                        size="sm"
=======
                      <Button 
                        variant="outline" 
                        size="sm" 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        className="h-7 text-xs px-2.5 gap-1.5 border-border/50 hover:border-primary/50 transition-colors"
                      >
                        <Folder className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">
                          {activeFilter === "all" && "Tümü"}
                          {activeFilter === "my-tasks" && "Benim"}
                          {activeFilter === "pool" && "Havuz"}
                          {activeFilter === "archive" && "Arşiv"}
                        </span>
                        <span className="sm:hidden">
                          {activeFilter === "all" && "Tümü"}
                          {activeFilter === "my-tasks" && "Benim"}
                          {activeFilter === "pool" && "Havuz"}
                          {activeFilter === "archive" && "Arşiv"}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
<<<<<<< HEAD
                      <DropdownMenuItem
                        onClick={() => setActiveFilter("all")}
=======
                      <DropdownMenuItem 
                        onClick={() => setActiveFilter("all")} 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        className={activeFilter === "all" ? "bg-accent font-medium" : ""}
                      >
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4" />
                          <span>Tüm Görevler</span>
                        </div>
                      </DropdownMenuItem>
<<<<<<< HEAD
                      <DropdownMenuItem
                        onClick={() => setActiveFilter("my-tasks")}
=======
                      <DropdownMenuItem 
                        onClick={() => setActiveFilter("my-tasks")} 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        className={activeFilter === "my-tasks" ? "bg-accent font-medium" : ""}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>Benim Görevlerim</span>
                        </div>
                      </DropdownMenuItem>
<<<<<<< HEAD
                      <DropdownMenuItem
                        onClick={() => setActiveFilter("pool")}
=======
                      <DropdownMenuItem 
                        onClick={() => setActiveFilter("pool")} 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        className={activeFilter === "pool" ? "bg-accent font-medium" : ""}
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <span>Görev Havuzu</span>
                        </div>
                      </DropdownMenuItem>
                      {canAccessTeamManagement && (
<<<<<<< HEAD
                        <DropdownMenuItem
                          onClick={() => setActiveFilter("archive")}
=======
                        <DropdownMenuItem 
                          onClick={() => setActiveFilter("archive")} 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                          className={activeFilter === "archive" ? "bg-accent font-medium" : ""}
                        >
                          <div className="flex items-center gap-2">
                            <Archive className="h-4 w-4" />
                            <span>Arşiv</span>
                          </div>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Sağ Taraf: Görünüm Toggle ve Yeni Görev Butonu */}
                <div className="flex items-center gap-1.5 ml-auto">
                  {/* Görünüm Toggle - Yazı Olarak */}
                  <div className="flex items-center gap-0.5 border border-border/50 rounded-lg p-0.5 bg-muted/20">
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setViewMode("list");
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete("view");
                        setSearchParams(newParams, { replace: true });
                      }}
                      className="h-7 text-xs px-2.5 transition-all font-medium"
                      aria-label="Liste görünümü"
                      title="Liste Görünümü"
                    >
                      Liste
                    </Button>
                    <Button
                      variant={viewMode === "board" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setViewMode("board");
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set("view", "board");
                        setSearchParams(newParams, { replace: true });
                      }}
                      className="h-7 text-xs px-2.5 transition-all font-medium"
                      aria-label="Pano görünümü"
                      title="Pano Görünümü"
                    >
                      Pano
                    </Button>
                  </div>

                  {/* Yeni Görev Butonu - Personel göremez */}
                  {canCreate && !(user?.roles?.includes("personnel")) && (
<<<<<<< HEAD
                    <Button
                      size="sm"
                      className="h-7 text-xs px-2.5 gap-1.5 font-medium shadow-sm hover:shadow transition-all"
=======
                    <Button 
                      size="sm"
                      className="h-7 text-xs px-2.5 gap-1.5 font-medium shadow-sm hover:shadow transition-all" 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      onClick={async () => {
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
                        } catch (error: unknown) {
                          if (import.meta.env.DEV) {
                            console.error("Permission check error:", error);
                          }
                          toast.error("Yetki kontrolü yapılamadı");
                        }
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Yeni Görev</span>
                      <span className="sm:hidden">Yeni</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={inlineFormVisible} onOpenChange={setInlineFormVisible}>
<<<<<<< HEAD
          <DialogContent className="!max-w-[100vw] sm:!max-w-[95vw] md:!max-w-[85vw] !w-[100vw] sm:!w-[95vw] md:!w-[85vw] !h-[100vh] sm:!h-[90vh] md:!h-[80vh] !max-h-[100vh] sm:!max-h-[90vh] md:!max-h-[80vh] !left-0 sm:!left-[2.5vw] md:!left-[7.5vw] !top-0 sm:!top-[5vh] md:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
            <div className="flex flex-col h-full min-h-0">
              <DialogHeader className="p-3 sm:p-4 md:p-6 border-b bg-white flex-shrink-0">
                <DialogTitle className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold text-foreground">
=======
          <DialogContent className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
            {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
            <DialogTitle className="sr-only">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  {inlineFormMode === "edit" ? "Görevi Düzenle" : "Yeni Görev"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {inlineFormMode === "edit" ? "Görev bilgilerini düzenleyin" : "Yeni görev oluşturun"}
                </DialogDescription>
<<<<<<< HEAD
              </DialogHeader>
              <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 md:p-6 min-h-0">
                <div className="max-w-full mx-auto h-full overflow-y-auto overflow-x-hidden">
                  <div className="space-y-4 sm:space-y-6">
=======
            
            <div className="flex flex-col h-full min-h-0">
              <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0">
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-foreground">
                  {inlineFormMode === "edit" ? "Görevi Düzenle" : "Yeni Görev"}
                </h2>
                <p className="sr-only">
                  {inlineFormMode === "edit" ? "Görev bilgilerini düzenleyin" : "Yeni görev oluşturun"}
                </p>
              </DialogHeader>
              <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
                <div className="max-w-full mx-auto h-full overflow-y-auto">
                  <div className="space-y-6">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                    {/* Status Timeline - Sadece edit modunda ve task verisi varsa göster */}
                    {inlineFormMode === "edit" && inlineFormTaskId && (() => {
                      const currentTask = allTasks.find(t => t.id === inlineFormTaskId);
                      if (!currentTask) return null;
<<<<<<< HEAD

=======
                      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      // Status'ü normalize et (column_ prefix'ini kaldır)
                      const rawStatus = currentTask.status || "pending";
                      const currentStatus = normalizeStatus(rawStatus);
                      const currentIndex = getCurrentStatusIndex(currentStatus, currentTask.approvalStatus);
                      const nextStatus = getNextStatus(currentStatus, currentTask.approvalStatus);
                      const usersMap = cachedUsers.reduce((acc, u) => {
                        acc[u.id] = u.fullName || u.email || u.id;
                        return acc;
                      }, {} as Record<string, string>);
<<<<<<< HEAD

                      return (
                        <Card className="border-primary/20 shadow-md">
                          <CardHeader className="space-y-2 sm:space-y-1 p-4 sm:p-6 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-primary/10">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-[15px] sm:text-[16px] md:text-[17px] mb-1.5 sm:mb-1 font-semibold flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                  Görev Durumu
                                </CardTitle>
                                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed mt-1.5">
=======
                      
                      return (
                        <Card>
                          <CardHeader className="space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <CardTitle className="text-[15px] sm:text-[16px]">Görev Durumu</CardTitle>
                                <p className="text-[11px] sm:text-xs text-muted-foreground">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD
                              <div className="text-[10px] sm:text-[11px] text-muted-foreground sm:text-right flex-shrink-0 flex items-center gap-1.5 sm:flex-col sm:items-end">
                                <span className="hidden sm:inline">Son güncelleyen:</span>
                                <span className="font-semibold text-foreground">
                                  {(() => {
                                    const taskWithStatus = currentTask as unknown as FirebaseTask & { updatedBy?: string; statusUpdatedBy?: string };
                                    const lastEditorId = taskWithStatus.updatedBy || taskWithStatus.statusUpdatedBy;
                                    const lastEditorName = lastEditorId
                                      ? (usersMap[lastEditorId] || lastEditorId)
                                      : (user?.fullName || "-");
                                    if (lastEditorName && lastEditorName.length > 20) {
                                      return lastEditorName.split(" ")[0] || lastEditorName.substring(0, 20) + "...";
                                    }
                                    return lastEditorName;
                                  })()}
                                </span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 sm:p-6 md:p-8">
                            <div className="space-y-4 sm:space-y-5">
                              {/* Status Timeline */}
                              <div className="w-full py-4 sm:py-6">
                                <div className="flex items-center justify-between gap-2 sm:gap-3">
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
                                          <button
                                            type="button"
                                            onClick={canRevert ? () => handleRevertStatus(inlineFormTaskId, statusItem.value) : undefined}
                                            disabled={!canRevert}
                                            className={cn(
                                              "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 border-solid transition-all duration-200 flex-shrink-0 touch-manipulation",
                                              isActive && "bg-primary text-white border-primary shadow-lg ring-2 ring-primary/20",
                                              isCompleted && statusItem.value === "approved"
                                                ? "bg-green-600 text-white border-green-600 shadow-md"
                                                : isCompleted && statusItem.value === "completed"
                                                  ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                                                  : isCompleted && "bg-emerald-500 text-white border-emerald-500 shadow-md",
                                              !isActive && !isCompleted && statusItem.value === "pending"
                                                ? "bg-white dark:bg-gray-800 border-amber-500 text-amber-600 dark:text-amber-500 hover:border-amber-600 hover:shadow-md hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                                : !isActive && !isCompleted && statusItem.value === "in_progress"
                                                  ? "bg-white dark:bg-gray-800 border-blue-500 text-blue-600 dark:text-blue-500 hover:border-blue-600 hover:shadow-md hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                                  : !isActive && !isCompleted && statusItem.value === "completed"
                                                    ? "bg-white dark:bg-gray-800 border-emerald-500 text-emerald-600 dark:text-emerald-500 hover:border-emerald-600 hover:shadow-md hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                                    : !isActive && !isCompleted && statusItem.value === "approved"
                                                      ? "bg-white dark:bg-gray-800 border-green-500 text-green-600 dark:text-green-500 hover:border-green-600 hover:shadow-md hover:bg-green-50 dark:hover:bg-green-950/20"
                                                      : !isActive && !isCompleted && "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 hover:border-gray-400",
                                              canRevert && "cursor-pointer hover:shadow-lg active:scale-95",
                                              !canRevert && "cursor-default"
                                            )}
                                            title={canRevert ? `${statusItem.label} durumuna geri al` : undefined}
                                          >
                                            <Icon className={cn(
                                              "h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7",
                                              isActive || isCompleted ? "text-white" : "currentColor"
                                            )} />
                                          </button>
                                          <p className={cn(
                                            "text-[10px] sm:text-[11px] md:text-xs mt-2.5 sm:mt-3 text-center font-semibold leading-tight px-1 break-words",
                                            isActive ? "text-primary" : isCompleted && statusItem.value === "approved"
                                              ? "text-green-600 dark:text-green-500"
                                              : isCompleted && statusItem.value === "completed"
                                                ? "text-emerald-600 dark:text-emerald-500"
                                                : isCompleted
                                                  ? "text-emerald-600 dark:text-emerald-500"
                                                  : statusItem.value === "pending" ? "text-amber-600 dark:text-amber-500" :
                                                    statusItem.value === "in_progress" ? "text-blue-600 dark:text-blue-500" :
                                                      statusItem.value === "completed" ? "text-emerald-600 dark:text-emerald-500" :
                                                        statusItem.value === "approved" ? "text-green-600 dark:text-green-500" :
                                                          "text-gray-600 dark:text-gray-400"
                                          )}>
                                            {statusItem.label}
                                          </p>
                                        </div>
                                        {index < taskStatusWorkflow.length - 1 && (
                                          <div className={cn(
                                            "h-0.5 sm:h-1 flex-1 mx-2 sm:mx-3 mt-6 sm:mt-7 md:mt-8 min-w-[20px] border-t-2 border-dashed",
                                            isCompleted
                                              ? taskStatusWorkflow[index + 1]?.value === "approved"
                                                ? "border-green-600"
                                                : "border-emerald-500"
                                              : "border-gray-300 dark:border-gray-600"
                                          )} />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

=======
                              <div className="text-[11px] sm:text-xs text-muted-foreground text-right">
                                Son güncelleyen: {(() => {
                                  const taskWithStatus = currentTask as unknown as FirebaseTask & { updatedBy?: string; statusUpdatedBy?: string };
                                  // Önce updatedBy kontrol et (her güncellemede güncellenir), yoksa statusUpdatedBy, yoksa mevcut kullanıcı
                                  const lastEditorId = taskWithStatus.updatedBy || taskWithStatus.statusUpdatedBy;
                                  return lastEditorId 
                                    ? (usersMap[lastEditorId] || lastEditorId)
                                    : (user?.fullName || "-");
                                })()}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-4">
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
                                        <p className={`text-[11px] sm:text-xs mt-2 text-center font-medium ${isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
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
                              
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                              {/* Next Status Button / Onaya Gönder Button */}
                              {(() => {
                                // Eğer görev onaylandıysa ve tamamlandıysa, buton gösterilmez
                                if (currentStatus === "completed" && currentTask.approvalStatus === "approved") {
                                  return null;
                                }
<<<<<<< HEAD

=======
                                
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                // Buton görev üyeleri (personel, ekip lideri, yönetici) ve görevi oluşturan tarafından görüntülenebilir
                                // assignedUsers array'i bazen string array, bazen Profile array olabilir
                                let isAssigned = false;
                                if (currentTask.assignedUsers && Array.isArray(currentTask.assignedUsers)) {
                                  isAssigned = currentTask.assignedUsers.some((u) => {
                                    if (typeof u === 'string') {
                                      return u === user?.id;
                                    }
                                    if (typeof u === 'object' && u !== null && 'id' in u) {
                                      return (u as { id: string }).id === user?.id;
                                    }
                                    return false;
                                  });
                                }
<<<<<<< HEAD

=======
                                
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                // Eğer assignedUsers array'inde bulunamazsa, assignments cache'inden kontrol et
                                if (!isAssigned && inlineFormTaskId && user?.id) {
                                  const taskAssignments = assignmentsCacheRef.current.get(inlineFormTaskId) || [];
                                  isAssigned = taskAssignments.some(a => a.assignedTo === user.id && a.status !== "rejected");
                                }
<<<<<<< HEAD

                                // Görevi oluşturan kişi de butonu görebilir
                                const isCreator = currentTask.createdBy === user?.id;

                                // Sadece görev üyeleri (rejected hariç) veya oluşturan butonu görebilir
                                if (!isAssigned && !isCreator) return null;

                                // Diğer durumlar için normal geçiş butonu (pending -> in_progress, in_progress -> completed)
                                // Sadece görev üyeleri butonu görebilir (isAssigned kontrolü yukarıda yapıldı)
                                // Onay bekliyor durumunda buton gösterilmez, diğer durumlarda gösterilir
                                if (nextStatus && currentTask.approvalStatus !== "pending") {
                                  return (
                                    <div className="flex justify-center pt-4 sm:pt-5 border-t border-primary/10">
                                      <Button
                                        onClick={() => handleStatusChange(inlineFormTaskId, nextStatus.value)}
                                        className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto min-w-[140px] sm:min-w-[160px] min-h-[44px] sm:min-h-[48px] text-sm sm:text-base px-6 sm:px-8 rounded-lg group"
                                        size="lg"
                                      >
                                        {(() => {
                                          const NextIcon = nextStatus.icon;
                                          return <NextIcon className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:scale-110" />;
                                        })()}
                                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
                                        <span className="font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap">{nextStatus.label} Aşamasına Geç</span>
=======
                                
                                // Görevi oluşturan kişi de butonu görebilir
                                const isCreator = currentTask.createdBy === user?.id;
                                
                                // Sadece görev üyeleri (rejected hariç) veya oluşturan butonu görebilir
                                if (!isAssigned && !isCreator) return null;
                                
                                // Tamamlandı durumunda ve onaya gönderilmemişse "Onaya Gönder" butonu göster
                                if (currentStatus === "completed" && currentTask.approvalStatus !== "pending" && currentTask.approvalStatus !== "approved") {
                                  const isRequesting = requestingApproval.has(inlineFormTaskId);
                                  return (
                                    <div className="flex justify-center pt-4 border-t">
                                      <Button
                                        onClick={() => handleRequestApproval(inlineFormTaskId)}
                                        disabled={isRequesting}
                                        className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] min-h-[44px] text-base"
                                        size="lg"
                                      >
                                        {isRequesting ? (
                                          <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="font-semibold">Gönderiliyor...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Send className="h-4 w-4" />
                                            <span className="font-semibold">Onaya Gönder</span>
                                          </>
                                        )}
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                      </Button>
                                    </div>
                                  );
                                }
<<<<<<< HEAD

=======
                                
                                // Diğer durumlar için normal geçiş butonu (pending -> in_progress, in_progress -> completed)
                                // Sadece görev üyeleri butonu görebilir (isAssigned kontrolü yukarıda yapıldı)
                                // Onay bekliyor durumunda buton gösterilmez, diğer durumlarda gösterilir
                                if (nextStatus && currentTask.approvalStatus !== "pending") {
                                    return (
                                      <div className="flex justify-center pt-4 border-t">
                                        <Button
                                          onClick={() => handleStatusChange(inlineFormTaskId, nextStatus.value)}
                                        className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                                        size="lg"
                                        >
                                          {(() => {
                                            const NextIcon = nextStatus.icon;
                                          return <NextIcon className="h-5 w-5" />;
                                          })()}
                                        <ArrowRight className="h-4 w-4" />
                                        {nextStatus.label} Aşamasına Geç
                                        </Button>
                                      </div>
                                    );
                                }
                                
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                return null;
                              })()}

                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}
<<<<<<< HEAD

=======
                    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                    <TaskInlineForm
                      key={`${inlineFormMode}-${inlineFormTaskId || "new"}`}
                      mode={inlineFormMode}
                      projectId={projectId || null}
                      taskId={inlineFormMode === "edit" ? inlineFormTaskId : undefined}
                      defaultStatus={inlineFormDefaultStatus}
                      onCancel={closeInlineForm}
                      onSuccess={handleInlineSuccess}
                      className="border-0 shadow-none p-0"
                      showOnlyInMyTasks={activeFilter === "my-tasks"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Liste veya Pano Görünümü - Aynı İçerik */}
        {viewMode === "list" ? (
          <div className="w-full max-w-full min-w-0 overflow-x-auto">
            {/* Tablo Yapısı */}
            <div className="hidden md:block border border-[#DFE1E6] dark:border-[#38414A] rounded-sm bg-white dark:bg-[#1D2125]" style={{ width: '100%', minWidth: `${totalTableWidth}px` }}>
              {/* Tablo - Başlıklar ve İçerik Aynı Tabloda */}
              <div className="table border-collapse" style={{ tableLayout: 'fixed', width: '100%', minWidth: `${totalTableWidth}px` }}>
                {/* Tablo Başlıkları */}
                <div className="table-header-group bg-[#F4F5F7] dark:bg-[#22272B] border-b-2 border-[#DFE1E6] dark:border-[#38414A] sticky top-0 z-10 shadow-sm">
                  <div className="table-row">
<<<<<<< HEAD
                    <div
=======
                    <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      className="table-cell px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] transition-all duration-200 text-[10px] sm:text-[11px] font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A]"
                      style={{ width: columnWidths.title }}
                      onClick={() => handleSort("title")}
                    >
                      <div className="flex items-center gap-1">
                        Başlık
                        {sortColumn === "title" && (
                          sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </div>
<<<<<<< HEAD
                    <div
=======
                    <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      className="table-cell px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A]"
                      style={{ width: columnWidths.project }}
                    >
                      Proje
                    </div>
<<<<<<< HEAD
                    <div
=======
                    <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      className="table-cell px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] transition-all duration-200 text-[10px] sm:text-[11px] font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A]"
                      style={{ width: columnWidths.status }}
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        Durum
                        {sortColumn === "status" && (
                          sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </div>
<<<<<<< HEAD
                    <div
=======
                    <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      className="table-cell px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A]"
                      style={{ width: columnWidths.assignee }}
                    >
                      Atanan
                    </div>
<<<<<<< HEAD
                    <div
=======
                    <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      className="table-cell px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] transition-all duration-200 text-[10px] sm:text-[11px] font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A]"
                      style={{ width: columnWidths.priority }}
                      onClick={() => handleSort("priority")}
                    >
                      <div className="flex items-center gap-1">
                        Öncelik
                        {sortColumn === "priority" && (
                          sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </div>
<<<<<<< HEAD
                    <div
=======
                    <div 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      className="table-cell px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] transition-all duration-200 text-[10px] sm:text-[11px] font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A]"
                      style={{ width: columnWidths.dueDate }}
                      onClick={() => handleSort("dueDate")}
                    >
                      <div className="flex items-center gap-1">
                        Bitiş Tarihi
                        {sortColumn === "dueDate" && (
                          sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
<<<<<<< HEAD

                {/* Tablo İçeriği - Aynı Tablo İçinde */}
                <div
                  ref={listContainerRef}
                  style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto', display: 'table-row-group' }}
                  onScroll={(e) => {
                    // Infinite scroll: Kullanıcı listenin sonuna yaklaştığında daha fazla öğe yükle
                    const target = e.currentTarget;
                    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
                    if (scrollBottom < 500 && visibleItemsCount < listData.length) {
                      setVisibleItemsCount(prev => Math.min(prev + 25, listData.length));
                    }
                  }}
                >
                  {/* "Bana Atanan" sekmesi kaldırıldı - görevler sadece proje altında ve "Tüm Görevler" sekmesinde gözüküyor */}
                  {false && userRequests.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-[15px] sm:text-[16px] font-semibold mb-3 flex items-center gap-2">
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
                            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{req.description}</p>
                            <div className="mt-2 text-[11px] sm:text-xs text-muted-foreground">
                              {req.createdAt instanceof Object ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="my-4 border-b" />
                      <h3 className="text-[15px] sm:text-[16px] font-semibold mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Görevlerim
                      </h3>
                    </div>
                  )}

                  {(Array.isArray(listData) ? listData.slice(0, visibleItemsCount) : []).map((task: FirebaseTask) => {
                    const overdue = isTaskOverdue(task);
                    const dueSoon = isTaskDueSoon(task);
                    const optimisticUpdate = optimisticUpdates.get(task.id);
                    // Status'ü normalize et (column_ prefix'ini kaldır)
                    const rawStatus = optimisticUpdate ? optimisticUpdate.status : task.status;
                    let displayStatus = normalizeStatus(rawStatus);
                    // Eğer görev tamamlandı ve onaylandıysa, "Onaylandı" olarak göster
                    if (displayStatus === "completed" && task.approvalStatus === "approved") {
                      displayStatus = "approved";
                    }
                    const isOptimistic = !!optimisticUpdate;
                    const isSelected = selectedTaskIds.has(task.id);
                    // Geciken görevler için daha belirgin görsel işaret
                    const overdueClass = overdue ? "ring-2 ring-destructive/50 bg-destructive/5" : "";
                    // Yaklaşan görevler için subtle uyarı
                    const dueSoonClass = dueSoon && !overdue ? "bg-amber-50/50 dark:bg-amber-950/10" : "";

                    // Atanan kullanıcıları bul
                    const taskAssignments = assignmentsCacheRef.current.get(task.id) || [];
                    const assignedUserIds = taskAssignments.map(a => a.assignedTo);
                    const assignedUsers = cachedUsers.filter(u => assignedUserIds.includes(u.id));

                    // Due date'i al
                    const taskObj = task as { due_date?: string; dueDate?: Timestamp | Date | string };
                    let dueDate: string | null = null;
                    if ('due_date' in taskObj && taskObj.due_date && typeof taskObj.due_date === 'string') {
                      dueDate = taskObj.due_date;
                    } else if ('dueDate' in taskObj && taskObj.dueDate) {
                      if (taskObj.dueDate instanceof Timestamp) {
                        dueDate = taskObj.dueDate.toDate().toISOString();
                      } else if (taskObj.dueDate instanceof Date) {
                        dueDate = taskObj.dueDate.toISOString();
                      } else if (typeof taskObj.dueDate === 'string') {
                        dueDate = taskObj.dueDate;
                      }
                    }

                    const priorityDisplay = getPriorityDisplay(task.priority);

                    // Silme yetkisi kontrolü
                    const canDeleteThisTask = taskDeletePermissions.get(task.id) ?? false;

                    // Görev düzenleme yetkisi kontrolü
                    const canEditThisTask = taskEditPermissions.get(task.id) ?? false;

                    // Durum değiştirme yetkisi kontrolü
                    // SADECE görev üyesi (rejected hariç) veya oluşturan durum değiştirebilir
                    // Yöneticiler için özel durum YOK
                    const isCreator = task.createdBy === user?.id;
                    // Önce taskAssignments'tan kontrol et (rejected hariç)
                    const isAssignedFromAssignments = taskAssignments.some(a => a.assignedTo === user?.id && a.status !== "rejected");
                    // Fallback: task.assignedUsers array'inden kontrol et
                    const isAssignedFromTask = Array.isArray(task.assignedUsers) && task.assignedUsers.includes(user?.id || "");
                    const isAssigned = isAssignedFromAssignments || isAssignedFromTask;
                    const canChangeStatusForThisTask = isAssigned || isCreator;

                    return (
                      <article
                        key={task.id}
                        ref={(el: HTMLElement | null) => {
                          const index = listData.slice(0, visibleItemsCount).findIndex(t => t.id === task.id);
                          if (index >= 0) {
                            taskRefs.current[index] = el;
                          }
                        }}
                        className={cn(
                          "table-row group",
                          "border-b border-[#DFE1E6] dark:border-[#38414A] hover:bg-[#F4F5F7] dark:hover:bg-[#22272B] transition-all duration-200 cursor-pointer",
                          "bg-white dark:bg-[#1D2125]",
                          isSelected && "bg-[#E3FCEF] dark:bg-[#1C3329] border-l-4 border-l-[#006644] dark:border-l-[#4BCE97]",
                          overdue && "bg-[#FFEBE6] dark:bg-[#3D2115] border-l-4 border-l-[#DE350B] dark:border-l-[#FF5630]",
                          dueSoon && !overdue && "bg-[#FFF7E6] dark:bg-[#3D2E1A] border-l-4 border-l-[#FF8B00] dark:border-l-[#F5CD47]",
                          isOptimistic && "opacity-60",
                          focusedTaskIndex === listData.slice(0, visibleItemsCount).findIndex(t => t.id === task.id) && "ring-2 ring-[#0052CC] dark:ring-[#4C9AFF] ring-offset-2 shadow-md"
                        )}
                        role="article"
                        aria-labelledby={`task-title-${task.id}`}
                        tabIndex={focusedTaskIndex === listData.slice(0, visibleItemsCount).findIndex(t => t.id === task.id) ? 0 : -1}
                        onClick={() => !isMultiSelectMode && openTaskDetail(task.id, task.status)}
                      >
                        {/* Title */}
                        <div
                          className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A] cursor-pointer"
                          style={{ width: columnWidths.title }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openTaskDetail(task.id, task.status);
                          }}
                        >
                          <h3
                            id={`task-title-${task.id}`}
                            className="font-semibold text-[11px] sm:text-xs text-[#172B4D] dark:text-[#B6C2CF] line-clamp-1 hover:text-[#0052CC] dark:hover:text-[#4C9AFF] transition-colors leading-tight"
                          >
                            {task.title}
                          </h3>
                        </div>

                        {/* Project */}
                        <div className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]" style={{ width: columnWidths.project }}>
                          {task.projectId && projects && projects.has(task.projectId) ? (
                            <Badge
                              variant="outline"
                              className="h-3.5 px-1.5 text-[9px] font-medium border-[#DFE1E6] dark:border-[#38414A] text-[#42526E] dark:text-[#B6C2CF] bg-[#F4F5F7] dark:bg-[#22272B] leading-tight inline-flex"
                            >
                              {projects.get(task.projectId)?.name || task.projectId}
                            </Badge>
                          ) : (
                            <span className="text-[10px] sm:text-[11px] text-[#6B778C] dark:text-[#8C9CB8]">-</span>
                          )}
                        </div>

                        {/* Status - Inline Editable */}
                        <div onClick={(e) => e.stopPropagation()} className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]" style={{ width: columnWidths.status }}>
                          <Select
                            value={displayStatus}
                            onValueChange={(newStatus) => {
                              handleStatusChange(task.id, newStatus);
                            }}
                            disabled={!canChangeStatusForThisTask}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-auto min-h-[24px] px-1.5 py-0.5 text-[10px] sm:text-xs border-0 bg-transparent rounded-full w-full transition-all duration-200 flex items-center justify-center group",
                                canChangeStatusForThisTask
                                  ? "hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] cursor-pointer hover:shadow-md focus:ring-2 focus:ring-[#0052CC]/50 focus:ring-offset-2 active:scale-[0.97] focus-visible:outline-none"
                                  : "cursor-not-allowed opacity-60"
                              )}
                            >
                              <SelectValue>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "h-3.5 px-1.5 text-[9px] sm:text-[10px] font-semibold border-0 leading-tight rounded-full inline-flex items-center justify-center gap-0.5 transition-all duration-200 shadow-sm whitespace-nowrap",
                                    displayStatus === "approved" && "bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3329] dark:text-[#4BCE97] hover:bg-[#D3FCE3] dark:hover:bg-[#2A4A3A]",
                                    displayStatus === "completed" && "bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3329] dark:text-[#4BCE97] hover:bg-[#D3FCE3] dark:hover:bg-[#2A4A3A]",
                                    displayStatus === "in_progress" && "bg-[#DEEBFF] text-[#0052CC] dark:bg-[#1C2B41] dark:text-[#4C9AFF] hover:bg-[#CEDBEF] dark:hover:bg-[#2A3B51]",
                                    displayStatus === "pending" && "bg-[#DEEBFF] text-[#0052CC] dark:bg-[#1C2B41] dark:text-[#4C9AFF] hover:bg-[#CEDBEF] dark:hover:bg-[#2A3B51]",
                                    isOptimistic && "opacity-50",
                                    canChangeStatusForThisTask && "group-hover:shadow-md"
                                  )}
                                >
                                  {(() => {
                                    const statusItem = taskStatusWorkflow.find(s => s.value === displayStatus);
                                    if (statusItem) {
                                      const Icon = statusItem.icon;
                                      return (
                                        <>
                                          <Icon className="h-3 w-3 flex-shrink-0" />
                                          <span className="whitespace-nowrap text-[9px] sm:text-[10px]">{getStatusLabel(displayStatus)}</span>
                                        </>
                                      );
                                    }
                                    return <span className="whitespace-nowrap text-[9px] sm:text-[10px]">{getStatusLabel(displayStatus)}</span>;
                                  })()}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="min-w-[180px] p-1.5 shadow-lg border border-[#DFE1E6] dark:border-[#38414A] rounded-lg">
                              {taskStatusWorkflow.map((statusItem) => {
                                const Icon = statusItem.icon;
                                const isSelected = statusItem.value === displayStatus;
                                return (
                                  <SelectItem
                                    key={statusItem.value}
                                    value={statusItem.value}
                                    className={cn(
                                      "cursor-pointer rounded-md px-3 py-2.5 transition-all duration-150",
                                      "hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] hover:text-foreground",
                                      "focus:bg-[#EBECF0] dark:focus:bg-[#2C333A] focus:text-foreground",
                                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC]/50 focus-visible:ring-offset-1",
                                      "data-[highlighted]:bg-[#EBECF0] data-[highlighted]:dark:bg-[#2C333A] data-[highlighted]:text-foreground",
                                      isSelected && "bg-[#EBECF0] dark:bg-[#2C333A] font-semibold"
                                    )}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <Icon className={cn("h-3 w-3 flex-shrink-0", statusItem.color)} />
                                      <span className="text-[10px] sm:text-[11px] font-medium">{statusItem.label}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Assignee - Inline Editable - Tüm atanan kişileri göster */}
                        <div className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]" style={{ width: columnWidths.assignee }} onClick={(e) => e.stopPropagation()}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-1 hover:opacity-80 transition-opacity w-full">
                                {assignedUsers.length > 0 ? (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {assignedUsers.map((user, index) => {
                                      const firstName = getFirstName(user.fullName);
                                      return (
                                        <span
                                          key={user.id}
                                          className="text-[10px] sm:text-[11px] text-[#42526E] dark:text-[#B6C2CF] font-medium truncate max-w-[120px]"
                                          title={user.fullName || user.email}
                                        >
                                          {firstName || user.email}
                                          {index < assignedUsers.length - 1 && <span className="text-[#6B778C] dark:text-[#8C9CB8] ml-0.5">,</span>}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[10px] sm:text-[11px] text-[#6B778C] dark:text-[#8C9CB8] cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] transition-colors">-</span>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-1.5" align="start">
                              <div className="space-y-1.5">
                                <div className="text-[10px] sm:text-[11px] font-semibold mb-1.5 px-1">Kullanıcı Ata</div>
                                <Command>
                                  <CommandInput placeholder="Kullanıcı ara..." className="text-[11px] sm:text-xs !h-9 !py-2" />
                                  <CommandList>
                                    <CommandEmpty className="text-[10px] sm:text-[11px] py-4">Kullanıcı bulunamadı</CommandEmpty>
                                    <CommandGroup>
                                      {cachedUsers.map((user) => {
                                        const isAssigned = assignedUserIds.includes(user.id);
                                        return (
                                          <CommandItem
                                            key={user.id}
                                            onSelect={async () => {
                                              if (!isAssigned && user?.id) {
                                                try {
                                                  await assignTask(task.id, user.id, user?.id || "");
                                                  const firstName = getFirstName(user.fullName || user.displayName);
                                                  toast.success(`${firstName || user.email} göreve atandı`);
                                                } catch (error) {
                                                  toast.error("Kullanıcı atanırken hata oluştu");
                                                }
                                              }
                                            }}
                                            className={cn("px-2 py-1.5", isAssigned && "opacity-50")}
                                          >
                                            <div className="flex items-center gap-2 w-full">
                                              <Avatar className="h-5 w-5">
                                                <AvatarFallback className="text-[9px]">
                                                  {getInitials(user.fullName || user.email)}
                                                </AvatarFallback>
                                              </Avatar>
                                              <span className="flex-1 text-[11px] sm:text-xs" title={user.fullName || user.email}>
                                                {getFirstName(user.fullName || user.displayName) || user.email}
                                              </span>
                                              {isAssigned && <Check className="h-3 w-3 text-primary" />}
                                            </div>
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Priority - Inline Editable */}
                        <div onClick={(e) => e.stopPropagation()} className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]" style={{ width: columnWidths.priority }}>
                          <Select
                            value={String(task.priority || 1)}
                            onValueChange={async (newPriority) => {
                              try {
                                // Yeni 0-5 sistemini eski 1-5 sistemine çevir (backend uyumluluğu için)
                                const oldPriority = convertNewPriorityToOld(Number(newPriority) as PriorityLevel);
                                await updateTask(task.id, { priority: oldPriority as 1 | 2 | 3 | 4 | 5 }, user?.id);
                                toast.success("Öncelik güncellendi");
                              } catch (error) {
                                toast.error("Öncelik güncellenirken hata oluştu");
                              }
                            }}
                            disabled={!canEditThisTask}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-auto min-h-[22px] px-1.5 py-0.5 text-[10px] sm:text-[11px] border-0 bg-transparent rounded-md w-full transition-all duration-200 group",
                                canEditThisTask
                                  ? "hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] cursor-pointer hover:shadow-sm focus:ring-2 focus:ring-[#0052CC]/50 focus:ring-offset-2 active:scale-[0.97] focus-visible:outline-none"
                                  : "cursor-not-allowed opacity-60"
                              )}
                            >
                              <SelectValue>
                                <span className={cn("text-[10px] sm:text-[11px] font-medium", priorityDisplay.color)}>
                                  {priorityDisplay.label}
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="min-w-[160px] p-1.5 shadow-lg border border-[#DFE1E6] dark:border-[#38414A] rounded-lg">
                              {[
                                { value: "1", label: "Çok Düşük", icon: ChevronDown, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
                                { value: "2", label: "Düşük", icon: ChevronDown, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
                                { value: "3", label: "Orta", icon: Minus, color: "text-gray-600 dark:text-gray-400", bgColor: "bg-gray-50 dark:bg-gray-900/30" },
                                { value: "4", label: "Yüksek", icon: ChevronUp, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30" },
                                { value: "5", label: "Kritik", icon: ChevronUp, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30" },
                              ].map((priorityItem) => {
                                const Icon = priorityItem.icon;
                                const isSelected = priorityItem.value === String(task.priority || 1);
                                return (
                                  <SelectItem
                                    key={priorityItem.value}
                                    value={priorityItem.value}
                                    className={cn(
                                      "cursor-pointer rounded-md px-3 py-2.5 transition-all duration-150",
                                      "hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] hover:text-foreground",
                                      "focus:bg-[#EBECF0] dark:focus:bg-[#2C333A] focus:text-foreground",
                                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC]/50 focus-visible:ring-offset-1",
                                      "data-[highlighted]:bg-[#EBECF0] data-[highlighted]:dark:bg-[#2C333A] data-[highlighted]:text-foreground",
                                      isSelected && "bg-[#EBECF0] dark:bg-[#2C333A] font-semibold"
                                    )}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div className={cn("p-1 rounded-md", priorityItem.bgColor)}>
                                        <Icon className={cn("h-3 w-3", priorityItem.color)} />
                                      </div>
                                      <span className="text-[10px] sm:text-[11px] font-medium">{priorityItem.label}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Due Date */}
                        <div className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]" style={{ width: columnWidths.dueDate }}>
                          {dueDate ? (
                            <div className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-tight",
                              overdue
                                ? "bg-[#FFEBE6] text-[#DE350B] dark:bg-[#3D2115] dark:text-[#FF5630] border border-[#FF5630]/30"
                                : dueSoon
                                  ? "bg-[#FFF7E6] text-[#FF8B00] dark:bg-[#3D2E1A] dark:text-[#F5CD47] border border-[#FF8B00]/30"
                                  : "text-[#42526E] dark:text-[#B6C2CF]"
                            )}>
                              {overdue && <AlertCircle className="h-3 w-3" />}
                              {!overdue && <CalendarDays className="h-3 w-3" />}
                              <span className="whitespace-nowrap">{formatDueDate(dueDate)}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] sm:text-[11px] text-[#6B778C] dark:text-[#8C9CB8]">-</span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobil Görünüm - Basitleştirilmiş */}
            {(Array.isArray(listData) ? listData.slice(0, visibleItemsCount) : []).map((task: FirebaseTask) => {
              const overdue = isTaskOverdue(task);
              const dueSoon = isTaskDueSoon(task);
              const optimisticUpdate = optimisticUpdates.get(task.id);
              const rawStatus = optimisticUpdate ? optimisticUpdate.status : task.status;
              let displayStatus = normalizeStatus(rawStatus);
              // Eğer görev tamamlandı ve onaylandıysa, "Onaylandı" olarak göster
              if (displayStatus === "completed" && task.approvalStatus === "approved") {
                displayStatus = "approved";
              }
              const isOptimistic = !!optimisticUpdate;
              const isSelected = selectedTaskIds.has(task.id);

              const taskAssignments = assignmentsCacheRef.current.get(task.id) || [];
              const assignedUserIds = taskAssignments.map(a => a.assignedTo);
              const assignedUsers = cachedUsers.filter(u => assignedUserIds.includes(u.id));

              const taskObj = task as { due_date?: string; dueDate?: Timestamp | Date | string };
              let dueDate: string | null = null;
              if ('due_date' in taskObj && taskObj.due_date && typeof taskObj.due_date === 'string') {
                dueDate = taskObj.due_date;
              } else if ('dueDate' in taskObj && taskObj.dueDate) {
                if (taskObj.dueDate instanceof Timestamp) {
                  dueDate = taskObj.dueDate.toDate().toISOString();
                } else if (taskObj.dueDate instanceof Date) {
                  dueDate = taskObj.dueDate.toISOString();
                } else if (typeof taskObj.dueDate === 'string') {
                  dueDate = taskObj.dueDate;
                }
              }

              const priorityDisplay = getPriorityDisplay(task.priority);

              // Silme yetkisi kontrolü
              const canDeleteThisTask = taskDeletePermissions.get(task.id) ?? false;

              return (
                <article
                  key={`mobile-${task.id}`}
                  className={cn(
                    "md:hidden p-1.5 border-b border-[#DFE1E6] dark:border-[#38414A] w-full",
                    "bg-white dark:bg-[#1D2125]",
                    isSelected ? "bg-[#E3FCEF] dark:bg-[#1C3329]" : "",
                    overdue && "bg-[#FFEBE6] dark:bg-[#3D2115]",
                    dueSoon && !overdue && "bg-[#FFF7E6] dark:bg-[#3D2E1A]",
                    "hover:bg-[#F4F5F7] dark:hover:bg-[#22272B] transition-colors",
                    isOptimistic && "opacity-75 animate-pulse"
                  )}
                  onClick={() => openTaskDetail(task.id, task.status)}
                >
                  <div className="flex items-start gap-1.5">
                    <div className="flex-shrink-0 scale-75">
                      {getStatusIcon(displayStatus)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="font-medium text-[12px] text-[#172B4D] dark:text-[#B6C2CF] line-clamp-1 flex-1 leading-tight">
                          {task.title}
                        </h3>
                        <span className="text-[10px] font-mono text-[#42526E] dark:text-[#B6C2CF]">
                          {formatTaskKey(task.id)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-4 px-1.5 py-0 text-[10px] font-normal border-0 leading-tight",
                            displayStatus === "approved" && "bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3329] dark:text-[#4BCE97]",
                            displayStatus === "completed" && "bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3329] dark:text-[#4BCE97]",
                            displayStatus === "in_progress" && "bg-[#DEEBFF] text-[#0052CC] dark:bg-[#1C2B41] dark:text-[#4C9AFF]",
                            displayStatus === "pending" && "bg-[#F4F5F7] text-[#42526E] dark:bg-[#2C333A] dark:text-[#B6C2CF]"
                          )}
                        >
                          {getStatusLabel(displayStatus)}
                        </Badge>
                        <Badge
                          className={cn(
                            "h-4 px-1.5 py-0 text-[10px] font-normal border-0 leading-tight",
                            task.priority === 5 && "bg-[#FFEBE6] text-[#BF2600] dark:bg-[#3D2115] dark:text-[#FF5630]",
                            task.priority === 4 && "bg-[#FFE6E6] text-[#DE350B] dark:bg-[#3D2115] dark:text-[#FF5630]",
                            task.priority === 3 && "bg-[#FFF7E6] text-[#FF8B00] dark:bg-[#3D2E1A] dark:text-[#F5CD47]",
                            task.priority === 2 && "bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3329] dark:text-[#4BCE97]",
                            (!task.priority || task.priority === 1) && "bg-[#F4F5F7] text-[#42526E] dark:bg-[#2C333A] dark:text-[#B6C2CF]"
                          )}
                        >
                          {priorityDisplay.label}
                        </Badge>
                        {dueDate && (
                          <time
                            dateTime={dueDate}
                            className={cn(
                              "text-[10px] flex items-center gap-0.5 leading-tight",
                              overdue ? "text-[#DE350B] dark:text-[#FF5630]" : dueSoon ? "text-[#FF8B00] dark:text-[#F5CD47]" : "text-[#42526E] dark:text-[#B6C2CF]"
                            )}
                          >
                            <CalendarDays className="h-2.5 w-2.5" />
                            {formatDueDate(dueDate)}
                          </time>
                        )}
                        {assignedUsers.length > 0 && (
                          <div className="flex items-center -space-x-0.5">
                            {assignedUsers.slice(0, 2).map((user) => (
                              <Avatar key={user.id} className="h-4 w-4 border border-[#DFE1E6] dark:border-[#38414A]" title={user.fullName || user.email}>
                                <AvatarFallback className="text-[8px] bg-[#DFE1E6] dark:bg-[#38414A] text-[#42526E] dark:text-[#B6C2CF]">
                                  {getInitials(user.fullName || user.email)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Infinite scroll loading indicator */}
            {listData.length > visibleItemsCount && (
              <div className="py-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleItemsCount(prev => Math.min(prev + 25, listData.length))}
                  className="text-sm transition-all duration-200 hover:scale-105"
                >
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Daha Fazla Yükle ({listData.length - visibleItemsCount} görev kaldı)
                </Button>
              </div>
            )}

            {listData.length === 0 && (
              <div
                className="py-16 sm:py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30"
                role="status"
                aria-live="polite"
              >
                <div className="flex flex-col items-center gap-4 max-w-md mx-auto px-4">
                  <div className="rounded-full bg-muted p-4">
                    <CheckSquare className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-[18px] sm:text-[20px] font-semibold text-foreground">
                      {searchTerm || statusFilter !== "all" || focusFilter !== "all"
                        ? "Filtre kriterlerinize uyan görev bulunamadı"
                        : activeFilter === "my-tasks"
                          ? "Henüz size atanan görev yok"
                          : activeFilter === "archive"
                            ? "Arşivde görev bulunmuyor"
                            : "Henüz görev bulunmuyor"}
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {searchTerm || statusFilter !== "all" || focusFilter !== "all" || selectedProject !== "all"
                        ? "Aktif filtreleriniz sonuç bulamadı. Filtreleri değiştirerek tekrar deneyin."
                        : activeFilter === "my-tasks"
                          ? "Size atanan görevler burada görünecek"
                          : activeFilter === "archive"
                            ? "Arşivlenen görevler burada görünecek"
                            : "İlk görevinizi oluşturarak başlayabilirsiniz"}
                    </p>
                    {/* Aktif filtreleri göster */}
                    {(searchTerm || statusFilter !== "all" || focusFilter !== "all" || selectedProject !== "all") && (
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                        <span className="text-xs text-muted-foreground font-medium">Aktif Filtreler:</span>
                        {searchTerm && (
                          <Badge variant="secondary" className="text-xs">
                            Arama: "{searchTerm}"
                          </Badge>
                        )}
                        {statusFilter !== "all" && (
                          <Badge variant="secondary" className="text-xs">
                            Durum: {getStatusLabel(statusFilter)}
                          </Badge>
                        )}
                        {focusFilter !== "all" && (
                          <Badge variant="secondary" className="text-xs">
                            Odak: {focusFilter === "due_soon" ? "Yaklaşan" : focusFilter === "overdue" ? "Gecikti" : focusFilter === "high_priority" ? "Yüksek Öncelik" : focusFilter}
                          </Badge>
                        )}
                        {selectedProject !== "all" && (
                          <Badge variant="secondary" className="text-xs">
                            Proje: {selectedProject === "general" ? "Genel" : projects?.get(selectedProject)?.name || selectedProject}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {(searchTerm || statusFilter !== "all" || focusFilter !== "all" || selectedProject !== "all") ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setFocusFilter("all");
                        setSelectedProject("all");
                        setProjectFilter("all");
                      }}
                      className="mt-2"
                      aria-label="Filtreleri temizle"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Filtreleri Temizle
                    </Button>
                  ) : canCreate ? (
                    <Button
                      onClick={async () => {
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
                        } catch (error: unknown) {
                          console.error("Permission check error:", error);
                          toast.error("Yetki kontrolü yapılamadı");
                        }
                      }}
                      className="mt-2"
                      aria-label="Yeni görev oluştur"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      İlk Görevinizi Oluşturun
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-full min-w-0">
            <TaskBoard
              tasks={boardTasks}
              onTaskClick={(taskId, initialStatus) => openTaskDetail(taskId, initialStatus)}
              onStatusChange={handleStatusChange}
              showArchived={activeFilter === "archive"}
            />
=======
                
                {/* Tablo İçeriği - Aynı Tablo İçinde */}
          <div 
            ref={listContainerRef}
                  style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto', display: 'table-row-group' }}
            onScroll={(e) => {
              // Infinite scroll: Kullanıcı listenin sonuna yaklaştığında daha fazla öğe yükle
              const target = e.currentTarget;
              const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
              if (scrollBottom < 500 && visibleItemsCount < listData.length) {
                setVisibleItemsCount(prev => Math.min(prev + 25, listData.length));
              }
            }}
          >
                {/* "Bana Atanan" sekmesi kaldırıldı - görevler sadece proje altında ve "Tüm Görevler" sekmesinde gözüküyor */}
                {false && userRequests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-[15px] sm:text-[16px] font-semibold mb-3 flex items-center gap-2">
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
                                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{req.description}</p>
                                <div className="mt-2 text-[11px] sm:text-xs text-muted-foreground">
                                    {req.createdAt instanceof Object ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : '-'}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="my-4 border-b" />
                    <h3 className="text-[15px] sm:text-[16px] font-semibold mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Görevlerim
                    </h3>
                  </div>
                )}

                {(Array.isArray(listData) ? listData.slice(0, visibleItemsCount) : []).map((task: FirebaseTask) => {
                  const overdue = isTaskOverdue(task);
                  const dueSoon = isTaskDueSoon(task);
                  const optimisticUpdate = optimisticUpdates.get(task.id);
                  // Status'ü normalize et (column_ prefix'ini kaldır)
                  const rawStatus = optimisticUpdate ? optimisticUpdate.status : task.status;
                  let displayStatus = normalizeStatus(rawStatus);
                  // Eğer görev tamamlandı ve onaylandıysa, "Onaylandı" olarak göster
                  if (displayStatus === "completed" && task.approvalStatus === "approved") {
                    displayStatus = "approved";
                  }
                  const isOptimistic = !!optimisticUpdate;
                  const isSelected = selectedTaskIds.has(task.id);
                  // Geciken görevler için daha belirgin görsel işaret
                  const overdueClass = overdue ? "ring-2 ring-destructive/50 bg-destructive/5" : "";
                  // Yaklaşan görevler için subtle uyarı
                  const dueSoonClass = dueSoon && !overdue ? "bg-amber-50/50 dark:bg-amber-950/10" : "";

                  // Atanan kullanıcıları bul
                  const taskAssignments = assignmentsCacheRef.current.get(task.id) || [];
                  const assignedUserIds = taskAssignments.map(a => a.assignedTo);
                  const assignedUsers = cachedUsers.filter(u => assignedUserIds.includes(u.id));
                  
                  // Due date'i al
                  const taskObj = task as { due_date?: string; dueDate?: Timestamp | Date | string };
                  let dueDate: string | null = null;
                  if ('due_date' in taskObj && taskObj.due_date && typeof taskObj.due_date === 'string') {
                    dueDate = taskObj.due_date;
                  } else if ('dueDate' in taskObj && taskObj.dueDate) {
                    if (taskObj.dueDate instanceof Timestamp) {
                      dueDate = taskObj.dueDate.toDate().toISOString();
                    } else if (taskObj.dueDate instanceof Date) {
                      dueDate = taskObj.dueDate.toISOString();
                    } else if (typeof taskObj.dueDate === 'string') {
                      dueDate = taskObj.dueDate;
                    }
                  }
                  
                  const priorityDisplay = getPriorityDisplay(task.priority);
                  
                  // Görev düzenleme yetkisi kontrolü
                  // Personel rolündeki kullanıcılar düzenleme yapamaz
                  // Sadece görevi oluşturan kişi, super admin veya canUpdate yetkisi olanlar düzenleyebilir
                  const isPersonnel = user?.roles?.includes("personnel") || false;
                  const canEditThisTask = !isPersonnel && (isSuperAdmin || canUpdate || task.createdBy === user?.id);
                  
                  // Durum değiştirme yetkisi kontrolü
                  // SADECE görev üyesi (rejected hariç) veya oluşturan durum değiştirebilir
                  // Yöneticiler için özel durum YOK
                  const isCreator = task.createdBy === user?.id;
                  // Önce taskAssignments'tan kontrol et (rejected hariç)
                  const isAssignedFromAssignments = taskAssignments.some(a => a.assignedTo === user?.id && a.status !== "rejected");
                  // Fallback: task.assignedUsers array'inden kontrol et
                  const isAssignedFromTask = Array.isArray(task.assignedUsers) && task.assignedUsers.includes(user?.id || "");
                  const isAssigned = isAssignedFromAssignments || isAssignedFromTask;
                  const canChangeStatusForThisTask = isAssigned || isCreator;

                  return (
                    <article
                      key={task.id}
                      ref={(el: HTMLElement | null) => {
                        const index = listData.slice(0, visibleItemsCount).findIndex(t => t.id === task.id);
                        if (index >= 0) {
                          taskRefs.current[index] = el;
                        }
                      }}
                      className={cn(
                        "table-row group",
                        "border-b border-[#DFE1E6] dark:border-[#38414A] hover:bg-[#F4F5F7] dark:hover:bg-[#22272B] transition-all duration-200 cursor-pointer",
                        "bg-white dark:bg-[#1D2125]",
                        isSelected && "bg-[#E3FCEF] dark:bg-[#1C3329] border-l-4 border-l-[#006644] dark:border-l-[#4BCE97]",
                        overdue && "bg-[#FFEBE6] dark:bg-[#3D2115] border-l-4 border-l-[#DE350B] dark:border-l-[#FF5630]",
                        dueSoon && !overdue && "bg-[#FFF7E6] dark:bg-[#3D2E1A] border-l-4 border-l-[#FF8B00] dark:border-l-[#F5CD47]",
                        isOptimistic && "opacity-60",
                        focusedTaskIndex === listData.slice(0, visibleItemsCount).findIndex(t => t.id === task.id) && "ring-2 ring-[#0052CC] dark:ring-[#4C9AFF] ring-offset-2 shadow-md"
                      )}
                      role="article"
                      aria-labelledby={`task-title-${task.id}`}
                      tabIndex={focusedTaskIndex === listData.slice(0, visibleItemsCount).findIndex(t => t.id === task.id) ? 0 : -1}
                      onClick={() => !isMultiSelectMode && openTaskDetail(task.id, task.status)}
                    >
                      {/* Title */}
                      <div 
                        className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A] cursor-pointer"
                        style={{ width: columnWidths.title }}
                              onClick={(e) => {
                                e.stopPropagation();
                              openTaskDetail(task.id, task.status);
                          }}
                        >
                            <h3 
                              id={`task-title-${task.id}`}
                          className="font-semibold text-[11px] sm:text-xs text-[#172B4D] dark:text-[#B6C2CF] line-clamp-1 hover:text-[#0052CC] dark:hover:text-[#4C9AFF] transition-colors leading-tight"
                            >
                              {task.title}
                            </h3>
                          </div>
                          
                      {/* Project */}
                      <div className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]" style={{ width: columnWidths.project }}>
                        {task.projectId && projects && projects.has(task.projectId) ? (
                          <Badge 
                            variant="outline" 
                            className="h-3.5 px-1.5 text-[9px] font-medium border-[#DFE1E6] dark:border-[#38414A] text-[#42526E] dark:text-[#B6C2CF] bg-[#F4F5F7] dark:bg-[#22272B] leading-tight inline-flex"
                          >
                            {projects.get(task.projectId)?.name || task.projectId}
                          </Badge>
                        ) : (
                          <span className="text-[10px] sm:text-[11px] text-[#6B778C] dark:text-[#8C9CB8]">-</span>
                        )}
                      </div>
                          
                      {/* Status - Inline Editable */}
                      <div onClick={(e) => e.stopPropagation()} className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]" style={{ width: columnWidths.status }}>
                        <Select
                          value={displayStatus}
                          onValueChange={(newStatus) => {
                            handleStatusChange(task.id, newStatus);
                          }}
                          disabled={!canChangeStatusForThisTask}
                        >
                          <SelectTrigger 
                            className={cn(
                              "h-auto min-h-[24px] px-1.5 py-0.5 text-[10px] sm:text-xs border-0 bg-transparent rounded-full w-full transition-all duration-200 flex items-center justify-center group",
                              canChangeStatusForThisTask 
                                ? "hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] cursor-pointer hover:shadow-md focus:ring-2 focus:ring-[#0052CC]/50 focus:ring-offset-2 active:scale-[0.97] focus-visible:outline-none" 
                                : "cursor-not-allowed opacity-60"
                            )}
                          >
                            <SelectValue>
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                  "h-3.5 px-1.5 text-[9px] sm:text-[10px] font-semibold border-0 leading-tight rounded-full inline-flex items-center justify-center gap-0.5 transition-all duration-200 shadow-sm whitespace-nowrap",
                                  displayStatus === "approved" && "bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3329] dark:text-[#4BCE97] hover:bg-[#D3FCE3] dark:hover:bg-[#2A4A3A]",
                                  displayStatus === "completed" && "bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3329] dark:text-[#4BCE97] hover:bg-[#D3FCE3] dark:hover:bg-[#2A4A3A]",
                                  displayStatus === "in_progress" && "bg-[#DEEBFF] text-[#0052CC] dark:bg-[#1C2B41] dark:text-[#4C9AFF] hover:bg-[#CEDBEF] dark:hover:bg-[#2A3B51]",
                                  displayStatus === "pending" && "bg-[#DEEBFF] text-[#0052CC] dark:bg-[#1C2B41] dark:text-[#4C9AFF] hover:bg-[#CEDBEF] dark:hover:bg-[#2A3B51]",
                                  isOptimistic && "opacity-50",
                                  canChangeStatusForThisTask && "group-hover:shadow-md"
                                )}
                            >
                              {(() => {
                                const statusItem = taskStatusWorkflow.find(s => s.value === displayStatus);
                                if (statusItem) {
                                  const Icon = statusItem.icon;
                                  return (
                                    <>
                                      <Icon className="h-3 w-3 flex-shrink-0" />
                                      <span className="whitespace-nowrap text-[9px] sm:text-[10px]">{getStatusLabel(displayStatus)}</span>
                                    </>
                                  );
                                }
                                return <span className="whitespace-nowrap text-[9px] sm:text-[10px]">{getStatusLabel(displayStatus)}</span>;
                              })()}
                            </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="min-w-[180px] p-1.5 shadow-lg border border-[#DFE1E6] dark:border-[#38414A] rounded-lg">
                            {taskStatusWorkflow.map((statusItem) => {
                              const Icon = statusItem.icon;
                              const isSelected = statusItem.value === displayStatus;
                              return (
                                <SelectItem 
                                  key={statusItem.value} 
                                  value={statusItem.value}
                                  className={cn(
                                    "cursor-pointer rounded-md px-3 py-2.5 transition-all duration-150",
                                    "hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] hover:text-foreground",
                                    "focus:bg-[#EBECF0] dark:focus:bg-[#2C333A] focus:text-foreground",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC]/50 focus-visible:ring-offset-1",
                                    "data-[highlighted]:bg-[#EBECF0] data-[highlighted]:dark:bg-[#2C333A] data-[highlighted]:text-foreground",
                                    isSelected && "bg-[#EBECF0] dark:bg-[#2C333A] font-semibold"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <Icon className={cn("h-3 w-3 flex-shrink-0", statusItem.color)} />
                                    <span className="text-[10px] sm:text-[11px] font-medium">{statusItem.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Assignee - Inline Editable - Tüm atanan kişileri göster */}
                      <div className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]" style={{ width: columnWidths.assignee }} onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="flex items-center gap-1 hover:opacity-80 transition-opacity w-full">
                              {assignedUsers.length > 0 ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {assignedUsers.map((user, index) => {
                                    const firstName = getFirstName(user.fullName);
                                    return (
                                      <span 
                                        key={user.id} 
                                        className="text-[10px] sm:text-[11px] text-[#42526E] dark:text-[#B6C2CF] font-medium truncate max-w-[120px]" 
                                        title={user.fullName || user.email}
                                      >
                                        {firstName || user.email}
                                        {index < assignedUsers.length - 1 && <span className="text-[#6B778C] dark:text-[#8C9CB8] ml-0.5">,</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-[10px] sm:text-[11px] text-[#6B778C] dark:text-[#8C9CB8] cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] transition-colors">-</span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-1.5" align="start">
                            <div className="space-y-1.5">
                              <div className="text-[10px] sm:text-[11px] font-semibold mb-1.5 px-1">Kullanıcı Ata</div>
                              <Command>
                                <CommandInput placeholder="Kullanıcı ara..." className="text-[11px] sm:text-xs !h-9 !py-2" />
                                <CommandList>
                                  <CommandEmpty className="text-[10px] sm:text-[11px] py-4">Kullanıcı bulunamadı</CommandEmpty>
                                  <CommandGroup>
                                    {cachedUsers.map((user) => {
                                      const isAssigned = assignedUserIds.includes(user.id);
                                      return (
                                        <CommandItem
                                          key={user.id}
                                          onSelect={async () => {
                                            if (!isAssigned && user?.id) {
                                              try {
                                                await assignTask(task.id, user.id, user?.id || "");
                                                const firstName = getFirstName(user.fullName || user.displayName);
                                                toast.success(`${firstName || user.email} göreve atandı`);
                                              } catch (error) {
                                                toast.error("Kullanıcı atanırken hata oluştu");
                                              }
                                            }
                                          }}
                                          className={cn("px-2 py-1.5", isAssigned && "opacity-50")}
                                        >
                                          <div className="flex items-center gap-2 w-full">
                                            <Avatar className="h-5 w-5">
                                              <AvatarFallback className="text-[9px]">
                                                {getInitials(user.fullName || user.email)}
                                          </AvatarFallback>
                                        </Avatar>
                                            <span className="flex-1 text-[11px] sm:text-xs" title={user.fullName || user.email}>
                                              {getFirstName(user.fullName || user.displayName) || user.email}
                                            </span>
                                            {isAssigned && <Check className="h-3 w-3 text-primary" />}
                                          </div>
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      {/* Priority - Inline Editable */}
                      <div onClick={(e) => e.stopPropagation()} className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]" style={{ width: columnWidths.priority }}>
                        <Select
                          value={String(task.priority || 1)}
                          onValueChange={async (newPriority) => {
                            try {
                              // Yeni 0-5 sistemini eski 1-5 sistemine çevir (backend uyumluluğu için)
                              const oldPriority = convertNewPriorityToOld(Number(newPriority) as PriorityLevel);
                              await updateTask(task.id, { priority: oldPriority as 1 | 2 | 3 | 4 | 5 }, user?.id);
                              toast.success("Öncelik güncellendi");
                            } catch (error) {
                              toast.error("Öncelik güncellenirken hata oluştu");
                            }
                          }}
                          disabled={!canEditThisTask}
                        >
                          <SelectTrigger 
                            className={cn(
                              "h-auto min-h-[22px] px-1.5 py-0.5 text-[10px] sm:text-[11px] border-0 bg-transparent rounded-md w-full transition-all duration-200 group",
                              canEditThisTask 
                                ? "hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] cursor-pointer hover:shadow-sm focus:ring-2 focus:ring-[#0052CC]/50 focus:ring-offset-2 active:scale-[0.97] focus-visible:outline-none" 
                                : "cursor-not-allowed opacity-60"
                            )}
                          >
                            <SelectValue>
                              <span className={cn("text-[10px] sm:text-[11px] font-medium", priorityDisplay.color)}>
                                {priorityDisplay.label}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="min-w-[160px] p-1.5 shadow-lg border border-[#DFE1E6] dark:border-[#38414A] rounded-lg">
                            {[
                              { value: "1", label: "Çok Düşük", icon: ChevronDown, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
                              { value: "2", label: "Düşük", icon: ChevronDown, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
                              { value: "3", label: "Orta", icon: Minus, color: "text-gray-600 dark:text-gray-400", bgColor: "bg-gray-50 dark:bg-gray-900/30" },
                              { value: "4", label: "Yüksek", icon: ChevronUp, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30" },
                              { value: "5", label: "Kritik", icon: ChevronUp, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30" },
                            ].map((priorityItem) => {
                              const Icon = priorityItem.icon;
                              const isSelected = priorityItem.value === String(task.priority || 1);
                              return (
                                <SelectItem 
                                  key={priorityItem.value} 
                                  value={priorityItem.value}
                                  className={cn(
                                    "cursor-pointer rounded-md px-3 py-2.5 transition-all duration-150",
                                    "hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] hover:text-foreground",
                                    "focus:bg-[#EBECF0] dark:focus:bg-[#2C333A] focus:text-foreground",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC]/50 focus-visible:ring-offset-1",
                                    "data-[highlighted]:bg-[#EBECF0] data-[highlighted]:dark:bg-[#2C333A] data-[highlighted]:text-foreground",
                                    isSelected && "bg-[#EBECF0] dark:bg-[#2C333A] font-semibold"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={cn("p-1 rounded-md", priorityItem.bgColor)}>
                                      <Icon className={cn("h-3 w-3", priorityItem.color)} />
                                    </div>
                                    <span className="text-[10px] sm:text-[11px] font-medium">{priorityItem.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Due Date */}
                      <div className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]" style={{ width: columnWidths.dueDate }}>
                        {dueDate ? (
                          <div className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-tight",
                            overdue 
                              ? "bg-[#FFEBE6] text-[#DE350B] dark:bg-[#3D2115] dark:text-[#FF5630] border border-[#FF5630]/30" 
                              : dueSoon 
                                ? "bg-[#FFF7E6] text-[#FF8B00] dark:bg-[#3D2E1A] dark:text-[#F5CD47] border border-[#FF8B00]/30"
                                : "text-[#42526E] dark:text-[#B6C2CF]"
                          )}>
                            {overdue && <AlertCircle className="h-3 w-3" />}
                            {!overdue && <CalendarDays className="h-3 w-3" />}
                            <span className="whitespace-nowrap">{formatDueDate(dueDate)}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] sm:text-[11px] text-[#6B778C] dark:text-[#8C9CB8]">-</span>
                        )}
                      </div>
                          
                        
                    </article>
                  );
                })}
                </div>
              </div>
                        </div>
                        
                {/* Mobil Görünüm - Basitleştirilmiş */}
                {(Array.isArray(listData) ? listData.slice(0, visibleItemsCount) : []).map((task: FirebaseTask) => {
                  const overdue = isTaskOverdue(task);
                  const dueSoon = isTaskDueSoon(task);
                  const optimisticUpdate = optimisticUpdates.get(task.id);
                  const rawStatus = optimisticUpdate ? optimisticUpdate.status : task.status;
                  let displayStatus = normalizeStatus(rawStatus);
                  // Eğer görev tamamlandı ve onaylandıysa, "Onaylandı" olarak göster
                  if (displayStatus === "completed" && task.approvalStatus === "approved") {
                    displayStatus = "approved";
                  }
                  const isOptimistic = !!optimisticUpdate;
                  const isSelected = selectedTaskIds.has(task.id);
                  
                  const taskAssignments = assignmentsCacheRef.current.get(task.id) || [];
                  const assignedUserIds = taskAssignments.map(a => a.assignedTo);
                  const assignedUsers = cachedUsers.filter(u => assignedUserIds.includes(u.id));
                  
                  const taskObj = task as { due_date?: string; dueDate?: Timestamp | Date | string };
                  let dueDate: string | null = null;
                  if ('due_date' in taskObj && taskObj.due_date && typeof taskObj.due_date === 'string') {
                    dueDate = taskObj.due_date;
                  } else if ('dueDate' in taskObj && taskObj.dueDate) {
                    if (taskObj.dueDate instanceof Timestamp) {
                      dueDate = taskObj.dueDate.toDate().toISOString();
                    } else if (taskObj.dueDate instanceof Date) {
                      dueDate = taskObj.dueDate.toISOString();
                    } else if (typeof taskObj.dueDate === 'string') {
                      dueDate = taskObj.dueDate;
                    }
                  }
                  
                  const priorityDisplay = getPriorityDisplay(task.priority);

                  return (
                    <article
                      key={`mobile-${task.id}`}
                      className={cn(
                        "md:hidden p-1.5 border-b border-[#DFE1E6] dark:border-[#38414A] w-full",
                        "bg-white dark:bg-[#1D2125]",
                        isSelected ? "bg-[#E3FCEF] dark:bg-[#1C3329]" : "",
                        overdue && "bg-[#FFEBE6] dark:bg-[#3D2115]",
                        dueSoon && !overdue && "bg-[#FFF7E6] dark:bg-[#3D2E1A]",
                        "hover:bg-[#F4F5F7] dark:hover:bg-[#22272B] transition-colors",
                        isOptimistic && "opacity-75 animate-pulse"
                      )}
                      onClick={() => openTaskDetail(task.id, task.status)}
                    >
                      <div className="flex items-start gap-1.5">
                        <div className="flex-shrink-0 scale-75">
                          {getStatusIcon(displayStatus)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h3 className="font-medium text-[12px] text-[#172B4D] dark:text-[#B6C2CF] line-clamp-1 flex-1 leading-tight">
                              {task.title}
                            </h3>
                            <span className="text-[10px] font-mono text-[#42526E] dark:text-[#B6C2CF]">
                              {formatTaskKey(task.id)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge 
                              variant="secondary" 
                                className={cn(
                                "h-4 px-1 text-[10px] font-normal border-0 leading-tight",
                                displayStatus === "approved" && "bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3329] dark:text-[#4BCE97]",
                                displayStatus === "completed" && "bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3329] dark:text-[#4BCE97]",
                                displayStatus === "in_progress" && "bg-[#DEEBFF] text-[#0052CC] dark:bg-[#1C2B41] dark:text-[#4C9AFF]",
                                displayStatus === "pending" && "bg-[#F4F5F7] text-[#42526E] dark:bg-[#2C333A] dark:text-[#B6C2CF]"
                              )}
                            >
                              {getStatusLabel(displayStatus)}
                            </Badge>
                            <Badge 
                              className={cn(
                                "h-4 px-1 text-[10px] font-normal border-0 leading-tight",
                                task.priority === 5 && "bg-[#FFEBE6] text-[#BF2600] dark:bg-[#3D2115] dark:text-[#FF5630]",
                                task.priority === 4 && "bg-[#FFE6E6] text-[#DE350B] dark:bg-[#3D2115] dark:text-[#FF5630]",
                                task.priority === 3 && "bg-[#FFF7E6] text-[#FF8B00] dark:bg-[#3D2E1A] dark:text-[#F5CD47]",
                                task.priority === 2 && "bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3329] dark:text-[#4BCE97]",
                                (!task.priority || task.priority === 1) && "bg-[#F4F5F7] text-[#42526E] dark:bg-[#2C333A] dark:text-[#B6C2CF]"
                              )}
                            >
                              {priorityDisplay.label}
                            </Badge>
                            {dueDate && (
                              <time 
                                dateTime={dueDate}
                                className={cn(
                                  "text-[10px] flex items-center gap-0.5 leading-tight",
                                  overdue ? "text-[#DE350B] dark:text-[#FF5630]" : dueSoon ? "text-[#FF8B00] dark:text-[#F5CD47]" : "text-[#42526E] dark:text-[#B6C2CF]"
                                )}
                              >
                                <CalendarDays className="h-2.5 w-2.5" />
                                {formatDueDate(dueDate)}
                              </time>
                            )}
                            {assignedUsers.length > 0 && (
                              <div className="flex items-center -space-x-0.5">
                                {assignedUsers.slice(0, 2).map((user) => (
                                  <Avatar key={user.id} className="h-4 w-4 border border-[#DFE1E6] dark:border-[#38414A]" title={user.fullName || user.email}>
                                    <AvatarFallback className="text-[8px] bg-[#DFE1E6] dark:bg-[#38414A] text-[#42526E] dark:text-[#B6C2CF]">
                                      {getInitials(user.fullName || user.email)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                        </div>
                      )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {/* Infinite scroll loading indicator */}
                {listData.length > visibleItemsCount && (
                  <div className="py-8 text-center">
                    <Button
                                      variant="outline" 
                      onClick={() => setVisibleItemsCount(prev => Math.min(prev + 25, listData.length))}
                      className="text-sm transition-all duration-200 hover:scale-105"
                    >
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Daha Fazla Yükle ({listData.length - visibleItemsCount} görev kaldı)
                    </Button>
                  </div>
                )}

                {listData.length === 0 && (
                  <div 
                    className="py-16 sm:py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex flex-col items-center gap-4 max-w-md mx-auto px-4">
                      <div className="rounded-full bg-muted p-4">
                        <CheckSquare className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50" aria-hidden="true" />
                              </div>
                      <div className="space-y-2">
                        <h2 className="text-[18px] sm:text-[20px] font-semibold text-foreground">
                          {searchTerm || statusFilter !== "all" || focusFilter !== "all"
                            ? "Filtre kriterlerinize uyan görev bulunamadı"
                            : activeFilter === "my-tasks"
                            ? "Henüz size atanan görev yok"
                            : activeFilter === "archive"
                            ? "Arşivde görev bulunmuyor"
                            : "Henüz görev bulunmuyor"}
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground">
                          {searchTerm || statusFilter !== "all" || focusFilter !== "all" || selectedProject !== "all"
                            ? "Aktif filtreleriniz sonuç bulamadı. Filtreleri değiştirerek tekrar deneyin."
                            : activeFilter === "my-tasks"
                            ? "Size atanan görevler burada görünecek"
                            : activeFilter === "archive"
                            ? "Arşivlenen görevler burada görünecek"
                            : "İlk görevinizi oluşturarak başlayabilirsiniz"}
                        </p>
                        {/* Aktif filtreleri göster */}
                        {(searchTerm || statusFilter !== "all" || focusFilter !== "all" || selectedProject !== "all") && (
                          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                            <span className="text-xs text-muted-foreground font-medium">Aktif Filtreler:</span>
                            {searchTerm && (
                              <Badge variant="secondary" className="text-xs">
                                Arama: "{searchTerm}"
                              </Badge>
                            )}
                            {statusFilter !== "all" && (
                              <Badge variant="secondary" className="text-xs">
                                Durum: {getStatusLabel(statusFilter)}
                            </Badge>
                            )}
                            {focusFilter !== "all" && (
                              <Badge variant="secondary" className="text-xs">
                                Odak: {focusFilter === "due_soon" ? "Yaklaşan" : focusFilter === "overdue" ? "Gecikti" : focusFilter === "high_priority" ? "Yüksek Öncelik" : focusFilter}
                              </Badge>
                            )}
                            {selectedProject !== "all" && (
                              <Badge variant="secondary" className="text-xs">
                                Proje: {selectedProject === "general" ? "Genel" : projects?.get(selectedProject)?.name || selectedProject}
                              </Badge>
                            )}
                          </div>
                            )}
                          </div>
                      {(searchTerm || statusFilter !== "all" || focusFilter !== "all" || selectedProject !== "all") ? (
                                <Button
                          variant="outline"
                          onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                            setFocusFilter("all");
                            setSelectedProject("all");
                            setProjectFilter("all");
                          }}
                          className="mt-2"
                          aria-label="Filtreleri temizle"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Filtreleri Temizle
                        </Button>
                      ) : canCreate ? (
                              <Button
                                onClick={async () => {
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
                            } catch (error: unknown) {
                              console.error("Permission check error:", error);
                              toast.error("Yetki kontrolü yapılamadı");
                            }
                          }}
                          className="mt-2"
                          aria-label="Yeni görev oluştur"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          İlk Görevinizi Oluşturun
                              </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
        ) : (
          <div className="w-full max-w-full min-w-0 overflow-x-auto">
            <div className="min-w-0">
              <TaskBoard
                tasks={boardTasks}
                onTaskClick={(taskId, initialStatus) => openTaskDetail(taskId, initialStatus)}
                onStatusChange={handleStatusChange}
                showArchived={activeFilter === "archive"}
              />
            </div>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          </div>
        )}

        {/* Advanced Search Dialog */}
        <Dialog open={advancedSearchOpen} onOpenChange={setAdvancedSearchOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gelişmiş Arama</DialogTitle>
              <DialogDescription>
                Görevleri detaylı kriterlere göre arayın ve filtreleyin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search-title">Başlık</Label>
                  <Input
                    id="search-title"
                    value={advancedSearchFilters.title}
                    onChange={(e) => setAdvancedSearchFilters(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Başlıkta ara..."
                    className="mt-1"
                  />
<<<<<<< HEAD
                </div>
=======
                    </div>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                <div>
                  <Label htmlFor="search-description">Açıklama</Label>
                  <Input
                    id="search-description"
                    value={advancedSearchFilters.description}
                    onChange={(e) => setAdvancedSearchFilters(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Açıklamada ara..."
                    className="mt-1"
                  />
<<<<<<< HEAD
                </div>
=======
                  </div>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                <div>
                  <Label htmlFor="search-status">Durum</Label>
                  <Select
                    value={advancedSearchFilters.status}
                    onValueChange={(value) => setAdvancedSearchFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      <SelectItem value="pending">Beklemede</SelectItem>
                      <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                      <SelectItem value="completed">Tamamlandı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="search-priority">Öncelik</Label>
                  <Select
                    value={advancedSearchFilters.priority}
                    onValueChange={(value) => setAdvancedSearchFilters(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Öncelikler</SelectItem>
                      {PRIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          {opt.label} ({opt.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="search-project">Proje</Label>
                  <Select
                    value={advancedSearchFilters.projectId}
                    onValueChange={(value) => setAdvancedSearchFilters(prev => ({ ...prev, projectId: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
<<<<<<< HEAD
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Projeler</SelectItem>
                      <SelectItem value="general">Genel Görevler</SelectItem>
                      {filterableProjects.map(proj => (
                        <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
=======
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tüm Projeler</SelectItem>
                          <SelectItem value="general">Genel Görevler</SelectItem>
                      {filterableProjects.map(proj => (
                        <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                <div>
                  <Label htmlFor="search-assigned">Atanan Kişi</Label>
                  <Select
                    value={advancedSearchFilters.assignedTo}
                    onValueChange={(value) => setAdvancedSearchFilters(prev => ({ ...prev, assignedTo: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Kullanıcılar</SelectItem>
                      {cachedUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.fullName || user.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="search-due-from">Bitiş Tarihi (Başlangıç)</Label>
                  <Input
                    id="search-due-from"
                    type="date"
                    value={advancedSearchFilters.dueDateFrom}
                    onChange={(e) => setAdvancedSearchFilters(prev => ({ ...prev, dueDateFrom: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="search-due-to">Bitiş Tarihi (Bitiş)</Label>
                  <Input
                    id="search-due-to"
                    type="date"
                    value={advancedSearchFilters.dueDateTo}
                    onChange={(e) => setAdvancedSearchFilters(prev => ({ ...prev, dueDateTo: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAdvancedSearchFilters({
                    title: "",
                    description: "",
                    status: "all",
                    priority: "all",
                    projectId: "all",
                    assignedTo: "all",
                    dueDateFrom: "",
                    dueDateTo: "",
                  });
                  setSearchTerm("");
                  setStatusFilter("all");
                  setSelectedProject("all");
                }}
              >
                Temizle
              </Button>
              <Button
                onClick={() => {
                  // Advanced search filtrelerini uygula
                  let searchText = "";
                  if (advancedSearchFilters.title) searchText += advancedSearchFilters.title + " ";
                  if (advancedSearchFilters.description) searchText += advancedSearchFilters.description + " ";
                  setSearchTerm(searchText.trim());
                  if (advancedSearchFilters.status !== "all") setStatusFilter(advancedSearchFilters.status);
                  if (advancedSearchFilters.projectId !== "all") {
                    setSelectedProject(advancedSearchFilters.projectId);
                    setProjectFilter(advancedSearchFilters.projectId);
                  }
                  setAdvancedSearchOpen(false);
                  toast.success("Arama filtreleri uygulandı");
                }}
              >
                Ara
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Project Dialog */}
        <Dialog open={createProjectDialogOpen} onOpenChange={setCreateProjectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Proje Oluştur</DialogTitle>
              <DialogDescription>
                Yeni bir proje oluşturun. Proje adı zorunludur.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project_name">
                  Proje Adı <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="project_name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Proje adını girin..."
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="project_description">Açıklama</Label>
                <Textarea
                  id="project_description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Proje açıklaması (isteğe bağlı)..."
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateProjectDialogOpen(false);
                  setNewProjectName("");
                  setNewProjectDescription("");
                }}
              >
                İptal
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
              >
                Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Project Dialog */}
        <AlertDialog open={deleteProjectDialogOpen} onOpenChange={setDeleteProjectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Projeyi Sil</AlertDialogTitle>
              <AlertDialogDescription>
                "{projectToDelete?.name}" projesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve projeye ait tüm görevler de silinecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProjectToDelete(null)}>
                İptal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProject}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
<<<<<<< HEAD

=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      </div>
    </MainLayout>
  );
};

export default Tasks;
