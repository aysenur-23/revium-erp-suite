import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getOrders, Order } from "@/services/firebase/orderService";
import { Download, FileBarChart, CheckCircle2, Clock, AlertCircle, TrendingUp, Calendar } from "lucide-react";
import { generateProductionReportPDF } from "@/services/pdfGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Timestamp } from "firebase/firestore";

interface ProductionReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ProductionStatus = "planned" | "in_production" | "quality_check" | "completed" | "on_hold";

type StatusDistribution = Record<ProductionStatus, number>;

interface ProductProductionStat {
  name: string;
  quantity: number;
  orders: number;
}

interface ProductionReportData {
  totalOrders: number;
  completed: number;
  completionRate: number;
  statusDistribution: StatusDistribution;
  topProducts: ProductProductionStat[];
}

export const ProductionReportDialog = ({ open, onOpenChange }: ProductionReportDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState<ProductionReportData | null>(null);

  const COLORS = {
    planned: "hsl(var(--primary))",
    in_production: "hsl(var(--warning))",
    quality_check: "hsl(var(--accent))",
    completed: "hsl(var(--success))",
    on_hold: "hsl(var(--muted))"
  };

  const STATUS_LABELS: Record<ProductionStatus, string> = {
    planned: "Planlandı",
    in_production: "Üretimde",
    quality_check: "Kalite Kontrol",
    completed: "Tamamlandı",
    on_hold: "Beklemede"
  };

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

  const getOrderQuantity = (order: Order & { quantity?: number }): number => {
    if (typeof order.quantity === "number") {
      return order.quantity;
    }
    if (order.itemsCount) {
      return order.itemsCount;
    }
    if (order.totalQuantity) {
      return order.totalQuantity;
    }
    return 0;
  };

  const normalizeStatus = (status?: Order["status"]): ProductionStatus | null => {
    if (!status) return null;
    if (["planned", "in_production", "quality_check", "completed", "on_hold"].includes(status)) {
      return status as ProductionStatus;
    }
    return null;
  };

  const fetchReportData = useCallback(async () => {
    if (!startDate || !endDate) {
      setReportData(null);
      return;
    }

    setLoading(true);
    try {
      // Firebase'den production orders'ı al
      const allOrders = await getOrders();
      
      // Tarih filtresi uygula
      const orders = allOrders.filter((order) => {
        const orderDate = getOrderDate(order);
        const orderDateStr = orderDate.toISOString().split("T")[0];
        return orderDateStr >= startDate && orderDateStr <= endDate;
      });

      const totalOrders = orders?.length || 0;
      const completed = orders?.filter(o => o.status === "completed").length || 0;
      const completionRate = totalOrders > 0 ? (completed / totalOrders) * 100 : 0;

      // Durum dağılımı
      const statusDistribution: StatusDistribution = {
        planned: 0,
        in_production: 0,
        quality_check: 0,
        completed: 0,
        on_hold: 0,
      };
      orders?.forEach((order) => {
        const normalized = normalizeStatus(order.status);
        if (normalized) {
          statusDistribution[normalized] += 1;
        }
      });

      // Ürün bazlı üretim
      const productMap = new Map<string, ProductProductionStat>();
      orders?.forEach((order) => {
        const name = (order as any).product_name || order.customerName || "Bilinmeyen";
        if (!productMap.has(name)) {
          productMap.set(name, { name, quantity: 0, orders: 0 });
        }
        const prod = productMap.get(name);
        if (!prod) {
          return;
        }
        prod.quantity += getOrderQuantity(order);
        prod.orders += 1;
      });

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      const data: ProductionReportData = {
        totalOrders,
        completed,
        completionRate,
        statusDistribution,
        topProducts
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
      // PDF oluştur - await ile bekle
      const pdfBlob = await generateProductionReportPDF(reportData, startDate, endDate);
      
      // PDF'i hemen indir (Drive upload'ını beklemeden)
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      const reportDate = new Date().toISOString().split('T')[0];
      a.download = `Uretim-Raporu-${startDate}-${endDate}-${reportDate}.pdf`;
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
          const reportTitle = `Üretim Raporu - ${startDate} / ${endDate}`;
          await saveReport("production", reportTitle, pdfBlob, user?.id || "", {
            startDate,
            endDate,
            metadata: { totalOrders: reportData.totalOrders, statusDistribution: reportData.statusDistribution },
          });
          toast.success("Rapor buluta yedeklendi.");
        } catch (error) {
          console.warn("Rapor buluta kaydedilemedi (CORS/Yetki):", error);
        }
      })();

    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("Hata: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[98vw] md:max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b bg-gradient-to-r from-blue-500/5 to-transparent flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileBarChart className="h-4 w-4 text-blue-600" />
            </div>
            Üretim Raporu Oluştur
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tarih aralığı seçerek detaylı üretim raporu oluşturun ve PDF olarak indirin
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="w-full p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Tarih Seçimi - Profesyonel Tasarım */}
          <Card className="bg-gradient-to-br from-gray-50/50 to-white border-2">
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
                <Card className="bg-gradient-to-br from-blue-50 via-white to-white border-blue-200 hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <FileBarChart className="h-4 w-4 text-blue-500" />
                      Toplam Sipariş
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">{reportData.totalOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">Tarih aralığında</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 via-white to-white border-green-200 hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Tamamlanan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">{reportData.completed}</p>
                    <p className="text-xs text-muted-foreground mt-1">Başarıyla tamamlandı</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-primary/10 via-white to-white border-primary/20 hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Tamamlanma Oranı
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">{reportData.completionRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Başarı oranı</p>
                  </CardContent>
                </Card>
              </div>

              {/* Durum Dağılımı Tablosu */}
              <Card className="border-2 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary"></div>
                    Durum Dağılımı
                  </CardTitle>
                  </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="font-semibold">Durum</TableHead>
                          <TableHead className="text-right font-semibold">Sipariş Sayısı</TableHead>
                          <TableHead className="text-right font-semibold">Oran</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(reportData.statusDistribution)
                          .filter(([_, value]) => value > 0)
                          .sort((a, b) => b[1] - a[1])
                          .map(([key, value]) => {
                            const percentage = reportData.totalOrders > 0 ? ((value / reportData.totalOrders) * 100).toFixed(1) : "0";
                            return (
                              <TableRow key={key} className="hover:bg-gray-50/50 transition-colors">
                                <TableCell className="font-medium">{STATUS_LABELS[key as ProductionStatus]}</TableCell>
                                <TableCell className="text-right font-semibold">{value}</TableCell>
                                <TableCell className="text-right font-semibold text-muted-foreground">{percentage}%</TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                  </CardContent>
                </Card>

              {/* En Çok Üretilen Ürünler Tablosu */}
              <Card className="border-2 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary"></div>
                    En Çok Üretilen Ürünler
                  </CardTitle>
                  </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="font-semibold">Sıra</TableHead>
                          <TableHead className="font-semibold">Ürün Adı</TableHead>
                          <TableHead className="text-right font-semibold">Miktar</TableHead>
                          <TableHead className="text-right font-semibold">Sipariş Sayısı</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.topProducts.slice(0, 10).map((product, index) => (
                          <TableRow key={index} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="font-medium text-muted-foreground">#{index + 1}</TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right font-semibold">{product.quantity}</TableCell>
                            <TableCell className="text-right font-semibold text-primary">{product.orders}</TableCell>
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
        </ScrollArea>
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
