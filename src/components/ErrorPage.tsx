import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export const ErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  
  let errorTitle = "Oops! Bir şeyler ters gitti";
  let errorMessage = "Beklenmedik bir hata oluştu. Endişelenme, hemen düzeltiyoruz!";
  let errorDetails: string | null = null;
  let solutionTips: string[] = [];
  
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      errorTitle = "404 - Sayfa Bulunamadı";
      errorMessage = "Aradığın sayfa burada değil. Belki taşınmış olabilir?";
      solutionTips = [
        "Ana sayfaya dönüp tekrar deneyebilirsin",
        "URL'yi kontrol edip doğru olduğundan emin ol",
        "Sayfayı yenileyip tekrar dene"
      ];
    } else if (error.status === 403) {
      errorTitle = "403 - Erişim Reddedildi";
      errorMessage = "Bu sayfaya erişim yetkin yok. Gerekli izinlere sahip değilsin.";
      solutionTips = [
        "Giriş yaptığından emin ol",
        "Gerekli yetkilere sahip olduğunu kontrol et",
        "Yönetici ile iletişime geç"
      ];
    } else if (error.status === 500) {
      errorTitle = "500 - Sunucu Hatası";
      errorMessage = "Sunucu biraz yorulmuş gibi görünüyor. Biraz bekleyip tekrar deneyebilirsin!";
      solutionTips = [
        "Birkaç saniye bekleyip sayfayı yenile",
        "İnternet bağlantını kontrol et",
        "Sorun devam ederse yöneticiye bildir"
      ];
    } else {
      errorTitle = `${error.status} - Hata Oluştu`;
      errorMessage = error.statusText || "Bir şeyler ters gitti. Teknik ekibimiz devrede!";
      solutionTips = [
        "Sayfayı yenile ve tekrar dene",
        "Ana sayfaya dönüp baştan başla",
        "Sorun devam ederse destek ekibi ile iletişime geç"
      ];
    }
    errorDetails = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    errorDetails = error.message;
    solutionTips = [
      "Sayfayı yenile ve tekrar dene",
      "Tarayıcı önbelleğini temizle",
      "Sorun devam ederse yöneticiye bildir"
    ];
  }

  const handleGoHome = () => {
    navigate("/");
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl border shadow-sm">
        <CardHeader className="text-center pb-3">
          <div className="flex justify-center mb-3">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-xl font-semibold mb-2">
            {errorTitle}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {errorMessage}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Hata Detayları */}
          <div className="bg-muted/50 border rounded-lg p-3">
            <p className="text-xs font-semibold text-foreground mb-2">Hata Detayları:</p>
            
            {isRouteErrorResponse(error) && (
              <div className="space-y-1 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">Kod:</span>
                  <span className="text-xs font-mono text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">{error.status}</span>
                </div>
              </div>
            )}
            
            {errorDetails && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-foreground">Mesaj:</span>
                <div className="text-xs font-mono text-muted-foreground bg-background p-2 rounded border break-words">
                  {errorDetails}
                </div>
              </div>
            )}
            
            {error instanceof Error && (
              <div className="space-y-1 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">Ad:</span>
                  <span className="text-xs font-mono text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">{error.name}</span>
                </div>
                {error.stack && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-foreground">Stack:</span>
                    <pre className="text-xs font-mono text-muted-foreground bg-background p-2 rounded border break-words max-h-32 overflow-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Aksiyon butonları */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleGoHome}
              className="flex-1 gap-2"
              size="default"
            >
              <Home className="h-4 w-4" />
              <span>Ana Sayfaya Dön</span>
            </Button>
            <Button
              onClick={handleReload}
              variant="outline"
              className="flex-1 gap-2"
              size="default"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Sayfayı Yenile</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

