import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Database, Bell, Lock, Activity, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAdminSettings,
  updateAdminSettings,
  AdminSettings,
} from "@/services/firebase/adminSettingsService";
import { Timestamp } from "firebase/firestore";

import { downloadDatabaseBackup } from "@/utils/backupUtils";

export const SystemSettings = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState({
    backup: false,
    restore: false,
    cleanup: false,
  });

  const { user } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getAdminSettings();
        setSettings(data);
      } catch (error: any) {
        toast.error("Sistem ayarları yüklenemedi: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveAll = async () => {
    if (!user?.id || !settings) {
      toast.error("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
      return;
    }

    setSaving(true);
    try {
      await updateAdminSettings(settings, user.id);
      toast.success("Sistem ayarları kaydedildi");
    } catch (error: any) {
      toast.error("Sistem ayarları kaydedilemedi: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBackupAction = async (
    type: "backup" | "restore" | "cleanup"
  ) => {
    if (!user?.id || !settings) return;

    setActionLoading((prev) => ({ ...prev, [type]: true }));
    try {
      if (type === "backup") {
        await downloadDatabaseBackup();
        
        // Update timestamp
        const updates: Partial<AdminSettings> = { lastBackupAt: Timestamp.now() };
        await updateAdminSettings(updates, user.id);
        setSettings((prev) => prev ? { ...prev, ...updates } : null);
      } else {
        const updates: Partial<AdminSettings> = {};
        
        if (type === "restore") {
          updates.lastRestoreRequest = Timestamp.now();
        } else if (type === "cleanup") {
          updates.lastCleanupRequest = Timestamp.now();
        }
        
        await updateAdminSettings(updates, user.id);
        setSettings((prev) => prev ? { ...prev, ...updates } : null);
        
        const messages = {
          restore: "Geri yükleme isteği kaydedildi",
          cleanup: "Temizleme isteği kaydedildi",
        };
        toast.success(messages[type as "restore" | "cleanup"]);
      }
    } catch (error: any) {
      // Error handled in downloadDatabaseBackup or here
      if (type !== "backup") { // backup has its own toast
         toast.error("İşlem başarısız: " + error.message);
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Genel Ayarlar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            Genel Ayarlar
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Sistem genelindeki temel yapılandırmalar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm sm:text-base">Bakım Modu</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">Sistemi geçici olarak devre dışı bırak</p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => setSettings((prev) => prev ? { ...prev, maintenanceMode: checked } : null)}
            />
          </div>
          <Separator />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm sm:text-base">Yeni Kayıtlar</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">Yeni kullanıcı kayıtlarına izin ver</p>
            </div>
            <Switch
              checked={settings.allowNewRegistrations}
              onCheckedChange={(checked) => setSettings((prev) => prev ? { ...prev, allowNewRegistrations: checked } : null)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Şirket Adı</Label>
            <Input
              value={settings.companyName}
              onChange={(e) => setSettings((prev) => prev ? { ...prev, companyName: e.target.value } : null)}
              className="text-sm sm:text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Destek Email</Label>
            <Input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings((prev) => prev ? { ...prev, supportEmail: e.target.value } : null)}
              className="text-sm sm:text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bildirim Ayarları */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            Bildirim Ayarları
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Sistem bildirimleri ve uyarı yapılandırması</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm sm:text-base">Email Bildirimleri</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">Önemli olaylarda email gönder</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings((prev) => prev ? { ...prev, emailNotifications: checked } : null)}
            />
          </div>
          <Separator />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm sm:text-base">Görev Bildirimleri</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">Yeni görev atandığında bildir</p>
            </div>
            <Switch
              checked={settings.notifyTasks}
              onCheckedChange={(checked) => setSettings((prev) => prev ? { ...prev, notifyTasks: checked } : null)}
            />
          </div>
          <Separator />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm sm:text-base">Üretim Bildirimleri</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">Üretim durumu değişikliklerinde bildir</p>
            </div>
            <Switch
              checked={settings.notifyProduction}
              onCheckedChange={(checked) => setSettings((prev) => prev ? { ...prev, notifyProduction: checked } : null)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Güvenlik Ayarları */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
            Güvenlik Ayarları
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Kimlik doğrulama ve güvenlik yapılandırması</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm sm:text-base">İki Faktörlü Doğrulama</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">Tüm kullanıcılar için zorunlu kıl</p>
            </div>
            <Switch
              checked={settings.twoFactorRequired}
              onCheckedChange={(checked) => setSettings((prev) => prev ? { ...prev, twoFactorRequired: checked } : null)}
            />
          </div>
          <Separator />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm sm:text-base">Şifre Yenileme</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">Şifrelerin düzenli olarak değiştirilmesini zorunlu kıl</p>
            </div>
            <Switch
              checked={settings.passwordRotationDays > 0}
              onCheckedChange={(checked) =>
                setSettings((prev) => prev ? { ...prev, passwordRotationDays: checked ? 90 : 0 } : null)
              }
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Oturum Süresi (dakika)</Label>
            <Input
              type="number"
              min={60}
              value={settings.sessionTimeoutMinutes}
              onChange={(e) =>
                setSettings((prev) => prev ? { ...prev, sessionTimeoutMinutes: Number(e.target.value) || 0 } : null)
              }
              className="text-sm sm:text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Minimum Şifre Uzunluğu</Label>
            <Input
              type="number"
              min={6}
              value={settings.minPasswordLength}
              onChange={(e) =>
                setSettings((prev) => prev ? { ...prev, minPasswordLength: Number(e.target.value) || 0 } : null)
              }
              className="text-sm sm:text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Veritabanı Yönetimi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Database className="h-4 w-4 sm:h-5 sm:w-5" />
            Veritabanı Yönetimi
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Veri yedekleme ve bakım işlemleri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="space-y-0.5 flex-1">
              <Label className="text-sm sm:text-base">Otomatik Yedekleme</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">Günlük otomatik yedekleme yap</p>
            </div>
            <Switch
              checked={settings.autoBackup}
              onCheckedChange={(checked) => setSettings((prev) => prev ? { ...prev, autoBackup: checked } : null)}
            />
          </div>
          {settings.lastBackupAt && (
            <p className="text-xs text-muted-foreground">
              Son manuel yedek: {settings.lastBackupAt.toDate().toLocaleString("tr-TR")}
            </p>
          )}
          <Separator />
          <div className="flex flex-col sm:flex-row gap-2 sm:flex-wrap">
            <Button
              variant="outline"
              className="flex-1 sm:min-w-[150px] min-h-[44px] sm:min-h-0"
              onClick={() => handleBackupAction("backup")}
              disabled={actionLoading.backup}
            >
              <span className="text-xs sm:text-sm">{actionLoading.backup ? "Yedekleniyor..." : "Yedek Al"}</span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 sm:min-w-[150px] min-h-[44px] sm:min-h-0"
              onClick={() => handleBackupAction("restore")}
              disabled={actionLoading.restore}
            >
              <span className="text-xs sm:text-sm">{actionLoading.restore ? "Talep Gönderiliyor..." : "Geri Yükle"}</span>
            </Button>
          </div>
          <Button
            variant="destructive"
            className="w-full min-h-[44px] sm:min-h-0"
            onClick={() => handleBackupAction("cleanup")}
            disabled={actionLoading.cleanup}
          >
            <span className="text-xs sm:text-sm">{actionLoading.cleanup ? "Temizleniyor..." : "Veritabanını Temizle"}</span>
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSaveAll} disabled={saving} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
          <span className="text-xs sm:text-sm">{saving ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}</span>
        </Button>
      </div>
    </div>
  );
};
