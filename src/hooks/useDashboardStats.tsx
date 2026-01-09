import { useQuery } from "@tanstack/react-query";
import { Timestamp } from "firebase/firestore";
import { getCustomers } from "@/services/firebase/customerService";
import { getOrders } from "@/services/firebase/orderService";
import { getProducts } from "@/services/firebase/productService";
import { getTasks } from "@/services/firebase/taskService";
import { getSavedReports, SavedReport } from "@/services/firebase/reportService";

interface SalesQuoteMetadata extends Record<string, unknown> {
  grandTotal?: number | string;
}

export interface DashboardStats {
  customers: {
    total: number;
    trend: number;
  };
  orders: {
    total: number;
    active: number;
    trend: number;
  };
  products: {
    total_stock: number;
    low_stock_count: number;
    trend: number;
  };
  revenue: {
    current_month: number;
    trend: number;
  };
  recent_orders: Array<{
    id: string;
    order_number: string;
    customer_name: string;
    total: number;
    order_date: string;
    status?: string;
  }>;
  low_stock_products: Array<{
    id: string;
    name: string;
    stock: number;
    min_stock: number;
  }>;
  quotes: {
    total_amount: number;
    count: number;
  };
  quote_conversion_rate?: number; // Teklif dönüşüm oranı (%)
}

const calculateTrend = (current: number, previous: number): number => {
  if (isNaN(current) || isNaN(previous)) return 0;
  if (previous === 0) return current > 0 ? 100 : 0;
  const trend = ((current - previous) / previous) * 100;
  return isNaN(trend) ? 0 : trend;
};

