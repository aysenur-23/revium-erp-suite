/**
 * Firebase Customer Service
 * Müşteri yönetimi işlemleri
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
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { logAudit } from "@/utils/auditLogger";

export interface Customer {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  notes?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/**
 * Tüm müşterileri listele
 */
export const getCustomers = async (): Promise<Customer[]> => {
  try {
    if (!firestore) {
      throw new Error("Firebase Firestore başlatılamadı. Lütfen .env dosyasında Firebase yapılandırmasını kontrol edin.");
    }
    
    // orderBy kullanmadan önce index gerektirebilir, bu yüzden önce basit sorgu deneyelim
    // Performans için limit ekle (500 kayıt)
    try {
      const q = query(collection(firestore, "customers"), orderBy("createdAt", "desc"), limit(500));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Customer[];
    } catch (orderByError: any) {
      // Index hatası varsa orderBy olmadan al
      console.warn("OrderBy failed, fetching customers without order:", orderByError);
      const q = query(collection(firestore, "customers"), limit(500));
      const snapshot = await getDocs(q);
      const customers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Customer[];
      // Client-side sorting
      return customers.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime; // Descending order
      });
    }
  } catch (error) {
    console.error("Get customers error:", error);
    throw error;
  }
};

/**
 * Müşteri detayını al
 */
export const getCustomerById = async (customerId: string): Promise<Customer | null> => {
  try {
    const customerDoc = await getDoc(doc(firestore, "customers", customerId));
    
    if (!customerDoc.exists()) {
      return null;
    }

    return {
      id: customerDoc.id,
      ...customerDoc.data(),
    } as Customer;
  } catch (error) {
    console.error("Get customer by id error:", error);
    throw error;
  }
};

/**
 * Yeni müşteri oluştur
 */
export const createCustomer = async (
  customerData: Omit<Customer, "id" | "createdAt" | "updatedAt">
): Promise<Customer> => {
  try {
    const docRef = await addDoc(collection(firestore, "customers"), {
      ...customerData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const createdCustomer = await getCustomerById(docRef.id);
    if (!createdCustomer) {
      throw new Error("Müşteri oluşturulamadı");
    }

    // Audit log
    await logAudit("CREATE", "customers", docRef.id, customerData.createdBy, null, createdCustomer);

    return createdCustomer;
  } catch (error) {
    console.error("Create customer error:", error);
    throw error;
  }
};

/**
 * Müşteriyi güncelle
 */
export const updateCustomer = async (
  customerId: string,
  updates: Partial<Omit<Customer, "id" | "createdAt" | "createdBy">>,
  userId?: string
): Promise<void> => {
  try {
    // Eski veriyi al
    const oldCustomer = await getCustomerById(customerId);
    
    await updateDoc(doc(firestore, "customers", customerId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    // Yeni veriyi al
    const newCustomer = await getCustomerById(customerId);
    
    // Audit log
    if (userId) {
      await logAudit("UPDATE", "customers", customerId, userId, oldCustomer, newCustomer);
    }
  } catch (error) {
    console.error("Update customer error:", error);
    throw error;
  }
};

/**
 * Müşteriyi sil
 */
export const deleteCustomer = async (customerId: string, userId?: string): Promise<void> => {
  try {
    // Eski veriyi al
    const oldCustomer = await getCustomerById(customerId);
    
    await deleteDoc(doc(firestore, "customers", customerId));
    
    // Audit log
    if (userId) {
      await logAudit("DELETE", "customers", customerId, userId, oldCustomer, null);
    }
  } catch (error) {
    console.error("Delete customer error:", error);
    throw error;
  }
};

