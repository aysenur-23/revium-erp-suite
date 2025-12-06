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
  oldData: any = null,
  newData: any = null
): Promise<void> => {
  try {
    await createAuditLog(action, tableName, recordId, oldData, newData, userId);
  } catch (error) {
    // Audit log hataları ana işlemi etkilememeli
    console.warn("Audit log oluşturulamadı:", error);
  }
};

