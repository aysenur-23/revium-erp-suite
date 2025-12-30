/**
 * Firebase Raw Material Service
 * Hammade yönetimi işlemleri
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
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { logAudit } from "@/utils/auditLogger";
import { handlePermissionError, isPermissionError, getPermissionErrorMessage } from "@/utils/errorLogger";
import { auth } from "@/lib/firebase";

export interface RawMaterial {
  id: string;
  name: string;
  code?: string | null;
  sku?: string | null; // SKU kodu (code ile aynı ama eski sistem uyumluluğu için)
  category?: string | null; // Kategori
  unit: string; // 'kg', 'm', 'adet', vb.
  currentStock: number;
  stock?: number | null; // currentStock ile aynı (eski sistem uyumluluğu için)
  minStock?: number | null;
  min_stock?: number | null; // minStock ile aynı (eski sistem uyumluluğu için)
  maxStock?: number | null;
  max_stock?: number | null; // maxStock ile aynı (eski sistem uyumluluğu için)
  cost?: number | null; // unitPrice ile aynı (eski sistem uyumluluğu için)
  unitPrice?: number | null; // Birim fiyat
  vatRate?: number | null; // KDV yüzdesi
  totalPrice?: number | null; // Toplam fiyat (KDV dahil)
  currency?: string | null; // Para birimi: 'TRY', 'USD', 'EUR', vb.
  currencies?: string[]; // Para birimleri: ['TRY', 'USD', 'EUR', vb.] (eski sistem uyumluluğu için)
  brand?: string | null; // Marka
  link?: string | null; // Link/URL
  supplier?: string | null;
  purchasedBy?: string | null; // Satın alan kişi (user ID)
  location?: string | null; // Hammadde konumu
  notes?: string | null;
  description?: string | null; // Açıklama
  deleted?: boolean | null; // Silinmiş mi? (eski sistem uyumluluğu için)
  isDeleted?: boolean | null; // Silinmiş mi? (eski sistem uyumluluğu için)
  createdBy?: string | null; // Oluşturan kullanıcı ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MaterialTransaction {
  id: string;
  materialId: string;
  type: "in" | "out";
  quantity: number;
  reason: string;
  relatedOrderId?: string | null;
  createdAt: Timestamp;
  createdBy: string;
}

/**
 * Tüm hammaddeleri listele
 */
export const getRawMaterials = async (includeDeleted: boolean = false): Promise<RawMaterial[]> => {
  try {
    // Performans için limit ekle (500 kayıt)
    let q;
    if (includeDeleted) {
      q = query(collection(firestore, "rawMaterials"), orderBy("createdAt", "desc"), limit(500));
    } else {
      // Silinmiş olmayan hammaddeleri getir
      q = query(
        collection(firestore, "rawMaterials"),
        orderBy("createdAt", "desc"),
        limit(500)
      );
    }
    const snapshot = await getDocs(q);
    const materials: RawMaterial[] = [];
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      if (!data || typeof data !== 'object') continue;
      
      // Silinmiş hammaddeleri atla (eğer includeDeleted false ise)
      if (!includeDeleted) {
        const deleted = data.deleted === true || data.isDeleted === true;
        if (deleted) {
          continue;
        }
      }
      
      const material: RawMaterial = {
        id: docSnapshot.id,
        name: data.name || "",
        code: data.code || data.sku || null,
        sku: data.sku || data.code || null,
        category: data.category || "other",
        unit: data.unit || "Adet",
        currentStock: data.currentStock !== undefined ? data.currentStock : (data.stock || 0),
        stock: data.stock !== undefined ? data.stock : (data.currentStock || 0),
        minStock: data.minStock !== undefined ? data.minStock : (data.min_stock || 0),
        min_stock: data.min_stock !== undefined ? data.min_stock : (data.minStock || 0),
        maxStock: data.maxStock !== undefined ? data.maxStock : (data.max_stock || null),
        max_stock: data.max_stock !== undefined ? data.max_stock : (data.maxStock || null),
        cost: data.cost !== undefined ? data.cost : (data.unitPrice || null),
        unitPrice: data.unitPrice !== undefined ? data.unitPrice : (data.cost || null),
        totalPrice: data.totalPrice !== undefined ? data.totalPrice : null,
        brand: data.brand || null,
        link: data.link || null,
        purchasedBy: data.purchasedBy || null,
        location: data.location || null,
        currency: data.currency || null,
        currencies: data.currencies || null,
        notes: data.notes || null,
        description: data.description || null,
        createdBy: data.createdBy || null,
        createdAt: data.createdAt || Timestamp.now(),
        updatedAt: data.updatedAt || Timestamp.now(),
      };
      materials.push(material);
    }
    
    return materials;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Get raw materials error:", error);
      }
    }
    if (isPermissionError(error)) {
      throw handlePermissionError(error, {
        operation: "read",
        collection: "rawMaterials",
        userId: auth?.currentUser?.uid,
      });
    }
    throw error;
  }
};

