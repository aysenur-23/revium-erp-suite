import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
<<<<<<< HEAD
import { Plus, Package, X, AlertTriangle, TrendingUp, Box, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Building2, DollarSign, Trash2 } from "lucide-react";
=======
import { Plus, Package, X, AlertTriangle, TrendingUp, Box, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Building2, DollarSign } from "lucide-react";
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getProducts, deleteProduct, Product } from "@/services/firebase/productService";
import { getAllUsers } from "@/services/firebase/authService";
import { useAuth } from "@/contexts/AuthContext";
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
import { canCreateResource, canDeleteResource } from "@/utils/permissions";
import { UserProfile } from "@/services/firebase/authService";
<<<<<<< HEAD
import { StatCard } from "@/components/Dashboard/StatCard";
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

const PRODUCT_CATEGORIES = [
  "Taşınabilir Güç Paketleri",
  "Kabin Tipi Güç Paketleri",
  "Araç Tipi Güç Paketleri",
  "Endüstriyel Güç Paketleri",
  "Güneş Enerji Sistemleri",
] as const;

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockView, setStockView] = useState<"all" | "low" | "out">("all");
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [activeStatCard, setActiveStatCard] = useState<string | null>(null);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem("productCurrency");
    return (saved as Currency) || DEFAULT_CURRENCY;
  });
  const [canCreate, setCanCreate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [sortColumn, setSortColumn] = useState<"name" | "category" | "stock" | "price">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('products-column-widths');
    return saved ? JSON.parse(saved) : {
      name: 250,
      category: 180,
      sku: 120,
      stock: 100,
      minStock: 100,
      price: 120,
      status: 120,
      createdBy: 150,
    };
  });
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Yetki kontrolleri - Firestore'dan kontrol et
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setCanCreate(false);
        setCanDelete(false);
        return;
      }
      try {
        const userProfile: UserProfile = {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          fullName: user.fullName,
          displayName: user.fullName,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          role: user.roles,
          createdAt: null,
          updatedAt: null,
        };
        const [canCreateProduct, canDeleteProduct] = await Promise.all([
          canCreateResource(userProfile, "products"),
          canDeleteResource(userProfile, "products"),
        ]);
        setCanCreate(canCreateProduct);
        setCanDelete(canDeleteProduct);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Error checking product permissions:", error);
        }
        setCanCreate(false);
        setCanDelete(false);
      }
    };
    checkPermissions();
  }, [user]);

  // Kullanıcıları lazy load et (sadece gerektiğinde yükle - performans için)
  useEffect(() => {
    const fetchUsers = async () => {
      if (Object.keys(usersMap).length > 0) return; // Zaten yüklü
      // Kullanıcı listesini arka planda yükle (bloklamadan)
      setTimeout(async () => {
        try {
          const usersData = await getAllUsers();
          const userMap: Record<string, string> = {};
          usersData.forEach(u => {
            userMap[u.id] = u.fullName || u.displayName || u.email || "Bilinmeyen";
          });
          setUsersMap(userMap);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error("Error fetching users:", error);
          }
        }
      }, 100); // 100ms gecikme ile non-blocking yükleme
    };
    fetchUsers();
  }, [usersMap]);

  // Ürünleri yükle
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const productsData = await getProducts();
      setProducts(productsData);
    } catch (error: unknown) {
      // Sadece development'ta log göster
      if (import.meta.env.DEV) {
        console.error("Fetch products error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Ürünler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleDelete = useCallback(async () => {
    if (!selectedProduct) return;
    
    // Yetki kontrolü
    if (!canDelete) {
      toast.error("Ürün silme yetkiniz yok.");
      setDeleteDialogOpen(false);
      return;
    }

    try {
      await deleteProduct(selectedProduct.id, user?.id);
      toast.success("Ürün silindi");
      // Ürünleri state'ten kaldır
      setProducts(prev => prev.filter(p => p.id !== selectedProduct.id));
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    } catch (error: unknown) {
      // Sadece development'ta log göster
      if (import.meta.env.DEV) {
        console.error("Delete product error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Ürün silinirken hata oluştu");
    }
  }, [selectedProduct, user?.id]);

  const isLowStockProduct = useCallback((product: Product) => {
    const stock = Number(product.stock) || 0;
    const minStock = Number(product.minStock ?? 0);
    return stock > 0 && stock <= minStock;
  }, []);

  const isOutOfStockProduct = useCallback((product: Product) => {
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

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleResizeStart = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(column);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidths[column] || 100;
  };

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!resizingColumn) return;
      
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(50, resizeStartWidth.current + diff);
      
      setColumnWidths(prev => {
        const updated = { ...prev, [resizingColumn]: newWidth };
        localStorage.setItem('products-column-widths', JSON.stringify(updated));
        return updated;
      });
    };

    const handleResizeEnd = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingColumn, columnWidths]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) {
      return [];
    }
    let filtered = products.filter((product) => {
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

    // Sıralama
    filtered.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      if (sortColumn === "name") {
        aValue = (a.name || "").toLowerCase();
        bValue = (b.name || "").toLowerCase();
      } else if (sortColumn === "category") {
        aValue = (a.category || "").toLowerCase();
        bValue = (b.category || "").toLowerCase();
      } else if (sortColumn === "stock") {
        aValue = Number(a.stock) || 0;
        bValue = Number(b.stock) || 0;
      } else if (sortColumn === "price") {
        aValue = Number(a.price) || 0;
        bValue = Number(b.price) || 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue, "tr-TR")
          : bValue.localeCompare(aValue, "tr-TR");
      } else {
        return sortDirection === "asc" 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [products, debouncedSearchTerm, categoryFilter, stockView, isLowStockProduct, isOutOfStockProduct, sortColumn, sortDirection]);

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
      <div className="space-y-2 w-full sm:w-[95%] md:w-[90%] lg:max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-foreground">Ürünler</h1>
                <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">Stok ve ürün yönetimi</p>
              </div>
              {/* İstatistikler Açılma Butonu */}
              {!statsExpanded ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatsExpanded(true)}
                  className="h-7 px-2 gap-1 text-[11px] sm:text-xs"
                  aria-label="İstatistikleri göster"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatsExpanded(false)}
                  className="h-7 px-2 gap-1 text-[11px] sm:text-xs"
                  aria-label="İstatistikleri gizle"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          {canCreate && (
          <Button 
            className="gap-1 w-full sm:w-auto min-h-[36px] sm:min-h-8 text-[11px] sm:text-xs" 
            onClick={() => {
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Yeni Ürün</span>
            <span className="sm:hidden">Yeni</span>
          </Button>
          )}
        </div>

        {/* İstatistikler */}
        {statsExpanded && (
<<<<<<< HEAD
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-2.5 sm:gap-3">
            {productStatCards.map((item) => {
              const variantMap: Record<string, "default" | "primary" | "success" | "warning" | "info"> = {
                "total-products": "primary",
                "low-stock": "warning",
                "out-of-stock": "default",
                "total-value": "info",
              };
              const variant = variantMap[item.key] || "default";
              const value = typeof item.value === 'function' ? item.value() : item.value;
              
              return (
                <StatCard
                  key={item.key}
                  title={item.label}
                  value={value}
                  icon={item.icon}
                  variant={variant}
                  onClick={item.onClick}
                  clickable
                />
              );
            })}
          </div>
=======
          <Card>
          <CardContent className="p-1.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
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
                    <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                      <div className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0", item.accent)}>
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] sm:text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                        <p className="text-lg sm:text-xl font-semibold text-foreground mt-0.5 sm:mt-1">{item.value}</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        )}

        {/* Filtreler */}
        <Card>
          <CardContent className="p-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
              {/* Arama Kutusu */}
              <div className="flex-1 min-w-0 w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]">
                <SearchInput
                  placeholder="Ürün, SKU veya kategori ara..."
                  className="w-full h-9 sm:h-10 text-[11px] sm:text-xs"
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
                  <SelectTrigger className="w-full h-9 sm:h-10 text-[11px] sm:text-xs">
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
                  <SelectTrigger className="w-full h-9 sm:h-10 text-[11px] sm:text-xs">
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
                  className="h-9 sm:h-10 text-[11px] sm:text-xs"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Temizle</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Liste Görünümü */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="p-8 sm:p-10 md:p-12">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-muted/50 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Package className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-muted-foreground" />
                </div>
                <h3 className="text-[14px] sm:text-[15px] font-semibold text-foreground mb-1.5 sm:mb-2">
                  {searchTerm || categoryFilter !== "all"
                    ? "Arama sonucu bulunamadı"
                    : "Henüz ürün bulunmuyor"}
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground max-w-md mx-auto">
                  {searchTerm || categoryFilter !== "all"
                    ? "Filtreleri değiştirerek tekrar deneyin"
                    : "Yeni ürün eklemek için yukarıdaki butona tıklayın"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full max-w-full min-w-0">
            <div className="hidden md:block border border-[#DFE1E6] dark:border-[#38414A] rounded-sm bg-white dark:bg-[#1D2125] w-full">
              <div className="table border-collapse w-full" style={{ tableLayout: 'auto', width: '100%' }}>
                {/* Tablo Başlıkları */}
                <div className="table-header-group bg-[#F4F5F7] dark:bg-[#22272B]">
                  <div className="table-row">
                    <div 
                      className="table-cell px-0 sm:px-0.5 md:px-1 py-1.5 sm:py-2 cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] transition-all duration-200 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                      style={{ width: columnWidths.name || 250, minWidth: 200 }}
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1.5">
                        Ürün Adı
                        {sortColumn === "name" && (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                      <div 
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleResizeStart("name", e)}
                      />
                    </div>
                    <div 
                      className="table-cell px-0 sm:px-0.5 md:px-1 py-1.5 sm:py-2 cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] transition-all duration-200 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                      style={{ width: columnWidths.category || 220, minWidth: 180 }}
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center gap-1.5">
                        Kategori
                        {sortColumn === "category" && (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                      <div 
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleResizeStart("category", e)}
                      />
                    </div>
                    <div 
                      className="table-cell px-0 sm:px-0.5 md:px-1 py-1.5 sm:py-2 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                      style={{ width: columnWidths.sku || 140, minWidth: 130 }}
                    >
                      SKU
                      <div 
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleResizeStart("sku", e)}
                      />
                    </div>
                    <div 
                      className="table-cell px-0 sm:px-0.5 md:px-1 py-1.5 sm:py-2 cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] transition-all duration-200 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                      style={{ width: columnWidths.stock || 90, minWidth: 70 }}
                      onClick={() => handleSort("stock")}
                    >
                      <div className="flex items-center gap-1.5">
                        Stok
                        {sortColumn === "stock" && (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                      <div 
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleResizeStart("stock", e)}
                      />
                    </div>
                    <div 
                      className="table-cell px-0 sm:px-0.5 md:px-1 py-1.5 sm:py-2 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                      style={{ width: columnWidths.minStock || 90, minWidth: 70 }}
                    >
                      Min Stok
                      <div 
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleResizeStart("minStock", e)}
                      />
                    </div>
                    <div 
                      className="table-cell px-0 sm:px-0.5 md:px-1 py-1.5 sm:py-2 cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] transition-all duration-200 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                      style={{ width: columnWidths.price || 140, minWidth: 120 }}
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center gap-1.5">
                        Fiyat
                        {sortColumn === "price" && (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                      <div 
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleResizeStart("price", e)}
                      />
                    </div>
                    <div 
                      className="table-cell px-0 sm:px-0.5 md:px-1 py-1.5 sm:py-2 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                      style={{ width: columnWidths.status || 120, minWidth: 100 }}
                    >
                      Durum
                      <div 
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleResizeStart("status", e)}
                      />
                    </div>
                    <div 
                      className="table-cell px-0 sm:px-0.5 md:px-1 py-1.5 sm:py-2 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                      style={{ width: columnWidths.createdBy || 140, minWidth: 120 }}
                    >
                      Oluşturan
                      <div 
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleResizeStart("createdBy", e)}
                      />
                    </div>
<<<<<<< HEAD
                    {canDelete && (
                      <div 
                        className="table-cell px-0 sm:px-0.5 md:px-1 py-1.5 sm:py-2 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                        style={{ width: 80, minWidth: 80 }}
                      >
                        İşlemler
                      </div>
                    )}
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  </div>
                </div>

                {/* Tablo İçeriği */}
                <div 
                  ref={listContainerRef}
                  style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto', display: 'table-row-group' }}
                >
                  {filteredProducts.map((product) => {
                    const stock = Number(product.stock) || 0;
                    const minStock = Number(product.minStock ?? 0);
                    const isOutOfStock = stock === 0;
                    const isLowStock = stock > 0 && stock <= minStock;
                    const price = Number(product.price) || 0;

                    return (
                      <div
                key={product.id}
                        className="table-row group border-b border-[#DFE1E6] dark:border-[#38414A] hover:bg-[#F4F5F7] dark:hover:bg-[#22272B] transition-all duration-200 cursor-pointer bg-white dark:bg-[#1D2125]"
                        onClick={() => {
                  setSelectedProduct(product);
                  setDetailModalOpen(true);
                }}
                      >
                        <div className="table-cell px-0 sm:px-0.5 md:px-1 py-1 sm:py-1.5 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[#172B4D] dark:text-[#B6C2CF]">
                              {product.name}
                            </span>
                            {isOutOfStock && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                Tükendi
                              </Badge>
                            )}
                            {isLowStock && !isOutOfStock && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                Düşük
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="table-cell px-0 sm:px-0.5 md:px-1 py-1 sm:py-1.5 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                          {product.category ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-[#42526E] dark:text-[#B6C2CF]" />
                              <span className="text-xs text-[#42526E] dark:text-[#B6C2CF] truncate">
                                {product.category}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#6B778C] dark:text-[#8C9CB8]">-</span>
                          )}
                        </div>
                        <div className="table-cell px-0 sm:px-0.5 md:px-1 py-1 sm:py-1.5 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                          {product.sku ? (
                            <span className="text-xs font-mono text-[#42526E] dark:text-[#B6C2CF]">
                              {product.sku}
                            </span>
                          ) : (
                            <span className="text-xs text-[#6B778C] dark:text-[#8C9CB8]">-</span>
                          )}
                        </div>
                        <div className="table-cell px-0 sm:px-0.5 md:px-1 py-1 sm:py-1.5 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-[#42526E] dark:text-[#B6C2CF]" />
                            <span className="text-xs font-medium text-[#42526E] dark:text-[#B6C2CF]">
                              {stock}
                            </span>
                          </div>
                        </div>
                        <div className="table-cell px-0 sm:px-0.5 md:px-1 py-1 sm:py-1.5 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                          <span className="text-xs font-medium text-[#42526E] dark:text-[#B6C2CF]">
                            {minStock > 0 ? minStock : "-"}
                          </span>
                        </div>
                        <div className="table-cell px-0 sm:px-0.5 md:px-1 py-1 sm:py-1.5 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                          <span className="text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF]">
                            {CURRENCY_SYMBOLS[selectedCurrency]}{new Intl.NumberFormat(selectedCurrency === "TRY" ? "tr-TR" : "en-US", { 
                              minimumFractionDigits: 0, 
                              maximumFractionDigits: 0 
                            }).format(price)}
                          </span>
                        </div>
                        <div className="table-cell px-0 sm:px-0.5 md:px-1 py-1 sm:py-1.5 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                          <Badge 
                            variant={isOutOfStock ? "destructive" : isLowStock ? "secondary" : "default"}
                            className={cn(
                              "text-xs font-medium",
                              isOutOfStock && "bg-destructive/10 text-destructive border-destructive/20",
                              isLowStock && !isOutOfStock && "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
                              !isOutOfStock && !isLowStock && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            )}
                          >
                            {isOutOfStock ? "Stokta Yok" : isLowStock ? "Stok Düşük" : "Stokta Var"}
                          </Badge>
                        </div>
                        <div className="table-cell px-0 sm:px-0.5 md:px-1 py-1 sm:py-1.5 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                          {product.createdBy ? (
                            <span className="text-xs text-[#42526E] dark:text-[#B6C2CF]">
                              {usersMap[product.createdBy] || "Bilinmeyen"}
                            </span>
                          ) : (
                            <span className="text-xs text-[#6B778C] dark:text-[#8C9CB8]">-</span>
                          )}
                        </div>
