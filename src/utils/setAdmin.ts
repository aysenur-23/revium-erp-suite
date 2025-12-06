import { collection, getDocs, query, where, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const setUserAsAdmin = async (email: string) => {
  try {
    console.log(`🔍 Kullanıcı aranıyor: ${email}`);
    
    // Kullanıcıyı email ile bul
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.error("❌ Kullanıcı bulunamadı!");
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const currentRoles = userData.role || ["viewer"];

    console.log(`👤 Kullanıcı bulundu: ${userData.displayName || email}`);
    console.log(`📋 Mevcut Roller: ${currentRoles.join(", ")}`);

    // Admin rolü ekle
    if (!currentRoles.includes("admin")) {
      const newRoles = [...currentRoles, "admin"];
      
      await updateDoc(doc(db, "users", userDoc.id), {
        role: newRoles
      });

      console.log(`✅ BAŞARILI: ${email} kullanıcısına 'admin' rolü eklendi.`);
      console.log(`🆕 Yeni Roller: ${newRoles.join(", ")}`);
      console.log("ℹ️ Değişikliğin etkili olması için kullanıcının çıkış yapıp tekrar girmesi gerekebilir.");
    } else {
      console.log("ℹ️ Bu kullanıcı zaten admin yetkisine sahip.");
    }

  } catch (error) {
    console.error("❌ Hata oluştu:", error);
  }
};

