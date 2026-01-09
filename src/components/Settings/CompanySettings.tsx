import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getCompanySettings, updateCompanySettings, CompanySettings as FirebaseCompanySettings } from "@/services/firebase/settingsService";
import { useAuth } from "@/contexts/AuthContext";
import { normalizePhone, formatPhoneForDisplay } from "@/utils/phoneNormalizer";

const defaultForm = {
  company_name: "",
  tax_number: "",
  address: "",
  email: "",
  phone: "",
  email_notifications: true,
  low_stock_alerts: true,
  auto_backup: true,
};

export const CompanySettings = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(false); // Başlangıçta false - placeholder data ile hızlı render
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      // Defer settings loading: İlk render'dan 100ms sonra yükle (non-blocking)
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        const settings = await getCompanySettings();
        if (settings) {
          setFormData({
            company_name: settings.companyName || "",
            tax_number: settings.taxId || "",
            address: settings.address || "",
            email: settings.email || "",
            phone: formatPhoneForDisplay(settings.phone) || "",
            email_notifications: settings.emailNotifications ?? true,
            low_stock_alerts: settings.lowStockAlerts ?? true,
            auto_backup: settings.autoBackup ?? true,
          });
        }
      } catch (error: unknown) {
        toast.error("Ayarlar yüklenirken hata: " + (error instanceof Error ? error.message : String(error)));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
      return;
    }

    setSaving(true);
    try {
      await updateCompanySettings({
        companyName: formData.company_name,
        taxId: formData.tax_number || null,
        address: formData.address || null,
        email: formData.email || null,
        phone: normalizePhone(formData.phone),
        emailNotifications: formData.email_notifications,
        lowStockAlerts: formData.low_stock_alerts,
        autoBackup: formData.auto_backup,
      }, user.id);

      toast.success("Şirket bilgileri kaydedildi");
    } catch (error: unknown) {
      toast.error("Ayarlar kaydedilemedi: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-[14px] sm:text-[15px]">Şirket Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="company" className="text-[11px] sm:text-xs">Şirket Adı</Label>
              <Input
                id="company"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="tax" className="text-[11px] sm:text-xs">Vergi No</Label>
              <Input
                id="tax"
                value={formData.tax_number}
                onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className="text-[11px] sm:text-xs">Adres</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-[11px] sm:text-xs">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="phone" className="text-[11px] sm:text-xs">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
          <CardTitle className="text-[14px] sm:text-[15px]">Sistem Ayarları</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-muted/30">
            <div className="space-y-0.5 flex-1">
              <Label className="text-[11px] sm:text-xs">E-posta Bildirimleri</Label>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Yeni siparişler için e-posta alın</p>
            </div>
            <Switch
              checked={formData.email_notifications}
              onCheckedChange={(checked) => setFormData({ ...formData, email_notifications: checked })}
            />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-muted/30">
            <div className="space-y-0.5 flex-1">
              <Label className="text-[11px] sm:text-xs">Düşük Stok Uyarıları</Label>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Stok azaldığında bildirim göster</p>
            </div>
            <Switch
              checked={formData.low_stock_alerts}
              onCheckedChange={(checked) => setFormData({ ...formData, low_stock_alerts: checked })}
            />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-muted/30">
            <div className="space-y-0.5 flex-1">
              <Label className="text-[11px] sm:text-xs">Otomatik Yedekleme</Label>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Verileri otomatik olarak yedekle</p>
            </div>
            <Switch
              checked={formData.auto_backup}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_backup: checked })}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0">
              {saving ? "Kaydediliyor..." : "Ayarları Güncelle"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

