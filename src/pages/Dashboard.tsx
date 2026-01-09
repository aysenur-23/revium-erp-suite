import { useMemo, memo } from "react";
import * as React from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { StatCard } from "@/components/Dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, ShoppingCart, TrendingUp, Loader2, FileText, AlertTriangle, Clock, CheckSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTasks, getTaskAssignments, Task, TaskAssignment } from "@/services/firebase/taskService";
import { getProducts, Product } from "@/services/firebase/productService";
import { getRawMaterials, RawMaterial } from "@/services/firebase/materialService";
import { getWarrantyRecords, WarrantyRecord } from "@/services/firebase/warrantyService";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const statsExpanded = true; // İstatistikler her zaman açık
  
  // Defer non-critical queries: İlk render'dan sonra yükle
  const [shouldLoadTasks, setShouldLoadTasks] = React.useState(false);
  const [shouldLoadLowStock, setShouldLoadLowStock] = React.useState(false);
  const [shouldLoadWarranty, setShouldLoadWarranty] = React.useState(false);
  
  React.useEffect(() => {
    // İlk render'dan 200ms sonra tasks'ı yükle (non-blocking)
    const timer1 = setTimeout(() => setShouldLoadTasks(true), 200);
    // İlk render'dan 400ms sonra low stock'ı yükle
    const timer2 = setTimeout(() => setShouldLoadLowStock(true), 400);
    // İlk render'dan 600ms sonra warranty'yi yükle
    const timer3 = setTimeout(() => setShouldLoadWarranty(true), 600);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);
  
  // Tasks'i dinamik olarak güncelle - Kullanıcının oluşturduğu ve atanan görevleri al
  // Optimized: Daha az görev yükle, lazy loading ile, defer edilmiş yükleme
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard-tasks", user?.id],
    queryFn: async () => {
      try {
        // Performans için: Sadece son 30 görevi al (50 → 30), limit ile
        const allTasks = await getTasks({ limit: 30 });
        // Kullanıcının oluşturduğu veya kendisine atanan görevleri filtrele
        if (user?.id) {
          // Önce kullanıcının oluşturduğu görevleri al
          const createdTasks = allTasks.filter(t => t.createdBy === user.id);
          // Sonra kullanıcıya atanan görevleri bulmak için son görevleri kontrol et
          // Performans için: Son 30 görevi al (50 → 30)
          const recentTasks = allTasks.slice(0, 30);
          // Kullanıcının oluşturduğu görevler + son görevleri birleştir (duplicate'leri kaldır)
          const taskMap = new Map();
          createdTasks.forEach(t => taskMap.set(t.id, t));
          recentTasks.forEach(t => {
            if (!taskMap.has(t.id)) {
              taskMap.set(t.id, t);
            }
          });
          return Array.from(taskMap.values());
        }
        return allTasks.slice(0, 30); // 50 → 30
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Tasks yüklenirken hata:", error);
        }
        return [];
      }
    },
    enabled: !!user?.id && shouldLoadTasks, // Sadece kullanıcı varsa ve defer süresi geçtiyse çalıştır
    refetchInterval: 180000, // 3 dakikada bir güncelle (performans için)
    refetchOnWindowFocus: false, // Window focus'ta refetch yapma (performans için)
    staleTime: 120000, // 2 dakika stale time (performans için)
    // İlk yüklemede daha hızlı render için
    placeholderData: [], // Boş array ile başla, loading state'i daha hızlı geçer
    // Defer et: İlk render'dan sonra yükle (non-blocking)
    refetchOnMount: false, // Cache'den göster, sonra güncelle
  });

  // Task assignments'ları dinamik olarak güncelle (kabul edilen görevleri kontrol etmek için)
  // Tüm görevler için assignment'ları al (kullanıcıya atanan görevleri bulmak için)
  const { data: taskAssignmentsMap = new Map(), isLoading: assignmentsLoading } = useQuery({
    queryKey: ["dashboard-task-assignments", tasks.map(t => t.id).join(",")],
    queryFn: async () => {
      if (!user?.id || tasks.length === 0) return new Map();
      try {
        const assignmentsMap = new Map<string, TaskAssignment[]>();
        // Tüm görevler için assignment'ları al (kullanıcıya atanan görevleri bulmak için)
        // Performans için: Maksimum 20 görev için assignment'ları al (30 → 20)
        const limitedTasks = tasks.slice(0, 20);
        // Her görev için assignment'ları al (batch işlem, paralel)
        await Promise.all(
          limitedTasks.map(async (task) => {
            try {
              const assignments = await getTaskAssignments(task.id);
              assignmentsMap.set(task.id, assignments);
            } catch (error: unknown) {
              // Sessizce handle et - performans için
              assignmentsMap.set(task.id, []);
            }
          })
        );
        return assignmentsMap;
      } catch (error: unknown) {
        // Sessizce handle et - performans için
        return new Map();
      }
    },
    enabled: tasks.length > 0 && !!user?.id && shouldLoadTasks, // Tasks yüklendikten sonra çalıştır
    refetchInterval: 180000, // 3 dakikada bir güncelle (performans için)
    refetchOnWindowFocus: false, // Window focus'ta refetch yapma (performans için)
    staleTime: 120000, // 2 dakika stale time (performans için)
  });

  // Düşük stoklu ürünleri ve hammaddeleri dinamik olarak güncelle
  // Performans için: Sadece ilk 30 ürün/hammaddeyi kontrol et, defer et
  const { data: lowStockItems = [], isLoading: lowStockLoading } = useQuery({
    queryKey: ["dashboard-low-stock-items"],
    enabled: shouldLoadLowStock, // Defer et: İlk render'dan sonra yükle
    queryFn: async () => {
      try {
        const [products, rawMaterials] = await Promise.all([
          getProducts().then(p => p.slice(0, 30)), // Son 30 ürün (50 → 30)
          getRawMaterials().then(r => r.slice(0, 30)), // Son 30 hammadde (50 → 30)
        ]);
        
        // Düşük stoklu ve tükenen ürünleri filtrele
        const lowStockProducts = products
          .filter((product: Product) => {
            const stock = Number(product.stock) || 0;
            const minStock = Number(product.minStock) || 0;
            // Tükenen ürünler (stock === 0) veya düşük stoklu ürünler (stock < minStock)
            // Eğer minStock tanımlı değilse (0), sadece tükenen ürünleri göster
            return stock === 0 || (minStock > 0 && stock < minStock);
          })
          .map((product: Product) => ({
            id: product.id,
            name: product.name,
            stock: product.stock || 0,
            min_stock: product.minStock || 0,
            type: "product" as const,
            unit: product.unit || "Adet",
          }));
        
        // Düşük stoklu ve tükenen hammaddeleri filtrele
        const lowStockMaterials = rawMaterials
          .filter((material: RawMaterial) => {
            const stock = Number(material.currentStock) || 0;
            const minStock = Number(material.minStock) || 0;
            // Tükenen hammaddeler (stock === 0) veya düşük stoklu hammaddeler (stock < minStock)
            // Eğer minStock tanımlı değilse (0), sadece tükenen hammaddeleri göster
            return stock === 0 || (minStock > 0 && stock < minStock);
          })
          .map((material: RawMaterial) => ({
            id: material.id,
            name: material.name,
            stock: material.currentStock || 0,
            min_stock: material.minStock || 0,
            type: "rawMaterial" as const,
            unit: material.unit || "Adet",
          }));
        
        // Ürünleri ve hammaddeleri birleştir ve sırala
        const allLowStockItems = [...lowStockProducts, ...lowStockMaterials];
        
        return allLowStockItems.sort((a, b) => {
          // Önce tükenenler (stock === 0), sonra en düşük stoklu olanlar
          if (a.stock === 0 && b.stock !== 0) return -1;
          if (a.stock !== 0 && b.stock === 0) return 1;
          return a.stock - b.stock;
        });
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Düşük stoklu ürünler ve hammaddeler yüklenirken hata:", error);
        }
        return [];
      }
    },
    refetchInterval: 180000, // 3 dakikada bir güncelle (performans için)
    refetchOnWindowFocus: false, // Window focus'ta refetch yapma (performans için)
    staleTime: 120000, // 2 dakika stale time (performans için)
    refetchOnMount: false, // Cache'den göster, sonra güncelle (performans için)
    placeholderData: [], // Hızlı render için
  });

  // Aktif warranty kayıtlarını al (bizde olan ürünler)
  // Defer et: İlk render'dan sonra yükle (non-critical)
  const { data: activeWarrantyItems = [], isLoading: warrantyLoading } = useQuery({
    queryKey: ["dashboard-active-warranty-items"],
    enabled: shouldLoadWarranty, // Defer et: İlk render'dan sonra yükle
    queryFn: async () => {
      try {
        // Performans için: Sadece ilk 50 warranty kaydı ve 50 ürün
        const [warrantyRecords, allProducts] = await Promise.all([
          getWarrantyRecords().then(w => w.slice(0, 50)), // Son 50 warranty kaydı
          getProducts().then(p => p.slice(0, 50)), // Son 50 ürün
        ]);
        
        // Aktif warranty kayıtlarını filtrele (bizde olanlar: received veya in_repair)
        const activeRecords = warrantyRecords.filter(
          (record: WarrantyRecord) => record.status === "received" || record.status === "in_repair"
        );
        
        // Ürün bilgilerini eşleştir
        const warrantyItems = activeRecords.map((record: WarrantyRecord) => {
          const product = allProducts.find((p: Product) => p.id === record.productId);
          return {
            id: record.id,
            name: product?.name || "Bilinmeyen Ürün",
            productId: record.productId,
            status: record.status,
            receivedDate: record.receivedDate,
            reason: record.reason,
            type: "warranty" as const,
          };
        });
        
        return warrantyItems;
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Aktif warranty kayıtları yüklenirken hata:", error);
        }
        return [];
      }
    },
    refetchInterval: 180000, // 3 dakikada bir güncelle (performans için)
    refetchOnWindowFocus: false, // Window focus'ta refetch yapma (performans için)
    staleTime: 120000, // 2 dakika stale time (performans için)
    refetchOnMount: false, // Cache'den göster, sonra güncelle (performans için)
    placeholderData: [], // Hızlı render için
  });

  // Performans için: useMemo ile optimize edilmiş hesaplamalar
  const { overdueTasks, upcomingTasks, myTasksCount } = useMemo(() => {
    if (!user?.id || tasks.length === 0) {
      return { overdueTasks: [], upcomingTasks: [], myTasksCount: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    // Tüm görevleri kontrol et (geçmiş görevleri de bulmak için)
    const limitedTasks = tasks;

    // "Görevlerim" sayfasındaki mantıkla aynı: Sadece kabul edilen görevleri say
    const myTasks = limitedTasks.filter((task) => {
      // Tamamlanmış veya iptal edilmiş görevleri hariç tut
      if (task.status === "completed" || task.status === "cancelled") return false;
      // Arşivlenmiş görevleri hariç tut
      if (task.isArchived) return false;
      
      // 1. Kullanıcının oluşturduğu görevler (oluşturan her zaman görebilir)
      if (task.createdBy === user.id) return true;
      
      // 2. onlyInMyTasks flag'li görevler (sadece oluşturan görebilir)
      if (task.onlyInMyTasks) {
        return task.createdBy === user.id;
      }
      
      // 3. Kullanıcıya atanan ve kabul edilen görevler (sadece taskAssignmentsMap'te varsa kontrol et)
      const assignments = taskAssignmentsMap.get(task.id);
      if (assignments && assignments.length > 0) {
        const userAssignment = assignments.find(
          (a: TaskAssignment) => a.assignedTo === user.id && a.status === "accepted"
        );
        if (userAssignment) return true;
      }
      
      return false;
    });

    // Gecikmiş görevleri hesapla (sadece kullanıcının görevleri içinden)
    const overdue = myTasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = task.dueDate.toDate();
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });

    // Yaklaşan görevleri hesapla (sadece kullanıcının görevleri içinden)
    const upcoming = myTasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = task.dueDate.toDate();
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today && dueDate <= sevenDaysLater;
    });

    return { overdueTasks: overdue, upcomingTasks: upcoming, myTasksCount: myTasks.length };
  }, [tasks, user?.id, taskAssignmentsMap]);

  const isLoadingData = isLoading || tasksLoading || assignmentsLoading;

  if (isLoadingData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-2 xs:space-y-2.5 sm:space-y-3 w-full max-w-full mx-auto px-1 xs:px-2">
        <div className="flex items-center justify-between gap-2 xs:gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[16px] xs:text-[17px] sm:text-[18px] md:text-xl font-semibold text-foreground truncate">Dashboard</h1>
            <p className="text-[11px] xs:text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Hoş geldiniz, işte bugünkü özet</p>
          </div>
        </div>

        {statsExpanded && (
          <div className={isAdmin 
            ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 xs:gap-2.5 sm:gap-2.5 md:gap-3"
            : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-2.5 sm:gap-3"
          }>
          {isLoading || !stats ? (
            // Loading skeleton
            Array.from({ length: isAdmin ? 6 : 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3 sm:p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
          <StatCard
            title="Toplam Müşteri"
            value={stats?.customers?.total != null && !isNaN(stats.customers.total) ? stats.customers.total.toString() : "0"}
            icon={Users}
            trend={{
              value: stats?.customers?.trend !== undefined && !isNaN(stats.customers.trend)
                ? `${stats.customers.trend > 0 ? "+" : ""}${stats.customers.trend.toFixed(1)}% bu ay`
                : "Veri yok",
              positive: (stats?.customers?.trend != null && !isNaN(stats.customers.trend) ? stats.customers.trend : 0) >= 0,
            }}
            variant="primary"
            onClick={() => navigate("/customers")}
            clickable
          />
          <StatCard
            title="Aktif Siparişler"
            value={stats?.orders?.active != null && !isNaN(stats.orders.active) ? stats.orders.active.toString() : "0"}
            icon={ShoppingCart}
            trend={{
              value: stats?.orders?.trend !== undefined && !isNaN(stats.orders.trend)
                ? `${stats.orders.trend > 0 ? "+" : ""}${stats.orders.trend.toFixed(1)}% bu ay`
                : "Veri yok",
              positive: (stats?.orders?.trend != null && !isNaN(stats.orders.trend) ? stats.orders.trend : 0) >= 0,
            }}
            variant="success"
            onClick={() => navigate("/orders")}
            clickable
          />
          <StatCard
            title="Ürün Stok"
            value={stats?.products?.total_stock != null && !isNaN(stats.products.total_stock) ? stats.products.total_stock.toString() : "0"}
            icon={Package}
            trend={{
              value: (stats?.products?.low_stock_count || 0) > 0 
                ? `${stats.products.low_stock_count} ürün düşük`
                : "Stoklar yeterli",
              positive: (stats?.products?.low_stock_count || 0) === 0,
            }}
            variant="info"
            onClick={() => navigate("/products")}
            clickable
          />
          <StatCard
            title="Görevlerim"
            value={myTasksCount.toString()}
            icon={CheckSquare}
            trend={{
              value: `${overdueTasks.length} gecikmiş, ${upcomingTasks.length} yaklaşan`,
              positive: overdueTasks.length === 0,
            }}
            variant="primary"
            onClick={() => navigate("/tasks?tab=my-tasks")}
            clickable
          />
          {isAdmin && (
          <StatCard
            title="Aylık Ciro"
            value={`₺${(stats?.revenue?.current_month != null && !isNaN(stats.revenue.current_month) ? stats.revenue.current_month : 0).toLocaleString('tr-TR')}`}
            icon={TrendingUp}
            trend={{
              value: stats?.revenue?.trend !== undefined && !isNaN(stats.revenue.trend)
                ? `${stats.revenue.trend > 0 ? "+" : ""}${stats.revenue.trend.toFixed(1)}% bu ay`
                : "Veri yok",
              positive: (stats?.revenue?.trend != null && !isNaN(stats.revenue.trend) ? stats.revenue.trend : 0) >= 0,
            }}
            variant="warning"
            onClick={() => {
              navigate("/reports");
              // Reports sayfasında FinancialReportDialog'u otomatik açmak için state kullanabiliriz
              // Şimdilik sadece navigate ediyoruz
            }}
            clickable
          />
          )}
          {isAdmin && stats?.quote_conversion_rate !== undefined && (
          <StatCard
              title="Teklif Dönüşüm Oranı"
              value={`${stats.quote_conversion_rate.toFixed(1)}%`}
              icon={TrendingUp}
            trend={{
                value: `${stats.quotes?.count ?? 0} teklif, ${Math.round((stats.quotes?.count ?? 0) * (stats.quote_conversion_rate / 100))} sipariş`,
                positive: stats.quote_conversion_rate >= 50,
            }}
              variant="info"
              onClick={() => navigate("/reports")}
              clickable
          />
          )}
            </>
          )}
          </div>
        )}

        <div className="grid gap-2.5 sm:gap-3 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-[14px] sm:text-[15px]">Son Siparişler</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {!stats?.recent_orders || stats.recent_orders.length === 0 ? (
                <p className="text-[11px] sm:text-xs text-muted-foreground text-center py-6 sm:py-8">Henüz sipariş yok</p>
              ) : (
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  {(Array.isArray(stats.recent_orders) ? stats.recent_orders : []).map((order) => (
                    <div 
                      key={order.id} 
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 py-2 sm:py-2.5 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded-lg px-2 sm:px-3 transition-colors"
                      onClick={() => navigate("/orders")}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <p className="font-medium truncate text-[11px] sm:text-xs">{order.order_number}</p>
                          {order.status && (
                            <Badge 
                              variant={
                                order.status === 'confirmed' || order.status === 'in_progress' 
                                  ? 'default' 
                                  : order.status === 'completed' 
                                  ? 'secondary' 
                                  : 'outline'
                              }
                              className="h-4 px-1.5 py-0 text-[10px] font-normal leading-tight"
                            >
                              {order.status === 'confirmed' ? 'Onaylandı' :
                               order.status === 'pending' ? 'Beklemede' :
                               order.status === 'planned' ? 'Planlandı' :
                               order.status === 'in_progress' ? 'İşlemde' :
                               order.status === 'in_production' ? 'Üretimde' :
                               order.status === 'quality_check' ? 'Kalite Kontrolü' :
                               order.status === 'completed' ? 'Tamamlandı' :
                               order.status === 'shipped' ? 'Kargoda' :
                               order.status === 'delivered' ? 'Teslim Edildi' :
                               order.status === 'on_hold' ? 'Beklemede' :
                               order.status === 'cancelled' ? 'İptal' :
                               order.status === 'draft' ? 'Taslak' :
                               order.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{order.customer_name}</p>
                      </div>
                      <div className="text-left sm:text-right sm:ml-4 flex-shrink-0">
                        <p className="font-medium text-[11px] sm:text-xs">₺{(Number(order.total) || 0).toLocaleString('tr-TR')}</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          {new Date(order.order_date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-[14px] sm:text-[15px]">Gecikmiş ve Yaklaşan Görevler</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {isLoadingData ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
                </div>
              ) : overdueTasks.length === 0 && upcomingTasks.length === 0 ? (
                <p className="text-[11px] sm:text-xs text-muted-foreground text-center py-6 sm:py-8">Gecikmiş veya yaklaşan görev yok</p>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {overdueTasks.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <p className="text-[11px] sm:text-xs font-semibold text-destructive">Gecikmiş ({overdueTasks.length})</p>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        {overdueTasks.slice(0, 5).map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded border border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                            onClick={() => navigate(`/tasks/${task.id}`)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs sm:text-sm truncate">{task.title}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {task.dueDate?.toDate().toLocaleDateString("tr-TR")}
                              </p>
                            </div>
                            <Badge variant="destructive" className="text-[10px] sm:text-xs flex-shrink-0">Gecikmiş</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {upcomingTasks.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-warning" />
                        <p className="text-[11px] sm:text-xs font-semibold">Yaklaşan ({upcomingTasks.length})</p>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        {upcomingTasks.slice(0, 5).map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded border border-warning/20 bg-warning/5 cursor-pointer hover:bg-warning/10 transition-colors"
                            onClick={() => navigate(`/tasks/${task.id}`)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs sm:text-sm truncate">{task.title}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {task.dueDate?.toDate().toLocaleDateString("tr-TR")}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">Yaklaşan</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-[14px] sm:text-[15px]">Düşük Stoklu Ürünler ve Hammaddeler</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {lowStockLoading ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
                </div>
              ) : (!lowStockItems || lowStockItems.length === 0) ? (
                <p className="text-[11px] sm:text-xs text-muted-foreground text-center py-6 sm:py-8">Düşük stoklu ürün veya hammadde yok</p>
              ) : (
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  {(Array.isArray(lowStockItems) ? lowStockItems : []).map((item) => (
                    <div 
                      key={item.id} 
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 py-2 sm:py-2.5 border-b last:border-0 hover:bg-muted/50 rounded-lg px-2 sm:px-3 transition-colors cursor-pointer"
                      onClick={() => navigate(item.type === "rawMaterial" ? "/raw-materials" : "/products")}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <p className="font-medium text-[11px] sm:text-xs truncate">{item.name}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {item.type === "rawMaterial" ? "Hammadde" : "Ürün"}
                          </Badge>
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">Min: {item.min_stock} {item.unit}</p>
                      </div>
                      <div className="text-left sm:text-right sm:ml-4 flex-shrink-0">
                        <Badge variant={item.stock === 0 ? "destructive" : "secondary"} className="text-[10px]">
                          {item.stock} {item.unit}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="text-[14px] sm:text-[15px]">Satış Sonrası Takip</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {warrantyLoading ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
                </div>
              ) : (!activeWarrantyItems || activeWarrantyItems.length === 0) ? (
                <p className="text-[11px] sm:text-xs text-muted-foreground text-center py-6 sm:py-8">Aktif satış sonrası takip kaydı yok</p>
              ) : (
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  {(Array.isArray(activeWarrantyItems) ? activeWarrantyItems : []).map((item) => {
                    const receivedDate = item.receivedDate?.toDate ? item.receivedDate.toDate() : null;
                    const statusLabel = item.status === "received" ? "Alındı" : item.status === "in_repair" ? "Onarımda" : "";
                    return (
                      <div 
                        key={item.id} 
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 py-2 sm:py-2.5 border-b last:border-0 hover:bg-muted/50 rounded-lg px-2 sm:px-3 transition-colors cursor-pointer"
                        onClick={() => navigate("/warranty")}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <p className="font-medium text-[11px] sm:text-xs truncate">{item.name}</p>
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              Satış Sonrası
                            </Badge>
                          </div>
                          <p className="text-[11px] sm:text-xs text-muted-foreground">
                            {item.reason && item.reason.length > 50 ? `${item.reason.substring(0, 50)}...` : item.reason}
                            {receivedDate && ` • ${receivedDate.toLocaleDateString("tr-TR")}`}
                          </p>
                        </div>
                        <div className="text-left sm:text-right sm:ml-4 flex-shrink-0">
                          <Badge variant={item.status === "in_repair" ? "default" : "secondary"} className="text-[10px]">
                            {statusLabel}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
