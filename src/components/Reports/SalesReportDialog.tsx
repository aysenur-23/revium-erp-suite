import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getOrders, getOrderItems, Order, OrderItem } from "@/services/firebase/orderService";
import { Download, TrendingUp, Package, Users, Calendar, Clock } from "lucide-react";
// pdfGenerator will be dynamically imported when needed
import { useAuth } from "@/contexts/AuthContext";
import { Timestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface SalesReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SalesReportDialog = ({ open, onOpenChange }: SalesReportDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState<SalesReportData | null>(null);

  interface TopProduct {
    name: string;
    quantity: number;
    revenue: number;
  }

  interface SalesReportData {
    totalRevenue: number;
    totalOrders: number;
    activeCustomers: number;
    orders: Order[];
    topProducts: TopProduct[];
    avgOrderValue: number;
  }

  const getOrderDate = (order: Order): Date => {
    if (order.createdAt instanceof Timestamp) {
      return order.createdAt.toDate();
    }
    if (order.created_at) {
      const parsed = new Date(order.created_at);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  };

  const getOrderTotal = (order: Order & { total?: number }): number => {
    return order.total ?? order.totalAmount ?? order.total_amount ?? order.subtotal ?? 0;
  };

  const getItemQuantity = (item: OrderItem & { quantity?: number }): number => {
    return item.quantity ?? 0;
  };

  const getItemRevenue = (item: OrderItem & { unit_price?: number; total?: number }): number => {
    if (typeof item.total === "number") {
      return item.total;
    }
    const unitPrice = item.unit_price ?? item.unitPrice ?? 0;
    return unitPrice * getItemQuantity(item);
  };

  const fetchReportData = useCallback(async () => {
    if (!startDate || !endDate) {
      setReportData(null);
      return;
    }

    setLoading(true);
    try {
      // Firebase'den siparişleri al
      const orders = await getOrders();
      
      // Tarih filtresi uygula
      const filteredOrders = orders.filter((order) => {
        const orderDate = getOrderDate(order);
        const orderDateStr = orderDate.toISOString().split("T")[0];
        return orderDateStr >= startDate && orderDateStr <= endDate;
      });

      // Rapor verilerini hesapla
      const totalRevenue = filteredOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
      const totalOrders = filteredOrders.length;
      const activeCustomers = new Set(filteredOrders.map((o) => o.customerId).filter(Boolean)).size;

      // En çok satan ürünler
      const productMap = new Map<string, TopProduct>();
      const orderItemsPromises = filteredOrders.map(async (order) => {
        try {
          return await getOrderItems(order.id);
        } catch (err) {
          console.error("Get order items error:", err);
          return [];
        }
      });
      
      const allOrderItems = await Promise.all(orderItemsPromises);
      allOrderItems.flat().forEach((item) => {
        const productName = (item as OrderItem & { product_name?: string }).product_name || item.productName || "Bilinmeyen";
        if (!productMap.has(productName)) {
          productMap.set(productName, { name: productName, quantity: 0, revenue: 0 });
        }
        const prod = productMap.get(productName);
        if (!prod) return;
        prod.quantity += getItemQuantity(item);
        prod.revenue += getItemRevenue(item);
      });

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const data: SalesReportData = {
        totalRevenue,
        totalOrders,
        activeCustomers,
        orders: filteredOrders,
        topProducts,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      };

      setReportData(data);
    } catch (error) {
      console.error("Fetch report data error:", error);
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Tarih değiştiğinde otomatik veri güncelleme
  useEffect(() => {
    if (startDate && endDate) {
      const timeoutId = setTimeout(() => {
        fetchReportData();
      }, 500); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [startDate, endDate, fetchReportData]);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Lütfen tarih aralığı seçin");
      return;
    }

    if (!reportData) {
      toast.error("Lütfen önce rapor verilerini yükleyin");
      return;
    }

    setLoading(true);
    try {
      // Dynamically import pdfGenerator to avoid loading it on initial page load
      const { generateSalesReportPDF } = await import("@/services/pdfGenerator");
      // Generate PDF - await ile bekle
      const pdfBlob = await generateSalesReportPDF(reportData, startDate, endDate);
      
      // PDF'i hemen indir (Drive upload'ını beklemeden)
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      const reportDate = new Date().toISOString().split('T')[0];
      a.download = `Satis-Raporu-${startDate}-${endDate}-${reportDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // URL'yi hemen temizle (indirme başladıktan sonra)
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast.success("Rapor indiriliyor...");
      
      // Loading'i kapat (indirme başladı, Drive upload arka planda devam edecek)
      setLoading(false);

      // PDF'i Storage'a kaydet (Arka planda, kullanıcıyı bekletmeden)
      // Promise'i await etmeden başlat - arka planda çalışsın
      (async () => {
        try {
          const { saveReport } = await import("@/services/firebase/reportService");
          const reportTitle = `Satış Raporu - ${startDate} / ${endDate}`;
          await saveReport("sales", reportTitle, pdfBlob, user?.id || "", {
            startDate,
            endDate,
            metadata: { totalRevenue: reportData.totalRevenue, totalOrders: reportData.totalOrders, activeCustomers: reportData.activeCustomers },
          });
          toast.success("Rapor buluta yedeklendi.");
        } catch (error) {
          console.warn("Rapor buluta kaydedilemedi (CORS/Yetki):", error);
        }
      })();

    } catch (error) {
      console.error("Generate sales report error:", error);
      const message = error instanceof Error ? error.message : "Rapor oluşturulamadı";
      toast.error("Hata: " + message);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[80vw] md:max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
        <DialogTitle className="sr-only">Satış Raporu Oluştur</DialogTitle>
        <DialogDescription className="sr-only">Tarih aralığı seçerek detaylı satış raporu oluşturun ve PDF olarak indirin</DialogDescription>
        
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b bg-[rgb(255,255,255)] flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download className="h-4 w-4 text-primary" />
            </div>
            Satış Raporu Oluştur
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tarih aralığı seçerek detaylı satış raporu oluşturun ve PDF olarak indirin
          </p>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -webkit-overflow-scrolling-touch overscroll-behavior-contain">
          <div className="w-full p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Tarih Seçimi - Profesyonel Tasarım */}
          <Card className="bg-[rgb(249,250,251)] border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Tarih Aralığı Seçimi</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Hızlı Tarih Seçenekleri */}
              <div className="mb-4">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Hızlı Seçim</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const start = new Date(today);
                      start.setDate(today.getDate() - 7);
                      setStartDate(start.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="text-xs"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Son 7 Gün
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const start = new Date(today);
                      start.setDate(today.getDate() - 30);
                      setStartDate(start.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="text-xs"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Son 30 Gün
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const start = new Date(today.getFullYear(), today.getMonth(), 1);
                      setStartDate(start.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="text-xs"
                  >
                    Bu Ay
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                      const end = new Date(today.getFullYear(), today.getMonth(), 0);
                      setStartDate(start.toISOString().split('T')[0]);
                      setEndDate(end.toISOString().split('T')[0]);
                    }}
                    className="text-xs"
                  >
                    Geçen Ay
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const start = new Date(today.getFullYear(), 0, 1);
                      setStartDate(start.toISOString().split('T')[0]);
                      setEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="text-xs"
                  >
                    Bu Yıl
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
                  <Label className="text-sm font-medium">Başlangıç Tarihi</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-2 focus:border-primary"
                  />
          </div>
          <div className="space-y-2">
                  <Label className="text-sm font-medium">Bitiş Tarihi</Label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-2 focus:border-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rapor Önizleme - Profesyonel Tasarım */}
          {reportData && (
            <div className="space-y-6 border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  Rapor Önizlemesi
                </h3>
                <Badge variant="outline" className="text-xs">
                  {startDate} - {endDate}
                </Badge>
              </div>
              {/* İstatistik Kartları - Profesyonel ve Sade */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-[rgb(255,255,255)] border-[rgb(221,83,53)] border-2" style={{ backgroundColor: 'rgba(221, 83, 53, 0.05)' }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Toplam Gelir
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">₺{reportData.totalRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ortalama: ₺{reportData.avgOrderValue.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </CardContent>
                </Card>
                <Card className="bg-[rgb(239,246,255)] border-[rgb(191,219,254)] border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      Toplam Sipariş
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">{reportData.totalOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">Tarih aralığında</p>
                  </CardContent>
                </Card>
                <Card className="bg-[rgb(240,253,244)] border-[rgb(187,247,208)] border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-500" />
                      Aktif Müşteri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">{reportData.activeCustomers}</p>
                    <p className="text-xs text-muted-foreground mt-1">Sipariş veren müşteri</p>
                  </CardContent>
                </Card>
              </div>

              {/* Sipariş Durumu Dağılımı */}
              <Card className="border-2 shadow-sm">
                <CardHeader className="bg-[rgb(249,250,251)] border-b">
                  <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary"></div>
                    Sipariş Durumu Dağılımı
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="font-semibold">Durum</TableHead>
                          <TableHead className="text-right font-semibold">Sipariş Sayısı</TableHead>
                          <TableHead className="text-right font-semibold">Toplam Tutar</TableHead>
                          <TableHead className="text-right font-semibold">Oran</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const statusMap = new Map<string, { count: number; total: number }>();
                          reportData.orders.forEach((order) => {
                            const status = order.status || "Bilinmeyen";
                            const total = getOrderTotal(order);
                            if (!statusMap.has(status)) {
                              statusMap.set(status, { count: 0, total: 0 });
                            }
                            const stat = statusMap.get(status)!;
                            stat.count += 1;
                            stat.total += total;
                          });
                          const statusLabels: Record<string, string> = {
                            draft: "Taslak",
                            pending: "Beklemede",
                            confirmed: "Onaylandı",
                            planned: "Planlandı",
                            in_production: "Üretimde",
                            in_progress: "Üretimde",
                            quality_check: "Kalite Kontrol",
                            on_hold: "Beklemede",
                            completed: "Tamamlandı",
                            shipped: "Kargoda",
                            delivered: "Teslim Edildi",
                            cancelled: "İptal",
                          };
                          const totalOrders = reportData.orders.length;
                          return Array.from(statusMap.entries())
                            .sort((a, b) => b[1].count - a[1].count)
                            .map(([status, data]) => (
                              <TableRow key={status} className="hover:bg-gray-50/50 transition-colors">
                                <TableCell className="font-medium">{statusLabels[status] || status}</TableCell>
                                <TableCell className="text-right font-semibold">{data.count}</TableCell>
                                <TableCell className="text-right font-semibold text-primary">₺{data.total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-right font-semibold text-muted-foreground">{totalOrders > 0 ? ((data.count / totalOrders) * 100).toFixed(1) : 0}%</TableCell>
                              </TableRow>
                            ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Ürün Tablosu - Profesyonel Tasarım */}
              <Card className="border-2 shadow-sm">
                <CardHeader className="bg-[rgb(249,250,251)] border-b">
                  <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary"></div>
                    En Çok Satan Ürünler
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="font-semibold">Sıra</TableHead>
                          <TableHead className="font-semibold">Ürün Adı</TableHead>
                          <TableHead className="text-right font-semibold">Adet</TableHead>
                          <TableHead className="text-right font-semibold">Gelir</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.topProducts.slice(0, 10).map((product, index) => (
                          <TableRow key={index} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-medium text-muted-foreground">#{index + 1}</TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right font-semibold">{product.quantity}</TableCell>
                            <TableCell className="text-right font-semibold text-primary">₺{product.revenue.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {loading && !reportData && (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-medium text-muted-foreground">Veriler yükleniyor...</p>
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
        <div className="flex-shrink-0 px-4 sm:px-6 pb-4 sm:pb-6 pt-4 border-t">
          <Button 
            onClick={generateReport} 
            disabled={loading || !reportData} 
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg"
          >
            <Download className="mr-2 h-4 w-4" />
            {loading ? "PDF Oluşturuluyor..." : reportData ? "PDF İndir" : "Tarih Aralığı Seçin"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
