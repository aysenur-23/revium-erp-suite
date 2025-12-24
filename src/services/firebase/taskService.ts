/**
 * Firebase Task Service
 * Görev yönetimi işlemleri
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
  onSnapshot,
  Unsubscribe,
  QueryConstraint,
  FieldValue,
} from "firebase/firestore";
import { firestore, auth } from "@/lib/firebase";
import { logAudit } from "@/utils/auditLogger";
import { handlePermissionError, isPermissionError } from "@/utils/errorLogger";
import { createNotification, updateNotification } from "./notificationService";
import { getAllUsers, getUserProfile, UserProfile } from "./authService";
import { getDepartments } from "./departmentService";
import { getProjectById } from "./projectService";

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  attachmentType?: "file" | "drive_link"; // Dosya tipi
  driveLink?: string; // Google Drive linki
  storageProvider?: "firebase" | "google_drive";
  driveFileId?: string;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

export interface StatusHistoryEntry {
  status: "pending" | "in_progress" | "completed" | "cancelled";
  changedAt: Timestamp;
  changedBy: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: 1 | 2 | 3 | 4 | 5; // 1: low, 5: critical (eski sistemle uyumlu)
  dueDate?: Timestamp | null;
  projectId?: string | null; // Proje ID'si
  isPrivate?: boolean; // Gizli görev mi? (Sadece atananlar ve oluşturan görebilir)
  productionOrderId?: string | null;
  productionProcessId?: string | null;
  labels?: string[] | null;
  attachments?: TaskAttachment[] | null;
  assignedUsers?: string[] | null; // Atanan kullanıcı ID'leri (Firestore rules için)
  isInPool?: boolean; // Görev havuzunda mı?
  poolRequests?: string[]; // Görev havuzuna eklenmek isteyen kullanıcılar
  approvalStatus?: "pending" | "approved" | "rejected"; // Onay durumu
  approvalRequestedBy?: string; // Onay isteyen
  approvedBy?: string; // Onaylayan
  approvedAt?: Timestamp; // Onay tarihi
  rejectedBy?: string; // Reddeden
  rejectedAt?: Timestamp; // Reddetme tarihi
  rejectionReason?: string | null; // Reddetme nedeni
  isArchived?: boolean; // Arşivlendi mi?
  onlyInMyTasks?: boolean; // Sadece "Benim Görevlerim" sayfasında görünsün mü?
  statusHistory?: StatusHistoryEntry[]; // Aşama geçmişi
  statusUpdatedBy?: string; // Durum değiştiren kullanıcı
  statusUpdatedAt?: Timestamp | FieldValue; // Durum değişiklik tarihi
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  assignedTo: string;
  assignedBy: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  rejectionReason?: string | null;
  // Red onay/red sistemi
  rejectionApprovedBy?: string | null; // Reddi onaylayan (görevi veren)
  rejectionApprovedAt?: Timestamp | null; // Red onay tarihi
  rejectionRejectedBy?: string | null; // Reddi reddeden (görevi veren)
  rejectionRejectedAt?: Timestamp | null; // Red red tarihi
  rejectionRejectionReason?: string | null; // Reddi reddetme nedeni (görevi veren)
  notes?: string | null;
  assignedAt: Timestamp;
  acceptedAt?: Timestamp | null;
  completedAt?: Timestamp | null;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Timestamp;
  completedAt?: Timestamp | null;
}

export interface Checklist {
  id: string;
  taskId: string;
  title: string;
  items: ChecklistItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Tüm görevleri listele
 * Not: assignedTo filtresi için tüm task'ları alıp assignments'ları kontrol eder
 */
export const getTasks = async (filters?: {
  assignedTo?: string;
  createdBy?: string;
  status?: string;
  projectId?: string;
  productionOrderId?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
}): Promise<Task[]> => {
  try {
    const tasksRef = collection(firestore, "tasks");
    const buildQuery = (options?: { skipOrder?: boolean }) => {
      const constraints: QueryConstraint[] = [];
      if (!options?.skipOrder) {
        constraints.push(orderBy("createdAt", "desc"));
      }
      if (filters?.createdBy) {
        constraints.push(where("createdBy", "==", filters.createdBy));
      }
      if (filters?.status) {
        constraints.push(where("status", "==", filters.status));
      }
      if (filters?.projectId) {
        constraints.push(where("projectId", "==", filters.projectId));
      }
      if (filters?.productionOrderId) {
        constraints.push(where("productionOrderId", "==", filters.productionOrderId));
      }
      if (filters?.approvalStatus) {
        constraints.push(where("approvalStatus", "==", filters.approvalStatus));
      }
      // Performans için limit ekle (500 kayıt)
      constraints.push(limit(500));
      return constraints.length ? query(tasksRef, ...constraints) : query(tasksRef, limit(500));
    };

    let snapshot;
    try {
      snapshot = await getDocs(buildQuery());
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const requiresIndex = typeof errorMessage === "string" && errorMessage.includes("requires an index");

      if (requiresIndex) {
        if (import.meta.env.DEV) {
          console.warn(
            "⚠️ Firestore index gerekiyor, sıralama olmadan görevler getiriliyor. Index linki:",
            errorMessage.match(/https:\/\/[^\s]+/)?.[0] || "–"
          );
        }
        snapshot = await getDocs(buildQuery({ skipOrder: true }));
      } else {
        throw error;
      }
    }

    let tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];

    if (filters?.projectId) {
      // KRİTİK: Sadece bu projeye ait görevleri göster
      // projectId null, undefined veya farklı bir değer ise filtrelenmeli
      tasks = tasks
        .filter((task) => {
          // projectId kesin olarak eşleşmeli, null veya undefined olmamalı
          return task.projectId === filters.projectId && task.projectId !== null && task.projectId !== undefined;
        })
        .sort((a, b) => {
          const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
          return bTime - aTime;
        });
    }

    // assignedTo filtresi varsa, assignments'ları kontrol et
    if (filters?.assignedTo) {
      const tasksWithAssignments = await Promise.all(
        tasks.map(async (task) => {
          // Gizli görev kontrolü
          if (task.isPrivate) {
            // Eğer task oluşturan kişiyse görebilir
            if (task.createdBy === filters.assignedTo) return task;
            
            // Eğer atanan kişiyse görebilir
            const assignments = await getTaskAssignments(task.id);
            const hasAssignment = assignments.some(
              (a) => a.assignedTo === filters.assignedTo && a.status !== "rejected"
            );
            return hasAssignment ? task : null;
          }
          
          // Normal görevler için assignment kontrolü
          const assignments = await getTaskAssignments(task.id);
          const hasAssignment = assignments.some(
            (a) => a.assignedTo === filters.assignedTo && a.status !== "rejected"
          );
          return hasAssignment ? task : null;
        })
      );
      tasks = tasksWithAssignments.filter((t) => t !== null) as Task[];
    } else {
      // Eğer assignedTo filtresi yoksa (genel liste), gizli görevleri ve onlyInMyTasks görevlerini filtrele
      // Bu durumda auth.currentUser kullanılmalı ama parametre olarak gelmiyor
      // Güvenlik kuralları zaten Firestore tarafında olmalı ama client-side filtreleme de yapalım
      const currentUserId = auth?.currentUser?.uid;
      if (currentUserId) {
         // Personnel kullanıcıları için özel kontrol
         let isPersonnel = false;
         try {
           const userProfile = await getUserProfile(currentUserId);
           if (userProfile?.role) {
             isPersonnel = userProfile.role.includes("personnel") && 
                          !userProfile.role.includes("super_admin") && 
                          !userProfile.role.includes("main_admin") &&
                          !userProfile.role.includes("team_leader");
           }
         } catch (error: unknown) {
           if (import.meta.env.DEV) {
             console.error("Error checking user role:", error);
           }
         }

         tasks = await Promise.all(tasks.map(async (task) => {
           // Personnel kullanıcıları sadece atanan görevleri görebilir
           if (isPersonnel) {
             // Gizli olmayan görevleri görebilir (ama sadece atananlar)
             if (!task.isPrivate) {
               // Gizli olmayan görevler için assignment kontrolü yap
               const assignments = await getTaskAssignments(task.id);
               const isAssigned = assignments.some(a => a.assignedTo === currentUserId && a.status !== "rejected");
               // assignedUsers array'inde de kontrol et
               const isInAssignedUsers = Array.isArray(task.assignedUsers) && task.assignedUsers.includes(currentUserId);
               return (isAssigned || isInAssignedUsers) ? task : null;
             } else {
               // Gizli görevler için: sadece atananlar görebilir
               const assignments = await getTaskAssignments(task.id);
               const isAssigned = assignments.some(a => a.assignedTo === currentUserId && a.status !== "rejected");
               const isInAssignedUsers = Array.isArray(task.assignedUsers) && task.assignedUsers.includes(currentUserId);
               return (isAssigned || isInAssignedUsers) ? task : null;
             }
           }

           // Diğer kullanıcılar için normal filtreleme
           // onlyInMyTasks görevleri sadece oluşturan görebilir, diğer listelerde görünmez
           if (task.onlyInMyTasks) {
             return task.createdBy === currentUserId ? task : null;
           }
           
           // Gizli görevler için canViewPrivateTask kontrolü
           if (task.isPrivate) {
             const { getUserProfile } = await import("./authService");
             const userProfile = await getUserProfile(currentUserId);
             if (userProfile) {
               const { canViewPrivateTask } = await import("@/utils/permissions");
               const assignments = await getTaskAssignments(task.id);
               const assignedUserIds = assignments
                 .filter((a) => a.status === "accepted" || a.status === "pending")
                 .map((a) => a.assignedTo);
               const canView = await canViewPrivateTask(task, userProfile, assignedUserIds);
               return canView ? task : null;
             }
             return null;
           }
           
           return task;
         })).then(results => results.filter(t => t !== null) as Task[]);
      } else {
        // Kullanıcı yoksa onlyInMyTasks görevlerini filtrele
        tasks = tasks.filter(task => !task.onlyInMyTasks);
      }
    }

    return tasks;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Get tasks error:", error);
    }
    if (isPermissionError(error)) {
      throw handlePermissionError(error, {
        operation: "read",
        collection: "tasks",
        userId: auth?.currentUser?.uid,
      });
    }
    throw error;
  }
};

/**
 * Görevleri gerçek zamanlı olarak dinle
 * @param filters Görev filtreleri
 * @param callback Görevler değiştiğinde çağrılacak callback
 * @returns Unsubscribe fonksiyonu
 */
