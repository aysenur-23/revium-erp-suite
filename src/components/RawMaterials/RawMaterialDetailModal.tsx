import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Package, Loader2, Plus } from "lucide-react";
import { deleteRawMaterial, addMaterialComment, getMaterialComments, getMaterialActivities, RawMaterial } from "@/services/firebase/materialService";
import { useAuth } from "@/contexts/AuthContext";
import { canUpdateResource, canDeleteResource } from "@/utils/permissions";
import { ActivityCommentsPanel } from "@/components/shared/ActivityCommentsPanel";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getRawMaterialRecipes,
  RecipeWithProduct,
  deleteRecipeItem,
  addRecipeItem,
} from "@/services/firebase/recipeService";
import { getProducts, Product } from "@/services/firebase/productService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CURRENCY_SYMBOLS } from "@/utils/currency";
import { getAllUsers, UserProfile, getUserProfile } from "@/services/firebase/authService";
import { getMaterialTransactions, MaterialTransaction } from "@/services/firebase/materialService";
import { getOrderById, getOrderItems } from "@/services/firebase/orderService";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ExternalLink } from "lucide-react";

interface RawMaterialDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: RawMaterial;
  onEdit: () => void;
  onDelete: () => void;
}

export const RawMaterialDetailModal = ({
  open,
  onOpenChange,
  material,
  onEdit,
  onDelete,
}: RawMaterialDetailModalProps) => {
  const { user, isTeamLeader } = useAuth();
  const [canUpdate, setCanUpdate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recipes, setRecipes] = useState<RecipeWithProduct[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [newQuantity, setNewQuantity] = useState<string>("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [ordersMap, setOrdersMap] = useState<Record<string, { orderNumber: string; productName?: string }>>({});
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  // Yetki kontrolü
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setCanUpdate(false);
        setCanDelete(false);
        return;
      }

      try {
        const userProfile = await getUserProfile(user.id);
        if (!userProfile) {
          setCanUpdate(false);
          setCanDelete(false);
          return;
        }
        
        const [updatePermission, deletePermission] = await Promise.all([
          canUpdateResource(userProfile, "raw_materials"),
          canDeleteResource(userProfile, "raw_materials"),
        ]);

        setCanUpdate(updatePermission);
        setCanDelete(deletePermission);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Permission check error:", error);
        }
        setCanUpdate(false);
        setCanDelete(false);
      }
    };

    checkPermissions();
  }, [user]);

  const handleDelete = async () => {
    if (!confirm("Bu hammaddeyi silmek istediğinizden emin misiniz?")) return;

    // Yetki kontrolü
    if (!canDelete && material.createdBy !== user?.id && !isTeamLeader) {
      toast.error("Hammadde silme yetkiniz yok.");
      return;
    }

    setDeleting(true);
    try {
      await deleteRawMaterial(material.id);
      toast.success("Hammadde başarıyla silindi");
      onDelete();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Hata: " + errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      chemical: "Kimyasal",
      metal: "Metal",
      plastic: "Plastik",
      electronic: "Elektronik",
      packaging: "Ambalaj",
      other: "Diğer"
    };
    return labels[category] || category;
  };

  const getStockStatus = (stock: number, min_stock: number) => {
    if (stock === 0) return { label: "Tükendi", variant: "destructive" as const };
    if (stock < min_stock) return { label: "Düşük", variant: "secondary" as const };
    return { label: "Normal", variant: "default" as const };
  };

  useEffect(() => {
    if (open && material?.id && activeTab === "recipes") {
      fetchRecipes();
      fetchProducts();
    }
    if (open && material?.id && activeTab === "transactions") {
      fetchTransactions();
    }
    if (open) {
      fetchUsers();
    }
  }, [open, material?.id, activeTab]);

  const fetchUsers = async () => {
    if (users.length > 0 && Object.keys(usersMap).length > 0) return;
    setUsersLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      // Users map oluştur
      const usersMapData: Record<string, string> = {};
      allUsers.forEach((user) => {
        usersMapData[user.id] = user.fullName || user.displayName || user.email || "Bilinmeyen";
      });
      setUsersMap(usersMapData);
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("Error fetching users:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!material?.id) return;
    setTransactionsLoading(true);
    try {
      const transactionsData = await getMaterialTransactions(material.id);
      // Tarihe göre sırala (en yeni üstte)
      transactionsData.sort((a, b) => {
        const getTime = (createdAt: unknown): number => {
          if (!createdAt) return 0;
          if (createdAt && typeof createdAt === 'object' && 'toMillis' in createdAt && typeof createdAt.toMillis === 'function') {
            return createdAt.toMillis();
          }
          if (createdAt && typeof createdAt === 'object' && 'seconds' in createdAt && typeof (createdAt as { seconds: unknown }).seconds === 'number') {
            return (createdAt as { seconds: number }).seconds * 1000;
          }
          return 0;
        };
        const aTime = getTime(a.createdAt);
        const bTime = getTime(b.createdAt);
        return bTime - aTime;
      });
      setTransactions(transactionsData);

      // Sipariş bilgilerini yükle
      const orderIds = transactionsData
        .filter(t => t.relatedOrderId)
        .map(t => t.relatedOrderId!)
        .filter((id, index, self) => self.indexOf(id) === index); // Unique

      // Paralel olarak sipariş bilgilerini yükle
      const ordersData = await Promise.all(
        orderIds.map(async (orderId) => {
          try {
            const order = await getOrderById(orderId);
            if (!order) return null;
            
            // Sipariş kalemlerinden ürün adını al
            let productName: string | undefined;
            try {
              const items = await getOrderItems(orderId);
              if (items.length > 0) {
                productName = items[0].productName || items[0].product_name || undefined;
              }
            } catch {
              // Sipariş kalemleri alınamazsa reason'dan parse et
              const transactionsForOrder = transactionsData.filter(t => t.relatedOrderId === orderId);
              if (transactionsForOrder.length > 0 && transactionsForOrder[0].reason) {
                const match = transactionsForOrder[0].reason.match(/-\s*(.+?)\s*\(/);
                if (match) {
                  productName = match[1];
                }
              }
            }
            
            return {
              orderId,
              orderNumber: order.orderNumber || order.order_number || orderId,
              productName
            };
          } catch {
            return null;
          }
        })
      );

      // Orders map oluştur
      const ordersMapData: Record<string, { orderNumber: string; productName?: string }> = {};
      ordersData.forEach((orderData) => {
        if (orderData) {
          ordersMapData[orderData.orderId] = { orderNumber: orderData.orderNumber, productName: orderData.productName };
        }
      });
      setOrdersMap(ordersMapData);
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("İşlemler yüklenirken hata:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(errorMessage || "İşlemler yüklenirken hata oluştu");
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const formatTransactionDate = (timestamp: unknown) => {
    if (!timestamp) return "-";
    try {
      let date: Date;
      if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(String(timestamp));
      }
      return format(date, "dd MMMM yyyy HH:mm", { locale: tr });
    } catch {
      return "-";
    }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const productsData = await getProducts();
      setProducts(productsData);
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("Fetch products error:", error);
      toast.error("Ürün listesi alınamadı.");
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchRecipes = async () => {
    if (!material?.id) return;
    setRecipeLoading(true);
    try {
      const recipesData = await getRawMaterialRecipes(material.id);
      setRecipes(recipesData);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Reçete yüklenirken hata:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Reçeteler yüklenemedi: " + errorMessage);
    } finally {
      setRecipeLoading(false);
    }
  };

  const removeRecipe = async (recipeId: string) => {
    if (!confirm("Bu reçeteyi silmek istediğinizden emin misiniz?"))
      return;

    try {
      await deleteRecipeItem(recipeId);
      toast.success("Reçete silindi");
      fetchRecipes();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Hata: " + errorMessage);
    }
  };

  const addRecipe = async () => {
    if (!selectedProduct || !newQuantity || !material?.id) {
      toast.error("Lütfen ürün ve miktar seçin");
      return;
    }

    const quantity = parseFloat(newQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Geçerli bir miktar girin");
      return;
    }

    setRecipeLoading(true);
    try {
      await addRecipeItem(selectedProduct, material.id, quantity);
      toast.success("Reçete eklendi");
      fetchRecipes();
      setSelectedProduct("");
      setNewQuantity("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Hata: " + errorMessage);
    } finally {
      setRecipeLoading(false);
    }
  };

  if (!material) return null;

  const stockStatus = getStockStatus(material.currentStock || material.stock || 0, material.minStock || material.min_stock || 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
          {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
          <DialogTitle className="sr-only">
            {material.name} - Hammadde Detayı
          </DialogTitle>
          <DialogDescription className="sr-only">
            Hammadde detayları ve bilgileri
          </DialogDescription>
          
          <div className="flex flex-col h-full min-h-0">
            <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <h2 className="text-[16px] sm:text-[18px] font-semibold text-foreground truncate">
                    {material.name}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0 relative z-10 pr-10 sm:pr-12">
                  <Badge variant={stockStatus.variant} className="text-xs px-2 sm:px-3 py-1 relative z-10">
                    {stockStatus.label}
                  </Badge>
                  {(canUpdate || material.createdBy === user?.id || isTeamLeader) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEdit}
                      className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Düzenle
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleting ? "Siliniyor..." : "Sil"}
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
              <div className="max-w-full mx-auto h-full overflow-y-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 min-h-[44px] sm:min-h-0 overflow-hidden">
                    <TabsTrigger value="details" className="text-[11px] sm:text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                      Detaylar
                    </TabsTrigger>
                    <TabsTrigger value="recipes" className="text-[11px] sm:text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                      Reçete
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="text-[11px] sm:text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                      Stok Hareketleri
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-3 sm:space-y-4 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Stok Kodu</p>
                        <p className="text-[11px] sm:text-xs font-medium">{material.code || material.sku || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Kategori</p>
                        <p className="text-[11px] sm:text-xs font-medium">{getCategoryLabel(material.category || "other")}</p>
                      </div>
                      <div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Mevcut Stok</p>
                        <p className="text-[11px] sm:text-xs font-medium text-lg sm:text-xl">
                          {material.currentStock !== undefined ? material.currentStock : (material.stock || 0)} {material.unit || "Adet"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Minimum Stok</p>
                        <p className="text-[11px] sm:text-xs font-medium">
                          {material.minStock !== undefined ? material.minStock : (material.min_stock || 0)} {material.unit || "Adet"}
                        </p>
                      </div>
                      {(material.maxStock !== undefined && material.maxStock !== null) || material.max_stock ? (
                        <div>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Maksimum Stok</p>
                          <p className="text-[11px] sm:text-xs font-medium">
                            {material.maxStock !== undefined ? material.maxStock : (material.max_stock || 0)} {material.unit || "Adet"}
                          </p>
                        </div>
                      ) : null}
                      {material.unitPrice !== undefined || material.cost ? (
                        <div>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Birim Fiyat</p>
                          <p className="text-[11px] sm:text-xs font-medium">
                            {(() => {
                              const price = material.unitPrice !== undefined && material.unitPrice !== null ? material.unitPrice : (material.cost !== undefined && material.cost !== null ? material.cost : 0);
                              const currency = material.currency || (material.currencies && material.currencies.length > 0 ? material.currencies[0] : "TRY");
                              const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || "₺";
                              return `${symbol}${(price || 0).toFixed(2)}`;
                            })()}
                          </p>
                        </div>
                      ) : null}
                      {material.vatRate !== undefined && material.vatRate !== null && material.vatRate > 0 ? (
                        <div>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">KDV Yüzdesi</p>
                          <p className="text-[11px] sm:text-xs font-medium">%{material.vatRate.toFixed(2)}</p>
                        </div>
                      ) : null}
                      {material.totalPrice !== undefined && material.totalPrice !== null ? (
                        <div>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Nihai Fiyat (KDV Dahil)</p>
                          <p className="text-[11px] sm:text-xs font-medium">
                            {(() => {
                              const currency = material.currency || (material.currencies && material.currencies.length > 0 ? material.currencies[0] : "TRY");
                              const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || "₺";
                              return `${symbol}${(material.totalPrice || 0).toFixed(2)}`;
                            })()}
                          </p>
                          {material.unitPrice && material.vatRate && material.vatRate > 0 && (
                            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                              {(() => {
                                const currency = material.currency || (material.currencies && material.currencies.length > 0 ? material.currencies[0] : "TRY");
                                const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || "₺";
                                return `Birim: ${symbol}${material.unitPrice.toFixed(2)} + KDV (%${material.vatRate.toFixed(2)}): ${symbol}${((material.unitPrice * material.vatRate) / 100).toFixed(2)}`;
                              })()}
                            </p>
                          )}
                        </div>
                      ) : null}
                      {material.brand ? (
                        <div>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Marka</p>
                          <p className="text-[11px] sm:text-xs font-medium">{material.brand}</p>
                        </div>
                      ) : null}
                      {material.link ? (
                      <div>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Link</p>
                          <a
                            href={material.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] sm:text-xs font-medium text-primary hover:underline break-all"
                          >
                            {material.link}
                          </a>
                      </div>
                      ) : null}
                      {material.supplier ? (
                        <div>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Tedarikçi</p>
                          <p className="text-[11px] sm:text-xs font-medium">{material.supplier}</p>
                        </div>
                      ) : null}
                      {material.purchasedBy ? (
                        <div>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Satın Alan Kişi</p>
                          <p className="text-[11px] sm:text-xs font-medium">
                            {(() => {
                              const user = users.find(u => u.id === material.purchasedBy);
                              return user ? (user.fullName || user.displayName || user.email || "İsimsiz Kullanıcı") : "Yükleniyor...";
                            })()}
                          </p>
                        </div>
                      ) : null}
                      {material.createdBy ? (
                        <div>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Ekleyen Kişi</p>
                          <p className="text-[11px] sm:text-xs font-medium">
                            {(() => {
                              const creator = users.find(u => u.id === material.createdBy);
                              return creator ? (creator.fullName || creator.email || "İsimsiz Kullanıcı") : "Yükleniyor...";
                            })()}
                          </p>
                        </div>
                      ) : null}
                      {material.location ? (
                        <div>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Hammadde Konumu</p>
                          <p className="text-[11px] sm:text-xs font-medium">{material.location}</p>
                        </div>
                      ) : null}
                    </div>

                    {(material.notes || material.description) && (
                      <div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Açıklama</p>
                        <p className="text-[11px] sm:text-xs">{material.notes || material.description || ""}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="recipes" className="space-y-3 sm:space-y-4 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-[14px] sm:text-[15px]">Reçete Yönetimi</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Reçete Ekleme Formu */}
                        <div className="rounded-lg border bg-muted/30 p-4 sm:p-6">
                          <h3 className="text-[11px] sm:text-xs font-semibold mb-4">Yeni Reçete Ekle</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label htmlFor="product-select" className="text-[11px] sm:text-xs">Ürün</Label>
                              <Select
                                value={selectedProduct}
                                onValueChange={setSelectedProduct}
                                disabled={productsLoading}
                              >
                                <SelectTrigger id="product-select" className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0">
                                  <SelectValue placeholder="Ürün seçin" />
                                </SelectTrigger>
                                <SelectContent className="text-[11px] sm:text-xs">
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id} className="text-[11px] sm:text-xs">
                                      {product.name} {product.sku ? `(${product.sku})` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label htmlFor="quantity-input" className="text-[11px] sm:text-xs">Miktar</Label>
                              <Input
                                id="quantity-input"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={newQuantity}
                                onChange={(e) => setNewQuantity(e.target.value)}
                                placeholder="Miktar"
                                className="text-[11px] sm:text-xs min-h-[44px] sm:min-h-0"
                              />
                            </div>
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-[11px] sm:text-xs opacity-0">Ekle</Label>
                              <Button
                                onClick={addRecipe}
                                disabled={recipeLoading || !selectedProduct || !newQuantity}
                                className="text-[11px] sm:text-xs w-full min-h-[44px] sm:min-h-0"
                              >
                                {recipeLoading ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Plus className="mr-2 h-4 w-4" />
                                )}
                                Ekle
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Reçete Listesi */}
                        {recipeLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : recipes.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-[11px] sm:text-xs">Bu hammadde henüz hiçbir üründe kullanılmamış</p>
                          </div>
                        ) : (
                          <div className="rounded-lg border bg-white overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-[11px] sm:text-xs">Ürün Adı</TableHead>
                                  <TableHead className="text-[11px] sm:text-xs">Stok Kodu</TableHead>
                                  <TableHead className="text-[11px] sm:text-xs">Miktar</TableHead>
                                  <TableHead className="text-[11px] sm:text-xs text-right">İşlemler</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {recipes.map((recipe) => {
                                  const product = recipe.product;
                                  return (
                                    <TableRow key={recipe.id}>
                                      <TableCell className="text-[11px] sm:text-xs font-medium">
                                        {product?.name || "Silinmiş Ürün"}
                                      </TableCell>
                                      <TableCell className="text-[11px] sm:text-xs text-muted-foreground font-mono">
                                        {product?.sku || "-"}
                                      </TableCell>
                                      <TableCell className="text-[11px] sm:text-xs">
                                        <span className="font-medium">{recipe.quantityPerUnit}</span>
                                        <span className="text-[11px] sm:text-xs text-muted-foreground ml-1">
                                          {material.unit || "Adet"}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeRecipe(recipe.id)}
                                          className="text-[11px] sm:text-xs h-8 w-8 p-0 text-destructive hover:text-destructive min-h-[44px] sm:min-h-0"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="transactions" className="space-y-3 sm:space-y-4 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-[14px] sm:text-[15px]">Stok Hareketleri</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {transactionsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : transactions.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-[11px] sm:text-xs">Henüz stok hareketi yapılmamış</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-[11px] sm:text-xs">Tarih</TableHead>
                                  <TableHead className="text-[11px] sm:text-xs">İşlem Türü</TableHead>
                                  <TableHead className="text-[11px] sm:text-xs text-right">Miktar</TableHead>
                                  <TableHead className="text-[11px] sm:text-xs">Sipariş</TableHead>
                                  <TableHead className="text-[11px] sm:text-xs">Ürün</TableHead>
                                  <TableHead className="text-[11px] sm:text-xs">Kullanıcı</TableHead>
                                  <TableHead className="text-[11px] sm:text-xs">Açıklama</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {transactions.map((t) => {
                                  const orderInfo = t.relatedOrderId ? ordersMap[t.relatedOrderId] : null;
                                  const userName = usersMap[t.createdBy] || "Bilinmeyen";
                                  
                                  return (
                                    <TableRow key={t.id}>
                                      <TableCell className="text-[11px] sm:text-xs whitespace-nowrap">
                                        {formatTransactionDate(t.createdAt)}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={t.type === "in" ? "default" : "destructive"} className="text-[10px]">
                                          {t.type === "in" ? "Giriş" : "Çıkış"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell
                                        className={`text-[11px] sm:text-xs text-right font-medium whitespace-nowrap ${
                                          t.type === "in" ? "text-green-600" : "text-red-600"
                                        }`}
                                      >
                                        {t.type === "in" ? "+" : "-"}
                                        {t.quantity}
                                      </TableCell>
                                      <TableCell className="text-[11px] sm:text-xs">
                                        {orderInfo ? (
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{orderInfo.orderNumber}</span>
                                            {t.relatedOrderId && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-[11px] sm:text-xs h-6 w-6 p-0"
                                                onClick={() => {
                                                  window.open(`/production?orderId=${t.relatedOrderId}`, '_blank');
                                                }}
                                                title="Siparişi aç"
                                              >
                                                <ExternalLink className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </div>
                                        ) : (
                                          "-"
                                        )}
                                      </TableCell>
                                      <TableCell className="text-[11px] sm:text-xs">
                                        {orderInfo?.productName || "-"}
                                      </TableCell>
                                      <TableCell className="text-[11px] sm:text-xs">
                                        {userName}
                                      </TableCell>
                                      <TableCell className="text-[11px] sm:text-xs max-w-xs truncate" title={t.reason}>
                                        {t.reason || "-"}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </DialogContent>
        
        {/* Activity Comments Panel */}
        {material?.id && user && (
          <ActivityCommentsPanel
            entityId={material.id}
            entityType="material"
            onAddComment={async (content: string) => {
              await addMaterialComment(
                material.id,
                user.id,
                content,
                user.fullName,
                user.email
              );
            }}
            onGetComments={async () => {
              return await getMaterialComments(material.id);
            }}
            onGetActivities={async () => {
              return await getMaterialActivities(material.id);
            }}
            currentUserId={user.id}
            currentUserName={user.fullName}
            currentUserEmail={user.email}
          />
        )}
      </Dialog>
    </>
  );
};
