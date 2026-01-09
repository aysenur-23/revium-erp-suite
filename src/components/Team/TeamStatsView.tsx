import { useState, useEffect } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Target, Award, BarChart3 } from "lucide-react";
import { addDays, isAfter, isBefore, startOfDay, subDays } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Department } from "@/services/firebase/departmentService";
import { UserProfile } from "@/services/firebase/authService";
import { Task } from "@/services/firebase/taskService";
import { DepartmentDetailModal } from "@/components/Admin/DepartmentDetailModal";

interface TeamStatsViewProps {
  selectedTeamFilter?: string;
  users?: UserProfile[];
  departments?: Department[];
  tasks?: Task[];
}

export const TeamStatsView = ({
  selectedTeamFilter = "all",
  users = [],
  departments = [],
  tasks = []
}: TeamStatsViewProps) => {
  const { user, isAdmin } = useAuth();
  const [managedDepartments, setManagedDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [teamTasks, setTeamTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!users.length && !departments.length) {
      // If parent hasn't provided data yet
      return;
    }

    const processData = () => {
      let relevantDepts: Department[] = [];
      let members: UserProfile[] = [];

      if (isAdmin) {
        relevantDepts = departments;

        // Filter by selected team
        if (selectedTeamFilter !== "all") {
          relevantDepts = relevantDepts.filter(d => d.id === selectedTeamFilter);
        }
      } else {
        // Team Leader: only managed depts
        relevantDepts = departments.filter(d => d.managerId === user?.id);
      }

      if (relevantDepts.length === 0) {
        setManagedDepartments([]);
        setTeamMembers([]);
        setTeamTasks([]);
        setLoading(false);
        return;
      }

      setManagedDepartments(relevantDepts);

      const relevantDeptIds = relevantDepts.map(d => d.id);

      // Find members
      members = users.filter(u => {
        if (u.approvedTeams && u.approvedTeams.some(id => relevantDeptIds.includes(id))) return true;
        if (u.pendingTeams && u.pendingTeams.some(id => relevantDeptIds.includes(id))) return true;
        if (u.departmentId && relevantDeptIds.includes(u.departmentId)) return true;
        return false;
      });

      setTeamMembers(members);

      // Filter tasks
      // Only tasks created by team members or by current user (if related to team)
      const memberIds = members.map(m => m.id);
      const filteredTasks = tasks.filter(t =>
        memberIds.includes(t.createdBy) || t.createdBy === user?.id
      );

      setTeamTasks(filteredTasks);
      setLoading(false);
    };

    // Use timeout to unblock UI
    const t = setTimeout(processData, 0);
    return () => clearTimeout(t);

  }, [users, departments, tasks, isAdmin, user?.id, selectedTeamFilter]);


  // Geciken görevler
  const overdueTasks = teamTasks.filter(t => {
    if (!t.dueDate || t.status === "completed" || t.status === "cancelled") return false;
    // Helper to safely conversion
    let dueDate: Date | null = null;
    const d = t.dueDate as any;
    if (d?.toDate) dueDate = d.toDate();
    else if (d instanceof Date) dueDate = d;
    else if (d instanceof Timestamp) dueDate = d.toDate();

    if (!dueDate) return false;
    return isBefore(dueDate, new Date());
  });

  // Yaklaşan terminler (3 gün içinde)
  const dueSoonTasks = teamTasks.filter(t => {
    if (!t.dueDate || t.status === "completed" || t.status === "cancelled") return false;
    let dueDate: Date | null = null;
    const d = t.dueDate as any;
    if (d?.toDate) dueDate = d.toDate();
    else if (d instanceof Date) dueDate = d;

    if (!dueDate) return false;
    const today = startOfDay(new Date());
    const threeDaysAfter = addDays(today, 3);
    return !isBefore(dueDate, today) && isBefore(dueDate, threeDaysAfter);
  });

  // Son 7 gün içinde tamamlanan görevler
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentCompletedTasks = teamTasks.filter(t => {
    if (t.status !== "completed" || !t.updatedAt) return false;
    let updatedAt: Date | null = null;
    const d = t.updatedAt as any;
    if (d?.toDate) updatedAt = d.toDate();
    else if (d instanceof Date) updatedAt = d;

    if (!updatedAt) return false;
    return isAfter(updatedAt, sevenDaysAgo);
  });

  // Ortalama öncelik
  const avgPriority = teamTasks.length > 0
    ? teamTasks.reduce((sum, t) => sum + (t.priority || 0), 0) / teamTasks.length
    : 0;

  // En aktif üyeler
  const memberTaskCounts = teamMembers.map(member => {
    const memberTasks = teamTasks.filter(t => t.createdBy === member.id);
    const completedCount = memberTasks.filter(t => t.status === "completed").length;
    return {
      member,
      totalTasks: memberTasks.length,
      completedTasks: completedCount,
      completionRate: memberTasks.length > 0 ? (completedCount / memberTasks.length) * 100 : 0,
    };
  }).sort((a, b) => b.completedTasks - a.completedTasks).slice(0, 5);

  const overallStats = {
    completedTasks: teamTasks.filter(t => t.status === "completed").length,
    completionRate: teamTasks.length > 0
      ? (teamTasks.filter(t => t.status === "completed").length / teamTasks.length) * 100
      : 0,
    overdueTasks: overdueTasks.length,
    dueSoonTasks: dueSoonTasks.length,
    recentCompleted: recentCompletedTasks.length,
    avgPriority: avgPriority.toFixed(1),
  };

  const getDepartmentStats = (deptId: string) => {
    const deptMembers = teamMembers.filter(m => {
      if (m.approvedTeams && m.approvedTeams.includes(deptId)) return true;
      if (m.pendingTeams && m.pendingTeams.includes(deptId)) return true;
      if (m.departmentId === deptId) return true;
      return false;
    });

    const deptMemberIds = deptMembers.map(m => m.id);

    const deptTasks = teamTasks.filter(t => {
      if (t.productionProcessId === deptId) return true;
      if (deptMemberIds.includes(t.createdBy)) return true;
      return false;
    });

    const completed = deptTasks.filter(t => t.status === "completed").length;
    // const cancelled = deptTasks.filter(t => t.status === "cancelled").length;
    const total = deptTasks.length;
    const activeTasks = deptTasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      members: deptMembers.length,
      activeTasks,
      completedTasks: completed,
      totalTasks: total,
      completionRate,
    };
  };

  if (loading) {
    return (
      <div className="space-y-2 h-full flex flex-col">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-0.5 min-w-0 max-w-full">
      {/* Aktivite ve Analiz */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="pt-1 px-1 pb-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary/60" />
                <div>
                  <div className="text-xs text-muted-foreground">7 Gün</div>
                  <div className="text-sm font-semibold">{overallStats.recentCompleted} tamamlandı</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary/60" />
                <div>
                  <div className="text-xs text-muted-foreground">Öncelik</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{overallStats.avgPriority}</span>
                    <span className="text-xs text-muted-foreground">
                      • {teamTasks.filter(t => (t.priority || 0) >= 4).length} yüksek
                    </span>
                    <span className="text-xs text-red-600 font-medium">
                      • {teamTasks.filter(t => (t.priority || 0) === 5).length} kritik
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* En Aktif Üyeler */}
      {memberTaskCounts.length > 0 && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="pt-1 px-1 pb-1">
            <CardTitle className="text-xs font-medium mb-1">En Aktif Üyeler</CardTitle>
            <div className="space-y-1">
              {memberTaskCounts.map(({ member, totalTasks, completedTasks, completionRate }, index) => (
                <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{member.fullName || member.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {completedTasks} tamamlanan / {totalTasks} toplam
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {completionRate.toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Departman İstatistikleri */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="pt-1 px-1 pb-1">
          <div className="mb-1">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5">
              {isAdmin ? "Tüm Ekipler" : "Yönettiğim Ekipler"}
              {managedDepartments.length > 0 && (
                <Badge variant="secondary" className="h-3.5 px-1 text-[9px]">
                  {managedDepartments.length}
                </Badge>
              )}
            </CardTitle>
          </div>
          {managedDepartments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{isAdmin ? "Henüz ekip bulunmuyor." : "Yönettiğiniz ekip bulunmuyor."}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {managedDepartments.map((dept) => {
                const deptStats = getDepartmentStats(dept.id);
                return (
                  <div
                    key={dept.id}
                    className="w-full text-left p-2 rounded-lg bg-muted/50 space-y-1 border border-transparent"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        <h4 className="font-medium text-sm">{dept.name}</h4>
                      </div>
                      <Badge variant="outline" className="text-xs h-4 px-1">
                        {deptStats.completionRate.toFixed(0)}%
                      </Badge>
                    </div>
                    <Progress value={deptStats.completionRate} className="h-1.5" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-xs text-muted-foreground min-w-0">
                      <div>
                        <span className="font-medium">Üye:</span> {deptStats.members}
                      </div>
                      <div>
                        <span className="font-medium">Aktif:</span> {deptStats.activeTasks}
                      </div>
                      <div>
                        <span className="font-medium">Tamamlanan:</span> {deptStats.completedTasks}
                      </div>
                      <div>
                        <span className="font-medium">Toplam:</span> {deptStats.totalTasks}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {!isAdmin && selectedDepartmentId && (
        <DepartmentDetailModal
          open={!!selectedDepartmentId}
          onOpenChange={(open) => !open && setSelectedDepartmentId(null)}
          departmentId={selectedDepartmentId}
        />
      )}
    </div>
  );
};
