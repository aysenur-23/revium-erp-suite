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
  oldData: any;
  newData: any;
  createdAt: Timestamp;
  userName?: string;
  userEmail?: string;
  metadata?: any;
}

const AUDIT_LOGS_COLLECTION = "audit_logs";

/**
 * Create an audit log entry
 */
export const createAuditLog = async (
  action: "CREATE" | "UPDATE" | "DELETE",
  tableName: string,
  recordId: string | null,
  oldData: any = null,
  newData: any = null,
  userId: string | null = null
): Promise<string> => {
  try {
    const logsRef = collection(db, AUDIT_LOGS_COLLECTION);
    const newLog = {
      userId,
      action,
      tableName,
      recordId,
      oldData,
      newData,
      createdAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(logsRef, newLog);
    return docRef.id;
  } catch (error: any) {
    console.error("Error creating audit log:", error);
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
    
    // Önce tüm logları topla ve userId'leri biriktir
    for (const docSnap of snapshot.docs) {
      const logData = docSnap.data() as Omit<AuditLog, "id">;
      const log: AuditLog = {
        id: docSnap.id,
        ...logData,
      };
      
      if (log.userId) {
        userIds.add(log.userId);
      }
      
      logs.push(log);
    }
    
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
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }
    
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
    
    return logs;
  } catch (error: any) {
    // Index hatası durumunda basit query dene
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
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
        
        // Tarihe göre sırala (zaten orderBy var ama emin olmak için)
        logs.sort((a, b) => {
          const aDate = a.createdAt?.toMillis() || 0;
          const bDate = b.createdAt?.toMillis() || 0;
          return bDate - aDate;
        });
        
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
          } catch (error) {
            console.error("Error fetching users:", error);
          }
        }
        
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
        
        return logs;
      } catch (fallbackError) {
        console.error("Fallback query de başarısız:", fallbackError);
        return [];
      }
    }
    console.error("Error getting audit logs:", error);
    throw new Error(error.message || "Audit logları yüklenemedi");
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
    
    // Ekip liderinin yönettiği ekipleri bul
    const managedTeams = departments.filter((dept) => dept.managerId === teamLeaderId);
    
    const teamInfo = {
      managedTeams: managedTeams.map(team => ({ id: team.id, name: team.name })),
      teamMembers: [] as Array<{ id: string; name: string; email: string }>,
    };
    
    if (managedTeams.length === 0) {
      return { logs: [], teamInfo };
    }
    
    const teamIds = managedTeams.map((team) => team.id);
    
    // Bu ekiplere ait kullanıcıları bul
    const teamMembers = allUsers.filter((user) => {
      const approvedTeams = user.approvedTeams || [];
      const pendingTeams = user.pendingTeams || [];
      return [...approvedTeams, ...pendingTeams].some((teamId) => teamIds.includes(teamId));
    });
    
    // Ekip üyeleri bilgilerini kaydet
    teamInfo.teamMembers = teamMembers.map(member => ({
      id: member.id,
      name: member.fullName || member.email,
      email: member.email,
    }));
    
    const teamMemberIds = teamMembers.map((member) => member.id);
    
    // Ekip liderinin kendi loglarını da dahil et
    const allRelevantUserIds = [...teamMemberIds, teamLeaderId];
    
    // Tüm logları al ve filtrele (limit ile)
    try {
      const logsRef = collection(db, AUDIT_LOGS_COLLECTION);
      const snapshot = await getDocs(query(logsRef, orderBy("createdAt", "desc"), limit(500))); // Max 500 log
      
      const logs: AuditLog[] = [];
      const userIds = new Set<string>();
      
      // Önce tüm logları topla ve userId'leri biriktir
      for (const docSnap of snapshot.docs) {
        const logData = docSnap.data() as Omit<AuditLog, "id">;
        
        // Ekip üyelerinin ve ekip liderinin loglarını al
        if (logData.userId && allRelevantUserIds.includes(logData.userId)) {
          const log: AuditLog = {
            id: docSnap.id,
            ...logData,
          };
          
          if (log.userId) {
            userIds.add(log.userId);
          }
          
          logs.push(log);
        }
      }
      
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
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      }
      
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
      
      return { logs, teamInfo };
    } catch (error: any) {
      // Index hatası durumunda basit query dene
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        console.warn("Team member logs index bulunamadı, basit query kullanılıyor");
        try {
          const simpleQuery = query(collection(db, AUDIT_LOGS_COLLECTION), orderBy("createdAt", "desc"));
          const snapshot = await getDocs(simpleQuery);
          let logs = snapshot.docs
            .map((docSnap) => {
              const logData = docSnap.data() as Omit<AuditLog, "id">;
              return {
                id: docSnap.id,
                ...logData,
              } as AuditLog;
            })
            .filter((log) => log.userId && allRelevantUserIds.includes(log.userId));
          
          // Tarihe göre sırala
          logs.sort((a, b) => {
            const aDate = a.createdAt?.toMillis() || 0;
            const bDate = b.createdAt?.toMillis() || 0;
            return bDate - aDate;
          });
          
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
              } catch (error) {
              console.error("Error fetching users:", error);
              }
          }
          
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
          
          return { logs, teamInfo };
        } catch (fallbackError) {
          console.error("Fallback query de başarısız:", fallbackError);
          return { logs: [], teamInfo };
        }
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Error getting team member logs:", error);
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
    
    if (!viewer) {
      throw new Error("Görüntüleyen kullanıcı bulunamadı");
    }
    
    // Kullanıcı kendi loglarını görebilir
    if (viewer.id === targetUserId) {
      return getAuditLogs({ userId: targetUserId });
    }
    
    // Ana yöneticiler tüm logları görebilir
    if (viewer.role?.includes("main_admin") || viewer.role?.includes("super_admin")) {
      return getAuditLogs({ userId: targetUserId });
    }
    
    // Adminler tüm logları görebilir
    if (viewer.role?.includes("admin")) {
      return getAuditLogs({ userId: targetUserId });
    }
    
    // Ekip liderleri ekip üyelerinin loglarını görebilir
    const managedTeams = departments.filter((dept) => dept.managerId === viewer.id);
    if (managedTeams.length > 0) {
      const teamIds = managedTeams.map((team) => team.id);
      const targetUserTeams = [
        ...(targetUser?.approvedTeams || []),
        ...(targetUser?.pendingTeams || []),
      ];
      
      const isTeamMember = targetUserTeams.some((teamId) => teamIds.includes(teamId));
      
      if (isTeamMember) {
        return getAuditLogs({ userId: targetUserId });
      }
    }
    
    // Yetki yok
    throw new Error("Bu kullanıcının loglarını görüntüleme yetkiniz yok");
  } catch (error: any) {
    console.error("Error getting user logs with permission:", error);
    throw error;
  }
};

/**
 * Kullanıcının tüm loglarını sil
 */
export const deleteUserLogs = async (userId: string): Promise<void> => {
  try {
    const logsRef = collection(db, AUDIT_LOGS_COLLECTION);
    
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
      
      await batch.commit();
    }
  } catch (error: any) {
    console.error("Error deleting user logs:", error);
    // Log silme hatası kullanıcı silme işlemini engellemez
    throw error;
  }
};

