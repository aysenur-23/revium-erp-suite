<<<<<<< HEAD
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, AlertCircle, CheckCircle2, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sendVerificationEmail } from "@/services/firebase/authService";
import { auth } from "@/lib/firebase";

/**
 * VerifyEmailPrompt Page
 * Email doğrulaması yapılmamış kullanıcılar için yönlendirme sayfası
 * Kullanıcıya email doğrulaması yapması gerektiğini bildirir
 */
=======
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sendVerificationEmail } from "@/services/firebase/authService";

>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
const VerifyEmailPrompt = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
<<<<<<< HEAD
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [checkingVerification, setCheckingVerification] = useState(false);

=======
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  // Location state'ten email ve message al
  const stateEmail = location.state && typeof location.state === 'object' && 'email' in location.state && typeof location.state.email === 'string' ? location.state.email : undefined;
  const stateMessage = location.state && typeof location.state === 'object' && 'message' in location.state && typeof location.state.message === 'string' ? location.state.message : undefined;

<<<<<<< HEAD
  // Email doğrulama durumunu kontrol et
  const checkEmailVerification = useCallback(async () => {
    if (!auth?.currentUser) return;

    setCheckingVerification(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        toast.success("E-posta adresiniz doğrulandı!");
        navigate("/");
      } else {
        toast.info("E-posta henüz doğrulanmadı. Lütfen e-postanızı kontrol edin.");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Email doğrulama kontrolü hatası:", error);
      }
      toast.error("Doğrulama durumu kontrol edilemedi. Lütfen tekrar deneyin.");
    } finally {
      setCheckingVerification(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Location state'ten mesaj varsa göster
    if (stateMessage) {
      toast.info(stateMessage);
    }

    // Eğer kullanıcı yoksa auth sayfasına yönlendir
=======
  useEffect(() => {
    // Location state'ten mesaj varsa göster
    if (stateMessage) {
      setMessage(stateMessage);
      toast.info(stateMessage);
    }
    
    // Eğer kullanıcı yoksa veya e-posta zaten doğrulanmışsa ana sayfaya yönlendir
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    if (!user) {
      navigate("/auth");
      return;
    }
<<<<<<< HEAD

    // Eğer email zaten doğrulanmışsa ana sayfaya yönlendir
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    if (user.emailVerified) {
      navigate("/");
      return;
    }
<<<<<<< HEAD

    // Periyodik olarak email doğrulama durumunu kontrol et (30 saniyede bir)
    const interval = setInterval(() => {
      if (auth?.currentUser && !auth.currentUser.emailVerified) {
        auth.currentUser.reload().then(() => {
          if (auth.currentUser?.emailVerified) {
            toast.success("E-posta adresiniz doğrulandı!");
            navigate("/");
          }
        }).catch(() => {
          // Sessizce handle et
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user, navigate, stateMessage]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!user || resending || resendCooldown > 0) return;

    setResending(true);
    setResendSuccess(false);
    try {
      const result = await sendVerificationEmail();
      if (result.success) {
        setResendSuccess(true);
        setResendCooldown(60); // 60 saniye bekleme süresi
        toast.success("Doğrulama e-postası tekrar gönderildi!");
      } else {
        toast.error(result.message || "E-posta gönderilemedi");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("E-posta gönderilemedi: " + errorMessage);
=======
  }, [user, navigate, stateMessage]);

  const handleResendVerification = async () => {
    if (!user) return;
    
    setResending(true);
    try {
      await sendVerificationEmail();
      toast.success("Doğrulama e-postası tekrar gönderildi. Lütfen e-posta kutunuzu kontrol edin.");
      setMessage(null);
    } catch (error: unknown) {
      toast.error("E-posta gönderilemedi: " + (error instanceof Error ? error.message : String(error)));
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

<<<<<<< HEAD
  if (!user) {
    return null;
  }

  // Email zaten doğrulanmışsa null döndür (yönlendirme useEffect'te yapılıyor)
  if (user.emailVerified) {
=======
  if (!user || user.emailVerified) {
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return null;
  }

  return (
<<<<<<< HEAD
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <Card className="max-w-md w-full shadow-xl border-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">E-posta Doğrulaması Gerekli</CardTitle>
          <CardDescription className="text-base">
            Hesabınızı kullanmaya devam etmek için e-posta adresinizi doğrulamanız gerekiyor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Success State */}
          {resendSuccess && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">Doğrulama e-postası gönderildi!</p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Lütfen e-posta kutunuzu veya spam klasörünüzü kontrol edin.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Email Info */}
=======
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>E-posta Doğrulaması Gerekli</CardTitle>
          <CardDescription>
            Hesabınızı kullanmaya devam etmek için e-posta adresinizi doğrulamanız gerekiyor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-900">{message}</p>
              </div>
            </div>
          )}
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">E-posta adresinize gönderilen doğrulama bağlantısına tıklayın.</p>
                <p className="text-xs text-muted-foreground">
<<<<<<< HEAD
                  E-posta adresi: <span className="font-medium text-foreground">{stateEmail || user?.email}</span>
=======
                  E-posta adresi: <span className="font-medium">{stateEmail || user?.email}</span>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                </p>
              </div>
            </div>
          </div>

<<<<<<< HEAD
          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Check Verification Button */}
            <Button
              onClick={checkEmailVerification}
              disabled={checkingVerification}
              variant="default"
              className="w-full"
            >
              {checkingVerification ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kontrol ediliyor...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Doğrulamayı Kontrol Et
                </>
              )}
            </Button>

            {/* Resend Email Button */}
            <Button
              onClick={handleResendVerification}
              disabled={resending || resendCooldown > 0}
              variant="outline"
=======
          <div className="space-y-2">
            <Button
              onClick={handleResendVerification}
              disabled={resending}
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              className="w-full"
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gönderiliyor...
                </>
<<<<<<< HEAD
              ) : resendCooldown > 0 ? (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Tekrar Gönder ({resendCooldown}s)
                </>
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Doğrulama E-postasını Tekrar Gönder
                </>
              )}
            </Button>
<<<<<<< HEAD

            {/* Logout Button */}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
=======
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full"
            >
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              Çıkış Yap
            </Button>
          </div>

<<<<<<< HEAD
          {/* Help Text */}
          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-center text-muted-foreground">
              E-postayı bulamadınız mı? Spam veya gereksiz klasörünü kontrol edin.
            </p>
            <p className="text-xs text-center text-muted-foreground">
              E-posta doğrulandıktan sonra "Doğrulamayı Kontrol Et" butonuna tıklayın veya sayfayı yenileyin.
=======
          <div className="pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              E-postayı bulamadınız mı? Spam klasörünü kontrol edin veya yukarıdaki butona tıklayarak tekrar gönderin.
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailPrompt;
<<<<<<< HEAD
=======

>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
