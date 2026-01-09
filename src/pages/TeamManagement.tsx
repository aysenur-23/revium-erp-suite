<<<<<<< HEAD
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Users, UserPlus, TrendingUp, Clock, Loader2, CheckCircle2, FileText, CheckSquare, BarChart3, ChevronLeft, ChevronRight, Award } from "lucide-react";

// Lazy load child components for better performance
// Note: We will pass data props to these components now
const PendingTaskApprovals = lazy(() => import("@/components/Team/PendingTaskApprovals").then(m => ({ default: m.PendingTaskApprovals })));
const TeamMembers = lazy(() => import("@/components/Team/TeamMembers").then(m => ({ default: m.TeamMembers })));
const AuditLogs = lazy(() => import("@/components/Admin/AuditLogs").then(m => ({ default: m.AuditLogs })));
const TeamStatsView = lazy(() => import("@/components/Team/TeamStatsView").then(m => ({ default: m.TeamStatsView })));
import { StatCard } from "@/components/Dashboard/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { getDepartments } from "@/services/firebase/departmentService";
import { getTasks, Task } from "@/services/firebase/taskService";
import { getRoles, RoleDefinition } from "@/services/firebase/rolePermissionsService";
import { getPendingTeamRequests, getAllPendingTeamRequests } from "@/services/firebase/teamApprovalService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
=======
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
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

const TeamManagement = () => {
  const { user } = useAuth();
  const [canAccess, setCanAccess] = useState(false);
  const [isMainAdminUser, setIsMainAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD

  // Data State - Centralized
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allDepartments, setAllDepartments] = useState<Awaited<ReturnType<typeof getDepartments>>>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allRoles, setAllRoles] = useState<RoleDefinition[]>([]);
  const [loadingData, setLoadingData] = useState(true);

=======
  
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  const [stats, setStats] = useState({
    totalMembers: 0,
    pendingApprovals: 0,
    pendingRequests: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalTasks: 0,
  });
<<<<<<< HEAD

  // Hero kısmındaki istatistikler için state (sağdan sola açılır/kapanır, default kapalı)
  const [heroStatsExpanded, setHeroStatsExpanded] = useState(false);

  // Ekip seçimi için state
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("all");

  // Ortak filtreleme state'leri
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  // Cache için ref'ler
  const usersCacheRef = useRef<UserProfile[]>([]);
  const departmentsCacheRef = useRef<Awaited<ReturnType<typeof getDepartments>>>([]);
  const tasksCacheRef = useRef<Task[]>([]);
  const rolesCacheRef = useRef<RoleDefinition[]>([]);
  const cacheTimestampRef = useRef<number>(0);
  const CACHE_DURATION = 2 * 60 * 1000; // 2 dakika

  // Erişim kontrolü
