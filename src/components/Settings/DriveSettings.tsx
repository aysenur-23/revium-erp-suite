import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Cloud, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { authorizeDrive, isDriveAuthorized, revokeDriveAccess } from "@/services/driveService";
import { useAuth } from "@/contexts/AuthContext";

export const DriveSettings = () => {
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      setLoading(true);
      const isAuth = await isDriveAuthorized();
      setAuthorized(isAuth);
    } catch (error: any) {
      console.error("Drive authorization check error:", error);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    try {
      setAuthorizing(true);
      const success = await authorizeDrive();
      if (success) {
        setAuthorized(true);
        toast.success("Google Drive yetkilendirmesi başarılı!");
        await checkAuthorization();
      } else {
        toast.error("Google Drive yetkilendirmesi başarısız oldu");
      }
    } catch (error: any) {
      console.error("Drive authorization error:", error);
      toast.error(error?.message || "Google Drive yetkilendirmesi başarısız oldu");
      setAuthorized(false);
    } finally {
      setAuthorizing(false);
    }
  };

  const handleRevoke = async () => {
    try {
      setRevoking(true);
      await revokeDriveAccess();
      setAuthorized(false);
      toast.success("Google Drive yetkilendirmesi kaldırıldı");
      await checkAuthorization();
    } catch (error: any) {
      console.error("Drive revoke error:", error);
      toast.error(error?.message || "Google Drive yetkilendirmesi kaldırılamadı");
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Google Drive Ayarları
          </CardTitle>
          <CardDescription>
            Google Drive entegrasyonunu yönetin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Cloud className="h-5 w-5" />
          Google Drive Ayarları
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Google Drive entegrasyonunu yönetin. Dosya yüklemek için Drive yetkilendirmesi gereklidir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Durum */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {authorized ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Google Drive Yetkilendirildi</p>
                  <p className="text-sm text-muted-foreground">
                    Dosya yükleme ve silme işlemleri yapabilirsiniz
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">Google Drive Yetkilendirilmedi</p>
                  <p className="text-sm text-muted-foreground">
                    Dosya yüklemek için Drive yetkilendirmesi yapmalısınız
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Uyarı */}
        {!authorized && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Google Drive yetkilendirmesi yapılmadan dosya yükleme işlemleri çalışmayacaktır.
              Lütfen "Google ile Giriş Yap" butonuna tıklayarak Google hesabınızla giriş yapın.
              {!user && " Önce sistemde giriş yapmanız gerekiyor."}
            </AlertDescription>
          </Alert>
        )}

        {/* Butonlar */}
        <div className="flex gap-3">
          {authorized ? (
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revoking}
              className="flex-1"
            >
              {revoking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Kaldırılıyor...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Yetkilendirmeyi Kaldır
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleAuthorize}
              disabled={authorizing || !user}
              className="flex-1"
            >
              {authorizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Google ile Giriş Yapılıyor...
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4 mr-2" />
                  Google ile Giriş Yap
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={checkAuthorization}
            disabled={loading}
          >
            Yenile
          </Button>
        </div>

        {/* Bilgi */}
        <div className="text-sm text-muted-foreground space-y-2 pt-2 border-t">
          <p className="font-medium">Bilgi:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Google ile giriş yaptığınızda Drive erişimi otomatik olarak sağlanır</li>
            <li>Token'lar sadece sizin tarayıcınızda saklanır</li>
            <li>Token'lar otomatik olarak yenilenir</li>
            <li>Yetkilendirmeyi istediğiniz zaman kaldırabilirsiniz</li>
            <li>Drive yetkilendirmesi olmadan dosya yükleme yapılamaz</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

