import { Timestamp } from "firebase/firestore";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";

/**
 * Son giriş zamanını formatlar
 * - 5 dakikadan az ise: "Çevrimiçi"
 * - 1 saatten az ise: "X dakika önce"
 * - 24 saatten az ise: "X saat önce" veya "Bugün HH:mm"
 * - 24 saatten fazla ise: Tarih formatında
 */
export const formatLastLogin = (lastLoginAt: Timestamp | null | undefined): string => {
  if (!lastLoginAt) {
    return "Hiç giriş yapmamış";
  }

  // Timestamp objesi değilse, Timestamp'e çevir
  let loginDate: Date;
  try {
    // Önce Timestamp instance kontrolü
    if (lastLoginAt instanceof Timestamp) {
      loginDate = lastLoginAt.toDate();
    } 
    // Firestore Timestamp objesi (toDate metodu varsa)
    else if (lastLoginAt && typeof lastLoginAt === 'object' && 'toDate' in lastLoginAt && typeof (lastLoginAt as any).toDate === 'function') {
      loginDate = (lastLoginAt as any).toDate();
    } 
    // Timestamp benzeri obje (seconds ve nanoseconds varsa) - Firestore SDK v9+ format
    else if (lastLoginAt && typeof lastLoginAt === 'object' && 'seconds' in lastLoginAt) {
      let seconds: number;
      let nanoseconds: number = 0;
      
      // seconds değerini al
      if (typeof (lastLoginAt as any).seconds === 'number') {
        seconds = (lastLoginAt as any).seconds;
      } else if ((lastLoginAt as any).seconds && typeof (lastLoginAt as any).seconds === 'object' && typeof (lastLoginAt as any).seconds.toNumber === 'function') {
        seconds = (lastLoginAt as any).seconds.toNumber();
      } else {
        seconds = Number((lastLoginAt as any).seconds);
      }
      
      // nanoseconds değerini al
      if ('nanoseconds' in lastLoginAt) {
        if (typeof (lastLoginAt as any).nanoseconds === 'number') {
          nanoseconds = (lastLoginAt as any).nanoseconds;
        } else if ((lastLoginAt as any).nanoseconds && typeof (lastLoginAt as any).nanoseconds === 'object' && typeof (lastLoginAt as any).nanoseconds.toNumber === 'function') {
          nanoseconds = (lastLoginAt as any).nanoseconds.toNumber();
        } else {
          nanoseconds = Number((lastLoginAt as any).nanoseconds) || 0;
        }
      }
      
      // Timestamp oluştur
      loginDate = new Timestamp(seconds, nanoseconds).toDate();
    }
    // _seconds ve _nanoseconds (Firebase SDK internal format)
    else if (lastLoginAt && typeof lastLoginAt === 'object' && '_seconds' in lastLoginAt) {
      const seconds = Number((lastLoginAt as any)._seconds);
      const nanoseconds = Number((lastLoginAt as any)._nanoseconds) || 0;
      loginDate = new Timestamp(seconds, nanoseconds).toDate();
    }
    // Timestamp.fromMillis veya Timestamp.fromDate ile oluşturulmuş olabilir
    else if (lastLoginAt && typeof lastLoginAt === 'object' && 'toMillis' in lastLoginAt && typeof (lastLoginAt as any).toMillis === 'function') {
      loginDate = new Date((lastLoginAt as any).toMillis());
    }
    // String veya number ise Date'e çevir
    else if (typeof lastLoginAt === 'string' || typeof lastLoginAt === 'number') {
      loginDate = new Date(lastLoginAt);
      if (isNaN(loginDate.getTime())) {
        return "Geçersiz tarih";
      }
    }
    // Diğer durumlar için Date'e çevirmeyi dene
    else {
      loginDate = new Date(lastLoginAt as any);
      if (isNaN(loginDate.getTime())) {
        console.error("formatLastLogin: Geçersiz tarih formatı", lastLoginAt);
        return "Geçersiz tarih";
      }
    }
  } catch (error) {
    console.error("formatLastLogin error:", error, "lastLoginAt:", lastLoginAt, "type:", typeof lastLoginAt);
    return "Geçersiz tarih";
  }
  const now = new Date();
  const diffInMs = now.getTime() - loginDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInSeconds = Math.floor(diffInMs / 1000);

  // 5 dakikadan az ise çevrimiçi say (ama formatLastLogin'de "Çevrimiçi" yazmayalım, sadece isUserOnline'da kullanılacak)
  // Bu fonksiyon sadece tarih formatı döndürür, çevrimiçi kontrolü isUserOnline'da yapılır
  if (diffInMinutes < 1) {
    return `${diffInSeconds} saniye önce`;
  }

  // 1 saatten az ise dakika cinsinden göster
  if (diffInMinutes < 60) {
    return `${diffInMinutes} dakika önce`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  // 24 saatten az ise saat cinsinden göster veya bugün ise saat formatında
  if (diffInHours < 24) {
    if (isToday(loginDate)) {
      return `Bugün ${format(loginDate, "HH:mm", { locale: tr })}`;
    }
    return `${diffInHours} saat önce`;
  }

  // 24 saatten fazla ise tarih formatında göster
  if (isYesterday(loginDate)) {
    return `Dün ${format(loginDate, "HH:mm", { locale: tr })}`;
  }

  // 7 günden az ise gün adı ile göster
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return format(loginDate, "EEEE HH:mm", { locale: tr });
  }

  // Daha eski ise tam tarih göster
  return format(loginDate, "dd MMMM yyyy HH:mm", { locale: tr });
};

