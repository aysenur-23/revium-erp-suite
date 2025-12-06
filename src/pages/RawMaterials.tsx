import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, Package, AlertTriangle, Edit, Trash2, X, User, 
  TrendingDown, TrendingUp, AlertCircle, Filter, BarChart3, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { getRawMaterials, deleteRawMaterial, RawMaterial } from "@/services/firebase/materialService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { CreateRawMaterialDialog } from "@/components/RawMaterials/CreateRawMaterialDialog";
import { EditRawMaterialDialog } from "@/components/RawMaterials/EditRawMaterialDialog";
import { RawMaterialDetailModal } from "@/components/RawMaterials/RawMaterialDetailModal";
import { DetailedValueReportModal } from "@/components/Statistics/DetailedValueReportModal";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const RawMaterials = () => {
  const navigate = useNavigate();
  const sidebarContext = useSidebarContext();
  const tableRef = useRef<HTMLDivElement>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockView, setStockView] = useState<"all" | "normal" | "low" | "out">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<any>(null);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [activeStatCard, setActiveStatCard] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    fetchMaterials();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const materialsData = await getRawMaterials();
      // Kullanıcı adlarını ekle
      const materialsWithUserNames = materialsData.map((material) => {
        const creator = users.find((u) => u.id === material.createdBy);
        return {
          ...material,
          created_by_name: creator
            ? creator.fullName || creator.displayName || creator.email || "-"
            : "-",
        };
      });
      setMaterials(materialsWithUserNames);
    } catch (error: any) {
      console.error("Fetch materials error:", error);
      toast.error(error.message || "Hammaddeler yüklenirken hata oluştu");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcılar yüklendiğinde materyalleri yeniden yükle
  useEffect(() => {
    if (users.length > 0 && materials.length > 0) {
      const materialsWithUserNames = materials.map((material) => {
        const creator = users.find((u) => u.id === material.createdBy);
        return {
          ...material,
          created_by_name: creator
            ? creator.fullName || creator.displayName || creator.email || "-"
            : "-",
        };
      });
      // Sadece değişiklik varsa güncelle
      const hasChanges = materialsWithUserNames.some(
        (m, i) => m.created_by_name !== materials[i]?.created_by_name
      );
      if (hasChanges) {
        setMaterials(materialsWithUserNames);
      }
    }
  }, [users.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const stockNum = Number(stock) || 0;
    const minStockNum = Number(min_stock) || 0;
    
    if (isNaN(stockNum) || isNaN(minStockNum)) {
      return { label: "Bilinmiyor", variant: "outline" as const, color: "text-gray-600", bgColor: "bg-gray-50" };
    }
    
    if (stockNum === 0) return { label: "Tükendi", variant: "destructive" as const, color: "text-red-600", bgColor: "bg-red-50" };
    if (stockNum < minStockNum) return { label: "Düşük", variant: "secondary" as const, color: "text-yellow-600", bgColor: "bg-yellow-50" };
    return { label: "Normal", variant: "default" as const, color: "text-green-600", bgColor: "bg-green-50" };
  };

  const getStockFlags = (stock: number, minStock: number) => {
    const stockNum = Number(stock) || 0;
    const minStockNum = Number(minStock) || 0;
    const isOut = stockNum === 0;
    const isLow = stockNum > 0 && stockNum < minStockNum;
    const isNormal = !isOut && !isLow;
    return { isOut, isLow, isNormal };
  };

  const filteredMaterials = useMemo(() => {
    if (!Array.isArray(materials)) {
      return [];
    }
    return materials.filter(m => {
      const stock = Number(m.currentStock !== undefined ? m.currentStock : m.stock) || 0;
      const minStock = Number(m.minStock !== undefined ? m.minStock : m.min_stock) || 0;
      const { isLow, isOut, isNormal } = getStockFlags(stock, minStock);
      
      if (stockView === "low" && !isLow) return false;
      if (stockView === "out" && !isOut) return false;
      if (stockView === "normal" && !isNormal) return false;
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = m.name?.toLowerCase().includes(query) || false;
        const skuMatch = (m.sku || m.code)?.toLowerCase().includes(query) || false;
        if (!nameMatch && !skuMatch) {
          return false;
        }
      }
      return true;
    });
  }, [materials, searchQuery, categoryFilter, stockView]);

  // İstatistikler - her zaman tüm materials üzerinden hesaplanır (filtreleme etkilemez)
  const stats = useMemo(() => {
    if (!Array.isArray(materials)) {
      return { total: 0, lowStock: 0, outOfStock: 0, normalStock: 0, totalValue: 0 };
    }
    const total = materials.length;
    const lowStock = materials.filter(m => {
      const stock = Number(m.currentStock !== undefined ? m.currentStock : m.stock) || 0;
      const minStock = Number(m.minStock !== undefined ? m.minStock : m.min_stock) || 0;
      return !isNaN(stock) && !isNaN(minStock) && stock < minStock && stock > 0;
    }).length;
    const outOfStock = materials.filter(m => {
      const stock = Number(m.currentStock !== undefined ? m.currentStock : m.stock) || 0;
      return !isNaN(stock) && stock === 0;
    }).length;
    const normalStock = total - lowStock - outOfStock;
    const totalValue = materials.reduce((sum, m) => {
      const stock = Number(m.currentStock !== undefined ? m.currentStock : m.stock) || 0;
      const cost = Number(m.unitPrice !== undefined ? m.unitPrice : m.cost) || 0;
      const value = stock * cost;
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    
    return { total, lowStock, outOfStock, normalStock, totalValue };
  }, [materials]);

  const formattedMaterialValue = useMemo(() => {
    try {
      return `₺${new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(stats.totalValue || 0)}`;
    } catch {
      return `₺${stats.totalValue?.toFixed?.(0) ?? "0"}`;
    }
  }, [stats.totalValue]);

  const rawMaterialStatCards = [
    {
      key: "total-materials",
      label: "Toplam Hammadde",
      value: stats.total,
      accent: "bg-blue-100 text-blue-700",
      icon: Package,
      description: "Tüm kayıtlar",
      onClick: () => {
        setStockView("all");
        setCategoryFilter("all");
        setSearchQuery("");
        setActiveStatCard("total-materials");
      },
      isActive: activeStatCard === "total-materials",
    },
    {
      key: "normal-stock",
      label: "Normal Stok",
      value: stats.normalStock,
      accent: "bg-green-100 text-green-700",
      icon: TrendingUp,
      description: "Stok seviyesi yeterli",
      onClick: () => {
        setStockView("normal");
        setActiveStatCard("normal-stock");
      },
      isActive: activeStatCard === "normal-stock",
    },
    {
      key: "low-stock",
      label: "Düşük Stok",
      value: stats.lowStock,
      accent: "bg-yellow-100 text-yellow-700",
      icon: AlertTriangle,
      description: "Min seviyenin altında",
      onClick: () => {
        setStockView("low");
        setActiveStatCard("low-stock");
      },
      isActive: activeStatCard === "low-stock",
    },
    {
      key: "out-stock",
      label: "Tükenen",
      value: stats.outOfStock,
      accent: "bg-red-100 text-red-700",
      icon: AlertCircle,
      description: "Stoğu sıfırlananlar",
      onClick: () => {
        setStockView("out");
        setActiveStatCard("out-stock");
      },
      isActive: activeStatCard === "out-stock",
    },
    {
      key: "total-value",
      label: "Toplam Değer",
      value: formattedMaterialValue,
      accent: "bg-purple-100 text-purple-700",
      icon: BarChart3,
      description: "Detaylı raporlar",
      onClick: () => {
        setActiveStatCard("total-value");
        setStatsModalOpen(true);
      },
      isActive: activeStatCard === "total-value",
    },
  ];

  const totalPages = Math.ceil(filteredMaterials.length / limit);
  const paginatedMaterials = filteredMaterials.slice((page - 1) * limit, page * limit);

  const handleDeleteClick = (material: any) => {
    setMaterialToDelete(material);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!materialToDelete) return;
    
    try {
      await deleteRawMaterial(materialToDelete.id);
      toast.success("Hammadde silindi");
      fetchMaterials();
      setDeleteDialogOpen(false);
      setMaterialToDelete(null);
    } catch (error: any) {
      console.error("Delete material error:", error);
      toast.error(error.message || "Hammadde silinirken hata oluştu");
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, stockView]);

  // İçerik sığmıyorsa sidebar'ı otomatik kapat
  useEffect(() => {
    if (!sidebarContext || loading) return;
    
    let timeoutId: NodeJS.Timeout;
    let resizeTimeoutId: NodeJS.Timeout;
    let resizeObserver: ResizeObserver | null = null;
    
    const checkOverflow = () => {
      if (!tableRef.current || typeof window === "undefined") return;
      
      const tableElement = tableRef.current.querySelector('table');
      if (!tableElement) return;
      
      const tableWidth = tableElement.scrollWidth;
      const containerWidth = tableRef.current.clientWidth;
      
      // Eğer tablo genişliği container genişliğinden büyükse sidebar'ı kapat
      if (tableWidth > containerWidth + 10) { // 10px tolerans
        sidebarContext.closeSidebar();
      }
    };

    // İlk yüklemede kontrol et
    timeoutId = setTimeout(checkOverflow, 300);
    
    // ResizeObserver ile container değişikliklerini izle
    if (typeof ResizeObserver !== "undefined" && tableRef.current) {
      resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimeoutId);
        resizeTimeoutId = setTimeout(checkOverflow, 150);
      });
      resizeObserver.observe(tableRef.current);
    }
    
    // Window resize event'i
    const handleResize = () => {
      clearTimeout(resizeTimeoutId);
      resizeTimeoutId = setTimeout(checkOverflow, 150);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(resizeTimeoutId);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [paginatedMaterials, sidebarContext, loading]);

  const getStockPercentage = (stock: number, min_stock: number, max_stock?: number) => {
    const stockNum = Number(stock) || 0;
    const minStockNum = Number(min_stock) || 0;
    const maxStockNum = max_stock ? (Number(max_stock) || 0) : undefined;
    
    if (isNaN(stockNum) || isNaN(minStockNum)) return 0;
    
    if (maxStockNum && !isNaN(maxStockNum) && maxStockNum > 0) {
      const percentage = (stockNum / maxStockNum) * 100;
      return isNaN(percentage) ? 0 : Math.min(100, Math.max(0, percentage));
    }
    if (minStockNum > 0) {
      const percentage = (stockNum / (minStockNum * 2)) * 100;
      return isNaN(percentage) ? 0 : Math.min(100, Math.max(0, percentage));
    }
    return stockNum > 0 ? 50 : 0;
  };

  return (
    <MainLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground break-words">Hammadde Yönetimi</h1>
            <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">Hammadde stoklarını yönetin ve takip edin</p>
          </div>
          <Button className="gap-1.5 sm:gap-2 w-full sm:w-auto min-h-[44px] sm:min-h-10 text-xs sm:text-sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Yeni Hammadde</span>
            <span className="sm:hidden">Yeni</span>
          </Button>
        </div>

        {/* İstatistik Kartları */}
        <Card className="overflow-hidden">
          <CardContent className="pt-4 sm:pt-6 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {rawMaterialStatCards.map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.key}
                    className={cn(
                      "border border-border/60 shadow-none cursor-pointer transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-primary/40 h-full flex flex-col",
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
                    <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-4 flex-1">
                      <div className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0", item.accent)}>
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground truncate">{item.label}</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mt-0.5 sm:mt-1 truncate">{item.value}</p>
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
                  placeholder="Ara (isim, stok kodu)..."
                  className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                    <SelectItem value="chemical">Kimyasal</SelectItem>
                    <SelectItem value="metal">Metal</SelectItem>
                    <SelectItem value="plastic">Plastik</SelectItem>
                    <SelectItem value="electronic">Elektronik</SelectItem>
                    <SelectItem value="packaging">Ambalaj</SelectItem>
                    <SelectItem value="other">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtreleri Temizle */}
              {(searchQuery || categoryFilter !== "all" || stockView !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
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

        {/* Tablo */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 overflow-hidden">
            {loading ? (
              <LoadingState message="Hammaddeler yükleniyor..." />
            ) : paginatedMaterials.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-muted p-4">
                    <Package className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium text-base">
                    {searchQuery || categoryFilter !== "all" || stockView !== "all"
                      ? "Arama sonucu bulunamadı"
                      : "Henüz hammadde bulunmuyor"}
                  </p>
                  <p className="text-sm text-muted-foreground/70 max-w-md">
                    {searchQuery || categoryFilter !== "all" || stockView !== "all"
                      ? "Filtreleri değiştirerek tekrar deneyin"
                      : "Yeni hammadde eklemek için yukarıdaki butona tıklayın"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Responsive Table View - Kaydırma yok, her zaman tek ekranda */}
                <div ref={tableRef} className="w-full overflow-hidden">
                  <Table className="w-full table-fixed border-collapse">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[25%] sm:w-[20%]">Hammadde</TableHead>
                          <TableHead className="w-[15%] whitespace-nowrap hidden md:table-cell">Stok Kodu</TableHead>
                          <TableHead className="w-[10%] whitespace-nowrap hidden lg:table-cell">Kategori</TableHead>
                          <TableHead className="w-[10%] text-right whitespace-nowrap hidden xl:table-cell">Stok Durumu</TableHead>
                          <TableHead className="w-[15%] sm:w-[12%] text-right whitespace-nowrap">Mevcut</TableHead>
                          <TableHead className="w-[10%] text-right whitespace-nowrap hidden xl:table-cell">Min. Stok</TableHead>
                          <TableHead className="w-[10%] whitespace-nowrap hidden 2xl:table-cell">Tedarikçi</TableHead>
                          <TableHead className="w-[10%] whitespace-nowrap hidden 2xl:table-cell">Ekleyen</TableHead>
                          <TableHead className="w-[10%] whitespace-nowrap hidden lg:table-cell">Durum</TableHead>
                          <TableHead className="w-[20%] sm:w-[15%] text-right whitespace-nowrap">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {paginatedMaterials.map((material) => {
                        const currentStock = Number(material.currentStock !== undefined ? material.currentStock : material.stock) || 0;
                        const minStock = Number(material.minStock !== undefined ? material.minStock : material.min_stock) || 0;
                        const maxStock = material.maxStock !== undefined ? material.maxStock : material.max_stock;
                        const stockStatus = getStockStatus(currentStock, minStock);
                        const stockPercentage = getStockPercentage(currentStock, minStock, maxStock);
                        return (
                          <TableRow
                            key={material.id}
                            className={cn(
                              "cursor-pointer hover:bg-muted/50 transition-colors",
                              stockStatus.bgColor
                            )}
                            onClick={() => {
                              setSelectedMaterial(material);
                              setDetailModalOpen(true);
                            }}
                          >
                            <TableCell className="font-medium">
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="truncate text-xs sm:text-sm" title={material.name}>
                                          {material.name}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{material.name}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="flex items-center gap-1.5 md:hidden flex-wrap">
                                  <Badge variant="outline" className="font-normal text-[10px] px-1 py-0">
                                    {getCategoryLabel(material.category)}
                                  </Badge>
                                  <Badge
                                    variant={stockStatus.variant}
                                    className={cn(
                                      "font-medium text-[10px] px-1 py-0",
                                      stockStatus.variant === "destructive" && "bg-red-500 hover:bg-red-600 text-white",
                                      stockStatus.variant === "secondary" && "bg-yellow-500 hover:bg-yellow-600 text-white",
                                      stockStatus.variant === "default" && "bg-green-500 hover:bg-green-600 text-white"
                                    )}
                                  >
                                    {stockStatus.label}
                                  </Badge>
                                </div>
                                <span className="text-[10px] text-muted-foreground md:hidden font-mono">
                                  {material.sku || material.code || "-"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded truncate block">
                                {material.sku || material.code || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge variant="outline" className="font-normal text-xs px-1.5 py-0.5">
                                {getCategoryLabel(material.category)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap hidden xl:table-cell">
                              <div className="flex flex-col items-end gap-0.5">
                                <Progress 
                                  value={stockPercentage} 
                                  className={cn(
                                    "h-1.5 w-16",
                                    stockStatus.variant === "destructive" && "[&>div]:bg-red-500",
                                    stockStatus.variant === "secondary" && "[&>div]:bg-yellow-500",
                                    stockStatus.variant === "default" && "[&>div]:bg-green-500"
                                  )}
                                />
                                <span className={cn("text-[10px] font-medium", stockStatus.color)}>
                                  {isNaN(stockPercentage) ? "0" : stockPercentage.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold whitespace-nowrap">
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={cn(stockStatus.color, "text-xs sm:text-sm")}>
                                  {currentStock} {material.unit}
                                </span>
                                <span className="text-[10px] text-muted-foreground xl:hidden">
                                  Min: {minStock}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground whitespace-nowrap hidden xl:table-cell text-xs">
                              {minStock} {material.unit}
                            </TableCell>
                            <TableCell className="hidden 2xl:table-cell">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs truncate block" title={material.supplier || "-"}>
                                      {material.supplier || "-"}
                                    </span>
                                  </TooltipTrigger>
                                  {material.supplier && (
                                    <TooltipContent>
                                      <p>{material.supplier}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="hidden 2xl:table-cell">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs truncate" title={material.created_by_name || "-"}>
                                        {material.created_by_name || "-"}
                                      </span>
                                    </TooltipTrigger>
                                    {material.created_by_name && (
                                      <TooltipContent>
                                        <p>{material.created_by_name}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge
                                variant={stockStatus.variant}
                                className={cn(
                                  "font-medium text-xs px-1.5 py-0.5",
                                  stockStatus.variant === "destructive" && "bg-red-500 hover:bg-red-600 text-white",
                                  stockStatus.variant === "secondary" && "bg-yellow-500 hover:bg-yellow-600 text-white",
                                  stockStatus.variant === "default" && "bg-green-500 hover:bg-green-600 text-white"
                                )}
                              >
                                {stockStatus.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedMaterial(material);
                                          setEditDialogOpen(true);
                                        }}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Düzenle</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteClick(material);
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Sil</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
                
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                      Toplam {filteredMaterials.length} hammadde gösteriliyor
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1}
                      >
                        Önceki
                      </Button>
                      <span className="text-sm text-muted-foreground px-3">
                        Sayfa {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page === totalPages}
                      >
                        Sonraki
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <CreateRawMaterialDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={fetchMaterials}
        />

        {selectedMaterial && (
          <>
            <EditRawMaterialDialog
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              material={selectedMaterial}
              onSuccess={() => {
                fetchMaterials();
                setEditDialogOpen(false);
              }}
            />
            <RawMaterialDetailModal
              open={detailModalOpen}
              onOpenChange={setDetailModalOpen}
              material={selectedMaterial}
              onEdit={() => {
                setDetailModalOpen(false);
                setEditDialogOpen(true);
              }}
              onDelete={() => {
                fetchMaterials();
                setDetailModalOpen(false);
              }}
            />
          </>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hammadde Sil</AlertDialogTitle>
              <AlertDialogDescription>
                "{materialToDelete?.name}" hammaddesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DetailedValueReportModal
          open={statsModalOpen}
          onOpenChange={setStatsModalOpen}
          title="Hammadde Değer Raporu"
          type="rawMaterials"
          data={materials}
        />
      </div>
    </MainLayout>
  );
};

export default RawMaterials;
