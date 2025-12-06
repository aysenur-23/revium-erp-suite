import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw, Rocket, Zap, Camera, Wrench } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Subtle background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="w-full max-w-2xl border-2 shadow-2xl bg-background/98 backdrop-blur-sm relative z-10 max-h-[95vh] flex flex-col">
        <CardHeader className="text-center pb-3 flex-shrink-0">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="rounded-full p-6 bg-gradient-to-br from-blue-100 via-indigo-100 to-slate-100 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-slate-900/30 border-4 border-blue-200/50 dark:border-blue-800/50 shadow-lg">
                <AlertTriangle className="h-12 w-12 text-orange-500 dark:text-orange-400" />
              </div>
              <div className="absolute -top-1 -right-1">
                <div className="rounded-full p-1.5 bg-yellow-100 dark:bg-yellow-900/30 shadow-md">
                  <Zap className="h-4 w-4 text-yellow-500 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          
          <CardTitle className="text-2xl sm:text-3xl font-extrabold mb-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-600 bg-clip-text text-transparent">
            {errorTitle}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-muted-foreground">
            {errorMessage}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3 flex-1 overflow-y-auto min-h-0">
          {/* Hata Detayları - SS için önemli */}
          <div className="bg-muted/60 border-2 border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-full p-1.5 bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-bold text-foreground">Hata Detayları:</p>
            </div>
            
            {isRouteErrorResponse(error) && (
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground min-w-[80px]">Hata Kodu:</span>
                  <span className="text-xs font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded">{error.status}</span>
                  <span className="text-xs text-muted-foreground">{error.statusText}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground min-w-[80px]">Hata Türü:</span>
                  <span className="text-xs text-muted-foreground">
                    {error.status === 404 ? "Sayfa Bulunamadı" : 
                     error.status === 403 ? "Erişim Reddedildi" : 
                     error.status === 500 ? "Sunucu Hatası" : 
                     "Bilinmeyen Hata"}
                  </span>
                </div>
                {error.data && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-foreground min-w-[80px]">Ek Bilgi:</span>
                    <span className="text-xs text-muted-foreground flex-1 break-words line-clamp-2">{JSON.stringify(error.data)}</span>
                  </div>
                )}
              </div>
            )}
            
            {errorDetails && (
              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Hata Mesajı:</span>
                </div>
                <div className="text-xs font-mono text-muted-foreground bg-background/80 p-2 rounded border break-words line-clamp-3">
                  {errorDetails}
                </div>
              </div>
            )}
            
            {error instanceof Error && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground min-w-[80px]">Hata Adı:</span>
                  <span className="text-xs font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded">{error.name}</span>
                </div>
                {error.stack && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-foreground">Stack Trace:</span>
                    <pre className="text-xs font-mono text-muted-foreground bg-background/80 p-2 rounded border break-words line-clamp-4">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {!errorDetails && !isRouteErrorResponse(error) && !(error instanceof Error) && (
              <div className="text-xs text-muted-foreground italic">
                Hata detayı mevcut değil.
              </div>
            )}
          </div>

          {/* Aksiyon butonları */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 flex-shrink-0">
            <Button
              onClick={handleGoHome}
              className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
              size="default"
            >
              <Home className="h-4 w-4" />
              <span className="font-semibold text-sm">Ana Sayfaya Dön</span>
              <Rocket className="h-3 w-3 animate-bounce" />
            </Button>
            <Button
              onClick={handleReload}
              variant="outline"
              className="flex-1 gap-2 border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all duration-300 transform hover:scale-105 active:scale-95"
              size="default"
            >
              <RefreshCw className="h-4 w-4 animate-spin" style={{ animationDuration: '2s' }} />
              <span className="font-semibold text-sm">Sayfayı Yenile</span>
            </Button>
          </div>

          {/* Ayşenur notu - SS için önemli */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-slate-900/20 rounded-xl p-4 border-2 border-dashed border-blue-200 dark:border-blue-800 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900/30 shadow-sm flex-shrink-0">
                <Camera className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  Bu sayfanın ekran görüntüsünü <span className="font-bold text-blue-600 dark:text-blue-400">Ayşenur Aslan</span>'a göndermelisin. 
                  Yukarıdaki <span className="font-semibold text-blue-600 dark:text-blue-400">detaylı hata bilgileri</span> sayesinde sorunu hızlıca çözebilir! 📸
                </p>
              </div>
            </div>
          </div>

          {/* Komik mesaj */}
          <div className="text-center pt-2 flex-shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/50">
              <Wrench className="h-3 w-3 text-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">Teknik ekibimiz sorunu çözüyor! 🔧</span>
              <Zap className="h-3 w-3 text-yellow-500 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

