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
  deleteUser as firebaseDeleteUser,
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
  writeBatch,
  where,
  Timestamp,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import { logAudit } from "@/utils/auditLogger";
// firebase-auth.ts removed, functions are now directly in this file

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
      email: email,
      displayName: fullName,
      fullName: fullName,
      role: ["viewer"], // Varsayılan rol
      emailVerified: firebaseUser.emailVerified,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      pendingTeams: selectedTeamId ? [selectedTeamId] : [],
      approvedTeams: [],
    };

    // Opsiyonel alanları sadece tanımlıysa ve boş değilse ekle
    // Firestore undefined ve boş string değerlerini kabul etmez
    if (phone && phone.trim() !== '') {
      userProfileData.phone = phone.trim();
    }
    if (dateOfBirth && dateOfBirth.trim() !== '') {
      userProfileData.dateOfBirth = dateOfBirth.trim();
    }

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
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  } catch (error: unknown) {
    // Firebase hata kodlarını Türkçe'ye çevir
    let errorMessage = "Kayıt başarısız";
    const errorCode = (error as { code?: string })?.code;
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // Beklenen hatalar için sessizce devam et, sadece beklenmeyen hatalar için log göster
    const isExpectedError = [
      'auth/email-already-in-use',
      'auth/invalid-email',
      'auth/weak-password',
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
    } else if (errorCode === 'permission-denied' || errorMsg.includes('permissions')) {
      errorMessage = "Firestore izin hatası. Lütfen Firebase Console'da Security Rules'u kontrol edin. Detaylar: " + (errorMsg || "İzin reddedildi");
    } else if (errorMsg.includes('Unsupported field value: undefined')) {
      errorMessage = "Form verilerinde eksik veya geçersiz alanlar var. Lütfen tüm zorunlu alanları doldurun ve tekrar deneyin.";
    } else if (errorMsg.includes('invalid data')) {
      errorMessage = "Gönderilen veriler geçersiz. Lütfen tüm alanları kontrol edip tekrar deneyin.";
    } else if (errorMsg) {
      errorMessage = errorMsg;
    }
    
    // Sadece beklenmeyen hatalar için console.error göster
    if (!isExpectedError && import.meta.env.DEV) {
      console.error("Register error:", error);
    }
    
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
    const firebaseUser = userCredential.user;
    
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
            console.error("Çıkış yapılırken hata:", signOutError);
          }
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
    
    try {
      let userProfile = await getUserProfile(firebaseUser.uid);
      
      // Eğer userProfile null ise veya silinmişse
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

      // Son giriş zamanını güncelle - serverTimestamp() kullanarak sunucu zamanını kaydet
      try {
        const oldLastLoginAt = userProfile.lastLoginAt;
        // serverTimestamp() kullanarak Firebase sunucusunun zamanını kaydet (daha doğru)
        await updateDoc(doc(firestore, "users", firebaseUser.uid), {
          lastLoginAt: serverTimestamp(),
        });
        
        // Profili yeniden yükle (güncellenmiş lastLoginAt ile)
        // Not: serverTimestamp() async olduğu için hemen okumak doğru zamanı vermeyebilir
        // Bu yüzden bir miktar bekleyip tekrar yükleyelim veya client-side timestamp ile güncelleyelim
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms bekle
        
        const updatedProfile = await getUserProfile(firebaseUser.uid);
        if (updatedProfile) {
          userProfile = updatedProfile;
        }
        
        // Giriş logunu kaydet
        try {
          const loginTime = new Date().toISOString();
          await logAudit("UPDATE", "user_logins", firebaseUser.uid, firebaseUser.uid, 
            { lastLoginAt: oldLastLoginAt ? (oldLastLoginAt instanceof Timestamp ? oldLastLoginAt.toDate().toISOString() : String(oldLastLoginAt)) : null }, 
            { lastLoginAt: loginTime, action: "LOGIN", method: "EMAIL", email: email, userId: firebaseUser.uid, timestamp: loginTime }
          );
        } catch (logError) {
          if (import.meta.env.DEV) {
            console.error("Giriş logu kaydedilirken hata:", logError);
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
    
    const errorMsg = error instanceof Error ? error.message : String(error);
    // Eğer zaten çıkış yapıldıysa (silinmiş kullanıcı), hata mesajını döndür
    if (errorMsg.includes("silinmiş")) {
      return {
        success: false,
        message: "Bu hesap silinmiş. Giriş yapamazsınız.",
        user: null,
      };
    }
    
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
    
    // Çıkış yapmadan önce kullanıcı ID'sini al
    const userId = auth.currentUser?.uid;
    const userEmail = auth.currentUser?.email;
    
    // Çıkış logunu kaydet (çıkış yapmadan önce)
    if (userId) {
      try {
        const logoutTime = new Date().toISOString();
        await logAudit("UPDATE", "user_logins", userId, userId, 
          {}, 
          { action: "LOGOUT", timestamp: logoutTime, email: userEmail || null, userId: userId }
        );
      } catch (logError) {
        console.error("Çıkış logu kaydedilirken hata:", logError);
        // Log hatası çıkışı engellememeli
      }
    }
    
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error: unknown) {
    console.error("Logout error:", error);
    return {
      success: false,
      message: error.message || "Çıkış başarısız",
    };
  }
};

/**
 * Şifre sıfırlama
 */
export const resetPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }
    // Firebase'in şifre sıfırlama e-postasını gönder
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Şifre sıfırlama e-postası gönderildi" };
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Reset password error:", error);
    }
    // Firebase hata kodlarını Türkçe'ye çevir
    let errorMessage = "Şifre sıfırlama başarısız";
    const errorObj = error && typeof error === 'object' && 'code' in error ? error as { code?: string; message?: string } : null;
    if (errorObj?.code === 'auth/user-not-found') {
      errorMessage = "Bu e-posta adresi kayıtlı değil";
    } else if (errorObj?.code === 'auth/invalid-email') {
      errorMessage = "Geçersiz e-posta adresi";
    } else if (error.message) {
      errorMessage = error.message;
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
      emailVerified: data.emailVerified || firebaseUser?.emailVerified || false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      lastLoginAt: data.lastLoginAt,
    };
  } catch (error: unknown) {
    console.error("Get user profile error:", error);
    
    // Permissions hatası için özel mesaj
    if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
      console.warn("⚠️ Firestore permissions hatası! Firebase Console'da Security Rules'u kontrol edin:");
      console.warn("   https://console.firebase.google.com/project/revpad-15232/firestore/rules");
      console.warn("   Geçici çözüm için test mode kuralları kullanın:");
      console.warn("   match /{document=**} { allow read, write: if request.auth != null; }");
    }
    
    return null;
  }
};

