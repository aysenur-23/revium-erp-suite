import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, Mail, Phone, Edit, Trash2, MoreVertical, Building2, User, Users2, Star, PhoneCall, MailCheck, Download, Package, TrendingUp, Filter, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
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
import { canCreateResource, canDeleteResource } from "@/utils/permissions";

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
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [sortColumn, setSortColumn] = useState<"name" | "email" | "orderCount" | "totalAmount">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('customers-column-widths');
    return saved ? JSON.parse(saved) : {
      name: 250,
      email: 200,
      phone: 150,
      orderCount: 120,
      totalAmount: 150,
      status: 120,
      createdBy: 150,
    };
  });
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Yetki: müşteri oluşturma
  useEffect(() => {
    const checkCreatePermission = async () => {
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
        const [createPerm, deletePerm] = await Promise.all([
          canCreateResource(userProfile, "customers"),
          canDeleteResource(userProfile, "customers"),
        ]);
        setCanCreate(createPerm);
        setCanDelete(deletePerm);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Customer create permission check error:", error);
        }
        setCanCreate(false);
        setCanDelete(false);
      }
    };
    checkCreatePermission();
  }, [user]);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      // Orders'ı ayrı yükle (daha sonra lazy load edilebilir)
      const [customersData, usersData, quotesData] = await Promise.all([
        getCustomers(),
        getAllUsers(),
        getSavedReports({ reportType: "sales_quote" }),
      ]);
      
      // Orders'ı arka planda yükle (müşteri kartlarında kullanılıyor ama hemen gerekli değil)
      getOrders().then(ordersData => {
        setOrders(ordersData);
      }).catch(error => {
        console.error("Error loading orders:", error);
      });
      
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
        const metadata = (quote.metadata || {}) as Record<string, unknown>;
        const customerId = metadata?.customerId;
        if (!customerId) return;
        let quoteDate: number;
        if (quote.createdAt && typeof quote.createdAt === 'object' && 'toMillis' in quote.createdAt && typeof (quote.createdAt as { toMillis: () => number }).toMillis === 'function') {
          quoteDate = (quote.createdAt as { toMillis: () => number }).toMillis();
        } else if (quote.createdAt && typeof quote.createdAt === 'object' && 'toDate' in quote.createdAt && typeof (quote.createdAt as { toDate: () => Date }).toDate === 'function') {
          quoteDate = Date.parse((quote.createdAt as { toDate: () => Date }).toDate().toISOString());
        } else {
          quoteDate = Date.parse(String(quote.createdAt || ""));
        }
        const total = Number(metadata?.grandTotal || 0);
        const candidate = {
          id: quote.id,
          title: quote.title || "Teklif",
          date: quoteDate || Date.now(),
          total,
          downloadUrl: quote.driveLink || quote.fileUrl,
        };
        const existing = customerLastQuoteMap[customerId as string];
        if (!existing || candidate.date > existing.date) {
          customerLastQuoteMap[customerId as string] = candidate;
        }
      });

      const enrichedCustomers = customersData.map((customer) => ({
        ...customer,
        lastQuote: customerLastQuoteMap[customer.id] || null,
      }));

      setCustomers(enrichedCustomers);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Fetch customers error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Müşteriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    
    // Yetki kontrolü
    if (!canDelete) {
      toast.error("Müşteri silme yetkiniz yok.");
      setDeleteDialogOpen(false);
      return;
    }

    try {
      await deleteCustomer(selectedCustomer.id, user?.id);
      toast.success("Müşteri silindi");
      fetchCustomers();
      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Delete customer error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Müşteri silinirken hata oluştu");
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
        localStorage.setItem('customers-column-widths', JSON.stringify(updated));
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

  const filteredCustomers = useMemo(() => {
    let filtered = customers
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
          return (customer as Customer & { tags?: string[] }).tags?.includes("vip") || false;
        }

        if (quickFilter === "active") {
          return isCustomerActive(customer);
        }

        return true;
      });

    // Sıralama
    filtered.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      if (sortColumn === "name") {
        aValue = (a.name || "").toLowerCase();
        bValue = (b.name || "").toLowerCase();
      } else if (sortColumn === "email") {
        aValue = (a.email || "").toLowerCase();
        bValue = (b.email || "").toLowerCase();
      } else if (sortColumn === "orderCount") {
        const aOrders = orders.filter(o => o.customerId === a.id || o.customer_id === a.id).length;
        const bOrders = orders.filter(o => o.customerId === b.id || o.customer_id === b.id).length;
        aValue = aOrders;
        bValue = bOrders;
      } else if (sortColumn === "totalAmount") {
        const aOrders = orders.filter(o => o.customerId === a.id || o.customer_id === a.id);
        const bOrders = orders.filter(o => o.customerId === b.id || o.customer_id === b.id);
        aValue = aOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        bValue = bOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
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
  }, [customers, searchTerm, quickFilter, orders, isCustomerActive, sortColumn, sortDirection]);

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
      <div className="space-y-3 sm:space-y-4 md:space-y-6 w-[90%] max-w-[90%] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-[20px] sm:text-[24px] font-semibold text-foreground">Müşteriler</h1>
                <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">Müşteri ve tedarikçi listenizi yönetin</p>
              </div>
              {/* İstatistikler Açılma Butonu */}
              {!statsExpanded ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatsExpanded(true)}
                  className="h-7 px-2 gap-1 text-xs"
                  aria-label="İstatistikleri göster"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatsExpanded(false)}
                  className="h-7 px-2 gap-1 text-xs"
                  aria-label="İstatistikleri gizle"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          {canCreate && (
            <Button 
              className="gap-1.5 sm:gap-2 w-full sm:w-auto min-h-[44px] sm:min-h-10 text-xs sm:text-sm" 
              onClick={() => {
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Yeni Müşteri</span>
              <span className="sm:hidden">Yeni</span>
            </Button>
          )}
        </div>

        {/* İstatistikler */}
        {statsExpanded && (
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
                        <p className="text-lg font-semibold text-foreground mt-1 sm:mt-1.5">{item.value}</p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
        )}

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

        {/* Liste Görünümü */}
        <div className="w-full max-w-full min-w-0 overflow-x-auto">
          <div className="hidden md:block border border-[#DFE1E6] dark:border-[#38414A] rounded-sm bg-white dark:bg-[#1D2125] min-w-full">
            <div className="table border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
              {/* Tablo Başlıkları */}
              <div className="table-header-group bg-[#F4F5F7] dark:bg-[#22272B]">
                <div className="table-row">
                  <div 
                    className="table-cell px-4 py-3 cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] transition-all duration-200 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                    style={{ width: columnWidths.name || 250, minWidth: 150 }}
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1.5">
                      İsim / Şirket
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
                    className="table-cell px-4 py-3 cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] transition-all duration-200 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                    style={{ width: columnWidths.email || 200, minWidth: 150 }}
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center gap-1.5">
                      E-posta
                      {sortColumn === "email" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <div 
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart("email", e)}
                    />
                  </div>
                  <div 
                    className="table-cell px-4 py-3 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                    style={{ width: columnWidths.phone || 150, minWidth: 120 }}
                  >
                    Telefon
                    <div 
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart("phone", e)}
                    />
                  </div>
                  <div 
                    className="table-cell px-4 py-3 cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] transition-all duration-200 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                    style={{ width: columnWidths.orderCount || 120, minWidth: 100 }}
                    onClick={() => handleSort("orderCount")}
                  >
                    <div className="flex items-center gap-1.5">
                      Sipariş
                      {sortColumn === "orderCount" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <div 
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart("orderCount", e)}
                    />
                  </div>
                  <div 
                    className="table-cell px-4 py-3 cursor-pointer hover:text-[#0052CC] dark:hover:text-[#4C9AFF] hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] transition-all duration-200 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                    style={{ width: columnWidths.totalAmount || 150, minWidth: 120 }}
                    onClick={() => handleSort("totalAmount")}
                  >
                    <div className="flex items-center gap-1.5">
                      Toplam Tutar
                      {sortColumn === "totalAmount" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <div 
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart("totalAmount", e)}
                    />
                  </div>
                  <div 
                    className="table-cell px-4 py-3 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                    style={{ width: columnWidths.status || 120, minWidth: 100 }}
                  >
                    Durum
                    <div 
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart("status", e)}
                    />
                  </div>
                  <div 
                    className="table-cell px-4 py-3 text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF] uppercase tracking-wide border-r border-[#DFE1E6] dark:border-[#38414A] relative"
                    style={{ width: columnWidths.createdBy || 150, minWidth: 120 }}
                  >
                    Oluşturan
                    <div 
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#0052CC] dark:hover:bg-[#4C9AFF] opacity-0 hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart("createdBy", e)}
                    />
                  </div>
                </div>
              </div>

              {/* Tablo İçeriği */}
              <div 
                ref={listContainerRef}
                style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto', display: 'table-row-group' }}
              >
                {filteredCustomers.map((customer) => {
                  const customerOrders = orders.filter(
                    (order) => order.customerId === customer.id || order.customer_id === customer.id
                  );
                  const orderCount = customerOrders.length;
                  const totalAmount = customerOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
                  const isActive = orderCount > 0;

                  return (
                    <div
                      key={customer.id}
                      className="table-row group border-b border-[#DFE1E6] dark:border-[#38414A] hover:bg-[#F4F5F7] dark:hover:bg-[#22272B] transition-all duration-200 cursor-pointer bg-white dark:bg-[#1D2125]"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setDetailModalOpen(true);
                      }}
                    >
                      <div className="table-cell px-4 py-3 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-sm text-[#172B4D] dark:text-[#B6C2CF]">
                            {customer.name}
                          </span>
                          {customer.company && (
                            <span className="text-xs text-[#42526E] dark:text-[#B6C2CF]">
                              {customer.company}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="table-cell px-4 py-3 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                        {customer.email ? (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-[#42526E] dark:text-[#B6C2CF]" />
                            <span className="text-xs text-[#42526E] dark:text-[#B6C2CF] truncate">
                              {customer.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#6B778C] dark:text-[#8C9CB8]">-</span>
                        )}
                      </div>
                      <div className="table-cell px-4 py-3 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                        {customer.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-[#42526E] dark:text-[#B6C2CF]" />
                            <span className="text-xs text-[#42526E] dark:text-[#B6C2CF]">
                              {formatPhoneForDisplay(customer.phone)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#6B778C] dark:text-[#8C9CB8]">-</span>
                        )}
                      </div>
                      <div className="table-cell px-4 py-3 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-[#42526E] dark:text-[#B6C2CF]" />
                          <span className="text-xs font-medium text-[#42526E] dark:text-[#B6C2CF]">
                            {orderCount}
                          </span>
                        </div>
                      </div>
                      <div className="table-cell px-4 py-3 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                        <span className="text-xs font-semibold text-[#42526E] dark:text-[#B6C2CF]">
                          ₺{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalAmount)}
                        </span>
                      </div>
                      <div className="table-cell px-4 py-3 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                        <Badge 
                          variant={isActive ? "default" : "secondary"} 
                          className={cn(
                            "text-xs font-medium",
                            isActive 
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" 
                              : "bg-muted/60 text-muted-foreground border-border/50"
                          )}
                        >
                          {isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                      <div className="table-cell px-4 py-3 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]">
                        {customer.createdBy ? (
                          <span className="text-xs text-[#42526E] dark:text-[#B6C2CF]">
                            {usersMap[customer.createdBy] || "Bilinmeyen"}
                          </span>
                        ) : (
                          <span className="text-xs text-[#6B778C] dark:text-[#8C9CB8]">-</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobil Görünüm */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((customer) => {
              const customerOrders = orders.filter(
                (order) => order.customerId === customer.id || order.customer_id === customer.id
              );
              const orderCount = customerOrders.length;
              const totalAmount = customerOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
              const isActive = orderCount > 0;

              return (
                <Card
                  key={customer.id}
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setDetailModalOpen(true);
                  }}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{customer.name}</h3>
                        {customer.company && (
                          <p className="text-xs text-muted-foreground mt-1">{customer.company}</p>
                        )}
                      </div>
                      <Badge 
                        variant={isActive ? "default" : "secondary"}
                        className={cn(
                          isActive 
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
                            : "bg-muted/60 text-muted-foreground"
                        )}
                      >
                        {isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {customer.email}
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {formatPhoneForDisplay(customer.phone)}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">{orderCount} Sipariş</span>
                      </div>
                      <span className="text-xs font-semibold">
                        ₺{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalAmount)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-8 sm:py-12 md:py-16 bg-muted/10 rounded-xl border border-dashed border-muted-foreground/20 px-4">
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            </div>
            <h3 className="text-[14px] sm:text-[15px] font-semibold text-foreground">Müşteri Bulunamadı</h3>
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
        data={customers as unknown as Record<string, unknown>[]}
        orders={orders as unknown as Record<string, unknown>[]}
      />
    </MainLayout>
  );
};

export default Customers;
