/**
 * Firebase Project Service
 * Proje yönetimi işlemleri
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
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { logAudit } from "@/utils/auditLogger";

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: "active" | "completed" | "archived";
  isPrivate?: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const PROJECTS_COLLECTION = "projects";

/**
 * Tüm projeleri listele
 */
export const getProjects = async (filters?: {
  status?: string;
  createdBy?: string;
}): Promise<Project[]> => {
  try {
    let q = query(collection(firestore, PROJECTS_COLLECTION), orderBy("createdAt", "desc"));

    if (filters?.status) {
      q = query(q, where("status", "==", filters.status));
    }

    if (filters?.createdBy) {
      q = query(q, where("createdBy", "==", filters.createdBy));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];
  } catch (error: unknown) {
    // Index hatası durumunda basit query dene
    const errorObj = error && typeof error === 'object' ? error as { code?: string; message?: string } : null;
    if (errorObj?.code === 'failed-precondition' || errorObj?.message?.includes('index')) {
      // Sessizce fallback'e geç (sadece debug için log)
      if (import.meta.env.DEV) {
        if (import.meta.env.DEV) {
          console.debug("Project index bulunamadı, basit query kullanılıyor");
        }
      }
      try {
        // Basit query - sadece orderBy ile
        const simpleQuery = query(collection(firestore, PROJECTS_COLLECTION), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(simpleQuery);
        let projects = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Project[];
        
        // Client-side filtreleme
        if (filters?.status) {
          projects = projects.filter(p => p.status === filters.status);
        }
        if (filters?.createdBy) {
          projects = projects.filter(p => p.createdBy === filters.createdBy);
        }
        
        return projects;
      } catch (fallbackError: unknown) {
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.error("Fallback query de başarısız:", fallbackError);
          }
        }
        // Son çare: filtreleme olmadan
        const snapshot = await getDocs(collection(firestore, PROJECTS_COLLECTION));
        let projects = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Project[];
        
        // Client-side filtreleme
        if (filters?.status) {
          projects = projects.filter(p => p.status === filters.status);
        }
        if (filters?.createdBy) {
          projects = projects.filter(p => p.createdBy === filters.createdBy);
        }
        
        // Tarihe göre sırala
        projects.sort((a, b) => {
          const aDate = a.createdAt?.toMillis() || 0;
          const bDate = b.createdAt?.toMillis() || 0;
          return bDate - aDate;
        });
        
        return projects;
      }
    }
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Get projects error:", error);
      }
    }
    throw error;
  }
};

/**
 * Proje detayını al
 */
export const getProjectById = async (projectId: string): Promise<Project | null> => {
  try {
    const projectDoc = await getDoc(doc(firestore, PROJECTS_COLLECTION, projectId));
    
    if (!projectDoc.exists()) {
      return null;
    }

    return {
      id: projectDoc.id,
      ...projectDoc.data(),
    } as Project;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Get project by id error:", error);
    }
    throw error;
  }
};

/**
 * Yeni proje oluştur
 */
export const createProject = async (
  projectData: Omit<Project, "id" | "createdAt" | "updatedAt">
): Promise<Project> => {
  try {
    const projectDoc: Omit<Project, "id"> = {
      ...projectData,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    
    const docRef = await addDoc(collection(firestore, PROJECTS_COLLECTION), projectDoc);

    const createdProject = await getProjectById(docRef.id);
    if (!createdProject) {
      throw new Error("Proje oluşturulamadı");
    }

    // Audit log
    await logAudit("CREATE", "projects", docRef.id, projectData.createdBy, null, createdProject);

    return createdProject;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Create project error:", error);
    }
    throw error;
  }
};

/**
 * Projeyi güncelle
 */
