/**
 * Firebase Authentication Service
 * Kullanıcı kayıt, giriş, çıkış ve profil yönetimi
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
<<<<<<< HEAD
=======
  deleteUser as firebaseDeleteUser,
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  writeBatch,
  where,
  Timestamp,
<<<<<<< HEAD
  DocumentData,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import { logAudit } from "@/utils/auditLogger";
import {
  REQUIRE_EMAIL_VERIFICATION,
  ALLOW_DELETED_ACCOUNT_REREGISTRATION,
  AUTO_SEND_VERIFICATION_EMAIL,
  RESEND_VERIFICATION_ON_LOGIN
} from "@/config/auth";
=======
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import { logAudit } from "@/utils/auditLogger";
// firebase-auth.ts removed, functions are now directly in this file
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  role: string[];
  departmentId?: string;
  pendingTeams?: string[]; // Onay bekleyen ekipler (department IDs)
  approvedTeams?: string[]; // Onaylanmış ekipler (department IDs)
  teamLeaderIds?: string[]; // Ekip lideri olduğu ekipler (opsiyonel)
  emailVerified: boolean;
  createdAt: Timestamp | Date | null;
  updatedAt: Timestamp | Date | null;
  lastLoginAt?: Timestamp | Date | null; // Son giriş zamanı
}

<<<<<<< HEAD
export interface FirebaseAuthError extends Error {
  code?: string;
  message: string;
}

=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
/**
 * Kullanıcı kaydı
 */
