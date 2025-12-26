import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createRawMaterial } from "@/services/firebase/materialService";
import { useAuth } from "@/contexts/AuthContext";
import { handleErrorToast } from "@/utils/toastHelpers";
import { CURRENCY_OPTIONS, CURRENCY_SYMBOLS, DEFAULT_CURRENCY, Currency } from "@/utils/currency";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { Package, Loader2, X, Save, AlertTriangle, DollarSign, Warehouse, ShoppingCart, MapPin, Link2, Building2, User, FileText } from "lucide-react";

interface CreateRawMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateRawMaterialDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateRawMaterialDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const STORAGE_KEY = "rawMaterialFormDraft";

  // localStorage'dan draft verileri yükle
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error loading draft:", error);
      }
    }
    return null;
  };

  // Draft verileri localStorage'a kaydet
  const saveDraft = (data: typeof defaultFormData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error saving draft:", error);
      }
    }
  };

  // Draft verileri temizle
  const clearDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error clearing draft:", error);
      }
    }
  };

  const defaultFormData = {
    name: "",
    sku: "",
    category: "other",
    stock: "0",
    min_stock: "0",
    unit: "Adet",
    unitPrice: "0",
    vatRate: "0", // KDV yüzdesi
    totalPrice: "0",
    currency: DEFAULT_CURRENCY,
    brand: "",
    link: "",
    supplier: "",
    purchasedBy: "",
    location: "",
    description: "",
  };

  const [formData, setFormData] = useState(() => {
    const draft = loadDraft();
    return draft || defaultFormData;
  });

  // KDV ve birim fiyat değiştiğinde nihai fiyatı otomatik hesapla
  useEffect(() => {
    const unitPrice = parseFloat(formData.unitPrice) || 0;
    const vatRate = parseFloat(formData.vatRate) || 0;
    
    if (unitPrice > 0) {
      const vatAmount = (unitPrice * vatRate) / 100;
      const finalPrice = unitPrice + vatAmount;
      setFormData(prev => ({
        ...prev,
        totalPrice: finalPrice.toFixed(2)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        totalPrice: "0"
      }));
    }
  }, [formData.unitPrice, formData.vatRate]);

  // Form açıldığında kullanıcıları yükle ve draft verileri yükle
  useEffect(() => {
    if (open) {
      fetchUsers();
      // Form açıldığında draft varsa yükle, yoksa default değerleri kullan
      const draft = loadDraft();
      if (draft) {
        setFormData(draft);
      } else {
        // Draft yoksa formu temizle
        setFormData(defaultFormData);
      }
    }
  }, [open]);

  // Form verileri değiştiğinde draft olarak kaydet (debounce ile)
  useEffect(() => {
    if (open) {
      // Sadece form açıkken ve veri varsa kaydet
      const hasData = formData.name || formData.sku || formData.supplier || formData.brand || formData.description || formData.purchasedBy || formData.location || formData.link || formData.unitPrice || formData.vatRate;
      if (hasData) {
        const timeoutId = setTimeout(() => {
          saveDraft(formData);
        }, 500); // 500ms debounce
        return () => clearTimeout(timeoutId);
      } else {
        // Veri yoksa draft'ı temizle
        clearDraft();
      }
    }
  }, [formData, open]);

  // Form başarıyla kaydedildikten sonra state'i ve draft'ı sıfırla
  const resetForm = () => {
    const resetData = {
      ...defaultFormData,
      vatRate: "0",
    };
    setFormData(resetData);
    clearDraft();
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching users:", error);
      }
      toast.error("Kullanıcılar yüklenirken hata oluştu");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setLoading(true);
    try {
      if (!user) {
        toast.error("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
        setLoading(false);
        return;
      }

      await createRawMaterial({
        name: formData.name,
        code: formData.sku || null,
        unit: formData.unit,
        currentStock: parseInt(formData.stock) || 0,
        minStock: parseInt(formData.min_stock) || 0,
        maxStock: null,
        unitPrice: parseFloat(formData.unitPrice) || null,
        totalPrice: parseFloat(formData.totalPrice) || null,
        vatRate: formData.vatRate ? parseFloat(formData.vatRate) : null,
        currency: formData.currency,
        currencies: [formData.currency],
        brand: formData.brand || null,
        link: formData.link || null,
        supplier: formData.supplier || null,
        purchasedBy: formData.purchasedBy || null,
        location: formData.location || null,
        description: formData.description || null,
        notes: formData.description || null,
      });

      toast.success("Hammadde başarıyla eklendi");
      onSuccess();
      resetForm(); // State'i sıfırla
      onOpenChange(false);
    } catch (error: unknown) {
      handleErrorToast(error, "Hammadde eklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[100vw] sm:!max-w-[80vw] !w-[100vw] sm:!w-[80vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[10vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <DialogTitle className="text-[18px] sm:text-[20px] font-semibold text-foreground truncate">
                  Yeni Hammadde Ekle
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Yeni hammadde eklemek için formu doldurun
                </DialogDescription>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                  İptal
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0 text-white"
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
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-2">
                {/* Temel Bilgiler */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Temel Bilgiler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium flex items-center gap-1.5">
                          Hammadde Adı
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          placeholder="Örn: Çelik Levha, Plastik Granül"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sku" className="text-sm font-medium flex items-center gap-1.5">
                          Stok Kodu
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="sku"
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          placeholder="Örn: HM-001, SKU-123"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-medium">Kategori</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger className="min-h-[44px] sm:min-h-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chemical">Kimyasal</SelectItem>
                            <SelectItem value="metal">Metal</SelectItem>
                            <SelectItem value="plastic">Plastik</SelectItem>
                            <SelectItem value="electronic">Elektronik</SelectItem>
                            <SelectItem value="packaging">Ambalaj</SelectItem>
                            <SelectItem value="other">Diğer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit" className="text-sm font-medium">Birim</Label>
                        <Select
                          value={formData.unit}
                          onValueChange={(value) => setFormData({ ...formData, unit: value })}
                        >
                          <SelectTrigger className="min-h-[44px] sm:min-h-0">
                            <SelectValue placeholder="Birim seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Adet">Adet</SelectItem>
                            <SelectItem value="Kg">Kg</SelectItem>
                            <SelectItem value="Gram">Gram</SelectItem>
                            <SelectItem value="Litre">Litre</SelectItem>
                            <SelectItem value="Metre">Metre</SelectItem>
                            <SelectItem value="Cm">Cm</SelectItem>
                            <SelectItem value="M²">M²</SelectItem>
                            <SelectItem value="M³">M³</SelectItem>
                            <SelectItem value="Paket">Paket</SelectItem>
                            <SelectItem value="Kutu">Kutu</SelectItem>
                            <SelectItem value="Palet">Palet</SelectItem>
                            <SelectItem value="Ton">Ton</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="brand" className="text-sm font-medium">Marka</Label>
                        <Input
                          id="brand"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          placeholder="Örn: Bosch, Samsung"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">Açıklama</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="min-h-[80px] sm:min-h-[100px] resize-none"
                        placeholder="Hammadde hakkında detaylı açıklama yazın..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Stok Bilgileri */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                      <Warehouse className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Stok Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="stock" className="text-sm font-medium flex items-center gap-1.5">
                          Mevcut Stok
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="stock"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="min_stock" className="text-sm font-medium flex items-center gap-1.5">
                          Kritik Stok Adedi
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="min_stock"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.min_stock}
                          onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          required
                        />
                        {parseInt(formData.stock) < parseInt(formData.min_stock) && parseInt(formData.stock) >= 0 && parseInt(formData.min_stock) > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 rounded-md border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Stok kritik seviyenin altında!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Fiyat Bilgileri */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Fiyat Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Para Birimi</Label>
                        <Select
                          value={formData.currency}
                          onValueChange={(value) => setFormData({ ...formData, currency: value as Currency })}
                        >
                          <SelectTrigger className="min-h-[44px] sm:min-h-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unitPrice" className="text-sm font-medium">
                          Birim Fiyat ({CURRENCY_SYMBOLS[formData.currency as Currency]})
                        </Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.unitPrice}
                          onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vatRate" className="text-sm font-medium">KDV Yüzdesi (%)</Label>
                        <Input
                          id="vatRate"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.vatRate}
                          onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          placeholder="Örn: 20"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalPrice" className="text-sm font-medium">
                        Nihai Fiyat (KDV Dahil) ({CURRENCY_SYMBOLS[formData.currency as Currency]})
                      </Label>
                      <Input
                        id="totalPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.totalPrice}
                        readOnly
                        className="min-h-[44px] sm:min-h-0 bg-muted/50 cursor-not-allowed font-semibold"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Tedarik Bilgileri */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Tedarik Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="supplier" className="text-sm font-medium flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          Tedarikçi
                        </Label>
                        <Input
                          id="supplier"
                          value={formData.supplier}
                          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          placeholder="Tedarikçi firma adı"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="purchasedBy" className="text-sm font-medium flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          Satın Alan Kişi
                        </Label>
                        <Select
                          value={formData.purchasedBy || "none"}
                          onValueChange={(value) => setFormData({ ...formData, purchasedBy: value === "none" ? "" : value })}
                          disabled={usersLoading}
                        >
                          <SelectTrigger className="min-h-[44px] sm:min-h-0">
                            <SelectValue placeholder={usersLoading ? "Yükleniyor..." : "Kişi seçin"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            <SelectItem value="none">Satın Alan Kişi Yok</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.fullName || user.displayName || user.email || "İsimsiz Kullanıcı"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link" className="text-sm font-medium flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5" />
                        Ürün Linki
                      </Label>
                      <Input
                        id="link"
                        type="url"
                        value={formData.link}
                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        className="min-h-[44px] sm:min-h-0"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-sm font-medium flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        Hammadde Konumu
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="min-h-[44px] sm:min-h-0"
                        placeholder="Örn: Depo A, Raf 3, Bölüm 2"
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
