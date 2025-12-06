import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, CheckSquare, Clock, TrendingUp, AlertCircle, CalendarDays, Target, Award, BarChart3 } from "lucide-react";
import { addDays, isAfter, isBefore, startOfDay, subDays } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getDepartments, Department } from "@/services/firebase/departmentService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { getTasks, Task } from "@/services/firebase/taskService";
import { DepartmentDetailModal } from "@/components/Admin/DepartmentDetailModal";

export const TeamStatsView = () => {
  const { user, isAdmin, isTeamLeader } = useAuth();
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [managedDepartments, setManagedDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("all");

  useEffect(() => {
    if (user?.id) {
      fetchTeamStats();
    }
  }, [user, selectedTeamFilter]);

  const fetchTeamStats = async () => {
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
        const managedDepartments = allDepartments.filter(d => d.managerId === user.id);
        
        if (managedDepartments.length === 0) {
          // Kullanıcı hiçbir departmanın yöneticisi değilse boş
          setManagedDepartments([]);
          setTeamMembers([]);
          setTasks([]);
          setLoading(false);
          return;
        }

        // Kullanıcının yönettiği tüm departmanları göster
        setManagedDepartments(managedDepartments);
        const managedDeptIds = managedDepartments.map(d => d.id);

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
      console.error("Error fetching team stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Geciken görevler
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === "completed" || t.status === "cancelled") return false;
    let dueDate: Date;
    const dueDateValue = t.dueDate as any;
    if (dueDateValue?.toDate && typeof dueDateValue.toDate === 'function') {
      dueDate = dueDateValue.toDate();
    } else if (dueDateValue instanceof Date) {
      dueDate = dueDateValue;
    } else {
      dueDate = new Date(dueDateValue);
    }
    return isBefore(dueDate, new Date());
  });

  // Yaklaşan terminler (3 gün içinde)
  const dueSoonTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === "completed" || t.status === "cancelled") return false;
    let dueDate: Date;
    const dueDateValue = t.dueDate as any;
    if (dueDateValue?.toDate && typeof dueDateValue.toDate === 'function') {
      dueDate = dueDateValue.toDate();
    } else if (dueDateValue instanceof Date) {
      dueDate = dueDateValue;
    } else {
      dueDate = new Date(dueDateValue);
    }
    const today = startOfDay(new Date());
    const threeDaysAfter = addDays(today, 3);
    return !isBefore(dueDate, today) && isBefore(dueDate, threeDaysAfter);
  });

  // Son 7 gün içinde tamamlanan görevler
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentCompletedTasks = tasks.filter(t => {
    if (t.status !== "completed" || !t.updatedAt) return false;
    let updatedAt: Date;
    const updatedAtValue = t.updatedAt as any;
    if (updatedAtValue?.toDate && typeof updatedAtValue.toDate === 'function') {
      updatedAt = updatedAtValue.toDate();
    } else if (updatedAtValue instanceof Date) {
      updatedAt = updatedAtValue;
    } else {
      updatedAt = new Date(updatedAtValue);
    }
    return isAfter(updatedAt, sevenDaysAgo);
  });

  // Ortalama öncelik
  const avgPriority = tasks.length > 0
    ? tasks.reduce((sum, t) => sum + (t.priority || 0), 0) / tasks.length
    : 0;

  // En aktif üyeler (en çok görev tamamlayan)
  const memberTaskCounts = teamMembers.map(member => {
    const memberTasks = tasks.filter(t => t.createdBy === member.id);
    const completedCount = memberTasks.filter(t => t.status === "completed").length;
    return {
      member,
      totalTasks: memberTasks.length,
      completedTasks: completedCount,
      completionRate: memberTasks.length > 0 ? (completedCount / memberTasks.length) * 100 : 0,
    };
  }).sort((a, b) => b.completedTasks - a.completedTasks).slice(0, 5);

  const overallStats = {
    completedTasks: tasks.filter(t => t.status === "completed").length,
    completionRate: tasks.length > 0 
      ? (tasks.filter(t => t.status === "completed").length / tasks.length) * 100 
      : 0,
    overdueTasks: overdueTasks.length,
    dueSoonTasks: dueSoonTasks.length,
    recentCompleted: recentCompletedTasks.length,
    avgPriority: avgPriority.toFixed(1),
  };

  const getDepartmentStats = (deptId: string) => {
    // Departman üyelerini bul - tüm yöntemleri kontrol et
    const deptMembers = teamMembers.filter(m => {
      if (m.approvedTeams && m.approvedTeams.includes(deptId)) return true;
      if (m.pendingTeams && m.pendingTeams.includes(deptId)) return true;
      if (m.departmentId === deptId) return true;
      return false;
    });
    
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
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Bu sayfaya sadece yönetici veya ekip lideri erişebilir
  // Yönetici herkes için görür, ekip lideri sadece kendi ekibi için görür
  // Bu uyarı anlamsız çünkü zaten bu sayfaya erişebilenler ya yönetici ya da ekip lideridir

  return (
    <div className="space-y-6">
      {/* Yönetici için Ekip Seçimi */}
      {isAdmin && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Ekip Seç:</label>
              <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Ekip seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Ekipler</SelectItem>
                  {allDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Genel İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Tamamlanan</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{overallStats.completedTasks}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Tamamlanma Oranı</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">{overallStats.completionRate.toFixed(0)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Geciken Görevler</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{overallStats.overdueTasks}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Yaklaşan Terminler</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{overallStats.dueSoonTasks}</p>
                <p className="text-xs text-amber-600 mt-1">3 gün içinde</p>
              </div>
              <CalendarDays className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Son 7 Gün Aktivite ve Görev Durumu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Son 7 Gün Aktivite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Tamamlanan Görevler</span>
                <span className="text-muted-foreground">{overallStats.recentCompleted}</span>
              </div>
              <Progress 
                value={tasks.length > 0 ? (overallStats.recentCompleted / tasks.length) * 100 : 0} 
                className="h-3" 
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Son 7 gün içinde {overallStats.recentCompleted} görev tamamlandı
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Görev Öncelik Analizi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Ortalama Öncelik</span>
                <span className="text-muted-foreground">{overallStats.avgPriority}</span>
              </div>
              <Progress 
                value={tasks.length > 0 ? (parseFloat(overallStats.avgPriority) / 5) * 100 : 0} 
                className="h-3" 
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Yüksek Öncelik:</span>
                <span className="ml-2 font-semibold">
                  {tasks.filter(t => (t.priority || 0) >= 4).length}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Kritik:</span>
                <span className="ml-2 font-semibold text-red-600">
                  {tasks.filter(t => (t.priority || 0) === 5).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* En Aktif Üyeler */}
      {memberTaskCounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              En Aktif Üyeler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {memberTaskCounts.map(({ member, totalTasks, completedTasks, completionRate }, index) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{member.fullName || member.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {completedTasks} tamamlanan / {totalTasks} toplam
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs">
                      {completionRate.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Departman İstatistikleri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isAdmin ? "Tüm Ekipler" : "Yönettiğim Ekipler"} ({managedDepartments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {managedDepartments.map((dept) => {
              const deptStats = getDepartmentStats(dept.id);
              return (
                <button
                  key={dept.id}
                  onClick={() => {
                    if (isAdmin) {
                      // Yönetici için ekip filtresini güncelle
                      setSelectedTeamFilter(dept.id);
                    } else {
                      // Ekip lideri için modal aç (isteğe bağlı, şimdilik modal kapalı)
                      // setSelectedDepartmentId(dept.id);
                    }
                  }}
                  className="w-full text-left p-4 rounded-lg bg-muted/50 space-y-2 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">{dept.name}</h4>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {deptStats.completionRate.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={deptStats.completionRate} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Üye: {deptStats.members}</span>
                    <span>Aktif: {deptStats.activeTasks}</span>
                    <span>Tamamlanan: {deptStats.completedTasks}</span>
                    <span>Toplam: {deptStats.totalTasks}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sadece ekip lideri için modal (isteğe bağlı) */}
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