export const subscribeToTasks = (
  filters: {
    assignedTo?: string;
    createdBy?: string;
    status?: string;
    projectId?: string;
    productionOrderId?: string;
    approvalStatus?: "pending" | "approved" | "rejected";
  } = {},
  callback: (tasks: Task[]) => void
): Unsubscribe => {
  try {
    const tasksRef = collection(firestore, "tasks");
    const buildQuery = (options?: { skipOrder?: boolean }) => {
      const constraints: QueryConstraint[] = [];
      if (!options?.skipOrder) {
        constraints.push(orderBy("createdAt", "desc"));
      }
      if (filters?.createdBy) {
        constraints.push(where("createdBy", "==", filters.createdBy));
      }
      if (filters?.status) {
        constraints.push(where("status", "==", filters.status));
      }
      if (filters?.projectId) {
        constraints.push(where("projectId", "==", filters.projectId));
      }
      if (filters?.productionOrderId) {
        constraints.push(where("productionOrderId", "==", filters.productionOrderId));
      }
      if (filters?.approvalStatus) {
        constraints.push(where("approvalStatus", "==", filters.approvalStatus));
      }
      // Performans için limit ekle (500 kayıt)
      constraints.push(limit(500));
      return constraints.length ? query(tasksRef, ...constraints) : query(tasksRef, limit(500));
    };

    let q = buildQuery();
    
    // onSnapshot ile gerçek zamanlı dinleme
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          let tasks = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Task[];

          // projectId filtresi zaten server-side'da uygulanıyor, client-side filtreleme gereksiz

          // assignedTo filtresi varsa, assignments'ları kontrol et
          if (filters?.assignedTo) {
            const tasksWithAssignments = await Promise.all(
              tasks.map(async (task) => {
                // Gizli görev kontrolü
                if (task.isPrivate) {
                  if (task.createdBy === filters.assignedTo) return task;
                  
                  const assignments = await getTaskAssignments(task.id);
                  const hasAssignment = assignments.some(
                    (a) => a.assignedTo === filters.assignedTo && a.status !== "rejected"
                  );
                  return hasAssignment ? task : null;
                }
                
                // Normal görevler için assignment kontrolü
                const assignments = await getTaskAssignments(task.id);
                const hasAssignment = assignments.some(
                  (a) => a.assignedTo === filters.assignedTo && a.status !== "rejected"
                );
                return hasAssignment ? task : null;
              })
            );
            tasks = tasksWithAssignments.filter((t) => t !== null) as Task[];
          } else {
            // assignedTo filtresi yoksa, gizli görevleri ve onlyInMyTasks görevlerini filtrele
            const currentUserId = auth?.currentUser?.uid;
            if (currentUserId) {
              tasks = await Promise.all(tasks.map(async (task) => {
                // onlyInMyTasks görevleri sadece oluşturan görebilir
                if (task.onlyInMyTasks) {
                  return task.createdBy === currentUserId ? task : null;
                }
                
                if (!task.isPrivate) return task;
                
                if (task.createdBy === currentUserId) return task;
                
                const assignments = await getTaskAssignments(task.id);
                const isAssigned = assignments.some(a => a.assignedTo === currentUserId);
                
                return isAssigned ? task : null;
              })).then(results => results.filter(t => t !== null) as Task[]);
            } else {
              // Kullanıcı yoksa onlyInMyTasks görevlerini filtrele
              tasks = tasks.filter(task => !task.onlyInMyTasks);
            }
          }

          callback(tasks);
        } catch (error: unknown) {
          if (import.meta.env.DEV) {
            console.error("Subscribe to tasks error:", error);
          }
          // Hata durumunda boş array gönder
          callback([]);
        }
      },
      (error) => {
        // 404 ve network hatalarını sessizce handle et (Firestore otomatik yeniden bağlanacak)
        // Production'da da sessizce handle et - bu normal Firestore long-polling davranışı
        if (error?.code === 'unavailable' || 
            error?.code === 'not-found' ||
            error?.message?.includes('404') || 
            error?.message?.includes('network') ||
            error?.message?.includes('transport errored')) {
          // Sessizce handle et - Firestore otomatik olarak yeniden bağlanacak
          // Production'da console'a yazma (performans ve gürültü azaltma)
          callback([]);
          return;
        }
        
        // Sadece gerçek hataları logla
        if (import.meta.env.DEV) {
          console.error("Tasks snapshot error:", error);
        }
        // Hata durumunda boş array gönder (uygulama çökmesin)
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Subscribe to tasks setup error:", error);
    }
    // Hata durumunda boş unsubscribe fonksiyonu döndür
    return () => {};
  }
};

/**
 * Görev detayını al
 */
export const getTaskById = async (taskId: string): Promise<Task | null> => {
  try {
    const taskDoc = await getDoc(doc(firestore, "tasks", taskId));
    
    if (!taskDoc.exists()) {
      return null;
    }

    return {
      id: taskDoc.id,
      ...taskDoc.data(),
    } as Task;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Get task by id error:", error);
    }
    if (isPermissionError(error)) {
      throw handlePermissionError(error, {
        operation: "read",
        collection: "tasks",
        documentId: taskId,
        userId: auth?.currentUser?.uid,
      });
    }
    throw error;
  }
};

/**
 * Yeni görev oluştur
 */
export const createTask = async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<Task> => {
  try {
    // Projeye görev ekleme yetkisi kontrolü
    if (taskData.projectId) {
      const { getProjectById } = await import("@/services/firebase/projectService");
      const { getUserProfile } = await import("@/services/firebase/authService");
      const { canCreateTask, canEditProject } = await import("@/utils/permissions");
      
      const project = await getProjectById(taskData.projectId);
      if (project) {
        const userProfile = await getUserProfile(taskData.createdBy);
        if (userProfile) {
          // Görev oluşturma yetkisi kontrolü
          const canCreate = await canCreateTask(userProfile, []);
          if (!canCreate) {
            throw new Error("Görev oluşturma yetkiniz yok. Sadece yöneticiler ve ekip liderleri görev oluşturabilir.");
          }
          
          // Proje sahibi kontrolü - ekip lideri veya admin değilse, sadece proje sahibi görev ekleyebilir
          const canEdit = await canEditProject(project, userProfile);
          if (!canEdit && project.createdBy !== taskData.createdBy) {
            throw new Error("Bu projeye görev ekleme yetkiniz yok. Sadece proje sahibi, yöneticiler veya ekip liderleri görev ekleyebilir.");
          }
        }
      }
    }
    
    const taskDoc: Partial<Task> & { createdAt: FieldValue | Timestamp; updatedAt: FieldValue | Timestamp } = {
      ...taskData,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };
    
    // dueDate'i Timestamp'e çevir
    if (taskData.dueDate !== undefined && taskData.dueDate !== null) {
      if (taskData.dueDate instanceof Date) {
        taskDoc.dueDate = Timestamp.fromDate(taskData.dueDate);
      } else if (typeof taskData.dueDate === 'string') {
        taskDoc.dueDate = Timestamp.fromDate(new Date(taskData.dueDate));
      }
    } else {
      taskDoc.dueDate = null;
    }
    
    const docRef = await addDoc(collection(firestore, "tasks"), taskDoc);

    const createdTask = await getTaskById(docRef.id);
    if (!createdTask) {
      throw new Error("Görev oluşturulamadı");
    }

    // Audit log
    await logAudit("CREATE", "tasks", docRef.id, taskData.createdBy, null, createdTask);

    // Aktivite log ekle
    if (taskData.createdBy) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(taskData.createdBy);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        await addTaskActivity(
          docRef.id,
          taskData.createdBy,
          "created",
          `bu görevi oluşturdu`,
          { taskTitle: createdTask.title },
          userName,
          userEmail
        );
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Add task activity error:", error);
        }
      }
    }

    // Görev oluşturulduğunda ekip liderlerine bildirim gönder
    try {
      const teamLeaders = await getTaskTeamLeaders(createdTask);
      const { createNotification } = await import("@/services/firebase/notificationService");
      const { getUserProfile } = await import("@/services/firebase/authService");
      const creatorProfile = await getUserProfile(taskData.createdBy);
      const creatorName = creatorProfile?.fullName || creatorProfile?.displayName || creatorProfile?.email || "Bir kullanıcı";
      
      await Promise.all(
        teamLeaders.map(async (leaderId) => {
          try {
            // Görevi oluşturan kişi ekip lideri ise bildirim gönderme
            if (leaderId === taskData.createdBy) return;
            
            await createNotification({
              userId: leaderId,
              type: "task_created",
              title: "Yeni görev oluşturuldu",
              message: `${creatorName} kullanıcısı tarafından "${createdTask.title}" başlıklı yeni bir görev oluşturuldu.\n\nYeni görev sisteme eklendi. Görev detaylarını görüntülemek için bildirime tıklayabilirsiniz.\n\nOluşturulma Zamanı: ${new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
              read: false,
              relatedId: docRef.id,
              metadata: { createdBy: taskData.createdBy },
            });
          } catch (notifError) {
            if (import.meta.env.DEV) {
              console.error("Error sending task creation notification to team leader:", leaderId, notifError);
            }
          }
        })
      );
    } catch (notifError) {
      if (import.meta.env.DEV) {
        console.error("Error sending task creation notifications:", notifError);
      }
      // Bildirim hatası görev oluşturmayı engellemez
    }

    return createdTask;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Create task error:", error);
    }
    if (isPermissionError(error)) {
      throw handlePermissionError(error, {
        operation: "create",
        collection: "tasks",
        userId: taskData.createdBy,
        data: taskData,
      });
    }
    throw error;
  }
};

/**
 * Görevin ekip liderlerini bul
 */
const getTaskTeamLeaders = async (task: Task | null): Promise<string[]> => {
  if (!task) return [];
  
  try {
    const departments = await getDepartments();
    const teamLeaderIds: string[] = [];
    
    // Görevi oluşturan kişinin ekibini bul
    if (task.createdBy) {
      const creatorProfile = await getUserProfile(task.createdBy);
      if (creatorProfile?.approvedTeams && creatorProfile.approvedTeams.length > 0) {
        for (const teamId of creatorProfile.approvedTeams) {
          const dept = departments.find(d => d.id === teamId);
          if (dept?.managerId && !teamLeaderIds.includes(dept.managerId)) {
            teamLeaderIds.push(dept.managerId);
          }
        }
      }
    }
    
    // Proje varsa projenin ekibini kontrol et
    if (task.projectId) {
      try {
        const project = await getProjectById(task.projectId);
        // Projelerde şimdilik departmentId yok, bu yüzden sadece creator'ın ekibini kullanıyoruz
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Error fetching project:", error);
        }
      }
    }
    
    return teamLeaderIds;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error getting team leaders:", error);
    }
    return [];
  }
};

/**
 * Görevi güncelle
 */
export const updateTask = async (
  taskId: string,
  updates: Partial<Omit<Task, "id" | "createdAt" | "createdBy">>,
  userId?: string
): Promise<void> => {
  try {
    // Eski veriyi al
    const oldTask = await getTaskById(taskId);
    if (!oldTask) {
      throw new Error("Görev bulunamadı");
    }
    
    // Yetki kontrolü - sadece içerik güncellemeleri için (status, approvalStatus gibi alanlar için değil)
    const isContentUpdate = updates.title !== undefined || 
                            updates.description !== undefined || 
                            updates.priority !== undefined || 
                            updates.dueDate !== undefined || 
                            updates.labels !== undefined ||
                            updates.projectId !== undefined ||
                            updates.isPrivate !== undefined;
    
    if (isContentUpdate && userId) {
      const { getUserProfile } = await import("@/services/firebase/authService");
      const { canEditTask } = await import("@/utils/permissions");
      const userProfile = await getUserProfile(userId);
      
      if (!userProfile) {
        throw new Error("Kullanıcı profili bulunamadı");
      }
      
      const canEdit = await canEditTask(oldTask, userProfile);
      if (!canEdit) {
        throw new Error("Bu görevi düzenlemek için yetkiniz yok. Sadece yöneticiler, ekip liderleri veya görevi oluşturan kişi düzenleyebilir.");
      }
    }
    
    const updateData: Partial<Task> & { updatedAt: FieldValue | Timestamp } = {
      ...updates,
      updatedAt: serverTimestamp() as any,
    };
    
    // dueDate'i Timestamp'e çevir
    if (updates.dueDate !== undefined) {
      if (updates.dueDate === null) {
        updateData.dueDate = null;
      } else if (updates.dueDate instanceof Date) {
        updateData.dueDate = Timestamp.fromDate(updates.dueDate);
      }
    }
    
    await updateDoc(doc(firestore, "tasks", taskId), updateData);
    
    // Yeni veriyi al
    const newTask = await getTaskById(taskId);
    
    // Audit log
    if (userId) {
      await logAudit("UPDATE", "tasks", taskId, userId, oldTask, newTask);
    }

    // Aktivite log ekle
    if (userId && oldTask && newTask) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(userId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;

        const changedFields = Object.keys(updates).filter(key => {
          const oldValue = (oldTask as unknown as Record<string, unknown>)[key];
          const newValue = (updates as Record<string, unknown>)[key];
          return oldValue !== newValue;
        });
        
        if (changedFields.length > 0) {
          await addTaskActivity(
            taskId,
            userId,
            "updated",
            `bu görevi güncelledi`,
            { changedFields, taskTitle: newTask.title },
            userName,
            userEmail
          );
        }
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Add task activity error:", error);
        }
      }
    }

    // Görev güncellemelerinde atanan kullanıcılara bildirim gönder
    if (newTask && userId) {
      try {
        const assignments = await getTaskAssignments(taskId);
        const allUsers = await getAllUsers();
        const updaterUser = allUsers.find(u => u.id === userId);
        
        // Atanan kullanıcılara bildirim gönder (güncelleyen kişi hariç)
        const assignedUserIds = assignments
          .filter(a => a.status === "accepted" || a.status === "pending")
          .map(a => a.assignedTo)
          .filter(id => id !== userId);
        
        await Promise.all(
          assignedUserIds.map(async (assignedUserId) => {
            try {
              await createNotification({
                userId: assignedUserId,
                type: "task_updated",
                title: "Görev güncellendi",
                message: `${updaterUser?.fullName || updaterUser?.email || "Bir kullanıcı"} kullanıcısı tarafından "${newTask.title}" görevinde değişiklik yapıldı.\n\nGörev bilgileri güncellendi. Detayları görüntülemek için bildirime tıklayabilirsiniz.\n\nİşlem Zamanı: ${new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
                read: false,
                relatedId: taskId,
                metadata: null,
              });
            } catch (notifError) {
              console.error("Error sending notification to user:", assignedUserId, notifError);
            }
          })
        );
      } catch (notifError) {
        console.error("Error sending task update notifications:", notifError);
        // Bildirim hatası görev güncellemesini engellemez
      }
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Update task error:", error);
    }
    if (isPermissionError(error)) {
      throw handlePermissionError(error, {
        operation: "update",
        collection: "tasks",
        documentId: taskId,
        userId: userId || auth?.currentUser?.uid,
        data: updates,
      });
    }
    throw error;
  }
};

