import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Plus, Trash2, Download, Edit2, Save, X, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { generateSalesOfferPDF } from "@/services/pdfGenerator";
import { toast } from "sonner";
import { CustomerCombobox } from "@/components/Customers/CustomerCombobox";
import { getOrderById, getOrderItems, OrderItem } from "@/services/firebase/orderService";
import { getCustomers, Customer } from "@/services/firebase/customerService";
import { getProducts, Product } from "@/services/firebase/productService";
import logo from "@/assets/rev-logo.png";
import { useAuth } from "@/contexts/AuthContext";

import { CURRENCY_OPTIONS, CURRENCY_SYMBOLS, DEFAULT_CURRENCY, Currency } from "@/utils/currency";

interface QuoteItem {
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // İskonto
  total: number;
  isManual?: boolean;
}

interface SalesQuoteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string; // Eğer bir siparişten açılıyorsa
}

const defaultItems: QuoteItem[] = [
  { productId: null, productName: "", quantity: 1, unitPrice: 0, discount: 0, total: 0, isManual: false },
];

export const SalesQuoteForm = ({ open, onOpenChange, orderId }: SalesQuoteFormProps) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const validUntilDate = new Date(today);
  validUntilDate.setDate(today.getDate() + 7);
  const validUntilStr = validUntilDate.toISOString().split('T')[0];

  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [quote, setQuote] = useState({
    quoteNumber: `REV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    quoteDate: todayStr,
    validUntil: validUntilStr,
    customerId: "" as string,
    customerName: "",
    customerCompany: "",
    customerAddress: "" as string,
    customerPhone: "" as string,
    customerEmail: "" as string,
    currency: DEFAULT_CURRENCY,
    taxRate: 20,
    items: defaultItems,
    terms: [
      "Nakliye ücreti fiyata dahil değildir.",
      "Cihaz, imalat hatalarına karşı 2 yıl garanti kapsamındadır.",
      "Üretim süresi, %50 peşin ödeme alındıktan sonra 10 iş günüdür.",
    ],
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const fetchCustomers = useCallback(async () => {
    try {
      const customersData = await getCustomers();
      setCustomers(customersData);
    } catch (error) {
      console.error("Fetch customers error:", error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const productsData = await getProducts();
      setProducts(productsData);
    } catch (error) {
      console.error("Fetch products error:", error);
    }
  }, []);

  const fetchOrderData = useCallback(async () => {
    if (!orderId) return;
    try {
      const [order, items] = await Promise.all([
        getOrderById(orderId),
        getOrderItems(orderId),
      ]);
      
      if (order) {
        setQuote(prev => ({
          ...prev,
          customerId: order.customerId || order.customer_id || "",
          customerName: order.customerName || order.customer_name || "",
          customerCompany: order.customerCompany || order.customer_company || "",
          items: items && items.length > 0 ? items.map((item: OrderItem) => ({
            productId: item.productId || item.product_id || null,
            productName: item.productName || item.product_name || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.unit_price || 0,
            discount: item.discount || 0,
            total: item.total || 0,
            isManual: !item.product_id,
          })) : defaultItems,
        }));
      }
    } catch (error) {
      // Failed to fetch order
    }
  }, [orderId]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchProducts();
      if (orderId) {
        fetchOrderData();
      } else {
        // Reset form when opening without orderId
        const newToday = new Date();
        const newTodayStr = newToday.toISOString().split('T')[0];
        const newValidUntilDate = new Date(newToday);
        newValidUntilDate.setDate(newToday.getDate() + 7);
        const newValidUntilStr = newValidUntilDate.toISOString().split('T')[0];
        
        setQuote(prev => ({
          ...prev,
          quoteNumber: `REV-${newToday.getFullYear()}${String(newToday.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          quoteDate: newTodayStr,
          validUntil: newValidUntilStr,
          customerId: "",
          customerName: "",
          customerCompany: "",
          customerAddress: "",
          customerPhone: "",
          customerEmail: "",
          items: defaultItems,
        }));
        setIsEditing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  // NaN kontrolü için helper
  const safeNumber = (value: any): number => {
    const num = Number(value);
    return (isNaN(num) || !isFinite(num)) ? 0 : num;
  };

  const totals = useMemo(() => {
    const subtotal = (Array.isArray(quote.items) ? quote.items : []).reduce((sum, item) => {
      const quantity = safeNumber(item.quantity);
      const unitPrice = safeNumber(item.unitPrice);
      const discount = safeNumber(item.discount || 0);
      const itemTotal = (quantity * unitPrice) - discount;
      return sum + itemTotal;
    }, 0);
    const safeSubtotal = safeNumber(subtotal);
    const safeTaxRate = safeNumber(quote.taxRate || 20);
    const tax = safeSubtotal * (safeTaxRate / 100);
    const grandTotal = safeSubtotal + safeNumber(tax);
    const totalDiscount = (Array.isArray(quote.items) ? quote.items : []).reduce((sum, item) => sum + safeNumber(item.discount || 0), 0);
    return {
      subtotal: safeSubtotal,
      tax: safeNumber(tax),
      grandTotal: safeNumber(grandTotal),
      totalDiscount: safeNumber(totalDiscount),
    };
  }, [quote.items, quote.taxRate]);
  
  // İskonto kolonu gösterilsin mi? (herhangi bir item'da discount > 0 varsa)
  const showDiscountColumn = (Array.isArray(quote.items) ? quote.items : []).some(item => (item.discount || 0) > 0);


  const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number) => {
    setQuote((prev) => {
      const nextItems = [...prev.items];
      
      if (field === "productId") {
        if (value === "manual") {
          // Manuel ürün ekleme modu
          nextItems[index] = {
            ...nextItems[index],
            productId: null,
            productName: "",
            unitPrice: 0,
            isManual: true,
          };
        } else if (value) {
          // Kayıtlı ürün seçildi
          const product = products.find(p => p.id === value);
          if (product) {
            nextItems[index] = {
              ...nextItems[index],
              productId: product.id,
              productName: product.name,
              // Ürün fiyatını otomatik olarak forma ekle
              unitPrice: product.price || 0,
              isManual: false,
            };
            
            // Fiyat varsa kullanıcıya bilgi ver
            if (product.price && product.price > 0) {
              toast.success(`Ürün fiyatı otomatik olarak eklendi: ${product.price.toFixed(2)} ${CURRENCY_SYMBOLS[quote.currency as Currency] || quote.currency}`);
            } else {
              toast.info("Bu ürün için fiyat tanımlı değil, lütfen manuel olarak girin");
            }
          }
        } else {
          // Seçim temizlendi
          nextItems[index] = {
            ...nextItems[index],
            productId: null,
            productName: "",
            unitPrice: 0,
            isManual: false,
          };
        }
      } else {
        const parsedValue = field === "productName" ? value : Number(value) || 0;
        nextItems[index] = {
          ...nextItems[index],
          [field]: parsedValue,
        };
      }
      
      // Recalculate total (quantity * unitPrice - discount) - NaN kontrolü ile
      const quantity = safeNumber(nextItems[index].quantity);
      const unitPrice = safeNumber(nextItems[index].unitPrice);
      const discount = safeNumber(nextItems[index].discount || 0);
      nextItems[index].total = safeNumber((quantity * unitPrice) - discount);
      return { ...prev, items: nextItems };
    });
  };

  const addRow = () => {
    setQuote((prev) => ({ 
      ...prev, 
      items: [...prev.items, { productId: null, productName: "", quantity: 1, unitPrice: 0, discount: 0, total: 0, isManual: false }] 
    }));
  };

  const removeRow = (index: number) => {
    if (Array.isArray(quote.items) && quote.items.length > 1) {
      setQuote((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const handleCustomerChange = useCallback((customerId: string, customerName: string) => {
    const customer = customers.find(c => c.id === customerId);
    // Firebase'den tam müşteri bilgilerini al
    getCustomers().then((allCustomers) => {
      const fullCustomer = allCustomers.find(c => c.id === customerId);
      setQuote((prev) => ({
        ...prev,
        customerId: customerId || "",
        customerName: fullCustomer?.name || customerName || "",
        customerCompany: fullCustomer?.company || customer?.company || "",
        customerAddress: fullCustomer?.address || "",
        customerPhone: fullCustomer?.phone || "",
        customerEmail: fullCustomer?.email || "",
      }));
    }).catch(() => {
      // Fallback: sadece mevcut customer bilgilerini kullan
      setQuote((prev) => ({
        ...prev,
        customerId: customerId || "",
        customerName: customer?.name || customerName || "",
        customerCompany: customer?.company || "",
      }));
    });
  }, [customers]);

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === "") return "-";
    try {
    const date = new Date(dateStr);
      // Geçersiz tarih kontrolü
      if (isNaN(date.getTime()) || !isFinite(date.getTime())) {
        console.warn("Geçersiz tarih:", dateStr);
        return "-";
      }
    const months = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];
      // Görseldeki format: "20 Ağustos 2025" (ay ve yıl arasında boşluk var)
      const day = date.getDate();
      const monthIndex = date.getMonth();
      const year = date.getFullYear();
      
      // Geçerli değerler kontrolü - tüm değerlerin geçerli olduğundan emin ol
      if (isNaN(day) || isNaN(monthIndex) || isNaN(year) || 
          monthIndex < 0 || monthIndex > 11 || 
          day < 1 || day > 31 || 
          year < 1900 || year > 2100) {
        console.warn("Geçersiz tarih bileşenleri:", { day, monthIndex, year });
        return "-";
      }
      
      const month = months[monthIndex];
      if (!month) {
        console.warn("Geçersiz ay indeksi:", monthIndex);
        return "-";
      }
      
      return `${day} ${month} ${year}`;
    } catch (error) {
      console.error("Tarih formatlama hatası:", error, dateStr);
      return "-";
    }
  };

  const handleDownload = async () => {
    if (!quote.customerCompany && !quote.customerName) {
      toast.error("Lütfen müşteri bilgisini girin.");
      return;
    }

    if (!Array.isArray(quote.items) || quote.items.length === 0 || quote.items.every(item => !item.productName)) {
      toast.error("Lütfen en az bir ürün ekleyin.");
      return;
    }

    try {
      const blob = await generateSalesOfferPDF({
        quoteNumber: quote.quoteNumber,
        quoteDate: formatDate(quote.quoteDate),
        validUntil: formatDate(quote.validUntil),
        customerName: quote.customerName,
        customerCompany: quote.customerCompany,
        customerAddress: quote.customerAddress || undefined,
        customerPhone: quote.customerPhone || undefined,
        customerEmail: quote.customerEmail || undefined,
        projectName: "",
        deliveryTerms: "",
        paymentTerms: "",
        notes: "",
        currency: quote.currency,
        taxRate: quote.taxRate,
        discountRate: 0,
        items: (Array.isArray(quote.items) ? quote.items
          .filter(item => item.productName && item.productName.trim() !== "") // Boş item'ları filtrele
          .map(item => ({
            description: item.productName || "-",
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            discount: item.discount || 0,
          })) : []),
        totals: {
          ...totals,
          discount: totals.totalDiscount,
        },
        terms: quote.terms,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Satis-Teklifi-${quote.quoteNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Teklif PDF hazırlandı");

      // PDF kaydetme işlemi - başarısız olsa bile PDF indirme başarılı olduğu için sessizce devam et
      try {
        const { saveReport } = await import("@/services/firebase/reportService");
        await saveReport("sales_quote", `Teklif ${quote.quoteNumber}`, blob, user?.id || "anonymous", {
          metadata: {
            customerId: quote.customerId || null,
            customerName: quote.customerCompany || quote.customerName || "Bilinmiyor",
            currency: quote.currency,
            grandTotal: Number(totals.grandTotal) || 0,
            subtotal: Number(totals.subtotal) || 0,
            tax: Number(totals.tax) || 0,
            discount: Number(totals.totalDiscount) || 0,
          },
        });
        // Başarılı kayıt için sessizce devam et (kullanıcı zaten PDF'i indirdi)
      } catch (reportError) {
        // PDF kaydetme başarısız olsa bile PDF indirme başarılı olduğu için sadece log'la
        // Kullanıcıya hata gösterme - PDF zaten indirildi
        console.warn("Teklif raporu kaydedilemedi (PDF indirme başarılı):", reportError);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("PDF oluşturulamadı: " + message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[98vw] md:max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm flex items-center justify-center border border-primary/20">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Satış Teklif Formu
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Teklif formunu düzenleyip PDF olarak indirebilirsiniz
                </DialogDescription>
              </div>
            </div>
          {!isEditing && (
              <Button 
                onClick={() => setIsEditing(true)} 
                variant="outline" 
                size="sm"
                className="shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Düzenle
              </Button>
            )}
            </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 overflow-auto">
          <div className="p-4 sm:p-6 flex justify-center bg-gradient-to-br from-muted/20 via-background to-muted/10">
            <div className="w-full max-w-[820px] space-y-4 sm:space-y-6">
          {/* Edit Mode Controls */}
          {isEditing && (
            <div className="space-y-4 p-5 bg-gradient-to-br from-primary/5 via-white to-white rounded-xl border-2 border-primary/20 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Edit2 className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground">Form Bilgilerini Düzenle</h3>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setIsEditing(false)} 
                    variant="default" 
                    size="sm"
                    className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Kaydet
                  </Button>
                  <Button 
                    onClick={() => setIsEditing(false)} 
                    variant="ghost" 
                    size="sm"
                    className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Teklif No</Label>
                  <Input
                    value={quote.quoteNumber}
                    onChange={(e) => setQuote((prev) => ({ ...prev, quoteNumber: e.target.value }))}
                    className="border-primary/20 focus:border-primary focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">Tarih</Label>
                    <Input
                      type="date"
                      value={quote.quoteDate}
                      onChange={(e) => setQuote((prev) => ({ ...prev, quoteDate: e.target.value }))}
                      className="border-primary/20 focus:border-primary focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">Geçerlilik Tarihi</Label>
                    <Input
                      type="date"
                      value={quote.validUntil}
                      onChange={(e) => setQuote((prev) => ({ ...prev, validUntil: e.target.value }))}
                      className="border-primary/20 focus:border-primary focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Müşteri</Label>
                <div className="border-primary/20 rounded-md">
                <CustomerCombobox
                    value={quote.customerId || ""}
                  onChange={handleCustomerChange}
                  placeholder="Müşteri seçin..."
                />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Para Birimi</Label>
                  <select
                    className="w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    value={quote.currency}
                    onChange={(e) => setQuote((prev) => ({ ...prev, currency: e.target.value as Currency }))}
                  >
                    {CURRENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">KDV (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={quote.taxRate}
                    onChange={(e) => setQuote((prev) => ({ ...prev, taxRate: Number(e.target.value) }))}
                    className="border-primary/20 focus:border-primary focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Preview - Görseldeki tasarıma uygun */}
          <div
            className="bg-white border-2 border-gray-200 rounded-xl shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl"
            style={{ 
              minWidth: "720px", 
              maxWidth: "794px", 
              width: "794px",
              padding: "32px",
              margin: "0 auto"
            }}
          >
            {/* Background geometric shapes - görseldeki gibi sol üstte, çok hafif */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
              <div className="absolute top-8 left-8 w-40 h-32 bg-gray-400 transform rotate-12" style={{ opacity: 0.02 }}></div>
              <div className="absolute top-16 left-16 w-28 h-24 bg-gray-400 transform -rotate-12" style={{ opacity: 0.02 }}></div>
              <div className="absolute top-4 left-48 w-20 h-16 bg-gray-400 transform rotate-45" style={{ opacity: 0.02 }}></div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="flex-1">
                <h2 className="text-[28px] font-bold mb-4 text-black leading-tight" style={{ letterSpacing: "0.5px", lineHeight: "1.15", fontWeight: 700 }}>SATIŞ TEKLİF FORMU</h2>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-black mb-0.5" style={{ fontWeight: 600 }}>Müşteri</p>
                  <p className="text-sm text-gray-700 leading-relaxed" style={{ lineHeight: "1.4", fontSize: "14px" }}>
                    {quote.customerCompany || quote.customerName || "Müşteri seçin"}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-12">
                <div className="flex items-center gap-2 mb-2.5">
                  <img src={logo} alt="REVIUM" className="h-10 w-10 object-contain" />
                  <span className="text-2xl font-bold text-black" style={{ fontWeight: 700 }}>REVIUM</span>
                </div>
                <div className="text-[10px] text-gray-600 space-y-[1px] leading-tight" style={{ fontSize: "10px", lineHeight: "1.2" }}>
                  <p>Fevzi Çakmak Mah. Milenyum Cad. No:81</p>
                  <p>Karatay/KONYA</p>
                  <p>info@reviumtech.com</p>
                  <p>+90 (551) 829-1613</p>
                </div>
              </div>
            </div>

            {/* Date Info - görselde alt alta, sağa yaslı */}
            <div className="mb-8 text-sm relative z-10 flex justify-end">
              <div className="text-right space-y-1">
              <div>
                  <span className="font-semibold text-black" style={{ fontWeight: 600, fontSize: "14px" }}>Tarih:</span>{" "}
                  <span className="text-gray-700" style={{ fontSize: "14px" }}>{formatDate(quote.quoteDate)}</span>
              </div>
              <div>
                  <span className="font-semibold text-black" style={{ fontWeight: 600, fontSize: "14px" }}>Geçerlilik Tarihi:</span>{" "}
                  <span className="text-gray-700" style={{ fontSize: "14px" }}>{formatDate(quote.validUntil)}</span>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="mb-8 relative z-10">
              <div className="border border-gray-300 rounded-none overflow-hidden">
                <Table className="border-collapse m-0">
                <TableHeader>
                    <TableRow className="border-0">
                      <TableHead className="w-12 text-black font-bold border border-gray-300 bg-gray-100 py-2.5 px-3 text-left text-xs" style={{ fontWeight: 700, backgroundColor: "#f3f4f6" }}>No</TableHead>
                      <TableHead className="text-black font-bold border border-gray-300 bg-gray-100 py-2.5 px-3 text-left text-xs" style={{ fontWeight: 700, backgroundColor: "#f3f4f6" }}>Ürün Adı</TableHead>
                      <TableHead className="w-24 text-black font-bold border border-gray-300 bg-gray-100 py-2.5 px-3 text-center text-xs" style={{ fontWeight: 700, backgroundColor: "#f3f4f6" }}>Adet</TableHead>
                      <TableHead className="w-32 text-black font-bold border border-gray-300 bg-gray-100 py-2.5 px-3 text-right text-xs" style={{ fontWeight: 700, backgroundColor: "#f3f4f6" }}>Birim Fiyat</TableHead>
                      {showDiscountColumn && <TableHead className="w-28 text-black font-bold border border-gray-300 bg-gray-100 py-2.5 px-3 text-right text-xs" style={{ fontWeight: 700, backgroundColor: "#f3f4f6" }}>İskonto</TableHead>}
                      <TableHead className="w-32 text-black font-bold border border-gray-300 bg-gray-100 py-2.5 px-3 text-right text-xs" style={{ fontWeight: 700, backgroundColor: "#f3f4f6" }}>Toplam</TableHead>
                      {isEditing && <TableHead className="w-12 border border-gray-300 bg-gray-100 py-3 px-3"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(quote.items) ? quote.items : []).map((item, index) => (
                      <TableRow key={index} className="border-0">
                        <TableCell className="border border-gray-300 text-left py-2.5 px-3 text-xs">{index + 1}</TableCell>
                        <TableCell className="min-w-[300px] border border-gray-300 py-2.5 px-3 text-xs">
                        {isEditing ? (
                          item.isManual ? (
                            <div className="space-y-2">
                              <Input
                                value={item.productName}
                                onChange={(e) => handleItemChange(index, "productName", e.target.value)}
                                placeholder="Ürün adı"
                                className="h-8 text-xs border-primary/20 focus:border-primary focus:ring-primary/20 transition-all"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleItemChange(index, "productId", "")}
                                className="h-7 text-xs border-primary/30 hover:border-primary hover:bg-primary/5 transition-all"
                              >
                                <Package className="h-3 w-3 mr-1" />
                                Kayıtlı Ürün Seç
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Select 
                                value={item.productId || ""}
                                onValueChange={(value) => {
                                  handleItemChange(index, "productId", value);
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs border-primary/20 focus:border-primary focus:ring-primary/20">
                                  <SelectValue placeholder="Ürün seçin veya manuel ekleyin" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[60vh] sm:max-h-80">
                                  {products.length > 0 ? (
                                    products.map((product) => (
                                      <SelectItem key={product.id} value={product.id} className="hover:bg-primary/5">
                                        <div className="flex items-center justify-between w-full">
                                          <span>{product.name}</span>
                                          {product.sku && (
                                            <Badge variant="outline" className="ml-2 text-xs border-primary/20">
                                              {product.sku}
                                            </Badge>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                                      Ürün bulunamadı
                                    </div>
                                  )}
                                  <SelectSeparator />
                                  <SelectItem value="manual" className="text-primary font-medium text-xs hover:bg-primary/10">
                                    <Plus className="h-3 w-3 inline mr-1" />
                                    Manuel Ürün Ekle
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.productName || "-"}</span>
                            {item.isManual && (
                              <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
                                Manuel
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                        <TableCell className="border border-gray-300 text-center py-2.5 px-3 text-xs">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                              className="border-primary/20 focus:border-primary focus:ring-primary/20 h-8 w-20 text-center text-xs transition-all"
                          />
                        ) : (
                            <span className="font-medium">{item.quantity}</span>
                        )}
                      </TableCell>
                        <TableCell className="border border-gray-300 text-right py-2.5 px-3 text-xs">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                              className="border-primary/20 focus:border-primary focus:ring-primary/20 h-8 w-28 text-right text-xs transition-all"
                          />
                        ) : (
                            <span className="font-medium">{CURRENCY_SYMBOLS[quote.currency as Currency] || quote.currency}{(item.unitPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        )}
                      </TableCell>
                      {showDiscountColumn && (
                          <TableCell className="border border-gray-300 text-right py-2.5 px-3 text-xs">
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discount || 0}
                              onChange={(e) => handleItemChange(index, "discount", e.target.value)}
                                className="border-primary/20 focus:border-primary focus:ring-primary/20 h-8 w-24 text-right text-xs transition-all"
                              placeholder="0.00"
                            />
                          ) : (
                            (item.discount || 0) > 0 ? (
                                <span className="text-red-600 font-medium">-{CURRENCY_SYMBOLS[quote.currency as Currency] || quote.currency}{(item.discount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            ) : (
                                <span className="text-muted-foreground">-</span>
                            )
                          )}
                        </TableCell>
                      )}
                        <TableCell className="font-semibold text-right border border-gray-300 py-2.5 px-3 text-xs">
                          <span className="text-foreground">{CURRENCY_SYMBOLS[quote.currency as Currency] || quote.currency}{(item.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </TableCell>
                      {isEditing && (
                          <TableCell className="border border-gray-300 py-3 px-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRow(index)}
                            disabled={!Array.isArray(quote.items) || quote.items.length === 1}
                              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30"
                          >
                              <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  className="mt-3 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Satır Ekle
                </Button>
              )}
            </div>

            {/* Summary and Terms */}
            <div className="grid grid-cols-2 mb-6 relative z-10" style={{ gap: "64px" }}>
              {/* Terms - görselde başlık yok, direkt liste */}
              <div className="space-y-2">
                {isEditing ? (
                  <div className="space-y-3">
                    {(Array.isArray(quote.terms) ? quote.terms : []).map((term, index) => (
                      <Input
                        key={index}
                        value={term}
                        onChange={(e) => {
                          const newTerms = [...quote.terms];
                          newTerms[index] = e.target.value;
                          setQuote((prev) => ({ ...prev, terms: newTerms }));
                        }}
                        className="text-sm border-primary/20 focus:border-primary focus:ring-primary/20 transition-all"
                        placeholder={`Şart ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : (
                  <ul className="list-disc list-inside space-y-2.5 text-sm text-gray-700 leading-relaxed" style={{ paddingLeft: "1.25rem", lineHeight: "1.5" }}>
                    {(Array.isArray(quote.terms) ? quote.terms : []).map((term, index) => (
                      <li key={index} className="hover:text-foreground transition-colors" style={{ marginBottom: "0.5rem", fontSize: "14px" }}>{term}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2.5 text-right">
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between items-center mb-2.5 p-2 rounded-md hover:bg-muted/30 transition-colors">
                    <span className="text-sm text-foreground/80" style={{ fontSize: "14px" }}>Toplam İskonto:</span>
                    <span className="font-semibold text-red-600 text-sm" style={{ fontSize: "14px", fontWeight: 600 }}>
                      -{CURRENCY_SYMBOLS[quote.currency as Currency] || quote.currency}{(totals.totalDiscount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2.5 p-2 rounded-md hover:bg-muted/30 transition-colors">
                  <span className="text-sm text-foreground/80" style={{ fontSize: "14px" }}>Ara Toplam:</span>
                  <span className="font-semibold text-foreground text-sm" style={{ fontSize: "14px", fontWeight: 600 }}>
                    {CURRENCY_SYMBOLS[quote.currency as Currency] || quote.currency}{(totals.subtotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2.5 p-2 rounded-md hover:bg-muted/30 transition-colors">
                  <span className="text-sm text-foreground/80" style={{ fontSize: "14px" }}>KDV (%{quote.taxRate}):</span>
                  <span className="font-semibold text-foreground text-sm" style={{ fontSize: "14px", fontWeight: 600 }}>
                    {CURRENCY_SYMBOLS[quote.currency as Currency] || quote.currency}{(totals.tax || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t-2 border-gray-500 mt-4 rounded-lg bg-gray-100" style={{ borderTopWidth: "2px", borderTopColor: "#6b7280", padding: "14px 18px", marginTop: "14px", marginLeft: "-18px", marginRight: "-18px", paddingLeft: "18px", paddingRight: "18px", backgroundColor: "#f3f4f6" }}>
                  <span className="text-base font-bold text-black" style={{ fontSize: "16px", fontWeight: 700 }}>GENEL TOPLAM:</span>
                  <span className="text-base font-bold text-black" style={{ fontSize: "16px", fontWeight: 700 }}>
                    {CURRENCY_SYMBOLS[quote.currency as Currency] || quote.currency}{(totals.grandTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between items-end text-[10px] text-gray-600 relative z-10" style={{ fontSize: "10px", lineHeight: "1.2" }}>
              <div className="space-y-[1px]">
                <p className="font-semibold text-black" style={{ fontWeight: 600, fontSize: "9px" }}>Revium Ltd. Şti.</p>
                <p style={{ fontSize: "10px" }}>Fevzi Çakmak Mah. Milenyum Cad.</p>
                <p style={{ fontSize: "10px" }}>No:81 Karatay/KONYA</p>
                <p style={{ fontSize: "10px" }}>info@reviumtech.com | www.reviumtech.com</p>
              </div>
              <div className="flex items-center gap-2">
                <img src={logo} alt="REVIUM" className="h-8 w-8 object-contain" />
                <span className="text-base font-bold text-black" style={{ fontSize: "14px", fontWeight: 700 }}>REVIUM</span>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleDownload} 
              size="lg"
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 text-white font-semibold"
            >
              <Download className="h-5 w-5 mr-2" />
              PDF Olarak İndir
            </Button>
          </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

