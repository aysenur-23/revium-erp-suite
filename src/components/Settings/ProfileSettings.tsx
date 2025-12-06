import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { TaskHistory } from "@/components/Settings/TaskHistory";
import { getUserProfile, updateFirebaseUserProfile } from "@/services/firebase/authService";
import { normalizePhone, formatPhoneForDisplay, formatPhoneInput } from "@/utils/phoneNormalizer";
import { getDepartments, DepartmentWithStats } from "@/services/firebase/departmentService";
import { Loader2, Users } from "lucide-react";

export const ProfileSettings = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Ekip yönetimi state'leri
  const [departments, setDepartments] = useState<DepartmentWithStats[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [applyingTeam, setApplyingTeam] = useState(false);
  const [userDepartmentId, setUserDepartmentId] = useState<string | null>(null);
  const [pendingTeams, setPendingTeams] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Profil ve departmanları paralel çek
        const [profile, depts] = await Promise.all([
          getUserProfile(user.id).catch((err) => {
            console.error("Profil yüklenirken hata:", err);
            return null;
          }),
          getDepartments().catch((err) => {
            console.error("Departmanlar yüklenirken hata:", err);
            return [];
          })
        ]);

        if (profile) {
          setFormData({
            fullName: profile.fullName || profile.displayName || "",
            email: profile.email || "",
            phone: formatPhoneForDisplay(profile.phone) || "",
            dateOfBirth: profile.dateOfBirth || "",
          });
          setUserDepartmentId(profile.departmentId || null);
          setPendingTeams(profile.pendingTeams || []);
        }
        setDepartments(depts || []);
      } catch (error: any) {
        console.error("Veriler yüklenirken hata:", error);
        // Hata durumunda sessizce devam et, kullanıcıya toast gösterme
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
      return;
    }

    setSaving(true);
    try {
      await updateFirebaseUserProfile(user.id, {
        fullName: formData.fullName,
        phone: normalizePhone(formData.phone),
        dateOfBirth: formData.dateOfBirth || null,
      });

      toast.success("Profil bilgileri güncellendi");
    } catch (error: any) {
      toast.error("Profil güncellenemedi: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTeam = async () => {
    if (!user?.id || !selectedTeamId) return;

    // Zaten bu ekipte mi?
    if (userDepartmentId === selectedTeamId) {
      toast.info("Zaten bu ekibin üyesisiniz.");
      return;
    }

    // Zaten başvurmuş mu?
    if (pendingTeams.includes(selectedTeamId)) {
      toast.info("Bu ekip için zaten onay bekleyen bir başvurunuz var.");
      return;
    }

    setApplyingTeam(true);
    try {
      const newPendingTeams = [...pendingTeams, selectedTeamId];
      
      await updateFirebaseUserProfile(user.id, {
        pendingTeams: newPendingTeams
      });

      setPendingTeams(newPendingTeams);
      setSelectedTeamId("");
      toast.success("Ekip başvurunuz alındı. Ekip lideri tarafından onaylanması gerekecektir.");
    } catch (error: any) {
      toast.error("Başvuru yapılamadı: " + error.message);
    } finally {
      setApplyingTeam(false);
    }
  };

  const getDepartmentName = (id: string) => {
    return departments.find(d => d.id === id)?.name || "Bilinmeyen Ekip";
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Profil Bilgileri</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Kişisel bilgilerinizi güncelleyin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm sm:text-base">Ad Soyad</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="min-h-[44px] sm:min-h-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted min-h-[44px] sm:min-h-0"
              />
              <p className="text-xs text-muted-foreground">E-posta adresi değiştirilemez</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm sm:text-base">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  const input = e.target;
                  const cursorPos = input.selectionStart || 0;
                  const oldValue = input.value;
                  const digitsBeforeCursor = oldValue.substring(0, cursorPos).replace(/\D/g, '').length;
                  
                  const formatted = formatPhoneInput(input.value);
                  setFormData({ ...formData, phone: formatted });
                  
                  // Cursor pozisyonunu ayarla
                  setTimeout(() => {
                    let newCursorPos = formatted.length;
                    if (digitsBeforeCursor > 0) {
                      let digitCount = 0;
                      for (let i = 0; i < formatted.length; i++) {
                        if (/\d/.test(formatted[i])) {
                          digitCount++;
                          if (digitCount >= digitsBeforeCursor) {
                            newCursorPos = i + 1;
                            break;
                          }
                        }
                      }
                    }
                    input.setSelectionRange(newCursorPos, newCursorPos);
                  }, 0);
                }}
                placeholder="+90 5XX XXX XX XX"
                className="min-h-[44px] sm:min-h-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="text-sm sm:text-base">Doğum Tarihi</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                max={`${new Date().getFullYear()}-12-31`}
                min="1900-01-01"
                onChange={(e) => {
                  const value = e.target.value;
                  // Yıl kısmını kontrol et (YYYY-MM-DD formatında ilk 4 karakter)
                  if (value && value.length >= 4) {
                    const year = value.substring(0, 4);
                    // Eğer yıl 4 rakamdan fazlaysa, sadece ilk 4 rakamı al
                    if (year.length > 4) {
                      const validYear = year.substring(0, 4).replace(/\D/g, '');
                      if (validYear.length === 4) {
                        const rest = value.substring(4);
                        e.target.value = validYear + rest;
                        setFormData({ ...formData, dateOfBirth: validYear + rest });
                        return;
                      }
                    }
                  }
                  setFormData({ ...formData, dateOfBirth: value });
                }}
                className="min-h-[44px] sm:min-h-0"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="min-h-[44px] sm:min-h-0">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-5 w-5" />
            Ekip Yönetimi
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Ekip üyelik durumunuzu yönetin ve yeni ekiplere başvurun</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Mevcut Durum */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Mevcut Ekibiniz:</span>
              <div className="font-semibold text-lg">
                {userDepartmentId ? getDepartmentName(userDepartmentId) : "Henüz bir ekibe üye değilsiniz"}
              </div>
            </div>
            
            {pendingTeams.length > 0 && (
              <div className="pt-2 border-t border-border">
                <span className="text-sm font-medium text-muted-foreground">Bekleyen Başvurular:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {pendingTeams.map(teamId => (
                    <span key={teamId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                      {getDepartmentName(teamId)} (Onay Bekliyor)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Yeni Başvuru */}
          <div className="space-y-3 pt-2">
            <Label htmlFor="team-select">Ekip Başvurusu Yap</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={selectedTeamId}
                  onValueChange={setSelectedTeamId}
                >
                  <SelectTrigger id="team-select">
                    <SelectValue placeholder="Ekip seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem 
                        key={dept.id} 
                        value={dept.id}
                        disabled={userDepartmentId === dept.id || pendingTeams.includes(dept.id)}
                      >
                        {dept.name} 
                        {userDepartmentId === dept.id ? " (Mevcut)" : pendingTeams.includes(dept.id) ? " (Bekliyor)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleApplyTeam} 
                disabled={!selectedTeamId || applyingTeam}
              >
                {applyingTeam ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Başvuruluyor...
                  </>
                ) : (
                  "Başvur"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Seçtiğiniz ekibin lideri başvurunuzu onayladığında bildirim alacaksınız.
            </p>
          </div>
        </CardContent>
      </Card>

      <TaskHistory />
    </div>
  );
};
