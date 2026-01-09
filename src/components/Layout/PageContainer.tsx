import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  headerActions?: ReactNode;
}

/**
 * Standart sayfa container'ı - tüm sayfalar için tutarlı spacing ve layout sağlar
 */
export const PageContainer = ({ 
  children, 
  className,
  title,
  description,
  headerActions
}: PageContainerProps) => {
  return (
    <div className={cn("w-full", className)}>
      {(title || description || headerActions) && (
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-[16px] sm:text-[18px] font-semibold text-foreground mb-1 leading-tight">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                {description}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex-shrink-0 flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}
      <div className="space-y-3 sm:space-y-4">
        {children}
      </div>
    </div>
  );
};