/**
 * Kullanıcı profilini güncelle
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<Omit<UserProfile, "id" | "email" | "emailVerified" | "createdAt" | "updatedAt">>
): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!firestore) {
      throw new Error('Firestore is not initialized');
    }
    
    // Firestore undefined değerleri kabul etmez, bu yüzden undefined alanları temizle
    const cleanUpdates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    
    Object.keys(updates).forEach((key) => {
      const value = (updates as Record<string, unknown>)[key];
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });
    
    await updateDoc(doc(firestore, "users", userId), cleanUpdates);

    // Firebase Auth'ta displayName güncelle
    if (updates.displayName && auth?.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: updates.displayName,
      });
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Update user profile error:", error);
    return {
      success: false,
      message: error.message || "Profil güncellenemedi",
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
let lastLoginUpdateTime: Map<string, number> = new Map();

export const onAuthChange = (callback: (user: UserProfile | null) => void) => {
  if (!auth) {
    if (import.meta.env.DEV) {
      console.error('Firebase Auth is not initialized');
      console.warn('Firebase yapılandırması eksik olabilir. Lütfen .env dosyasını kontrol edin.');
    }
    // Hemen callback çağır (loading state'i false yapmak için)
    // Firebase başlatılamazsa kullanıcı auth sayfasına yönlendirilecek
    setTimeout(() => callback(null), 0);
    return () => {}; // Return empty unsubscribe function
  }
  
  // Firestore kontrolü - opsiyonel ama önerilir
  if (!firestore) {
    if (import.meta.env.DEV) {
      console.warn('Firestore is not initialized - bazı özellikler çalışmayabilir');
    }
    // Firestore olmadan da devam edebiliriz, sadece user profile alınamaz
  }
  
  // Timeout: Eğer 3 saniye içinde auth state gelmezse callback(null) çağır
  let timeoutFired = false;
  const timeout = setTimeout(() => {
    if (!timeoutFired) {
      console.warn('Auth state timeout - callback(null) çağrılıyor');
      timeoutFired = true;
      callback(null);
    }
  }, 3000);
  
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    // Async callback'i promise olarak wrap et ve unhandled rejection'ları yakala
    (async () => {
      try {
        // Timeout'u iptal et - auth state geldi
        if (!timeoutFired) {
          clearTimeout(timeout);
          timeoutFired = true;
        }
        
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
            console.error("Çıkış yapılırken hata:", signOutError);
          }
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
          
          try {
            let userProfile = await getUserProfile(firebaseUser.uid);
            // Eğer userProfile null ise (silinmiş kullanıcı), çıkış yap
            if (!userProfile) {
              try {
                await firebaseSignOut(auth);
              } catch (signOutError) {
                if (import.meta.env.DEV) {
                  if (import.meta.env.DEV) {
            console.error("Çıkış yapılırken hata:", signOutError);
          }
                }
              }
              callback(null);
              return;
            }
            
            // Son giriş zamanını güncelle (sadece gerektiğinde, duplicate güncellemeleri önlemek için)
            // Not: login() ve signInWithGoogle() fonksiyonlarında zaten güncelleniyor,
            // burada sadece sayfa yenilendiğinde veya başka bir cihazdan giriş yapıldığında güncellenmeli
            const now = Date.now();
            const lastUpdate = lastLoginUpdateTime.get(firebaseUser.uid) || 0;
            const timeSinceLastUpdate = now - lastUpdate;
            
            // Eğer son güncellemeden 1 dakikadan fazla zaman geçtiyse veya hiç güncellenmemişse
            // (1 dakika yeterli, çünkü login() ve signInWithGoogle() zaten güncelliyor)
            if (timeSinceLastUpdate > 1 * 60 * 1000 || lastUpdate === 0) {
              try {
                // Mevcut lastLoginAt değerini kontrol et
                const currentLastLogin = userProfile.lastLoginAt;
                let shouldUpdate = false;
                
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
                
                if (shouldUpdate) {
                  // serverTimestamp() kullanarak sunucu zamanını kaydet
                  await updateDoc(doc(firestore, "users", firebaseUser.uid), {
                    lastLoginAt: serverTimestamp(),
                  });
                  lastLoginUpdateTime.set(firebaseUser.uid, now);
                  
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
            
            callback(userProfile);
          } catch (error: unknown) {
            // Silinmiş kullanıcı ise çıkış yap
            if (error.message?.includes("silinmiş")) {
              try {
                await firebaseSignOut(auth);
              } catch (signOutError) {
                if (import.meta.env.DEV) {
                  if (import.meta.env.DEV) {
            console.error("Çıkış yapılırken hata:", signOutError);
          }
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
    
    // Önce roles collection'ından tanımlı rolleri al
    const { getRoles } = await import("./rolePermissionsService");
    const definedRoles = await getRoles();
    const definedRoleKeys = new Set(definedRoles.map(r => r.key));
    
    // Önce orderBy ile deneyelim (index varsa hızlı olur)
    try {
      const q = query(collection(firestore, "users"), orderBy("displayName", "asc"));
      const snapshot = await getDocs(q);
      
      const users = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          // Silinmiş kullanıcıları filtrele
          if (data.deleted === true) {
            return null;
          }
          
          // Kullanıcının rolleri sadece tanımlı rollerden olsun
          const userRoles = (data.role || []) as string[];
          const validRoles = userRoles.filter(role => definedRoleKeys.has(role));
          const finalRoles = validRoles.length > 0 ? validRoles : ["personnel"];
          
          // Eğer roller değiştiyse, veritabanını güncelle (async, await etmeden)
          if (JSON.stringify(userRoles) !== JSON.stringify(finalRoles)) {
            updateDoc(doc.ref, { role: finalRoles }).catch(err => {
              console.error(`Error syncing roles for user ${doc.id}:`, err);
            });
          }
          
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
      
      return users;
    } catch (orderByError: unknown) {
      // Index hatası varsa orderBy olmadan al
      console.warn("OrderBy failed, fetching without order:", orderByError?.message || orderByError);
      // Önce roles collection'ından tanımlı rolleri al
      const { getRoles } = await import("./rolePermissionsService");
      const definedRoles = await getRoles();
      const definedRoleKeys = new Set(definedRoles.map(r => r.key));
      
      const snapshot = await getDocs(collection(firestore, "users"));
      const users = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          // Silinmiş kullanıcıları filtrele
          if (data.deleted === true) {
            return null;
          }
          
          // Kullanıcının rolleri sadece tanımlı rollerden olsun
          const userRoles = (data.role || []) as string[];
          const validRoles = userRoles.filter(role => definedRoleKeys.has(role));
          
          // Eğer hiç geçerli rol yoksa, varsayılan rol ekle
          const finalRoles = validRoles.length > 0 ? validRoles : ["personnel"];
          
          // Eğer roller değiştiyse, veritabanını güncelle
          if (JSON.stringify(userRoles) !== JSON.stringify(finalRoles)) {
            // Async olarak güncelle (await etmeden)
            updateDoc(doc.ref, { role: finalRoles }).catch(err => {
              console.error(`Error syncing roles for user ${doc.id}:`, err);
            });
          }
          
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
      
      // Client-side sorting
      return users.sort((a, b) => {
        const nameA = (a.displayName || a.fullName || "").toLowerCase();
        const nameB = (b.displayName || b.fullName || "").toLowerCase();
        return nameA.localeCompare(nameB, "tr");
      });
    }
  } catch (error: unknown) {
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
            console.error("Çıkış yapılırken hata:", signOutError);
          }
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
    
    // Check if user profile exists, create if not
    try {
      let userProfile = await getUserProfile(firebaseUser.uid);
      
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
      
      const updatedProfile = await getUserProfile(firebaseUser.uid);
      if (updatedProfile) {
        userProfile = updatedProfile;
      }

      // Giriş logunu kaydet
      try {
        const loginTime = new Date().toISOString();
        await logAudit("UPDATE", "user_logins", firebaseUser.uid, firebaseUser.uid, 
          { lastLoginAt: oldLastLoginAt ? (oldLastLoginAt instanceof Timestamp ? oldLastLoginAt.toDate().toISOString() : String(oldLastLoginAt)) : null }, 
          { lastLoginAt: loginTime, action: "LOGIN", method: "GOOGLE", email: firebaseUser.email, userId: firebaseUser.uid, timestamp: loginTime }
        );
      } catch (logError) {
        console.error("Giriş logu kaydedilirken hata:", logError);
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
      
      return {
        success: true,
        user: newUserProfile as UserProfile,
      };
    }
  } catch (error: unknown) {
    console.error("Google Sign-In error:", error);
    let errorMessage = "Google ile giriş başarısız";
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = "Google giriş penceresi kapatıldı.";
    } else if (error.message) {
      errorMessage = error.message;
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
    await sendEmailVerification(user);
    return { success: true, message: "Doğrulama e-postası gönderildi" };
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Send verification email error:", error);
    }
    return {
      success: false,
      message: error.message || "Doğrulama e-postası gönderilemedi",
    };
  }
};

/**
 * Kullanıcıyı tamamen sil (sadece super_admin)
 * - Firebase Auth'dan siler
 * - Firestore users collection'ından siler
 * - Tüm logları siler
 * - Görevlerden kullanıcıyı çıkarır
 * - Eğer göreve kimse kalmamışsa havuza alır
 */
