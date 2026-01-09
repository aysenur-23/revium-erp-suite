import { db } from "@/lib/firebase";
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
  setDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";

export interface SubPermissions {
  [key: string]: boolean;
}

export interface RolePermission {
  id: string;
  role: string;
  resource: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  subPermissions?: SubPermissions; // Alt yetkiler
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RoleDefinition {
  id: string;
  key: string;
  label: string;
  color: string;
  isSystem?: boolean; // Sistem rolleri silinemez
}

const ROLE_PERMISSIONS_COLLECTION = "role_permissions";
const ROLES_COLLECTION = "roles";

// Permission cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika cache TTL
const cacheTimestamps = new Map<string, number>();

// Permission cache for real-time updates
const permissionCache = new Map<string, RolePermission | null>();
const permissionListeners = new Map<string, Unsubscribe>();
const cacheCallbacks = new Set<() => void>();

/**
 * Check if cache entry is expired
 */
const isCacheExpired = (cacheKey: string): boolean => {
  const timestamp = cacheTimestamps.get(cacheKey);
  if (!timestamp) return true;
  return Date.now() - timestamp > CACHE_TTL;
};

/**
 * Update cache timestamp
 */
const updateCacheTimestamp = (cacheKey: string): void => {
  cacheTimestamps.set(cacheKey, Date.now());
};

/**
 * Clear permission cache (optionally for specific role)
 */
export const clearPermissionCache = (role?: string): void => {
  if (role) {
    // Clear only specific role's cache
    for (const key of permissionCache.keys()) {
      if (key.startsWith(`${role}:`)) {
        permissionCache.delete(key);
        cacheTimestamps.delete(key);
      }
    }
  } else {
    // Clear all cache
    permissionCache.clear();
    cacheTimestamps.clear();
  }
  // Notify all callbacks
  cacheCallbacks.forEach(callback => {
    try {
      callback();
    } catch (e) {
      // Callback hatası diğerlerini etkilemesin
    }
  });
};

/**
 * Force refresh all permissions from Firestore
 */
export const forceRefreshPermissions = async (): Promise<void> => {
  // Clear all cache
  permissionCache.clear();
  cacheTimestamps.clear();

  // Unsubscribe all listeners
  permissionListeners.forEach(unsubscribe => unsubscribe());
  permissionListeners.clear();

  // Notify callbacks
  cacheCallbacks.forEach(callback => {
    try {
      callback();
    } catch (e) {
      // Ignore callback errors
    }
  });
};

/**
 * Subscribe to permission cache changes
 */
export const onPermissionCacheChange = (callback: () => void): (() => void) => {
  cacheCallbacks.add(callback);
  return () => {
    cacheCallbacks.delete(callback);
  };
};

const RESOURCES = [
  "tasks",
  "users",
  "departments",
  "orders",
  "production_orders",
  "customers",
  "products",
  "projects",
  "audit_logs",
  "role_permissions",
  "raw_materials",
  "warranty",
];

// Default System Roles
const DEFAULT_ROLES: RoleDefinition[] = [
  { id: "super_admin", key: "super_admin", label: "Süper Yönetici", color: "bg-red-500", isSystem: true },
  { id: "team_leader", key: "team_leader", label: "Ekip Lideri", color: "bg-blue-500", isSystem: true },
  { id: "personnel", key: "personnel", label: "Personel", color: "bg-green-500", isSystem: true },
];

/**
 * Initialize default roles if they don't exist
 */
const initializeDefaultRoles = async (): Promise<void> => {
  try {
    // Sadece authenticated kullanıcılar için çalış
    const { getAuth } = await import("firebase/auth");
    const { auth } = await import("@/lib/firebase");
    const currentAuth = auth || getAuth();

    if (!currentAuth?.currentUser) {
      // Giriş yapmamış kullanıcılar için sessizce çık
      return;
    }

    const rolesRef = collection(db, ROLES_COLLECTION);
    const snapshot = await getDocs(rolesRef);

    if (snapshot.empty) {
      for (const role of DEFAULT_ROLES) {
        await setDoc(doc(db, ROLES_COLLECTION, role.key), role);
      }
    }
  } catch (error) {
    // Permission hatalarını sessizce handle et
    const errorObj = error && typeof error === 'object' ? error as { code?: string; message?: string } : null;
    if (errorObj?.code !== 'permission-denied' && !errorObj?.message?.includes('permissions')) {
      if (import.meta.env.DEV) {
        console.error("Error initializing default roles:", error);
      }
    }
  }
};

/**
 * Get all roles
 */
export const getRoles = async (): Promise<RoleDefinition[]> => {
  try {
    // Sadece authenticated kullanıcılar için initializeDefaultRoles çağır
    const { getAuth } = await import("firebase/auth");
    const { auth } = await import("@/lib/firebase");
    const currentAuth = auth || getAuth();

    if (currentAuth?.currentUser) {
      await initializeDefaultRoles();
    }

    const rolesRef = collection(db, ROLES_COLLECTION);
    const snapshot = await getDocs(rolesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoleDefinition));
  } catch (error) {
    // Permission hatalarını sessizce handle et
    const errorObj = error && typeof error === 'object' ? error as { code?: string; message?: string } : null;
    if (errorObj?.code !== 'permission-denied' && !errorObj?.message?.includes('permissions')) {
      if (import.meta.env.DEV) {
        console.error("Error getting roles:", error);
      }
    }
    return DEFAULT_ROLES;
  }
};