export const register = async (
  email: string,
  password: string,
  fullName: string,
  phone?: string,
  dateOfBirth?: string,
  selectedTeamId?: string
): Promise<{ success: boolean; message?: string; user?: UserProfile | null }> => {
  try {
<<<<<<< HEAD
    if (!auth || !firestore) {
      throw new Error('Firebase is not initialized');
    }

    // Önce email'in kayıtlı olup olmadığını Firestore'dan kontrol et (hızlı)
    let existingUserDoc: { id: string; data: DocumentData } | null = null;
    try {
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("email", "==", email), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const userData = doc.data();

        // Silinmiş hesap kontrolü - config'e göre yeniden kayıt izni ver
        if (userData.deleted === true) {
          if (ALLOW_DELETED_ACCOUNT_REREGISTRATION) {
            // Silinmiş hesap - config'e göre yeni kayıt olabilir, existingUserDoc'u null yap
            existingUserDoc = null;
          } else {
            // Silinmiş hesapların yeniden kaydı kapalı
            return {
              success: false,
              message: "Bu e-posta adresi daha önce kullanılmış ve hesap silinmiş. Yeni bir e-posta adresi kullanın.",
              user: null,
            };
          }
        } else {
          existingUserDoc = { id: doc.id, data: userData };
        }
      }
    } catch (checkError) {
      // Firestore kontrolü başarısız olsa bile devam et (permission hatası normal)
      // Giriş yapmadan email kontrolü yapamayabiliriz, bu durumda Firebase Auth kontrolü yapılacak
      const errorCode = (checkError as { code?: string })?.code;
      if (errorCode !== 'permission-denied' && import.meta.env.DEV) {
        console.warn("Email kontrolü yapılırken hata:", checkError);
      }
    }

    let firebaseUser: FirebaseUser | null = null;
    let isExistingUser = false;

    if (existingUserDoc) {
      // Email zaten kayıtlı - mevcut kullanıcı ile giriş yapmayı dene
      try {
        const loginResult = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = loginResult.user;
        isExistingUser = true;

        // Firebase Auth'daki user objesini reload et (emailVerified değerinin güncel olması için)
        // reload() user objesini günceller, bu yüzden aynı objeyi kullanmalıyız
        try {
          if (import.meta.env.DEV) {
            console.log("Register - User reload öncesi emailVerified:", firebaseUser.emailVerified);
          }
          await firebaseUser.reload();
          // reload() sonrası firebaseUser objesi güncellenmiş olmalı
          // Ayrıca auth.currentUser'ı da kontrol et (bazen daha güncel olabilir)
          if (auth.currentUser) {
            firebaseUser = auth.currentUser;
          }
          if (import.meta.env.DEV) {
            console.log("Register - User reload sonrası emailVerified:", firebaseUser.emailVerified);
            console.log("Register - auth.currentUser emailVerified:", auth.currentUser?.emailVerified);
          }
        } catch (reloadError) {
          if (import.meta.env.DEV) {
            console.warn("User reload hatası (devam ediliyor):", reloadError);
          }
          // Reload hatası olsa bile devam et
        }

        // Email doğrulanmış mı kontrol et - Firebase Auth en güncel kaynak
        const userData = existingUserDoc.data;
        const wasDeleted = userData.deleted === true;
        // Firebase Auth'daki emailVerified değeri en güncel olanıdır, öncelikli kontrol
        // reload() sonrası firebaseUser.emailVerified güncellenmiş olmalı
        // Eğer hala false ise, Firestore'daki değere de bak (senkronizasyon sorunu olabilir)
        let emailVerified = firebaseUser.emailVerified;
        // Eğer Firebase Auth'da false ama Firestore'da true ise, Firestore'a güven
        // (Firebase Auth daha güncel olmalı ama senkronizasyon sorunu olabilir)
        if (!emailVerified && userData.emailVerified === true) {
          if (import.meta.env.DEV) {
            console.warn("Register - Firebase Auth'da emailVerified false ama Firestore'da true, Firestore'a güveniliyor");
          }
          // Firestore'daki değere güven ama Firebase Auth'ı da güncelle
          emailVerified = true;
        }

        if (import.meta.env.DEV) {
          console.log("Register - Mevcut kullanıcı email doğrulama kontrolü:", {
            firebaseEmailVerified: firebaseUser.emailVerified,
            firestoreEmailVerified: userData.emailVerified,
            emailVerified,
            wasDeleted,
            userId: firebaseUser.uid,
            email: firebaseUser.email,
          });
        }

        // Eğer email doğrulanmışsa, direkt hata mesajı döndür (kayıt olmaya çalışıyor)
        if (emailVerified && !wasDeleted) {
          await firebaseSignOut(auth);
          return {
            success: false,
            message: "Bu hesap zaten var, doğrulanmış. Giriş yapabilirsiniz.",
            user: null,
          };
        }

        // Email doğrulanmamışsa veya silinmişse devam et (aşağıdaki kod devam edecek)
      } catch (loginError: unknown) {
        // Şifre yanlış - email zaten kayıtlı ama şifre yanlış
        const customError = new Error("Bu hesap zaten kayıtlı. Lütfen giriş yapmayı deneyin.");
        (customError as FirebaseAuthError).code = 'auth/email-already-in-use';
        throw customError;
      }
    } else {
      // Email kayıtlı değil veya silinmiş - yeni kullanıcı oluştur
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
        isExistingUser = false;
      } catch (createError: unknown) {
        // Eğer email zaten Firebase Auth'da varsa (silinmiş hesap olabilir)
        const errorCode = (createError as { code?: string })?.code;
        if (errorCode === 'auth/email-already-in-use') {
          // Firebase Auth'da email var ama Firestore'da silinmiş
          // Giriş yapmayı dene ve Firestore'u güncelle
          try {
            const loginResult = await signInWithEmailAndPassword(auth, email, password);
            firebaseUser = loginResult.user;
            isExistingUser = false; // Yeni kayıt olarak işlem yap (silinmiş hesap tekrar kayıt oluyor)
          } catch (loginError: unknown) {
            // Şifre yanlış
            const customError = new Error("Bu hesap zaten kayıtlı. Lütfen giriş yapmayı deneyin.");
            (customError as FirebaseAuthError).code = 'auth/email-already-in-use';
            throw customError;
          }
        } else {
          throw createError;
        }
      }
    }

    if (!firebaseUser) {
      throw new Error('Kullanıcı oluşturulamadı veya bulunamadı');
    }

    const userId = firebaseUser.uid;

    // Firestore'da kullanıcı profili oluştur (sadece yeni kullanıcı için)
    const userProfileData: Record<string, unknown> = {
=======
    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }
    // Firebase Auth ile kullanıcı oluştur
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Silinmiş kullanıcı kontrolü - email ile kontrol et (artık authenticated olduğumuz için)
    if (firestore) {
      try {
        const usersRef = collection(firestore, "users");
        const emailQuery = query(usersRef, where("email", "==", email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          const existingUser = emailSnapshot.docs[0].data();
          if (existingUser.deleted === true) {
            // Firebase Auth kullanıcısını sil
            try {
              await firebaseDeleteUser(firebaseUser);
            } catch (deleteError) {
              if (import.meta.env.DEV) {
                console.error("Kullanıcı silinirken hata:", deleteError);
              }
            }
            throw new Error("Bu e-posta adresi ile kayıtlı bir hesap silinmiş. Yeni bir hesap oluşturamazsınız.");
          }
        }
      } catch (checkError: unknown) {
        // İzin hatası olsa bile devam et (kullanıcı zaten oluşturuldu)
        if (import.meta.env.DEV) {
          console.warn("Silinmiş kullanıcı kontrolü yapılamadı:", checkError instanceof Error ? checkError.message : String(checkError));
        }
      }
    }
    
    const userId = firebaseUser.uid;
    
    // Firestore'da kullanıcı profili oluştur
    // Firestore undefined değerleri kabul etmez, bu yüzden sadece tanımlı alanları ekle
    const userProfileData: Omit<UserProfile, "id"> = {
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      email: email,
      displayName: fullName,
      fullName: fullName,
      role: ["viewer"], // Varsayılan rol
<<<<<<< HEAD
      emailVerified: false, // Email doğrulama zorunlu, başlangıçta false
      needsEmailVerification: true, // Yeni kayıt olan kullanıcılar için email doğrulaması zorunlu
=======
      emailVerified: firebaseUser.emailVerified,
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      pendingTeams: selectedTeamId ? [selectedTeamId] : [],
      approvedTeams: [],
    };

    // Opsiyonel alanları sadece tanımlıysa ve boş değilse ekle
<<<<<<< HEAD
=======
    // Firestore undefined ve boş string değerlerini kabul etmez
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    if (phone && phone.trim() !== '') {
      userProfileData.phone = phone.trim();
    }
    if (dateOfBirth && dateOfBirth.trim() !== '') {
      userProfileData.dateOfBirth = dateOfBirth.trim();
    }

<<<<<<< HEAD
    const userDocRef = doc(firestore, "users", userId);

    // Firestore yazma, display name güncelleme ve email doğrulama gönderme işlemlerini paralel yap
    const promises: Promise<void>[] = [];
    let emailVerificationError: Error | null = null;

    // Firestore yazma işlemi (hızlı - gereksiz getDoc kaldırıldı)
    const firestorePromise = (async () => {
      if (isExistingUser && existingUserDoc) {
        // Mevcut kullanıcı - sadece güncelleme yap
        // Email doğrulama durumu: Firebase Auth en güncel kaynak
        const userData = existingUserDoc.data;
        // Firebase Auth'daki emailVerified değeri en güncel olanıdır, öncelikli kontrol
        const emailVerified = firebaseUser.emailVerified;

        if (import.meta.env.DEV) {
          console.log("Register - Mevcut kullanıcı Firestore güncelleme öncesi:", {
            email,
            firebaseEmailVerified: firebaseUser.emailVerified,
            firestoreEmailVerified: userData.emailVerified,
            emailVerified,
          });
        }

        const updateData: Record<string, unknown> = {
          displayName: fullName,
          fullName: fullName,
          updatedAt: serverTimestamp(),
        };

        // Opsiyonel alanları sadece tanımlıysa ekle
        if (phone && phone.trim() !== '') {
          updateData.phone = phone.trim();
        }
        if (dateOfBirth && dateOfBirth.trim() !== '') {
          updateData.dateOfBirth = dateOfBirth.trim();
        }
        if (selectedTeamId) {
          updateData.pendingTeams = [selectedTeamId];
        }

        // Email doğrulama durumunu Firebase Auth'dan al ve Firestore'a senkronize et
        if (emailVerified) {
          // Email doğrulanmışsa needsEmailVerification flag'ini false yap
          updateData.needsEmailVerification = false;
          updateData.emailVerified = true;

          if (import.meta.env.DEV) {
            console.log("Register - Mevcut kullanıcı için email doğrulanmış, needsEmailVerification: false set ediliyor");
          }
        } else {
          // Email doğrulanmamışsa needsEmailVerification flag'ini true yap
          updateData.needsEmailVerification = true;
          updateData.emailVerified = false;

          if (import.meta.env.DEV) {
            console.log("Register - Mevcut kullanıcı için email doğrulanmamış, needsEmailVerification: true set ediliyor");
          }
        }

        // undefined değerleri temizle (Firestore undefined kabul etmez)
        const cleanUpdateData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updateData)) {
          if (value !== undefined) {
            cleanUpdateData[key] = value;
          }
        }

        await updateDoc(userDocRef, cleanUpdateData);

        if (import.meta.env.DEV) {
          console.log("Register - Firestore güncellemesi tamamlandı", {
            email,
            needsEmailVerification: updateData.needsEmailVerification,
            emailVerified: updateData.emailVerified,
          });
        }
      } else {
        // Yeni kullanıcı veya silinmiş hesap tekrar kayıt oluyor
        // Silinmiş hesap için sıfırdan kayıt oluyor gibi devam et
        // undefined değerleri temizle (Firestore undefined kabul etmez)
        const cleanUserProfileData: Record<string, unknown> = {
          ...userProfileData,
          deleted: false, // Silinmiş flag'ini kaldır
          needsEmailVerification: true, // Silinmiş hesap için de email doğrulaması zorunlu
          emailVerified: false, // Email doğrulaması yapılmalı
        };

        // undefined değerleri kaldır
        for (const [key, value] of Object.entries(cleanUserProfileData)) {
          if (value === undefined) {
            delete cleanUserProfileData[key];
          }
        }

        // setDoc merge: true ile çalışır, eğer doküman varsa günceller, yoksa oluşturur
        await setDoc(userDocRef, cleanUserProfileData, { merge: true });

        if (import.meta.env.DEV) {
          console.log("Register - Yeni kullanıcı veya silinmiş hesap için kayıt", {
            email,
            isExistingUser,
            firebaseEmailVerified: firebaseUser.emailVerified,
          });
        }
      }
    })();
    promises.push(firestorePromise);

    // Display name güncelleme
    if (fullName) {
      promises.push(updateProfile(firebaseUser, { displayName: fullName }).catch((error) => {
        if (import.meta.env.DEV) {
          console.error("Display name güncellenirken hata:", error);
        }
        // Hata olsa bile devam et
      }));
    }

    // Email doğrulama gönder (sadece email doğrulanmamışsa ve AUTO_SEND_VERIFICATION_EMAIL true ise)
    // Config'e göre email gönderimi kontrol edilir
    if (AUTO_SEND_VERIFICATION_EMAIL && !firebaseUser.emailVerified) {
      const emailPromise = sendEmailVerification(firebaseUser)
        .then(() => {
          if (import.meta.env.DEV) {
            console.log("Email doğrulama maili gönderildi:", email);
          }
        })
        .catch((verifyError: unknown) => {
          const errorCode = (verifyError as { code?: string })?.code;
          const errorMsg = verifyError instanceof Error ? verifyError.message : String(verifyError);

          if (import.meta.env.DEV) {
            console.error("Email doğrulama maili gönderilirken hata:", verifyError);
          }

          // Hatayı kaydet
          let errorMessage = "Email doğrulama maili gönderilemedi.";
          if (errorCode === 'auth/too-many-requests') {
            errorMessage = "Çok fazla istek yapıldı. Lütfen bir süre sonra tekrar deneyin.";
          } else if (errorCode === 'auth/network-request-failed') {
            errorMessage = "Ağ hatası. İnternet bağlantınızı kontrol edin.";
          } else if (errorMsg) {
            errorMessage = errorMsg;
          }

          emailVerificationError = new Error(errorMessage + " Lütfen daha sonra tekrar deneyin.");
        });

      // Email gönderme işlemini timeout ile sınırlandır (2 saniye - hızlı ama güvenilir)
      const emailWithTimeout = Promise.race([
        emailPromise,
        new Promise<void>((resolve) => {
          setTimeout(() => {
            if (import.meta.env.DEV) {
              console.warn("Email gönderme işlemi timeout (2 saniye), background'da devam ediyor...");
            }
            resolve();
          }, 2000); // 2 saniye timeout
        })
      ]);

      promises.push(emailWithTimeout);
    }

    // Tüm paralel işlemleri bekle (Firestore yazma, display name, email gönderme)
    const results = await Promise.allSettled(promises);

    // Firestore güncellemesinin başarılı olduğundan emin ol
    if (import.meta.env.DEV) {
      const firestoreResult = results[0];
      if (firestoreResult.status === 'rejected') {
        console.error("Register - Firestore güncellemesi başarısız:", firestoreResult.reason);
      } else {
        console.log("Register - Firestore güncellemesi başarılı");
      }
    }

    // Email gönderim hatası varsa fırlat
    if (emailVerificationError) {
      throw emailVerificationError;
    }

    // Firestore güncellemesinin tamamlandığından emin olmak için kısa bir bekleme
    // (Firestore'un eventual consistency özelliği nedeniyle)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Eğer ekip seçildiyse, ekip liderine ve yöneticilere bildirim gönder
    if (selectedTeamId) {
      try {
        const { getDepartmentById } = await import("./departmentService");
        const { createNotification } = await import("./notificationService");
        const department = await getDepartmentById(selectedTeamId);

        if (department) {
          const requesterName = fullName || email || "Bir kullanıcı";
          const teamName = department.name || "ekip";

          const notificationPromises: Promise<void>[] = [];

          // Ekip liderine bildirim gönder
          if (department.managerId) {
            notificationPromises.push(
              createNotification({
                userId: department.managerId,
                type: "system",
                title: "Yeni katılım isteği",
                message: `${requesterName} "${teamName}" ekibine katılmak için istek gönderdi. İsteği onaylamak veya reddetmek için Ekip Üyeleri sayfasını ziyaret edin.`,
                read: false,
                metadata: {
                  teamId: selectedTeamId,
                  teamName: teamName,
                  requesterId: userId,
                  requesterName: requesterName,
                  requesterEmail: email,
                },
              }).then(() => { }).catch(err => {
                if (import.meta.env.DEV) {
                  console.error("Error sending notification to team leader:", err);
                }
              })
            );
          }

          // Yöneticilere (super_admin, main_admin) bildirim gönder
          try {
            const allUsers = await getAllUsers();
            const admins = allUsers.filter(u =>
              u.role?.includes("super_admin") || u.role?.includes("main_admin")
            );

            for (const admin of admins) {
              notificationPromises.push(
                createNotification({
                  userId: admin.id,
                  type: "system",
                  title: "Yeni ekip katılım isteği",
                  message: `${requesterName} "${teamName}" ekibine katılmak için istek gönderdi. İsteği onaylamak veya reddetmek için Ekip Onay Yönetimi sayfasını ziyaret edin.`,
                  read: false,
                  metadata: {
                    teamId: selectedTeamId,
                    teamName: teamName,
                    requesterId: userId,
                    requesterName: requesterName,
                    requesterEmail: email,
                  },
                }).then(() => { }).catch(err => {
                  if (import.meta.env.DEV) {
                    console.error(`Error sending notification to admin ${admin.id}:`, err);
                  }
                })
              );
            }
          } catch (adminError) {
            if (import.meta.env.DEV) {
              console.error("Error getting admins for notification:", adminError);
            }
          }

          // Tüm bildirimleri paralel gönder (await etmeden, arka planda)
          Promise.allSettled(notificationPromises).catch(() => {
            // Bildirim hatası kayıt işlemini engellemez
          });
        }
      } catch (notifError) {
        if (import.meta.env.DEV) {
          console.error("Error sending team request notifications:", notifError);
        }
        // Bildirim hatası kayıt işlemini engellemez
      }
    }

    // Mevcut kullanıcı için mesaj farklı olabilir
    // Email zaten doğrulanmışsa doğrulama mesajı gösterme
    let successMessage: string;
    if (isExistingUser) {
      // Mevcut kullanıcı kayıt olmaya çalışıyor - "bu hesap zaten var" mesajı göster
      if (firebaseUser.emailVerified) {
        successMessage = "Bu hesap zaten var, doğrulanmış. Giriş yapabilirsiniz.";
      } else {
        successMessage = "Hesap var ama doğrulama yapılmamış. Doğrulama maili gönderildi. Lütfen e-postanızı ve spam kutusunu kontrol edin.";
      }
    } else {
      // İlk yeni kayıt - sadece doğrulama maili bildirimi
      if (firebaseUser.emailVerified) {
        successMessage = "Kayıt başarılı!";
      } else {
        successMessage = "Doğrulama maili gönderildi. Doğrulama yaptıktan sonra giriş yapabilirsiniz. Lütfen e-postanızı ve spam kutusunu kontrol edin.";
      }
    }

    return {
      success: true,
      message: successMessage,
=======
    if (!firestore) {
      throw new Error('Firestore is not initialized');
    }
    
    // KRİTİK: createUserWithEmailAndPassword sonrası auth.currentUser otomatik set edilir
    // Ama bazen bir tick gecikme olabilir, bu yüzden onAuthStateChanged ile bekliyoruz
    // ÖNEMLİ: updateProfile çağrısını Firestore yazma işleminden SONRA yapmalıyız
    // Çünkü updateProfile auth.currentUser'ı güncelleyebilir ve Firestore yazma işlemini etkileyebilir
    
    // createUserWithEmailAndPassword sonrası auth.currentUser otomatik set edilir
    // Ama Firestore SDK auth.currentUser'dan token alıyor
    // Eğer auth.currentUser henüz set edilmemişse, onAuthStateChanged ile bekleyelim
    // ÖNEMLİ: onAuthStateChanged callback'i hemen tetiklenir ve mevcut state'i döndürür
    // Eğer auth.currentUser zaten set edilmişse, callback hemen resolve eder
    // Eğer set edilmemişse, bir sonraki state değişikliğinde resolve eder
    
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
      // auth.currentUser henüz set edilmemiş, onAuthStateChanged ile bekleyelim
      await new Promise<void>((resolve, reject) => {
        let unsubscribe: (() => void) | null = null;
        let timeoutId: NodeJS.Timeout | null = null;
        let isResolved = false;
        let hasReceivedInitialState = false;
        
        // Cleanup fonksiyonu
        const cleanup = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
        };
        
        // 3 saniye timeout
        timeoutId = setTimeout(() => {
          if (!isResolved) {
            cleanup();
            reject(new Error("Auth state güncellenmesi için timeout (3 saniye)"));
          }
        }, 3000);
        
        // onAuthStateChanged ile auth state değişikliklerini dinle
        unsubscribe = onAuthStateChanged(auth, (user) => {
          // İlk callback mevcut state'i döndürür
          if (!hasReceivedInitialState) {
            hasReceivedInitialState = true;
            // Eğer ilk callback'te user zaten set edilmişse, resolve et
            if (user && user.uid === userId) {
              isResolved = true;
              cleanup();
              resolve();
              return;
            }
            // Eğer null ise, bir sonraki state değişikliğini bekleyelim
            return;
          }
          
          if (isResolved) return;
          
          // Kullanıcı doğru userId ile authenticated olduğunda
          if (user && user.uid === userId) {
              isResolved = true;
              cleanup();
              resolve();
          }
        });
      });
    }
    
    // Artık auth.currentUser set edilmiş, Firestore'a yazabiliriz
    await setDoc(doc(firestore, "users", userId), userProfileData);
    
    // Display name ayarla (Firestore yazma işleminden SONRA)
    // updateProfile auth.currentUser'ı güncelleyebilir ama Firestore yazma işlemi tamamlandı
    if (fullName) {
      await updateProfile(firebaseUser, { displayName: fullName });
    }

    // Email doğrulama gönder (Firebase Console'daki şablon kullanılır)
    await sendEmailVerification(firebaseUser);

    return {
      success: true,
      message: "Kayıt başarılı! Lütfen e-posta adresinize gönderilen doğrulama bağlantısına tıklayarak hesabınızı aktifleştirin.",
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      user: {
        id: userId,
        email: email,
        displayName: fullName,
        fullName: fullName,
        phone: phone || undefined,
        dateOfBirth: dateOfBirth || undefined,
        role: ["viewer"],
        pendingTeams: selectedTeamId ? [selectedTeamId] : [],
        approvedTeams: [],
<<<<<<< HEAD
        emailVerified: firebaseUser.emailVerified || false,
=======
        emailVerified: false,
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  } catch (error: unknown) {
    // Firebase hata kodlarını Türkçe'ye çevir
    let errorMessage = "Kayıt başarısız";
    const errorCode = (error as { code?: string })?.code;
    const errorMsg = error instanceof Error ? error.message : String(error);
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Beklenen hatalar için sessizce devam et, sadece beklenmeyen hatalar için log göster
    const isExpectedError = [
      'auth/email-already-in-use',
      'auth/invalid-email',
      'auth/weak-password',
<<<<<<< HEAD
      'auth/operation-not-allowed',
      'auth/invalid-credential',
      'auth/user-disabled',
      'auth/too-many-requests'
    ].includes(errorCode || '');

    // Detaylı hata loglama (sadece beklenmeyen hatalar için)
    if (!isExpectedError && import.meta.env.DEV) {
      console.error("Register error details:", {
        code: errorCode,
        message: errorMsg,
        error: error
      });
    }

    if (errorCode === 'auth/email-already-in-use') {
      // Email zaten kayıtlı - doğrulanmamış kullanıcı olabilir, giriş yapmayı dene
      // Bu beklenen bir durum, console'da hata gösterme
      try {
        const loginResult = await signInWithEmailAndPassword(auth, email, password);
        let existingUser = loginResult.user;

        // Firebase Auth'daki user objesini reload et (emailVerified değerinin güncel olması için)
        // reload() user objesini günceller, bu yüzden aynı objeyi kullanmalıyız
        try {
          if (import.meta.env.DEV) {
            console.log("Register - auth/email-already-in-use User reload öncesi emailVerified:", existingUser.emailVerified);
          }
          await existingUser.reload();
          // reload() sonrası existingUser objesi güncellenmiş olmalı
          // Ayrıca auth.currentUser'ı da kontrol et (bazen daha güncel olabilir)
          if (auth.currentUser) {
            existingUser = auth.currentUser;
          }
          if (import.meta.env.DEV) {
            console.log("Register - auth/email-already-in-use User reload sonrası emailVerified:", existingUser.emailVerified);
            console.log("Register - auth/email-already-in-use auth.currentUser emailVerified:", auth.currentUser?.emailVerified);
          }
        } catch (reloadError) {
          if (import.meta.env.DEV) {
            console.warn("User reload hatası (devam ediliyor):", reloadError);
          }
          // Reload hatası olsa bile devam et
        }

        // Email doğrulanmamışsa veya hesap silinmişse, Firestore'u güncelle ve doğrulama email'i gönder
        const userDoc = await getDoc(doc(firestore!, "users", existingUser.uid));
        const existingData = userDoc.exists() ? userDoc.data() : null;
        const wasDeleted = existingData?.deleted === true;

        // Firebase Auth'daki emailVerified değeri en güncel olanıdır, öncelikli kontrol
        // reload() sonrası existingUser.emailVerified güncellenmiş olmalı
        // Eğer hala false ise, Firestore'daki değere de bak (senkronizasyon sorunu olabilir)
        let emailVerified = existingUser.emailVerified;
        // Eğer Firebase Auth'da false ama Firestore'da true ise, Firestore'a güven
        // (Firebase Auth daha güncel olmalı ama senkronizasyon sorunu olabilir)
        if (!emailVerified && existingData?.emailVerified === true) {
          if (import.meta.env.DEV) {
            console.warn("Register - auth/email-already-in-use Firebase Auth'da emailVerified false ama Firestore'da true, Firestore'a güveniliyor");
          }
          // Firestore'daki değere güven ama Firebase Auth'ı da güncelle
          emailVerified = true;
        }

        if (import.meta.env.DEV) {
          console.log("Register - auth/email-already-in-use email doğrulama kontrolü:", {
            firebaseEmailVerified: existingUser.emailVerified,
            firestoreEmailVerified: existingData?.emailVerified,
            emailVerified,
            wasDeleted,
            userId: existingUser.uid,
            email: existingUser.email,
          });
        }

        // Eğer email doğrulanmışsa ve hesap silinmemişse, direkt hata mesajı döndür
        if (emailVerified && !wasDeleted) {
          await firebaseSignOut(auth);
          return {
            success: false,
            message: "Bu hesap zaten var, doğrulanmış. Giriş yapabilirsiniz.",
            user: null,
          };
        }

        if (!emailVerified || wasDeleted) {
          if (userDoc.exists()) {
            // Firestore'u güncelle
            const updateDataForExisting: Record<string, unknown> = {
              displayName: fullName,
              fullName: fullName,
              updatedAt: serverTimestamp(),
            };

            // Opsiyonel alanları sadece tanımlıysa ekle
            if (phone && phone.trim() !== '') {
              updateDataForExisting.phone = phone.trim();
            }
            if (dateOfBirth && dateOfBirth.trim() !== '') {
              updateDataForExisting.dateOfBirth = dateOfBirth.trim();
            }
            if (selectedTeamId) {
              updateDataForExisting.pendingTeams = [selectedTeamId];
            }

            // Silinmiş hesap tekrar kayıt oluyorsa, deleted flag'ini kaldır
            if (wasDeleted) {
              updateDataForExisting.deleted = false;
              updateDataForExisting.needsEmailVerification = true;
              updateDataForExisting.emailVerified = false;
            }

            // undefined değerleri temizle (Firestore undefined kabul etmez)
            const cleanUpdateDataForExisting: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(updateDataForExisting)) {
              if (value !== undefined) {
                cleanUpdateDataForExisting[key] = value;
              }
            }

            await updateDoc(doc(firestore!, "users", existingUser.uid), cleanUpdateDataForExisting);
          } else {
            // Firestore'da yoksa oluştur
            const newUserData: Record<string, unknown> = {
              email: email,
              displayName: fullName,
              fullName: fullName,
              role: ["viewer"],
              emailVerified: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              pendingTeams: selectedTeamId ? [selectedTeamId] : [],
              approvedTeams: [],
            };

            // Opsiyonel alanları sadece tanımlıysa ekle
            if (phone && phone.trim() !== '') {
              newUserData.phone = phone.trim();
            }
            if (dateOfBirth && dateOfBirth.trim() !== '') {
              newUserData.dateOfBirth = dateOfBirth.trim();
            }

            // undefined değerleri temizle (Firestore undefined kabul etmez)
            const cleanNewUserData: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(newUserData)) {
              if (value !== undefined) {
                cleanNewUserData[key] = value;
              }
            }

            await setDoc(doc(firestore!, "users", existingUser.uid), cleanNewUserData);
          }

          // Eğer ekip seçildiyse, ekip liderine ve yöneticilere bildirim gönder
          if (selectedTeamId) {
            try {
              const { getDepartmentById } = await import("./departmentService");
              const { createNotification } = await import("./notificationService");
              const department = await getDepartmentById(selectedTeamId);

              if (department) {
                const requesterName = fullName || email || "Bir kullanıcı";
                const teamName = department.name || "ekip";

                const notificationPromises: Promise<void>[] = [];

                // Ekip liderine bildirim gönder
                if (department.managerId) {
                  notificationPromises.push(
                    createNotification({
                      userId: department.managerId,
                      type: "system",
                      title: "Yeni katılım isteği",
                      message: `${requesterName} "${teamName}" ekibine katılmak için istek gönderdi. İsteği onaylamak veya reddetmek için Ekip Üyeleri sayfasını ziyaret edin.`,
                      read: false,
                      metadata: {
                        teamId: selectedTeamId,
                        teamName: teamName,
                        requesterId: existingUser.uid,
                        requesterName: requesterName,
                        requesterEmail: email,
                      },
                    }).then(() => { }).catch(err => {
                      if (import.meta.env.DEV) {
                        console.error("Error sending notification to team leader:", err);
                      }
                    })
                  );
                }

                // Yöneticilere (super_admin, main_admin) bildirim gönder
                try {
                  const allUsers = await getAllUsers();
                  const admins = allUsers.filter(u =>
                    u.role?.includes("super_admin") || u.role?.includes("main_admin")
                  );

                  for (const admin of admins) {
                    notificationPromises.push(
                      createNotification({
                        userId: admin.id,
                        type: "system",
                        title: "Yeni ekip katılım isteği",
                        message: `${requesterName} "${teamName}" ekibine katılmak için istek gönderdi. İsteği onaylamak veya reddetmek için Ekip Onay Yönetimi sayfasını ziyaret edin.`,
                        read: false,
                        metadata: {
                          teamId: selectedTeamId,
                          teamName: teamName,
                          requesterId: existingUser.uid,
                          requesterName: requesterName,
                          requesterEmail: email,
                        },
                      }).then(() => { }).catch(err => {
                        if (import.meta.env.DEV) {
                          console.error(`Error sending notification to admin ${admin.id}:`, err);
                        }
                      })
                    );
                  }
                } catch (adminError) {
                  if (import.meta.env.DEV) {
                    console.error("Error getting admins for notification:", adminError);
                  }
                }

                // Tüm bildirimleri paralel gönder (await etmeden, arka planda)
                Promise.allSettled(notificationPromises).catch(() => {
                  // Bildirim hatası kayıt işlemini engellemez
                });
              }
            } catch (notifError) {
              if (import.meta.env.DEV) {
                console.error("Error sending team request notifications:", notifError);
              }
              // Bildirim hatası kayıt işlemini engellemez
            }
          }

          // Display name ve email doğrulama mailini paralel gönder (hızlandırma)
          const updatePromises: Promise<void>[] = [];
          let emailVerificationError: Error | null = null;

          updatePromises.push(updateProfile(existingUser, { displayName: fullName }).catch((error) => {
            if (import.meta.env.DEV) {
              console.error("Display name güncellenirken hata:", error);
            }
          }));

          // Doğrulama email'i gönder
          updatePromises.push(
            sendEmailVerification(existingUser)
              .then(() => {
                if (import.meta.env.DEV) {
                  console.log("Email doğrulama maili gönderildi (mevcut kullanıcı):", email);
                }
              })
              .catch((verifyError) => {
                if (import.meta.env.DEV) {
                  console.error("Email doğrulama maili gönderilirken hata:", verifyError);
                }
                emailVerificationError = new Error("Email doğrulama maili gönderilemedi. Lütfen daha sonra tekrar deneyin veya Firebase Console'da email ayarlarını kontrol edin.");
              })
          );

          // Tüm paralel işlemleri bekle
          await Promise.allSettled(updatePromises);

          // Email gönderim hatası varsa fırlat
          if (emailVerificationError) {
            await firebaseSignOut(auth);
            throw emailVerificationError;
          }

          // Çıkış yap (kullanıcı email doğrulamadan giriş yapamaz)
          await firebaseSignOut(auth);

          return {
            success: true,
            message: "Hesap var ama doğrulama yapılmamış. Doğrulama maili gönderildi. Lütfen e-postanızı ve spam kutusunu kontrol edin.",
            user: {
              id: existingUser.uid,
              email: email,
              displayName: fullName,
              fullName: fullName,
              phone: phone || undefined,
              dateOfBirth: dateOfBirth || undefined,
              role: ["viewer"],
              pendingTeams: selectedTeamId ? [selectedTeamId] : [],
              approvedTeams: [],
              emailVerified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          };
        }
      } catch (loginError: unknown) {
        // Giriş başarısız (şifre yanlış veya başka bir hata)
        // Email zaten kayıtlı olduğu için "bu hesap zaten kayıtlı" mesajı göster
        errorMessage = "Bu hesap zaten kayıtlı. Lütfen giriş yapmayı deneyin.";
      }
    } else if (errorCode === 'auth/invalid-email') {
      errorMessage = "Geçersiz e-posta adresi. Lütfen geçerli bir e-posta adresi girin.";
    } else if (errorCode === 'auth/weak-password') {
      errorMessage = "Şifre çok zayıf. Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir.";
    } else if (errorCode === 'auth/operation-not-allowed') {
      errorMessage = "E-posta/şifre ile kayıt şu anda devre dışı. Lütfen yöneticiye başvurun.";
    } else if (errorCode === 'auth/invalid-credential') {
      // Email zaten kayıtlı ama şifre yanlış - "bu hesap zaten kayıtlı" mesajı göster
      errorMessage = "Bu hesap zaten kayıtlı. Lütfen giriş yapmayı deneyin.";
    } else if (errorCode === 'auth/user-disabled') {
      errorMessage = "Bu hesap devre dışı bırakılmış. Lütfen yöneticiye başvurun.";
    } else if (errorCode === 'auth/too-many-requests') {
      errorMessage = "Çok fazla istek yapıldı. Lütfen bir süre sonra tekrar deneyin.";
    } else if (errorCode === 'auth/network-request-failed') {
      errorMessage = "Ağ hatası. İnternet bağlantınızı kontrol edin.";
    } else if (errorCode === 'auth/internal-error') {
      errorMessage = "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
=======
      'auth/operation-not-allowed'
    ].includes(errorCode || '');
    
    if (errorCode === 'auth/email-already-in-use') {
      errorMessage = "Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapmayı deneyin. Eğer şifrenizi unuttuysanız, şifre sıfırlama özelliğini kullanabilirsiniz.";
    } else if (errorCode === 'auth/invalid-email') {
      errorMessage = "Geçersiz e-posta adresi. Lütfen geçerli bir e-posta adresi girin.";
    } else if (errorCode === 'auth/weak-password') {
      errorMessage = "Şifre çok zayıf. Şifre en az 6 karakter olmalıdır.";
    } else if (errorCode === 'auth/operation-not-allowed') {
      errorMessage = "E-posta/şifre ile kayıt şu anda devre dışı. Lütfen yöneticiye başvurun.";
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    } else if (errorCode === 'permission-denied' || errorMsg.includes('permissions')) {
      errorMessage = "Firestore izin hatası. Lütfen Firebase Console'da Security Rules'u kontrol edin. Detaylar: " + (errorMsg || "İzin reddedildi");
    } else if (errorMsg.includes('Unsupported field value: undefined')) {
      errorMessage = "Form verilerinde eksik veya geçersiz alanlar var. Lütfen tüm zorunlu alanları doldurun ve tekrar deneyin.";
    } else if (errorMsg.includes('invalid data')) {
      errorMessage = "Gönderilen veriler geçersiz. Lütfen tüm alanları kontrol edip tekrar deneyin.";
    } else if (errorMsg) {
      errorMessage = errorMsg;
    }
<<<<<<< HEAD

    // Sadece beklenmeyen hatalar için console.error göster
    // auth/email-already-in-use beklenen bir durum ve handle ediliyor, console'da gösterme
    if (!isExpectedError && import.meta.env.DEV) {
      console.error("Register error:", error);
    } else if (errorCode === 'auth/email-already-in-use' && import.meta.env.DEV) {
      // Email zaten kayıtlı durumu handle edildi, sadece debug için log
      console.debug("Email zaten kayıtlı, giriş yapmayı deniyoruz...");
    }

=======
    
    // Sadece beklenmeyen hatalar için console.error göster
    if (!isExpectedError && import.meta.env.DEV) {
      console.error("Register error:", error);
    }
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return {
      success: false,
      message: errorMessage,
      user: null,
    };
  }
};

