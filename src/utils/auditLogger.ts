/**
<<<<<<< HEAD
 * Professional Audit Logger Utility
 * Tüm önemli işlemler için kapsamlı denetim kaydı
 * - Detaylı kullanıcı bilgileri
 * - Oturum takibi
 * - Hata yönetimi
 * - Performans optimizasyonu
 */

import { createAuditLog } from "@/services/firebase/auditLogsService";
import { auth } from "@/lib/firebase";

// Session ID - Sayfa yenilenene kadar aynı kalır
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Log queue - Batch işleme için
let logQueue: LogEntry[] = [];
let isProcessing = false;
const BATCH_DELAY = 500; // 500ms bekle, sonra toplu gönder
const MAX_QUEUE_SIZE = 20; // Max 20 log beklet

interface LogEntry {
  action: "CREATE" | "UPDATE" | "DELETE";
  tableName: string;
  recordId: string | null;
  userId: string | null;
  oldData: unknown;
  newData: unknown;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

interface EnhancedMetadata {
  sessionId: string;
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  timestamp: string;
  performedBy?: {
    userId: string;
    email: string | null;
    displayName: string | null;
  };
  changesSummary?: string;
  [key: string]: unknown;
}

/**
 * Değişikliklerin özetini oluştur
 */
const createChangesSummary = (
  action: "CREATE" | "UPDATE" | "DELETE",
  oldData: unknown,
  newData: unknown,
  tableName: string
): string => {
  if (action === "CREATE") {
    return `Yeni ${getTableLabel(tableName)} kaydı oluşturuldu`;
  }

  if (action === "DELETE") {
    return `${getTableLabel(tableName)} kaydı silindi`;
  }

  // UPDATE için değişen alanları bul
  if (!oldData || !newData || typeof oldData !== "object" || typeof newData !== "object") {
    return `${getTableLabel(tableName)} kaydı güncellendi`;
  }

  const oldObj = oldData as Record<string, unknown>;
  const newObj = newData as Record<string, unknown>;
  const changedFields: string[] = [];

  for (const key of Object.keys(newObj)) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changedFields.push(getFieldLabel(key));
    }
  }

  if (changedFields.length === 0) {
    return `${getTableLabel(tableName)} kaydı güncellendi`;
  }

  if (changedFields.length <= 3) {
    return `${changedFields.join(", ")} güncellendi`;
  }

  return `${changedFields.slice(0, 3).join(", ")} ve ${changedFields.length - 3} alan daha güncellendi`;
};

/**
 * Tablo ismini Türkçe'ye çevir
 */
const getTableLabel = (tableName: string): string => {
  const labels: Record<string, string> = {
    tasks: "Görev",
    users: "Kullanıcı",
    departments: "Departman",
    orders: "Sipariş",
    production_orders: "Üretim Siparişi",
    customers: "Müşteri",
    products: "Ürün",
    projects: "Proje",
    audit_logs: "Denetim Kaydı",
    role_permissions: "Rol Yetkisi",
    raw_materials: "Hammadde",
    warranty: "Garanti",
    notifications: "Bildirim",
    task_assignments: "Görev Ataması",
    reports: "Rapor",
    profiles: "Profil",
  };
  return labels[tableName] || tableName;
};

/**
 * Alan ismini Türkçe'ye çevir
 */
const getFieldLabel = (fieldName: string): string => {
  const labels: Record<string, string> = {
    title: "Başlık",
    description: "Açıklama",
    status: "Durum",
    priority: "Öncelik",
    dueDate: "Bitiş Tarihi",
    assignedTo: "Atanan",
    name: "İsim",
    email: "E-posta",
    phone: "Telefon",
    role: "Rol",
    fullName: "Ad Soyad",
    company: "Şirket",
    address: "Adres",
    totalAmount: "Toplam Tutar",
    orderNumber: "Sipariş Numarası",
    customerId: "Müşteri",
    isArchived: "Arşivlendi",
    approvalStatus: "Onay Durumu",
    isInPool: "Görev Havuzunda",
    canCreate: "Oluşturma Yetkisi",
    canRead: "Okuma Yetkisi",
    canUpdate: "Güncelleme Yetkisi",
    canDelete: "Silme Yetkisi",
    subPermissions: "Alt Yetkiler",
  };
  return labels[fieldName] || fieldName;
};

/**
 * Enhanced metadata oluştur
 */
const createEnhancedMetadata = (
  action: "CREATE" | "UPDATE" | "DELETE",
  oldData: unknown,
  newData: unknown,
  tableName: string,
  additionalMetadata?: Record<string, unknown>
): EnhancedMetadata => {
  const currentUser = auth?.currentUser;

  const metadata: EnhancedMetadata = {
    sessionId: SESSION_ID,
    timestamp: new Date().toISOString(),
    changesSummary: createChangesSummary(action, oldData, newData, tableName),
    ...additionalMetadata,
  };

  // Kullanıcı bilgilerini ekle
  if (currentUser) {
    metadata.performedBy = {
      userId: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
    };
  }

  // Browser bilgilerini ekle (sadece client-side)
  if (typeof window !== "undefined") {
    metadata.userAgent = navigator.userAgent;
    metadata.screenResolution = `${window.screen.width}x${window.screen.height}`;
    metadata.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    metadata.language = navigator.language;
  }

  return metadata;
};

/**
 * Log queue'yi işle
 */
