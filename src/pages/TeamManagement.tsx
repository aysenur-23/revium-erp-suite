import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Users, UserPlus, TrendingUp, Clock, Loader2, CheckCircle2, FileText, CheckSquare, BarChart3, RefreshCw, Info, Award, ChevronLeft, ChevronRight } from "lucide-react";
import { PendingTaskApprovals } from "@/components/Team/PendingTaskApprovals";
import { TeamMembers } from "@/components/Team/TeamMembers";
import { AuditLogs } from "@/components/Admin/AuditLogs";
import { TeamStatsView } from "@/components/Team/TeamStatsView";
import { StatCard } from "@/components/Dashboard/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllUsers } from "@/services/firebase/authService";
import { getDepartments } from "@/services/firebase/departmentService";
import { getTasks } from "@/services/firebase/taskService";
import { getPendingTeamRequests, getAllPendingTeamRequests } from "@/services/firebase/teamApprovalService";
import { UserProfile } from "@/services/firebase/authService";
import { toast } from "sonner";
import { isMainAdmin, canUpdateResource } from "@/utils/permissions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TeamManagement = () => {
  const { user } = useAuth();
  const [canAccess, setCanAccess] = useState(false);
  const [isMainAdminUser, setIsMainAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalMembers: 0,
    pendingApprovals: 0,
    pendingRequests: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalTasks: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Hero kısmındaki istatistikler için state (sağdan sola açılır/kapanır, default kapalı)
  const [heroStatsExpanded, setHeroStatsExpanded] = useState(false);
  
  // Ekip seçimi için state
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("all");
  const [allDepartments, setAllDepartments] = useState<Awaited<ReturnType<typeof getDepartments>>>([]);
  
  // Ortak filtreleme state'leri
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  
  // Cache için ref'ler
  const usersCacheRef = useRef<UserProfile[]>([]);
  const departmentsCacheRef = useRef<Awaited<ReturnType<typeof getDepartments>>>([]);
  const tasksCacheRef = useRef<Awaited<ReturnType<typeof getTasks>>>([]);
  const cacheTimestampRef = useRef<number>(0);
  const CACHE_DURATION = 2 * 60 * 1000; // 2 dakika

  // Erişim kontrolü - Firestore'dan
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setCanAccess(false);
        setLoading(false);
        return;
      }
      try {
        const { isMainAdmin, canUpdateResource } = await import("@/utils/permissions");
        const userProfile: UserProfile = {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          fullName: user.fullName,
          displayName: user.fullName,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          role: user.roles,
          createdAt: null,
          updatedAt: null,
        };
        const [isMainAdminResult, canUpdateDepts] = await Promise.all([
          isMainAdmin(userProfile),
          canUpdateResource(userProfile, "departments"),
        ]);
        setIsMainAdminUser(isMainAdminResult);
        setCanAccess(isMainAdminResult || canUpdateDepts);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Error checking team management access:", error);
        }
        setCanAccess(false);
      } finally {
        setLoading(false);
      }
    };
    checkAccess();
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setLoadingStats(false);
      return;
    }
    setLoadingStats(true);
    try {
      const now = Date.now();
      const shouldRefresh = !usersCacheRef.current.length || 
                           (now - cacheTimestampRef.current) > CACHE_DURATION;
      
      let allUsers = usersCacheRef.current;
      let allDepts = departmentsCacheRef.current;
      let allTasks = tasksCacheRef.current;
      
      if (shouldRefresh) {
        const [fetchedUsers, fetchedDepts, fetchedTasks] = await Promise.all([
          getAllUsers(),
          getDepartments(),
          getTasks(),
        ]);
        
        // Cache'e kaydet
        usersCacheRef.current = fetchedUsers;
        departmentsCacheRef.current = fetchedDepts;
        tasksCacheRef.current = fetchedTasks;
        cacheTimestampRef.current = now;
        
        allUsers = fetchedUsers;
        allDepts = fetchedDepts;
        allTasks = fetchedTasks;
      }
      
      // Requests'i her zaman al (cache'lenmez çünkü sık değişir)
      const requests = await (isMainAdminUser ? getAllPendingTeamRequests() : getPendingTeamRequests(user.id));

      let teamMembers: UserProfile[] = [];
      if (isMainAdminUser) {
        teamMembers = allUsers;
      } else {
        const managedDepartments = allDepts.filter(d => d.managerId === user.id);
        
        if (managedDepartments.length === 0) {
          teamMembers = [];
        } else {
          const managedDeptIds = managedDepartments.map(d => d.id);
          
          teamMembers = allUsers.filter(u => {
            if (u.approvedTeams && u.approvedTeams.some(deptId => managedDeptIds.includes(deptId))) {
              return true;
            }
            if (u.pendingTeams && u.pendingTeams.some(deptId => managedDeptIds.includes(deptId))) {
              return true;
            }
            if (u.departmentId && managedDeptIds.includes(u.departmentId)) {
              return true;
            }
            return false;
          });
        }
      }

      let relevantTasks = allTasks;
      if (!isMainAdminUser) {
        const managedDepartments = allDepts.filter(d => d.managerId === user.id);
        
        if (managedDepartments.length > 0) {
          const managedDeptIds = managedDepartments.map(d => d.id);
        const teamMemberIds = allUsers
            .filter(u => {
              if (u.approvedTeams && u.approvedTeams.some(deptId => managedDeptIds.includes(deptId))) {
                return true;
              }
              if (u.pendingTeams && u.pendingTeams.some(deptId => managedDeptIds.includes(deptId))) {
                return true;
              }
              if (u.departmentId && managedDeptIds.includes(u.departmentId)) {
                return true;
              }
              return false;
            })
          .map(u => u.id);
        relevantTasks = allTasks.filter(t => 
          teamMemberIds.includes(t.createdBy) || t.createdBy === user.id
        );
        } else {
          relevantTasks = allTasks.filter(t => t.createdBy === user.id);
        }
      }

      const pendingTasks = relevantTasks.filter(t => t.approvalStatus === "pending");
      const completedTasks = relevantTasks.filter(t => t.status === "completed").length;
      const activeTasks = relevantTasks.filter(t => t.status === "in_progress").length;

      setStats({
        totalMembers: teamMembers.length,
        pendingApprovals: pendingTasks.length,
        pendingRequests: requests.length,
        activeTasks: activeTasks,
        completedTasks: completedTasks,
        totalTasks: relevantTasks.length,
      });
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Error fetching stats:", error);
      }
      toast.error("İstatistikler yüklenirken hata oluştu");
    } finally {
      setLoadingStats(false);
    }
  }, [user?.id, isMainAdminUser]);

  const handleRefresh = useCallback(async () => {
    if (loadingStats) return;
    try {
      // Clear cache
      usersCacheRef.current = [];
      departmentsCacheRef.current = [];
      tasksCacheRef.current = [];
      cacheTimestampRef.current = 0;
      
      await fetchStats();
      toast.success("Veriler yenilendi");
    } catch (error) {
      toast.error("Veriler yenilenirken hata oluştu");
    }
  }, [loadingStats, fetchStats]);

  // Departmanları yükle - Hem admin hem de filtreleme için gerekli
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const depts = await getDepartments();
        setAllDepartments(depts);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error loading departments:", error);
        }
      }
    };
    loadDepartments();
  }, []);

  useEffect(() => {
    if (canAccess && user?.id) {
      fetchStats();
    }
  }, [canAccess, fetchStats, user?.id]);


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + R to refresh - only if not in input/textarea
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          handleRefresh();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);



  // En aktif üyeleri hesapla
  const [mostActiveMembers, setMostActiveMembers] = useState<Array<{
    member: UserProfile;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }>>([]);

  useEffect(() => {
    const allUsers = usersCacheRef.current;
    const allTasks = tasksCacheRef.current;
    
    if (!allUsers.length || !allTasks.length) {
      setMostActiveMembers([]);
      return;
    }
    
    const memberTaskCounts = allUsers.map(member => {
      const memberTasks = allTasks.filter(t => t.createdBy === member.id);
      const completedCount = memberTasks.filter(t => t.status === "completed").length;
      return {
        member,
        totalTasks: memberTasks.length,
        completedTasks: completedCount,
        completionRate: memberTasks.length > 0 ? (completedCount / memberTasks.length) * 100 : 0,
      };
    }).sort((a, b) => b.completedTasks - a.completedTasks).slice(0, 5);
    
    setMostActiveMembers(memberTaskCounts);
  }, [loadingStats]);


  // Sadece yönetici veya ekip liderleri erişebilir
  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-primary/20"></div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Yükleniyor...</p>
              <p className="text-xs text-muted-foreground mt-1">Ekip yönetimi hazırlanıyor</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-2 w-[90%] max-w-[90%] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h1 className="text-[16px] sm:text-[18px] font-semibold text-foreground">Ekip Yönetimi</h1>
          </div>
        </div>

        {/* Ortak Filtreler */}
        <div className="flex flex-row items-center justify-between gap-2 pb-2 border-b">
          <div className="flex flex-row items-center gap-2">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
                <SelectValue placeholder="Departman Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Departmanlar</SelectItem>
                {allDepartments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isMainAdminUser && (
              <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
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
            )}
          </div>
          {/* Hero İstatistikler Açılma Butonu */}
          {!heroStatsExpanded ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHeroStatsExpanded(true)}
              className="h-7 px-2 gap-1 text-xs"
              aria-label="İstatistikleri göster"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHeroStatsExpanded(false)}
              className="h-7 px-2 gap-1 text-xs"
              aria-label="İstatistikleri gizle"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Hero İstatistik Kartları - Sağdan Sola Açılıp Kapanan */}
        {heroStatsExpanded && (
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {loadingStats ? (
              <>
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse border">
                    <CardContent className="p-2">
                      <div className="h-3 bg-muted rounded w-2/3 mb-1.5"></div>
                      <div className="h-7 bg-muted rounded w-1/2 mb-1"></div>
                      <div className="h-2 bg-muted rounded w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <StatCard
                  title="Toplam Üye"
                  value={stats.totalMembers}
                  icon={Users}
                  variant="primary"
                />
                <StatCard
                  title="Bekleyen Onaylar"
                  value={stats.pendingApprovals}
                  icon={Clock}
                  variant="warning"
                />
                <StatCard
                  title="Aktif Görevler"
                  value={stats.activeTasks}
                  icon={TrendingUp}
                  variant="success"
                />
                <StatCard
                  title="Tamamlanan"
                  value={stats.completedTasks}
                  icon={CheckCircle2}
                  variant="success"
                />
                <StatCard
                  title="Toplam Görev"
                  value={stats.totalTasks}
                  icon={FileText}
                  variant="primary"
                />
                <StatCard
                  title="Katılım İstekleri"
                  value={stats.pendingRequests}
                  icon={UserPlus}
                  variant="info"
                />
              </>
            )}
          </div>
        )}

        {/* Two Column Layout - Sol: Görev Onayları + İstatistikler, Sağ: En Aktif Üyeler + Loglar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 min-w-0 items-start">
          {/* Sol Sütun - Görev Onayları ve İstatistikler */}
          <div className="lg:col-span-1 space-y-2 min-w-0 flex flex-col">
            {/* Görev Onayları Bölümü */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="px-3 pt-1.5 pb-1 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <CheckSquare className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Görev Onayları</h3>
                </div>
              </div>
              <CardContent className="p-2">
                <PendingTaskApprovals />
                </CardContent>
              </Card>

            {/* İstatistikler Bölümü */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="px-3 pt-1.5 pb-1 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">İstatistikler</h3>
                </div>
              </div>
              <CardContent className="p-2">
                <TeamStatsView selectedTeamFilter={selectedTeamFilter} />
                </CardContent>
              </Card>
          </div>

          {/* Sağ Sütun - En Aktif Üyeler ve Loglar */}
          <div className="lg:col-span-1 space-y-2 min-w-0 flex flex-col">

            {/* En Aktif Üyeler Bölümü */}
            {mostActiveMembers.length > 0 && (
              <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="px-3 pt-1.5 pb-1 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <Award className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">En Aktif Üyeler</h3>
                  </div>
                </div>
                <CardContent className="p-2">
                  <div className="space-y-1.5">
                    {mostActiveMembers.map(({ member, totalTasks, completedTasks, completionRate }, index) => (
                      <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.fullName || member.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {completedTasks} tamamlanan / {totalTasks} toplam
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          {completionRate.toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ekip Logları Bölümü */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200 flex-1 flex flex-col">
              <div className="px-3 pt-1.5 pb-1 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Ekip Logları</h3>
                </div>
              </div>
              <CardContent className="p-2 flex-1 flex flex-col min-h-0">
                <AuditLogs 
                  mode={isMainAdminUser ? "admin" : "team"} 
                  userId={user?.id}
                  selectedTeamFilter={isMainAdminUser ? selectedTeamFilter : undefined}
                />
                </CardContent>
              </Card>
          </div>
        </div>

        {/* Ekip Üyeleri Bölümü - Tam Genişlik */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200 w-full">
          <div className="px-3 pt-1.5 pb-1 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Ekip Üyeleri</h3>
            </div>
          </div>
          <CardContent className="p-2">
            <TeamMembers departmentFilter={departmentFilter} />
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
};

export default TeamManagement;
