import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { BarChart3, TrendingUp, Package, DollarSign, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { convertToTRY } from "@/services/exchangeRateService";
import { CURRENCY_SYMBOLS, Currency } from "@/utils/currency";

interface DetailedValueReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  type: "rawMaterials" | "products" | "customers";
  data: Array<Record<string, unknown>>;
  orders?: Array<Record<string, unknown>>; // Customers için sipariş verisi
}

export const DetailedValueReportModal = ({ 
  open, 
  onOpenChange, 
  title, 
  type, 
  data,
  orders = []
}: DetailedValueReportModalProps) => {

  // useMemo async döndüremez, bu yüzden useEffect kullanıyoruz
  const [report, setReport] = useState<{
    totalValue: number;
    totalValueTRY: number;
    byCategory: Array<{ category: string; count: number; value: number; valueTRY: number }>;
    byCurrency: Array<{ currency: string; count: number; value: number; valueTRY: number }>;
    byStatus: Array<{ status: string; count: number; value: number; valueTRY: number }>;
    topItems: Array<{ name: string; value: number; valueTRY: number; stock: number; cost: number; currency?: string; category?: string }>;
    averageCost: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && ((type === "customers" && orders && orders.length > 0) || (type !== "customers" && data.length > 0))) {
      setLoading(true);
      const calculateReport = async () => {
        if (type === "customers") {
          // Customers için sipariş bazlı hesaplama
          if (!Array.isArray(orders) || orders.length === 0) {
            setReport({
              totalValue: 0,
              totalValueTRY: 0,
              byCategory: [],
              byCurrency: [],
              byStatus: [],
              topItems: [],
              averageCost: 0,
            });
            setLoading(false);
            return;
          }

          let totalValue = 0;
          let totalValueTRY = 0;
          const customerMap = new Map<string, { name: string; orderCount: number; totalAmount: number; totalAmountTRY: number }>();
          const currencyMap = new Map<string, { count: number; value: number; valueTRY: number }>();

          for (const order of orders) {
            const amount = Number(order.totalAmount) || 0;
            const currency = (order.currency as Currency) || "TRY";
            
            let amountTRY = amount;
            if (currency !== "TRY") {
              try {
                amountTRY = await convertToTRY(amount, currency);
              } catch {
                amountTRY = amount;
              }
            }

            totalValue += amount;
            totalValueTRY += amountTRY;

            const customerId = order.customerId || order.customer_id;
            if (customerId) {
              const customer = data.find((c): c is Record<string, unknown> & { id: string } => typeof c === 'object' && c !== null && 'id' in c && typeof c.id === 'string' && c.id === customerId);
              const customerName = customer?.name || "Bilinmeyen Müşteri";
              
              const custData = customerMap.get(customerId) || { name: customerName, orderCount: 0, totalAmount: 0, totalAmountTRY: 0 };
              custData.orderCount += 1;
              custData.totalAmount += amount;
              custData.totalAmountTRY += amountTRY;
              customerMap.set(customerId, custData);
            }

            const currData = currencyMap.get(currency) || { count: 0, value: 0, valueTRY: 0 };
            currData.count += 1;
            currData.value += amount;
            currData.valueTRY += amountTRY;
            currencyMap.set(currency, currData);
          }

          const byCategory = Array.from(customerMap.entries())
            .map(([customerId, data]) => ({
              category: data.name,
              count: data.orderCount,
              value: data.totalAmount,
              valueTRY: data.totalAmountTRY,
            }))
            .sort((a, b) => b.valueTRY - a.valueTRY)
            .slice(0, 10);

          const byCurrency = Array.from(currencyMap.entries())
            .map(([currency, data]) => ({
              currency,
              count: data.count,
              value: data.value,
              valueTRY: data.valueTRY,
            }))
            .sort((a, b) => b.valueTRY - a.valueTRY);

          const averageCost = orders.length > 0 
            ? orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0) / orders.length
            : 0;

          setReport({
            totalValue,
            totalValueTRY,
            byCategory,
            byCurrency,
            byStatus: [],
            topItems: byCategory.map(item => ({
              name: item.category,
              value: item.value,
              valueTRY: item.valueTRY,
              stock: item.count,
              cost: averageCost,
              currency: "TRY",
              category: "Müşteri",
            })),
            averageCost,
          });
          setLoading(false);
          return;
        }

        if (!Array.isArray(data) || data.length === 0) {
          setReport({
            totalValue: 0,
            totalValueTRY: 0,
            byCategory: [],
            byCurrency: [],
            byStatus: [],
            topItems: [],
            averageCost: 0,
          });
          setLoading(false);
          return;
        }

        let totalValue = 0;
        let totalValueTRY = 0;
        const categoryMap = new Map<string, { count: number; value: number; valueTRY: number }>();
        const currencyMap = new Map<string, { count: number; value: number; valueTRY: number }>();
        const statusMap = new Map<string, { count: number; value: number; valueTRY: number }>();
        const itemsWithValue: Array<{ name: string; value: number; valueTRY: number; stock: number; cost: number; currency?: string; category?: string }> = [];

        for (const item of data) {
          let stock = 0;
          let cost = 0;
          let currency: Currency = "TRY";
          let category = "Diğer";
          let value = 0;

          if (type === "rawMaterials") {
            stock = Number(item.currentStock !== undefined ? item.currentStock : item.stock) || 0;
            cost = Number(item.unitPrice !== undefined ? item.unitPrice : item.cost) || 0;
            currency = (item.currency as Currency) || "TRY";
            category = item.category || "Diğer";
            value = stock * cost;
          } else if (type === "products") {
            stock = Number(item.stock) || 0;
            cost = Number(item.price) || 0;
            currency = (item.currency as Currency) || "TRY";
            category = item.category || "Diğer";
            value = stock * cost;
          } else if (type === "customers") {
            // Customers için sipariş bazlı hesaplama yapılmalı, şimdilik basit bir yaklaşım
            // Bu kısım daha sonra geliştirilebilir
            continue;
          }
          
          let valueTRY = value;
          if (currency !== "TRY") {
            try {
              valueTRY = await convertToTRY(value, currency);
            } catch {
              valueTRY = value;
            }
          }

          totalValue += value;
          totalValueTRY += valueTRY;

          // Kategori bazında
          const catData = categoryMap.get(category) || { count: 0, value: 0, valueTRY: 0 };
          catData.count += 1;
          catData.value += value;
          catData.valueTRY += valueTRY;
          categoryMap.set(category, catData);

          // Para birimi bazında
          const currData = currencyMap.get(currency) || { count: 0, value: 0, valueTRY: 0 };
          currData.count += 1;
          currData.value += value;
          currData.valueTRY += valueTRY;
          currencyMap.set(currency, currData);

          // Stok durumuna göre
          const minStock = Number(item.minStock !== undefined ? item.minStock : item.min_stock) || 0;
          let status = "normal";
          if (stock === 0) status = "tükenen";
          else if (stock < minStock) status = "düşük";
          
          const statusData = statusMap.get(status) || { count: 0, value: 0, valueTRY: 0 };
          statusData.count += 1;
          statusData.value += value;
          statusData.valueTRY += valueTRY;
          statusMap.set(status, statusData);

          // En değerli hammaddeler
          itemsWithValue.push({
            name: item.name || "İsimsiz",
            value,
            valueTRY,
            stock,
            cost,
            currency,
            category,
          });
        }

        // Kategori bazında sırala
        const byCategory = Array.from(categoryMap.entries())
          .map(([category, data]) => ({
            category,
            count: data.count,
            value: data.value,
            valueTRY: data.valueTRY,
          }))
          .sort((a, b) => b.valueTRY - a.valueTRY);

        // Para birimi bazında sırala
        const byCurrency = Array.from(currencyMap.entries())
          .map(([currency, data]) => ({
            currency,
            count: data.count,
            value: data.value,
            valueTRY: data.valueTRY,
          }))
          .sort((a, b) => b.valueTRY - a.valueTRY);

        // Stok durumuna göre
        const byStatus = Array.from(statusMap.entries())
          .map(([status, data]) => ({
            status,
            count: data.count,
            value: data.value,
            valueTRY: data.valueTRY,
          }))
          .sort((a, b) => b.valueTRY - a.valueTRY);

        // En değerli hammaddeler (top 10)
        const topItems = itemsWithValue
          .sort((a, b) => b.valueTRY - a.valueTRY)
          .slice(0, 10);

        const averageCost = data.length > 0 
          ? data.reduce((sum, item) => sum + (Number(item.unitPrice !== undefined ? item.unitPrice : item.cost) || 0), 0) / data.length
          : 0;

        setReport({
          totalValue,
          totalValueTRY,
          byCategory,
          byCurrency,
          byStatus,
          topItems,
          averageCost,
        });
        setLoading(false);
      };
      calculateReport();
    } else {
      setReport(null);
      setLoading(false);
    }
  }, [open, data, orders, type]);

  const formatCurrency = (value: number, currency: string = "TRY") => {
    try {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${CURRENCY_SYMBOLS[currency as Currency] || "₺"}${value.toFixed(2)}`;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      normal: "Normal Stok",
      düşük: "Düşük Stok",
      tükenen: "Tükenen",
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    if (status === "normal") return CheckCircle2;
    if (status === "düşük") return AlertTriangle;
    return AlertCircle;
  };

  const getStatusColor = (status: string) => {
    if (status === "normal") return "bg-green-100 text-green-700";
    if (status === "düşük") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[80vw] sm:w-[80vw] max-h-[90vh] flex flex-col p-0 !overflow-hidden">
        <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detaylı değer raporu
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="w-full p-3 sm:p-4 space-y-4">

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : report ? (
            <>
              {/* Özet Kartlar */}
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Toplam Değer (TRY)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold break-words">{formatCurrency(report.totalValueTRY, "TRY")}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tüm para birimleri TRY'ye çevrildi
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Ortalama Birim Maliyet
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold break-words">{formatCurrency(report.averageCost, "TRY")}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tüm hammaddelerin ortalaması
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Toplam Kayıt
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl font-bold">{data.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Toplam hammadde sayısı
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Kategori Bazında */}
              {report.byCategory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Kategori Bazında Değer Dağılımı
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kategori</TableHead>
                            <TableHead className="text-right">Kayıt Sayısı</TableHead>
                            <TableHead className="text-right">Toplam Değer (TRY)</TableHead>
                            <TableHead className="text-right">Oran</TableHead>
                          </TableRow>
                        </TableHeader>
                      <TableBody>
                        {report.byCategory.map((item: { category: string; count: number; valueTRY: number }) => (
                          <TableRow key={item.category}>
                            <TableCell className="font-medium">{item.category}</TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.valueTRY, "TRY")}
                            </TableCell>
                            <TableCell className="text-right">
                              {report.totalValueTRY > 0 
                                ? `${((item.valueTRY / report.totalValueTRY) * 100).toFixed(1)}%`
                                : "0%"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Para Birimi Bazında */}
              {report.byCurrency.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                      Para Birimi Bazında Değer Dağılımı
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Para Birimi</TableHead>
                            <TableHead className="text-right">Kayıt Sayısı</TableHead>
                            <TableHead className="text-right">Orijinal Değer</TableHead>
                            <TableHead className="text-right">TRY Karşılığı</TableHead>
                          </TableRow>
                        </TableHeader>
                      <TableBody>
                        {report.byCurrency.map((item: { currency: string; count: number; value: number; valueTRY: number }) => (
                          <TableRow key={item.currency}>
                            <TableCell className="font-medium">
                              <Badge variant="outline">{item.currency}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{item.count}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.value, item.currency)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.valueTRY, "TRY")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stok Durumuna Göre */}
              {report.byStatus.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                      Stok Durumuna Göre Değer Dağılımı
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Stok Durumu</TableHead>
                            <TableHead className="text-right">Kayıt Sayısı</TableHead>
                            <TableHead className="text-right">Toplam Değer (TRY)</TableHead>
                            <TableHead className="text-right">Oran</TableHead>
                          </TableRow>
                        </TableHeader>
                      <TableBody>
                        {report.byStatus.map((item: { status: string; count: number; valueTRY: number }) => {
                          const StatusIcon = getStatusIcon(item.status);
                          return (
                            <TableRow key={item.status}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <StatusIcon className={`h-4 w-4 ${getStatusColor(item.status).split(" ")[1]}`} />
                                  {getStatusLabel(item.status)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{item.count}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(item.valueTRY, "TRY")}
                              </TableCell>
                              <TableCell className="text-right">
                                {report.totalValueTRY > 0 
                                  ? `${((item.valueTRY / report.totalValueTRY) * 100).toFixed(1)}%`
                                  : "0%"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* En Değerli Öğeler */}
              {report.topItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="break-words">
                        {type === "rawMaterials" && "En Değerli Hammaddeler (Top 10)"}
                        {type === "products" && "En Değerli Ürünler (Top 10)"}
                        {type === "customers" && "En Değerli Müşteriler (Top 10)"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{type === "customers" ? "Müşteri" : type === "products" ? "Ürün" : "Hammadde"}</TableHead>
                            <TableHead>{type === "customers" ? "Sipariş Sayısı" : "Kategori"}</TableHead>
                            {type !== "customers" && <TableHead className="text-right">Stok</TableHead>}
                            {type !== "customers" && <TableHead className="text-right">Birim {type === "products" ? "Fiyat" : "Maliyet"}</TableHead>}
                            <TableHead className="text-right">Toplam Değer (TRY)</TableHead>
                          </TableRow>
                        </TableHeader>
                      <TableBody>
                        {report.topItems.map((item: { name: string; category?: string; stock?: number; cost?: number; currency?: string; valueTRY: number }, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              {type === "customers" ? (
                                <span>{item.stock}</span>
                              ) : (
                                <Badge variant="outline">{item.category}</Badge>
                              )}
                            </TableCell>
                            {type !== "customers" && <TableCell className="text-right">{item.stock}</TableCell>}
                            {type !== "customers" && (
                              <TableCell className="text-right">
                                {formatCurrency(item.cost, item.currency)}
                              </TableCell>
                            )}
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.valueTRY, "TRY")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              Veri bulunamadı
            </div>
          )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

