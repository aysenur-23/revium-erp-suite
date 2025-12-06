import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getMaterialTransactions, MaterialTransaction } from "@/services/firebase/materialService";
import { getOrderById } from "@/services/firebase/orderService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaterialTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialId: string;
  materialName: string;
}

export const MaterialTransactionsDialog = ({
  open,
  onOpenChange,
  materialId,
  materialName,
}: MaterialTransactionsDialogProps) => {
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersMap, setOrdersMap] = useState<Record<string, { orderNumber: string; productName?: string }>>({});
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      fetchTransactions();
    }
  }, [open, materialId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const transactionsData = await getMaterialTransactions(materialId);
      // Tarihe göre sırala (en yeni üstte)
      transactionsData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || (a.createdAt as any)?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || (b.createdAt as any)?.seconds * 1000 || 0;
        return bTime - aTime;
      });
      setTransactions(transactionsData);

      // Sipariş bilgilerini ve kullanıcı bilgilerini yükle
      const orderIds = transactionsData
        .filter(t => t.relatedOrderId)
        .map(t => t.relatedOrderId!)
        .filter((id, index, self) => self.indexOf(id) === index); // Unique

      const userIds = transactionsData
        .map(t => t.createdBy)
        .filter((id, index, self) => self.indexOf(id) === index); // Unique

      // Paralel olarak sipariş ve kullanıcı bilgilerini yükle
      const [ordersData, usersData] = await Promise.all([
        Promise.all(orderIds.map(async (orderId) => {
          try {
            const order = await getOrderById(orderId);
            return order ? { orderId, orderNumber: order.orderNumber || order.order_number || orderId, productName: order.productName || order.product_name } : null;
          } catch {
            return null;
          }
        })),
        getAllUsers().catch(() => [] as UserProfile[]),
      ]);

      // Orders map oluştur
      const ordersMapData: Record<string, { orderNumber: string; productName?: string }> = {};
      ordersData.forEach((orderData) => {
        if (orderData) {
          ordersMapData[orderData.orderId] = { orderNumber: orderData.orderNumber, productName: orderData.productName };
        }
      });
      setOrdersMap(ordersMapData);

      // Users map oluştur
      const usersMapData: Record<string, string> = {};
      usersData.forEach((user) => {
        usersMapData[user.id] = user.fullName || user.displayName || user.email || "Bilinmeyen";
      });
      setUsersMap(usersMapData);
    } catch (error: any) {
      console.error("İşlemler yüklenirken hata:", error);
      toast.error(error.message || "İşlemler yüklenirken hata oluştu");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, "dd MMMM yyyy HH:mm", { locale: tr });
    } catch {
      return "-";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{materialName} - İşlem Geçmişi</DialogTitle>
          <DialogDescription>
            Bu hammadde için yapılan tüm stok hareketlerini görüntüleyin
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Yükleniyor...</p>
        ) : transactions.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Henüz işlem yapılmamış</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlem Türü</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead>Sipariş</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Açıklama</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => {
                  const orderInfo = t.relatedOrderId ? ordersMap[t.relatedOrderId] : null;
                  const userName = usersMap[t.createdBy] || "Bilinmeyen";
                  
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(t.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.type === "in" ? "default" : "destructive"}>
                          {t.type === "in" ? "Giriş" : "Çıkış"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium whitespace-nowrap ${
                          t.type === "in" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {t.type === "in" ? "+" : "-"}
                        {t.quantity}
                      </TableCell>
                      <TableCell className="text-sm">
                        {orderInfo ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{orderInfo.orderNumber}</span>
                            {t.relatedOrderId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  window.open(`/production?orderId=${t.relatedOrderId}`, '_blank');
                                }}
                                title="Siparişi aç"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {orderInfo?.productName || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {userName}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate" title={t.reason}>
                        {t.reason || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
