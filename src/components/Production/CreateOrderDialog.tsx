import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createOrder, updateOrder, getOrderItems, OrderItem, Order as FirebaseOrder } from "@/services/firebase/orderService";
import { getCustomerById, Customer as FirebaseCustomer } from "@/services/firebase/customerService";
import { useAuth } from "@/contexts/AuthContext";
import { Timestamp, doc, deleteDoc, addDoc, collection } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
<<<<<<< HEAD
import { Loader2, Plus, Trash2, Package, ShoppingCart, User, CalendarIcon, ArrowLeft, ArrowRight, Save, RefreshCcw, ChevronsUpDown, Pencil, CreditCard } from "lucide-react";
=======
import { Loader2, Plus, Trash2, Package, ShoppingCart, User, CalendarIcon, ArrowLeft, ArrowRight, Save, RefreshCcw, ChevronsUpDown, Pencil } from "lucide-react";
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
import { CustomerCombobox } from "@/components/Customers/CustomerCombobox";
import { cn } from "@/lib/utils";
import { getProducts, Product } from "@/services/firebase/productService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { PRIORITY_OPTIONS } from "@/utils/priority";

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  order?: FirebaseOrder | null; // Edit modu için mevcut sipariş
}

interface ProductItem {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  is_manual?: boolean;
}

type CatalogProduct = {
  id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
};

const PRODUCT_CATEGORIES = [
  "Taşınabilir Güç Paketleri",
  "Kabin Tipi Güç Paketleri",
  "Araç Tipi Güç Paketleri",
  "Endüstriyel Güç Paketleri",
  "Güneş Enerji Sistemleri",
] as const;

const MANUAL_PRODUCT_VALUE = "manual";

