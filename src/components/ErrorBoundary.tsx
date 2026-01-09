import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Production'da da kritik hataları logla (ama detaylı bilgi verme)
    if (!import.meta.env.DEV) {
      console.error('Uygulama hatası:', error.message);
    }

    // Hata raporlama servisine gönder (gelecekte eklenebilir)
    // reportErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const solutionTips = [
        "Sayfayı yenile ve tekrar dene",
        "Tarayıcı önbelleğini temizle",
        "Ana sayfaya dönüp baştan başla",
        "Sorun devam ederse yöneticiye bildir"
      ];

      return (
        <div 
          className="bg-background" 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            zIndex: 9999
          }}
        >
          <div className="min-h-full py-8 px-4">
            <div className="max-w-4xl mx-auto w-full">
              <Card className="w-full border shadow-sm">
              <CardHeader className="text-center pb-3">
                <div className="flex justify-center mb-3">
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>
                <CardTitle className="text-xl font-semibold mb-2">
                  Oops! Bir şeyler ters gitti
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Beklenmedik bir hata oluştu.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
              {/* Ayşenur Aslan'a Özel Mesaj */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-500 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">
                      📸 Ekran Görüntüsü Alın!
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                      <strong>Ayşenur Aslan</strong>'a bu ekran görüntüsünü iletirsen bu sorun hallolacak. 
                      Lütfen aşağıdaki hata detaylarının tamamını ekran görüntüsüne dahil et.
                    </p>
                  </div>
                </div>
              </div>

              {/* Hata Detayları */}
              {this.state.error && (
                <div className="bg-muted/50 border rounded-lg p-3">
                  <p className="text-xs font-semibold text-foreground mb-2">Hata Detayları:</p>
                  
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">Ad:</span>
                      <span className="text-xs font-mono text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">{this.state.error.name}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-foreground">Mesaj:</span>
                      <span className="text-xs text-muted-foreground flex-1 break-words">{this.state.error.message}</span>
                    </div>
                  </div>
                  
                  {this.state.error.stack && (
                    <div className="space-y-1 pt-2 border-t">
                      <span className="text-xs font-medium text-foreground">Stack:</span>
                      <pre className="text-xs font-mono text-muted-foreground bg-background p-2 rounded border break-words max-h-96 overflow-auto">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {this.state.errorInfo && (
                    <div className="space-y-1 pt-2 border-t">
                      <span className="text-xs font-medium text-foreground">Component Stack:</span>
                      <pre className="text-xs font-mono text-muted-foreground bg-background p-2 rounded border break-words max-h-96 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Aksiyon butonları - Hata detaylarının altında, scroll ile görünecek */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button
                  onClick={this.handleGoHome}
                  className="flex-1 gap-2"
                  size="default"
                >
                  <Home className="h-4 w-4" />
                  <span>Ana Sayfaya Dön</span>
                </Button>
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex-1 gap-2"
                  size="default"
                >
                  <Wrench className="h-4 w-4" />
                  <span>Tekrar Dene</span>
                </Button>
                <Button
                  onClick={this.handleReload}
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
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