/**
 * Hammade detayını al
 */
export const getRawMaterialById = async (materialId: string): Promise<RawMaterial | null> => {
  try {
    const materialDoc = await getDoc(doc(firestore, "rawMaterials", materialId));
    
    if (!materialDoc.exists()) {
      return null;
    }

    const data = materialDoc.data() as Omit<RawMaterial, "id">;
    return {
      id: materialDoc.id,
      name: data.name || "",
      code: data.code || data.sku || null,
      sku: data.sku || data.code || null,
      category: data.category || "other",
      unit: data.unit || "Adet",
      currentStock: data.currentStock !== undefined ? data.currentStock : (data.stock || 0),
      stock: data.stock !== undefined ? data.stock : (data.currentStock || 0),
      minStock: data.minStock !== undefined ? data.minStock : (data.min_stock || 0),
      min_stock: data.min_stock !== undefined ? data.min_stock : (data.minStock || 0),
      maxStock: data.maxStock !== undefined ? data.maxStock : (data.max_stock || null),
      max_stock: data.max_stock !== undefined ? data.max_stock : (data.maxStock || null),
      cost: data.cost !== undefined ? data.cost : (data.unitPrice || null),
      unitPrice: data.unitPrice !== undefined ? data.unitPrice : (data.cost || null),
      totalPrice: data.totalPrice !== undefined ? data.totalPrice : null,
      brand: data.brand || null,
      link: data.link || null,
      purchasedBy: data.purchasedBy || null,
      location: data.location || null,
      currency: data.currency || null,
      currencies: data.currencies || null,
      notes: data.notes || null,
      description: data.description || null,
      createdBy: data.createdBy || null,
      createdAt: data.createdAt || Timestamp.now(),
      updatedAt: data.updatedAt || Timestamp.now(),
    } as RawMaterial;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Get raw material by id error:", error);
      }
    }
    if (isPermissionError(error)) {
      throw handlePermissionError(error, {
        operation: "read",
        collection: "rawMaterials",
        documentId: materialId,
        userId: auth?.currentUser?.uid,
      });
    }
    throw error;
  }
};

/**
 * Yeni hammade oluştur
 */
export const createRawMaterial = async (
  materialData: Omit<RawMaterial, "id" | "createdAt" | "updatedAt">
): Promise<RawMaterial> => {
  try {
    const userId = auth?.currentUser?.uid;
    
    const docRef = await addDoc(collection(firestore, "rawMaterials"), {
      ...materialData,
      createdBy: userId || materialData.createdBy || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const createdMaterial = await getRawMaterialById(docRef.id);
    if (!createdMaterial) {
      throw new Error("Hammade oluşturulamadı");
    }

    // Audit log
    if (userId) {
      await logAudit("CREATE", "raw_materials", docRef.id, userId, null, createdMaterial);
    }

    // Aktivite log ekle
    const finalUserId = userId || materialData.createdBy || auth?.currentUser?.uid;
    if (finalUserId) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(finalUserId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        await addMaterialActivity(
          docRef.id,
          finalUserId,
          "created",
          `bu hammadeyi oluşturdu`,
          { materialName: materialData.name },
          userName,
          userEmail
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Add material activity error:", error);
        }
      }
    }

    return createdMaterial;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Create raw material error:", error);
      }
    }
    if (isPermissionError(error)) {
      throw handlePermissionError(error, {
        operation: "create",
        collection: "rawMaterials",
        userId: auth?.currentUser?.uid,
        data: materialData,
      });
    }
    throw error;
  }
};

/**
 * Hammadeyi güncelle
 */