=======
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
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setCanAccess(false);
        setLoading(false);
        return;
      }
      try {
        const { isMainAdmin, canUpdateResource } = await import("@/utils/permissions");
<<<<<<< HEAD
        const userProfile: UserProfile = { ...user, role: user.roles, createdAt: null, updatedAt: null } as any;

=======
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
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

    // Defer access check slightly
    const timer = setTimeout(checkAccess, 50);
    return () => clearTimeout(timer);
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoadingData(true);
    try {
      const now = Date.now();
      const shouldRefresh = !usersCacheRef.current.length ||
        (now - cacheTimestampRef.current) > CACHE_DURATION;

      let fetchedUsers = usersCacheRef.current;
      let fetchedDepts = departmentsCacheRef.current;
      let fetchedTasks = tasksCacheRef.current;
      let fetchedRoles = rolesCacheRef.current;

      if (shouldRefresh) {
        // Parallel data fetching
        const [users, depts, tasks, roles] = await Promise.all([
          getAllUsers(),
          getDepartments(),
          getTasks({ limit: 1000 }), // Higher limit for better stats
          getRoles()
        ]);

        fetchedUsers = users;
        fetchedDepts = depts;
        fetchedTasks = tasks;
        fetchedRoles = roles;

        // Update cache
        usersCacheRef.current = users;
        departmentsCacheRef.current = depts;
        tasksCacheRef.current = tasks;
        rolesCacheRef.current = roles;
        cacheTimestampRef.current = now;
      }

      setAllUsers(fetchedUsers);
      setAllDepartments(fetchedDepts);
      setAllTasks(fetchedTasks);
      setAllRoles(fetchedRoles);

      // Calculate Stats
      const requests = await (isMainAdminUser ? getAllPendingTeamRequests() : getPendingTeamRequests(user.id));

      let teamMembers: UserProfile[] = [];
      let relevantTasks = fetchedTasks;

      // Filter relevant users and tasks based on role
      if (isMainAdminUser) {
        teamMembers = fetchedUsers;
      } else {
        const managedDepartments = fetchedDepts.filter(d => d.managerId === user.id);

=======
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
        
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        if (managedDepartments.length === 0) {
          teamMembers = [];
        } else {
          const managedDeptIds = managedDepartments.map(d => d.id);
<<<<<<< HEAD
          teamMembers = fetchedUsers.filter(u => {
            return (u.approvedTeams && u.approvedTeams.some(deptId => managedDeptIds.includes(deptId))) ||
              (u.pendingTeams && u.pendingTeams.some(deptId => managedDeptIds.includes(deptId))) ||
              (u.departmentId && managedDeptIds.includes(u.departmentId));
          });
        }

        // Filter tasks related to team members
        const teamMemberIds = teamMembers.map(u => u.id);
        relevantTasks = fetchedTasks.filter(t =>
          teamMemberIds.includes(t.createdBy) || t.createdBy === user.id
        );
=======
          
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
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD

    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching team data:", error);
      }
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoadingData(false);
=======
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Error fetching stats:", error);
      }
      toast.error("İstatistikler yüklenirken hata oluştu");
    } finally {
      setLoadingStats(false);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    }
  }, [user?.id, isMainAdminUser]);

  const handleRefresh = useCallback(async () => {
<<<<<<< HEAD
    if (loadingData) return;
    try {
      // Clear cache to force refresh
      usersCacheRef.current = [];
      departmentsCacheRef.current = [];
      tasksCacheRef.current = [];
      rolesCacheRef.current = [];
      cacheTimestampRef.current = 0;

      await fetchData();
=======
    if (loadingStats) return;
    try {
      // Clear cache
      usersCacheRef.current = [];
      departmentsCacheRef.current = [];
      tasksCacheRef.current = [];
      cacheTimestampRef.current = 0;
      
      await fetchStats();
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      toast.success("Veriler yenilendi");
    } catch (error) {
      toast.error("Veriler yenilenirken hata oluştu");
    }
<<<<<<< HEAD
  }, [loadingData, fetchData]);

  useEffect(() => {
    if (canAccess && user?.id) {
      // Initial fetch delayed slightly to prioritize UI render
      const timer = setTimeout(() => {
        fetchData();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [canAccess, fetchData, user?.id]);
=======
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

>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
<<<<<<< HEAD
=======
      // Ctrl/Cmd + R to refresh - only if not in input/textarea
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          handleRefresh();
        }
      }
    };
<<<<<<< HEAD
=======

>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleRefresh]);

<<<<<<< HEAD
  // Calculate Most Active Members
=======


  // En aktif üyeleri hesapla
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  const [mostActiveMembers, setMostActiveMembers] = useState<Array<{
    member: UserProfile;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }>>([]);

  useEffect(() => {
<<<<<<< HEAD
    if (loadingData || !allUsers.length || !allTasks.length) {
      // Only clear if we are genuinely reloading or have no data
      if (!allUsers.length) setMostActiveMembers([]);
      return;
    }

    // Defer calculation
    const timer = setTimeout(() => {
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
    }, 100);

    return () => clearTimeout(timer);
  }, [allUsers, allTasks, loadingData]);

=======
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
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
<<<<<<< HEAD
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
=======
          <div className="text-center space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-primary/20"></div>
              </div>
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-foreground">Yükleniyor...</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Ekip yönetimi hazırlanıyor</p>
            </div>
          </div>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        </div>
      </MainLayout>
    );
  }
<<<<<<< HEAD

=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-2 w-full sm:w-[95%] md:w-[90%] lg:max-w-[1400px] mx-auto">
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
              <SelectTrigger className="w-full sm:w-[200px] h-9 text-[11px] sm:text-xs">
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
                <SelectTrigger className="w-full sm:w-[200px] h-9 text-[11px] sm:text-xs">
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
<<<<<<< HEAD
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHeroStatsExpanded(!heroStatsExpanded)}
            className="h-7 px-2 gap-1 text-[11px] sm:text-xs"
          >
            {heroStatsExpanded ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Hero İstatistik Kartları */}
        {heroStatsExpanded && (
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {loadingData ? (
              [...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse border p-2">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </Card>
              ))
            ) : (
              <>
                <StatCard title="Toplam Üye" value={stats.totalMembers} icon={Users} variant="primary" />
                <StatCard title="Bekleyen Onaylar" value={stats.pendingApprovals} icon={Clock} variant="warning" />
                <StatCard title="Aktif Görevler" value={stats.activeTasks} icon={TrendingUp} variant="success" />
                <StatCard title="Tamamlanan" value={stats.completedTasks} icon={CheckCircle2} variant="success" />
                <StatCard title="Toplam Görev" value={stats.totalTasks} icon={FileText} variant="primary" />
                <StatCard title="Katılım İstekleri" value={stats.pendingRequests} icon={UserPlus} variant="info" />
=======
          {!heroStatsExpanded ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHeroStatsExpanded(true)}
              className="h-7 px-2 gap-1 text-[11px] sm:text-xs"
              aria-label="İstatistikleri göster"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHeroStatsExpanded(false)}
              className="h-7 px-2 gap-1 text-[11px] sm:text-xs"
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
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              </>
            )}
          </div>
        )}

