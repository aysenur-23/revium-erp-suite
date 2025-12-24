/**
 * Warranty/After-Sales Service
 * Satış sonrası takip işlemleri
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

export interface WarrantyRecord {
  id: string;
  customerId: string;
  productId: string;
  orderId?: string | null;
  reason: string; // Neden geldi
  receivedDate: Timestamp;
  status: "received" | "in_repair" | "completed" | "returned";
  repairDescription?: string | null; // Nasıl bir işlem yapıldı
  cost: number; // Maliyet
  completedDate?: Timestamp | null;
  returnedDate?: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WarrantyComment {
  id: string;
  warrantyId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  content: string;
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string | null;
}

export interface WarrantyActivity {
  id: string;
  warrantyId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp | Date | string;
}

const WARRANTY_COLLECTION = "warranty";

/**
 * Tüm garanti kayıtlarını al
 */
export const getWarrantyRecords = async (filters?: {
  customerId?: string;
  status?: string;
}): Promise<WarrantyRecord[]> => {
  try {
    let q = query(collection(firestore, WARRANTY_COLLECTION), orderBy("receivedDate", "desc"));

    if (filters?.customerId) {
      q = query(q, where("customerId", "==", filters.customerId));
    }

    if (filters?.status) {
      q = query(q, where("status", "==", filters.status));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WarrantyRecord[];
  } catch (error) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Get warranty records error:", error);
      }
    }
    throw error;
  }
};

/**
 * Garanti kaydı detayını al
 */
export const getWarrantyRecordById = async (warrantyId: string): Promise<WarrantyRecord | null> => {
  try {
    const warrantyDoc = await getDoc(doc(firestore, WARRANTY_COLLECTION, warrantyId));
    
    if (!warrantyDoc.exists()) {
      return null;
    }

    return {
      id: warrantyDoc.id,
      ...warrantyDoc.data(),
    } as WarrantyRecord;
  } catch (error) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Get warranty record by id error:", error);
      }
    }
    throw error;
  }
};

/**
 * Yeni garanti kaydı oluştur
 */
export const createWarrantyRecord = async (
  warrantyData: Omit<WarrantyRecord, "id" | "createdAt" | "updatedAt">
): Promise<WarrantyRecord> => {
  try {
    const warrantyDoc: Partial<WarrantyRecord> & { receivedDate: Timestamp; createdAt: ReturnType<typeof serverTimestamp>; updatedAt: ReturnType<typeof serverTimestamp> } = {
      ...warrantyData,
      receivedDate: warrantyData.receivedDate || Timestamp.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(firestore, WARRANTY_COLLECTION), warrantyDoc);

    const createdWarranty = await getWarrantyRecordById(docRef.id);
    if (!createdWarranty) {
      throw new Error("Garanti kaydı oluşturulamadı");
    }

    // Audit log
    await logAudit("CREATE", "warranty", docRef.id, warrantyData.createdBy, null, createdWarranty);

    // Aktivite log ekle
    if (warrantyData.createdBy) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(warrantyData.createdBy);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        await addWarrantyActivity(
          docRef.id,
          warrantyData.createdBy,
          "created",
          `bu garanti kaydını oluşturdu`,
          { reason: warrantyData.reason },
          userName,
          userEmail
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.error("Add warranty activity error:", error);
          }
        }
      }
    }

    return createdWarranty;
  } catch (error) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Create warranty record error:", error);
      }
    }
    throw error;
  }
};

/**
 * Garanti kaydını güncelle
 */
export const updateWarrantyRecord = async (
  warrantyId: string,
  updates: Partial<Omit<WarrantyRecord, "id" | "createdAt" | "createdBy">>,
  userId?: string
): Promise<void> => {
  try {
    // Eski veriyi al
    const oldWarranty = await getWarrantyRecordById(warrantyId);
    
    const updateData: Partial<WarrantyRecord> & { updatedAt: ReturnType<typeof serverTimestamp> } = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // Status güncellemelerinde tarih alanlarını güncelle
    if (updates.status === "completed" && !oldWarranty?.completedDate) {
      updateData.completedDate = serverTimestamp();
    }
    if (updates.status === "returned" && !oldWarranty?.returnedDate) {
      updateData.returnedDate = serverTimestamp();
    }
    
    await updateDoc(doc(firestore, WARRANTY_COLLECTION, warrantyId), updateData);
    
    // Yeni veriyi al
    const newWarranty = await getWarrantyRecordById(warrantyId);
    
    // Audit log
    if (userId) {
      await logAudit("UPDATE", "warranty", warrantyId, userId, oldWarranty, newWarranty);
    }

    // Aktivite log ekle
    if (userId && oldWarranty && newWarranty) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(userId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;

        const changedFields = Object.keys(updates).filter(key => {
          const oldValue = (oldWarranty as Record<string, unknown>)[key];
          const newValue = (updates as Record<string, unknown>)[key];
          return oldValue !== newValue;
        });
        
        if (changedFields.length > 0) {
          await addWarrantyActivity(
            warrantyId,
            userId,
            "updated",
            `bu garanti kaydını güncelledi`,
            { changedFields },
            userName,
            userEmail
          );
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.error("Add warranty activity error:", error);
          }
        }
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Update warranty record error:", error);
    }
    throw error;
  }
};

