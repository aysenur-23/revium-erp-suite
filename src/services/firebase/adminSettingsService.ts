import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";

export interface AdminSettings {
  id: string;
  companyName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  emailNotifications: boolean;
  notifyTasks: boolean;
  notifyProduction: boolean;
  twoFactorRequired: boolean;
  passwordRotationDays: number;
  sessionTimeoutMinutes: number;
  minPasswordLength: number;
  autoBackup: boolean;
  lastBackupAt: Timestamp | null;
  lastRestoreRequest: Timestamp | null;
  lastCleanupRequest: Timestamp | null;
  updatedAt: Timestamp;
  updatedBy: string;
}

const ADMIN_SETTINGS_COLLECTION = "admin_settings";
const ADMIN_SETTINGS_DOC_ID = "system";

const defaultSettings: Omit<AdminSettings, "id" | "updatedAt" | "updatedBy"> = {
  companyName: "Revium",
  supportEmail: "destek@revium.com",
  maintenanceMode: false,
  allowNewRegistrations: true,
  emailNotifications: true,
  notifyTasks: true,
  notifyProduction: true,
  twoFactorRequired: false,
  passwordRotationDays: 0,
  sessionTimeoutMinutes: 480,
  minPasswordLength: 8,
  autoBackup: true,
  lastBackupAt: null,
  lastRestoreRequest: null,
  lastCleanupRequest: null,
};

/**
 * Get admin settings
 */
export const getAdminSettings = async (): Promise<AdminSettings | null> => {
  try {
    const settingsRef = doc(db, ADMIN_SETTINGS_COLLECTION, ADMIN_SETTINGS_DOC_ID);
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) {
      // Create default settings if they don't exist
      const defaultAdminSettings: AdminSettings = {
        id: ADMIN_SETTINGS_DOC_ID,
        ...defaultSettings,
        updatedAt: Timestamp.now(),
        updatedBy: "system",
      };
      
      await setDoc(settingsRef, defaultAdminSettings);
      return defaultAdminSettings;
    }
    
    return {
      id: settingsSnap.id,
      ...settingsSnap.data(),
    } as AdminSettings;
  } catch (error: any) {
    console.error("Error getting admin settings:", error);
    throw new Error(error.message || "Admin ayarları yüklenemedi");
  }
};

/**
 * Update admin settings
 */
export const updateAdminSettings = async (
  updates: Partial<Omit<AdminSettings, "id" | "updatedAt" | "updatedBy">>,
  userId: string
): Promise<void> => {
  try {
    const settingsRef = doc(db, ADMIN_SETTINGS_COLLECTION, ADMIN_SETTINGS_DOC_ID);
    
    // Get current settings first
    const currentSettings = await getAdminSettings();
    
    const updatedSettings: Partial<AdminSettings> = {
      ...currentSettings,
      ...updates,
      updatedAt: Timestamp.now(),
      updatedBy: userId,
    };
    
    await setDoc(settingsRef, updatedSettings, { merge: true });
  } catch (error: any) {
    console.error("Error updating admin settings:", error);
    throw new Error(error.message || "Admin ayarları güncellenemedi");
  }
};

