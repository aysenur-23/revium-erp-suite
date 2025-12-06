/**
 * Firebase Product Service
 * Ürün yönetimi işlemleri
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

export interface Product {
  id: string;
  name: string;
  sku?: string | null; // Stock Keeping Unit
  code?: string | null;
  description?: string | null;
  unitPrice?: number | null;
  price?: number | null; // Alias for unitPrice
  cost?: number | null;
  unit: string; // 'adet', 'kg', 'm', vb.
  stock?: number;
  minStock?: number | null;
  maxStock?: number | null;
  category?: string | null;
  imageUrl?: string | null;
  image_url?: string | null; // Alias for imageUrl
  location?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/**
 * Tüm ürünleri listele
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    // Performans için limit ekle (500 kayıt)
    const q = query(collection(firestore, "products"), orderBy("createdAt", "desc"), limit(500));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];
  } catch (error) {
    // Sadece development'ta log göster
    if (import.meta.env.DEV) {
      console.error("Get products error:", error);
    }
    throw error;
  }
};

/**
 * Ürün detayını al
 */
export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    const productDoc = await getDoc(doc(firestore, "products", productId));
    
    if (!productDoc.exists()) {
      return null;
    }

    return {
      id: productDoc.id,
      ...productDoc.data(),
    } as Product;
  } catch (error) {
    // Sadece development'ta log göster
    if (import.meta.env.DEV) {
      console.error("Get product by id error:", error);
    }
    throw error;
  }
};

/**
 * Yeni ürün oluştur
 */
export const createProduct = async (
  productData: Omit<Product, "id" | "createdAt" | "updatedAt">
): Promise<Product> => {
  try {
    const docRef = await addDoc(collection(firestore, "products"), {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const createdProduct = await getProductById(docRef.id);
    if (!createdProduct) {
      throw new Error("Ürün oluşturulamadı");
    }

    // Audit log
    await logAudit("CREATE", "products", docRef.id, productData.createdBy, null, createdProduct);

    return createdProduct;
  } catch (error) {
    // Sadece development'ta log göster
    if (import.meta.env.DEV) {
      console.error("Create product error:", error);
    }
    throw error;
  }
};

/**
 * Ürünü güncelle
 */
export const updateProduct = async (
  productId: string,
  updates: Partial<Omit<Product, "id" | "createdAt" | "createdBy">>,
  userId?: string
): Promise<void> => {
  try {
    // Eski veriyi al
    const oldProduct = await getProductById(productId);
    
    await updateDoc(doc(firestore, "products", productId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    // Yeni veriyi al
    const newProduct = await getProductById(productId);
    
    // Audit log
    if (userId) {
      await logAudit("UPDATE", "products", productId, userId, oldProduct, newProduct);
    }
  } catch (error) {
    // Sadece development'ta log göster
    if (import.meta.env.DEV) {
      console.error("Update product error:", error);
    }
    throw error;
  }
};

/**
 * Ürünü sil
 */
export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    await deleteDoc(doc(firestore, "products", productId));
  } catch (error) {
    // Sadece development'ta log göster
    if (import.meta.env.DEV) {
      console.error("Delete product error:", error);
    }
    throw error;
  }
};

