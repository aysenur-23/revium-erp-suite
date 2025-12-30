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
  QueryConstraint,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { sendNotificationEmail } from "@/services/emailService";

export interface Notification {
  id: string;
  userId: string;
  type: "task_assigned" | "task_updated" | "task_completed" | "task_created" | "task_deleted" | "task_pool_request" | "order_created" | "order_updated" | "role_changed" | "system" | "task_approval" | "comment_added";
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
    // Firestore index gereksinimleri: equality filtreler önce, sonra orderBy
    // Index: read (ASC), userId (ASC), createdAt (DESC)
    let q = query(
      collection(firestore, "notifications"),
      where("userId", "==", userId)
    );

    if (options?.unreadOnly) {
      q = query(q, where("read", "==", false));
    }

    // orderBy her zaman en sonda olmalı
    q = query(q, orderBy("createdAt", "desc"));

    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
  } catch (error: unknown) {
    const isIndexError =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "failed-precondition" &&
      "message" in error &&
      typeof (error as { message?: string }).message === "string" &&
      (error as { message: string }).message.includes("index");

    if (isIndexError) {
      // Index hatası durumunda boş array döndür (işlemin devam etmesini engelleme)
      // Index oluşturulana kadar bildirimler görünmeyecek ama sistem çalışmaya devam edecek
      // Hataları sessizce handle et - sadece development'ta ilk kez göster
      if (import.meta.env.DEV) {
        const message = (error as { message: string }).message;
        const indexUrl = message.match(/https:\/\/[^\s]+/)?.[0];
        // Sadece ilk kez göster (tekrar tekrar loglamayı önle)
        if (!(window as any).__firestoreIndexWarningShown) {
          console.debug("ℹ️ Firestore index eksik. Bildirimler index oluşturulana kadar görünmeyecek.");
          if (indexUrl) {
            console.debug("Index oluşturma linki:", indexUrl);
          }
          (window as any).__firestoreIndexWarningShown = true;
        }
      }
      return [];
    }
    
    // Diğer hatalar için de boş array döndür (sistemin çalışmaya devam etmesi için)
    // Sadece gerçek hataları logla (index hatası değilse)
    if (import.meta.env.DEV) {
      console.debug("Get notifications error (non-index):", error);
    }
    return [];
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
  } catch (error: unknown) {
    if (import.meta.env.DEV) console.error("Get unread notification count error:", error);
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

    // Bildirim başarıyla oluşturuldu, hemen döndür
    // Email gönderimi arka planda yapılacak (hem Cloud Functions hem de manuel fallback)
    
    // Email gönderimini arka planda başlat (await etme)
    // Önce Cloud Functions denenecek, eğer çalışmıyorsa manuel email gönderimi yapılacak
    Promise.resolve().then(async () => {
      try {
        const userDoc = await getDoc(doc(firestore, "users", notificationData.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData?.email) {
            // Manuel email gönderimi (Cloud Functions çalışmıyorsa fallback)
            // Hata olsa bile sessizce devam et
            try {
              const emailResult = await sendNotificationEmail(
                userData.email,
                notificationData.title,
                notificationData.message,
                notificationData.type,
                notificationData.relatedId || null,
                notificationData.metadata || null
              );
              
              // Email gönderim sonucunu logla (sadece başarılı olduğunda)
              if (import.meta.env.DEV && emailResult.success) {
                console.log(`✅ Bildirim maili gönderildi: ${userData.email}`);
              }
            } catch (emailError: unknown) {
              // Email gönderilemedi - sessizce devam et
              // Cloud Functions da email gönderebilir, bu yüzden kritik değil
            }
          }
        }
      } catch (error) {
        // Hata olsa bile sessizce devam et
      }
    }).catch(() => {
      // Promise rejection'ı yakala ama hiçbir şey yapma
    });

    // Bildirimi hemen döndür (email gönderimi arka planda devam edecek)
    return notification;
  } catch (error: unknown) {
    if (import.meta.env.DEV) console.error("Create notification error:", error);
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
  } catch (error: unknown) {
    if (import.meta.env.DEV) console.error("Update notification error:", error);
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
  } catch (error: unknown) {
    if (import.meta.env.DEV) console.error("Mark notification as read error:", error);
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
  } catch (error: unknown) {
    if (import.meta.env.DEV) console.error("Mark all notifications as read error:", error);
    throw error;
  }
};

/**
 * Bildirimi sil
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(firestore, "notifications", notificationId));
  } catch (error: unknown) {
    if (import.meta.env.DEV) console.error("Delete notification error:", error);
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
      const constraints: QueryConstraint[] = [
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
        } catch (error: unknown) {
          if (import.meta.env.DEV) console.error("Subscribe to notifications error:", error);
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
                } catch (err: unknown) {
                  if (import.meta.env.DEV) console.error("Fallback subscribe to notifications error:", err);
                  callback([]);
                }
              },
              (err: unknown) => {
                if (import.meta.env.DEV) console.error("Fallback notifications snapshot error:", err);
                callback([]);
              }
            );
            return fallbackUnsubscribe;
          } catch (fallbackError: unknown) {
            if (import.meta.env.DEV) console.error("Fallback query setup error:", fallbackError);
            callback([]);
          }
        } else {
          callback([]);
        }
      }
    );
    
    return unsubscribe;
  } catch (error: unknown) {
    if (import.meta.env.DEV) console.error("Subscribe to notifications setup error:", error);
    return () => {};
  }
};

