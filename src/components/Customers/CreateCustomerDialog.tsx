import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { createCustomer } from "@/services/firebase/customerService";
import { createCustomerNote } from "@/services/firebase/customerNoteService";
import { normalizePhone } from "@/utils/phoneNormalizer";
import { useAuth } from "@/contexts/AuthContext";
import { User, Loader2, X, Save } from "lucide-react";

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateCustomerDialog = ({ open, onOpenChange, onSuccess }: CreateCustomerDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    tax_number: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof typeof formData, boolean>>>({});

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      tax_number: "",
      notes: "",
    });
    setErrors({});
    setTouched({});
  };

  // Form açıldığında veya kapandığında reset yap
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const setFieldValue = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Sadece daha önce submit edilmişse (touched) hataları göster
    if (touched[field] && errors[field]) {
      setErrors((prev) => {
        const { [field]: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof typeof formData, string>> = {};

    if (!formData.name.trim()) {
      nextErrors.name = "İsim alanı zorunludur.";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Geçerli bir email adresi girin.";
    }

    if (formData.phone && formData.phone.replace(/\D/g, "").length < 10) {
      nextErrors.phone = "Geçerli bir telefon numarası girin.";
    }

    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      // Tüm alanları touched olarak işaretle (validasyon yapıldığını göster)
      const allFields: (keyof typeof formData)[] = ['name', 'email', 'phone', 'company', 'address', 'tax_number', 'notes'];
      const newTouched: Partial<Record<keyof typeof formData, boolean>> = {};
      allFields.forEach(field => {
        newTouched[field] = true;
      });
      setTouched(newTouched);
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        toast.error("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
        setLoading(false);
        return;
      }

      const newCustomer = await createCustomer({
        name: formData.name,
        company: formData.company || null,
        email: formData.email || null,
        phone: normalizePhone(formData.phone),
        address: formData.address || null,
        taxId: formData.tax_number || null,
        notes: formData.notes || null,
        createdBy: user.id,
      });
      
      // Eğer not varsa, bunu ayrı bir CustomerNote olarak da oluştur
      if (formData.notes && formData.notes.trim()) {
        try {
          await createCustomerNote({
            customerId: newCustomer.id,
            type: "general",
            title: "Müşteri Oluşturulurken Eklenen Not",
            content: formData.notes.trim(),
            createdBy: user.id,
          });
        } catch (noteError) {
          // Not oluşturma hatası kritik değil, sadece logla
          if (import.meta.env.DEV) {
            console.warn("Müşteri notu oluşturulamadı:", noteError);
          }
        }
      }
      
      toast.success("Müşteri başarıyla oluşturuldu");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Create customer error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Müşteri oluşturulurken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
        {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
        <DialogTitle className="sr-only">
          Yeni Müşteri
        </DialogTitle>
        <DialogDescription className="sr-only">
          Yeni müşteri eklemek için formu doldurun
        </DialogDescription>
        
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h2 className="text-[16px] sm:text-[18px] font-semibold text-foreground truncate">
                  Yeni Müşteri
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 font-medium text-[11px] sm:text-xs flex-shrink-0 min-h-[36px] sm:min-h-8"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                  İptal
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 font-medium text-[11px] sm:text-xs flex-shrink-0 text-white min-h-[36px] sm:min-h-8"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                  )}
                  Kaydet
                </Button>
              </div>
            </div>
          </DialogHeader>
        
          <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
            <div className="max-w-full mx-auto h-full overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-2">
                <Card>
                  <CardContent className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                    <div>
                      <h3 className="text-[14px] sm:text-[15px] font-semibold text-foreground mb-1">Müşteri Bilgileri</h3>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">Temel müşteri bilgilerini girin</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="name" showRequired className="text-[11px] sm:text-xs">İsim</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFieldValue("name", e.target.value)}
                          className="min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
                          required
                        />
                        {errors.name && <p className="text-[11px] sm:text-xs text-destructive">{errors.name}</p>}
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="company" className="text-[11px] sm:text-xs">Şirket</Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFieldValue("company", e.target.value)}
                          className="min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="email" className="text-[11px] sm:text-xs">E-posta</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFieldValue("email", e.target.value)}
                          className="min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
                        />
                        {errors.email && <p className="text-[11px] sm:text-xs text-destructive">{errors.email}</p>}
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="phone" className="text-[11px] sm:text-xs">Telefon</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFieldValue("phone", e.target.value)}
                          className="min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
                        />
                        {errors.phone && <p className="text-[11px] sm:text-xs text-destructive">{errors.phone}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="address" className="text-[11px] sm:text-xs">Adres</Label>
                        <Textarea
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFieldValue("address", e.target.value)}
                          rows={3}
                          className="min-h-[44px] sm:min-h-0 resize-none text-[11px] sm:text-xs"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="tax_number" className="text-[11px] sm:text-xs">Vergi No</Label>
                        <Input
                          id="tax_number"
                          value={formData.tax_number}
                          onChange={(e) => setFieldValue("tax_number", e.target.value)}
                          className="min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-[11px] sm:text-xs">Notlar</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFieldValue("notes", e.target.value)}
                        rows={4}
                        className="min-h-[44px] sm:min-h-0 resize-none text-[11px] sm:text-xs"
                        placeholder="Müşteri hakkında notlar..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
