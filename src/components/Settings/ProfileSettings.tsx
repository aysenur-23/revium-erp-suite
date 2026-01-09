import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
<<<<<<< HEAD
import { lazy, Suspense } from "react";
=======
import { TaskHistory } from "@/components/Settings/TaskHistory";
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
import { getUserProfile, updateFirebaseUserProfile } from "@/services/firebase/authService";
import { normalizePhone, formatPhoneForDisplay, formatPhoneInput } from "@/utils/phoneNormalizer";
import { getDepartments, DepartmentWithStats } from "@/services/firebase/departmentService";
import { Loader2, Users } from "lucide-react";

<<<<<<< HEAD
// Lazy load TaskHistory component (non-critical, heavy component)
const TaskHistory = lazy(() => import("@/components/Settings/TaskHistory").then(m => ({ default: m.TaskHistory })));

=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
export const ProfileSettings = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
  });
<<<<<<< HEAD
  const [loading, setLoading] = useState(false); // Başlangıçta false - placeholder data ile hızlı render
=======
  const [loading, setLoading] = useState(true);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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

<<<<<<< HEAD
      // Defer data loading: İlk render'dan 100ms sonra yükle (non-blocking)
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        // Progressive loading: Önce profil, sonra departmanlar
        const profile = await getUserProfile(user.id).catch((err) => {
          if (import.meta.env.DEV) {
            console.error("Profil yüklenirken hata:", err);
          }
          return null;
        });
