import { useEffect, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";

import { Plus, Loader2, Edit, Trash2, Package, DollarSign, X, Save, ShieldCheck, User, MoreVertical, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  getWarrantyRecords,
  createWarrantyRecord,
  updateWarrantyRecord,
  deleteWarrantyRecord,
  WarrantyRecord,
} from "@/services/firebase/warrantyService";
import { useAuth } from "@/contexts/AuthContext";
import { canCreateResource, canUpdateResource, canDeleteResource } from "@/utils/permissions";
import { UserProfile } from "@/services/firebase/authService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getCustomers, Customer } from "@/services/firebase/customerService";
import { getProducts, Product } from "@/services/firebase/productService";
import { getOrders, Order } from "@/services/firebase/orderService";
import { getAllUsers } from "@/services/firebase/authService";
import { Timestamp } from "firebase/firestore";
import { LoadingState } from "@/components/ui/loading-state";
import { ActivityCommentsPanel } from "@/components/shared/ActivityCommentsPanel";
import { cn } from "@/lib/utils";
import { addWarrantyComment, getWarrantyComments, getWarrantyActivities } from "@/services/firebase/warrantyService";

const Warranty = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<WarrantyRecord[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WarrantyRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    customerId: "",
    productId: "",
    orderId: "",
    reason: "",
    status: "received" as WarrantyRecord["status"],
    repairDescription: "",
    cost: 0,
    receivedDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Yetki kontrolleri
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setCanCreate(false);
        setCanUpdate(false);
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
        const [canCreateWarranty, canUpdateWarranty, canDeleteWarranty] = await Promise.all([
          canCreateResource(userProfile, "warranty"),
          canUpdateResource(userProfile, "warranty"),
          canDeleteResource(userProfile, "warranty"),
        ]);
        setCanCreate(canCreateWarranty);
        setCanUpdate(canUpdateWarranty);
        setCanDelete(canDeleteWarranty);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Warranty permission check error:", error);
        }
        setCanCreate(false);
        setCanUpdate(false);
        setCanDelete(false);
      }
    };
    checkPermissions();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recordsData, customersData, productsData, ordersData, usersData] = await Promise.all([
        getWarrantyRecords(),
        getCustomers(),
        getProducts(),
        getOrders(),
        getAllUsers(),
      ]);
      setRecords(recordsData);
      setCustomers(customersData);
      setProducts(productsData);
      setOrders(ordersData);
      
      const userMap: Record<string, string> = {};
      usersData.forEach(u => {
        userMap[u.id] = u.fullName || u.displayName || u.email || "Bilinmeyen";
      });
      setUsersMap(userMap);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Fetch warranty records error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(errorMessage || "Kayıtlar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.customerId || !formData.productId || !formData.reason.trim()) {
      toast.error("Müşteri, ürün ve neden gereklidir");
      return;
    }

    // Yetki kontrolü
    if (!canCreate) {
      toast.error("Garanti kaydı oluşturma yetkiniz yok.");
      return;
    }

    if (!user?.id) {
      toast.error("Kullanıcı bilgisi bulunamadı");
      return;
    }

    try {
      await createWarrantyRecord({
        customerId: formData.customerId,
        productId: formData.productId,
        orderId: formData.orderId || null,
        reason: formData.reason.trim(),
        status: formData.status,
        repairDescription: formData.repairDescription.trim() || null,
        cost: formData.cost || 0,
        receivedDate: Timestamp.fromDate(new Date(formData.receivedDate)),
        createdBy: user.id,
      });
      toast.success("Garanti kaydı oluşturuldu");
      setCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Create warranty record error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(errorMessage || "Kayıt oluşturulurken hata oluştu");
    }
  };

  const handleStatusChange = async (recordId: string, newStatus: WarrantyRecord["status"]) => {
    if (!user?.id) {
      toast.error("Kullanıcı bilgisi bulunamadı");
      return;
    }

    // Yetki kontrolü
    const record = records.find(r => r.id === recordId);
    if (!canUpdate && record?.createdBy !== user.id) {
      toast.error("Garanti kaydı durumunu değiştirme yetkiniz yok.");
      return;
    }

    try {
      await updateWarrantyRecord(
        recordId,
        { status: newStatus },
        user.id
      );
      toast.success("Durum güncellendi");
      
      // Eğer detay dialog'u açıksa ve aynı kayıt seçiliyse, güncelle
      if (selectedRecord && selectedRecord.id === recordId) {
        setSelectedRecord({ ...selectedRecord, status: newStatus });
      }
      
      // Liste verilerini güncelle
      setRecords(prevRecords => 
        prevRecords.map(record => 
          record.id === recordId ? { ...record, status: newStatus } : record
        )
      );
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("Update warranty status error:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(errorMessage || "Durum güncellenirken hata oluştu");
    }
  };

  const handleEdit = async () => {
    if (!selectedRecord) {
      toast.error("Kayıt seçilmedi");
      return;
    }

    // Yetki kontrolü
    if (!canUpdate && selectedRecord.createdBy !== user?.id) {
      toast.error("Garanti kaydı düzenleme yetkiniz yok.");
      setEditDialogOpen(false);
      return;
    }

    const customerId = (formData.customerId || "").trim();
    const productId = (formData.productId || "").trim();
    const reason = (formData.reason || "").trim();

    if (!customerId) {
      toast.error("Müşteri seçimi gereklidir");
      return;
    }

    if (!productId) {
      toast.error("Ürün seçimi gereklidir");
      return;
    }

    if (!reason) {
      toast.error("Neden alanı gereklidir");
      return;
    }

    if (!user?.id) {
      toast.error("Kullanıcı bilgisi bulunamadı");
      return;
    }

    try {
      const updateData: Partial<WarrantyRecord> = {
        customerId: customerId,
        productId: productId,
        orderId: formData.orderId?.trim() || null,
        reason: reason,
        status: formData.status,
        repairDescription: formData.repairDescription?.trim() || null,
        cost: formData.cost || 0,
      };

      // Alınma tarihi değiştiyse güncelle
      if (selectedRecord.receivedDate.toDate().toISOString().split("T")[0] !== formData.receivedDate) {
        updateData.receivedDate = Timestamp.fromDate(new Date(formData.receivedDate));
      }

      await updateWarrantyRecord(
        selectedRecord.id,
        updateData,
        user.id
      );
      toast.success("Garanti kaydı güncellendi");
      setEditDialogOpen(false);
      setSelectedRecord(null);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("Update warranty record error:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(errorMessage || "Kayıt güncellenirken hata oluştu");
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;

    if (!user?.id) {
      toast.error("Kullanıcı bilgisi bulunamadı");
      return;
    }

    try {
      await deleteWarrantyRecord(selectedRecord.id, user.id);
      toast.success("Garanti kaydı silindi");
      fetchData();
      setDeleteDialogOpen(false);
      setSelectedRecord(null);
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("Delete warranty record error:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(errorMessage || "Kayıt silinirken hata oluştu");
    }
  };

  const openDetailDialog = (record: WarrantyRecord) => {
    setSelectedRecord(record);
    setDetailDialogOpen(true);
  };

  const openEditDialog = (record: WarrantyRecord) => {
    setSelectedRecord(record);
    const customerId = (record.customerId || "").trim();
    const productId = (record.productId || "").trim();
    const reason = (record.reason || "").trim();
    
    setFormData({
      customerId: customerId,
      productId: productId,
      orderId: (record.orderId || "").trim(),
      reason: reason,
      status: record.status || "received",
      repairDescription: (record.repairDescription || "").trim(),
      cost: record.cost || 0,
      receivedDate: record.receivedDate?.toDate()?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (record: WarrantyRecord) => {
    setSelectedRecord(record);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      customerId: "",
      productId: "",
      orderId: "",
      reason: "",
      status: "received",
      repairDescription: "",
      cost: 0,
      receivedDate: new Date().toISOString().split("T")[0],
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return <Badge variant="default">Alındı</Badge>;
      case "in_repair":
        return <Badge variant="secondary">Onarımda</Badge>;
      case "completed":
        return <Badge variant="outline">Tamamlandı</Badge>;
      case "returned":
        return <Badge variant="secondary">İade Edildi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCustomerName = (customerId: string) => {
    if (!customerId) return "Bilinmeyen Müşteri";
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || "Bilinmeyen Müşteri";
  };

  const getProductName = (productId: string) => {
    if (!productId) return "Bilinmeyen Ürün";
    const product = products.find((p) => p.id === productId);
    return product?.name || "Bilinmeyen Ürün";
  };

  const getUserName = (userId: string) => {
    if (!userId) return "Bilinmeyen Kullanıcı";
    return usersMap[userId] || "Bilinmeyen Kullanıcı";
  };

  const filteredRecords = records.filter((record) => {
    const customerName = getCustomerName(record.customerId).toLowerCase();
    const productName = getProductName(record.productId).toLowerCase();
    const reason = record.reason.toLowerCase();
    return (
      customerName.includes(searchTerm.toLowerCase()) ||
      productName.includes(searchTerm.toLowerCase()) ||
      reason.includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <MainLayout>
        <LoadingState message="Garanti kayıtları yükleniyor..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6 w-[80%] max-w-[80%] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] sm:text-[24px] font-semibold text-foreground">Satış Sonrası Takip</h1>
            <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
              Garantiye gelen ürünleri takip edin
            </p>
          </div>
          {canCreate && (
            <Button className="gap-1.5 sm:gap-2 w-full sm:w-auto min-h-[44px] sm:min-h-10 text-xs sm:text-sm" onClick={() => {
              resetForm();
              setCreateDialogOpen(true);
            }}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Yeni Kayıt</span>
              <span className="sm:hidden">Yeni</span>
            </Button>
          )}
        </div>

        {/* Filtreler */}
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
              <SearchInput
                placeholder="Müşteri, ürün veya neden ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                containerClassName="flex-1 min-w-0 w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]"
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Kayıtlar */}
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6 p-3 sm:p-4 md:p-6">
              {loading ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Yükleniyor...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">{searchTerm ? "Arama sonucu bulunamadı" : "Henüz kayıt yok"}</p>
                </div>
              ) : (
                filteredRecords.map((record) => (
                  <Card
                    key={record.id}
                    className="group hover:shadow-lg transition-all duration-200 cursor-pointer border border-border/80 hover:border-primary/60 flex flex-col h-full overflow-hidden bg-card"
                    onClick={() => openDetailDialog(record)}
                  >
                    <CardContent className="p-4 sm:p-5 flex flex-col flex-1 gap-4 min-h-[280px]">
                      {/* Header Section */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-start gap-2 flex-wrap">
                            <h3 className="font-semibold text-[14px] sm:text-[15px] leading-tight text-foreground break-words" title={getProductName(record.productId)}>
                              {getProductName(record.productId)}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 min-h-[20px]">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground truncate" title={getCustomerName(record.customerId)}>
                              {getCustomerName(record.customerId)}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-muted rounded-md" 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openDetailDialog(record);
                            }}>
                              <Edit className="mr-2 h-4 w-4" /> Detayları Görüntüle
                            </DropdownMenuItem>
                            {(canUpdate || record.createdBy === user?.id) && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(record);
                              }}>
                                <Edit className="mr-2 h-4 w-4" /> Düzenle
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(record);
                              }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Sil
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Status and Description Section */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center justify-between px-3 py-2.5 bg-muted/40 rounded-md border border-border/50 min-h-[44px]">
                          <span className="text-xs font-medium text-muted-foreground">Durum</span>
                          <Select
                            value={record.status}
                            onValueChange={(value: WarrantyRecord["status"]) => {
                              handleStatusChange(record.id, value);
                            }}
                          >
                            <SelectTrigger 
                              className="w-[140px] h-7 text-xs border-0 bg-transparent p-0 focus:ring-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent onClick={(e) => e.stopPropagation()}>
                              <SelectItem value="received">Alındı</SelectItem>
                              <SelectItem value="in_repair">Onarımda</SelectItem>
                              <SelectItem value="completed">Tamamlandı</SelectItem>
                              <SelectItem value="returned">İade Edildi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="px-3 py-2.5 bg-muted/40 rounded-md border border-border/50 min-h-[44px]">
                          <p className="text-xs text-muted-foreground mb-1">Neden</p>
                          <p className="text-sm font-medium text-foreground line-clamp-2">{record.reason || "-"}</p>
                        </div>
                        {record.repairDescription ? (
                          <div className="px-3 py-2.5 bg-muted/40 rounded-md border border-border/50 min-h-[44px]">
                            <p className="text-xs text-muted-foreground mb-1">Yapılan İşlem</p>
                            <p className="text-sm font-medium text-foreground line-clamp-2">{record.repairDescription}</p>
                          </div>
                        ) : (
                          <div className="min-h-[44px]"></div>
                        )}
                      </div>

                      {/* Statistics Section */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
                        <div className="flex flex-col gap-1.5 min-h-[60px] justify-center">
                          <div className="flex items-center gap-1.5 min-h-[20px]">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
                            <span className="text-xs font-medium text-muted-foreground">Maliyet</span>
                          </div>
                          <span className="text-xl font-bold text-foreground leading-none">
                            ₺{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(record.cost)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5 min-h-[60px] justify-center">
                          <div className="flex items-center gap-1.5 min-h-[20px]">
                            <Package className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
                            <span className="text-xs font-medium text-muted-foreground">Tarih</span>
                          </div>
                          <span className="text-xl font-bold text-foreground leading-none">
                            {record.receivedDate.toDate().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}
                          </span>
                        </div>
                      </div>

                      {/* Footer Section */}
                      <div className="pt-2 border-t border-border/60 space-y-2 mt-auto">
                        {/* Status Badge */}
                        <Badge 
                          variant="outline"
                          className={cn(
                            "w-full justify-center text-xs font-medium py-1.5",
                            record.status === "completed" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
                            record.status === "in_repair" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
                            record.status === "returned" && "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
                            record.status === "received" && "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          )}
                        >
                          {record.status === "received" ? "Alındı" : 
                           record.status === "in_repair" ? "Onarımda" : 
                           record.status === "completed" ? "Tamamlandı" : 
                           record.status === "returned" ? "İade Edildi" : record.status}
                        </Badge>
                        
                        {/* Created By */}
                        {record.createdBy ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 min-h-[20px]">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{getUserName(record.createdBy)}</span>
                          </div>
                        ) : (
                          <div className="min-h-[20px]"></div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="!max-w-[100vw] sm:!max-w-[95vw] !w-[100vw] sm:!w-[95vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[2.5vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
            <div className="flex flex-col h-full min-h-0">
              {/* Header */}
              <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0 mt-0.5">
                      <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground break-words">
                        {selectedRecord ? getProductName(selectedRecord.productId) : "Garanti Kaydı Detayı"}
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        Garanti kaydı detayları
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    {selectedRecord && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0"
                        onClick={() => {
                          setDetailDialogOpen(false);
                          if (selectedRecord) openEditDialog(selectedRecord);
                        }}
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                        Düzenle
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0 text-white"
                      onClick={() => setDetailDialogOpen(false)}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                      Kapat
                    </Button>
                  </div>
                </div>
              </DialogHeader>
            
              {/* Content */}
              <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
                <div className="max-w-full mx-auto h-full overflow-y-auto">
                  {selectedRecord && (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Highlight Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <Card>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">Müşteri</p>
                                <p className="text-sm font-semibold break-words">{getCustomerName(selectedRecord.customerId)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center border border-emerald-200 flex-shrink-0">
                                <Package className="h-5 w-5 text-emerald-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">Ürün</p>
                                <p className="text-sm font-semibold break-words">{getProductName(selectedRecord.productId)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200">
                                <Package className="h-5 w-5 text-blue-700" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Maliyet</p>
                                <p className="text-sm font-semibold">₺{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(selectedRecord.cost)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center border border-amber-200">
                                <ShieldCheck className="h-5 w-5 text-amber-700" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Durum</p>
                                <Select
                                  value={selectedRecord.status}
                                  onValueChange={(value: WarrantyRecord["status"]) => {
                                    handleStatusChange(selectedRecord.id, value);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs border-0 p-0 font-semibold min-h-[32px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="received">Alındı</SelectItem>
                                    <SelectItem value="in_repair">Onarımda</SelectItem>
                                    <SelectItem value="completed">Tamamlandı</SelectItem>
                                    <SelectItem value="returned">İade Edildi</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Detaylar */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-[14px] sm:text-[15px]">Detaylar</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm text-muted-foreground">Alınma Tarihi</Label>
                              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                                <p className="text-sm font-medium">
                                  {selectedRecord.receivedDate.toDate().toLocaleDateString("tr-TR")}
                                </p>
                              </div>
                            </div>
                            {selectedRecord.orderId && (
                              <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">İlgili Sipariş</Label>
                                <div className="rounded-lg border bg-muted/30 px-3 py-2">
                                  <p className="text-sm font-medium">
                                    {orders.find(o => o.id === selectedRecord.orderId)?.orderNumber || orders.find(o => o.id === selectedRecord.orderId)?.order_number || "Bulunamadı"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Geliş Nedeni</Label>
                            <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
                              <p className="text-sm">{selectedRecord.reason}</p>
                            </div>
                          </div>

                          {selectedRecord.repairDescription && (
                            <div className="space-y-2">
                              <Label className="text-sm text-muted-foreground">Yapılan İşlem</Label>
                              <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
                                <p className="text-sm">{selectedRecord.repairDescription}</p>
                              </div>
                            </div>
                          )}
                          {selectedRecord.createdBy && (
                            <div className="space-y-2">
                              <Label className="text-sm text-muted-foreground">Oluşturan</Label>
                              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <p className="text-sm font-medium">{getUserName(selectedRecord.createdBy)}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Activity Comments Panel */}
                      {selectedRecord?.id && user && (
                        <ActivityCommentsPanel
                          entityId={selectedRecord.id}
                          entityType="warranty"
                          onAddComment={async (content: string) => {
                            await addWarrantyComment(
                              selectedRecord.id,
                              user.id,
                              content,
                              user.fullName || user.email?.split("@")[0] || "Kullanıcı",
                              user.email
                            );
                          }}
                          onGetComments={async () => {
                            return await getWarrantyComments(selectedRecord.id);
                          }}
                          onGetActivities={async () => {
                            return await getWarrantyActivities(selectedRecord.id);
                          }}
                          currentUserId={user.id}
                          currentUserName={user.fullName || user.email?.split("@")[0] || "Kullanıcı"}
                          currentUserEmail={user.email}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="!max-w-[100vw] sm:!max-w-[95vw] !w-[100vw] sm:!w-[95vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[2.5vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
            <div className="flex flex-col h-full min-h-0">
              {/* Header */}
              <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                      <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground truncate">
                      Yeni Garanti Kaydı
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Yeni garanti kaydı oluşturun
                    </DialogDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                      İptal
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0 text-white"
                      onClick={handleCreate}
                    >
                      <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                      Oluştur
                    </Button>
                  </div>
                </div>
              </DialogHeader>
            
              {/* Content */}
              <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
                <div className="max-w-full mx-auto h-full overflow-y-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-[14px] sm:text-[15px]">Garanti Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="create-customer" className="text-sm sm:text-base" showRequired>
                            Müşteri
                          </Label>
                          <Select
                            value={formData.customerId}
                            onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                          >
                            <SelectTrigger id="create-customer" className="min-h-[44px] sm:min-h-0">
                              <SelectValue placeholder="Müşteri seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name} {customer.company && `(${customer.company})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="create-product" className="text-sm sm:text-base" showRequired>
                            Ürün
                          </Label>
                          <Select
                            value={formData.productId}
                            onValueChange={(value) => setFormData({ ...formData, productId: value })}
                          >
                            <SelectTrigger id="create-product" className="min-h-[44px] sm:min-h-0">
                              <SelectValue placeholder="Ürün seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-order" className="text-sm sm:text-base">Sipariş (Opsiyonel)</Label>
                        <Select
                          value={formData.orderId || "none"}
                          onValueChange={(value) =>
                            setFormData({ ...formData, orderId: value === "none" ? "" : value })
                          }
                        >
                          <SelectTrigger id="create-order" className="min-h-[44px] sm:min-h-0">
                            <SelectValue placeholder="Sipariş seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sipariş yok</SelectItem>
                            {orders.map((order) => (
                              <SelectItem key={order.id} value={order.id}>
                                {order.orderNumber || order.order_number || order.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="create-received-date" className="text-sm sm:text-base">Alınma Tarihi</Label>
                          <Input
                            id="create-received-date"
                            type="date"
                            value={formData.receivedDate}
                            onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                            className="min-h-[44px] sm:min-h-0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="create-status" className="text-sm sm:text-base">Durum</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value: WarrantyRecord["status"]) =>
                              setFormData({ ...formData, status: value })
                            }
                          >
                            <SelectTrigger id="create-status" className="min-h-[44px] sm:min-h-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="received">Alındı</SelectItem>
                              <SelectItem value="in_repair">Onarımda</SelectItem>
                              <SelectItem value="completed">Tamamlandı</SelectItem>
                              <SelectItem value="returned">İade Edildi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-reason" className="text-sm sm:text-base" showRequired>
                          Neden Geldi
                        </Label>
                        <Textarea
                          id="create-reason"
                          value={formData.reason}
                          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                          placeholder="Ürünün garantiye gelme nedeni"
                          rows={4}
                          className="min-h-[100px] sm:min-h-[120px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-repair" className="text-sm sm:text-base">Yapılan İşlem</Label>
                        <Textarea
                          id="create-repair"
                          value={formData.repairDescription}
                          onChange={(e) => setFormData({ ...formData, repairDescription: e.target.value })}
                          placeholder="Ürüne yapılan işlem açıklaması"
                          rows={4}
                          className="min-h-[100px] sm:min-h-[120px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-cost" className="text-sm sm:text-base">Maliyet (₺)</Label>
                        <Input
                          id="create-cost"
                          type="number"
                          value={formData.cost}
                          onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) || 0 })}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="!max-w-[100vw] sm:!max-w-[95vw] !w-[100vw] sm:!w-[95vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[2.5vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
            <div className="flex flex-col h-full min-h-0">
              {/* Header */}
              <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                      <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground truncate">
                      Garanti Kaydı Düzenle
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Garanti kaydını düzenleyin
                    </DialogDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0"
                      onClick={() => setEditDialogOpen(false)}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                      İptal
                    </Button>
                    {(canUpdate || selectedRecord?.createdBy === user?.id) && (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0 text-white"
                        onClick={handleEdit}
                      >
                        <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                        Kaydet
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>
            
              {/* Content */}
              <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
                <div className="max-w-full mx-auto h-full overflow-y-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-[14px] sm:text-[15px]">Garanti Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-customer" className="text-sm sm:text-base" showRequired>
                            Müşteri
                          </Label>
                          <Select
                            value={formData.customerId || ""}
                            onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                          >
                            <SelectTrigger id="edit-customer" className="min-h-[44px] sm:min-h-0">
                              <SelectValue placeholder="Müşteri seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name} {customer.company && `(${customer.company})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-product" className="text-sm sm:text-base" showRequired>
                            Ürün
                          </Label>
                          <Select
                            value={formData.productId || ""}
                            onValueChange={(value) => setFormData({ ...formData, productId: value })}
                          >
                            <SelectTrigger id="edit-product" className="min-h-[44px] sm:min-h-0">
                              <SelectValue placeholder="Ürün seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-order" className="text-sm sm:text-base">Sipariş (Opsiyonel)</Label>
                        <Select
                          value={formData.orderId || "none"}
                          onValueChange={(value) =>
                            setFormData({ ...formData, orderId: value === "none" ? "" : value })
                          }
                        >
                          <SelectTrigger id="edit-order" className="min-h-[44px] sm:min-h-0">
                            <SelectValue placeholder="Sipariş seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sipariş yok</SelectItem>
                            {orders.map((order) => (
                              <SelectItem key={order.id} value={order.id}>
                                {order.orderNumber || order.order_number || order.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-received-date" className="text-sm sm:text-base">Alınma Tarihi</Label>
                          <Input
                            id="edit-received-date"
                            type="date"
                            value={formData.receivedDate}
                            onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                            className="min-h-[44px] sm:min-h-0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-status" className="text-sm sm:text-base">Durum</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value: WarrantyRecord["status"]) =>
                              setFormData({ ...formData, status: value })
                            }
                          >
                            <SelectTrigger id="edit-status" className="min-h-[44px] sm:min-h-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="received">Alındı</SelectItem>
                              <SelectItem value="in_repair">Onarımda</SelectItem>
                              <SelectItem value="completed">Tamamlandı</SelectItem>
                              <SelectItem value="returned">İade Edildi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-reason" className="text-sm sm:text-base" showRequired>
                          Neden Geldi
                        </Label>
                        <Textarea
                          id="edit-reason"
                          value={formData.reason || ""}
                          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                          placeholder="Ürünün garantiye gelme nedeni"
                          rows={4}
                          className="min-h-[100px] sm:min-h-[120px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-repair" className="text-sm sm:text-base">Yapılan İşlem</Label>
                        <Textarea
                          id="edit-repair"
                          value={formData.repairDescription}
                          onChange={(e) => setFormData({ ...formData, repairDescription: e.target.value })}
                          placeholder="Ürüne yapılan işlem açıklaması"
                          rows={4}
                          className="min-h-[100px] sm:min-h-[120px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-cost" className="text-sm sm:text-base">Maliyet (₺)</Label>
                        <Input
                          id="edit-cost"
                          type="number"
                          value={formData.cost}
                          onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) || 0 })}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Garanti Kaydını Sil</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedRecord && (
                  <>
                    Bu garanti kaydını silmek istediğinizden emin misiniz?
                    Bu işlem geri alınamaz.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Warranty;

