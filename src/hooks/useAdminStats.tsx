import { useQuery } from "@tanstack/react-query";
import { getTasks } from "@/services/firebase/taskService";
import { getOrders } from "@/services/firebase/orderService";
import { getAllUsers } from "@/services/firebase/authService";
import { getDepartments } from "@/services/firebase/departmentService";

export interface AdminStats {
  tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    approved: number;
  };
  production_orders: {
    total: number;
    active: number;
    planned: number;
    in_production: number;
    quality_check: number;
    completed: number;
    on_hold: number;
  };
  users: number;
  departments: number;
}

export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      try {
        const [tasks, orders, users, departments] = await Promise.all([
          getTasks(),
          getOrders(),
          getAllUsers(),
          getDepartments(),
        ]);

        // Onaylanmış görevler: status === "completed" && approvalStatus === "approved"
        const approvedTasks = tasks.filter(
          (t) => t.status === "completed" && t.approvalStatus === "approved"
        );
        
        // Tamamlanmış ama onaylanmamış görevler: status === "completed" && approvalStatus !== "approved"
        const completedTasks = tasks.filter(
          (t) => t.status === "completed" && t.approvalStatus !== "approved"
        );

        const taskStats = {
          total: tasks.length,
          pending: tasks.filter((t) => t.status === "pending").length,
          in_progress: tasks.filter((t) => t.status === "in_progress").length,
          completed: completedTasks.length,
          approved: approvedTasks.length,
        };

        const productionOrders = orders; // Production orders şimdilik normal orders olarak kabul ediliyor
        const productionStats = {
          total: productionOrders.length,
          active: productionOrders.filter((o) => 
            o.status !== "completed" && o.status !== "cancelled"
          ).length,
          planned: productionOrders.filter((o) => o.status === "planned").length,
          in_production: productionOrders.filter((o) => o.status === "in_production").length,
          quality_check: productionOrders.filter((o) => o.status === "quality_check").length,
          completed: productionOrders.filter((o) => o.status === "completed").length,
          on_hold: productionOrders.filter((o) => o.status === "on_hold").length,
        };

        const stats: AdminStats = {
          tasks: taskStats,
          production_orders: productionStats,
          users: users.length,
          departments: departments.length,
        };

        return stats;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Admin istatistikleri alınamadı";
        throw new Error(errorMessage);
      }
    },
    refetchInterval: 300000, // 5 dakikada bir güncelle (performans için)
    refetchOnWindowFocus: false, // Window focus'ta refetch yapma (performans için)
    staleTime: 180000, // 3 dakika stale time (performans için)
    gcTime: 600000, // 10 dakika cache time (performans için)
  });
};
