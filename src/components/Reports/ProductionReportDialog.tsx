import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getOrders, Order } from "@/services/firebase/orderService";
import { Download, FileBarChart, CheckCircle2, Clock, AlertCircle, TrendingUp, Calendar } from "lucide-react";
<<<<<<< HEAD

=======
// pdfGenerator will be dynamically imported when needed
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

=======
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
        const orderWithProduct = order as Order & { product_name?: string };
        const name = orderWithProduct.product_name || order.customerName || "Bilinmeyen";
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
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Fetch report data error:", error);
      }
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
<<<<<<< HEAD

      const { generateProductionReportPDF } = await import("@/services/pdf");
      // PDF oluştur - await ile bekle
      console.log("PDF oluşturuluyor...");
      const pdfBlob = await generateProductionReportPDF(reportData, startDate, endDate);
      console.log("PDF blob oluşturuldu:", pdfBlob, "Size:", pdfBlob?.size);

      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error("PDF blob boş veya geçersiz");
      }

      // PDF'i hemen indir (Drive upload'ını beklemeden)
      const url = URL.createObjectURL(pdfBlob);
      console.log("PDF URL oluşturuldu:", url);
=======
      // Dynamically import pdfGenerator to avoid loading it on initial page load
      const { generateProductionReportPDF } = await import("@/services/pdfGenerator");
      // PDF oluştur - await ile bekle
      const pdfBlob = await generateProductionReportPDF(reportData, startDate, endDate);
      
      // PDF'i hemen indir (Drive upload'ını beklemeden)
      const url = URL.createObjectURL(pdfBlob);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      const a = document.createElement("a");
      a.href = url;
      const reportDate = new Date().toISOString().split('T')[0];
      a.download = `Uretim-Raporu-${startDate}-${endDate}-${reportDate}.pdf`;
<<<<<<< HEAD
      console.log("İndirme başlatılıyor:", a.download);
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
<<<<<<< HEAD

      console.log("PDF indirme tamamlandı");
      toast.success("Rapor indiriliyor...");

