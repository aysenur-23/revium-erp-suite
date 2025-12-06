import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAllUsers, getUserProfile } from "./authService";

export interface Department {
  id: string;
  name: string;
  description: string | null;
  managerId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DepartmentWithStats extends Department {
  managerName?: string;
  userCount?: number;
}

const DEPARTMENTS_COLLECTION = "departments";

/**
 * Get all departments
 */
export const getDepartments = async (): Promise<DepartmentWithStats[]> => {
  try {
    if (!db) {
      throw new Error("Firebase Firestore başlatılamadı. Lütfen .env dosyasında Firebase yapılandırmasını kontrol edin.");
    }
    
    // Departments'ı al (authenticated olmayan kullanıcılar için de çalışmalı)
    let snapshot;
    try {
      const departmentsRef = collection(db, DEPARTMENTS_COLLECTION);
      snapshot = await getDocs(departmentsRef);
    } catch (error: any) {
      // İzin hatası durumunda sessizce devam et (kayıt sayfası için opsiyonel)
      // Permission-denied beklenen bir durum olduğu için log gösterme
      // İzin hatası olsa bile boş array döndür (kayıt sayfası için gerekli)
      return [];
    }
    
    const departments: DepartmentWithStats[] = [];
    
    for (const docSnap of snapshot.docs) {
      const deptData = docSnap.data() as Omit<Department, "id">;
      const department: DepartmentWithStats = {
        id: docSnap.id,
        ...deptData,
      };
      
      // Fetch manager name if exists (sadece authenticated kullanıcılar için)
      if (department.managerId) {
        try {
          const { getUserProfile } = await import("./authService");
          const managerProfile = await getUserProfile(department.managerId, false); // allowDeleted: false - silinmiş kullanıcıları gösterme
          if (managerProfile && !(managerProfile as any).deleted) {
            department.managerName = managerProfile.fullName || managerProfile.displayName || managerProfile.email;
          } else {
            // Eğer kullanıcı silinmişse, managerId'yi temizle
            department.managerName = undefined;
            // managerId'yi null yap (async olarak güncelle)
            updateDoc(doc(db, DEPARTMENTS_COLLECTION, docSnap.id), {
              managerId: null,
              updatedAt: Timestamp.now(),
            }).catch(err => {
              console.error("Error clearing deleted manager:", err);
            });
          }
        } catch (error: any) {
          // Silinmiş kullanıcı hatası durumunda managerId'yi temizle
          if (error.message?.includes("silinmiş")) {
            department.managerName = undefined;
            // managerId'yi null yap (async olarak güncelle)
            updateDoc(doc(db, DEPARTMENTS_COLLECTION, docSnap.id), {
              managerId: null,
              updatedAt: Timestamp.now(),
            }).catch(err => {
              console.error("Error clearing deleted manager:", err);
            });
          }
          // Diğer hatalar için sessizce devam et (authenticated olmayan kullanıcılar için normal)
        }
      }
      
      // Count users in this department (sadece authenticated kullanıcılar için)
      try {
        const usersRef = collection(db, "users");
        const usersQuery = query(usersRef, where("departmentId", "==", docSnap.id));
        const usersSnapshot = await getDocs(usersQuery);
        department.userCount = usersSnapshot.size;
      } catch (error) {
        // İzin hatası olsa bile sessizce devam et
        department.userCount = 0;
      }
      
      departments.push(department);
    }
    
    return departments;
  } catch (error: any) {
    // Beklenmeyen hatalar için boş array döndür (kayıt sayfası için gerekli)
    // Sessizce devam et - permission-denied beklenen bir durum
    return [];
  }
};

/**
 * Get a single department by ID
 */
export const getDepartmentById = async (departmentId: string): Promise<DepartmentWithStats | null> => {
  try {
    if (!db) {
      throw new Error("Firebase Firestore başlatılamadı. Lütfen .env dosyasında Firebase yapılandırmasını kontrol edin.");
    }
    const deptRef = doc(db, DEPARTMENTS_COLLECTION, departmentId);
    const deptSnap = await getDoc(deptRef);
    
    if (!deptSnap.exists()) {
      return null;
    }
    
    const deptData = deptSnap.data() as Omit<Department, "id">;
    const department: DepartmentWithStats = {
      id: deptSnap.id,
      ...deptData,
    };
    
    // Fetch manager name if exists
    if (department.managerId) {
      try {
        const managerProfile = await getUserProfile(department.managerId, false); // allowDeleted: false - silinmiş kullanıcıları gösterme
        if (managerProfile && !(managerProfile as any).deleted) {
          department.managerName = managerProfile.fullName || managerProfile.displayName || managerProfile.email;
        } else {
          // Eğer kullanıcı silinmişse, managerId'yi temizle
          department.managerName = undefined;
          // managerId'yi null yap
          try {
            await updateDoc(doc(db, DEPARTMENTS_COLLECTION, departmentId), {
              managerId: null,
              updatedAt: Timestamp.now(),
            });
          } catch (updateErr) {
            console.error("Error clearing deleted manager:", updateErr);
          }
        }
      } catch (error: any) {
        // Silinmiş kullanıcı hatası durumunda managerId'yi temizle
        if (error.message?.includes("silinmiş")) {
          department.managerName = undefined;
          // managerId'yi null yap
          try {
            await updateDoc(doc(db, DEPARTMENTS_COLLECTION, departmentId), {
              managerId: null,
              updatedAt: Timestamp.now(),
            });
          } catch (updateErr) {
            console.error("Error clearing deleted manager:", updateErr);
          }
        } else {
          console.error("Error fetching manager:", error);
        }
      }
    }
    
    return department;
  } catch (error: any) {
    console.error("Error getting department:", error);
    throw new Error(error.message || "Departman yüklenemedi");
  }
};

/**
 * Create a new department
 */
export const createDepartment = async (
  name: string,
  description: string | null = null,
  managerId: string | null = null
): Promise<string> => {
  try {
    if (!db) {
      throw new Error("Firebase Firestore başlatılamadı. Lütfen .env dosyasında Firebase yapılandırmasını kontrol edin.");
    }
    const departmentsRef = collection(db, DEPARTMENTS_COLLECTION);
    const newDepartment = {
      name,
      description,
      managerId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(departmentsRef, newDepartment);
    return docRef.id;
  } catch (error: any) {
    console.error("Error creating department:", error);
    throw new Error(error.message || "Departman oluşturulamadı");
  }
};

/**
 * Update a department
 */
export const updateDepartment = async (
  departmentId: string,
  updates: {
    name?: string;
    description?: string | null;
    managerId?: string | null;
  }
): Promise<void> => {
  try {
    if (!db) {
      throw new Error("Firebase Firestore başlatılamadı. Lütfen .env dosyasında Firebase yapılandırmasını kontrol edin.");
    }
    const deptRef = doc(db, DEPARTMENTS_COLLECTION, departmentId);
    await updateDoc(deptRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    console.error("Error updating department:", error);
    throw new Error(error.message || "Departman güncellenemedi");
  }
};

/**
 * Delete a department
 */
export const deleteDepartment = async (departmentId: string): Promise<void> => {
  try {
    if (!db) {
      throw new Error("Firebase Firestore başlatılamadı. Lütfen .env dosyasında Firebase yapılandırmasını kontrol edin.");
    }
    const deptRef = doc(db, DEPARTMENTS_COLLECTION, departmentId);
    await deleteDoc(deptRef);
  } catch (error: any) {
    console.error("Error deleting department:", error);
    throw new Error(error.message || "Departman silinemedi");
  }
};

/**
 * Create default departments (Elektrik, Mekanik, Yazılım, Yönetim)
 */
export const createDefaultDepartments = async (): Promise<void> => {
  try {
    const defaultTeams = [
      { name: "Elektrik Ekibi", description: "Elektrik Departmanı" },
      { name: "Mekanik Ekip", description: "Mekanik Departmanı" },
      { name: "Yazılım Ekibi", description: "Yazılım Departmanı" },
      { name: "Yönetim", description: "Yönetim Departmanı" },
    ];

    // Mevcut departmanları al
    const existingDepartments = await getDepartments();
    const existingNames = existingDepartments.map((d) => d.name);

    // Eksik olanları oluştur
    for (const team of defaultTeams) {
      if (!existingNames.includes(team.name)) {
        await createDepartment(team.name, team.description, null);
      }
    }
  } catch (error: any) {
    console.error("Error creating default departments:", error);
    throw new Error(error.message || "Varsayılan departmanlar oluşturulamadı");
  }
};

