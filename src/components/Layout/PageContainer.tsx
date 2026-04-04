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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground">
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
      <div className="space-y-4 sm:space-y-6">
        {children}
      </div>
    </div>
  );
};