/**
 * Kullanıcı girişi
 */
export const login = async (
  email: string,
  password: string
): Promise<{ success: boolean; message?: string; user?: UserProfile | null }> => {
  try {
    if (!auth || !firestore) {
      throw new Error('Firebase is not initialized');
    }
    // Firebase Auth ile giriş yap
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
<<<<<<< HEAD
    let firebaseUser = userCredential.user;

    // Firebase Auth'daki user objesini reload et (emailVerified değerinin güncel olması için)
    try {
      if (import.meta.env.DEV) {
        console.log("Login - User reload öncesi emailVerified:", firebaseUser.emailVerified);
      }
      await firebaseUser.reload();
      // reload() sonrası firebaseUser objesi güncellenmiş olmalı
      // Ayrıca auth.currentUser'ı da kontrol et (bazen daha güncel olabilir)
      if (auth.currentUser) {
        firebaseUser = auth.currentUser;
      }
      if (import.meta.env.DEV) {
        console.log("Login - User reload sonrası emailVerified:", firebaseUser.emailVerified);
        console.log("Login - auth.currentUser emailVerified:", auth.currentUser?.emailVerified);
      }
    } catch (reloadError) {
      if (import.meta.env.DEV) {
        console.warn("Login - User reload hatası (devam ediliyor):", reloadError);
      }
      // Reload hatası olsa bile devam et
    }

=======
    const firebaseUser = userCredential.user;
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Önce direkt Firestore'dan silinmiş kullanıcı kontrolü yap
    try {
      const userDoc = await getDoc(doc(firestore, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.deleted === true) {
          // Hemen çıkış yap
          try {
            await firebaseSignOut(auth);
          } catch (signOutError) {
            if (import.meta.env.DEV) {
<<<<<<< HEAD
              console.error("Çıkış yapılırken hata:", signOutError);
=======
              if (import.meta.env.DEV) {
            console.error("Çıkış yapılırken hata:", signOutError);
          }
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            }
          }
          return {
            success: false,
            message: "Bu hesap silinmiş. Giriş yapamazsınız.",
            user: null,
          };
        }
      }
    } catch (checkError) {
      console.error("Kullanıcı kontrolü hatası:", checkError);
      // Kontrol hatası olsa bile devam et, getUserProfile kontrol edecek
    }
<<<<<<< HEAD

    try {
      let userProfile: UserProfile | null = null;
      let isDeletedAccount = false;

      // getUserProfile() çağrısını try-catch ile sarmalayalım
      // Çünkü silinmiş kullanıcı için hata fırlatıyor
      try {
        userProfile = await getUserProfile(firebaseUser.uid);
      } catch (profileError: unknown) {
        // Eğer hata mesajı "silinmiş" içeriyorsa, silinmiş hesap
        const errorMsg = profileError instanceof Error ? profileError.message : String(profileError);
        if (errorMsg.includes("silinmiş")) {
          isDeletedAccount = true;
        } else {
          // Diğer hatalar için null olarak devam et
          if (import.meta.env.DEV) {
            console.warn("getUserProfile hatası (devam ediliyor):", profileError);
          }
        }
      }

      // Eğer silinmiş hesap ise, uyarı ver ve çıkış yap
      if (isDeletedAccount) {
=======
    
    try {
      let userProfile = await getUserProfile(firebaseUser.uid);
      
      // Eğer userProfile null ise veya silinmişse
      if (!userProfile) {
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        try {
          await firebaseSignOut(auth);
        } catch (signOutError) {
          if (import.meta.env.DEV) {
            console.error("Çıkış yapılırken hata:", signOutError);
          }
        }
        return {
          success: false,
          message: "Bu hesap silinmiş. Giriş yapamazsınız.",
          user: null,
        };
      }

<<<<<<< HEAD
      // Eğer userProfile null ise, Firestore'dan direkt kontrol et
      // Çünkü null dönmesi sadece silinmiş hesap anlamına gelmez
      // (doküman yoksa, permission hatası varsa da null dönebilir)
      if (!userProfile) {
        // Firestore'dan direkt kontrol et - silinmiş mi değil mi?
        try {
          const userDocCheck = await getDoc(doc(firestore, "users", firebaseUser.uid));
          if (userDocCheck.exists()) {
            const userDataCheck = userDocCheck.data();
            // Eğer doküman varsa ve silinmişse, o zaman silinmiş hesap uyarısı ver
            if (userDataCheck.deleted === true) {
              try {
                await firebaseSignOut(auth);
              } catch (signOutError) {
                if (import.meta.env.DEV) {
                  console.error("Çıkış yapılırken hata:", signOutError);
                }
              }
              return {
                success: false,
                message: "Bu hesap silinmiş. Giriş yapamazsınız.",
                user: null,
              };
            }
            // Doküman var ama getUserProfile null döndü - tekrar deneyelim
            // Belki Firestore eventual consistency nedeniyle gecikti
            await new Promise(resolve => setTimeout(resolve, 200));
            try {
              userProfile = await getUserProfile(firebaseUser.uid);
            } catch (retryError: unknown) {
              // Eğer hata mesajı "silinmiş" içeriyorsa, silinmiş hesap
              const errorMsg = retryError instanceof Error ? retryError.message : String(retryError);
              if (errorMsg.includes("silinmiş")) {
                try {
                  await firebaseSignOut(auth);
                } catch (signOutError) {
                  if (import.meta.env.DEV) {
                    console.error("Çıkış yapılırken hata:", signOutError);
                  }
                }
                return {
                  success: false,
                  message: "Bu hesap silinmiş. Giriş yapamazsınız.",
                  user: null,
                };
              }
              // Diğer hatalar için null olarak devam et
              if (import.meta.env.DEV) {
                console.warn("getUserProfile retry hatası (devam ediliyor):", retryError);
              }
            }
          } else {
            // Doküman yoksa, profil oluşturulmamış olabilir
            // Yeni kayıt olmuş ama Firestore'a yazılmamış - profil oluştur
            await setDoc(doc(firestore, "users", firebaseUser.uid), {
              email: firebaseUser.email || email,
              displayName: firebaseUser.displayName || "",
              fullName: firebaseUser.displayName || "",
              role: ["viewer"],
              emailVerified: firebaseUser.emailVerified || false,
              needsEmailVerification: !firebaseUser.emailVerified,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              pendingTeams: [],
              approvedTeams: [],
            });
            // Profili tekrar al
            await new Promise(resolve => setTimeout(resolve, 200));
            try {
              userProfile = await getUserProfile(firebaseUser.uid);
            } catch (profileRetryError: unknown) {
              // Eğer hata mesajı "silinmiş" içeriyorsa, silinmiş hesap
              const errorMsg = profileRetryError instanceof Error ? profileRetryError.message : String(profileRetryError);
              if (errorMsg.includes("silinmiş")) {
                try {
                  await firebaseSignOut(auth);
                } catch (signOutError) {
                  if (import.meta.env.DEV) {
                    console.error("Çıkış yapılırken hata:", signOutError);
                  }
                }
                return {
                  success: false,
                  message: "Bu hesap silinmiş. Giriş yapamazsınız.",
                  user: null,
                };
              }
              // Diğer hatalar için null olarak devam et
              if (import.meta.env.DEV) {
                console.warn("getUserProfile profil oluşturma sonrası hatası (devam ediliyor):", profileRetryError);
              }
            }
          }
        } catch (profileCheckError) {
          // Firestore kontrolü başarısız olsa bile devam et
          // Email doğrulama kontrolü yapılacak
          if (import.meta.env.DEV) {
            console.warn("Profil kontrolü hatası (devam ediliyor):", profileCheckError);
          }
        }
      }

      // Eğer hala userProfile null ise, email doğrulama kontrolüne devam et
      // (aşağıdaki kod devam edecek, email doğrulama kontrolü yapılacak)

      // Email doğrulaması kontrolü - email doğrulanmamışsa giriş yapılamaz
      // ÖNCE Firestore'dan kontrol et (needsEmailVerification flag'i için)
      // Firestore'un eventual consistency özelliği nedeniyle birkaç kez deneyebiliriz
      let userDoc = await getDoc(doc(firestore, "users", firebaseUser.uid));
      let needsEmailVerification = false;
      let retryCount = 0;
      const maxRetries = 2;

      // Eğer doküman yoksa veya needsEmailVerification undefined ise, birkaç kez daha dene
      while (retryCount < maxRetries && (!userDoc.exists() || userDoc.data()?.needsEmailVerification === undefined)) {
        if (import.meta.env.DEV) {
          console.log(`Login - Firestore dokümanı kontrol ediliyor (retry ${retryCount + 1}/${maxRetries})`);
        }
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms bekle
        userDoc = await getDoc(doc(firestore, "users", firebaseUser.uid));
        retryCount++;
      }

      if (userDoc.exists()) {
        const userData = userDoc.data();
        // needsEmailVerification kontrolü: true, "true", 1 gibi değerleri kabul et
        needsEmailVerification = userData.needsEmailVerification === true ||
          userData.needsEmailVerification === "true" ||
          userData.needsEmailVerification === 1;

        if (import.meta.env.DEV) {
          console.log("Login - Email doğrulama kontrolü:", {
            needsEmailVerification,
            rawNeedsEmailVerification: userData.needsEmailVerification,
            firebaseEmailVerified: firebaseUser.emailVerified,
            firestoreEmailVerified: userData.emailVerified,
            userProfileEmailVerified: userProfile?.emailVerified,
            retryCount,
            userData: {
              needsEmailVerification: userData.needsEmailVerification,
              emailVerified: userData.emailVerified,
            }
          });
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn("Login - Firestore dokümanı bulunamadı, email doğrulama kontrolü yapılamıyor");
        }
      }

      // Email doğrulama durumu: Firebase Auth en güncel kaynak, bu yüzden öncelikli
      // SIKI KONTROL: Email doğrulanmamışsa MUTLAKA giriş yapılamaz (needsEmailVerification flag'ine bakmadan)
      // reload() sonrası firebaseUser.emailVerified güncellenmiş olmalı
      // Eğer hala false ise, Firestore'daki değere de bak (senkronizasyon sorunu olabilir)
      let emailVerified = firebaseUser.emailVerified;
      // Eğer Firebase Auth'da false ama Firestore'da true ise, Firestore'a güven
      // (Firebase Auth daha güncel olmalı ama senkronizasyon sorunu olabilir)
      if (!emailVerified && userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.emailVerified === true) {
          if (import.meta.env.DEV) {
            console.warn("Login - Firebase Auth'da emailVerified false ama Firestore'da true, Firestore'a güveniliyor");
          }
          // Firestore'daki değere güven ama Firebase Auth'ı da güncelle
          emailVerified = true;
        }
      }

      // Email doğrulama kontrolü: Config'e göre email doğrulaması zorunlu mu?
      // Kayıt ve login senkronize çalışmalı - her ikisi de aynı mantığı kullanmalı
      if (REQUIRE_EMAIL_VERIFICATION && !emailVerified) {
        if (import.meta.env.DEV) {
          console.log("Login - Email doğrulama gerekli (REQUIRE_EMAIL_VERIFICATION=true), giriş engelleniyor", {
            emailVerified,
            needsEmailVerification,
            firebaseEmailVerified: firebaseUser.emailVerified,
          });
        }

        // Eğer needsEmailVerification flag'i false veya undefined ise, Firestore'u güncelle
        // (Kayıt sırasında set edilmiş olmalı ama senkronizasyon için tekrar set et)
        if (!needsEmailVerification) {
          try {
            await updateDoc(doc(firestore, "users", firebaseUser.uid), {
              needsEmailVerification: true,
              emailVerified: false,
              updatedAt: serverTimestamp(),
            });
            if (import.meta.env.DEV) {
              console.log("Login - needsEmailVerification flag'i Firestore'da güncellendi (true)");
            }
          } catch (updateError) {
            if (import.meta.env.DEV) {
              console.error("Login - needsEmailVerification flag güncellenirken hata:", updateError);
            }
            // Hata olsa bile devam et, email göndermeye çalış
          }
        }

        // Doğrulama email'i tekrar gönder - RESEND_VERIFICATION_ON_LOGIN config'e göre
        if (RESEND_VERIFICATION_ON_LOGIN) {
          try {
            await sendEmailVerification(firebaseUser);
            if (import.meta.env.DEV) {
              console.log("Email doğrulama maili gönderildi (giriş denemesi):", email);
            }
          } catch (verifyError: unknown) {
            const errorCode = (verifyError as { code?: string })?.code;
            const errorMsg = verifyError instanceof Error ? verifyError.message : String(verifyError);

            if (import.meta.env.DEV) {
              console.error("Doğrulama email'i gönderilirken hata:", verifyError);
            }

            // Email gönderilemedi, kullanıcıya bilgi ver
            let errorMessage = "Email doğrulama maili gönderilemedi.";
            if (errorCode === 'auth/too-many-requests') {
              errorMessage = "Çok fazla istek yapıldı. Lütfen bir süre sonra tekrar deneyin.";
            } else if (errorCode === 'auth/network-request-failed') {
              errorMessage = "Ağ hatası. İnternet bağlantınızı kontrol edin.";
            } else if (errorMsg) {
              errorMessage = errorMsg;
            }

            // Çıkış yap (kullanıcı email doğrulamadan giriş yapamaz)
            try {
              await firebaseSignOut(auth);
            } catch (signOutError) {
              if (import.meta.env.DEV) {
                console.error("Çıkış yapılırken hata:", signOutError);
              }
            }

            return {
              success: false,
              message: errorMessage + " Lütfen daha sonra tekrar deneyin veya spam kutunuzu kontrol edin.",
              user: null,
            };
          }
        }

        // Çıkış yap (kullanıcı email doğrulamadan giriş yapamaz)
        try {
          await firebaseSignOut(auth);
        } catch (signOutError) {
          if (import.meta.env.DEV) {
            console.error("Çıkış yapılırken hata:", signOutError);
          }
        }

        return {
          success: false,
          message: "E-posta adresinizi doğrulamalısınız. Doğrulama e-postası gönderildi. Lütfen e-postanızı ve spam kutusunu kontrol edin.",
          user: null,
        };
      } else if (!emailVerified) {
        // Email doğrulama zorunlu değil ama email doğrulanmamış - uyarı log'u
        if (import.meta.env.DEV) {
          console.log("Login - Email doğrulanmamış ama REQUIRE_EMAIL_VERIFICATION=false, giriş izin verildi");
        }
      } else {
        // Email doğrulandı - giriş yapılabilir
        if (import.meta.env.DEV) {
          console.log("Login - Email doğrulama kontrolü geçildi:", {
            needsEmailVerification,
            emailVerified,
            firebaseEmailVerified: firebaseUser.emailVerified,
          });
        }
      }

      // Email doğrulama durumunu Firestore ile senkronize et
      // Firebase Auth'daki emailVerified değeri Firestore'dan daha güncel olabilir
      if (emailVerified) {
        // Email doğrulandıysa needsEmailVerification flag'ini kaldır ve Firestore'u güncelle
        try {
          await updateDoc(doc(firestore, "users", firebaseUser.uid), {
            needsEmailVerification: false,
            emailVerified: true,
            updatedAt: serverTimestamp(),
          });
          // userProfile'i güncelle (eğer varsa)
          if (userProfile) {
            userProfile.emailVerified = true;
          }
        } catch (updateError) {
          if (import.meta.env.DEV) {
            console.error("EmailVerified flag güncellenirken hata:", updateError);
          }
        }
      }

      // Eğer userProfile hala null ise, tekrar al
      if (!userProfile) {
        try {
          userProfile = await getUserProfile(firebaseUser.uid);
        } catch (profileError: unknown) {
          // Eğer hata mesajı "silinmiş" içeriyorsa, silinmiş hesap
          const errorMsg = profileError instanceof Error ? profileError.message : String(profileError);
          if (errorMsg.includes("silinmiş")) {
            try {
              await firebaseSignOut(auth);
            } catch (signOutError) {
              if (import.meta.env.DEV) {
                console.error("Çıkış yapılırken hata:", signOutError);
              }
            }
            return {
              success: false,
              message: "Bu hesap silinmiş. Giriş yapamazsınız.",
              user: null,
            };
          }
          // Diğer hatalar için null olarak devam et
          if (import.meta.env.DEV) {
            console.warn("getUserProfile hatası (devam ediliyor):", profileError);
          }
        }
        // Hala null ise, hata ver
        if (!userProfile) {
          try {
            await firebaseSignOut(auth);
          } catch (signOutError) {
            if (import.meta.env.DEV) {
              console.error("Çıkış yapılırken hata:", signOutError);
            }
          }
          return {
            success: false,
            message: "Kullanıcı profili alınamadı. Lütfen tekrar deneyin.",
            user: null,
          };
        }
      }

=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Son giriş zamanını güncelle - serverTimestamp() kullanarak sunucu zamanını kaydet
      try {
        const oldLastLoginAt = userProfile.lastLoginAt;
        // serverTimestamp() kullanarak Firebase sunucusunun zamanını kaydet (daha doğru)
        await updateDoc(doc(firestore, "users", firebaseUser.uid), {
          lastLoginAt: serverTimestamp(),
        });
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Profili yeniden yükle (güncellenmiş lastLoginAt ile)
        // Not: serverTimestamp() async olduğu için hemen okumak doğru zamanı vermeyebilir
        // Bu yüzden bir miktar bekleyip tekrar yükleyelim veya client-side timestamp ile güncelleyelim
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms bekle
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        const updatedProfile = await getUserProfile(firebaseUser.uid);
        if (updatedProfile) {
          userProfile = updatedProfile;
        }
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        // Giriş logunu kaydet (retry mekanizması ile)
        try {
          const loginTime = new Date().toISOString();
          const oldLastLoginAtValue = oldLastLoginAt ? (oldLastLoginAt instanceof Timestamp ? oldLastLoginAt.toDate().toISOString() : String(oldLastLoginAt)) : null;
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          let retryCount = 0;
          const maxRetries = 2;
          while (retryCount <= maxRetries) {
            try {
              await logAudit(
<<<<<<< HEAD
                "UPDATE",
                "user_logins",
                firebaseUser.uid,
                firebaseUser.uid,
                oldLastLoginAtValue ? { lastLoginAt: oldLastLoginAtValue } : null,
                null,
                {
                  action: "LOGIN",
                  method: "EMAIL",
                  email: email,
                  timestamp: loginTime
=======
                "UPDATE", 
                "user_logins", 
                firebaseUser.uid, 
                firebaseUser.uid,
                oldLastLoginAtValue ? { lastLoginAt: oldLastLoginAtValue } : null,
                null,
                { 
                  action: "LOGIN", 
                  method: "EMAIL", 
                  email: email, 
                  timestamp: loginTime 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                }
              );
              break; // Başarılı oldu, döngüden çık
            } catch (retryError) {
              retryCount++;
              if (retryCount > maxRetries) {
                if (import.meta.env.DEV) {
                  console.error("Giriş logu kaydedilirken hata (tüm denemeler başarısız):", retryError);
                }
              } else {
                // Kısa bir bekleme sonrası tekrar dene
                await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
              }
            }
          }
        } catch (logError) {
          if (import.meta.env.DEV) {
            console.error("Giriş logu kaydedilirken beklenmeyen hata:", logError);
          }
          // Log hatası girişi engellememeli
        }
      } catch (updateError) {
        if (import.meta.env.DEV) {
          console.error("Son giriş zamanı güncellenirken hata:", updateError);
        }
        // Hata olsa bile giriş devam etsin
      }

      return {
        success: true,
        user: userProfile,
      };
    } catch (profileError: unknown) {
      // Silinmiş kullanıcı hatası
      if (profileError instanceof Error && profileError.message?.includes("silinmiş")) {
        try {
          await firebaseSignOut(auth);
        } catch (signOutError) {
          if (import.meta.env.DEV) {
            console.error("Çıkış yapılırken hata:", signOutError);
          }
        }
        return {
          success: false,
          message: "Bu hesap silinmiş. Giriş yapamazsınız.",
          user: null,
        };
      }
      // Diğer hatalar için tekrar fırlat
      throw profileError;
    }
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Login error:", error);
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    const errorMsg = error instanceof Error ? error.message : String(error);
    // Eğer zaten çıkış yapıldıysa (silinmiş kullanıcı), hata mesajını döndür
    if (errorMsg.includes("silinmiş")) {
      return {
        success: false,
        message: "Bu hesap silinmiş. Giriş yapamazsınız.",
        user: null,
      };
    }
<<<<<<< HEAD

    // Firebase hata kodlarını Türkçe'ye çevir
    let errorMessage = "Giriş başarısız";
    const errorObj = error && typeof error === 'object' ? error as { code?: string; message?: string } : null;

    if (errorObj?.code === 'auth/user-not-found') {
      errorMessage = "Bu e-posta adresi kayıtlı değil. Lütfen kayıt olun.";
    } else if (errorObj?.code === 'auth/wrong-password' || errorObj?.code === 'auth/invalid-credential') {
      errorMessage = "E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.";
    } else if (errorObj?.code === 'auth/invalid-email') {
      errorMessage = "Geçersiz e-posta adresi. Lütfen geçerli bir e-posta adresi girin.";
    } else if (errorObj?.code === 'auth/user-disabled') {
      errorMessage = "Bu hesap devre dışı bırakılmış. Lütfen yöneticiye başvurun.";
    } else if (errorObj?.code === 'auth/too-many-requests') {
      errorMessage = "Çok fazla başarısız giriş denemesi. Lütfen birkaç dakika sonra tekrar deneyin.";
    } else if (errorObj?.code === 'auth/network-request-failed') {
      errorMessage = "İnternet bağlantınızı kontrol edin ve tekrar deneyin.";
    } else if (errorObj?.message) {
      errorMessage = errorObj.message;
    }

=======
    
    // Firebase hata kodlarını Türkçe'ye çevir
    let errorMessage = "Giriş başarısız";
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = "Bu e-posta adresi kayıtlı değil. Lütfen kayıt olun.";
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errorMessage = "E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.";
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = "Geçersiz e-posta adresi. Lütfen geçerli bir e-posta adresi girin.";
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = "Bu hesap devre dışı bırakılmış. Lütfen yöneticiye başvurun.";
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = "Çok fazla başarısız giriş denemesi. Lütfen birkaç dakika sonra tekrar deneyin.";
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = "İnternet bağlantınızı kontrol edin ve tekrar deneyin.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return {
      success: false,
      message: errorMessage,
      user: null,
    };
  }
};

/**
 * Kullanıcı çıkışı
 */
export const logout = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!auth) {
      return { success: false, message: 'Firebase Auth is not initialized' };
    }