/**
 * Add a new role
 */
export const addRole = async (role: Omit<RoleDefinition, "id" | "isSystem">): Promise<void> => {
  try {
    const roleKey = role.key.toLowerCase().replace(/\s+/g, "_");
    const newRole = {
      ...role,
      key: roleKey,
      isSystem: false
    };

    await setDoc(doc(db, ROLES_COLLECTION, roleKey), newRole);

    // Initialize permissions for the new role
    const permissionsRef = collection(db, ROLE_PERMISSIONS_COLLECTION);
    for (const resource of RESOURCES) {
      // Alt yetkileri al (yeni roller için varsayılan olarak boş)
      const permissionData: Record<string, unknown> = {
        role: roleKey,
        resource,
        canCreate: false,
        canRead: true, // Default read access
        canUpdate: false,
        canDelete: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // undefined değerleri kaldır (Firestore undefined kabul etmez)
      const cleanPermission = Object.fromEntries(
        Object.entries(permissionData).filter(([_, value]) => value !== undefined)
      );

      await addDoc(permissionsRef, cleanPermission);
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error adding role:", error);
    }
    throw new Error(error instanceof Error ? error.message : "Rol eklenemedi");
  }
};

/**
 * Delete a role
 */
export const deleteRole = async (roleKey: string): Promise<void> => {
  try {
    // Sistem rolleri silinemez
    const roleDoc = await getDoc(doc(db, ROLES_COLLECTION, roleKey));
    if (roleDoc.exists() && roleDoc.data().isSystem) {
      throw new Error("Sistem rolleri silinemez");
    }

    // Bu role sahip kullanıcıları bul ve rollerini güncelle
    const usersRef = collection(db, "users");
    const usersQuery = query(usersRef);
    const usersSnapshot = await getDocs(usersQuery);

    const { writeBatch } = await import("firebase/firestore");
    let batch = writeBatch(db);
    let batchCount = 0;
    const maxBatchSize = 500;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userRoles = userData.role || [];

      // Eğer kullanıcı bu role sahipse, rolü kaldır
      if (userRoles.includes(roleKey)) {
        const updatedRoles = userRoles.filter((r: string) => r !== roleKey);
        // Eğer hiç rol kalmadıysa, varsayılan rol ekle
        const finalRoles = updatedRoles.length > 0 ? updatedRoles : ["personnel"];

        batch.update(userDoc.ref, {
          role: finalRoles,
        });
        batchCount++;

        if (batchCount >= maxBatchSize) {
          await batch.commit();
          batchCount = 0;
          // Yeni batch oluştur
          batch = writeBatch(db);
        }
      }
    }

    // Kalan batch'i commit et
    if (batchCount > 0) {
      await batch.commit();
    }

    // Delete role definition
    await deleteDoc(doc(db, ROLES_COLLECTION, roleKey));

    // Delete associated permissions
    const permissionsRef = collection(db, ROLE_PERMISSIONS_COLLECTION);
    const q = query(permissionsRef, where("role", "==", roleKey));
    const permissionsSnapshot = await getDocs(q);

    for (const docSnap of permissionsSnapshot.docs) {
      await deleteDoc(doc(db, ROLE_PERMISSIONS_COLLECTION, docSnap.id));
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error deleting role:", error);
    }
    throw new Error(error instanceof Error ? error.message : "Rol silinemedi");
  }
};

