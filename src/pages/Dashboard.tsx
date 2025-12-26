import { useMemo, memo } from "react";
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
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const statsExpanded = true; // İstatistikler her zaman açık
  
  // Tasks'i dinamik olarak güncelle - İlk yüklemede sadece kritik verileri al
  // Performans için: Sadece kullanıcının görevlerini al
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard-tasks", user?.id],
    queryFn: async () => {
      try {
        // İlk yüklemede sadece son 20 görevi al (performans için)
        const allTasks = await getTasks();
        // Kullanıcının görevlerini önceliklendir
        if (user?.id) {
          const userTasks = allTasks.filter(t => t.createdBy === user.id).slice(0, 20);
          if (userTasks.length > 0) return userTasks;
        }
        return allTasks.slice(0, 20);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Tasks yüklenirken hata:", error);
        }
        return [];
      }
    },
    enabled: !!user?.id, // Sadece kullanıcı varsa çalıştır
    refetchInterval: 180000, // 3 dakikada bir güncelle (performans için)
    refetchOnWindowFocus: false, // Window focus'ta refetch yapma (performans için)
    staleTime: 120000, // 2 dakika stale time (performans için)
    // İlk yüklemede daha hızlı render için
    placeholderData: [], // Boş array ile başla, loading state'i daha hızlı geçer
  });

  // Task assignments'ları dinamik olarak güncelle (kabul edilen görevleri kontrol etmek için)
  // Performans için: Sadece ilk 10 görev için assignment'ları al
  const { data: taskAssignmentsMap = new Map(), isLoading: assignmentsLoading } = useQuery({
    queryKey: ["dashboard-task-assignments", tasks.slice(0, 10).map(t => t.id).join(",")],
    queryFn: async () => {
      if (!user?.id || tasks.length === 0) return new Map();
      try {
        const assignmentsMap = new Map<string, TaskAssignment[]>();
        // Sadece ilk 10 görev için assignment'ları al (performans için)
        const limitedTasks = tasks.slice(0, 10);
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
    enabled: tasks.length > 0 && !!user?.id,
    refetchInterval: 180000, // 3 dakikada bir güncelle (performans için)
    refetchOnWindowFocus: false, // Window focus'ta refetch yapma (performans için)
    staleTime: 120000, // 2 dakika stale time (performans için)
  });

  // Düşük stoklu ürünleri ve hammaddeleri dinamik olarak güncelle
  // Performans için: Sadece ilk 50 ürün/hammaddeyi kontrol et
  const { data: lowStockItems = [], isLoading: lowStockLoading } = useQuery({
    queryKey: ["dashboard-low-stock-items"],
    queryFn: async () => {
      try {
        const [products, rawMaterials] = await Promise.all([
          getProducts().then(p => p.slice(0, 50)), // Son 50 ürün
          getRawMaterials().then(r => r.slice(0, 50)), // Son 50 hammadde
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

    // Performans için: Sadece ilk 50 görevi kontrol et
    const limitedTasks = tasks.slice(0, 50);

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
      <div className="space-y-2 w-[90%] max-w-[90%] mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[16px] sm:text-[18px] font-semibold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">Hoş geldiniz, işte bugünkü özet</p>
          </div>
        </div>

        {statsExpanded && (
          <div className={isAdmin 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-3 xl:gap-4"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6"
          }>
          {isLoading || !stats ? (
            // Loading skeleton
            Array.from({ length: isAdmin ? 6 : 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 sm:p-6">
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

        <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-[14px] sm:text-[15px]">Son Siparişler</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {!stats?.recent_orders || stats.recent_orders.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 sm:py-8 text-xs sm:text-sm md:text-base">Henüz sipariş yok</p>
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
                          <p className="font-medium truncate text-xs sm:text-sm md:text-base">{order.order_number}</p>
                          {order.status && (
                            <Badge 
                              variant={
                                order.status === 'confirmed' || order.status === 'in_progress' 
                                  ? 'default' 
                                  : order.status === 'completed' 
                                  ? 'secondary' 
                                  : 'outline'
                              }
                              className="text-[10px] sm:text-xs"
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
                        <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">{order.customer_name}</p>
                      </div>
                      <div className="text-left sm:text-right sm:ml-4 flex-shrink-0">
                        <p className="font-medium text-xs sm:text-sm md:text-base">₺{(Number(order.total) || 0).toLocaleString('tr-TR')}</p>
                        <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-[14px] sm:text-[15px]">Gecikmiş ve Yaklaşan Görevler</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {isLoadingData ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
                </div>
              ) : overdueTasks.length === 0 && upcomingTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 sm:py-8 text-xs sm:text-sm md:text-base">Gecikmiş veya yaklaşan görev yok</p>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {overdueTasks.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <p className="text-sm font-semibold text-destructive">Gecikmiş ({overdueTasks.length})</p>
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
                        <p className="text-sm font-semibold">Yaklaşan ({upcomingTasks.length})</p>
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-[14px] sm:text-[15px]">Düşük Stoklu Ürünler ve Hammaddeler</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {lowStockLoading ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
                </div>
              ) : !lowStockItems || lowStockItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 sm:py-8 text-xs sm:text-sm md:text-base">Düşük stoklu ürün veya hammadde yok</p>
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
                          <p className="font-medium text-xs sm:text-sm md:text-base truncate">{item.name}</p>
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            {item.type === "rawMaterial" ? "Hammadde" : "Ürün"}
                          </Badge>
                        </div>
                        <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Min: {item.min_stock} {item.unit}</p>
                      </div>
                      <div className="text-left sm:text-right sm:ml-4 flex-shrink-0">
                        <Badge variant={item.stock === 0 ? "destructive" : "secondary"} className="text-[10px] sm:text-xs">
                          {item.stock} {item.unit}
                        </Badge>
                      </div>
                    </div>
                  ))}
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
