import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Mail, Lock, User, Phone, Calendar, ArrowLeft, Loader2, Users } from "lucide-react";
import logo from "@/assets/rev-logo.png";
import { getDepartments } from "@/services/firebase/departmentService";
import { normalizePhone, formatPhoneInput } from "@/utils/phoneNormalizer";

const Auth = () => {
  const { signIn, signInWithGoogle, signUp, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [phoneValue, setPhoneValue] = useState<string>("+90 5");

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const depts = await getDepartments();
        if (depts.length > 0) {
          setDepartments(depts.map(d => ({ id: d.id, name: d.name })));
        } else {
          // Eğer departments boşsa, varsayılan departments'ı kullan (sessizce)
          setDepartments([
            { id: "mechanic", name: "Mekanik Ekip" },
            { id: "electric", name: "Elektrik Ekibi" },
            { id: "software", name: "Yazılım Ekibi" }
          ]);
        }
      } catch (error: any) {
        // getDepartments artık hata fırlatmıyor, boş array döndürüyor
        // Varsayılan departments'ı kullan (sessizce)
        setDepartments([
          { id: "mechanic", name: "Mekanik Ekip" },
          { id: "electric", name: "Elektrik Ekibi" },
          { id: "software", name: "Yazılım Ekibi" }
        ]);
      }
    };
    fetchDepartments();
  }, []);

  // Auth sayfasında body scroll'unu etkinleştir
  useEffect(() => {
    // Body scroll'unu etkinleştir
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    document.documentElement.style.overflow = "auto";
    document.documentElement.style.height = "auto";
    
    return () => {
      // Cleanup: Component unmount olduğunda eski haline döndür
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
    };
  }, []);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignInLoading(true);
    setSignInError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const response = await signIn(email, password);

    if (!response.success) {
      // Email doğrulama hatası mı kontrol et
      const errorMessage = response.message || "Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.";
      
      if (errorMessage.includes("doğrulanmamış") || errorMessage.includes("doğrulama")) {
        setSignInError(errorMessage + " E-posta adresinize gönderilen doğrulama bağlantısına tıklayın. Lütfen spam kutunuzu da kontrol ediniz.");
      } else {
        setSignInError(errorMessage);
      }
      
      // Firestore permissions hatası için özel uyarı
      if (errorMessage.includes("Firestore izin hatası") || errorMessage.includes("permissions")) {
        toast.error("Firestore Security Rules hatası! Lütfen Firebase Console'da Rules'u güncelleyin.", {
          duration: 10000,
        });
      }
    } else {
      toast.success("Hoş geldiniz!");
    }
    
    setSignInLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignUpLoading(true);
    setSignUpError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;

    // Validate password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setSignUpError("Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir");
      setSignUpLoading(false);
      return;
    }

    const phone = phoneValue && phoneValue.trim() !== '+90 5' ? phoneValue.trim() : null;
    const birthDate = formData.get("birthDate") as string | null;

    // Telefon numarasını normalize et
    const normalizedPhone = phone && phone.trim() !== '' && phone.trim() !== '+90 5' ? normalizePhone(phone.trim()) : undefined;
    const birthDateValue = birthDate && birthDate.trim() !== '' ? birthDate.trim() : undefined;
    const teamIdValue = selectedTeamId && selectedTeamId.trim() !== '' ? selectedTeamId.trim() : undefined;

    const response = await signUp(email, password, fullName, normalizedPhone, birthDateValue, teamIdValue);

    if (!response.success) {
      // Hata mesajını kullanıcıya göster
      let errorMsg = response.message || "Kayıt olurken bir hata oluştu";
      
      // Hata mesajını daha açıklayıcı hale getir
      if (errorMsg.includes("Unsupported field value: undefined") || errorMsg.includes("invalid data")) {
        errorMsg = "Form verilerinde eksik veya geçersiz alanlar var. Lütfen tüm zorunlu alanları (Ad Soyad, E-posta, Şifre) doldurun ve tekrar deneyin.";
      } else if (errorMsg.includes("Form verilerinde eksik")) {
        // Zaten iyileştirilmiş mesaj, değiştirme
      } else if (errorMsg.includes("Firestore izin hatası") || errorMsg.includes("permissions")) {
        errorMsg = "Veritabanı izin hatası. Lütfen yöneticiye başvurun veya Firebase Console'da Security Rules'u kontrol edin.";
      } else if (errorMsg.includes("zaten kayıtlı") || errorMsg.includes("zaten kullanılıyor")) {
        // Email zaten kayıtlı - kullanıcıyı giriş sayfasına yönlendir
        errorMsg = errorMsg + " Giriş sayfasına geçmek için 'Zaten hesabınız var mı?' linkine tıklayın.";
      }
      
      setSignUpError(errorMsg);
      
      // Firestore permissions hatası için özel uyarı
      if (errorMsg.includes("Firestore izin hatası") || errorMsg.includes("permissions") || errorMsg.includes("Veritabanı izin hatası")) {
        toast.error("Firestore Security Rules hatası! Lütfen Firebase Console'da Rules'u güncelleyin.", {
          duration: 10000,
        });
      }
    } else {
      // Kayıt başarılı - email doğrulaması gerekiyor
      setSignUpError(null);
      
      // Formu temizle
      try {
        const form = e.currentTarget;
        if (form) {
          form.reset();
        }
        setPhoneValue("+90 5");
        setSelectedTeamId("");
      } catch (error) {
        console.warn("Form reset hatası:", error);
      }
      
      // Başarı mesajı ve bilgilendirme
      toast.success(
        "Kayıt başarılı! E-posta adresinize gönderilen doğrulama bağlantısına tıklayın. Lütfen spam kutunuzu da kontrol ediniz.",
        { duration: 8000 }
      );
      
      // Email doğrulaması bilgilendirmesi
      toast.info(
        "E-posta adresinize gönderilen doğrulama bağlantısına tıklayarak hesabınızı aktifleştirin. Lütfen spam kutunuzu da kontrol ediniz. Doğrulama yapmadan giriş yapamazsınız.",
        { duration: 10000 }
      );
      
      // Signin tab'ına geç ve bilgilendirme mesajı göster
      setTimeout(() => {
        setActiveTab("signin");
        setSignInError(null); // Önce hataları temizle
        // Kısa bir gecikme sonrası bilgilendirme mesajı göster
        setTimeout(() => {
          setSignInError("E-posta adresinizi doğrulamadan giriş yapamazsınız. Lütfen e-postanızı (spam kutusu dahil) kontrol edin ve doğrulama bağlantısına tıklayın.");
        }, 300);
      }, 1500);
    }
    
    // Her durumda loading state'i kapat
    setSignUpLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("reset-email") as string;

    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        setForgotSuccess(true);
        toast.success("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.");
      } else {
        setForgotError(result.message || "Şifre sıfırlama e-postası gönderilemedi");
      }
    } catch (error: any) {
      setForgotError(error.message || "Şifre sıfırlama başarısız");
    }

    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-start sm:items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 sm:p-6">
      <div className="w-full max-w-md my-4 sm:my-auto py-4 sm:py-6">
        <Card className="shadow-2xl border-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
          <CardHeader className="text-center px-6 pt-6 sm:pt-8 pb-4 sm:pb-6 space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
                  <img src={logo} alt="Revium ERP" className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-contain bg-white dark:bg-slate-800 p-2 shadow-lg" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Revium ERP
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Şirket içi yönetim sistemi
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 sm:pb-8">
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as typeof activeTab);
            if (value === "signup") {
              setPhoneValue("+90 5");
            }
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 rounded-lg p-1">
              <TabsTrigger 
                value="signin" 
                className="text-sm font-medium touch-manipulation min-h-[44px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all"
              >
                Giriş Yap
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="text-sm font-medium touch-manipulation min-h-[44px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all"
              >
                Kayıt Ol
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="mt-6 space-y-5">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    E-posta <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="ornek@reviumtech.com"
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Şifre <span className="text-destructive">*</span>
                  </Label>
                  <PasswordInput
                    id="signin-password"
                    name="password"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="h-11"
                  />
                </div>
                {signInError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-destructive flex-1">{signInError}</p>
                  </div>
                )}
                <Button type="submit" className="w-full h-11 text-base font-medium shadow-sm" disabled={signInLoading}>
                  {signInLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Giriş yapılıyor...
                    </>
                  ) : (
                    "Giriş Yap"
                  )}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-800 px-2 text-muted-foreground">veya</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 text-base font-medium"
                  onClick={async () => {
                    setSignInLoading(true);
                    setSignInError(null);
                    const response = await signInWithGoogle();
                    if (!response.success) {
                      setSignInError(response.message || "Google ile giriş başarısız oldu");
                      setSignInLoading(false);
                    }
                  }}
                  disabled={signInLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google ile Giriş Yap
                </Button>
                
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline touch-manipulation min-h-[44px] w-full text-center transition-colors"
                  onClick={() => {
                    setActiveTab("forgot");
                    setForgotSuccess(false);
                    setForgotError(null);
                  }}
                >
                  Şifremi Unuttum
                </button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6 space-y-5">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Ad Soyad <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder="Ad - Soyad"
                    required
                    autoComplete="name"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    E-posta <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="ornek@reviumtech.com"
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Şifre <span className="text-destructive">*</span>
                  </Label>
                  <PasswordInput
                    id="signup-password"
                    name="password"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
                    title="Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir"
                    autoComplete="new-password"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground px-1">
                    En az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone" className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Telefon
                    </Label>
                    <Input
                      id="signup-phone"
                      name="phone"
                      type="tel"
                      placeholder="+90 5XX XXX XX XX"
                      autoComplete="tel"
                      className="h-11"
                      value={phoneValue}
                      onKeyDown={(e) => {
                        const input = e.currentTarget;
                        const cursorPos = input.selectionStart || 0;
                        const prefix = "+90 5";
                        
                        // Backspace veya Delete tuşu ile prefix'i silmeyi engelle
                        if ((e.key === "Backspace" || e.key === "Delete") && cursorPos <= prefix.length) {
                          e.preventDefault();
                          return;
                        }
                        
                        // Sol ok tuşu ile prefix'in önüne geçmeyi engelle
                        if (e.key === "ArrowLeft" && cursorPos <= prefix.length) {
                          e.preventDefault();
                          input.setSelectionRange(prefix.length, prefix.length);
                          return;
                        }
                        
                        // Home tuşu ile prefix'in başına git
                        if (e.key === "Home") {
                          e.preventDefault();
                          input.setSelectionRange(prefix.length, prefix.length);
                          return;
                        }
                      }}
                      onChange={(e) => {
                        const input = e.target;
                        const cursorPos = input.selectionStart || 0;
                        const value = input.value;
                        const prefix = "+90 5";
                        
                        // Eğer prefix yoksa veya prefix'ten önce bir şey varsa, prefix'i koru
                        if (!value.startsWith(prefix)) {
                          // Sadece rakamları al
                          const digits = value.replace(/\D/g, '');
                          
                          // 90 ile başlıyorsa kaldır, 0 ile başlıyorsa kaldır
                          let number = digits;
                          if (digits.startsWith('90') && digits.length > 2) {
                            number = digits.substring(2);
                          } else if (digits.startsWith('0') && digits.length > 1) {
                            number = digits.substring(1);
                          }
                          
                          // 5 ile başlamalı, değilse sadece prefix göster
                          if (number.length > 0 && !number.startsWith('5')) {
                            setPhoneValue(prefix);
                            setTimeout(() => {
                              input.setSelectionRange(prefix.length, prefix.length);
                            }, 0);
                            return;
                          }
                          
                          // Prefix + kalan rakamları formatla
                          const remainingDigits = number.substring(1); // 5'i atla
                          const maxDigits = 9; // 5'ten sonra maksimum 9 rakam
                          const limitedDigits = remainingDigits.substring(0, maxDigits);
                          
                          let formatted = prefix;
                          if (limitedDigits.length <= 2) {
                            formatted += limitedDigits;
                          } else if (limitedDigits.length <= 5) {
                            formatted += `${limitedDigits.substring(0, 2)} ${limitedDigits.substring(2)}`;
                          } else if (limitedDigits.length <= 7) {
                            formatted += `${limitedDigits.substring(0, 2)} ${limitedDigits.substring(2, 5)} ${limitedDigits.substring(5)}`;
                          } else {
                            formatted += `${limitedDigits.substring(0, 2)} ${limitedDigits.substring(2, 5)} ${limitedDigits.substring(5, 7)} ${limitedDigits.substring(7, 9)}`;
                          }
                          
                          setPhoneValue(formatted);
                          
                          // Cursor pozisyonunu ayarla
                          setTimeout(() => {
                            let newCursorPos = formatted.length;
                            const digitsBeforeCursor = value.substring(0, cursorPos).replace(/\D/g, '').length;
                            if (digitsBeforeCursor > 1) { // 5'ten sonraki rakamlar
                              let digitCount = 1; // 5'i say
                              for (let i = prefix.length; i < formatted.length; i++) {
                                if (/\d/.test(formatted[i])) {
                                  digitCount++;
                                  if (digitCount >= digitsBeforeCursor) {
                                    newCursorPos = i + 1;
                                    break;
                                  }
                                }
                              }
                            } else {
                              newCursorPos = prefix.length;
                            }
                            input.setSelectionRange(newCursorPos, newCursorPos);
                          }, 0);
                        } else {
                          // Prefix var, sadece sonrasını işle
                          const afterPrefix = value.substring(prefix.length);
                          const digits = afterPrefix.replace(/\D/g, '');
                          const maxDigits = 9; // 5'ten sonra maksimum 9 rakam
                          const limitedDigits = digits.substring(0, maxDigits);
                          
                          let formatted = prefix;
                          if (limitedDigits.length <= 2) {
                            formatted += limitedDigits;
                          } else if (limitedDigits.length <= 5) {
                            formatted += `${limitedDigits.substring(0, 2)} ${limitedDigits.substring(2)}`;
                          } else if (limitedDigits.length <= 7) {
                            formatted += `${limitedDigits.substring(0, 2)} ${limitedDigits.substring(2, 5)} ${limitedDigits.substring(5)}`;
                          } else {
                            formatted += `${limitedDigits.substring(0, 2)} ${limitedDigits.substring(2, 5)} ${limitedDigits.substring(5, 7)} ${limitedDigits.substring(7, 9)}`;
                          }
                          
                          setPhoneValue(formatted);
                          
                          // Cursor pozisyonunu ayarla
                          setTimeout(() => {
                            const digitsBeforeCursor = afterPrefix.substring(0, cursorPos - prefix.length).replace(/\D/g, '').length;
                            let newCursorPos = prefix.length;
                            let digitCount = 0;
                            for (let i = prefix.length; i < formatted.length; i++) {
                              if (/\d/.test(formatted[i])) {
                                digitCount++;
                                if (digitCount >= digitsBeforeCursor) {
                                  newCursorPos = i + 1;
                                  break;
                                }
                              }
                            }
                            if (digitCount < digitsBeforeCursor) {
                              newCursorPos = formatted.length;
                            }
                            input.setSelectionRange(newCursorPos, newCursorPos);
                          }, 0);
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pastedText = e.clipboardData.getData('text');
                        const digits = pastedText.replace(/\D/g, '');
                        
                        // 90 ile başlıyorsa kaldır, 0 ile başlıyorsa kaldır
                        let number = digits;
                        if (digits.startsWith('90') && digits.length > 2) {
                          number = digits.substring(2);
                        } else if (digits.startsWith('0') && digits.length > 1) {
                          number = digits.substring(1);
                        }
                        
                        // 5 ile başlamalı
                        if (number.length > 0 && !number.startsWith('5')) {
                          setPhoneValue("+90 5");
                          return;
                        }
                        
                        // Prefix + kalan rakamları formatla
                        const remainingDigits = number.substring(1); // 5'i atla
                        const maxDigits = 9;
                        const limitedDigits = remainingDigits.substring(0, maxDigits);
                        
                        let formatted = "+90 5";
                        if (limitedDigits.length <= 2) {
                          formatted += limitedDigits;
                        } else if (limitedDigits.length <= 5) {
                          formatted += `${limitedDigits.substring(0, 2)} ${limitedDigits.substring(2)}`;
                        } else if (limitedDigits.length <= 7) {
                          formatted += `${limitedDigits.substring(0, 2)} ${limitedDigits.substring(2, 5)} ${limitedDigits.substring(5)}`;
                        } else {
                          formatted += `${limitedDigits.substring(0, 2)} ${limitedDigits.substring(2, 5)} ${limitedDigits.substring(5, 7)} ${limitedDigits.substring(7, 9)}`;
                        }
                        
                        setPhoneValue(formatted);
                      }}
                      onFocus={(e) => {
                        const prefix = "+90 5";
                        // Eğer cursor prefix'in önündeyse, prefix'in sonuna al
                        if (e.target.selectionStart !== null && e.target.selectionStart < prefix.length) {
                          setTimeout(() => {
                            e.target.setSelectionRange(prefix.length, prefix.length);
                          }, 0);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-birthdate" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Doğum Tarihi
                    </Label>
                    <Input
                      id="signup-birthdate"
                      name="birthDate"
                      type="date"
                      autoComplete="bday"
                      className="h-11"
                      max={`${new Date().getFullYear()}-12-31`}
                      min="1900-01-01"
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement;
                        const value = target.value;
                        // Yıl kısmını kontrol et (YYYY-MM-DD formatında ilk 4 karakter)
                        if (value && value.length >= 4) {
                          const year = value.substring(0, 4);
                          // Eğer yıl 4 rakamdan fazlaysa, sadece ilk 4 rakamı al
                          if (year.length > 4) {
                            const validYear = year.substring(0, 4).replace(/\D/g, '');
                            if (validYear.length === 4) {
                              const rest = value.substring(4);
                              target.value = validYear + rest;
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              <div className="space-y-2">
                <Label htmlFor="signup-team" className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Ekip
                </Label>
                <Select
                  value={selectedTeamId || "none"}
                  onValueChange={(value) => setSelectedTeamId(value === "none" ? "" : value)}
                >
                  <SelectTrigger id="signup-team" className="h-11">
                    <SelectValue placeholder="Ekip seçiniz (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent 
                    side="bottom" 
                    avoidCollisions={false}
                    position="popper"
                  >
                    <SelectItem value="none">Ekip seçilmedi</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground px-1">
                  Seçtiğiniz ekip lideri tarafından onaylanmanız gerekecektir
                </p>
              </div>
                {signUpError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-destructive flex-1">{signUpError}</p>
                  </div>
                )}
                <Button type="submit" className="w-full h-11 text-base font-medium shadow-sm" disabled={signUpLoading}>
                  {signUpLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kayıt olunuyor...
                    </>
                  ) : (
                    "Kayıt Ol"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="forgot" className="mt-6 space-y-5">
              {forgotSuccess ? (
                <div className="space-y-5 text-center">
                  <div className="flex justify-center">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                      <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">E-posta Gönderildi</h3>
                    <p className="text-sm text-muted-foreground">
                      Şifre sıfırlama bağlantısı e-posta adresine gönderildi. Gelen kutunu ve spam klasörünü kontrol etmeyi unutma.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setActiveTab("signin")} className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Giriş sayfasına dön
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      E-posta <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="reset-email"
                      name="reset-email"
                      type="email"
                      placeholder="ornek@reviumtech.com"
                      required
                      autoComplete="email"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground px-1">
                      Şifre sıfırlama bağlantısı e-posta adresinize gönderilecektir.
                    </p>
                  </div>
                  {forgotError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-destructive flex-1">{forgotError}</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab("signin")}
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Geri
                    </Button>
                    <Button type="submit" className="flex-1 h-11 font-medium shadow-sm" disabled={forgotLoading}>
                      {forgotLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gönderiliyor...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Gönder
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Auth;