/**
 * Initialize default permissions for all roles and resources
 */
const initializeDefaultPermissions = async (): Promise<void> => {
  try {
    const permissionsRef = collection(db, ROLE_PERMISSIONS_COLLECTION);
    const snapshot = await getDocs(permissionsRef);

    const roles = await getRoles();
    const existingPermissions = snapshot.docs.map(doc => doc.data() as RolePermission);

    // Eksik permissions'ları kontrol et ve oluştur
    const missingPermissions: Omit<RolePermission, "id">[] = [];

    for (const roleDef of roles) {
      const role = roleDef.key;
      for (const resource of RESOURCES) {
        // Bu rol ve kaynak için permission var mı kontrol et
        const exists = existingPermissions.some(
          (p) => p.role === role && p.resource === resource
        );

        if (!exists) {
          // Eksik permission için varsayılan değerler
          let canCreate = false;
          let canRead = true;
          let canUpdate = false;
          let canDelete = false;
          let subPermissions: SubPermissions = {};

          // Alt yetkileri al
          const subPerms = getSubPermissionsForResource(resource);
          const subPermKeys = Object.keys(subPerms);

          if (role === "super_admin") {
            canCreate = true;
            canRead = true;
            canUpdate = true;
            canDelete = true;
            // Süper yönetici ve admin için tüm alt yetkileri true yap
            subPermKeys.forEach(key => {
              subPermissions[key] = true;
            });
          } else if (role === "team_leader") {
            // Ekip lideri için tüm kaynaklarda oluşturma, okuma ve güncelleme yetkisi (role_permissions hariç)
            canCreate = resource !== "role_permissions";
            canRead = true;
            canUpdate = resource !== "role_permissions";
            // Ekip lideri için silme yetkisi (role_permissions ve audit_logs hariç)
            canDelete = resource !== "role_permissions" && resource !== "audit_logs";
            // Ekip lideri için tüm alt yetkileri true yap (role_permissions hariç)
            if (resource !== "role_permissions") {
              subPermKeys.forEach(key => {
                subPermissions[key] = true;
              });
            }
          } else if (role === "personnel") {
            // Personnel tasks oluşturamaz, sadece production_orders oluşturabilir
            canCreate = ["production_orders"].includes(resource);
            canRead = true;
            // Personnel sadece atanan görevlerin durumunu güncelleyebilir (canUpdate kontrolü taskService'de yapılır)
            canUpdate = ["tasks", "production_orders"].includes(resource);
            canDelete = false;
            // Personel için sınırlı alt yetkiler
            if (resource === "tasks") {
              // Personnel sadece atanan görevlerde bu yetkilere sahip
              subPermissions.canAddComment = true;
              subPermissions.canAddAttachment = true;
              subPermissions.canChangeStatus = true; // Sadece atanan görevler için
            } else if (resource === "production_orders") {
              subPermissions.canViewSchedule = true;
            }
          }

          const permissionData: Omit<RolePermission, "id"> & { subPermissions?: SubPermissions } = {
            role,
            resource,
            canCreate,
            canRead,
            canUpdate,
            canDelete,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          // subPermissions sadece varsa ekle (undefined değerleri Firestore kabul etmez)
          if (Object.keys(subPermissions).length > 0) {
            permissionData.subPermissions = subPermissions;
          }

          missingPermissions.push(permissionData);
        }
      }
    }

    // Eksik permissions'ları oluştur
    if (missingPermissions.length > 0) {
      for (const permission of missingPermissions) {
        // undefined değerleri kaldır (Firestore undefined kabul etmez)
        const cleanPermission: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(permission)) {
          if (value !== undefined) {
            // Eğer value bir obje ise, içindeki undefined değerleri de temizle
            if (typeof value === 'object' && value !== null && !(value instanceof Timestamp)) {
              const cleanValue = Object.fromEntries(
                Object.entries(value).filter(([_, v]) => v !== undefined)
              );
              if (Object.keys(cleanValue).length > 0) {
                cleanPermission[key] = cleanValue;
              }
            } else {
              cleanPermission[key] = value;
            }
          }
        }
        await addDoc(permissionsRef, cleanPermission);
      }
    }

    // Eğer hiç permission yoksa, tüm roller için oluştur
    if (snapshot.size === 0 && missingPermissions.length === 0) {
      const defaultPermissions: Omit<RolePermission, "id">[] = [];

      for (const roleDef of roles) {
        const role = roleDef.key;
        for (const resource of RESOURCES) {
          // Alt yetkileri al
          const subPerms = getSubPermissionsForResource(resource);
          const subPermKeys = Object.keys(subPerms);
          let subPermissions: SubPermissions = {};

          // Super Admin and Admin have all permissions
          if (role === "super_admin") {
            // Süper yönetici ve admin için tüm alt yetkileri true yap
            subPermKeys.forEach(key => {
              subPermissions[key] = true;
            });
            const permissionData: Omit<RolePermission, "id"> & { subPermissions?: SubPermissions } = {
              role,
              resource,
              canCreate: true,
              canRead: true,
              canUpdate: true,
              canDelete: true,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };

            // subPermissions sadece varsa ekle (undefined değerleri Firestore kabul etmez)
            if (Object.keys(subPermissions).length > 0) {
              permissionData.subPermissions = subPermissions;
            }

            defaultPermissions.push(permissionData);
          }
          // Team Leader has most permissions except role_permissions
          else if (role === "team_leader") {
            // Ekip lideri için tüm alt yetkileri true yap (role_permissions hariç)
            if (resource !== "role_permissions") {
              subPermKeys.forEach(key => {
                subPermissions[key] = true;
              });
            }
            const permissionData: Omit<RolePermission, "id"> & { subPermissions?: SubPermissions } = {
              role,
              resource,
              canCreate: resource !== "role_permissions",
              canRead: true,
              canUpdate: resource !== "role_permissions",
              canDelete: resource !== "role_permissions" && resource !== "audit_logs",
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };

            // subPermissions sadece varsa ekle (undefined değerleri Firestore kabul etmez)
            if (Object.keys(subPermissions).length > 0) {
              permissionData.subPermissions = subPermissions;
            }

            defaultPermissions.push(permissionData);
          }
          // Personnel has limited permissions
          else if (role === "personnel") {
            // Personel için sınırlı alt yetkiler
            if (resource === "tasks") {
              subPermissions.canEditOwn = true;
              subPermissions.canDeleteOwn = true;
              subPermissions.canAddComment = true;
              subPermissions.canAddAttachment = true;
            } else if (resource === "production_orders") {
              subPermissions.canViewSchedule = true;
            }
            const permissionData: Omit<RolePermission, "id"> & { subPermissions?: SubPermissions } = {
              role,
              resource,
              canCreate: ["tasks", "production_orders"].includes(resource),
              canRead: true,
              canUpdate: ["tasks", "production_orders"].includes(resource),
              canDelete: false,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };

            // subPermissions sadece varsa ekle (undefined değerleri Firestore kabul etmez)
            if (Object.keys(subPermissions).length > 0) {
              permissionData.subPermissions = subPermissions;
            }

            defaultPermissions.push(permissionData);
          }
          // Other roles (viewer, custom roles) have read-only permissions
          else {
            defaultPermissions.push({
              role,
              resource,
              canCreate: false,
              canRead: true,
              canUpdate: false,
              canDelete: false,
              // subPermissions eklenmiyor (undefined değerleri Firestore kabul etmez)
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
          }
        }
      }

      // Add all permissions to Firestore
      for (const permission of defaultPermissions) {
        // undefined değerleri kaldır (Firestore undefined kabul etmez)
        const cleanPermission: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(permission)) {
          if (value !== undefined) {
            // Eğer value bir obje ise, içindeki undefined değerleri de temizle
            if (typeof value === 'object' && value !== null && !(value instanceof Timestamp)) {
              const cleanValue = Object.fromEntries(
                Object.entries(value).filter(([_, v]) => v !== undefined)
              );
              if (Object.keys(cleanValue).length > 0) {
                cleanPermission[key] = cleanValue;
              }
            } else {
              cleanPermission[key] = value;
            }
          }
        }
        await addDoc(permissionsRef, cleanPermission);
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Error initializing default permissions:", error);
    }
  }
};

/**
 * Update existing permissions to include missing sub-permissions
 * Bu fonksiyon mevcut izinleri kontrol edip eksik alt yetkileri ekler
 */
export const updatePermissionsWithSubPermissions = async (): Promise<void> => {
  try {
    const permissionsRef = collection(db, ROLE_PERMISSIONS_COLLECTION);
    const snapshot = await getDocs(permissionsRef);

    for (const docSnap of snapshot.docs) {
      const permission = docSnap.data() as RolePermission;
      const subPerms = getSubPermissionsForResource(permission.resource);
      const subPermKeys = Object.keys(subPerms);

      // Eğer alt yetkiler yoksa veya eksikse, ekle
      let needsUpdate = false;
      let updatedSubPermissions: SubPermissions = { ...(permission.subPermissions || {}) };

      // Süper yönetici için tüm alt yetkileri true yap
      if (permission.role === "super_admin" && subPermKeys.length > 0) {
        subPermKeys.forEach(key => {
          if (updatedSubPermissions[key] !== true) {
            updatedSubPermissions[key] = true;
            needsUpdate = true;
          }
        });
      }
      // Ekip lideri için tüm alt yetkileri true yap (role_permissions hariç)
      else if (permission.role === "team_leader" && permission.resource !== "role_permissions") {
        if (subPermKeys.length > 0) {
          subPermKeys.forEach(key => {
            if (updatedSubPermissions[key] !== true) {
              updatedSubPermissions[key] = true;
              needsUpdate = true;
            }
          });
        }

        // Ekip lideri için canCreate, canUpdate ve canDelete yetkilerini de kontrol et
        if (permission.canCreate !== true) {
          needsUpdate = true;
        }
        if (permission.canUpdate !== true) {
          needsUpdate = true;
        }
        // canDelete: role_permissions ve audit_logs hariç tüm kaynaklar için true
        if (permission.resource !== "audit_logs" && permission.canDelete !== true) {
          needsUpdate = true;
        }
      }
      // Personel için sınırlı alt yetkiler
      else if (permission.role === "personnel") {
        if (permission.resource === "tasks") {
          const taskSubPerms = ["canEditOwn", "canDeleteOwn", "canAddComment", "canAddAttachment"];
          taskSubPerms.forEach(key => {
            if (updatedSubPermissions[key] !== true) {
              updatedSubPermissions[key] = true;
              needsUpdate = true;
            }
          });
        } else if (permission.resource === "production_orders") {
          if (updatedSubPermissions.canViewSchedule !== true) {
            updatedSubPermissions.canViewSchedule = true;
            needsUpdate = true;
          }
        }
      }

      // Güncelleme gerekiyorsa yap
      if (needsUpdate) {
        const updateData: Partial<RolePermission> = {
          updatedAt: Timestamp.now(),
        };

        // Ekip lideri için ana yetkileri de güncelle
        if (permission.role === "team_leader" && permission.resource !== "role_permissions") {
          if (permission.canCreate !== true) {
            updateData.canCreate = true;
          }
          if (permission.canUpdate !== true) {
            updateData.canUpdate = true;
          }
          // canDelete: role_permissions ve audit_logs hariç tüm kaynaklar için true
          if (permission.resource !== "audit_logs" && permission.canDelete !== true) {
            updateData.canDelete = true;
          }
        }

        // subPermissions sadece varsa ekle (undefined değerleri Firestore kabul etmez)
        if (Object.keys(updatedSubPermissions).length > 0) {
          updateData.subPermissions = updatedSubPermissions;
        }

        // undefined değerleri kaldır
        const cleanUpdateData = Object.fromEntries(
          Object.entries(updateData).filter(([_, value]) => value !== undefined)
        );

        await updateDoc(doc(db, ROLE_PERMISSIONS_COLLECTION, docSnap.id), cleanUpdateData);
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Error updating permissions with sub-permissions:", error);
    }
  }
};

/**
 * Get all role permissions
 */
export const getRolePermissions = async (): Promise<RolePermission[]> => {
  try {
    // Initialize default roles first
    await initializeDefaultRoles();

    // Initialize default permissions if needed
    await initializeDefaultPermissions();

    // Mevcut izinleri alt yetkilerle güncelle
    await updatePermissionsWithSubPermissions();

    const permissionsRef = collection(db, ROLE_PERMISSIONS_COLLECTION);
    const snapshot = await getDocs(permissionsRef);

    const permissions = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as RolePermission[];

    // Pre-populate cache with all permissions for faster access
    permissions.forEach(permission => {
      const cacheKey = `${permission.role}:${permission.resource}`;
      if (!permissionCache.has(cacheKey) || isCacheExpired(cacheKey)) {
        permissionCache.set(cacheKey, permission);
        updateCacheTimestamp(cacheKey);
      }
    });

    return permissions;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error getting role permissions:", error);
    }
    throw new Error(error instanceof Error ? error.message : "Rol yetkileri yüklenemedi");
  }
};

/**
 * Get permission for a specific role and resource
 * Uses cache and real-time listener for dynamic updates
 * IMPORTANT: Always returns the latest value from cache (updated by real-time listener)
 */
export const getPermission = async (
  role: string,
  resource: string,
  useCache: boolean = true
): Promise<RolePermission | null> => {
  const cacheKey = `${role}:${resource}`;

  try {
    const permissionsRef = collection(db, ROLE_PERMISSIONS_COLLECTION);
    const q = query(
      permissionsRef,
      where("role", "==", role),
      where("resource", "==", resource)
    );

    // If cache is disabled, get directly from Firestore
    if (!useCache) {
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }
      const docSnap = snapshot.docs[0];
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as RolePermission;
    }

    // If cache already has value, return it immediately if not expired
    if (permissionCache.has(cacheKey)) {
      if (!isCacheExpired(cacheKey)) {
        return permissionCache.get(cacheKey) || null;
      }
      // If expired, assume listener will refresh it or we just update timestamp if listener is active
      // Since we have real-time listener, treat as fresh but update timestamp
      updateCacheTimestamp(cacheKey);
      return permissionCache.get(cacheKey) || null;
    }

    // Set up real-time listener if not already set
    if (!permissionListeners.has(cacheKey)) {
      // First, get initial value synchronously to avoid race condition
      const initialSnapshot = await getDocs(q);
      let initialPermission: RolePermission | null = null;

      if (!initialSnapshot.empty) {
        const docSnap = initialSnapshot.docs[0];
        initialPermission = {
          id: docSnap.id,
          ...docSnap.data(),
        } as RolePermission;
      }

      // Cache the initial value immediately
      permissionCache.set(cacheKey, initialPermission);
      updateCacheTimestamp(cacheKey);

      // Then set up real-time listener for future updates
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          permissionCache.set(cacheKey, null);
        } else {
          const docSnap = snapshot.docs[0];
          const permission = {
            id: docSnap.id,
            ...docSnap.data(),
          } as RolePermission;
          permissionCache.set(cacheKey, permission);
        }
        updateCacheTimestamp(cacheKey);
        // Notify all callbacks about cache change
        cacheCallbacks.forEach(callback => callback());
      }, (error) => {
        if (import.meta.env.DEV) {
          console.error(`Error listening to permission ${cacheKey}:`, error);
        }
      });

      permissionListeners.set(cacheKey, unsubscribe);

      // Return the initial value we just cached
      return initialPermission;
    }

    // Listener already exists, return cached value (should be available now)
    updateCacheTimestamp(cacheKey);
    return permissionCache.get(cacheKey) || null;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error getting permission:", error);
    }
    throw new Error(error instanceof Error ? error.message : "Yetki yüklenemedi");
  }
};