/**
 * Görev durumunu güncelle
 */
export const updateTaskStatus = async (
  taskId: string,
  status: "pending" | "in_progress" | "completed" | "cancelled"
): Promise<void> => {
  try {
    // Önce mevcut görevi al
    const task = await getTaskById(taskId);
    if (!task) {
      throw new Error("Görev bulunamadı");
    }

    const oldStatus = task.status;
    const currentUserId = auth?.currentUser?.uid;
    
    // Durumu güncelle
    const updateData: Partial<Task> & { status: Task["status"]; updatedAt: FieldValue | Timestamp } = {
      status,
      updatedAt: serverTimestamp() as any,
    };
    
    // Status değişikliği varsa statusUpdatedBy ve statusUpdatedAt ekle
    if (oldStatus !== status && currentUserId) {
      (updateData as Partial<Task>).statusUpdatedBy = currentUserId;
      (updateData as Partial<Task>).statusUpdatedAt = serverTimestamp() as any;
      
      // Aşama geçmişine yeni kayıt ekle
      const statusHistory: StatusHistoryEntry[] = task.statusHistory || [];
      statusHistory.push({
        status,
        changedAt: Timestamp.now(),
        changedBy: currentUserId,
      });
      updateData.statusHistory = statusHistory;
    }
    
    await updateDoc(doc(firestore, "tasks", taskId), updateData);

    // Audit log
    await logAudit("UPDATE", "tasks", taskId, auth?.currentUser?.uid || "system", { status: oldStatus }, { status });

    // Aktivite log ekle (durum değişikliği)
    if (oldStatus !== status && currentUserId) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(currentUserId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        const statusNames: Record<string, string> = {
          pending: "Beklemede",
          in_progress: "Devam Ediyor",
          completed: "Tamamlandı",
          cancelled: "İptal Edildi"
        };
        
        const oldStatusName = statusNames[oldStatus] || oldStatus;
        const newStatusName = statusNames[status] || status;
        
        await addTaskActivity(
          taskId,
          currentUserId,
          "status_changed",
          `görev durumunu "${oldStatusName}" → "${newStatusName}" olarak değiştirdi`,
          { oldStatus, newStatus: status, taskTitle: task.title },
          userName,
          userEmail
        );
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Add task activity error:", error);
        }
      }
    }

    // Durum değişikliği bildirimleri gönder (sadece durum gerçekten değiştiyse)
    if (oldStatus !== status) {
      try {
        const assignments = await getTaskAssignments(taskId);
        const allUsers = await getAllUsers();
        const currentUser = auth?.currentUser;
        const changerUser = allUsers.find(u => u.id === currentUser?.uid);
        
        // Durum isimlerini Türkçe'ye çevir
        const statusNames: Record<string, string> = {
          pending: "Beklemede",
          in_progress: "Devam Ediyor",
          completed: "Tamamlandı",
          cancelled: "İptal Edildi"
        };

        const statusName = statusNames[status] || status;
        const oldStatusName = statusNames[oldStatus] || oldStatus;

        // Görevi oluşturan kişiye bildirim gönder (durum değiştiren kişi hariç)
        if (task.createdBy && task.createdBy !== currentUser?.uid) {
          try {
            const changeTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            await createNotification({
              userId: task.createdBy,
              type: "task_updated",
              title: "Görev durumu değişti",
              message: `${changerUser?.fullName || changerUser?.email || "Bir kullanıcı"} kullanıcısı tarafından "${task.title}" görevinin durumu "${oldStatusName}" durumundan "${statusName}" durumuna güncellendi.\n\nİşlem Zamanı: ${changeTime}`,
              read: false,
              relatedId: taskId,
              metadata: { 
                oldStatus, 
                newStatus: status,
                updatedAt: new Date(),
                priority: task.priority,
                dueDate: task.dueDate,
              },
            });
          } catch (notifError) {
            console.error("Error sending notification to task creator:", notifError);
          }
        }

        // Atanan kullanıcılara bildirim gönder (durum değiştiren kişi hariç)
        const assignedUserIds = assignments
          .filter(a => (a.status === "accepted" || a.status === "pending") && a.assignedTo !== currentUser?.uid)
          .map(a => a.assignedTo);

        await Promise.all(
          assignedUserIds.map(async (assignedUserId) => {
            try {
              const changeTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
              await createNotification({
                userId: assignedUserId,
                type: "task_updated",
                title: "Görev durumu değişti",
                message: `${changerUser?.fullName || changerUser?.email || "Bir kullanıcı"} tarafından "${task.title}" görevinin durumu "${oldStatusName}" durumundan "${statusName}" durumuna güncellendi.\n\nİşlem Zamanı: ${changeTime}`,
                read: false,
                relatedId: taskId,
                metadata: { 
                  oldStatus, 
                  newStatus: status,
                  updatedAt: new Date(),
                  priority: task.priority,
                  dueDate: task.dueDate,
                },
              });
            } catch (notifError) {
              console.error("Error sending notification to assigned user:", assignedUserId, notifError);
            }
          })
        );
      } catch (notifError) {
        console.error("Error sending task status change notifications:", notifError);
        // Bildirim hatası görev durumu güncellemesini engellemez
      }
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Update task status error:", error);
    }
    throw error;
  }
};

/**
 * Görevi sil
 */
export const deleteTask = async (taskId: string, userId?: string): Promise<void> => {
  try {
    // Eski veriyi al
    const oldTask = await getTaskById(taskId);
    if (!oldTask) {
      throw new Error("Görev bulunamadı");
    }
    
    // Yetki kontrolü
    if (userId) {
      const { getUserProfile } = await import("@/services/firebase/authService");
      const { canDeleteTask } = await import("@/utils/permissions");
      const userProfile = await getUserProfile(userId);
      
      if (!userProfile) {
        throw new Error("Kullanıcı profili bulunamadı");
      }
      
      const canDelete = await canDeleteTask(oldTask, userProfile);
      if (!canDelete) {
        throw new Error("Bu görevi silmek için yetkiniz yok. Sadece yöneticiler, ekip liderleri veya görevi oluşturan kişi silebilir.");
      }
    }
    
    // Aktivite log ekle (silmeden önce)
    if (userId && oldTask) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(userId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        await addTaskActivity(
          taskId,
          userId,
          "deleted",
          `bu görevi sildi`,
          { taskTitle: oldTask.title },
          userName,
          userEmail
        );
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Add task activity error:", error);
        }
      }
    }

    // Bildirim göndermek için gerekli bilgileri al
    let assignments: TaskAssignment[] = [];
    let allUsers: UserProfile[] = [];
    let deleterUser: UserProfile | undefined;
    
    try {
      assignments = await getTaskAssignments(taskId);
      allUsers = await getAllUsers();
      deleterUser = allUsers.find(u => u.id === userId);
    } catch (notifError) {
      console.error("Error fetching data for notifications:", notifError);
      // Bildirim hatası görev silinmesini engellemez
    }
    
    // Önce subcollection'ları sil (assignments, checklists, attachments)
    try {
      // Assignments'ları sil
      const assignmentsSnapshot = await getDocs(collection(firestore, "tasks", taskId, "assignments"));
      const deleteAssignmentsPromises = assignmentsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deleteAssignmentsPromises);
      
      // Checklists'leri sil
      const checklistsSnapshot = await getDocs(collection(firestore, "tasks", taskId, "checklists"));
      const deleteChecklistsPromises = checklistsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deleteChecklistsPromises);
      
      // Attachments'ları sil (eğer varsa)
      try {
        const attachmentsSnapshot = await getDocs(collection(firestore, "tasks", taskId, "attachments"));
        const deleteAttachmentsPromises = attachmentsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(deleteAttachmentsPromises);
      } catch (attachmentsError) {
        // Attachments collection'ı yoksa hata verme
        if (import.meta.env.DEV) {
          console.warn("Attachments collection not found or error:", attachmentsError);
        }
      }
    } catch (subcollectionError) {
      console.error("Error deleting subcollections:", subcollectionError);
      // Subcollection silme hatası görev silinmesini engellemez, devam et
    }
    
    // Ana görev document'ini sil
    await deleteDoc(doc(firestore, "tasks", taskId));
    
    // Audit log
    if (userId) {
      await logAudit("DELETE", "tasks", taskId, userId, oldTask, null);
    }
    
    // Bildirim gönder (görev silindikten sonra)
    try {
      const currentUser = auth?.currentUser;
      
      // Görevi oluşturan kişiye bildirim gönder (silen kişi hariç)
      if (oldTask.createdBy && oldTask.createdBy !== currentUser?.uid) {
        try {
          const deleteTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          await createNotification({
            userId: oldTask.createdBy,
            type: "task_deleted",
            title: "Görev silindi",
            message: `${deleterUser?.fullName || deleterUser?.email || "Bir kullanıcı"} kullanıcısı tarafından "${oldTask.title}" görevi silindi.\n\nGörev sistemden kalıcı olarak kaldırıldı. Bu işlem geri alınamaz.\n\nSilme Zamanı: ${deleteTime}`,
            read: false,
            relatedId: taskId,
            metadata: { 
              taskTitle: oldTask.title,
              updatedAt: new Date(),
            },
          });
        } catch (notifError) {
          console.error("Error sending notification to task creator:", notifError);
        }
      }
      
      // Atanan kullanıcılara bildirim gönder (silen kişi hariç)
      const assignedUserIds = assignments
        .filter(a => (a.status === "accepted" || a.status === "pending") && a.assignedTo !== currentUser?.uid)
        .map(a => a.assignedTo);
      
      await Promise.all(
        assignedUserIds.map(async (assignedUserId) => {
          try {
            const deleteTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            await createNotification({
              userId: assignedUserId,
              type: "task_deleted",
              title: "Görev silindi",
              message: `${deleterUser?.fullName || deleterUser?.email || "Bir kullanıcı"} kullanıcısı tarafından "${oldTask.title}" görevi silindi.\n\nGörev sistemden kalıcı olarak kaldırıldı. Bu işlem geri alınamaz.\n\nSilme Zamanı: ${deleteTime}`,
              read: false,
              relatedId: taskId,
              metadata: { 
                taskTitle: oldTask.title,
                updatedAt: new Date(),
              },
            });
          } catch (notifError) {
            console.error("Error sending notification to assigned user:", assignedUserId, notifError);
          }
        })
      );
    } catch (notifError) {
      console.error("Error sending task deletion notifications:", notifError);
      // Bildirim hatası görev silinmesini engellemez
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Delete task error:", error);
    }
    throw error;
  }
};

/**
 * Görev ataması yap
 */
