/**
 * Audit Logger Utility
 * Tüm önemli işlemler için otomatik audit log kaydı
 */

import { createAuditLog } from "@/services/firebase/auditLogsService";

/**
 * Audit log oluştur (async, hata durumunda sessizce devam et)
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
    await createAuditLog(action, tableName, recordId, oldData, newData, userId, metadata);
  } catch (error: unknown) {
    // Audit log hataları ana işlemi etkilememeli
    if (import.meta.env.DEV) {
      console.warn("Audit log oluşturulamadı:", error);
    }
  }
};

