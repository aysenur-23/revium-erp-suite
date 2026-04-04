import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Image as ImageIcon, Edit, Save, X, Loader2, Plus, Trash2, List } from "lucide-react";
import { toast } from "sonner";
import { updateProduct, addProductComment, getProductComments, getProductActivities } from "@/services/firebase/productService";
import {
  getProductRecipes,
  addRecipeItem,
  updateRecipeItem,
  deleteRecipeItem,
  RecipeWithMaterial,
} from "@/services/firebase/recipeService";
import { getRawMaterials, RawMaterial } from "@/services/firebase/materialService";
import { useAuth } from "@/contexts/AuthContext";
import { canUpdateResource, UserProfile } from "@/utils/permissions";
import { ActivityCommentsPanel } from "@/components/shared/ActivityCommentsPanel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PRODUCT_CATEGORIES = [
  "Taşınabilir Güç Paketleri",
  "Kabin Tipi Güç Paketleri",
  "Araç Tipi Güç Paketleri",
  "Endüstriyel Güç Paketleri",
  "Güneş Enerji Sistemleri",
] as const;

interface ProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onUpdate?: () => void;
}

export const ProductDetailModal = ({
  open,
  onOpenChange,
  product,
  onUpdate,
}: ProductDetailModalProps) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [recipes, setRecipes] = useState<RecipeWithMaterial[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
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

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        sku: product.sku || "",
        description: product.description || "",
        category: product.category || "",
        stock: product.stock?.toString() || "0",
        unit: product.unit || "Adet",
        price: product.price?.toString() || "",
        cost: product.cost?.toString() || "",
        min_stock: product.min_stock?.toString() || "0",
        max_stock: product.max_stock?.toString() || "",
        location: product.location || "",
      });
      setIsEditing(false);
    }
  }, [product, open]);

  useEffect(() => {
    if (open && product?.id && activeTab === "recipe") {
      fetchRecipes();
      fetchMaterials();
    }
  }, [open, product, activeTab]);

  const fetchRecipes = async () => {
    if (!product?.id) return;
    try {
      const recipesData = await getProductRecipes(product.id);
      setRecipes(recipesData);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Reçete yüklenirken hata:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Reçeteler yüklenemedi: " + errorMessage);
    }
  };

  const fetchMaterials = async () => {
    try {
      const materialsData = await getRawMaterials();
      setMaterials(materialsData);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Hammaddeler yüklenirken hata:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Hammaddeler yüklenemedi: " + errorMessage);
    }
  };

  const addMaterial = async () => {
    if (!selectedMaterial || !newQuantity || !product?.id) {
      toast.error("Lütfen hammadde ve miktar seçin");
      return;
    }

    // Seçilen hammaddenin silinmiş olup olmadığını kontrol et
    const selectedMat = materials.find((m) => m.id === selectedMaterial);
    if (!selectedMat) {
      toast.error("Seçilen hammadde bulunamadı veya silinmiş");
      return;
    }

    // Silinmiş hammaddeleri eklemeyi engelle
    if (selectedMat.deleted === true || selectedMat.isDeleted === true) {
      toast.error("Silinmiş hammaddeler reçeteye eklenemez");
      return;
    }

    setRecipeLoading(true);
    try {
      await addRecipeItem(product.id, selectedMaterial, parseFloat(newQuantity));
      toast.success("Hammadde eklendi");
      fetchRecipes();
      setSelectedMaterial(null);
      setNewQuantity("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Hata: " + errorMessage);
    } finally {
      setRecipeLoading(false);
    }
  };

  const removeMaterial = async (recipeId: string) => {
    if (!confirm("Bu hammaddeyi reçeteden çıkarmak istediğinizden emin misiniz?"))
      return;

    try {
      await deleteRecipeItem(recipeId);
      toast.success("Hammadde çıkarıldı");
      fetchRecipes();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Hata: " + errorMessage);
    }
  };

  const updateQuantity = async (recipeId: string, newQty: string) => {
    if (!newQty || parseFloat(newQty) <= 0) return;

    try {
      await updateRecipeItem(recipeId, parseFloat(newQty));
      toast.success("Miktar güncellendi");
      fetchRecipes();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Hata: " + errorMessage);
    }
  };

  const calculateTotalCost = () => {
    return recipes.reduce((sum, recipe) => {
      const material = recipe.rawMaterial;
      return sum + (material?.cost || 0) * recipe.quantityPerUnit;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product?.id || !user?.id) return;

    // Yetki kontrolü
    if (!canUpdate && product.createdBy !== user.id) {
      toast.error("Ürün düzenleme yetkiniz yok.");
      setIsEditing(false);
      return;
    }
    
    setLoading(true);
    try {
      await updateProduct(product.id, {
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
      });

      toast.success("Ürün başarıyla güncellendi");
      setIsEditing(false);
      onUpdate?.();
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("Update product error:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(errorMessage || "Ürün güncellenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const getStatusVariant = (stock: number, minStock: number) => {
    if (stock === 0) return "destructive";
    if (stock <= minStock) return "secondary";
    return "default";
  };

  const getStatusLabel = (stock: number, minStock: number) => {
    if (stock === 0) return "Tükendi";
    if (stock <= minStock) return "Düşük Stok";
    return "Stokta";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[100vw] sm:!max-w-[80vw] !w-[100vw] sm:!w-[80vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[10vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
        <div className="flex flex-col h-full min-h-0">
          <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground truncate">
                  {product.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Ürün detayları ve bilgileri
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 flex-shrink-0 relative z-10 pr-10 sm:pr-12">
                <Badge variant={getStatusVariant(product.stock, product.min_stock)} className="text-xs px-2 sm:px-3 py-1 relative z-10">
                  {getStatusLabel(product.stock, product.min_stock)}
                </Badge>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="min-h-[44px] sm:min-h-0"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Düzenle
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        // Form verilerini sıfırla
                        if (product) {
                          setFormData({
                            name: product.name || "",
                            sku: product.sku || "",
                            description: product.description || "",
                            category: product.category || "",
                            stock: product.stock?.toString() || "0",
                            unit: product.unit || "Adet",
                            price: product.price?.toString() || "",
                            cost: product.cost?.toString() || "",
                            min_stock: product.min_stock?.toString() || "0",
                            max_stock: product.max_stock?.toString() || "",
                            location: product.location || "",
                          });
                        }
                      }}
                      disabled={loading}
                      className="min-h-[44px] sm:min-h-0"
                    >
                      <X className="h-4 w-4 mr-2" />
                      İptal
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={loading}
                      className="min-h-[44px] sm:min-h-0"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Kaydet
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
            <div className="max-w-full mx-auto h-full overflow-y-auto">
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl font-semibold">Temel Bilgiler</CardTitle>
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
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
                    <TabsTrigger value="details" className="min-h-[44px] sm:min-h-0">Detaylar</TabsTrigger>
                    <TabsTrigger value="recipe" className="min-h-[44px] sm:min-h-0">Reçete</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="space-y-4 sm:space-y-6 mt-0">
                    <div className="space-y-4 sm:space-y-6">
                  {/* Görsel */}
                  {product.image_url && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex justify-center">
                          <div className="relative w-full max-w-md h-64 rounded-lg overflow-hidden border border-border bg-muted">
                            <img
                              src={(() => {
                                if (!product.image_url) return '';
                                if (product.image_url.startsWith('http://') || product.image_url.startsWith('https://')) {
                                  return product.image_url;
                                }
                                const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
                                const cleanPath = product.image_url.startsWith('/') ? product.image_url : `/${product.image_url}`;
                                return `${baseUrl}${cleanPath}`;
                              })()}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden w-full h-full items-center justify-center bg-muted">
                              <ImageIcon className="h-16 w-16 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Temel Bilgiler */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl font-semibold">Temel Bilgiler</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="rounded-lg border bg-muted/30 px-3 py-2">
                          <p className="text-xs sm:text-sm text-muted-foreground mb-1">SKU</p>
                          <p className="font-medium font-mono text-sm sm:text-base">{product.sku || "-"}</p>
                        </div>
                        {product.category && (
                          <div className="rounded-lg border bg-muted/30 px-3 py-2">
                            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Kategori</p>
                            <Badge variant="outline" className="font-normal">
                              {product.category}
                            </Badge>
                          </div>
                        )}
                        <div className="rounded-lg border bg-muted/30 px-3 py-2">
                          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Mevcut Stok</p>
                          <p className="font-medium text-base sm:text-lg">
                            {product.stock || 0} {product.unit || "Adet"}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/30 px-3 py-2">
                          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Durum</p>
                          <Badge variant={getStatusVariant(product.stock || 0, product.min_stock || 0)}>
                            {getStatusLabel(product.stock || 0, product.min_stock || 0)}
                          </Badge>
                        </div>
                        {product.price && (
                          <div className="rounded-lg border bg-muted/30 px-3 py-2">
                            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Satış Fiyatı</p>
                            <p className="font-semibold text-base sm:text-lg">
                              ₺{new Intl.NumberFormat("tr-TR", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(product.price || 0)}
                            </p>
                          </div>
                        )}
                        {product.cost && (
                          <div className="rounded-lg border bg-muted/30 px-3 py-2">
                            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Maliyet</p>
                            <p className="font-medium text-sm sm:text-base">
                              ₺{new Intl.NumberFormat("tr-TR", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(product.cost || 0)}
                            </p>
                          </div>
                        )}
                        <div className="rounded-lg border bg-muted/30 px-3 py-2">
                          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Minimum Stok</p>
                          <p className="font-medium text-sm sm:text-base">
                            {product.min_stock || 0} {product.unit || "Adet"}
                          </p>
                        </div>
                        {product.max_stock && (
                          <div className="rounded-lg border bg-muted/30 px-3 py-2">
                            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Maksimum Stok</p>
                            <p className="font-medium text-sm sm:text-base">
                              {product.max_stock} {product.unit || "Adet"}
                            </p>
                          </div>
                        )}
                        {product.location && (
                          <div className="rounded-lg border bg-muted/30 px-3 py-2">
                            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Konum</p>
                            <p className="font-medium text-sm sm:text-base">{product.location}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Açıklama */}
                  {product.description && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg sm:text-xl font-semibold">Açıklama</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm sm:text-base whitespace-pre-wrap">{product.description}</p>
                      </CardContent>
                    </Card>
                  )}
                    </div>
                  </TabsContent>
                  <TabsContent value="recipe" className="space-y-4 sm:space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg sm:text-xl font-semibold">Reçete Yönetimi</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Mevcut Reçete */}
                        <div>
                          <h4 className="font-medium mb-3 text-sm sm:text-base">Hammadde Listesi</h4>
                          {recipes.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8 text-sm sm:text-base">
                              Henüz hammadde eklenmemiş
                            </p>
                          ) : (
                            <>
                              <div className="overflow-x-auto -mx-4 sm:mx-0">
                                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                                  <Table className="w-full">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Hammadde</TableHead>
                                        <TableHead>Miktar (Birim üretim için)</TableHead>
                                        <TableHead>Mevcut Stok</TableHead>
                                        <TableHead>Birim Maliyet</TableHead>
                                        <TableHead>Toplam Maliyet</TableHead>
                                        <TableHead className="w-[80px]">İşlem</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {recipes
                                        .filter((recipe) => recipe.rawMaterial) // Sadece hammadde bilgisi olan reçeteleri göster
                                        .map((recipe) => {
                                        const material = recipe.rawMaterial;
                                          if (!material) return null; // Güvenlik kontrolü
                                        return (
                                          <TableRow key={recipe.id}>
                                            <TableCell className="font-medium">
                                                {material.name}
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                <Input
                                                  type="number"
                                                  step="0.01"
                                                  value={recipe.quantityPerUnit}
                                                  onChange={(e) =>
                                                    updateQuantity(recipe.id, e.target.value)
                                                  }
                                                  className="w-24 min-h-[44px] sm:min-h-0"
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    {material.unit}
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                                {material.stock} {material.unit}
                                            </TableCell>
                                            <TableCell>
                                              ₺{new Intl.NumberFormat("tr-TR", {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                                }).format(material.cost || 0)}
                                            </TableCell>
                                            <TableCell>
                                              ₺{new Intl.NumberFormat("tr-TR", {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                                }).format((material.cost || 0) * recipe.quantityPerUnit)}
                                            </TableCell>
                                            <TableCell>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeMaterial(recipe.id)}
                                                className="min-h-[44px] sm:min-h-0"
                                              >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                              <div className="flex justify-end mt-3 pt-3 border-t">
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">
                                    Toplam Hammadde Maliyeti (Birim)
                                  </p>
                                  <p className="text-xl sm:text-2xl font-bold">
                                    ₺{new Intl.NumberFormat("tr-TR", {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0,
                                    }).format(calculateTotalCost() || 0)}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Yeni Hammadde Ekle */}
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3 text-sm sm:text-base">Yeni Hammadde Ekle</h4>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                              <Label className="text-sm sm:text-base">Hammadde</Label>
                              <Select
                                value={selectedMaterial ?? undefined}
                                onValueChange={setSelectedMaterial}
                              >
                                <SelectTrigger className="min-h-[44px] sm:min-h-0">
                                  <SelectValue placeholder="Hammadde seçin..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[400px]">
                                  {materials.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.name} ({m.currentStock} {m.unit} - ₺{new Intl.NumberFormat("tr-TR", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                      }).format(m.unitPrice || 0)}/{m.unit})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="w-full sm:w-32">
                              <Label className="text-sm sm:text-base">Miktar</Label>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                placeholder="Miktar"
                                value={newQuantity}
                                onChange={(e) => setNewQuantity(e.target.value)}
                                className="min-h-[44px] sm:min-h-0"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button onClick={addMaterial} disabled={recipeLoading} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
                                <Plus className="mr-2 h-4 w-4" />
                                Ekle
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
        
        {/* Activity Comments Panel */}
        {product?.id && user && (
          <ActivityCommentsPanel
            entityId={product.id}
            entityType="product"
            onAddComment={async (content: string) => {
              await addProductComment(
                product.id,
                user.id,
                content,
                user.fullName || user.displayName,
                user.email
              );
            }}
            onGetComments={async () => {
              return await getProductComments(product.id);
            }}
            onGetActivities={async () => {
              return await getProductActivities(product.id);
            }}
            currentUserId={user.id}
            currentUserName={user.fullName || user.displayName}
            currentUserEmail={user.email}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
