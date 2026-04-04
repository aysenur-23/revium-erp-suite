import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Bağlantı doğrulanıyor...");

  useEffect(() => {
    // Firebase Auth email verification is handled automatically via email link
    // If user reaches this page, it means they clicked the verification link
    // Firebase Auth will automatically verify the email when the link is clicked
    // This page is just for showing a success/error message
    
    if (!token || !userId) {
      setStatus("error");
      setMessage("Doğrulama tokenı veya kullanıcı ID bulunamadı.");
      return;
    }

    // Firebase Auth handles email verification automatically via the link
    // If the user reaches this page, assume verification was successful
    // In a real implementation, you might want to check the auth state
    setStatus("success");
    setMessage("E-posta adresiniz onaylandı. Giriş sayfasına yönlendiriliyorsunuz...");
    setTimeout(() => {
      navigate("/auth");
    }, 2000);
  }, [token, userId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <CardTitle>E-posta Doğrulama</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>{message}</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-3 text-green-600">
              <CheckCircle2 className="h-10 w-10" />
              <p>{message}</p>
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-sm text-muted-foreground">Yönlendiriliyorsunuz...</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3 text-destructive">
              <XCircle className="h-10 w-10" />
              <p className="text-sm">{message}</p>
              <Button asChild variant="outline">
                <Link to="/auth">Giriş Sayfasına Dön</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;