export const updateRawMaterial = async (
  materialId: string,
  updates: Partial<Omit<RawMaterial, "id" | "createdAt">>,
  userId?: string
): Promise<void> => {
  try {
    // Eski veriyi al
    const oldMaterial = await getRawMaterialById(materialId);
    
    await updateDoc(doc(firestore, "rawMaterials", materialId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    // Yeni veriyi al
    const newMaterial = await getRawMaterialById(materialId);
    
    // Audit log
    if (userId) {
      await logAudit("UPDATE", "raw_materials", materialId, userId, oldMaterial, newMaterial);
    }

    // Aktivite log ekle
    const finalUserId = userId || auth?.currentUser?.uid;
    if (finalUserId && oldMaterial) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(finalUserId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;

        const changedFields = Object.keys(updates).filter(key => {
          const oldValue = (oldMaterial as Record<string, unknown>)[key];
          const newValue = (updates as Record<string, unknown>)[key];
          return oldValue !== newValue;
        });
        
        if (changedFields.length > 0) {
          await addMaterialActivity(
            materialId,
            finalUserId,
            "updated",
            `bu hammadeyi güncelledi`,
            { changedFields },
            userName,
            userEmail
          );
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Add material activity error:", error);
        }
      }
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Update raw material error:", error);
      }
    }
    if (isPermissionError(error)) {
      throw handlePermissionError(error, {
        operation: "update",
        collection: "rawMaterials",
        documentId: materialId,
        userId: userId || auth?.currentUser?.uid,
        data: updates,
      });
    }
    throw error;
  }
};

/**
 * Hammadeyi sil
 */
export const deleteRawMaterial = async (materialId: string, userId?: string): Promise<void> => {
  try {
    // Eski veriyi al
    const oldMaterial = await getRawMaterialById(materialId);
    
    // Aktivite log ekle (silmeden önce)
    const finalUserId = userId || auth?.currentUser?.uid;
    if (finalUserId && oldMaterial) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(finalUserId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        await addMaterialActivity(
          materialId,
          finalUserId,
          "deleted",
          `bu hammadeyi sildi`,
          { materialName: oldMaterial.name },
          userName,
          userEmail
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Add material activity error:", error);
        }
      }
    }
    
    await deleteDoc(doc(firestore, "rawMaterials", materialId));
    
    // Audit log
    if (userId) {
      await logAudit("DELETE", "raw_materials", materialId, userId, oldMaterial, null);
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Delete raw material error:", error);
    }
    if (isPermissionError(error)) {
      throw handlePermissionError(error, {
        operation: "delete",
        collection: "rawMaterials",
        documentId: materialId,
        userId: userId || auth?.currentUser?.uid,
      });
    }
    throw error;
  }
};

/**
 * Stok hareketi ekle
 * @param transactionData - İşlem verisi
 * @param skipStockUpdate - Stok güncellemesini atla (stok zaten güncellenmişse true)
 */
export const addMaterialTransaction = async (
  transactionData: Omit<MaterialTransaction, "id" | "createdAt">,
  skipStockUpdate: boolean = false
): Promise<MaterialTransaction> => {
  try {
    const materialId = transactionData.materialId;
    
    // Stok hareketini ekle
    const docRef = await addDoc(
      collection(firestore, "rawMaterials", materialId, "transactions"),
      {
        ...transactionData,
        createdAt: serverTimestamp(),
      }
    );

    // Stok miktarını güncelle (eğer skipStockUpdate false ise)
    if (!skipStockUpdate) {
      const material = await getRawMaterialById(materialId);
      if (material) {
        const newStock =
          transactionData.type === "in"
            ? material.currentStock + transactionData.quantity
            : material.currentStock - transactionData.quantity;

        await updateRawMaterial(materialId, {
          currentStock: newStock,
        });
      }
    }

    const createdTransaction = {
      id: docRef.id,
      materialId: transactionData.materialId,
      type: transactionData.type,
      quantity: transactionData.quantity,
      reason: transactionData.reason,
      relatedOrderId: transactionData.relatedOrderId || null,
      createdBy: transactionData.createdBy,
      createdAt: Timestamp.now(),
    } as MaterialTransaction;

    // Audit log
    try {
      const { logAudit } = await import("@/utils/auditLogger");
      await logAudit(
        "CREATE",
        "material_transactions",
        docRef.id,
        transactionData.createdBy,
        null,
        {
          type: transactionData.type,
          quantity: transactionData.quantity,
          reason: transactionData.reason,
        },
        {
          materialId: transactionData.materialId,
          relatedOrderId: transactionData.relatedOrderId || null,
        }
      );
    } catch (logError) {
      if (import.meta.env.DEV) {
        console.error("Material transaction audit log error:", logError);
      }
      // Log hatası işlemi engellememeli
    }

    return createdTransaction;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Add material transaction error:", error);
    }
    if (isPermissionError(error)) {
      throw handlePermissionError(error, {
        operation: "create",
        collection: "rawMaterials/transactions",
        userId: transactionData.createdBy,
        data: transactionData,
      });
    }
    throw error;
  }
};

