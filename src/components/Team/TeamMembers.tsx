import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, FileText, Loader2, Shield, Mail, Phone, CheckCircle2, Clock, XCircle, TrendingUp, Eye, Download, Building2, UserPlus, Check, X, Calendar, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/services/firebase/authService";
import { Department } from "@/services/firebase/departmentService";
import { getTaskAssignments, Task } from "@/services/firebase/taskService";
import { formatPhoneForDisplay } from "@/utils/phoneNormalizer";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { RoleDefinition } from "@/services/firebase/rolePermissionsService";
import { approveTeamRequest, rejectTeamRequest, TeamApprovalRequest, subscribeToTeamRequests } from "@/services/firebase/teamApprovalService";
import { Timestamp } from "firebase/firestore";

interface TeamMembersProps {
  departmentFilter?: string;
  users?: UserProfile[];
  departments?: Department[];
  roles?: RoleDefinition[];
  tasks?: Task[];
}

export const TeamMembers = ({
  departmentFilter: externalDepartmentFilter = "all",
  users = [],
  departments = [],
  roles = [],
  tasks = []
}: TeamMembersProps) => {
  const { user, isAdmin, isTeamLeader } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  useEffect(() => {
    console.log("TeamMembers component mounted");
  }, []);

  // Use passed props or default to empty
  const departmentFilter = externalDepartmentFilter;

  const [memberStats, setMemberStats] = useState<Record<string, {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
  }>>({});

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    member: UserProfile;
    stats: {
      userName: string;
      userEmail: string;
      total: number;
      accepted: number;
      rejected: number;
      pending: number;
      completed: number;
      active: number;
      assignments: Array<{
        taskTitle: string;
        status: string;
        assignedAt: Date | string;
        completedAt?: Date | string | null;
      }>;
    };
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<TeamApprovalRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{ userId: string; teamId: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Initial Data Processing - Replaces fetchTeamData
  useEffect(() => {
    if (!users.length && !departments.length) {
      // If no data passed yet, stay loading (or if empty is valid, set false)
      // Assuming parent handles initial fetch loading state, but we can check
      // setMembers([]);
      return;
    }

    const processData = () => {
      let filteredMembers: UserProfile[] = [];

      if (isAdmin) {
        filteredMembers = users;
      } else {
        const managedDepartments = departments.filter(d => d.managerId === user?.id);
        if (managedDepartments.length === 0) {
          filteredMembers = [];
        } else {
          const managedDeptIds = managedDepartments.map(d => d.id);
          filteredMembers = users.filter(u => {
            if (u.approvedTeams && u.approvedTeams.some(deptId => managedDeptIds.includes(deptId))) return true;
            if (u.pendingTeams && u.pendingTeams.some(deptId => managedDeptIds.includes(deptId))) return true;
            if (u.departmentId && managedDeptIds.includes(u.departmentId)) return true;
            return false;
          });
        }
      }

      setMembers(filteredMembers);

      // Submit stats calculation to next tick to avoid blocking UI immediately
      setTimeout(() => {
        const statsMap: Record<string, typeof memberStats[string]> = {};

        filteredMembers.forEach(member => {
          // Filter tasks for this member IN MEMORY
          // We use assignedUsers (array on Task) + createdBy to identify tasks
          // This avoids N+1 network calls
          const memberTasks = tasks.filter(t =>
            t.createdBy === member.id ||
            (t.assignedUsers && t.assignedUsers.includes(member.id))
          );

          // Approximate stats based on Task status
          // For accurate 'assignment status', we would need individual assignment docs,
          // but for the list view, task status is a good enough proxy for performance.
          const completed = memberTasks.filter(t => t.status === "completed").length;
          const inProgress = memberTasks.filter(t => t.status === "in_progress").length;
          // distinct from 'open' or 'pending'
          const pending = memberTasks.filter(t => t.status === "pending").length;

          statsMap[member.id] = {
            total: memberTasks.length,
            completed,
            pending,
            inProgress
          };
        });
        setMemberStats(statsMap);
        setLoading(false);
      }, 0);
    };

    processData();
  }, [users, departments, isAdmin, isTeamLeader, user?.id, tasks]);

  // Katılım isteklerini gerçek zamanlı dinle
  useEffect(() => {
    if (!user?.id) {
      setPendingRequests([]);
      setLoadingRequests(false);
      return;
    }

    setLoadingRequests(true);
    const unsubscribe = subscribeToTeamRequests(
      isAdmin || false,
      isTeamLeader ? user.id : null,
      (requests) => {
        setPendingRequests(requests);
        setLoadingRequests(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, isAdmin, isTeamLeader]);

  const filteredMembers = useMemo(() => {
    let filtered = members;
    if (departmentFilter !== "all") {
      filtered = filtered.filter(member => {
        if (member.approvedTeams?.includes(departmentFilter)) return true;
        if (member.pendingTeams?.includes(departmentFilter)) return true;
        if (member.departmentId === departmentFilter) return true;
        return false;
      });
    }
    return filtered;
  }, [members, departmentFilter]);

  const membersByDepartment = useMemo(() => {
    if (!isAdmin) return null;
    const grouped: Record<string, UserProfile[]> = {};
    departments.forEach(dept => { grouped[dept.id] = []; });
    grouped["no-department"] = [];

    filteredMembers.forEach(member => {
      const memberDeptIds: string[] = [];
      if (member.approvedTeams?.length) memberDeptIds.push(...member.approvedTeams);
      if (member.pendingTeams?.length) {
        member.pendingTeams.forEach(id => { if (!memberDeptIds.includes(id)) memberDeptIds.push(id); });
      }
      if (member.departmentId && !memberDeptIds.includes(member.departmentId)) memberDeptIds.push(member.departmentId);

      if (memberDeptIds.length > 0) {
        memberDeptIds.forEach(deptId => {
          if (grouped[deptId]) {
            if (!grouped[deptId].find(m => m.id === member.id)) grouped[deptId].push(member);
          }
        });
      } else {
        grouped["no-department"].push(member);
      }
    });
    return grouped;
  }, [filteredMembers, departments, isAdmin]);

  const requestsByTeam = useMemo(() => {
    const grouped: Record<string, TeamApprovalRequest[]> = {};
    pendingRequests.forEach(request => {
      if (!grouped[request.teamId]) grouped[request.teamId] = [];
      grouped[request.teamId].push(request);
    });
    return grouped;
  }, [pendingRequests]);

  const getUserRole = (member: UserProfile): string => {
    const isTeamLeader = departments.some(dept => dept.managerId === member.id);
    if (isTeamLeader) return "team_leader";
    return member.role?.[0] || "viewer";
  };

  const getRoleLabel = (roleKey: string): string => {
    const roleDef = roles.find(r => r.key === roleKey);
    return roleDef ? roleDef.label : roleKey;
  };

  const getRoleBadgeColor = (roleKey: string): string => {
    const roleDef = roles.find(r => r.key === roleKey);
    return roleDef ? roleDef.color.replace("bg-", "bg-") : "bg-gray-500";
  };

  const isUserTeamLeader = (member: UserProfile): boolean => {
    return departments.some(dept => dept.managerId === member.id);
  };

  const fetchUserStats = async (member: UserProfile) => {
    try {
      // NOTE: Here we still perform a fetch because this is an explicit user action (click), not bulk loading
      // But we could optimize this too eventually
      const { getTasks } = await import("@/services/firebase/taskService");
      const memberTasks = await getTasks({ assignedTo: member.id });

      const taskDetails = await Promise.all(memberTasks.map(async (task) => {
        const assignments = await getTaskAssignments(task.id);
        const userAssignment = assignments.find(a => a.assignedTo === member.id);

        return {
          taskTitle: task.title,
          status: userAssignment?.status || "pending",
          assignedAt: userAssignment?.assignedAt?.toDate() || task.createdAt.toDate(),
          completedAt: userAssignment?.completedAt?.toDate() || (task.status === "completed" ? task.updatedAt.toDate() : null)
        };
      }));

      return {
        userName: member.fullName || member.email,
        userEmail: member.email,
        total: memberTasks.length,
        accepted: taskDetails.filter(t => t.status === "accepted").length,
        rejected: taskDetails.filter(t => t.status === "rejected").length,
        pending: taskDetails.filter(t => t.status === "pending").length,
        completed: taskDetails.filter(t => t.status === "completed").length,
        active: taskDetails.filter(t => t.status === "accepted").length,
        assignments: taskDetails
      };
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching user stats:", error);
      throw error;
    }
  };

  const handlePreviewReport = async (member: UserProfile) => {
    setLoadingPreview(true);
    try {
      const stats = await fetchUserStats(member);
      setPreviewData({ member, stats });
      setPreviewOpen(true);
    } catch (error: unknown) {
      toast.error("Rapor yüklenemedi: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoadingPreview(false);
    }
  };

  const getDepartmentNames = (member: UserProfile) => {
    const departmentIds: string[] = [];
    if (member.approvedTeams?.length) departmentIds.push(...member.approvedTeams);
    if (member.pendingTeams?.length) {
      member.pendingTeams.forEach(id => { if (!departmentIds.includes(id)) departmentIds.push(id); });
    }
    if (member.departmentId && !departmentIds.includes(member.departmentId)) departmentIds.push(member.departmentId);

    if (departmentIds.length === 0) return "-";

    const departmentNames = departmentIds
      .map(id => departments.find(d => d.id === id)?.name)
      .filter(Boolean);

    return departmentNames.length > 0 ? departmentNames.join(", ") : "-";
  };

  const handleApproveRequest = async (userId: string, teamId: string) => {
    if (!user?.id) return;
    try {
      await approveTeamRequest(userId, teamId, user.id);
      toast.success("Katılım isteği onaylandı");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error("İstek onaylanamadı: " + errorMessage);
    }
  };

  if (loading && !members.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1 h-full flex flex-col">
      {/* Katılım İstekleri Bölümü */}
      {pendingRequests.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Katılım İstekleri
              <Badge variant="secondary" className="ml-auto">{pendingRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingRequests.map((request) => (
                  <Card key={`${request.userId}-${request.teamId}`} className="border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {request.userName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm line-clamp-1">{request.userName}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{request.userEmail}</p>
                          {isAdmin && <p className="text-xs text-blue-600 mt-1">{departments.find(d => d.id === request.teamId)?.name}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => handleApproveRequest(request.userId, request.teamId)}
                        >
                          <Check className="h-4 w-4" />
                          Kabul Et
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 gap-2"
                          onClick={() => {
                            setSelectedRequest({ userId: request.userId, teamId: request.teamId });
                            setRejectDialogOpen(true);
                          }}
                        >
                          <X className="h-4 w-4" />
                          Reddet
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grid Content */}
      <div className="space-y-6">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>{departmentFilter !== "all" ? "Filtre kriterlerinize uygun üye bulunamadı." : "Ekibinizde üye bulunmuyor."}</p>
          </div>
        ) : isAdmin && membersByDepartment ? (
          Object.entries(membersByDepartment).map(([deptId, deptMembers]) => {
            if (deptMembers.length === 0) return null;
            const dept = departments.find(d => d.id === deptId);
            const deptName = dept ? dept.name : (deptId === "no-department" ? "Departmanı Olmayan Üyeler" : "Bilinmeyen Departman");

            return (
              <div key={deptId} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">{deptName}</h3>
                  <Badge variant="secondary" className="ml-auto">{deptMembers.length} üye</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
                  {deptMembers.map(member => <MemberCard key={member.id} member={member} stats={memberStats[member.id]} />)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map(member => <MemberCard key={member.id} member={member} stats={memberStats[member.id]} />)}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {/* User Stats Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personel Performans Raporu</DialogTitle>
            <DialogDescription>
              Seçili personel için detaylı performans ve görev analiz raporu.
            </DialogDescription>
          </DialogHeader>

          {loadingPreview ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : previewData && (
            <div className="space-y-6">
              {/* User Header */}
              <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border">
                <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {previewData.member.fullName?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{previewData.member.fullName}</h3>
                  <p className="text-sm text-muted-foreground">{previewData.member.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getDepartmentNames(previewData.member)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {getRoleLabel(getUserRole(previewData.member))}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/10 shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-primary">{previewData.stats.total}</span>
                    <span className="text-xs text-muted-foreground font-medium mt-1">Toplam Görev</span>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100 shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-green-700">{previewData.stats.completed}</span>
                    <span className="text-xs text-green-600 font-medium mt-1">Tamamlanan</span>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-100 shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-blue-700">{previewData.stats.active}</span>
                    <span className="text-xs text-blue-600 font-medium mt-1">Devam Eden</span>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50 border-yellow-100 shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-yellow-700">{previewData.stats.pending}</span>
                    <span className="text-xs text-yellow-600 font-medium mt-1">Bekleyen</span>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Tasks */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Son Görevler
                </h4>
                <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                  {previewData.stats.assignments.length > 0 ? (
                    previewData.stats.assignments.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()).slice(0, 10).map((task, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="text-sm font-medium truncate">{task.taskTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            Atanma: {format(new Date(task.assignedAt), "d MMM yyyy", { locale: tr })}
                          </p>
                        </div>
                        <Badge variant={task.status === "completed" ? "default" : task.status === "pending" ? "outline" : "secondary"} className={
                          task.status === "completed" ? "bg-green-600 hover:bg-green-700" :
                            task.status === "in_progress" || task.status === "accepted" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
                        }>
                          {task.status === "completed" ? "Tamamlandı" :
                            task.status === "in_progress" ? "Sürüyor" :
                              task.status === "accepted" ? "Aktif" : "Bekliyor"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Kayıtlı görev bulunamadı.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Kapat</Button>
            <Button
              className="gap-2"
              onClick={async () => {
                if (!previewData) return;
                try {
                  const { generateUserStatsPDF } = await import("@/services/pdf");

                  // Use previewData.stats directly as it matches UserStatsReportData interface
                  const blob = await generateUserStatsPDF(previewData.stats);

                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `Personel-Raporu-${previewData.member.fullName || 'User'}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast.success("PDF raporu indirildi");
                } catch (error) {
                  console.error(error);
                  toast.error("PDF oluşturulurken bir hata oluştu");
                }
              }}
              disabled={loadingPreview || !previewData}
            >
              <Download className="h-4 w-4" />
              PDF İndir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İsteği Reddet</DialogTitle>
            <DialogDescription>
              Bu katılım isteğini reddetmek istediğinize emin misiniz? İsterseniz bir neden belirtebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Red Nedeni (İsteğe Bağlı)</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reddetme nedeni..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>İptal</Button>
            <Button variant="destructive" onClick={async () => {
              if (!user?.id || !selectedRequest) return;
              try {
                await rejectTeamRequest(selectedRequest.userId, selectedRequest.teamId, rejectReason || undefined, user.id);
                toast.success("Katılım isteği reddedildi");
                setRejectDialogOpen(false);
              } catch (error) {
                toast.error("İstek reddedilemedi");
              }
            }}>Reddet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function MemberCard({ member, stats }: { member: UserProfile, stats: any }) {
    const s = stats || { total: 0, completed: 0, pending: 0, inProgress: 0 };
    return (
      <Card className="hover:shadow-md transition-shadow h-full flex flex-col min-w-0 overflow-hidden">
        <CardContent className="p-4 space-y-4 flex flex-col h-full min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="h-14 w-14 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                {member.fullName ? member.fullName.substring(0, 2).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0 mb-1">
                <p className="font-semibold text-base truncate">{member.fullName || "İsimsiz"}</p>
                {(member.role?.includes("super_admin") || member.role?.includes("main_admin") || isUserTeamLeader(member)) && (
                  <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{member.email}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">{formatPhoneForDisplay(member.phone)}</p>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Toplam Görev</span>
              <span className="font-semibold">{s.total}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 mb-1.5" />
                <span className="text-base font-bold text-green-700">{s.completed}</span>
                <span className="text-xs text-green-600 mt-0.5">Tamamlandı</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600 mb-1.5" />
                <span className="text-base font-bold text-blue-700">{s.inProgress}</span>
                <span className="text-xs text-blue-600 mt-0.5">Devam Ediyor</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 mb-1.5" />
                <span className="text-base font-bold text-yellow-700">{s.pending}</span>
                <span className="text-xs text-yellow-600 mt-0.5">Bekliyor</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t mt-auto">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Departman</span>
              <span className="font-medium text-right truncate flex-1 ml-2">{getDepartmentNames(member)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rol</span>
              <Badge className={`${getRoleBadgeColor(getUserRole(member))} text-white text-xs px-2 py-0.5`}>
                {getRoleLabel(getUserRole(member))}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePreviewReport(member)}>
              <FileText className="h-4 w-4 mr-2" />
              Rapor
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
};