export const assignTask = async (
  taskId: string,
  userId: string,
  assignedBy: string,
  notes?: string
): Promise<TaskAssignment> => {
  try {
    const assignmentData: Omit<TaskAssignment, "id"> = {
      taskId,
      assignedTo: userId,
      assignedBy,
      status: "pending",
      notes: notes || null,
      assignedAt: Timestamp.now(),
      acceptedAt: null,
      completedAt: null,
    };

    const docRef = await addDoc(
      collection(firestore, "tasks", taskId, "assignments"),
      assignmentData
    );

    // Task document'inde assignedUsers array'ini güncelle
    const taskRef = doc(firestore, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);
    if (taskSnap.exists()) {
      const taskData = taskSnap.data();
      const assignedUsers = taskData.assignedUsers || [];
      if (!assignedUsers.includes(userId)) {
        await updateDoc(taskRef, {
          assignedUsers: [...assignedUsers, userId],
        });
      }
    }

    try {
      const [task, assignerProfile] = await Promise.all([
        getTaskById(taskId),
        getUserProfile(assignedBy),
      ]);

      if (task) {
        // Görev detaylarını topla
        const taskDetails: string[] = [];
        if (task.description) {
          const desc = task.description.length > 100 ? task.description.substring(0, 100) + "..." : task.description;
          taskDetails.push(`Açıklama: ${desc}`);
        }
        if (task.priority) {
          const priorityLabels: Record<number, string> = { 1: "Düşük", 2: "Normal", 3: "Yüksek", 4: "Acil" };
          taskDetails.push(`Öncelik: ${priorityLabels[task.priority] || `Öncelik ${task.priority}`}`);
        }
        if (task.dueDate) {
          try {
            const dueDate = task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate);
            const formattedDate = dueDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            taskDetails.push(`Bitiş Tarihi: ${formattedDate}`);
          } catch {
            // Tarih formatı hatası durumunda sessizce devam et
          }
        }
        
        const detailsText = taskDetails.length > 0 ? `\n\nGörev Detayları:\n${taskDetails.join('\n')}` : '';
        
        await createNotification({
          userId,
          type: "task_assigned",
          title: "Yeni görev atandı",
          message: `${assignerProfile?.fullName || assignerProfile?.email || "Bir yönetici"} kullanıcısı tarafından size "${task.title}" başlıklı yeni bir görev atandı.${detailsText}\n\nGörevi kabul etmek veya reddetmek için bildirime tıklayabilirsiniz.`,
          read: false,
          relatedId: taskId,
          metadata: { 
            assignment_id: docRef.id,
            priority: task.priority,
            dueDate: task.dueDate,
            updatedAt: new Date(),
          },
        });
      }
    } catch (notifError) {
      // Bildirim hatası kritik değil, sessizce devam et
      // Uygulama akışını bozma
    }

    // Audit log
    await logAudit("CREATE", "task_assignments", docRef.id, assignedBy, null, assignmentData);

    return {
      id: docRef.id,
      ...assignmentData,
    };
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Assign task error:", error);
    }
    throw error;
  }
};

/**
 * Görev atamasını kabul et
 */
export const acceptTaskAssignment = async (taskId: string, assignmentId: string): Promise<void> => {
  try {
    await updateDoc(doc(firestore, "tasks", taskId, "assignments", assignmentId), {
      status: "accepted",
      acceptedAt: serverTimestamp(),
    });
    
    // Audit log
    const task = await getTaskById(taskId);
    await logAudit("UPDATE", "task_assignments", assignmentId, auth?.currentUser?.uid || "system", { status: "pending" }, { status: "accepted", taskId: taskId, taskTitle: task?.title });
    
    // Atanan kullanıcının bildirimini güncelle
    try {
      const assignment = await getDoc(doc(firestore, "tasks", taskId, "assignments", assignmentId));
      const assignmentData = assignment.data() as TaskAssignment;
      
      if (assignmentData) {
        // Atanan kullanıcının bildirimlerini bul ve güncelle
        const { getNotifications } = await import("./notificationService");
        const userNotifications = await getNotifications(assignmentData.assignedTo, { limit: 100 });
        
        // İlgili bildirimi bul: task_assigned tipinde, assignment_id metadata'sı eşleşen
        const relatedNotification = userNotifications.find((notif) => {
          if (notif.type !== "task_assigned" || notif.relatedId !== taskId) return false;
          const meta = notif.metadata;
          if (meta && typeof meta === "object" && "assignment_id" in meta) {
            return (meta as Record<string, unknown>).assignment_id === assignmentId;
          }
          return false;
        });
        
        if (relatedNotification) {
          // Bildirimi güncelle: action metadata ekle ve okundu işaretle
          const updatedMetadata = { 
            ...relatedNotification.metadata, 
            action: "accepted" 
          };
          await updateNotification(relatedNotification.id, {
            metadata: updatedMetadata,
            read: true
          });
        }
      }
    } catch (notifUpdateError) {
      console.error("Error updating assignment notification:", notifUpdateError);
      // Bildirim güncelleme hatası kabul işlemini engellemez
    }
    
    // Ekip liderlerine bildirim gönder
    try {
      const task = await getTaskById(taskId);
      const assignment = await getDoc(doc(firestore, "tasks", taskId, "assignments", assignmentId));
      const assignmentData = assignment.data() as TaskAssignment;
      
      if (task && assignmentData) {
        const teamLeaders = await getTaskTeamLeaders(task);
        const allUsers = await getAllUsers();
        const assignedUser = allUsers.find(u => u.id === assignmentData.assignedTo);
        
        await Promise.all(
          teamLeaders.map(async (leaderId) => {
            try {
              const acceptTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
              await createNotification({
                userId: leaderId,
                type: "task_assigned",
                title: "Görev kabul edildi",
                message: `${assignedUser?.fullName || assignedUser?.email || "Bir kullanıcı"} kullanıcısı "${task.title}" görevini kabul etti.\n\nGörev artık bu kullanıcının görev listesinde görünecek ve üzerinde çalışmaya başlayabilir.\n\nKabul Zamanı: ${acceptTime}`,
                read: false,
                relatedId: taskId,
                metadata: { 
                  assignment_id: assignmentId, 
                  action: "accepted",
                  updatedAt: new Date(),
                  priority: task.priority,
                  dueDate: task.dueDate,
                },
              });
            } catch (notifError) {
              console.error("Error sending notification to team leader:", leaderId, notifError);
            }
          })
        );
      }
    } catch (notifError) {
      console.error("Error sending acceptance notifications:", notifError);
      // Bildirim hatası kabul işlemini engellemez
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Accept task assignment error:", error);
    }
    throw error;
  }
};

/**
 * Görev atamasını reddet
 */
export const rejectTaskAssignment = async (
  taskId: string,
  assignmentId: string,
  reason: string
): Promise<void> => {
  try {
    // Red sebebi en az 20 karakter olmalı
    if (reason.trim().length < 20) {
      throw new Error("Red sebebi en az 20 karakter olmalıdır");
    }
    
    await updateDoc(doc(firestore, "tasks", taskId, "assignments", assignmentId), {
      status: "rejected",
      rejectionReason: reason.trim(),
    });
    
    // Audit log
    const task = await getTaskById(taskId);
    await logAudit("UPDATE", "task_assignments", assignmentId, auth?.currentUser?.uid || "system", { status: "pending" }, { status: "rejected", rejectionReason: reason.trim(), taskId: taskId, taskTitle: task?.title });
    
    // Atanan kullanıcının bildirimini güncelle
    try {
      const assignment = await getDoc(doc(firestore, "tasks", taskId, "assignments", assignmentId));
      const assignmentData = assignment.data() as TaskAssignment;
      
      if (assignmentData) {
        // Atanan kullanıcının bildirimlerini bul ve güncelle
        const { getNotifications } = await import("./notificationService");
        const userNotifications = await getNotifications(assignmentData.assignedTo, { limit: 100 });
        
        // İlgili bildirimi bul: task_assigned tipinde, assignment_id metadata'sı eşleşen
        const relatedNotification = userNotifications.find((notif) => {
          if (notif.type !== "task_assigned" || notif.relatedId !== taskId) return false;
          const meta = notif.metadata;
          if (meta && typeof meta === "object" && "assignment_id" in meta) {
            return (meta as Record<string, unknown>).assignment_id === assignmentId;
          }
          return false;
        });
        
        if (relatedNotification) {
          // Bildirimi güncelle: action metadata ekle ve okundu işaretle
          const updatedMetadata = { 
            ...relatedNotification.metadata, 
            action: "rejected" 
          };
          await updateNotification(relatedNotification.id, {
            metadata: updatedMetadata,
            read: true
          });
        }
      }
    } catch (notifUpdateError) {
      console.error("Error updating assignment notification:", notifUpdateError);
      // Bildirim güncelleme hatası red işlemini engellemez
    }
    
    // Bildirimler gönder
    try {
      const task = await getTaskById(taskId);
      const assignment = await getDoc(doc(firestore, "tasks", taskId, "assignments", assignmentId));
      const assignmentData = assignment.data() as TaskAssignment;
      
      if (task && assignmentData) {
        const allUsers = await getAllUsers();
        const assignedUser = allUsers.find(u => u.id === assignmentData.assignedTo);
        const taskCreator = allUsers.find(u => u.id === task.createdBy);
        const assignerUser = allUsers.find(u => u.id === assignmentData.assignedBy);
        
        // 1. Görevi veren kişiye bildirim gönder (assignedBy) - ÖNEMLİ: Görevi veren kişi reddi bilmeli
        if (assignmentData.assignedBy && assignmentData.assignedBy !== auth?.currentUser?.uid) {
          try {
            const rejectTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            await createNotification({
              userId: assignmentData.assignedBy,
              type: "task_assigned",
              title: "Görev reddedildi",
              message: `${assignedUser?.fullName || assignedUser?.email || "Bir kullanıcı"} kullanıcısı "${task.title}" görevini reddetti.\n\nReddetme Sebebi: ${reason.trim().substring(0, 200)}${reason.trim().length > 200 ? "..." : ""}\n\nReddetme Zamanı: ${rejectTime}`,
              read: false,
              relatedId: taskId,
              metadata: { 
                assignment_id: assignmentId, 
                action: "rejected", 
                reason: reason.trim(),
                assigned_user_id: assignmentData.assignedTo,
                updatedAt: new Date(),
                priority: task.priority,
                dueDate: task.dueDate,
              },
            });
          } catch (notifError) {
            console.error("Error sending notification to task assigner:", notifError);
          }
        }
        
        // 2. Görevi tanımlayan kişiye bildirim gönder (createdBy) - Eğer görevi veren kişi değilse
        if (task.createdBy && task.createdBy !== auth?.currentUser?.uid && task.createdBy !== assignmentData.assignedBy) {
          try {
            const rejectTime2 = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            await createNotification({
              userId: task.createdBy,
              type: "task_assigned",
              title: "Görev reddedildi - Onayınız gerekiyor",
              message: `${assignedUser?.fullName || assignedUser?.email || "Bir kullanıcı"} kullanıcısı "${task.title}" görevini reddetti.\n\nReddetme Sebebi: ${reason.trim().substring(0, 200)}${reason.trim().length > 200 ? "..." : ""}\n\nReddetme Zamanı: ${rejectTime2}\n\nLütfen bu reddi onaylayın veya reddedin. Reddin onaylanması durumunda görev başka birine atanabilir.`,
              read: false,
              relatedId: taskId,
              metadata: { 
                assignment_id: assignmentId, 
                action: "rejection_pending_approval", 
                reason: reason.trim(),
                assigned_user_id: assignmentData.assignedTo,
                updatedAt: new Date(),
                priority: task.priority,
                dueDate: task.dueDate,
              },
            });
          } catch (notifError) {
            console.error("Error sending notification to task creator:", notifError);
          }
        }
        
        // 3. Ekip liderlerine bildirim gönder
        const teamLeaders = await getTaskTeamLeaders(task);
        await Promise.all(
          teamLeaders
            .filter(leaderId => leaderId !== task.createdBy && leaderId !== assignmentData.assignedBy) // Görevi tanımlayan ve veren zaten bildirim aldı
            .map(async (leaderId) => {
              try {
                await createNotification({
                  userId: leaderId,
                  type: "task_assigned",
                  title: "Görev reddedildi",
                  message: `${assignedUser?.fullName || assignedUser?.email || "Bir kullanıcı"} "${task.title}" görevini reddetti. Sebep: ${reason.trim().substring(0, 100)}${reason.trim().length > 100 ? "..." : ""}`,
                  read: false,
                  relatedId: taskId,
                  metadata: { assignment_id: assignmentId, action: "rejected", reason: reason.trim() },
                });
              } catch (notifError) {
                console.error("Error sending notification to team leader:", leaderId, notifError);
              }
            })
        );
      }
    } catch (notifError) {
      console.error("Error sending rejection notifications:", notifError);
      // Bildirim hatası red işlemini engellemez
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Reject task assignment error:", error);
    }
    throw error;
  }
};

/**
 * Görev atamalarını al
 */
export const getTaskAssignments = async (taskId: string): Promise<TaskAssignment[]> => {
  try {
    const snapshot = await getDocs(collection(firestore, "tasks", taskId, "assignments"));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TaskAssignment[];
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Get task assignments error:", error);
    }
    throw error;
  }
};

/**
 * Görev atamasını sil
 */
