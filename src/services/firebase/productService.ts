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
  } catch (error: unknown) {
    // Index hatası durumunda basit query dene
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string })?.code;
    if (errorCode === 'failed-precondition' || errorMessage.includes('index') || errorMessage.includes('requires an index')) {
      if (import.meta.env.DEV) {
        console.warn("Products index bulunamadı, basit query kullanılıyor");
      }
      try {
        // Index olmadan sıralama yapmadan dene
        const simpleQuery = query(collection(firestore, "products"), limit(500));
        const snapshot = await getDocs(simpleQuery);
        let products = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        
        // Client-side sıralama
        products.sort((a, b) => {
          const aDate = a.createdAt?.toMillis() || 0;
          const bDate = b.createdAt?.toMillis() || 0;
          return bDate - aDate;
        });
        
        return products;
      } catch (fallbackError) {
        if (import.meta.env.DEV) {
          console.error("Fallback query de başarısız:", fallbackError);
        }
        // Son çare: boş array döndür
        return [];
      }
    }
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
      if (import.meta.env.DEV) {
        console.error("Get product by id error:", error);
      }
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

    // Aktivite log ekle
    if (productData.createdBy) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(productData.createdBy);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        await addProductActivity(
          docRef.id,
          productData.createdBy,
          "created",
          `bu ürünü oluşturdu`,
          { productName: productData.name },
          userName,
          userEmail
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.error("Add product activity error:", error);
          }
        }
      }
    }

    return createdProduct;
  } catch (error) {
    // Sadece development'ta log göster
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.error("Create product error:", error);
      }
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

    // Aktivite log ekle
    if (userId && oldProduct) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(userId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;

        const changedFields = Object.keys(updates).filter(key => {
          const oldValue = (oldProduct as Record<string, unknown>)[key];
          const newValue = (updates as Record<string, unknown>)[key];
          return oldValue !== newValue;
        });
        
        if (changedFields.length > 0) {
          await addProductActivity(
            productId,
            userId,
            "updated",
            `bu ürünü güncelledi`,
            { changedFields },
            userName,
            userEmail
          );
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.error("Add product activity error:", error);
          }
        }
      }
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
export const deleteProduct = async (productId: string, userId?: string): Promise<void> => {
  try {
    // Eski veriyi al
    const oldProduct = await getProductById(productId);
    
    // Aktivite log ekle (silmeden önce)
    if (userId && oldProduct) {
      try {
        const { getUserProfile } = await import("./authService");
        const userProfile = await getUserProfile(userId);
        const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.email;
        const userEmail = userProfile?.email;
        
        await addProductActivity(
          productId,
          userId,
          "deleted",
          `bu ürünü sildi`,
          { productName: oldProduct.name },
          userName,
          userEmail
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.error("Add product activity error:", error);
          }
        }
      }
    }
    
    await deleteDoc(doc(firestore, "products", productId));
    
    // Audit log
    if (userId) {
      await logAudit("DELETE", "products", productId, userId, oldProduct, null);
    }
  } catch (error) {
    // Sadece development'ta log göster
    if (import.meta.env.DEV) {
      console.error("Delete product error:", error);
    }
    throw error;
  }
};

// Product Comments and Activities

export interface ProductComment {
  id: string;
  productId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
}

export interface ProductActivity {
  id: string;
  productId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

/**
 * Ürün yorumu ekle
 */
export const addProductComment = async (
  productId: string,
  userId: string,
  content: string,
  userName?: string,
  userEmail?: string
): Promise<ProductComment> => {
  try {
    const commentData: Omit<ProductComment, "id"> = {
      productId,
      userId,
      userName,
      userEmail,
      content,
      createdAt: Timestamp.now(),
      updatedAt: null,
    };

    const docRef = await addDoc(
      collection(firestore, "products", productId, "comments"),
      commentData
    );

    // Activity log ekle
    await addProductActivity(productId, userId, "commented", `yorum ekledi`, { commentId: docRef.id }, userName, userEmail);

    // Ürünü oluşturan kişiye bildirim gönder (yorum ekleyen kişi hariç)
    try {
      const product = await getProductById(productId);
      if (product?.createdBy && product.createdBy !== userId) {
        const { createNotification } = await import("@/services/firebase/notificationService");
        await createNotification({
          userId: product.createdBy,
          type: "comment_added",
          title: "Ürününüze Yorum Eklendi",
          message: `${userName || userEmail || "Bir kullanıcı"} "${product.name}" ürününüze yorum ekledi: ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
          read: false,
          relatedId: productId,
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
      console.error("Add product comment error:", error);
    }
    throw error;
  }
};

/**
 * Ürün yorumlarını al
 */
export const getProductComments = async (productId: string): Promise<ProductComment[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "products", productId, "comments"),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProductComment[];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Get product comments error:", error);
    }
    throw error;
  }
};

/**
 * Ürün aktivite log ekle
 */
export const addProductActivity = async (
  productId: string,
  userId: string,
  action: string,
  description: string,
  metadata?: Record<string, any>,
  userName?: string,
  userEmail?: string
): Promise<string> => {
  try {
    const activityData: Omit<ProductActivity, "id"> = {
      productId,
      userId,
      userName,
      userEmail,
      action,
      description,
      metadata: metadata || {},
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(firestore, "products", productId, "activities"),
      activityData
    );

    return docRef.id;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Add product activity error:", error);
    }
    return "";
  }
};

/**
 * Ürün aktivite loglarını al
 */
export const getProductActivities = async (productId: string): Promise<ProductActivity[]> => {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "products", productId, "activities"),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProductActivity[];
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Get product activities error:", error);
    }
    throw error;
  }
};

