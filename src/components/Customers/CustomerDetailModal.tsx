import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Building2, MapPin, FileText, Plus, Download, PhoneCall, PhoneIncoming, AlertTriangle, MessageSquare, ExternalLink, Calendar, User, TrendingUp, Package, CheckCircle2, Loader2, Receipt, Edit, Trash2, Save, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getCustomerNotes, createCustomerNote, CustomerNote } from "@/services/firebase/customerNoteService";
import { getSavedReports, SavedReport } from "@/services/firebase/reportService";
import { getOrders, Order } from "@/services/firebase/orderService";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { formatPhoneForDisplay, formatPhoneForTelLink, normalizePhone } from "@/utils/phoneNormalizer";
import { tr } from "date-fns/locale";
import { updateCustomer, deleteCustomer } from "@/services/firebase/customerService";
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

interface CustomerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export const CustomerDetailModal = ({ open, onOpenChange, customer, onUpdate, onDelete }: CustomerDetailModalProps) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [quotes, setQuotes] = useState<SavedReport[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({
    type: "general" as CustomerNote["type"],
    title: "",
    content: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    tax_number: "",
    notes: "",
  });

  useEffect(() => {
    if (open && customer?.id) {
      fetchData();
      setIsEditing(false);
    }
  }, [open, customer?.id]);

  useEffect(() => {
    if (customer && !isEditing) {
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: formatPhoneForDisplay(customer.phone) || "",
        company: customer.company || "",
        address: customer.address || "",
        tax_number: customer.taxId || customer.tax_number || customer.tax_id || "",
        notes: customer.notes || "",
      });
    }
  }, [customer, isEditing]);

  const fetchData = async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const [notesData, quotesData, ordersData] = await Promise.all([
        getCustomerNotes(customer.id),
        getSavedReports({ reportType: "sales_quote" }),
        getOrders({ customerId: customer.id }),
      ]);
      setNotes(notesData);
      // Quotes'ları customerId'ye göre filtrele
      const customerQuotes = quotesData.filter((quote) => {
        const metadata = quote.metadata as any;
        return metadata?.customerId === customer.id;
      });
      setQuotes(customerQuotes);
      setOrders(ordersData);
    } catch (error: any) {
      toast.error("Veriler yüklenirken hata: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!customer?.id || !user?.id) return;
    if (!noteForm.title.trim() || !noteForm.content.trim()) {
      toast.error("Başlık ve içerik gereklidir");
      return;
    }

    try {
      await createCustomerNote({
        customerId: customer.id,
        type: noteForm.type,
        title: noteForm.title.trim(),
        content: noteForm.content.trim(),
        createdBy: user.id,
      });
      toast.success("Not eklendi");
      setNoteDialogOpen(false);
      setNoteForm({ type: "general", title: "", content: "" });
      fetchData();
    } catch (error: any) {
      toast.error("Not eklenirken hata: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id || !user?.id) return;

    if (!formData.name.trim()) {
      toast.error("İsim gereklidir");
      return;
    }

    setSaving(true);
    try {
      await updateCustomer(
        customer.id,
        {
          name: formData.name.trim(),
          company: formData.company.trim() || null,
          email: formData.email.trim() || null,
          phone: normalizePhone(formData.phone),
          address: formData.address.trim() || null,
          taxId: formData.tax_number.trim() || null,
          notes: formData.notes.trim() || null,
        },
        user.id
      );

      toast.success("Müşteri başarıyla güncellendi");
      setIsEditing(false);
      if (onUpdate) {
        onUpdate();
      }
      fetchData();
    } catch (error: any) {
      console.error("Update customer error:", error);
      toast.error(error.message || "Müşteri güncellenirken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customer?.id) return;

    try {
      await deleteCustomer(customer.id);
      toast.success("Müşteri silindi");
      setDeleteDialogOpen(false);
      onOpenChange(false);
      if (onDelete) {
        onDelete();
      }
    } catch (error: any) {
      console.error("Delete customer error:", error);
      toast.error(error.message || "Müşteri silinirken hata oluştu");
    }
  };

  const getNoteTypeLabel = (type: CustomerNote["type"]) => {
    switch (type) {
      case "phone_call_out":
        return "Telefonla Aradık";
      case "phone_call_in":
        return "Bizi Aradı";
      case "warranty":
        return "Arıza Kaydı";
      case "general":
        return "Genel Not";
      default:
        return type;
    }
  };

  const getNoteTypeIcon = (type: CustomerNote["type"]) => {
    switch (type) {
      case "phone_call_out":
        return PhoneCall;
      case "phone_call_in":
        return PhoneIncoming;
      case "warranty":
        return AlertTriangle;
      case "general":
        return MessageSquare;
      default:
        return FileText;
    }
  };

  // İstatistikleri hesapla
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalOrderAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalQuotes = quotes.length;
    const totalQuoteAmount = quotes.reduce((sum, quote) => {
      const metadata = quote.metadata as any;
      return sum + (metadata?.grandTotal || 0);
    }, 0);
    const completedOrders = orders.filter((o) => o.status === "completed" || o.status === "delivered").length;
    
    return {
      totalOrders,
      totalOrderAmount,
      totalQuotes,
      totalQuoteAmount,
      completedOrders,
    };
  }, [orders, quotes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDateSafe = (dateInput?: any) => {
    if (!dateInput) return "-";
    try {
      let date: Date;
      
      // Timestamp kontrolü (Firebase Timestamp)
      if (dateInput?.toDate && typeof dateInput.toDate === "function") {
        date = dateInput.toDate();
      } 
      // Timestamp objesi (seconds property ile)
      else if (dateInput?.seconds) {
        date = new Date(dateInput.seconds * 1000);
      }
      // Timestamp objesi (nanoseconds property ile)
      else if (dateInput?.nanoseconds) {
        date = new Date(dateInput.seconds * 1000 + dateInput.nanoseconds / 1000000);
      }
      // Date objesi
      else if (dateInput instanceof Date) {
        date = dateInput;
      }
      // String (ISO format veya diğer)
      else if (typeof dateInput === "string") {
        const parsed = new Date(dateInput);
        if (!Number.isNaN(parsed.getTime())) {
          date = parsed;
        } else {
          return "-";
        }
      }
      // Number (timestamp)
      else if (typeof dateInput === "number") {
        date = new Date(dateInput);
      }
      // Diğer durumlar
      else {
        date = new Date(dateInput);
      }
      
      if (Number.isNaN(date.getTime())) return "-";
      return format(date, "dd MMM yyyy", { locale: tr });
    } catch (error) {
      console.error("Date formatting error:", error, dateInput);
      return "-";
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[100vw] sm:!max-w-[95vw] !w-[100vw] sm:!w-[95vw] !h-[100vh] sm:!h-[90vh] !max-h-[100vh] sm:!max-h-[90vh] !left-0 sm:!left-[2.5vw] !top-0 sm:!top-[5vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground truncate">
                    {isEditing ? "Müşteri Düzenle" : customer.name}
                  </DialogTitle>
                  {!isEditing && customer.company ? (
                    <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                      {customer.company}
                    </DialogDescription>
                  ) : (
                    <DialogDescription className="sr-only">
                      Müşteri detayları ve bilgileri
                    </DialogDescription>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
              {!isEditing ? (
                <>
                  {customer.email && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-primary/10 text-primary hover:bg-primary/20 rounded-lg px-3 py-1.5 font-medium shadow-sm text-xs sm:text-sm flex-shrink-0"
                      onClick={() => window.location.href = `mailto:${customer.email}`}
                      aria-label="E-posta gönder"
                    >
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                      Mail
                    </Button>
                  )}
                  {customer.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0"
                      onClick={() => window.location.href = `tel:${formatPhoneForTelLink(customer.phone)}`}
                      aria-label="Telefon ara"
                    >
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                      Ara
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                    Düzenle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/20 hover:bg-destructive/5 text-destructive rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                    Sil
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: customer.name || "",
                        email: customer.email || "",
                        phone: formatPhoneForDisplay(customer.phone) || "",
                        company: customer.company || "",
                        address: customer.address || "",
                        tax_number: customer.taxId || customer.tax_number || customer.tax_id || "",
                        notes: customer.notes || "",
                      });
                    }}
                    disabled={saving}
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                    İptal
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 font-medium text-xs sm:text-sm flex-shrink-0 text-white"
                    onClick={handleSubmit}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                    )}
                    Kaydet
                  </Button>
                </>
              )}
            </div>
          </div>
          </DialogHeader>
          {/* Quick Info Chips */}
          {(customer.email || customer.phone || customer.tax_number || customer.taxId || customer.tax_id) && (
            <div className="px-3 sm:px-6 py-2 sm:py-3 border-b bg-gray-50/50 flex flex-wrap items-center gap-2 flex-shrink-0">
              {customer.email && (
                <div className="flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="text-muted-foreground/70">E-posta:</span>
                  <span className="text-foreground truncate max-w-[200px]">{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span className="text-muted-foreground/70">Telefon:</span>
                  <span className="text-foreground">{formatPhoneForDisplay(customer.phone)}</span>
                </div>
              )}
              {(customer.tax_number || customer.taxId || customer.tax_id) && (
                <div className="flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  <span className="text-muted-foreground/70">Vergi No:</span>
                  <span className="text-foreground">{customer.tax_number || customer.taxId || customer.tax_id}</span>
                </div>
              )}
        </div>
          )}
        
          <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
            <div className="max-w-full mx-auto h-full overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-6">

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-white to-white border-primary/20 text-card-foreground p-4 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 flex flex-col h-full">
            <div className="flex items-start justify-between flex-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Toplam Sipariş</p>
                <p className="text-2xl font-semibold leading-tight">{stats.totalOrders}</p>
              </div>
              <div className="rounded-full border p-2 bg-white/75 shadow-inner shrink-0 ml-2">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-gradient-to-br from-emerald-50/80 via-white to-white border-emerald-100 text-card-foreground p-4 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 flex flex-col h-full">
            <div className="flex items-start justify-between flex-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Sipariş Tutarı</p>
                <p className="text-2xl font-semibold leading-tight">{formatCurrency(stats.totalOrderAmount)}</p>
              </div>
              <div className="rounded-full border p-2 bg-white/75 shadow-inner shrink-0 ml-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-gradient-to-br from-blue-50/80 via-white to-white border-blue-100 text-card-foreground p-4 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 flex flex-col h-full">
            <div className="flex items-start justify-between flex-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Fiyat Teklifleri</p>
                <p className="text-2xl font-semibold leading-tight">{stats.totalQuotes}</p>
              </div>
              <div className="rounded-full border p-2 bg-white/75 shadow-inner shrink-0 ml-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-gradient-to-br from-amber-50/80 via-white to-white border-amber-100 text-card-foreground p-4 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 flex flex-col h-full">
            <div className="flex items-start justify-between flex-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Tamamlanan</p>
                <p className="text-2xl font-semibold leading-tight">{stats.completedOrders}</p>
              </div>
              <div className="rounded-full border p-2 bg-white/75 shadow-inner shrink-0 ml-2">
                <CheckCircle2 className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
        <Tabs defaultValue="info" className="w-full overflow-x-hidden max-w-full px-3 sm:px-4 md:px-6 lg:px-12">
          <TabsList className="grid w-full grid-cols-4 h-auto sm:h-10 md:h-11 bg-muted/50 rounded-lg p-1 border gap-1">
            <TabsTrigger 
              value="info" 
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary text-xs md:text-sm font-medium transition-all duration-200 min-h-[44px] sm:min-h-0"
            >
              Bilgiler
            </TabsTrigger>
            <TabsTrigger 
              value="quotes" 
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary text-xs md:text-sm font-medium transition-all duration-200 min-h-[44px] sm:min-h-0"
            >
              Fiyat Teklifleri
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary text-xs md:text-sm font-medium transition-all duration-200 min-h-[44px] sm:min-h-0"
            >
              Siparişler
            </TabsTrigger>
            <TabsTrigger 
              value="notes" 
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary text-xs md:text-sm font-medium transition-all duration-200 min-h-[44px] sm:min-h-0"
            >
              Notlar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 focus:outline-none overflow-x-hidden max-w-full">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <Card>
                  <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">Müşteri Bilgileri</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Temel müşteri bilgilerini güncelleyin</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" showRequired className="text-sm sm:text-base">İsim</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-sm sm:text-base">Şirket</Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm sm:text-base">E-posta</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm sm:text-base">Telefon</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-sm sm:text-base">Adres</Label>
                        <Textarea
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          rows={3}
                          className="min-h-[44px] sm:min-h-0 resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax_number" className="text-sm sm:text-base">Vergi No</Label>
                        <Input
                          id="tax_number"
                          value={formData.tax_number}
                          onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                          className="min-h-[44px] sm:min-h-0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm sm:text-base">Notlar</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={4}
                        className="min-h-[44px] sm:min-h-0 resize-none"
                        placeholder="Müşteri hakkında notlar..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </form>
            ) : (
              <>
                {/* Temel Bilgiler */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground mb-0.5">İsim</p>
                      <p className="text-sm text-muted-foreground">{customer.name}</p>
                    </div>
                  </div>

                  {customer.company && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground mb-0.5">Şirket</p>
                        <p className="text-sm text-muted-foreground">{customer.company}</p>
                      </div>
                    </div>
                  )}

                  {customer.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground mb-0.5">E-posta</p>
                        <p className="text-sm text-muted-foreground break-all">{customer.email}</p>
                      </div>
                    </div>
                  )}

                  {customer.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground mb-0.5">Telefon</p>
                        <p className="text-sm text-muted-foreground">{formatPhoneForDisplay(customer.phone)}</p>
                        </div>
                      </div>
                  )}

                  {(customer.tax_number || customer.taxId || customer.tax_id) && (
                    <div className="flex items-start gap-3">
                      <Receipt className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground mb-0.5">Vergi No</p>
                        <p className="text-sm text-muted-foreground">{customer.tax_number || customer.taxId || customer.tax_id}</p>
                      </div>
                    </div>
                  )}
              </div>

              {customer.address && (
                <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground mb-0.5">Adres</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">{customer.address}</p>
                        </div>
                    </div>
                </>
              )}

              {customer.notes && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground mb-0.5">Notlar</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">{customer.notes}</p>
                    </div>
                  </div>
                </>
              )}

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Oluşturma Tarihi</p>
                      <p className="text-sm font-medium text-foreground">
                      {formatDateSafe(customer.createdAt || customer.created_at)}
                  </p>
                </div>
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Son Güncelleme</p>
                      <p className="text-sm font-medium text-foreground">
                      {formatDateSafe(customer.updatedAt || customer.updated_at)}
                        </p>
                  </div>
              </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="quotes" className="space-y-3 sm:space-y-4 mt-4 sm:mt-6 focus:outline-none overflow-x-hidden max-w-full">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Fiyat Teklifleri ({quotes.length})</h3>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
              </div>
            ) : quotes.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-sm font-medium text-muted-foreground">Henüz teklif bulunmuyor</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <Card key={quote.id} className="border-2 hover:border-primary/50 hover:shadow-md transition-all duration-200">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base mb-2 text-foreground">{quote.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateSafe(quote.createdAt)}
                        </p>
                      </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge variant="outline" className="text-sm font-semibold px-3 py-1 whitespace-nowrap">
                          ₺{((quote.metadata as any)?.grandTotal || 0).toLocaleString("tr-TR")}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                            className="font-semibold"
                          onClick={async () => {
                            try {
                              if (!quote.fileUrl) {
                                toast.error("Dosya bağlantısı bulunamadı");
                                return;
                              }
                              
                              const response = await fetch(quote.fileUrl);
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              const fileName = quote.fileName || `${quote.title || "teklif"}.pdf`;
                              a.download = fileName;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            } catch (error) {
                              console.error("Download error:", error);
                              if (quote.fileUrl) {
                                window.open(quote.fileUrl, "_blank");
                              } else {
                                toast.error("Dosya bağlantısı bulunamadı");
                              }
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          İndir
                        </Button>
                      </div>
                    </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 mt-6 focus:outline-none overflow-x-hidden max-w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-foreground">Siparişler ({orders.length})</h3>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
              </div>
            ) : orders.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-sm font-medium text-muted-foreground">Henüz sipariş bulunmuyor</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const getStatusBadge = (status: string) => {
                    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
                      pending: { label: "Beklemede", variant: "outline" },
                      in_progress: { label: "Üretimde", variant: "default" },
                      quality_check: { label: "Kalite Kontrol", variant: "secondary" },
                      completed: { label: "Tamamlandı", variant: "default" },
                      delivered: { label: "Teslim Edildi", variant: "default" },
                      cancelled: { label: "İptal", variant: "destructive" },
                    };
                    return statusMap[status] || { label: status, variant: "outline" };
                  };
                  const statusBadge = getStatusBadge(order.status);
                  return (
                    <Card key={order.id} className="border-2 hover:border-primary/50 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-base mb-2 text-foreground">{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateSafe(order.createdAt)}
                        </p>
                      </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <Badge variant={statusBadge.variant} className="text-sm font-semibold px-3 py-1 whitespace-nowrap">
                              {statusBadge.label}
                        </Badge>
                            <span className="font-bold text-base whitespace-nowrap text-foreground">
                          ₺{(order.totalAmount || 0).toLocaleString("tr-TR")}
                        </span>
                      </div>
                    </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-6 focus:outline-none overflow-x-hidden max-w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-foreground">Notlar ({notes.length})</h3>
              <Button 
                size="sm" 
                onClick={() => setNoteDialogOpen(true)} 
                className="font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Not Ekle</span>
                <span className="sm:hidden">Ekle</span>
              </Button>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Yükleniyor...</p>
              </div>
            ) : notes.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-sm font-medium text-muted-foreground">Henüz not bulunmuyor</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => {
                  const Icon = getNoteTypeIcon(note.type);
                  return (
                    <Card key={note.id} className="border-2 hover:border-primary/50 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3 gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <Badge variant="outline" className="text-xs font-semibold flex-shrink-0">{getNoteTypeLabel(note.type)}</Badge>
                            <p className="font-bold text-sm text-foreground truncate">{note.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                            {formatDateSafe(note.createdAt)}
                          </p>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed pl-12">
                          {note.content}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Silme Onay Dialog */}
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
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Not Ekleme Dialog */}
        <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Not Ekle</DialogTitle>
              <DialogDescription className="text-sm">
                Müşteri için yeni bir not ekleyin. Telefon görüşmeleri, arıza kayıtları veya genel notlar ekleyebilirsiniz.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Not Tipi</Label>
                <Select
                  value={noteForm.type}
                  onValueChange={(value: CustomerNote["type"]) =>
                    setNoteForm({ ...noteForm, type: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone_call_out">Telefonla Aradık</SelectItem>
                    <SelectItem value="phone_call_in">Bizi Aradı</SelectItem>
                    <SelectItem value="warranty">Arıza Kaydı</SelectItem>
                    <SelectItem value="general">Genel Not</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Başlık *</Label>
                <Input
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  placeholder="Not başlığı"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">İçerik *</Label>
                <Textarea
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  placeholder="Not içeriği"
                  rows={5}
                  className="resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setNoteDialogOpen(false)} className="font-semibold">
                İptal
              </Button>
              <Button onClick={handleAddNote} className="font-semibold shadow-md hover:shadow-lg transition-all duration-200">
                Ekle
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
