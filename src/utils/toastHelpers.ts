/**
 * Toast Helper Functions
 * Permission hataları ve diğer hatalar için kullanıcı dostu toast mesajları
 */

import { toast } from "sonner";
import { isPermissionError } from "./errorLogger";

/**
 * İşlem türü ve kaynak türüne göre detaylı permission hatası mesajı
 */
export const getPermissionErrorMessage = (
  operation: "create" | "update" | "delete" | "read" | "interact" | "assign" | "approve" | "view",
  resource: "task" | "project" | "user" | "department" | "checklist" | "attachment" | "log" | "general" = "general"
): { title: string; description: string } => {
  const operationNames: Record<string, string> = {
    create: "oluşturma",
    update: "güncelleme",
    delete: "silme",
    read: "görüntüleme",
    interact: "etkileşim kurma",
    assign: "atama yapma",
    approve: "onaylama",
    view: "görüntüleme",
  };

  const resourceNames: Record<string, string> = {
    task: "görev",
    project: "proje",
    user: "kullanıcı",
    department: "departman",
    checklist: "checklist",
    attachment: "ek",
    log: "log",
    general: "bu işlem",
  };

  const operationName = operationNames[operation] || operation;
  const resourceName = resourceNames[resource] || resource;

  let title = "Yetkiniz Bulunmuyor";
  let description = "";

  switch (operation) {
    case "create":
      description = `${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} ${operationName} yetkiniz bulunmuyor. Bu işlem için ekip lideri veya yönetici ile iletişime geçin.`;
      break;
    case "update":
      description = `${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} ${operationName} yetkiniz bulunmuyor. Sadece size atanan ${resourceName}leri veya oluşturduğunuz ${resourceName}leri güncelleyebilirsiniz.`;
      break;
    case "delete":
      description = `${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} ${operationName} yetkiniz bulunmuyor. Bu işlem için ekip lideri veya yönetici ile iletişime geçin.`;
      break;
    case "read":
    case "view":
      description = `${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} ${operationName} yetkiniz bulunmuyor. Sadece size atanan veya oluşturduğunuz ${resourceName}leri görebilirsiniz.`;
      break;
    case "interact":
      if (resource === "task") {
        description = "Bu görevle etkileşim kurma yetkiniz bulunmuyor. Sadece size atanan görevlerin durumunu değiştirebilir, checklist öğelerini işaretleyebilirsiniz.";
      } else {
        description = `${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} ile ${operationName} yetkiniz bulunmuyor. Sadece size atanan ${resourceName}lerle etkileşim kurabilirsiniz.`;
      }
      break;
    case "assign":
      description = `${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} atama yetkiniz bulunmuyor. Bu işlem için ekip lideri veya yönetici ile iletişime geçin.`;
      break;
    case "approve":
      description = `${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} onaylama yetkiniz bulunmuyor. Bu işlem için ekip lideri veya yönetici ile iletişime geçin.`;
      break;
    default:
      description = "Bu işlem için yetkiniz bulunmuyor. Lütfen ekip lideri veya yönetici ile iletişime geçin.";
  }

  return { title, description };
};

/**
 * Permission hatası için toast göster
 */
export const showPermissionErrorToast = (
  operation?: "create" | "update" | "delete" | "read" | "interact" | "assign" | "approve" | "view",
  resource?: "task" | "project" | "user" | "department" | "checklist" | "attachment" | "log" | "general"
) => {
  const { title, description } = getPermissionErrorMessage(operation || "general", resource || "general");
  
  toast.error(title, {
    description,
    duration: 7000,
  });
};

/**
 * Hata mesajını kontrol et ve uygun toast göster
 */
export const handleErrorToast = (
  error: any, 
  defaultMessage?: string,
  operation?: "create" | "update" | "delete" | "read" | "interact" | "assign" | "approve" | "view",
  resource?: "task" | "project" | "user" | "department" | "checklist" | "attachment" | "log" | "general"
) => {
  const errorMessage = error?.message || error?.toString() || defaultMessage || "Bilinmeyen hata";
  
  // Permission hatası kontrolü
  if (
    isPermissionError(error) ||
    errorMessage.includes("Yetkiniz yok") ||
    errorMessage.includes("yetkiniz bulunmuyor") ||
    errorMessage.includes("yetkiniz yok") ||
    errorMessage.includes("Missing or insufficient permissions") ||
    errorMessage.includes("permission-denied")
  ) {
    showPermissionErrorToast(operation, resource);
    return;
  }
  
  // Diğer hatalar için normal toast
  toast.error(errorMessage);
};

