import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getOrders, getOrderItems, Order, OrderItem } from "@/services/firebase/orderService";
import { Download, DollarSign, TrendingUp, ArrowDown, ArrowUp, Percent, Calendar, Clock } from "lucide-react";
// pdfGenerator will be dynamically imported when needed
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Timestamp } from "firebase/firestore";
import { convertToTRY } from "@/services/exchangeRateService";
import { getRawMaterials } from "@/services/firebase/materialService";

type FinancialOrderItem = OrderItem & {
  cost?: number;
  total?: number;
  currency?: string;
  raw_material_id?: string;
};

type OrderWithItems = Order & {
  total?: number;
  order_items: FinancialOrderItem[];
};

type MonthlyTrendPoint = {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
};

type ProductProfitabilityPoint = {
  name: string;
  revenue: number;
  cost: number;
  profit: number;
};

type CostBreakdownItem = {
  category: string;
  amount: number;
  percentage: number;
};

interface FinancialReportData {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  monthlyTrend: MonthlyTrendPoint[];
  topProfitableProducts: ProductProfitabilityPoint[];
  costBreakdown?: CostBreakdownItem[];
}

interface FinancialReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FinancialReportDialog = ({ open, onOpenChange }: FinancialReportDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState<FinancialReportData | null>(null);

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

  const getOrderMonth = (order: Order): string => {
    if (order.order_date) {
      return new Date(order.order_date).toISOString().slice(0, 7);
    }
    if (order.created_at) {
      return new Date(order.created_at).toISOString().slice(0, 7);
    }
    const created = getOrderDate(order);
    return created.toISOString().slice(0, 7);
  };

  const getOrderTotal = (order: Order & { total?: number }): number => {
    return (
      order.total ??
      order.totalAmount ??
      order.total_amount ??
      order.subtotal ??
      0
    );
  };

  const getItemCost = (item: FinancialOrderItem): number => {
    return item.cost ?? item.unit_price ?? item.unitPrice ?? 0;
  };

  const fetchReportData = useCallback(async () => {
    if (!startDate || !endDate) {
      setReportData(null);
      return;
    }

    setLoading(true);
    try {
      // Firebase'den siparişleri al
      const allOrders = await getOrders();
      
      // Tarih filtresi uygula
      const filteredOrders = allOrders.filter((order) => {
        const orderDate = getOrderDate(order);
        const orderDateStr = orderDate.toISOString().split("T")[0];
        return orderDateStr >= startDate && orderDateStr <= endDate;
      });
      
      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        filteredOrders.map(async (order): Promise<OrderWithItems> => {
          try {
            const items = await getOrderItems(order.id);
            return { ...order, order_items: items as FinancialOrderItem[] };
          } catch (err) {
            console.error("Get order items error:", err);
            return { ...order, order_items: [] };
          }
        })
      );

      // Gelir hesaplama
      const totalRevenue =
        ordersWithItems?.reduce((sum, currentOrder) => sum + getOrderTotal(currentOrder), 0) || 0;
      
      // Gider hesaplama (ürün maliyeti × miktar)
      // Hammadde maliyetlerini de dahil et ve exchange rate ile çevir
      const rawMaterials = await getRawMaterials();
      const materialMap = new Map(rawMaterials.map(m => [m.id, m]));
      
      let totalCost = 0;
      const costPromises = ordersWithItems?.flatMap((order) =>
        order.order_items?.map(async (item) => {
          const itemCost = getItemCost(item);
          let costInTRY = itemCost;
          
          // Eğer item'da para birimi bilgisi varsa ve TRY değilse çevir
          if (item.currency && item.currency !== 'TRY') {
            try {
              costInTRY = await convertToTRY(itemCost, item.currency);
            } catch (error) {
              console.warn(`Exchange rate conversion failed for ${item.currency}, using original value`);
            }
          }
          
          // Hammadde maliyetlerini de kontrol et
          if (item.raw_material_id && materialMap.has(item.raw_material_id)) {
            const material = materialMap.get(item.raw_material_id)!;
            if (material.unitPrice) {
              let materialCostInTRY = material.unitPrice;
              
              // Hammadde para birimini kontrol et
              if (material.currency && material.currency !== 'TRY') {
                try {
                  materialCostInTRY = await convertToTRY(material.unitPrice, material.currency);
                } catch (error) {
                  console.warn(`Exchange rate conversion failed for material ${material.currency}, using original value`);
                }
              }
              
              // Hammadde maliyetini ekle (miktar × birim fiyat)
              costInTRY += (materialCostInTRY * (item.quantity || 1));
            }
          }
          
          return costInTRY * item.quantity;
        }) || []
      ) || [];
      
      const costs = await Promise.all(costPromises);
      totalCost = costs.reduce((sum, cost) => sum + cost, 0);

      const grossProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // Aylık gelir-gider trendi
      const monthlyData = new Map<string, { revenue: number; cost: number }>();
      
      // Tüm siparişler için maliyetleri paralel hesapla
      const monthlyCostPromises = ordersWithItems?.map(async (order) => {
        const month = getOrderMonth(order);
        const orderTotal = getOrderTotal(order);
        
        // Exchange rate ile maliyetleri çevir
        const itemCostPromises = order.order_items?.map(async (item) => {
          const itemCost = getItemCost(item);
          let costInTRY = itemCost;
          
          if (item.currency && item.currency !== 'TRY') {
            try {
              costInTRY = await convertToTRY(itemCost, item.currency);
            } catch (error) {
              console.warn(`Exchange rate conversion failed, using original value`);
            }
          }
          
          return costInTRY * item.quantity;
        }) || [];
        
        const itemCosts = await Promise.all(itemCostPromises);
        const totalCost = itemCosts.reduce((sum, cost) => sum + cost, 0);
        
        return { month, revenue: orderTotal, cost: totalCost };
      }) || [];
      
      const monthlyResults = await Promise.all(monthlyCostPromises);
      
      monthlyResults.forEach(({ month, revenue, cost }) => {
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { revenue: 0, cost: 0 });
        }
        const data = monthlyData.get(month)!;
        data.revenue += revenue;
        data.cost += cost;
      });

      const monthlyTrend = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          cost: data.cost,
          profit: data.revenue - data.cost
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Ürün karlılığı
      const productProfitability = new Map<string, { name: string; revenue: number; cost: number }>();
      
      // Tüm item'lar için maliyetleri paralel hesapla
      const productCostPromises = ordersWithItems?.flatMap((order) =>
        order.order_items?.map(async (item) => {
          const productName = item.product_name || "Bilinmeyen";
          const itemCost = getItemCost(item);
          let costInTRY = itemCost;
          
          if (item.currency && item.currency !== 'TRY') {
            try {
              costInTRY = await convertToTRY(itemCost, item.currency);
            } catch (error) {
              console.warn(`Exchange rate conversion failed, using original value`);
            }
          }
          
          return {
            productName,
            revenue: item.total ?? 0,
            cost: costInTRY * item.quantity,
          };
        }) || []
      ) || [];
      
      const productResults = await Promise.all(productCostPromises);
      productResults.forEach(({ productName, revenue, cost }) => {
        if (!productProfitability.has(productName)) {
          productProfitability.set(productName, { name: productName, revenue: 0, cost: 0 });
        }
        const prod = productProfitability.get(productName)!;
        prod.revenue += revenue;
        prod.cost += cost;
      });

      const topProfitableProducts = Array.from(productProfitability.values())
        .map(p => ({ ...p, profit: p.revenue - p.cost }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);

      // Gider Kalemleri Analizi - Ürün bazında grupla
      const costBreakdownMap = new Map<string, number>();
      productResults.forEach(({ productName, cost }) => {
        if (!costBreakdownMap.has(productName)) {
          costBreakdownMap.set(productName, 0);
        }
        costBreakdownMap.set(productName, costBreakdownMap.get(productName)! + cost);
      });

      const costBreakdown: CostBreakdownItem[] = Array.from(costBreakdownMap.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalCost > 0 ? (amount / totalCost) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10); // En yüksek 10 gider kalemi

      const data: FinancialReportData = {
        totalRevenue,
        totalCost,
        grossProfit,
        profitMargin,
        monthlyTrend,
        topProfitableProducts,
        costBreakdown
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
      const { generateFinancialReportPDF } = await import("@/services/pdfGenerator");
      // PDF oluştur - await ile bekle
      const pdfBlob = await generateFinancialReportPDF(reportData, startDate, endDate);
      
      // PDF'i hemen indir (Drive upload'ını beklemeden)
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      const reportDate = new Date().toISOString().split('T')[0];
      a.download = `Mali-Rapor-${startDate}-${endDate}-${reportDate}.pdf`;
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
          const reportTitle = `Mali Rapor - ${startDate} / ${endDate}`;
          await saveReport("financial", reportTitle, pdfBlob, user?.id || "", {
            startDate,
            endDate,
            metadata: { totalRevenue: reportData.totalRevenue, grossProfit: reportData.grossProfit },
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
      <DialogContent className="w-full max-w-[80vw] md:max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
        <DialogTitle className="sr-only">Mali Rapor Oluştur</DialogTitle>
        <DialogDescription className="sr-only">Tarih aralığı seçerek detaylı mali rapor oluşturun ve PDF olarak indirin</DialogDescription>
        
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b bg-[rgb(255,255,255)] flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            Mali Rapor Oluştur
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tarih aralığı seçerek detaylı mali rapor oluşturun ve PDF olarak indirin
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
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-[rgb(240,253,244)] border-[rgb(187,247,208)] border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Toplam Gelir
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">₺{reportData.totalRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground mt-1">Toplam ciro</p>
                  </CardContent>
                </Card>
                <Card className="bg-[rgb(254,242,242)] border-[rgb(254,202,202)] border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <ArrowDown className="h-4 w-4 text-red-500" />
                      Toplam Gider
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600">₺{reportData.totalCost.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground mt-1">Toplam maliyet</p>
                  </CardContent>
                </Card>
                <Card className="bg-[rgb(236,253,245)] border-[rgb(167,243,208)] border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <ArrowUp className="h-4 w-4 text-emerald-500" />
                      Brüt Kar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-emerald-600">₺{reportData.grossProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground mt-1">Net kar</p>
                  </CardContent>
                </Card>
                <Card className="bg-[rgb(255,255,255)] border-[rgb(221,83,53)] border-2" style={{ backgroundColor: 'rgba(221, 83, 53, 0.05)' }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Percent className="h-4 w-4 text-primary" />
                      Kar Marjı
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">{reportData.profitMargin.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Karlılık oranı</p>
                  </CardContent>
                </Card>
              </div>

              {/* Aylık Trend Tablosu */}
              <Card className="border-2 shadow-sm">
                <CardHeader className="bg-[rgb(249,250,251)] border-b">
                  <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary"></div>
                    Aylık Gelir-Gider-Kar Trendi
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="font-semibold">Ay</TableHead>
                          <TableHead className="text-right font-semibold">Gelir</TableHead>
                          <TableHead className="text-right font-semibold">Gider</TableHead>
                          <TableHead className="text-right font-semibold">Kar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.monthlyTrend.map((item, index) => {
                          const [year, month] = item.month.split('-');
                          const monthLabels: Record<string, string> = {
                            '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
                            '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
                            '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
                          };
                          const monthLabel = monthLabels[month] || month;
                          return (
                            <TableRow key={index} className="hover:bg-gray-50/50 transition-colors">
                              <TableCell className="font-medium">{monthLabel} {year}</TableCell>
                              <TableCell className="text-right font-semibold text-green-600">₺{item.revenue.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">₺{item.cost.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right font-semibold text-emerald-600">₺{item.profit.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* En Karlı Ürünler Tablosu */}
              <Card className="border-2 shadow-sm">
                <CardHeader className="bg-[rgb(249,250,251)] border-b">
                  <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary"></div>
                    En Karlı Ürünler
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="font-semibold">Sıra</TableHead>
                          <TableHead className="font-semibold">Ürün</TableHead>
                          <TableHead className="text-right font-semibold">Gelir</TableHead>
                          <TableHead className="text-right font-semibold">Gider</TableHead>
                          <TableHead className="text-right font-semibold">Kar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.topProfitableProducts.slice(0, 10).map((product, index) => (
                          <TableRow key={index} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-medium text-muted-foreground">#{index + 1}</TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">₺{product.revenue.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right font-semibold text-red-600">₺{product.cost.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right font-semibold text-emerald-600">₺{product.profit.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Gider Kalemleri Analizi Tablosu - En Karlı Ürünler ile aynı yapı */}
              {reportData.costBreakdown && reportData.costBreakdown.length > 0 && (
                <Card className="border-2 shadow-sm">
                  <CardHeader className="bg-[rgb(249,250,251)] border-b">
                    <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary"></div>
                      Gider Kalemleri Analizi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/50">
                            <TableHead className="font-semibold">Sıra</TableHead>
                            <TableHead className="font-semibold">Gider Kalemi</TableHead>
                            <TableHead className="text-right font-semibold">Tutar</TableHead>
                            <TableHead className="text-right font-semibold">Oran</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.costBreakdown.map((item, index) => (
                            <TableRow key={index} className="hover:bg-gray-50/50 transition-colors">
                              <TableCell className="font-medium text-muted-foreground">#{index + 1}</TableCell>
                              <TableCell className="font-medium">{item.category}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">₺{item.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right font-semibold text-muted-foreground">{item.percentage.toFixed(1)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
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
