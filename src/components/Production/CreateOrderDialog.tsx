import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createOrder, OrderItem } from "@/services/firebase/orderService";
import { useAuth } from "@/contexts/AuthContext";
import { Timestamp } from "firebase/firestore";
import { Loader2, Plus, Trash2, Package } from "lucide-react";
import { CustomerCombobox } from "@/components/Customers/CustomerCombobox";
import { cn } from "@/lib/utils";
import { getProducts, Product } from "@/services/firebase/productService";
import { Card } from "@/components/ui/card";

type DateLike = Date | Timestamp | { toDate?: () => Date } | string | null | undefined;

const hasToDate = (value: unknown): value is { toDate: () => Date } =>
  typeof value === "object" &&
  value !== null &&
  "toDate" in value &&
  typeof (value as { toDate?: unknown }).toDate === "function";

const toDateSafe = (value: DateLike): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (hasToDate(value)) {
    const result = value.toDate();
    if (result instanceof Date) {
      return result;
    }
  }
  return new Date();
};

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ProductItem {
  product_id: string;
  product_name: string;
  quantity: string;
  unit: string;
}

export const CreateOrderDialog = ({ open, onOpenChange, onSuccess }: CreateOrderDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orderNumberTouched, setOrderNumberTouched] = useState(false);
  const [formData, setFormData] = useState({
    order_number: "",
    customer_id: "",
    customer_name: "",
    due_date: "",
    priority: "0",
    status: "planned",
    notes: "",
    shipping_address: "",
    shipping_notes: "",
    deductMaterials: true, // Hammadde düşürme varsayılan açık
  });
  const [productItems, setProductItems] = useState<ProductItem[]>([
    { product_id: "", product_name: "", quantity: "1", unit: "Adet" }
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const fetchNextOrderNumber = useCallback(async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      
      const { getOrders } = await import("@/services/firebase/orderService");
      const todayOrders = await getOrders();
      const today = `${year}-${month}-${day}`;
      const todayOrderCount = todayOrders.filter((order) => {
        const orderDate = toDateSafe(order.createdAt as DateLike);
        const orderDateStr = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
        return orderDateStr === today;
      }).length;
      
      const sequence = String(todayOrderCount + 1).padStart(3, '0');
      const nextNumber = `PROD-${year}${month}${day}-${sequence}`;
      
      setFormData((prev) => {
        if (orderNumberTouched && prev.order_number) {
          return prev;
        }
        return { ...prev, order_number: nextNumber };
      });
    } catch (error: unknown) {
      const nextNumber = `PROD-${Date.now()}`;
      setFormData((prev) => {
        if (orderNumberTouched && prev.order_number) {
          return prev;
        }
        return { ...prev, order_number: nextNumber };
      });
    }
  }, [orderNumberTouched]);

  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const productData = await getProducts();
      setProducts(productData);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Fetch products error:", error);
      }
      toast.error("Ürün listesi alınamadı");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setOrderNumberTouched(false);
      fetchNextOrderNumber();
      fetchProducts();
      
      // Dialog açıkken her 30 saniyede bir ürün listesini güncelle
      const interval = setInterval(() => {
        fetchProducts();
      }, 30000); // 30 saniye
      
      return () => clearInterval(interval);
    }
  }, [open, fetchNextOrderNumber, fetchProducts]);

  const addProductItem = () => {
    setProductItems([...productItems, { product_id: "", product_name: "", quantity: "1", unit: "Adet" }]);
  };

  const removeProductItem = (index: number) => {
    if (productItems.length === 1) {
      toast.error("En az bir ürün olmalıdır");
      return;
    }
    setProductItems(productItems.filter((_, i) => i !== index));
  };

  const updateProductItem = (index: number, field: keyof ProductItem, value: string) => {
    const updated = [...productItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Ürün seçildiğinde adını otomatik doldur
    if (field === "product_id") {
      if (value === "none" || value === "") {
        // Ürün seçimi temizlendi
        updated[index].product_name = "";
      } else if (value === "manual") {
        // "Diğer" seçildi, ürün adı alanı görünecek
        updated[index].product_name = "";
      } else {
        // Dropdown'dan ürün seçildi
        const selected = products.find(p => p.id === value);
        if (selected) {
          updated[index].product_name = selected.name;
        }
      }
    }
    
    setProductItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!formData.order_number.trim()) {
      nextErrors.order_number = "Sipariş numarası zorunludur";
    }
    if (!formData.due_date) {
      nextErrors.due_date = "Termin tarihi zorunludur";
    }

    // Ürün kontrolleri
    productItems.forEach((item, index) => {
      if (!item.product_id || item.product_id === "" || item.product_id === "none") {
        nextErrors[`product_${index}`] = "Ürün seçin veya 'Diğer' seçin";
      }
      if (item.product_id === "manual" && !item.product_name.trim()) {
        nextErrors[`product_name_${index}`] = "Ürün adı zorunlu";
      }
      const qty = Number(item.quantity);
      if (!item.quantity || isNaN(qty) || qty <= 0) {
        nextErrors[`quantity_${index}`] = "Miktar 0'dan büyük olmalı";
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Lütfen tüm zorunlu alanları doldurun");
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        toast.error("Oturum sona erdi");
        setLoading(false);
        return;
      }

      const dueDate = formData.due_date ? Timestamp.fromDate(new Date(formData.due_date)) : null;
      
      const orderItems: Omit<OrderItem, "id">[] = productItems.map(item => ({
        productId: item.product_id === "manual" ? null : (item.product_id || null),
        product_id: item.product_id === "manual" ? null : (item.product_id || null),
        productName: item.product_name,
        product_name: item.product_name,
        quantity: Number(item.quantity),
        unitPrice: 0,
        unit_price: 0,
        total: 0,
      }));

      const totalQuantity = productItems.reduce((sum, item) => sum + Number(item.quantity), 0);

      await createOrder({
        orderNumber: formData.order_number,
        order_number: formData.order_number,
        customerId: formData.customer_id || null,
        customer_id: formData.customer_id || null,
        customerName: formData.customer_name || null,
        customer_name: formData.customer_name || null,
        status: (formData.status || "planned") as "planned" | "in_production" | "completed" | "cancelled",
        totalAmount: 0,
        total_amount: 0,
        currency: "TRY",
        dueDate,
        due_date: formData.due_date || null,
        notes: formData.notes || null,
        itemsCount: orderItems.length,
        items_count: orderItems.length,
        totalQuantity,
        total_quantity: totalQuantity,
        createdBy: user.id,
        created_by: user.id,
        deductMaterials: formData.deductMaterials, // Üretim siparişi için varsayılan true
      }, orderItems);

      toast.success("Üretim siparişi oluşturuldu");
      onSuccess();
      onOpenChange(false);
      
      // Reset
      setFormData({
        order_number: "",
        customer_id: "",
        customer_name: "",
        due_date: "",
        priority: "0",
        status: "planned",
        notes: "",
        shipping_address: "",
        shipping_notes: "",
        deductMaterials: true,
      });
      setProductItems([{ product_id: "", product_name: "", quantity: "1", unit: "Adet" }]);
      setErrors({});
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Create production order error:", error);
      }
      toast.error("Hata: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[18px] sm:text-[20px] font-semibold">Yeni Üretim Siparişi</DialogTitle>
          <DialogDescription>
            Üretim için yeni bir sipariş oluşturun
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_number" showRequired>Sipariş Numarası</Label>
              <Input
                id="order_number"
                value={formData.order_number}
                onChange={(e) => {
                  setFormData({ ...formData, order_number: e.target.value });
                  setOrderNumberTouched(true);
                }}
                className={cn(errors.order_number && "border-destructive")}
                required
              />
              {errors.order_number && <p className="text-sm text-destructive">{errors.order_number}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date" showRequired>Termin Tarihi</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className={cn(errors.due_date && "border-destructive")}
                required
              />
              {errors.due_date && <p className="text-sm text-destructive">{errors.due_date}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Müşteri</Label>
            <CustomerCombobox
              value={formData.customer_id}
              onChange={(customerId, customerName) => 
                setFormData({ ...formData, customer_id: customerId, customer_name: customerName })
              }
              placeholder="Müşteri seçin"
            />
          </div>

          {/* Ürünler */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Ürünler</Label>
              <Button type="button" onClick={addProductItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Ürün Ekle
              </Button>
            </div>

            {productItems.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Ürün {index + 1}</span>
                    {productItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProductItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Ürün Seçin</Label>
                      <Select
                        value={item.product_id}
                        onValueChange={(value) => updateProductItem(index, "product_id", value)}
                        onOpenChange={(open) => {
                          // Dropdown açıldığında ürün listesini yenile
                          if (open) {
                            fetchProducts();
                          }
                        }}
                      >
                        <SelectTrigger className={cn(errors[`product_${index}`] && "border-destructive")}>
                          <SelectValue placeholder="Ürün seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Ürün seçin</SelectItem>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                          <SelectItem value="manual">Diğer</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors[`product_${index}`] && (
                        <p className="text-sm text-destructive">{errors[`product_${index}`]}</p>
                      )}
                    </div>

                    {item.product_id === "manual" && (
                      <div className="space-y-2">
                        <Label>Ürün Adı</Label>
                        <Input
                          value={item.product_name}
                          onChange={(e) => updateProductItem(index, "product_name", e.target.value)}
                          placeholder="Ürün adı girin"
                          className={cn(errors[`product_name_${index}`] && "border-destructive")}
                        />
                        {errors[`product_name_${index}`] && (
                          <p className="text-sm text-destructive">{errors[`product_name_${index}`]}</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Miktar</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateProductItem(index, "quantity", e.target.value)}
                        className={cn(errors[`quantity_${index}`] && "border-destructive")}
                      />
                      {errors[`quantity_${index}`] && (
                        <p className="text-sm text-destructive">{errors[`quantity_${index}`]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Birim</Label>
                      <Select value={item.unit} onValueChange={(value) => updateProductItem(index, "unit", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Adet">Adet</SelectItem>
                          <SelectItem value="Kg">Kg</SelectItem>
                          <SelectItem value="Litre">Litre</SelectItem>
                          <SelectItem value="Metre">Metre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Notlar</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Sipariş notları"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Oluştur
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