=======
      try {
        // Profil ve departmanları paralel çek
        const [profile, depts] = await Promise.all([
          getUserProfile(user.id).catch((err) => {
            if (import.meta.env.DEV) {
              console.error("Profil yüklenirken hata:", err);
            }
            return null;
          }),
          getDepartments().catch((err) => {
            if (import.meta.env.DEV) {
              console.error("Departmanlar yüklenirken hata:", err);
            }
            return [];
          })
        ]);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

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
<<<<<<< HEAD
        
        // Departmanları defer et (non-critical, 200ms sonra yükle)
        setTimeout(async () => {
          try {
            const depts = await getDepartments().catch((err) => {
              if (import.meta.env.DEV) {
                console.error("Departmanlar yüklenirken hata:", err);
              }
              return [];
            });
            setDepartments(depts || []);
          } catch (error) {
            // Silently handle
          }
        }, 200);

=======
        setDepartments(depts || []);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Veriler yüklenirken hata:", error);
        }
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
      }, user.id);

      toast.success("Profil bilgileri güncellendi");
    } catch (error: unknown) {
      toast.error("Profil güncellenemedi: " + (error instanceof Error ? error.message : String(error)));
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
      
<<<<<<< HEAD
      // Ekip liderine ve yöneticilere bildirim gönder
      try {
        const { getDepartmentById } = await import("@/services/firebase/departmentService");
        const { createNotification } = await import("@/services/firebase/notificationService");
        const { getAllUsers } = await import("@/services/firebase/authService");
        const department = await getDepartmentById(selectedTeamId);
        
        if (department) {
          const requesterName = user.fullName || user.displayName || user.email || "Bir kullanıcı";
          const teamName = department.name || "ekip";
          
          const notificationPromises: Promise<void>[] = [];
          
          // Ekip liderine bildirim gönder
          if (department.managerId) {
            notificationPromises.push(
              createNotification({
                userId: department.managerId,
                type: "system",
                title: "Yeni katılım isteği",
                message: `${requesterName} "${teamName}" ekibine katılmak için istek gönderdi. İsteği onaylamak veya reddetmek için Ekip Üyeleri sayfasını ziyaret edin.`,
                read: false,
                metadata: {
                  teamId: selectedTeamId,
                  teamName: teamName,
                  requesterId: user.id,
                  requesterName: requesterName,
                  requesterEmail: user.email,
                },
              }).then(() => {}).catch(err => {
                if (import.meta.env.DEV) {
                  console.error("Error sending notification to team leader:", err);
                }
              })
            );
          }
          
          // Yöneticilere (super_admin, main_admin) bildirim gönder
          try {
            const allUsers = await getAllUsers();
            const admins = allUsers.filter(u => 
              u.role?.includes("super_admin") || u.role?.includes("main_admin")
            );
            
            for (const admin of admins) {
              notificationPromises.push(
                createNotification({
                  userId: admin.id,
                  type: "system",
                  title: "Yeni ekip katılım isteği",
                  message: `${requesterName} "${teamName}" ekibine katılmak için istek gönderdi. İsteği onaylamak veya reddetmek için Ekip Onay Yönetimi sayfasını ziyaret edin.`,
                  read: false,
                  metadata: {
                    teamId: selectedTeamId,
                    teamName: teamName,
                    requesterId: user.id,
                    requesterName: requesterName,
                    requesterEmail: user.email,
                  },
                }).then(() => {}).catch(err => {
                  if (import.meta.env.DEV) {
                    console.error(`Error sending notification to admin ${admin.id}:`, err);
                  }
                })
              );
            }
          } catch (adminError) {
            if (import.meta.env.DEV) {
              console.error("Error getting admins for notification:", adminError);
            }
          }
          
          // Tüm bildirimleri paralel gönder
          await Promise.allSettled(notificationPromises);
        }
      } catch (notifError) {
        if (import.meta.env.DEV) {
          console.error("Error sending notifications:", notifError);
=======
      // Ekip liderine bildirim ve mail gönder
      try {
        const { getDepartmentById } = await import("@/services/firebase/departmentService");
        const { createNotification } = await import("@/services/firebase/notificationService");
        const department = await getDepartmentById(selectedTeamId);
        
        if (department && department.managerId) {
          const requesterName = user.fullName || user.displayName || user.email || "Bir kullanıcı";
          const teamName = department.name || "ekip";
          
          // Bildirim oluştur
          await createNotification({
            userId: department.managerId,
            type: "system",
            title: "Yeni katılım isteği",
            message: `${requesterName} "${teamName}" ekibine katılmak için istek gönderdi. İsteği onaylamak veya reddetmek için Ekip Üyeleri sayfasını ziyaret edin.`,
            read: false,
            metadata: {
              teamId: selectedTeamId,
              teamName: teamName,
              requesterId: user.id,
              requesterName: requesterName,
              requesterEmail: user.email,
            },
          });
        }
      } catch (notifError) {
        if (import.meta.env.DEV) {
          console.error("Error sending notification to team leader:", notifError);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        }
        // Bildirim hatası başvuruyu engellemez
      }
      
      toast.success("Ekip başvurunuz alındı. Ekip lideri tarafından onaylanması gerekecektir.");
    } catch (error: unknown) {
      toast.error("Başvuru yapılamadı: " + (error instanceof Error ? error.message : String(error)));
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
          <CardTitle className="text-[14px] sm:text-[15px]">Profil Bilgileri</CardTitle>
          <CardDescription className="text-[11px] sm:text-xs">Kişisel bilgilerinizi güncelleyin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="fullName" className="text-[11px] sm:text-xs">Ad Soyad</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-[11px] sm:text-xs">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="text-[11px] sm:text-xs bg-muted min-h-[44px] sm:min-h-0"
              />
              <p className="text-[11px] sm:text-xs text-muted-foreground">E-posta adresi değiştirilemez</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="phone" className="text-[11px] sm:text-xs">Telefon</Label>
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
                className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="dateOfBirth" className="text-[11px] sm:text-xs">Doğum Tarihi</Label>
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
                className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[14px] sm:text-[15px]">
            <Users className="h-5 w-5" />
            Ekip Yönetimi
          </CardTitle>
          <CardDescription className="text-[11px] sm:text-xs">Ekip üyelik durumunuzu yönetin ve yeni ekiplere başvurun</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {/* Mevcut Durum */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div>
              <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">Mevcut Ekibiniz:</span>
              <div className="font-semibold text-lg sm:text-xl">
                {userDepartmentId ? getDepartmentName(userDepartmentId) : "Henüz bir ekibe üye değilsiniz"}
              </div>
            </div>
            
            {pendingTeams.length > 0 && (
              <div className="pt-2 border-t border-border">
                <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">Bekleyen Başvurular:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {pendingTeams.map(teamId => (
                    <span key={teamId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                      {getDepartmentName(teamId)} (Onay Bekliyor)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Yeni Başvuru */}
          <div className="space-y-3 pt-2">
            <Label htmlFor="team-select" className="text-[11px] sm:text-xs">Ekip Başvurusu Yap</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={selectedTeamId}
                  onValueChange={setSelectedTeamId}
                >
                  <SelectTrigger id="team-select" className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0">
                    <SelectValue placeholder="Ekip seçiniz" />
                  </SelectTrigger>
                  <SelectContent className="text-[11px] sm:text-xs">
                    {departments.map((dept) => (
                      <SelectItem 
                        key={dept.id} 
                        value={dept.id}
                        disabled={userDepartmentId === dept.id || pendingTeams.includes(dept.id)}
                        className="text-[11px] sm:text-xs"
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
                className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0"
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
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Seçtiğiniz ekibin lideri başvurunuzu onayladığında bildirim alacaksınız.
            </p>
          </div>
        </CardContent>
      </Card>

<<<<<<< HEAD
      <Suspense fallback={<div className="flex items-center justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
        <TaskHistory />
      </Suspense>
=======
      <TaskHistory />
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    </div>
  );
};
