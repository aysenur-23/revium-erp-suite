/**
 * Team Approval Service
 * Ekip onay işlemleri
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { getUserProfile, getAllUsers, UserProfile } from "./authService";
import { getDepartmentById, Department, getDepartments } from "./departmentService";
import { createNotification } from "./notificationService";

export interface TeamApprovalRequest {
  userId: string;
  userName: string;
  userEmail: string;
  teamId: string;
  teamName: string;
  requestedAt: Timestamp;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectedReason?: string;
}

/**
 * Onay bekleyen ekip taleplerini al (ekip lideri için)
 */
export const getPendingTeamRequests = async (teamLeaderId: string): Promise<TeamApprovalRequest[]> => {
  try {
    // Ekip liderinin yönettiği ekipleri bul
    const departmentsRef = collection(firestore, "departments");
    const departmentsQuery = query(departmentsRef, where("managerId", "==", teamLeaderId));
    const departmentsSnapshot = await getDocs(departmentsQuery);
    
    const teamIds = departmentsSnapshot.docs.map(doc => doc.id);
    
    if (teamIds.length === 0) {
      return [];
    }

    // Bu ekiplere ait onay bekleyen kullanıcıları bul
    const allUsers = await getAllUsers();
    
    const requests: TeamApprovalRequest[] = [];
    
    for (const user of allUsers) {
      // Silinen veya geçersiz kullanıcıları atla
      if (!user || !user.id || !user.email) {
        continue;
      }
      // Silinmiş kullanıcıları atla (deleted flag kontrolü)
      if ((user as any).deleted === true) {
        continue;
      }
      if (user.pendingTeams && user.pendingTeams.length > 0) {
        for (const teamId of user.pendingTeams) {
          if (teamIds.includes(teamId)) {
            const team = await getDepartmentById(teamId);
            if (team) {
              requests.push({
                userId: user.id,
                userName: user.fullName || user.displayName || user.email,
                userEmail: user.email,
                teamId: teamId,
                teamName: team.name,
                requestedAt: user.createdAt || Timestamp.now(),
                status: "pending",
              });
            }
          }
        }
      }
    }
    
    return requests.sort((a, b) => {
      const aTime = a.requestedAt?.toMillis() || 0;
      const bTime = b.requestedAt?.toMillis() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Get pending team requests error:", error);
    }
    throw error;
  }
};

/**
 * Ana yöneticiler için tüm onay bekleyen talepleri al
 * Sadece ekip lideri olmayan (managerId yok veya null olan) ekiplerin taleplerini gösterir
 */
export const getAllPendingTeamRequests = async (): Promise<TeamApprovalRequest[]> => {
  try {
    // Tüm departmanları al
    const departmentsRef = collection(firestore, "departments");
    const departmentsSnapshot = await getDocs(departmentsRef);
    
    // Ekip lideri olan ekipleri bul (managerId var ve null değil)
    const teamsWithLeader = new Set<string>();
    departmentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.managerId && data.managerId.trim() !== '') {
        teamsWithLeader.add(doc.id);
      }
    });
    
    // Tüm kullanıcıları al
    const allUsers = await getAllUsers();
    const requests: TeamApprovalRequest[] = [];
    
    for (const user of allUsers) {
      // Silinen veya geçersiz kullanıcıları atla
      if (!user || !user.id || !user.email) {
        continue;
      }
      // Silinmiş kullanıcıları atla (deleted flag kontrolü)
      if ((user as any).deleted === true) {
        continue;
      }
      if (user.pendingTeams && user.pendingTeams.length > 0) {
        for (const teamId of user.pendingTeams) {
          // Sadece ekip lideri olmayan ekiplerin taleplerini ekle
          if (!teamsWithLeader.has(teamId)) {
            const team = await getDepartmentById(teamId);
            if (team) {
              requests.push({
                userId: user.id,
                userName: user.fullName || user.displayName || user.email,
                userEmail: user.email,
                teamId: teamId,
                teamName: team.name,
                requestedAt: user.createdAt || Timestamp.now(),
                status: "pending",
              });
            }
          }
        }
      }
    }
    
    return requests.sort((a, b) => {
      const aTime = a.requestedAt?.toMillis() || 0;
      const bTime = b.requestedAt?.toMillis() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error("Get all pending team requests error:", error);
    throw error;
  }
};

/**
 * Ekip talebini onayla
 */