/**
 * Garanti kaydını sil
 */
export const deleteWarrantyRecord = async (warrantyId: string, userId?: string): Promise<void> => {
  try {
    // Eski veriyi al
    const oldWarranty = await getWarrantyRecordById(warrantyId);
    
    // Aktivite log ekle (silmeden önce)
    if (userId && oldWarranty) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(userId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        await addWarrantyActivity(
          warrantyId,
          userId,
          "deleted",
          `bu garanti kaydını sildi`,
          { reason: oldWarranty.reason },
          userName,
          userEmail
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.error("Add warranty activity error:", error);
          }
        }
      }
    }
    
    await deleteDoc(doc(firestore, WARRANTY_COLLECTION, warrantyId));
    
    // Audit log
    if (userId) {
      await logAudit("DELETE", "warranty", warrantyId, userId, oldWarranty, null);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Delete warranty record error:", error);
    }
    throw error;
  }
};

/**
 * Garanti kaydına yorum ekle
 */
export const addWarrantyComment = async (
  warrantyId: string,
  userId: string,
  content: string,
  userName?: string,
  userEmail?: string
): Promise<WarrantyComment> => {
  try {
    const commentData: Omit<WarrantyComment, "id"> = {
      warrantyId,
      userId,
      userName,
      userEmail,
      content,
      createdAt: Timestamp.now(),
      updatedAt: null,
    };

    const docRef = await addDoc(
      collection(firestore, WARRANTY_COLLECTION, warrantyId, "comments"),
      commentData
    );

    // Activity log ekle
    await addWarrantyActivity(warrantyId, userId, "commented", `yorum ekledi`, { commentId: docRef.id }, userName, userEmail);

    // Garanti kaydını oluşturan kişiye bildirim gönder (yorum ekleyen kişi hariç)
    try {
      const warranty = await getWarrantyRecordById(warrantyId);
      if (warranty?.createdBy && warranty.createdBy !== userId) {
        const { createNotification } = await import("@/services/firebase/notificationService");
        await createNotification({
          userId: warranty.createdBy,
          type: "comment_added",
          title: "Garanti Kaydınıza Yorum Eklendi",
          message: `${userName || userEmail || "Bir kullanıcı"} garanti kaydınıza yorum ekledi: ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
          read: false,
          relatedId: warrantyId,
          metadata: { commentId: docRef.id, commenterId: userId, commenterName: userName, commenterEmail: userEmail },
        });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Send comment notification error:", error);
      }
    }

    return {
      id: docRef.id,
      ...commentData,
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Add warranty comment error:", error);
    }
    throw error;
  }
};

/**
 * Garanti kaydı yorumlarını al
 */
export const getWarrantyComments = async (warrantyId: string): Promise<WarrantyComment[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, WARRANTY_COLLECTION, warrantyId, "comments"),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WarrantyComment[];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Get warranty comments error:", error);
    }
    throw error;
  }
};

/**
 * Garanti kaydı aktivite log ekle
 */
export const addWarrantyActivity = async (
  warrantyId: string,
  userId: string,
  action: string,
  description: string,
  metadata?: Record<string, any>,
  userName?: string,
  userEmail?: string
): Promise<string> => {
  try {
    const activityData: Omit<WarrantyActivity, "id"> = {
      warrantyId,
      userId,
      userName,
      userEmail,
      action,
      description,
      metadata: metadata || {},
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(firestore, WARRANTY_COLLECTION, warrantyId, "activities"),
      activityData
    );

    return docRef.id;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Add warranty activity error:", error);
    }
    return "";
  }
};

/**
 * Garanti kaydı aktivite loglarını al
 */
export const getWarrantyActivities = async (warrantyId: string): Promise<WarrantyActivity[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, WARRANTY_COLLECTION, warrantyId, "activities"),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WarrantyActivity[];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Get warranty activities error:", error);
    }
    throw error;
  }
};

