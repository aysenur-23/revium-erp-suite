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
      const customers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Customer[];
      
      // Duplicate kontrolü - aynı ID'ye sahip müşterileri filtrele
      const uniqueCustomers = customers.filter((customer, index, self) =>
        index === self.findIndex((c) => c.id === customer.id)
      );
      
      return uniqueCustomers;
    } catch (orderByError: unknown) {
      // Index hatası varsa orderBy olmadan al
      if (import.meta.env.DEV) {
        if (import.meta.env.DEV) {
          console.warn("OrderBy failed, fetching customers without order:", orderByError);
        }
      }
      const q = query(collection(firestore, "customers"), limit(500));
      const snapshot = await getDocs(q);
      const customers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Customer[];
      
      // Duplicate kontrolü - aynı ID'ye sahip müşterileri filtrele
      const uniqueCustomers = customers.filter((customer, index, self) =>
        index === self.findIndex((c) => c.id === customer.id)
      );
      
      // Client-side sorting
      return uniqueCustomers.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime; // Descending order
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Get customers error:", error);
      }
    }
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
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Get customer by id error:", error);
      }
    }
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

    // Aktivite log ekle
    if (customerData.createdBy) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(customerData.createdBy);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        await addCustomerActivity(
          docRef.id,
          customerData.createdBy,
          "created",
          `bu müşteriyi oluşturdu`,
          { customerName: customerData.name },
          userName,
          userEmail
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Add customer activity error:", error);
        }
      }
    }

    return createdCustomer;
  } catch (error) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Create customer error:", error);
      }
    }
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

    // Aktivite log ekle
    if (userId && oldCustomer) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(userId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;

        const changedFields = Object.keys(updates).filter(key => {
          const oldValue = (oldCustomer as Record<string, unknown>)[key];
          const newValue = (updates as Record<string, unknown>)[key];
          return oldValue !== newValue;
        });
        
        if (changedFields.length > 0) {
          await addCustomerActivity(
            customerId,
            userId,
            "updated",
            `bu müşteriyi güncelledi`,
            { changedFields },
            userName,
            userEmail
          );
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Add customer activity error:", error);
        }
      }
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
    
    // Aktivite log ekle (silmeden önce)
    if (userId && oldCustomer) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(userId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        await addCustomerActivity(
          customerId,
          userId,
          "deleted",
          `bu müşteriyi sildi`,
          { customerName: oldCustomer.name },
          userName,
          userEmail
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Add customer activity error:", error);
        }
      }
    }
    
    await deleteDoc(doc(firestore, "customers", customerId));
    
    // Audit log
    if (userId) {
      await logAudit("DELETE", "customers", customerId, userId, oldCustomer, null);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Delete customer error:", error);
    }
    throw error;
  }
};

// Customer Comments and Activities

export interface CustomerComment {
  id: string;
  customerId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}

export interface CustomerActivity {
  id: string;
  customerId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

/**
 * Müşteri yorumu ekle
 */
export const addCustomerComment = async (
  customerId: string,
  userId: string,
  content: string,
  userName?: string,
  userEmail?: string
): Promise<CustomerComment> => {
  try {
    const commentData: Omit<CustomerComment, "id"> = {
      customerId,
      userId,
      userName,
      userEmail,
      content,
      createdAt: Timestamp.now(),
      updatedAt: null,
    };

    const docRef = await addDoc(
      collection(firestore, "customers", customerId, "comments"),
      commentData
    );

    // Activity log ekle
    await addCustomerActivity(customerId, userId, "commented", `yorum ekledi`, { commentId: docRef.id }, userName, userEmail);

    // Müşteriyi oluşturan kişiye bildirim gönder (yorum ekleyen kişi hariç)
    try {
      const customer = await getCustomerById(customerId);
      if (customer?.createdBy && customer.createdBy !== userId) {
        const { createNotification } = await import("@/services/firebase/notificationService");
        await createNotification({
          userId: customer.createdBy,
          type: "comment_added",
          title: "Müşterinize Yorum Eklendi",
          message: `${userName || userEmail || "Bir kullanıcı"} "${customer.name}" müşterinize yorum ekledi: ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
          read: false,
          relatedId: customerId,
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
      console.error("Add customer comment error:", error);
    }
    throw error;
  }
};

/**
 * Müşteri yorumlarını al
 */
export const getCustomerComments = async (customerId: string): Promise<CustomerComment[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "customers", customerId, "comments"),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CustomerComment[];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Get customer comments error:", error);
    }
    throw error;
  }
};

/**
 * Müşteri aktivite log ekle
 */
export const addCustomerActivity = async (
  customerId: string,
  userId: string,
  action: string,
  description: string,
  metadata?: Record<string, any>,
  userName?: string,
  userEmail?: string
): Promise<string> => {
  try {
    const activityData: Omit<CustomerActivity, "id"> = {
      customerId,
      userId,
      userName,
      userEmail,
      action,
      description,
      metadata: metadata || {},
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(firestore, "customers", customerId, "activities"),
      activityData
    );

    return docRef.id;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Add customer activity error:", error);
    }
    return "";
  }
};

/**
 * Müşteri aktivite loglarını al
 */
export const getCustomerActivities = async (customerId: string): Promise<CustomerActivity[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "customers", customerId, "activities"),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CustomerActivity[];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Get customer activities error:", error);
    }
    throw error;
  }
};

