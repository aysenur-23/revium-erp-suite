import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ProductionStatusBarChartProps {
  data: {
    planned: number;
    in_production: number;
    quality_check: number;
    completed: number;
    on_hold: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  planned: "Planlandı",
  in_production: "Üretimde",
  quality_check: "Kalite Kontrol",
  completed: "Tamamlandı",
  on_hold: "Beklemede",
};

export const ProductionStatusBarChart = ({ data }: ProductionStatusBarChartProps) => {
  const chartData = [
    { name: STATUS_LABELS.planned, value: data.planned, fill: "hsl(var(--primary))" },
    { name: STATUS_LABELS.in_production, value: data.in_production, fill: "hsl(var(--warning))" },
    { name: STATUS_LABELS.quality_check, value: data.quality_check, fill: "hsl(var(--accent))" },
    { name: STATUS_LABELS.completed, value: data.completed, fill: "hsl(var(--success))" },
    { name: STATUS_LABELS.on_hold, value: data.on_hold, fill: "hsl(var(--muted))" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg font-semibold">Üretim Durumu Dağılımı</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={300} minHeight={250}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="value" name="Sipariş Sayısı" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