/**
 * Kullanıcının çevrimiçi olup olmadığını kontrol eder
 */
export const isUserOnline = (lastLoginAt: Timestamp | null | undefined): boolean => {
  if (!lastLoginAt) {
    return false;
  }

  // Timestamp objesi değilse, Timestamp'e çevir
  let loginDate: Date;
  try {
    // Önce Timestamp instance kontrolü
    if (lastLoginAt instanceof Timestamp) {
      loginDate = lastLoginAt.toDate();
    } 
    // Firestore Timestamp objesi (toDate metodu varsa)
    else if (lastLoginAt && typeof lastLoginAt === 'object' && 'toDate' in lastLoginAt && typeof (lastLoginAt as any).toDate === 'function') {
      loginDate = (lastLoginAt as any).toDate();
    } 
    // Timestamp benzeri obje (seconds ve nanoseconds varsa) - Firestore SDK v9+ format
    else if (lastLoginAt && typeof lastLoginAt === 'object' && 'seconds' in lastLoginAt) {
      let seconds: number;
      let nanoseconds: number = 0;
      
      // seconds değerini al
      if (typeof (lastLoginAt as any).seconds === 'number') {
        seconds = (lastLoginAt as any).seconds;
      } else if ((lastLoginAt as any).seconds && typeof (lastLoginAt as any).seconds === 'object' && typeof (lastLoginAt as any).seconds.toNumber === 'function') {
        seconds = (lastLoginAt as any).seconds.toNumber();
      } else {
        seconds = Number((lastLoginAt as any).seconds);
      }
      
      // nanoseconds değerini al
      if ('nanoseconds' in lastLoginAt) {
        if (typeof (lastLoginAt as any).nanoseconds === 'number') {
          nanoseconds = (lastLoginAt as any).nanoseconds;
        } else if ((lastLoginAt as any).nanoseconds && typeof (lastLoginAt as any).nanoseconds === 'object' && typeof (lastLoginAt as any).nanoseconds.toNumber === 'function') {
          nanoseconds = (lastLoginAt as any).nanoseconds.toNumber();
        } else {
          nanoseconds = Number((lastLoginAt as any).nanoseconds) || 0;
        }
      }
      
      // Timestamp oluştur
      loginDate = new Timestamp(seconds, nanoseconds).toDate();
    }
    // _seconds ve _nanoseconds (Firebase SDK internal format)
    else if (lastLoginAt && typeof lastLoginAt === 'object' && '_seconds' in lastLoginAt) {
      const seconds = Number((lastLoginAt as any)._seconds);
      const nanoseconds = Number((lastLoginAt as any)._nanoseconds) || 0;
      loginDate = new Timestamp(seconds, nanoseconds).toDate();
    }
    // Timestamp.fromMillis veya Timestamp.fromDate ile oluşturulmuş olabilir
    else if (lastLoginAt && typeof lastLoginAt === 'object' && 'toMillis' in lastLoginAt && typeof (lastLoginAt as any).toMillis === 'function') {
      loginDate = new Date((lastLoginAt as any).toMillis());
    }
    // String veya number ise Date'e çevir
    else if (typeof lastLoginAt === 'string' || typeof lastLoginAt === 'number') {
      loginDate = new Date(lastLoginAt);
      if (isNaN(loginDate.getTime())) {
        return false;
      }
    }
    // Diğer durumlar için Date'e çevirmeyi dene
    else {
      loginDate = new Date(lastLoginAt as any);
      if (isNaN(loginDate.getTime())) {
        return false;
      }
    }
  } catch (error) {
    console.error("isUserOnline error:", error, "lastLoginAt:", lastLoginAt);
    return false;
  }
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60));

  return diffInMinutes < 5;
};