export const deleteTaskAssignment = async (taskId: string, assignmentId: string, deletedBy?: string): Promise<void> => {
  try {
    // Önce assignment bilgilerini al (bildirim için) - SİLME İŞLEMİNDEN ÖNCE
    const assignmentRef = doc(firestore, "tasks", taskId, "assignments", assignmentId);
    const assignmentSnap = await getDoc(assignmentRef);
    
    if (!assignmentSnap.exists()) {
      if (import.meta.env.DEV) {
        console.warn("⚠️ Assignment bulunamadı, silme işlemi atlanıyor:", assignmentId);
      }
      return;
    }
    
    const assignmentData = assignmentSnap.data() as TaskAssignment | undefined;
    
    // Assignment'ı sil
    await deleteDoc(assignmentRef);
    
    // Task document'inde assignedUsers array'ini güncelle
    if (assignmentData) {
      const taskRef = doc(firestore, "tasks", taskId);
      const taskSnap = await getDoc(taskRef);
      if (taskSnap.exists()) {
        const taskData = taskSnap.data();
        const assignedUsers = taskData.assignedUsers || [];
        if (assignedUsers.includes(assignmentData.assignedTo)) {
          await updateDoc(taskRef, {
            assignedUsers: assignedUsers.filter((uid: string) => uid !== assignmentData.assignedTo),
          });
        }
      }
      
      // Bildirim gönder - kaldırılan kullanıcıya
      if (assignmentData) {
        try {
          const [task, deleterProfile, removedUser] = await Promise.all([
            getTaskById(taskId),
            deletedBy ? getUserProfile(deletedBy) : Promise.resolve(null),
            getUserProfile(assignmentData.assignedTo),
          ]);
          
          if (task && removedUser) {
            // Kaldırılan kullanıcıya bildirim
            const removeTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const removedUserNotification = await createNotification({
              userId: assignmentData.assignedTo,
              type: "task_updated",
              title: "Görev atamanız kaldırıldı",
              message: `${deleterProfile?.fullName || deleterProfile?.email || "Bir yönetici"} kullanıcısı tarafından siz "${task.title}" görevinden kaldırıldınız.\n\nArtık bu görevle ilgili bildirimler almayacaksınız ve görev üzerinde işlem yapamayacaksınız.\n\nKaldırılma Zamanı: ${removeTime}`,
              read: false,
              relatedId: taskId,
              metadata: { 
                assignment_id: assignmentId, 
                action: "removed",
                updatedAt: new Date(),
                priority: task.priority,
                dueDate: task.dueDate,
              },
            });
            
            if (import.meta.env.DEV) {
              console.log("✅ Kaldırılan kullanıcıya bildirim gönderildi:", removedUserNotification.id);
            }
            
            // Görevi oluşturan kişiye bildirim (eğer kaldıran kişi değilse)
            if (task.createdBy && task.createdBy !== deletedBy && task.createdBy !== assignmentData.assignedTo) {
              const removeTime2 = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
              const creatorNotification = await createNotification({
                userId: task.createdBy,
                type: "task_updated",
                title: "Görev ataması kaldırıldı",
                message: `${deleterProfile?.fullName || deleterProfile?.email || "Bir yönetici"} kullanıcısı tarafından "${removedUser?.fullName || removedUser?.email || "bir kullanıcı"}" kullanıcısı "${task.title}" görevinden kaldırıldı.\n\nBu kullanıcı artık görevle ilgili bildirimler almayacak ve görev üzerinde işlem yapamayacak.\n\nKaldırılma Zamanı: ${removeTime2}`,
                read: false,
                relatedId: taskId,
                metadata: { 
                  assignment_id: assignmentId, 
                  action: "removed", 
                  removed_user_id: assignmentData.assignedTo,
                  updatedAt: new Date(),
                  priority: task.priority,
                  dueDate: task.dueDate,
                },
              });
              
              if (import.meta.env.DEV) {
                console.log("✅ Görev oluşturucuya bildirim gönderildi:", creatorNotification.id);
              }
            }
          } else {
            if (import.meta.env.DEV) {
              console.warn("⚠️ Bildirim gönderilemedi: task veya removedUser bulunamadı", { task: !!task, removedUser: !!removedUser });
            }
          }
        } catch (notifError) {
          if (import.meta.env.DEV) {
            console.error("❌ Error sending removal notification:", notifError);
          }
          // Bildirim hatası silme işlemini engellemez
        }
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Delete task assignment error:", error);
    }
    throw error;
  }
};

/**
 * Checklist oluştur
 */
export const createChecklist = async (
  taskId: string,
  title: string,
  items: Array<{ text: string; completed?: boolean }>
): Promise<Checklist> => {
  try {
    const checklistData: Omit<Checklist, "id"> = {
      taskId,
      title,
      items: items.map((item) => ({
        id: `${Date.now()}-${Math.random()}`,
        text: item.text,
        completed: item.completed || false,
        createdAt: Timestamp.now(),
        completedAt: null,
      })),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(firestore, "tasks", taskId, "checklists"),
      checklistData
    );

    return {
      id: docRef.id,
      ...checklistData,
    };
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Create checklist error:", error);
    }
    throw error;
  }
};

/**
 * Checklist item'ını güncelle (tik atma)
 * Sadece göreve atanan kullanıcılar ve yöneticiler işaretleyebilir
 */
export const updateChecklistItem = async (
  taskId: string,
  checklistId: string,
  itemId: string,
  completed: boolean,
  userId?: string
): Promise<void> => {
  try {
    // Yetki kontrolü: Sadece atanan kullanıcılar ve yöneticiler işaretleyebilir
    if (userId) {
      const task = await getTaskById(taskId);
      if (!task) {
        throw new Error("Görev bulunamadı");
      }

      // Yetki kontrolü: Firestore'dan kontrol et
      const { getUserProfile } = await import("./authService");
      const userProfile = await getUserProfile(userId);
      
      if (userProfile) {
        const { canAddChecklist } = await import("@/utils/permissions");
        const assignments = await getTaskAssignments(taskId);
        const assignedUserIds = assignments
          .filter((a) => a.status === "accepted" || a.status === "pending")
          .map((a) => a.assignedTo);
        
        const canAdd = await canAddChecklist(task, userProfile, assignedUserIds);
        if (!canAdd) {
          throw new Error("Checklist işaretleme yetkiniz yok. Sadece size atanan görevlerin checklist'lerini işaretleyebilirsiniz.");
        }
      }
    }

    const checklistRef = doc(firestore, "tasks", taskId, "checklists", checklistId);
    const checklistDoc = await getDoc(checklistRef);
    
    if (!checklistDoc.exists()) {
      throw new Error("Checklist bulunamadı");
    }

    const checklist = checklistDoc.data() as Checklist;
    const updatedItems = checklist.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            completed,
            completedAt: completed ? Timestamp.now() : null,
          }
        : item
    );

    await updateDoc(checklistRef, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });

    // Audit log
    await logAudit(
      "UPDATE",
      "checklist_items",
      `${taskId}/${checklistId}/${itemId}`,
      userId || auth?.currentUser?.uid || "system",
      { completed: !completed },
      { completed }
    );
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Update checklist item error:", error);
    }
    throw error;
  }
};

/**
 * Checklist'leri al
 */
export const getChecklists = async (taskId: string): Promise<Checklist[]> => {
  try {
    const snapshot = await getDocs(collection(firestore, "tasks", taskId, "checklists"));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Checklist[];
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Get checklists error:", error);
    }
    throw error;
  }
};

/**
 * Checklist item ekle
 */
export const addChecklistItem = async (
  taskId: string,
  checklistId: string,
  text: string
): Promise<void> => {
  try {
    const checklistRef = doc(firestore, "tasks", taskId, "checklists", checklistId);
    const checklistDoc = await getDoc(checklistRef);
    
    if (!checklistDoc.exists()) {
      throw new Error("Checklist bulunamadı");
    }

    const checklist = checklistDoc.data() as Checklist;
    const newItem: ChecklistItem = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      completed: false,
      createdAt: Timestamp.now(),
      completedAt: null,
    };

    await updateDoc(checklistRef, {
      items: [...checklist.items, newItem],
      updatedAt: serverTimestamp(),
    });
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Add checklist item error:", error);
    }
    throw error;
  }
};

/**
 * Checklist sil
 */
export const deleteChecklist = async (taskId: string, checklistId: string, userId?: string): Promise<void> => {
  try {
    // Yetki kontrolü: Firestore'dan kontrol et
    if (userId) {
      const task = await getTaskById(taskId);
      if (!task) {
        throw new Error("Görev bulunamadı");
      }
      
      const { getUserProfile } = await import("./authService");
      const userProfile = await getUserProfile(userId);
      
      if (userProfile) {
        const { canEditChecklist } = await import("@/utils/permissions");
        const assignments = await getTaskAssignments(taskId);
        const assignedUserIds = assignments
          .filter((a) => a.status === "accepted" || a.status === "pending")
          .map((a) => a.assignedTo);
        
        const canEdit = await canEditChecklist(task, userProfile, assignedUserIds);
        if (!canEdit) {
          throw new Error("Checklist silme yetkiniz yok. Sadece göreve atanan kullanıcılar veya yöneticiler silebilir.");
        }
      }
    }
    
    await deleteDoc(doc(firestore, "tasks", taskId, "checklists", checklistId));
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Delete checklist error:", error);
    }
    throw error;
  }
};

/**
 * Checklist item sil
 */
export const deleteChecklistItem = async (
  taskId: string,
  checklistId: string,
  itemId: string
): Promise<void> => {
  try {
    const checklistRef = doc(firestore, "tasks", taskId, "checklists", checklistId);
    const checklistDoc = await getDoc(checklistRef);
    
    if (!checklistDoc.exists()) {
      throw new Error("Checklist bulunamadı");
    }

    const checklist = checklistDoc.data() as Checklist;
    const updatedItems = checklist.items.filter((item) => item.id !== itemId);

    await updateDoc(checklistRef, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Delete checklist item error:", error);
    }
    throw error;
  }
};

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

/**
 * Yorum ekle
 */
