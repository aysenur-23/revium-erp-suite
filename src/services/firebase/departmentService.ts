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
import { getAllUsers, getUserProfile, UserProfile } from "./authService";
import { logAudit } from "@/utils/auditLogger";

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
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Departments'ı al (authenticated olmayan kullanıcılar için de çalışmalı)
    let snapshot;
    try {
      const departmentsRef = collection(db, DEPARTMENTS_COLLECTION);
      snapshot = await getDocs(departmentsRef);
    } catch (error: unknown) {
      // İzin hatası durumunda sessizce devam et (kayıt sayfası için opsiyonel)
      // Permission-denied beklenen bir durum olduğu için log gösterme
      // İzin hatası olsa bile boş array döndür (kayıt sayfası için gerekli)
      return [];
    }
<<<<<<< HEAD

    // Tüm kullanıcıları önceden al (sadece authenticated kullanıcılar için)
    let allUsers: UserProfile[] = [];
    try {
      // Auth durumunu kontrol et - sadece authenticated kullanıcılar için getAllUsers çağır
      const { getAuth } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");
      const currentAuth = auth || getAuth();

      // Eğer kullanıcı giriş yapmamışsa getAllUsers çağırma (permission hatası önleme)
      if (currentAuth?.currentUser) {
        const { getAllUsers } = await import("./authService");
        allUsers = await getAllUsers();
      }
    } catch (error: unknown) {
      // Kullanıcılar alınamazsa sessizce devam et (permission hatası normal)
      // Sadece gerçek hataları logla (permission-denied değilse)
      const errorObj = error && typeof error === 'object' ? error as { code?: string; message?: string } : null;
      if (errorObj?.code !== 'permission-denied' && !errorObj?.message?.includes('permissions')) {
        if (import.meta.env.DEV) {
          console.warn("Kullanıcılar yüklenemedi, getUserProfile ile devam edilecek:", error);
        }
      }
    }

    const departments: DepartmentWithStats[] = [];

