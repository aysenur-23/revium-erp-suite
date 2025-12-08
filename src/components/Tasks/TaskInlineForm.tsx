import { uploadTaskAttachment } from "@/services/firebase/storageService";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserMultiSelect } from "@/components/Tasks/UserMultiSelect";
import { canCreateTask, canCreateProject } from "@/utils/permissions";
import { getDepartments } from "@/services/firebase/departmentService";
import { onPermissionCacheChange } from "@/services/firebase/rolePermissionsService";
import { UserProfile } from "@/services/firebase/authService";
import {
  addChecklistItem,
  addTaskAttachment,
  assignTask,
  createChecklist,
  createTask,
  deleteChecklistItem,
  deleteTaskAssignment,
  deleteTaskAttachment,
  getChecklists,
  getTaskAssignments,
  getTaskAttachments,
  approveTask,
  rejectTaskApproval,
  getTaskById,
  TaskAssignment,
  updateChecklistItem,
  updateTask,
} from "@/services/firebase/taskService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";
import { Loader2, Plus, Link as LinkIcon, ListChecks, X, Check, Paperclip, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

type TaskInlineFormMode = "create" | "edit";

interface TaskInlineFormProps {
  mode: TaskInlineFormMode;
  projectId?: string | null;
  taskId?: string | null;
  defaultStatus?: "pending" | "in_progress" | "completed";
  onCancel: () => void;
  onSuccess?: (taskId?: string) => void;
  className?: string;
  isInPool?: boolean;
  showOnlyInMyTasks?: boolean; // "Sadece Benim Görevlerim sayfasında göster" seçeneğini göster
}

interface ChecklistItemState {
  id: string;
  text: string;
  completed?: boolean;
}

interface AttachmentState {
  id: string;
  label: string;
  url: string;
  type: "drive_link" | "file";
  attachmentId?: string;
  storageProvider?: "firebase" | "google_drive";
  driveFileId?: string;
}

const formatDateInput = (value?: Timestamp | Date | string | null) => {
  if (!value) return "";
  if (value instanceof Timestamp) {
    return value.toDate().toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

export const TaskInlineForm = ({
  mode,
  projectId,
  taskId,
  defaultStatus = "pending",
  onCancel,
  onSuccess,
  className,
  isInPool,
  showOnlyInMyTasks = false,
}: TaskInlineFormProps) => {
  const isEdit = mode === "edit";
  const { user, isAdmin, isSuperAdmin, isTeamLeader } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItemState[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [attachments, setAttachments] = useState<AttachmentState[]>([]);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [existingAssignments, setExistingAssignments] = useState<TaskAssignment[]>([]);
  const [isTaskInPool, setIsTaskInPool] = useState(isInPool || false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [onlyInMyTasks, setOnlyInMyTasks] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "rejected" | undefined>(undefined);
  const [approvalRequestedBy, setApprovalRequestedBy] = useState<string | undefined>(undefined);
  const [taskCreatorId, setTaskCreatorId] = useState<string | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId || null);
  const [projects, setProjects] = useState<any[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [canSelectProject, setCanSelectProject] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formTitle = useMemo(
    () => (isEdit ? "Görevi Düzenle" : "Yeni Görev"),
    [isEdit]
  );

  const formSubTitle = useMemo(
    () =>
      isEdit
        ? "Başlık, açıklama, ekip ve ekleri aynı mini formdan düzenleyin."
        : "Minimal form ile görevi hızla ekleyin, dosya ve checklist ekleyin.",
    [isEdit]
  );

  const checkPermissions = async () => {
    if (!user) {
      setCanCreate(false);
      setCanSelectProject(false);
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
        createdAt: null,
        updatedAt: null,
      };
      const [hasTaskPermission, hasProjectPermission] = await Promise.all([
        canCreateTask(userProfile, departments),
        canCreateProject(userProfile, departments),
      ]);
      setCanCreate(hasTaskPermission);
      setCanSelectProject(hasTaskPermission || hasProjectPermission || isAdmin);
    } catch (error) {
      console.error("Permission check error:", error);
      setCanCreate(false);
      setCanSelectProject(false);
    }
  };

  // Yetki kontrolleri
  useEffect(() => {
    checkPermissions();
  }, [user, isAdmin]);

  // Listen to permission changes in real-time
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onPermissionCacheChange(() => {
      // Re-check permissions when they change
      checkPermissions();
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  const isRestrictedUser = isEdit && !isAdmin && user?.id !== taskCreatorId;
  const navigate = useNavigate();

  const resetState = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setSelectedMembers([]);
    setChecklistItems([]);
    setNewChecklistText("");
    setAttachments([]);
    setLinkLabel("");
    setLinkUrl("");
    setActiveChecklistId(null);
    setExistingAssignments([]);
    setIsTaskInPool(isInPool || false);
    setIsPrivate(false);
    setSelectedProjectId(projectId || null);
  };

  const loadTask = async (id: string) => {
    setLoading(true);
    try {
      const [task, assignments, checklists, taskAttachments] = await Promise.all([
        getTaskById(id),
        getTaskAssignments(id),
        getChecklists(id),
        getTaskAttachments(id),
      ]);

      if (!task) {
        toast.error("Görev bulunamadı");
        onCancel();
        return;
      }

      setTitle(task.title);
      setDescription(task.description || "");
      setDueDate(formatDateInput(task.dueDate));
      setApprovalStatus(task.approvalStatus);
      setApprovalRequestedBy(task.approvalRequestedBy);
      setTaskCreatorId(task.createdBy);
      setSelectedProjectId(task.projectId || null);
      setIsPrivate(task.isPrivate || false);
      
      const activeAssignments = assignments.filter((a) => a.status !== "rejected");
      setSelectedMembers(activeAssignments.map((a) => a.assignedTo));
      setExistingAssignments(assignments);

      if (checklists.length > 0) {
        const primaryChecklist = checklists[0];
        setActiveChecklistId(primaryChecklist.id);
        setChecklistItems(
          primaryChecklist.items.map((item) => ({
            id: item.id,
            text: item.text,
            completed: item.completed,
          }))
        );
      } else {
        setChecklistItems([]);
        setActiveChecklistId(null);
      }

      setAttachments(
        taskAttachments.map((attachment) => ({
          id: attachment.id,
          attachmentId: attachment.id,
          label: attachment.name,
          url: attachment.driveLink || attachment.url,
          type: (attachment.attachmentType === "file" || attachment.type === "file") ? "file" : "drive_link",
        }))
      );
    } catch (error: any) {
      console.error("Inline form load error:", error);
      toast.error(error?.message || "Görev verileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEdit && taskId) {
      loadTask(taskId);
    } else {
      resetState();
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, taskId]);

  // Projeleri yükle fonksiyonu
  const loadProjects = useCallback(async () => {
      try {
        const { getProjects, getProjectById } = await import("@/services/firebase/projectService");
        
        // Düzenleme modunda tüm projeleri göster, yeni görev oluştururken ve projectId varsa sadece o projeyi göster
        if (projectId && !isEdit) {
          try {
            const currentProject = await getProjectById(projectId);
            // Proje bulunamadıysa boş liste göster
            if (!currentProject) {
              setProjects([]);
              return;
            }
            // Gizli proje kontrolü: Eğer gizli projeyse ve kullanıcı yetkili değilse, boş liste göster
            // Ekip lideri sadece kendi oluşturduğu gizli projeleri görebilir
            if (currentProject.isPrivate) {
              if (isSuperAdmin) {
                setProjects([currentProject]);
                return;
              }
              if (isAdmin) {
                setProjects([currentProject]);
                return;
              }
              if (user?.id && currentProject.createdBy === user.id) {
                setProjects([currentProject]);
                return;
              }
              // Ekip lideri için projede görevi olan kullanıcılar kontrolü yapılmaz (sadece kendi oluşturduğu gizli projeleri görebilir)
              const isTeamLeader = user?.roles?.includes("team_leader");
              if (isTeamLeader) {
                // Ekip lideri sadece kendi oluşturduğu gizli projeleri görebilir (yukarıda kontrol edildi)
                setProjects([]);
                return;
              }
              // Projede görevi olan kullanıcılar görebilir (ekip lideri hariç)
              if (user?.id) {
                try {
                  const { getTasks, getTaskAssignments } = await import("@/services/firebase/taskService");
                  const projectTasks = await getTasks({ projectId: projectId });
                  
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

        // Eğer bir gizli projeye görev ekleniyorsa (projectId prop'u ile ve yeni görev oluştururken), sadece o proje gösterilmeli
        // Diğer gizli projeler gösterilmemeli
        if (projectId && !isEdit) {
          const currentProject = allProjects.find(p => p.id === projectId);
          if (currentProject?.isPrivate) {
            // Gizli projeye görev ekleniyorsa, sadece o proje gösterilmeli
            // Yukarıdaki kontrol zaten yapıldı, buraya gelmemeli ama yine de kontrol edelim
            setProjects([currentProject]);
            return;
          }
        }

        // Gizli projeleri filtrele: Sadece yönetici, oluşturan ve projede görevi olanlar görebilir
        // ÖNEMLİ: Eğer bir gizli projeye görev ekleniyorsa (ve yeni görev oluştururken), diğer gizli projeler gösterilmemeli
        const visibleProjects = await Promise.all(
          allProjects.map(async (project) => {
            // Eğer bir gizli projeye görev ekleniyorsa (ve yeni görev oluştururken), diğer gizli projeler gösterilmemeli
            if (projectId && !isEdit) {
              const currentProject = allProjects.find(p => p.id === projectId);
              if (currentProject?.isPrivate && project.isPrivate && project.id !== projectId) {
                // Başka bir gizli proje, gösterilmemeli
                return null;
              }
            }
            
            if (!project.isPrivate) return project; // Gizli olmayan projeler herkes görebilir
            
            // Gizli projeler için yetki kontrolü
            if (isSuperAdmin) return project; // Üst yöneticiler tüm projeleri görebilir
            if (isAdmin) return project; // Yöneticiler tüm projeleri görebilir
            if (user?.id && project.createdBy === user.id) return project; // Oluşturan görebilir
            
            // Ekip lideri için projede görevi olan kullanıcılar kontrolü yapılmaz (sadece kendi oluşturduğu gizli projeleri görebilir)
            const isTeamLeader = user?.roles?.includes("team_leader");
            if (isTeamLeader) {
              return null; // Ekip lideri sadece kendi oluşturduğu gizli projeleri görebilir (yukarıda kontrol edildi)
            }
            
            // Projede görevi olan kullanıcılar görebilir (ekip lideri hariç)
            if (user?.id) {
              try {
                // Projedeki görevleri kontrol etmeden önce, kullanıcının bu projeye atanmış olup olmadığını kontrol et
                // (Eğer proje üyeleri özelliği varsa)
                
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

        // Null değerleri filtrele ve aynı projeyi tekrarlamamak için filtrele (Genel Görevler artık gösterilecek)
        const uniqueProjects = Array.from(
          new Map(
            visibleProjects
              .filter((project) => project !== null && project !== undefined && project.id)
              .map((project) => [project.id, project])
          ).values()
        );

        setProjects(uniqueProjects);
      } catch (error) {
        console.error("Projeler yüklenemedi", error);
      }
  }, [isEdit, isSuperAdmin, user, projectId]);
  
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);
  
  // selectedProjectId değiştiğinde projeleri yeniden yükle (gizli proje seçildiyse)
  useEffect(() => {
    if (selectedProjectId) {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      if (selectedProject?.isPrivate) {
        // Gizli proje seçildiyse, sadece gizli projeleri göster
        loadProjects();
      }
    }
  }, [selectedProjectId]);

  // Proje seçildiğinde veya projectId prop'u geldiğinde, eğer proje gizli ise isPrivate'ı otomatik true yap
  useEffect(() => {
    if (!isEdit && projects.length > 0) {
      const currentProjectId = selectedProjectId || projectId;
      if (currentProjectId) {
        const currentProject = projects.find(p => p.id === currentProjectId);
        if (currentProject?.isPrivate) {
          setIsPrivate(true);
        }
      }
    }
  }, [selectedProjectId, projectId, projects, isEdit]);

  const handleAddChecklistItem = async () => {
    if (!newChecklistText.trim()) return;
    
    // Yetki kontrolü: Düzenleme modunda sadece atanan kullanıcılar ve adminler checklist öğesi ekleyebilir
    if (isEdit && taskId) {
      const canInteract = isAdmin || (user?.id && selectedMembers.includes(user.id));
      if (!canInteract) {
        const { showPermissionErrorToast } = await import("@/utils/toastHelpers");
        showPermissionErrorToast("interact", "checklist");
        return;
      }
    }
    
    const newItem = {
      id: `${Date.now()}`,
      text: newChecklistText.trim(),
      completed: false,
    };

    if (isEdit && taskId && activeChecklistId) {
      try {
        await addChecklistItem(taskId, activeChecklistId, newItem.text);
        await loadTask(taskId);
        setNewChecklistText("");
        toast.success("Checklist maddesi eklendi");
        return;
      } catch (error: any) {
        console.error("Inline checklist add error:", error);
        toast.error(error?.message || "Checklist maddesi eklenemedi");
        return;
      }
    }

    setChecklistItems((prev) => [...prev, newItem]);
    setNewChecklistText("");
  };

  const handleToggleChecklistItem = async (id: string) => {
    if (isEdit && taskId && activeChecklistId) {
      const item = checklistItems.find((c) => c.id === id);
      if (!item) return;
      try {
        await updateChecklistItem(taskId, activeChecklistId, id, !item.completed, user?.id);
        setChecklistItems((prev) =>
          prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
        );
      } catch (error: any) {
        console.error("Inline checklist toggle error:", error);
        toast.error(error?.message || "Checklist güncellenemedi");
      }
      return;
    }

    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleRemoveChecklistItem = async (id: string) => {
    // Yetki kontrolü: Düzenleme modunda sadece atanan kullanıcılar ve adminler checklist öğesi silebilir
    if (isEdit && taskId) {
      const canInteract = isAdmin || (user?.id && selectedMembers.includes(user.id));
      if (!canInteract) {
        const { showPermissionErrorToast } = await import("@/utils/toastHelpers");
        showPermissionErrorToast("delete", "checklist");
        return;
      }
    }
    
    if (isEdit && taskId && activeChecklistId) {
      try {
        await deleteChecklistItem(taskId, activeChecklistId, id);
        setChecklistItems((prev) => prev.filter((item) => item.id !== id));
        toast.success("Checklist maddesi silindi");
      } catch (error: any) {
        console.error("Inline checklist delete error:", error);
        toast.error(error?.message || "Checklist maddesi silinemedi");
      }
      return;
    }

    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;

    if (isEdit && taskId) {
      if (!user?.id) {
        toast.error("Kullanıcı oturumu bulunamadı");
        return;
      }
      try {
        const attachment = await addTaskAttachment(taskId, {
          name: linkLabel.trim() || "Dosya Linki",
          url: linkUrl.trim(),
          type: "drive_link",
          attachmentType: "drive_link",
          driveLink: linkUrl.trim(),
          size: 0,
          uploadedBy: user.id,
        });
        setAttachments((prev) => [
          ...prev,
          {
            id: attachment.id,
            attachmentId: attachment.id,
            label: attachment.name,
            url: attachment.driveLink || attachment.url,
            type: "drive_link",
          },
        ]);
        setLinkLabel("");
        setLinkUrl("");
        toast.success("Link eklendi");
        return;
      } catch (error: any) {
        console.error("Inline link add error:", error);
        toast.error(error?.message || "Link eklenemedi");
        return;
      }
    }

    setAttachments((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        label: linkLabel.trim() || "Dosya Linki",
        url: linkUrl.trim(),
        type: "drive_link",
      },
    ]);
    setLinkLabel("");
    setLinkUrl("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isEdit || !taskId) {
      toast.info("Dosya yüklemek için önce görevi oluşturmalısınız.");
      return;
    }

    if (!user?.id) {
      toast.error("Kullanıcı oturumu bulunamadı");
      return;
    }

    const toastId = toast.loading("Dosya yükleniyor...");
    try {
      // 1. Upload to Storage
      const uploadResult = await uploadTaskAttachment(file, taskId);
      
      // 2. Add metadata to Firestore
      const attachment = await addTaskAttachment(taskId, {
        name: file.name,
        url: uploadResult.url,
        type: file.type,
        attachmentType: uploadResult.provider === "google_drive" ? "drive_link" : "file",
        size: file.size,
        storageProvider: uploadResult.provider,
        driveLink: uploadResult.webViewLink || uploadResult.webContentLink || uploadResult.url,
        driveFileId: uploadResult.fileId,
        uploadedBy: user.id,
      });

      setAttachments((prev) => [
        ...prev,
        {
          id: attachment.id,
          attachmentId: attachment.id,
          label: attachment.name,
          url: attachment.url,
          type: attachment.attachmentType === "drive_link" ? "drive_link" : "file",
          storageProvider: attachment.storageProvider,
          driveFileId: attachment.driveFileId,
        },
      ]);
      
      toast.success("Dosya başarıyla yüklendi", { id: toastId });
    } catch (error: any) {
      console.error("File upload error:", error);
      toast.error(error?.message || "Dosya yüklenemedi", { id: toastId });
    } finally {
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAttachment = async (id: string) => {
    const attachment = attachments.find((a) => a.id === id);

    if (isEdit && taskId && attachment?.attachmentId) {
      try {
        if (attachment.storageProvider === "google_drive" && attachment.driveFileId) {
          const { deleteFile } = await import("@/services/firebase/storageService");
          await deleteFile(attachment.url, { provider: "google_drive", fileId: attachment.driveFileId });
        } else if (attachment.type !== "drive_link") {
          const { deleteFile } = await import("@/services/firebase/storageService");
          await deleteFile(attachment.url);
        }
        await deleteTaskAttachment(taskId, attachment.attachmentId);
        setAttachments((prev) => prev.filter((item) => item.id !== id));
        toast.success("Ek kaldırıldı");
      } catch (error: any) {
        console.error("Inline attachment delete error:", error);
        toast.error(error?.message || "Ek kaldırılamadı");
      }
      return;
    }

    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const syncAssignments = async (id: string) => {
    if (!user?.id) return;
    const currentAssigned = existingAssignments
      .filter((assignment) => assignment.status !== "rejected")
      .map((assignment) => assignment.assignedTo);

    const toAdd = selectedMembers.filter((memberId) => !currentAssigned.includes(memberId));
    const toRemove = currentAssigned.filter((memberId) => !selectedMembers.includes(memberId));

    if (toAdd.length === 0 && toRemove.length === 0) {
      return;
    }

    await Promise.all(
      toAdd.map((memberId) => assignTask(id, memberId, user.id))
    );

    await Promise.all(
      toRemove.map(async (memberId) => {
        const assignment = existingAssignments.find(
          (a) => a.assignedTo === memberId && a.status !== "rejected"
        );
        if (assignment) {
          await deleteTaskAssignment(id, assignment.id, user?.id);
        }
      })
    );
  };

  const handleApproveTask = async () => {
    if (!taskId || !user?.id) return;
    try {
      await approveTask(taskId, user.id);
      toast.success("Görev onaylandı ve tamamlandı");
      onSuccess?.(taskId);
    } catch (error: any) {
      toast.error("Onaylama işlemi başarısız: " + error.message);
    }
  };

  const handleRejectTask = async () => {
    if (!taskId || !user?.id) return;
    try {
      await rejectTaskApproval(taskId, user.id);
      toast.success("Görev onayı reddedildi");
      onSuccess?.(taskId);
    } catch (error: any) {
      toast.error("Reddetme işlemi başarısız: " + error.message);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error("Kullanıcı oturumu bulunamadı");
      return;
    }

    if (!title.trim()) {
      toast.error("Görev başlığı gereklidir");
      return;
    }

    setSaving(true);

    try {
      const parsedDueDate = dueDate ? Timestamp.fromDate(new Date(dueDate)) : null;

      // Gizli görev için proje kontrolü
      // Proje detay sayfasındayken (projectId prop'u varsa), otomatik olarak o projeyi kullan
      // Eğer kullanıcı başka bir proje seçmişse, onu kullan
      let finalProjectId = selectedProjectId || projectId || null;
      
      // Proje detay sayfasındayken ve proje seçilmemişse, otomatik olarak projectId prop'unu kullan
      if (projectId && !selectedProjectId && !onlyInMyTasks) {
        finalProjectId = projectId;
      }
      
      // Gizli projelere gizli olmayan görevlerin atanmasını engelle
      // Eğer proje gizliyse, otomatik olarak görevi de gizli yap
      let finalIsPrivate = isPrivate;
      if (finalProjectId) {
        const selectedProject = projects.find(p => p.id === finalProjectId);
        if (selectedProject?.isPrivate) {
          // Gizli projelere sadece gizli görevler atanabilir - otomatik olarak gizli yap
          if (!isPrivate && !onlyInMyTasks) {
            finalIsPrivate = true;
            // Uyarı verme, otomatik olarak gizli yapıldı
          }
        }
      }
      
      // Gizli görevler için proje seçimi zorunlu ve sadece gizli projelere atanabilir
      if (finalIsPrivate) {
        if (!finalProjectId) {
          toast.error("Gizli görevler için bir gizli proje seçmelisiniz. Lütfen önce bir gizli proje oluşturun.");
          setSaving(false);
          return;
        }
        // Gizli görevlerin gizli olmayan projelere atanmasını engelle
        const selectedProject = projects.find(p => p.id === finalProjectId);
        if (selectedProject && !selectedProject.isPrivate) {
          toast.error("Gizli görevler sadece gizli projelere atanabilir. Lütfen bir gizli proje seçin.");
          setSaving(false);
          return;
        }
      }

      // Proje seçimi zorunlu (gizli görevler ve "Sadece Benim Görevlerim" görevleri hariç)
      // Proje detay sayfasındayken (projectId prop'u varsa), otomatik olarak o projeye atanır
      if (!finalProjectId || finalProjectId === "general") {
        if (!isPrivate && !onlyInMyTasks && !projectId) {
          toast.error("Lütfen bir proje seçin. Her görevin bir projesi olmalıdır.");
          setSaving(false);
          return;
        }
      }

      if (isEdit) {
        if (!taskId) {
          throw new Error("Görev seçilemedi");
        }

        await updateTask(
          taskId,
          {
            title: title.trim(),
            description: description.trim() || null,
            dueDate: parsedDueDate,
            projectId: finalProjectId || null,
            isPrivate: finalIsPrivate,
          },
          user.id
        );

        await syncAssignments(taskId);

        // Eğer checklist yoksa ve yeni maddeler varsa oluştur
        // Yetki kontrolü: Sadece atanan kullanıcılar ve adminler checklist oluşturabilir
        if (!activeChecklistId && checklistItems.length > 0) {
          const canInteract = isAdmin || (user?.id && selectedMembers.includes(user.id));
          if (canInteract) {
            const newChecklist = await createChecklist(
              taskId,
              "Checklist",
              checklistItems.map((item) => ({
                text: item.text,
                completed: !!item.completed,
                updatedAt: Timestamp.now(),
              }))
            );
            setActiveChecklistId(newChecklist.id);
          } else {
            const { showPermissionErrorToast } = await import("@/utils/toastHelpers");
            showPermissionErrorToast("create", "checklist");
          }
        }

        toast.success("Görev güncellendi");
        onSuccess?.(taskId);
        return;
      }

      const task = await createTask({
        title: title.trim(),
        description: description.trim() || null,
        status: defaultStatus,
        priority: 2,
        dueDate: parsedDueDate,
        labels: null,
        projectId: onlyInMyTasks ? null : (finalProjectId || null),
        productionOrderId: null,
        productionProcessId: null,
        createdBy: user.id,
        isInPool: isTaskInPool,
        poolRequests: [],
        isPrivate: onlyInMyTasks ? true : finalIsPrivate, // Sadece benim görevlerim görevleri otomatik gizli
        onlyInMyTasks: onlyInMyTasks,
      });

      if (!task?.id) {
        throw new Error("Görev oluşturulamadı");
      }

      const createdTaskId = task.id;

      if (selectedMembers.length > 0) {
        await Promise.all(
          selectedMembers.map((memberId) => assignTask(createdTaskId, memberId, user.id))
        );
      }

      if (checklistItems.length > 0) {
        await createChecklist(
          createdTaskId,
          "Checklist",
          checklistItems.map((item) => ({ text: item.text }))
        );
      }

      // Sadece link tipi ekleri oluştur, dosya ekleri create modunda desteklenmiyor (önce task oluşmalı)
      if (attachments.length > 0) {
        const links = attachments.filter(a => a.type === "drive_link");
        if (links.length > 0) {
          await Promise.all(
            links.map((link) =>
              addTaskAttachment(createdTaskId, {
                name: link.label,
                url: link.url,
                type: "drive_link",
                attachmentType: "drive_link",
                driveLink: link.url,
                size: 0,
                uploadedBy: user.id,
              })
            )
          );
        }
      }

      toast.success("Görev oluşturuldu");
      resetState();
      onSuccess?.(createdTaskId);
    } catch (error: any) {
      console.error("Task inline form submit error:", error);
      toast.error(error?.message || "Görev kaydedilirken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      className={cn(
        "w-full border-primary/30 bg-muted/20 p-4 sm:p-6 space-y-4 shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        {saving && (
          <div className="flex justify-end mb-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Form verileri yükleniyor...
        </div>
      ) : (
        <>
          {approvalStatus === "pending" && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-yellow-900">Onay Bekliyor</h4>
                  <p className="text-sm text-yellow-700">
                    Bu görev tamamlandı olarak işaretlendi ve onayınızı bekliyor.
                  </p>
                </div>
                {(isAdmin || isTeamLeader || (user?.id && taskCreatorId === user.id)) && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none border-yellow-300 text-yellow-900 hover:bg-yellow-100"
                      onClick={handleRejectTask}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reddet
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none bg-yellow-600 hover:bg-yellow-700 text-white border-none"
                      onClick={handleApproveTask}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Onayla
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Görev Başlığı *</Label>
              <Input
                placeholder="Görev başlığı"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isRestrictedUser}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Bitiş Tarihi</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isRestrictedUser}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm sm:text-base">
              Proje {!showOnlyInMyTasks && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={selectedProjectId || ""}
              onValueChange={async (value) => {
                if (value === "__create_project__") {
                  // Proje oluşturma sayfasına git, sonra geri dön
                  const currentPath = window.location.pathname;
                  const currentSearch = window.location.search;
                  navigate("/projects?returnTo=" + encodeURIComponent(currentPath + currentSearch));
                  return;
                }
                setSelectedProjectId(value);
                // Seçilen proje gizli ise görev de otomatik gizli olmalı
                const selectedProject = projects.find(p => p.id === value);
                if (selectedProject?.isPrivate) {
                  setIsPrivate(true);
                  // Gizli proje seçildiyse, sadece gizli projeleri göster
                  // Projeleri yeniden yükle
                  loadProjects();
                } else {
                  // Gizli olmayan proje seçildiyse, tüm projeleri göster
                  loadProjects();
                }
              }}
              disabled={isRestrictedUser || (!isEdit && !canSelectProject) || onlyInMyTasks}
            >
              <SelectTrigger>
                <SelectValue placeholder="Proje seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  // Eğer gizli görev seçildiyse veya gizli proje seçildiyse, sadece gizli projeleri göster
                  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
                  let filteredProjects = projects;
                  
                  if (isPrivate) {
                    // Gizli görev seçildiyse, sadece gizli projeleri göster
                    // ANCAK: Mevcut seçili proje gizli değilse bile, kullanıcının erişebildiği tüm gizli projeleri göstermeliyiz
                    // projects listesi zaten kullanıcının yetkisine göre filtrelenmiş olarak geliyor (loadProjects fonksiyonunda)
                    // Bu yüzden projects içindeki isPrivate olanları filtrelemek yeterli
                    filteredProjects = projects.filter(p => p.isPrivate);
                    
                    // Eğer liste boşsa ve mevcut seçili proje varsa onu ekle (listede görünmesi için)
                    if (filteredProjects.length === 0 && selectedProject?.isPrivate) {
                      filteredProjects = [selectedProject];
                    }
                  } else if (selectedProject?.isPrivate) {
                    // Gizli proje seçildiyse, sadece gizli projeleri göster
                    filteredProjects = projects.filter(p => p.isPrivate);
                  }
                  
                  return (
                    <div className="max-h-[300px] overflow-y-auto overflow-x-hidden scroll-smooth" 
                         style={{ 
                           height: 'auto', 
                           maxHeight: '300px',
                           scrollPaddingBlock: '10px'
                         }}>
                      {filteredProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                      <div className="border-t border-border mt-1 pt-1">
                        <SelectItem 
                          value="__create_project__" 
                          className="text-primary font-medium cursor-pointer"
                        >
                          <Plus className="h-4 w-4 mr-2 inline" />
                          Yeni Proje Ekle
                        </SelectItem>
                      </div>
                    </div>
                  );
                })()}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Açıklama</Label>
            <Textarea
              rows={3}
              placeholder="Görev açıklaması"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isRestrictedUser}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm sm:text-base">Görev Üyeleri</Label>
            <UserMultiSelect
              selectedUsers={selectedMembers}
              onSelectionChange={setSelectedMembers}
              disabled={isRestrictedUser}
            />
            <div className="flex flex-col gap-2 pt-2">
              {!isEdit && (
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="pool-mode" 
                    checked={isTaskInPool}
                    onCheckedChange={(checked) => setIsTaskInPool(checked as boolean)}
                  />
                  <Label htmlFor="pool-mode" className="text-sm font-normal cursor-pointer text-muted-foreground">
                    Bu görevi Görev Havuzuna gönder (Atama yapılsa bile havuzda görünür)
                  </Label>
                </div>
              )}
              
              {/* Sadece Benim Görevlerim Sayfasında Göster */}
              {showOnlyInMyTasks && !isEdit && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="only-my-tasks-inline"
                    checked={onlyInMyTasks}
                    onCheckedChange={(checked) => {
                      setOnlyInMyTasks(checked as boolean);
                      if (checked) {
                        // Sadece benim görevlerim seçildiğinde proje seçimini temizle ve gizli yap
                        setSelectedProjectId(null);
                        setIsPrivate(true);
                      }
                    }}
                  />
                  <Label htmlFor="only-my-tasks-inline" className="text-sm font-normal cursor-pointer text-muted-foreground">
                    Sadece "Benim Görevlerim" sayfasında göster (Sadece ben görebilirim)
                  </Label>
                </div>
              )}
              
              {/* Gizlilik Ayarı */}
              {!onlyInMyTasks && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="private-task-inline"
                      checked={isPrivate}
                      disabled={selectedProjectId && projects.find(p => p.id === selectedProjectId)?.isPrivate}
                      onCheckedChange={async (checked) => {
                        // Gizli projede görev oluştururken checkbox disabled olduğu için bu fonksiyon çalışmayacak
                        // Ama yine de güvenlik için kontrol ekliyoruz
                        const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
                        
                        // Eğer proje gizli ise, checkbox zaten disabled olduğu için buraya gelmemeli
                        if (selectedProject?.isPrivate) {
                          return; // Gizli projede değişiklik yapılamaz
                        }
                        
                        setIsPrivate(checked as boolean);
                        
                        // Gizlilik seçildiğinde, eğer seçili proje gizli değilse proje seçimini sıfırla
                        if (checked && selectedProjectId && !selectedProject?.isPrivate) {
                          setSelectedProjectId(null);
                          // Projeleri yeniden yükle (sadece gizli projeleri göstermek için)
                          loadProjects();
                        }
                      }}
                    />
                    <Label 
                      htmlFor="private-task-inline" 
                      className={cn(
                        "text-sm font-normal text-muted-foreground flex items-center gap-1",
                        selectedProjectId && projects.find(p => p.id === selectedProjectId)?.isPrivate 
                          ? "cursor-default" 
                          : "cursor-pointer"
                      )}
                    >
                      <Lock className="h-3 w-3" />
                      Gizli Görev (Sadece atanan kişiler görebilir)
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isRestrictedUser && !approvalStatus && (
            <div className="flex justify-end mb-4">
              <Button 
                variant="outline" 
                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                onClick={async () => {
                  if (!taskId || !user?.id) return;
                  try {
                    // Tamamlandı isteği gönder
                    const { requestTaskApproval } = await import("@/services/firebase/taskService");
                    await requestTaskApproval(taskId, user.id);
                    toast.success("Görev tamamlandı olarak işaretlendi ve onay için yöneticiye gönderildi.");
                    onSuccess?.(taskId);
                  } catch (error: any) {
                    toast.error("İşlem başarısız: " + error.message);
                  }
                }}
              >
                <Check className="h-4 w-4 mr-2" />
                Görevi Tamamla (Onay İste)
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm sm:text-base">
              <ListChecks className="h-4 w-4" />
              Checklist
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Checklist maddesi"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" onClick={handleAddChecklistItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {checklistItems.length > 0 && (
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={!!item.completed}
                        onCheckedChange={() => handleToggleChecklistItem(item.id)}
                      />
                      <span className="text-sm">{item.text}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm sm:text-base">
              <Paperclip className="h-4 w-4" />
              Ekler (Dosya & Link)
            </Label>
            
            {/* Link Ekleme Alanı */}
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                placeholder="Link adı"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
              />
              <Input
                placeholder="https://..."
                className="sm:col-span-2"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLink();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleAddLink}>
                <LinkIcon className="h-4 w-4 mr-1" />
                Link Ekle
              </Button>
              
              {/* Dosya Yükleme Butonu (Sadece Edit modunda) */}
              {isEdit && (
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
                    Dosya Yükle
                  </Button>
                </div>
              )}
              {!isEdit && (
                <div title="Dosya yüklemek için önce görevi oluşturmalısınız" className="cursor-not-allowed opacity-50">
                  <Button type="button" variant="outline" size="sm" disabled>
                    <Paperclip className="h-4 w-4 mr-1" />
                    Dosya Yükle
                  </Button>
                </div>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="truncate flex items-center">
                      {att.type === "file" ? (
                        <Paperclip className="h-3 w-3 mr-2 text-muted-foreground" />
                      ) : (
                        <LinkIcon className="h-3 w-3 mr-2 text-muted-foreground" />
                      )}
                      <span className="font-medium">{att.label}</span>
                      <a 
                        href={att.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-muted-foreground ml-2 truncate inline-block max-w-[220px] align-middle hover:text-primary hover:underline"
                      >
                        {att.type === "file" ? "Dosyayı Aç" : att.url}
                      </a>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(att.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                onCancel();
                if (!isEdit) {
                  resetState();
                }
              }}
              disabled={saving}
            >
              Vazgeç
            </Button>
            {!isRestrictedUser && (
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Görevi Oluştur"}
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
};