/**
 * Hammade hareketlerini al
 */
export const getMaterialTransactions = async (materialId: string): Promise<MaterialTransaction[]> => {
  try {
    const snapshot = await getDocs(
      collection(firestore, "rawMaterials", materialId, "transactions")
    );
    return snapshot.docs.map((doc) => {
      const data = doc.data() as Omit<MaterialTransaction, "id">;
      return {
        id: doc.id,
        materialId: data.materialId || "",
        type: data.type || "out",
        quantity: data.quantity || 0,
        reason: data.reason || "",
        relatedOrderId: data.relatedOrderId || null,
        createdAt: data.createdAt || Timestamp.now(),
        createdBy: data.createdBy || "",
      } as MaterialTransaction;
    });
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Get material transactions error:", error);
    }
    if (isPermissionError(error)) {
      throw handlePermissionError(error, {
        operation: "read",
        collection: "rawMaterials/transactions",
        userId: auth?.currentUser?.uid,
      });
    }
    throw error;
  }
};

// Material Comments and Activities

export interface MaterialComment {
  id: string;
  materialId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}

export interface MaterialActivity {
  id: string;
  materialId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

/**
 * Hammadde yorumu ekle
 */
export const addMaterialComment = async (
  materialId: string,
  userId: string,
  content: string,
  userName?: string,
  userEmail?: string
): Promise<MaterialComment> => {
  try {
    const commentData: Omit<MaterialComment, "id"> = {
      materialId,
      userId,
      userName,
      userEmail,
      content,
      createdAt: Timestamp.now(),
      updatedAt: null,
    };

    const docRef = await addDoc(
      collection(firestore, "rawMaterials", materialId, "comments"),
      commentData
    );

    // Activity log ekle
    await addMaterialActivity(materialId, userId, "commented", `yorum ekledi`, { commentId: docRef.id }, userName, userEmail);

    // Hammadeyi oluşturan kişiye bildirim gönder (yorum ekleyen kişi hariç)
    try {
      const material = await getRawMaterialById(materialId);
      if (material?.createdBy && material.createdBy !== userId) {
        const { createNotification } = await import("@/services/firebase/notificationService");
        await createNotification({
          userId: material.createdBy,
          type: "comment_added",
          title: "Hammadenize Yorum Eklendi",
          message: `${userName || userEmail || "Bir kullanıcı"} "${material.name}" hammadenize yorum ekledi: ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
          read: false,
          relatedId: materialId,
          metadata: { commentId: docRef.id, commenterId: userId, commenterName: userName, commenterEmail: userEmail },
        });
      }
    } catch (error) {
      console.error("Send comment notification error:", error);
    }

    return {
      id: docRef.id,
      ...commentData,
    };
  } catch (error) {
    console.error("Add material comment error:", error);
    throw error;
  }
};

/**
 * Hammadde yorumlarını al
 */
export const getMaterialComments = async (materialId: string): Promise<MaterialComment[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "rawMaterials", materialId, "comments"),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MaterialComment[];
  } catch (error) {
    console.error("Get material comments error:", error);
    throw error;
  }
};

/**
 * Hammadde aktivite log ekle
 */
export const addMaterialActivity = async (
  materialId: string,
  userId: string,
  action: string,
  description: string,
  metadata?: Record<string, any>,
  userName?: string,
  userEmail?: string
): Promise<string> => {
  try {
    const activityData: Omit<MaterialActivity, "id"> = {
      materialId,
      userId,
      userName,
      userEmail,
      action,
      description,
      metadata: metadata || {},
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(firestore, "rawMaterials", materialId, "activities"),
      activityData
    );

    return docRef.id;
  } catch (error) {
    console.error("Add material activity error:", error);
    return "";
  }
};

/**
 * Hammadde aktivite loglarını al
 */
export const getMaterialActivities = async (materialId: string): Promise<MaterialActivity[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "rawMaterials", materialId, "activities"),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MaterialActivity[];
  } catch (error) {
    console.error("Get material activities error:", error);
    throw error;
  }
};