/**
 * Cleanup all permission listeners
 */
export const cleanupPermissionListeners = (): void => {
  permissionListeners.forEach(unsubscribe => unsubscribe());
  permissionListeners.clear();
  permissionCache.clear();
  cacheCallbacks.clear();
};

/**
 * Get sub-permissions for a resource
 */
export const getSubPermissionsForResource = (resource: string): Record<string, string> => {
  const subPermissions: Record<string, Record<string, string>> = {
    tasks: {
      canAssign: "Görev atama",
      canChangeStatus: "Durum değiştirme",
      canAddComment: "Yorum ekleme",
      canAddAttachment: "Dosya ekleme",
      canViewAll: "Tüm görevleri görme",
      canEditOwn: "Kendi görevlerini düzenleme",
      canDeleteOwn: "Kendi görevlerini silme",
      canApprove: "Görev onaylama",
      canAddChecklist: "Checklist ekleme",
      canEditChecklist: "Checklist düzenleme/silme",
      canViewPrivate: "Gizli görevleri görme",
    },
    users: {
      canChangeRole: "Rol değiştirme",
      canViewSensitiveData: "Hassas verileri görme",
      canViewAuditLogs: "Denetim kayıtlarını görme",
    },
    departments: {
      canAssignMembers: "Üye atama",
      canChangeLeader: "Lider değiştirme",
      canViewAll: "Tüm departmanları görme",
      canApproveTeamRequest: "Ekip taleplerini onaylama",
      canViewTeamManagement: "Ekip yönetimi menüsünü görme",
    },
    orders: {
      canApprove: "Onaylama",
      canCancel: "İptal etme",
      canExport: "Dışa aktarma",
      canViewFinancials: "Finansal bilgileri görme",
      canEditPrice: "Fiyat düzenleme",
    },
    production_orders: {
      canStartProduction: "Üretimi başlatma",
      canCompleteProduction: "Üretimi tamamlama",
      canViewSchedule: "Üretim planını görme",
      canEditSchedule: "Üretim planını düzenleme",
    },
    customers: {
      canViewFinancials: "Finansal bilgileri görme",
      canEditFinancials: "Finansal bilgileri düzenleme",
      canExport: "Dışa aktarma",
      canViewHistory: "Geçmiş kayıtları görme",
    },
    products: {
      canEditPrice: "Fiyat düzenleme",
      canEditStock: "Stok düzenleme",
      canViewCost: "Maliyet görme",
      canEditCost: "Maliyet düzenleme",
      canExport: "Dışa aktarma",
    },
    projects: {
      canAssignMembers: "Üye atama",
      canChangeStatus: "Durum değiştirme",
      canViewAll: "Tüm projeleri görme",
      canEditBudget: "Bütçe düzenleme",
      canViewPrivate: "Gizli projeleri görme",
    },
    audit_logs: {
      canViewAll: "Tüm kayıtları görme",
      canExport: "Dışa aktarma",
      canDelete: "Kayıt silme",
    },
    role_permissions: {
      canCreateRoles: "Rol oluşturma",
      canDeleteRoles: "Rol silme",
      canEditSystemRoles: "Sistem rollerini düzenleme",
      canViewAdminPanel: "Admin paneli menüsünü görme",
    },
    raw_materials: {
      canEditStock: "Stok düzenleme",
      canViewCost: "Maliyet görme",
      canEditCost: "Maliyet düzenleme",
      canExport: "Dışa aktarma",
      canViewTransactions: "İşlem geçmişini görme",
      canCreateTransactions: "Stok işlemi oluşturma",
    },
    warranty: {
      canApprove: "Garanti onaylama",
      canReject: "Garanti reddetme",
      canViewFinancials: "Finansal bilgileri görme",
      canExport: "Dışa aktarma",
      canViewHistory: "Geçmiş kayıtları görme",
    },
  };

  return subPermissions[resource] || {};
};