export const addTaskComment = async (
  taskId: string,
  userId: string,
  content: string,
  userName?: string,
  userEmail?: string
): Promise<TaskComment> => {
  try {
    const commentData: Omit<TaskComment, "id"> = {
      taskId,
      userId,
      userName,
      userEmail,
      content,
      createdAt: Timestamp.now(),
      updatedAt: null,
    };

    const docRef = await addDoc(
      collection(firestore, "tasks", taskId, "comments"),
      commentData
    );

    // Activity log ekle
    await addTaskActivity(taskId, userId, "commented", `yorum ekledi`, { commentId: docRef.id }, userName, userEmail);

    // Görevi oluşturan kişiye bildirim gönder (yorum ekleyen kişi hariç)
    try {
      const task = await getTaskById(taskId);
      if (task?.createdBy && task.createdBy !== userId) {
        const { createNotification } = await import("@/services/firebase/notificationService");
        await createNotification({
          userId: task.createdBy,
          type: "comment_added",
          title: "Görevinize Yorum Eklendi",
          message: `${userName || userEmail || "Bir kullanıcı"} kullanıcısı "${task.title || "Görev"}" görevinize yorum ekledi.\n\nYorum: ${content.substring(0, 200)}${content.length > 200 ? "..." : ""}\n\nYorumu görüntülemek ve yanıtlamak için bildirime tıklayabilirsiniz.\n\nYorum Zamanı: ${new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          read: false,
          relatedId: taskId,
          metadata: { 
            commentId: docRef.id, 
            commenterId: userId, 
            commenterName: userName, 
            commenterEmail: userEmail,
            updatedAt: new Date(),
          },
        });
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Send comment notification error:", error);
      }
    }

    return {
      id: docRef.id,
      ...commentData,
    };
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Add task comment error:", error);
    }
    throw error;
  }
};

/**
 * Yorumları al
 */
export const getTaskComments = async (taskId: string): Promise<TaskComment[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "tasks", taskId, "comments"),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TaskComment[];
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Get task comments error:", error);
    }
    throw error;
  }
};

/**
 * Aktivite log ekle
 */
export const addTaskActivity = async (
  taskId: string,
  userId: string,
  action: string,
  description: string,
  metadata?: Record<string, any>,
  userName?: string,
  userEmail?: string
): Promise<string> => {
  try {
    const activityData: Omit<TaskActivity, "id"> = {
      taskId,
      userId,
      userName,
      userEmail,
      action,
      description,
      metadata: metadata || {},
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(firestore, "tasks", taskId, "activities"),
      activityData
    );

    return docRef.id;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Add task activity error:", error);
    }
    return "";
  }
};

/**
 * Aktivite loglarını al
 */
export const getTaskActivities = async (taskId: string): Promise<TaskActivity[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "tasks", taskId, "activities"),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TaskActivity[];
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Get task activities error:", error);
    }
    throw error;
  }
};

/**
 * Görev ekini ekle
 * ÖNEMLİ: Sadece göreve atanan kullanıcılar veya görevi oluşturan kişi dosya ekleyebilir
 */
export const addTaskAttachment = async (
  taskId: string,
  attachment: Omit<TaskAttachment, "id" | "uploadedAt">
): Promise<TaskAttachment> => {
  try {
    // Önce görevi kontrol et
    const task = await getTaskById(taskId);
    if (!task) {
      throw new Error("Görev bulunamadı");
    }

    // Kullanıcı kontrolü
    const currentUserId = auth?.currentUser?.uid;
    if (!currentUserId) {
      throw new Error("Kullanıcı oturumu bulunamadı");
    }

    // Kullanıcı profilini al (admin kontrolü için)
    const userProfile = await getUserProfile(currentUserId);
    if (!userProfile) {
      throw new Error("Kullanıcı profili bulunamadı");
    }

    // Admin kontrolü - adminler her zaman dosya ekleyebilir
    const { isAdmin: checkIsAdmin, isMainAdmin } = await import("@/utils/permissions");
    const isAdmin = await checkIsAdmin(userProfile) || await isMainAdmin(userProfile);

    // Eğer admin değilse, göreve atanmış olup olmadığını veya görevi oluşturmuş olup olmadığını kontrol et
    if (!isAdmin) {
      const isCreator = task.createdBy === currentUserId;
      
      if (!isCreator) {
        // Göreve atanmış olup olmadığını kontrol et
        const assignments = await getTaskAssignments(taskId);
        const assignedUserIds = assignments
          .filter(a => a.status === "accepted") // Sadece kabul edilen atamalar
          .map(a => a.assignedTo);
        
        const isAssigned = assignedUserIds.includes(currentUserId);
        
        if (!isAssigned) {
          throw new Error("Bu göreve dosya eklemek için yetkiniz yok. Sadece size atanan görevlere veya oluşturduğunuz görevlere dosya ekleyebilirsiniz.");
        }
      }
    }

    const attachmentData = {
      ...attachment,
      uploadedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(firestore, "tasks", taskId, "attachments"),
      attachmentData
    );

    const createdAttachment = await getDoc(docRef);
    return {
      id: docRef.id,
      ...createdAttachment.data(),
      uploadedAt: createdAttachment.data()?.uploadedAt || Timestamp.now(),
    } as TaskAttachment;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Add task attachment error:", error);
    }
    throw error;
  }
};

/**
 * Görev eklerini al
 */
export const getTaskAttachments = async (taskId: string): Promise<TaskAttachment[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "tasks", taskId, "attachments"),
        orderBy("uploadedAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TaskAttachment[];
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Get task attachments error:", error);
    }
    throw error;
  }
};

/**
 * Görev ekini sil
 * ÖNEMLİ: Sadece göreve atanan kullanıcılar, görevi oluşturan kişi veya adminler dosya silebilir
 */
export const deleteTaskAttachment = async (taskId: string, attachmentId: string): Promise<void> => {
  try {
    // Önce görevi kontrol et
    const task = await getTaskById(taskId);
    if (!task) {
      throw new Error("Görev bulunamadı");
    }

    // Kullanıcı kontrolü
    const currentUserId = auth?.currentUser?.uid;
    if (!currentUserId) {
      throw new Error("Kullanıcı oturumu bulunamadı");
    }

    // Kullanıcı profilini al (admin kontrolü için)
    const userProfile = await getUserProfile(currentUserId);
    if (!userProfile) {
      throw new Error("Kullanıcı profili bulunamadı");
    }

    // Admin kontrolü - adminler her zaman dosya silebilir
    const { isAdmin: checkIsAdmin, isMainAdmin } = await import("@/utils/permissions");
    const isAdmin = await checkIsAdmin(userProfile) || await isMainAdmin(userProfile);

    // Eğer admin değilse, göreve atanmış olup olmadığını veya görevi oluşturmuş olup olmadığını kontrol et
    if (!isAdmin) {
      const isCreator = task.createdBy === currentUserId;
      
      if (!isCreator) {
        // Göreve atanmış olup olmadığını kontrol et
        const assignments = await getTaskAssignments(taskId);
        const assignedUserIds = assignments
          .filter(a => a.status === "accepted") // Sadece kabul edilen atamalar
          .map(a => a.assignedTo);
        
        const isAssigned = assignedUserIds.includes(currentUserId);
        
        if (!isAssigned) {
          throw new Error("Bu görevden dosya silmek için yetkiniz yok. Sadece size atanan görevlerden veya oluşturduğunuz görevlerden dosya silebilirsiniz.");
        }
      }
    }

    await deleteDoc(doc(firestore, "tasks", taskId, "attachments", attachmentId));
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Delete task attachment error:", error);
    }
    throw error;
  }
};

/**
 * Görevi havuza ekle
 */
export const addTaskToPool = async (taskId: string): Promise<void> => {
  try {
    // Önce görev bilgilerini al
    const taskRef = doc(firestore, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error("Görev bulunamadı");
    }
    
    const taskData = taskSnap.data() as Task;
    
    // Görevi havuza ekle
    await updateDoc(taskRef, {
      isInPool: true,
      poolRequests: [],
      updatedAt: serverTimestamp(),
    });

    // Audit log
    await logAudit("UPDATE", "tasks", taskId, auth?.currentUser?.uid || "system", { isInPool: false }, { isInPool: true });

    // Tüm üyelere bildirim gönder
    try {
      const allUsers = await getAllUsers();
      const currentUserId = auth?.currentUser?.uid;
      const currentUser = await getUserProfile(currentUserId || "");
      const currentUserName = currentUser?.fullName || currentUser?.displayName || currentUser?.email || "Bir kullanıcı";
      
      // Görevi oluşturan hariç tüm kullanıcılara bildirim gönder
      const notificationPromises = allUsers
        .filter(user => user.id && user.id !== currentUserId && user.id !== taskData.createdBy)
        .map(user => 
          createNotification({
            userId: user.id,
            type: "task_pool_request",
            title: "Görev Havuzuna Yeni Görev Eklendi",
            message: `${currentUserName} "${taskData.title}" görevini görev havuzuna ekledi. Bu görevi talep edebilirsiniz.`,
            read: false,
            metadata: {
              taskId: taskId,
              taskTitle: taskData.title,
              addedBy: currentUserId,
              addedByName: currentUserName,
              link: `/tasks?taskId=${taskId}&view=list`,
            },
          })
        );
      
      await Promise.all(notificationPromises);
    } catch (notificationError) {
      if (import.meta.env.DEV) {
        console.error("Bildirim gönderme hatası:", notificationError);
      }
      // Bildirim hatası görevi havuza eklemeyi engellemez
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Add task to pool error:", error);
    }
    throw error;
  }
};

/**
 * Görevi havuzdan çıkar
 */
export const removeTaskFromPool = async (taskId: string): Promise<void> => {
  try {
    await updateDoc(doc(firestore, "tasks", taskId), {
      isInPool: false,
      poolRequests: [],
      updatedAt: serverTimestamp(),
    });
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Remove task from pool error:", error);
    }
    throw error;
  }
};

/**
 * Görev havuzundan görev talep et
 */
export const requestTaskFromPool = async (taskId: string, userId: string): Promise<void> => {
  try {
    const taskRef = doc(firestore, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error("Görev bulunamadı");
    }
    
    const taskData = taskSnap.data();
    const poolRequests = taskData.poolRequests || [];
    
    if (poolRequests.includes(userId)) {
      throw new Error("Bu görev için zaten talep yaptınız");
    }
    
    await updateDoc(taskRef, {
      poolRequests: [...poolRequests, userId],
      updatedAt: serverTimestamp(),
    });

    // Audit log
    await logAudit("UPDATE", "tasks", taskId, userId, { poolRequests }, { poolRequests: [...poolRequests, userId] });

    // Görevi havuza ekleyen kişiye bildirim gönder (görevi oluşturan kişi)
    // Not: Görev havuzuna ekleme işlemi genellikle görevi oluşturan kişi tarafından yapılır
    const taskCreatorId = taskData.createdBy;
    if (taskCreatorId && taskCreatorId !== userId) {
      try {
        const requestingUser = await getUserProfile(userId);
        const requestingUserName = requestingUser?.fullName || requestingUser?.displayName || requestingUser?.email || "Bir kullanıcı";
        
        await createNotification({
          userId: taskCreatorId,
          type: "task_pool_request",
          title: "Görev Havuzu Talebi",
          message: `${requestingUserName} "${taskData.title}" görevi için talep gönderdi. Talebi onaylayabilirsiniz.`,
          read: false,
          relatedId: taskId, // Yönlendirme için gerekli
          metadata: {
            taskId: taskId,
            taskTitle: taskData.title,
            requestedBy: userId,
            requestedByName: requestingUserName,
            link: `/tasks?taskId=${taskId}&view=list`,
          },
        });
      } catch (notificationError) {
        if (import.meta.env.DEV) {
          console.error("Bildirim gönderme hatası:", notificationError);
        }
        // Bildirim hatası görev talebini engellemez
      }
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Request task from pool error:", error);
    }
    throw error;
  }
};

/**
 * Görev havuzu talebini onayla
 */
export const approvePoolRequest = async (taskId: string, userId: string, approvedBy: string, keepInPool: boolean = false): Promise<void> => {
  try {
    const taskRef = doc(firestore, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error("Görev bulunamadı");
    }
    
    const taskData = taskSnap.data() as Task;
    const poolRequests = taskData.poolRequests || [];
    
    if (!poolRequests.includes(userId)) {
      throw new Error("Bu kullanıcı için talep bulunamadı");
    }
    
    // Görevi havuza ekleyen kişi kontrolü (genellikle görevi oluşturan kişi)
    // Not: Görev havuzuna ekleme işlemi genellikle görevi oluşturan kişi tarafından yapılır
    if (taskData.createdBy !== approvedBy) {
      throw new Error("Sadece görevi havuza ekleyen kişi talepleri onaylayabilir");
    }
    
    // Kullanıcıyı göreve ata
    const assignment = await assignTask(taskId, userId, approvedBy);

    // Görev havuzu talebi onaylandığında görev otomatik olarak kabul edilir
    // Assignment'ı direkt "accepted" olarak güncelle
    const assignmentRef = doc(firestore, "tasks", taskId, "assignments", assignment.id);
    await updateDoc(assignmentRef, {
      status: "accepted",
      acceptedAt: serverTimestamp() as any,
    });

    // Havuz durumunu güncelle
    const updates: Partial<Task> & { poolRequests?: string[]; updatedAt?: FieldValue | Timestamp } = {
      poolRequests: poolRequests.filter((id: string) => id !== userId), // Sadece onaylanan kullanıcıyı taleplerden çıkar
      updatedAt: serverTimestamp() as any,
    };

    if (!keepInPool) {
      updates.isInPool = false;
      updates.poolRequests = []; // Havuzdan çıkıyorsa tüm talepleri temizle
    }

    await updateDoc(taskRef, updates);

    // assignTask'ın gönderdiği bildirimi bulup güncelle - "Talebiniz onaylandı, bu göreve atandınız"
    try {
      const { getNotifications, updateNotification } = await import("./notificationService");
      const [task, approverProfile, notifications] = await Promise.all([
        getTaskById(taskId),
        getUserProfile(approvedBy),
        getNotifications(userId, { limit: 10 }), // Son 10 bildirimi al
      ]);

      if (task) {
        // assignTask'ın gönderdiği bildirimi bul (assignment_id ve relatedId ile eşleşen)
        const assignmentNotification = notifications.find(
          (n) => 
            n.type === "task_assigned" && 
            n.relatedId === taskId && 
            n.metadata?.assignment_id === assignment.id &&
            !n.read
        );

        if (assignmentNotification) {
          // Bildirimi güncelle
          await updateNotification(assignmentNotification.id, {
            title: "Görev havuzu talebiniz onaylandı",
            message: `${approverProfile?.fullName || approverProfile?.email || "Bir yönetici"} kullanıcısı görev havuzu talebinizi onayladı. "${task.title}" görevine atandınız ve görev otomatik olarak kabul edildi.`,
            metadata: {
              ...assignmentNotification.metadata,
              action: "pool_request_approved",
            },
          });
        } else {
          // Bildirim bulunamadıysa yeni bir bildirim gönder
          await createNotification({
            userId,
            type: "task_assigned",
            title: "Görev havuzu talebiniz onaylandı",
            message: `${approverProfile?.fullName || approverProfile?.email || "Bir yönetici"} kullanıcısı görev havuzu talebinizi onayladı. "${task.title}" görevine atandınız ve görev otomatik olarak kabul edildi.`,
            read: false,
            relatedId: taskId,
            metadata: { 
              assignment_id: assignment.id,
              action: "pool_request_approved",
              priority: task.priority,
              dueDate: task.dueDate,
              updatedAt: new Date(),
            },
          });
        }
      }
    } catch (notifError) {
      // Bildirim hatası kritik değil, sessizce devam et
      if (import.meta.env.DEV) {
        console.error("Error updating pool request approval notification:", notifError);
      }
    }

    // Audit log
    await logAudit("UPDATE", "tasks", taskId, approvedBy, { isInPool: true, poolRequests }, { isInPool: keepInPool, poolRequests: updates.poolRequests, assignedTo: userId });
    await logAudit("UPDATE", "task_assignments", assignment.id, approvedBy, { status: "pending" }, { status: "accepted", taskId: taskId, taskTitle: taskData.title });
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Approve pool request error:", error);
    }
    throw error;
  }
};

/**
 * Görev havuzu talebini reddet
 */
export const rejectPoolRequest = async (taskId: string, userId: string): Promise<void> => {
  try {
    const taskRef = doc(firestore, "tasks", taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error("Görev bulunamadı");
    }
    
    const taskData = taskSnap.data();
    const poolRequests = taskData.poolRequests || [];
    
    if (!poolRequests.includes(userId)) {
      throw new Error("Bu kullanıcı için talep bulunamadı");
    }
    
    await updateDoc(taskRef, {
      poolRequests: poolRequests.filter((id: string) => id !== userId),
      updatedAt: serverTimestamp(),
    });

    // Audit log
    await logAudit("UPDATE", "tasks", taskId, auth?.currentUser?.uid || "system", { poolRequests }, { poolRequests: poolRequests.filter((id: string) => id !== userId), rejectedUser: userId });
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Reject pool request error:", error);
    }
    throw error;
  }
};

/**
 * Görev onay isteği gönder (completed → pending approval)
 * ÖNEMLİ: Sadece göreve atanan kullanıcılar onaya gönderebilir
 */
export const requestTaskApproval = async (taskId: string, requestedBy: string): Promise<void> => {
  try {
    // Önce görevi ve atamaları kontrol et
    const task = await getTaskById(taskId);
    if (!task) {
      throw new Error("Görev bulunamadı");
    }

    // Eğer zaten onay bekleniyorsa, tekrar bildirim gönderme
    if (task.approvalStatus === "pending") {
      // Zaten pending durumunda, sadece güncelleme yapma
      return;
    }

    // Eğer zaten onaylandıysa, hata fırlat
    if (task.approvalStatus === "approved") {
      throw new Error("Bu görev zaten onaylanmış.");
    }

    // Kullanıcı profilini al (admin kontrolü için)
    const requesterProfile = await getUserProfile(requestedBy);
    if (!requesterProfile) {
      throw new Error("Kullanıcı profili bulunamadı");
    }

    // Admin kontrolü - adminler her zaman onaya gönderebilir
    const { isAdmin: checkIsAdmin, isMainAdmin } = await import("@/utils/permissions");
    const isAdmin = await checkIsAdmin(requesterProfile) || await isMainAdmin(requesterProfile);
    
    // Eğer admin değilse, göreve atanmış olup olmadığını kontrol et
    if (!isAdmin) {
      const assignments = await getTaskAssignments(taskId);
      const assignedUserIds = assignments
        .filter(a => a.status === "accepted") // Sadece kabul edilen atamalar
        .map(a => a.assignedTo);
      
      const isAssigned = assignedUserIds.includes(requestedBy);
      
      if (!isAssigned) {
        throw new Error("Bu görevi onaya göndermek için yetkiniz yok. Sadece size atanan görevleri onaya gönderebilirsiniz.");
      }
    }

    // Görev oluşturan kişi direkt tamamlayabilir, onaya göndermesine gerek yok
    // Ama eğer zaten onaya gönderiyorsa, bu durumda izin ver (belki bir hata durumu)
    
    await updateDoc(doc(firestore, "tasks", taskId), {
      approvalStatus: "pending",
      approvalRequestedBy: requestedBy,
      updatedAt: serverTimestamp(),
    });

    // Audit log for approval request
    await logAudit("UPDATE", "tasks", taskId, requestedBy, { approvalStatus: task.approvalStatus || "none" }, { approvalStatus: "pending" });

    // Görev sahibine (yöneticiye) bildirim gönder - sadece duplicate kontrolü ile
    try {
      if (task && task.createdBy) {
        // Aynı türde ve aynı görev için okunmamış bildirim var mı kontrol et
        const { getNotifications } = await import("./notificationService");
        const existingNotifications = await getNotifications(task.createdBy, { unreadOnly: true });
        const duplicateExists = existingNotifications.some(
          n => n.type === "task_approval" && 
               n.relatedId === taskId && 
               n.metadata?.action === "approval_requested"
        );

        if (!duplicateExists) {
          await createNotification({
            userId: task.createdBy,
            type: "task_approval",
            title: "Görev onayı bekleniyor",
            message: `${requesterProfile?.fullName || requesterProfile?.email || "Bir kullanıcı"} kullanıcısı "${task.title}" görevini tamamladı ve onayınızı bekliyor.\n\n"${task.title}" başlıklı görev için onay talebi gönderildi. Lütfen görevi inceleyip onaylayın veya gerekirse geri gönderin.\n\nİşlem Zamanı: ${new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
            read: false,
            relatedId: taskId,
            metadata: { 
              action: "approval_requested",
              updatedAt: new Date(),
              priority: task.priority,
              dueDate: task.dueDate,
            },
          });
        }
      }
    } catch (notifError) {
      console.error("Error sending approval request notification:", notifError);
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Request task approval error:", error);
    }
    throw error;
  }
};