const createEmptyItem = (): ProductItem => ({
  product_id: null,
  product_name: "",
  quantity: 1,
  unit: "Adet",
  is_manual: false,
});

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
  const [orderNumberTouched, setOrderNumberTouched] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<FirebaseCustomer | null>(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [customerDetailsError, setCustomerDetailsError] = useState<string | null>(null);
  const [customerDetailModalOpen, setCustomerDetailModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    order_number: "",
    customer_id: "",
    customer_name: "",
    due_date: "",
    priority: 0,
    status: "planned" as FirebaseOrder["status"],
    notes: "",
    deductMaterials: true, // Hammadde düşürme varsayılan açık
  });

  const [productItems, setProductItems] = useState<ProductItem[]>([createEmptyItem()]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const generateOrderNumber = useCallback(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
    const randomSegment = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `PROD-${year}${month}${day}-${randomSegment}`;
  }, []);

  const assignOrderNumber = useCallback(
    (force = false) => {
      setFormData((prev) => {
        if (!force && prev.order_number) {
          return prev;
        }
        return { ...prev, order_number: generateOrderNumber() };
      });
    },
    [generateOrderNumber]
  );

  const resetForm = useCallback(() => {
    setFormData({
      order_number: generateOrderNumber(),
      customer_id: "",
      customer_name: "",
      due_date: "",
      priority: 0,
      status: "planned",
      notes: "",
      deductMaterials: true,
    });
    setProductItems([createEmptyItem()]);
    setOrderNumberTouched(false);
    setCustomerDetails(null);
    setCustomerDetailsError(null);
  }, [generateOrderNumber]);

  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const fetched = await getProducts();
      const mappedProducts = fetched.map((product: { id: string; name: string; sku?: string; category?: string }) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
      }));
      setProducts(mappedProducts);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Ürünler yüklenemedi:", error);
      }
      setProducts([]);
      toast.error("Ürün listesi alınamadı");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Edit modu: Mevcut sipariş bilgilerini yükle
  useEffect(() => {
    if (!open) return;
    
    if (order) {
      const loadOrderData = async () => {
        try {
          const dueDate = order.due_date || order.dueDate;
          
          setFormData({
            order_number: order.order_number || order.orderNumber || "",
            customer_id: order.customer_id || order.customerId || "",
            customer_name: order.customer_name || order.customerName || "",
            due_date: dueDate instanceof Date 
              ? format(dueDate, "yyyy-MM-dd")
              : dueDate instanceof Timestamp
              ? format(dueDate.toDate(), "yyyy-MM-dd")
              : typeof dueDate === "string"
              ? dueDate
              : "",
            priority: order.priority ?? 0,
            status: order.status || "planned",
            notes: order.notes || "",
            deductMaterials: order.deductMaterials || true,
          });
          
          const items = await getOrderItems(order.id);
          if (items.length > 0) {
            setProductItems(
              items.map((item) => ({
                product_id: item.product_id || item.productId || (item.product_name || item.productName ? null : null),
                product_name: item.product_name || item.productName || "",
                quantity: item.quantity || 0,
                unit: "Adet",
                is_manual: !item.product_id && !item.productId,
              }))
            );
          } else {
            setProductItems([createEmptyItem()]);
          }
          
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
      resetForm();
      assignOrderNumber();
    }
    
<<<<<<< HEAD
    // Ürünler lazy loading ile yüklenecek (ProductSelector açıldığında)
  }, [open, order, assignOrderNumber, resetForm]);
=======
      fetchProducts();
      
      const interval = setInterval(() => {
        fetchProducts();
    }, 30000);
      
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
    if (!formData.customer_id) {
      setCustomerDetails(null);
      setCustomerDetailsError(null);
      return;
    }
    fetchCustomerDetails(formData.customer_id);
  }, [formData.customer_id, fetchCustomerDetails]);

  const validItems = useMemo(
    () =>
      productItems.filter(
        (item) =>
          (item.product_id || (item.is_manual && item.product_name.trim())) &&
          item.quantity > 0
      ),
    [productItems]
  );

  const totalQuantity = validItems.reduce((sum, item) => sum + item.quantity, 0);
  const lineItemCount = validItems.length;
  const disableSubmit = loading || !formData.customer_id || !formData.order_number || validItems.length === 0;

  const handleAddItem = () => {
    setProductItems((prev) => [...prev, createEmptyItem()]);
  };

  const getFilteredProducts = useCallback(
    (category?: string) => {
      if (!category) return products;
      return products.filter((product) => product.category === category);
    },
    [products]
  );

  const handleRemoveItem = (index: number) => {
    setProductItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateItem = (index: number, field: keyof ProductItem, value: string | number | null) => {
    setProductItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };

    if (field === "product_id") {
        if (value === MANUAL_PRODUCT_VALUE) {
          current.is_manual = true;
          current.product_id = null;
          current.product_name = "";
        } else if (value) {
          const product = products.find((p) => p.id === value);
          current.is_manual = false;
          current.product_id = String(value);
          current.product_name = product?.name || "";
      } else {
          current.is_manual = false;
          current.product_id = null;
          current.product_name = "";
        }
      } else if (field === "quantity") {
        const numericValue = parseInt(String(value));
        current[field] = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
      } else {
        (current as Record<string, unknown>)[field] = value;
      }

      updated[index] = current;
      return updated;
    });
  };

  const handleCustomerChange = useCallback((customerId: string, customerName: string) => {
    setFormData((prev) => ({
      ...prev,
      customer_id: customerId,
      customer_name: customerName,
    }));
    setCustomerDetails(null);
    setCustomerDetailsError(null);
  }, []);

  const handleCustomerUpdate = () => {
    if (formData.customer_id) {
      fetchCustomerDetails(formData.customer_id);
    }
  };

  const handleRegenerateOrderNumber = () => {
    assignOrderNumber(true);
    setOrderNumberTouched(false);
    toast.success("Yeni sipariş numarası oluşturuldu");
  };

  const handleSubmit = async () => {
    if (!formData.order_number) {
      setOrderNumberTouched(true);
      toast.error("Lütfen sipariş numarası girin");
      return;
    }

    if (!formData.customer_id) {
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
      const dueDate = formData.due_date
        ? Timestamp.fromDate(new Date(formData.due_date))
        : null;

      const orderItems: Omit<OrderItem, "id">[] = validItems.map((item) => ({
        productId: item.product_id || null,
        product_id: item.product_id || null,
        productName: item.product_name || null,
        product_name: item.product_name || null,
        quantity: item.quantity,
        unitPrice: 0,
        unit_price: 0,
        total: 0,
      }));

      if (order) {
        await updateOrder(
          order.id,
          {
            orderNumber: formData.order_number,
            order_number: formData.order_number,
            customerId: formData.customer_id || null,
            customer_id: formData.customer_id || null,
            customerName: formData.customer_name || null,
            customer_name: formData.customer_name || null,
            status: formData.status || "planned",
            totalAmount: 0,
            total_amount: 0,
            itemsCount: orderItems.length,
            items_count: orderItems.length,
            totalQuantity,
            total_quantity: totalQuantity,
            currency: "TRY",
            dueDate,
            due_date: formData.due_date || null,
            notes: formData.notes || null,
            deductMaterials: formData.deductMaterials,
            priority: formData.priority,
          },
          user.id,
          true
        );
        
        const existingItems = await getOrderItems(order.id);
        
        for (const existingItem of existingItems) {
          await deleteDoc(doc(firestore, "orders", order.id, "items", existingItem.id));
        }
        
        const itemsCollection = collection(firestore, "orders", order.id, "items");
        for (const item of orderItems) {
          await addDoc(itemsCollection, {
            productId: item.product_id || null,
            product_id: item.product_id || null,
            productName: item.product_name || null,
            product_name: item.product_name || null,
            quantity: item.quantity,
            unitPrice: 0,
            unit_price: 0,
            total: 0,
          });
        }
        
        toast.success("Üretim siparişi başarıyla güncellendi");
      } else {
      await createOrder({
        orderNumber: formData.order_number,
        order_number: formData.order_number,
        customerId: formData.customer_id || null,
        customer_id: formData.customer_id || null,
        customerName: formData.customer_name || null,
        customer_name: formData.customer_name || null,
          status: formData.status || "planned",
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
          deductMaterials: formData.deductMaterials,
          priority: formData.priority,
      }, orderItems);

      toast.success("Üretim siparişi oluşturuldu");
      }
      
      onSuccess();
      onOpenChange(false);
      
      if (!order) {
        resetForm();
      }
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
<<<<<<< HEAD
      <DialogContent 
        className="!max-w-[100vw] sm:!max-w-[98vw] md:!max-w-[95vw] lg:!max-w-[92vw] xl:!max-w-[90vw] !w-[100vw] sm:!w-[98vw] md:!w-[95vw] lg:!w-[92vw] xl:!w-[90vw] !h-[100vh] sm:!h-[90vh] md:!h-[80vh] !max-h-[100vh] sm:!max-h-[90vh] md:!max-h-[80vh] !left-0 sm:!left-[1vw] md:!left-[2.5vw] lg:!left-[4vw] xl:!left-[5vw] !top-0 sm:!top-[5vh] md:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden overflow-x-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border create-order-dialog"
        style={{ margin: 0 }}
      >
        {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
        <DialogTitle className="sr-only" id="create-production-order-dialog-title">
          {order ? "Üretim Siparişi Düzenle" : "Yeni Üretim Siparişi"}
        </DialogTitle>
        <DialogDescription className="sr-only" id="create-production-order-dialog-description">
          {order ? "Üretim siparişi bilgilerini düzenleyin" : "Üretim için yeni bir sipariş oluşturun"}
        </DialogDescription>
        
        <div className="flex flex-col flex-1 min-h-0" style={{ height: '100%' }}>
            <DialogHeader className="p-2 sm:p-3 md:p-4 pr-10 sm:pr-12 md:pr-16 border-b bg-white flex-shrink-0 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <h2 className="text-[14px] sm:text-[16px] md:text-[18px] font-semibold text-foreground truncate flex-1 min-w-0">
                    {order ? "Üretim Siparişi Düzenle" : "Yeni Üretim Siparişi"}
                  </h2>
                </div>
                <Badge variant="outline" className="text-[10px] px-2 sm:px-3 py-1 flex-shrink-0 w-full sm:w-auto justify-center sm:justify-start">
=======
      <DialogContent className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden overflow-x-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
        {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
        <DialogTitle className="sr-only">
          {order ? "Üretim Siparişi Düzenle" : "Yeni Üretim Siparişi"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {order ? "Üretim siparişi bilgilerini düzenleyin" : "Üretim için yeni bir sipariş oluşturun"}
        </DialogDescription>
        
        <div className="flex flex-col h-full min-h-0">
            <DialogHeader className="p-3 sm:p-4 pr-12 sm:pr-14 md:pr-16 border-b bg-white flex-shrink-0 relative">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <h2 className="text-[16px] sm:text-[18px] font-semibold text-foreground truncate">
                    {order ? "Üretim Siparişi Düzenle" : "Yeni Üretim Siparişi"}
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
                                Sipariş Numarası
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  value={formData.order_number}
                                  onChange={(e) => {
                                    setOrderNumberTouched(true);
=======
                        <CardContent className="p-3 sm:p-4 space-y-1.5 sm:space-y-2 flex-1 overflow-y-auto overflow-x-hidden">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-[11px] sm:text-xs font-medium" showRequired>
                                Sipariş Numarası
                              </Label>
                              <div className="flex gap-2">
              <Input
                value={formData.order_number}
                onChange={(e) => {
                  setOrderNumberTouched(true);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                    setFormData((prev) => ({ ...prev, order_number: e.target.value }));
                                  }}
                                  placeholder="PROD-20240101-0001"
                                  className={cn(
<<<<<<< HEAD
                                    "h-10 sm:h-10 transition-all text-sm min-h-[44px] sm:min-h-0",
                                    !formData.order_number && orderNumberTouched && "border-destructive"
                                  )}
                                  required
                                />
=======
                                    "h-10 transition-all text-[11px] sm:text-xs",
                                    !formData.order_number && orderNumberTouched && "border-destructive"
                                  )}
                required
              />
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
                              {!formData.order_number && orderNumberTouched && (
<<<<<<< HEAD
                                <p className="text-xs text-destructive">
                                  Sipariş numarası gereklidir
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium" showRequired>
=======
                                <p className="text-[11px] sm:text-xs text-destructive">
                                  Sipariş numarası gereklidir
                                </p>
                              )}
            </div>

            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-[11px] sm:text-xs font-medium" showRequired>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                Müşteri
                              </Label>
                              <CustomerCombobox
                                value={formData.customer_id}
                                onChange={handleCustomerChange}
                                placeholder="Müşteri seçin veya ekleyin"
                              />
                              {!formData.customer_id && (
<<<<<<< HEAD
                                <p className="text-xs text-muted-foreground">
                                  Lütfen siparişi ilişkilendireceğiniz müşteriyi seçin
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium" showRequired>
=======
                                <p className="text-[11px] sm:text-xs text-muted-foreground">
                                  Lütfen siparişi ilişkilendireceğiniz müşteriyi seçin
                                </p>
                              )}
            </div>
          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-[11px] sm:text-xs font-medium" showRequired>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                Termin Tarihi
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
                                      !formData.due_date && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.due_date ? (
                                      format(new Date(formData.due_date), "d MMMM yyyy", { locale: tr })
                                    ) : (
                                      "Tarih seçin"
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={formData.due_date ? new Date(formData.due_date) : undefined}
                                    onSelect={(date) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        due_date: date ? date.toISOString().split("T")[0] : "",
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
                                Öncelik
                              </Label>
                              <Select
                                value={formData.priority?.toString() || "0"}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: parseInt(value) || 0 }))}
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium">
=======
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                            <div className="space-y-1.5 sm:space-y-2">
                              <Label className="text-[11px] sm:text-xs font-medium">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                Durum
                              </Label>
                              <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as FirebaseOrder["status"] }))}
                              >