=======
    
    // Tüm kullanıcıları önceden al (daha verimli ve güvenilir)
    let allUsers: UserProfile[] = [];
    try {
      const { getAllUsers } = await import("./authService");
      allUsers = await getAllUsers();
    } catch (error: unknown) {
      // Kullanıcılar alınamazsa sessizce devam et
      if (import.meta.env.DEV) {
        console.warn("Kullanıcılar yüklenemedi, getUserProfile ile devam edilecek:", error);
      }
    }
    
    const departments: DepartmentWithStats[] = [];
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    for (const docSnap of snapshot.docs) {
      const deptData = docSnap.data() as Omit<Department, "id">;
      const department: DepartmentWithStats = {
        id: docSnap.id,
        ...deptData,
      };
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Fetch manager name if exists (sadece authenticated kullanıcılar için)
      if (department.managerId) {
        // Önce getAllUsers'dan dene (daha hızlı ve güvenilir)
        const managerFromAllUsers = allUsers.find(u => u.id === department.managerId);
        if (managerFromAllUsers) {
          department.managerName = managerFromAllUsers.fullName || managerFromAllUsers.displayName || managerFromAllUsers.email || "Bilinmeyen";
        } else {
<<<<<<< HEAD
          // getAllUsers'da bulunamadıysa getUserProfile ile dene (sadece authenticated kullanıcılar için)
          try {
            const { getAuth } = await import("firebase/auth");
            const { auth } = await import("@/lib/firebase");
            const currentAuth = auth || getAuth();

            // Sadece authenticated kullanıcılar için getUserProfile çağır
            if (currentAuth?.currentUser) {
              const { getUserProfile } = await import("./authService");
              const managerProfile = await getUserProfile(department.managerId, false); // allowDeleted: false - silinmiş kullanıcıları gösterme
              if (managerProfile) {
                department.managerName = managerProfile.fullName || managerProfile.displayName || managerProfile.email || "Bilinmeyen";
                // Eğer hiçbir isim alanı yoksa, managerId'yi logla
                if (!managerProfile.fullName && !managerProfile.displayName && !managerProfile.email) {
                  if (import.meta.env.DEV) {
                    console.warn(`Manager ID ${department.managerId} için isim bilgisi bulunamadı. Departman: ${department.name}`);
                  }
                }
              } else {
                // Eğer kullanıcı silinmişse veya bulunamadıysa, managerId'yi temizle
                if (import.meta.env.DEV) {
                  console.warn(`Manager ID ${department.managerId} bulunamadı veya silinmiş. Departman: ${department.name}`);
                }
                department.managerName = undefined;
                // managerId'yi null yap (async olarak güncelle) - sadece authenticated kullanıcılar için
                if (currentAuth?.currentUser) {
                  updateDoc(doc(db, DEPARTMENTS_COLLECTION, docSnap.id), {
                    managerId: null,
                    updatedAt: Timestamp.now(),
                  }).catch((err: unknown) => {
                    // Permission hatalarını sessizce handle et
                    const errorObj = err && typeof err === 'object' ? err as { code?: string } : null;
                    if (errorObj?.code !== 'permission-denied' && import.meta.env.DEV) {
                      console.error("Error clearing deleted manager:", err);
                    }
                  });
                }
              }
=======
          // getAllUsers'da bulunamadıysa getUserProfile ile dene
          try {
            const { getUserProfile } = await import("./authService");
            const managerProfile = await getUserProfile(department.managerId, false); // allowDeleted: false - silinmiş kullanıcıları gösterme
            if (managerProfile) {
              department.managerName = managerProfile.fullName || managerProfile.displayName || managerProfile.email || "Bilinmeyen";
              // Eğer hiçbir isim alanı yoksa, managerId'yi logla
              if (!managerProfile.fullName && !managerProfile.displayName && !managerProfile.email) {
                if (import.meta.env.DEV) {
                console.warn(`Manager ID ${department.managerId} için isim bilgisi bulunamadı. Departman: ${department.name}`);
              }
              }
            } else {
              // Eğer kullanıcı silinmişse veya bulunamadıysa, managerId'yi temizle
              if (import.meta.env.DEV) {
                console.warn(`Manager ID ${department.managerId} bulunamadı veya silinmiş. Departman: ${department.name}`);
              }
              department.managerName = undefined;
              // managerId'yi null yap (async olarak güncelle)
              updateDoc(doc(db, DEPARTMENTS_COLLECTION, docSnap.id), {
                managerId: null,
                updatedAt: Timestamp.now(),
              }).catch((err: unknown) => {
                if (import.meta.env.DEV) {
                  console.error("Error clearing deleted manager:", err);
                }
              });
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            }
          } catch (error: unknown) {
            // Silinmiş kullanıcı hatası durumunda managerId'yi temizle
            if (error instanceof Error && error.message?.includes("silinmiş")) {
              if (import.meta.env.DEV) {
                console.warn(`Manager ID ${department.managerId} silinmiş. Departman: ${department.name}`);
              }
              department.managerName = undefined;
              // managerId'yi null yap (async olarak güncelle)
              updateDoc(doc(db, DEPARTMENTS_COLLECTION, docSnap.id), {
                managerId: null,
                updatedAt: Timestamp.now(),
              }).catch((err: unknown) => {
                if (import.meta.env.DEV) {
                  console.error("Error clearing deleted manager:", err);
                }
              });
            } else {
              // Diğer hatalar için logla ama devam et
              const errorMessage = error instanceof Error ? error.message : String(error);
              if (import.meta.env.DEV) {
                console.error(`Manager ID ${department.managerId} için hata (Departman: ${department.name}):`, errorMessage);
              }
              // Hata olsa bile managerId'yi göster (kullanıcı bulunamadı ama ID var)
              department.managerName = undefined;
            }
          }
        }
      }
<<<<<<< HEAD

      // Count users in this department (sadece authenticated kullanıcılar için)
      // N+1 sorgusunu önlemek için bellek içi hesaplama kullan
      if (allUsers.length > 0) {
        department.userCount = allUsers.filter(u => u.departmentId === docSnap.id).length;
      } else {
        // Eğer kullanıcılar yüklenemediyse (izin hatası vs) veya boşsa
        department.userCount = 0;
      }

      departments.push(department);
    }

=======
      
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
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return departments;
  } catch (error: unknown) {
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
<<<<<<< HEAD

    if (!deptSnap.exists()) {
      return null;
    }

=======
    
    if (!deptSnap.exists()) {
      return null;
    }
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    const deptData = deptSnap.data() as Omit<Department, "id">;
    const department: DepartmentWithStats = {
      id: deptSnap.id,
      ...deptData,
    };
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Fetch manager name if exists
    if (department.managerId) {
      try {
        const managerProfile = await getUserProfile(department.managerId, false); // allowDeleted: false - silinmiş kullanıcıları gösterme
        if (managerProfile) {
          department.managerName = managerProfile.fullName || managerProfile.displayName || managerProfile.email || "Bilinmeyen";
          // Eğer hiçbir isim alanı yoksa, managerId'yi logla
          if (!managerProfile.fullName && !managerProfile.displayName && !managerProfile.email) {
            if (import.meta.env.DEV) {
              console.warn(`Manager ID ${department.managerId} için isim bilgisi bulunamadı. Departman: ${department.name}`);
            }
          }
        } else {
          // Eğer kullanıcı silinmişse veya bulunamadıysa, managerId'yi temizle
          if (import.meta.env.DEV) {
            console.warn(`Manager ID ${department.managerId} bulunamadı veya silinmiş. Departman: ${department.name}`);
          }
          department.managerName = undefined;
          // managerId'yi null yap
          try {
            await updateDoc(doc(db, DEPARTMENTS_COLLECTION, departmentId), {
              managerId: null,
              updatedAt: Timestamp.now(),
            });
          } catch (updateErr) {
            if (import.meta.env.DEV) {
              console.error("Error clearing deleted manager:", updateErr);
            }
          }
        }
      } catch (error: unknown) {
        // Silinmiş kullanıcı hatası durumunda managerId'yi temizle
        if (error instanceof Error && error.message?.includes("silinmiş")) {
          if (import.meta.env.DEV) {
            console.warn(`Manager ID ${department.managerId} silinmiş. Departman: ${department.name}`);
          }
          department.managerName = undefined;
          // managerId'yi null yap
          try {
            await updateDoc(doc(db, DEPARTMENTS_COLLECTION, departmentId), {
              managerId: null,
              updatedAt: Timestamp.now(),
            });
          } catch (updateErr: unknown) {
            if (import.meta.env.DEV) {
              console.error("Error clearing deleted manager:", updateErr);
            }
          }
        } else {
          // Diğer hatalar için logla ama devam et
          if (import.meta.env.DEV) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Manager ID ${department.managerId} için hata (Departman: ${department.name}):`, errorMessage);
          }
          // Hata olsa bile managerId'yi göster (kullanıcı bulunamadı ama ID var)
          department.managerName = undefined;
        }
      }
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return department;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error getting department:", error);
    }
    const errorMessage = error instanceof Error ? error.message : "Departman yüklenemedi";
    throw new Error(errorMessage);
  }
};

/**
 * Create a new department
 */
export const createDepartment = async (
  name: string,
  description: string | null = null,
  managerId: string | null = null,
  userId: string | null = null
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
<<<<<<< HEAD

    const docRef = await addDoc(departmentsRef, newDepartment);

=======
    
    const docRef = await addDoc(departmentsRef, newDepartment);
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Audit log
    if (userId || managerId) {
      await logAudit("CREATE", "departments", docRef.id, userId || managerId, null, newDepartment);
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return docRef.id;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error creating department:", error);
    }
    const errorMessage = error instanceof Error ? error.message : "Departman oluşturulamadı";
    throw new Error(errorMessage);
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
  },
  userId?: string | null
): Promise<void> => {
  try {
    if (!db) {
      throw new Error("Firebase Firestore başlatılamadı. Lütfen .env dosyasında Firebase yapılandırmasını kontrol edin.");
    }
<<<<<<< HEAD

    // Eski veriyi al
    const oldDepartment = await getDepartmentById(departmentId);

=======
    
    // Eski veriyi al
    const oldDepartment = await getDepartmentById(departmentId);
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    const deptRef = doc(db, DEPARTMENTS_COLLECTION, departmentId);
    await updateDoc(deptRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
<<<<<<< HEAD

    // Yeni veriyi al
    const newDepartment = await getDepartmentById(departmentId);

=======
    
    // Yeni veriyi al
    const newDepartment = await getDepartmentById(departmentId);
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Audit log
    if (userId) {
      await logAudit("UPDATE", "departments", departmentId, userId, oldDepartment, newDepartment);
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error updating department:", error);
    }
    const errorMessage = error instanceof Error ? error.message : "Departman güncellenemedi";
    throw new Error(errorMessage);
  }
};

/**
 * Delete a department
 */
export const deleteDepartment = async (departmentId: string, userId?: string | null): Promise<void> => {
  try {
    if (!db) {
      throw new Error("Firebase Firestore başlatılamadı. Lütfen .env dosyasında Firebase yapılandırmasını kontrol edin.");
    }
<<<<<<< HEAD

    // Eski veriyi al
    const oldDepartment = await getDepartmentById(departmentId);

    const deptRef = doc(db, DEPARTMENTS_COLLECTION, departmentId);
    await deleteDoc(deptRef);

=======
    
    // Eski veriyi al
    const oldDepartment = await getDepartmentById(departmentId);
    
    const deptRef = doc(db, DEPARTMENTS_COLLECTION, departmentId);
    await deleteDoc(deptRef);
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Audit log
    if (userId) {
      await logAudit("DELETE", "departments", departmentId, userId, oldDepartment, null);
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error deleting department:", error);
    }
    const errorMessage = error instanceof Error ? error.message : "Departman silinemedi";
    throw new Error(errorMessage);
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
        await createDepartment(team.name, team.description, null, null);
      }
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error creating default departments:", error);
    }
    const errorMessage = error instanceof Error ? error.message : "Varsayılan departmanlar oluşturulamadı";
    throw new Error(errorMessage);
  }
};