<<<<<<< HEAD

    // Çıkış yapmadan önce kullanıcı ID'sini al
    const userId = auth.currentUser?.uid;
    const userEmail = auth.currentUser?.email;

    // Çıkış logunu kaydet (çıkış yapmadan önce, retry mekanizması ile)
    if (false) { // Disabled per user request
      try {
        const logoutTime = new Date().toISOString();

=======
    
    // Çıkış yapmadan önce kullanıcı ID'sini al
    const userId = auth.currentUser?.uid;
    const userEmail = auth.currentUser?.email;
    
    // Çıkış logunu kaydet (çıkış yapmadan önce, retry mekanizması ile)
    if (userId) {
      try {
        const logoutTime = new Date().toISOString();
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        let retryCount = 0;
        const maxRetries = 2;
        while (retryCount <= maxRetries) {
          try {
            await logAudit(
<<<<<<< HEAD
              "UPDATE",
              "user_logins",
              userId,
              userId,
              null,
              null,
              {
                action: "LOGOUT",
                timestamp: logoutTime,
                email: userEmail || null
=======
              "UPDATE", 
              "user_logins", 
              userId, 
              userId,
              null,
              null,
              { 
                action: "LOGOUT", 
                timestamp: logoutTime, 
                email: userEmail || null 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              }
            );
            break; // Başarılı oldu, döngüden çık
          } catch (retryError) {
            retryCount++;
            if (retryCount > maxRetries) {
              if (import.meta.env.DEV) {
                console.error("Çıkış logu kaydedilirken hata (tüm denemeler başarısız):", retryError);
              }
            } else {
              // Kısa bir bekleme sonrası tekrar dene
              await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
            }
          }
        }
      } catch (logError) {
        if (import.meta.env.DEV) {
          console.error("Çıkış logu kaydedilirken beklenmeyen hata:", logError);
        }
        // Log hatası çıkışı engellememeli
      }
    }
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error: unknown) {
    console.error("Logout error:", error);
    return {
      success: false,
<<<<<<< HEAD
      message: (error && typeof error === 'object' && 'message' in error ? (error as { message?: string }).message : undefined) || "Çıkış başarısız",
=======
      message: error.message || "Çıkış başarısız",
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    };
  }
};

/**
 * Şifre sıfırlama
 */
export const resetPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
  try {
<<<<<<< HEAD
    if (!auth || !firestore) {
      throw new Error('Firebase is not initialized');
    }

    // Önce email'in kayıtlı olup olmadığını Firestore'dan kontrol et
    // Güvenlik nedeniyle Firebase Auth'da direkt kontrol yapamayız ama Firestore'dan kontrol edebiliriz
    try {
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("email", "==", email), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Email kayıtlı değil
        return {
          success: false,
          message: "Bu e-posta adresi kayıtlı değil. Lütfen kayıt olun.",
        };
      }

      // Email kayıtlı, silinmiş hesap kontrolü
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      if (userData.deleted === true) {
        return {
          success: false,
          message: "Bu hesap silinmiş. Lütfen yeni bir hesap oluşturun.",
        };
      }
    } catch (checkError) {
      // Firestore kontrolü başarısız olsa bile devam et
      // Firebase Auth kendi kontrolünü yapacak
      if (import.meta.env.DEV) {
        console.warn("Email kontrolü yapılırken hata:", checkError);
      }
    }

    // Firebase'in şifre sıfırlama e-postasını gönder
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: "Şifre sıfırlama e-postası gönderildi. Lütfen e-postanızı ve spam kutusunu kontrol edin."
    };
