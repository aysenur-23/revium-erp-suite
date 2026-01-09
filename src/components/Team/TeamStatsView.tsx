<<<<<<< HEAD
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
=======
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, CheckSquare, Clock, TrendingUp, AlertCircle, CalendarDays, Target, Award, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, isAfter, isBefore, startOfDay, subDays } from "date-fns";
import { Timestamp, collection, onSnapshot, Unsubscribe } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getDepartments, Department } from "@/services/firebase/departmentService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { getTasks, Task, subscribeToTasks } from "@/services/firebase/taskService";
import { DepartmentDetailModal } from "@/components/Admin/DepartmentDetailModal";
import { firestore } from "@/lib/firebase";

interface TeamStatsViewProps {
  selectedTeamFilter?: string;
}

export const TeamStatsView = ({ selectedTeamFilter = "all" }: TeamStatsViewProps) => {
  const { user, isAdmin, isTeamLeader } = useAuth();
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [managedDepartments, setManagedDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);

  const fetchTeamStats = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [allDepts, allUsers, allTasks] = await Promise.all([
        getDepartments(),
        getAllUsers(),
        getTasks(),
      ]);

      setAllDepartments(allDepts);

      // Yönetici tüm departmanları görür, ekip lideri sadece kendi departmanını görür
      if (isAdmin) {
        // Yönetici için tüm departmanları göster
        setManagedDepartments(allDepts);
        
        // Eğer ekip filtresi seçilmişse, sadece o ekibi göster
        let filteredDepts = allDepts;
        if (selectedTeamFilter !== "all") {
          filteredDepts = allDepts.filter(d => d.id === selectedTeamFilter);
        }
        
        if (filteredDepts.length === 0) {
          setTeamMembers([]);
          setTasks([]);
          setLoading(false);
          return;
        }
        
        const filteredDeptIds = filteredDepts.map(d => d.id);
        
        // Ekip üyelerini bul - seçilen departmanlardaki üyeler
        const members = allUsers.filter(u => {
          if (u.approvedTeams && u.approvedTeams.some(teamId => filteredDeptIds.includes(teamId))) {
            return true;
          }
          if (u.pendingTeams && u.pendingTeams.some(teamId => filteredDeptIds.includes(teamId))) {
            return true;
          }
          if (u.departmentId && filteredDeptIds.includes(u.departmentId)) {
            return true;
          }
          return false;
        });
        
        setTeamMembers(members);
        
        // Ekip üyelerinin görevlerini bul
        const memberIds = members.map(m => m.id);
        const teamTasks = allTasks.filter(t => 
          memberIds.includes(t.createdBy) || t.createdBy === user.id
        );
        setTasks(teamTasks);
      } else {
        // Ekip lideri sadece yönettiği departmanları görür
        // Kullanıcının yönettiği tüm departmanları bul (managerId kontrolü)
        // allDepts kullan (state henüz güncellenmemiş olabilir)
        const managedDepts = allDepts.filter(d => d.managerId === user.id);
        
        if (managedDepts.length === 0) {
          // Kullanıcı hiçbir departmanın yöneticisi değilse boş
          setManagedDepartments([]);
          setTeamMembers([]);
          setTasks([]);
          setLoading(false);
          return;
        }

        // Kullanıcının yönettiği tüm departmanları göster
        setManagedDepartments(managedDepts);
        const managedDeptIds = managedDepts.map(d => d.id);

        // Ekip üyelerini bul - yönettiği tüm departmanlardaki üyeler
        // KRİTİK: approvedTeams, pendingTeams ve departmentId alanlarını kontrol et
        const members = allUsers.filter(u => {
          // approvedTeams kontrolü - yönettiği herhangi bir departmanda onaylanmış üye
          if (u.approvedTeams && u.approvedTeams.some(deptId => managedDeptIds.includes(deptId))) {
            return true;
          }
          // pendingTeams kontrolü - yönettiği herhangi bir departmanda onay bekleyen üye
          if (u.pendingTeams && u.pendingTeams.some(deptId => managedDeptIds.includes(deptId))) {
            return true;
          }
          // departmentId kontrolü - yönettiği herhangi bir departmanda doğrudan atanmış üye
          if (u.departmentId && managedDeptIds.includes(u.departmentId)) {
            return true;
          }
          return false;
        });
        
        setTeamMembers(members);
        
        // Ekip üyelerinin görevlerini bul
        const memberIds = members.map(m => m.id);
        const teamTasks = allTasks.filter(t => 
          memberIds.includes(t.createdBy) || t.createdBy === user.id
        );
        setTasks(teamTasks);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching team stats:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, selectedTeamFilter]);

  useEffect(() => {
    if (user?.id) {
      fetchTeamStats();
    }
  }, [user, selectedTeamFilter, fetchTeamStats]);

  // Dinamik güncelleme için real-time listeners
  useEffect(() => {
    if (!user?.id) return;
    
    let unsubscribeTasks: Unsubscribe | null = null;
    let unsubscribeDepartments: Unsubscribe | null = null;
    let isMounted = true;

    // Tasks için real-time listener (performans için limit: 500)
    unsubscribeTasks = subscribeToTasks({}, (tasks) => {
      if (!isMounted) return;
      setTasks(tasks);
    });

    // Departments için real-time listener - cache kullan
    let departmentsCache: Department[] | null = null;
    let departmentsCacheTime = 0;
    const DEPARTMENTS_CACHE_DURATION = 2 * 60 * 1000; // 2 dakika
    
    unsubscribeDepartments = onSnapshot(
      collection(firestore, "departments"),
      async () => {
        if (!isMounted) return;
        
        // Cache kontrolü
        const now = Date.now();
        if (departmentsCache && (now - departmentsCacheTime) < DEPARTMENTS_CACHE_DURATION) {
          setAllDepartments(departmentsCache);
          return;
        }
        
        try {
          const depts = await getDepartments();
          departmentsCache = depts;
          departmentsCacheTime = now;
          setAllDepartments(depts);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error("Error fetching departments:", error);
          }
        }
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.error("Departments snapshot error:", error);
        }
      }
    );

    // Users subscription'ı kaldırıldı - gereksiz (fetchTeamStats zaten çağrılıyor)

    return () => {
      isMounted = false;
      if (unsubscribeTasks) unsubscribeTasks();
      if (unsubscribeDepartments) unsubscribeDepartments();
    };
  }, [user, selectedTeamFilter, fetchTeamStats]);

  // Geciken görevler
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === "completed" || t.status === "cancelled") return false;
    let dueDate: Date;
    const dueDateValue = t.dueDate;
    if (dueDateValue && typeof dueDateValue === 'object' && 'toDate' in dueDateValue && typeof dueDateValue.toDate === 'function') {
      dueDate = (dueDateValue as { toDate: () => Date }).toDate();
    } else if (dueDateValue instanceof Date) {
      dueDate = dueDateValue;
    } else if (dueDateValue instanceof Timestamp) {
      dueDate = dueDateValue.toDate();
    } else {
      return false;
    }
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return isBefore(dueDate, new Date());
  });

  // Yaklaşan terminler (3 gün içinde)
