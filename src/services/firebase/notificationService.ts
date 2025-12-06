/**
 * Firebase Notification Service
 * Bildirim yönetimi işlemleri
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
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { sendNotificationEmail } from "@/services/emailService";

export interface Notification {
  id: string;
  userId: string;
  type: "task_assigned" | "task_updated" | "task_completed" | "task_created" | "task_deleted" | "task_pool_request" | "order_created" | "order_updated" | "role_changed" | "system" | "task_approval";
  title: string;
  message: string;
  read: boolean;
  relatedId?: string | null; // task ID, order ID, vb.
  metadata?: Record<string, unknown> | null; // assignment_id, vb. için
  createdAt: Timestamp;
}

/**
 * Kullanıcının bildirimlerini al
 */
export const getNotifications = async (
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<Notification[]> => {
  try {
    let q = query(
      collection(firestore, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    if (options?.unreadOnly) {
      q = query(q, where("read", "==", false));
    }

    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
  } catch (error) {
    console.error("Get notifications error:", error);
    
    const isIndexError =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "failed-precondition" &&
      "message" in error &&
      typeof (error as { message?: string }).message === "string" &&
      (error as { message: string }).message.includes("index");

    if (isIndexError) {
      const message = (error as { message: string }).message;
      const indexUrl = message.match(/https:\/\/[^\s]+/)?.[0];
      if (indexUrl) {
        console.warn("⚠️ Firestore index gerekiyor! Lütfen şu linke tıklayarak index'i oluşturun:");
        console.warn(indexUrl);
        const friendlyError = new Error("Firestore index gerekiyor. Lütfen index'i oluşturun.");
        (friendlyError as { indexUrl?: string }).indexUrl = indexUrl;
        (friendlyError as { code?: string }).code = "index-required";
        throw friendlyError;
      }
    }
    
    throw error;
  }
};

/**
 * Okunmamış bildirim sayısını al
 */
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const q = query(
      collection(firestore, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("Get unread notification count error:", error);
    throw error;
  }
};

/**
 * Bildirim oluştur
 */
export const createNotification = async (
  notificationData: Omit<Notification, "id" | "createdAt">
): Promise<Notification> => {
  try {
    const docRef = await addDoc(collection(firestore, "notifications"), {
      ...notificationData,
      createdAt: serverTimestamp(),
    });

    const createdNotification = await getDoc(docRef);
    if (!createdNotification.exists()) {
      throw new Error("Bildirim oluşturulamadı");
    }

    const notification = {
      id: createdNotification.id,
      ...createdNotification.data(),
    } as Notification;

    // E-posta gönder (async, hata olsa bile bildirim oluşturulur)
    // ÖNEMLİ: E-posta gönderimi opsiyonel, hata olsa bile uygulama çalışmaya devam etmeli
    // Tüm hatalar sessizce handle edilmeli, uygulama akışını bozmamalı
    try {
      const userDoc = await getDoc(doc(firestore, "users", notificationData.userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData?.email) {
          // Mail gönderimi - tek deneme, hata olsa bile sessizce devam et
          try {
            const emailResult = await sendNotificationEmail(
              userData.email,
              notificationData.title,
              notificationData.message,
              notificationData.type,
              notificationData.relatedId || null
            );
            
            // Başarılı olsa bile sadece development'ta log göster (debug)
            if (emailResult.success && import.meta.env.DEV) {
              console.debug(`✅ Bildirim maili gönderildi: ${userData.email}`);
            } else if (!emailResult.success && import.meta.env.DEV) {
              // Hata olsa bile sessizce devam et, kullanıcıya gösterme
              console.debug(`ℹ️ Bildirim maili gönderilemedi (backend kapalı veya ayarlar eksik): ${userData.email}`);
            }
          } catch (emailError: any) {
             // Sessizce devam et
          }
        }
        // E-posta adresi yoksa sessizce devam et
      }
      // Kullanıcı bulunamazsa sessizce devam et
    } catch (emailError) {
      // E-posta gönderim hatası bildirim oluşturmayı engellemez
      // Sessizce handle et, hiçbir log gösterme
      // Uygulama normal çalışmaya devam etmeli
    }

    return notification;
  } catch (error) {
    console.error("Create notification error:", error);
    throw error;
  }
};

/**
 * Bildirimi güncelle
 */
export const updateNotification = async (
  notificationId: string,
  updates: Partial<Omit<Notification, "id" | "userId" | "createdAt">>
): Promise<void> => {
  try {
    await updateDoc(doc(firestore, "notifications", notificationId), updates);
  } catch (error) {
    console.error("Update notification error:", error);
    throw error;
  }
};

/**
 * Bildirimi okundu olarak işaretle
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(firestore, "notifications", notificationId), {
      read: true,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    throw error;
  }
};

/**
 * Tüm bildirimleri okundu olarak işaretle
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const q = query(
      collection(firestore, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const snapshot = await getDocs(q);
    
    const batch = snapshot.docs.map((doc) =>
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(batch);
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    throw error;
  }
};

/**
 * Bildirimi sil
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(firestore, "notifications", notificationId));
  } catch (error) {
    console.error("Delete notification error:", error);
    throw error;
  }
};

/**
 * Bildirimleri gerçek zamanlı olarak dinle
 * @param userId Kullanıcı ID'si
 * @param options Bildirim seçenekleri
 * @param callback Bildirimler değiştiğinde çağrılacak callback
 * @returns Unsubscribe fonksiyonu
 */
export const subscribeToNotifications = (
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {},
  callback: (notifications: Notification[]) => void
): Unsubscribe => {
  try {
    const notificationsRef = collection(firestore, "notifications");
    
    const buildQuery = () => {
      const constraints: any[] = [
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      ];
      
      if (options?.unreadOnly) {
        constraints.push(where("read", "==", false));
      }
      
      if (options?.limit) {
        constraints.push(limit(options.limit));
      }
      
      return query(notificationsRef, ...constraints);
    };
    
    let q = buildQuery();
    
    // onSnapshot ile gerçek zamanlı dinleme
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const notifications = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Notification[];
          
          callback(notifications);
        } catch (error) {
          console.error("Subscribe to notifications error:", error);
          callback([]);
        }
      },
      (error) => {
        // 404 ve network hatalarını sessizce handle et (Firestore otomatik yeniden bağlanacak)
        // Production'da da sessizce handle et - bu normal Firestore long-polling davranışı
        if (error?.code === 'unavailable' || 
            error?.code === 'not-found' ||
            error?.message?.includes('404') || 
            error?.message?.includes('network') ||
            error?.message?.includes('transport errored')) {
          // Sessizce handle et - Firestore otomatik olarak yeniden bağlanacak
          // Production'da console'a yazma (performans ve gürültü azaltma)
          callback([]);
          return;
        }
        
        // Sadece gerçek hataları logla
        if (import.meta.env.DEV) {
          console.error("Notifications snapshot error:", error);
        }
        // Index hatası durumunda basit query dene
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
          try {
            const simpleQuery = query(
              notificationsRef,
              where("userId", "==", userId),
              orderBy("createdAt", "desc")
            );
            const fallbackUnsubscribe = onSnapshot(
              simpleQuery,
              (snapshot) => {
                try {
                  let notifications = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  })) as Notification[];
                  
                  // Client-side filtreleme
                  if (options?.unreadOnly) {
                    notifications = notifications.filter(n => !n.read);
                  }
                  if (options?.limit) {
                    notifications = notifications.slice(0, options.limit);
                  }
                  
                  callback(notifications);
                } catch (err) {
                  console.error("Fallback subscribe to notifications error:", err);
                  callback([]);
                }
              },
              (err) => {
                console.error("Fallback notifications snapshot error:", err);
                callback([]);
              }
            );
            return fallbackUnsubscribe;
          } catch (fallbackError) {
            console.error("Fallback query setup error:", fallbackError);
            callback([]);
          }
        } else {
          callback([]);
        }
      }
    );
    
    return unsubscribe;
  } catch (error: any) {
    console.error("Subscribe to notifications setup error:", error);
    return () => {};
  }
};

