import { useEffect, useMemo, useRef, useState, RefObject } from "react";
// Drag and drop kaldırıldı - artık buton ile aşama geçişi yapılacak
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  getTaskById,
  getTaskAssignments,
  deleteTaskAssignment,
  createChecklist,
  archiveTask,
} from "@/services/firebase/taskService";
import { createNotification } from "@/services/firebase/notificationService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { getOrders } from "@/services/firebase/orderService";
import { getProjects, Project } from "@/services/firebase/projectService";
import { useAuth } from "@/contexts/AuthContext";
import { Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  Tag,
  X,
  Loader2,
  CheckCircle2,
  Paperclip,
  MessageSquare,
  Archive,
  User,
  Package,
  UserPlus,
  ListChecks,
  Link2,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  Folder,
  CircleDot,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { tr } from "date-fns/locale";
import { UserMultiSelect } from "./UserMultiSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  labels?: Array<{ name: string; color: string }>;
  dueDate?: string;
  createdAt: string;
  status: string;
  priority: number;
  projectId?: string | null;
  assignedUsers?: { id: string; full_name: string }[];
  attachments?: number;
  comments?: number;
  checklists?: Array<{ completed: number; total: number }>;
  createdBy?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  linkedProductionOrder?: {
    id: string;
    orderNumber?: string;
    customerName?: string | null;
    priority?: number | null;
    dueDate?: string | null;
    status?: string | null;
  };
};

type Column = {
  id: string;
  title: string;
  taskIds: string[];
  isArchived?: boolean;
};

type BoardState = {
  columns: Column[];
  tasks: Record<string, Task>;
  columnOrder: string[];
};

const STORAGE_KEY = "taskBoardState_v1";
const FILTER_STORAGE_KEY = "taskBoardFilters_v1";

type BoardTaskInput = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: number;
  due_date?: string | null;
  created_at?: string;
  projectId?: string | null;
  isArchived?: boolean;
  is_archived?: boolean;
  labels?: Array<{ name: string; color: string }> | string;
  assignments?: Array<{
    assigned_to: string;
    assigned_to_name?: string;
    assigned_to_email?: string;
  }>;
  attachments?: number | Array<unknown>;
  production_order_id?: string | null;
  production_order_number?: string | null;
  production_order_customer?: string | null;
  production_order_priority?: number | null;
  production_order_due_date?: string | null;
  production_order_status?: string | null;
  approvalStatus?: "pending" | "approved" | "rejected";
  createdBy?: string;
  created_by?: string;
};

interface TaskBoardProps {
  tasks: BoardTaskInput[];
  onTaskClick: (taskId: string, initialStatus?: string) => void;
  onStatusChange: (taskId: string, status: string) => Promise<void>;
  showProjectFilter?: boolean; // Proje filtresini göster/gizle
  projectId?: string; // Gizli proje kontrolü için
}

// Trello color palette for labels
const LABEL_COLORS = [
  { name: "green", value: "#61BD4F", class: "bg-[#61BD4F]" },
  { name: "yellow", value: "#F2D600", class: "bg-[#F2D600]" },
  { name: "orange", value: "#FF9F1A", class: "bg-[#FF9F1A]" },
  { name: "red", value: "#EB5A46", class: "bg-[#EB5A46]" },
  { name: "purple", value: "#C377E0", class: "bg-[#C377E0]" },
  { name: "blue", value: "#0079BF", class: "bg-[#0079BF]" },
  { name: "sky", value: "#00C2E0", class: "bg-[#00C2E0]" },
  { name: "lime", value: "#51E898", class: "bg-[#51E898]" },
  { name: "pink", value: "#FF78CB", class: "bg-[#FF78CB]" },
  { name: "black", value: "#344563", class: "bg-[#344563]" },
];

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

// Sabit kolonlar - 4 aşama
const defaultColumns: Column[] = [
  { id: "pending", title: "Yapılacak", taskIds: [] },
  { id: "in_progress", title: "Devam Ediyor", taskIds: [] },
  { id: "completed", title: "Tamamlandı", taskIds: [] },
  { id: "approved", title: "Onaylandı", taskIds: [] }, // Onaylanmış ve tamamlanmış görevler (status: completed, approvalStatus: approved)
];

