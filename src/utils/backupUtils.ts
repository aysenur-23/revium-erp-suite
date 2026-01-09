import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

const COLLECTIONS_TO_BACKUP = [
  "users",
  "tasks",
  "orders",
  "customers",
  "products",
  "rawMaterials",
  "departments",
  "projects",
  "warranty_records",
  "audit_logs",
  "notifications",
  "role_permissions",
  "roles",
  "admin_settings"
];

export const downloadDatabaseBackup = async () => {
  try {
    const backupData: Record<string, Array<Record<string, unknown>>> = {};

    for (const collectionName of COLLECTIONS_TO_BACKUP) {
      try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        backupData[collectionName] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.warn(`Skipping collection ${collectionName}:`, error);
        }
        backupData[collectionName] = [];
      }
    }

    const date = new Date().toISOString().split('T')[0];
    const fileName = `revium_backup_${date}.json`;
    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);

    toast.success("Yedek dosyası indirildi.");
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Backup failed:", error);
    }
    toast.error("Yedek alma işlemi başarısız oldu: " + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
};

