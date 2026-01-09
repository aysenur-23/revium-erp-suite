import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  or,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { getUserProfile, getAllUsers, UserProfile } from "./authService";
import { getDepartments, Department } from "./departmentService";

export interface AuditLog {
  id: string;
  userId: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  tableName: string;
  recordId: string | null;
  oldData: unknown;
  newData: unknown;
  createdAt: Timestamp;
  userName?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
}

const AUDIT_LOGS_COLLECTION = "audit_logs";

/**
 * Create an audit log entry
 */
export const createAuditLog = async (
  action: "CREATE" | "UPDATE" | "DELETE",
  tableName: string,
  recordId: string | null,
  oldData: unknown = null,
  newData: unknown = null,
  userId: string | null = null,
  metadata?: Record<string, unknown>
): Promise<string> => {
  try {
    const logsRef = collection(db, AUDIT_LOGS_COLLECTION);
    const newLog: {
      userId: string | null;
      action: "CREATE" | "UPDATE" | "DELETE";
      tableName: string;
      recordId: string | null;
      oldData: unknown;
      newData: unknown;
      createdAt: Timestamp;
      metadata?: Record<string, unknown>;
    } = {
      userId,
      action,
      tableName,
      recordId,
      oldData,
      newData,
      createdAt: Timestamp.now(),
    };
<<<<<<< HEAD

    if (metadata) {
      newLog.metadata = metadata;
    }

=======
    
    if (metadata) {
      newLog.metadata = metadata;
    }
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    const docRef = await addDoc(logsRef, newLog);
    return docRef.id;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error creating audit log:", error);
    }
    // Don't throw - audit logs shouldn't break the main flow
    return "";
  }
};

/**
 * Get audit logs with filters
 */
