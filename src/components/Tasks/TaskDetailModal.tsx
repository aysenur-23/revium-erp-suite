import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Task as FirebaseTask,
  TaskComment,
  TaskActivity,
  Checklist,
  TaskAttachment,
} from "@/services/firebase/taskService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { createNotification } from "@/services/firebase/notificationService";
import { getOrderById } from "@/services/firebase/orderService";
import { canEditTask, canInteractWithTask, canViewTask } from "@/utils/permissions";
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
  const { user, isAdmin, isSuperAdmin, isTeamLeader } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myAssignment, setMyAssignment] = useState<AssignedUser | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRejectApprovalDialog, setShowRejectApprovalDialog] = useState(false);
  const [showRejectRejectionDialog, setShowRejectRejectionDialog] = useState(false);
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
  const [orderDetail, setOrderDetail] = useState<any>(null);
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(propProjectId || null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

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

  useEffect(() => {
    if (open && taskId) {
      fetchTaskDetails();
    } else if (open && !taskId) {
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
            // Gizli proje kontrolü: Eğer gizli projeyse ve kullanıcı yetkili değilse, boş liste göster
            if (currentProject.isPrivate) {
              if (isAdmin || isSuperAdmin) {
                setProjects([currentProject]);
                return;
              }
              if (user?.id && currentProject.createdBy === user.id) {
                setProjects([currentProject]);
                return;
              }
              // Projede görevi olan kullanıcılar görebilir
              if (user?.id) {
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
                  console.error("Error checking project tasks:", error);
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
            console.error("Proje yüklenemedi", error);
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
            if (isSuperAdmin) return project; // Üst yöneticiler tüm projeleri görebilir
            if (user?.id && project.createdBy === user.id) return project; // Oluşturan görebilir
            
            // Projede görevi olan kullanıcılar görebilir
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
              } catch (error) {
                // Hata durumunda gösterilmesin
                console.error("Error checking project tasks:", error);
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
  }, [open, taskId, isAdmin, isSuperAdmin, user?.id, propProjectId]);


  // Gizlilik değiştiğinde projeleri yeniden yükle (sadece gizli projeleri göstermek için)
  useEffect(() => {
    if (isPrivate && open && !taskId) {
      // Projeleri yeniden yükle
      const reloadProjects = async () => {
        try {
          const { getProjects } = await import("@/services/firebase/projectService");
          const allProjects = await getProjects({ status: "active" });
          // Sadece gizli projeleri göster
          const visibleProjects = await Promise.all(
            allProjects.map(async (project) => {
              if (!project.isPrivate) return null; // Gizli olmayan projeler gizli görevler için gösterilmez
              if (isSuperAdmin) return project; // Üst yöneticiler tüm gizli projeleri görebilir
              if (user?.id && project.createdBy === user.id) return project; // Oluşturan görebilir
              
              // Projede görevi olan kullanıcılar görebilir
              if (user?.id) {
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
                  console.error("Error checking project tasks:", error);
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
  }, [isPrivate, open, taskId, isAdmin, isSuperAdmin, user?.id]);

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
      const [taskData, assignments, allUsers, taskComments, taskActivities, taskChecklists, taskAttachments] = await Promise.all([
        getTaskById(taskId),
        getTaskAssignments(taskId),
        getAllUsers(),
        getTaskComments(taskId).catch(() => []),
        getTaskActivities(taskId).catch(() => []),
        getChecklists(taskId).catch(() => []),
        getTaskAttachments(taskId).catch(() => []),
      ]);

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
      
      // Yetki kontrollerini güncelle
      await updatePermissions(taskData as FirebaseTask, users.map(u => u.id));
    } catch (error: any) {
      console.error("Fetch task details error:", error);
      toast.error(error.message || "Görev detayları yüklenirken hata oluştu");
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
      setCanInteract(interactPermission);
    } catch (error) {
      console.error("Error checking permissions:", error);
      setCanView(false);
      setCanEdit(false);
      setCanInteract(false);
    }
  };

  // Task veya assignedUsers değiştiğinde yetkileri güncelle
  useEffect(() => {
    if (task && user) {
      const assignedUserIds = assignedUsers.map(u => u.id);
      updatePermissions(task as FirebaseTask, assignedUserIds);
    }
  }, [task, user, assignedUsers]);

  const handleOpenOrderDetail = async () => {
    if (!task?.production_order_id) return;
    setOrderLoading(true);
    try {
      const order = await getOrderById(task.production_order_id);
      if (order) {
        setOrderDetail(order);
        setOrderModalOpen(true);
      } else {
        toast.error("Sipariş bulunamadı");
      }
    } catch (error: any) {
      console.error("Get order detail error:", error);
      toast.error(error.message || "Sipariş detayları alınamadı");
    } finally {
      setOrderLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    // Yetki kontrolü: Sadece atanan kullanıcılar, oluşturan ve adminler durum güncelleyebilir
    if (!canInteract) {
      const { showPermissionErrorToast } = await import("@/utils/toastHelpers");
      showPermissionErrorToast("interact", "task");
      return;
    }

    // Alt yetki kontrolü - durum değiştirme
    try {
      const { canPerformSubPermission } = await import("@/utils/permissions");
      const userProfile: UserProfile = {
        id: user?.id || "",
        email: user?.email || "",
        emailVerified: user?.emailVerified || false,
        fullName: user?.fullName || "",
        displayName: user?.fullName || "",
        phone: user?.phone || null,
        dateOfBirth: user?.dateOfBirth || null,
        role: user?.roles || [],
        createdAt: null,
        updatedAt: null,
      };
      const hasPermission = await canPerformSubPermission(userProfile, "tasks", "canChangeStatus");
      if (!hasPermission && !isAdmin && !isSuperAdmin && task?.createdBy !== user?.id) {
        toast.error("Durum değiştirme yetkiniz yok");
        return;
      }
    } catch (error) {
      console.error("Permission check error:", error);
      // Hata durumunda devam et (eski davranış)
    }

    try {
      // Eğer görev "completed" durumuna geçiyorsa, onay kontrolü yap
      if (newStatus === "completed" && user?.id) {
        const isCreator = task?.createdBy === user.id;
        const canDirectComplete = isAdmin || isSuperAdmin || isCreator;
        
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
      setTask({ ...task, status: newStatus });
      await fetchTaskDetails(); // Approval status'u da almak için
      onUpdate?.();
    } catch (error: any) {
      console.error("Update task status error:", error);
      toast.error(error.message || "Durum güncellenirken hata oluştu");
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
      cancelled: "Yapılacak", // cancelled durumu yok, pending olarak göster
    };
    return labels[status] || status;
  };

  const [currentStatus, setCurrentStatus] = useState<string>(task?.status || initialStatus || "pending");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  // Mevcut durumun index'ini bul
  const getCurrentStatusIndex = () => {
    // Eğer görev tamamlandı ve onaylandıysa, "Onaylandı" aşamasını göster
    if (currentStatus === "completed" && task?.approvalStatus === "approved") {
      return 3; // "Onaylandı" index'i
    }
    // Eğer görev tamamlandı ama onaylanmadıysa, "Tamamlandı" aşamasını göster
    if (currentStatus === "completed") {
      return 2; // "Tamamlandı" index'i
    }
    // "cancelled" durumunu "pending" olarak handle et (cancelled durumu yok)
    const normalized = currentStatus === "cancelled" ? "pending" : currentStatus;
    const index = taskStatusWorkflow.findIndex((statusItem) => statusItem.value === normalized);
    return index === -1 ? 0 : index;
  };

  // Bir sonraki durumu bul
  const getNextStatus = () => {
    const currentIndex = getCurrentStatusIndex();
    if (currentIndex === -1 || currentIndex >= taskStatusWorkflow.length - 1) {
      return null;
    }
    return taskStatusWorkflow[currentIndex + 1];
  };

  // Durum geçiş validasyonu - sadece sıradaki aşamaya geçiş
  const isValidStatusTransition = (currentStatus: string, newStatus: string): boolean => {
    // Sadece sıradaki aşamaya geçiş mümkün
    const statusFlow: Record<string, string> = {
      pending: "in_progress",
      in_progress: "completed",
    };
    
    return statusFlow[currentStatus] === newStatus;
  };

  // Durum değişikliği handler'ı (workflow ile)
  const handleStatusChange = async (nextStatus: string) => {
    if (!taskId || !user?.id) {
      return;
    }

    // Validasyon kontrolü
    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      toast.error(`Geçersiz durum geçişi: ${getStatusLabel(currentStatus)} → ${getStatusLabel(nextStatus)}`);
      return;
    }

    setUpdatingStatus(true);
    try {
      // Durum güncellemesini yap (tüm durumlar için direkt geçiş)
      await updateTaskStatus(
        taskId,
        nextStatus as "pending" | "in_progress" | "completed"
      );
      
      setCurrentStatus(nextStatus);
      toast.success(`Görev durumu ${getStatusLabel(nextStatus)} olarak güncellendi.`);
      
      // Görev detaylarını yeniden yükle
      await fetchTaskDetails();
      onUpdate?.();
    } catch (error: any) {
      console.error("Task status update error:", error);
      toast.error("Durum güncellenemedi: " + (error?.message || "Bilinmeyen hata"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Onaya gönder butonu için handler
  const handleRequestApproval = async () => {
    if (!taskId || !user?.id) {
      return;
    }

    setUpdatingStatus(true);
    try {
      await requestTaskApproval(taskId, user.id);
      toast.success("Görev onay için yöneticiye gönderildi.");
      await fetchTaskDetails();
      onUpdate?.();
    } catch (error: any) {
      console.error("Request approval error:", error);
      toast.error("Onay isteği gönderilemedi: " + (error?.message || "Bilinmeyen hata"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Geri alma işlemi - sadece yöneticiler için, belirli bir duruma geri alır
  const handleRevertStatus = async (targetStatus: string) => {
    if (!taskId || !user?.id) {
      return;
    }

    if (!isAdmin && !isSuperAdmin) {
      toast.error("Sadece yöneticiler durumu geri alabilir.");
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
        setCurrentStatus("completed");
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
        setCurrentStatus(targetStatusItem.value);
        toast.success(`Görev durumu ${targetStatusItem.label} olarak geri alındı.`);
      }
      
      await fetchTaskDetails();
      onUpdate?.();
    } catch (error: any) {
      console.error("Revert status error:", error);
      toast.error("Durum geri alınamadı: " + (error?.message || "Bilinmeyen hata"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Task değiştiğinde currentStatus'u güncelle
  useEffect(() => {
    if (task?.status) {
      setCurrentStatus(task.status);
    }
  }, [task?.status]);

  const handleAcceptTask = async () => {
    if (!myAssignment) return;

    setProcessing(true);
    try {
      await acceptTaskAssignment(taskId, myAssignment.assignment_id);
      toast.success("Görev kabul edildi");
      fetchTaskDetails();
      onUpdate?.();
    } catch (error: any) {
      console.error("Accept task error:", error);
      toast.error(error.message || "Görev kabul edilemedi");
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
    } catch (error: any) {
      console.error("Reject task error:", error);
      toast.error(error.message || "Görev reddedilemedi");
    } finally {
      setProcessing(false);
    }
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
    } catch (error: any) {
      toast.error(error.message || "Dosya yüklenirken hata oluştu");
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
    } catch (error: any) {
      toast.error(error.message || "Drive linki eklenirken hata oluştu");
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
    } catch (error: any) {
      toast.error(error.message || "Dosya silinirken hata oluştu");
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
    } catch (error: any) {
      console.error("Approve task error:", error);
      toast.error(error.message || "Görev onaylanamadı");
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
    } catch (error: any) {
      console.error("Reject task approval error:", error);
      toast.error(error.message || "Görev onayı reddedilemedi");
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
    } catch (error: any) {
      console.error("Add checklist error:", error);
      toast.error(error.message || "Checklist eklenemedi");
    } finally {
      setLoadingChecklists(false);
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    // Yetki kontrolü: Sadece atanan kullanıcılar ve adminler checklist silebilir
    if (!canInteract) {
      const { showPermissionErrorToast } = await import("@/utils/toastHelpers");
      showPermissionErrorToast("delete", "checklist");
      return;
    }
    
    setLoadingChecklists(true);
    try {
      await deleteChecklist(taskId, checklistId);
      toast.success("Checklist silindi");
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Delete checklist error:", error);
      toast.error(error.message || "Checklist silinemedi");
    } finally {
      setLoadingChecklists(false);
    }
  };

  const handleAddChecklistItem = async (checklistId: string) => {
    const itemText = checklistItemInputs[checklistId]?.trim();
    if (!itemText) return;
    
    // Yetki kontrolü: Sadece atanan kullanıcılar ve adminler checklist öğesi ekleyebilir
    if (!canInteract) {
      const { showPermissionErrorToast } = await import("@/utils/toastHelpers");
      showPermissionErrorToast("create", "checklist");
      return;
    }
    
    setLoadingChecklists(true);
    try {
      await addChecklistItem(taskId, checklistId, itemText);
      toast.success("Checklist öğesi eklendi");
      setChecklistItemInputs(prev => ({ ...prev, [checklistId]: "" }));
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Add checklist item error:", error);
      toast.error(error.message || "Checklist öğesi eklenemedi");
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
    } catch (error: any) {
      console.error("Toggle checklist item error:", error);
      toast.error(error.message || "Checklist öğesi güncellenemedi");
    } finally {
      setLoadingChecklists(false);
    }
  };

  const handleDeleteChecklistItem = async (checklistId: string, itemId: string) => {
    // Yetki kontrolü: Sadece atanan kullanıcılar ve adminler checklist öğesi silebilir
    if (!canInteract) {
      const { showPermissionErrorToast } = await import("@/utils/toastHelpers");
      showPermissionErrorToast("delete", "checklist");
      return;
    }
    
    setLoadingChecklists(true);
    try {
      await deleteChecklistItem(taskId, checklistId, itemId);
      toast.success("Checklist öğesi silindi");
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Delete checklist item error:", error);
      toast.error(error.message || "Checklist öğesi silinemedi");
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
    } catch (error: any) {
      console.error("Update description error:", error);
      toast.error(error.message || "Açıklama güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLabel = () => {
    if (!labelInput.trim()) return;
    const currentLabels = task?.labels || [];
    const newLabel = { name: labelInput.trim(), color: labelColor };
    const updatedLabels = [...currentLabels, newLabel];
    handleUpdateLabels(updatedLabels);
    setLabelInput("");
  };

  const handleRemoveLabel = (labelName: string) => {
    const currentLabels = task?.labels || [];
    const updatedLabels = currentLabels.filter((l: any) => l.name !== labelName);
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
      setTask({ ...task, labels });
      setEditingLabels(false);
      onUpdate?.();
    } catch (error: any) {
      console.error("Update labels error:", error);
      toast.error(error.message || "Etiketler güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignMembers = async () => {
    if (!user) return;
    
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
      if (!hasPermission && !isAdmin && !isSuperAdmin) {
        toast.error("Görev atama yetkiniz yok");
        return;
      }
    } catch (error) {
      console.error("Permission check error:", error);
      // Hata durumunda devam et (eski davranış)
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
    } catch (error: any) {
      console.error("Assign members error:", error);
      toast.error(error.message || "Üyeler güncellenemedi");
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
          { field: "dueDate", oldValue: task.due_date, newValue: dueDateValue },
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
        due_date: dueDateValue ? `${dueDateValue}T00:00:00.000Z` : null,
      });
      setEditingDueDate(false);
      fetchTaskDetails(); // Refresh activities
      onUpdate?.();
    } catch (error: any) {
      console.error("Update due date error:", error);
      toast.error(error.message || "Tarih güncellenemedi");
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
    } catch (error: any) {
      console.error("Send comment error:", error);
      toast.error(error.message || "Yorum eklenemedi");
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
      if (task?.is_archived) {
        await unarchiveTask(taskId, user.id);
        toast.success("Görev arşivden çıkarıldı");
      } else {
        await archiveTask(taskId, user.id);
        toast.success("Görev arşivlendi");
      }
      await fetchTaskDetails();
      onUpdate?.();
    } catch (error: any) {
      console.error("Archive task error:", error);
      toast.error(error.message || "Görev arşivlenemedi");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteTask = () => {
    toast.info("Silme işlemi için görev listesi üzerinden ilerleyin.");
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

      const labelNames = newTaskLabels.map((label) => label.name);
      const dueDateTimestamp = newTaskDueDate ? Timestamp.fromDate(new Date(newTaskDueDate)) : null;

      const task = await createTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || null,
        status: initialStatus,
        priority: 2,
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
        } catch (assignError: any) {
          console.error("Assignment error:", assignError);
        }
      }

      // Create checklist if items exist
      if (newTaskChecklistItems.length > 0) {
        try {
          await createChecklist(taskId, "Checklist", newTaskChecklistItems);
        } catch (checklistError: any) {
          console.error("Checklist creation error:", checklistError);
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
      setSelectedProjectId(propProjectId || null);
      setIsPrivate(false);
      
      onUpdate?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Create task error:", error);
      toast.error(error.message || "Görev oluşturulamadı");
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

  const actionButtons = [
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

  if (loading && taskId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader className="sr-only">
            <DialogTitle>Görev yükleniyor</DialogTitle>
            <DialogDescription>Görev detayları hazırlanıyor</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Yeni görev oluşturma modu
  if (!taskId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="!max-w-[100vw] sm:!max-w-[95vw] !w-[100vw] sm:!w-[95vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[2.5vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border"
          data-task-modal
        >
          <div className="flex flex-col h-full min-h-0">
            <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground">Yeni Görev Oluştur</DialogTitle>
              <DialogDescription className="sr-only">
                Yeni görev oluşturmak için formu doldurun
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
              <div className="max-w-full mx-auto h-full overflow-y-auto">
                <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm sm:text-base font-bold text-[#172B4D] flex items-center gap-2 sm:gap-3">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-[#0079BF]" />
                    Görev Başlığı <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Örn: Yeni özellik geliştir..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="h-11 sm:h-12 bg-white border-2 border-[#DFE1E6] text-[#172B4D] text-base focus:border-[#0079BF] focus:ring-2 focus:ring-[#0079BF]/20"
                    disabled={creatingTask}
                    autoFocus
                  />
                </div>

                {/* Proje ve Gizlilik */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                   <div className="space-y-3">
                    <Label className="text-sm sm:text-base font-bold text-[#172B4D] flex items-center gap-2 sm:gap-3">
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
                  
                  <div className="space-y-3">
                    <Label className="text-sm sm:text-base font-bold text-[#172B4D] flex items-center gap-2 sm:gap-3">
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
                </div>

                {/* Açıklama */}
                <div className="space-y-3">
                  <Label className="text-base font-bold text-[#172B4D] flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-[#0079BF]" />
                    Açıklama
                  </Label>
                  <Textarea
                    placeholder="Görev hakkında detaylı bilgi ekleyin..."
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    rows={5}
                    disabled={creatingTask}
                    className="bg-white border-2 border-[#DFE1E6] text-[#172B4D] resize-none text-base focus:border-[#0079BF] focus:ring-2 focus:ring-[#0079BF]/20"
                  />
                </div>

                {/* Checklist */}
                <div className="space-y-4">
                  <Label className="text-base font-bold text-[#172B4D] flex items-center gap-3">
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
                          <span className={cn("flex-1 text-base", item.completed ? "line-through text-[#5E6C84]" : "text-[#172B4D] font-medium")}>
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
                  <Label className="text-base font-bold text-[#172B4D] flex items-center gap-3">
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
                  <Label className="text-base font-bold text-[#172B4D] flex items-center gap-3">
                    <Tag className="h-5 w-5 text-[#0079BF]" />
                    Etiketler
                  </Label>
                  {newTaskLabels.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {newTaskLabels.map((label, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity shadow-md"
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
                  <Label className="text-base font-bold text-[#172B4D] flex items-center gap-3">
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

                {/* Butonlar */}
                <div className="flex items-center gap-4 pt-6 border-t-2 border-[#DFE1E6]">
                  <Button
                    onClick={handleCreateTask}
                    disabled={creatingTask || !newTaskTitle.trim()}
                    className="bg-[#0079BF] hover:bg-[#005A8B] text-white flex-1 font-bold h-14 text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
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

  if (!task) return null;
  
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
    task?.created_at && { label: "Oluşturulma", value: formatDateSafe(new Date(task.created_at)) },
    task?.due_date && { label: "Termin", value: formatDateSafe(new Date(task.due_date)) },
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="!max-w-[100vw] sm:!max-w-[95vw] !w-[100vw] sm:!w-[95vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[2.5vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border" 
          aria-describedby="task-detail-description"
          data-task-modal
        >
          <div className="flex flex-col h-full min-h-0">
            <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                    <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground truncate">
                    Görev Detayı - {task?.title || "Yeni Görev"}
                  </DialogTitle>
                  <DialogDescription className="sr-only" id="task-detail-description">
                    Görev detayları ve bilgileri
                  </DialogDescription>
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0 relative z-10 pr-10 sm:pr-12">
                  {task?.approvalStatus === "pending" && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50 text-xs px-2 sm:px-3 py-1 relative z-10">
                      Onay Bekliyor
                    </Badge>
                  )}
                  {task && (
                    <Badge variant={getStatusVariant(task.status)} className="text-xs px-2 sm:px-3 py-1 relative z-10">
                      {getStatusLabel(task.status)}
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
            
          <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
            <div className="max-w-full mx-auto h-full overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {task?.approvalStatus === "pending" && user && ((task.createdBy || task.created_by) === user.id || isAdmin || isSuperAdmin || isTeamLeader) && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-yellow-900">Görev Tamamlanma Onayı Bekliyor</h4>
                            <p className="text-sm text-yellow-700">
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
                            <CardTitle className="text-lg">Görev Durumu</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {(() => {
                                // Eğer görev onaylandıysa
                                if (currentStatus === "completed" && task?.approvalStatus === "approved") {
                                  return "Görev onaylandı ve tamamlandı.";
                                }
                                // Eğer görev tamamlandı ve onaya gönderildiyse
                                if (currentStatus === "completed" && task?.approvalStatus === "pending") {
                                  return "Görev tamamlandı ve onay bekleniyor.";
                                }
                                // Eğer görev tamamlandı ama onaya gönderilmediyse
                                if (currentStatus === "completed") {
                                  return "Görev tamamlandı. Onaya göndermek için butona tıklayın.";
                                }
                                // "cancelled" durumunu "pending" olarak göster
                                const normalizedStatus = currentStatus === "cancelled" ? "pending" : currentStatus;
                                // Diğer durumlar için normal mesaj
                                const nextStatus = getNextStatus();
                                if (nextStatus) {
                                  return `${getStatusLabel(normalizedStatus)} aşamasındasınız. Sıradaki adım: ${nextStatus.label}`;
                                }
                                return "Workflow tamamlandı.";
                              })()}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            Son güncelleyen: {task?.statusUpdatedBy 
                              ? (usersMap[task.statusUpdatedBy] || task.statusUpdatedBy)
                              : (user?.fullName || "-")}
                            <br />
                            <span className="text-[11px]">
                              {task?.statusUpdatedAt ? formatDateSafe(task.statusUpdatedAt as any) : ""}
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
                            const currentIndex = getCurrentStatusIndex();
                            const isActive = index === currentIndex;
                            const isCompleted = index < currentIndex;
                            // Yöneticiler tüm eski adımlara geri dönebilir (onay bekleyen görevler hariç)
                            // "approved" durumuna tıklanırsa "completed" durumuna geri alınır
                            const canRevert = (isAdmin || isSuperAdmin) && index < currentIndex && 
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
                          if (currentStatus === "completed" && task?.approvalStatus === "approved") {
                            return null;
                          }
                          
                          // Tamamlandı durumunda ve onaya gönderilmemişse "Onaya Gönder" butonu göster
                          if (currentStatus === "completed" && task?.approvalStatus !== "pending" && task?.approvalStatus !== "approved") {
                            return (
                              <div className="flex justify-center pt-4 border-t">
                                <Button
                                  onClick={handleRequestApproval}
                                  disabled={updatingStatus}
                                  className="gap-2"
                                >
                                  {updatingStatus ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      Gönderiliyor...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-4 w-4" />
                                      Onaya Gönder
                                    </>
                                  )}
                                </Button>
                              </div>
                            );
                          }
                          
                          // Diğer durumlar için normal geçiş butonu (pending -> in_progress, in_progress -> completed)
                          if (getNextStatus() && task?.approvalStatus !== "pending" && task?.approvalStatus !== "approved") {
                            // Tüm durum geçişleri için buton göster
                            return (
                              <div className="flex justify-center pt-4 border-t">
                                <Button
                                  onClick={() => handleStatusChange(getNextStatus()!.value)}
                                  disabled={updatingStatus}
                                  className="gap-2"
                                >
                                  {updatingStatus ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      Güncelleniyor...
                                    </>
                                  ) : (
                                    <>
                                      {(() => {
                                        const NextIcon = getNextStatus()!.icon;
                                        return <NextIcon className="h-4 w-4" />;
                                      })()}
                                      {getNextStatus()!.label} Durumuna Geç
                                    </>
                                  )}
                                </Button>
                              </div>
                            );
                          }
                          
                          return null;
                        })()}

                        {/* Reddin Notu - Görev alan kişilere göster */}
                        {task?.approvalStatus === "rejected" && task?.rejectionReason && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-red-900 mb-1">Görev Onayı Reddedildi</p>
                                  <p className="text-sm text-red-800 whitespace-pre-wrap">{task.rejectionReason}</p>
                                  {task.rejectedBy && usersMap[task.rejectedBy] && (
                                    <p className="text-xs text-red-700 mt-2">
                                      Reddeden: {usersMap[task.rejectedBy]}
                                      {task.rejectedAt && (
                                        <span className="ml-2">
                                          • {formatDateSafe(task.rejectedAt as any)}
                                        </span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

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
                            <CardTitle className="text-lg">Açıklama</CardTitle>
                            <p className="text-sm text-muted-foreground">
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
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {task.description}
                          </p>
                        ) : (
                          <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center bg-muted/30">
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
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                Etiketler
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
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
                                    task.labels.map((label: any, idx: number) => (
                                      <div
                                        key={`${label.name}-${idx}`}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
                                        style={{ backgroundColor: label.color || "#475569" }}
                                        onClick={() => handleRemoveLabel(label.name)}
                                      >
                                        <span>{label.name}</span>
                                        <X className="h-3 w-3" />
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-[#5E6C84]">Etiket bulunmuyor.</p>
                                  )}
                                </div>
                                <div className="space-y-3">
                                  <div className="flex gap-3">
                                    <Input
                                      value={labelInput}
                                      onChange={(e) => setLabelInput(e.target.value)}
                                      placeholder="Etiket adı girin..."
                                      className="flex-1 text-sm bg-white border-[#DFE1E6] text-[#172B4D] h-10"
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
                                  task.labels.map((label: any, idx: number) => (
                                    <span
                                      key={`${label.name}-${idx}`}
                                      className="px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow-sm"
                                      style={{ backgroundColor: label.color || "#475569" }}
                                    >
                                      {label.name}
                                    </span>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">Etiket bulunmuyor.</p>
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
                          <CardTitle className="text-lg flex items-center gap-2">
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
                              <p className="text-sm font-medium text-[#172B4D] truncate">{attachment.name}</p>
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
                          <div className="text-center py-8 text-muted-foreground text-sm rounded-lg border border-dashed bg-muted/30">
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
                            <CardTitle className="text-lg flex items-center gap-2">
                              <ListChecks className="h-4 w-4" />
                              Checklistler
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
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
                      {task.checklists && task.checklists.length > 0 ? (
                        task.checklists.map((checklist: any) => (
                          <div key={checklist.id} className="border border-[#DFE1E6] rounded-xl p-5 space-y-4 bg-[#F4F5F7] shadow-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm text-[#172B4D]">{checklist.title}</p>
                                <p className="text-xs text-[#5E6C84]">
                                  {checklist.completed_items || 0}/{checklist.total_items || 0} tamamlandı
                                </p>
                                {checklist.total_items ? (
                                  <Progress
                                    value={
                                      checklist.total_items > 0
                                        ? ((checklist.completed_items || 0) / checklist.total_items) * 100
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
                              {checklist.items && checklist.items.length > 0 ? (
                                checklist.items.map((item: any) => (
                                  <div key={item.id} className="flex items-center gap-3 text-sm p-2.5 rounded-lg hover:bg-white/50 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={!!item.completed}
                                      onChange={(e) => handleToggleChecklistItem(checklist.id, item.id, e.target.checked)}
                                      className="h-4 w-4 accent-[#0079BF] cursor-pointer"
                                    />
                                    <span className={cn("flex-1", item.completed ? "line-through text-[#5E6C84]" : "text-[#172B4D]")}>
                                      {item.text || item.title}
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
                        ))
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
                      <div className="font-semibold text-blue-700 text-base">Size Atanan Görev</div>
                      <p className="text-sm text-[#172B4D] leading-relaxed">
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
                      <div className="font-semibold text-red-700 text-base">Görev Reddedildi</div>
                      <p className="text-sm text-[#172B4D] leading-relaxed">
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
                            <CardTitle className="text-lg">Görevdeki Kişiler</CardTitle>
                            <p className="text-sm text-muted-foreground">
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
                              <div className="text-sm text-[#5E6C84]">{assignedUser.email}</div>
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
                                        } catch (error: any) {
                                          toast.error(error.message || "Red onaylanamadı");
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
                          <div className="text-center py-8 text-[#5E6C84] text-sm rounded-xl border border-dashed border-[#DFE1E6] bg-[#F4F5F7]">
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
                          <CardTitle className="text-lg">Detaylar</CardTitle>
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
                          <p className="text-sm font-medium mt-1">
                            {format(new Date(task.created_at), "dd MMM yyyy HH:mm", { locale: tr })}
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
                                  setDueDateValue(task.due_date ? task.due_date.split("T")[0] : "");
                                }}
                                className="h-8 px-2"
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm font-medium mt-1">
                              {task.due_date ? format(new Date(task.due_date), "dd MMM yyyy HH:mm", { locale: tr }) : "-"}
                            </p>
                          )}
                        </div>
                        <div className="rounded-lg border bg-muted/30 px-3 py-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Durum</p>
                          <p className="text-sm font-medium mt-1">{getStatusLabel(task.status)}</p>
                        </div>
                      </div>
                      
                      {/* Reddin Notu - Görev alan kişilere göster */}
                      {task?.approvalStatus === "rejected" && task?.rejectionReason && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Red Nedeni</p>
                                <p className="text-sm text-red-800 whitespace-pre-wrap font-medium">{task.rejectionReason}</p>
                                {task.rejectedBy && usersMap[task.rejectedBy] && (
                                  <p className="text-xs text-red-700 mt-2">
                                    Reddeden: {usersMap[task.rejectedBy]}
                                    {task.rejectedAt && (
                                      <span className="ml-2">
                                        • {formatDateSafe(task.rejectedAt as any)}
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
                        <CardTitle className="text-lg flex items-center gap-2">
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
                                  <p className="text-sm font-semibold text-[#172B4D] mb-0.5">{action.title}</p>
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
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        İlişkiler
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Select
                        value={task.production_order_id ? "linked" : "none"}
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
                            {task.production_order_id ? `Sipariş #${task.production_order_number || task.production_order_id}` : "Bağlı sipariş yok"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Bağlı sipariş yok</SelectItem>
                          {task.production_order_id && (
                            <SelectItem value="linked">Sipariş #{task.production_order_number || task.production_order_id}</SelectItem>
                          )}
                          <SelectItem value="link">Sipariş bağla</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-3">
                        <Button className="flex-1 bg-[#0079BF] hover:bg-[#005A8B] text-white h-12 font-semibold shadow-md hover:shadow-lg transition-all" onClick={handleLinkOrderClick}>
                          Bağla
                        </Button>
                        <Button variant="outline" className="flex-1 border-2 border-[#E1E4EA] text-[#172B4D] hover:bg-[#F4F5F7] hover:border-[#0079BF] h-12 font-semibold transition-all" onClick={handleRefreshCard}>
                          Yenile
                        </Button>
                      </div>
                      {task.production_order_id && (
                        <div className="mt-4 rounded-xl border border-[#DFE1E6] bg-gradient-to-br from-[#F4F5F7] to-white p-4 space-y-3 shadow-sm">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#172B4D]">
                            <Package className="h-4 w-4" />
                            Bağlı Sipariş
                          </div>
                          <p className="text-sm text-[#172B4D] font-medium">
                            {task.production_order_number || task.production_order_id}
                          </p>
                          {task.production_order_customer && (
                            <p className="text-xs text-[#5E6C84]">{task.production_order_customer}</p>
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
                  {canEdit && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={handleArchiveTask}
                        disabled={processing}
                        className="gap-2 h-10"
                      >
                        <Archive className="h-4 w-4" />
                        {task?.is_archived ? "Arşivden Çıkar" : "Arşivle"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleDeleteTask}
                        className="gap-2 h-10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Sil
                      </Button>
                    </div>
                  )}

                  <Card>
                    <CardHeader className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Yorumlar ve Etkinlik
                          </CardTitle>
                        </div>
                        <Badge variant="outline" className="border-[#DFE1E6] text-[#5E6C84] font-medium">
                          Yakında
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        placeholder="Yorum yaz..."
                        className="bg-white border-[#DFE1E6] text-[#172B4D] resize-none"
                        disabled
                      />
                      <p className="text-xs text-[#5E6C84]">
                        Yorum altyapısı üzerinde çalışıyoruz.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Drive Linki Ekleme Dialog */}
    <Dialog open={showAddAttachmentDialog} onOpenChange={setShowAddAttachmentDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Google Drive Linki Ekle</DialogTitle>
          <DialogDescription>
            Google Drive'dan bir dosya veya klasör linki ekleyin
          </DialogDescription>
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
        <DialogHeader>
          <DialogTitle>Görev Onayını Reddet</DialogTitle>
          <DialogDescription>
            Görev onayını reddetmek için lütfen bir not ekleyin. Görev tekrar panoya dönecektir.
          </DialogDescription>
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
        <DialogHeader>
          <DialogTitle>Görev Reddi Reddet</DialogTitle>
          <DialogDescription>
            Görev reddi reddedildiğinde görev tekrar atanan kişiye döner. Lütfen en az 20 karakterlik bir sebep belirtin.
          </DialogDescription>
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
              } catch (error: any) {
                toast.error(error.message || "Red reddedilemedi");
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
