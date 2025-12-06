import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

// Email verification flag - Email doğrulaması zorunlu
const REQUIRE_EMAIL_VERIFICATION = true;

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (REQUIRE_EMAIL_VERIFICATION && user && !user.emailVerified) {
      // E-posta doğrulanmamışsa doğrulama sayfasına yönlendir
      navigate("/verify-email-prompt");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Yükleniyor...</p>
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
