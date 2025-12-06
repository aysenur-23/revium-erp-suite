import { useEffect, useMemo, useState, useCallback } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, Mail, Phone, Edit, Trash2, MoreVertical, Building2, User, Users2, Star, PhoneCall, MailCheck, Download, Package, TrendingUp, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { getCustomers, deleteCustomer, Customer } from "@/services/firebase/customerService";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CreateCustomerDialog } from "@/components/Customers/CreateCustomerDialog";
import { CustomerDetailModal } from "@/components/Customers/CustomerDetailModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { getSavedReports, SavedReport } from "@/services/firebase/reportService";
import { formatPhoneForDisplay } from "@/utils/phoneNormalizer";
import { getOrders, Order } from "@/services/firebase/orderService";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DetailedValueReportModal } from "@/components/Statistics/DetailedValueReportModal";
import { LoadingState } from "@/components/ui/loading-state";
import { CustomerCard } from "@/components/Customers/CustomerCard";

const Customers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [quickFilter, setQuickFilter] = useState<"all" | "needs_contact" | "vip" | "active">("all");
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [activeStatCard, setActiveStatCard] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const [customersData, usersData, quotesData, ordersData] = await Promise.all([
        getCustomers(),
        getAllUsers(),
        getSavedReports({ reportType: "sales_quote" }),
        getOrders(),
      ]);
      
      setOrders(ordersData);
      
      const userMap: Record<string, string> = {};
      usersData.forEach(u => {
        userMap[u.id] = u.fullName || u.displayName || u.email;
      });
      setUsersMap(userMap);
      
      const customerLastQuoteMap: Record<
        string,
        {
          id: string;
          title: string;
          date: number;
          total: number;
          downloadUrl?: string | null;
        }
      > = {};

      quotesData.forEach((quote) => {
        const metadata = (quote.metadata || {}) as Record<string, any>;
        const customerId = metadata?.customerId;
        if (!customerId) return;
        const quoteDate = quote.createdAt?.toMillis?.() || Date.parse((quote.createdAt as any)?.toDate?.() || quote.createdAt as any || "");
        const total = Number(metadata?.grandTotal || 0);
        const candidate = {
          id: quote.id,
          title: quote.title || "Teklif",
          date: quoteDate || Date.now(),
          total,
          downloadUrl: quote.driveLink || quote.fileUrl,
        };
        const existing = customerLastQuoteMap[customerId];
        if (!existing || candidate.date > existing.date) {
          customerLastQuoteMap[customerId] = candidate;
        }
      });

      const enrichedCustomers = customersData.map((customer) => ({
        ...customer,
        lastQuote: customerLastQuoteMap[customer.id] || null,
      }));

      setCustomers(enrichedCustomers);
    } catch (error: any) {
      console.error("Fetch customers error:", error);
      toast.error(error.message || "Müşteriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async () => {
    if (!selectedCustomer) return;

    try {
      await deleteCustomer(selectedCustomer.id);
      toast.success("Müşteri silindi");
      fetchCustomers();
      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
    } catch (error: any) {
      console.error("Delete customer error:", error);
      toast.error(error.message || "Müşteri silinirken hata oluştu");
    }
  };

  const stats = useMemo(() => {
    const total = customers.length;
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const activeCustomers = customers.filter((customer) => {
      const customerOrders = orders.filter(
        (order) => order.customerId === customer.id || order.customer_id === customer.id
      );
      return customerOrders.length > 0;
    }).length;
    return { total, totalOrders, totalAmount, activeCustomers };
  }, [customers, orders]);

  const isCustomerActive = useCallback((customer: Customer) => {
    return orders.some(
      (order) => order.customerId === customer.id || order.customer_id === customer.id
    );
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    return customers
      .filter((customer) => {
        const text = searchTerm.toLocaleLowerCase("tr-TR");
        if (
          text &&
          !(customer.name?.toLocaleLowerCase("tr-TR") || "").includes(text) &&
          !(customer.email?.toLocaleLowerCase("tr-TR") || "").includes(text) &&
          !(customer.company?.toLocaleLowerCase("tr-TR") || "").includes(text)
        ) {
          return false;
        }

        if (quickFilter === "needs_contact") {
          return !customer.email || !customer.phone;
        }

        if (quickFilter === "vip") {
          return (customer as any).tags?.includes("vip") || false;
        }

        if (quickFilter === "active") {
          return isCustomerActive(customer);
        }

        return true;
      })
      .sort((a, b) => (a.updatedAt && b.updatedAt ? b.updatedAt.seconds - a.updatedAt.seconds : 0));
  }, [customers, searchTerm, quickFilter, orders, isCustomerActive]);

  const formattedTotalAmount = useMemo(() => {
    try {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: 2,
      }).format(stats.totalAmount);
    } catch {
      return `₺${stats.totalAmount?.toFixed?.(2) ?? "0,00"}`;
    }
  }, [stats.totalAmount]);

  const customerStatCards = [
    {
      key: "total-customers",
      label: "Toplam Müşteri",
      value: stats.total,
      icon: Users2,
      accent: "bg-primary/10 text-primary",
      description: "Tüm müşteri kayıtları",
      onClick: () => {
        setQuickFilter("all");
        setSearchTerm("");
        setActiveStatCard("total-customers");
      },
      isActive: activeStatCard === "total-customers",
    },
    {
      key: "total-orders",
      label: "Toplam Sipariş",
      value: stats.totalOrders,
      icon: Package,
      accent: "bg-emerald-100 text-emerald-700",
      description: "Sipariş listesine git",
      onClick: () => {
        setActiveStatCard("total-orders");
        navigate("/orders");
      },
      isActive: activeStatCard === "total-orders",
    },
    {
      key: "total-amount",
      label: "Toplam Tutar",
      value: formattedTotalAmount,
      icon: TrendingUp,
      accent: "bg-amber-100 text-amber-700",
      description: "Raporları görüntüle",
      onClick: () => {
        setActiveStatCard("total-amount");
        setStatsModalOpen(true);
      },
      isActive: activeStatCard === "total-amount",
    },
    {
      key: "active-customers",
      label: "Aktif Müşteri",
      value: stats.activeCustomers,
      icon: Star,
      accent: "bg-purple-100 text-purple-700",
      description: "Siparişi olan müşteriler",
      onClick: () => {
        setQuickFilter("active");
        setActiveStatCard("active-customers");
      },
      isActive: activeStatCard === "active-customers",
    },
  ];

  if (loading) {
    return (
      <MainLayout>
        <LoadingState message="Müşteriler yükleniyor..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Müşteriler</h1>
            <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">Müşteri ve tedarikçi listenizi yönetin</p>
          </div>
          <Button className="gap-1.5 sm:gap-2 w-full sm:w-auto min-h-[44px] sm:min-h-10 text-xs sm:text-sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Yeni Müşteri</span>
            <span className="sm:hidden">Yeni</span>
          </Button>
        </div>

        {/* İstatistikler */}
        <Card className="border-2">
          <CardContent className="p-4 sm:p-5 md:pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {customerStatCards.map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.key}
                    className={cn(
                      "border-2 border-border/60 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-primary/40",
                      item.isActive && "border-primary shadow-xl ring-2 ring-primary/20 bg-primary/5"
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
                    <CardContent className="p-3 sm:p-4 md:p-5 flex items-center gap-2 sm:gap-3 md:gap-4">
                      <div className={cn("h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md flex-shrink-0", item.accent)}>
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground font-semibold">{item.label}</p>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mt-1 sm:mt-1.5">{item.value}</p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filtreler */}
        <Card className="border-2">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
              {/* Arama Kutusu */}
              <div className="flex-1 min-w-0 w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]">
                <SearchInput
                  placeholder="İsim, e-posta veya şirket ara..."
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
              
              {/* Filtreler */}
              <div className="w-full sm:w-auto sm:min-w-[160px] md:min-w-[180px]">
                <Select value={quickFilter} onValueChange={(value) => setQuickFilter(value as typeof quickFilter)}>
                  <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="needs_contact">Kontak Eksik</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="active">Aktif Müşteriler</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtreleri Temizle */}
              {(searchTerm || quickFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setQuickFilter("all");
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              orders={orders}
              onSelect={(customer) => {
                setSelectedCustomer(customer);
                setDetailModalOpen(true);
              }}
              onDelete={(customer) => {
                setSelectedCustomer(customer);
                setDeleteDialogOpen(true);
              }}
            />
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-8 sm:py-12 md:py-16 bg-muted/10 rounded-xl border border-dashed border-muted-foreground/20 px-4">
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">Müşteri Bulunamadı</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-2">
              {searchTerm ? `"${searchTerm}" aramasıyla eşleşen sonuç yok.` : "Henüz kayıtlı müşteri bulunmuyor. Yeni müşteri ekleyerek başlayın."}
            </p>
            {searchTerm && (
              <Button variant="link" onClick={() => setSearchTerm("")} className="mt-2 text-xs sm:text-sm">
                Aramayı temizle
              </Button>
            )}
          </div>
        )}
      </div>

      <CreateCustomerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchCustomers}
      />

      {selectedCustomer && (
        <CustomerDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          customer={selectedCustomer}
          onUpdate={fetchCustomers}
          onDelete={fetchCustomers}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Müşteriyi sil?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Müşteri kalıcı olarak silinecek.
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
        title="Müşteri Değer Raporu"
        type="customers"
        data={customers}
        orders={orders}
      />
    </MainLayout>
  );
};

export default Customers;
