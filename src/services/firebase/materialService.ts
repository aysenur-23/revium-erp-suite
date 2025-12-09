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
    let q;
    if (includeDeleted) {
      q = query(collection(firestore, "rawMaterials"), orderBy("createdAt", "desc"));
    } else {
      // Silinmiş olmayan hammaddeleri getir
      q = query(
        collection(firestore, "rawMaterials"),
        orderBy("createdAt", "desc")
      );
    }
    const snapshot = await getDocs(q);
    const materials: RawMaterial[] = [];
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      if (!data || typeof data !== 'object') continue;
      
      // Silinmiş hammaddeleri atla (eğer includeDeleted false ise)
      if (!includeDeleted) {
        if ((data as any).deleted === true || (data as any).isDeleted === true) {
          continue;
        }
      }
      
      const material: RawMaterial = {
        id: docSnapshot.id,
        name: (data as any).name || "",
        code: (data as any).code || (data as any).sku || null,
        sku: (data as any).sku || (data as any).code || null,
        category: (data as any).category || "other",
        unit: (data as any).unit || "Adet",
        currentStock: (data as any).currentStock !== undefined ? (data as any).currentStock : ((data as any).stock || 0),
        stock: (data as any).stock !== undefined ? (data as any).stock : ((data as any).currentStock || 0),
        minStock: (data as any).minStock !== undefined ? (data as any).minStock : ((data as any).min_stock || 0),
        min_stock: (data as any).min_stock !== undefined ? (data as any).min_stock : ((data as any).minStock || 0),
        maxStock: (data as any).maxStock !== undefined ? (data as any).maxStock : ((data as any).max_stock || null),
        max_stock: (data as any).max_stock !== undefined ? (data as any).max_stock : ((data as any).maxStock || null),
        cost: (data as any).cost !== undefined ? (data as any).cost : ((data as any).unitPrice || null),
        unitPrice: (data as any).unitPrice !== undefined ? (data as any).unitPrice : ((data as any).cost || null),
        totalPrice: (data as any).totalPrice !== undefined ? (data as any).totalPrice : null,
        brand: (data as any).brand || null,
        link: (data as any).link || null,
        purchasedBy: (data as any).purchasedBy || null,
        location: (data as any).location || null,
        currency: (data as any).currency || null,
        currencies: (data as any).currencies || null,
        notes: (data as any).notes || null,
        description: (data as any).description || null,
        createdBy: (data as any).createdBy || null,
        createdAt: (data as any).createdAt || Timestamp.now(),
        updatedAt: (data as any).updatedAt || Timestamp.now(),
      };
      materials.push(material);
    }
    
    return materials;
  } catch (error: any) {
    console.error("Get raw materials error:", error);
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

    const data = materialDoc.data() as any;
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
  } catch (error: any) {
    console.error("Get raw material by id error:", error);
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

    return createdMaterial;
  } catch (error: any) {
    console.error("Create raw material error:", error);
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
  } catch (error: any) {
    console.error("Update raw material error:", error);
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
    
    await deleteDoc(doc(firestore, "rawMaterials", materialId));
    
    // Audit log
    if (userId) {
      await logAudit("DELETE", "raw_materials", materialId, userId, oldMaterial, null);
    }
  } catch (error: any) {
    console.error("Delete raw material error:", error);
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

    return {
      id: docRef.id,
      materialId: transactionData.materialId,
      type: transactionData.type,
      quantity: transactionData.quantity,
      reason: transactionData.reason,
      relatedOrderId: transactionData.relatedOrderId || null,
      createdBy: transactionData.createdBy,
      createdAt: Timestamp.now(),
    } as MaterialTransaction;
  } catch (error: any) {
    console.error("Add material transaction error:", error);
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
      const data = doc.data() as any;
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
  } catch (error: any) {
    console.error("Get material transactions error:", error);
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