<<<<<<< HEAD
  const dueSoonTasks = teamTasks.filter(t => {
    if (!t.dueDate || t.status === "completed" || t.status === "cancelled") return false;
    let dueDate: Date | null = null;
    const d = t.dueDate as any;
    if (d?.toDate) dueDate = d.toDate();
    else if (d instanceof Date) dueDate = d;

    if (!dueDate) return false;
=======
  const dueSoonTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === "completed" || t.status === "cancelled") return false;
    let dueDate: Date;
    const dueDateValue = t.dueDate;
    if (dueDateValue && typeof dueDateValue === 'object' && 'toDate' in dueDateValue && typeof dueDateValue.toDate === 'function') {
      dueDate = (dueDateValue as { toDate: () => Date }).toDate();
    } else if (dueDateValue instanceof Date) {
      dueDate = dueDateValue;
    } else if (dueDateValue instanceof Timestamp) {
      dueDate = dueDateValue.toDate();
    } else {
      return false;
    }
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    const today = startOfDay(new Date());
    const threeDaysAfter = addDays(today, 3);
    return !isBefore(dueDate, today) && isBefore(dueDate, threeDaysAfter);
  });

  // Son 7 gün içinde tamamlanan görevler
  const sevenDaysAgo = subDays(new Date(), 7);
