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
    console.error("Get warranty records error:", error);
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
    console.error("Get warranty record by id error:", error);
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
    const warrantyDoc: any = {
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

    return createdWarranty;
  } catch (error) {
    console.error("Create warranty record error:", error);
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
    
    const updateData: any = {
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
  } catch (error) {
    console.error("Update warranty record error:", error);
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
    
    await deleteDoc(doc(firestore, WARRANTY_COLLECTION, warrantyId));
    
    // Audit log
    if (userId) {
      await logAudit("DELETE", "warranty", warrantyId, userId, oldWarranty, null);
    }
  } catch (error) {
    console.error("Delete warranty record error:", error);
    throw error;
  }
};