=======
    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }
    // Firebase'in şifre sıfırlama e-postasını gönder
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Şifre sıfırlama e-postası gönderildi" };
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Reset password error:", error);
    }
    // Firebase hata kodlarını Türkçe'ye çevir
    let errorMessage = "Şifre sıfırlama başarısız";
    const errorObj = error && typeof error === 'object' && 'code' in error ? error as { code?: string; message?: string } : null;
    if (errorObj?.code === 'auth/user-not-found') {
<<<<<<< HEAD
      errorMessage = "Bu e-posta adresi kayıtlı değil. Lütfen kayıt olun.";
    } else if (errorObj?.code === 'auth/invalid-email') {
      errorMessage = "Geçersiz e-posta adresi. Lütfen geçerli bir e-posta adresi girin.";
    } else if (errorObj?.code === 'auth/too-many-requests') {
      errorMessage = "Çok fazla istek yapıldı. Lütfen bir süre sonra tekrar deneyin.";
    } else if (errorObj?.message) {
      errorMessage = errorObj.message;
=======
      errorMessage = "Bu e-posta adresi kayıtlı değil";
    } else if (errorObj?.code === 'auth/invalid-email') {
      errorMessage = "Geçersiz e-posta adresi";
    } else if (error.message) {
      errorMessage = error.message;
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    }
    return {
      success: false,
      message: errorMessage,
    };
  }
};

/**
 * Kullanıcı profilini Firestore'dan al
 */