const processLogQueue = async (): Promise<void> => {
  if (isProcessing || logQueue.length === 0) return;

  isProcessing = true;
  const logsToProcess = [...logQueue];
  logQueue = [];

  try {
    // Paralel olarak tüm logları gönder
    await Promise.allSettled(
      logsToProcess.map((log) =>
        createAuditLog(
          log.action,
          log.tableName,
          log.recordId,
          log.oldData,
          log.newData,
          log.userId,
          log.metadata
        )
      )
    );
  } catch (error) {
    // Hata olsa bile devam et
    if (import.meta.env.DEV) {
      console.warn("Audit log batch işleme hatası:", error);
    }
  } finally {
    isProcessing = false;

    // Kuyrukta bekleyen var mı kontrol et
    if (logQueue.length > 0) {
      setTimeout(processLogQueue, BATCH_DELAY);
    }
  }
};

/**
 * Ana audit log fonksiyonu
 * Profesyonel, detaylı ve performanslı
=======
 * Audit Logger Utility
 * Tüm önemli işlemler için otomatik audit log kaydı
 */

import { createAuditLog } from "@/services/firebase/auditLogsService";

/**
 * Audit log oluştur (async, hata durumunda sessizce devam et)
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
 */
export const logAudit = async (
  action: "CREATE" | "UPDATE" | "DELETE",
  tableName: string,
  recordId: string | null,
  userId: string | null,
  oldData: unknown = null,
  newData: unknown = null,
  metadata?: Record<string, unknown>
): Promise<void> => {
  try {
<<<<<<< HEAD
    // Enhanced metadata oluştur
    const enhancedMetadata = createEnhancedMetadata(
      action,
      oldData,
      newData,
      tableName,
      metadata
    );

    // Log entry oluştur
    const logEntry: LogEntry = {
      action,
      tableName,
      recordId,
      userId: userId || auth?.currentUser?.uid || null,
      oldData,
      newData,
      metadata: enhancedMetadata,
      timestamp: Date.now(),
    };

    // Queue'ye ekle
    logQueue.push(logEntry);

    // Max queue size aşıldıysa hemen işle
    if (logQueue.length >= MAX_QUEUE_SIZE) {
      processLogQueue();
    } else {
      // Aksi halde delayed batch işleme
      setTimeout(processLogQueue, BATCH_DELAY);
    }
=======
    await createAuditLog(action, tableName, recordId, oldData, newData, userId, metadata);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  } catch (error: unknown) {
    // Audit log hataları ana işlemi etkilememeli
    if (import.meta.env.DEV) {
      console.warn("Audit log oluşturulamadı:", error);
    }
  }
};

<<<<<<< HEAD
/**
 * Kritik işlemler için anında log (queue kullanmadan)
 */
export const logAuditImmediate = async (
  action: "CREATE" | "UPDATE" | "DELETE",
  tableName: string,
  recordId: string | null,
  userId: string | null,
  oldData: unknown = null,
  newData: unknown = null,
  metadata?: Record<string, unknown>
): Promise<void> => {
  try {
    const enhancedMetadata = createEnhancedMetadata(
      action,
      oldData,
      newData,
      tableName,
      metadata
    );

    await createAuditLog(
      action,
      tableName,
      recordId,
      oldData,
      newData,
      userId || auth?.currentUser?.uid || null,
      enhancedMetadata
    );
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.warn("Immediate audit log oluşturulamadı:", error);
    }
  }
};

/**
 * Güvenlik ile ilgili olayları logla
 */
export const logSecurityEvent = async (
  eventType: "LOGIN" | "LOGOUT" | "PASSWORD_RESET" | "EMAIL_VERIFY" | "ROLE_CHANGE" | "PERMISSION_CHANGE" | "ACCOUNT_DELETE" | "ACCOUNT_RESTORE",
  userId: string | null,
  details: Record<string, unknown> = {}
): Promise<void> => {
  try {
    const enhancedMetadata = createEnhancedMetadata(
      "CREATE",
      null,
      details,
      "security_events",
      {
        eventType,
        severity: getSeverityLevel(eventType),
        ...details,
      }
    );

    await createAuditLog(
      "CREATE",
      "security_events",
      null,
      null,
      { eventType, ...details },
      userId,
      enhancedMetadata
    );
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.warn("Security event log oluşturulamadı:", error);
    }
  }
};

/**
 * Güvenlik olayının ciddiyet seviyesini belirle
 */
const getSeverityLevel = (eventType: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" => {
  const severityMap: Record<string, "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"> = {
    LOGIN: "LOW",
    LOGOUT: "LOW",
    PASSWORD_RESET: "MEDIUM",
    EMAIL_VERIFY: "LOW",
    ROLE_CHANGE: "HIGH",
    PERMISSION_CHANGE: "HIGH",
    ACCOUNT_DELETE: "CRITICAL",
    ACCOUNT_RESTORE: "HIGH",
  };
  return severityMap[eventType] || "MEDIUM";
};

/**
 * Session ID'yi al
 */
export const getSessionId = (): string => SESSION_ID;

/**
 * Bekleyen logları zorla gönder (sayfa kapanmadan önce)
 */
export const flushLogs = async (): Promise<void> => {
  if (logQueue.length > 0) {
    await processLogQueue();
  }
};

// Sayfa kapanmadan önce bekleyen logları gönder
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (logQueue.length > 0) {
      // Senkron olarak göndermeye çalış (garantili değil)
      navigator.sendBeacon?.(
        "/api/flush-logs",
        JSON.stringify({ logs: logQueue, sessionId: SESSION_ID })
      );
    }
  });
}
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