/**
 * Görev onayını onayla - Onaylandığında "Tamamlandı" (completed) durumuna geçer
 * Sadece yönetici veya görevi veren ekip lideri onaylayabilir
 */
export const approveTask = async (taskId: string, approvedBy: string): Promise<void> => {
  try {
    const task = await getTaskById(taskId);
    if (!task) {
      throw new Error("Görev bulunamadı");
    }

    // Eğer zaten onaylandıysa, hata fırlat
    if (task.approvalStatus === "approved") {
      throw new Error("Bu görev zaten onaylanmış. Tekrar onaylanamaz.");
    }

    // Eğer onay beklenmiyorsa, hata fırlat
    if (task.approvalStatus !== "pending") {
      throw new Error("Bu görev onay beklenmiyor.");
    }

    // Yetki kontrolü: Sadece yönetici veya görevi veren ekip lideri onaylayabilir
    const approverProfile = await getUserProfile(approvedBy);
    if (!approverProfile) {
      throw new Error("Kullanıcı profili bulunamadı");
    }

    const { isAdmin: checkIsAdmin, isMainAdmin } = await import("@/utils/permissions");
    const isAdmin = await checkIsAdmin(approverProfile) || await isMainAdmin(approverProfile);
    const isTeamLeader = approverProfile.role?.includes("team_leader");
    const isCreator = task.createdBy === approvedBy;

    // Yönetici veya görevi veren ekip lideri onaylayabilir
    // Ekip lideri kontrolü için role_permissions sisteminden kontrol et
    const { canPerformSubPermission } = await import("@/utils/permissions");
    const canApprove = await canPerformSubPermission(approverProfile, "tasks", "canApprove");
    const hasTeamLeaderPermission = isTeamLeader && (canApprove || isCreator);

    if (!isAdmin && !hasTeamLeaderPermission) {
      throw new Error("Bu görevi onaylamak için yetkiniz yok. Sadece yöneticiler veya görevi veren ekip liderleri onaylayabilir.");
    }

    const oldStatus = task.status;
    const currentUser = auth?.currentUser;

    await updateDoc(doc(firestore, "tasks", taskId), {
      approvalStatus: "approved",
      status: "completed", // Onaylanınca "Tamamlandı" durumuna geçer
      approvedBy: approvedBy,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Status değiştiyse güncelleyen bilgisi ekle
    if (oldStatus !== "completed" && currentUser?.uid) {
      await updateDoc(doc(firestore, "tasks", taskId), {
        statusUpdatedBy: currentUser.uid,
        statusUpdatedAt: serverTimestamp(),
      });
    }

    // Audit log for approval
    await logAudit("UPDATE", "tasks", taskId, approvedBy, { approvalStatus: "pending", status: oldStatus }, { approvalStatus: "approved", status: "completed" });

    // Onay isteyene ve atanan kişilere bildirim gönder
    try {
      const updatedTask = await getTaskById(taskId);
      const approverProfile = await getUserProfile(approvedBy);
      const approverName = approverProfile?.fullName || approverProfile?.email || "Yönetici";
      
      // Atanan kişileri bul
      const assignments = await getTaskAssignments(taskId);
      const assignedUserIds = assignments
        .filter(a => a.status === "accepted") // Sadece kabul edilen atamalar
        .map(a => a.assignedTo);
      
      // Bildirim gönderilecek kullanıcıları topla
      const notificationUserIds = new Set<string>();
      
      // Onay isteyen kişiye bildirim gönder
      if (updatedTask && updatedTask.approvalRequestedBy) {
        notificationUserIds.add(updatedTask.approvalRequestedBy);
      }
      
      // Atanan kişilere bildirim gönder
      assignedUserIds.forEach(userId => {
        if (userId !== updatedTask?.approvalRequestedBy) {
          notificationUserIds.add(userId);
        }
      });
      
      // Her kullanıcıya bildirim gönder
      const { getNotifications } = await import("./notificationService");
      
      for (const userId of notificationUserIds) {
        try {
          // Duplicate kontrolü
          const existingNotifications = await getNotifications(userId, { unreadOnly: true });
          const duplicateExists = existingNotifications.some(
            n => n.type === "task_approval" && 
                 n.relatedId === taskId && 
                 n.metadata?.action === "approved"
          );

          if (!duplicateExists) {
            const approvalTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            await createNotification({
              userId: userId,
              type: "task_approval",
              title: "Görev onaylandı",
              message: `${approverName} kullanıcısı tarafından "${updatedTask?.title || "görev"}" görevi onaylandı ve "Tamamlandı" durumuna geçirildi.\n\nGörev başarıyla tamamlanmış olarak işaretlendi. Tüm görev üyeleri bu durumu görebilir.\n\nOnay Zamanı: ${approvalTime}`,
              read: false,
              relatedId: taskId,
              metadata: { 
                action: "approved",
                updatedAt: new Date(),
                priority: updatedTask?.priority,
                dueDate: updatedTask?.dueDate,
              },
            });
          }
        } catch (userNotifError) {
          console.error(`Error sending notification to user ${userId}:`, userNotifError);
        }
      }
    } catch (notifError) {
      console.error("Error sending approval notification:", notifError);
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Approve task error:", error);
    }
    throw error;
  }
};

/**
 * Görev onayını reddet - Reddedildiğinde "Devam Ediyor" (in_progress) durumuna döner
 */
export const rejectTaskApproval = async (taskId: string, rejectedBy: string, rejectionReason?: string | null): Promise<void> => {
  try {
    const task = await getTaskById(taskId);
    if (!task) {
      throw new Error("Görev bulunamadı");
    }

    const oldStatus = task.status;
    const currentUser = auth?.currentUser;

    await updateDoc(doc(firestore, "tasks", taskId), {
      approvalStatus: "rejected",
      status: "in_progress", // Reddedilince "Devam Ediyor" durumuna döner
      rejectedBy: rejectedBy,
      rejectedAt: serverTimestamp(),
      rejectionReason: rejectionReason || null,
      updatedAt: serverTimestamp(),
    });

    // Status değiştiyse güncelleyen bilgisi ekle
    if (oldStatus !== "in_progress" && currentUser?.uid) {
      await updateDoc(doc(firestore, "tasks", taskId), {
        statusUpdatedBy: currentUser.uid,
        statusUpdatedAt: serverTimestamp(),
      });
    }

    // Audit log for rejection
    await logAudit("UPDATE", "tasks", taskId, rejectedBy, { approvalStatus: "pending", status: oldStatus }, { approvalStatus: "rejected", status: "in_progress", rejectionReason });

    // Görevdeki tüm kişilere (atananlar, görev oluşturan, onay isteyen) bildirim gönder
    try {
      const task = await getTaskById(taskId);
      const rejecterProfile = await getUserProfile(rejectedBy);
      
      if (task) {
        const assignments = await getTaskAssignments(taskId);
        // Statusu rejected olmayan tüm atanmış kullanıcıları al
        const assignedUserIds = assignments
          .filter(a => a.status !== "rejected")
          .map(a => a.assignedTo);
        
        // Görevdeki tüm kişileri topla (atananlar + görev oluşturan + onay isteyen)
        const allTaskUserIds = new Set<string>();
        
        // Atanan kullanıcıları ekle
        assignedUserIds.forEach(id => allTaskUserIds.add(id));
        
        // Görev oluşturan kişiyi ekle (eğer varsa ve listede yoksa)
        if (task.createdBy && !allTaskUserIds.has(task.createdBy)) {
          allTaskUserIds.add(task.createdBy);
        }
        
        // Onay isteyen kişiyi ekle (eğer varsa ve listede yoksa)
        if (task.approvalRequestedBy && !allTaskUserIds.has(task.approvalRequestedBy)) {
          allTaskUserIds.add(task.approvalRequestedBy);
        }
        
        const rejectionMessage = rejectionReason 
          ? `${rejecterProfile?.fullName || rejecterProfile?.email || "Yönetici"} "${task.title}" görevi için tamamlanma onayını reddetti. Not: ${rejectionReason}`
          : `${rejecterProfile?.fullName || rejecterProfile?.email || "Yönetici"} "${task.title}" görevi için tamamlanma onayını reddetti.`;
        
        // Görevdeki tüm kişilere bildirim gönder (her biri mail alacak - createNotification otomatik mail gönderir)
        await Promise.all(
          Array.from(allTaskUserIds).map(async (userId) => {
            try {
              const rejectTime3 = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
              const detailedRejectionMessage = rejectionReason 
                ? `${rejecterProfile?.fullName || rejecterProfile?.email || "Yönetici"} kullanıcısı tarafından "${task.title}" görevi için tamamlanma onayı reddedildi.\n\nReddetme Notu: ${rejectionReason}\n\nGörev tekrar "Devam Ediyor" durumuna alındı. Lütfen gerekli düzeltmeleri yapıp tekrar onay talebi gönderin.\n\nReddetme Zamanı: ${rejectTime3}`
                : `${rejecterProfile?.fullName || rejecterProfile?.email || "Yönetici"} kullanıcısı tarafından "${task.title}" görevi için tamamlanma onayı reddedildi.\n\nGörev tekrar "Devam Ediyor" durumuna alındı. Lütfen gerekli düzeltmeleri yapıp tekrar onay talebi gönderin.\n\nReddetme Zamanı: ${rejectTime3}`;
              await createNotification({
                userId: userId,
                type: "task_approval",
                title: "Görev onayı reddedildi",
                message: detailedRejectionMessage,
                read: false,
                relatedId: taskId,
                metadata: { 
                  action: "rejected", 
                  rejectionReason,
                  updatedAt: new Date(),
                  priority: task.priority,
                  dueDate: task.dueDate,
                },
              });
            } catch (notifError) {
              if (import.meta.env.DEV) {
                console.error("Error sending notification to task user:", userId, notifError);
              }
            }
          })
        );
      }
    } catch (notifError) {
      if (import.meta.env.DEV) {
        console.error("Error sending rejection notification:", notifError);
      }
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Reject task approval error:", error);
    }
    throw error;
  }
};

/**
 * Görev reddi onayla (görevi veren kişi reddi kabul eder)
 */
export const approveTaskRejection = async (
  taskId: string,
  assignmentId: string
): Promise<void> => {
  try {
    const userId = auth?.currentUser?.uid;
    if (!userId) {
      throw new Error("Kullanıcı kimliği bulunamadı");
    }

    const assignmentRef = doc(firestore, "tasks", taskId, "assignments", assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);
    
    if (!assignmentDoc.exists()) {
      throw new Error("Görev ataması bulunamadı");
    }

    const assignmentData = assignmentDoc.data() as TaskAssignment;
    
    if (assignmentData.status !== "rejected") {
      throw new Error("Görev reddedilmemiş");
    }

    // Reddi onayla
    await updateDoc(assignmentRef, {
      rejectionApprovedBy: userId,
      rejectionApprovedAt: serverTimestamp(),
    });

    // Audit log
    const task = await getTaskById(taskId);
    await logAudit(
      "UPDATE",
      "task_assignments",
      assignmentId,
      userId,
      { rejectionApprovedBy: null },
      { rejectionApprovedBy: userId, taskId, taskTitle: task?.title }
    );

    // Bildirim gönder
    try {
      const allUsers = await getAllUsers();
      const assignedUser = allUsers.find(u => u.id === assignmentData.assignedTo);
      const approverUser = allUsers.find(u => u.id === userId);

      if (assignedUser) {
        const approvalTime2 = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        await createNotification({
          userId: assignmentData.assignedTo,
          type: "task_assigned",
          title: "Görev reddi onaylandı",
          message: `${approverUser?.fullName || approverUser?.email || "Yönetici"} kullanıcısı tarafından "${task?.title}" görevi için reddiniz onaylandı.\n\nGörev artık başka birine atanabilir veya iptal edilebilir. Bu görevle ilgili artık bildirim almayacaksınız.\n\nOnay Zamanı: ${approvalTime2}`,
          read: false,
          relatedId: taskId,
          metadata: { 
            assignment_id: assignmentId, 
            action: "rejection_approved",
            updatedAt: new Date(),
            priority: task?.priority,
            dueDate: task?.dueDate,
          },
        });
      }
    } catch (notifError) {
      console.error("Error sending approval notification:", notifError);
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Approve task rejection error:", error);
    }
    throw error;
  }
};

/**
 * Görev reddi reddet (görevi veren kişi reddi reddeder, görev tekrar atanan kişiye döner)
 */
export const rejectTaskRejection = async (
  taskId: string,
  assignmentId: string,
  reason: string
): Promise<void> => {
  try {
    const userId = auth?.currentUser?.uid;
    if (!userId) {
      throw new Error("Kullanıcı kimliği bulunamadı");
    }

    // Red sebebi en az 20 karakter olmalı
    if (reason.trim().length < 20) {
      throw new Error("Red sebebi en az 20 karakter olmalıdır");
    }

    const assignmentRef = doc(firestore, "tasks", taskId, "assignments", assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);
    
    if (!assignmentDoc.exists()) {
      throw new Error("Görev ataması bulunamadı");
    }

    const assignmentData = assignmentDoc.data() as TaskAssignment;
    
    if (assignmentData.status !== "rejected") {
      throw new Error("Görev reddedilmemiş");
    }

    // Reddi reddet - görevi tekrar pending durumuna getir
    await updateDoc(assignmentRef, {
      status: "pending",
      rejectionRejectedBy: userId,
      rejectionRejectedAt: serverTimestamp(),
      rejectionRejectionReason: reason.trim(),
      rejectionReason: null, // İlk red sebebini temizle (yeni red sebebi için)
    });

    // Audit log
    const task = await getTaskById(taskId);
    await logAudit(
      "UPDATE",
      "task_assignments",
      assignmentId,
      userId,
      { status: "rejected" },
      { 
        status: "pending", 
        rejectionRejectedBy: userId,
        rejectionRejectionReason: reason.trim(),
        taskId, 
        taskTitle: task?.title 
      }
    );

    // Bildirim gönder - görevi alan kişiye
    try {
      const allUsers = await getAllUsers();
      const assignedUser = allUsers.find(u => u.id === assignmentData.assignedTo);
      const rejecterUser = allUsers.find(u => u.id === userId);

      if (assignedUser) {
        const rejectionTime = new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        await createNotification({
          userId: assignmentData.assignedTo,
          type: "task_assigned",
          title: "Görev reddi reddedildi",
          message: `${rejecterUser?.fullName || rejecterUser?.email || "Yönetici"} kullanıcısı tarafından "${task?.title}" görevi için reddiniz reddedildi.\n\nGörev tekrar size atandı ve üzerinde çalışmaya devam etmeniz bekleniyor.\n\nYönetici Notu: ${reason.trim().substring(0, 200)}${reason.trim().length > 200 ? "..." : ""}\n\nReddetme Zamanı: ${rejectionTime}`,
          read: false,
          relatedId: taskId,
          metadata: { 
            assignment_id: assignmentId, 
            action: "rejection_rejected",
            reason: reason.trim()
          },
        });
      }
    } catch (notifError) {
      console.error("Error sending rejection notification:", notifError);
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Reject task rejection error:", error);
    }
    throw error;
  }
};

/**
 * Görev düzenleme yetkisi kontrolü
 */
export const canEditTask = (task: Task, userId: string): boolean => {
  return task.createdBy === userId;
};

/**
 * Görevi arşivle
 */
export const archiveTask = async (taskId: string, userId: string): Promise<void> => {
  try {
    await updateDoc(doc(firestore, "tasks", taskId), {
      isArchived: true,
      updatedAt: serverTimestamp(),
    });

    // Audit log
    await logAudit("UPDATE", "tasks", taskId, userId, { isArchived: false }, { isArchived: true });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Archive task error:", error);
    }
    throw error;
  }
};

/**
 * Görevi arşivden çıkar
 */
export const unarchiveTask = async (taskId: string, userId: string): Promise<void> => {
  try {
    await updateDoc(doc(firestore, "tasks", taskId), {
      isArchived: false,
      updatedAt: serverTimestamp(),
    });

    // Audit log
    await logAudit("UPDATE", "tasks", taskId, userId, { isArchived: true }, { isArchived: false });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Unarchive task error:", error);
    }
    throw error;
  }
};