export const getUserProfile = async (userId: string, allowDeleted: boolean = false): Promise<UserProfile | null> => {
  try {
    if (!firestore) {
      console.error('Firestore is not initialized');
      return null;
    }
    const userDoc = await getDoc(doc(firestore, "users", userId));
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    const firebaseUser = auth?.currentUser || null;

    // Silinmiş kullanıcı kontrolü
    if (data.deleted === true) {
      // Eğer allowDeleted true ise, silinmiş kullanıcı bilgilerini döndür (sadece okuma için)
      if (allowDeleted) {
        return {
          id: userId,
          email: data.email || "",
          displayName: "Silinmiş Kullanıcı",
          fullName: "Silinmiş Kullanıcı",
          phone: null,
          dateOfBirth: null,
          role: [],
          departmentId: null,
          emailVerified: false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      }
      // Mevcut kullanıcı kendi profilini alıyorsa ve silinmişse, otomatik çıkış yap
      if (firebaseUser && firebaseUser.uid === userId && auth) {
        // Çıkış yap, await ile bekle
        try {
          await firebaseSignOut(auth);
        } catch (signOutError) {
          if (import.meta.env.DEV) {
            console.error("Çıkış yapılırken hata:", signOutError);
          }
          // Çıkış hatası olsa bile devam et
        }
      }
      throw new Error("Bu hesap silinmiş. Giriş yapamazsınız.");
    }

    // Rolleri roles collection'ındaki tanımlarla senkronize et
    const { getRoles } = await import("./rolePermissionsService");
    const definedRoles = await getRoles();
    const definedRoleKeys = new Set(definedRoles.map(r => r.key));
    const userRoles = (data.role || []) as string[];
    const validRoles = userRoles.filter(role => definedRoleKeys.has(role));
    const finalRoles = validRoles.length > 0 ? validRoles : ["personnel"];
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Eğer roller değiştiyse, veritabanını güncelle
    if (JSON.stringify(userRoles) !== JSON.stringify(finalRoles)) {
      await updateDoc(userDoc.ref, { role: finalRoles });
    }

    return {
      id: userId,
      email: data.email || firebaseUser?.email || "",
      displayName: data.displayName || firebaseUser?.displayName || "",
      fullName: data.fullName,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      role: finalRoles,
      departmentId: data.departmentId,
<<<<<<< HEAD
      emailVerified: firebaseUser?.emailVerified || data.emailVerified || false,
=======
      emailVerified: data.emailVerified || firebaseUser?.emailVerified || false,
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      lastLoginAt: data.lastLoginAt,
    };
  } catch (error: unknown) {
<<<<<<< HEAD
    // Permission hatalarını sessizce handle et (giriş yapmadan normal)
    const errorObj = error && typeof error === 'object' ? error as { code?: string; message?: string } : null;

    if (errorObj?.code === 'permission-denied' || errorObj?.message?.includes('permissions')) {
      // Permission hatası beklenen bir durum (giriş yapmadan), sessizce handle et
      if (import.meta.env.DEV) {
        console.debug("Permission hatası (beklenen): Kullanıcı giriş yapmamış olabilir");
      }
    } else if (import.meta.env.DEV) {
      console.error("Get user profile error:", error);
    }

=======
    console.error("Get user profile error:", error);
    
    // Permissions hatası için özel mesaj
    if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
      console.warn("⚠️ Firestore permissions hatası! Firebase Console'da Security Rules'u kontrol edin:");
      console.warn("   https://console.firebase.google.com/project/revpad-15232/firestore/rules");
      console.warn("   Geçici çözüm için test mode kuralları kullanın:");
      console.warn("   match /{document=**} { allow read, write: if request.auth != null; }");
    }
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return null;
  }
};

/**
 * Kullanıcı profilini güncelle
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<Omit<UserProfile, "id" | "email" | "emailVerified" | "createdAt" | "updatedAt">>,
  updatedBy?: string | null
): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!firestore) {
      throw new Error('Firestore is not initialized');
    }
<<<<<<< HEAD

    // Eski veriyi al (audit log için)
    const oldProfile = await getUserProfile(userId);

=======
    
    // Eski veriyi al (audit log için)
    const oldProfile = await getUserProfile(userId);
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Firestore undefined değerleri kabul etmez, bu yüzden undefined alanları temizle
    const cleanUpdates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    Object.keys(updates).forEach((key) => {
      const value = (updates as Record<string, unknown>)[key];
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    await updateDoc(doc(firestore, "users", userId), cleanUpdates);

    // Firebase Auth'ta displayName güncelle
    if (updates.displayName && auth?.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: updates.displayName,
      });
    }

    // Audit log (rol değişiklikleri hariç - rol değişiklikleri UserManagement'da ayrı loglanıyor)
    const logUserId = updatedBy || auth?.currentUser?.uid;
    if (logUserId && oldProfile) {
      // Rol değişikliği kontrolü - eğer sadece rol değiştiyse log ekleme
      const hasRoleChange = updates.role && JSON.stringify(updates.role) !== JSON.stringify(oldProfile.role);
      const hasOtherChanges = Object.keys(updates).some(key => key !== "role");
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Eğer rol değişikliği varsa ve başka değişiklik yoksa log ekleme (rol değişiklikleri UserManagement'da loglanıyor)
      if (!hasRoleChange || hasOtherChanges) {
        const newProfile = await getUserProfile(userId);
        await logAudit(
          "UPDATE",
          "users",
          userId,
          logUserId,
          oldProfile,
          newProfile,
          { action: "update_profile", changedFields: Object.keys(updates).filter(k => k !== "role") }
        );
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Update user profile error:", error);
    return {
      success: false,
<<<<<<< HEAD
      message: (error && typeof error === 'object' && 'message' in error ? (error as { message?: string }).message : undefined) || "Profil güncellenemedi",
=======
      message: error.message || "Profil güncellenemedi",
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    };
  }
};

/**
 * Kullanıcı profilini güncelle (alias for updateUserProfile)
 */
export const updateFirebaseUserProfile = updateUserProfile;

/**
 * Auth state değişikliklerini dinle
 */
// Son giriş zamanını güncellemek için kullanılan flag (duplicate güncellemeleri önlemek için)
<<<<<<< HEAD
const lastLoginUpdateTime: Map<string, number> = new Map();
=======
let lastLoginUpdateTime: Map<string, number> = new Map();
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

export const onAuthChange = (callback: (user: UserProfile | null) => void) => {
  if (!auth) {
    if (import.meta.env.DEV) {
      console.error('Firebase Auth is not initialized');
      console.warn('Firebase yapılandırması eksik olabilir. Lütfen .env dosyasını kontrol edin.');
    }
    // Hemen callback çağır (loading state'i false yapmak için)
    // Firebase başlatılamazsa kullanıcı auth sayfasına yönlendirilecek
    setTimeout(() => callback(null), 0);
<<<<<<< HEAD
    return () => { }; // Return empty unsubscribe function
  }

=======
    return () => {}; // Return empty unsubscribe function
  }
  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  // Firestore kontrolü - opsiyonel ama önerilir
  if (!firestore) {
    if (import.meta.env.DEV) {
      console.warn('Firestore is not initialized - bazı özellikler çalışmayabilir');
    }
    // Firestore olmadan da devam edebiliriz, sadece user profile alınamaz
  }
<<<<<<< HEAD

=======
  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  // Timeout: Eğer 3 saniye içinde auth state gelmezse callback(null) çağır
  let timeoutFired = false;
  const timeout = setTimeout(() => {
    if (!timeoutFired) {
      console.warn('Auth state timeout - callback(null) çağrılıyor');
      timeoutFired = true;
      callback(null);
    }
  }, 3000);
<<<<<<< HEAD

=======
  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    // Async callback'i promise olarak wrap et ve unhandled rejection'ları yakala
    (async () => {
      try {
        // Timeout'u iptal et - auth state geldi
        if (!timeoutFired) {
          clearTimeout(timeout);
          timeoutFired = true;
        }
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        if (firebaseUser) {
          // Önce direkt Firestore'dan silinmiş kullanıcı kontrolü yap
          if (firestore) {
            try {
              const userDoc = await getDoc(doc(firestore, "users", firebaseUser.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.deleted === true) {
                  // Hemen çıkış yap
                  try {
                    await firebaseSignOut(auth);
                  } catch (signOutError) {
                    if (import.meta.env.DEV) {
                      if (import.meta.env.DEV) {
<<<<<<< HEAD
                        console.error("Çıkış yapılırken hata:", signOutError);
                      }
=======
            console.error("Çıkış yapılırken hata:", signOutError);
          }
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                    }
                  }
                  callback(null);
                  return;
                }
              }
            } catch (checkError) {
              if (import.meta.env.DEV) {
                console.error("Kullanıcı kontrolü hatası:", checkError);
              }
              // Kontrol hatası olsa bile devam et, getUserProfile kontrol edecek
            }
          }
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          try {
            let userProfile = await getUserProfile(firebaseUser.uid);
            // Eğer userProfile null ise (silinmiş kullanıcı), çıkış yap
            if (!userProfile) {
              try {
                await firebaseSignOut(auth);
              } catch (signOutError) {
                if (import.meta.env.DEV) {
                  if (import.meta.env.DEV) {
<<<<<<< HEAD
                    console.error("Çıkış yapılırken hata:", signOutError);
                  }
=======
            console.error("Çıkış yapılırken hata:", signOutError);
          }
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                }
              }
              callback(null);
              return;
            }
<<<<<<< HEAD

            // Email doğrulandıysa needsEmailVerification flag'ini kaldır ve emailVerified'i güncelle
            if (firestore && firebaseUser.emailVerified) {
              try {
                const userDoc = await getDoc(doc(firestore, "users", firebaseUser.uid));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  const updateData: any = {};

                  // Email doğrulandıysa flag'leri güncelle
                  if (userData.needsEmailVerification === true) {
                    updateData.needsEmailVerification = false;
                  }
                  if (!userData.emailVerified || userData.emailVerified === false) {
                    updateData.emailVerified = true;
                  }

                  // Eğer güncellenecek bir şey varsa güncelle
                  if (Object.keys(updateData).length > 0) {
                    updateData.updatedAt = serverTimestamp();
                    await updateDoc(doc(firestore, "users", firebaseUser.uid), updateData);

                    // Firestore güncellendikten sonra userProfile'i yeniden yükle
                    // Böylece güncellenmiş emailVerified değeri kullanılır
                    userProfile = await getUserProfile(firebaseUser.uid);
                    if (!userProfile) {
                      callback(null);
                      return;
                    }
                  }
                }
              } catch (updateError) {
                if (import.meta.env.DEV) {
                  console.error("Email doğrulama flag güncellenirken hata:", updateError);
                }
              }
            }

=======
            
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            // Son giriş zamanını güncelle (sadece gerektiğinde, duplicate güncellemeleri önlemek için)
            // Not: login() ve signInWithGoogle() fonksiyonlarında zaten güncelleniyor,
            // burada sadece sayfa yenilendiğinde veya başka bir cihazdan giriş yapıldığında güncellenmeli
            const now = Date.now();
            const lastUpdate = lastLoginUpdateTime.get(firebaseUser.uid) || 0;
            const timeSinceLastUpdate = now - lastUpdate;
<<<<<<< HEAD

=======
            
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            // Eğer son güncellemeden 1 dakikadan fazla zaman geçtiyse veya hiç güncellenmemişse
            // (1 dakika yeterli, çünkü login() ve signInWithGoogle() zaten güncelliyor)
            if (timeSinceLastUpdate > 1 * 60 * 1000 || lastUpdate === 0) {
              try {
                // Mevcut lastLoginAt değerini kontrol et
                const currentLastLogin = userProfile.lastLoginAt;
                let shouldUpdate = false;
<<<<<<< HEAD

=======
                
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                // Eğer lastLoginAt yoksa veya geçersizse mutlaka güncelle
                if (!currentLastLogin) {
                  shouldUpdate = true;
                } else {
                  // Eğer lastLoginAt çok eskiyse (30 dakikadan fazla) güncelle
                  try {
                    let loginDate: Date;
                    if (currentLastLogin instanceof Timestamp) {
                      loginDate = currentLastLogin.toDate();
                    } else if (currentLastLogin && typeof currentLastLogin === 'object' && 'toDate' in currentLastLogin && typeof (currentLastLogin as { toDate: () => Date }).toDate === 'function') {
                      loginDate = (currentLastLogin as { toDate: () => Date }).toDate();
                    } else if (currentLastLogin && typeof currentLastLogin === 'object' && '_seconds' in currentLastLogin) {
                      const seconds = Number((currentLastLogin as { _seconds?: number })._seconds || 0);
                      const nanoseconds = Number((currentLastLogin as { _nanoseconds?: number })._nanoseconds || 0);
                      loginDate = new Timestamp(seconds, nanoseconds).toDate();
                    } else {
                      shouldUpdate = true; // Geçersiz format, güncelle
                    }
<<<<<<< HEAD

=======
                    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                    if (!shouldUpdate && loginDate) {
                      const diffInMinutes = Math.floor((now - loginDate.getTime()) / (1000 * 60));
                      // Eğer son giriş 30 dakikadan fazla önceyse güncelle
                      if (diffInMinutes > 30) {
                        shouldUpdate = true;
                      }
                    }
                  } catch (parseError) {
                    // Parse hatası varsa güncelle
                    shouldUpdate = true;
                  }
                }
<<<<<<< HEAD

=======
                
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                if (shouldUpdate) {
                  // serverTimestamp() kullanarak sunucu zamanını kaydet
                  await updateDoc(doc(firestore, "users", firebaseUser.uid), {
                    lastLoginAt: serverTimestamp(),
                  });
                  lastLoginUpdateTime.set(firebaseUser.uid, now);
<<<<<<< HEAD

=======
                  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  // Profili yeniden yükle (güncellenmiş lastLoginAt ile)
                  await new Promise(resolve => setTimeout(resolve, 200)); // 200ms bekle (serverTimestamp işlemesi için)
                  const updatedProfile = await getUserProfile(firebaseUser.uid);
                  if (updatedProfile) {
                    userProfile = updatedProfile;
                  }
                }
              } catch (updateError) {
                if (import.meta.env.DEV) {
                  console.error("Son giriş zamanı güncellenirken hata (onAuthChange):", updateError);
                }
                // Hata olsa bile devam et
              }
            }
<<<<<<< HEAD

            callback(userProfile);
          } catch (error: unknown) {
            // Silinmiş kullanıcı ise çıkış yap
            const errorObj = error && typeof error === 'object' ? error as { message?: string } : null;
            if (errorObj?.message?.includes("silinmiş")) {
=======
            
            callback(userProfile);
          } catch (error: unknown) {
            // Silinmiş kullanıcı ise çıkış yap
            if (error.message?.includes("silinmiş")) {
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              try {
                await firebaseSignOut(auth);
              } catch (signOutError) {
                if (import.meta.env.DEV) {
                  if (import.meta.env.DEV) {
<<<<<<< HEAD
                    console.error("Çıkış yapılırken hata:", signOutError);
                  }
=======
            console.error("Çıkış yapılırken hata:", signOutError);
          }
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                }
              }
              callback(null);
            } else {
              // Diğer hatalar için de callback(null) çağır
              if (import.meta.env.DEV) {
                console.error("onAuthChange callback hatası:", error);
              }
              callback(null);
            }
          }
        } else {
          callback(null);
        }
      } catch (error: unknown) {
        // En dış seviye hata yakalama - unhandled promise rejection'ları önle
        if (import.meta.env.DEV) {
          console.error("onAuthChange async callback hatası:", error);
        }
        // Hata durumunda callback(null) çağır
        try {
          callback(null);
        } catch (callbackError) {
          // Callback çağrısı bile başarısız olursa sessizce handle et
          if (import.meta.env.DEV) {
            console.error("onAuthChange callback çağrısı hatası:", callbackError);
          }
        }
      }
    })().catch((error) => {
      // Promise rejection'ları yakala
      if (import.meta.env.DEV) {
        console.error("onAuthChange promise rejection:", error);
      }
      try {
        callback(null);
      } catch (callbackError) {
        if (import.meta.env.DEV) {
          console.error("onAuthChange callback çağrısı hatası (promise rejection):", callbackError);
        }
      }
    });
  });
