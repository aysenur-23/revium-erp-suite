import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, FileText, Package, Users, CheckSquare, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getTasks } from "@/services/firebase/taskService";
import { getOrders } from "@/services/firebase/orderService";
import { getCustomers } from "@/services/firebase/customerService";
import { getProducts } from "@/services/firebase/productService";
import { Timestamp } from "firebase/firestore";

const navigationItems = [
  { label: "Dashboard", path: "/" },
  { label: "Üretim Siparişleri", path: "/production" },
  { label: "Görevler", path: "/tasks" },
  { label: "Siparişler", path: "/orders" },
  { label: "Müşteriler", path: "/customers" },
  { label: "Ürünler", path: "/products" },
  { label: "Hammaddeler", path: "/raw-materials" },
  { label: "Raporlar", path: "/reports" },
  { label: "Ayarlar", path: "/settings" },
  { label: "Admin Paneli", path: "/admin" },
];

interface SearchResult {
  id: string;
  type: "task" | "order" | "customer" | "product" | "page";
  title: string;
  subtitle?: string;
  path: string;
  icon: typeof FileText;
}

export const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        event.key &&
        ((event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) ||
        (event.key.toLowerCase() === "f" && event.ctrlKey))
      ) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  // Global arama
  useEffect(() => {
    if (!open || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setSearching(true);
      try {
        const query = searchQuery.toLocaleLowerCase('tr-TR').trim();
        const results: SearchResult[] = [];

        // Sayfa araması
        const pageMatches = navigationItems.filter(
          (item) => item.label.toLocaleLowerCase('tr-TR').includes(query)
        );
        pageMatches.forEach((item) => {
          results.push({
            id: `page-${item.path}`,
            type: "page",
            title: item.label,
            path: item.path,
            icon: FileText,
          });
        });

        // Veri araması (sadece query 2 karakterden fazlaysa)
        if (query.length >= 2) {
          try {
            const [tasks, orders, customers, products] = await Promise.all([
              getTasks().catch(() => []),
              getOrders().catch(() => []),
              getCustomers().catch(() => []),
              getProducts().catch(() => []),
            ]);

            // Görev araması
            tasks
              .filter((task) => task.title.toLocaleLowerCase('tr-TR').includes(query))
              .slice(0, 5)
              .forEach((task) => {
                results.push({
                  id: `task-${task.id}`,
                  type: "task",
                  title: task.title,
                  subtitle: `Görev • ${task.status}`,
                  path: `/tasks?taskId=${task.id}`,
                  icon: CheckSquare,
                });
              });

            // Sipariş araması
            orders
              .filter(
                (order) =>
                  order.orderNumber?.toLocaleLowerCase('tr-TR').includes(query) ||
                  order.customerName?.toLocaleLowerCase('tr-TR').includes(query)
              )
              .slice(0, 5)
              .forEach((order) => {
                results.push({
                  id: `order-${order.id}`,
                  type: "order",
                  title: order.orderNumber || `Sipariş #${order.id.slice(0, 8)}`,
                  subtitle: `Sipariş • ${order.customerName || "Müşteri yok"}`,
                  path: `/orders?orderId=${order.id}`,
                  icon: ShoppingCart,
                });
              });

            // Müşteri araması
            customers
              .filter(
                (customer) =>
                  customer.name.toLocaleLowerCase('tr-TR').includes(query) ||
                  customer.company?.toLocaleLowerCase('tr-TR').includes(query) ||
                  customer.email?.toLocaleLowerCase('tr-TR').includes(query)
              )
              .slice(0, 5)
              .forEach((customer) => {
                results.push({
                  id: `customer-${customer.id}`,
                  type: "customer",
                  title: customer.name,
                  subtitle: `Müşteri • ${customer.company || customer.email || ""}`,
                  path: `/customers?customerId=${customer.id}`,
                  icon: Users,
                });
              });

            // Ürün araması
            products
              .filter(
                (product) =>
                  product.name.toLocaleLowerCase('tr-TR').includes(query) ||
                  product.sku?.toLocaleLowerCase('tr-TR').includes(query) ||
                  product.code?.toLocaleLowerCase('tr-TR').includes(query)
              )
              .slice(0, 5)
              .forEach((product) => {
                results.push({
                  id: `product-${product.id}`,
                  type: "product",
                  title: product.name,
                  subtitle: `Ürün • ${product.sku || product.code || ""}`,
                  path: `/products?productId=${product.id}`,
                  icon: Package,
                });
              });
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error("Search error:", error);
            }
          }
        }

        setSearchResults(results);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Global search error:", error);
        }
      } finally {
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery, open]);

  const runCommand = (command: () => void) => {
    command();
    setOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Sonuçları grupla
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      Sayfalar: [],
      Görevler: [],
      Siparişler: [],
      Müşteriler: [],
      Ürünler: [],
    };

    searchResults.forEach((result) => {
      if (result.type === "page") {
        groups.Sayfalar.push(result);
      } else if (result.type === "task") {
        groups.Görevler.push(result);
      } else if (result.type === "order") {
        groups.Siparişler.push(result);
      } else if (result.type === "customer") {
        groups.Müşteriler.push(result);
      } else if (result.type === "product") {
        groups.Ürünler.push(result);
      }
    });

    return groups;
  }, [searchResults]);

  return (
    <>
      <Button
        variant="outline"
        className="justify-start gap-3 text-muted-foreground w-full touch-manipulation min-h-[44px] sm:min-h-[48px] h-11 sm:h-12 bg-background/50 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 hover:bg-background transition-all duration-200 shadow-sm hover:shadow-md group"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-sm sm:text-base flex-1 text-left truncate">
          <span className="hidden sm:inline">Ara... (Ctrl+K)</span>
          <span className="sm:hidden">Ara...</span>
        </span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-60 pointer-events-none">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setSearchQuery("");
          setSearchResults([]);
        }
      }}>
        <DialogContent className="overflow-hidden p-0 shadow-lg">
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>Arama</DialogTitle>
              <DialogDescription>Site içi arama yapın</DialogDescription>
            </DialogHeader>
          </VisuallyHidden>
          <Command 
            shouldFilter={false}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
          >
            <CommandInput 
              placeholder="Sayfa, görev, sipariş, müşteri veya ürün ara..." 
              className="text-base sm:text-sm"
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-[70vh] sm:max-h-[60vh]">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchQuery.trim() ? (
                <>
                  {Object.entries(groupedResults).map(([groupName, items]) => {
                    if (items.length === 0) return null;
                    return (
                      <CommandGroup key={groupName} heading={groupName}>
                        {items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <CommandItem
                              key={item.id}
                              value={item.id}
                              onSelect={() => runCommand(() => navigate(item.path))}
                              className="touch-manipulation min-h-[44px] text-base sm:text-sm"
                            >
                              <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span>{item.title}</span>
                                {item.subtitle && (
                                  <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                                )}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    );
                  })}
                  {searchResults.length === 0 && (
                    <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
                  )}
                </>
              ) : (
                <CommandGroup heading="Sayfalar">
                  {navigationItems.map((item) => (
                    <CommandItem 
                      key={item.path} 
                      value={item.path}
                      onSelect={() => runCommand(() => navigate(item.path))}
                      className="touch-manipulation min-h-[44px] text-base sm:text-sm"
                    >
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
};
