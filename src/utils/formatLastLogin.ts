import { Timestamp } from "firebase/firestore";
import { format, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";

interface FirestoreConvertible {
  toDate?: () => Date;
  toMillis?: () => number;
  seconds?: unknown;
  nanoseconds?: unknown;
  _seconds?: unknown;
  _nanoseconds?: unknown;
}

const parseTimestamp = (value: unknown): Date => {
  if (!value) {
    throw new Error("Value is null or undefined");
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  // String handling
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
    throw new Error(`Invalid date string: ${value}`);
  }

  // Number handling
  if (typeof value === 'number') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
    throw new Error(`Invalid timestamp number: ${value}`);
  }

  const obj = value as FirestoreConvertible;

  // toDate function check
  if (typeof obj.toDate === 'function') {
    return obj.toDate();
  }

  // toMillis function check
  if (typeof obj.toMillis === 'function') {
    return new Date(obj.toMillis());
  }

  // seconds/nanoseconds check
  if (obj.seconds !== undefined) {
    const seconds = typeof obj.seconds === 'number'
      ? obj.seconds
      : (typeof obj.seconds === 'object' && obj.seconds !== null && 'toNumber' in obj.seconds && typeof (obj.seconds as { toNumber: () => number }).toNumber === 'function'
        ? (obj.seconds as { toNumber: () => number }).toNumber()
        : Number(obj.seconds));

    const nanoseconds = typeof obj.nanoseconds === 'number'
      ? obj.nanoseconds
      : (typeof obj.nanoseconds === 'object' && obj.nanoseconds !== null && 'toNumber' in obj.nanoseconds && typeof (obj.nanoseconds as { toNumber: () => number }).toNumber === 'function'
        ? (obj.nanoseconds as { toNumber: () => number }).toNumber()
        : Number(obj.nanoseconds) || 0);

    return new Timestamp(seconds, nanoseconds).toDate();
  }

  // _seconds/_nanoseconds (internal format)
  if (obj._seconds !== undefined) {
    const seconds = Number(obj._seconds);
    const nanoseconds = Number(obj._nanoseconds) || 0;
    return new Timestamp(seconds, nanoseconds).toDate();
  }

  // Last resort: try casting to string and new Date()
  const d = new Date(value as string | number | Date);
  if (!isNaN(d.getTime())) return d;

  throw new Error("Unknown timestamp format");
};

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

  let loginDate: Date;
  try {
    loginDate = parseTimestamp(lastLoginAt);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("formatLastLogin error:", error);
    }
    return "Geçersiz tarih";
  }

  const now = new Date();
  const diffInMs = now.getTime() - loginDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInSeconds = Math.floor(diffInMs / 1000);

  if (diffInMinutes < 1) {
    return `${diffInSeconds} saniye önce`;
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes} dakika önce`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    if (isToday(loginDate)) {
      return `Bugün ${format(loginDate, "HH:mm", { locale: tr })}`;
    }
    return `${diffInHours} saat önce`;
  }

  if (isYesterday(loginDate)) {
    return `Dün ${format(loginDate, "HH:mm", { locale: tr })}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return format(loginDate, "EEEE HH:mm", { locale: tr });
  }

  return format(loginDate, "dd MMMM yyyy HH:mm", { locale: tr });
};

/**
 * Kullanıcının çevrimiçi olup olmadığını kontrol eder
 */
export const isUserOnline = (lastLoginAt: Timestamp | null | undefined): boolean => {
  if (!lastLoginAt) {
    return false;
  }

  try {
    const loginDate = parseTimestamp(lastLoginAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60));

    return diffInMinutes < 5;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("isUserOnline error:", error);
    }
    return false;
  }
};