export const getAuditLogs = async (options?: {
  limit?: number;
  action?: "CREATE" | "UPDATE" | "DELETE";
  tableName?: string;
  userId?: string;
}): Promise<AuditLog[]> => {
  try {
    const logsRef = collection(db, AUDIT_LOGS_COLLECTION);
    let q = query(logsRef, orderBy("createdAt", "desc"));
<<<<<<< HEAD

    // Default limit: 100 (performans için)
    const queryLimit = options?.limit || 100;
    q = query(q, limit(queryLimit));

    if (options?.action) {
      q = query(q, where("action", "==", options.action));
    }

    if (options?.tableName) {
      q = query(q, where("tableName", "==", options.tableName));
    }

    if (options?.userId) {
      q = query(q, where("userId", "==", options.userId));
    }

    const snapshot = await getDocs(q);
    const logs: AuditLog[] = [];
    const userIds = new Set<string>();

=======
    
    // Default limit: 100 (performans için)
    const queryLimit = options?.limit || 100;
    q = query(q, limit(queryLimit));
    
    if (options?.action) {
      q = query(q, where("action", "==", options.action));
    }
    
    if (options?.tableName) {
      q = query(q, where("tableName", "==", options.tableName));
    }
    
    if (options?.userId) {
      q = query(q, where("userId", "==", options.userId));
    }
    
    const snapshot = await getDocs(q);
    const logs: AuditLog[] = [];
    const userIds = new Set<string>();
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Önce tüm logları topla ve userId'leri biriktir
    for (const docSnap of snapshot.docs) {
      const logData = docSnap.data() as Omit<AuditLog, "id">;
      const log: AuditLog = {
        id: docSnap.id,
        ...logData,
      };
<<<<<<< HEAD

      if (log.userId) {
        userIds.add(log.userId);
      }

      logs.push(log);
    }

=======
      
      if (log.userId) {
        userIds.add(log.userId);
      }
      
      logs.push(log);
    }
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Tüm kullanıcıları bir kerede al
    const userMap = new Map<string, { fullName?: string; email: string }>();
    if (userIds.size > 0) {
      try {
        const allUsers = await getAllUsers();
        allUsers.forEach(user => {
          if (userIds.has(user.id)) {
            userMap.set(user.id, {
              fullName: user.fullName || user.displayName,
              email: user.email,
            });
          }
        });
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Error fetching users:", error);
        }
      }
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // User bilgilerini loglara ekle
    logs.forEach(log => {
      if (log.userId) {
        const userInfo = userMap.get(log.userId);
        if (userInfo) {
          log.userName = userInfo.fullName || userInfo.email;
          log.userEmail = userInfo.email;
        }
      }
    });
<<<<<<< HEAD

    return logs;
  } catch (error: unknown) {
    // Index hatası durumunda basit query dene
    const err = error as { code?: string; message?: string };
    if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
=======
    
    return logs;
  } catch (error: unknown) {
    // Index hatası durumunda basit query dene
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      console.warn("Audit logs index bulunamadı, basit query kullanılıyor");
      try {
        const queryLimit = options?.limit || 100;
        const simpleQuery = query(collection(db, AUDIT_LOGS_COLLECTION), orderBy("createdAt", "desc"), limit(queryLimit));
        const snapshot = await getDocs(simpleQuery);
        let logs = snapshot.docs.map((docSnap) => {
          const logData = docSnap.data() as Omit<AuditLog, "id">;
          return {
            id: docSnap.id,
            ...logData,
          } as AuditLog;
        });
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Client-side filtreleme
        if (options?.action) {
          logs = logs.filter(l => l.action === options.action);
        }
        if (options?.tableName) {
          logs = logs.filter(l => l.tableName === options.tableName);
        }
        if (options?.userId) {
          logs = logs.filter(l => l.userId === options.userId);
        }
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Tarihe göre sırala (zaten orderBy var ama emin olmak için)
        logs.sort((a, b) => {
          const aDate = a.createdAt?.toMillis() || 0;
          const bDate = b.createdAt?.toMillis() || 0;
          return bDate - aDate;
        });
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Tüm kullanıcıları bir kerede al
        const userIds = new Set(logs.map(log => log.userId).filter(Boolean) as string[]);
        const userMap = new Map<string, { fullName?: string; email: string }>();
        if (userIds.size > 0) {
          try {
            const allUsers = await getAllUsers();
            allUsers.forEach(user => {
              if (userIds.has(user.id)) {
                userMap.set(user.id, {
                  fullName: user.fullName || user.displayName,
                  email: user.email,
                });
              }
            });
          } catch (error: unknown) {
            if (import.meta.env.DEV) {
              console.error("Error fetching users:", error);
            }
          }
        }
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // User bilgilerini loglara ekle
        logs.forEach(log => {
          if (log.userId) {
            const userInfo = userMap.get(log.userId);
            if (userInfo) {
              log.userName = userInfo.fullName || userInfo.email;
              log.userEmail = userInfo.email;
            }
          }
        });
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        return logs;
      } catch (fallbackError: unknown) {
        if (import.meta.env.DEV) {
          console.error("Fallback query de başarısız:", fallbackError);
        }
        return [];
      }
    }
    if (import.meta.env.DEV) {
      console.error("Error getting audit logs:", error);
    }
    const errorMessage = error instanceof Error ? error.message : "Audit logları yüklenemedi";
    throw new Error(errorMessage);
  }
};

/**
 * Get recent activities (last 10 logs)
 */
export const getRecentActivities = async (): Promise<AuditLog[]> => {
  return getAuditLogs({ limit: 10 });
};

/**
 * Ekip üyelerinin loglarını getir (ekip lideri için)
 * Ekip liderinin kendi loglarını ve yönettiği ekiplerdeki üyelerin loglarını döndürür
 */
