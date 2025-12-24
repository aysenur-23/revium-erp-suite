/**
 * Firebase Storage Service
 * Dosya yükleme ve indirme işlemleri
 */

import { ref, uploadBytes, getDownloadURL, deleteObject, UploadResult } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { uploadFileToDrive, deleteDriveFile, type DriveUploadResponse } from "@/services/driveService";

export type StorageProvider = "firebase" | "google_drive";

export interface StorageUploadResult {
  provider: StorageProvider;
  url: string;
  webViewLink?: string;
  webContentLink?: string;
  fileId?: string;
}

const driveResponseToResult = (response: DriveUploadResponse): StorageUploadResult => ({
  provider: "google_drive",
  fileId: response.fileId,
  webViewLink: response.webViewLink,
  webContentLink: response.webContentLink,
  url: response.webViewLink || response.webContentLink || "",
});

/**
 * Dosya yükleme
 */
export const uploadFile = async (
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    if (!storage) {
      throw new Error("Firebase Storage başlatılmamış");
    }

    const storageRef = ref(storage, path);
    const uploadResult: UploadResult = await uploadBytes(storageRef, file);
    
    // Download URL al
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    return downloadURL;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Upload file error:", error);
    }
    throw new Error(error instanceof Error ? error.message : "Dosya yüklenirken hata oluştu");
  }
};

/**
 * Ürün görseli yükleme
 */
export const uploadProductImage = async (
  file: File,
  productId?: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Dosya tipi kontrolü
  if (!file.type.startsWith('image/')) {
    throw new Error("Lütfen bir resim dosyası seçin");
  }

  // Dosya boyutu kontrolü (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Resim boyutu 5MB'dan küçük olmalıdır");
  }

  const timestamp = Date.now();
  const fileName = productId 
    ? `products/${productId}/${timestamp}_${file.name}`
    : `products/${timestamp}_${file.name}`;

  return await uploadFile(file, fileName, onProgress);
};

/**
 * Görev eki yükleme - Sadece Google Drive'a kaydeder
 */
export const uploadTaskAttachment = async (
  file: File,
  taskId: string,
  onProgress?: (progress: number) => void
): Promise<StorageUploadResult> => {
  // Dosya boyutu kontrolü (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Dosya boyutu 10MB'dan küçük olmalıdır");
  }

  const timestamp = Date.now();
  const fileName = `tasks/${taskId}/attachments/${timestamp}_${file.name}`;

  // Sadece Google Drive'a yükle
  const response = await uploadFileToDrive(file, {
    type: "task",
    fileName: file.name,
    metadata: { taskId, path: fileName },
  });
  
  return driveResponseToResult(response);
};

/**
 * PDF raporu yükleme - Sadece Google Drive'a kaydeder
 */
export const uploadReportPDF = async (
  file: File | Blob,
  reportType: string,
  reportId?: string,
  onProgress?: (progress: number) => void
): Promise<StorageUploadResult> => {
  const timestamp = Date.now();
  const fileName = reportId
    ? `reports/${reportType}/${reportId}_${timestamp}.pdf`
    : `reports/${reportType}/${timestamp}.pdf`;

  // Blob'u File'a dönüştür
  const fileToUpload = file instanceof File 
    ? file 
    : new File([file], `${timestamp}.pdf`, { type: 'application/pdf' });

  // Sadece Google Drive'a yükle
  const response = await uploadFileToDrive(fileToUpload, {
    type: "report",
    fileName: fileToUpload.name,
    metadata: { reportType, reportId: reportId || null, path: fileName },
  });
  
  return driveResponseToResult(response);
};

/**
 * Dosya silme
 */
export const deleteFile = async (
  fileUrl: string,
  options?: { provider?: StorageProvider; fileId?: string }
): Promise<void> => {
  try {
    if (options?.provider === "google_drive" || options?.fileId) {
      if (!options?.fileId) {
        throw new Error("Drive dosyasını silmek için fileId gerekli");
      }
      await deleteDriveFile(options.fileId);
      return;
    }

    if (!storage) {
      throw new Error("Firebase Storage başlatılmamış");
    }

    // URL'den path'i çıkar
    const urlObj = new URL(fileUrl);
    const path = decodeURIComponent(urlObj.pathname.split('/o/')[1]?.split('?')[0] || '');
    
    if (!path) {
      throw new Error("Geçersiz dosya URL'i");
    }

    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error: unknown) {
    console.error("Delete file error:", error);
    throw new Error(error.message || "Dosya silinirken hata oluştu");
  }
};

/**
 * Dosya URL'inden path çıkarma
 */
export const getPathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const path = decodeURIComponent(urlObj.pathname.split('/o/')[1]?.split('?')[0] || '');
    return path || null;
  } catch {
    return null;
  }
};

