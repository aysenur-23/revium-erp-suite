import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CheckSquare, UserPlus, FileText, TrendingUp, Clock, CheckCircle2, AlertCircle, BarChart3 } from "lucide-react";
import { TeamApprovalManagement } from "@/components/Admin/TeamApprovalManagement";
import { PendingTaskApprovals } from "@/components/Team/PendingTaskApprovals";
import { TeamMembers } from "@/components/Team/TeamMembers";
import { AuditLogs } from "@/components/Admin/AuditLogs";
import { TeamStatsView } from "@/components/Team/TeamStatsView";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { getAllUsers } from "@/services/firebase/authService";
import { getDepartments } from "@/services/firebase/departmentService";
import { getTasks } from "@/services/firebase/taskService";
import { getPendingTeamRequests, getAllPendingTeamRequests } from "@/services/firebase/teamApprovalService";
import { UserProfile } from "@/services/firebase/authService";
import { toast } from "sonner";

const TeamManagement = () => {
  const { user, isAdmin, isTeamLeader } = useAuth();
  const [activeTab, setActiveTab] = useState("approvals");
  const [stats, setStats] = useState({
    totalMembers: 0,
    pendingApprovals: 0,
    pendingRequests: 0,
    activeTasks: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Sadece yönetici veya ekip liderleri erişebilir
  if (!isAdmin && !isTeamLeader) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchStats();
  }, [user, isAdmin]);

  const fetchStats = async () => {
    if (!user?.id) return;
    setLoadingStats(true);
    try {
      const [allUsers, allDepts, allTasks, requests] = await Promise.all([
        getAllUsers(),
        getDepartments(),
        getTasks(),
        isAdmin ? getAllPendingTeamRequests() : getPendingTeamRequests(user.id),
      ]);

      let teamMembers: UserProfile[] = [];
      if (isAdmin) {
        // Admin herkesi görür
        teamMembers = allUsers;
      } else {
        // Ekip lideri sadece yönettiği departmanlardaki üyeleri görür
        // Kullanıcının yönettiği tüm departmanları bul (managerId kontrolü)
        const managedDepartments = allDepts.filter(d => d.managerId === user.id);
        
        if (managedDepartments.length === 0) {
          // Kullanıcı hiçbir departmanın yöneticisi değilse boş liste
          teamMembers = [];
        } else {
          // Kullanıcının yönettiği tüm departman ID'lerini topla
          const managedDeptIds = managedDepartments.map(d => d.id);
          
          // KRİTİK: approvedTeams, pendingTeams ve departmentId alanlarını kontrol et
          teamMembers = allUsers.filter(u => {
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
        }
      }

      // Ekip lideri için sadece kendi ekibindeki görevleri filtrele
      let relevantTasks = allTasks;
      if (!isAdmin) {
        // Ekip lideri sadece yönettiği departmanlardaki üyelerin görevlerini görür
        const managedDepartments = allDepts.filter(d => d.managerId === user.id);
        
        if (managedDepartments.length > 0) {
          const managedDeptIds = managedDepartments.map(d => d.id);
        const teamMemberIds = allUsers
            .filter(u => {
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
            })
          .map(u => u.id);
        // Ekip üyelerinin görevlerini ve kendi görevlerini filtrele
        relevantTasks = allTasks.filter(t => 
          teamMemberIds.includes(t.createdBy) || t.createdBy === user.id
        );
        } else {
          // Departman yoksa sadece kendi görevlerini göster
          relevantTasks = allTasks.filter(t => t.createdBy === user.id);
        }
      }

      const pendingTasks = relevantTasks.filter(t => t.approvalStatus === "pending");

      setStats({
        totalMembers: teamMembers.length,
        pendingApprovals: pendingTasks.length,
        pendingRequests: requests.length,
        activeTasks: relevantTasks.filter(t => t.status === "in_progress").length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("İstatistikler yüklenirken hata oluştu");
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Ekip Yönetimi</h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
            Ekip üyelerinizi, görev onaylarını ve katılım isteklerini yönetin.
          </p>
        </div>

        {/* İstatistik Kartları */}
        {!loadingStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className="text-left group focus:outline-none touch-manipulation h-full"
            >
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 group-hover:border-blue-400 transition-colors h-full">
                <CardContent className="p-3 sm:p-4 h-full flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-blue-700">Toplam Üye</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">{stats.totalMembers}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Ekip üyelerini görüntüleyin</p>
                  </div>
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                </CardContent>
              </Card>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("approvals")}
              className="text-left group focus:outline-none touch-manipulation h-full"
            >
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200 group-hover:border-yellow-400 transition-colors h-full">
                <CardContent className="p-3 sm:p-4 h-full flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-yellow-700">Bekleyen Onaylar</p>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-900 mt-1">{stats.pendingApprovals}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Görev onay taleplerini inceleyin</p>
                  </div>
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 flex-shrink-0" />
                </CardContent>
              </Card>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("approvals")}
              className="text-left group focus:outline-none touch-manipulation h-full"
            >
              <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 group-hover:border-green-400 transition-colors h-full">
                <CardContent className="p-3 sm:p-4 h-full flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-green-700">Aktif Görevler</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">{stats.activeTasks}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Görev durumlarına göz atın</p>
                  </div>
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                </CardContent>
              </Card>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("join-requests")}
              className="text-left group focus:outline-none touch-manipulation h-full"
            >
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 group-hover:border-purple-400 transition-colors h-full">
                <CardContent className="p-3 sm:p-4 h-full flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-purple-700">Katılım İstekleri</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-900 mt-1">{stats.pendingRequests}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Bekleyen katılım taleplerini yönetin</p>
                  </div>
                  <UserPlus className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" />
                </CardContent>
              </Card>
            </button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0">
            <TabsList className="w-full justify-start sm:justify-between h-auto p-1 gap-1">
              <TabsTrigger value="approvals" className="gap-2 flex-1 min-w-[140px]">
                <CheckSquare className="h-4 w-4" />
                <span>Görev Onayları</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-2 flex-1 min-w-[140px]">
                <Users className="h-4 w-4" />
                <span>Ekip Üyeleri</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2 flex-1 min-w-[140px]">
                <FileText className="h-4 w-4" />
                <span>Ekip Logları</span>
              </TabsTrigger>
              <TabsTrigger value="join-requests" className="gap-2 flex-1 min-w-[140px]">
                <UserPlus className="h-4 w-4" />
                <span>Katılım İstekleri</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-2 flex-1 min-w-[140px]">
                <BarChart3 className="h-4 w-4" />
                <span>İstatistikler</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="approvals" className="space-y-4">
            <PendingTaskApprovals />
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <TeamMembers />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <AuditLogs mode={isAdmin ? "admin" : "team"} userId={user?.id} />
          </TabsContent>

          <TabsContent value="join-requests" className="space-y-4">
            <TeamApprovalManagement />
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <TeamStatsView />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default TeamManagement;
