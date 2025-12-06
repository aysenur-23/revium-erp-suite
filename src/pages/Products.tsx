import { useEffect, useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, Package, X, AlertTriangle, TrendingUp, Box } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getProducts, deleteProduct, Product } from "@/services/firebase/productService";
import { getAllUsers } from "@/services/firebase/authService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CreateProductDialog } from "@/components/Products/CreateProductDialog";
import { EditProductDialog } from "@/components/Products/EditProductDialog";
import { ProductDetailModal } from "@/components/Products/ProductDetailModal";
import { DetailedValueReportModal } from "@/components/Statistics/DetailedValueReportModal";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/Products/ProductCard";
import { CURRENCY_OPTIONS, CURRENCY_SYMBOLS, DEFAULT_CURRENCY, type Currency } from "@/utils/currency";
import { convertFromTRY } from "@/services/exchangeRateService";

const PRODUCT_CATEGORIES = [
  "Taşınabilir Güç Paketleri",
  "Kabin Tipi Güç Paketleri",
  "Araç Tipi Güç Paketleri",
  "Endüstriyel Güç Paketleri",
  "Güneş Enerji Sistemleri",
] as const;

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockView, setStockView] = useState<"all" | "low" | "out">("all");
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [activeStatCard, setActiveStatCard] = useState<string | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem("productCurrency");
    return (saved as Currency) || DEFAULT_CURRENCY;
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const [productsData, usersData] = await Promise.all([
        getProducts(),
        getAllUsers(),
      ]);
      setProducts(productsData);
      
      const userMap: Record<string, string> = {};
      usersData.forEach(u => {
        userMap[u.id] = u.fullName || u.displayName || u.email || "Bilinmeyen";
      });
      setUsersMap(userMap);
    } catch (error: any) {
      // Sadece development'ta log göster
      if (import.meta.env.DEV) {
        console.error("Fetch products error:", error);
      }
      toast.error(error.message || "Ürünler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedProduct) return;

    try {
      await deleteProduct(selectedProduct.id);
      toast.success("Ürün silindi");
      fetchProducts();
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    } catch (error: any) {
      // Sadece development'ta log göster
      if (import.meta.env.DEV) {
        console.error("Delete product error:", error);
      }
      toast.error(error.message || "Ürün silinirken hata oluştu");
    }
  }, [selectedProduct, fetchProducts]);

  const isLowStockProduct = useCallback((product: any) => {
    const stock = Number(product.stock) || 0;
    const minStock = Number(product.min_stock ?? product.minStock ?? 0);
    return stock > 0 && stock <= minStock;
  }, []);

  const isOutOfStockProduct = useCallback((product: any) => {
    const stock = Number(product.stock) || 0;
    return stock === 0;
  }, []);

  const stats = useMemo(() => {
    const total = products.length;
    const lowStock = products.filter((p) => isLowStockProduct(p)).length;
    const outOfStock = products.filter((p) => isOutOfStockProduct(p)).length;
    const totalValue = products.reduce((sum, p) => {
      const price = p.price || 0;
      const stock = p.stock || 0;
      return sum + (price * stock);
    }, 0);
    return { total, lowStock, outOfStock, totalValue };
  }, [products, isLowStockProduct, isOutOfStockProduct]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) {
      return [];
    }
    return products.filter((product) => {
      const matchesSearch = 
        product.name?.toLocaleLowerCase('tr-TR').includes(debouncedSearchTerm.toLocaleLowerCase('tr-TR')) ||
        product.sku?.toLocaleLowerCase('tr-TR').includes(debouncedSearchTerm.toLocaleLowerCase('tr-TR')) ||
        product.category?.toLocaleLowerCase('tr-TR').includes(debouncedSearchTerm.toLocaleLowerCase('tr-TR'));
      
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      const matchesStockView =
        stockView === "all" ||
        (stockView === "low" && isLowStockProduct(product)) ||
        (stockView === "out" && isOutOfStockProduct(product));
      
      return matchesSearch && matchesCategory && matchesStockView;
    });
  }, [products, debouncedSearchTerm, categoryFilter, stockView, isLowStockProduct, isOutOfStockProduct]);

  const formattedTotalValue = useMemo(() => {
    try {
      return `₺${new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(stats.totalValue || 0)}`;
    } catch {
      return `₺${stats.totalValue?.toFixed?.(0) ?? "0"}`;
    }
  }, [stats.totalValue]);

  const productStatCards = [
    {
      key: "total-products",
      label: "Toplam Ürün",
      value: stats.total,
      icon: Package,
      accent: "bg-primary/10 text-primary",
      description: "Tüm ürün kayıtları",
      onClick: () => {
        setStockView("all");
        setCategoryFilter("all");
        setSearchTerm("");
        setActiveStatCard("total-products");
      },
      isActive: activeStatCard === "total-products",
    },
    {
      key: "low-stock",
      label: "Düşük Stok",
      value: stats.lowStock,
      icon: AlertTriangle,
      accent: "bg-amber-100 text-amber-700",
      description: "Kritik stok seviyeleri",
      onClick: () => {
        setStockView("low");
        setCategoryFilter("all");
        setActiveStatCard("low-stock");
      },
      isActive: activeStatCard === "low-stock",
    },
    {
      key: "out-of-stock",
      label: "Tükenen Ürünler",
      value: stats.outOfStock,
      icon: Box,
      accent: "bg-red-100 text-red-700",
      description: "Stoğu tamamen bitenler",
      onClick: () => {
        setStockView("out");
        setCategoryFilter("all");
        setActiveStatCard("out-of-stock");
      },
      isActive: activeStatCard === "out-of-stock",
    },
    {
      key: "total-value",
      label: "Toplam Değer",
      value: formattedTotalValue,
      icon: TrendingUp,
      accent: "bg-emerald-100 text-emerald-700",
      description: "Detaylı raporlar",
      onClick: () => {
        setActiveStatCard("total-value");
        setStatsModalOpen(true);
      },
      isActive: activeStatCard === "total-value",
    },
  ];

  if (loading) {
    return (
      <MainLayout>
        <LoadingState message="Ürünler yükleniyor..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Ürünler</h1>
            <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">Stok ve ürün yönetimi</p>
          </div>
          <Button className="gap-1.5 sm:gap-2 w-full sm:w-auto min-h-[44px] sm:min-h-10 text-xs sm:text-sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Yeni Ürün</span>
            <span className="sm:hidden">Yeni</span>
          </Button>
        </div>

        {/* İstatistikler */}
        <Card>
          <CardContent className="p-4 sm:p-5 md:pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {productStatCards.map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.key}
                    className={cn(
                      "border border-border/60 shadow-none cursor-pointer transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-primary/40",
                      item.isActive && "border-primary shadow-lg ring-2 ring-primary/20"
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={item.onClick}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        item.onClick();
                      }
                    }}
                    aria-label={`${item.label} kartı`}
                  >
                    <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3 md:gap-4">
                      <div className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0", item.accent)}>
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                        <p className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">{item.value}</p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 hidden sm:block">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filtreler */}
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
              {/* Arama Kutusu */}
              <div className="flex-1 min-w-0 w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]">
                <SearchInput
                  placeholder="Ürün, SKU veya kategori ara..."
                  className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value === "") {
                      setActiveStatCard(null);
                    }
                  }}
                />
              </div>
              
              {/* Kategori Filtresi */}
              <div className="w-full sm:w-auto sm:min-w-[160px] md:min-w-[180px]">
                <Select value={categoryFilter} onValueChange={(value) => {
                  setCategoryFilter(value);
                  setActiveStatCard(null);
                }}>
                  <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Kategoriler</SelectItem>
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Para Birimi Seçici */}
              <div className="w-full sm:w-auto sm:min-w-[140px] md:min-w-[150px]">
                <Select value={selectedCurrency} onValueChange={(value) => {
                  setSelectedCurrency(value as Currency);
                  localStorage.setItem("productCurrency", value);
                }}>
                  <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Para Birimi" />
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
              
              {/* Filtreleri Temizle */}
              {(searchTerm || categoryFilter !== "all" || stockView !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                    setStockView("all");
                    setActiveStatCard(null);
                  }}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Temizle</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ürün Listesi */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="p-8 sm:p-10 md:p-12">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-muted/50 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Package className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5 sm:mb-2">
                  {searchTerm || categoryFilter !== "all"
                    ? "Arama sonucu bulunamadı"
                    : "Henüz ürün bulunmuyor"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                  {searchTerm || categoryFilter !== "all"
                    ? "Filtreleri değiştirerek tekrar deneyin"
                    : "Yeni ürün eklemek için yukarıdaki butona tıklayın"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                usersMap={usersMap}
                currency={selectedCurrency}
                onSelect={(product) => {
                  setSelectedProduct(product);
                  setDetailModalOpen(true);
                }}
                onEdit={(product) => {
                  setSelectedProduct(product);
                  setEditDialogOpen(true);
                }}
                onDelete={(product) => {
                  setSelectedProduct(product);
                  setDeleteDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProductDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchProducts}
      />

      {selectedProduct && (
        <>
          <EditProductDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={fetchProducts}
            product={selectedProduct}
          />
          <ProductDetailModal
            open={detailModalOpen}
            onOpenChange={setDetailModalOpen}
            product={selectedProduct}
            onUpdate={fetchProducts}
          />
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ürünü sil?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Ürün kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DetailedValueReportModal
        open={statsModalOpen}
        onOpenChange={setStatsModalOpen}
        title="Ürün Değer Raporu"
        type="products"
        data={products}
      />
    </MainLayout>
  );
};

export default Products;