/**
 * Update a permission
 */
export const updatePermission = async (
  permissionId: string,
  updates: Partial<Omit<RolePermission, "id" | "createdAt" | "updatedAt">>
): Promise<void> => {
  try {
    const permissionRef = doc(db, ROLE_PERMISSIONS_COLLECTION, permissionId);

    // Get current permission to find cache key
    const currentPermission = await getDoc(permissionRef);
    if (currentPermission.exists()) {
      const data = currentPermission.data() as RolePermission;
      const cacheKey = `${data.role}:${data.resource}`;
      // Invalidate cache for this permission - listener will update it
      permissionCache.delete(cacheKey);
    }

    // undefined değerleri kaldır (Firestore undefined kabul etmez)
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        // Eğer value bir obje ise (subPermissions gibi), içindeki undefined değerleri de temizle
        if (typeof value === 'object' && value !== null && !(value instanceof Timestamp)) {
          const cleanValue = Object.fromEntries(
            Object.entries(value).filter(([_, v]) => v !== undefined)
          );
          if (Object.keys(cleanValue).length > 0) {
            cleanUpdates[key] = cleanValue;
          }
        } else {
          cleanUpdates[key] = value;
        }
      }
    }

    await updateDoc(permissionRef, {
      ...cleanUpdates,
      updatedAt: Timestamp.now(),
    });

    // Cache will be updated by real-time listener automatically
    // No need to manually update cache
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error updating permission:", error);
    }
    throw new Error(error instanceof Error ? error.message : "Yetki güncellenemedi");
  }
};
