import { ReactNode, useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface ResponsiveTableColumn<T = any> {
  key: string;
  header: string | ReactNode;
  accessor?: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  hideOnMobile?: boolean;
  priority?: "high" | "medium" | "low"; // Öncelik: high = her zaman göster, medium = tablet+ göster, low = desktop+ göster
  minWidth?: number; // Minimum genişlik (px)
  sticky?: boolean; // Sticky column (solda sabit kalır)
}

export interface ResponsiveTableProps<T = any> {
  data: T[];
  columns: ResponsiveTableColumn<T>[];
  renderCard?: (row: T, index: number) => ReactNode;
  emptyMessage?: string;
  className?: string;
  tableClassName?: string;
  cardClassName?: string;
  onRowClick?: (row: T, index: number) => void;
  keyExtractor?: (row: T, index: number) => string;
}

export function ResponsiveTable<T = any>({
  data,
  columns,
  renderCard,
  emptyMessage = "Veri bulunamadı",
  className,
  tableClassName,
  cardClassName,
  onRowClick,
  keyExtractor,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  // Window width state for responsive column visibility - Hook'lar her zaman en üstte olmalı
  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth;
    }
    return 1024; // Default to desktop
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Önemli sütunları belirle (priority'ye göre)
  const visibleColumns = useMemo(() => {
    // Mobil (< 640px): Sadece high priority
    if (windowWidth < 640) {
      return columns.filter(col => col.priority === "high" || !col.priority);
    }
    
    // Tablet (640px - 1024px): High + Medium priority
    if (windowWidth < 1024) {
      return columns.filter(col => 
        col.priority === "high" || 
        col.priority === "medium" || 
        !col.priority
      );
    }
    
    // Desktop (1024px+): Tüm sütunlar
    return columns;
  }, [columns, windowWidth]);

  // Mobile'da kart görünümü
  if (isMobile && renderCard) {
    if (data.length === 0) {
      return (
        <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
          <p className="text-sm">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className={cn("space-y-3 w-full max-w-full overflow-hidden", className)}>
        {data.map((row, index) => (
          <div
            key={keyExtractor ? keyExtractor(row, index) : `row-${index}`}
            onClick={() => onRowClick?.(row, index)}
            className={cn(
              onRowClick && "cursor-pointer",
              cardClassName
            )}
          >
            {renderCard(row, index)}
          </div>
        ))}
      </div>
    );
  }

  // Tablet+ desktop'ta tablo görünümü
  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }
  const hasStickyColumn = visibleColumns.some(col => col.sticky);

  return (
    <div className={cn(
      "w-full max-w-full overflow-hidden",
      className
    )}>
      <div className={cn(
        "w-full overflow-x-auto overflow-y-visible",
        "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
        "hover:scrollbar-thumb-muted-foreground/30",
        "-webkit-overflow-scrolling-touch",
        "overscroll-behavior-contain"
      )}>
        <div className="min-w-full inline-block">
          <Table className={cn("w-full table-auto", tableClassName)}>
            <TableHeader>
              <TableRow>
                {visibleColumns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      column.priority === "low" && "hidden lg:table-cell",
                      column.priority === "medium" && "hidden md:table-cell",
                      column.sticky && "sticky left-0 z-20 bg-background",
                      column.headerClassName,
                      !column.headerClassName?.includes("text-") && "text-left",
                      column.minWidth && `min-w-[${column.minWidth}px]`,
                      "px-4"
                    )}
                    style={{
                      minWidth: column.minWidth ? `${column.minWidth}px` : undefined,
                      ...(column.sticky && {
                        position: "sticky",
                        left: 0,
                        zIndex: 20,
                        backgroundColor: "var(--background)",
                      }),
                    }}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow
                  key={keyExtractor ? keyExtractor(row, index) : `row-${index}`}
                  onClick={() => onRowClick?.(row, index)}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/50",
                    hasStickyColumn && "relative"
                  )}
                >
                  {visibleColumns.map((column) => {
                    const content = column.accessor ? column.accessor(row) : (row as any)[column.key];
                    return (
                      <TableCell
                        key={column.key}
                        className={cn(
                          column.priority === "low" && "hidden lg:table-cell",
                          column.priority === "medium" && "hidden md:table-cell",
                          column.sticky && "sticky left-0 z-10 bg-background",
                          column.cellClassName,
                          column.className,
                          !column.cellClassName && !column.className?.includes("text-") && "text-left",
                          "px-4 py-1.5 sm:py-2"
                        )}
                        style={{
                          minWidth: column.minWidth ? `${column.minWidth}px` : undefined,
                          ...(column.sticky && {
                            position: "sticky",
                            left: 0,
                            zIndex: 10,
                            backgroundColor: "var(--background)",
                          }),
                        }}
                      >
                        {content}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