export const TaskBoard = ({ tasks, onTaskClick, onStatusChange, showProjectFilter = true, projectId: propProjectId }: TaskBoardProps) => {
  const { user, isAdmin, isTeamLeader, isSuperAdmin } = useAuth();
  
  // Status helper fonksiyonları - component içinde tanımlı
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

  const [boardState, setBoardState] = useState<BoardState>({
    columns: defaultColumns,
    tasks: {},
    columnOrder: defaultColumns.map((c) => c.id),
  });

  /*
  useEffect(() => {
    const checkTeamLeader = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "departments"), where("managerId", "==", user.id));
        const snapshot = await getDocs(q);
        setIsTeamLeader(!snapshot.empty);
      } catch (error) {
        console.error("Error checking team leader status:", error);
      }
    };
    checkTeamLeader();
  }, [user]);
  */

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskMembers, setNewTaskMembers] = useState<string[]>([]);
  const [newTaskChecklistItems, setNewTaskChecklistItems] = useState<Array<{ text: string; completed: boolean }>>([]);
  const [newChecklistItemText, setNewChecklistItemText] = useState("");
  const [newTaskLabelInput, setNewTaskLabelInput] = useState("");
  const [newTaskLabels, setNewTaskLabels] = useState<Array<{ name: string; color: string }>>([]);
  const [newTaskLabelColor, setNewTaskLabelColor] = useState(LABEL_COLORS[0].value);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskOrderLink, setNewTaskOrderLink] = useState("none");
  const [quickAddPanels, setQuickAddPanels] = useState({
    members: true,
    checklist: true,
  });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    labels: [] as Array<{ name: string; color: string }>,
    dueDate: "",
    labelInput: "",
    labelColor: LABEL_COLORS[0].value,
  });
  const [saving, setSaving] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showMemberAssignment, setShowMemberAssignment] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [boardSearch, setBoardSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [productionOrders, setProductionOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderLink, setSelectedOrderLink] = useState("none");
  const [projects, setProjects] = useState<Map<string, Project>>(new Map());
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const columnScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const labelSectionRef = useRef<HTMLDivElement | null>(null);
  const descriptionSectionRef = useRef<HTMLDivElement | null>(null);
  const dueDateSectionRef = useRef<HTMLDivElement | null>(null);
  const newCardTitleRef = useRef<HTMLDivElement | null>(null);
  const newCardDescriptionRef = useRef<HTMLDivElement | null>(null);
  const newCardChecklistRef = useRef<HTMLDivElement | null>(null);
  const newCardMembersRef = useRef<HTMLDivElement | null>(null);
  const newCardLabelsRef = useRef<HTMLDivElement | null>(null);

  const quickTitleSuggestions = ["Acil Kontrol", "Hızlı Geri Bildirim", "Toplantı Notu", "Hata Düzeltme"];

  // Tüm kullanıcıları yükle
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await getAllUsers();
        setAllUsers(users);
      } catch (error) {
        console.error("Kullanıcılar yüklenirken hata:", error);
      }
    };
    fetchUsers();
  }, []);

  const memberOptions = useMemo(() => {
    // Tüm kullanıcıları göster
    return allUsers
      .filter(user => user.id && (user.fullName || user.displayName || user.email))
      .map(user => ({
        id: user.id,
        full_name: user.fullName || user.displayName || user.email || "İsimsiz Kullanıcı"
      }));
  }, [allUsers]);

  const toggleQuickPanel = (panel: keyof typeof quickAddPanels) => {
    setQuickAddPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  const handleAddQuickLabel = () => {
    const labelName = newTaskLabelInput.trim();
    if (!labelName) return;
    if (newTaskLabels.some((label) => label.name.toLowerCase() === labelName.toLowerCase())) {
      toast.info("Bu etiket zaten ekli");
      return;
    }
    setNewTaskLabels((prev) => [...prev, { name: labelName, color: newTaskLabelColor }]);
    setNewTaskLabelInput("");
  };

  const removeQuickLabel = (name: string) => {
    setNewTaskLabels((prev) => prev.filter((label) => label.name !== name));
  };

  const highlightSection = (ref: RefObject<HTMLDivElement>) => {
    const section = ref.current;
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "center" });
    section.classList.add("ring-2", "ring-[#0079BF]/40", "rounded-xl");
    setTimeout(() => {
      section.classList.remove("ring-2", "ring-[#0079BF]/40", "rounded-xl");
    }, 900);
  };

  const scrollToNewCardSection = (ref: RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const newCardActions = [
    {
      id: "title",
      title: "Başlık",
      description: "Kart adını belirleyin",
      icon: Package,
      action: () => scrollToNewCardSection(newCardTitleRef),
    },
    {
      id: "description",
      title: "Açıklama",
      description: "Detayları ekleyin",
      icon: MessageSquare,
      action: () => scrollToNewCardSection(newCardDescriptionRef),
    },
    {
      id: "checklist",
      title: "Checklist",
      description: "Adım oluşturun",
      icon: ListChecks,
      action: () => scrollToNewCardSection(newCardChecklistRef),
    },
    {
      id: "members",
      title: "Üyeler",
      description: "Kişi atayın",
      icon: UserPlus,
      action: () => scrollToNewCardSection(newCardMembersRef),
    },
    {
      id: "labels",
      title: "Etiketler",
      description: "Renklerle grupla",
      icon: Tag,
      action: () => scrollToNewCardSection(newCardLabelsRef),
    },
  ];

  // Etiket filtresi kaldırıldı - labelOptions artık kullanılmıyor

  const matchesFilters = (task?: Task) => {
    if (!task) return false;
    // Proje filtresi zaten boardTasks'ta uygulanmış, burada tekrar uygulamaya gerek yok
    // Sadece pano içi filtreleri (arama, üye, öncelik) uygula
    const text = boardSearch.toLocaleLowerCase('tr-TR');
    if (
      boardSearch &&
      !(task.title.toLocaleLowerCase('tr-TR').includes(text) || task.description?.toLocaleLowerCase('tr-TR').includes(text))
    ) {
      return false;
    }
    if (memberFilter !== "all") {
      // Göreve atanan kullanıcıları kontrol et
      const isAssigned = Array.isArray(task.assignedUsers) && task.assignedUsers.some((u) => u.id === memberFilter);
      // Görevi oluşturan kullanıcıyı kontrol et
      const isCreator = task.createdBy === memberFilter;
      // İkisinden biri eşleşiyorsa göster
      if (!isAssigned && !isCreator) {
        return false;
      }
    }
    // Etiket filtresi kaldırıldı - kullanılmıyor
    if (priorityFilter !== "all") {
      if (priorityFilter === "high" && task.priority < 4) return false;
      if (priorityFilter === "medium" && (task.priority < 2 || task.priority > 3)) return false;
      if (priorityFilter === "low" && task.priority >= 2) return false;
    }
    // projectFilter kontrolü kaldırıldı - zaten boardTasks'ta uygulanmış
    return true;
  };

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Eski state formatını yeni formata çevir (archivedColumns kaldırıldı)
        const validState: BoardState = {
          columns: defaultColumns.map((col) => ({ ...col, taskIds: [] })),
          tasks: parsed.tasks || {},
          columnOrder: defaultColumns.map((c) => c.id),
        };
        setBoardState(validState);
      } catch (e) {
        // Silently fail - invalid saved state
      }
    }

    const savedFilters = localStorage.getItem(FILTER_STORAGE_KEY);
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters);
        if (parsedFilters.boardSearch) setBoardSearch(parsedFilters.boardSearch);
        if (parsedFilters.memberFilter) setMemberFilter(parsedFilters.memberFilter);
        // Etiket filtresi kaldırıldı
        if (parsedFilters.priorityFilter) setPriorityFilter(parsedFilters.priorityFilter);
        if (parsedFilters.projectFilter) setProjectFilter(parsedFilters.projectFilter);
      } catch (error) {
        // Silently fail - invalid saved filters
      }
    }
  }, []);

  // Sync tasks from props to board state
  useEffect(() => {
    // tasks boş olsa bile boardState'i temizlemeliyiz
    if (tasks.length === 0) {
      setBoardState((prev) => ({
        ...prev,
        tasks: {},
        columns: prev.columns.map((col) => ({ ...col, taskIds: [] })),
      }));
      return;
    }

    setBoardState((prev) => {
      // Önceki görevleri temizle, sadece yeni görevleri ekle
      const newTasks: Record<string, Task> = {};
      // Tüm kolonları sıfırla (arşiv kolonu artık yok)
      const newColumns = defaultColumns.map((col) => ({ ...col, taskIds: [] }));

      tasks.forEach((task) => {
        // Parse labels - support both old string array and new object array
        let parsedLabels: Array<{ name: string; color: string }> = [];
        if (task.labels) {
          if (typeof task.labels === "string") {
            try {
              const parsed = JSON.parse(task.labels);
              parsedLabels = Array.isArray(parsed) 
                ? (Array.isArray(parsed) ? parsed : []).map((l: any) => 
                    typeof l === "string" 
                      ? { name: l, color: LABEL_COLORS[0].value }
                      : l
                  )
                : [];
            } catch {
              parsedLabels = [];
            }
          } else if (Array.isArray(task.labels)) {
            parsedLabels = (Array.isArray(task.labels) ? task.labels : []).map((l: any) =>
              typeof l === "string" ? { name: l, color: LABEL_COLORS[0].value } : l
            );
          }
        }

        const taskData: Task = {
          id: task.id,
          title: task.title,
          description: task.description,
          labels: parsedLabels,
          dueDate: task.due_date,
          createdAt: task.created_at,
          status: task.status,
          priority: task.priority || 0,
          projectId: task.projectId || null,
          assignedUsers: (Array.isArray(task.assignments) ? task.assignments : []).map((assignment: any) => ({
            id: assignment.assigned_to,
            full_name: assignment.assigned_to_name || assignment.assigned_to_email || "Kullanıcı",
          })),
          attachments: Array.isArray(task.attachments) ? task.attachments.length : (typeof task.attachments === 'number' ? task.attachments : 0),
          comments: 0, // Comments count will be added when backend support is available
          checklists: [], // Checklists will be added when backend support is available
          createdBy: task.createdBy || task.created_by,
          approvalStatus: task.approvalStatus,
          linkedProductionOrder: task.production_order_id
            ? {
                id: task.production_order_id,
                orderNumber: task.production_order_number,
                customerName: task.production_order_customer,
                priority: task.production_order_priority,
                dueDate: task.production_order_due_date,
                status: task.production_order_status,
              }
            : undefined,
        };
        newTasks[task.id] = taskData;

        // Arşivlenmiş görevleri atla - arşiv ayrı sayfada gösteriliyor
        if (task.is_archived || task.isArchived) {
          return; // Arşivlenmiş görevleri board'da gösterme
        }

        // Onaylanmış görevler için "Onaylandı" kolonu (status: completed, approvalStatus: approved)
        // Ayrıca eski "cancelled" durumundaki görevleri de "Onaylandı" kolonuna taşı
        if (task.status === "completed" && task.approvalStatus === "approved") {
          const approvedCol = newColumns.find((c) => c.id === "approved");
          if (approvedCol) {
            approvedCol.taskIds.push(task.id);
          }
        }
        // Eski "cancelled" durumundaki görevleri "Onaylandı" kolonuna taşı
        else if (task.status === "cancelled") {
          const approvedCol = newColumns.find((c) => c.id === "approved");
          if (approvedCol) {
            approvedCol.taskIds.push(task.id);
          }
        }
        // Diğer görevler normal status kolonlarına
        else {
          const col = newColumns.find((c) => c.id === task.status);
          if (col) {
            col.taskIds.push(task.id);
          }
        }
      });

      return {
        ...prev,
        tasks: newTasks,
        columns: newColumns,
        columnOrder: newColumns.map((c) => c.id), // Tüm kolonlar her zaman gösterilir
      };
    });
  }, [tasks, JSON.stringify(tasks.map(t => t.id))]);

  // Save to localStorage whenever board state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boardState));
  }, [boardState]);

  // Fetch production orders for linking
  useEffect(() => {
    const fetchProductionOrders = async () => {
      setOrdersLoading(true);
      try {
        const orders = await getOrders({ status: undefined }); // Tüm siparişler
        setProductionOrders(orders);
      } catch (error: any) {
        console.error("Fetch production orders error:", error);
        toast.error("Siparişler yüklenirken hata oluştu");
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchProductionOrders();
  }, []);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const allProjects = await getProjects();
        const projectsMap = new Map<string, Project>();
        allProjects.forEach((p) => {
          projectsMap.set(p.id, p);
        });
        setProjects(projectsMap);
      } catch (error) {
        console.error("Fetch projects error:", error);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const data = {
      boardSearch,
      memberFilter,
      priorityFilter,
      projectFilter,
    };
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(data));
  }, [boardSearch, memberFilter, priorityFilter, projectFilter]);

  // Sonraki aşamaya geç fonksiyonu
  const handleNextStage = async (taskId: string, currentStatus: string) => {
    try {
      // Aşama sırası: pending -> in_progress -> completed -> onaya gönder -> approved (yönetici onaylar)
      const statusFlow: Record<string, string> = {
        pending: "in_progress",
        in_progress: "completed",
        // completed durumunda onaya gönderilir, yönetici onaylarsa status completed + approvalStatus approved olur
      };

      const nextStatus = statusFlow[currentStatus];
      if (!nextStatus) {
        toast.error("Bu aşamadan sonraki aşama bulunamadı");
        return;
      }

      // Yetki kontrolü: Sadece yöneticiler, ekip liderleri ve atanan kişiler
      const task = boardState.tasks[taskId];
      if (!task) return;

      const canMoveTask = isAdmin || isTeamLeader || isSuperAdmin;
      if (!canMoveTask) {
        const isAssigned = task.assignedUsers?.some((u) => u.id === user?.id) || false;
        if (!isAssigned && task.createdBy !== user?.id) {
          toast.error("Bu görevi taşıma yetkiniz yok. Sadece size atanan görevleri taşıyabilirsiniz.");
          return;
        }
      }

      // Tamamlandı durumuna geçerken onaya gönder
      if (nextStatus === "completed" && currentStatus === "in_progress") {
        // Yönetici veya oluşturan direkt tamamlayabilir, diğerleri onaya gönderir
        const isCreator = task.createdBy === user?.id;
        const canDirectComplete = isAdmin || isTeamLeader || isSuperAdmin || isCreator;
        
        if (!canDirectComplete) {
          // Normal kullanıcı onaya gönderir
          const { requestTaskApproval } = await import("@/services/firebase/taskService");
          await requestTaskApproval(taskId, user?.id || "");
          toast.success("Görev tamamlandı olarak işaretlendi ve onay için yöneticiye gönderildi.");
          return;
        }
      }

      await onStatusChange(taskId, nextStatus);
    } catch (error) {
      toast.error("Aşama geçişi yapılamadı");
    }
  };

  const clearBoardFilters = () => {
    setBoardSearch("");
    setMemberFilter("all");
    setPriorityFilter("all");
    setProjectFilter("all");
  };

  // Liste ekleme/düzenleme/arşivleme/silme özellikleri kaldırıldı - sabit 4 kolon kullanılıyor

  const handleAddTask = async (columnId: string, quickAdd: boolean = false) => {
    if (!isAdmin && !isTeamLeader) {
      toast.error("Görev ekleme yetkiniz yok. Sadece yönetici veya ekip lideri ekleyebilir.");
      return;
    }

    // Artık direkt görev oluşturmak yerine TaskDetailModal'ı açıyoruz
    // initialStatus olarak columnId'yi kullanıyoruz
    onTaskClick("new", columnId);
    return;
    
    // Eski kod - artık kullanılmıyor
    if (!newTaskTitle.trim() || !user) return;

    const trimmedTitle = newTaskTitle.trim();
    const trimmedDescription = newTaskDescription.trim();
    const labelNames = newTaskLabels.map((label) => label.name);
    const dueDateTimestamp = newTaskDueDate ? Timestamp.fromDate(new Date(newTaskDueDate)) : null;
    const linkedOrderId = newTaskOrderLink !== "none" ? newTaskOrderLink : null;

    setSaving(true);
    try {
      const task = await createTask({
        title: trimmedTitle,
        description: trimmedDescription || null,
        status: columnId as "pending" | "in_progress" | "completed",
        priority: 2,
        dueDate: dueDateTimestamp,
        labels: labelNames.length > 0 ? labelNames : null,
        productionOrderId: linkedOrderId,
        productionProcessId: null,
        createdBy: user.id,
      });

      const taskId = task.id;
      
      // Assign members if any selected and send email notifications
      if (Array.isArray(newTaskMembers) && newTaskMembers.length > 0) {
        // Alt yetki kontrolü - görev atama
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
            createdAt: null,
            updatedAt: null,
          };
          const hasPermission = await canPerformSubPermission(userProfile, "tasks", "canAssign");
          if (!hasPermission && !isAdmin && !isTeamLeader && !isSuperAdmin) {
            toast.error("Görev atama yetkiniz yok");
            return;
          }
        } catch (error) {
          console.error("Permission check error:", error);
          // Hata durumunda devam et (eski davranış)
        }

        try {
          const allUsers = await getAllUsers();
          await Promise.all(
            newTaskMembers.map(async (userId) => {
              const assignment = await assignTask(taskId, userId, user.id);
              
              // Email bildirimi gönder - assignment_id ile birlikte
              // Hata olsa bile sessizce devam et
              try {
                const assignedUser = allUsers.find((u) => u.id === userId);
                if (assignedUser) {
                  await createNotification({
                    userId: userId,
                    type: "task_assigned",
                    title: "Yeni görev atandı",
                    message: `${user.fullName || user.email || "Bir kullanıcı"} size "${newTaskTitle.trim()}" görevini atadı. Görevi kabul etmek veya reddetmek için bildirime tıklayın.`,
                    read: false,
                    relatedId: taskId,
                    metadata: { assignment_id: assignment.id }, // Assignment ID'yi metadata'ya ekle
                  });
                }
              } catch (notifError) {
                // Bildirim hatası kritik değil, sessizce devam et
              }
            })
          );
        } catch (assignError: any) {
          console.error("Assignment error:", assignError);
          // Continue even if assignment fails
        }
      }

      // Create checklist if items exist
      if (newTaskChecklistItems.length > 0) {
        try {
          await createChecklist(taskId, "Checklist", newTaskChecklistItems);
        } catch (checklistError: any) {
          console.error("Checklist creation error:", checklistError);
          // Continue even if checklist creation fails
        }
      }

      // Fetch updated task with assignments
      try {
        const [taskData, assignments, allUsers] = await Promise.all([
          getTaskById(taskId),
          getTaskAssignments(taskId),
          getAllUsers(),
        ]);

        if (taskData) {
          const assignedUsers = assignments.map((a) => {
            const userProfile = allUsers.find((u) => u.id === a.assignedTo);
            return {
              id: a.assignedTo,
              full_name: userProfile?.fullName || userProfile?.displayName || "Kullanıcı",
            };
          });

          const linkedOrder =
            linkedOrderId && productionOrders.length > 0
              ? productionOrders.find((order) => order.id === linkedOrderId)
              : undefined;

      const rawCreatedAt = taskData.createdAt;
      const createdAtDate =
        rawCreatedAt instanceof Timestamp
          ? rawCreatedAt.toDate()
          : new Date(rawCreatedAt as unknown as string | number | Date);

      const newTask: Task = {
            id: taskData.id,
            title: taskData.title,
            description: taskData.description || null,
            labels: newTaskLabels,
            dueDate: dueDateTimestamp ? dueDateTimestamp.toDate().toISOString() : undefined,
        createdAt: createdAtDate.toISOString(),
            status: taskData.status,
            priority: taskData.priority || 2,
            assignedUsers,
            attachments: 0,
            comments: 0,
            checklists:
              newTaskChecklistItems.length > 0
                ? [
                    {
                      completed: newTaskChecklistItems.filter((i) => i.completed).length,
                      total: newTaskChecklistItems.length,
                    },
                  ]
                : [],
            linkedProductionOrder: linkedOrder
              ? {
                  id: linkedOrder.id,
                  orderNumber: linkedOrder.order_number,
                  customerName: linkedOrder.customer_name,
                  priority: linkedOrder.priority,
                  dueDate: linkedOrder.due_date,
                  status: linkedOrder.status,
                }
              : undefined,
          };

          setBoardState((prev) => ({
            ...prev,
            tasks: { ...prev.tasks, [newTask.id]: newTask },
            columns: prev.columns.map((col) =>
              col.id === columnId ? { ...col, taskIds: [...col.taskIds, newTask.id] } : col
            ),
          }));
          }
        } catch (fetchError: any) {
          // Fallback to basic task if fetch fails
          console.error("Fetch task details error:", fetchError);
          const newTask: Task = {
            id: taskId,
          title: trimmedTitle,
          description: trimmedDescription || null,
          labels: newTaskLabels,
          dueDate: dueDateTimestamp ? dueDateTimestamp.toDate().toISOString() : undefined,
            createdAt: new Date().toISOString(),
            status: columnId,
            priority: 2,
            assignedUsers: [],
            attachments: 0,
            comments: 0,
          checklists:
            newTaskChecklistItems.length > 0
              ? [
                  {
                    completed: newTaskChecklistItems.filter((i) => i.completed).length,
                    total: newTaskChecklistItems.length,
                  },
                ]
              : [],
          linkedProductionOrder: linkedOrderId
            ? {
                id: linkedOrderId,
                orderNumber: productionOrders.find((order) => order.id === linkedOrderId)?.order_number,
                customerName: productionOrders.find((order) => order.id === linkedOrderId)?.customer_name,
              }
            : undefined,
          };

          setBoardState((prev) => ({
            ...prev,
            tasks: { ...prev.tasks, [newTask.id]: newTask },
            columns: prev.columns.map((col) =>
              col.id === columnId ? { ...col, taskIds: [...col.taskIds, newTask.id] } : col
            ),
          }));
        }

      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskMembers([]);
      setNewTaskChecklistItems([]);
      setNewChecklistItemText("");
      setNewTaskLabels([]);
      setNewTaskLabelInput("");
      setNewTaskLabelColor(LABEL_COLORS[0].value);
      setNewTaskDueDate("");
      setNewTaskOrderLink("none");
      setShowAddTask(null);
      setShowTaskModal(false);
      setSelectedTask(null);
      toast.success("Kart eklendi");
      requestAnimationFrame(() => {
        const container = columnScrollRefs.current[columnId];
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    } catch (error: any) {
      toast.error("Kart eklenemedi: " + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const fetchProductionOrderList = async () => {
    setOrdersLoading(true);
    try {
      const orders = await getOrders({ status: undefined }); // Tüm siparişler
      setProductionOrders(orders);
    } catch (error: any) {
      console.error("Fetch production orders error:", error);
      toast.error("Siparişler yüklenirken hata oluştu");
    } finally {
      setOrdersLoading(false);
    }
    //   console.error("Fetch production orders error:", error);
    //   toast.error("Siparişler yüklenemedi: " + (error.message || "Bilinmeyen hata"));
    //   setProductionOrders([]);
    // } finally {
    //   setOrdersLoading(false);
    // }
  };

  useEffect(() => {
    if (showTaskModal && (!Array.isArray(productionOrders) || productionOrders.length === 0)) {
      fetchProductionOrderList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTaskModal]);

  useEffect(() => {
    if (showAddTask && (!Array.isArray(productionOrders) || productionOrders.length === 0)) {
      fetchProductionOrderList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddTask]);

  useEffect(() => {
    if (selectedTask) {
      setSelectedOrderLink(selectedTask.linkedProductionOrder?.id || "none");
    }
  }, [selectedTask]);

  const handleLinkProductionOrder = async (orderId: string | null) => {
    if (!selectedTask) return;
    setSaving(true);
    try {
      await updateTask(selectedTask.id, {
        productionOrderId: orderId || null,
      });

      const orderInfo =
        orderId && Array.isArray(productionOrders) && productionOrders.length > 0
          ? productionOrders.find((order) => order.id === orderId)
          : null;
      const linked = orderId
        ? {
            id: orderId,
            orderNumber: orderInfo?.order_number,
            customerName: orderInfo?.customer_name,
            priority: orderInfo?.priority,
            dueDate: orderInfo?.due_date,
            status: orderInfo?.status,
          }
        : undefined;

      const updatedTask: Task = {
        ...selectedTask,
        linkedProductionOrder: linked,
      };

      setSelectedTask(updatedTask);
      setBoardState((prev) => ({
        ...prev,
        tasks: { ...prev.tasks, [selectedTask.id]: updatedTask },
      }));
      setSelectedOrderLink(orderId || "none");
      toast.success(orderId ? "Sipariş bağlantısı güncellendi" : "Bağlantı kaldırıldı");
    } catch (error: any) {
      console.error("Link production order error:", error);
      toast.error("Bağlantı güncellenemedi: " + (error.message || "Bilinmeyen hata"));
    } finally {
      setSaving(false);
    }
  };

  const handleEditTask = async () => {
    if (!selectedTask || !taskForm.title.trim()) return;

    setSaving(true);
    try {
      const dueDate = taskForm.dueDate ? Timestamp.fromDate(new Date(taskForm.dueDate)) : null;
      const labelsArray = taskForm.labels.map((l) => l.name);
      
      await updateTask(selectedTask.id, {
        title: taskForm.title,
        description: taskForm.description || null,
        dueDate,
        labels: labelsArray.length > 0 ? labelsArray : null,
      });

      const updatedTask: Task = {
        ...selectedTask,
        title: taskForm.title,
        description: taskForm.description,
        labels: taskForm.labels,
        dueDate: taskForm.dueDate,
      };

      setBoardState((prev) => ({
        ...prev,
        tasks: { ...prev.tasks, [selectedTask.id]: updatedTask },
      }));

      setShowTaskModal(false);
      setSelectedTask(null);
      toast.success("Kart güncellendi");
    } catch (error: any) {
      console.error("Edit task error:", error);
      toast.error("Kart güncellenemedi: " + (error.message || "Bilinmeyen hata"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Bu kartı silmek istediğinize emin misiniz?")) return;

    try {
      await deleteTask(taskId);
      const column = boardState.columns.find((c) => c.taskIds.includes(taskId));
      if (column) {
        setBoardState((prev) => ({
          ...prev,
          tasks: Object.fromEntries(Object.entries(prev.tasks).filter(([id]) => id !== taskId)),
          columns: prev.columns.map((c) =>
            c.id === column.id ? { ...c, taskIds: c.taskIds.filter((id) => id !== taskId) } : c
          ),
        }));
      }
      toast.success("Kart silindi");
    } catch (error: any) {
      console.error("Delete task error:", error);
      toast.error("Kart silinemedi: " + (error.message || "Bilinmeyen hata"));
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    if (!user?.id) return;
    try {
      await archiveTask(taskId, user.id);
      const column = boardState.columns.find((c) => c.taskIds.includes(taskId));
      if (column) {
        setBoardState((prev) => ({
          ...prev,
          tasks: Object.fromEntries(Object.entries(prev.tasks).filter(([id]) => id !== taskId)),
          columns: prev.columns.map((c) =>
            c.id === column.id ? { ...c, taskIds: c.taskIds.filter((id) => id !== taskId) } : c
          ),
        }));
      }
      toast.success("Görev arşivlendi");
    } catch (error: any) {
      console.error("Archive task error:", error);
      toast.error("Görev arşivlenemedi: " + (error.message || "Bilinmeyen hata"));
    }
  };

  const openTaskModal = (task: Task) => {
    onTaskClick(task.id, task.status);
  };

  const handleAssignMembers = async () => {
    if (!selectedTask || !user) return;

    setSaving(true);
    try {
      // Mevcut atamaları al
      const currentAssignments = Array.isArray(selectedTask.assignedUsers) ? selectedTask.assignedUsers.map(u => u.id) : [];
      
      // Mevcut assignment'ları detaylı olarak al (silme işlemi için)
      const existingAssignments = await getTaskAssignments(selectedTask.id);
      
      // Yeni eklenen kullanıcıları ata
      const toAdd = selectedMembers.filter(id => !currentAssignments.includes(id));
      for (const userId of toAdd) {
        try {
          await assignTask(selectedTask.id, userId, user.id);
        } catch (error) {
          console.error("Assignment error:", error);
          // Continue even if assignment fails
        }
      }

      // Kaldırılan kullanıcıları sil
      const toRemove = currentAssignments.filter(id => !selectedMembers.includes(id));
      for (const userId of toRemove) {
        try {
          const userAssignment = existingAssignments.find(a => a.assignedTo === userId);
          if (userAssignment) {
            await deleteTaskAssignment(selectedTask.id, userAssignment.id, user.id);
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error("Delete assignment error:", error);
          }
          // Continue even if deletion fails
        }
      }

      toast.success("Üyeler güncellendi");
      setShowMemberAssignment(false);
      
      // Task'ı yeniden yükle
      const [taskData, assignments, allUsers] = await Promise.all([
        getTaskById(selectedTask.id),
        getTaskAssignments(selectedTask.id),
        getAllUsers(),
      ]);

      if (taskData) {
        const assignedUsers = assignments.map((a) => {
          const userProfile = allUsers.find((u) => u.id === a.assignedTo);
          return {
            id: a.assignedTo,
            full_name: userProfile?.fullName || userProfile?.displayName || '',
          };
        });

        const updatedTask: Task = {
          ...selectedTask,
          assignedUsers,
        };
        setSelectedTask(updatedTask);
        setBoardState((prev) => ({
          ...prev,
          tasks: { ...prev.tasks, [selectedTask.id]: updatedTask },
        }));
      }
    } catch (error: any) {
      console.error("Assign members error:", error);
      toast.error("Üye atama hatası: " + (error.message || "Bilinmeyen hata"));
    } finally {
      setSaving(false);
    }
  };

  const addLabel = () => {
    if (taskForm.labelInput.trim() && !taskForm.labels.some(l => l.name === taskForm.labelInput.trim())) {
      setTaskForm((prev) => ({
        ...prev,
        labels: [...prev.labels, { name: prev.labelInput.trim(), color: prev.labelColor }],
        labelInput: "",
      }));
    }
  };

  const removeLabel = (labelName: string) => {
    setTaskForm((prev) => ({
      ...prev,
      labels: prev.labels.filter((l) => l.name !== labelName),
    }));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDueDateDisplay = (dueDate: string | Timestamp) => {
    const date = dueDate instanceof Timestamp ? dueDate.toDate() : new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return { text: format(date, "dd MMM", { locale: tr }), className: "bg-[#EC9488] text-white" };
    }
    if (isToday(date)) {
      return { text: "Bugün", className: "bg-[#F5D90A] text-[#172B4D]" };
    }
    if (isTomorrow(date)) {
      return { text: "Yarın", className: "bg-[#F5D90A] text-[#172B4D]" };
    }
    return { text: format(date, "dd MMM", { locale: tr }), className: "bg-[#DFE1E6] text-[#172B4D]" };
  };

  const quickActionButtons = [
    {
      key: "members",
      label: "Üye Ekle",
      description: "Kartı kime atayacağını seç",
      icon: <UserPlus className="h-4 w-4" />,
      onClick: () => toggleQuickPanel("members"),
      toggle: true,
      active: quickAddPanels.members,
    },
    {
      key: "labels",
      label: "Etiketler",
      description: "Renk paleti ile kartı kodla",
      icon: <Tag className="h-4 w-4" />,
      onClick: () => highlightSection(labelSectionRef),
      toggle: false,
      active: false,
    },
    {
      key: "checklist",
      label: "Checklist",
      description: "Adımları takip listesine ayır",
      icon: <ListChecks className="h-4 w-4" />,
      onClick: () => toggleQuickPanel("checklist"),
      toggle: true,
      active: quickAddPanels.checklist,
    },
    {
      key: "date",
      label: "Tarih",
      description: "Bitiş tarihini belirle",
      icon: <Calendar className="h-4 w-4" />,
      onClick: () => highlightSection(dueDateSectionRef),
      toggle: false,
      active: Boolean(newTaskDueDate),
    },
    {
      key: "description",
      label: "Açıklama",
      description: "Detaylı bilgi ekle",
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: () => highlightSection(descriptionSectionRef),
      toggle: false,
      active: Boolean(newTaskDescription.trim()),
    },
  ];

  return (
    <div className="flex flex-col bg-[#F4F5F7] min-h-[500px] rounded-lg border border-[#DFE1E6]">
      {/* Trello-style Header */}
      <div className="bg-white border-b border-[#E4E6EA] px-3 sm:px-6 py-3 sm:py-3.5 shadow-sm space-y-3 rounded-t-lg">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-sm">
            <h1 className="text-base sm:text-lg font-semibold text-[#172B4D]">Görev Panosu</h1>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
            <SearchInput
              value={boardSearch}
              onChange={(e) => setBoardSearch(e.target.value)}
              placeholder="Kart ara..."
              containerClassName="flex-1 min-w-0"
              iconClassName="text-[#5E6C84]"
              className="bg-[#F4F5F7] border-none focus-visible:ring-[#0079BF] text-sm sm:text-base min-h-[44px] sm:min-h-0"
            />
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-shrink-0">
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] bg-[#F4F5F7] border-none focus:ring-[#0079BF] min-h-[44px] sm:min-h-0">
                  <SelectValue placeholder="Üye filtresi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm üyeler</SelectItem>
                  {memberOptions.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="min-h-[44px] sm:min-h-0">
                      {member.full_name || "İsimsiz kullanıcı"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] bg-[#F4F5F7] border-none focus:ring-[#0079BF] min-h-[44px] sm:min-h-0">
                  <SelectValue placeholder="Öncelik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="min-h-[44px] sm:min-h-0">Tümü</SelectItem>
                  <SelectItem value="high" className="min-h-[44px] sm:min-h-0">Yüksek</SelectItem>
                  <SelectItem value="medium" className="min-h-[44px] sm:min-h-0">Orta</SelectItem>
                  <SelectItem value="low" className="min-h-[44px] sm:min-h-0">Düşük</SelectItem>
                </SelectContent>
              </Select>
              {showProjectFilter && (
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] bg-[#F4F5F7] border-none focus:ring-[#0079BF] min-h-[44px] sm:min-h-0">
                    <SelectValue placeholder="Proje Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="min-h-[44px] sm:min-h-0">Tüm Projeler</SelectItem>
                    <SelectItem value="general" className="min-h-[44px] sm:min-h-0">Genel Görevler</SelectItem>
                    {Array.from(projects.values())
                      .filter(p => p.name?.toLowerCase() !== "genel görevler" && p.name?.toLowerCase() !== "genel")
                      .map((project) => (
                        <SelectItem key={project.id} value={project.id} className="min-h-[44px] sm:min-h-0">
                          {project.isPrivate ? (
                            <span className="flex items-center gap-2">
                              <Folder className="h-3 w-3" />
                              {project.name}
                            </span>
                          ) : (
                            project.name
                          )}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={clearBoardFilters} className="text-[#5E6C84] touch-manipulation min-h-[44px] sm:min-h-0 w-full sm:w-auto whitespace-nowrap">
            Filtreleri Temizle
          </Button>
        </div>
      </div>

      {/* Board - Sabit kolonlar, drag & drop yok */}
      <div 
        className="pb-8 px-2 sm:px-3 md:px-6 pt-3 sm:pt-4 md:pt-6 overflow-x-auto -mx-2 sm:-mx-3 md:-mx-6"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
      >
        <div 
          className="flex gap-2 sm:gap-3 md:gap-4 pb-6 w-full min-w-max lg:min-w-0 overflow-x-auto"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          style={{ scrollbarWidth: 'thin' }}
        >
          {boardState.columnOrder.map((columnId) => {
              const column = boardState.columns.find((c) => c.id === columnId);
              if (!column) return null;

              const columnTasks = Array.isArray(column.taskIds) 
                ? column.taskIds
                    .map((id) => boardState.tasks[id])
                    .filter((task) => matchesFilters(task))
                : [];
              const difficultyLabel = column.title.toLowerCase().includes("tamam") || column.id === "completed"
                ? "EASY"
                : column.title.toLowerCase().includes("progress")
                ? "MEDIUM"
                : "FOCUS";

              return (
                <div
                  key={column.id}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  className="flex-shrink-0 w-[260px] sm:w-[280px] md:w-[300px] lg:flex-1 lg:min-w-0 bg-[#EBECF0] rounded-lg p-2 sm:p-3 flex flex-col transition-all shadow-sm"
                  style={{ overflow: 'visible' }}
                >
                      {/* Column Header - Sabit kolonlar, düzenleme yok */}
                      <div className="flex items-center justify-between mb-2 px-2 py-1">
                        <h3 className="font-semibold text-sm text-[#172B4D] flex-1 px-2 py-1">
                          {column.title}
                        </h3>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[#5E6C84] font-medium px-1.5 py-0.5 bg-white/60 rounded">
                            {columnTasks.length}
                          </span>
                        </div>
                      </div>

                {/* Tasks - Trello card style */}
                <div 
                  className="space-y-2.5 pr-1"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                >
                  {columnTasks.map((task, index) => (
                    <div
                      key={task.id}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => e.preventDefault()}
                      className="relative group bg-white rounded-[3px] p-3.5 sm:p-4 shadow-[0_1px_0_rgba(9,30,66,0.25)] hover:shadow-[0_2px_4px_rgba(9,30,66,0.15)] transition-all duration-200 cursor-pointer border-0"
                      onClick={() => openTaskModal(task)}
                    >
                      {/* 3 Nokta Menü - Sağ Üst Köşe */}
                      {(isAdmin || isTeamLeader || isSuperAdmin || task.createdBy === user?.id) && (
                        <div className="absolute top-2 right-2 z-10">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <MoreVertical className="h-3.5 w-3.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleArchiveTask(task.id);
                                            }}
                                            className="cursor-pointer"
                                          >
                                            <Archive className="h-4 w-4 mr-2" />
                                            Arşivle
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (confirm("Bu görevi kalıcı olarak silmek istediğinize emin misiniz?")) {
                                                handleDeleteTask(task.id);
                                              }
                                            }}
                                            className="cursor-pointer text-destructive focus:text-destructive"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Sil
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )}
                                  
                                  {/* Labels - Trello style (thin bars at top) */}
                                      {Array.isArray(task.labels) && task.labels.length > 0 && (
                                    <div className="flex flex-wrap gap-0.5 mb-2.5 -mx-3 -mt-3">
                                      {task.labels.map((label, idx) => (
                                        <div
                                          key={idx}
                                          className="h-1.5 rounded-sm flex-1 min-w-[40px]"
                                          style={{ 
                                            backgroundColor: label.color,
                                          }}
                                          title={label.name}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {/* Project info - Trello style, more prominent */}
                                  {task.projectId && projects.has(task.projectId) && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-[3px] px-2.5 py-1.5 mb-2 text-xs text-blue-700 flex items-center gap-1.5 shadow-sm">
                                      <Folder className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span className="font-semibold truncate">
                                        {projects.get(task.projectId)?.name}
                                      </span>
                                    </div>
                                  )}

                                  {task.linkedProductionOrder && (
                                    <div className="bg-[#F4F5F7] rounded-[3px] px-2.5 py-2 mb-2 text-xs text-[#5E6C84] flex items-start gap-2">
                                      <Package className="h-4 w-4 text-[#5E6C84]" />
                                      <div>
                                        <p className="text-[12px] text-[#172B4D] font-medium">
                                          {task.linkedProductionOrder.orderNumber || "Bağlı sipariş"}
                                        </p>
                                        <p className="text-[11px]">
                                          {task.linkedProductionOrder.customerName || "-"}
                                          {task.linkedProductionOrder.dueDate && (
                                            <>
                                              {" • "}
                                              {format(new Date(task.linkedProductionOrder.dueDate), "dd MMM", { locale: tr })}
                                            </>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Title */}
                                  <p className="font-normal text-sm text-[#172B4D] leading-[20px] mb-1.5 break-words">
                                    {task.title}
                                  </p>

                                  {/* Description preview */}
                                  {task.description && (
                                    <p className="text-xs text-[#5E6C84] line-clamp-2 leading-[16px] mb-2 break-words">
                                      {task.description}
                                    </p>
                                  )}

                                  {/* Footer - Icons and metadata */}
                                  {(task.dueDate || (task.attachments && task.attachments > 0) || (task.comments && task.comments > 0) || (task.checklists && task.checklists.length > 0) || (task.assignedUsers && task.assignedUsers.length > 0) || task.createdBy) && (
                                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-transparent">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {/* Due date */}
                                        {task.dueDate && (
                                          <div
                                            className={cn(
                                              "flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded font-medium",
                                              getDueDateDisplay(task.dueDate).className
                                            )}
                                          >
                                            {getDueDateDisplay(task.dueDate).text}
                                          </div>
                                        )}
                                        
                                      {/* Attachments */}
                                      {task.attachments > 0 && (
                                        <div className="flex items-center gap-1 text-[11px] text-[#5E6C84] hover:text-[#172B4D]">
                                          <Paperclip className="h-3.5 w-3.5" />
                                          <span>{task.attachments}</span>
                                        </div>
                                      )}

                                      {/* Comments */}
                                      {task.comments > 0 && (
                                        <div className="flex items-center gap-1 text-[11px] text-[#5E6C84] hover:text-[#172B4D]">
                                          <MessageSquare className="h-3.5 w-3.5" />
                                          <span>{task.comments}</span>
                                        </div>
                                      )}

                                        {/* Checklists */}
                                        {Array.isArray(task.checklists) && task.checklists.length > 0 && task.checklists.some(c => c.total > 0) && (
                                          <div className="flex items-center gap-1 text-[11px] text-[#5E6C84] hover:text-[#172B4D]">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span>
                                              {task.checklists.reduce((acc, c) => acc + (c.completed || 0), 0)}/
                                              {task.checklists.reduce((acc, c) => acc + (c.total || 0), 0)}
                                            </span>
                                          </div>
                                        )}

                                        {/* Creator */}
                                        {task.createdBy && (() => {
                                          const creator = allUsers.find(u => u.id === task.createdBy);
                                          if (creator) {
                                            return (
                                              <div className="flex items-center gap-1 text-[11px] text-[#5E6C84] hover:text-[#172B4D]" title={`Oluşturan: ${creator.fullName || creator.displayName || creator.email || "Bilinmeyen"}`}>
                                                <User className="h-3.5 w-3.5" />
                                                <span className="truncate max-w-[80px]">{creator.fullName || creator.displayName || creator.email || "Bilinmeyen"}</span>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>

                                      {/* Assigned users - Trello style */}
                                      {Array.isArray(task.assignedUsers) && task.assignedUsers.length > 0 && (
                                        <div className="flex -space-x-1">
                                          {task.assignedUsers.slice(0, 4).map((user) => (
                                            <div
                                              key={user.id}
                                              className="h-7 w-7 rounded-full bg-[#0079BF] text-white text-[11px] font-semibold flex items-center justify-center border-2 border-white shadow-sm hover:z-10 relative transition-transform hover:scale-110"
                                              title={user.full_name}
                                            >
                                              {getInitials(user.full_name)}
                                            </div>
                                          ))}
                                          {task.assignedUsers.length > 4 && (
                                            <div className="h-7 w-7 rounded-full bg-[#DFE1E6] text-[#172B4D] text-[11px] font-semibold flex items-center justify-center border-2 border-white shadow-sm hover:z-10 relative">
                                              +{task.assignedUsers.length - 4}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Sonraki Aşamaya Geç Butonu */}
                                  {(() => {
                                    // Eğer görev onaylanmışsa (completed + approved), buton gösterilmez
                                    if (task.status === "completed" && task.approvalStatus === "approved") {
                                      return null;
                                    }
                                    
                                    const statusFlow: Record<string, string> = {
                                      pending: "in_progress",
                                      in_progress: "completed",
                                      // completed durumunda onaya gönderilir, burada buton gösterilmez
                                    };
                                    const nextStatus = statusFlow[task.status];
                                    const canMove = isAdmin || isTeamLeader || isSuperAdmin || 
                                                   task.assignedUsers?.some((u) => u.id === user?.id) || 
                                                   task.createdBy === user?.id;
                                    
                                    if (!nextStatus || !canMove) return null;
                                    
                                    const statusLabels: Record<string, string> = {
                                      in_progress: "Devam Ediyor",
                                      completed: "Tamamlandı",
                                    };
                                    
                                    return (
                                      <div className="mt-3 pt-3 border-t border-[#DFE1E6]" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          size="sm"
                                          className="w-full text-xs bg-[#0079BF] hover:bg-[#005A8B] text-white"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleNextStage(task.id, task.status);
                                          }}
                                        >
                                          {`${statusLabels[nextStatus]} Aşamasına Geç`}
                                        </Button>
                                      </div>
                                    );
                                  })()}
                                </div>
                          ))}
                </div>

                {/* Add Card Button - Trello style (İyileştirilmiş) */}
                {showAddTask === column.id ? (
                  <div className="mt-3 rounded-lg bg-white border-2 border-[#0079BF]/20 shadow-lg p-4 space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                          {/* Başlık */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-[#172B4D] flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-[#0079BF]" />
                              Kart Başlığı <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              placeholder="Örn: Yeni özellik geliştir..."
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  setShowAddTask(null);
                                  setNewTaskTitle("");
                                  setNewTaskDescription("");
                                  setNewTaskMembers([]);
                                  setNewTaskChecklistItems([]);
                                  setNewChecklistItemText("");
                                } else if (e.key === "Enter" && !e.shiftKey && newTaskTitle.trim()) {
                                  e.preventDefault();
                                  // Artık TaskDetailModal'ı açıyoruz
                                  onTaskClick("new");
                                  setShowAddTask(null);
                                }
                              }}
                              autoFocus
                              disabled={saving}
                              className="h-10 bg-white border-[#DFE1E6] text-[#172B4D] focus-visible:ring-2 focus-visible:ring-[#0079BF] focus-visible:border-[#0079BF] text-sm font-medium placeholder:text-[#5E6C84]"
                            />
                          </div>
                          
                          {/* Açıklama */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-[#172B4D] flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5 text-[#0079BF]" />
                              Açıklama
                            </Label>
                            <Textarea
                              placeholder="Kart hakkında detaylı bilgi ekleyin..."
                              value={newTaskDescription}
                              onChange={(e) => setNewTaskDescription(e.target.value)}
                              rows={3}
                              disabled={saving}
                              className="bg-white border-[#DFE1E6] text-[#172B4D] focus-visible:ring-2 focus-visible:ring-[#0079BF] focus-visible:border-[#0079BF] resize-none text-sm placeholder:text-[#5E6C84]"
                            />
                          </div>
                          
                          {/* Checklist */}
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-[#172B4D] flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#0079BF]" />
                              Kontrol Listesi
                            </Label>
                            {newTaskChecklistItems.length > 0 && (
                              <div className="space-y-1.5 bg-[#F4F5F7] rounded-md p-2.5 border border-[#DFE1E6]">
                                {newTaskChecklistItems.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2.5 text-sm group">
                                    <input
                                      type="checkbox"
                                      checked={item.completed}
                                      onChange={(e) => {
                                        const updated = [...newTaskChecklistItems];
                                        updated[idx].completed = e.target.checked;
                                        setNewTaskChecklistItems(updated);
                                      }}
                                      className="w-4 h-4 rounded border-[#DFE1E6] text-[#0079BF] focus:ring-2 focus:ring-[#0079BF] cursor-pointer"
                                    />
                                    <span className={cn(
                                      "flex-1",
                                      item.completed ? "line-through text-[#5E6C84]" : "text-[#172B4D]"
                                    )}>
                                      {item.text}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewTaskChecklistItems(newTaskChecklistItems.filter((_, i) => i !== idx));
                                      }}
                                      className="opacity-0 group-hover:opacity-100 text-[#5E6C84] hover:text-[#EB5A46] transition-opacity p-1 rounded hover:bg-[#EB5A46]/10"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Input
                                placeholder="Yeni madde ekle..."
                                value={newChecklistItemText}
                                onChange={(e) => setNewChecklistItemText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && newChecklistItemText.trim()) {
                                    e.preventDefault();
                                    setNewTaskChecklistItems([
                                      ...newTaskChecklistItems,
                                      { text: newChecklistItemText.trim(), completed: false },
                                    ]);
                                    setNewChecklistItemText("");
                                  }
                                }}
                                disabled={saving}
                                className="flex-1 h-9 text-xs border-[#DFE1E6] focus-visible:ring-2 focus-visible:ring-[#0079BF]"
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  if (newChecklistItemText.trim()) {
                                    setNewTaskChecklistItems([
                                      ...newTaskChecklistItems,
                                      { text: newChecklistItemText.trim(), completed: false },
                                    ]);
                                    setNewChecklistItemText("");
                                  }
                                }}
                                disabled={saving || !newChecklistItemText.trim()}
                                className="h-9 px-3 text-xs bg-[#0079BF] hover:bg-[#005A8B] text-white"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Kişi Ata */}
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-[#172B4D] flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-[#0079BF]" />
                              Kişi Ata
                            </Label>
                            <div className="border border-[#DFE1E6] rounded-md p-2 bg-white">
                              <UserMultiSelect
                                selectedUsers={newTaskMembers}
                                onSelectionChange={setNewTaskMembers}
                              />
                            </div>
                          </div>
                          
                          {/* Butonlar */}
                          <div className="flex items-center gap-2 pt-2 border-t border-[#DFE1E6]">
                            <Button
                              size="sm"
                              onClick={() => {
                                // Artık TaskDetailModal'ı açıyoruz
                                onTaskClick("new");
                                setShowAddTask(null);
                              }}
                              className="bg-[#0079BF] hover:bg-[#005A8B] text-white flex-1 font-semibold shadow-md hover:shadow-lg transition-all h-9"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1.5" />
                              Kart Ekle
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowAddTask(null);
                                setNewTaskTitle("");
                                setNewTaskDescription("");
                                setNewTaskMembers([]);
                                setNewTaskChecklistItems([]);
                                setNewChecklistItemText("");
                              }}
                              className="text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#F4F5F7] h-9 w-9 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (!isAdmin && !isTeamLeader) {
                              toast.error("Görev ekleme yetkiniz yok. Sadece yönetici veya ekip lideri ekleyebilir.");
                              return;
                            }
                            onTaskClick("new", column.id);
                          }}
                          className="w-full mt-2 text-left text-sm text-[#5E6C84] hover:text-[#172B4D] hover:bg-white/80 py-2.5 px-3 rounded-md transition-all flex items-center gap-2 font-medium group border border-transparent hover:border-[#DFE1E6] shadow-sm hover:shadow-md"
                        >
                          <div className="p-1 rounded bg-[#0079BF]/10 group-hover:bg-[#0079BF]/20 transition-colors">
                            <Plus className="h-4 w-4 text-[#0079BF] group-hover:text-[#005A8B]" />
                          </div>
                          <span className="group-hover:font-semibold transition-all">Kart ekle</span>
                        </button>
                      )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Liste ekleme özelliği kaldırıldı - sabit 4 kolon kullanılıyor */}

      {/* Task Edit Modal - Trello side panel style */}
      {selectedTask && (
        <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] sm:max-h-[90vh] overflow-hidden p-0" aria-describedby="task-edit-description">
            <DialogHeader className="sr-only">
              <DialogTitle>Kart Düzenle</DialogTitle>
              <DialogDescription id="task-edit-description">
                Görev düzenleme
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col sm:flex-row h-full">
              {/* Main Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mb-4">
                  <div className="flex items-start gap-3">
                    <Input
                      value={taskForm.title}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="text-xl font-semibold text-[#172B4D] border-none shadow-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="Kart başlığı"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowTaskModal(false)}
                      className="text-[#5E6C84] hover:text-[#172B4D] hover:bg-gray-200"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Labels Section */}
                  <div>
                    <Label className="text-sm font-semibold text-[#172B4D] mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Etiketler
                    </Label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {taskForm.labels.map((label, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: label.color }}
                          onClick={() => removeLabel(label.name)}
                        >
                          <span>{label.name}</span>
                          <X className="h-3 w-3" />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={taskForm.labelInput}
                          onChange={(e) => setTaskForm((prev) => ({ ...prev, labelInput: e.target.value }))}
                          placeholder="Etiket adı girin..."
                          className="flex-1 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addLabel();
                            }
                          }}
                        />
                        <Button 
                          type="button" 
                          onClick={addLabel} 
                          size="sm" 
                          disabled={!taskForm.labelInput.trim()}
                          className="bg-[#0079BF] hover:bg-[#005A8B] text-white"
                        >
                          Ekle
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {LABEL_COLORS.map((color) => (
                          <button
                            key={color.name}
                            onClick={() => setTaskForm((prev) => ({ ...prev, labelColor: color.value }))}
                            className={cn(
                              "w-8 h-8 rounded border-2 transition-all hover:scale-110",
                              color.class,
                              taskForm.labelColor === color.value 
                                ? "border-gray-800 scale-110 ring-2 ring-gray-400" 
                                : "border-gray-300 hover:border-gray-500"
                            )}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="text-sm font-semibold text-[#172B4D] mb-2">Açıklama</Label>
                    <Textarea
                      value={taskForm.description}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Daha fazla detay ekleyin..."
                      rows={6}
                      className="resize-none"
                    />
                  </div>

                  {/* Due Date */}
                  <div>
                    <Label className="text-sm font-semibold text-[#172B4D] mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Bitiş Tarihi
                    </Label>
                    <Input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                      className="max-w-xs"
                    />
                  </div>

                  {/* Member Assignment */}
                  {showMemberAssignment && (
                    <div>
                      <Label className="text-sm font-semibold text-[#172B4D] mb-2 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Üyeler
                      </Label>
                      <UserMultiSelect
                        selectedUsers={selectedMembers}
                        onSelectionChange={setSelectedMembers}
                      />
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={handleAssignMembers}
                          disabled={saving}
                          className="bg-[#0079BF] hover:bg-[#005A8B] text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowMemberAssignment(false);
                            setSelectedMembers(selectedTask.assignedUsers?.map(u => u.id) || []);
                          }}
                          className="border-[#DFE1E6] text-[#172B4D] hover:bg-[#F4F5F7] font-medium"
                        >
                          İptal
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Actions - Trello style */}
              <div className="w-full sm:w-64 border-t sm:border-t-0 sm:border-l border-gray-200 bg-[#F4F5F7] p-4 flex flex-col gap-1 sm:gap-1">
                <div className="text-xs font-semibold text-[#5E6C84] uppercase mb-1 px-2">Eylemler</div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left text-[#172B4D] hover:bg-white/60"
                  onClick={() => {
                    setShowMemberAssignment(!showMemberAssignment);
                  }}
                >
                  <User className="h-4 w-4 mr-2 text-[#5E6C84]" />
                  Üye Ekle
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left text-[#172B4D] hover:bg-white/60"
                  onClick={() => {
                    setShowLabelPicker(!showLabelPicker);
                  }}
                >
                  <Tag className="h-4 w-4 mr-2 text-[#5E6C84]" />
                  Etiketler
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left text-[#172B4D] hover:bg-white/60"
                  onClick={() => {
                    toast.info("Checklist özelliği yakında eklenecek. Backend desteği eklendikten sonra aktif olacak.");
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2 text-[#5E6C84]" />
                  Checklist
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left text-[#172B4D] hover:bg-white/60"
                  onClick={() => {
                    // Due date already in form
                    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
                    if (dateInput) dateInput.focus();
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2 text-[#5E6C84]" />
                  Tarih
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left text-[#172B4D] hover:bg-white/60"
                  onClick={() => {
                    toast.info("Dosya ekleme özelliği yakında eklenecek. Backend desteği eklendikten sonra aktif olacak.");
                  }}
                >
                  <Paperclip className="h-4 w-4 mr-2 text-[#5E6C84]" />
                  Ek
                </Button>
                <div className="text-xs font-semibold text-[#5E6C84] uppercase mt-4 px-2">İlişkiler</div>
                <div className="space-y-2 px-2">
                  <Select value={selectedOrderLink} onValueChange={setSelectedOrderLink}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Sipariş seç" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Bağlı sipariş yok</SelectItem>
                      {Array.isArray(productionOrders) && productionOrders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.order_number} • {order.customer_name || "-"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleLinkProductionOrder(selectedOrderLink === "none" ? null : selectedOrderLink)
                      }
                      disabled={saving}
                      className="bg-[#0079BF] hover:bg-[#005A8B] text-white flex-1 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bağla"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchProductionOrderList}
                      disabled={ordersLoading}
                      className="border-[#DFE1E6] text-[#172B4D] hover:bg-[#F4F5F7] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {ordersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yenile"}
                    </Button>
                  </div>
                  {selectedTask.linkedProductionOrder && (
                    <p className="text-[11px] text-[#5E6C84]">
                      Bağlı: {selectedTask.linkedProductionOrder.orderNumber || selectedTask.linkedProductionOrder.id}
                    </p>
                  )}
                </div>
                <div className="border-t border-gray-200 my-2" />
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left text-[#172B4D] hover:bg-red-50 hover:text-red-600 font-medium"
                  onClick={() => {
                    if (confirm("Bu kartı silmek istediğinize emin misiniz?")) {
                      handleDeleteTask(selectedTask.id);
                      setShowTaskModal(false);
                    }
                  }}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Arşivle
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left text-red-600 hover:bg-red-50 font-medium"
                  onClick={() => {
                    if (confirm("Bu kartı kalıcı olarak silmek istediğinize emin misiniz?")) {
                      handleDeleteTask(selectedTask.id);
                      setShowTaskModal(false);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sil
                </Button>
              </div>
            </div>

            <DialogFooter className="border-t border-gray-200 p-4 bg-white">
              <Button 
                variant="outline" 
                onClick={() => setShowTaskModal(false)}
                className="border-[#DFE1E6] text-[#172B4D] hover:bg-[#F4F5F7] font-medium"
              >
                Kapat
              </Button>
              <Button 
                onClick={handleEditTask} 
                disabled={saving || !taskForm.title.trim()} 
                className="bg-[#0079BF] hover:bg-[#005A8B] text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