<<<<<<< HEAD
  const recentCompletedTasks = teamTasks.filter(t => {
    if (t.status !== "completed" || !t.updatedAt) return false;
    let updatedAt: Date | null = null;
    const d = t.updatedAt as any;
    if (d?.toDate) updatedAt = d.toDate();
    else if (d instanceof Date) updatedAt = d;

    if (!updatedAt) return false;
=======
  const recentCompletedTasks = tasks.filter(t => {
    if (t.status !== "completed" || !t.updatedAt) return false;
    let updatedAt: Date;
    const updatedAtValue = t.updatedAt;
    if (updatedAtValue && typeof updatedAtValue === 'object' && 'toDate' in updatedAtValue && typeof updatedAtValue.toDate === 'function') {
      updatedAt = (updatedAtValue as { toDate: () => Date }).toDate();
    } else if (updatedAtValue instanceof Date) {
      updatedAt = updatedAtValue;
    } else if (updatedAtValue instanceof Timestamp) {
      updatedAt = updatedAtValue.toDate();
    } else {
      return false;
    }
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    return isAfter(updatedAt, sevenDaysAgo);
  });

  // Ortalama öncelik
<<<<<<< HEAD
  const avgPriority = teamTasks.length > 0
    ? teamTasks.reduce((sum, t) => sum + (t.priority || 0), 0) / teamTasks.length
    : 0;

  // En aktif üyeler
  const memberTaskCounts = teamMembers.map(member => {
    const memberTasks = teamTasks.filter(t => t.createdBy === member.id);
=======
  const avgPriority = tasks.length > 0
    ? tasks.reduce((sum, t) => sum + (t.priority || 0), 0) / tasks.length
    : 0;

  // En aktif üyeler (en çok görev tamamlayan)
  const memberTaskCounts = teamMembers.map(member => {
    const memberTasks = tasks.filter(t => t.createdBy === member.id);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    const completedCount = memberTasks.filter(t => t.status === "completed").length;
    return {
      member,
      totalTasks: memberTasks.length,
      completedTasks: completedCount,
      completionRate: memberTasks.length > 0 ? (completedCount / memberTasks.length) * 100 : 0,
    };
  }).sort((a, b) => b.completedTasks - a.completedTasks).slice(0, 5);

  const overallStats = {
<<<<<<< HEAD
    completedTasks: teamTasks.filter(t => t.status === "completed").length,
    completionRate: teamTasks.length > 0
      ? (teamTasks.filter(t => t.status === "completed").length / teamTasks.length) * 100
=======
    completedTasks: tasks.filter(t => t.status === "completed").length,
    completionRate: tasks.length > 0 
      ? (tasks.filter(t => t.status === "completed").length / tasks.length) * 100 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      : 0,
    overdueTasks: overdueTasks.length,
    dueSoonTasks: dueSoonTasks.length,
    recentCompleted: recentCompletedTasks.length,
    avgPriority: avgPriority.toFixed(1),
  };

  const getDepartmentStats = (deptId: string) => {
<<<<<<< HEAD
=======
    // Departman üyelerini bul - tüm yöntemleri kontrol et
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    const deptMembers = teamMembers.filter(m => {
      if (m.approvedTeams && m.approvedTeams.includes(deptId)) return true;
      if (m.pendingTeams && m.pendingTeams.includes(deptId)) return true;
      if (m.departmentId === deptId) return true;
      return false;
    });
<<<<<<< HEAD

    const deptMemberIds = deptMembers.map(m => m.id);

    const deptTasks = teamTasks.filter(t => {
      if (t.productionProcessId === deptId) return true;
      if (deptMemberIds.includes(t.createdBy)) return true;
      return false;
    });

    const completed = deptTasks.filter(t => t.status === "completed").length;
    // const cancelled = deptTasks.filter(t => t.status === "cancelled").length;
=======
    
    // Departman üyelerinin ID'lerini al
    const deptMemberIds = deptMembers.map(m => m.id);
    
    // Departmana ait görevleri bul
    const deptTasks = tasks.filter(t => {
      // productionProcessId ile eşleşen görevler
      if (t.productionProcessId === deptId) return true;
      // Departman üyelerinin oluşturduğu görevler
      if (deptMemberIds.includes(t.createdBy)) return true;
      return false;
    });
    
    const completed = deptTasks.filter(t => t.status === "completed").length;
    const cancelled = deptTasks.filter(t => t.status === "cancelled").length;
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD
    return (
      <div className="space-y-2 h-full flex flex-col">
=======
  return (
    <div className="space-y-2 h-full flex flex-col">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

<<<<<<< HEAD
=======
  // Bu sayfaya sadece yönetici veya ekip lideri erişebilir
  // Yönetici herkes için görür, ekip lideri sadece kendi ekibi için görür
  // Bu uyarı anlamsız çünkü zaten bu sayfaya erişebilenler ya yönetici ya da ekip lideridir

>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD
                      • {teamTasks.filter(t => (t.priority || 0) >= 4).length} yüksek
                    </span>
                    <span className="text-xs text-red-600 font-medium">
                      • {teamTasks.filter(t => (t.priority || 0) === 5).length} kritik
=======
                      • {tasks.filter(t => (t.priority || 0) >= 4).length} yüksek
                    </span>
                    <span className="text-xs text-red-600 font-medium">
                      • {tasks.filter(t => (t.priority || 0) === 5).length} kritik
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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

<<<<<<< HEAD
=======
      {/* Sadece ekip lideri için modal (isteğe bağlı) */}
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD
=======

>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