=======
      
      toast.success("Rapor indiriliyor...");
      
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
        } catch (error: unknown) {
          if (import.meta.env.DEV) {
            console.warn("Rapor buluta kaydedilemedi (CORS/Yetki):", error);
          }
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
      <DialogContent className="sm:!max-w-[85vw] sm:!w-[85vw] sm:!h-[80vh] sm:!max-h-[80vh] sm:!left-[7.5vw] sm:!top-[10vh] sm:!translate-x-0 sm:!translate-y-0 flex flex-col p-0 overflow-hidden">
        {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
        <DialogTitle className="sr-only">Üretim Raporu Oluştur</DialogTitle>
        <DialogDescription className="sr-only">Tarih aralığı seçerek detaylı üretim raporu oluşturun ve PDF olarak indirin</DialogDescription>
<<<<<<< HEAD

        <DialogHeader className="px-3 pt-3 pb-2 border-b bg-[rgb(255,255,255)] flex-shrink-0 sticky top-0 z-[10001] shadow-sm">
=======
        
        <DialogHeader className="px-3 pt-3 pb-2 border-b bg-[rgb(255,255,255)] flex-shrink-0">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          <h2 className="text-[16px] sm:text-[18px] font-semibold flex items-center gap-2 leading-tight">
            <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileBarChart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
            </div>
            Üretim Raporu Oluştur
          </h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-snug">
            Tarih aralığı seçerek detaylı üretim raporu oluşturun ve PDF olarak indirin
          </p>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -webkit-overflow-scrolling-touch overscroll-behavior-contain">
          <div className="w-full p-2 space-y-2">
<<<<<<< HEAD
            {/* Tarih Seçimi - Profesyonel Tasarım */}
            <Card className="bg-[rgb(249,250,251)] border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] sm:text-[15px] font-semibold text-muted-foreground">Tarih Aralığı Seçimi</CardTitle>
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
                    <Label className="text-[11px] sm:text-xs font-medium">Başlangıç Tarihi</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border-2 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] sm:text-xs font-medium">Bitiş Tarihi</Label>
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
                    <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">Veriler yükleniyor...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {reportData && (
              <div className="space-y-6 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] sm:text-[14px] font-bold flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    Rapor Önizlemesi
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {startDate} - {endDate}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-[rgb(239,246,255)] border-[rgb(191,219,254)] border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-[14px] sm:text-[15px] font-semibold text-muted-foreground flex items-center gap-2">
                        <FileBarChart className="h-4 w-4 text-blue-500" />
                        Toplam Sipariş
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[11px] sm:text-xs font-bold text-blue-600">{reportData.totalOrders}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Tarih aralığında</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[rgb(240,253,244)] border-[rgb(187,247,208)] border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-[14px] sm:text-[15px] font-semibold text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Tamamlanan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[11px] sm:text-xs font-bold text-green-600">{reportData.completed}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Başarıyla tamamlandı</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-[rgb(255,255,255)] border-[rgb(221,83,53)] border-2" style={{ backgroundColor: 'rgba(221, 83, 53, 0.05)' }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-[14px] sm:text-[15px] font-semibold text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Tamamlanma Oranı
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[11px] sm:text-xs font-bold text-primary">{reportData.completionRate.toFixed(1)}%</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Başarı oranı</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Durum Dağılımı Tablosu */}
                <Card className="border-2 shadow-sm">
                  <CardHeader className="bg-[rgb(249,250,251)] border-b">
                    <CardTitle className="text-[13px] sm:text-[14px] font-semibold flex items-center gap-2">
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
                  <CardHeader className="bg-[rgb(249,250,251)] border-b">
                    <CardTitle className="text-[13px] sm:text-[14px] font-semibold flex items-center gap-2">
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
=======
          {/* Tarih Seçimi - Profesyonel Tasarım */}
          <Card className="bg-[rgb(249,250,251)] border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] sm:text-[15px] font-semibold text-muted-foreground">Tarih Aralığı Seçimi</CardTitle>
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
                  <Label className="text-[11px] sm:text-xs font-medium">Başlangıç Tarihi</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-2 focus:border-primary"
                  />
            </div>
            <div className="space-y-2">
                  <Label className="text-[11px] sm:text-xs font-medium">Bitiş Tarihi</Label>
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
                  <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">Veriler yükleniyor...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {reportData && (
            <div className="space-y-6 border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] sm:text-[14px] font-bold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  Rapor Önizlemesi
                </h3>
                <Badge variant="outline" className="text-xs">
                  {startDate} - {endDate}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-[rgb(239,246,255)] border-[rgb(191,219,254)] border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[14px] sm:text-[15px] font-semibold text-muted-foreground flex items-center gap-2">
                      <FileBarChart className="h-4 w-4 text-blue-500" />
                      Toplam Sipariş
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[11px] sm:text-xs font-bold text-blue-600">{reportData.totalOrders}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Tarih aralığında</p>
                  </CardContent>
                </Card>
                <Card className="bg-[rgb(240,253,244)] border-[rgb(187,247,208)] border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[14px] sm:text-[15px] font-semibold text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Tamamlanan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[11px] sm:text-xs font-bold text-green-600">{reportData.completed}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Başarıyla tamamlandı</p>
                  </CardContent>
                </Card>
                <Card className="bg-[rgb(255,255,255)] border-[rgb(221,83,53)] border-2" style={{ backgroundColor: 'rgba(221, 83, 53, 0.05)' }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[14px] sm:text-[15px] font-semibold text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Tamamlanma Oranı
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[11px] sm:text-xs font-bold text-primary">{reportData.completionRate.toFixed(1)}%</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Başarı oranı</p>
                  </CardContent>
                </Card>
              </div>

              {/* Durum Dağılımı Tablosu */}
              <Card className="border-2 shadow-sm">
                <CardHeader className="bg-[rgb(249,250,251)] border-b">
                  <CardTitle className="text-[13px] sm:text-[14px] font-semibold flex items-center gap-2">
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
                <CardHeader className="bg-[rgb(249,250,251)] border-b">
                  <CardTitle className="text-[13px] sm:text-[14px] font-semibold flex items-center gap-2">
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
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

          </div>
        </div>
        <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t bg-background relative z-50">
<<<<<<< HEAD
          <Button
            onClick={generateReport}
            disabled={loading || !reportData}
=======
          <Button 
            onClick={generateReport} 
            disabled={loading || !reportData} 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
