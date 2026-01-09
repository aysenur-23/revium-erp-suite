/**
 * Firebase Raw Material Category Service
 * Hammadde kategori yönetimi işlemleri
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { logAudit } from "@/utils/auditLogger";
import { auth } from "@/lib/firebase";

export interface RawMaterialCategory {
  id: string;
  name: string;
  value: string; // URL-friendly value (lowercase, no spaces)
  createdAt: Timestamp;
  createdBy: string;
}

const CATEGORIES_COLLECTION = "rawMaterialCategories";

// Varsayılan kategoriler
const DEFAULT_CATEGORIES = [
  { name: "Kimyasal", value: "chemical" },
  { name: "Metal", value: "metal" },
  { name: "Plastik", value: "plastic" },
  { name: "Elektronik", value: "electronic" },
  { name: "Ambalaj", value: "packaging" },
  { name: "Diğer", value: "other" },
];

/**
 * Tüm kategorileri al (varsayılan + Firestore'dan)
 */
export const getRawMaterialCategories = async (): Promise<RawMaterialCategory[]> => {
  try {
    // Önce Firestore'dan kategorileri al
    const categoriesRef = collection(firestore, CATEGORIES_COLLECTION);
    const snapshot = await getDocs(query(categoriesRef, orderBy("name", "asc")));
    
    const firestoreCategories: RawMaterialCategory[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || "",
        value: data.value || data.name?.toLowerCase().replace(/\s+/g, "_") || "",
        createdAt: data.createdAt || Timestamp.now(),
        createdBy: data.createdBy || "",
      } as RawMaterialCategory;
    });
    
    // Varsayılan kategorileri ekle (eğer Firestore'da yoksa)
    const defaultCategories: RawMaterialCategory[] = DEFAULT_CATEGORIES.map((cat) => {
      const exists = firestoreCategories.find((fc) => fc.value === cat.value);
      if (exists) return exists;
      
      return {
        id: `default_${cat.value}`,
        name: cat.name,
        value: cat.value,
        createdAt: Timestamp.now(),
        createdBy: "system",
      } as RawMaterialCategory;
    });
    
    // Firestore kategorilerini ekle (varsayılanlarla çakışmayanlar)
    const customCategories = firestoreCategories.filter(
      (fc) => !DEFAULT_CATEGORIES.some((dc) => dc.value === fc.value)
    );
    
    // Tüm kategorileri birleştir ve sırala
    const allCategories = [...defaultCategories, ...customCategories].sort((a, b) =>
      a.name.localeCompare(b.name, "tr")
    );
    
    return allCategories;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Get raw material categories error:", error);
    }
    // Hata durumunda varsayılan kategorileri döndür
    return DEFAULT_CATEGORIES.map((cat) => ({
      id: `default_${cat.value}`,
      name: cat.name,
      value: cat.value,
      createdAt: Timestamp.now(),
      createdBy: "system",
    })) as RawMaterialCategory[];
  }
};

/**
 * Yeni kategori ekle
 */
export const createRawMaterialCategory = async (
  name: string,
  userId?: string
): Promise<RawMaterialCategory> => {
  try {
    if (!name || name.trim().length === 0) {
      throw new Error("Kategori adı boş olamaz");
    }
    
    const currentUserId = userId || auth?.currentUser?.uid;
    if (!currentUserId) {
      throw new Error("Kullanıcı oturumu bulunamadı");
    }
    
    // Value oluştur (URL-friendly: lowercase, boşlukları alt çizgi ile değiştir)
    const value = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    
    if (!value || value.length === 0) {
      throw new Error("Geçersiz kategori adı");
    }
    
    // Aynı value'ya sahip kategori var mı kontrol et
    const existingCategories = await getRawMaterialCategories();
    const exists = existingCategories.find((cat) => cat.value === value);
    if (exists) {
      throw new Error("Bu kategori zaten mevcut");
    }
    
    // Firestore'a ekle
    const categoriesRef = collection(firestore, CATEGORIES_COLLECTION);
    const newCategory = {
      name: name.trim(),
      value,
      createdAt: serverTimestamp(),
      createdBy: currentUserId,
    };
    
    const docRef = await addDoc(categoriesRef, newCategory);
    
    // Audit log
    await logAudit("CREATE", "rawMaterialCategories", docRef.id, currentUserId, null, newCategory);
    
    return {
      id: docRef.id,
      name: name.trim(),
      value,
      createdAt: Timestamp.now(),
      createdBy: currentUserId,
    } as RawMaterialCategory;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Create raw material category error:", error);
    }
    throw error;
  }
};

/**
 * Kategori sil (sadece özel kategoriler, varsayılan kategoriler silinemez)
 */
export const deleteRawMaterialCategory = async (
  categoryId: string,
  userId?: string
): Promise<void> => {
  try {
    // Varsayılan kategoriler silinemez
    if (categoryId.startsWith("default_")) {
      throw new Error("Varsayılan kategoriler silinemez");
    }
    
    const currentUserId = userId || auth?.currentUser?.uid;
    if (!currentUserId) {
      throw new Error("Kullanıcı oturumu bulunamadı");
    }
    
    // Eski veriyi al (audit log için)
    const categoryDoc = await getDoc(doc(firestore, CATEGORIES_COLLECTION, categoryId));
    if (!categoryDoc.exists()) {
      throw new Error("Kategori bulunamadı");
    }
    
    const oldData = categoryDoc.data();
    
    // Sil
    await deleteDoc(doc(firestore, CATEGORIES_COLLECTION, categoryId));
    
    // Audit log
    await logAudit("DELETE", "rawMaterialCategories", categoryId, currentUserId, oldData, null);
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Delete raw material category error:", error);
    }
    throw error;
  }
};