export const getTeamMemberLogs = async (teamLeaderId: string): Promise<{
  logs: AuditLog[];
  teamInfo: {
    managedTeams: Array<{ id: string; name: string }>;
    teamMembers: Array<{ id: string; name: string; email: string }>;
  };
}> => {
  try {
    const [departments, allUsers] = await Promise.all([
      getDepartments(),
      getAllUsers(),
    ]);
<<<<<<< HEAD

    // Ekip liderinin yönettiği ekipleri bul
    const managedTeams = departments.filter((dept) => dept.managerId === teamLeaderId);

=======
    
    // Ekip liderinin yönettiği ekipleri bul
    const managedTeams = departments.filter((dept) => dept.managerId === teamLeaderId);
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    const teamInfo = {
      managedTeams: managedTeams.map(team => ({ id: team.id, name: team.name })),
      teamMembers: [] as Array<{ id: string; name: string; email: string }>,
    };
<<<<<<< HEAD

    if (managedTeams.length === 0) {
      return { logs: [], teamInfo };
    }

    const teamIds = managedTeams.map((team) => team.id);

=======
    
    if (managedTeams.length === 0) {
      return { logs: [], teamInfo };
    }
    
    const teamIds = managedTeams.map((team) => team.id);
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Bu ekiplere ait kullanıcıları bul
    const teamMembers = allUsers.filter((user) => {
      const approvedTeams = user.approvedTeams || [];
      const pendingTeams = user.pendingTeams || [];
      return [...approvedTeams, ...pendingTeams].some((teamId) => teamIds.includes(teamId));
    });
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Ekip üyeleri bilgilerini kaydet
    teamInfo.teamMembers = teamMembers.map(member => ({
      id: member.id,
      name: member.fullName || member.email,
      email: member.email,
    }));
<<<<<<< HEAD

    const teamMemberIds = teamMembers.map((member) => member.id);

    // Ekip liderinin kendi loglarını da dahil et
    const allRelevantUserIds = [...teamMemberIds, teamLeaderId];

=======
    
    const teamMemberIds = teamMembers.map((member) => member.id);
    
    // Ekip liderinin kendi loglarını da dahil et
    const allRelevantUserIds = [...teamMemberIds, teamLeaderId];
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Tüm logları al ve filtrele (limit ile)
    try {
      const logsRef = collection(db, AUDIT_LOGS_COLLECTION);
      const snapshot = await getDocs(query(logsRef, orderBy("createdAt", "desc"), limit(500))); // Max 500 log
<<<<<<< HEAD

      const logs: AuditLog[] = [];
      const userIds = new Set<string>();

      // Önce tüm logları topla ve userId'leri biriktir
      for (const docSnap of snapshot.docs) {
        const logData = docSnap.data() as Omit<AuditLog, "id">;

=======
      
      const logs: AuditLog[] = [];
      const userIds = new Set<string>();
      
      // Önce tüm logları topla ve userId'leri biriktir
      for (const docSnap of snapshot.docs) {
        const logData = docSnap.data() as Omit<AuditLog, "id">;
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Ekip üyelerinin ve ekip liderinin loglarını al
        if (logData.userId && allRelevantUserIds.includes(logData.userId)) {
          const log: AuditLog = {
            id: docSnap.id,
            ...logData,
          };
<<<<<<< HEAD

          if (log.userId) {
            userIds.add(log.userId);
          }

          logs.push(log);
        }
      }

=======
          
          if (log.userId) {
            userIds.add(log.userId);
          }
          
          logs.push(log);
        }
      }
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Tüm kullanıcıları bir kerede al
      const userMap = new Map<string, { fullName?: string; email: string }>();
      if (userIds.size > 0) {
        try {
          const allUsers = await getAllUsers();
          allUsers.forEach(user => {
            if (userIds.has(user.id)) {
              userMap.set(user.id, {
                fullName: user.fullName || user.displayName,
                email: user.email,
              });
            }
          });
        } catch (error: unknown) {
          if (import.meta.env.DEV) {
            console.error("Error fetching users:", error);
          }
        }
      }
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // User bilgilerini loglara ekle
      logs.forEach(log => {
        if (log.userId) {
          const userInfo = userMap.get(log.userId);
          if (userInfo) {
            log.userName = userInfo.fullName || userInfo.email;
            log.userEmail = userInfo.email;
          }
        }
      });
<<<<<<< HEAD

      return { logs, teamInfo };
    } catch (error: unknown) {
      // Index hatası durumunda basit query dene
      const err = error as { code?: string; message?: string };
      if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
=======
      
      return { logs, teamInfo };
    } catch (error: unknown) {
      // Index hatası durumunda basit query dene
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        console.warn("Team member logs index bulunamadı, basit query kullanılıyor");
        try {
          const simpleQuery = query(collection(db, AUDIT_LOGS_COLLECTION), orderBy("createdAt", "desc"));
          const snapshot = await getDocs(simpleQuery);
<<<<<<< HEAD
          const logs = snapshot.docs
=======
          let logs = snapshot.docs
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            .map((docSnap) => {
              const logData = docSnap.data() as Omit<AuditLog, "id">;
              return {
                id: docSnap.id,
                ...logData,
              } as AuditLog;
            })
            .filter((log) => log.userId && allRelevantUserIds.includes(log.userId));
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // Tarihe göre sırala
          logs.sort((a, b) => {
            const aDate = a.createdAt?.toMillis() || 0;
            const bDate = b.createdAt?.toMillis() || 0;
            return bDate - aDate;
          });
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // Tüm kullanıcıları bir kerede al
          const userIds = new Set(logs.map(log => log.userId).filter(Boolean) as string[]);
          const userMap = new Map<string, { fullName?: string; email: string }>();
          if (userIds.size > 0) {
<<<<<<< HEAD
            try {
=======
              try {
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              const allUsers = await getAllUsers();
              allUsers.forEach(user => {
                if (userIds.has(user.id)) {
                  userMap.set(user.id, {
                    fullName: user.fullName || user.displayName,
                    email: user.email,
                  });
                }
              });
<<<<<<< HEAD
            } catch (error: unknown) {
              console.error("Error fetching users:", error);
            }
          }

=======
              } catch (error: unknown) {
              console.error("Error fetching users:", error);
              }
          }
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // User bilgilerini loglara ekle
          logs.forEach(log => {
            if (log.userId) {
              const userInfo = userMap.get(log.userId);
              if (userInfo) {
                log.userName = userInfo.fullName || userInfo.email;
                log.userEmail = userInfo.email;
<<<<<<< HEAD
              }
            }
          });

=======
            }
          }
          });
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          return { logs, teamInfo };
        } catch (fallbackError: unknown) {
          if (import.meta.env.DEV) {
            console.error("Fallback query de başarısız:", fallbackError);
          }
          return { logs: [], teamInfo };
        }
      }
      throw error;
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error getting team member logs:", error);
    }
    return { logs: [], teamInfo: { managedTeams: [], teamMembers: [] } };
  }
};