const getStartOfMonth = (monthsAgo: number = 0) => {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

const getEndOfMonth = (monthsAgo: number = 0) => {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
};

type DateLike = Date | Timestamp | { toDate: () => Date } | string | null | undefined;

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

const isSalesQuoteMetadata = (metadata: SavedReport["metadata"]): metadata is SalesQuoteMetadata =>
  typeof metadata === "object" && metadata !== null;

const getSalesQuoteAmount = (metadata: SavedReport["metadata"]): number => {
  if (!isSalesQuoteMetadata(metadata)) {
    return 0;
  }
  const rawAmount = metadata.grandTotal;
  if (typeof rawAmount === "number") {
    return rawAmount;
  }
  if (typeof rawAmount === "string") {
    const parsed = Number(rawAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
<<<<<<< HEAD
      // Progressive loading: Önce kritik verileri yükle, sonra diğerlerini
      // İlk önce customers, orders, products yükle (kritik istatistikler için)
      // Daha agresif limit'ler: 50 → 30, 100 → 50
      const [customers, orders, products] = await Promise.all([
        getCustomers().then(c => c.slice(0, 30)), // Son 30 müşteri (50 → 30)
        getOrders().then(o => o.slice(0, 50)), // Son 50 sipariş (100 → 50)
        getProducts().then(p => p.slice(0, 30)), // Son 30 ürün (50 → 30)
      ]);

      // Sonra tasks ve sales quotes yükle (daha az kritik, arka planda)
      // Sales quotes'ı tamamen defer et (non-critical)
      const [tasksResult, salesQuotesResult] = await Promise.allSettled([
        getTasks({ limit: 20 }).then(t => t.slice(0, 20)), // Son 20 görev (30 → 20)
        // Sales quotes'ı daha sonra yükle (non-blocking)
        new Promise<SavedReport[]>((resolve) => {
          setTimeout(() => {
            getSavedReports({ reportType: "sales_quote" })
              .then(resolve)
              .catch(() => resolve([]));
          }, 100); // 100ms delay ile defer et
        }),
      ]);

      const tasks = tasksResult.status === 'fulfilled' ? tasksResult.value : [];
      let salesQuotes: SavedReport[] = [];
      if (salesQuotesResult.status === 'fulfilled') {
        salesQuotes = salesQuotesResult.value;
      } else {
        if (import.meta.env.DEV) {
          console.warn("Sales quotes yüklenemedi, devam ediliyor:", salesQuotesResult.reason);
        }
      }

=======
      // Firebase'den tüm verileri paralel olarak al
      // getSavedReports hata verirse boş array kullan
      let salesQuotes: SavedReport[] = [];
      try {
        salesQuotes = await getSavedReports({ reportType: "sales_quote" });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Sales quotes yüklenemedi, devam ediliyor:", error);
        }
        salesQuotes = [];
      }

      // Performans için: Sadece gerekli verileri al (limit ile)
      const [customers, orders, products, tasks] = await Promise.all([
        getCustomers().then(c => c.slice(0, 100)), // Son 100 müşteri
        getOrders().then(o => o.slice(0, 200)), // Son 200 sipariş
        getProducts().then(p => p.slice(0, 100)), // Son 100 ürün
        getTasks().then(t => t.slice(0, 50)), // Son 50 görev
      ]);

>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      // İstatistikleri hesapla
      const currentMonth = new Date().getMonth();
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const currentYear = new Date().getFullYear();
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const currentMonthOrders = orders.filter((order) => {
        const orderDate = toDateSafe(order.createdAt);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      });

      const previousMonthOrders = orders.filter((order) => {
        const orderDate = toDateSafe(order.createdAt);
        return orderDate.getMonth() === previousMonth && orderDate.getFullYear() === previousYear;
      });

      const currentMonthRevenue = currentMonthOrders.reduce((sum, order) => {
        const amount = Number(order.totalAmount) || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      const previousMonthRevenue = previousMonthOrders.reduce((sum, order) => {
        const amount = Number(order.totalAmount) || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const activeOrders = orders.filter((o) => 
        o.status !== "completed" && o.status !== "cancelled"
      );

      const lowStockProducts = products.filter((p) => {
        const stock = p.stock || 0;
        const minStock = p.minStock || 0;
        return stock <= minStock;
      });

      const recentOrders = orders
        .slice(0, 5)
        .map((order) => ({
          id: order.id,
          order_number: order.orderNumber || order.order_number || "",
          customer_name: order.customerName || order.customer_name || "",
          total: Number(order.totalAmount || order.total_amount || 0) || 0,
          order_date: toDateSafe(order.createdAt).toISOString(),
          status: order.status,
        }));

      // Müşteri trend hesaplama
      const currentMonthCustomers = customers.filter((customer) => {
        const customerDate = toDateSafe(customer.createdAt);
        return customerDate.getMonth() === currentMonth && customerDate.getFullYear() === currentYear;
      });

      const previousMonthCustomers = customers.filter((customer) => {
        const customerDate = toDateSafe(customer.createdAt);
        return customerDate.getMonth() === previousMonth && customerDate.getFullYear() === previousYear;
      });

      // Ürün trend hesaplama (stok değişimi)
      const currentMonthProducts = products.filter((product) => {
        const productDate = toDateSafe(product.createdAt as DateLike);
        return productDate.getMonth() === currentMonth && productDate.getFullYear() === currentYear;
      });

      const previousMonthProducts = products.filter((product) => {
        const productDate = toDateSafe(product.createdAt as DateLike);
        return productDate.getMonth() === previousMonth && productDate.getFullYear() === previousYear;
      });

      const totalQuoteAmount = (Array.isArray(salesQuotes) ? salesQuotes : []).reduce((sum, report) => {
        const amount = getSalesQuoteAmount(report.metadata);
        return sum + amount;
      }, 0);

      // Teklif dönüşüm oranı hesaplama
      // SavedReport'lardan customerId'leri çıkar (metadata'dan veya report data'sından)
      const quoteCustomerIds = new Set<string>();
      salesQuotes.forEach((quote) => {
        // Metadata'dan customerId çıkarmaya çalış
        if (quote.metadata && typeof quote.metadata === 'object') {
          const customerId = quote.metadata && typeof quote.metadata === 'object' && 'customerId' in quote.metadata && typeof quote.metadata.customerId === 'string' ? quote.metadata.customerId : null;
          if (customerId && typeof customerId === 'string') {
            quoteCustomerIds.add(customerId);
          }
        }
      });

      // Orders'dan customerId'leri çıkar
      const orderCustomerIds = new Set<string>();
      orders.forEach((order) => {
        if (order.customerId) {
          orderCustomerIds.add(order.customerId);
        }
      });

      // Teklif verilen firmalar vs sipariş yapan firmalar
      const quotedCompanies = quoteCustomerIds.size;
      const orderedCompanies = Array.from(quoteCustomerIds).filter(id => orderCustomerIds.has(id)).length;
      const conversionRate = quotedCompanies > 0 ? (orderedCompanies / quotedCompanies) * 100 : 0;

      const stats: DashboardStats = {
        customers: {
          total: customers.length,
          trend: calculateTrend(currentMonthCustomers.length, previousMonthCustomers.length),
        },
        orders: {
          total: orders.length,
          active: activeOrders.length,
          trend: calculateTrend(currentMonthOrders.length, previousMonthOrders.length),
        },
        products: {
          total_stock: products.reduce((sum, p) => {
            const stock = Number(p.stock) || 0;
            return sum + (isNaN(stock) ? 0 : stock);
          }, 0),
          low_stock_count: lowStockProducts.length,
          trend: calculateTrend(currentMonthProducts.length, previousMonthProducts.length),
        },
        revenue: {
          current_month: currentMonthRevenue,
          trend: calculateTrend(currentMonthRevenue, previousMonthRevenue),
        },
        recent_orders: recentOrders,
        low_stock_products: lowStockProducts.map((p) => ({
          id: p.id,
          name: p.name,
          stock: p.stock || 0,
          min_stock: p.minStock || 0,
        })),
        quotes: {
          total_amount: totalQuoteAmount,
          count: Array.isArray(salesQuotes) ? salesQuotes.length : 0,
        },
        quote_conversion_rate: conversionRate,
      };

      return stats;
    },
    refetchInterval: 180000, // 3 dakikada bir güncelle (performans için)
    refetchOnWindowFocus: false, // Window focus'ta refetch yapma (performans için)
    refetchOnMount: false, // İlk mount'ta refetch yapma (cache'den göster - performans için)
    retry: 1, // Retry sayısını azalt (performans için)
    retryDelay: 2000, // Retry delay'i azalt (performans için - 2 saniye)
    staleTime: 120000, // 2 dakika stale time (performans için)
<<<<<<< HEAD
    // Placeholder data ekle - hızlı render için
    placeholderData: () => ({
      customers: { total: 0, trend: 0 },
      orders: { total: 0, active: 0, trend: 0 },
      products: { total_stock: 0, low_stock_count: 0, trend: 0 },
      revenue: { current_month: 0, trend: 0 },
      recent_orders: [],
      low_stock_products: [],
      quotes: { total_amount: 0, count: 0 },
      quote_conversion_rate: 0,
    }),
=======
    // Placeholder data kaldırıldı - loading state gösterilecek
    // placeholderData kaldırıldı çünkü 0 değerleri gösteriyordu
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  });
};
