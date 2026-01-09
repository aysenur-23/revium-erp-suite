import { StatCard } from "@/components/Dashboard/StatCard";
import { useAdminStats } from "@/hooks/useAdminStats";
import { RecentActivitiesTable } from "./RecentActivitiesTable";
import { DepartmentStatsTable } from "./DepartmentStatsTable";
import { TaskStatusPieChart } from "./TaskStatusPieChart";
import { ProductionStatusBarChart } from "./ProductionStatusBarChart";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Package, Users, UserPlus, Building2, FileText, Settings, Shield, BarChart3, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { CreateTaskDialog } from "@/components/Tasks/CreateTaskDialog";
import { CreateOrderDialog as ProductionOrderDialog } from "@/components/Production/CreateOrderDialog";
import { CreateOrderDialog as SalesOrderDialog } from "@/components/Orders/CreateOrderDialog";
import { CreateCustomerDialog } from "@/components/Customers/CreateCustomerDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const AdminDashboard = () => {
  const { data: stats, isLoading, error, refetch } = useAdminStats();
  const navigate = useNavigate();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [productionDialogOpen, setProductionDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [salesOrderDialogOpen, setSalesOrderDialogOpen] = useState(false);
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const statsExpanded = true; // İstatistikler her zaman açık

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const quickActions = [
    {
      category: "Oluşturma",
      actions: [
        {
          title: "Yeni Görev",
          description: "İş planına ekle",
          icon: CheckSquare,
          onClick: () => setTaskDialogOpen(true),
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          hoverBg: "hover:bg-blue-100",
          borderColor: "border-blue-200",
        },
        {
          title: "Yeni Müşteri",
          description: "Müşteri kaydı",
          icon: Users,
          onClick: () => setCustomerDialogOpen(true),
          color: "text-violet-600",
          bgColor: "bg-violet-50",
          hoverBg: "hover:bg-violet-100",
          borderColor: "border-violet-200",
        },
        {
          title: "Satış Siparişi",
          description: "Sipariş oluştur",
          icon: Package,
          onClick: () => setSalesOrderDialogOpen(true),
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          hoverBg: "hover:bg-emerald-100",
          borderColor: "border-emerald-200",
        },
        {
          title: "Üretim Siparişi",
          description: "Üretim başlat",
          icon: Package,
          onClick: () => setProductionDialogOpen(true),
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          hoverBg: "hover:bg-orange-100",
          borderColor: "border-orange-200",
        },
      ],
    },
    {
      category: "Yönetim",
      actions: [
        {
          title: "Yeni Kullanıcı",
          description: "Kullanıcı ekle",
          icon: UserPlus,
          onClick: () => navigate("/admin?tab=users"),
          color: "text-indigo-600",
          bgColor: "bg-indigo-50",
          hoverBg: "hover:bg-indigo-100",
          borderColor: "border-indigo-200",
        },
        {
          title: "Yeni Departman",
          description: "Departman oluştur",
          icon: Building2,
          onClick: () => navigate("/admin?tab=departments"),
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          hoverBg: "hover:bg-purple-100",
          borderColor: "border-purple-200",
        },
        {
          title: "Rol Yetkileri",
          description: "Yetkileri yönet",
          icon: Shield,
          onClick: () => navigate("/admin?tab=permissions"),
          color: "text-red-600",
          bgColor: "bg-red-50",
          hoverBg: "hover:bg-red-100",
          borderColor: "border-red-200",
        },
        {
          title: "Ekip Yönetimi",
          description: "Ekip işlemlerini yönet",
          icon: Users,
          onClick: () => navigate("/team-management"),
          color: "text-cyan-600",
          bgColor: "bg-cyan-50",
          hoverBg: "hover:bg-cyan-100",
          borderColor: "border-cyan-200",
        },
      ],
    },
    {
      category: "Raporlar & Analiz",
      actions: [
        {
          title: "Rapor Oluştur",
          description: "Rapor oluştur",
          icon: FileText,
          onClick: () => navigate("/reports"),
          color: "text-pink-600",
          bgColor: "bg-pink-50",
          hoverBg: "hover:bg-pink-100",
          borderColor: "border-pink-200",
        },
        {
          title: "Kullanıcı Analizi",
          description: "Detaylı analiz",
          icon: BarChart3,
          onClick: () => navigate("/admin?tab=insights"),
          color: "text-teal-600",
          bgColor: "bg-teal-50",
          hoverBg: "hover:bg-teal-100",
          borderColor: "border-teal-200",
        },
        {
          title: "Sistem Logları",
          description: "Tüm logları gör",
          icon: FileText,
          onClick: () => navigate("/admin?tab=logs"),
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          hoverBg: "hover:bg-amber-100",
          borderColor: "border-amber-200",
        },
        {
          title: "Sistem Ayarları",
          description: "Ayarları yönet",
          icon: Settings,
          onClick: () => navigate("/admin?tab=settings"),
          color: "text-slate-600",
          bgColor: "bg-slate-50",
          hoverBg: "hover:bg-slate-100",
          borderColor: "border-slate-200",
        },
      ],
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">Sistem yönetimi ve istatistikler</p>
        </div>
      </div>

      {/* Ana İstatistik Kartları - Yan yana */}
      {statsExpanded && (
<<<<<<< HEAD
        <div className="grid gap-2 sm:gap-3 md:gap-4 lg:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
=======
        <div className="grid gap-2 sm:gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        <StatCard
          title="Toplam Görevler"
          value={stats.tasks.total}
          icon={CheckSquare}
          trend={{
            value: `${stats.tasks.in_progress} devam ediyor`,
            positive: true,
          }}
          variant="primary"
          onClick={() => navigate("/tasks")}
          clickable
        />
        <StatCard
          title="Aktif Üretim"
          value={stats.production_orders.active}
          icon={Package}
          trend={{
            value: `${stats.production_orders.total} toplam`,
            positive: true,
          }}
          variant="warning"
          onClick={() => navigate("/production")}
          clickable
        />
        <StatCard
          title="Kullanıcılar"
          value={stats.users}
          icon={Users}
          variant="success"
          onClick={() => navigate("/admin?tab=users")}
          clickable
        />
        <StatCard
          title="Departmanlar"
          value={stats.departments}
          icon={Building2}
          variant="info"
          onClick={() => navigate("/admin?tab=departments")}
          clickable
        />
        </div>
      )}

      {/* Grafikler */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <TaskStatusPieChart
          data={{
            pending: stats.tasks.pending,
            in_progress: stats.tasks.in_progress,
            completed: stats.tasks.completed,
            approved: stats.tasks.approved,
          }}
        />
        <ProductionStatusBarChart
          data={{
            planned: stats.production_orders.planned,
            in_production: stats.production_orders.in_production,
            quality_check: stats.production_orders.quality_check,
            completed: stats.production_orders.completed,
            on_hold: stats.production_orders.on_hold,
          }}
        />
      </div>

      {/* Alt Bölüm: Aktiviteler ve Departman Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <RecentActivitiesTable />
        <DepartmentStatsTable />
      </div>

      {/* Hızlı İşlemler */}
      <Card className="border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-white to-white">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4 md:mb-6">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground">Hızlı İşlemler</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Sık kullanılan işlemlere hızlı erişim</p>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {quickActions.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-2 sm:space-y-3">
                <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {category.category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                  {category.actions.map((action, actionIndex) => (
                    <button
                      key={actionIndex}
                      onClick={action.onClick}
                      className={cn(
                        "flex flex-col items-start p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-200 group text-left h-full",
                        "hover:shadow-lg hover:-translate-y-0.5 sm:hover:-translate-y-1 hover:scale-[1.01] sm:hover:scale-[1.02]",
                        "bg-white",
                        action.borderColor,
                        "hover:border-opacity-100"
                      )}
                    >
                      <div className={cn(
                        "p-2 sm:p-2.5 md:p-3 rounded-lg mb-2 sm:mb-3 transition-all group-hover:scale-110",
                        action.bgColor,
                        action.color
                      )}>
                        <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      
                      <div className="space-y-0.5 sm:space-y-1 w-full">
                        <h3 className="font-semibold text-xs sm:text-sm text-gray-900 group-hover:text-primary transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2">
                          {action.description}
                        </p>
                      </div>

                      <div className="mt-auto w-full flex justify-end opacity-0 group-hover:opacity-100 transition-opacity pt-2">
                        <div className={cn("h-1 w-8 rounded-full", action.bgColor)} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Global Oluşturma Dialogları */}
      <CreateTaskDialog
        hideTrigger
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onTaskCreated={() => {
          refetch();
        }}
      />
      <ProductionOrderDialog
        open={productionDialogOpen}
        onOpenChange={setProductionDialogOpen}
        onSuccess={() => {
          refetch();
        }}
      />
      <SalesOrderDialog
        open={salesOrderDialogOpen}
        onOpenChange={setSalesOrderDialogOpen}
        onSuccess={() => {
          refetch();
        }}
      />
      <CreateCustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};
