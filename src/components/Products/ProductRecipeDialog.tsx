import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getProductRecipes,
  addRecipeItem,
  updateRecipeItem,
  deleteRecipeItem,
  RecipeWithMaterial,
} from "@/services/firebase/recipeService";
import { getRawMaterials, RawMaterial } from "@/services/firebase/materialService";
import { Product } from "@/services/firebase/productService";
import { Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

export const ProductRecipeDialog = ({
  open,
  onOpenChange,
  product,
}: ProductRecipeDialogProps) => {
  const [recipes, setRecipes] = useState<RecipeWithMaterial[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && product?.id) {
      fetchRecipes();
      fetchMaterials();
    }
  }, [open, product]);

  const fetchRecipes = async () => {
    try {
      const recipesData = await getProductRecipes(product.id);
      setRecipes(recipesData);
    } catch (error: unknown) {
      // Sadece development'ta log göster
      if (import.meta.env.DEV) {
        console.error("Reçete yüklenirken hata:", error);
      }
      toast.error("Reçeteler yüklenemedi: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const fetchMaterials = async () => {
    try {
      const materialsData = await getRawMaterials();
      setMaterials(materialsData);
    } catch (error: unknown) {
      // Sadece development'ta log göster
      if (import.meta.env.DEV) {
        console.error("Hammaddeler yüklenirken hata:", error);
      }
      toast.error("Hammaddeler yüklenemedi: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const addMaterial = async () => {
    if (!selectedMaterial || !newQuantity) {
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

    setLoading(true);
    try {
      await addRecipeItem(product.id, selectedMaterial, parseFloat(newQuantity));
      toast.success("Hammadde eklendi");
      fetchRecipes();
      setSelectedMaterial(null);
      setNewQuantity("");
    } catch (error: unknown) {
      toast.error("Hata: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
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
      toast.error("Hata: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const updateQuantity = async (recipeId: string, newQty: string) => {
    if (!newQty || parseFloat(newQty) <= 0) return;

    try {
      await updateRecipeItem(recipeId, parseFloat(newQty));
      toast.success("Miktar güncellendi");
      fetchRecipes();
    } catch (error: unknown) {
      toast.error("Hata: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const calculateTotalCost = () => {
    return recipes.reduce((sum, recipe) => {
      const material = recipe.rawMaterial;
      return sum + (material?.cost || 0) * recipe.quantityPerUnit;
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name} - Reçete Yönetimi</DialogTitle>
          <DialogDescription>Ürün reçetesini düzenleyin ve hammaddeleri yönetin</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mevcut Reçete */}
          <div>
            <h4 className="font-medium mb-3">Hammadde Listesi</h4>
            {recipes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Henüz hammadde eklenmemiş
              </p>
            ) : (
              <>
                <Table>
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
                                  className="w-24"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {material.unit}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {material.stock} {material.unit}
                            </TableCell>
                            <TableCell>₺{material.cost || 0}</TableCell>
                            <TableCell>
                              ₺{((material.cost || 0) * recipe.quantityPerUnit).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMaterial(recipe.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-3 pt-3 border-t">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Toplam Hammadde Maliyeti (Birim)
                    </p>
                    <p className="text-2xl font-bold">
                      ₺{(calculateTotalCost() || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Yeni Hammadde Ekle */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Yeni Hammadde Ekle</h4>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Hammadde</Label>
                <Select
                  value={selectedMaterial ?? undefined}
                  onValueChange={setSelectedMaterial}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Hammadde seçin..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.currentStock} {m.unit} - ₺{m.unitPrice || 0}/{m.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Label>Miktar</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Miktar"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addMaterial} disabled={loading}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ekle
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
