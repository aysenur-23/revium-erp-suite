import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface TaskStatusPieChartProps {
  data: {
    pending: number;
    in_progress: number;
    completed: number;
    approved: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Yapılacak",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  approved: "Onaylandı",
};

const COLORS = {
  pending: "#f59e0b", // amber-500
  in_progress: "#3b82f6", // blue-500
  completed: "#10b981", // emerald-600
  approved: "#059669", // green-600
};

export const TaskStatusPieChart = ({ data }: TaskStatusPieChartProps) => {
  const chartData = [
    { name: STATUS_LABELS.pending, value: data.pending, color: COLORS.pending },
    { name: STATUS_LABELS.in_progress, value: data.in_progress, color: COLORS.in_progress },
    { name: STATUS_LABELS.completed, value: data.completed, color: COLORS.completed },
    { name: STATUS_LABELS.approved, value: data.approved, color: COLORS.approved },
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg font-semibold">Görev Durumu Dağılımı</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground">
            <p className="text-xs sm:text-sm">Henüz görev bulunmuyor</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={250} minHeight={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) => 
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value} görev`,
                    name
                  ]}
                />
                <Legend 
                  formatter={(value) => value}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