<<<<<<< HEAD

=======
  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  // Return unsubscribe function that also clears timeout
  return () => {
    if (!timeoutFired) {
      clearTimeout(timeout);
    }
    unsubscribe();
  };
};

/**
 * Mevcut kullanıcıyı al
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return auth?.currentUser || null;
};

/**
 * Tüm kullanıcıları listele
 */
export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    if (!firestore) {
      throw new Error('Firestore is not initialized');
    }
<<<<<<< HEAD

    // Sadece authenticated kullanıcılar için çalış
    const { getAuth } = await import("firebase/auth");
    const { auth } = await import("@/lib/firebase");
    const currentAuth = auth || getAuth();

    if (!currentAuth?.currentUser) {
      // Giriş yapmamış kullanıcılar için boş array döndür
      return [];
    }

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Önce roles collection'ından tanımlı rolleri al
    const { getRoles } = await import("./rolePermissionsService");
    const definedRoles = await getRoles();
    const definedRoleKeys = new Set(definedRoles.map(r => r.key));
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Önce orderBy ile deneyelim (index varsa hızlı olur)
    // Performans için limit ekle (500 kayıt)
    try {
      const q = query(collection(firestore, "users"), orderBy("displayName", "asc"), limit(500));
      const snapshot = await getDocs(q);
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      const users = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          // Silinmiş kullanıcıları filtrele
          if (data.deleted === true) {
            return null;
          }
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // Kullanıcının rolleri sadece tanımlı rollerden olsun
          const userRoles = (data.role || []) as string[];
          const validRoles = userRoles.filter(role => definedRoleKeys.has(role));
          const finalRoles = validRoles.length > 0 ? validRoles : ["personnel"];
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // Eğer roller değiştiyse, veritabanını güncelle (async, await etmeden)
          if (JSON.stringify(userRoles) !== JSON.stringify(finalRoles)) {
            updateDoc(doc.ref, { role: finalRoles }).catch(err => {
              console.error(`Error syncing roles for user ${doc.id}:`, err);
            });
          }
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          return {
            id: doc.id,
            email: data.email || "",
            displayName: data.displayName || data.fullName || "",
            fullName: data.fullName || data.displayName || "",
            phone: data.phone || "",
            dateOfBirth: data.dateOfBirth || "",
            role: finalRoles,
            departmentId: data.departmentId || "",
            pendingTeams: data.pendingTeams || [],
            approvedTeams: data.approvedTeams || [],
            teamLeaderIds: data.teamLeaderIds || [],
            emailVerified: data.emailVerified || false,
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
            lastLoginAt: data.lastLoginAt || null,
          } as UserProfile;
        })
        .filter((user): user is UserProfile => user !== null && !!user.id && !!(user.displayName || user.fullName || user.email)); // Geçerli kullanıcıları filtrele (email varsa da kabul et)
<<<<<<< HEAD

      return users;
    } catch (orderByError: unknown) {
      // Index hatası varsa orderBy olmadan al (sessizce handle et)
      if (import.meta.env.DEV) {
        const errorObj = orderByError && typeof orderByError === 'object' ? orderByError as { code?: string; message?: string } : null;
        if (errorObj?.code !== 'permission-denied') {
          console.warn("OrderBy failed, fetching without order:", errorObj?.message || orderByError);
        }
      }
=======
      
      return users;
    } catch (orderByError: unknown) {
      // Index hatası varsa orderBy olmadan al
      console.warn("OrderBy failed, fetching without order:", orderByError?.message || orderByError);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Önce roles collection'ından tanımlı rolleri al
      const { getRoles } = await import("./rolePermissionsService");
      const definedRoles = await getRoles();
      const definedRoleKeys = new Set(definedRoles.map(r => r.key));
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Performans için limit ekle (500 kayıt)
      const q = query(collection(firestore, "users"), limit(500));
      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          // Silinmiş kullanıcıları filtrele
          if (data.deleted === true) {
            return null;
          }
<<<<<<< HEAD

          // Kullanıcının rolleri sadece tanımlı rollerden olsun
          const userRoles = (data.role || []) as string[];
          const validRoles = userRoles.filter(role => definedRoleKeys.has(role));

          // Eğer hiç geçerli rol yoksa, varsayılan rol ekle
          const finalRoles = validRoles.length > 0 ? validRoles : ["personnel"];

=======
          
          // Kullanıcının rolleri sadece tanımlı rollerden olsun
          const userRoles = (data.role || []) as string[];
          const validRoles = userRoles.filter(role => definedRoleKeys.has(role));
          
          // Eğer hiç geçerli rol yoksa, varsayılan rol ekle
          const finalRoles = validRoles.length > 0 ? validRoles : ["personnel"];
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // Eğer roller değiştiyse, veritabanını güncelle
          if (JSON.stringify(userRoles) !== JSON.stringify(finalRoles)) {
            // Async olarak güncelle (await etmeden)
            updateDoc(doc.ref, { role: finalRoles }).catch(err => {
              console.error(`Error syncing roles for user ${doc.id}:`, err);
            });
          }
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          return {
            id: doc.id,
            email: data.email || "",
            displayName: data.displayName || data.fullName || "",
            fullName: data.fullName || data.displayName || "",
            phone: data.phone || "",
            dateOfBirth: data.dateOfBirth || "",
            role: finalRoles,
            departmentId: data.departmentId || "",
            pendingTeams: data.pendingTeams || [],
            approvedTeams: data.approvedTeams || [],
            teamLeaderIds: data.teamLeaderIds || [],
            emailVerified: data.emailVerified || false,
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
            lastLoginAt: data.lastLoginAt || null,
          } as UserProfile;
        })
        .filter((user): user is UserProfile => user !== null && !!user.id && !!(user.displayName || user.fullName || user.email)); // Geçerli kullanıcıları filtrele (email varsa da kabul et)
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Client-side sorting
      return users.sort((a, b) => {
        const nameA = (a.displayName || a.fullName || "").toLowerCase();
        const nameB = (b.displayName || b.fullName || "").toLowerCase();
        return nameA.localeCompare(nameB, "tr");
      });
    }
  } catch (error: unknown) {
<<<<<<< HEAD
    // Permission hatalarını sessizce handle et (giriş yapmadan normal)
    const errorObj = error && typeof error === 'object' ? error as { code?: string; message?: string } : null;

    if (errorObj?.code === 'permission-denied' || errorObj?.message?.includes('permissions')) {
      // Permission hatası beklenen bir durum (giriş yapmadan), sessizce handle et
      if (import.meta.env.DEV) {
        console.debug("Permission hatası (beklenen): Kullanıcı giriş yapmamış olabilir");
      }
    } else if (errorObj?.code === 'unavailable' || errorObj?.message?.includes('network')) {
      if (import.meta.env.DEV) {
        console.warn("⚠️ Firestore bağlantı hatası! İnternet bağlantınızı kontrol edin.");
      }
    } else {
      if (import.meta.env.DEV) {
        console.error("⚠️ Kullanıcı listesi alınamadı:", errorObj?.message || error);
      }
    }

=======
    console.error("Get all users error:", error);
    
    // Permissions hatası için özel mesaj
    if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
      console.error("⚠️ Firestore permissions hatası! Kullanıcı listesi alınamıyor.");
      console.error("📝 Firebase Console'da Security Rules'u kontrol edin:");
      console.error("   https://console.firebase.google.com/project/revpad-15232/firestore/rules");
      console.error("   Users collection için read izni olmalı: allow read: if request.auth != null;");
    } else if (error.code === 'unavailable' || error.message?.includes('network')) {
      console.error("⚠️ Firestore bağlantı hatası! İnternet bağlantınızı kontrol edin.");
    } else {
      console.error("⚠️ Kullanıcı listesi alınamadı:", error.message || error);
    }
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Hata durumunda boş array döndür, uygulama çökmesin
    return [];
  }
};

/**
 * Google ile giriş yap
 */
export const signInWithGoogle = async (): Promise<{ success: boolean; message?: string; user?: UserProfile | null }> => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/drive.file"); // Drive scope added
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
<<<<<<< HEAD

=======
    
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Önce direkt Firestore'dan silinmiş kullanıcı kontrolü yap
    try {
      const userDoc = await getDoc(doc(firestore, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.deleted === true) {
          // Hemen çıkış yap
          try {
            await firebaseSignOut(auth);
          } catch (signOutError) {
            if (import.meta.env.DEV) {
              if (import.meta.env.DEV) {
<<<<<<< HEAD
                console.error("Çıkış yapılırken hata:", signOutError);
              }
=======
            console.error("Çıkış yapılırken hata:", signOutError);
          }
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            }
          }
          return {
            success: false,
            message: "Bu hesap silinmiş. Giriş yapamazsınız.",
            user: null,
          };
        }
      }
    } catch (checkError) {
      console.error("Kullanıcı kontrolü hatası:", checkError);
      // Kontrol hatası olsa bile devam et, getUserProfile kontrol edecek
    }
<<<<<<< HEAD

    // Check if user profile exists, create if not
    try {
      let userProfile = await getUserProfile(firebaseUser.uid);

=======
    
    // Check if user profile exists, create if not
    try {
      let userProfile = await getUserProfile(firebaseUser.uid);
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Eğer kullanıcı silinmişse
      if (!userProfile) {
        try {
          await firebaseSignOut(auth);
        } catch (signOutError) {
          if (import.meta.env.DEV) {
            console.error("Çıkış yapılırken hata:", signOutError);
          }
        }
        return {
          success: false,
          message: "Bu hesap silinmiş. Giriş yapamazsınız.",
          user: null,
        };
      }
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // Kullanıcı profilini güncelle - serverTimestamp() kullanarak sunucu zamanını kaydet
      const oldLastLoginAt = userProfile.lastLoginAt;
      // serverTimestamp() kullanarak Firebase sunucusunun zamanını kaydet (daha doğru)
      await updateDoc(doc(firestore, "users", firebaseUser.uid), {
        displayName: firebaseUser.displayName,
        fullName: firebaseUser.displayName,
        emailVerified: firebaseUser.emailVerified,
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });

      // Profili yeniden yükle (güncellenmiş lastLoginAt ile)
      // Not: serverTimestamp() async olduğu için hemen okumak doğru zamanı vermeyebilir
      // Bu yüzden bir miktar bekleyip tekrar yükleyelim
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms bekle
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      const updatedProfile = await getUserProfile(firebaseUser.uid);
      if (updatedProfile) {
        userProfile = updatedProfile;
      }

      // Giriş logunu kaydet (retry mekanizması ile)
      try {
        const loginTime = new Date().toISOString();
        const oldLastLoginAtValue = oldLastLoginAt ? (oldLastLoginAt instanceof Timestamp ? oldLastLoginAt.toDate().toISOString() : String(oldLastLoginAt)) : null;
<<<<<<< HEAD

=======
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        let retryCount = 0;
        const maxRetries = 2;
        while (retryCount <= maxRetries) {
          try {
            await logAudit(
<<<<<<< HEAD
              "UPDATE",
              "user_logins",
              firebaseUser.uid,
              firebaseUser.uid,
              oldLastLoginAtValue ? { lastLoginAt: oldLastLoginAtValue } : null,
              null,
              {
                action: "LOGIN",
                method: "GOOGLE",
                email: firebaseUser.email || null,
                timestamp: loginTime
=======
              "UPDATE", 
              "user_logins", 
              firebaseUser.uid, 
              firebaseUser.uid,
              oldLastLoginAtValue ? { lastLoginAt: oldLastLoginAtValue } : null,
              null,
              { 
                action: "LOGIN", 
                method: "GOOGLE", 
                email: firebaseUser.email || null, 
                timestamp: loginTime 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              }
            );
            break; // Başarılı oldu, döngüden çık
          } catch (retryError) {
            retryCount++;
            if (retryCount > maxRetries) {
              if (import.meta.env.DEV) {
                console.error("Giriş logu kaydedilirken hata (tüm denemeler başarısız):", retryError);
              }
            } else {
              // Kısa bir bekleme sonrası tekrar dene
              await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
            }
          }
        }
      } catch (logError) {
        if (import.meta.env.DEV) {
          console.error("Giriş logu kaydedilirken beklenmeyen hata:", logError);
        }
        // Log hatası girişi engellememeli
      }

      return {
        success: true,
        user: userProfile,
      };
    } catch (profileError: unknown) {
      // Silinmiş kullanıcı hatası
      if (profileError instanceof Error && profileError.message?.includes("silinmiş")) {
        try {
          await firebaseSignOut(auth);
        } catch (signOutError) {
          if (import.meta.env.DEV) {
            console.error("Çıkış yapılırken hata:", signOutError);
          }
        }
        return {
          success: false,
          message: "Bu hesap silinmiş. Giriş yapamazsınız.",
          user: null,
        };
      }
      // Eğer profil yoksa yeni profil oluştur
      const newUserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || "",
        fullName: firebaseUser.displayName || "",
        role: ["viewer"], // Default role
        emailVerified: firebaseUser.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        pendingTeams: [],
        approvedTeams: [],
      };
      await setDoc(doc(firestore, "users", firebaseUser.uid), newUserProfile);
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      return {
        success: true,
        user: newUserProfile as UserProfile,
      };
    }
  } catch (error: unknown) {
    console.error("Google Sign-In error:", error);
    let errorMessage = "Google ile giriş başarısız";
<<<<<<< HEAD
    const errorObj = error && typeof error === 'object' ? error as { code?: string; message?: string } : null;
    if (errorObj?.code === 'auth/popup-closed-by-user') {
      errorMessage = "Google giriş penceresi kapatıldı.";
    } else if (errorObj?.message) {
      errorMessage = errorObj.message;
=======
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = "Google giriş penceresi kapatıldı.";
    } else if (error.message) {
      errorMessage = error.message;
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    }
    return {
      success: false,
      message: errorMessage,
      user: null,
    };
  }
};