export const approveTeamRequest = async (
  userId: string,
  teamId: string,
  approvedBy: string
): Promise<void> => {
  try {
    // Yetki kontrolü: Firestore'dan kontrol et
    const { getUserProfile } = await import("./authService");
    const approverProfile = await getUserProfile(approvedBy);
    if (approverProfile) {
      const { canApproveTeamRequest } = await import("@/utils/permissions");
      const departments = await getDepartments();
      const canApprove = await canApproveTeamRequest(approverProfile, departments);
      if (!canApprove) {
        throw new Error("Ekip talebi onaylama yetkiniz yok.");
      }
    }
    const userRef = doc(firestore, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("Kullanıcı bulunamadı");
    }
    
    const userData = userDoc.data() as UserProfile;
    const pendingTeams = userData.pendingTeams || [];
    const approvedTeams = userData.approvedTeams || [];
    const currentRoles = userData.role || [];
    
    // Ekip pendingTeams'den çıkar ve approvedTeams'e ekle
    // Eğer talep zaten onaylanmış veya reddedilmişse (pendingTeams'de yoksa), sessizce başarılı dön
    if (!pendingTeams.includes(teamId)) {
      // Talep zaten onaylanmış olabilir, kontrol et
      if (approvedTeams.includes(teamId)) {
        // Talep zaten onaylanmış, sessizce başarılı dön
        return;
      }
      // Talep bulunamadı - muhtemelen zaten işlenmiş veya kaldırılmış
      throw new Error("Bu ekip talebi bulunamadı. Talep zaten işlenmiş olabilir.");
    }
    
    const updatedPendingTeams = pendingTeams.filter(id => id !== teamId);
    const updatedApprovedTeams = [...approvedTeams, teamId];
    
    // Eğer kullanıcının rolü "viewer" (izleyici) ise, "personnel" (personel) olarak güncelle
    let updatedRoles = [...currentRoles];
    if (currentRoles.includes("viewer") && !currentRoles.includes("personnel")) {
      // viewer rolünü kaldır ve personnel ekle
      updatedRoles = currentRoles.filter((r: string) => r !== "viewer");
      if (!updatedRoles.includes("personnel")) {
        updatedRoles.push("personnel");
      }
      // Eğer hiç rol kalmadıysa, en azından personnel olsun
      if (updatedRoles.length === 0) {
        updatedRoles = ["personnel"];
      }
    }
    
    await updateDoc(userRef, {
      pendingTeams: updatedPendingTeams,
      approvedTeams: updatedApprovedTeams,
      role: updatedRoles,
      updatedAt: serverTimestamp(),
    });

    // Kullanıcıya bildirim gönder
    try {
      const team = await getDepartmentById(teamId);
      const approverProfile = await getUserProfile(approvedBy);
      const approverName = approverProfile?.fullName || approverProfile?.displayName || approverProfile?.email || "Yönetici";
      
      await createNotification({
        userId: userId,
        type: "system",
        title: "Ekip talebi onaylandı",
        message: `${approverName} "${team?.name || "ekip"}" ekibine katılım talebinizi onayladı.`,
        read: false,
        metadata: {
          teamId: teamId,
          teamName: team?.name,
          approvedBy: approvedBy,
        },
      });
    } catch (notifError) {
      console.error("Error sending approval notification:", notifError);
      // Bildirim hatası onay işlemini engellemez
    }
  } catch (error) {
    console.error("Approve team request error:", error);
    throw error;
  }
};

/**
 * Ekip talebini reddet
 */
export const rejectTeamRequest = async (
  userId: string,
  teamId: string,
  rejectedReason?: string,
  rejectedBy?: string
): Promise<void> => {
  try {
    // Yetki kontrolü: Firestore'dan kontrol et
    if (rejectedBy) {
      const { getUserProfile } = await import("./authService");
      const rejecterProfile = await getUserProfile(rejectedBy);
      if (rejecterProfile) {
        const { canApproveTeamRequest, getDepartments } = await import("@/utils/permissions");
        const departments = await getDepartments();
        const canApprove = await canApproveTeamRequest(rejecterProfile, departments);
        if (!canApprove) {
          throw new Error("Ekip talebi reddetme yetkiniz yok.");
        }
      }
    }
    const userRef = doc(firestore, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("Kullanıcı bulunamadı");
    }
    
    const userData = userDoc.data() as UserProfile;
    const pendingTeams = userData.pendingTeams || [];
    
    // Ekip pendingTeams'den çıkar
    if (!pendingTeams.includes(teamId)) {
      throw new Error("Bu ekip talebi bulunamadı");
    }
    
    const updatedPendingTeams = pendingTeams.filter(id => id !== teamId);
    
    await updateDoc(userRef, {
      pendingTeams: updatedPendingTeams,
      updatedAt: serverTimestamp(),
    });

    // Kullanıcıya bildirim gönder
    try {
      const team = await getDepartmentById(teamId);
      
      await createNotification({
        userId: userId,
        type: "system",
        title: "Ekip talebi reddedildi",
        message: `"${team?.name || "ekip"}" ekibine katılım talebiniz reddedildi.${rejectedReason ? ` Sebep: ${rejectedReason}` : ""}`,
        read: false,
        metadata: {
          teamId: teamId,
          teamName: team?.name,
          rejectedReason: rejectedReason,
        },
      });
    } catch (notifError) {
      console.error("Error sending rejection notification:", notifError);
      // Bildirim hatası red işlemini engellemez
    }
  } catch (error) {
    console.error("Reject team request error:", error);
    throw error;
  }
};