<<<<<<< HEAD
        {/* content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 min-w-0 items-stretch">
          <div className="lg:col-span-1 space-y-2 min-w-0 flex flex-col h-full">
            {/* Görev Onayları */}
=======
        {/* Two Column Layout - Sol: Görev Onayları + İstatistikler, Sağ: En Aktif Üyeler + Loglar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 min-w-0 items-stretch">
          {/* Sol Sütun - Görev Onayları ve İstatistikler */}
          <div className="lg:col-span-1 space-y-2 min-w-0 flex flex-col h-full">
            {/* Görev Onayları Bölümü */}
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200 flex-1 flex flex-col">
              <div className="px-3 pt-1.5 pb-1 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <CheckSquare className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-[11px] sm:text-xs font-semibold text-foreground">Görev Onayları</h3>
                </div>
              </div>
              <CardContent className="p-2 flex-1 flex flex-col min-h-0">
<<<<<<< HEAD
                <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}>
                  <PendingTaskApprovals />
                </Suspense>
              </CardContent>
            </Card>

            {/* İstatistikler */}
=======
                <PendingTaskApprovals />
                </CardContent>
              </Card>

            {/* İstatistikler Bölümü */}
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200 flex-1 flex flex-col">
              <div className="px-3 pt-1.5 pb-1 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-[11px] sm:text-xs font-semibold text-foreground">İstatistikler</h3>
                </div>
              </div>
              <CardContent className="p-2 flex-1 flex flex-col min-h-0">
<<<<<<< HEAD
                <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}>
                  <TeamStatsView
                    selectedTeamFilter={selectedTeamFilter}
                    users={allUsers}
                    departments={allDepartments}
                    tasks={allTasks}
                  />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-2 min-w-0 flex flex-col h-full">
            {/* En Aktif Üyeler */}
=======
                <TeamStatsView selectedTeamFilter={selectedTeamFilter} />
                </CardContent>
              </Card>
          </div>

          {/* Sağ Sütun - En Aktif Üyeler ve Loglar */}
          <div className="lg:col-span-1 space-y-2 min-w-0 flex flex-col h-full">

            {/* En Aktif Üyeler Bölümü */}
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            {mostActiveMembers.length > 0 && (
              <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200 flex-shrink-0">
                <div className="px-3 pt-1.5 pb-1 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <Award className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-[11px] sm:text-xs font-semibold text-foreground">En Aktif Üyeler</h3>
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
                            <p className="text-[11px] sm:text-xs font-medium">{member.fullName || member.email}</p>
                            <p className="text-[11px] sm:text-xs text-muted-foreground">
                              {completedTasks} tamamlanan / {totalTasks} toplam
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] px-2 py-1">
                          {completionRate.toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

<<<<<<< HEAD
            {/* Ekip Logları */}
=======
            {/* Ekip Logları Bölümü */}
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200 flex-1 flex flex-col">
              <div className="px-3 pt-1.5 pb-1 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-[11px] sm:text-xs font-semibold text-foreground">Ekip Logları</h3>
                </div>
              </div>
              <CardContent className="p-2 flex-1 flex flex-col min-h-0">
<<<<<<< HEAD
                <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}>
                  <AuditLogs
                    mode={isMainAdminUser ? "admin" : "team"}
                    userId={user?.id}
                    selectedTeamFilter={isMainAdminUser ? selectedTeamFilter : undefined}
                  />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Ekip Üyeleri - Tam Genişlik */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200 w-full mt-2">
=======
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
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          <div className="px-3 pt-1.5 pb-1 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-[11px] sm:text-xs font-semibold text-foreground">Ekip Üyeleri</h3>
<<<<<<< HEAD
              {loadingData && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
            </div>
          </div>
          <CardContent className="p-2">
            <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}>
              <TeamMembers
                departmentFilter={departmentFilter}
                users={allUsers}
                departments={allDepartments}
                roles={allRoles}
                tasks={allTasks}
              />
            </Suspense>
          </CardContent>
        </Card>
=======
            </div>
          </div>
          <CardContent className="p-2">
            <TeamMembers departmentFilter={departmentFilter} />
          </CardContent>
        </Card>

>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      </div>
    </MainLayout>
  );
};

export default TeamManagement;
