/**
 * Firebase Settings Service
 * Şirket ayarları yönetimi
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export interface CompanySettings {
  companyName: string;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  currency: string;
  taxRate: number;
  emailNotifications?: boolean;
  lowStockAlerts?: boolean;
  autoBackup?: boolean;
  updatedAt: any;
  updatedBy: string;
}

const SETTINGS_DOC_ID = "main";

/**
 * Şirket ayarlarını al
 */
export const getCompanySettings = async (): Promise<CompanySettings | null> => {
  try {
    const settingsDoc = await getDoc(doc(firestore, "companySettings", SETTINGS_DOC_ID));
    
    if (!settingsDoc.exists()) {
      // Varsayılan ayarları oluştur
      const defaultSettings: CompanySettings = {
        companyName: "Revium ERP",
        currency: "₺",
        taxRate: 20,
        updatedAt: serverTimestamp(),
        updatedBy: "",
      };
      
      await setDoc(doc(firestore, "companySettings", SETTINGS_DOC_ID), defaultSettings);
      return defaultSettings;
    }

    return settingsDoc.data() as CompanySettings;
  } catch (error) {
    console.error("Get company settings error:", error);
    throw error;
  }
};

/**
 * Şirket ayarlarını güncelle
 */
export const updateCompanySettings = async (
  updates: Partial<Omit<CompanySettings, "updatedAt" | "updatedBy">>,
  updatedBy: string
): Promise<void> => {
  try {
    await updateDoc(doc(firestore, "companySettings", SETTINGS_DOC_ID), {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  } catch (error) {
    console.error("Update company settings error:", error);
    throw error;
  }
};

