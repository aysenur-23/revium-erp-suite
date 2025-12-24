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
import { createNotification } from "./notificationService";
import { getUserProfile } from "./authService";

export interface Request {
  id: string;
  type: "leave" | "purchase" | "advance" | "expense" | "other";
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  status: "pending" | "approved" | "rejected";
  startDate?: Timestamp;
  endDate?: Timestamp;
  createdBy: string;
  assignedTo: string; // Talep edilen yönetici
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectionReason?: string;
}

const REQUESTS_COLLECTION = "requests";

export const createRequest = async (data: Omit<Request, "id" | "createdAt" | "updatedAt" | "status">): Promise<Request> => {
  try {
    const requestData = {
      ...data,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Remove undefined fields
    Object.keys(requestData).forEach(key => {
      if (requestData[key as keyof typeof requestData] === undefined) {
        delete requestData[key as keyof typeof requestData];
      }
    });

    const docRef = await addDoc(collection(firestore, REQUESTS_COLLECTION), requestData);
    const requestId = docRef.id;

    // Talep oluşturulduğunda atanan kişiye bildirim ve mail gönder
    if (requestData.assignedTo) {
      try {
        const creatorProfile = await getUserProfile(requestData.createdBy);
        const creatorName = creatorProfile?.fullName || creatorProfile?.displayName || creatorProfile?.email || "Bir kullanıcı";
        
        const typeLabels: Record<string, string> = {
          leave: "İzin",
          purchase: "Satın Alma",
          advance: "Avans",
          expense: "Gider",
          other: "Diğer",
        };
        
        const requestTypeLabel = typeLabels[requestData.type] || requestData.type;
        
        await createNotification({
          userId: requestData.assignedTo,
          type: "system",
          title: "Yeni Talep",
          message: `${creatorName} size "${requestData.title}" adlı bir ${requestTypeLabel} talebi gönderdi.`,
          read: false,
          relatedId: requestId,
          metadata: {
            requestType: requestData.type,
            requestTitle: requestData.title,
            requestDescription: requestData.description,
            amount: requestData.amount || null,
            currency: requestData.currency || null,
            createdBy: requestData.createdBy,
            creatorName: creatorName,
            createdAt: new Date().toISOString(),
          },
        });
      } catch (notifError) {
        // Bildirim hatası talep oluşturmayı engellemez
        console.error("Request notification error:", notifError);
      }
    }

    return {
      id: requestId,
      ...requestData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as Request;
  } catch (error) {
    console.error("Create request error:", error);
    throw error;
  }
};

export const getRequests = async (filters?: { createdBy?: string; assignedTo?: string; isSuperAdmin?: boolean }): Promise<Request[]> => {
  try {
    // Index hatasını önlemek için basit sorgu ve client-side filtreleme
    const requestsRef = collection(firestore, REQUESTS_COLLECTION);
    const snapshot = await getDocs(requestsRef);
    
    let requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Request[];
    
    // Client-side filtreleme ve sıralama
    if (filters?.isSuperAdmin) {
        // Süper yönetici hepsini görür, filtrelemeye gerek yok
    } else {
        requests = requests.filter(r => {
            const isCreator = filters?.createdBy && r.createdBy === filters.createdBy;
            const isAssigned = filters?.assignedTo && r.assignedTo === filters.assignedTo;
            return isCreator || isAssigned;
        });
    }
    
    requests.sort((a, b) => {
      const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
      const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
      return dateB - dateA;
    });

    return requests;
  } catch (error) {
    console.error("Get requests error:", error);
    throw error;
  }
};

export const updateRequestStatus = async (
  requestId: string, 
  status: "approved" | "rejected", 
  approvedBy: string,
  reason?: string
): Promise<void> => {
  try {
    const updates: Partial<Request> = {
      status,
      approvedBy,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (status === "rejected" && reason) {
      updates.rejectionReason = reason;
    }

    await updateDoc(doc(firestore, REQUESTS_COLLECTION, requestId), updates);

    // Bildirim gönder
    try {
      const requestSnap = await getDoc(doc(firestore, REQUESTS_COLLECTION, requestId));
      const requestData = requestSnap.data() as Request;
      
      if (requestData) {
        const approverProfile = await getUserProfile(approvedBy);
        const title = status === "approved" ? "Talep Onaylandı" : "Talep Reddedildi";
        const message = `"${requestData.title}" talebiniz ${approverProfile?.fullName || "Yönetici"} tarafından ${status === "approved" ? "onaylandı" : "reddedildi"}.`;
        
        await createNotification({
          userId: requestData.createdBy,
          type: "system",
          title,
          message,
          read: false,
          relatedId: requestId,
        });
      }
    } catch (notifError) {
      console.error("Notification error:", notifError);
    }

  } catch (error) {
    console.error("Update request status error:", error);
    throw error;
  }
};

export const deleteRequest = async (requestId: string): Promise<void> => {
    try {
        await deleteDoc(doc(firestore, REQUESTS_COLLECTION, requestId));
    } catch (error) {
        console.error("Delete request error:", error);
        throw error;
    }
};
