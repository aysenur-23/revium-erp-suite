import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createOrder, updateOrder, getOrderItems, getOrderById, OrderItem as FirebaseOrderItem, Order as FirebaseOrder } from "@/services/firebase/orderService";
import { getProducts, createProduct } from "@/services/firebase/productService";
import { getCustomerById, Customer as FirebaseCustomer } from "@/services/firebase/customerService";
import { useAuth } from "@/contexts/AuthContext";
<<<<<<< HEAD
import { Timestamp, doc, deleteDoc, addDoc, collection, writeBatch } from "firebase/firestore";
=======
import { Timestamp, doc, deleteDoc, addDoc, collection } from "firebase/firestore";
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
import { firestore } from "@/lib/firebase";
import { Plus, Trash2, Save, Loader2, RefreshCcw, ChevronsUpDown, Pencil, ShoppingCart, User, CreditCard, CalendarIcon, Package, Search, ArrowLeft, ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerCombobox } from "@/components/Customers/CustomerCombobox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { CustomerDetailModal } from "@/components/Customers/CustomerDetailModal";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  order?: FirebaseOrder | null; // Edit modu için mevcut sipariş
}

interface OrderItem {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  discountType?: "amount" | "percentage"; // İndirim tipi: tutar veya yüzde
  total: number;
  is_manual?: boolean;
  category?: string;
}

type CatalogProduct = {
  id: string;
  name: string;
  sku?: string | null;
  price?: number | null;
  category?: string | null;
};

const PRODUCT_CATEGORIES = [
  "Taşınabilir Güç Paketleri",
  "Kabin Tipi Güç Paketleri",
  "Araç Tipi Güç Paketleri",
  "Endüstriyel Güç Paketleri",
  "Güneş Enerji Sistemleri",
] as const;

import { CURRENCY_OPTIONS, CURRENCY_SYMBOLS, DEFAULT_CURRENCY } from "@/utils/currency";
import { PRIORITY_OPTIONS, getPrioritySelectOptions } from "@/utils/priority";

const ORDER_STATUS_OPTIONS: { value: FirebaseOrder["status"]; label: string }[] = [
  { value: "pending", label: "Beklemede" },
  { value: "confirmed", label: "Onaylandı" },
  { value: "in_production", label: "Üretimde" },
  { value: "completed", label: "Tamamlandı" },
  { value: "cancelled", label: "İptal Edildi" },
];

const createEmptyItem = (): OrderItem => ({
  product_id: null,
  product_name: "",
  quantity: 1,
  unit_price: 0,
  discount: 0,
  discountType: "amount", // Varsayılan olarak tutar
  total: 0,
  is_manual: false,
  category: undefined,
});

const MANUAL_PRODUCT_VALUE = "manual";

