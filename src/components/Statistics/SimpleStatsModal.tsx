import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, BarChart3 } from "lucide-react";
<<<<<<< HEAD
=======
import { VisuallyHidden } from "@/components/ui/visually-hidden";
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

interface SimpleStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  stats: {
    label: string;
    value: string | number;
    icon?: typeof TrendingUp;
    trend?: {
      value: string;
      positive: boolean;
    };
  }[];
}

export const SimpleStatsModal = ({ open, onOpenChange, title, stats }: SimpleStatsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[80vw] max-h-[85vh] overflow-y-auto">
<<<<<<< HEAD
        {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
        <DialogTitle className="sr-only">
          {title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          İstatistik detayları
        </DialogDescription>
=======
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>İstatistik detayları</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        
        <div className="space-y-4">
          <div>
            <h2 className="text-[16px] sm:text-[18px] font-bold mb-2">{title}</h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Detaylı istatistik bilgileri</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon || BarChart3;
              return (
                <Card key={index} className="border-2 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-[11px] sm:text-xs font-medium">{stat.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[11px] sm:text-xs font-bold mb-2">{stat.value}</div>
                    {stat.trend && (
                      <div className={`flex items-center gap-1 text-[11px] sm:text-xs ${
                        stat.trend.positive ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {stat.trend.positive ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span>{stat.trend.value}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 border border-dashed">
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              💡 Daha detaylı raporlar için <span className="font-semibold text-primary">Raporlar</span> sayfasını ziyaret edebilirsiniz.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

