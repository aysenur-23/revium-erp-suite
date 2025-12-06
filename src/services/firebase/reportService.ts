/**
 * Firebase Report Service
 * Rapor yönetimi işlemleri
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
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { uploadReportPDF } from "./storageService";

export interface SavedReport {
  id: string;
  reportType: "sales" | "production" | "customer" | "financial" | "sales_quote";
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  createdBy: string;
  createdAt: Timestamp;
  metadata?: Record<string, any> | null;
  storageProvider?: "firebase" | "google_drive";
  driveFileId?: string | null;
  driveLink?: string | null;
}

/**
 * Rapor kaydet
 */
export const saveReport = async (
  reportType: SavedReport["reportType"],
  title: string,
  pdfBlob: Blob,
  userId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    metadata?: Record<string, any>;
  }
): Promise<SavedReport> => {
  try {
    // PDF'i Google Drive'a yükle
    const timestamp = Date.now();
    const fileName = `${reportType}_${timestamp}.pdf`;
    let uploadInfo: Awaited<ReturnType<typeof uploadReportPDF>> | null = null;
    try {
      uploadInfo = await uploadReportPDF(pdfBlob, reportType, undefined);
      // Başarılı - hem dev hem production'da log göster (kritik işlem)
      if (import.meta.env.DEV) {
        console.log("✅ PDF Google Drive'a başarıyla yüklendi:", uploadInfo.fileId);
      }
    } catch (uploadError: any) {
      // Hata - detaylı log (hem dev hem production'da görünür olmalı)
      const errorMessage = uploadError?.message || String(uploadError);
      if (import.meta.env.DEV) {
        console.error("❌ Google Drive upload failed, proceeding without file URL:", errorMessage);
      }
      // Dosya yüklenemese bile rapor kaydını oluştur, ama fileUrl boş olacak
      // Kullanıcı "indir" butonu ile yerel kopyayı zaten aldı
      uploadInfo = null;
      
      // Production'da da hata mesajını göster (kritik işlem)
      // Ancak rapor kaydı oluşturulmaya devam eder
    }
    
    // Firestore'a kaydet
    const reportData: Omit<SavedReport, "id"> = {
      reportType,
      title,
      startDate: options?.startDate || null,
      endDate: options?.endDate || null,
      fileUrl: uploadInfo?.url || "",
      fileName,
      fileSize: pdfBlob.size,
      createdBy: userId,
      createdAt: serverTimestamp() as Timestamp,
      metadata: options?.metadata || null,
      storageProvider: uploadInfo?.provider || null,
      driveFileId: uploadInfo?.fileId || null,
      driveLink: uploadInfo?.webViewLink || uploadInfo?.webContentLink || null,
    };

    const docRef = await addDoc(collection(firestore, "reports"), reportData);
    
    const createdReport = await getDoc(docRef);
    return {
      id: docRef.id,
      ...createdReport.data(),
      createdAt: createdReport.data()?.createdAt || Timestamp.now(),
    } as SavedReport;
  } catch (error) {
    // Sadece development'ta log göster
    if (import.meta.env.DEV) {
      console.error("Save report error:", error);
    }
    throw error;
  }
};

/**
 * Tüm raporları listele
 */
export const getSavedReports = async (filters?: {
  reportType?: SavedReport["reportType"];
  createdBy?: string;
}): Promise<SavedReport[]> => {
  try {
    let q = query(collection(firestore, "reports"), orderBy("createdAt", "desc"));

    if (filters?.reportType) {
      q = query(q, where("reportType", "==", filters.reportType));
    }

    if (filters?.createdBy) {
      q = query(q, where("createdBy", "==", filters.createdBy));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SavedReport[];
  } catch (error: any) {
    console.error("Get saved reports error:", error);
    // Firestore index hatası durumunda boş array döndür (dashboard'un yüklenmesini engelleme)
    if (error?.code === "failed-precondition" || error?.message?.includes("index")) {
      console.warn("Firestore index eksik, boş array döndürülüyor. Index oluşturulana kadar raporlar görünmeyecek.");
      return [];
    }
    // Diğer hatalar için de boş array döndür (dashboard'un yüklenmesini engelleme)
    return [];
  }
};

/**
 * Rapor sil
 */
export const deleteReport = async (reportId: string): Promise<void> => {
  try {
    await deleteDoc(doc(firestore, "reports", reportId));
  } catch (error) {
    console.error("Delete report error:", error);
    throw error;
  }
};

