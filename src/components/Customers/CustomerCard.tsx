import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mail, Phone, Edit, Trash2, MoreVertical, Building2, Package, TrendingUp } from "lucide-react";
import { Customer } from "@/services/firebase/customerService";
import { Order } from "@/services/firebase/orderService";
import { formatPhoneForDisplay } from "@/utils/phoneNormalizer";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CustomerCardProps {
  customer: Customer;
  orders: Order[];
  onSelect: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export const CustomerCard = memo(({ customer, orders, onSelect, onDelete }: CustomerCardProps) => {
  const customerOrders = orders.filter(
    (order) => order.customerId === customer.id || order.customer_id === customer.id
  );
  const orderCount = customerOrders.length;
  const totalAmount = customerOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const isActive = orderCount > 0;

  return (
    <Card
      className="group hover:shadow-xl transition-all duration-300 cursor-pointer border border-border/60 hover:border-primary/50 flex flex-col h-full overflow-hidden bg-white hover:-translate-y-1"
      onClick={() => onSelect(customer)}
    >
      <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col flex-1 gap-3 sm:gap-4 md:gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm sm:text-base md:text-lg truncate text-foreground mb-0.5 sm:mb-1" title={customer.name}>
              {customer.name}
            </h3>
            {customer.company && (
              <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5">
                <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate" title={customer.company}>
                  {customer.company}
                </p>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 sm:h-8 sm:w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-muted/80 rounded-lg" 
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onSelect(customer);
              }}>
                <Edit className="mr-2 h-4 w-4" /> Detayları Görüntüle
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                e.stopPropagation();
                onDelete(customer);
              }}>
                <Trash2 className="mr-2 h-4 w-4" /> Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* İletişim Bilgileri */}
        <div className="space-y-2 sm:space-y-2.5 flex-1 min-h-[60px]">
          {customer.email && (
            <div className="flex items-center gap-2 sm:gap-2.5 text-[10px] sm:text-xs md:text-sm bg-gradient-to-r from-muted/40 to-muted/30 rounded-lg px-2.5 sm:px-3 md:px-3.5 py-2 sm:py-2.5 border border-muted/60 shadow-sm hover:shadow transition-shadow">
              <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
              <span className="truncate text-foreground font-medium" title={customer.email}>{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 sm:gap-2.5 text-[10px] sm:text-xs md:text-sm bg-gradient-to-r from-muted/40 to-muted/30 rounded-lg px-2.5 sm:px-3 md:px-3.5 py-2 sm:py-2.5 border border-muted/60 shadow-sm hover:shadow transition-shadow">
              <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
              <span className="text-foreground font-medium">{formatPhoneForDisplay(customer.phone)}</span>
            </div>
          )}
          {!customer.email && !customer.phone && (
            <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground italic py-2 sm:py-3 text-center bg-muted/20 rounded-lg border border-dashed border-muted">
              İletişim bilgisi yok
            </div>
          )}
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-border/60">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground">Sipariş</span>
            </div>
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{orderCount}</span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground">Toplam</span>
            </div>
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
              ₺{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalAmount)}
            </span>
          </div>
        </div>

        {/* Durum Badge */}
        <div className="pt-2 sm:pt-3 border-t border-border/60">
          <Badge 
            variant={isActive ? "default" : "secondary"} 
            className={cn(
              "rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 w-full justify-center text-[10px] sm:text-xs",
              isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-muted/60 border-muted"
            )}
          >
            {isActive ? "Aktif" : "Pasif"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.customer.id === nextProps.customer.id &&
    prevProps.customer.name === nextProps.customer.name &&
    prevProps.customer.email === nextProps.customer.email &&
    prevProps.customer.phone === nextProps.customer.phone &&
    prevProps.customer.company === nextProps.customer.company &&
    prevProps.orders.length === nextProps.orders.length &&
    prevProps.orders.every((order, index) => {
      const nextOrder = nextProps.orders[index];
      return order.id === nextOrder?.id && order.totalAmount === nextOrder?.totalAmount;
    })
  );
});

CustomerCard.displayName = "CustomerCard";

