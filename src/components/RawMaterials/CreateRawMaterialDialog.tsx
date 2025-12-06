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
import { Package, Loader2, X, Save } from "lucide-react";

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
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "other",
    stock: "0",
    min_stock: "0",
    max_stock: "",
    unit: "Adet",
    unitPrice: "0",
    totalPrice: "0",
    currency: DEFAULT_CURRENCY,
    brand: "",
    link: "",
    supplier: "",
    purchasedBy: "",
    location: "",
    description: "",
  });

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
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
        maxStock: formData.max_stock ? parseInt(formData.max_stock) : null,
        unitPrice: parseFloat(formData.unitPrice) || null,
        totalPrice: parseFloat(formData.totalPrice) || null,
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
      onOpenChange(false);
      setFormData({
        name: "",
        sku: "",
        category: "other",
        stock: "0",
        min_stock: "0",
        max_stock: "",
        unit: "Adet",
        unitPrice: "0",
        totalPrice: "0",
        currency: DEFAULT_CURRENCY,
        brand: "",
        link: "",
        supplier: "",
        purchasedBy: "",
        location: "",
        description: "",
      });
    } catch (error: any) {
      handleErrorToast(error, "Hammadde eklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[100vw] sm:!max-w-[95vw] !w-[100vw] sm:!w-[95vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[2.5vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground truncate">
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
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Temel Bilgiler</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name"  className="text-sm sm:text-base">Hammadde Adı</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sku"  className="text-sm sm:text-base">Stok Kodu</Label>
                        <Input
                          id="sku"
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm sm:text-base">Açıklama</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="min-h-[80px] sm:min-h-[100px] resize-none"
                        placeholder="Hammadde hakkında açıklama yazın..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category"  className="text-sm sm:text-base">Kategori</Label>
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
                        <Label htmlFor="unit"  className="text-sm sm:text-base">Birim</Label>
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="stock"  className="text-sm sm:text-base">Mevcut Stok</Label>
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
                        <Label htmlFor="min_stock"  className="text-sm sm:text-base">Minimum Stok</Label>
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
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max_stock" className="text-sm sm:text-base">Maksimum Stok</Label>
                        <Input
                          id="max_stock"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.max_stock}
                          onChange={(e) => setFormData({ ...formData, max_stock: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm sm:text-base">Para Birimi</Label>
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
                        <Label htmlFor="unitPrice" className="text-sm sm:text-base">Birim Fiyat ({CURRENCY_SYMBOLS[formData.currency as Currency]})</Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.unitPrice}
                          onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="totalPrice" className="text-sm sm:text-base">Toplam Fiyat ({CURRENCY_SYMBOLS[formData.currency as Currency]})</Label>
                        <Input
                          id="totalPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.totalPrice}
                          onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="brand" className="text-sm sm:text-base">Marka</Label>
                        <Input
                          id="brand"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          placeholder="Örn: Bosch, Samsung, vb."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="link" className="text-sm sm:text-base">Link</Label>
                      <Input
                        id="link"
                        type="url"
                        value={formData.link}
                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        className="min-h-[44px] sm:min-h-0"
                        placeholder="https://..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supplier" className="text-sm sm:text-base">Tedarikçi</Label>
                      <Input
                        id="supplier"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        className="min-h-[44px] sm:min-h-0"
                      />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="purchasedBy" className="text-sm sm:text-base">Satın Alan Kişi</Label>
                        <Select
                          value={formData.purchasedBy || "none"}
                          onValueChange={(value) => setFormData({ ...formData, purchasedBy: value === "none" ? "" : value })}
                          disabled={usersLoading}
                        >
                          <SelectTrigger className="min-h-[44px] sm:min-h-0">
                            <SelectValue placeholder={usersLoading ? "Yükleniyor..." : "Kişi seçin"} />
                          </SelectTrigger>
                          <SelectContent>
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
                      <Label htmlFor="location" className="text-sm sm:text-base">Hammadde Konumu</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="min-h-[44px] sm:min-h-0"
                        placeholder="Örn: Depo A, Raf 3, vb."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm sm:text-base">Açıklama</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="min-h-[44px] sm:min-h-0"
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