/**
 * Email doğrulama e-postası gönder
 */
export const sendVerificationEmail = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!auth) {
      return { success: false, message: 'Firebase Auth is not initialized' };
    }
    const user = auth.currentUser;
    if (!user) {
      return { success: false, message: "Kullanıcı oturum açmamış" };
    }
<<<<<<< HEAD

    // Email zaten doğrulanmışsa gönderme
    if (user.emailVerified) {
      return { success: false, message: "Email zaten doğrulanmış" };
    }

    await sendEmailVerification(user);
    if (import.meta.env.DEV) {
      console.log("Email doğrulama maili gönderildi (manuel):", user.email);
    }
    return { success: true, message: "Doğrulama e-postası gönderildi. Lütfen e-postanızı ve spam kutusunu kontrol edin." };
  } catch (error: unknown) {
    const errorCode = (error as { code?: string })?.code;
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (import.meta.env.DEV) {
      console.error("Send verification email error:", error);
    }

    // Firebase hata kodlarını Türkçe'ye çevir
    let errorMessage = "Email doğrulama maili gönderilemedi";
    if (errorCode === 'auth/too-many-requests') {
      errorMessage = "Çok fazla istek yapıldı. Lütfen bir süre sonra tekrar deneyin.";
    } else if (errorCode === 'auth/network-request-failed') {
      errorMessage = "Ağ hatası. İnternet bağlantınızı kontrol edin.";
    } else if (errorMsg) {
      errorMessage = errorMsg;
    }
    return {
      success: false,
      message: (error && typeof error === 'object' && 'message' in error ? (error as { message?: string }).message : undefined) || "Doğrulama e-postası gönderilemedi",
=======
    await sendEmailVerification(user);
    return { success: true, message: "Doğrulama e-postası gönderildi" };
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Send verification email error:", error);
    }
    return {
      success: false,
      message: error.message || "Doğrulama e-postası gönderilemedi",
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    };
  }
};

/**
 * Kullanıcıyı tamamen sil (sadece super_admin)
<<<<<<< HEAD
 * - Firebase Auth'dan siler (Cloud Function gerekir)
 * - Firestore users collection'ında soft delete yapar
 * - Tüm logları siler
 * - Görevlerden kullanıcıyı çıkarır
 * - Bildirimlerini siler
 * - Ekip ilişkilerini temizler
=======
 * - Firebase Auth'dan siler
 * - Firestore users collection'ından siler
 * - Tüm logları siler
 * - Görevlerden kullanıcıyı çıkarır
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
 * - Eğer göreve kimse kalmamışsa havuza alır
 */
export const deleteUser = async (userId: string, deletedBy: string): Promise<void> => {
  try {
    if (!auth || !firestore) {
      throw new Error("Firebase is not initialized");
    }

<<<<<<< HEAD
    // Kullanıcı profilini al (silinmiş bile olsa bilgileri görmek için allowDeleted: true)
    const userProfile = await getUserProfile(userId, true);
=======
    // Kullanıcı profilini al
    const userProfile = await getUserProfile(userId);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    if (!userProfile) {
      throw new Error("Kullanıcı bulunamadı");
    }

<<<<<<< HEAD
    // Zaten silinmişse hata ver
    const userDoc = await getDoc(doc(firestore, "users", userId));
    if (userDoc.exists() && userDoc.data()?.deleted === true) {
      throw new Error("Bu kullanıcı zaten silinmiş.");
    }

=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    // Silen kişinin yetkisini kontrol et (super_admin olmalı)
    const deleterProfile = await getUserProfile(deletedBy);
    if (!deleterProfile || (!deleterProfile.role?.includes("super_admin") && !deleterProfile.role?.includes("main_admin"))) {
      throw new Error("Kullanıcı silme yetkiniz yok. Sadece ana yöneticiler kullanıcı silebilir.");
    }

    // Kendini silmeye çalışıyorsa engelle
    if (userId === deletedBy) {
      throw new Error("Kendi hesabınızı silemezsiniz.");
    }

<<<<<<< HEAD
    // Orijinal verileri sakla (audit log için)
    const originalData = {
      email: userProfile.email,
      displayName: userProfile.displayName,
      fullName: userProfile.fullName,
      phone: userProfile.phone,
      role: userProfile.role,
      departmentId: userProfile.departmentId,
    };

    // 1. Tüm görevlerden kullanıcıyı çıkar ve gerekirse havuza al
    try {
      const { removeUserFromAllTasks } = await import("./taskService");
      await removeUserFromAllTasks(userId);
    } catch (taskError) {
      if (import.meta.env.DEV) {
        console.warn("Görevlerden kullanıcı çıkarılırken hata:", taskError);
      }
      // Devam et, kritik değil
    }

    // 2. Tüm logları sil (opsiyonel - GDPR için log tutmak gerekebilir)
    try {
      const { deleteUserLogs } = await import("./auditLogsService");
      await deleteUserLogs(userId);
    } catch (logError) {
      if (import.meta.env.DEV) {
        console.warn("Loglar silinirken hata:", logError);
      }
      // Devam et, kritik değil
    }

    // 3. Kullanıcının tüm bildirimlerini sil
    try {
      const { deleteUserNotifications } = await import("./notificationService");
      if (typeof deleteUserNotifications === 'function') {
        await deleteUserNotifications(userId);
      }
    } catch (notifError) {
      if (import.meta.env.DEV) {
        console.warn("Bildirimler silinirken hata:", notifError);
      }
      // Devam et, kritik değil
    }

    // 4. Ekip ilişkilerini temizle (departmentlarda manager ise)
    try {
      const { getDepartments, updateDepartment } = await import("./departmentService");
      const departments = await getDepartments();

      for (const dept of departments) {
        if (dept.managerId === userId) {
          // Bu departmanda manager ise, manager'ı null yap
          await updateDepartment(dept.id, { managerId: null });
          if (import.meta.env.DEV) {
            console.log(`Departman ${dept.id} manager'ı temizlendi`);
          }
        }
      }
    } catch (deptError) {
      if (import.meta.env.DEV) {
        console.warn("Ekip ilişkileri temizlenirken hata:", deptError);
      }
      // Devam et, kritik değil
    }

    // 5. Firestore'da soft delete yap
    // Kullanıcıyı silmek yerine "deleted" flag'i ekleyelim
    // Böylece kullanıcı giriş yapamaz ama veriler korunur (GDPR uyumluluğu için)
    const userRef = doc(firestore, "users", userId);

=======
    // 1. Tüm görevlerden kullanıcıyı çıkar ve gerekirse havuza al
    const { removeUserFromAllTasks } = await import("./taskService");
    await removeUserFromAllTasks(userId);

    // 2. Tüm logları sil
    const { deleteUserLogs } = await import("./auditLogsService");
    await deleteUserLogs(userId);

    // 3. Firebase Auth'dan kullanıcıyı sil (admin SDK gerekir, client-side'da yapılamaz)
    // Bu işlem için Cloud Function veya Admin SDK gerekir
    // Şimdilik sadece Firestore'dan silelim ve kullanıcıyı devre dışı bırakalım
    const userRef = doc(firestore, "users", userId);
    
    // Kullanıcıyı silmek yerine "deleted" flag'i ekleyelim
    // Böylece kullanıcı giriş yapamaz ama veriler korunur (GDPR uyumluluğu için)
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    await updateDoc(userRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: deletedBy,
<<<<<<< HEAD
      // Orijinal email'i koruyoruz (yeniden kayıt kontrolü için gerekli)
      // email: userProfile.email, // DEĞİŞTİRME
      displayName: "Silinmiş Kullanıcı",
      fullName: "Silinmiş Kullanıcı",
      phone: null,
      dateOfBirth: null,
=======
      email: `deleted_${Date.now()}_${userProfile.email}`, // Email'i değiştir ki tekrar kayıt olamasın
      displayName: "Silinmiş Kullanıcı",
      fullName: "Silinmiş Kullanıcı",
      phone: null,
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      role: [],
      departmentId: null,
      pendingTeams: [],
      approvedTeams: [],
      teamLeaderIds: [],
<<<<<<< HEAD
      // Orijinal verileri metadata olarak sakla (gerekirse geri yüklemek için)
      _originalData: originalData,
    });

    // 6. Audit log oluştur
    try {
      const { logSecurityEvent } = await import("@/utils/auditLogger");
      await logSecurityEvent(
        "ACCOUNT_DELETE",
        deletedBy,
        {
          targetUserId: userId,
          deletedAt: new Date().toISOString(),
          reason: "Kullanıcı yönetici tarafından silindi",
          originalEmail: userProfile?.email // Logda email'i tutmak faydalı olabilir
        }
      );
    } catch (auditError) {
      if (import.meta.env.DEV) {
        console.error("Audit log oluşturulurken hata:", auditError);
      }
      // Devam et, silme işlemi tamamlandı
    }

    if (import.meta.env.DEV) {
      console.log(`Kullanıcı ${userId} başarıyla silindi (soft delete)`);
    }
=======
    });

    // 4. Audit log oluştur
    const { createAuditLog } = await import("./auditLogsService");
    await createAuditLog(
      "DELETE",
      "users",
      userId,
      userProfile,
      { deleted: true, deletedAt: new Date(), deletedBy },
      deletedBy
    );
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

  } catch (error: unknown) {
    console.error("Delete user error:", error);
    throw error;
  }
};

<<<<<<< HEAD
/**
 * Silinmiş kullanıcıyı geri yükle (sadece super_admin)
 * Soft delete ile silinmiş kullanıcıları geri yükler
 */
export const restoreUser = async (userId: string, restoredBy: string): Promise<void> => {
  try {
    if (!auth || !firestore) {
      throw new Error("Firebase is not initialized");
    }

    // Geri yükleyen kişinin yetkisini kontrol et
    const restorerProfile = await getUserProfile(restoredBy);
    if (!restorerProfile || (!restorerProfile.role?.includes("super_admin") && !restorerProfile.role?.includes("main_admin"))) {
      throw new Error("Kullanıcı geri yükleme yetkiniz yok. Sadece ana yöneticiler kullanıcı geri yükleyebilir.");
    }

    // Kullanıcı dokümanını al
    const userRef = doc(firestore, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error("Kullanıcı bulunamadı");
    }

    const userData = userDoc.data();

    if (userData.deleted !== true) {
      throw new Error("Bu kullanıcı silinmemiş, geri yükleme gerekmiyor.");
    }

    // Orijinal verileri al
    const originalData = userData._originalData || {};

    // Geri yükle
    await updateDoc(userRef, {
      deleted: false,
      deletedAt: null,
      deletedBy: null,
      displayName: originalData.displayName || userData.email?.split("@")[0] || "Kullanıcı",
      fullName: originalData.fullName || originalData.displayName || userData.email?.split("@")[0] || "Kullanıcı",
      phone: originalData.phone || null,
      role: originalData.role || ["viewer"],
      departmentId: originalData.departmentId || null,
      pendingTeams: [],
      approvedTeams: [],
      teamLeaderIds: [],
      restoredAt: serverTimestamp(),
      restoredBy: restoredBy,
      _originalData: null, // Temizle
      updatedAt: serverTimestamp(),
    });

    // Audit log
    try {
      const { logSecurityEvent } = await import("@/utils/auditLogger");
      await logSecurityEvent(
        "ACCOUNT_RESTORE",
        restoredBy,
        {
          targetUserId: userId,
          restoredAt: new Date().toISOString(),
        }
      );
    } catch (auditError) {
      if (import.meta.env.DEV) {
        console.error("Audit log oluşturulurken hata:", auditError);
      }
    }

    if (import.meta.env.DEV) {
      console.log(`Kullanıcı ${userId} başarıyla geri yüklendi`);
    }

  } catch (error: unknown) {
    console.error("Restore user error:", error);
    throw error;
  }
};

/**
 * Silinmiş kullanıcıları listele (sadece super_admin için)
 */
export const getDeletedUsers = async (): Promise<UserProfile[]> => {
  try {
    if (!firestore) {
      throw new Error("Firestore is not initialized");
    }

    const usersRef = collection(firestore, "users");
    const q = query(usersRef, where("deleted", "==", true), limit(100));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || "",
        displayName: data._originalData?.displayName || "Silinmiş Kullanıcı",
        fullName: data._originalData?.fullName || "Silinmiş Kullanıcı",
        phone: data._originalData?.phone || null,
        role: [],
        emailVerified: false,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
        deletedAt: data.deletedAt || null,
        deletedBy: data.deletedBy || null,
      } as UserProfile & { deletedAt?: Timestamp | Date | null; deletedBy?: string };
    });

  } catch (error: unknown) {
    console.error("Get deleted users error:", error);
    return [];
  }
};
=======

>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
