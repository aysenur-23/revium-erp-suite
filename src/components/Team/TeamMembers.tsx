import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, FileText, Loader2, Shield, Search, Mail, Phone, CheckCircle2, Clock, XCircle, TrendingUp, Eye, Download, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { getDepartments, Department } from "@/services/firebase/departmentService";
import { generateUserStatsPDF } from "@/services/pdfGenerator";
import { getTasks, getTaskAssignments, Task } from "@/services/firebase/taskService";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPhoneForDisplay } from "@/utils/phoneNormalizer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { getRoles, RoleDefinition } from "@/services/firebase/rolePermissionsService";

export const TeamMembers = () => {
  const { user, isAdmin, isTeamLeader } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
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

  useEffect(() => {
    fetchTeamData();
  }, [user, isAdmin]);

  const fetchTeamData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [allUsers, allDepts, allRoles] = await Promise.all([
        getAllUsers(),
        getDepartments(),
        getRoles()
      ]);
      
      setDepartments(allDepts);
      setRoles(allRoles);

      let filteredMembers: UserProfile[] = [];

      if (isAdmin) {
        // Admin herkesi görür
        filteredMembers = allUsers;
      } else {
        // Ekip lideri sadece yönettiği departmanlardaki üyeleri görür
        // Kullanıcının yönettiği tüm departmanları bul (managerId kontrolü)
        const managedDepartments = allDepts.filter(d => d.managerId === user.id);
        
        if (managedDepartments.length === 0) {
          // Kullanıcı hiçbir departmanın yöneticisi değilse boş liste
          filteredMembers = [];
        } else {
          // Kullanıcının yönettiği tüm departman ID'lerini topla
          const managedDeptIds = managedDepartments.map(d => d.id);
          
          // KRİTİK: approvedTeams, pendingTeams ve departmentId alanlarını kontrol et
          filteredMembers = allUsers.filter(u => {
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

      // Kendini listeden çıkar (isteğe bağlı, genelde lider kendini de görmek ister ama rapor başkası içinse çıkarılabilir)
      // filteredMembers = filteredMembers.filter(m => m.id !== user.id);

      setMembers(filteredMembers);

      // Her üye için görev istatistiklerini al
      const statsMap: Record<string, {
        total: number;
        completed: number;
        pending: number;
        inProgress: number;
      }> = {};

      await Promise.all(
        filteredMembers.map(async (member) => {
          try {
            const memberTasks = await getTasks({ assignedTo: member.id });
            const assignments = await Promise.all(
              memberTasks.map(async (task) => {
                const taskAssignments = await getTaskAssignments(task.id);
                return taskAssignments.find(a => a.assignedTo === member.id);
              })
            );

            const completed = assignments.filter(a => a?.status === "completed").length;
            const pending = assignments.filter(a => a?.status === "pending").length;
            const inProgress = assignments.filter(a => a?.status === "accepted").length;

            statsMap[member.id] = {
              total: memberTasks.length,
              completed,
              pending,
              inProgress,
            };
          } catch (error) {
            console.error(`Error fetching stats for ${member.id}:`, error);
            statsMap[member.id] = { total: 0, completed: 0, pending: 0, inProgress: 0 };
          }
        })
      );

      setMemberStats(statsMap);
    } catch (error: any) {
      console.error("Fetch team members error:", error);
      toast.error("Ekip üyeleri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Arama filtresi
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        member.fullName?.toLowerCase().includes(search) ||
        member.email?.toLowerCase().includes(search) ||
        member.phone?.toLowerCase().includes(search)
      );
    }

    // Departman filtresi
    if (departmentFilter !== "all") {
      filtered = filtered.filter(member => {
        // approvedTeams kontrolü
        if (member.approvedTeams?.includes(departmentFilter)) return true;
        // pendingTeams kontrolü
        if (member.pendingTeams?.includes(departmentFilter)) return true;
        // departmentId kontrolü
        if (member.departmentId === departmentFilter) return true;
        return false;
      });
    }

    return filtered;
  }, [members, searchTerm, departmentFilter]);

  // Yönetici için ekiplere göre gruplandırılmış üyeler
  const membersByDepartment = useMemo(() => {
    if (!isAdmin) return null;
    
    const grouped: Record<string, UserProfile[]> = {};
    
    // Tüm departmanlar için boş array oluştur
    departments.forEach(dept => {
      grouped[dept.id] = [];
    });
    
    // "Departmanı olmayan" kategorisi
    grouped["no-department"] = [];
    
    filteredMembers.forEach(member => {
      const memberDeptIds: string[] = [];
      
      if (member.approvedTeams && member.approvedTeams.length > 0) {
        memberDeptIds.push(...member.approvedTeams);
      }
      if (member.pendingTeams && member.pendingTeams.length > 0) {
        member.pendingTeams.forEach(id => {
          if (!memberDeptIds.includes(id)) memberDeptIds.push(id);
        });
      }
      if (member.departmentId && !memberDeptIds.includes(member.departmentId)) {
        memberDeptIds.push(member.departmentId);
      }
      
      if (memberDeptIds.length > 0) {
        memberDeptIds.forEach(deptId => {
          if (grouped[deptId]) {
            // Aynı üye birden fazla departmanda olabilir, her departmanda göster
            if (!grouped[deptId].find(m => m.id === member.id)) {
              grouped[deptId].push(member);
            }
          }
        });
      } else {
        grouped["no-department"].push(member);
      }
    });
    
    return grouped;
  }, [filteredMembers, departments, isAdmin]);

  // Dinamik rol fonksiyonları
  const getUserRole = (member: UserProfile): string => {
    // Önce departments tablosundaki managerId kontrolü yap (ekip lideri)
    const isTeamLeader = departments.some(dept => dept.managerId === member.id);
    if (isTeamLeader) {
      return "team_leader";
    }
    // Sonra role array'inden ilk rolü al
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
    } catch (error: any) {
      console.error("Error fetching user stats:", error);
      throw error;
    }
  };

  const handlePreviewReport = async (member: UserProfile) => {
    setLoadingPreview(true);
    try {
      const stats = await fetchUserStats(member);
      setPreviewData({ member, stats });
      setPreviewOpen(true);
    } catch (error: any) {
      toast.error("Rapor yüklenemedi: " + error.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownloadReport = async (member: UserProfile) => {
    setGeneratingPdfId(member.id);
    try {
      const stats = await fetchUserStats(member);
      const pdfBlob = await generateUserStatsPDF(stats);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${member.fullName || "Kullanici"}-Raporu.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Rapor indirildi");
    } catch (error: any) {
      console.error("Report generation error:", error);
      toast.error("Rapor oluşturulamadı: " + error.message);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleDownloadFromPreview = async () => {
    if (!previewData) return;
    setGeneratingPdfId(previewData.member.id);
    try {
      const pdfBlob = await generateUserStatsPDF(previewData.stats);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${previewData.member.fullName || "Kullanici"}-Raporu.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Rapor indirildi");
    } catch (error: any) {
      console.error("Report generation error:", error);
      toast.error("Rapor oluşturulamadı: " + error.message);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const getDepartmentNames = (member: UserProfile) => {
    const departmentIds: string[] = [];
    
    // approvedTeams kontrolü
    if (member.approvedTeams && member.approvedTeams.length > 0) {
      departmentIds.push(...member.approvedTeams);
    }
    
    // pendingTeams kontrolü (onay bekleyen departmanlar da gösterilebilir)
    if (member.pendingTeams && member.pendingTeams.length > 0) {
      member.pendingTeams.forEach(id => {
        if (!departmentIds.includes(id)) {
          departmentIds.push(id);
        }
      });
    }
    
    // departmentId kontrolü (eski sistem uyumluluğu için)
    if (member.departmentId && !departmentIds.includes(member.departmentId)) {
      departmentIds.push(member.departmentId);
    }
    
    if (departmentIds.length === 0) return "-";
    
    const departmentNames = departmentIds
      .map(id => departments.find(d => d.id === id)?.name)
      .filter(Boolean);
    
    return departmentNames.length > 0 ? departmentNames.join(", ") : "-";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
    <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Filtreler */}
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchInput
              placeholder="İsim, e-posta veya telefon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              containerClassName="flex-1"
            />
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Departman Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Departmanlar</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{searchTerm || departmentFilter !== "all" ? "Arama kriterlerinize uygun üye bulunamadı." : "Ekibinizde üye bulunmuyor."}</p>
          </div>
        ) : isAdmin && membersByDepartment ? (
          // Yönetici için ekiplere göre kategorik gösterim
          <div className="space-y-6">
            {Object.entries(membersByDepartment).map(([deptId, deptMembers]) => {
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deptMembers.map((member) => {
                      const stats = memberStats[member.id] || { total: 0, completed: 0, pending: 0, inProgress: 0 };
                      
                      return (
                        <Card
                          key={member.id}
                          className="hover:shadow-md transition-shadow h-full flex flex-col"
                        >
                          <CardContent className="p-4 space-y-4 flex flex-col h-full">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Avatar className="h-12 w-12 flex-shrink-0">
                                  <AvatarImage src={undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {member.fullName ? member.fullName.substring(0, 2).toUpperCase() : "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold line-clamp-1">{member.fullName || "İsimsiz"}</p>
                                    {(member.role?.includes("admin") || member.role?.includes("super_admin") || isUserTeamLeader(member)) && (
                                      <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-1">{member.email}</p>
                                  {member.phone && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {formatPhoneForDisplay(member.phone)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* İletişim Butonları */}
                            <div className="flex gap-2">
                              {member.email && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 gap-2"
                                  onClick={() => window.location.href = `mailto:${member.email}`}
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                  Mail
                                </Button>
                              )}
                              {member.phone && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 gap-2"
                                  onClick={() => window.location.href = `tel:${member.phone}`}
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  Ara
                                </Button>
                              )}
                            </div>
                            
                            {/* Görev İstatistikleri */}
                            <div className="space-y-2 pt-2 border-t">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Toplam Görev:</span>
                                <span className="font-semibold">{stats.total}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col items-center p-2 bg-green-50 rounded min-h-[70px] w-full">
                                  <CheckCircle2 className="h-4 w-4 text-green-600 mb-1" />
                                  <span className="text-xs font-semibold text-green-700">{stats.completed}</span>
                                  <span className="text-[10px] text-green-600">Tamamlandı</span>
                                </div>
                                <div className="flex flex-col items-center p-2 bg-blue-50 rounded min-h-[70px] w-full">
                                  <TrendingUp className="h-4 w-4 text-blue-600 mb-1" />
                                  <span className="text-xs font-semibold text-blue-700">{stats.inProgress}</span>
                                  <span className="text-[10px] text-blue-600">Devam Ediyor</span>
                                </div>
                                <div className="flex flex-col items-center p-2 bg-yellow-50 rounded min-h-[70px] w-full">
                                  <Clock className="h-4 w-4 text-yellow-600 mb-1" />
                                  <span className="text-xs font-semibold text-yellow-700">{stats.pending}</span>
                                  <span className="text-[10px] text-yellow-600">Bekliyor</span>
                                </div>
                              </div>
                            </div>

                            {/* Bilgiler */}
                            <div className="space-y-2 text-sm pt-2 border-t">
                              <div className="flex justify-between text-muted-foreground">
                                <span>Departman:</span>
                                <span className="text-foreground font-medium text-right">{getDepartmentNames(member)}</span>
                              </div>
                              <div className="flex justify-between text-muted-foreground">
                                <span>Rol:</span>
                                <Badge className={`${getRoleBadgeColor(getUserRole(member))} text-white hover:opacity-80`}>
                                  {getRoleLabel(getUserRole(member))}
                                </Badge>
                              </div>
                            </div>

                            {/* Rapor Butonları */}
                            <div className="flex gap-2 mt-auto">
                              <Button 
                                variant="outline" 
                                className="flex-1 gap-2"
                                onClick={() => handlePreviewReport(member)}
                                disabled={loadingPreview}
                              >
                                {loadingPreview ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                                Önizle
                              </Button>
                              <Button 
                                variant="default" 
                                className="flex-1 gap-2"
                                onClick={() => handleDownloadReport(member)}
                                disabled={generatingPdfId === member.id}
                              >
                                {generatingPdfId === member.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                                İndir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Ekip lideri için normal liste gösterimi
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => {
                const stats = memberStats[member.id] || { total: 0, completed: 0, pending: 0, inProgress: 0 };
                
                return (
                  <Card
                key={member.id}
                    className="hover:shadow-md transition-shadow h-full flex flex-col"
              >
                    <CardContent className="p-4 space-y-4 flex flex-col h-full">
                <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.fullName ? member.fullName.substring(0, 2).toUpperCase() : "U"}
                            </AvatarFallback>
                    </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                      <p className="font-semibold line-clamp-1">{member.fullName || "İsimsiz"}</p>
                              {(member.role?.includes("admin") || member.role?.includes("super_admin") || isUserTeamLeader(member)) && (
                                <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{member.email}</p>
                            {member.phone && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {formatPhoneForDisplay(member.phone)}
                              </p>
                            )}
                          </div>
                    </div>
                  </div>

                      {/* İletişim Butonları */}
                      <div className="flex gap-2">
                        {member.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => window.location.href = `mailto:${member.email}`}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Mail
                          </Button>
                        )}
                        {member.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => window.location.href = `tel:${member.phone}`}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Ara
                          </Button>
                  )}
                </div>
                
                      {/* Görev İstatistikleri */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Toplam Görev:</span>
                          <span className="font-semibold">{stats.total}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col items-center p-2 bg-green-50 rounded min-h-[70px] w-full">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mb-1" />
                            <span className="text-xs font-semibold text-green-700">{stats.completed}</span>
                            <span className="text-[10px] text-green-600">Tamamlandı</span>
                          </div>
                          <div className="flex flex-col items-center p-2 bg-blue-50 rounded min-h-[70px] w-full">
                            <TrendingUp className="h-4 w-4 text-blue-600 mb-1" />
                            <span className="text-xs font-semibold text-blue-700">{stats.inProgress}</span>
                            <span className="text-[10px] text-blue-600">Devam Ediyor</span>
                          </div>
                          <div className="flex flex-col items-center p-2 bg-yellow-50 rounded min-h-[70px] w-full">
                            <Clock className="h-4 w-4 text-yellow-600 mb-1" />
                            <span className="text-xs font-semibold text-yellow-700">{stats.pending}</span>
                            <span className="text-[10px] text-yellow-600">Bekliyor</span>
                          </div>
                        </div>
                      </div>

                      {/* Bilgiler */}
                      <div className="space-y-2 text-sm pt-2 border-t">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Departman:</span>
                    <span className="text-foreground font-medium text-right">{getDepartmentNames(member)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Rol:</span>
                    <Badge className={`${getRoleBadgeColor(getUserRole(member))} text-white hover:opacity-80`}>
                      {getRoleLabel(getUserRole(member))}
                    </Badge>
                  </div>
                </div>

                      {/* Rapor Butonları */}
                      <div className="flex gap-2 mt-auto">
                <Button 
                  variant="outline" 
                          className="flex-1 gap-2"
                          onClick={() => handlePreviewReport(member)}
                          disabled={loadingPreview}
                        >
                          {loadingPreview ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          Önizle
                        </Button>
                        <Button 
                          variant="default" 
                          className="flex-1 gap-2"
                  onClick={() => handleDownloadReport(member)}
                  disabled={generatingPdfId === member.id}
                >
                  {generatingPdfId === member.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                            <Download className="h-4 w-4" />
                  )}
                          İndir
                </Button>
              </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>

      {/* Rapor Önizleme Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-full max-w-[98vw] md:max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Kullanıcı Performans Raporu - {previewData?.member.fullName || previewData?.member.email}
            </DialogTitle>
            <DialogDescription>
              {previewData?.member.email} - {new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-6 py-4">
              {/* İstatistik Kartları */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Toplam Görev</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">{previewData.stats.total}</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Tamamlanan</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">{previewData.stats.completed}</p>
                        <p className="text-xs text-green-600 mt-1">
                          {previewData.stats.total > 0 
                            ? `%${Math.round((previewData.stats.completed / previewData.stats.total) * 100)}`
                            : "%0"}
                        </p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-700">Aktif Görevler</p>
                        <p className="text-2xl font-bold text-yellow-900 mt-1">{previewData.stats.active}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detaylı İstatistikler */}
              <Card>
                <CardHeader>
                  <CardTitle>Detaylı İstatistikler</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metrik</TableHead>
                        <TableHead className="text-center">Değer</TableHead>
                        <TableHead className="text-center">Oran</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Toplam Görev</TableCell>
                        <TableCell className="text-center">{previewData.stats.total}</TableCell>
                        <TableCell className="text-center">%100</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Tamamlanan</TableCell>
                        <TableCell className="text-center">{previewData.stats.completed}</TableCell>
                        <TableCell className="text-center">
                          {previewData.stats.total > 0 
                            ? `%${Math.round((previewData.stats.completed / previewData.stats.total) * 100)}`
                            : "%0"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Kabul Edilen</TableCell>
                        <TableCell className="text-center">{previewData.stats.accepted}</TableCell>
                        <TableCell className="text-center">
                          {previewData.stats.total > 0 
                            ? `%${Math.round((previewData.stats.accepted / previewData.stats.total) * 100)}`
                            : "%0"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Beklemede</TableCell>
                        <TableCell className="text-center">{previewData.stats.pending}</TableCell>
                        <TableCell className="text-center">
                          {previewData.stats.total > 0 
                            ? `%${Math.round((previewData.stats.pending / previewData.stats.total) * 100)}`
                            : "%0"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Reddedilen</TableCell>
                        <TableCell className="text-center">{previewData.stats.rejected}</TableCell>
                        <TableCell className="text-center">
                          {previewData.stats.total > 0 
                            ? `%${Math.round((previewData.stats.rejected / previewData.stats.total) * 100)}`
                            : "%0"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Aktif Görevler</TableCell>
                        <TableCell className="text-center">{previewData.stats.active}</TableCell>
                        <TableCell className="text-center">
                          {previewData.stats.total > 0 
                            ? `%${Math.round((previewData.stats.active / previewData.stats.total) * 100)}`
                            : "%0"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Görev Detayları */}
              {previewData.stats.assignments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Görev Detayları</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Görev Başlığı</TableHead>
                            <TableHead className="text-center">Durum</TableHead>
                            <TableHead className="text-center">Atanma Tarihi</TableHead>
                            <TableHead className="text-center">Tamamlanma Tarihi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.stats.assignments.map((assignment, index) => {
                            const statusLabels: Record<string, string> = {
                              "pending": "Beklemede",
                              "accepted": "Kabul Edildi",
                              "rejected": "Reddedildi",
                              "completed": "Tamamlandı",
                              "in_progress": "Devam Ediyor",
                            };

                            const assignedDate = assignment.assignedAt instanceof Date
                              ? assignment.assignedAt
                              : new Date(assignment.assignedAt);
                            const completedDate = assignment.completedAt
                              ? (assignment.completedAt instanceof Date
                                ? assignment.completedAt
                                : new Date(assignment.completedAt))
                              : null;

                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{assignment.taskTitle}</TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant={
                                      assignment.status === "completed" ? "default" :
                                      assignment.status === "accepted" || assignment.status === "in_progress" ? "secondary" :
                                      assignment.status === "rejected" ? "destructive" : "outline"
                                    }
                                  >
                                    {statusLabels[assignment.status] || assignment.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {format(assignedDate, "dd.MM.yyyy", { locale: tr })}
                                </TableCell>
                                <TableCell className="text-center">
                                  {completedDate ? format(completedDate, "dd.MM.yyyy", { locale: tr }) : "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Özet */}
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>{previewData.stats.userName}</strong> kullanıcısı toplam{" "}
                    <strong>{previewData.stats.total}</strong> görev almış,{" "}
                    <strong>{previewData.stats.completed}</strong> görevi tamamlamıştır.{" "}
                    Tamamlanma oranı:{" "}
                    <strong>
                      %{previewData.stats.total > 0 
                        ? Math.round((previewData.stats.completed / previewData.stats.total) * 100)
                        : 0}
                    </strong>
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Kapat
            </Button>
            <Button 
              onClick={handleDownloadFromPreview}
              disabled={!previewData || generatingPdfId === previewData?.member.id}
            >
              {generatingPdfId === previewData?.member.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  İndiriliyor...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  PDF İndir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

