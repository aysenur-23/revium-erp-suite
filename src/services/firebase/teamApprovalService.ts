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
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { getUserProfile, getAllUsers, UserProfile } from "./authService";
import { getDepartmentById, Department } from "./departmentService";
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
    console.error("Get pending team requests error:", error);
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
    const userRef = doc(firestore, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("Kullanıcı bulunamadı");
    }
    
    const userData = userDoc.data() as UserProfile;
    const pendingTeams = userData.pendingTeams || [];
    const approvedTeams = userData.approvedTeams || [];
    
    // Ekip pendingTeams'den çıkar ve approvedTeams'e ekle
    if (!pendingTeams.includes(teamId)) {
      throw new Error("Bu ekip talebi bulunamadı");
    }
    
    const updatedPendingTeams = pendingTeams.filter(id => id !== teamId);
    const updatedApprovedTeams = [...approvedTeams, teamId];
    
    await updateDoc(userRef, {
      pendingTeams: updatedPendingTeams,
      approvedTeams: updatedApprovedTeams,
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
  rejectedReason?: string
): Promise<void> => {
  try {
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