export const updateProject = async (
  projectId: string,
  updates: Partial<Omit<Project, "id" | "createdAt" | "createdBy">>,
  userId?: string
): Promise<void> => {
  try {
    // Eski veriyi al
    const oldProject = await getProjectById(projectId);
    if (!oldProject) {
      throw new Error("Proje bulunamadı");
    }
    
    // Yetki kontrolü
    if (userId) {
      const { getUserProfile } = await import("@/services/firebase/authService");
      const { canEditProject } = await import("@/utils/permissions");
      const userProfile = await getUserProfile(userId);
      
      if (!userProfile) {
        throw new Error("Kullanıcı profili bulunamadı");
      }
      
      const canEdit = await canEditProject(oldProject, userProfile);
      if (!canEdit) {
        throw new Error("Bu projeyi düzenlemek için yetkiniz yok. Sadece yöneticiler, ekip liderleri veya projeyi oluşturan kişi düzenleyebilir.");
      }
    }
    
    await updateDoc(doc(firestore, PROJECTS_COLLECTION, projectId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    // Yeni veriyi al
    const newProject = await getProjectById(projectId);
    
    // Audit log
    if (userId) {
      await logAudit("UPDATE", "projects", projectId, userId, oldProject, newProject);
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Update project error:", error);
    }
    throw error;
  }
};

import { getTasks, deleteTask } from "@/services/firebase/taskService";

/**
 * "Gizli Görevler" projesini bul veya oluştur
 * Projesi olmayan gizli görevler için kullanılır
 */
export const getOrCreatePrivateTasksProject = async (userId: string): Promise<Project> => {
  try {
    // Önce "Gizli Görevler" adında bir proje var mı kontrol et
    const allProjects = await getProjects({ status: "active" });
    const privateTasksProject = allProjects.find(
      (p) => p.name === "Gizli Görevler" && p.isPrivate === true
    );

    if (privateTasksProject) {
      return privateTasksProject;
    }

    // Yoksa oluştur
    const newProject = await createProject({
      name: "Gizli Görevler",
      description: "Projesi olmayan gizli görevler için otomatik oluşturulan proje",
      status: "active",
      isPrivate: true,
      createdBy: userId,
    });

    return newProject;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Get or create private tasks project error:", error);
    }
    throw error;
  }
};

/**
 * Projeyi sil
 * Projeye ait görevleri de siler
 */
export const deleteProject = async (projectId: string, userId?: string): Promise<void> => {
  try {
    // Proje ID kontrolü
    if (!projectId || projectId.trim() === "") {
      throw new Error("Proje ID'si geçersiz");
    }
    
    // Eski veriyi al
    const oldProject = await getProjectById(projectId);
    if (!oldProject) {
      // Proje zaten silinmiş olabilir veya bulunamıyor
      // Bu durumda sessizce devam et (idempotent operation)
      if (import.meta.env.DEV) {
        console.warn(`Proje bulunamadı (ID: ${projectId}). Zaten silinmiş olabilir.`);
      }
      return; // Sessizce çık - proje zaten yok
    }
    
    // Yetki kontrolü
    if (userId) {
      const { getUserProfile } = await import("@/services/firebase/authService");
      const { canDeleteProject } = await import("@/utils/permissions");
      const userProfile = await getUserProfile(userId);
      
      if (!userProfile) {
        throw new Error("Kullanıcı profili bulunamadı");
      }
      
      const canDelete = await canDeleteProject(oldProject, userProfile);
      if (!canDelete) {
        throw new Error("Bu projeyi silmek için yetkiniz yok. Sadece yöneticiler projeleri silebilir.");
      }
    }
    
    // Projeye ait görevleri bul ve sil
    const projectTasks = await getTasks({ projectId });
    
    // Görevleri paralel olarak sil
    await Promise.all(
      projectTasks.map(task => deleteTask(task.id, userId))
    );
    
    // Projeyi sil
    await deleteDoc(doc(firestore, PROJECTS_COLLECTION, projectId));
    
    // Audit log
    if (userId) {
      await logAudit("DELETE", "projects", projectId, userId, oldProject, null);
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Delete project error:", error);
    }
    throw error;
  }
};