export const deleteUser = async (userId: string, deletedBy: string): Promise<void> => {
  try {
    if (!auth || !firestore) {
      throw new Error("Firebase is not initialized");
    }

    // Kullanıcı profilini al
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      throw new Error("Kullanıcı bulunamadı");
    }

    // Silen kişinin yetkisini kontrol et (super_admin olmalı)
    const deleterProfile = await getUserProfile(deletedBy);
    if (!deleterProfile || (!deleterProfile.role?.includes("super_admin") && !deleterProfile.role?.includes("main_admin"))) {
      throw new Error("Kullanıcı silme yetkiniz yok. Sadece ana yöneticiler kullanıcı silebilir.");
    }

    // Kendini silmeye çalışıyorsa engelle
    if (userId === deletedBy) {
      throw new Error("Kendi hesabınızı silemezsiniz.");
    }

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
    await updateDoc(userRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: deletedBy,
      email: `deleted_${Date.now()}_${userProfile.email}`, // Email'i değiştir ki tekrar kayıt olamasın
      displayName: "Silinmiş Kullanıcı",
      fullName: "Silinmiş Kullanıcı",
      phone: null,
      role: [],
      departmentId: null,
      pendingTeams: [],
      approvedTeams: [],
      teamLeaderIds: [],
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

  } catch (error: unknown) {
    console.error("Delete user error:", error);
    throw error;
  }
};


