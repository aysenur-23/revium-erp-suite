import { memo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, MoreVertical, Building2, Package, DollarSign, MapPin, User, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CURRENCY_SYMBOLS, type Currency, DEFAULT_CURRENCY } from "@/utils/currency";
import { convertFromTRY } from "@/services/exchangeRateService";
import { Product } from "@/services/firebase/productService";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  usersMap?: Record<string, string>;
  currency?: Currency;
  onSelect: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  canDelete?: boolean;
}

export const ProductCard = memo(({ product, usersMap = {}, currency = DEFAULT_CURRENCY, onSelect, onEdit, onDelete, canDelete = false }: ProductCardProps) => {
  const stock = Number(product.stock) || 0;
  const minStock = Number(product.minStock ?? 0);
  const isLowStock = stock > 0 && stock <= minStock;
  const isOutOfStock = stock === 0;
  const [displayPrice, setDisplayPrice] = useState<number>(product.price || 0);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const convertPrice = async () => {
      const basePrice = product.price || 0;
      if (currency === "TRY") {
        setDisplayPrice(basePrice);
        return;
      }

      setIsConverting(true);
      try {
        const convertedPrice = await convertFromTRY(basePrice, currency);
        setDisplayPrice(convertedPrice);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Currency conversion error:", error);
        }
        setDisplayPrice(basePrice);
      } finally {
        setIsConverting(false);
      }
    };

    convertPrice();
  }, [product.price, currency]);

  return (
    <Card
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer border border-border/80 hover:border-primary/60 flex flex-col h-full overflow-hidden bg-card"
      onClick={() => onSelect(product)}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col flex-1 gap-4 min-h-[280px]">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-semibold text-base leading-tight text-foreground break-words" title={product.name}>
                {product.name}
              </h3>
              {isOutOfStock && (
                <Badge variant="destructive" className="flex-shrink-0 whitespace-nowrap text-xs px-2 py-0.5">
                  Tükendi
                </Badge>
              )}
              {isLowStock && !isOutOfStock && (
                <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap text-xs px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                  Düşük
                </Badge>
              )}
            </div>
            {product.category ? (
              <div className="flex items-center gap-1.5 min-h-[20px]">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
                <p className="text-xs text-muted-foreground truncate" title={product.category}>
                  {product.category}
                </p>
              </div>
            ) : (
              <div className="min-h-[20px]"></div>
            )}
            {product.sku ? (
              <p className="text-xs text-muted-foreground/70 font-mono truncate min-h-[20px]" title={product.sku}>
                SKU: {product.sku}
              </p>
            ) : (
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
                onSelect(product);
              }}>
                <Edit className="mr-2 h-4 w-4" /> Detayları Görüntüle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEdit(product);
              }}>
                <Edit className="mr-2 h-4 w-4" /> Düzenle
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                  e.stopPropagation();
                  onDelete(product);
                }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Sil
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Product Information */}
        <div className="space-y-2 flex-1">
          {product.description && (
            <div className="px-3 py-2.5 bg-muted/40 rounded-md border border-border/50 min-h-[44px]">
              <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            </div>
          )}
          {!product.description && (
            <div className="text-xs text-muted-foreground/70 italic py-3 text-center bg-muted/20 rounded-md border border-dashed border-border/50 min-h-[44px] flex items-center justify-center">
              Açıklama yok
            </div>
          )}
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
          <div className="flex flex-col gap-1.5 min-h-[60px] justify-center">
            <div className="flex items-center gap-1.5 min-h-[20px]">
              <Package className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">Stok</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-bold text-foreground leading-none">{stock}</span>
              {minStock > 0 && (
                <span className="text-xs text-muted-foreground/70">Min: {minStock}</span>
              )}
              {minStock === 0 && (
                <span className="text-xs text-transparent">Min: 0</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 min-h-[60px] justify-center">
            <div className="flex items-center gap-1.5 min-h-[20px]">
              <span className="text-xs font-medium text-muted-foreground">Fiyat</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-bold text-foreground leading-none">
                {isConverting ? (
                  "..."
                ) : (
                  `${CURRENCY_SYMBOLS[currency]}${new Intl.NumberFormat(currency === "TRY" ? "tr-TR" : "en-US", { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 0 
                  }).format(displayPrice)}`
                )}
              </span>
              <span className="text-xs text-transparent">Min: 0</span>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="pt-2 border-t border-border/60 space-y-2 mt-auto">
          {/* Stock Status Badge */}
          <Badge 
            variant={isOutOfStock ? "destructive" : isLowStock ? "secondary" : "default"}
            className={cn(
              "w-full justify-center text-xs font-medium py-1.5",
              isOutOfStock && "bg-destructive/10 text-destructive border-destructive/20",
              isLowStock && !isOutOfStock && "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
              !isOutOfStock && !isLowStock && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
            )}
          >
            {isOutOfStock ? "Stokta Yok" : isLowStock ? "Stok Düşük" : "Stokta Var"}
          </Badge>
          
          {/* Additional Info */}
          <div className="space-y-1">
            {product.location ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 min-h-[20px]">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{product.location}</span>
              </div>
            ) : (
              <div className="min-h-[20px]"></div>
            )}
            {product.createdBy ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 min-h-[20px]">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{usersMap[product.createdBy] || "Bilinmeyen"}</span>
              </div>
            ) : (
              <div className="min-h-[20px]"></div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.stock === nextProps.product.stock &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.category === nextProps.product.category &&
    prevProps.product.sku === nextProps.product.sku &&
    prevProps.product.createdBy === nextProps.product.createdBy &&
    prevProps.usersMap?.[prevProps.product.createdBy] === nextProps.usersMap?.[nextProps.product.createdBy] &&
    prevProps.currency === nextProps.currency
  );
});

ProductCard.displayName = "ProductCard";