/**
 * Kullanıcıyı tüm görevlerden çıkar ve eğer göreve kimse kalmamışsa havuza al
 */
export const removeUserFromAllTasks = async (userId: string): Promise<void> => {
  try {
    // Kullanıcının atandığı tüm görevleri bul
    const tasksRef = collection(firestore, "tasks");
    const allTasksSnapshot = await getDocs(tasksRef);
    
    let batch = writeBatch(firestore);
    let batchCount = 0;
    const maxBatchSize = 500;
    
    for (const taskDoc of allTasksSnapshot.docs) {
      const taskData = taskDoc.data();
      const taskId = taskDoc.id;
      
      // assignedUsers array'inden kullanıcıyı çıkar
      const assignedUsers = taskData.assignedUsers || [];
      if (assignedUsers.includes(userId)) {
        const updatedAssignedUsers = assignedUsers.filter((uid: string) => uid !== userId);
        
        // Eğer göreve kimse kalmamışsa havuza al
        const shouldMoveToPool = updatedAssignedUsers.length === 0;
        
        const updates: Partial<Task> & { assignedUsers?: string[]; isInPool?: boolean; poolRequests?: string[] } = {
          assignedUsers: updatedAssignedUsers,
        };
        
        if (shouldMoveToPool) {
          updates.isInPool = true;
          updates.poolRequests = [];
        }
        
        batch.update(taskDoc.ref, updates);
        batchCount++;
        
        // Batch size limit
        if (batchCount >= maxBatchSize) {
          await batch.commit();
          batchCount = 0;
          // Yeni batch oluştur
          batch = writeBatch(firestore);
        }
      }
      
      // Task assignments collection'ından kullanıcının atamalarını sil
      const assignmentsRef = collection(firestore, `tasks/${taskId}/assignments`);
      const assignmentsSnapshot = await getDocs(
        query(assignmentsRef, where("assignedTo", "==", userId))
      );
      
      for (const assignmentDoc of assignmentsSnapshot.docs) {
        batch.delete(assignmentDoc.ref);
        batchCount++;
        
        if (batchCount >= maxBatchSize) {
          await batch.commit();
          batchCount = 0;
          // Yeni batch oluştur
          batch = writeBatch(firestore);
        }
      }
    }
    
    // Kalan batch'i commit et
    if (batchCount > 0) {
      await batch.commit();
    }
    
    // Kullanıcının oluşturduğu görevlerin createdBy'sini "deleted_user" olarak güncelle
    const createdTasksSnapshot = await getDocs(
      query(tasksRef, where("createdBy", "==", userId))
    );
    
    let updateBatch = writeBatch(firestore);
    let updateBatchCount = 0;
    
    for (const taskDoc of createdTasksSnapshot.docs) {
      updateBatch.update(taskDoc.ref, {
        createdBy: "deleted_user",
        createdByName: "Silinmiş Kullanıcı",
      });
      updateBatchCount++;
      
      if (updateBatchCount >= maxBatchSize) {
        await updateBatch.commit();
        updateBatchCount = 0;
        // Yeni batch oluştur
        updateBatch = writeBatch(firestore);
      }
    }
    
    if (updateBatchCount > 0) {
      await updateBatch.commit();
    }
    
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error removing user from tasks:", error);
    }
    throw error;
  }
};

