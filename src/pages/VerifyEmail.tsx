import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { applyActionCode, checkActionCode, getAuth } from "firebase/auth";
import { auth, firestore } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * VerifyEmail Page
 * Firebase email doğrulama linkinden gelen parametreleri işler
 * Firebase format: ?mode=verifyEmail&oobCode=xxx&apiKey=xxx&lang=tr
 */
const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Firebase email verification parametreleri
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");
  const apiKey = searchParams.get("apiKey");

  // Eski format desteği (varsa)
  const legacyToken = searchParams.get("token");
  const legacyUserId = searchParams.get("userId");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Email doğrulanıyor...");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Firebase Auth kontrolü
        if (!auth) {
          throw new Error("Firebase Auth başlatılmadı");
        }

        // Firebase email verification parametrelerini kontrol et
        if (mode === "verifyEmail" && oobCode) {
          // Firebase doğrulama kodunu kontrol et
          try {
            const actionCodeInfo = await checkActionCode(auth, oobCode);

            if (import.meta.env.DEV) {
              console.log("Action code info:", actionCodeInfo);
            }

            // Doğrulama kodunu uygula
            await applyActionCode(auth, oobCode);

            // Firestore'daki kullanıcı profilini güncelle
            if (actionCodeInfo.data?.email && firestore) {
              try {
                // Email ile kullanıcıyı bul
                const { collection, query, where, getDocs } = await import("firebase/firestore");
                const usersRef = collection(firestore, "users");
                const q = query(usersRef, where("email", "==", actionCodeInfo.data.email));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                  const userDoc = querySnapshot.docs[0];
                  await updateDoc(doc(firestore, "users", userDoc.id), {
                    emailVerified: true,
                    needsEmailVerification: false,
                    updatedAt: serverTimestamp(),
                  });

                  if (import.meta.env.DEV) {
                    console.log("Firestore email doğrulama güncellendi:", userDoc.id);
                  }
                }
              } catch (firestoreError) {
                // Firestore güncelleme hatası kritik değil, devam et
                if (import.meta.env.DEV) {
                  console.warn("Firestore güncelleme hatası:", firestoreError);
                }
              }
            }

            // Başarılı
            setStatus("success");
            setMessage("E-posta adresiniz başarıyla doğrulandı!");
            toast.success("E-posta doğrulaması tamamlandı!");

            // 3 saniye sonra giriş sayfasına yönlendir
            setTimeout(() => {
              navigate("/auth", {
                state: {
                  emailVerified: true,
                  message: "E-posta adresiniz doğrulandı. Şimdi giriş yapabilirsiniz."
                }
              });
            }, 3000);

          } catch (codeError: unknown) {
            const errorObj = codeError as { code?: string; message?: string };
            const code = errorObj?.code || "unknown";

            if (import.meta.env.DEV) {
              console.error("Email doğrulama hatası:", codeError);
            }

            setErrorCode(code);

            // Hata mesajlarını Türkçeleştir
            let errorMessage = "Email doğrulama başarısız oldu.";

            switch (code) {
              case "auth/expired-action-code":
                errorMessage = "Doğrulama bağlantısının süresi dolmuş. Lütfen yeni bir doğrulama e-postası isteyin.";
                break;
              case "auth/invalid-action-code":
                errorMessage = "Doğrulama bağlantısı geçersiz veya daha önce kullanılmış. Lütfen yeni bir doğrulama e-postası isteyin.";
                break;
              case "auth/user-disabled":
                errorMessage = "Bu hesap devre dışı bırakılmış. Lütfen yöneticiye başvurun.";
                break;
              case "auth/user-not-found":
                errorMessage = "Kullanıcı bulunamadı. Hesap silinmiş olabilir.";
                break;
              default:
                errorMessage = `Email doğrulama hatası: ${errorObj?.message || code}`;
            }

            setStatus("error");
            setMessage(errorMessage);
          }
        }
        // Şifre sıfırlama modu
        else if (mode === "resetPassword" && oobCode) {
          // Şifre sıfırlama sayfasına yönlendir
          navigate(`/reset-password?oobCode=${oobCode}`);
        }
        // Eski format veya geçersiz parametreler
        else if (legacyToken && legacyUserId) {
          // Eski format - artık desteklenmiyor
          setStatus("error");
          setMessage("Bu doğrulama bağlantısı eski formatta. Lütfen e-posta adresinize gönderilen en son doğrulama bağlantısını kullanın.");
        }
        // Hiç parametre yok
        else {
          setStatus("error");
          setMessage("Geçersiz doğrulama bağlantısı. Lütfen e-posta adresinize gönderilen doğrulama bağlantısını kullanın.");
        }

      } catch (error: unknown) {
        const errorObj = error as { code?: string; message?: string };

        if (import.meta.env.DEV) {
          console.error("Verification error:", error);
        }

        setStatus("error");
        setMessage(errorObj?.message || "Doğrulama sırasında bir hata oluştu.");
      }
    };

    verifyEmail();
  }, [mode, oobCode, apiKey, legacyToken, legacyUserId, navigate]);

  const handleGoToAuth = () => {
    navigate("/auth");
  };

  const handleResendVerification = async () => {
    navigate("/auth", {
      state: {
        needsResend: true,
        message: "Yeni doğrulama e-postası göndermek için lütfen giriş yapın."
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <Card className="max-w-md w-full shadow-xl border-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">E-posta Doğrulama</CardTitle>
          <CardDescription>
            {status === "loading" && "E-posta adresiniz doğrulanıyor..."}
            {status === "success" && "Doğrulama tamamlandı!"}
            {status === "error" && "Doğrulama başarısız"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Loading State */}
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground text-center">{message}</p>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium text-green-600 dark:text-green-400">{message}</p>
                <p className="text-sm text-muted-foreground">
                  Giriş sayfasına yönlendiriliyorsunuz...
                </p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Yönlendiriliyor...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-full bg-destructive/10 p-3">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-destructive">{message}</p>
                {errorCode && (
                  <p className="text-xs text-muted-foreground">
                    Hata kodu: {errorCode}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                {(errorCode === "auth/expired-action-code" || errorCode === "auth/invalid-action-code") && (
                  <Button
                    onClick={handleResendVerification}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Yeni E-posta Gönder
                  </Button>
                )}
                <Button onClick={handleGoToAuth} className="flex-1">
                  Giriş Sayfasına Dön
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
