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
      
      <CardContent className="p-4 sm:p-6 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-1 sm:mb-2",
              isColored ? "text-white/90" : "text-slate-600 dark:text-slate-400"
            )}>
              {title}
            </p>
            <h3 className={cn(
              "text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 transition-all duration-300 group-hover:scale-105",
              isColored ? "text-white" : "text-slate-900 dark:text-slate-100"
            )}>
              {value}
            </h3>
            {trend && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-medium",
                isColored 
                  ? "text-white/95" 
                  : trend.positive 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-red-600 dark:text-red-400"
              )}>
                {trend.positive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span className="font-semibold">{trend.value}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-2.5 sm:p-3.5 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 flex-shrink-0",
            iconBgStyles[variant]
          )}>
            <Icon className={cn(
              "h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300",
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