/**
 * Katılım isteklerini gerçek zamanlı olarak dinle
 * @param isAdmin Admin mi?
 * @param teamLeaderId Ekip lideri ID'si (admin değilse)
 * @param callback İstekler değiştiğinde çağrılacak callback
 * @returns Unsubscribe fonksiyonu
 */
export const subscribeToTeamRequests = (
  isAdmin: boolean,
  teamLeaderId: string | null,
  callback: (requests: TeamApprovalRequest[]) => void
): Unsubscribe => {
  try {
    const usersRef = collection(firestore, "users");
    
    // Tüm kullanıcıları dinle (pendingTeams alanı olanları filtreleyeceğiz)
    const unsubscribe = onSnapshot(
      usersRef,
      async (snapshot) => {
        try {
          // Tüm kullanıcıları al
          const allUsers = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
            } as UserProfile))
            .filter(user => user && user.id && user.email && !(user as any).deleted);

          // Departmanları al
          const departments = await getDepartments();
          
          let requests: TeamApprovalRequest[] = [];

          if (isAdmin) {
            // Admin için: Ekip lideri olmayan ekiplerin taleplerini göster
            const teamsWithLeader = new Set<string>();
            departments.forEach(dept => {
              if (dept.managerId && dept.managerId.trim() !== '') {
                teamsWithLeader.add(dept.id);
              }
            });

            for (const user of allUsers) {
              if (user.pendingTeams && user.pendingTeams.length > 0) {
                for (const teamId of user.pendingTeams) {
                  if (!teamsWithLeader.has(teamId)) {
                    const team = departments.find(d => d.id === teamId);
                    if (team) {
                      requests.push({
                        userId: user.id,
                        userName: user.fullName || user.displayName || user.email,
                        userEmail: user.email,
                        teamId: teamId,
                        teamName: team.name,
                        requestedAt: user.createdAt || Timestamp.now(),
                        status: "pending",
                      });
                    }
                  }
                }
              }
            }
          } else if (teamLeaderId) {
            // Ekip lideri için: Yönettiği ekiplerin taleplerini göster
            const managedDepartments = departments.filter(d => d.managerId === teamLeaderId);
            const teamIds = managedDepartments.map(d => d.id);

            if (teamIds.length > 0) {
              for (const user of allUsers) {
                if (user.pendingTeams && user.pendingTeams.length > 0) {
                  for (const teamId of user.pendingTeams) {
                    if (teamIds.includes(teamId)) {
                      const team = departments.find(d => d.id === teamId);
                      if (team) {
                        requests.push({
                          userId: user.id,
                          userName: user.fullName || user.displayName || user.email,
                          userEmail: user.email,
                          teamId: teamId,
                          teamName: team.name,
                          requestedAt: user.createdAt || Timestamp.now(),
                          status: "pending",
                        });
                      }
                    }
                  }
                }
              }
            }
          }

          // Tarihe göre sırala
          requests.sort((a, b) => {
            const aTime = a.requestedAt?.toMillis() || 0;
            const bTime = b.requestedAt?.toMillis() || 0;
            return bTime - aTime;
          });

          callback(requests);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error("Subscribe to team requests error:", error);
          }
          callback([]);
        }
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.error("Team requests snapshot error:", error);
        }
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Subscribe to team requests setup error:", error);
    }
    // Hata durumunda boş callback döndür
    callback([]);
    return () => {}; // Boş unsubscribe fonksiyonu
  }
};