<<<<<<< HEAD
                                <SelectTrigger className="h-10 sm:h-10 text-[11px] sm:text-xs min-h-[44px] sm:min-h-0">
=======
                                <SelectTrigger className="h-10 text-[11px] sm:text-xs">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="planned">Planlanan</SelectItem>
                                  <SelectItem value="in_production">Üretimde</SelectItem>
                                  <SelectItem value="quality_check">Kalite Kontrol</SelectItem>
                                  <SelectItem value="completed">Tamamlandı</SelectItem>
                                  <SelectItem value="on_hold">Beklemede</SelectItem>
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
                              value={formData.notes}
                              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
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
<<<<<<< HEAD
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 sm:p-6 md:p-8">
                            {customerDetailsLoading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
=======
              </Button>
            </div>
                          </CardHeader>
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
                            <CreditCard className="h-5 w-5 text-primary" />
                            Özet
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 flex-1 overflow-y-auto overflow-x-hidden">
                          <div className="pt-3 border-t space-y-3 sm:space-y-4">
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Ürün Sayısı:</span>
                              <span>{lineItemCount}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Toplam Miktar:</span>
                              <span>{totalQuantity} adet</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
=======
                    </div>

                    {/* Right Column: Summary */}
                    <div className="col-span-12 lg:col-span-4">
                      <div className="w-full lg:w-96 lg:sticky lg:top-6 h-full">
                        <Card className="rounded-xl shadow-lg border bg-white h-full flex flex-col">
                          <CardHeader className="p-6 border-b flex-shrink-0">
                            <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                              <Package className="h-5 w-5 text-primary" />
                              Özet
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto overflow-x-hidden">
                            <div className="pt-3 border-t space-y-1.5 sm:space-y-2">
                              <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground">
                                <span>Ürün Sayısı:</span>
                                <span>{lineItemCount}</span>
                              </div>
                              <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground">
                                <span>Toplam Miktar:</span>
                                <span>{totalQuantity} adet</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                    </div>
                  </div>
                )}

                {/* Step 2: Products */}
                {step === 2 && (
<<<<<<< HEAD
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 min-h-0 overflow-x-hidden">
                    <div className="col-span-1 lg:col-span-10 space-y-2 sm:space-y-3 md:space-y-4 flex flex-col min-h-0">
                      <Card className="rounded-xl shadow-lg border bg-white flex-1 flex flex-col min-h-0">
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
                        <CardContent className="p-2 sm:p-4 md:p-6 flex-1 overflow-hidden overflow-x-hidden min-h-0">
                          <ScrollArea className="h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px] pr-2 sm:pr-4 overflow-x-hidden">
                            <div className="space-y-2 sm:space-y-3 md:space-y-4">
=======
                        <CardContent className="p-6 flex-1 overflow-hidden overflow-x-hidden">
                          <ScrollArea className="h-full min-h-[400px] sm:min-h-[500px] pr-4 overflow-x-hidden">
                            <div className="space-y-3 sm:space-y-4">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            {productItems.map((item, index) => (
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
                    {productItems.length > 1 && (
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
=======
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-2">
                                    <div className="col-span-1 sm:col-span-5 space-y-1.5 sm:space-y-2">
                                      <Label className="text-[11px] sm:text-xs font-medium" showRequired>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                        Ürün/Hizmet
                                      </Label>
                                      {item.is_manual ? (
                    <div className="space-y-1.5 sm:space-y-2">
                                          <Input
                                            placeholder="Ürün/Hizmet adı girin"
                                            value={item.product_name}
                                            onChange={(e) => updateItem(index, "product_name", e.target.value)}
                                            required
<<<<<<< HEAD
                                            className="flex-1 h-10 sm:h-10 transition-all text-[11px] sm:text-xs min-h-[44px] sm:min-h-0"
=======
                                            className="flex-1 h-10 transition-all text-[11px] sm:text-xs"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                          />
                                        </div>
                                      ) : (
                                        <ProductSelector
                                          products={getFilteredProducts()}
                        value={item.product_id}
                                          onSelect={(value) => updateItem(index, "product_id", value)}
                                          placeholder="Ürün seçin veya arayın"
                                          onRefreshProducts={fetchProducts}
                                        />
                      )}
                    </div>

                                    <div className="col-span-1 sm:col-span-2 space-y-2">
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
                                        className="h-10 sm:h-10 transition-all text-[11px] sm:text-xs min-h-[44px] sm:min-h-0"
=======
                                        className="h-10 transition-all text-[11px] sm:text-xs"
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                      />
                    </div>

                                    <div className="col-span-1 sm:col-span-2 space-y-2">
<<<<<<< HEAD
                                      <Label className="text-xs sm:text-sm font-medium">Birim</Label>
=======
                                      <Label className="text-[11px] sm:text-xs font-medium">Birim</Label>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                      <Select
                                        value={item.unit}
                                        onValueChange={(value) => updateItem(index, "unit", value)}
                                      >
<<<<<<< HEAD
                                        <SelectTrigger className="h-10 sm:h-10 transition-all text-[11px] sm:text-xs min-h-[44px] sm:min-h-0">
=======
                                        <SelectTrigger className="h-10 transition-all text-[11px] sm:text-xs">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
            ))}
          </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
          </div>

                    {/* Right Column: Summary */}
<<<<<<< HEAD
                    <div className="col-span-12 lg:col-span-2 flex flex-col min-h-0">
                      <div className="w-full lg:w-full lg:sticky lg:top-6 flex-1 flex flex-col min-h-0">
                        <Card className="rounded-xl shadow-lg border bg-white flex-1 flex flex-col min-h-0">
                          <CardHeader className="p-4 sm:p-6 md:p-8 border-b flex-shrink-0">
                            <CardTitle className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2">
                              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                              Özet
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                            <div className="pt-3 border-t space-y-3 sm:space-y-4">
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Ürün Sayısı:</span>
                                <span>{lineItemCount}</span>
                              </div>
                              <div className="flex justify-between text-sm text-muted-foreground">
=======
                    <div className="col-span-12 lg:col-span-4">
                      <div className="w-full lg:w-96 lg:sticky lg:top-6 h-full">
                        <Card className="rounded-xl shadow-lg border bg-white h-full flex flex-col">
                          <CardHeader className="p-6 border-b flex-shrink-0">
                            <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
                              <Package className="h-5 w-5 text-primary" />
                              Özet
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto overflow-x-hidden">
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
                        </Card>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Final Summary */}
                {step === 3 && (
<<<<<<< HEAD
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 h-full">
                    <div className="col-span-1 lg:col-span-10 space-y-2 sm:space-y-3 md:space-y-4 flex flex-col">
                      <Card className="rounded-xl shadow-lg border bg-white flex-1 flex flex-col min-h-0">
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
                              <p className="font-semibold text-base sm:text-lg">{formData.customer_name || "-"}</p>
                            </div>
                            <div className="p-4 sm:p-5 rounded-xl bg-purple-50/50 border border-purple-100">
                              <Label className="text-xs sm:text-sm text-muted-foreground mb-2">Sipariş No</Label>
                              <p className="font-semibold text-base sm:text-lg font-mono">{formData.order_number || "-"}</p>
=======
                        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto overflow-x-hidden">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                              <Label className="text-[11px] sm:text-xs text-muted-foreground mb-1">Müşteri</Label>
                              <p className="font-semibold text-base">{formData.customer_name || "-"}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                              <Label className="text-[11px] sm:text-xs text-muted-foreground mb-1">Sipariş No</Label>
                              <p className="font-semibold text-base font-mono">{formData.order_number || "-"}</p>
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
                                      {item.quantity} {item.unit}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

<<<<<<< HEAD
                    <div className="col-span-1 lg:col-span-2">
                      <div className="w-full lg:w-full lg:sticky lg:top-3 h-full">
                        <Card className="rounded-xl shadow-lg border bg-white h-full flex flex-col">
                          <CardHeader className="p-4 sm:p-6 md:p-8 border-b flex-shrink-0">
                            <CardTitle className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2">
=======
                    <div className="col-span-1 lg:col-span-4">
                      <div className="w-full lg:w-80 lg:sticky lg:top-3 h-full">
                        <Card className="rounded-xl shadow-lg border bg-white h-full flex flex-col">
                          <CardHeader className="p-4 sm:p-6 border-b flex-shrink-0">
                            <CardTitle className="text-[14px] sm:text-[15px] font-semibold flex items-center gap-2">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                              Özet
                            </CardTitle>
                          </CardHeader>
<<<<<<< HEAD
                          <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 flex-1 overflow-y-auto overflow-x-hidden">
                            <div className="pt-3 border-t space-y-3 sm:space-y-4">
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Ürün Sayısı:</span>
                                <span>{lineItemCount}</span>
                              </div>
                              <div className="flex justify-between text-sm text-muted-foreground">
=======
                          <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto overflow-x-hidden">
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
                        </Card>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

<<<<<<< HEAD
            <div className="p-3 sm:p-4 md:p-6 border-t bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 flex-shrink-0">
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
                        if (!formData.customer_id) {
                          toast.error("Lütfen müşteri seçin");
                          return;
                        }
                        if (!formData.order_number) {
                          setOrderNumberTouched(true);
                          toast.error("Lütfen sipariş numarası girin");
                          return;
                        }
                        setStep(2);
                      } else if (step === 2) {
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
                      {order ? "Güncelleniyor..." : "Oluşturuluyor..."}
              </>
            ) : (
              <>
                      <Save className="h-4 w-4" />
                      {order ? "Siparişi Güncelle" : "Siparişi Oluştur"}
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