<<<<<<< HEAD
                        {canDelete && (
                          <div className="table-cell px-0 sm:px-0.5 md:px-1 py-1 sm:py-1.5 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct(product);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobil Görünüm */}
            <div className="md:hidden space-y-3">
              {filteredProducts.map((product) => {
                const stock = Number(product.stock) || 0;
                const minStock = Number(product.minStock ?? 0);
                const isOutOfStock = stock === 0;
                const isLowStock = stock > 0 && stock <= minStock;
                const price = Number(product.price) || 0;

                return (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => {
                  setSelectedProduct(product);
                      setDetailModalOpen(true);
                    }}
                  >
                    <CardContent className="p-3 sm:p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[11px] sm:text-xs">{product.name}</h3>
                          {product.category && (
                            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {product.category}
                            </p>
                          )}
                        </div>
<<<<<<< HEAD
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            variant={isOutOfStock ? "destructive" : isLowStock ? "secondary" : "default"}
                            className={cn(
                              isOutOfStock && "bg-destructive/10 text-destructive",
                              isLowStock && !isOutOfStock && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                              !isOutOfStock && !isLowStock && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            )}
                          >
                            {isOutOfStock ? "Tükendi" : isLowStock ? "Düşük" : "Var"}
                          </Badge>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct(product);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
=======
                        <Badge 
                          variant={isOutOfStock ? "destructive" : isLowStock ? "secondary" : "default"}
                          className={cn(
                            isOutOfStock && "bg-destructive/10 text-destructive",
                            isLowStock && !isOutOfStock && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                            !isOutOfStock && !isLowStock && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          )}
                        >
                          {isOutOfStock ? "Tükendi" : isLowStock ? "Düşük" : "Var"}
                        </Badge>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      </div>
                      {product.sku && (
                        <p className="text-[11px] sm:text-xs font-mono text-muted-foreground">SKU: {product.sku}</p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[11px] sm:text-xs font-medium">Stok: {stock}</span>
                          {minStock > 0 && (
                            <span className="text-[11px] sm:text-xs text-muted-foreground">(Min: {minStock})</span>
                          )}
                        </div>
                        <span className="text-[11px] sm:text-xs font-semibold">
                          {CURRENCY_SYMBOLS[selectedCurrency]}{new Intl.NumberFormat(selectedCurrency === "TRY" ? "tr-TR" : "en-US", { 
                            minimumFractionDigits: 0, 
                            maximumFractionDigits: 0 
                          }).format(price)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
            onDelete={() => {
              setDetailModalOpen(false);
              setDeleteDialogOpen(true);
            }}
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
        data={products as unknown as Record<string, unknown>[]}
      />
    </MainLayout>
  );
};

export default Products;
