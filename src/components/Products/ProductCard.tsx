import { memo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, MoreVertical, Building2, Package, DollarSign, MapPin, User, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CURRENCY_SYMBOLS, type Currency, DEFAULT_CURRENCY } from "@/utils/currency";
import { convertFromTRY } from "@/services/exchangeRateService";

interface ProductCardProps {
  product: any;
  usersMap?: Record<string, string>;
  currency?: Currency;
  onSelect: (product: any) => void;
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
}

export const ProductCard = memo(({ product, usersMap = {}, currency = DEFAULT_CURRENCY, onSelect, onEdit, onDelete }: ProductCardProps) => {
  const stock = Number(product.stock) || 0;
  const minStock = Number(product.min_stock ?? product.minStock ?? 0);
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
        console.error("Currency conversion error:", error);
        setDisplayPrice(basePrice);
      } finally {
        setIsConverting(false);
      }
    };

    convertPrice();
  }, [product.price, currency]);

  return (
    <Card
      className="group hover:shadow-xl transition-all duration-300 cursor-pointer border border-border/60 hover:border-primary/50 flex flex-col h-full overflow-hidden bg-white hover:-translate-y-1 max-w-full"
      onClick={() => onSelect(product)}
    >
      <CardContent className="p-5 sm:p-6 flex flex-col flex-1 gap-4 sm:gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base sm:text-lg truncate text-foreground flex-1" title={product.name}>
                {product.name}
              </h3>
              {isOutOfStock && (
                <Badge variant="destructive" className="flex-shrink-0 whitespace-nowrap text-xs px-2 py-0.5">
                  Tükendi
                </Badge>
              )}
              {isLowStock && !isOutOfStock && (
                <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap text-xs px-2 py-0.5">
                  Düşük
                </Badge>
              )}
            </div>
            {product.category && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <p className="text-xs sm:text-sm text-muted-foreground truncate" title={product.category}>
                  {product.category}
                </p>
              </div>
            )}
            {product.sku && (
              <p className="text-xs text-muted-foreground font-mono mt-1 truncate" title={product.sku}>
                SKU: {product.sku}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:bg-muted/80 rounded-lg" 
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
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                e.stopPropagation();
                onDelete(product);
              }}>
                <Trash2 className="mr-2 h-4 w-4" /> Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Ürün Bilgileri */}
        <div className="space-y-2.5 flex-1 min-h-[60px]">
          {product.sku && (
            <div className="flex items-center gap-2.5 text-xs sm:text-sm bg-gradient-to-r from-muted/40 to-muted/30 rounded-lg px-3.5 py-2.5 border border-muted/60 shadow-sm hover:shadow transition-shadow">
              <Package className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary flex-shrink-0" />
              <span className="truncate text-foreground font-medium font-mono" title={product.sku}>{product.sku}</span>
            </div>
          )}
          {product.description && (
            <div className="flex items-start gap-2.5 text-xs sm:text-sm bg-gradient-to-r from-muted/40 to-muted/30 rounded-lg px-3.5 py-2.5 border border-muted/60 shadow-sm hover:shadow transition-shadow">
              <Package className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2 text-foreground">{product.description}</span>
            </div>
          )}
          {!product.sku && !product.description && (
            <div className="text-xs sm:text-sm text-muted-foreground italic py-3 text-center bg-muted/20 rounded-lg border border-dashed border-muted">
              Ürün bilgisi yok
            </div>
          )}
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/60">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1.5">
              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Stok</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-foreground">{stock}</span>
            <div className="h-4 mt-0.5">
              {minStock > 0 && (
                <span className="text-xs text-muted-foreground">Min: {minStock}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1.5">
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Fiyat</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-foreground">
              {isConverting ? (
                "..."
              ) : (
                `${CURRENCY_SYMBOLS[currency]}${new Intl.NumberFormat(currency === "TRY" ? "tr-TR" : "en-US", { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: 0 
                }).format(displayPrice)}`
              )}
            </span>
            <div className="h-4 mt-0.5"></div>
          </div>
        </div>

        {/* Ek Bilgiler */}
        {(product.location || product.createdBy) && (
          <div className="pt-3 border-t border-border/60 space-y-1.5">
            {product.location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{product.location}</span>
              </div>
            )}
            {product.createdBy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{usersMap[product.createdBy] || "Bilinmeyen Kullanıcı"}</span>
              </div>
            )}
          </div>
        )}
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

