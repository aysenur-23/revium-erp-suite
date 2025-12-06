import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getDepartments } from "@/services/firebase/departmentService";
import { getTasks } from "@/services/firebase/taskService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { DepartmentDetailModal } from "./DepartmentDetailModal";

interface DepartmentStat {
  id: string;
  name: string;
  process_count: number;
  active_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  team_members: number; // Ekip üyesi sayısı
  manager_name?: string; // Ekip lideri adı
}

export const DepartmentStatsTable = () => {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const { data: stats, isLoading } = useQuery({
    queryKey: ["department-stats"],
    queryFn: async () => {
      // Fetch departments, tasks, and users in parallel
      const [departments, allTasks, allUsers] = await Promise.all([
        getDepartments(),
        getTasks(),
        getAllUsers(),
      ]);

      // Debug: Eğer departman yoksa veya görev yoksa bilgi ver
      if (import.meta.env.DEV) {
        console.log("Department Stats Debug:", {
          departmentsCount: departments.length,
          tasksCount: allTasks.length,
          usersCount: allUsers.length,
        });
      }

      // Calculate stats for each department
      const stats = departments.map((dept) => {
        // Ekip üyelerini bul (approvedTeams, pendingTeams veya departmentId ile)
        const teamMembers = allUsers.filter((user: UserProfile) => {
          // Direkt departman ID'si eşleşiyorsa
          if (user.departmentId === dept.id) return true;
          // Onaylanmış ekiplerde varsa
          if (user.approvedTeams && user.approvedTeams.includes(dept.id)) return true;
          // Bekleyen ekiplerde varsa
          if (user.pendingTeams && user.pendingTeams.includes(dept.id)) return true;
          return false;
        });

        // Ekip lideri bilgisini al (sadece silinmemiş kullanıcılar)
        const manager = dept.managerId 
          ? allUsers.find((u: UserProfile) => u.id === dept.managerId && !(u as any).deleted)
          : null;

        // Ekip üyelerinin ID'lerini al
        const teamMemberIds = new Set(teamMembers.map((u: UserProfile) => u.id));

        // Departmana ait görevleri bul - birden fazla yöntemle
        const allDeptTasks = allTasks.filter((task) => {
          // 1. productionProcessId ile direkt bağlantı
          if (task.productionProcessId && task.productionProcessId === dept.id) {
            return true;
          }

          // 2. Görev ekip üyelerinden birine atanmışsa (assignedUsers string array veya object array)
          if (task.assignedUsers && Array.isArray(task.assignedUsers)) {
            const hasAssignedMember = task.assignedUsers.some((u: any) => {
              // Eğer string ise direkt ID karşılaştırması
              if (typeof u === 'string') {
                return teamMemberIds.has(u);
              }
              // Eğer object ise id field'ına bak
              if (u && typeof u === 'object') {
                const userId = u.id || u.assignedTo || u.userId;
                return userId && teamMemberIds.has(userId);
              }
              return false;
            });
            if (hasAssignedMember) return true;
          }

          // 3. Görev ekip üyelerinden biri tarafından oluşturulmuşsa
          if (task.createdBy && teamMemberIds.has(task.createdBy)) {
            return true;
          }
          
          return false;
        });

        // Aktif görevler: completed ve cancelled olmayanlar
        // Onaylanmış görevler (completed + approved) tamamlanmış sayılır
        const activeTasks = allDeptTasks.filter((t) => 
          t.status !== 'completed' && t.status !== 'cancelled'
        ).length;
        // Tamamlanmış görevler: status completed olanlar (onaylanmış veya onaylanmamış)
        const completedTasks = allDeptTasks.filter((t) => t.status === 'completed').length;
        // İptal edilen görevler (gerçekten iptal edilenler)
        const cancelledTasks = allDeptTasks.filter((t) => t.status === 'cancelled').length;
        const total = activeTasks + completedTasks + cancelledTasks;
        // Tamamlanma oranı: tamamlanmış + iptal edilen / toplam
        const completionRate = total > 0 ? ((completedTasks + cancelledTasks) / total) * 100 : 0;

        return {
          id: dept.id,
          name: dept.name,
          process_count: 0, // Production processes collection henüz mevcut değil
          active_tasks: activeTasks,
          completed_tasks: completedTasks,
          completion_rate: completionRate,
          team_members: teamMembers.length,
          manager_name: manager?.fullName || manager?.displayName || undefined,
        } as DepartmentStat;
      });

      return stats;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Departman İstatistikleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Departman İstatistikleri</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats && stats.length > 0 ? (
            stats.map((stat) => (
              <button
                key={stat.id}
                onClick={() => setSelectedDepartmentId(stat.id)}
                className="w-full text-left p-4 rounded-lg bg-muted/50 space-y-2 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{stat.name}</h4>
                  <span className="text-sm text-muted-foreground">
                    {stat.completion_rate.toFixed(0)}%
                  </span>
                </div>
                <Progress value={stat.completion_rate} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground flex-wrap gap-2">
                  <span>Üyeler: {stat.team_members}</span>
                  <span>Aktif: {stat.active_tasks}</span>
                  <span>Tamamlanan: {stat.completed_tasks}</span>
                  {stat.manager_name && (
                    <span className="w-full text-right">Lider: {stat.manager_name}</span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Henüz departman bulunmuyor
            </p>
          )}
        </div>
        {selectedDepartmentId && (
          <DepartmentDetailModal
            open={!!selectedDepartmentId}
            onOpenChange={(open) => !open && setSelectedDepartmentId(null)}
            departmentId={selectedDepartmentId}
          />
        )}
      </CardContent>
    </Card>
  );
};
