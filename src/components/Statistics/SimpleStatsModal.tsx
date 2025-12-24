import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, BarChart3 } from "lucide-react";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

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
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>İstatistik detayları</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>
        
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground">Detaylı istatistik bilgileri</p>
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
                      <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">{stat.value}</div>
                    {stat.trend && (
                      <div className={`flex items-center gap-1 text-sm ${
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
            <p className="text-sm text-muted-foreground">
              💡 Daha detaylı raporlar için <span className="font-semibold text-primary">Raporlar</span> sayfasını ziyaret edebilirsiniz.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

