import { memo } from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "info";
  onClick?: () => void;
  clickable?: boolean;
}

export const StatCard = memo(({ title, value, icon: Icon, trend, variant = "default", onClick, clickable = false }: StatCardProps) => {
  const variantStyles = {
    default: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700",
    primary: "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25",
    success: "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/25",
    warning: "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 shadow-lg shadow-amber-500/25",
    info: "bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/25",
  };

  const iconBgStyles = {
    default: "bg-slate-100 dark:bg-slate-800",
    primary: "bg-white/20 backdrop-blur-sm",
    success: "bg-white/20 backdrop-blur-sm",
    warning: "bg-white/20 backdrop-blur-sm",
    info: "bg-white/20 backdrop-blur-sm",
  };

  const iconColorStyles = {
    default: "text-slate-600 dark:text-slate-300",
    primary: "text-white",
    success: "text-white",
    warning: "text-white",
    info: "text-white",
  };

  const isColored = variant !== "default";

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1 group relative w-full",
        variantStyles[variant],
        clickable && "cursor-pointer hover:scale-[1.02]",
        "border-0"
      )}
      onClick={onClick}
    >
      {/* Decorative gradient overlay */}
      {isColored && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
      
      <CardContent className="p-3 sm:p-4 lg:p-3 xl:p-4 relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-[9px] sm:text-[10px] lg:text-[9px] xl:text-[10px] font-semibold uppercase tracking-wider mb-1",
              isColored ? "text-white/90" : "text-slate-600 dark:text-slate-400",
              "truncate"
            )}>
              {title}
            </p>
            <h3 className={cn(
              "text-xl sm:text-2xl lg:text-xl xl:text-2xl font-bold mb-1.5 sm:mb-2 transition-all duration-300 group-hover:scale-105",
              isColored ? "text-white" : "text-slate-900 dark:text-slate-100",
              "truncate"
            )}>
              {value}
            </h3>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-[10px] sm:text-xs lg:text-[10px] xl:text-xs font-medium",
                isColored 
                  ? "text-white/95" 
                  : trend.positive 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-red-600 dark:text-red-400"
              )}>
                {trend.positive ? (
                  <TrendingUp className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <TrendingDown className="h-3 w-3 flex-shrink-0" />
                )}
                <span className="font-semibold truncate">{trend.value}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-1.5 sm:p-2 lg:p-1.5 xl:p-2 rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 flex-shrink-0",
            iconBgStyles[variant]
          )}>
            <Icon className={cn(
              "h-4 w-4 sm:h-5 sm:w-5 lg:h-4 lg:w-4 xl:h-5 xl:w-5 transition-transform duration-300",
              iconColorStyles[variant]
            )} />
          </div>
        </div>
      </CardContent>
      
      {/* Bottom accent line */}
      {isColored && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30" />
      )}
    </Card>
  );
});

StatCard.displayName = "StatCard";