/**
 * Belirli bir kullanıcının loglarını getir (yetki kontrolü ile)
 */
export const getUserLogsWithPermission = async (
  viewerId: string,
  targetUserId: string
): Promise<AuditLog[]> => {
  try {
    const [viewer, targetUser, departments, allUsers] = await Promise.all([
      getUserProfile(viewerId),
      getUserProfile(targetUserId),
      getDepartments(),
      getAllUsers(),
    ]);
<<<<<<< HEAD

    if (!viewer) {
      throw new Error("Görüntüleyen kullanıcı bulunamadı");
    }

=======
    
    if (!viewer) {
      throw new Error("Görüntüleyen kullanıcı bulunamadı");
    }
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Kullanıcı kendi loglarını görebilir
    if (viewer.id === targetUserId) {
      return getAuditLogs({ userId: targetUserId });
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Ana yöneticiler tüm logları görebilir
    if (viewer.role?.includes("main_admin") || viewer.role?.includes("super_admin")) {
      return getAuditLogs({ userId: targetUserId });
    }
<<<<<<< HEAD


=======
    
    // Super Admin tüm logları görebilir
    if (viewer.role?.includes("super_admin") || viewer.role?.includes("main_admin")) {
      return getAuditLogs({ userId: targetUserId });
    }
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Ekip liderleri ekip üyelerinin loglarını görebilir
    const managedTeams = departments.filter((dept) => dept.managerId === viewer.id);
    if (managedTeams.length > 0) {
      const teamIds = managedTeams.map((team) => team.id);
      const targetUserTeams = [
        ...(targetUser?.approvedTeams || []),
        ...(targetUser?.pendingTeams || []),
      ];
<<<<<<< HEAD

      const isTeamMember = targetUserTeams.some((teamId) => teamIds.includes(teamId));

=======
      
      const isTeamMember = targetUserTeams.some((teamId) => teamIds.includes(teamId));
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      if (isTeamMember) {
        return getAuditLogs({ userId: targetUserId });
      }
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Yetki yok
    throw new Error("Bu kullanıcının loglarını görüntüleme yetkiniz yok");
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error getting user logs with permission:", error);
    }
    throw error;
  }
};

/**
 * Kullanıcının tüm loglarını sil
 */
export const deleteUserLogs = async (userId: string): Promise<void> => {
  try {
    const logsRef = collection(db, AUDIT_LOGS_COLLECTION);
<<<<<<< HEAD

    // Kullanıcının tüm loglarını bul
    const q = query(logsRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    // Batch write ile tüm logları sil (500'den fazla ise birden fazla batch)
    const batchSize = 500;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + batchSize);

      batchDocs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

=======
    
    // Kullanıcının tüm loglarını bul
    const q = query(logsRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    
    // Batch write ile tüm logları sil (500'den fazla ise birden fazla batch)
    const batchSize = 500;
    const docs = snapshot.docs;
    
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + batchSize);
      
      batchDocs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      await batch.commit();
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error deleting user logs:", error);
    }
    // Log silme hatası kullanıcı silme işlemini engellemez
    throw error;
  }
};