interface ProductSelectorProps {
  products: CatalogProduct[];
  value: string | null;
  onSelect: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ProductSelector = ({
  products,
  value,
  onSelect,
  disabled,
  placeholder = "Ürün seçin veya arayın",
  onRefreshProducts,
}: ProductSelectorProps & { onRefreshProducts?: () => void }) => {
  const [open, setOpen] = useState(false);
  const selectedProduct = value ? products.find((p) => p.id === value) : null;

<<<<<<< HEAD
  // Dropdown açıldığında ürün listesini yükle (lazy loading)
  useEffect(() => {
    if (open && onRefreshProducts && products.length === 0) {
      onRefreshProducts();
    }
  }, [open, onRefreshProducts, products.length]);
=======
  // Dropdown açıldığında ürün listesini yenile
  useEffect(() => {
    if (open && onRefreshProducts) {
      onRefreshProducts();
    }
  }, [open, onRefreshProducts]);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

  return (
    <Popover open={open} onOpenChange={(isOpen) => !disabled && setOpen(isOpen)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
<<<<<<< HEAD
          className="w-full justify-between h-10 sm:h-10 pointer-events-auto cursor-pointer min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
=======
          className="w-full justify-between h-10 pointer-events-auto cursor-pointer"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        >
          <span className="truncate text-left">
            {selectedProduct ? selectedProduct.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[320px] sm:w-[400px] p-0 !max-h-[400px] !h-auto" 
        align="start" 
        side="bottom" 
        sideOffset={4}
        avoidCollisions={true}
      >
        <Command>
          <CommandInput placeholder="Ürün ara..." className="text-[11px] sm:text-xs" />
          <CommandList className="!max-h-[350px] !h-auto" style={{ maxHeight: '350px', height: 'auto' }}>
            <CommandEmpty>Ürün bulunamadı. Manuel ürün eklemek için aşağıdaki seçeneği kullanın.</CommandEmpty>
            {products.length > 0 && (
              <CommandGroup heading="Kayıtlı ürünler">
                {products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.name}
                    onSelect={() => {
                      onSelect(product.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col w-full">
                      <span className="font-medium">{product.name}</span>
                      {(product.sku || product.category) && (
                        <span className="text-[11px] sm:text-xs text-muted-foreground">
                          {product.sku || product.category}
                        </span>
                      )}
                      {product.price && (
                        <span className="text-[11px] sm:text-xs text-primary font-medium mt-0.5">
                          {CURRENCY_SYMBOLS["TRY"] || "₺"}{product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {products.length > 0 && <CommandSeparator />}
            <CommandGroup>
              <CommandItem
                className="text-primary cursor-pointer"
                onSelect={() => {
                  onSelect(MANUAL_PRODUCT_VALUE);
                  setOpen(false);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Manuel Ürün/Hizmet Ekle
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const CreateOrderDialog = ({ open, onOpenChange, onSuccess, order }: CreateOrderDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [savingProduct, setSavingProduct] = useState<Record<number, boolean>>({});
  const [orderNumberTouched, setOrderNumberTouched] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<FirebaseCustomer | null>(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [customerDetailsError, setCustomerDetailsError] = useState<string | null>(null);
  const [customerDetailModalOpen, setCustomerDetailModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  
  const [orderData, setOrderData] = useState({
    customer_id: "",
    customer_name: "",
    order_date: "",
    delivery_date: "",
    received_date: "",
    notes: "",
    order_number: "",
    currency: "TRY",
    status: "pending" as FirebaseOrder["status"],
    tax_rate: 20,
    deductMaterials: false, // Hammadde düşürme varsayılan kapalı
    priority: 0, // Öncelik: 0-5 arası (0 = düşük, 5 = çok yüksek)
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([createEmptyItem()]);

  const generateOrderNumber = useCallback(() => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const randomSegment = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `ORD-${dateStr}-${randomSegment}`;
  }, []);

  const assignOrderNumber = useCallback(
    (force = false) => {
      setOrderData((prev) => {
        if (!force && prev.order_number) {
          return prev;
        }
        return { ...prev, order_number: generateOrderNumber() };
      });
    },
    [generateOrderNumber]
  );

  const resetForm = useCallback(() => {
    setOrderData({
      customer_id: "",
      customer_name: "",
      order_date: "",
      delivery_date: "",
      received_date: "",
      notes: "",
      order_number: generateOrderNumber(),
      currency: "TRY",
      status: "pending",
      tax_rate: 20,
      deductMaterials: false,
      priority: 0,
    });
    setOrderItems([createEmptyItem()]);
    setOrderNumberTouched(false);
    setCustomerDetails(null);
    setCustomerDetailsError(null);
    setSavingProduct({});
  }, [generateOrderNumber]);

  const fetchProducts = useCallback(async () => {
    try {
      const fetched = await getProducts();
      const mappedProducts = fetched.map((product: { id: string; name: string; sku?: string; price?: number; unitPrice?: number; category?: string }) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price || product.unitPrice || null,
        category: product.category,
      }));
      setProducts(mappedProducts);
      
      if (import.meta.env.DEV && mappedProducts.length === 0) {
        console.warn("⚠️ Ürün listesi boş. Firestore'da ürün var mı kontrol edin.");
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Ürünler yüklenemedi:", error);
      }
      // Hata durumunda boş array set et, böylece kullanıcı manuel ürün ekleyebilir
      setProducts([]);
      toast.error("Ürünler yüklenirken hata oluştu: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    }
  }, []);

  // Edit modu: Mevcut sipariş bilgilerini yükle
  useEffect(() => {
    if (!open) return;
    
    if (order) {
      // Edit modu - mevcut sipariş bilgilerini yükle
      const loadOrderData = async () => {
        try {
          // Order bilgilerini form'a yükle
          const orderDate = order.order_date || order.orderDate;
          const deliveryDate = order.delivery_date || order.deliveryDate;
          const receivedDate = order.received_date || order.receivedDate;
          
          setOrderData({
            customer_id: order.customer_id || order.customerId || "",
            customer_name: order.customer_name || order.customerName || "",
            order_date: orderDate instanceof Date 
              ? format(orderDate, "yyyy-MM-dd")
              : orderDate instanceof Timestamp
              ? format(orderDate.toDate(), "yyyy-MM-dd")
              : typeof orderDate === "string"
              ? orderDate
              : "",
            delivery_date: deliveryDate instanceof Date
              ? format(deliveryDate, "yyyy-MM-dd")
              : deliveryDate instanceof Timestamp
              ? format(deliveryDate.toDate(), "yyyy-MM-dd")
              : typeof deliveryDate === "string"
              ? deliveryDate
              : "",
            received_date: receivedDate instanceof Date
              ? format(receivedDate, "yyyy-MM-dd")
              : receivedDate instanceof Timestamp
              ? format(receivedDate.toDate(), "yyyy-MM-dd")
              : typeof receivedDate === "string"
              ? receivedDate
              : "",
            notes: order.notes || "",
            order_number: order.order_number || order.orderNumber || "",
            currency: order.currency || "TRY",
            status: order.status || "pending",
            tax_rate: order.tax_rate || order.taxRate || 20,
            deductMaterials: order.deductMaterials || false,
            priority: order.priority ?? 0,
          });
          
          // Order items'ı yükle
          const items = await getOrderItems(order.id);
          if (items.length > 0) {
            setOrderItems(
              items.map((item) => ({
                product_id: item.product_id || item.productId || null,
                product_name: item.product_name || item.productName || "",
                quantity: item.quantity || 0,
                unit_price: item.unit_price || item.unitPrice || 0,
                discount: item.discount || 0,
                discountType: item.discountType || "amount",
                total: item.total || 0,
                is_manual: !item.product_id && !item.productId,
                category: item.category || undefined,
              }))
            );
          } else {
            setOrderItems([createEmptyItem()]);
          }
          
          // Müşteri detaylarını yükle
          if (order.customer_id || order.customerId) {
            try {
              setCustomerDetailsLoading(true);
              const customer = await getCustomerById(order.customer_id || order.customerId || "");
              setCustomerDetails(customer);
            } catch (error) {
              // Müşteri yüklenemezse sessizce devam et
            } finally {
              setCustomerDetailsLoading(false);
            }
          }
        } catch (error) {
          console.error("Error loading order data:", error);
          toast.error("Sipariş bilgileri yüklenirken hata oluştu");
        }
      };
      
      loadOrderData();
    } else {
      // Create modu - formu sıfırla
      resetForm();
      assignOrderNumber();
    }
    
<<<<<<< HEAD
    // Ürünler lazy loading ile yüklenecek (ProductSelector açıldığında)
  }, [open, order, assignOrderNumber, resetForm]);
=======
    // Dialog açıldığında ürünleri hemen yükle
    fetchProducts().catch((error) => {
      if (import.meta.env.DEV) {
        console.error("Initial product fetch failed:", error);
      }
    });
    
    // Dialog açıkken her 30 saniyede bir ürün listesini güncelle
    const interval = setInterval(() => {
      fetchProducts().catch((error) => {
        if (import.meta.env.DEV) {
          console.error("Periodic product fetch failed:", error);
        }
      });
    }, 30000); // 30 saniye
    
    return () => clearInterval(interval);
  }, [open, order, fetchProducts, assignOrderNumber, resetForm]);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

  const fetchCustomerDetails = useCallback(async (customerId: string) => {
    setCustomerDetailsLoading(true);
    setCustomerDetailsError(null);
    try {
      const customer = await getCustomerById(customerId);
      setCustomerDetails(customer);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Müşteri bilgisi alınamadı:", error);
      }
      setCustomerDetails(null);
      setCustomerDetailsError(error instanceof Error ? error.message : "Müşteri bilgileri alınamadı");
    } finally {
      setCustomerDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!orderData.customer_id) {
      setCustomerDetails(null);
      setCustomerDetailsError(null);
      return;
    }
    fetchCustomerDetails(orderData.customer_id);
  }, [orderData.customer_id, fetchCustomerDetails]);

  const validItems = useMemo(
    () =>
      orderItems.filter(
        (item) =>
          (item.product_id || (item.is_manual && item.product_name.trim())) &&
          item.quantity > 0 &&
          item.unit_price > 0
      ),
    [orderItems]
  );

  const subtotal = useMemo(() => validItems.reduce((sum, item) => sum + item.total, 0), [validItems]);
  const discountTotal = useMemo(
    () => validItems.reduce((sum, item) => {
      const discount = item.discount || 0;
      const discountType = item.discountType || "amount";
      if (discountType === "percentage") {
        const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0);
        return sum + (itemSubtotal * (discount / 100));
      } else {
        return sum + discount;
      }
    }, 0),
    [validItems]
  );
  const taxRate = Number(orderData.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;
  const lineItemCount = validItems.length;
  const totalQuantity = validItems.reduce((sum, item) => sum + item.quantity, 0);
  const currencySymbol = CURRENCY_SYMBOLS[orderData.currency] || "₺";
  const disableSubmit = loading || !orderData.customer_id || !orderData.order_number || validItems.length === 0;

  const handleAddItem = () => {
    setOrderItems((prev) => [...prev, createEmptyItem()]);
  };

  const getFilteredProducts = useCallback(
    (category?: string) => {
      if (!category) return products;
      return products.filter((product) => product.category === category);
    },
    [products]
  );

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number | null) => {
    setOrderItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };

      if (field === "product_id") {
        if (value === MANUAL_PRODUCT_VALUE) {
          current.is_manual = true;
          current.product_id = null;
          current.product_name = "";
          current.unit_price = 0;
        } else if (value) {
          const product = products.find((p) => p.id === value);
          current.is_manual = false;
          current.product_id = String(value);
          current.product_name = product?.name || "";
          if (product?.price) {
            current.unit_price = product.price;
            toast.success(`Ürün fiyatı otomatik olarak eklendi: ${product.price.toFixed(2)} ${currencySymbol}`);
          } else {
            toast.info("Bu ürün için fiyat tanımlı değil, lütfen manuel olarak girin");
          }
          current.category = product?.category || current.category;
        } else {
          current.is_manual = false;
          current.product_id = null;
          current.product_name = "";
          current.unit_price = 0;
        }
      } else if (field === "quantity") {
        const numericValue = parseInt(String(value));
        current[field] = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
      } else if (field === "unit_price" || field === "discount") {
        const numericValue = Number(value);
        current[field] = Number.isFinite(numericValue) ? numericValue : 0;
      } else if (field === "discountType") {
        current.discountType = value as "amount" | "percentage";
      } else {
        (current as Record<string, unknown>)[field] = value;
      }

      const quantity = current.quantity || 0;
      const unitPrice = current.unit_price || 0;
      const discount = current.discount || 0;
      const discountType = current.discountType || "amount";
      
      // İndirim hesaplama: yüzde ise birim fiyat * miktar * (yüzde / 100), tutar ise direkt tutar
      let calculatedDiscount = 0;
      if (discountType === "percentage") {
        const subtotal = quantity * unitPrice;
        calculatedDiscount = subtotal * (discount / 100);
      } else {
        calculatedDiscount = discount;
      }
      
      current.total = Math.max(quantity * unitPrice - calculatedDiscount, 0);

      updated[index] = current;
      return updated;
    });
  };

  const handleSaveManualProduct = async (index: number) => {
    const item = orderItems[index];
    if (!item.product_name.trim() || !item.unit_price || item.unit_price <= 0) {
      toast.error("Manuel ürün için ad ve birim fiyat zorunludur");
      return;
    }

    if (!user?.id) {
      toast.error("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
      return;
    }

    setSavingProduct((prev) => ({ ...prev, [index]: true }));
    try {
      const baseSku = item.product_name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 10);
      let sku = baseSku;
      let counter = 1;
      while (products.some((p) => p.sku === sku)) {
        sku = `${baseSku}${counter}`;
        counter += 1;
      }

      const newProduct = await createProduct({
        name: item.product_name.trim(),
        sku,
        price: item.unit_price,
        description: "Sipariş panelinden eklenen ürün",
        stock: 0,
        unit: "Adet",
        category: item.category || null,
        minStock: 0,
        createdBy: user.id,
      });

      setProducts((prev) => [
        ...prev,
        {
          id: newProduct.id,
          name: newProduct.name,
          sku: newProduct.sku,
          price: newProduct.price,
          category: newProduct.category,
        },
      ]);

      updateItem(index, "product_id", newProduct.id);
      toast.success("Ürün kayıtlı ürünlere eklendi");
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Manuel ürün kaydedilemedi:", error);
      }
      toast.error("Ürün kaydedilemedi: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    } finally {
      setSavingProduct((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleCustomerChange = useCallback((customerId: string, customerName: string) => {
    setOrderData((prev) => {
      // Sipariş numarasını koru - sadece müşteri bilgilerini güncelle
      return {
        ...prev,
        customer_id: customerId,
        customer_name: customerName,
        // order_number'ı koru - değiştirme
      };
    });
    setCustomerDetails(null);
    setCustomerDetailsError(null);
  }, []);

  const handleCustomerUpdate = () => {
    if (orderData.customer_id) {
      fetchCustomerDetails(orderData.customer_id);
    }
  };

  const handleRegenerateOrderNumber = () => {
    assignOrderNumber(true);
    setOrderNumberTouched(false);
    toast.success("Yeni sipariş numarası oluşturuldu");
  };

  const handleSubmit = async () => {
    if (!orderData.order_number) {
      setOrderNumberTouched(true);
      toast.error("Lütfen sipariş numarası girin");
      return;
    }

    if (!orderData.customer_id) {
      toast.error("Lütfen müşteri seçin");
      return;
    }

    if (validItems.length === 0) {
      toast.error("Lütfen en az bir geçerli ürün ekleyin");
      return;
    }

    if (!user?.id) {
      toast.error("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
      return;
    }

    setLoading(true);
    try {
      const deliveryTimestamp = orderData.delivery_date
        ? Timestamp.fromDate(new Date(orderData.delivery_date))
        : null;
      const orderDateTimestamp = orderData.order_date
        ? Timestamp.fromDate(new Date(orderData.order_date))
        : Timestamp.now();
      const receivedTimestamp = orderData.received_date
        ? Timestamp.fromDate(new Date(orderData.received_date))
        : null;
      const selectedStatus = orderData.status || "pending";

      const itemsPayload: Omit<FirebaseOrderItem, "id">[] = validItems.map((item) => ({
        productId: item.product_id || null,
        product_id: item.product_id || null,
        productName: item.product_name || null,
        product_name: item.product_name || null,
        quantity: item.quantity,
        unitPrice: item.unit_price || 0,
        unit_price: item.unit_price || 0,
        discount: item.discount || 0,
        discountType: item.discountType || "amount",
        total: item.total,
        category: item.category || null,
      }));

      if (order) {
        // Edit modu - mevcut siparişi güncelle
        await updateOrder(
          order.id,
          {
            orderNumber: orderData.order_number,
            order_number: orderData.order_number,
            customerId: orderData.customer_id,
            customer_id: orderData.customer_id,
            customerName: orderData.customer_name || customerDetails?.name || null,
            customer_name: orderData.customer_name || customerDetails?.name || null,
            customerCompany: customerDetails?.company || null,
            customer_company: customerDetails?.company || null,
            customerEmail: customerDetails?.email || null,
            customer_email: customerDetails?.email || null,
            customerPhone: customerDetails?.phone || null,
            customer_phone: customerDetails?.phone || null,
            status: selectedStatus,
            subtotal,
            discountTotal,
            taxAmount,
            totalAmount: grandTotal,
            total_amount: grandTotal,
            itemsCount: lineItemCount,
            items_count: lineItemCount,
            totalQuantity,
            total_quantity: totalQuantity,
            currency: orderData.currency,
            taxRate,
            tax_rate: taxRate,
            orderDate: orderDateTimestamp,
            order_date: orderData.order_date || new Date().toISOString().split("T")[0],
            deliveryDate: deliveryTimestamp,
            delivery_date: orderData.delivery_date || null,
            receivedDate: receivedTimestamp,
            received_date: orderData.received_date || null,
            notes: orderData.notes || null,
            deductMaterials: orderData.deductMaterials, // Hammadde düşürme seçeneği
            priority: orderData.priority ?? 0,
          },
          user.id,
          true // skipStatusValidation - admin için
        );
        
<<<<<<< HEAD
        // Order items'ı güncelle - Batch write ile optimize et
        const existingItems = await getOrderItems(order.id);
        
        // Batch write kullanarak tüm item işlemlerini tek transaction'da yap
        const batch = writeBatch(firestore);
        
        // Mevcut items'ları sil
        for (const existingItem of existingItems) {
          const itemRef = doc(firestore, "orders", order.id, "items", existingItem.id);
          batch.delete(itemRef);
=======
        // Order items'ı güncelle
        const existingItems = await getOrderItems(order.id);
        
        // Mevcut items'ları sil
        for (const existingItem of existingItems) {
          await deleteDoc(doc(firestore, "orders", order.id, "items", existingItem.id));
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        }
        
        // Yeni items'ları ekle
        const itemsCollection = collection(firestore, "orders", order.id, "items");
        for (const item of itemsPayload) {
<<<<<<< HEAD
          const itemRef = doc(itemsCollection);
          batch.set(itemRef, {
=======
          await addDoc(itemsCollection, {
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            productId: item.product_id || null,
            product_id: item.product_id || null,
            productName: item.product_name || null,
            product_name: item.product_name || null,
            quantity: item.quantity,
            unitPrice: item.unit_price || 0,
            unit_price: item.unit_price || 0,
            discount: item.discount || 0,
            discountType: item.discountType || "amount",
            total: item.total,
            category: item.category || null,
          });
        }
        
<<<<<<< HEAD
        // Tüm işlemleri tek seferde commit et
        await batch.commit();
        
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        toast.success("Sipariş başarıyla güncellendi");
      } else {
        // Create modu - yeni sipariş oluştur
        await createOrder(
          {
            orderNumber: orderData.order_number,
            order_number: orderData.order_number,
            customerId: orderData.customer_id,
            customer_id: orderData.customer_id,
            customerName: orderData.customer_name || customerDetails?.name || null,
            customer_name: orderData.customer_name || customerDetails?.name || null,
            customerCompany: customerDetails?.company || null,
            customer_company: customerDetails?.company || null,
            customerEmail: customerDetails?.email || null,
            customer_email: customerDetails?.email || null,
            customerPhone: customerDetails?.phone || null,
            customer_phone: customerDetails?.phone || null,
            status: selectedStatus,
            subtotal,
            discountTotal,
            taxAmount,
            totalAmount: grandTotal,
            total_amount: grandTotal,
            itemsCount: lineItemCount,
            items_count: lineItemCount,
            totalQuantity,
            total_quantity: totalQuantity,
            currency: orderData.currency,
            taxRate,
            tax_rate: taxRate,
            orderDate: orderDateTimestamp,
            order_date: orderData.order_date || new Date().toISOString().split("T")[0],
            deliveryDate: deliveryTimestamp,
            delivery_date: orderData.delivery_date || null,
            receivedDate: receivedTimestamp,
            received_date: orderData.received_date || null,
            notes: orderData.notes || null,
            createdBy: user.id,
            created_by: user.id,
            deductMaterials: orderData.deductMaterials, // Hammadde düşürme seçeneği
            priority: orderData.priority ?? 0,
          },
          itemsPayload
        );
        
        toast.success("Sipariş başarıyla oluşturuldu");
        resetForm();
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Create order error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Sipariş oluşturulurken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
<<<<<<< HEAD
        <DialogContent 
          className="!max-w-[100vw] sm:!max-w-[98vw] md:!max-w-[95vw] lg:!max-w-[92vw] xl:!max-w-[90vw] !w-[100vw] sm:!w-[98vw] md:!w-[95vw] lg:!w-[92vw] xl:!w-[90vw] !h-[100vh] sm:!h-[90vh] md:!h-[80vh] !max-h-[100vh] sm:!max-h-[90vh] md:!max-h-[80vh] !left-0 sm:!left-[1vw] md:!left-[2.5vw] lg:!left-[4vw] xl:!left-[5vw] !top-0 sm:!top-[5vh] md:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden overflow-x-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border create-order-dialog"
          style={{ margin: 0 }}
        >
          {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
          <DialogTitle className="sr-only" id="create-order-dialog-title">
            {order ? "Sipariş Düzenle" : "Yeni Satış Siparişi"}
          </DialogTitle>
          <DialogDescription className="sr-only" id="create-order-dialog-description">
            {order ? "Sipariş bilgilerini düzenleyin" : "Yeni satış siparişi oluşturun"}
          </DialogDescription>
          
          <div className="flex flex-col flex-1 min-h-0" style={{ height: '100%' }}>
            <DialogHeader className="p-2 sm:p-3 md:p-4 pr-10 sm:pr-12 md:pr-16 border-b bg-white flex-shrink-0 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <h2 className="text-[14px] sm:text-[16px] md:text-[18px] font-semibold text-foreground truncate flex-1 min-w-0">
                    {order ? "Sipariş Düzenle" : "Yeni Satış Siparişi"}
                  </h2>
                </div>
                <Badge variant="outline" className="text-[10px] px-2 sm:px-3 py-1 flex-shrink-0 w-full sm:w-auto justify-center sm:justify-start">
=======
        <DialogContent className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden overflow-x-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
          {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
          <DialogTitle className="sr-only">
            {order ? "Sipariş Düzenle" : "Yeni Satış Siparişi"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {order ? "Sipariş bilgilerini düzenleyin" : "Yeni satış siparişi oluşturun"}
          </DialogDescription>
          
          <div className="flex flex-col h-full min-h-0">
            <DialogHeader className="p-3 sm:p-4 pr-12 sm:pr-14 md:pr-16 border-b bg-white flex-shrink-0 relative">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <h2 className="text-[16px] sm:text-[18px] font-semibold text-foreground truncate">
                    {order ? "Sipariş Düzenle" : "Yeni Satış Siparişi"}
                  </h2>
                </div>
                <Badge variant="outline" className="text-[10px] px-2 sm:px-3 py-1 flex-shrink-0">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  Adım {step}/3
                </Badge>
              </div>
            </DialogHeader>

<<<<<<< HEAD
            <div className="flex-1 overflow-hidden overflow-x-hidden bg-gray-50/50 p-2 sm:p-3 md:p-6 min-h-0 flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 sm:px-0 min-h-0" style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
                {/* Step 1: Customer & Order Info */}
                {step === 1 && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Order Details */}
                    <div className="space-y-2 sm:space-y-3 md:space-y-4 flex flex-col">
                      <Card className="rounded-xl shadow-lg border bg-white flex-1 flex flex-col min-h-0 min-w-0">
                        <CardHeader className="p-4 sm:p-6 md:p-8 border-b flex-shrink-0">
                          <CardTitle className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2">
=======
            <div className="flex-1 overflow-hidden overflow-x-hidden bg-gray-50/50 p-3 sm:p-6 min-h-0">
              <div className="max-w-full mx-auto h-full overflow-y-auto overflow-x-hidden">
                {/* Step 1: Customer & Order Info */}
                {step === 1 && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 h-full min-w-0 overflow-x-hidden">
                    {/* Left Column: Order Details */}
                    <div className="col-span-1 lg:col-span-8 space-y-3 sm:space-y-4 flex flex-col">
                      <Card className="rounded-xl shadow-lg border bg-white flex-1 flex flex-col min-h-0">
                        <CardHeader className="p-4 sm:p-6 border-b flex-shrink-0">
                          <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            Sipariş Bilgileri
                          </CardTitle>
                        </CardHeader>
<<<<<<< HEAD
                        <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 flex-1 overflow-y-auto overflow-x-hidden">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium" showRequired>
=======
                        <CardContent className="p-3 sm:p-4 space-y-1.5 sm:space-y-2 flex-1 overflow-y-auto overflow-x-hidden">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-[11px] sm:text-xs font-medium" showRequired>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                Sipariş Numarası
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  value={orderData.order_number}
                                  onChange={(e) => {
                                    setOrderNumberTouched(true);
                                    setOrderData((prev) => ({ ...prev, order_number: e.target.value }));
                                  }}
                                  placeholder="ORD-20240101-0001"
                                  className={cn(
<<<<<<< HEAD
                                    "h-10 sm:h-10 transition-all text-sm min-h-[44px] sm:min-h-0",
=======
                                    "h-10 transition-all text-[11px] sm:text-xs",
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                    !orderData.order_number && orderNumberTouched && "border-destructive"
                                  )}
                                  required
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={handleRegenerateOrderNumber}
                                  title="Numarayı yenile"
<<<<<<< HEAD
                                className="h-10 w-10 sm:h-10 sm:w-10 hover:bg-primary/5 transition-colors min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
=======
                                className="h-10 w-10 hover:bg-primary/5 transition-colors min-h-[36px] sm:min-h-8 text-[11px] sm:text-xs"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                              >
                                <RefreshCcw className="h-4 w-4" />
                              </Button>
                              </div>
                              {!orderData.order_number && orderNumberTouched && (
<<<<<<< HEAD
                                <p className="text-xs text-destructive">
=======
                                <p className="text-[11px] sm:text-xs text-destructive">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                  Sipariş numarası gereklidir
                                </p>
                              )}
                            </div>

<<<<<<< HEAD
            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium" showRequired>
=======
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-[11px] sm:text-xs font-medium" showRequired>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                Müşteri
                              </Label>
                              <CustomerCombobox
                                value={orderData.customer_id}
                                onChange={handleCustomerChange}
                                placeholder="Müşteri seçin veya ekleyin"
                              />
                              {!orderData.customer_id && (
<<<<<<< HEAD
                                <p className="text-xs text-muted-foreground">
=======
                                <p className="text-[11px] sm:text-xs text-muted-foreground">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                  Lütfen siparişi ilişkilendireceğiniz müşteriyi seçin
                                </p>
                              )}
                            </div>
                          </div>

<<<<<<< HEAD
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium">
=======
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-[11px] sm:text-xs font-medium">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                Sipariş Edilen Tarih
                              </Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
<<<<<<< HEAD
                                      "w-full justify-start text-left font-normal h-10 sm:h-10 transition-all text-[11px] sm:text-xs min-h-[44px] sm:min-h-0",
=======
                                      "w-full justify-start text-left font-normal h-10 transition-all text-[11px] sm:text-xs min-h-[36px] sm:min-h-8",
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                      !orderData.order_date && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {orderData.order_date ? (
                                      format(new Date(orderData.order_date), "d MMMM yyyy", { locale: tr })
                                    ) : (
                                      "Tarih seçin"
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={orderData.order_date ? new Date(orderData.order_date) : undefined}
                                    onSelect={(date) =>
                                      setOrderData((prev) => ({
                                        ...prev,
                                        order_date: date ? date.toISOString().split("T")[0] : "",
                                      }))
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
<<<<<<< HEAD
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium">
=======
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-[11px] sm:text-xs font-medium">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                Teslimat Tarihi
                              </Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
<<<<<<< HEAD
                                      "w-full justify-start text-left font-normal h-10 sm:h-10 transition-all text-[11px] sm:text-xs min-h-[44px] sm:min-h-0",
=======
                                      "w-full justify-start text-left font-normal h-10 transition-all",
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                      !orderData.delivery_date && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {orderData.delivery_date ? (
                                      format(new Date(orderData.delivery_date), "d MMMM yyyy", { locale: tr })
                                    ) : (
                                      "Tarih seçin"
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={orderData.delivery_date ? new Date(orderData.delivery_date) : undefined}
                                    onSelect={(date) =>
                                      setOrderData((prev) => ({
                                        ...prev,
                                        delivery_date: date ? date.toISOString().split("T")[0] : "",
                                      }))
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            </div>

<<<<<<< HEAD
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium">
=======
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-[11px] sm:text-xs font-medium">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                Teslim Alınan Tarih
                              </Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
<<<<<<< HEAD
                                      "w-full justify-start text-left font-normal h-10 sm:h-10 transition-all text-[11px] sm:text-xs min-h-[44px] sm:min-h-0",
=======
                                      "w-full justify-start text-left font-normal h-10 transition-all",
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                      !orderData.received_date && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {orderData.received_date ? (
                                      format(new Date(orderData.received_date), "d MMMM yyyy", { locale: tr })
                                    ) : (
                                      "Tarih seçin"
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={orderData.received_date ? new Date(orderData.received_date) : undefined}
                                    onSelect={(date) =>
                                      setOrderData((prev) => ({
                                        ...prev,
                                        received_date: date ? date.toISOString().split("T")[0] : "",
                                      }))
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
<<<<<<< HEAD
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium">
=======
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-[11px] sm:text-xs font-medium">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                Para Birimi
                              </Label>
                              <Select
                                value={orderData.currency}
                                onValueChange={(value) => setOrderData((prev) => ({ ...prev, currency: value }))}
                              >
<<<<<<< HEAD
                                <SelectTrigger className="h-10 sm:h-10 text-sm min-h-[44px] sm:min-h-0">
=======
                                <SelectTrigger className="h-10 text-[11px] sm:text-xs">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CURRENCY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

<<<<<<< HEAD
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium">
=======
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-[11px] sm:text-xs font-medium">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                Öncelik
                              </Label>
                              <Select
                                value={orderData.priority?.toString() || "0"}
                                onValueChange={(value) => setOrderData((prev) => ({ ...prev, priority: parseInt(value) || 0 }))}
                              >
<<<<<<< HEAD
                                <SelectTrigger className="h-10 sm:h-10 text-[11px] sm:text-xs min-h-[44px] sm:min-h-0">
=======
                                <SelectTrigger className="h-10 text-[11px] sm:text-xs">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PRIORITY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value.toString()}>
                                      {option.label} ({option.value})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

<<<<<<< HEAD
                          <div className="space-y-2">
                            <Label className="text-xs sm:text-sm font-medium">
=======
                          <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-[11px] sm:text-xs font-medium">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                              Notlar
                            </Label>
                            <Textarea
                              value={orderData.notes}
                              onChange={(e) => setOrderData((prev) => ({ ...prev, notes: e.target.value }))}
<<<<<<< HEAD
                              rows={4}
                              placeholder="Sipariş ile ilgili notlarınızı buraya yazabilirsiniz..."
                              className="text-sm resize-none transition-all min-h-[100px]"
=======
                              rows={3}
                              placeholder="Sipariş ile ilgili notlarınızı buraya yazabilirsiniz..."
                              className="text-[11px] sm:text-xs resize-none transition-all"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {customerDetails && (
                        <Card className="rounded-xl shadow-lg border bg-white">
<<<<<<< HEAD
                          <CardHeader className="p-4 sm:p-6 md:p-8 border-b">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                              <CardTitle className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2">
=======
                          <CardHeader className="p-2 border-b">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                <User className="h-4 w-4 text-primary" />
                                Müşteri Özeti
                              </CardTitle>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
<<<<<<< HEAD
                                className="gap-2 h-10 sm:h-8 hover:bg-primary/5 transition-colors min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs w-full sm:w-auto"
=======
                                className="gap-2 h-8 hover:bg-primary/5 transition-colors min-h-[36px] sm:min-h-8 text-[11px] sm:text-xs"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                onClick={() => setCustomerDetailModalOpen(true)}
                              >
                                <Pencil className="h-3 w-3" />
                                Düzenle
                              </Button>
                            </div>
                          </CardHeader>
<<<<<<< HEAD
                          <CardContent className="p-4 sm:p-6 md:p-8">
                            {customerDetailsLoading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
=======
                          <CardContent className="p-6">
                            {customerDetailsLoading ? (
                              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground py-8 justify-center">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Müşteri bilgileri yükleniyor...
                              </div>
                            ) : customerDetails ? (
<<<<<<< HEAD
                              <div className="grid gap-3 sm:gap-4 text-sm sm:grid-cols-2">
                                <div>
                                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Müşteri</p>
                                  <p className="font-medium text-sm sm:text-base">{customerDetails.name}</p>
                                </div>
                                <div>
                                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Şirket</p>
                                  <p className="font-medium text-sm sm:text-base">{customerDetails.company || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">E-posta</p>
                                  <p className="font-medium text-sm sm:text-base">{customerDetails.email || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Telefon</p>
                                  <p className="font-medium text-sm sm:text-base">{customerDetails.phone || "—"}</p>
                                </div>
                                {customerDetails.address && (
                                  <div className="md:col-span-2">
                                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">Adres</p>
                                    <p className="font-medium text-sm sm:text-base">{customerDetails.address}</p>
=======
                              <div className="grid gap-1.5 sm:gap-2 text-[11px] sm:text-xs sm:grid-cols-2">
                                <div>
                                  <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Müşteri</p>
                                  <p className="font-medium">{customerDetails.name}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Şirket</p>
                                  <p className="font-medium">{customerDetails.company || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">E-posta</p>
                                  <p className="font-medium">{customerDetails.email || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Telefon</p>
                                  <p className="font-medium">{customerDetails.phone || "—"}</p>
                                </div>
                                {customerDetails.address && (
                                  <div className="md:col-span-2">
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mb-1">Adres</p>
                                    <p className="font-medium">{customerDetails.address}</p>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                  </div>
                                )}
                              </div>
                            ) : customerDetailsError ? (
<<<<<<< HEAD
                              <p className="text-sm text-destructive py-4">{customerDetailsError}</p>
=======
                              <p className="text-[11px] sm:text-xs text-destructive py-4">{customerDetailsError}</p>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            ) : null}
                          </CardContent>
                        </Card>
                      )}
<<<<<<< HEAD

                    {/* Summary Card - Below Form */}
                    <Card className="rounded-xl shadow-lg border bg-white flex flex-col">
                          <CardHeader className="p-4 sm:p-6 md:p-8 border-b flex-shrink-0">
                            <CardTitle className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2">
=======
                    </div>

                    {/* Right Column: Summary */}
                    <div className="col-span-12 lg:col-span-4">
                      <div className="w-full lg:w-96 lg:sticky lg:top-6 h-full">
                        <Card className="rounded-xl shadow-lg border bg-white h-full flex flex-col">
                          <CardHeader className="p-6 border-b flex-shrink-0">
                            <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                              <CreditCard className="h-5 w-5 text-primary" />
                              Özet
                            </CardTitle>
                          </CardHeader>
<<<<<<< HEAD
                          <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 flex-1 overflow-y-auto overflow-x-hidden">
                            <div className="space-y-4">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Ara Toplam:</span>
                                <span className="font-medium">{currencySymbol}{subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
=======
                          <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto overflow-x-hidden">
                            <div className="space-y-3">
                              <div className="flex justify-between text-[11px] sm:text-xs">
                                <span className="text-muted-foreground">Ara Toplam:</span>
                                <span className="font-medium">{currencySymbol}{subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-[11px] sm:text-xs">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                <span className="text-muted-foreground">KDV ({taxRate}%):</span>
                                <span className="font-medium">{currencySymbol}{taxAmount.toFixed(2)}</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between pt-1">
<<<<<<< HEAD
                                <span className="font-semibold text-base">Genel Toplam:</span>
                                <span className="font-bold text-base sm:text-lg text-primary">{currencySymbol}{grandTotal.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="pt-3 border-t space-y-3 sm:space-y-4">
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Ürün Sayısı:</span>
                                <span>{lineItemCount}</span>
                              </div>
                              <div className="flex justify-between text-sm text-muted-foreground">
=======
                                <span className="font-semibold">Genel Toplam:</span>
                                <span className="font-bold text-[11px] sm:text-xs text-primary">{currencySymbol}{grandTotal.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="pt-3 border-t space-y-1.5 sm:space-y-2">
                              <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground">
                                <span>Ürün Sayısı:</span>
                                <span>{lineItemCount}</span>
                              </div>
                              <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                <span>Toplam Miktar:</span>
                                <span>{totalQuantity} adet</span>
                              </div>
                            </div>
                          </CardContent>
<<<<<<< HEAD
                    </Card>
=======
                        </Card>
                      </div>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                    </div>
                  </div>
                )}

                {/* Step 2: Products */}
                {step === 2 && (
<<<<<<< HEAD
                  <div className="space-y-4 sm:space-y-6">
                    {/* Products Card */}
                    <div className="space-y-2 sm:space-y-3 md:space-y-4 flex flex-col">
                      <Card className="rounded-xl shadow-lg border bg-white flex-1 flex flex-col min-h-0 min-w-0">
                        <CardHeader className="p-2 sm:p-4 md:p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 flex-shrink-0">
                          <CardTitle className="text-[13px] sm:text-[14px] md:text-[15px] font-semibold flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            Ürünler
                          </CardTitle>
                          <Button variant="outline" onClick={handleAddItem} size="sm" className="gap-2 h-10 sm:h-10 hover:bg-primary/5 transition-colors min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs w-full sm:w-auto">
=======
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 h-full min-w-0 overflow-x-hidden">
                    <div className="col-span-1 lg:col-span-8 space-y-3 sm:space-y-4 flex flex-col">
                      <Card className="rounded-xl shadow-lg border bg-white flex-1 flex flex-col min-h-0">
                        <CardHeader className="p-4 sm:p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 flex-shrink-0">
                          <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                            Ürünler
                          </CardTitle>
                          <Button variant="outline" onClick={handleAddItem} size="sm" className="gap-2 h-10 hover:bg-primary/5 transition-colors min-h-[36px] sm:min-h-8 text-[11px] sm:text-xs">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            <Plus className="h-4 w-4" />
                            Ürün Ekle
                          </Button>
                        </CardHeader>
<<<<<<< HEAD
                        <CardContent className="p-2 sm:p-4 md:p-6 flex-1 overflow-hidden overflow-x-hidden">
                          <ScrollArea className="h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px] pr-2 sm:pr-4 overflow-x-hidden">
                            <div className="space-y-2 sm:space-y-3 md:space-y-4">
=======
                        <CardContent className="p-6 flex-1 overflow-hidden overflow-x-hidden">
                          <ScrollArea className="h-full min-h-[400px] sm:min-h-[500px] pr-4 overflow-x-hidden">
                            <div className="space-y-3 sm:space-y-4">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                {orderItems.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
<<<<<<< HEAD
                      "p-3 sm:p-4 rounded-xl border transition-all hover:shadow-md",
=======
                      "p-4 rounded-xl border transition-all hover:shadow-md",
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      item.is_manual && "border-primary/50 bg-primary/5",
                      !item.is_manual && item.product_id && "border-green-500/30 bg-green-50/50",
                      !item.product_id && !item.is_manual && "border-gray-200 bg-gray-50/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {index + 1}
                        </div>
                        {item.is_manual && (
                          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 text-[10px]">
                            <Plus className="h-3 w-3 mr-1" />
                            Manuel Ürün
                          </Badge>
                        )}
                        {!item.is_manual && item.product_id && (
                          <Badge variant="outline" className="border-green-500/50 text-green-700 bg-green-50 text-[10px]">
                            <Package className="h-3 w-3 mr-1" />
                            Kayıtlı Ürün
                          </Badge>
                        )}
                      </div>
                      {orderItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
<<<<<<< HEAD
                                className="h-10 w-10 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
=======
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors min-h-[36px] sm:min-h-8 text-[11px] sm:text-xs"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                          title="Ürünü kaldır"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
<<<<<<< HEAD
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
                      <div className="col-span-1 sm:col-span-5 space-y-2">
                        <Label className="text-xs sm:text-sm font-medium" showRequired>
                          Ürün/Hizmet
                        </Label>
                        {item.is_manual ? (
                          <div className="space-y-2">
=======
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-2">
                      <div className="col-span-1 sm:col-span-5 space-y-1.5 sm:space-y-2">
                        <Label className="text-[11px] sm:text-xs font-medium" showRequired>
                          Ürün/Hizmet
                        </Label>
                        {item.is_manual ? (
                          <div className="space-y-1.5 sm:space-y-2">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            <div className="flex gap-2">
                              <Input
                                placeholder="Ürün/Hizmet adı girin"
                                value={item.product_name}
                                onChange={(e) => updateItem(index, "product_name", e.target.value)}
                                required
<<<<<<< HEAD
                                className="flex-1 h-10 sm:h-10 transition-all text-sm min-h-[44px] sm:min-h-0"
=======
                                className="flex-1 h-10 transition-all text-[11px] sm:text-xs"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  updateItem(index, "product_id", null);
                                  updateItem(index, "product_name", "");
                                }}
<<<<<<< HEAD
                                className="h-10 w-10 sm:h-10 sm:w-10 hover:bg-primary/5 transition-colors min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
=======
                                className="h-10 w-10 hover:bg-primary/5 transition-colors min-h-[36px] sm:min-h-8 text-[11px] sm:text-xs"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                              >
                                <RefreshCcw className="h-4 w-4" />
                              </Button>
                            </div>
                            {item.product_name.trim() && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => handleSaveManualProduct(index)}
                                disabled={savingProduct[index] || !item.product_name.trim() || !item.unit_price || item.unit_price <= 0}
<<<<<<< HEAD
                                className="w-full text-sm h-10 sm:h-8 hover:bg-primary/10 transition-colors min-h-[44px] sm:min-h-0"
=======
                                className="w-full text-[11px] sm:text-xs h-8 hover:bg-primary/10 transition-colors"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                              >
                                {savingProduct[index] ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                    Kaydediliyor...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-3 w-3 mr-2" />
                                    Kayıtlı Ürünlere Ekle
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <ProductSelector
                            products={getFilteredProducts(item.category)}
                            value={item.product_id}
                            onSelect={(value) => updateItem(index, "product_id", value)}
                            placeholder="Ürün seçin veya arayın"
                            onRefreshProducts={fetchProducts}
                          />
                        )}
                      </div>

                      <div className="col-span-1 sm:col-span-2 space-y-2">
<<<<<<< HEAD
                        <Label className="text-xs sm:text-sm font-medium">Kategori</Label>
=======
                        <Label className="text-[11px] sm:text-xs font-medium">Kategori</Label>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        <Select
                          value={item.category || "none"}
                          onValueChange={(value) => updateItem(index, "category", value === "none" ? undefined : value)}
                        >
<<<<<<< HEAD
                          <SelectTrigger className="h-10 sm:h-10 transition-all text-[11px] sm:text-xs min-h-[44px] sm:min-h-0">
=======
                          <SelectTrigger className="h-10 transition-all text-[11px] sm:text-xs">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            <SelectValue placeholder="Kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Kategori yok</SelectItem>
                            {PRODUCT_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-1 sm:col-span-1 space-y-2">
<<<<<<< HEAD
                        <Label className="text-xs sm:text-sm font-medium" showRequired>Miktar</Label>
=======
                        <Label className="text-[11px] sm:text-xs font-medium" showRequired>Miktar</Label>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="1"
                          value={item.quantity || ""}
                          onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                          required
<<<<<<< HEAD
                          className="h-10 sm:h-10 transition-all text-sm min-h-[44px] sm:min-h-0"
=======
                          className="h-10 transition-all text-[11px] sm:text-xs"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-2 space-y-2">
<<<<<<< HEAD
                        <Label className="text-xs sm:text-sm font-medium" showRequired>Birim Fiyat</Label>
=======
                        <Label className="text-[11px] sm:text-xs font-medium" showRequired>Birim Fiyat</Label>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={item.unit_price || ""}
                          onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                          required
<<<<<<< HEAD
                          className="h-10 sm:h-10 transition-all text-sm min-h-[44px] sm:min-h-0"
=======
                          className="h-10 transition-all text-[11px] sm:text-xs"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-2 space-y-2">
<<<<<<< HEAD
                        <Label className="text-xs sm:text-sm font-medium">İndirim</Label>
=======
                        <Label className="text-[11px] sm:text-xs font-medium">İndirim</Label>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                        <div className="flex gap-2">
                          <Select
                            value={item.discountType || "amount"}
                            onValueChange={(value) => updateItem(index, "discountType", value)}
                          >
<<<<<<< HEAD
                            <SelectTrigger className="w-[100px] sm:w-[120px] h-10 sm:h-10 text-[11px] sm:text-xs min-h-[44px] sm:min-h-0">
=======
                            <SelectTrigger className="w-[100px] sm:w-[120px] h-10 text-[11px] sm:text-xs">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="amount">Tutar</SelectItem>
                              <SelectItem value="percentage">Yüzde (%)</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step={item.discountType === "percentage" ? "0.01" : "0.01"}
                            min="0"
                            max={item.discountType === "percentage" ? "100" : undefined}
                            placeholder={item.discountType === "percentage" ? "0.00" : "0.00"}
                            value={item.discount || ""}
                            onChange={(e) => updateItem(index, "discount", parseFloat(e.target.value) || 0)}
<<<<<<< HEAD
                                className="flex-1 h-10 sm:h-10 transition-all text-sm min-h-[44px] sm:min-h-0"
                          />
                          {item.discountType === "percentage" && (
                            <span className="flex items-center text-sm text-muted-foreground px-2">
=======
                            className="flex-1 h-10 transition-all text-[11px] sm:text-xs"
                          />
                          {item.discountType === "percentage" && (
                            <span className="flex items-center text-[11px] sm:text-xs text-muted-foreground px-2">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                              %
                            </span>
                          )}
                        </div>
                        {item.discountType === "percentage" && item.discount > 0 && item.quantity > 0 && item.unit_price > 0 && (
<<<<<<< HEAD
                          <p className="text-xs text-muted-foreground">
=======
                          <p className="text-[10px] text-muted-foreground">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            İndirim tutarı: {currencySymbol}{((item.quantity * item.unit_price) * (item.discount / 100)).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(!item.product_id && !item.is_manual) && (
                          <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            Lütfen bir ürün seçin veya manuel ürün ekleyin
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] sm:text-xs text-muted-foreground">Toplam:</span>
                        <span className="text-[11px] sm:text-xs font-bold text-primary">
                          {currencySymbol}{(item.total || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>

<<<<<<< HEAD
                    {/* Summary Card - Below Products */}
                    <Card className="rounded-xl shadow-lg border bg-white flex flex-col">
                      <CardHeader className="p-4 sm:p-6 md:p-8 border-b flex-shrink-0">
                        <CardTitle className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2">
                          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          Özet
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5">
                            <div className="space-y-4">
                              <div className="flex justify-between text-sm">
=======
                    {/* Right Column: Summary */}
                    <div className="col-span-12 lg:col-span-4">
                      <div className="w-full lg:w-96 lg:sticky lg:top-6 h-full">
                        <Card className="rounded-xl shadow-lg border bg-white h-full flex flex-col">
                          <CardHeader className="p-6 border-b flex-shrink-0">
                            <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                              <CreditCard className="h-5 w-5 text-primary" />
                              Özet
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto overflow-x-hidden">
                            <div className="space-y-3">
                              <div className="flex justify-between text-[11px] sm:text-xs">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                <span className="text-muted-foreground">Ara Toplam:</span>
                                <span className="font-medium">{currencySymbol}{validItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0).toFixed(2)}</span>
                              </div>
                              {discountTotal > 0 && (
<<<<<<< HEAD
                                <div className="flex justify-between text-sm text-red-600">
=======
                                <div className="flex justify-between text-[11px] sm:text-xs text-red-600">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                  <span className="text-muted-foreground">İndirim:</span>
                                  <span className="font-medium">-{currencySymbol}{discountTotal.toFixed(2)}</span>
                                </div>
                              )}
<<<<<<< HEAD
                              <div className="flex justify-between text-sm">
=======
                              <div className="flex justify-between text-[11px] sm:text-xs">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                <span className="text-muted-foreground">KDV ({taxRate}%):</span>
                                <span className="font-medium">{currencySymbol}{taxAmount.toFixed(2)}</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between pt-1">
<<<<<<< HEAD
                                <span className="font-semibold text-base">Genel Toplam:</span>
                                <span className="font-bold text-base sm:text-lg text-primary">{currencySymbol}{grandTotal.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="pt-3 border-t space-y-3 sm:space-y-4">
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Ürün Sayısı:</span>
                                <span>{lineItemCount}</span>
                              </div>
                              <div className="flex justify-between text-sm text-muted-foreground">
=======
                                <span className="font-semibold">Genel Toplam:</span>
                                <span className="font-bold text-[11px] sm:text-xs text-primary">{currencySymbol}{grandTotal.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="pt-3 border-t space-y-1.5 sm:space-y-2">
                              <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground">
                                <span>Ürün Sayısı:</span>
                                <span>{lineItemCount}</span>
                              </div>
                              <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                <span>Toplam Miktar:</span>
                                <span>{totalQuantity} adet</span>
                              </div>
                            </div>
<<<<<<< HEAD
                      </CardContent>
                    </Card>
=======
                          </CardContent>
                        </Card>
                      </div>
                    </div>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  </div>
                )}

                {/* Step 3: Final Summary */}
                {step === 3 && (
<<<<<<< HEAD
                  <div className="space-y-4 sm:space-y-6">
                    {/* Order Summary Card */}
                    <Card className="rounded-xl shadow-lg border bg-white flex flex-col">
                        <CardHeader className="p-2 sm:p-4 md:p-6 border-b flex-shrink-0">
                          <CardTitle className="text-[13px] sm:text-[14px] md:text-[15px] font-semibold flex items-center gap-2">
=======
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 sm:gap-2 h-full">
                    <div className="col-span-1 lg:col-span-8 space-y-3 sm:space-y-4 flex flex-col">
                      <Card className="rounded-xl shadow-lg border bg-white flex-1 flex flex-col min-h-0">
                        <CardHeader className="p-4 sm:p-6 border-b flex-shrink-0">
                          <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            <ShoppingCart className="h-4 w-4 text-primary" />
                            Sipariş Özeti
                          </CardTitle>
                        </CardHeader>
<<<<<<< HEAD
                        <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 flex-1 overflow-y-auto overflow-x-hidden">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                            <div className="p-4 sm:p-5 rounded-xl bg-blue-50/50 border border-blue-100">
                              <Label className="text-xs sm:text-sm text-muted-foreground mb-2">Müşteri</Label>
                              <p className="font-semibold text-base sm:text-lg truncate">{orderData.customer_name || "-"}</p>
                            </div>
                            <div className="p-4 sm:p-5 rounded-xl bg-purple-50/50 border border-purple-100">
                              <Label className="text-xs sm:text-sm text-muted-foreground mb-2">Sipariş No</Label>
                              <p className="font-semibold text-base sm:text-lg font-mono truncate">{orderData.order_number || "-"}</p>
=======
                        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto overflow-x-hidden">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                              <Label className="text-[11px] sm:text-xs text-muted-foreground mb-1">Müşteri</Label>
                              <p className="font-semibold text-base">{orderData.customer_name || "-"}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                              <Label className="text-[11px] sm:text-xs text-muted-foreground mb-1">Sipariş No</Label>
                              <p className="font-semibold text-base font-mono">{orderData.order_number || "-"}</p>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Package className="h-4 w-4 text-primary" />
                              Ürün Listesi
                            </h4>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto overflow-x-hidden">
                              {validItems.map((item, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center p-3 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{item.product_name || "Ürün"}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.quantity} adet × {currencySymbol}{(item.unit_price || 0).toFixed(2)}
                                      {item.discount > 0 && (
                                        <>
                                          {" - İndirim: "}
                                          {item.discountType === "percentage" 
                                            ? `${item.discount}% (${currencySymbol}${((item.quantity * item.unit_price) * (item.discount / 100)).toFixed(2)})`
                                            : `${currencySymbol}${item.discount.toFixed(2)}`}
                                        </>
                                      )}
                                    </p>
                                  </div>
                                  <p className="font-bold text-primary ml-4">{currencySymbol}{(item.total || 0).toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
<<<<<<< HEAD
                    </Card>

                    {/* Price Summary Card - Below Order Summary */}
                    <Card className="rounded-xl shadow-lg border bg-white flex flex-col">
                      <CardHeader className="p-4 sm:p-6 md:p-8 border-b flex-shrink-0">
                        <CardTitle className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2">
                          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          Fiyat Özeti
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5">
                            <div className="space-y-4">
                              <div className="flex justify-between text-sm">
=======
                      </Card>
                    </div>

                    <div className="col-span-1 lg:col-span-4">
                      <div className="w-full lg:w-80 lg:sticky lg:top-3 h-full">
                        <Card className="rounded-xl shadow-lg border bg-white h-full flex flex-col">
                          <CardHeader className="p-4 sm:p-6 border-b flex-shrink-0">
                            <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                              Fiyat Özeti
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto overflow-x-hidden">
                            <div className="space-y-3">
                              <div className="flex justify-between text-[11px] sm:text-xs">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                <span className="text-muted-foreground">Ara Toplam:</span>
                                <span className="font-medium">{currencySymbol}{validItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0).toFixed(2)}</span>
                              </div>
                              {discountTotal > 0 && (
<<<<<<< HEAD
                                <div className="flex justify-between text-sm text-red-600">
=======
                                <div className="flex justify-between text-[11px] sm:text-xs text-red-600">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                  <span className="text-muted-foreground">İndirim:</span>
                                  <span className="font-medium">-{currencySymbol}{discountTotal.toFixed(2)}</span>
                                </div>
                              )}
<<<<<<< HEAD
                              <div className="flex justify-between text-sm">
=======
                              <div className="flex justify-between text-[11px] sm:text-xs">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                <span className="text-muted-foreground">KDV ({taxRate}%):</span>
                                <span className="font-medium">{currencySymbol}{taxAmount.toFixed(2)}</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between pt-1">
<<<<<<< HEAD
                                <span className="font-semibold text-base">Genel Toplam:</span>
                                <span className="font-bold text-base sm:text-lg text-primary">{currencySymbol}{grandTotal.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="pt-3 border-t space-y-3 sm:space-y-4">
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Ürün Sayısı:</span>
                                <span>{lineItemCount}</span>
                              </div>
                              <div className="flex justify-between text-sm text-muted-foreground">
=======
                                <span className="font-semibold">Genel Toplam:</span>
                                <span className="font-bold text-[11px] sm:text-xs text-primary">{currencySymbol}{grandTotal.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="pt-3 border-t space-y-1.5 sm:space-y-2">
                              <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground">
                                <span>Ürün Sayısı:</span>
                                <span>{lineItemCount}</span>
                              </div>
                              <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                <span>Toplam Miktar:</span>
                                <span>{totalQuantity} adet</span>
                              </div>
                            </div>
<<<<<<< HEAD
                      </CardContent>
                    </Card>
=======
                          </CardContent>
                        </Card>
                      </div>
                    </div>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  </div>
                )}
              </div>
            </div>

<<<<<<< HEAD
            <div className="p-3 sm:p-4 md:p-6 border-t bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 flex-shrink-0" style={{ width: '100%', maxWidth: '100%' }}>
=======
            <div className="p-4 sm:p-6 border-t bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 flex-shrink-0">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              {step > 1 && (
                <Button 
                  variant="outline" 
                  onClick={() => setStep(step - 1)} 
<<<<<<< HEAD
                  className="gap-2 h-10 sm:h-10 hover:bg-primary/5 transition-colors w-full sm:w-auto order-2 sm:order-1 min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
=======
                  className="gap-2 h-11 sm:h-10 hover:bg-primary/5 transition-colors w-full sm:w-auto order-2 sm:order-1"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                >
                  <ArrowLeft className="h-4 w-4" /> Geri
                </Button>
              )}
              {step < 3 ? (
<<<<<<< HEAD
                <div className={cn("flex-1 flex justify-end w-full sm:w-auto", step > 1 ? "order-1 sm:order-2" : "order-1")}>
=======
                <div className={cn("flex-1 flex justify-end", step > 1 ? "order-1 sm:order-2" : "order-1")}>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  <Button
                    onClick={() => {
                      if (step === 1) {
                        if (!orderData.customer_id) {
                          toast.error("Lütfen müşteri seçin");
                          return;
                        }
                        if (!orderData.order_number) {
                          setOrderNumberTouched(true);
                          toast.error("Lütfen sipariş numarası girin");
                          return;
                        }
                        setStep(2);
                      } else if (step === 2) {
                        const validItems = orderItems.filter(
                          (item) =>
                            (item.product_id || (item.is_manual && item.product_name.trim())) &&
                            item.quantity > 0 &&
                            item.unit_price > 0
                        );
                        if (validItems.length === 0) {
                          toast.error("Lütfen en az bir geçerli ürün ekleyin");
                          return;
                        }
                        setStep(3);
                      }
                    }}
<<<<<<< HEAD
                    className="gap-2 h-10 sm:h-10 bg-primary hover:bg-primary/90 text-white transition-colors w-full sm:w-auto min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
=======
                    className="gap-2 h-11 sm:h-10 bg-primary hover:bg-primary/90 text-white transition-colors w-full sm:w-auto"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                  >
                    İleri <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || disableSubmit} 
<<<<<<< HEAD
                  className="gap-2 h-10 sm:h-10 bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto order-1 min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs"
=======
                  className="gap-2 h-11 sm:h-10 bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto order-1 min-h-[36px] sm:min-h-8 text-[11px] sm:text-xs"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Siparişi Oluştur
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {customerDetails && (
        <CustomerDetailModal
          open={customerDetailModalOpen}
          onOpenChange={setCustomerDetailModalOpen}
          customer={customerDetails}
          onUpdate={handleCustomerUpdate}
        />
      )}
    </>
  );
};
