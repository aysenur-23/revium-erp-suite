import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTaskById,
  getTaskAssignments,
  updateTask,
  updateTaskStatus,
  assignTask,
  acceptTaskAssignment,
  rejectTaskAssignment,
  deleteTaskAssignment,
  approveTaskRejection,
  rejectTaskRejection,
  addTaskComment,
  getTaskComments,
  getTaskActivities,
  addTaskActivity,
  createChecklist,
  getChecklists,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  addTaskAttachment,
  getTaskAttachments,
  deleteTaskAttachment,
  createTask,
  requestTaskApproval,
  approveTask,
  rejectTaskApproval,
  archiveTask,
  unarchiveTask,
  deleteTask,
  requestTaskFromPool,
  approvePoolRequest,
  rejectPoolRequest,
  removeTaskFromPool,
  Task as FirebaseTask,
  TaskComment,
  TaskActivity,
  Checklist,
  TaskAttachment,
} from "@/services/firebase/taskService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { createNotification } from "@/services/firebase/notificationService";
import { getOrderById, Order } from "@/services/firebase/orderService";
import { Project } from "@/services/firebase/projectService";
import { getDepartments } from "@/services/firebase/departmentService";
import { canEditTask, canInteractWithTask, canViewTask, canCreateTask, canUpdateResource, canDeleteResource, isMainAdmin, canAddChecklist, canEditChecklist, canViewPrivateProject } from "@/utils/permissions";
import { ActivityCommentsPanel } from "@/components/shared/ActivityCommentsPanel";
import { Timestamp } from "firebase/firestore";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  CalendarDays,
  User,
  Check,
  X,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  Paperclip,
  Archive,
  Loader2,
  Trash2,
  Plus,
  Package,
  Tag,
  ListChecks,
  UserPlus,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Link2,
  Shield,
  Lock,
  CircleDot,
  ClipboardList,
  BarChart2,
  CreditCard,
  ShoppingCart,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { OrderDetailModal } from "@/components/Production/OrderDetailModal";
import { Progress } from "@/components/ui/progress";
import { UserMultiSelect } from "./UserMultiSelect";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PRIORITY_OPTIONS, PriorityLevel, convertOldPriorityToNew, convertNewPriorityToOld } from "@/utils/priority";

interface AssignedUser {
  id: string;
  assignment_id: string;
  full_name: string;
  email: string;
  accepted_at: string | null;
  completed_at: string | null;
  status: string;
  rejection_reason?: string | null;
  assigned_by?: string | null;
}

interface TaskDetailModalProps {
  taskId: string | null; // null ise yeni görev oluşturma modu
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  initialStatus?: "pending" | "in_progress" | "completed"; // Yeni görev için başlangıç durumu
  projectId?: string | null; // Proje ID'si (proje bazlı görev oluşturma için)
}

type StatusItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
};

// Görev durum workflow'u - 4 aşama
const taskStatusWorkflow: StatusItem[] = [
  { value: "pending", label: "Yapılacak", icon: CircleDot, color: "text-amber-500" },
  { value: "in_progress", label: "Devam Ediyor", icon: Clock, color: "text-blue-500" },
  { value: "completed", label: "Tamamlandı", icon: CheckCircle2, color: "text-emerald-600" },
  { value: "approved", label: "Onaylandı", icon: CheckCircle2, color: "text-green-600" },
];

// StatusProgressButton Props
interface StatusProgressButtonProps {
  task: any;
  user: { id: string; fullName?: string } | null;
  loading: boolean;
  currentStatus: string;
  myAssignment: { id: string; status: string } | null;
  assignedUsers: Array<{ id: string; status?: string }>;
  isSuperAdmin: boolean;
  canUpdate: boolean;
  updatingStatus: boolean;
  onStatusChange: (status: string) => void;
  onRequestApproval: () => void;
  getNextStatus: () => StatusItem | null;
}

// İlerleme Butonu Component - IIFE yerine normal component
const StatusProgressButton: React.FC<StatusProgressButtonProps> = ({
  task,
  user,
  loading,
  currentStatus,
  myAssignment,
  assignedUsers,
  isSuperAdmin,
  canUpdate,
  updatingStatus,
  onStatusChange,
  onRequestApproval,
  getNextStatus,
}) => {
  // Normalize status
  const normalizeStatusLocal = (status: string | undefined | null): string => {
    if (!status) return "pending";
    if (status.startsWith("column_")) {
      const statusFromColumn = status.replace("column_", "");
      if (["pending", "in_progress", "completed", "approved", "cancelled"].includes(statusFromColumn)) {
        return statusFromColumn === "cancelled" ? "pending" : statusFromColumn;
      }
      return "pending";
    }
    if (["pending", "in_progress", "completed", "approved", "cancelled"].includes(status)) {
      return status === "cancelled" ? "pending" : status;
    }
    return "pending";
  };

  // DEBUG: Component render ediliyor mu?
  if (!task || !user) {
    return null;
  }
  
  if (loading) {
    return null;
  }
  
  const normalizedCurrentStatus = normalizeStatusLocal(currentStatus);
  
  // Eğer görev onaylandıysa, buton gösterilmez
  if (normalizedCurrentStatus === "completed" && task?.approvalStatus === "approved") {
    return null;
  }
  
  // Görev üyesi kontrolü - Tüm görev üyelerinde buton görünmeli
  const isAssignedViaMyAssignment = myAssignment && myAssignment.status !== "rejected";
  const isAssignedInList = Array.isArray(assignedUsers) && assignedUsers.length > 0 && assignedUsers.some(u => {
    const matches = u.id === user?.id;
    const notRejected = u.status !== "rejected";
    return matches && notRejected;
  });
  // task.assignedUsers hem string array hem de Profile array olabilir
  const isInTaskAssignedUsers = Array.isArray(task?.assignedUsers) && task.assignedUsers.some((u: unknown) => {
    if (typeof u === 'string') {
      return u === user?.id;
    }
    if (typeof u === 'object' && u !== null && 'id' in u) {
      return (u as { id: string }).id === user?.id;
    }
    return false;
  });
  const isCreator = task?.createdBy === user?.id;
  const isAssigned = !!isAssignedViaMyAssignment || isAssignedInList || isInTaskAssignedUsers;
  // Tüm görev üyelerinde buton görünmeli - sadece görev üyesi (personel, ekip lideri, yönetici) veya oluşturan
  // Yönetici olmak yeterli değil, görev üyesi olmak gerekiyor
  const hasPermission = isAssigned || isCreator;
  
  // Görev üyesi değilse butonu hiç gösterme
  if (!hasPermission) {
    return null;
  }
  
  const nextStatusItem = getNextStatus();
  
  // Eğer nextStatusItem yoksa ama görev tamamlandı ve onaya gönderilmemişse "Onaya Gönder" butonu göster
  if (!nextStatusItem) {
    if (normalizedCurrentStatus === "completed" && task?.approvalStatus !== "pending" && task?.approvalStatus !== "approved" && hasPermission) {
      return (
        <Button
          onClick={onRequestApproval}
          disabled={updatingStatus}
          className="w-full gap-2 bg-primary hover:bg-primary/90 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base"
          size="lg"
        >
          {updatingStatus ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-semibold">Gönderiliyor...</span>
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              <span className="font-semibold">Onaya Gönder</span>
            </>
          )}
        </Button>
      );
    }
    return null;
  }
  
  // "approved" durumuna geçiş yapılamaz - sadece "Onaya Gönder" butonu gösterilir
  if (nextStatusItem.value === "approved") {
    // Eğer görev tamamlandı ve onaya gönderilmemişse "Onaya Gönder" butonu göster
    if (normalizedCurrentStatus === "completed" && task?.approvalStatus !== "pending" && task?.approvalStatus !== "approved" && hasPermission) {
      return (
        <Button
          onClick={onRequestApproval}
          disabled={updatingStatus}
          className="w-full gap-2 bg-primary hover:bg-primary/90 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base"
          size="lg"
        >
          {updatingStatus ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-semibold">Gönderiliyor...</span>
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              <span className="font-semibold">Onaya Gönder</span>
            </>
          )}
        </Button>
      );
    }
    return null;
  }
  
  const NextIcon = nextStatusItem.icon;
  
  return (
    <Button
      onClick={() => onStatusChange(nextStatusItem.value)}
      disabled={updatingStatus}
      className="w-full gap-2 bg-primary hover:bg-primary/90 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      size="lg"
    >
      {updatingStatus ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Güncelleniyor...
        </>
      ) : (
        <>
          <NextIcon className="h-5 w-5" />
          <ArrowRight className="h-4 w-4" />
          {nextStatusItem.label} Aşamasına Geç
        </>
      )}
    </Button>
  );
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

