import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { createProduct } from "@/services/firebase/productService";
import { useAuth } from "@/contexts/AuthContext";
import { Package, Loader2, X, Save } from "lucide-react";

const PRODUCT_CATEGORIES = [
  "Taşınabilir Güç Paketleri",
  "Kabin Tipi Güç Paketleri",
  "Araç Tipi Güç Paketleri",
  "Endüstriyel Güç Paketleri",
  "Güneş Enerji Sistemleri",
] as const;

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateProductDialog = ({ open, onOpenChange, onSuccess }: CreateProductDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: `PRD-${Date.now()}`,
    description: "",
    category: "",
    stock: "0",
    unit: "Adet",
    price: "",
    cost: "",
    min_stock: "0",
    max_stock: "",
    location: "",
  });

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

      await createProduct({
        name: formData.name,
        sku: formData.sku || null,
        description: formData.description || null,
        category: formData.category || null,
        imageUrl: null,
        image_url: null,
        stock: parseInt(formData.stock) || 0,
        unit: formData.unit,
        price: formData.price ? parseFloat(formData.price) : null,
        unitPrice: formData.price ? parseFloat(formData.price) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        minStock: parseInt(formData.min_stock) || 0,
        maxStock: formData.max_stock ? parseInt(formData.max_stock) : null,
        location: formData.location || null,
        createdBy: user.id,
      });

      toast.success("Ürün başarıyla oluşturuldu");
      onSuccess();
      onOpenChange(false);
      setFormData({
        name: "",
        sku: `PRD-${Date.now()}`,
        description: "",
        category: "",
        stock: "0",
        unit: "Adet",
        price: "",
        cost: "",
        min_stock: "0",
        max_stock: "",
        location: "",
      });
    } catch (error: any) {
      // Sadece development'ta log göster
      if (import.meta.env.DEV) {
        console.error("Create product error:", error);
      }
      toast.error(error.message || "Ürün oluşturulurken hata oluştu");
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
                  Yeni Ürün
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Yeni ürün eklemek için formu doldurun
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
                        <Label htmlFor="name" className="text-sm sm:text-base">Ürün Adı</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sku" className="text-sm sm:text-base">SKU</Label>
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
                        rows={3}
                        className="min-h-[44px] sm:min-h-0"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm sm:text-base">Kategori</Label>
                        <Select value={formData.category ? formData.category : "none"} onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}>
                          <SelectTrigger className="min-h-[44px] sm:min-h-0">
                            <SelectValue placeholder="Kategori seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Kategori Yok</SelectItem>
                            {PRODUCT_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stock" className="text-sm sm:text-base">Stok</Label>
                        <Input
                          id="stock"
                          type="number"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit" className="text-sm sm:text-base">Birim</Label>
                        <Select value={formData.unit ? formData.unit : ""} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                          <SelectTrigger className="min-h-[44px] sm:min-h-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Adet">Adet</SelectItem>
                            <SelectItem value="Kg">Kg</SelectItem>
                            <SelectItem value="Lt">Lt</SelectItem>
                            <SelectItem value="Mt">Mt</SelectItem>
                            <SelectItem value="M2">M²</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-sm sm:text-base">Satış Fiyatı</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cost" className="text-sm sm:text-base">Maliyet</Label>
                        <Input
                          id="cost"
                          type="number"
                          step="0.01"
                          value={formData.cost}
                          onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="min_stock" className="text-sm sm:text-base">Min. Stok</Label>
                        <Input
                          id="min_stock"
                          type="number"
                          value={formData.min_stock}
                          onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max_stock" className="text-sm sm:text-base">Max. Stok</Label>
                        <Input
                          id="max_stock"
                          type="number"
                          value={formData.max_stock}
                          onChange={(e) => setFormData({ ...formData, max_stock: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-sm sm:text-base">Konum</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
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
