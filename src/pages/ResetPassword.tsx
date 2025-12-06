import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const inspectToken = async () => {
      if (!token || !userId) {
        setError("Geçersiz bağlantı - token veya kullanıcı ID bulunamadı");
        setChecking(false);
        return;
      }

      // Token'ı kontrol etmek için backend'e istek atabiliriz
      // Şimdilik sadece userId'den email'i almak için kullanıcı bilgilerini çekelim
      try {
        // Token geçerliyse devam edebiliriz
        setEmail("E-posta adresi"); // Backend'den alınabilir ama şimdilik placeholder
        setChecking(false);
      } catch (err) {
        setError("Bu bağlantı geçersiz veya süresi dolmuş.");
        setChecking(false);
      }
    };

    inspectToken();
  }, [token, userId]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Geçersiz token");
      return;
    }

    // Validate password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      toast.error("Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Şifreler uyuşmuyor");
      return;
    }

    setResetting(true);
    try {
      // Firebase Auth password reset confirmation
      await confirmPasswordReset(auth, token, password);
      setSuccess(true);
      toast.success("Şifreniz güncellendi");
    } catch (error: any) {
      toast.error("Şifre sıfırlanamadı: " + error.message);
    }
    setResetting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle>Şifre Sıfırlama</CardTitle>
        </CardHeader>
        <CardContent>
          {checking ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Bağlantı doğrulanıyor...</p>
            </div>
          ) : error ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button asChild variant="outline">
                <Link to="/auth">Giriş sayfasına dön</Link>
              </Button>
            </div>
          ) : success ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
              </p>
              <Button asChild>
                <Link to="/auth">Giriş Yap</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleReset}>
              <div>
                <Label>E-posta</Label>
                <Input value={email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Yeni Şifre</Label>
                <PasswordInput
                  value={password}
                  minLength={8}
                  pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
                  title="Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  En az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam
                </p>
              </div>
              <div className="space-y-2">
                <Label>Yeni Şifre (Tekrar)</Label>
                <PasswordInput
                  value={confirmPassword}
                  minLength={8}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={resetting}>
                {resetting ? "Güncelleniyor..." : "Şifreyi Güncelle"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