export const TaskDetailModal = ({ taskId, open, onOpenChange, onUpdate, initialStatus = "pending", projectId: propProjectId }: TaskDetailModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [canCreate, setCanCreate] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Permission state'lerini Firestore'dan kontrol et
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setCanCreate(false);
        setCanUpdate(false);
        setCanDelete(false);
        setIsSuperAdmin(false);
        return;
      }
      try {
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
        const [createResult, updateResult, deleteResult, isMainAdminResult] = await Promise.all([
          canCreateTask(userProfile, []),
          canUpdateResource(userProfile, "tasks"),
          canDeleteResource(userProfile, "tasks"),
          isMainAdmin(userProfile),
        ]);
        setCanCreate(createResult);
        setCanUpdate(updateResult);
        setCanDelete(deleteResult);
        setIsSuperAdmin(isMainAdminResult);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Error checking permissions:", error);
        }
        setCanCreate(false);
        setCanUpdate(false);
        setCanDelete(false);
        setIsSuperAdmin(false);
      }
    };
    checkPermissions();
  }, [user]);
  const [task, setTask] = useState<FirebaseTask | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myAssignment, setMyAssignment] = useState<AssignedUser | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRejectApprovalDialog, setShowRejectApprovalDialog] = useState(false);
  const [showRejectRejectionDialog, setShowRejectRejectionDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionApprovalReason, setRejectionApprovalReason] = useState("");
  const [rejectionRejectionReason, setRejectionRejectionReason] = useState("");
  const [selectedRejectionAssignment, setSelectedRejectionAssignment] = useState<AssignedUser | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [checklistItemInputs, setChecklistItemInputs] = useState<Record<string, string>>({});
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loadingChecklists, setLoadingChecklists] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [showAddAttachmentDialog, setShowAddAttachmentDialog] = useState(false);
  const [attachmentType, setAttachmentType] = useState<"file" | "drive_link">("file");
  const [driveLink, setDriveLink] = useState("");
  const [driveLinkName, setDriveLinkName] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingLabels, setEditingLabels] = useState(false);
  const [editingMembers, setEditingMembers] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [labelColor, setLabelColor] = useState("#61BD4F");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [dueDateValue, setDueDateValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  // Yeni görev oluşturma için state'ler
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskMembers, setNewTaskMembers] = useState<string[]>([]);
  const [newTaskChecklistItems, setNewTaskChecklistItems] = useState<Array<{ text: string; completed: boolean }>>([]);
  const [newChecklistItemText, setNewChecklistItemText] = useState("");
  const [newTaskLabels, setNewTaskLabels] = useState<Array<{ name: string; color: string }>>([]);
  const [newTaskLabelInput, setNewTaskLabelInput] = useState("");
  const [newTaskLabelColor, setNewTaskLabelColor] = useState("#61BD4F");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<PriorityLevel>(1); // Default: Normal (1)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(propProjectId || null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const [creatingTask, setCreatingTask] = useState(false);
  const [canView, setCanView] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canInteract, setCanInteract] = useState(false);
  const labelsSectionRef = useRef<HTMLDivElement | null>(null);
  const datesSectionRef = useRef<HTMLDivElement | null>(null);
  const attachmentsSectionRef = useRef<HTMLDivElement | null>(null);
  const checklistSectionRef = useRef<HTMLDivElement | null>(null);
  const membersSectionRef = useRef<HTMLDivElement | null>(null);
  const descriptionSectionRef = useRef<HTMLDivElement | null>(null);
  const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/api$/, "");

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
  const scrollToSection = (ref: { current: HTMLDivElement | null }) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Personnel veya Viewer kontrolü
  const isPersonnelOrViewer = useMemo(() => {
    if (!user?.roles || user.roles.length === 0) return false;
    return user.roles.some(role => role === "personnel" || role === "viewer");
  }, [user?.roles]);

  // Personnel ve İzleyici için yeni görev oluşturma modunu engelle
  useEffect(() => {
    if (!taskId && open && isPersonnelOrViewer) {
      onOpenChange(false);
      toast.error("Görev oluşturma yetkiniz yok. Sadece yönetici veya ekip lideri görev oluşturabilir.");
    }
  }, [taskId, open, isPersonnelOrViewer, onOpenChange]);

  useEffect(() => {
    if (open && taskId) {
      fetchTaskDetails();
    } else if (open && !taskId) {
      // Personnel veya İzleyici ise modal'ı açma
      if (isPersonnelOrViewer) {
        return;
      }
      // Yeni görev modu - state'leri sıfırla
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskMembers([]);
      setNewTaskChecklistItems([]);
      setNewChecklistItemText("");
      setNewTaskLabels([]);
      setNewTaskLabelInput("");
      setNewTaskLabelColor("#61BD4F");
      setNewTaskDueDate("");
      setNewTaskPriority(1); // Default: Normal (1)
      setSelectedProjectId(propProjectId || null);
      setIsPrivate(false);
      setLoading(false);
    }
  }, [open, taskId]);

  useEffect(() => {
    // Projeleri yükle
    const loadProjects = async () => {
      try {
        const { getProjects, getProjectById } = await import("@/services/firebase/projectService");
        
        // Düzenleme modunda (taskId varsa) tüm projeleri göster, yeni görev oluştururken ve propProjectId varsa sadece o projeyi göster
        if (propProjectId && !taskId) {
          try {
            const currentProject = await getProjectById(propProjectId);
            // Gizli proje kontrolü: canViewPrivateProject kullan
            if (currentProject.isPrivate) {
              if (user) {
                try {
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
                  const canView = await canViewPrivateProject(currentProject, userProfile);
                  if (canView) {
                    setProjects([currentProject]);
                    return;
                  }
                  
                  // Projede görevi olan kullanıcılar görebilir (canViewPrivateProject false döndüyse)
                  try {
                    const { getTasks, getTaskAssignments } = await import("@/services/firebase/taskService");
                    const projectTasks = await getTasks({ projectId: propProjectId });
                    
                    for (const task of projectTasks) {
                      if (task.createdBy === user.id) {
                        setProjects([currentProject]);
                        return;
                      }
                      if (task.assignedUsers && task.assignedUsers.includes(user.id)) {
                        setProjects([currentProject]);
                        return;
                      }
                      const assignments = await getTaskAssignments(task.id);
                      const isAssigned = assignments.some(
                        (a) => a.assignedTo === user.id && (a.status === "accepted" || a.status === "pending")
                      );
                      if (isAssigned) {
                        setProjects([currentProject]);
                        return;
                      }
                    }
                  } catch (error) {
                    if (import.meta.env.DEV) {
                      console.error("Error checking project tasks:", error);
                    }
                  }
                } catch (error: unknown) {
                  if (import.meta.env.DEV) {
                    console.error("Error checking private project visibility:", error);
                  }
                }
              }
              // Yetkisiz kullanıcı - boş liste
              setProjects([]);
              return;
            } else {
              // Gizli olmayan proje - göster
              setProjects([currentProject]);
              return;
            }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error("Proje yüklenemedi", error);
            }
            setProjects([]);
            return;
          }
        }
        
        // Normal durum: Tüm görünür projeleri yükle
        const allProjects = await getProjects({ status: "active" });
        
        // Eğer bir gizli projeye görev ekleniyorsa (propProjectId ile ve yeni görev oluştururken), sadece o proje gösterilmeli
        // Diğer gizli projeler gösterilmemeli
        if (propProjectId && !taskId) {
          const currentProject = allProjects.find(p => p.id === propProjectId);
          if (currentProject?.isPrivate) {
            // Gizli projeye görev ekleniyorsa, sadece o proje gösterilmeli
            setProjects([currentProject]);
            return;
          }
        }
        
        // Gizli projeleri filtrele: Sadece yönetici, oluşturan ve projede görevi olanlar görebilir
        // ÖNEMLİ: Eğer bir gizli projeye görev ekleniyorsa (ve yeni görev oluştururken), diğer gizli projeler gösterilmemeli
        const visibleProjects = await Promise.all(
          allProjects.map(async (project) => {
            // Eğer bir gizli projeye görev ekleniyorsa (ve yeni görev oluştururken), diğer gizli projeler gösterilmemeli
            if (propProjectId && !taskId) {
              const currentProject = allProjects.find(p => p.id === propProjectId);
              if (currentProject?.isPrivate && project.isPrivate && project.id !== propProjectId) {
                // Başka bir gizli proje, gösterilmemeli
                return null;
              }
            }
            
            if (!project.isPrivate) return project; // Gizli olmayan projeler herkes görebilir
            
            // Gizli projeler için canViewPrivateProject kontrolü
            if (user) {
              try {
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
                const canView = await canViewPrivateProject(project, userProfile);
                if (canView) return project;
                
                // Projede görevi olan kullanıcılar görebilir (canViewPrivateProject false döndüyse)
                try {
                  const { getTasks, getTaskAssignments } = await import("@/services/firebase/taskService");
                  const projectTasks = await getTasks({ projectId: project.id });
                  
                  for (const task of projectTasks) {
                    if (task.createdBy === user.id) return project;
                    if (task.assignedUsers && task.assignedUsers.includes(user.id)) return project;
                    const assignments = await getTaskAssignments(task.id);
                    const isAssigned = assignments.some(
                      (a) => a.assignedTo === user.id && (a.status === "accepted" || a.status === "pending")
                    );
                    if (isAssigned) return project;
                  }
                } catch (error: unknown) {
                  if (import.meta.env.DEV) {
                    console.error("Error checking project tasks:", error);
                  }
                }
              } catch (error: unknown) {
                if (import.meta.env.DEV) {
                  console.error("Error checking private project visibility:", error);
                }
              }
            }
            
            return null; // Diğer kullanıcılar gizli projeleri göremez
          })
        );
        
        setProjects(visibleProjects.filter((p): p is typeof allProjects[0] => p !== null));
      } catch (error) {
        console.error("Projeler yüklenemedi", error);
      }
    };
    
    if (open) {
      loadProjects();
    }
  }, [open, taskId, isSuperAdmin, user?.id, propProjectId]);


  // Gizlilik değiştiğinde projeleri yeniden yükle (sadece gizli projeleri göstermek için)
  useEffect(() => {
    if (isPrivate && open && !taskId) {
      // Projeleri yeniden yükle
      const reloadProjects = async () => {
        try {
          const { getProjects } = await import("@/services/firebase/projectService");
          const allProjects = await getProjects({ status: "active" });
          // Sadece gizli projeleri göster - canViewPrivateProject kullan
          const visibleProjects = await Promise.all(
            allProjects.map(async (project) => {
              if (!project.isPrivate) return null; // Gizli olmayan projeler gizli görevler için gösterilmez
              
              // Gizli projeler için canViewPrivateProject kontrolü
              if (user) {
                try {
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
                  const canView = await canViewPrivateProject(project, userProfile);
                  if (canView) return project;
                  
                  // Projede görevi olan kullanıcılar görebilir (canViewPrivateProject false döndüyse)
                  try {
                    const { getTasks, getTaskAssignments } = await import("@/services/firebase/taskService");
                    const projectTasks = await getTasks({ projectId: project.id });
                    
                    for (const task of projectTasks) {
                      if (task.createdBy === user.id) return project;
                      if (task.assignedUsers && task.assignedUsers.includes(user.id)) return project;
                      const assignments = await getTaskAssignments(task.id);
                      const isAssigned = assignments.some(
                        (a) => a.assignedTo === user.id && (a.status === "accepted" || a.status === "pending")
                      );
                      if (isAssigned) return project;
                    }
                  } catch (error) {
                    if (import.meta.env.DEV) {
                      console.error("Error checking project tasks:", error);
                    }
                  }
                } catch (error: unknown) {
                  if (import.meta.env.DEV) {
                    console.error("Error checking private project visibility:", error);
                  }
                }
              }
              
              return null;
            })
          );
          
          setProjects(visibleProjects.filter((p): p is typeof allProjects[0] => p !== null));
        } catch (error) {
          console.error("Projeler yüklenemedi", error);
        }
      };
      
      reloadProjects();
    }
  }, [isPrivate, open, taskId, isSuperAdmin, user?.id]);

  // Proje seçildiğinde veya propProjectId geldiğinde, eğer proje gizli ise isPrivate'ı otomatik true yap
  useEffect(() => {
    if (!taskId && projects.length > 0) {
      const currentProjectId = selectedProjectId || propProjectId;
      if (currentProjectId) {
        const currentProject = projects.find(p => p.id === currentProjectId);
        if (currentProject?.isPrivate) {
          setIsPrivate(true);
        }
      }
    }
  }, [selectedProjectId, propProjectId, projects, taskId]);

  const fetchTaskDetails = async () => {
    try {
      const [taskData, assignments, fetchedAllUsers, taskComments, taskActivities, taskChecklists, taskAttachments] = await Promise.all([
        getTaskById(taskId),
        getTaskAssignments(taskId),
        getAllUsers(),
        getTaskComments(taskId).catch(() => []),
        getTaskActivities(taskId).catch(() => []),
        getChecklists(taskId).catch(() => []),
        getTaskAttachments(taskId).catch(() => []),
      ]);
      
      // allUsers'ı state'e kaydet
      setAllUsers(fetchedAllUsers);
      
      // allUsers'ı kullan
      const allUsers = fetchedAllUsers;

      if (!taskData) {
        toast.error("Görev bulunamadı");
        return;
      }

      let parsedLabels: Array<{ name: string; color?: string }> = [];
      if (taskData.labels) {
        if (typeof taskData.labels === "string") {
          try {
            const parsed = JSON.parse(taskData.labels);
            parsedLabels = Array.isArray(parsed) ? parsed : [];
          } catch {
            parsedLabels = [];
          }
        } else if (Array.isArray(taskData.labels)) {
          // String array ise object array'e çevir
          parsedLabels = taskData.labels.map((label) => {
            if (typeof label === "string") {
              return { name: label, color: "#61BD4F" };
            }
            return label;
          });
        }
      }

      // UI formatına çevir
      const taskUI = {
        ...taskData,
        labels: parsedLabels,
        attachments: taskAttachments, // Attachments'ı ekle
        checklists: taskChecklists, // Checklists'i ekle
        createdBy: taskData.createdBy, // Ensure createdBy is included
        approvalStatus: taskData.approvalStatus, // Ensure approvalStatus is included
        isInPool: taskData.isInPool, // Ensure isInPool is included
        poolRequests: taskData.poolRequests || [], // Ensure poolRequests is included
          dueDate: taskData.dueDate
          ? taskData.dueDate instanceof Timestamp
            ? taskData.dueDate.toDate().toISOString()
            : new Date(taskData.dueDate).toISOString()
          : null,
        createdAt: taskData.createdAt instanceof Timestamp
          ? taskData.createdAt.toDate().toISOString()
          : new Date(taskData.createdAt).toISOString(),
      };

      setTask(taskUI as any);
      setDescriptionValue(taskData.description || "");
      setDueDateValue(
        taskData.dueDate
          ? (taskData.dueDate instanceof Timestamp
              ? taskData.dueDate.toDate()
              : new Date(taskData.dueDate)
            ).toISOString().split("T")[0]
          : ""
      );

      // Atanan kullanıcıları al
      const users: AssignedUser[] = assignments.map((a) => {
        const userProfile = allUsers.find((u) => u.id === a.assignedTo);
        return {
          id: a.assignedTo,
          assignment_id: a.id,
          full_name: userProfile?.fullName || userProfile?.displayName || "",
          email: userProfile?.email || "",
          accepted_at: a.acceptedAt
            ? a.acceptedAt instanceof Timestamp
              ? a.acceptedAt.toDate().toISOString()
              : new Date(a.acceptedAt).toISOString()
            : null,
          completed_at: a.completedAt
            ? a.completedAt instanceof Timestamp
              ? a.completedAt.toDate().toISOString()
              : new Date(a.completedAt).toISOString()
            : null,
          status: a.status,
          rejection_reason: a.rejectionReason || null,
          assigned_by: a.assignedBy || null,
        };
      });

      setAssignedUsers(users);
      setSelectedMembers(users.map((u: AssignedUser) => u.id));

      // Kullanıcıya atanan görev var mı kontrol et
      const myAssigned = users.find((u: AssignedUser) => u.id === user?.id);
      setMyAssignment(myAssigned || null);
      setChecklistItemInputs({});
      
      // Yorumlar ve aktiviteleri set et
      setComments(taskComments);
      setActivities(taskActivities);
      setChecklists(taskChecklists);
      
      // Yetki kontrollerini güncelle (rejected hariç tüm atanan kullanıcılar)
      await updatePermissions(taskData as FirebaseTask, users.filter(u => u.status !== "rejected").map(u => u.id));
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Fetch task details error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Görev detayları yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  // Yetki kontrollerini güncelle
  const updatePermissions = async (taskData: FirebaseTask, assignedUserIds: string[]) => {
    if (!taskData || !user) {
      setCanView(false);
      setCanEdit(false);
      setCanInteract(false);
      return;
    }

    try {
      const userProfile = (user as unknown) as UserProfile;
      const [viewPermission, editPermission, interactPermission] = await Promise.all([
        canViewTask(taskData, userProfile, assignedUserIds),
        canEditTask(taskData, userProfile),
        canInteractWithTask(taskData, userProfile, assignedUserIds),
      ]);

      setCanView(viewPermission);
      setCanEdit(editPermission);
      
      // canInteract değerini set et, ama ek kontroller yapılacak
      // (görev üyesi kontrolü için)
      setCanInteract(interactPermission);
      
      if (import.meta.env.DEV) {
        console.log("TaskDetailModal: updatePermissions sonucu", {
          viewPermission,
          editPermission,
          interactPermission,
          assignedUserIds,
          taskIsPrivate: (taskData as { isPrivate?: boolean }).isPrivate,
        });
      }
    } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error checking permissions:", error);
        }
      setCanView(false);
      setCanEdit(false);
      setCanInteract(false);
    }
  };

  // Task status değiştiğinde currentStatus'u güncelle
  useEffect(() => {
    if (task?.status) {
      const normalized = normalizeStatus(task.status);
      setCurrentStatus(prevStatus => {
        const normalizedPrev = normalizeStatus(prevStatus);
        if (normalized !== normalizedPrev) {
          if (import.meta.env.DEV) {
            console.log("TaskDetailModal: currentStatus güncelleniyor", {
              oldStatus: prevStatus,
              normalizedPrev,
              newStatus: normalized,
              taskStatus: task.status,
            });
          }
          return normalized;
        }
        return prevStatus;
      });
    }
  }, [task?.status]);

  // Task veya assignedUsers değiştiğinde yetkileri güncelle
  useEffect(() => {
    if (task && user) {
      // Rejected hariç tüm atanan kullanıcıların ID'lerini al
      const assignedUserIds = assignedUsers
        .filter(u => u.status !== "rejected")
        .map(u => u.id);
      
      // ÖNCE updatePermissions'ı çağır - bu Firestore'dan doğru yetkileri alır
      // (gizli görevler için özel kontroller yapar)
      const updateAndCheck = async () => {
        await updatePermissions(task as FirebaseTask, assignedUserIds);
        
        // updatePermissions içinde canInteract set ediliyor, ama ek kontroller yapalım
        if (isSuperAdmin) {
          if (import.meta.env.DEV) {
            console.log("TaskDetailModal: Super Admin - canInteract otomatik true");
          }
          setCanInteract(true);
          setCanEdit(true);
          return;
        }
        
        // Kullanıcının göreve atanıp atanmadığını kontrol et
        // Hem myAssignment hem de assignedUsers listesini kontrol et
        // Göreve atanan kullanıcılar (status ne olursa olsun, rejected hariç) görevi ilerletebilir
        // "rejected" durumundaki kullanıcılar görevi ilerletemez
        const isAssignedInList = assignedUsers.some(u => 
          u.id === user.id && u.status !== "rejected"
      );
        const isAssignedViaMyAssignment = myAssignment && myAssignment.status !== "rejected";
        const isAssigned = isAssignedInList || !!isAssignedViaMyAssignment;
        
        const isCreator = task.createdBy === user.id;
        
        // updatePermissions'tan gelen canInteract değerini kontrol et
        // Eğer görev üyesi (rejected hariç) veya oluşturan ise, canInteract true olmalı
        // updatePermissions zaten bunu yapıyor ama status kontrolü için tekrar kontrol ediyoruz
        if (isAssigned || isCreator) {
          setCanInteract(true);
        }
        // Eğer updatePermissions false döndüyse ve görev üyesi değilse, false kalmalı
        // (Bu durumda updatePermissions'ın sonucu korunur)
        
        if (import.meta.env.DEV) {
          console.log("TaskDetailModal: canInteract hesaplanıyor", {
            isAssignedInList,
            isAssignedViaMyAssignment,
            isAssigned,
            isCreator,
            canUpdate,
            isSuperAdmin,
            userId: user.id,
            taskCreatedBy: task.createdBy,
            myAssignment: myAssignment ? { id: myAssignment.id, status: myAssignment.status } : null,
            assignedUsersCount: assignedUsers.length,
            assignedUserIds: assignedUsers.map(u => ({ id: u.id, status: u.status })),
            taskIsPrivate: (task as { isPrivate?: boolean }).isPrivate,
            assignedUserIdsArray: assignedUserIds,
          });
        }
      };
      
      updateAndCheck();
    }
  }, [task, user, assignedUsers, myAssignment, isSuperAdmin, canUpdate]);

  const handleOpenOrderDetail = async () => {
    if (!task?.productionOrderId) return;
    setOrderLoading(true);
    try {
      const order = await getOrderById(task.productionOrderId);
      if (order) {
        setOrderDetail(order);
        setOrderModalOpen(true);
      } else {
        toast.error("Sipariş bulunamadı");
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Get order detail error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Sipariş detayları alınamadı");
    } finally {
      setOrderLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!user?.id || !taskId) {
      toast.error("Kullanıcı veya görev bilgisi bulunamadı.");
      return;
    }

    // Yetki kontrolü: Görev üyeleri (rejected hariç), oluşturan ve adminler durum güncelleyebilir
    // ÖNCE: assignedUsers listesinden kontrol et (rejected hariç)
    const isAssignedInList = Array.isArray(assignedUsers) && assignedUsers.some(u => {
      const matches = u.id === user.id;
      const notRejected = u.status !== "rejected";
      return matches && notRejected;
    });
    
    // İKİNCİ: myAssignment'dan kontrol et (rejected hariç)
    const isAssignedViaMyAssignment = myAssignment && myAssignment.status !== "rejected";
    
    // ÜÇÜNCÜ: task.assignedUsers array'inden kontrol et (fallback)
    const isInTaskAssignedUsers = task?.assignedUsers?.some((uid: string) => uid === user.id) || false;
    
    // DÖRDÜNCÜ: task.assignedUsers field'ından kontrol et (eğer string array ise)
    const isInTaskAssignedUsersField = Array.isArray(task?.assignedUsers) && task.assignedUsers.includes(user.id);
    
    const isAssigned = isAssignedInList || !!isAssignedViaMyAssignment || isInTaskAssignedUsers || isInTaskAssignedUsersField;
    const isCreator = task?.createdBy === user.id;

    // Alt yetki kontrolü - durum değiştirme
    // SADECE görev üyesi (rejected hariç) veya oluşturan ise izin var
    // Yöneticiler için özel durum YOK - sadece görev üyeleri durum değiştirebilir
    const hasPermission = isCreator || isAssigned;
    
    if (!hasPermission) {
      if (import.meta.env.DEV) {
        console.warn("handleStatusUpdate: Durum değiştirme yetkisi yok", {
          isSuperAdmin,
          canUpdate,
          isAssigned,
          isAssignedInList,
          isAssignedViaMyAssignment,
          isInTaskAssignedUsers,
          isInTaskAssignedUsersField,
          isCreator,
          assignedUsers: assignedUsers.map(u => ({ id: u.id, status: u.status })),
          myAssignment: myAssignment ? { id: myAssignment.id, status: myAssignment.status } : null,
          taskAssignedUsers: task?.assignedUsers,
        });
      }
      toast.error("Durum değiştirme yetkiniz yok. Sadece görev üyesi olduğunuz görevlerin durumunu değiştirebilirsiniz.");
      return;
    }

    try {
      // Eğer görev "completed" durumuna geçiyorsa, onay kontrolü yap
      if (newStatus === "completed" && user?.id) {
        const isCreator = task?.createdBy === user.id;
        const isAssigned = assignedUsers.some(u => u.id === user.id);
        // SISTEM_YETKILERI.md'ye göre: Super Admin, Team Leader, görevi oluşturan direkt tamamlayabilir
        const canDirectComplete = isSuperAdmin || canUpdate || isCreator;
        
        // Yönetici veya oluşturan kişi direkt tamamlayabilir
        if (canDirectComplete) {
          await updateTaskStatus(
            taskId,
            newStatus as "pending" | "in_progress" | "completed"
          );
          toast.success("Görev tamamlandı");
        } else {
          // Normal kullanıcı onay isteği gönderir (durum değiştirmeden)
          await requestTaskApproval(taskId, user.id);
          toast.success("Görev tamamlandı olarak işaretlendi ve onay için yöneticiye gönderildi");
        }
      } else {
        // Diğer durumlar için direkt güncelle
        await updateTaskStatus(
          taskId,
          newStatus as "pending" | "in_progress" | "completed"
        );
        toast.success("Görev durumu güncellendi");
      }
      setTask({ ...task, status: newStatus } as any);
      await fetchTaskDetails(); // Approval status'u da almak için
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Update task status error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Durum güncellenirken hata oluştu");
    }
  };

  const handleUpdatePrivacy = async (newIsPrivate: boolean) => {
    if (!task?.id || !user?.id || task.createdBy !== user.id) {
      toast.error("Bu görevin gizlilik ayarını değiştirme yetkiniz yok.");
      return;
    }
    setSaving(true);
    try {
      const { updateTask } = await import("@/services/firebase/taskService");
      const { addTaskActivity } = await import("@/services/firebase/taskService");
      await updateTask(task.id, { isPrivate: newIsPrivate }, user.id);
      setTask(prev => prev ? { ...prev, isPrivate: newIsPrivate } : null);
      toast.success(`Görev gizliliği ${newIsPrivate ? "gizli" : "herkese açık"} olarak güncellendi.`);
      
      // Activity log ekle
      await addTaskActivity(
        task.id,
        user.id,
        "updated",
        `bu görevin gizliliğini ${newIsPrivate ? "gizli" : "herkese açık"} olarak değiştirdi`,
        { field: "isPrivate", oldValue: !newIsPrivate, newValue: newIsPrivate },
        user.fullName || "",
        user.email || ""
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Gizlilik güncellenemedi.");
    } finally {
      setSaving(false);
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

  const getStatusLabel = (status: string | undefined | null) => {
    // Önce status'ü normalize et (column_ prefix'ini kaldır ve geçerli status'e çevir)
    if (!status) return "Yapılacak";
    const normalized = normalizeStatus(status);
    
    // Eğer görev "completed" durumunda ve onaylandıysa, "Onaylandı" göster
    // Ama sadece task objesi mevcut ve approvalStatus kontrol edilebiliyorsa
    if (normalized === "completed" && task?.approvalStatus === "approved") {
      return "Onaylandı";
    }
    
    const labels: Record<string, string> = {
      pending: "Yapılacak",
      in_progress: "Devam Ediyor",
      completed: "Tamamlandı",
      approved: "Onaylandı",
      cancelled: "Yapılacak", // cancelled durumu yok, pending olarak göster
    };
    return labels[normalized] || "Yapılacak"; // Fallback to "Yapılacak" instead of showing raw status
  };

  // Normalize status - remove "column_" prefix if present
  // "column_" ile başlayan değerler column ID'leridir ve sayısal olabilir, bunları "pending" olarak kabul et
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

  const [currentStatus, setCurrentStatus] = useState<string>(normalizeStatus(task?.status || initialStatus));
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  // Mevcut durumun index'ini bul
  const getCurrentStatusIndex = () => {
    // Status'ü normalize et - "column_" prefix'ini kaldır
    const normalizedCurrentStatus = normalizeStatus(currentStatus);
    
    // Eğer görev tamamlandı ve onaylandıysa, "Onaylandı" aşamasını göster
    if (normalizedCurrentStatus === "completed" && task?.approvalStatus === "approved") {
      return 3; // "Onaylandı" index'i
    }
    // Eğer görev tamamlandı ama onaylanmadıysa, "Tamamlandı" aşamasını göster
    if (normalizedCurrentStatus === "completed") {
      return 2; // "Tamamlandı" index'i
    }
    // "cancelled" durumunu "pending" olarak handle et (cancelled durumu yok)
    const normalized = normalizedCurrentStatus === "cancelled" ? "pending" : normalizedCurrentStatus;
    const index = taskStatusWorkflow.findIndex((statusItem) => statusItem.value === normalized);
    return index === -1 ? 0 : index;
  };

  // Bir sonraki durumu bul
  const getNextStatus = () => {
    const normalizedCurrentStatus = normalizeStatus(currentStatus);
    const currentIndex = getCurrentStatusIndex();
    
    // Eğer görev onaylandıysa, sonraki durum yok
    if (normalizedCurrentStatus === "completed" && task?.approvalStatus === "approved") {
      return null;
    }
    
    // Eğer görev tamamlandı ama onaylanmadıysa, "Onaya Gönder" butonu gösterilecek
    // Bu durumda nextStatusItem null dönebilir, ama butonlar yine de gösterilecek
    if (currentIndex === -1) {
      return taskStatusWorkflow[0]; // İlk durum
    }
    
    // Eğer görev tamamlandı ama onaya gönderilmemişse, null döndür (Onaya Gönder butonu gösterilecek)
    if (normalizedCurrentStatus === "completed" && task?.approvalStatus !== "approved" && task?.approvalStatus !== "pending") {
      return null;
    }
    
    // Eğer görev "completed" durumundaysa, "approved" durumuna direkt geçiş yapılamaz
    // Sadece "Onaya Gönder" butonu gösterilir
    if (normalizedCurrentStatus === "completed") {
      return null;
    }
    
    // Eğer son aşamadaysa (approved), null döndür
    if (currentIndex >= taskStatusWorkflow.length - 1) {
      return null;
    }
    
    const nextStatus = taskStatusWorkflow[currentIndex + 1];
    
    // "approved" durumuna direkt geçiş yapılamaz - sadece onay süreci ile geçilebilir
    if (nextStatus && nextStatus.value === "approved") {
      return null;
    }
    
    return nextStatus;
  };

  // Durum geçiş validasyonu - sadece sıradaki aşamaya geçiş
  const isValidStatusTransition = (currentStatus: string, newStatus: string): boolean => {
    // Status'leri normalize et
    const normalizedCurrent = normalizeStatus(currentStatus);
    const normalizedNew = normalizeStatus(newStatus);
    
    // Debug log
    if (import.meta.env.DEV) {
    }
    
    // Sadece sıradaki aşamaya geçiş mümkün
    // "approved" durumuna direkt geçiş yapılamaz - sadece onay süreci ile geçilebilir
    const statusFlow: Record<string, string> = {
      pending: "in_progress",
      in_progress: "completed",
    };
    
    // "approved" durumuna direkt geçiş yapılamaz
    if (normalizedNew === "approved") {
      return false;
    }
    
    const isValid = statusFlow[normalizedCurrent] === normalizedNew;
    
    return isValid;
  };

  // Durum değişikliği handler'ı (workflow ile)
  const handleStatusChange = async (nextStatus: string) => {
    if (!taskId || !user?.id) {
      if (import.meta.env.DEV) {
        console.error("handleStatusChange: taskId veya user.id yok", { taskId, userId: user?.id });
      }
      return;
    }


    // Yetki kontrolü: canInteract kontrolü - ama görev üyesi veya oluşturan ise devam et
    // ÖNCE: assignedUsers listesinden kontrol et (rejected hariç)
    const isAssignedInList = Array.isArray(assignedUsers) && assignedUsers.some(u => {
      const matches = u.id === user.id;
      const notRejected = u.status !== "rejected";
      return matches && notRejected;
    });
    
    // İKİNCİ: myAssignment'dan kontrol et (rejected hariç)
    const isAssignedViaMyAssignment = myAssignment && myAssignment.status !== "rejected";
    
    // ÜÇÜNCÜ: task.assignedUsers array'inden kontrol et (fallback)
    const isInTaskAssignedUsers = task?.assignedUsers?.some((uid: string) => uid === user.id) || false;
    
    // DÖRDÜNCÜ: task.assignedUsers field'ından kontrol et (eğer string array ise)
    const isInTaskAssignedUsersField = Array.isArray(task?.assignedUsers) && task.assignedUsers.includes(user.id);
    
    const isAssigned = isAssignedInList || !!isAssignedViaMyAssignment || isInTaskAssignedUsers || isInTaskAssignedUsersField;
    const isCreator = task?.createdBy === user.id;
    
    // Alt yetki kontrolü - durum değiştirme
    // SADECE görev üyesi (rejected hariç) veya oluşturan ise izin var
    // Yöneticiler için özel durum YOK - sadece görev üyeleri durum değiştirebilir
    const hasPermission = isCreator || isAssigned;
    
    if (!hasPermission) {
      if (import.meta.env.DEV) {
        console.warn("handleStatusChange: Durum değiştirme yetkisi yok", {
          canInteract,
          isSuperAdmin,
          canUpdate,
          isAssigned,
          isAssignedInList,
          isAssignedViaMyAssignment,
          isInTaskAssignedUsers,
          isInTaskAssignedUsersField,
          isCreator,
          assignedUsers: assignedUsers.map(u => ({ id: u.id, status: u.status })),
          myAssignment: myAssignment ? { id: myAssignment.id, status: myAssignment.status } : null,
          taskAssignedUsers: task?.assignedUsers,
        });
      }
      toast.error("Durum değiştirme yetkiniz yok. Sadece görev üyesi olduğunuz görevlerin durumunu değiştirebilirsiniz.");
      return;
    }

    // Validasyon kontrolü
    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      toast.error(`Geçersiz durum geçişi: ${getStatusLabel(currentStatus)} → ${getStatusLabel(nextStatus)}`);
      return;
    }

    // "approved" durumuna direkt geçiş yapılamaz - sadece onay süreci ile geçilebilir
    const normalizedNextStatus = normalizeStatus(nextStatus);
    if (normalizedNextStatus === "approved") {
      toast.error("Görev 'Onaylandı' durumuna direkt geçirilemez. Lütfen 'Onaya Gönder' butonunu kullanın.");
      return;
    }
    
    setUpdatingStatus(true);
    try {
      // Durum güncellemesini yap (tüm durumlar için direkt geçiş, approved hariç)
      await updateTaskStatus(
        taskId,
        nextStatus as "pending" | "in_progress" | "completed"
      );
      
      setCurrentStatus(normalizeStatus(nextStatus));
      toast.success(`Görev durumu ${getStatusLabel(nextStatus)} olarak güncellendi.`);
      
      // Görev detaylarını yeniden yükle
      await fetchTaskDetails();
      onUpdate?.();
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Firestore izin hatasını kullanıcıya göster
      if (errorMsg.includes("Missing or insufficient permissions") || errorMsg.includes("permission-denied") || errorMsg.includes("Firestore güvenlik kuralları")) {
        toast.error("Görev durumunu değiştirme izniniz yok. Firestore güvenlik kuralları görev üyelerine izin vermiyor. Lütfen yöneticinizle iletişime geçin.");
      } else {
        toast.error("Durum güncellenemedi: " + (errorMsg || "Bilinmeyen hata"));
      }
      
      if (import.meta.env.DEV) {
        console.error("Task status update error:", error);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Onaya gönder butonu için handler
  const handleRequestApproval = async () => {
    if (!taskId || !user?.id) {
      return;
    }

    // Double-click koruması - eğer zaten işlem yapılıyorsa, tekrar çalıştırma
    if (updatingStatus) {
      return;
    }

    setUpdatingStatus(true);
    try {
      await requestTaskApproval(taskId, user.id);
      toast.success("Görev onay için yöneticiye gönderildi.");
      await fetchTaskDetails();
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Request approval error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Onay isteği gönderilemedi: " + (errorMessage || "Bilinmeyen hata"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Geri alma işlemi - sadece görev üyeleri ve görevi oluşturan için, belirli bir duruma geri alır
  const handleRevertStatus = async (targetStatus: string) => {
    if (!taskId || !user?.id) {
      return;
    }

    // Yetki kontrolü: SADECE görev üyesi (rejected hariç) veya oluşturan durum geri alabilir
    // ÖNCE: assignedUsers listesinden kontrol et (rejected hariç)
    const isAssignedInList = Array.isArray(assignedUsers) && assignedUsers.some(u => {
      const matches = u.id === user.id;
      const notRejected = u.status !== "rejected";
      return matches && notRejected;
    });
    
    // İKİNCİ: myAssignment'dan kontrol et (rejected hariç)
    const isAssignedViaMyAssignment = myAssignment && myAssignment.status !== "rejected";
    
    // ÜÇÜNCÜ: task.assignedUsers array'inden kontrol et (fallback)
    const isInTaskAssignedUsers = task?.assignedUsers?.some((uid: string) => uid === user.id) || false;
    
    // DÖRDÜNCÜ: task.assignedUsers field'ından kontrol et (eğer string array ise)
    const isInTaskAssignedUsersField = Array.isArray(task?.assignedUsers) && task.assignedUsers.includes(user.id);
    
    const isAssigned = isAssignedInList || !!isAssignedViaMyAssignment || isInTaskAssignedUsers || isInTaskAssignedUsersField;
    const isCreator = task?.createdBy === user.id;
    
    // Sadece görev üyesi (rejected hariç) veya oluşturan ise izin var
    const hasPermission = isCreator || isAssigned;
    
    if (!hasPermission) {
      toast.error("Durum geri alma yetkiniz yok. Sadece görev üyesi olduğunuz görevlerin durumunu geri alabilirsiniz.");
      return;
    }

    setUpdatingStatus(true);
    try {
      const currentIndex = getCurrentStatusIndex();
      
      // Eğer onay bekleniyorsa, geri alınamaz
      if (task?.approvalStatus === "pending") {
        toast.error("Onay bekleyen görevler geri alınamaz.");
        setUpdatingStatus(false);
        return;
      }

      // Eğer "approved" durumuna geri alınıyorsa, "completed" durumuna geri al ve approvalStatus'u null yap
      if (targetStatus === "approved") {
        // "approved" bir status değil, approvalStatus. Geri alırken "completed" durumuna geri al ve approvalStatus'u null yap
        await updateTaskStatus(
          taskId,
          "completed" as "pending" | "in_progress" | "completed"
        );
        // Approval status'u null yap
        const { updateTask } = await import("@/services/firebase/taskService");
        await updateTask(taskId, { approvalStatus: null }, user.id);
        setCurrentStatus(normalizeStatus("completed"));
        toast.success("Görev durumu Tamamlandı olarak geri alındı.");
      } else {
        const targetIndex = taskStatusWorkflow.findIndex(s => s.value === targetStatus);
        
        if (targetIndex === -1) {
          toast.error("Geçersiz durum.");
          setUpdatingStatus(false);
          return;
        }

        // Sadece geriye doğru geri alınabilir (mevcut durumdan önceki durumlara)
        if (targetIndex >= currentIndex) {
          toast.error("Sadece önceki durumlara geri alabilirsiniz.");
          setUpdatingStatus(false);
          return;
        }

        const targetStatusItem = taskStatusWorkflow[targetIndex];
        await updateTaskStatus(
          taskId,
          targetStatusItem.value as "pending" | "in_progress" | "completed"
        );
        setCurrentStatus(normalizeStatus(targetStatusItem.value));
        toast.success(`Görev durumu ${targetStatusItem.label} olarak geri alındı.`);
      }
      
      await fetchTaskDetails();
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Revert status error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Durum geri alınamadı: " + (errorMessage || "Bilinmeyen hata"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Task değiştiğinde currentStatus'u güncelle - her zaman normalize edilmiş tut
  useEffect(() => {
    if (task?.status) {
      const normalized = normalizeStatus(task.status);
      setCurrentStatus(normalized);
    } else if (initialStatus) {
      const normalized = normalizeStatus(initialStatus);
      setCurrentStatus(normalized);
    }
  }, [task?.status, initialStatus]);

  const handleAcceptTask = async () => {
    if (!myAssignment) return;

    setProcessing(true);
    try {
      await acceptTaskAssignment(taskId, myAssignment.assignment_id);
      toast.success("Görev kabul edildi");
      fetchTaskDetails();
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Accept task error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Görev kabul edilemedi");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTask = async () => {
    if (!myAssignment || !rejectionReason.trim() || rejectionReason.trim().length < 20) {
      toast.error("Reddetme sebebi en az 20 karakter olmalıdır");
      return;
    }

    setProcessing(true);
    try {
      await rejectTaskAssignment(taskId, myAssignment.assignment_id, rejectionReason.trim());
      toast.success("Görev reddedildi");
      setShowRejectDialog(false);
      setRejectionReason("");
      fetchTaskDetails();
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Reject task error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Görev reddedilemedi");
    } finally {
      setProcessing(false);
    }
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Yetki kontrolü: canInteract kontrolü
    if (!canInteract) {
      toast.error("Dosya ekleme yetkiniz yok");
      event.target.value = "";
      return;
    }

    setUploadingAttachment(true);
    try {
      const { uploadTaskAttachment } = await import("@/services/firebase/storageService");
      const uploadResult = await uploadTaskAttachment(file, taskId);
      
      await addTaskAttachment(taskId, {
        name: file.name,
        url: uploadResult.url,
        size: file.size,
        type: file.type,
        attachmentType: uploadResult.provider === "google_drive" ? "drive_link" : "file",
        storageProvider: uploadResult.provider,
        driveLink: uploadResult.webViewLink || uploadResult.webContentLink || uploadResult.url,
        driveFileId: uploadResult.fileId,
        uploadedBy: user?.id || "",
      });

      toast.success("Dosya yüklendi");
      fetchTaskDetails();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Dosya yüklenirken hata oluştu");
    } finally {
      setUploadingAttachment(false);
      event.target.value = "";
    }
  };

  const handleAddDriveLink = async () => {
    if (!taskId) {
      toast.error("Görev bulunamadı");
      return;
    }
    
    // Yetki kontrolü: canInteract kontrolü
    if (!canInteract) {
      toast.error("Dosya ekleme yetkiniz yok");
      return;
    }
    
    if (!driveLink.trim() || !driveLinkName.trim()) {
      toast.error("Lütfen Drive linki ve isim girin");
      return;
    }

    // Drive linki validasyonu
    const driveLinkPattern = /^https:\/\/(drive\.google\.com|docs\.google\.com)/;
    if (!driveLinkPattern.test(driveLink.trim())) {
      toast.error("Geçerli bir Google Drive linki girin");
      return;
    }

    setUploadingAttachment(true);
    try {
      await addTaskAttachment(taskId, {
        name: driveLinkName.trim(),
        url: driveLink.trim(),
        size: 0,
        type: "drive_link",
        attachmentType: "drive_link",
        driveLink: driveLink.trim(),
        uploadedBy: user?.id || "",
      });

      toast.success("Drive linki eklendi");
      setShowAddAttachmentDialog(false);
      setDriveLink("");
      setDriveLinkName("");
      setAttachmentType("file");
      fetchTaskDetails();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Drive linki eklenirken hata oluştu");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachment: TaskAttachment) => {
    try {
      const { deleteFile } = await import("@/services/firebase/storageService");
      if (attachment.storageProvider === "google_drive" && attachment.driveFileId) {
        await deleteFile(attachment.url, { provider: "google_drive", fileId: attachment.driveFileId });
      } else if (attachment.attachmentType !== "drive_link") {
        await deleteFile(attachment.url);
      }
      await deleteTaskAttachment(taskId, attachment.id);
      toast.success("Dosya silindi");
      fetchTaskDetails();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Dosya silinirken hata oluştu");
    }
  };

  const handleApproveTask = async () => {
    if (!user?.id || !taskId) return;
    setProcessing(true);
    try {
      await approveTask(taskId, user.id);
      toast.success("Görev onaylandı ve kapatıldı");
      await fetchTaskDetails();
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Approve task error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Görev onaylanamadı");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTaskApproval = async () => {
    if (!user?.id || !taskId) return;
    setShowRejectApprovalDialog(true);
  };

  const confirmRejectTaskApproval = async () => {
    if (!user?.id || !taskId) return;
    if (!rejectionApprovalReason.trim()) {
      toast.error("Lütfen reddetme nedeni girin");
      return;
    }
    setProcessing(true);
    try {
      await rejectTaskApproval(taskId, user.id, rejectionApprovalReason.trim());
      toast.success("Görev onayı reddedildi ve görev panoya döndü");
      setShowRejectApprovalDialog(false);
      setRejectionApprovalReason("");
      await fetchTaskDetails();
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Reject task approval error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Görev onayı reddedilemedi");
    } finally {
      setProcessing(false);
    }
  };

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim() || !user) return;
    
    // Yetki kontrolü: Sadece atanan kullanıcılar ve adminler checklist ekleyebilir
    if (!canInteract) {
      const { showPermissionErrorToast } = await import("@/utils/toastHelpers");
      showPermissionErrorToast("create", "checklist");
      return;
    }
    
    setLoadingChecklists(true);
    try {
      const items = checklistItemInputs[newChecklistTitle]
        ? checklistItemInputs[newChecklistTitle].split('\n').filter(item => item.trim())
        : [];
      
      await createChecklist(taskId, newChecklistTitle.trim(), items.map(text => ({ text: text.trim() })));
      toast.success("Checklist eklendi");
      setNewChecklistTitle("");
      setChecklistItemInputs({});
      await fetchTaskDetails();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Add checklist error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Checklist eklenemedi");
    } finally {
      setLoadingChecklists(false);
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!user || !task) return;
    
    // Yetki kontrolü: Firestore'dan kontrol et
    try {
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
      const assignedUserIds = assignedUsers.map(u => u.id);
      const canEdit = await canEditChecklist(task, userProfile, assignedUserIds);
      if (!canEdit) {
        toast.error("Checklist silme yetkiniz yok. Sadece göreve atanan kullanıcılar veya yöneticiler checklist silebilir.");
        return;
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Error checking checklist permission:", error);
      }
      toast.error("Yetki kontrolü yapılamadı");
      return;
    }
    
    setLoadingChecklists(true);
    try {
      await deleteChecklist(taskId, checklistId, user.id);
      toast.success("Checklist silindi");
      await fetchTaskDetails();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Delete checklist error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Checklist silinemedi");
    } finally {
      setLoadingChecklists(false);
    }
  };

  const handleAddChecklistItem = async (checklistId: string) => {
    const itemText = checklistItemInputs[checklistId]?.trim();
    if (!itemText || !user || !task) return;
    
    // Yetki kontrolü: Firestore'dan kontrol et
    try {
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
      const assignedUserIds = assignedUsers.map(u => u.id);
      const canAdd = await canAddChecklist(task, userProfile, assignedUserIds);
      if (!canAdd) {
        toast.error("Checklist öğesi ekleme yetkiniz yok. Sadece göreve atanan kullanıcılar veya yöneticiler ekleyebilir.");
        return;
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Error checking checklist permission:", error);
      }
      toast.error("Yetki kontrolü yapılamadı");
      return;
    }
    
    setLoadingChecklists(true);
    try {
      await addChecklistItem(taskId, checklistId, itemText);
      toast.success("Checklist öğesi eklendi");
      setChecklistItemInputs(prev => ({ ...prev, [checklistId]: "" }));
      await fetchTaskDetails();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Add checklist item error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Checklist öğesi eklenemedi");
    } finally {
      setLoadingChecklists(false);
    }
  };

  const handleToggleChecklistItem = async (checklistId: string, itemId: string, completed: boolean) => {
    if (!taskId || !user?.id) return;
    
    // Yetki kontrolü: Sadece atanan kullanıcılar checkbox işaretleyebilir
    if (!canInteract) {
      const { showPermissionErrorToast } = await import("@/utils/toastHelpers");
      showPermissionErrorToast("interact", "checklist");
      return;
    }
    
    setLoadingChecklists(true);
    try {
      await updateChecklistItem(taskId, checklistId, itemId, completed, user.id);
      await fetchTaskDetails();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Toggle checklist item error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Checklist öğesi güncellenemedi");
    } finally {
      setLoadingChecklists(false);
    }
  };

  const handleDeleteChecklistItem = async (checklistId: string, itemId: string) => {
    if (!user || !task) return;
    
    // Yetki kontrolü: Firestore'dan kontrol et
    try {
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
      const assignedUserIds = assignedUsers.map(u => u.id);
      const canEdit = await canEditChecklist(task, userProfile, assignedUserIds);
      if (!canEdit) {
        toast.error("Checklist öğesi silme yetkiniz yok. Sadece göreve atanan kullanıcılar veya yöneticiler silebilir.");
        return;
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Error checking checklist permission:", error);
      }
      toast.error("Yetki kontrolü yapılamadı");
      return;
    }
    
    setLoadingChecklists(true);
    try {
      await deleteChecklistItem(taskId, checklistId, itemId);
      toast.success("Checklist öğesi silindi");
      await fetchTaskDetails();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Delete checklist item error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Checklist öğesi silinemedi");
    } finally {
      setLoadingChecklists(false);
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

  const handleUpdateDescription = async () => {
    setSaving(true);
    try {
      await updateTask(taskId, { description: descriptionValue || null });
      toast.success("Açıklama güncellendi");
      setTask({ ...task, description: descriptionValue });
      setEditingDescription(false);
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Update description error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Açıklama güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLabel = () => {
    if (!labelInput.trim()) return;
    const currentLabels = task?.labels || [];
    // Mevcut labels'ı normalize et (string ise object'e çevir)
    const normalizedLabels: Array<{ name: string; color?: string }> = currentLabels.map((l: string | { name: string; color?: string }) => {
      if (typeof l === 'string') return { name: l, color: "#475569" };
      return l;
    });
    const newLabel = { name: labelInput.trim(), color: labelColor };
    const updatedLabels: Array<{ name: string; color?: string }> = [...normalizedLabels, newLabel];
    handleUpdateLabels(updatedLabels);
    setLabelInput("");
  };

  const handleRemoveLabel = (labelName: string) => {
    const currentLabels = task?.labels || [];
    // Mevcut labels'ı normalize et (string ise object'e çevir)
    const normalizedLabels: Array<{ name: string; color?: string }> = currentLabels.map((l: string | { name: string; color?: string }) => {
      if (typeof l === 'string') return { name: l, color: "#475569" };
      return l;
    });
    const updatedLabels = normalizedLabels.filter((l) => l.name !== labelName);
    handleUpdateLabels(updatedLabels);
  };

  const handleUpdateLabels = async (labels: Array<{ name: string; color?: string }>) => {
    setSaving(true);
    try {
      // Labels'i string array'e çevir (Firestore için)
      const labelsArray = labels.map((l) => l.name);
      await updateTask(taskId, { labels: labelsArray });
      
      // Atanan kullanıcılara bildirim gönder
      if (assignedUsers.length > 0 && user) {
        await Promise.all(
          assignedUsers
            .filter(u => u.id !== user.id && u.status === "accepted")
            .map(u =>
              createNotification({
                userId: u.id,
                type: "task_updated",
                title: "Görev güncellendi",
                message: `${user.fullName || user.email || "Bir kullanıcı"} "${task?.title}" görevinin etiketlerini güncelledi.`,
                read: false,
                relatedId: taskId,
              })
            )
        );
      }
      
      toast.success("Etiketler güncellendi");
      setTask({ ...task, labels } as any);
      setEditingLabels(false);
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Update labels error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Etiketler güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignMembers = async () => {
    if (!user) return;
    
    // Alt yetki kontrolü - görev atama
    let hasPermission = false;
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
      const hasSubPermission = await canPerformSubPermission(userProfile, "tasks", "canAssign");
      // SISTEM_YETKILERI.md'ye göre: Super Admin ve Team Leader görev atayabilir
      hasPermission = hasSubPermission || isSuperAdmin || canUpdate;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Permission check error:", error);
      }
      // Hata durumunda yetki yok sayılır
      hasPermission = false;
    }
    
    // Yetki kontrolü başarısız ise işlemi durdur
    if (!hasPermission) {
      toast.error("Görev atama yetkiniz yok");
      return;
    }
    
    setSaving(true);
    try {
      const currentMemberIds = assignedUsers.map(u => u.id);
      const toAdd = selectedMembers.filter(id => !currentMemberIds.includes(id));
      const toRemove = currentMemberIds.filter(id => !selectedMembers.includes(id));

      // Remove members
      for (const userId of toRemove) {
        const assignment = assignedUsers.find(u => u.id === userId);
        if (assignment) {
          await deleteTaskAssignment(taskId, assignment.assignment_id, user.id);
        }
      }

      // Add members
      for (const userId of toAdd) {
        await assignTask(taskId, userId, user.id);
      }

      toast.success("Üyeler güncellendi");
      fetchTaskDetails();
      setEditingMembers(false);
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Assign members error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Üyeler güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDueDate = async () => {
    setSaving(true);
    try {
      const dueDate = dueDateValue ? Timestamp.fromDate(new Date(dueDateValue)) : null;
      await updateTask(taskId, { dueDate });
      
      // Activity log ekle
      if (user) {
        await addTaskActivity(
          taskId,
          user.id,
          "updated",
          `bu kartın bitiş tarihini ${dueDateValue ? format(new Date(dueDateValue), "d MMM yyyy HH:mm", { locale: tr }) : "kaldırdı"} olarak ayarladı`,
          { field: "dueDate", oldValue: task.dueDate, newValue: dueDateValue },
          user.fullName,
          user.email
        );
      }
      
      // Atanan kullanıcılara bildirim gönder
      if (assignedUsers.length > 0 && user) {
        await Promise.all(
          assignedUsers
            .filter(u => u.id !== user.id && u.status === "accepted")
            .map(u =>
              createNotification({
                userId: u.id,
                type: "task_updated",
                title: "Görev güncellendi",
                message: `${user.fullName || user.email || "Bir kullanıcı"} "${task?.title}" görevinin bitiş tarihini ${dueDateValue ? format(new Date(dueDateValue), "d MMM yyyy HH:mm", { locale: tr }) : "kaldırdı"}.`,
                read: false,
                relatedId: taskId,
              })
            )
        );
      }
      
      toast.success("Tarih güncellendi");
      setTask({
        ...task,
        dueDate: dueDateValue ? Timestamp.fromDate(new Date(`${dueDateValue}T00:00:00.000Z`)) : null,
      } as any);
      setEditingDueDate(false);
      fetchTaskDetails(); // Refresh activities
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Update due date error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Tarih güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentInput.trim() || !user) return;
    
    setSendingComment(true);
    try {
      await addTaskComment(
        taskId,
        user.id,
        commentInput.trim(),
        user.fullName,
        user.email
      );
      setCommentInput("");
      fetchTaskDetails(); // Refresh comments and activities
      toast.success("Yorum eklendi");
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Send comment error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Yorum eklenemedi");
    } finally {
      setSendingComment(false);
    }
  };

  const focusMembersSection = () => {
    setEditingMembers(true);
    scrollToSection(membersSectionRef);
  };

  const focusLabelsSection = () => {
    setEditingLabels(true);
    scrollToSection(labelsSectionRef);
  };

  const focusChecklistSection = () => {
    scrollToSection(checklistSectionRef);
  };

  const focusDateSection = () => {
    setEditingDueDate(true);
    scrollToSection(datesSectionRef);
  };

  const focusAttachmentSection = () => {
    scrollToSection(attachmentsSectionRef);
    setTimeout(() => fileInputRef.current?.click(), 180);
  };

  const handleLinkOrderClick = () => {
    toast.info("Sipariş bağlama özelliği üzerinde çalışıyoruz.");
  };

  const handleRefreshCard = () => {
    fetchTaskDetails();
    toast.success("Kart güncellendi");
  };

  const handleArchiveTask = async () => {
    if (!user?.id || !taskId) return;
    setProcessing(true);
    try {
      if (task?.isArchived) {
        await unarchiveTask(taskId, user.id);
        toast.success("Görev arşivden çıkarıldı");
      } else {
        await archiveTask(taskId, user.id);
        toast.success("Görev arşivlendi");
      }
      await fetchTaskDetails();
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Archive task error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Görev arşivlenemedi");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteTask = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskId || !user?.id) return;
    
    setDeletingTask(true);
    try {
      await deleteTask(taskId, user.id);
      toast.success("Görev başarıyla silindi");
      setShowDeleteDialog(false);
      onOpenChange(false);
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Delete task error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Görev silinemedi");
    } finally {
      setDeletingTask(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !user) {
      toast.error("Görev başlığı gereklidir");
      return;
    }

    setCreatingTask(true);
    try {
      // Gizli görev için proje kontrolü
      let finalProjectId = selectedProjectId || propProjectId || null;
      
      // Gizli projelere gizli olmayan görevlerin atanmasını engelle
      // Eğer proje gizliyse, otomatik olarak görevi de gizli yap
      let finalIsPrivate = isPrivate;
      if (finalProjectId) {
        const selectedProject = projects.find(p => p.id === finalProjectId);
        if (selectedProject?.isPrivate) {
          // Gizli projelere sadece gizli görevler atanabilir - otomatik olarak gizli yap
          if (!isPrivate) {
            finalIsPrivate = true;
            // Uyarı verme, otomatik olarak gizli yapıldı
          }
        }
      }
      
      // Gizli görevler için proje seçimi zorunlu ve sadece gizli projelere atanabilir
      if (finalIsPrivate) {
        if (!finalProjectId) {
          toast.error("Gizli görevler için bir gizli proje seçmelisiniz. Lütfen önce bir gizli proje oluşturun.");
          setCreatingTask(false);
          return;
        }
        // Gizli görevlerin gizli olmayan projelere atanmasını engelle
        const selectedProject = projects.find(p => p.id === finalProjectId);
        if (selectedProject && !selectedProject.isPrivate) {
          toast.error("Gizli görevler sadece gizli projelere atanabilir. Lütfen bir gizli proje seçin.");
          setCreatingTask(false);
          return;
        }
      }

      // Proje seçimi zorunlu (gizli görevler hariç)
      if (!finalProjectId || finalProjectId === "general") {
        if (!isPrivate) {
          toast.error("Lütfen bir proje seçin. Her görevin bir projesi olmalıdır.");
          setCreatingTask(false);
          return;
        }
      }

      // Yetki kontrolü: Görev oluşturma yetkisi var mı?
      if (!canCreate && !isSuperAdmin) {
        const departments = await getDepartments();
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
        const canCreateResult = await canCreateTask(userProfile, departments);
        if (!canCreateResult) {
          toast.error("Görev oluşturma yetkiniz yok. Sadece yöneticiler ve ekip liderleri görev oluşturabilir.");
          setCreatingTask(false);
          return;
        }
      }

      const labelNames = newTaskLabels.map((label) => label.name);
      const dueDateTimestamp = newTaskDueDate ? Timestamp.fromDate(new Date(newTaskDueDate)) : null;

      const task = await createTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || null,
        status: initialStatus,
        priority: Math.min(convertNewPriorityToOld(newTaskPriority), 5) as 1 | 2 | 3 | 4 | 5, // TaskService hala 1-5 kullanıyor
        dueDate: dueDateTimestamp,
        labels: labelNames.length > 0 ? labelNames : null,
        projectId: finalProjectId || null,
        isPrivate: finalIsPrivate,
        productionOrderId: null,
        productionProcessId: null,
        createdBy: user.id,
      });

      const taskId = task.id;

      // Assign members if any selected
      if (newTaskMembers.length > 0) {
        try {
          await Promise.all(newTaskMembers.map((userId) => assignTask(taskId, userId, user.id)));
        } catch (assignError: unknown) {
          if (import.meta.env.DEV) {
            console.error("Assignment error:", assignError);
          }
        }
      }

      // Create checklist if items exist
      if (newTaskChecklistItems.length > 0) {
        try {
          await createChecklist(taskId, "Checklist", newTaskChecklistItems);
        } catch (checklistError: unknown) {
          if (import.meta.env.DEV) {
            console.error("Checklist creation error:", checklistError);
          }
        }
      }

      toast.success("Görev oluşturuldu");
      
      // Formu temizle ve modal'ı kapat
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskMembers([]);
      setNewTaskChecklistItems([]);
      setNewChecklistItemText("");
      setNewTaskLabels([]);
      setNewTaskLabelInput("");
      setNewTaskLabelColor("#61BD4F");
      setNewTaskDueDate("");
      setNewTaskPriority(1); // Default: Normal (1)
      setSelectedProjectId(propProjectId || null);
      setIsPrivate(false);
      
      onUpdate?.();
      onOpenChange(false);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Create task error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Görev oluşturulamadı");
    } finally {
      setCreatingTask(false);
    }
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

  const actionButtons = useMemo(() => {
    const buttons = [
      {
        id: "members",
        title: "Üye Ekle",
        description: "Göreve kişi ata",
        icon: UserPlus,
        accent: "bg-[#E8F5FF] text-[#0B69C6]",
        action: focusMembersSection,
      },
      {
        id: "labels",
        title: "Etiketler",
        description: "Renklerle kategorize et",
        icon: Tag,
        accent: "bg-[#FFF5D9] text-[#D39B00]",
        action: focusLabelsSection,
      },
      {
        id: "checklist",
        title: "Checklist",
        description: "Adım adım ilerle",
        icon: ListChecks,
        accent: "bg-[#EBF8F2] text-[#1B7F5D]",
        action: focusChecklistSection,
      },
      {
        id: "dates",
        title: "Tarih",
        description: "Termin planla",
        icon: CalendarDays,
        accent: "bg-[#F5EBFF] text-[#6F2DBD]",
        action: focusDateSection,
      },
      {
        id: "attachments",
        title: "Ek",
        description: "Dosya paylaş",
        icon: Paperclip,
        accent: "bg-[#FFEDEA] text-[#C13828]",
        action: focusAttachmentSection,
      },
    ];

    // Görev havuzundan kaldır - Sadece görevi oluşturan kişi görebilir
    if (task?.isInPool === true && task?.createdBy === user?.id) {
      buttons.push({
        id: "remove-from-pool",
        title: "Havuzdan Kaldır",
        description: "Görevi havuzdan çıkar",
        icon: XCircle,
        accent: "bg-[#FFF4E6] text-[#D97706]",
        action: async () => {
          if (!task?.id) return;
          try {
            setProcessing(true);
            await removeTaskFromPool(task.id);
            toast.success("Görev havuzdan kaldırıldı");
            fetchTaskDetails();
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Havuzdan kaldırma hatası oluştu";
            toast.error(errorMessage);
          } finally {
            setProcessing(false);
          }
        },
      });
    }

    return buttons;
  }, [task?.isInPool, task?.createdBy, task?.id, user?.id, focusMembersSection, focusLabelsSection, focusChecklistSection, focusDateSection, focusAttachmentSection, removeTaskFromPool, fetchTaskDetails]);

  if (loading && taskId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle className="sr-only">Görev yükleniyor</DialogTitle>
          <DialogDescription className="sr-only">Görev detayları hazırlanıyor</DialogDescription>
          <DialogHeader className="sr-only">
            <h2>Görev yükleniyor</h2>
            <p>Görev detayları hazırlanıyor</p>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Yeni görev oluşturma modu - Personnel ve İzleyici için erişim yok
  if (!taskId) {
    // Personnel veya İzleyici ise modal'ı gösterme (useEffect zaten kapatıyor)
    if (isPersonnelOrViewer) {
      return null;
    }
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border"
          data-task-modal
        >
          <div className="flex flex-col h-full min-h-0">
            <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0">
              <DialogTitle className="text-[16px] sm:text-[18px] font-semibold text-foreground leading-tight">Yeni Görev Oluştur</DialogTitle>
              <DialogDescription className="sr-only">
                Yeni görev oluşturmak için formu doldurun
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0 flex flex-col">
              <div className="max-w-full mx-auto flex-1 overflow-y-auto overscroll-contain min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[11px] sm:text-xs font-bold text-[#172B4D] flex items-center gap-2 sm:gap-3">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-[#0079BF]" />
                    Görev Başlığı <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Örn: Yeni özellik geliştir..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="h-11 sm:h-12 bg-white border-2 border-[#DFE1E6] text-[#172B4D] text-[11px] sm:text-xs focus:border-[#0079BF] focus:ring-2 focus:ring-[#0079BF]/20"
                    disabled={creatingTask}
                    autoFocus
                  />
                </div>

                {/* Proje ve Gizlilik */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                   <div className="space-y-3">
                    <Label className="text-[11px] sm:text-xs font-bold text-[#172B4D] flex items-center gap-2 sm:gap-3">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 text-[#0079BF]" />
                      Proje <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={selectedProjectId || ""}
                      onValueChange={(value) => {
                        if (value === "__create_project__") {
                          navigate("/projects");
                          onOpenChange(false);
                          return;
                        }
                        setSelectedProjectId(value);
                        // Seçilen proje gizli ise görev de otomatik gizli olmalı
                        const selectedProject = projects.find(p => p.id === value);
                        if (selectedProject?.isPrivate) {
                          setIsPrivate(true);
                        }
                      }}
                      disabled={creatingTask}
                    >
                      <SelectTrigger className="h-11 sm:h-12 border-2 border-[#DFE1E6] bg-white">
                        <SelectValue placeholder="Proje seçiniz" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          // Eğer gizli görev seçildiyse veya gizli proje seçildiyse, sadece gizli projeleri göster
                          const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
                          let filteredProjects = projects;
                          
                          if (isPrivate) {
                            // Gizli görev seçildiyse, sadece gizli projeleri göster
                            filteredProjects = projects.filter(p => p.isPrivate);
                          } else if (selectedProject?.isPrivate) {
                            // Gizli proje seçildiyse, sadece gizli projeleri göster
                            filteredProjects = projects.filter(p => p.isPrivate);
                          }
                          
                          return filteredProjects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ));
                        })()}
                        <div className="border-t border-border mt-1 pt-1">
                          <SelectItem 
                            value="__create_project__" 
                            className="text-primary font-medium cursor-pointer"
                          >
                            <Plus className="h-4 w-4 mr-2 inline" />
                            Yeni Proje Ekle
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Gizlilik - Sadece görevi oluşturan kişi görebilir (yeni görev oluştururken herkes görebilir) */}
                  {(!taskId || task?.createdBy === user?.id) && (
                    <div className="space-y-3">
                      <Label className="text-[11px] sm:text-xs font-bold text-[#172B4D] flex items-center gap-2 sm:gap-3">
                        <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-[#0079BF]" />
                        Gizlilik
                      </Label>
                      <div className="flex items-center gap-3 h-12 px-4 border-2 border-[#DFE1E6] rounded-md bg-white">
                         <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="private-task"
                            checked={isPrivate}
                            disabled={creatingTask || (selectedProjectId && projects.find(p => p.id === selectedProjectId)?.isPrivate)}
                            onChange={(e) => {
                              // Gizli projede görev oluştururken checkbox disabled olduğu için bu fonksiyon çalışmayacak
                              // Ama yine de güvenlik için kontrol ekliyoruz
                              const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
                              
                              // Eğer proje gizli ise, checkbox zaten disabled olduğu için buraya gelmemeli
                              if (selectedProject?.isPrivate) {
                                return; // Gizli projede değişiklik yapılamaz
                              }
                              
                              setIsPrivate(e.target.checked);
                              
                              // Gizlilik seçildiğinde, eğer seçili proje gizli değilse proje seçimini sıfırla
                              if (e.target.checked && selectedProjectId && !selectedProject?.isPrivate) {
                                setSelectedProjectId(null);
                                // Projeleri yeniden yükle (sadece gizli projeleri göstermek için)
                                // useEffect ile otomatik yüklenecek
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <Label 
                            htmlFor="private-task" 
                            className={cn(
                              "text-sm font-medium text-gray-700 flex items-center gap-2",
                              selectedProjectId && projects.find(p => p.id === selectedProjectId)?.isPrivate 
                                ? "cursor-default" 
                                : "cursor-pointer"
                            )}
                          >
                            <Lock className="h-4 w-4 text-gray-500" />
                            Sadece atanan kişiler görebilir
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Açıklama */}
                <div className="space-y-3">
                  <Label className="text-[11px] sm:text-xs font-bold text-[#172B4D] flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-[#0079BF]" />
                    Açıklama
                  </Label>
                  <Textarea
                    placeholder="Görev hakkında detaylı bilgi ekleyin..."
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    rows={5}
                    disabled={creatingTask}
                    className="bg-white border-2 border-[#DFE1E6] text-[#172B4D] resize-none text-[11px] sm:text-xs focus:border-[#0079BF] focus:ring-2 focus:ring-[#0079BF]/20"
                  />
                </div>

                {/* Checklist */}
                <div className="space-y-4">
                  <Label className="text-[11px] sm:text-xs font-bold text-[#172B4D] flex items-center gap-3">
                    <ListChecks className="h-5 w-5 text-[#0079BF]" />
                    Kontrol Listesi
                  </Label>
                  {newTaskChecklistItems.length > 0 && (
                    <div className="space-y-3 bg-[#F4F5F7] rounded-xl p-5 border-2 border-[#DFE1E6]">
                      {newTaskChecklistItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 text-sm group p-3 rounded-lg hover:bg-white/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={(e) => {
                              const updated = [...newTaskChecklistItems];
                              updated[idx].completed = e.target.checked;
                              setNewTaskChecklistItems(updated);
                            }}
                            className="w-5 h-5 rounded border-2 border-[#DFE1E6] text-[#0079BF] cursor-pointer focus:ring-2 focus:ring-[#0079BF]/20"
                          />
                          <span className={cn("flex-1 text-[11px] sm:text-xs", item.completed ? "line-through text-[#5E6C84]" : "text-[#172B4D] font-medium")}>
                            {item.text}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewTaskChecklistItems(newTaskChecklistItems.filter((_, i) => i !== idx));
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[#5E6C84] hover:text-[#EB5A46] transition-opacity p-2 rounded-lg hover:bg-[#EB5A46]/10"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
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
                      disabled={creatingTask}
                      className="flex-1 h-12 border-2 border-[#DFE1E6] focus:border-[#0079BF] focus:ring-2 focus:ring-[#0079BF]/20"
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
                      disabled={creatingTask || !newChecklistItemText.trim()}
                      className="h-12 px-6 bg-[#0079BF] hover:bg-[#005A8B] text-white font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Kişi Ata */}
                <div className="space-y-4">
                  <Label className="text-[11px] sm:text-xs font-bold text-[#172B4D] flex items-center gap-3">
                    <UserPlus className="h-5 w-5 text-[#0079BF]" />
                    Kişi Ata
                  </Label>
                  <div className="border-2 border-[#DFE1E6] rounded-xl p-4 bg-white shadow-sm">
                    <UserMultiSelect
                      selectedUsers={newTaskMembers}
                      onSelectionChange={setNewTaskMembers}
                    />
                  </div>
                </div>

                {/* Etiketler */}
                <div className="space-y-4">
                  <Label className="text-[11px] sm:text-xs font-bold text-[#172B4D] flex items-center gap-3">
                    <Tag className="h-5 w-5 text-[#0079BF]" />
                    Etiketler
                  </Label>
                  {newTaskLabels.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {newTaskLabels.map((label, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] sm:text-xs font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                          style={{ backgroundColor: label.color }}
                          onClick={() => removeQuickLabel(label.name)}
                        >
                          <span>{label.name}</span>
                          <X className="h-3.5 w-3.5" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Input
                      value={newTaskLabelInput}
                      onChange={(e) => setNewTaskLabelInput(e.target.value)}
                      placeholder="Etiket adı girin..."
                      className="flex-1 h-12 border-2 border-[#DFE1E6] focus:border-[#0079BF] focus:ring-2 focus:ring-[#0079BF]/20"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddQuickLabel();
                        }
                      }}
                      disabled={creatingTask}
                    />
                    <Button
                      type="button"
                      onClick={handleAddQuickLabel}
                      size="sm"
                      disabled={!newTaskLabelInput.trim() || creatingTask}
                      className="h-12 px-6 bg-[#0079BF] hover:bg-[#005A8B] text-white font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      Ekle
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {LABEL_COLORS.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setNewTaskLabelColor(color.value)}
                        className={cn(
                          "w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 shadow-sm",
                          color.class,
                          newTaskLabelColor === color.value
                            ? "border-[#172B4D] scale-110 ring-2 ring-[#0079BF] ring-offset-2"
                            : "border-[#DFE1E6] hover:border-[#C1C7D0]"
                        )}
                        title={color.name}
                        disabled={creatingTask}
                      />
                    ))}
                  </div>
                </div>

                {/* Bitiş Tarihi */}
                <div className="space-y-3">
                  <Label className="text-[11px] sm:text-xs font-bold text-[#172B4D] flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-[#0079BF]" />
                    Bitiş Tarihi
                  </Label>
                  <Input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="h-12 border-2 border-[#DFE1E6] focus:border-[#0079BF] focus:ring-2 focus:ring-[#0079BF]/20"
                    disabled={creatingTask}
                  />
                </div>

                {/* Öncelik */}
                <div className="space-y-3">
                  <Label className="text-[11px] sm:text-xs font-bold text-[#172B4D] flex items-center gap-3">
                    <Tag className="h-5 w-5 text-[#0079BF]" />
                    Öncelik
                  </Label>
                  <Select
                    value={newTaskPriority.toString()}
                    onValueChange={(value) => setNewTaskPriority(Number(value) as PriorityLevel)}
                    disabled={creatingTask}
                  >
                    <SelectTrigger className="h-12 border-2 border-[#DFE1E6] focus:border-[#0079BF] focus:ring-2 focus:ring-[#0079BF]/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label} ({option.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Butonlar */}
                <div className="flex items-center gap-4 pt-6 border-t-2 border-[#DFE1E6]">
                  <Button
                    onClick={handleCreateTask}
                    disabled={creatingTask || !newTaskTitle.trim()}
                    className="bg-[#0079BF] hover:bg-[#005A8B] text-white flex-1 font-bold h-14 text-[11px] sm:text-xs shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    {creatingTask ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-3" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-3" />
                        Görev Oluştur
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={creatingTask}
                    className="h-14 px-8 border-2 border-[#DFE1E6] text-[#172B4D] hover:bg-[#F4F5F7] hover:border-[#0079BF] font-semibold transition-all"
                  >
                    İptal
                  </Button>
                </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Modal render kontrolü
  if (!task) {
    return null;
  }
  
  // Görüntüleme yetkisi kontrolü - görev yoksa veya görüntüleme yetkisi yoksa modal'ı kapat
  if (!canView) {
    toast.error("Bu görevi görüntüleme yetkiniz yok");
    onOpenChange(false);
    return null;
  }

  // Highlight cards için veri hazırla
  const highlightCards = [
    {
      label: "Atanan Kişiler",
      value: assignedUsers.length || 0,
      icon: UserPlus,
      helper: "Göreve atanan kullanıcı",
      accent: "from-blue-50/80 via-white to-white border-blue-100",
      tooltip: "Bu göreve atanan toplam kullanıcı sayısı",
    },
    {
      label: "Checklist",
      value: checklists.length || 0,
      icon: ListChecks,
      helper: "Kontrol listesi sayısı",
      accent: "from-indigo-50/80 via-white to-white border-indigo-100",
      tooltip: "Göreve eklenmiş kontrol listeleri",
    },
    {
      label: "Dosyalar",
      value: task?.attachments?.length || 0,
      icon: Paperclip,
      helper: "Eklenen dosya sayısı",
      accent: "from-slate-50/80 via-white to-white border-slate-100",
      tooltip: "Göreve eklenmiş toplam dosya sayısı",
    },
    {
      label: "Yorumlar",
      value: comments.length || 0,
      icon: MessageSquare,
      helper: "Yorum sayısı",
      accent: "from-emerald-50/80 via-white to-white border-emerald-100",
      tooltip: "Göreve eklenmiş toplam yorum sayısı",
    },
  ];

  // Quick meta chips
  const quickMetaChips = [
    task?.id && { label: "Görev ID", value: task.id.substring(0, 8) },
      task?.createdAt && { label: "Oluşturulma", value: formatDateSafe(task.createdAt) },
      task?.dueDate && { label: "Termin", value: formatDateSafe(task.dueDate) },
    task?.priority && { label: "Öncelik", value: task.priority.toString() },
  ].filter(Boolean) as { label: string; value: string }[];

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "pending":
        return "secondary";
      case "in_progress":
        return "default";
      case "completed":
        return "default";
      default:
        return "outline";
    }
  };

  console.log("🟢 TaskDetailModal: Dialog render ediliyor", {
    open,
    taskId,
    taskExists: !!task,
    canView,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border" 
          data-task-modal
        >
          {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
          <DialogTitle className="sr-only" id="task-detail-title">
            Görev Detayı - {task?.title || "Yeni Görev"}
          </DialogTitle>
          <DialogDescription className="sr-only" id="task-detail-description">
            Görev detayları ve bilgileri
          </DialogDescription>
          
          <div className="flex flex-col h-full min-h-0">
            <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                    <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <h2 className="text-[16px] sm:text-[18px] font-semibold text-foreground truncate leading-tight">
                    Görev Detayı - {task?.title || "Yeni Görev"}
                  </h2>
                  <p className="sr-only">
                    Görev detayları ve bilgileri
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0 relative z-10 pr-10 sm:pr-12">
                  {task?.approvalStatus === "pending" && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50 text-xs px-2 sm:px-3 py-1 relative z-10">
                      Onay Bekliyor
                    </Badge>
                  )}
                  {task && (
                    <Badge variant={getStatusVariant(task.status)} className="text-xs px-2 sm:px-3 py-1 relative z-10">
                      {(() => {
                        // Status label'ını gösterirken approvalStatus'u da kontrol et
                        const normalizedStatus = normalizeStatus(task.status);
                        if (normalizedStatus === "completed" && task?.approvalStatus === "approved") {
                          return "Onaylandı";
                        }
                        return getStatusLabel(task.status);
                      })()}
                    </Badge>
                  )}
                  {task?.priority && (
                    <Badge variant={task.priority >= 3 ? "destructive" : "secondary"} className="text-xs px-2 sm:px-3 py-1 relative z-10">
                      Öncelik {task.priority}
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>
            {quickMetaChips.length > 0 && (
              <div className="px-3 sm:px-6 py-2 sm:py-3 border-b bg-gray-50/50 flex flex-wrap items-center gap-2 flex-shrink-0">
                {quickMetaChips.map((chip) => (
                  <div
                    key={`${chip.label}-${chip.value}`}
                    className="flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    <span className="text-muted-foreground/70">{chip.label}:</span>
                    <span className="text-foreground">{chip.value}</span>
                  </div>
                ))}
              </div>
            )}
            
          <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0 flex flex-col">
            <div className="max-w-full mx-auto flex-1 overflow-y-auto overscroll-contain min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                <div className="space-y-6">
                    {/* SISTEM_YETKILERI.md'ye göre: Super Admin, Team Leader ve görevi oluşturan onaylayabilir */}
                    {task?.approvalStatus === "pending" && user && (task.createdBy === user.id || isSuperAdmin || canUpdate) && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-[11px] sm:text-xs font-semibold text-yellow-900">Görev Tamamlanma Onayı Bekliyor</h4>
                            <p className="text-[11px] sm:text-xs text-yellow-700">
                              Bu görev tamamlandı olarak işaretlendi ve onayınızı bekliyor.
                            </p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 sm:flex-none border-yellow-300 text-yellow-900 hover:bg-yellow-100"
                              onClick={handleRejectTaskApproval}
                              disabled={processing}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reddet
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 sm:flex-none bg-yellow-600 hover:bg-yellow-700 text-white border-none"
                              onClick={handleApproveTask}
                              disabled={processing}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Onayla
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Görev Havuzu Talepleri Yönetimi - Sadece görevi oluşturan kişi görebilir */}
                    {(() => {
                      const isInPool = task?.isInPool === true;
                      const poolRequests = task?.poolRequests || [];
                      const isTaskCreator = task?.createdBy === user?.id;
                      const hasPendingRequests = Array.isArray(poolRequests) && poolRequests.length > 0;
                      
                      return isInPool && isTaskCreator && hasPendingRequests;
                    })() && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-[11px] sm:text-xs font-semibold text-amber-900 flex items-center gap-2">
                              <UserPlus className="h-4 w-4" />
                              Görev Havuzu Talepleri
                            </h4>
                            <p className="text-[11px] sm:text-xs text-amber-700 mt-1">
                              Bu görev için {task?.poolRequests?.length || 0} talep var. Talepleri onaylayabilir veya reddedebilirsiniz.
                            </p>
                          </div>
                          <div className="space-y-2">
                            {task?.poolRequests?.map((requestingUserId: string) => {
                              const requestingUser = allUsers.find(u => u.id === requestingUserId);
                              const userName = requestingUser?.fullName || requestingUser?.displayName || requestingUser?.email?.split("@")[0] || "Bilinmeyen Kullanıcı";
                              
                              return (
                                <div key={requestingUserId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                                        {userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-[11px] sm:text-xs font-medium text-gray-900">{userName}</p>
                                      <p className="text-xs text-gray-500">Görevi talep etti</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-300 text-red-700 hover:bg-red-50"
                                      onClick={async () => {
                                        if (!user?.id || !task?.id) return;
                                        try {
                                          setProcessing(true);
                                          await rejectPoolRequest(task.id, requestingUserId);
                                          toast.success("Talep reddedildi");
                                          fetchTaskDetails();
                                        } catch (error: unknown) {
                                          const errorMessage = error instanceof Error ? error.message : "Reddetme hatası oluştu";
                                          toast.error(errorMessage);
                                        } finally {
                                          setProcessing(false);
                                        }
                                      }}
                                      disabled={processing}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Reddet
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                                      onClick={async () => {
                                        if (!user?.id || !task?.id) return;
                                        try {
                                          setProcessing(true);
                                          // Onayla ve havuzda tut (keepInPool: true) - diğer talepler de kalabilir
                                          await approvePoolRequest(task.id, requestingUserId, user.id, true);
                                          toast.success("Talep onaylandı");
                                          fetchTaskDetails();
                                        } catch (error: unknown) {
                                          const errorMessage = error instanceof Error ? error.message : "Onaylama hatası oluştu";
                                          toast.error(errorMessage);
                                        } finally {
                                          setProcessing(false);
                                        }
                                      }}
                                      disabled={processing}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Onayla
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Görev Havuzunda - Görevi Oluşturan Kişi İçin Havuzdan Kaldır Butonu */}
                    {(() => {
                      const isInPool = task?.isInPool === true;
                      const isTaskCreator = task?.createdBy === user?.id;
                      return isInPool && isTaskCreator;
                    })() && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-[11px] sm:text-xs font-semibold text-amber-900">Görev Havuzunda</h4>
                            <p className="text-[11px] sm:text-xs text-amber-700">
                              Bu görev görev havuzunda. İsterseniz görevi havuzdan kaldırabilirsiniz.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 sm:flex-none border-amber-300 text-amber-700 hover:bg-amber-100"
                            onClick={async () => {
                              if (!task?.id) return;
                              try {
                                setProcessing(true);
                                await removeTaskFromPool(task.id);
                                toast.success("Görev havuzdan kaldırıldı");
                                fetchTaskDetails();
                              } catch (error: unknown) {
                                const errorMessage = error instanceof Error ? error.message : "Havuzdan kaldırma hatası oluştu";
                                toast.error(errorMessage);
                              } finally {
                                setProcessing(false);
                              }
                            }}
                            disabled={processing}
                          >
                            {processing ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 mr-1" />
                            )}
                            Havuzdan Kaldır
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Görev Havuzu Talebi */}
                    {(() => {
                      const isInPool = task?.isInPool === true;
                      const poolRequests = task?.poolRequests || [];
                      const hasUserRequest = user?.id && Array.isArray(poolRequests) && poolRequests.includes(user.id);
                      const canRequest = isInPool && user?.id && !hasUserRequest && task?.createdBy !== user?.id; // Görevi oluşturan kişi talep edemez
                      
                      if (import.meta.env.DEV && task) {
                        console.log("🔍 Görev Havuzu Kontrolü:", {
                          taskId: task.id,
                          taskTitle: task.title,
                          isInPool: task.isInPool,
                          poolRequests: task.poolRequests,
                          userId: user?.id,
                          hasUserRequest,
                          canRequest,
                        });
                      }
                      
                      return canRequest;
                    })() && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-[11px] sm:text-xs font-semibold text-blue-900">Görev Havuzunda</h4>
                            <p className="text-[11px] sm:text-xs text-blue-700">
                              Bu görev görev havuzunda. Bu görevi talep edebilirsiniz.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white border-none"
                            onClick={async () => {
                              if (!user?.id || !task?.id) return;
                              try {
                                setProcessing(true);
                                await requestTaskFromPool(task.id, user.id);
                                toast.success("Görev talebi gönderildi");
                                fetchTaskDetails();
                              } catch (error: unknown) {
                                const errorMessage = error instanceof Error ? error.message : "Talep hatası oluştu";
                                toast.error(errorMessage);
                              } finally {
                                setProcessing(false);
                              }
                            }}
                            disabled={processing}
                          >
                            {processing ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <UserPlus className="h-4 w-4 mr-1" />
                            )}
                            Talep Et
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Görev Havuzu Talebi Bekleniyor - Sadece kullanıcı atanmamışsa göster */}
                    {(() => {
                      const isInPool = task?.isInPool === true;
                      const poolRequests = task?.poolRequests || [];
                      const hasUserRequest = user?.id && Array.isArray(poolRequests) && poolRequests.includes(user.id);
                      // Kullanıcının kendisi atanmış mı kontrol et
                      const hasAssignedUsers = Array.isArray(assignedUsers) && assignedUsers.length > 0;
                      const isUserAssigned = user?.id && hasAssignedUsers && assignedUsers.some((au) => au.id === user.id);
                      // "Talep Gönderildi" mesajını sadece kullanıcı atanmamışsa göster
                      return isInPool && user?.id && hasUserRequest && !isUserAssigned;
                    })() && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <div>
                            <h4 className="text-[11px] sm:text-xs font-semibold text-yellow-900">Talep Gönderildi</h4>
                            <p className="text-[11px] sm:text-xs text-yellow-700">
                              Bu görev için talep gönderdiniz. Onay bekleniyor.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 auto-rows-fr">
                      {highlightCards.map((card) => {
                        const Icon = card.icon;
                        return (
                          <Tooltip key={card.label} delayDuration={150}>
                            <TooltipTrigger asChild>
                              <div
                                className={`rounded-2xl border bg-gradient-to-br text-card-foreground p-4 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 h-full ${card.accent}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                                    <p className="text-2xl font-semibold mt-1 leading-tight">{card.value}</p>
                                  </div>
                                  <div className="rounded-full border p-2 bg-white/75 shadow-inner shrink-0">
                                    <Icon className="h-5 w-5 text-primary" />
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-3">{card.helper}</p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{card.tooltip}</TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>

                    {/* Status Timeline */}
                    <Card>
                      <CardHeader className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-[14px] sm:text-[15px] font-semibold">Görev Durumu</CardTitle>
                            <p className="text-[11px] sm:text-xs text-muted-foreground">
                              {(() => {
                                // Status'ü normalize et - "column_" prefix'ini kaldır
                                // task?.status'ü direkt normalize et, çünkü bu ham değer olabilir
                                const rawStatus = task?.status || currentStatus || "pending";
                                const normalizedCurrentStatus = normalizeStatus(rawStatus);
                                
                                // Eğer görev onaylandıysa
                                if (normalizedCurrentStatus === "completed" && task?.approvalStatus === "approved") {
                                  return "Görev onaylandı ve tamamlandı.";
                                }
                                // Eğer görev tamamlandı ve onaya gönderildiyse
                                if (normalizedCurrentStatus === "completed" && task?.approvalStatus === "pending") {
                                  return "Görev tamamlandı ve onay bekleniyor.";
                                }
                                // Eğer görev tamamlandı ama onaya gönderilmediyse
                                if (normalizedCurrentStatus === "completed") {
                                  return "Görev tamamlandı. Onaya göndermek için butona tıklayın.";
                                }
                                // Diğer durumlar için normal mesaj - getStatusLabel zaten normalize ediyor
                                // Eğer görev onaylandıysa, "Workflow tamamlandı" göster
                                if (normalizedCurrentStatus === "completed" && task?.approvalStatus === "approved") {
                                  return "Görev onaylandı ve tamamlandı. Workflow tamamlandı.";
                                }
                                
                                const nextStatus = getNextStatus();
                                if (nextStatus) {
                                  // getStatusLabel içinde normalize ediliyor, ham değer gönderebiliriz
                                  // rawStatus'ü string'e çevir ve getStatusLabel'a gönder
                                  const statusLabel = getStatusLabel(String(rawStatus || "pending"));
                                  return `${statusLabel} aşamasındasınız. Sıradaki adım: ${nextStatus.label}`;
                                }
                                return "Workflow tamamlandı.";
                              })()}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            Son güncelleyen: {(() => {
                              // Önce updatedBy kontrol et (her güncellemede güncellenir), yoksa statusUpdatedBy, yoksa mevcut kullanıcı
                              const lastEditorId = (task as any)?.updatedBy || (task as any)?.statusUpdatedBy;
                              return lastEditorId 
                                ? (usersMap[lastEditorId] || lastEditorId)
                                : (user?.fullName || "-");
                            })()}
                            <br />
                            <span className="text-[11px]">
                              {(task as any)?.statusUpdatedAt ? formatDateSafe((task as any).statusUpdatedAt as Timestamp | Date | string | null) : ""}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      <div className="space-y-4">
                        {/* Status Timeline */}
                        <div>
                          <div className="flex items-center justify-between overflow-x-auto overflow-y-visible pt-2 pb-4">
                            {taskStatusWorkflow.map((statusItem, index) => {
                            const Icon = statusItem.icon;
                            const currentIndex = getCurrentStatusIndex();
                            const isActive = index === currentIndex;
                            const isCompleted = index < currentIndex;
                            // Sadece görev üyesi (rejected hariç) veya oluşturan tüm eski adımlara geri dönebilir (onay bekleyen görevler hariç)
                            // "approved" durumuna tıklanırsa "completed" durumuna geri alınır
                            // Görev üyesi kontrolü
                            const isInTaskAssignedUsers = Array.isArray(task?.assignedUsers) && task.assignedUsers.includes(user?.id || "");
                            const isAssignedInList = Array.isArray(assignedUsers) && assignedUsers.some(u => {
                              const matches = u.id === user?.id;
                              const notRejected = u.status !== "rejected";
                              return matches && notRejected;
                            });
                            const isAssignedViaMyAssignment = myAssignment && myAssignment.status !== "rejected";
                            const isCreator = task?.createdBy === user?.id;
                            const isAssigned = isInTaskAssignedUsers || isAssignedInList || !!isAssignedViaMyAssignment;
                            const hasPermission = isAssigned || isCreator;
                            const canRevert = hasPermission && index < currentIndex && 
                                              task?.approvalStatus !== "pending";
                            
                            return (
                              <div key={statusItem.value} className="flex items-center flex-1 min-w-0">
                                <div className="flex flex-col items-center flex-1 min-w-0">
                                  <div
                                    onClick={canRevert ? () => handleRevertStatus(statusItem.value) : undefined}
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
                                  {/* Aşama geçmişi - bu aşamaya geçiş tarihleri */}
                                  {task?.statusHistory && (() => {
                                    const statusHistory = task.statusHistory?.filter((entry) => entry.status === statusItem.value) || [];
                                    if (statusHistory.length === 0) return null;
                                    
                                    // Tarihe göre sırala (en yeni en üstte)
                                    const sortedHistory = [...statusHistory].sort((a, b) => {
                                      const dateA = a.changedAt?.toDate ? a.changedAt.toDate() : (a.changedAt?.seconds ? new Date(a.changedAt.seconds * 1000) : new Date(0));
                                      const dateB = b.changedAt?.toDate ? b.changedAt.toDate() : (b.changedAt?.seconds ? new Date(b.changedAt.seconds * 1000) : new Date(0));
                                      return dateB.getTime() - dateA.getTime();
                                    });
                                    
                                    return (
                                      <div className="mt-1 space-y-0.5">
                                        {sortedHistory.map((entry, historyIndex: number) => {
                                          let changedAt: Date | null = null;
                                          
                                          // Timestamp tipini kontrol et
                                          if (entry.changedAt) {
                                            if (entry.changedAt.toDate && typeof entry.changedAt.toDate === 'function') {
                                              changedAt = entry.changedAt.toDate();
                                            } else if (entry.changedAt.seconds) {
                                              changedAt = new Date(entry.changedAt.seconds * 1000);
                                            } else if (entry.changedAt instanceof Date) {
                                              changedAt = entry.changedAt;
                                            } else if (typeof entry.changedAt === 'string' || typeof entry.changedAt === 'number') {
                                              changedAt = new Date(entry.changedAt);
                                            }
                                          }
                                          
                                          if (!changedAt || isNaN(changedAt.getTime())) return null;
                                          
                                          return (
                                            <p 
                                              key={historyIndex}
                                              className="text-[10px] text-muted-foreground text-center leading-tight"
                                              title={format(changedAt, "dd MMMM yyyy, HH:mm", { locale: tr })}
                                            >
                                              {format(changedAt, "dd.MM.yyyy", { locale: tr })}
                                              <br />
                                              {format(changedAt, "HH:mm", { locale: tr })}
                                            </p>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
                                </div>
                                {index < taskStatusWorkflow.length - 1 && (
                                  <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                                )}
                              </div>
                            );
                          })}
                          </div>
                        </div>
                        
                        {/* İlerleme Butonu - Timeline'dan sonra, aynı Card içinde */}
                        <div className="pt-4 mt-4">
                          {/* TEST: Bu div görünüyor mu? */}
                          <div className="p-2 mb-2 bg-green-200 border-2 border-green-500">
                            <p className="text-xs font-bold text-green-700">TEST: İlerleme butonu div'i render edildi!</p>
                          </div>
                          <StatusProgressButton 
                            task={task}
                            user={user}
                            loading={loading}
                            currentStatus={currentStatus}
                            myAssignment={myAssignment}
                            assignedUsers={assignedUsers}
                            isSuperAdmin={isSuperAdmin}
                            canUpdate={canUpdate}
                            updatingStatus={updatingStatus}
                            onStatusChange={handleStatusChange}
                            onRequestApproval={handleRequestApproval}
                            getNextStatus={getNextStatus}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* İki kolonlu grid: Açıklama ve Etiketler */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Açıklama */}
                    <Card ref={descriptionSectionRef}>
                      <CardHeader className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-[14px] sm:text-[15px] font-semibold">Açıklama</CardTitle>
                            <p className="text-[11px] sm:text-xs text-muted-foreground">
                              Görev detayları ve notlar
                            </p>
                          </div>
                          {!editingDescription && canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingDescription(true)}
                              className="w-full sm:w-auto"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Düzenle
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {editingDescription ? (
                          <div className="space-y-3">
                            <Textarea
                              value={descriptionValue}
                              onChange={(e) => setDescriptionValue(e.target.value)}
                              placeholder="Açıklama ekleyin..."
                              rows={6}
                              className="resize-none"
                            />
                            <div className="flex gap-3">
                              <Button
                                size="sm"
                                onClick={handleUpdateDescription}
                                disabled={saving}
                                className="flex-1 sm:flex-none"
                              >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingDescription(false);
                                  setDescriptionValue(task.description || "");
                                }}
                              >
                                İptal
                              </Button>
                            </div>
                          </div>
                        ) : task.description ? (
                          <p className="text-[11px] sm:text-xs whitespace-pre-wrap leading-relaxed">
                            {task.description}
                          </p>
                        ) : (
                          <div className="text-[11px] sm:text-xs text-muted-foreground border border-dashed rounded-lg p-6 text-center bg-muted/30">
                            Henüz açıklama eklenmemiş.
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Etiketler */}
                    <Card>
                        <CardHeader className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                Etiketler
                              </CardTitle>
                              <p className="text-[11px] sm:text-xs text-muted-foreground">
                                Görevi kategorize etmek için etiketler
                              </p>
                            </div>
                            {!editingLabels && canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingLabels(true)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Düzenle
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div ref={labelsSectionRef}>
                            {editingLabels ? (
                              <div className="space-y-4">
                                <div className="flex flex-wrap gap-2.5 mb-4">
                                  {task.labels && task.labels.length > 0 ? (
                                    task.labels?.map((label: string | { name: string; color?: string }, idx: number) => {
                                      const labelName = typeof label === "string" ? label : label.name;
                                      const labelColor = typeof label === "string" ? "#475569" : (label.color || "#475569");
                                      return (
                                      <div
                                        key={`${labelName}-${idx}`}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
                                        style={{ backgroundColor: labelColor }}
                                        onClick={() => handleRemoveLabel(labelName)}
                                      >
                                        <span>{labelName}</span>
                                        <X className="h-3 w-3" />
                                      </div>
                                    );
                                    })
                                  ) : (
                                    <p className="text-[11px] sm:text-xs text-[#5E6C84]">Etiket bulunmuyor.</p>
                                  )}
                                </div>
                                <div className="space-y-3">
                                  <div className="flex gap-3">
                                    <Input
                                      value={labelInput}
                                      onChange={(e) => setLabelInput(e.target.value)}
                                      placeholder="Etiket adı girin..."
                                      className="flex-1 text-[11px] sm:text-xs bg-white border-[#DFE1E6] text-[#172B4D] h-10"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleAddLabel();
                                        }
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      onClick={handleAddLabel}
                                      size="sm"
                                      disabled={!labelInput.trim() || saving}
                                      className="bg-[#0079BF] hover:bg-[#005A8B] text-white font-medium h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Ekle
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {LABEL_COLORS.map((color) => (
                                      <button
                                        key={color.name}
                                        onClick={() => setLabelColor(color.value)}
                                        className={cn(
                                          "w-8 h-8 rounded border-2 transition-all hover:scale-110",
                                          color.class,
                                          labelColor === color.value
                                            ? "border-[#172B4D] scale-110 ring-2 ring-[#0079BF]"
                                            : "border-[#DFE1E6] hover:border-[#C1C7D0]"
                                        )}
                                        title={color.name}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingLabels(false);
                                      setLabelInput("");
                                    }}
                                    className="border-[#DFE1E6] text-[#172B4D] hover:bg-[#F4F5F7] font-medium"
                                  >
                                    Kapat
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2.5">
                                {task.labels && task.labels.length > 0 ? (
                                  task.labels.map((label: string | { name: string; color?: string }, idx: number) => {
                                    const labelName = typeof label === "string" ? label : label.name;
                                    const labelColor = typeof label === "string" ? "#475569" : (label.color || "#475569");
                                    return (
                                    <span
                                      key={`${labelName}-${idx}`}
                                      className="px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow-sm"
                                      style={{ backgroundColor: labelColor }}
                                    >
                                      {labelName}
                                    </span>
                                  );
                                  })
                                ) : (
                                  <p className="text-[11px] sm:text-xs text-muted-foreground italic">Etiket bulunmuyor.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                  <Card ref={attachmentsSectionRef}>
                    <CardHeader className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            Ekler
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {task.attachments && task.attachments.length > 0 ? (
                        task.attachments.map((attachment: TaskAttachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between rounded-xl border border-[#DFE1E6] bg-[#F4F5F7] px-4 py-3 gap-4 hover:bg-[#EBECF0] transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                              <p className="text-[11px] sm:text-xs font-medium text-[#172B4D] truncate">{attachment.name}</p>
                                {(attachment.attachmentType === "drive_link" ||
                                  attachment.storageProvider === "google_drive") && (
                                  <Badge variant="outline" className="text-xs">
                                    <Link2 className="h-3 w-3 mr-1" />
                                    Drive
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-[#5E6C84]">
                                {attachment.uploadedAt
                                  ? format(attachment.uploadedAt instanceof Timestamp ? attachment.uploadedAt.toDate() : new Date(attachment.uploadedAt), "dd MMM yyyy, HH:mm", { locale: tr })
                                  : ""}
                                {attachment.size && attachment.size > 0 && ` • ${(attachment.size / 1024).toFixed(1)} KB`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={attachment.driveLink || attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={
                                  attachment.storageProvider === "google_drive" || attachment.attachmentType === "drive_link"
                                    ? undefined
                                    : attachment.name
                                }
                              >
                                <Button size="sm" variant="secondary" className="bg-white border-[#DFE1E6] text-[#172B4D] hover:bg-[#F4F5F7] font-medium">
                                  {attachment.storageProvider === "google_drive" || attachment.attachmentType === "drive_link"
                                    ? "Aç"
                                    : "İndir"}
                                </Button>
                              </a>
                              {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[#EB5A46] hover:text-[#C9372C] hover:bg-[#EB5A46]/10"
                                onClick={() => handleDeleteAttachment(attachment)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                          <div className="text-center py-8 text-muted-foreground text-[11px] sm:text-xs rounded-lg border border-dashed bg-muted/30">
                            <Paperclip className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p>Henüz dosya eklenmemiş</p>
                          </div>
                        )}
                    </CardContent>
                  </Card>

                    {/* Checklists */}
                    <Card>
                      <CardHeader className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                              <ListChecks className="h-4 w-4" />
                              Checklistler
                            </CardTitle>
                            <p className="text-[11px] sm:text-xs text-muted-foreground">
                              Görev için kontrol listeleri
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div ref={checklistSectionRef} className="space-y-4">
                          {canInteract && (
                            <div className="flex gap-3 flex-1 sm:flex-none">
                        <Input
                          value={newChecklistTitle}
                          onChange={(e) => setNewChecklistTitle(e.target.value)}
                          placeholder="Yeni checklist başlığı"
                          className="flex-1 bg-white border-[#DFE1E6] text-[#172B4D] h-10"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newChecklistTitle.trim()) {
                              handleAddChecklist();
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={handleAddChecklist}
                          disabled={!newChecklistTitle.trim()}
                          className="gap-1 bg-[#0079BF] hover:bg-[#005A8B] text-white font-medium h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-4 w-4" />
                          Ekle
                        </Button>
                      </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      {(task as any).checklists && (task as any).checklists.length > 0 ? (
                        (task as any).checklists?.map((checklist: Checklist) => {
                          const items = (checklist as any).items || [];
                          const completedItems = items.filter((item: any) => item.completed).length;
                          const totalItems = items.length;
                          return (
                          <div key={checklist.id} className="border border-[#DFE1E6] rounded-xl p-5 space-y-4 bg-[#F4F5F7] shadow-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-[11px] sm:text-xs text-[#172B4D]">{(checklist as any).title || "Checklist"}</p>
                                <p className="text-xs text-[#5E6C84]">
                                  {completedItems}/{totalItems} tamamlandı
                                </p>
                                {totalItems > 0 ? (
                                  <Progress
                                    value={
                                      totalItems > 0
                                        ? (completedItems / totalItems) * 100
                                        : 0
                                    }
                                    className="h-2 mt-2"
                                  />
                                ) : null}
                              </div>
                              {canInteract && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-[#5E6C84] hover:text-[#172B4D] hover:bg-white"
                                onClick={() => handleDeleteChecklist(checklist.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              )}
                            </div>
                            <div className="space-y-2.5">
                              {items && items.length > 0 ? (
                                items?.map((item: { id: string; text: string; completed: boolean; createdAt?: Timestamp; completedAt?: Timestamp | null }) => (
                                  <div key={item.id} className="flex items-center gap-3 text-[11px] sm:text-xs p-2.5 rounded-lg hover:bg-white/50 transition-colors">
                                    <Checkbox
                                      checked={!!item.completed}
                                      onCheckedChange={(checked) => handleToggleChecklistItem(checklist.id, item.id, checked === true)}
                                      disabled={!canInteract}
                                      className="h-4 w-4 cursor-pointer"
                                    />
                                    <span className={cn("flex-1", item.completed ? "line-through text-[#5E6C84]" : "text-[#172B4D]")}>
                                      {item.text}
                                    </span>
                                    {canInteract && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-[#5E6C84] hover:text-red-600 hover:bg-red-50"
                                      onClick={() => handleDeleteChecklistItem(checklist.id, item.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-[#5E6C84] italic py-2">Henüz öğe yok.</p>
                              )}
                            </div>
                            {canInteract && (
                            <div className="flex gap-3 pt-2 border-t border-[#DFE1E6]">
                              <Input
                                value={checklistItemInputs[checklist.id] || ""}
                                onChange={(e) =>
                                  setChecklistItemInputs((prev) => ({ ...prev, [checklist.id]: e.target.value }))
                                }
                                placeholder="Öğe ekle"
                                className="flex-1 bg-white border-[#DFE1E6] text-[#172B4D] h-10"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && checklistItemInputs[checklist.id]?.trim()) {
                                    handleAddChecklistItem(checklist.id);
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleAddChecklistItem(checklist.id)}
                                disabled={!checklistItemInputs[checklist.id]?.trim()}
                                className="bg-white border-[#DFE1E6] text-[#172B4D] hover:bg-[#F4F5F7] font-medium h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Ekle
                              </Button>
                            </div>
                            )}
                          </div>
                        );
                      })
                      ) : (
                        <div className="text-center py-8 text-[#5E6C84] text-sm rounded-xl border border-dashed border-[#DFE1E6] bg-[#F4F5F7]">
                          <ListChecks className="h-8 w-8 mx-auto mb-2 text-[#A5ADBA]" />
                          <p>Herhangi bir checklist bulunmuyor</p>
                        </div>
                      )}
                    </div>
                    </CardContent>
                  </Card>

                  {myAssignment && myAssignment.status === "pending" && (
                    <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 space-y-4 shadow-sm">
                      <div className="font-semibold text-blue-700 text-[11px] sm:text-xs">Size Atanan Görev</div>
                      <p className="text-[11px] sm:text-xs text-[#172B4D] leading-relaxed">
                        Bu görev size atanmış. Lütfen kabul edin veya reddedin.
                      </p>
                      <div className="flex gap-3 flex-wrap">
                        <Button onClick={handleAcceptTask} disabled={processing} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium h-11 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                          <Check className="h-4 w-4 mr-2" />
                          {processing ? "İşleniyor..." : "Kabul Et"}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setShowRejectDialog(true)}
                          disabled={processing}
                          className="flex-1 font-medium h-11 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reddet
                        </Button>
                      </div>
                    </div>
                  )}

                  {myAssignment && myAssignment.status === "rejected" && myAssignment.rejection_reason && (
                    <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-6 space-y-3 shadow-sm">
                      <div className="font-semibold text-red-700 text-[11px] sm:text-xs">Görev Reddedildi</div>
                      <p className="text-[11px] sm:text-xs text-[#172B4D] leading-relaxed">
                        <strong>Reddetme Sebebi:</strong> {myAssignment.rejection_reason}
                      </p>
                    </div>
                  )}

                  {/* İki kolonlu grid: Görevdeki Kişiler ve Detaylar */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Görevdeki Kişiler */}
                    <Card ref={membersSectionRef}>
                      <CardHeader className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-[14px] sm:text-[15px] font-semibold">Görevdeki Kişiler</CardTitle>
                            <p className="text-[11px] sm:text-xs text-muted-foreground">
                              Atanan kullanıcılar ve durumları
                            </p>
                          </div>
                          {!editingMembers && canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingMembers(true)}
                              className="w-full sm:w-auto"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Düzenle
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                    <CardContent className="space-y-4">
                    {editingMembers ? (
                      <div className="space-y-4">
                        <UserMultiSelect
                          selectedUsers={selectedMembers}
                          onSelectionChange={setSelectedMembers}
                        />
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            onClick={handleAssignMembers}
                            disabled={saving}
                            className="bg-[#0079BF] hover:bg-[#005A8B] text-white font-medium h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMembers(false);
                              setSelectedMembers(assignedUsers.map(u => u.id));
                            }}
                            className="border-[#DFE1E6] text-[#172B4D] hover:bg-[#F4F5F7] font-medium h-10 px-4"
                          >
                            İptal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assignedUsers.map((assignedUser) => (
                          <div
                            key={assignedUser.id}
                            className="flex items-center gap-4 p-4 rounded-xl border border-[#DFE1E6] bg-[#F4F5F7] hover:bg-[#EBECF0] transition-colors shadow-sm"
                          >
                            <Avatar>
                              <AvatarFallback className="bg-white text-[#172B4D]">{getInitials(assignedUser.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium text-[#172B4D]">{assignedUser.full_name}</div>
                              <div className="text-[10px] sm:text-[11px] text-[#5E6C84]">{assignedUser.email}</div>
                              {assignedUser.rejection_reason && (
                                <div className="text-xs text-red-600 mt-1">
                                  Reddetme sebebi: {assignedUser.rejection_reason}
                                </div>
                              )}
                            </div>
                            {assignedUser.status === "accepted" && assignedUser.completed_at && (
                              <Badge variant="default" className="bg-emerald-500 text-white font-medium">
                                Tamamlandı
                              </Badge>
                            )}
                            {assignedUser.status === "accepted" && !assignedUser.completed_at && (
                              <Badge variant="secondary" className="bg-[#EBECF0] text-[#172B4D] font-medium">
                                Kabul Edildi
                              </Badge>
                            )}
                            {assignedUser.status === "rejected" && (
                              <div className="flex items-center gap-2">
                                <Badge variant="destructive" className="font-medium">Reddedildi</Badge>
                                {assignedUser.assigned_by === user?.id && (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-7 text-xs"
                                      onClick={async () => {
                                        if (!taskId || !assignedUser.assignment_id) return;
                                        setProcessing(true);
                                        try {
                                          await approveTaskRejection(taskId, assignedUser.assignment_id);
                                          toast.success("Görev reddi onaylandı");
                                          await fetchTaskDetails();
                                          onUpdate?.();
                                        } catch (error: unknown) {
                                          const errorMessage = error instanceof Error ? error.message : String(error);
                                          toast.error(errorMessage || "Red onaylanamadı");
                                        } finally {
                                          setProcessing(false);
                                        }
                                      }}
                                      disabled={processing}
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Reddi Kabul Et
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => {
                                        setSelectedRejectionAssignment(assignedUser);
                                        setShowRejectRejectionDialog(true);
                                      }}
                                      disabled={processing}
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Reddi Reddet
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                            {assignedUser.status === "pending" && (
                              <Badge variant="outline" className="text-[#172B4D] border-[#DFE1E6] font-medium">
                                Bekliyor
                              </Badge>
                            )}
                          </div>
                        ))}
                        {assignedUsers.length === 0 && (
                          <div className="text-center py-8 text-[#5E6C84] text-[11px] sm:text-xs rounded-xl border border-dashed border-[#DFE1E6] bg-[#F4F5F7]">
                            <User className="h-8 w-8 mx-auto mb-2 text-[#A5ADBA]" />
                            <p>Henüz kimse atanmadı</p>
                          </div>
                        )}
                      </div>
                    )}
                    </CardContent>
                  </Card>

                  {/* Detaylar */}
                  <Card ref={datesSectionRef}>
                    <CardHeader className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-[14px] sm:text-[15px] font-semibold">Detaylar</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Tarih ve durum bilgileri
                          </p>
                        </div>
                        {!editingDueDate && canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingDueDate(true)}
                            className="text-[#5E6C84] hover:text-[#172B4D] h-6 px-2 text-xs"
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Düzenle
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-lg border bg-muted/30 px-3 py-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Oluşturulma</p>
                          <p className="text-[11px] sm:text-xs font-medium mt-1">
                            {task.createdAt ? format(task.createdAt instanceof Timestamp ? task.createdAt.toDate() : new Date(task.createdAt), "dd MMM yyyy HH:mm", { locale: tr }) : "-"}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/30 px-3 py-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Bitiş</p>
                          {editingDueDate ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="date"
                                value={dueDateValue}
                                onChange={(e) => setDueDateValue(e.target.value)}
                                className="flex-1 h-8 text-xs"
                              />
                              <Button
                                size="sm"
                                onClick={handleUpdateDueDate}
                                disabled={saving}
                                className="h-8 px-2"
                              >
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "✓"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingDueDate(false);
                                  setDueDateValue(task.dueDate ? (task.dueDate instanceof Timestamp ? task.dueDate.toDate().toISOString().split("T")[0] : new Date(task.dueDate).toISOString().split("T")[0]) : "");
                                }}
                                className="h-8 px-2"
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <p className="text-[11px] sm:text-xs font-medium mt-1">
                              {task.dueDate ? format(task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate), "dd MMM yyyy HH:mm", { locale: tr }) : "-"}
                            </p>
                          )}
                        </div>
                        <div className="rounded-lg border bg-muted/30 px-3 py-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Durum</p>
                          <p className="text-[11px] sm:text-xs font-medium mt-1">
                            {(() => {
                              // Status label'ını gösterirken approvalStatus'u da kontrol et
                              const normalizedStatus = normalizeStatus(task.status);
                              if (normalizedStatus === "completed" && task?.approvalStatus === "approved") {
                                return "Onaylandı";
                              }
                              return getStatusLabel(task.status);
                            })()}
                          </p>
                        </div>
                        {/* Gizlilik - Sadece görevi oluşturan kişi görebilir */}
                        {task?.createdBy === user?.id && (
                          <div className="rounded-lg border bg-muted/30 px-3 py-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Gizlilik</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="task-privacy-edit"
                                checked={task.isPrivate || false}
                                onChange={(e) => handleUpdatePrivacy(e.target.checked)}
                                disabled={saving}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <Label 
                                htmlFor="task-privacy-edit" 
                                className="text-[11px] sm:text-xs font-medium text-gray-700 flex items-center gap-2 cursor-pointer"
                              >
                                <Lock className="h-3.5 w-3.5 text-gray-500" />
                                Gizli görev
                              </Label>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Reddin Notu - Görev alan kişilere göster */}
                      {task?.approvalStatus === "rejected" && task?.rejectionReason && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Red Nedeni</p>
                                <p className="text-[11px] sm:text-xs text-red-800 whitespace-pre-wrap font-medium">{task.rejectionReason}</p>
                                {task.rejectedBy && usersMap[task.rejectedBy] && (
                                  <p className="text-xs text-red-700 mt-2">
                                    Reddeden: {usersMap[task.rejectedBy]}
                                    {task.rejectedAt && (
                                      <span className="ml-2">
                                        • {formatDateSafe(task.rejectedAt as Timestamp | Date | string | null)}
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </div>

                  {/* Eylemler */}
                  {canEdit && (
                    <Card>
                      <CardHeader className="space-y-1">
                            <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                          <MoreVertical className="h-4 w-4" />
                          Eylemler
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {actionButtons.map((action) => {
                            const Icon = action.icon;
                            return (
                              <button
                                key={action.id}
                                onClick={action.action}
                                className="flex items-center gap-3 rounded-xl border border-[#E1E4EA] bg-white px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#C1C7D0]"
                              >
                                <div className={cn("h-10 w-10 rounded-xl border border-transparent flex items-center justify-center shadow-sm", action.accent)}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] sm:text-xs font-semibold text-[#172B4D] mb-0.5">{action.title}</p>
                                  <p className="text-xs text-[#5E6C84] truncate">{action.description}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-[#A5ADBA] flex-shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* İlişkiler */}
                  <Card>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-[14px] sm:text-[15px] flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        İlişkiler
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Select
                        value={task.productionOrderId ? "linked" : "none"}
                        onValueChange={(value) => {
                          if (value === "link") {
                            handleLinkOrderClick();
                          }
                          if (value === "linked") {
                            handleOpenOrderDetail();
                          }
                        }}
                      >
                        <SelectTrigger className="border-2 border-[#E1E4EA] text-[#172B4D] bg-white h-12 shadow-sm hover:border-[#0079BF] transition-colors">
                          <SelectValue>
                            {task.productionOrderId ? `Sipariş #${(task as any).productionOrderNumber || task.productionOrderId}` : "Bağlı sipariş yok"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Bağlı sipariş yok</SelectItem>
                          {task.productionOrderId && (
                            <SelectItem value="linked">Sipariş #{(task as any).productionOrderNumber || task.productionOrderId}</SelectItem>
                          )}
                          <SelectItem value="link">Sipariş bağla</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-3">
                        <Button className="flex-1 bg-[#0079BF] hover:bg-[#005A8B] text-white h-12 font-semibold shadow-md hover:shadow-lg transition-all text-[11px] sm:text-xs" onClick={handleLinkOrderClick}>
                          Bağla
                        </Button>
                        <Button variant="outline" className="flex-1 border-2 border-[#E1E4EA] text-[#172B4D] hover:bg-[#F4F5F7] hover:border-[#0079BF] h-12 font-semibold transition-all text-[11px] sm:text-xs" onClick={handleRefreshCard}>
                          Yenile
                        </Button>
                      </div>
                      {task.productionOrderId && (
                        <div className="mt-4 rounded-xl border border-[#DFE1E6] bg-gradient-to-br from-[#F4F5F7] to-white p-4 space-y-3 shadow-sm">
                          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-[#172B4D]">
                            <Package className="h-4 w-4" />
                            Bağlı Sipariş
                          </div>
                          <p className="text-[11px] sm:text-xs text-[#172B4D] font-medium">
                            {(task as any).productionOrderNumber || task.productionOrderId}
                          </p>
                          {(task as any).productionOrderCustomer && (
                            <p className="text-xs text-[#5E6C84]">{(task as any).productionOrderCustomer}</p>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-[#DFE1E6] text-[#172B4D] hover:bg-white font-medium h-10"
                            onClick={handleOpenOrderDetail}
                            disabled={orderLoading}
                          >
                            {orderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Detayları Aç"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  {(canEdit || canDelete) && (
                    <div className="flex justify-end gap-2">
                      {canEdit && (
                        <Button
                          variant="outline"
                          onClick={handleArchiveTask}
                          disabled={processing}
                          className="gap-2 h-10"
                        >
                          <Archive className="h-4 w-4" />
                          {task?.isArchived ? "Arşivden Çıkar" : "Arşivle"}
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          onClick={handleDeleteTask}
                          className="gap-2 h-10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Sil
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Yorumlar ve Etkinlikler Bölümü */}
                  {task?.id && user && (
                    <Card className="mt-4 border-2">
                      <CardHeader className="pb-3">
                            <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-primary" />
                          Yorumlar ve Etkinlikler
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ActivityCommentsPanel
                          entityId={task.id}
                          entityType="task"
                          onAddComment={async (content: string) => {
                            await addTaskComment(
                              task.id,
                              user.id,
                              content,
                              user.fullName,
                              user.email
                            );
                            // Yorum eklendikten sonra liste görünümündeki yorum sayısını güncelle
                            if (onUpdate) {
                              onUpdate();
                            }
                          }}
                          onGetComments={async () => {
                            return await getTaskComments(task.id);
                          }}
                          onGetActivities={async () => {
                            return await getTaskActivities(task.id);
                          }}
                          currentUserId={user.id}
                          currentUserName={user.fullName}
                          currentUserEmail={user.email}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
                )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Drive Linki Ekleme Dialog */}
    <Dialog open={showAddAttachmentDialog} onOpenChange={setShowAddAttachmentDialog}>
      <DialogContent className="max-w-md w-[80vw]">
        <DialogTitle className="sr-only">Google Drive Linki Ekle</DialogTitle>
        <DialogDescription className="sr-only">
            Google Drive'dan bir dosya veya klasör linki ekleyin
          </DialogDescription>
        <DialogHeader>
          <h2>Google Drive Linki Ekle</h2>
          <p>
            Google Drive'dan bir dosya veya klasör linki ekleyin
          </p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="drive-link-name">İsim *</Label>
            <Input
              id="drive-link-name"
              value={driveLinkName}
              onChange={(e) => setDriveLinkName(e.target.value)}
              placeholder="Örn: Proje Dokümantasyonu"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="drive-link">Google Drive Linki *</Label>
            <Input
              id="drive-link"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Google Drive dosya veya klasör linkini yapıştırın
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowAddAttachmentDialog(false);
              setDriveLink("");
              setDriveLinkName("");
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleAddDriveLink}
            disabled={uploadingAttachment || !driveLink.trim() || !driveLinkName.trim()}
          >
            {uploadingAttachment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Ekleniyor...
              </>
            ) : (
              "Ekle"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
      <DialogContent>
        <DialogTitle className="sr-only">Görevi Reddet</DialogTitle>
        <DialogDescription className="sr-only">
            Görevi reddetmek için lütfen en az 20 karakterlik bir sebep belirtin.
          </DialogDescription>
        <DialogHeader>
          <h2>Görevi Reddet</h2>
          <p>
            Görevi reddetmek için lütfen en az 20 karakterlik bir sebep belirtin.
          </p>
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectTask}
              disabled={processing || rejectionReason.trim().length < 20}
            >
              {processing ? "İşleniyor..." : "Reddet"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={showRejectApprovalDialog} onOpenChange={setShowRejectApprovalDialog}>
      <DialogContent>
        <DialogTitle className="sr-only">Görev Onayını Reddet</DialogTitle>
        <DialogDescription className="sr-only">
            Görev onayını reddetmek için lütfen bir not ekleyin. Görev tekrar panoya dönecektir.
          </DialogDescription>
        <DialogHeader>
          <h2>Görev Onayını Reddet</h2>
          <p>
            Görev onayını reddetmek için lütfen bir not ekleyin. Görev tekrar panoya dönecektir.
          </p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="rejection_approval_reason">
              Reddetme Notu <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejection_approval_reason"
              value={rejectionApprovalReason}
              onChange={(e) => setRejectionApprovalReason(e.target.value)}
              placeholder="Görev onayını neden reddettiğinizi açıklayın..."
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectApprovalDialog(false);
                setRejectionApprovalReason("");
              }}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRejectTaskApproval}
              disabled={processing || !rejectionApprovalReason.trim()}
            >
              {processing ? "İşleniyor..." : "Reddet"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    {/* Reject Rejection Dialog */}
    <Dialog open={showRejectRejectionDialog} onOpenChange={setShowRejectRejectionDialog}>
      <DialogContent>
        <DialogTitle className="sr-only">Görev Reddi Reddet</DialogTitle>
        <DialogDescription className="sr-only">
            Görev reddi reddedildiğinde görev tekrar atanan kişiye döner. Lütfen en az 20 karakterlik bir sebep belirtin.
          </DialogDescription>
        <DialogHeader>
          <h2>Görev Reddi Reddet</h2>
          <p>
            Görev reddi reddedildiğinde görev tekrar atanan kişiye döner. Lütfen en az 20 karakterlik bir sebep belirtin.
          </p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rejection_rejection_reason">Reddetme Sebebi *</Label>
            <Textarea
              id="rejection_rejection_reason"
              value={rejectionRejectionReason}
              onChange={(e) => setRejectionRejectionReason(e.target.value)}
              placeholder="Görev reddi neden reddedildiğini açıklayın (en az 20 karakter)..."
              rows={4}
              className={rejectionRejectionReason.length > 0 && rejectionRejectionReason.length < 20 ? "border-destructive" : ""}
            />
            {rejectionRejectionReason.length > 0 && rejectionRejectionReason.length < 20 && (
              <p className="text-xs text-destructive">
                En az {20 - rejectionRejectionReason.length} karakter daha gerekli
              </p>
            )}
            {rejectionRejectionReason.length >= 20 && (
              <p className="text-xs text-muted-foreground">
                {rejectionRejectionReason.length} / 20 karakter
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowRejectRejectionDialog(false);
              setRejectionRejectionReason("");
              setSelectedRejectionAssignment(null);
            }}
            disabled={processing}
          >
            İptal
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!taskId || !selectedRejectionAssignment?.assignment_id || rejectionRejectionReason.trim().length < 20) {
                return;
              }
              setProcessing(true);
              try {
                await rejectTaskRejection(
                  taskId,
                  selectedRejectionAssignment.assignment_id,
                  rejectionRejectionReason.trim()
                );
                toast.success("Görev reddi reddedildi, görev tekrar atanan kişiye döndü");
                setShowRejectRejectionDialog(false);
                setRejectionRejectionReason("");
                setSelectedRejectionAssignment(null);
                await fetchTaskDetails();
                onUpdate?.();
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                toast.error(errorMessage || "Red reddedilemedi");
              } finally {
                setProcessing(false);
              }
            }}
            disabled={processing || rejectionRejectionReason.trim().length < 20}
          >
            {processing ? "Reddediliyor..." : "Reddi Reddet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Task Confirmation Dialog */}
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Görevi Sil</DialogTitle>
          <DialogDescription>
            Bu görevi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Görev başlığı: <strong>{task?.title}</strong>
          </p>
          <p className="text-sm text-destructive mt-2">
            Bu görev ve tüm ilişkili veriler (yorumlar, ekler, kontrol listeleri) kalıcı olarak silinecektir.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(false)}
            disabled={deletingTask}
          >
            İptal
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDeleteTask}
            disabled={deletingTask}
          >
            {deletingTask ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Siliniyor...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Sil
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {orderDetail && (
      <OrderDetailModal
        open={orderModalOpen}
        onOpenChange={setOrderModalOpen}
        order={orderDetail}
      />
    )}
    </>
  );
};
