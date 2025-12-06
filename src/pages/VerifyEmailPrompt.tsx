import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sendVerificationEmail } from "@/services/firebase/authService";

const VerifyEmailPrompt = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // Location state'ten email ve message al
  const stateEmail = (location.state as any)?.email;
  const stateMessage = (location.state as any)?.message;

  useEffect(() => {
    // Location state'ten mesaj varsa göster
    if (stateMessage) {
      setMessage(stateMessage);
      toast.info(stateMessage);
    }
    
    // Eğer kullanıcı yoksa veya e-posta zaten doğrulanmışsa ana sayfaya yönlendir
    if (!user) {
      navigate("/auth");
      return;
    }
    if (user.emailVerified) {
      navigate("/");
      return;
    }
  }, [user, navigate, stateMessage]);

  const handleResendVerification = async () => {
    if (!user) return;
    
    setResending(true);
    try {
      await sendVerificationEmail();
      toast.success("Doğrulama e-postası tekrar gönderildi. Lütfen e-posta kutunuzu kontrol edin.");
      setMessage(null);
    } catch (error: any) {
      toast.error("E-posta gönderilemedi: " + error.message);
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!user || user.emailVerified) {
    return null;
  }

  return (
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
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">E-posta adresinize gönderilen doğrulama bağlantısına tıklayın.</p>
                <p className="text-xs text-muted-foreground">
                  E-posta adresi: <span className="font-medium">{stateEmail || user?.email}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleResendVerification}
              disabled={resending}
              className="w-full"
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Doğrulama E-postasını Tekrar Gönder
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full"
            >
              Çıkış Yap
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              E-postayı bulamadınız mı? Spam klasörünü kontrol edin veya yukarıdaki butona tıklayarak tekrar gönderin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailPrompt;

