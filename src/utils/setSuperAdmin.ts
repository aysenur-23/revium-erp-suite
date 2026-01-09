import { collection, getDocs, query, where, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { toast } from "sonner";
import { UserProfile } from "@/services/firebase/authService";

export const setSuperAdmin = async (email: string) => {
  try {
    const usersRef = collection(firestore, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      toast.error(`Kullanıcı bulunamadı: ${email}`);
      console.error(`Kullanıcı bulunamadı: ${email}`);
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as UserProfile;
    const currentRoles = userData.role || [];

    if (currentRoles.includes("super_admin")) {
      toast.info(`${email} zaten süper yönetici rolüne sahip.`);
      console.log(`${email} zaten süper yönetici rolüne sahip.`);
      return;
    }

    await updateDoc(userDoc.ref, {
      role: [...currentRoles, "super_admin"],
    });

    toast.success(`${email} kullanıcısı süper yönetici olarak ayarlandı.`);
    console.log(`${email} kullanıcısı süper yönetici olarak ayarlandı.`);
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Süper yönetici atama hatası:", error);
    }
    toast.error(`Süper yönetici atama hatası: ${error instanceof Error ? error.message : String(error)}`);
  }
};

