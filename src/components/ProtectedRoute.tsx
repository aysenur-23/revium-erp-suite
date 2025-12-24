import { ReactNode, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { REQUIRE_EMAIL_VERIFICATION } from "@/config/auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [authProviderMounted, setAuthProviderMounted] = useState(false);
  const [maxTimeoutReached, setMaxTimeoutReached] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  
  let user, loading;
  try {
    const auth = useAuth();
    user = auth.user;
    loading = auth.loading;
    // AuthProvider başarıyla mount oldu
    if (!authProviderMounted) {
      setAuthProviderMounted(true);
    }
  } catch (error: unknown) {
    // If AuthProvider is not available, show loading state
    // This can happen during initial render before providers are mounted
    if (import.meta.env.DEV) {
      console.warn("AuthProvider not available:", error instanceof Error ? error.message : String(error));
    }
    user = null;
    loading = true;
  }

  // Maksimum timeout: 10 saniye sonra hala loading ise timeout'a ulaştık
  useEffect(() => {
    if (!authProviderMounted || loading) {
      timeoutRef.current = setTimeout(() => {
        setMaxTimeoutReached(true);
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) {
            console.warn("ProtectedRoute: Maksimum timeout (10 saniye) aşıldı");
          }
        }
      }, 10000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [authProviderMounted, loading]);

  useEffect(() => {
    // AuthProvider mount olmadıysa veya timeout'a ulaştıysa auth sayfasına yönlendir
    if (maxTimeoutReached || (!authProviderMounted && !loading)) {
      navigate("/auth");
      return;
    }

    if (!loading && !user) {
      navigate("/auth");
    } else if (REQUIRE_EMAIL_VERIFICATION && user && !user.emailVerified) {
      // E-posta doğrulanmamışsa doğrulama sayfasına yönlendir
      navigate("/verify-email-prompt");
    }
  }, [user, loading, navigate, authProviderMounted, maxTimeoutReached]);

  // AuthProvider mount olmadıysa veya timeout'a ulaştıysa loading göster
  if (!authProviderMounted || maxTimeoutReached || loading) {
    // Daha hafif loading state (performans için)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <p className="text-xs text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // E-posta doğrulanmamışsa hiçbir şey gösterme (yönlendirme yapıldı) - sadece flag true ise
  if (REQUIRE_EMAIL_VERIFICATION && user && !user.emailVerified) {
    return null;
  }

  return user ? <>{children}</> : null;
};
