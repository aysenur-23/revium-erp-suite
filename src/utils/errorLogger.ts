/**
 * Error Logger Utility
 * Permission hatalarını ve işlem bilgilerini loglar
 */

interface OperationContext {
  operation: string; // "create", "update", "delete", "read", etc.
  collection?: string; // Firestore collection name
  documentId?: string; // Document ID if applicable
  userId?: string; // User ID attempting the operation
  data?: any; // Data being written (sanitized)
}

/**
 * Permission hatasını logla
 */
export const logPermissionError = (
  error: any,
  context: OperationContext
) => {
  const errorInfo = {
    code: error?.code || "unknown",
    message: error?.message || "Unknown error",
    operation: context.operation,
    collection: context.collection,
    documentId: context.documentId,
    userId: context.userId,
    timestamp: new Date().toISOString(),
    // Data'yı sanitize et (sensitive bilgileri kaldır)
    data: sanitizeData(context.data),
  };

  console.error("🚫 Permission Error:", {
    ...errorInfo,
    fullError: error,
  });

  // Detaylı hata mesajı
  const detailedMessage = `
Permission Hatası Detayları:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
İşlem: ${context.operation}
Collection: ${context.collection || "N/A"}
Document ID: ${context.documentId || "N/A"}
Kullanıcı ID: ${context.userId || "N/A"}
Hata Kodu: ${errorInfo.code}
Hata Mesajı: ${errorInfo.message}
Zaman: ${errorInfo.timestamp}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  console.error(detailedMessage);

  // Firebase Console linki
  if (context.collection) {
    console.warn("📋 Firebase Console'da Security Rules'u kontrol edin:");
    console.warn(`   https://console.firebase.google.com/project/revpad-15232/firestore/rules`);
    console.warn(`   Collection: ${context.collection}`);
    console.warn(`   Operation: ${context.operation}`);
  }
};

/**
 * Data'yı sanitize et - sensitive bilgileri kaldır
 */
const sanitizeData = (data: any): any => {
  if (!data || typeof data !== "object") {
    return data;
  }

  const sensitiveFields = ["password", "token", "secret", "key", "apiKey"];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }

  // Nested objects için recursive
  for (const key in sanitized) {
    if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }

  return sanitized;
};

/**
 * Permission hatasını yakala ve logla
 */
export const handlePermissionError = (
  error: any,
  context: OperationContext
): Error => {
  // Permission hatası kontrolü
  if (
    error?.code === "permission-denied" ||
    error?.code === 7 || // PERMISSION_DENIED
    error?.message?.includes("Missing or insufficient permissions") ||
    error?.message?.includes("permission-denied") ||
    error?.message?.includes("PERMISSION_DENIED")
  ) {
    logPermissionError(error, context);
    
    // Kullanıcı dostu hata mesajı
    const operationNames: Record<string, string> = {
      create: "oluşturma",
      update: "güncelleme",
      delete: "silme",
      read: "okuma",
    };
    
    const operationName = operationNames[context.operation] || context.operation;
    const userMessage = `Yetkiniz yok. Bu işlemi yapmak için ekip lideri veya yöneticiye ulaşabilirsiniz.`;
    
    return new Error(userMessage);
  }

  // Diğer hatalar için normal error döndür
  return error instanceof Error ? error : new Error(error?.message || "Bilinmeyen hata");
};

/**
 * Permission hatasını kontrol et ve kullanıcı dostu mesaj döndür
 */
export const isPermissionError = (error: any): boolean => {
  return (
    error?.code === "permission-denied" ||
    error?.code === 7 ||
    error?.message?.includes("Missing or insufficient permissions") ||
    error?.message?.includes("permission-denied") ||
    error?.message?.includes("PERMISSION_DENIED")
  );
};

/**
 * Kullanıcı dostu permission hata mesajı
 */
export const getPermissionErrorMessage = (): string => {
  return "Yetkiniz yok. Bu işlemi yapmak için ekip lideri veya yöneticiye ulaşabilirsiniz.";
};

