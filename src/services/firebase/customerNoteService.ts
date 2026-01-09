/**
 * Customer Note Service
 * Müşteri notları yönetimi
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
  FieldValue,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { logAudit } from "@/utils/auditLogger";

export interface CustomerNote {
  id: string;
  customerId: string;
  type: "phone_call_out" | "phone_call_in" | "warranty" | "general";
  title: string;
  content: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

const CUSTOMER_NOTES_COLLECTION = "customerNotes";

/**
 * Müşteri notlarını al
 */
export const getCustomerNotes = async (customerId: string): Promise<CustomerNote[]> => {
  try {
    const q = query(
      collection(firestore, CUSTOMER_NOTES_COLLECTION),
      where("customerId", "==", customerId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CustomerNote[];
  } catch (error: unknown) {
    // Index hatası durumunda basit query dene
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError?.code === 'failed-precondition' || firebaseError?.message?.includes('index')) {
      console.warn("Customer notes index bulunamadı, basit query kullanılıyor");
      try {
        const simpleQuery = query(collection(firestore, CUSTOMER_NOTES_COLLECTION));
        const snapshot = await getDocs(simpleQuery);
        let notes = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CustomerNote[];
        
        // Client-side filtreleme ve sıralama
        notes = notes.filter(n => n.customerId === customerId);
        notes.sort((a, b) => {
          const aDate = a.createdAt?.toMillis() || 0;
          const bDate = b.createdAt?.toMillis() || 0;
          return bDate - aDate;
        });
        
        return notes;
      } catch (fallbackError) {
        console.error("Fallback query de başarısız:", fallbackError);
        return [];
      }
    }
    console.error("Get customer notes error:", error);
    throw error;
  }
};

/**
 * Müşteri notu oluştur
 */
export const createCustomerNote = async (
  noteData: Omit<CustomerNote, "id" | "createdAt" | "updatedAt">
): Promise<CustomerNote> => {
  try {
    const noteDoc = {
      ...noteData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(firestore, CUSTOMER_NOTES_COLLECTION), noteDoc);

    const createdNote = await getDoc(docRef);
    if (!createdNote.exists()) {
      throw new Error("Not oluşturulamadı");
    }

    // Audit log
    await logAudit("CREATE", "customerNotes", docRef.id, noteData.createdBy, null, createdNote.data());

    return {
      id: docRef.id,
      ...createdNote.data(),
      createdAt: createdNote.data()?.createdAt || Timestamp.now(),
    } as CustomerNote;
  } catch (error) {
    console.error("Create customer note error:", error);
    throw error;
  }
};

/**
 * Müşteri notunu güncelle
 */
export const updateCustomerNote = async (
  noteId: string,
  updates: Partial<Omit<CustomerNote, "id" | "createdAt" | "createdBy">>,
  userId?: string
): Promise<void> => {
  try {
    const oldNote = await getDoc(doc(firestore, CUSTOMER_NOTES_COLLECTION, noteId));
    
    await updateDoc(doc(firestore, CUSTOMER_NOTES_COLLECTION, noteId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    const newNote = await getDoc(doc(firestore, CUSTOMER_NOTES_COLLECTION, noteId));
    
    // Audit log
    if (userId) {
      await logAudit("UPDATE", "customerNotes", noteId, userId, oldNote.data(), newNote.data());
    }
  } catch (error) {
    console.error("Update customer note error:", error);
    throw error;
  }
};

/**
 * Müşteri notunu sil
 */
export const deleteCustomerNote = async (noteId: string, userId?: string): Promise<void> => {
  try {
    const oldNote = await getDoc(doc(firestore, CUSTOMER_NOTES_COLLECTION, noteId));
    
    await deleteDoc(doc(firestore, CUSTOMER_NOTES_COLLECTION, noteId));
    
    // Audit log
    if (userId) {
      await logAudit("DELETE", "customerNotes", noteId, userId, oldNote.data(), null);
    }
  } catch (error) {
    console.error("Delete customer note error:", error);
    throw error;
  }
};

