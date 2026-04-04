import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getCustomers, Customer } from "@/services/firebase/customerService";
import { getOrders, Order } from "@/services/firebase/orderService";
import { Download, Users, UserPlus, TrendingUp, Calendar, Clock } from "lucide-react";
// pdfGenerator will be dynamically imported when needed
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Timestamp } from "firebase/firestore";

interface CustomerReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomerReportDialog = ({ open, onOpenChange }: CustomerReportDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState<CustomerReportData | null>(null);

  const SEGMENT_COLORS = ["hsl(var(--success))", "hsl(var(--primary))", "hsl(var(--muted))"];

  interface CustomerWithOrders extends Customer {
    orders: Order[];
  }

  interface CustomerStat {
    name: string;
    orders: number;
    total: number;
  }

  interface CustomerReportData {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    topCustomers: CustomerStat[];
    segments: {
      high: number;
      medium: number;
      low: number;
    };
  }

  const getOrderDate = (order: Order): Date => {
    if (order.createdAt instanceof Timestamp) {
      return order.createdAt.toDate();
    }
    if (order.created_at) {
      const date = new Date(order.created_at);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
    return new Date();
  };

  const isDateInRange = (date: Date | string, start: string, end: string): boolean => {
    const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0];
    return dateStr >= start && dateStr <= end;
  };

  const getOrderTotal = (order: Order & { total?: number }): number => {
    return order.total ?? order.totalAmount ?? order.total_amount ?? order.subtotal ?? 0;
  };

  const fetchReportData = useCallback(async () => {
    if (!startDate || !endDate) {
      setReportData(null);
      return;
    }

    setLoading(true);
    try {
      // Firebase'den müşterileri ve siparişleri al
      const [allCustomers, allOrders] = await Promise.all([
        getCustomers(),
        getOrders(),
      ]);
      
      // Tarih filtresi uygula
      const filteredOrders = allOrders.filter((order) => {
        const orderDate = getOrderDate(order);
        const orderDateStr = orderDate.toISOString().split("T")[0];
        return orderDateStr >= startDate && orderDateStr <= endDate;
      });
      
      // Fetch orders for each customer
      const customersWithOrders: CustomerWithOrders[] = allCustomers.map((customer) => {
        const customerOrders = filteredOrders.filter(
          (order) => order.customerId === customer.id || order.customer_id === customer.id
        );
        return { ...customer, orders: customerOrders };
      });

      const totalCustomers = customersWithOrders?.length || 0;
      const newCustomers =
        customersWithOrders?.filter((customer) => {
          if (!customer.createdAt) return false;
          const createdDate = customer.createdAt.toDate().toISOString().split("T")[0];
          return createdDate >= startDate && createdDate <= endDate;
        }).length || 0;

      // Aktif müşteriler (tarih aralığında sipariş verenler)
      const activeCustomers =
        customersWithOrders?.filter((customer) =>
          customer.orders?.some((order) => {
            const orderDate = order.order_date || order.created_at || getOrderDate(order).toISOString().split("T")[0];
            return isDateInRange(orderDate, startDate, endDate);
          })
        ).length || 0;

      // En değerli müşteriler
      const customerStats: CustomerStat[] =
        customersWithOrders?.map((customer) => {
          const ordersInRange =
            customer.orders?.filter((order) => {
              const orderDate = order.order_date || order.created_at || getOrderDate(order).toISOString().split("T")[0];
              return isDateInRange(orderDate, startDate, endDate);
            }) || [];
          const total = ordersInRange.reduce((sum, order) => sum + getOrderTotal(order), 0);
          return {
            name: customer.name ?? customer.company ?? "Bilinmeyen",
            orders: ordersInRange.length,
            total,
          };
        }) || [];

      const topCustomers = customerStats
        .filter(c => c.orders > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Müşteri segmentasyonu
      const segments = {
        high: customerStats.filter(c => c.total > 50000).length,
        medium: customerStats.filter(c => c.total >= 10000 && c.total <= 50000).length,
        low: customerStats.filter(c => c.total < 10000 && c.total > 0).length
      };

      const data: CustomerReportData = {
        totalCustomers,
        activeCustomers,
        newCustomers,
        topCustomers,
        segments
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
      const { generateCustomerReportPDF } = await import("@/services/pdfGenerator");
      // PDF oluştur - await ile bekle
      const pdfBlob = await generateCustomerReportPDF(reportData, startDate, endDate);
      
      // PDF'i hemen indir (Drive upload'ını beklemeden)
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      const reportDate = new Date().toISOString().split('T')[0];
      a.download = `Musteri-Raporu-${startDate}-${endDate}-${reportDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast.success("Rapor indiriliyor...");
      
      // Loading'i kapat (indirme başladı, Drive upload arka planda devam edecek)
      setLoading(false);

      // PDF'i Storage'a kaydet (Arka planda, kullanıcıyı bekletmeden)
      (async () => {
        try {
          const { saveReport } = await import("@/services/firebase/reportService");
          const reportTitle = `Müşteri Raporu - ${startDate} / ${endDate}`;
          await saveReport("customer", reportTitle, pdfBlob, user?.id || "", {
            startDate,
            endDate,
            metadata: { totalCustomers: reportData.totalCustomers, activeCustomers: reportData.activeCustomers },
          });
          toast.success("Rapor buluta yedeklendi.");
        } catch (error) {
          console.warn("Rapor buluta kaydedilemedi (CORS/Yetki):", error);
        }
      })();

    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Hata: " + message);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[98vw] md:max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
        <DialogTitle className="sr-only">Müşteri Raporu Oluştur</DialogTitle>
        <DialogDescription className="sr-only">Tarih aralığı seçerek detaylı müşteri raporu oluşturun ve PDF olarak indirin</DialogDescription>
        
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b bg-[rgb(255,255,255)] flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            Müşteri Raporu Oluştur
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tarih aralığı seçerek detaylı müşteri raporu oluşturun ve PDF olarak indirin
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
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-[rgb(250,245,255)] border-[rgb(233,213,255)] border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" />
                      Toplam Müşteri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-purple-600">{reportData.totalCustomers}</p>
                    <p className="text-xs text-muted-foreground mt-1">Tüm müşteriler</p>
                  </CardContent>
                </Card>
                <Card className="bg-[rgb(240,253,244)] border-[rgb(187,247,208)] border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Aktif Müşteri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">{reportData.activeCustomers}</p>
                    <p className="text-xs text-muted-foreground mt-1">Sipariş veren müşteri</p>
                  </CardContent>
                </Card>
                <Card className="bg-[rgb(239,246,255)] border-[rgb(191,219,254)] border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-blue-500" />
                      Yeni Müşteri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">{reportData.newCustomers}</p>
                    <p className="text-xs text-muted-foreground mt-1">Tarih aralığında</p>
                  </CardContent>
                </Card>
              </div>

              {/* Müşteri Segmentasyonu Tablosu */}
              <Card className="border-2 shadow-sm">
                <CardHeader className="bg-[rgb(249,250,251)] border-b">
                  <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary"></div>
                    Müşteri Segmentasyonu
                  </CardTitle>
                  </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="font-semibold">Segment</TableHead>
                          <TableHead className="text-right font-semibold">Müşteri Sayısı</TableHead>
                          <TableHead className="text-right font-semibold">Oran</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const total = reportData.segments.high + reportData.segments.medium + reportData.segments.low;
                          const segments = [
                            { label: "Yüksek Değerli (>₺50K)", value: reportData.segments.high },
                            { label: "Orta Değerli (₺10K-₺50K)", value: reportData.segments.medium },
                            { label: "Düşük Değerli (<₺10K)", value: reportData.segments.low }
                          ];
                          return segments.map((segment, index) => {
                            const percentage = total > 0 ? ((segment.value / total) * 100).toFixed(1) : "0";
                            return (
                              <TableRow key={index} className="hover:bg-gray-50/50 transition-colors">
                                <TableCell className="font-medium">{segment.label}</TableCell>
                                <TableCell className="text-right font-semibold">{segment.value}</TableCell>
                                <TableCell className="text-right font-semibold text-muted-foreground">{percentage}%</TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                  </CardContent>
                </Card>

              {/* En Değerli Müşteriler Tablosu */}
              <Card className="border-2 shadow-sm">
                <CardHeader className="bg-[rgb(249,250,251)] border-b">
                  <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary"></div>
                    En Değerli Müşteriler
                  </CardTitle>
                  </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="font-semibold">Sıra</TableHead>
                          <TableHead className="font-semibold">Müşteri</TableHead>
                          <TableHead className="text-right font-semibold">Sipariş Sayısı</TableHead>
                          <TableHead className="text-right font-semibold">Toplam Harcama</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.topCustomers.slice(0, 10).map((customer, index) => (
                          <TableRow key={index} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-medium text-muted-foreground">#{index + 1}</TableCell>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell className="text-right font-semibold">{customer.orders}</TableCell>
                            <TableCell className="text-right font-semibold text-primary">₺{customer.total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  </CardContent>
                </Card>
            </div>
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
