import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mail, Phone, Edit, Trash2, MoreVertical, Building2, Package, TrendingUp, User } from "lucide-react";
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
  usersMap?: Record<string, string>;
  canDelete?: boolean;
}

export const CustomerCard = memo(({ customer, orders, onSelect, onDelete, usersMap = {}, canDelete = false }: CustomerCardProps) => {
  const customerOrders = orders.filter(
    (order) => order.customerId === customer.id || order.customer_id === customer.id
  );
  const orderCount = customerOrders.length;
  const totalAmount = customerOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const isActive = orderCount > 0;

  return (
    <Card
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer border border-border/80 hover:border-primary/60 flex flex-col h-full overflow-hidden bg-card"
      onClick={() => onSelect(customer)}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col flex-1 gap-4 min-h-[280px]">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-start gap-2">
              <h3 className="font-semibold text-base leading-tight text-foreground truncate" title={customer.name}>
                {customer.name}
              </h3>
            </div>
            {customer.company && (
              <div className="flex items-center gap-1.5 min-h-[20px]">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
                <p className="text-xs text-muted-foreground truncate" title={customer.company}>
                  {customer.company}
                </p>
              </div>
            )}
            {!customer.company && (
              <div className="min-h-[20px]"></div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-muted rounded-md" 
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onSelect(customer);
              }}>
                <Edit className="mr-2 h-4 w-4" /> Detayları Görüntüle
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                  e.stopPropagation();
                  onDelete(customer);
                }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Sil
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Contact Information */}
        <div className="space-y-2 flex-1">
          {customer.email && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/40 rounded-md border border-border/50 min-h-[44px]">
              <Mail className="h-4 w-4 text-primary/70 flex-shrink-0" />
              <span className="text-sm text-foreground truncate font-medium flex-1" title={customer.email}>
                {customer.email}
              </span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/40 rounded-md border border-border/50 min-h-[44px]">
              <Phone className="h-4 w-4 text-primary/70 flex-shrink-0" />
              <span className="text-sm text-foreground font-medium flex-1">{formatPhoneForDisplay(customer.phone)}</span>
            </div>
          )}
          {!customer.email && !customer.phone && (
            <div className="text-xs text-muted-foreground/70 italic py-3 text-center bg-muted/20 rounded-md border border-dashed border-border/50 min-h-[44px] flex items-center justify-center">
              İletişim bilgisi yok
            </div>
          )}
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
          <div className="flex flex-col gap-1.5 min-h-[60px] justify-center">
            <div className="flex items-center gap-1.5 min-h-[20px]">
              <Package className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">Sipariş</span>
            </div>
            <span className="text-xl font-bold text-foreground leading-none">{orderCount}</span>
          </div>
          <div className="flex flex-col gap-1.5 min-h-[60px] justify-center">
            <div className="flex items-center gap-1.5 min-h-[20px]">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">Toplam</span>
            </div>
            <span className="text-xl font-bold text-foreground leading-none">
              ₺{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalAmount)}
            </span>
          </div>
        </div>

        {/* Footer Section */}
        <div className="pt-2 border-t border-border/60 space-y-2 mt-auto">
          {/* Status Badge */}
          <Badge 
            variant={isActive ? "default" : "secondary"} 
            className={cn(
              "w-full justify-center text-xs font-medium py-1.5",
              isActive 
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" 
                : "bg-muted/60 text-muted-foreground border-border/50"
            )}
          >
            {isActive ? "Aktif Müşteri" : "Pasif Müşteri"}
          </Badge>
          
          {/* Created By */}
          {customer.createdBy && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 min-h-[20px]">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{usersMap[customer.createdBy] || "Bilinmeyen"}</span>
            </div>
          )}
          {!customer.createdBy && (
            <div className="min-h-[20px]"></div>
          )}
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
