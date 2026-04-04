import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Shield, User as UserIcon, Trash2, AlertTriangle } from "lucide-react";
import { getAllUsers, updateFirebaseUserProfile, UserProfile, deleteUser } from "@/services/firebase/authService";
import { getRoles, RoleDefinition, onPermissionCacheChange } from "@/services/firebase/rolePermissionsService";
import { getDepartments, updateDepartment } from "@/services/firebase/departmentService";
import { Timestamp, collection, onSnapshot, Unsubscribe } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhoneForDisplay } from "@/utils/phoneNormalizer";
import { formatLastLogin, isUserOnline } from "@/utils/formatLastLogin";
import { Circle } from "lucide-react";
import { firestore } from "@/lib/firebase";

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  created_at: Timestamp;
  departments?: { name: string } | null;
  roles?: string[];
  last_login_at?: Timestamp | null;
}

interface Department {
  id: string;
  name: string;
  managerId?: string | null;
}

export const UserManagement = () => {
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<string>("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Kullanıcı koleksiyonu için real-time listener
    let unsubscribe: Unsubscribe | null = null;
    if (firestore) {
      const usersRef = collection(firestore, "users");
      unsubscribe = onSnapshot(
        usersRef,
        (snapshot) => {
          try {
            const fetchedUsers = snapshot.docs
              .map((doc) => ({ id: doc.id, ...doc.data() } as UserProfile))
              .filter((u: UserProfile) => !("deleted" in u && (u as unknown as { deleted?: boolean }).deleted))
              .map((u: UserProfile) => ({
                id: u.id,
                full_name: u.fullName || u.displayName || "",
                email: u.email,
                phone: u.phone || null,
                department_id: u.departmentId || null,
                created_at: u.createdAt instanceof Timestamp ? u.createdAt : (u.createdAt instanceof Date ? Timestamp.fromDate(u.createdAt) : Timestamp.now()),
                roles: u.role || [],
                last_login_at: u.lastLoginAt instanceof Timestamp ? u.lastLoginAt : (u.lastLoginAt instanceof Date ? Timestamp.fromDate(u.lastLoginAt) : null),
              }));
            setUsers(fetchedUsers);
            setLoading(false);
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error("Real-time kullanıcı güncelleme hatası:", error);
            }
          }
        },
        (error) => {
          if (import.meta.env.DEV) {
            console.error("Users snapshot error:", error);
          }
        }
      );
    }
    
    // Interval kaldırıldı - performans için gereksiz (kullanıcı manuel yenileme yapabilir)
    
    // Yetki cache'i değiştiğinde kullanıcı listesini tazele (rol görünürlükleri için)
    const unsubscribePermissionCache = onPermissionCacheChange(() => {
      fetchData();
    });

    return () => {
      if (unsubscribe) unsubscribe();
      unsubscribePermissionCache?.();
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch users, departments, and roles in parallel
      const [fetchedUsers, fetchedRoles] = await Promise.all([
        getAllUsers(),
        getRoles(),
      ]);

      // Silinmiş kullanıcıları filtrele (getAllUsers zaten filtreliyor ama yine de kontrol edelim)
      setUsers(fetchedUsers
        .filter((u: UserProfile) => !('deleted' in u && u.deleted))
        .map((u: UserProfile) => ({
          id: u.id,
          full_name: u.fullName || u.displayName || "",
          email: u.email,
          phone: u.phone || null,
          department_id: u.departmentId || null,
          created_at: u.createdAt instanceof Timestamp ? u.createdAt : (u.createdAt instanceof Date ? Timestamp.fromDate(u.createdAt) : Timestamp.now()),
          roles: u.role || [],
          last_login_at: u.lastLoginAt instanceof Timestamp ? u.lastLoginAt : (u.lastLoginAt instanceof Date ? Timestamp.fromDate(u.lastLoginAt) : null),
        })));

      setRoles(fetchedRoles);

      // Departments collection'ı getir
      const { getDepartments } = await import("@/services/firebase/departmentService");
      const fetchedDepartments = await getDepartments();
      setDepartments(fetchedDepartments.map((d) => ({
        id: d.id,
        name: d.name,
        managerId: d.managerId || null,
      })));
    } catch (error: unknown) {
      toast.error("Veriler yüklenirken hata: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;

    // Alt yetki kontrolü
    try {
      const { canPerformSubPermission } = await import("@/utils/permissions");
      const userProfile: UserProfile = {
        id: user?.id || "",
        email: user?.email || "",
        emailVerified: user?.emailVerified || false,
        fullName: user?.fullName || "",
        displayName: ('displayName' in user && typeof user.displayName === 'string' ? user.displayName : null) || user?.fullName || "",
        phone: user?.phone || null,
        dateOfBirth: user?.dateOfBirth || null,
        role: user?.roles || [],
        createdAt: null,
        updatedAt: null,
      };
      const hasPermission = await canPerformSubPermission(userProfile, "users", "canChangeRole");
      if (!hasPermission) {
        toast.error("Rol değiştirme yetkiniz yok");
        return;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Permission check error:", error);
      }
      toast.error("Yetki kontrolü yapılamadı");
      return;
    }

    try {
      // Rolün roles collection'ında tanımlı olduğundan emin ol
      const roleExists = roles.find(r => r.key === newRole);
      if (!roleExists) {
        toast.error("Seçilen rol tanımlı değil. Lütfen geçerli bir rol seçin.");
        return;
      }

      // Single role assignment for simplicity in this UI, but data structure supports array
      // If you want to support multiple roles, you'd need a multi-select or logic to add/remove
      // For now, replacing the role seems to be the intended behavior based on the single select UI
      const updatedRoles = [newRole]; 
      const oldRole = selectedUser.roles?.[0] || "viewer";
      
      // Kullanıcının rolünü güncelle - roles collection'ındaki tanımlarla senkronize
      await updateFirebaseUserProfile(selectedUser.id, {
        role: updatedRoles,
      });

      // Eğer team_leader rolü atanıyorsa, kullanıcıyı bir departmanın manager'ı olarak ata (ZORUNLU)
      if (newRole === "team_leader") {
        try {
          const departments = await getDepartments();
          // Kullanıcının zaten bir departmanın manager'ı olup olmadığını kontrol et
          const isAlreadyManager = departments.some(d => d.managerId === selectedUser.id);
          
          if (!isAlreadyManager) {
            // Manager'ı olmayan ilk departmanı bul
            const departmentWithoutManager = departments.find(d => !d.managerId);
            
            if (departmentWithoutManager) {
              // Kullanıcıyı bu departmanın manager'ı olarak ata
              await updateDepartment(departmentWithoutManager.id, {
                managerId: selectedUser.id,
              }, user?.id || null);
              toast.success(`${selectedUser.full_name || selectedUser.email} kullanıcısı "${departmentWithoutManager.name}" departmanının lideri olarak atandı`);
              
              // Ekip kontrolü yap (uyarı ver ama engelleme)
              const { validateTeamLeaderHasTeam } = await import("@/utils/validateTeamLeader");
              const teamValidation = await validateTeamLeaderHasTeam(selectedUser.id);
              if (!teamValidation.isValid) {
                toast.warning("Uyarı: Ekip lideri henüz ekip üyesine sahip değil. Lütfen ekip yönetiminden ekip üyeleri ekleyin.");
              }
            } else {
              // Hiç boş departman yoksa hata ver ve rol atamasını iptal et
              toast.error("Ekip lideri rolü atanamadı: Ekip lideri mutlaka bir departmanın yöneticisi olmalıdır. Lütfen önce bir departman oluşturun veya mevcut bir departmanın yöneticisini kaldırın.");
              // Rol güncellemesini geri al
              await updateFirebaseUserProfile(selectedUser.id, {
                role: [oldRole],
              });
              return;
            }
          } else {
            // Zaten manager ise, ekip kontrolü yap
            const { validateTeamLeaderHasTeam } = await import("@/utils/validateTeamLeader");
            const teamValidation = await validateTeamLeaderHasTeam(selectedUser.id);
            if (!teamValidation.isValid) {
              toast.warning("Uyarı: Ekip lideri henüz ekip üyesine sahip değil. Lütfen ekip yönetiminden ekip üyeleri ekleyin.");
            }
          }
        } catch (deptError: unknown) {
          if (import.meta.env.DEV) {
            console.error("Departman atama hatası:", deptError);
          }
          // Departman atama hatası durumunda rol güncellemesini geri al
          toast.error("Ekip lideri rolü atanamadı: Departman ataması yapılamadı. Lütfen departman yönetiminden manuel olarak atayın.");
          // Rol güncellemesini geri al
          await updateFirebaseUserProfile(selectedUser.id, {
            role: [oldRole],
          });
          return;
        }
      } else if (oldRole === "team_leader" && newRole !== "team_leader") {
        // Eğer team_leader rolü kaldırılıyorsa, kullanıcıyı tüm departmanlardan manager olarak kaldır
        try {
          const departments = await getDepartments();
          const managedDepartments = departments.filter(d => d.managerId === selectedUser.id);
          
          for (const dept of managedDepartments) {
            await updateDepartment(dept.id, {
              managerId: null,
            }, user?.id || null);
          }
          
          if (managedDepartments.length > 0) {
            toast.success(`${selectedUser.full_name || selectedUser.email} kullanıcısı ${managedDepartments.length} departmandan manager olarak kaldırıldı`);
          }
        } catch (deptError: unknown) {
          if (import.meta.env.DEV) {
            console.error("Departman manager kaldırma hatası:", deptError);
          }
          // Hata durumunda sessizce devam et
        }
      }

      // Rol değişikliği bildirimi gönder
      try {
        const { createNotification } = await import("@/services/firebase/notificationService");
        const roleDef = roles.find(r => r.key === newRole);
        const roleLabel = roleDef ? roleDef.label : newRole;
        const oldRoleDef = roles.find(r => r.key === oldRole);
        const oldRoleLabel = oldRoleDef ? oldRoleDef.label : oldRole;
        
        await createNotification({
          userId: selectedUser.id,
          type: "role_changed",
          title: "Rolünüz güncellendi",
          message: `Rolünüz "${oldRoleLabel}" olarak değiştirildi. Yeni rolünüz: "${roleLabel}".`,
          read: false,
          relatedId: null,
          metadata: { oldRole, newRole },
        });
      } catch (notifError) {
        if (import.meta.env.DEV) {
          console.error("Rol değişikliği bildirimi gönderilemedi:", notifError);
        }
        // Bildirim hatası rol güncellemesini engellemez
      }

      // Permission cache'i temizle - bu tüm dinleyicileri tetikleyecek
      // AuthContext'teki onPermissionCacheChange callback'i otomatik olarak çağrılacak
      // ve kullanıcı profilini yeniden yükleyip checkRoles fonksiyonunu çağıracak
      // Bu sayede yetkiler dinamik olarak güncellenecek
      try {
        const { clearPermissionCache } = await import("@/services/firebase/rolePermissionsService");
        clearPermissionCache();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Permission cache temizleme hatası:", error);
        }
      }

      toast.success("Kullanıcı rolü başarıyla güncellendi");
      setShowRoleDialog(false);
      setSelectedUser(null);
      setNewRole("");
      fetchData();
    } catch (error: unknown) {
      toast.error("Rol güncellenemedi: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    }
  };

  const handleAssignTeamLeader = async (userId: string, departmentId: string) => {
    if (!isAdmin) {
      toast.error("Bu işlem için yönetici yetkisi gereklidir");
      return;
    }

    if (!departmentId || departmentId === "none") {
      toast.error("Lütfen bir departman seçin");
      return;
    }

    try {
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser) {
        toast.error("Kullanıcı bulunamadı");
        return;
      }

      // Kullanıcının mevcut rolleri
      const currentRoles = targetUser.roles || [];
      
      // Eğer kullanıcı team_leader değilse, ekle
      if (!currentRoles.includes("team_leader")) {
        await updateFirebaseUserProfile(userId, {
          role: [...currentRoles, "team_leader"],
        });
      }

      // Seçilen departmanın mevcut manager'ını kontrol et
      const targetDepartment = departments.find(d => d.id === departmentId);
      if (!targetDepartment) {
        toast.error("Departman bulunamadı");
        return;
      }

      // Eski manager'ın rolünü güncelle (eğer başka departmanda manager değilse)
      if (targetDepartment.managerId && targetDepartment.managerId !== userId) {
        const oldManager = users.find(u => u.id === targetDepartment.managerId);
        if (oldManager) {
          // Eski manager'ın başka departmanda manager olup olmadığını kontrol et
          const otherDeptAsManager = departments.find(
            d => d.id !== departmentId && d.managerId === oldManager.id
          );
          
          // Eğer başka departmanda manager değilse, team_leader rolünü kaldır
          if (!otherDeptAsManager) {
            const oldManagerRoles = oldManager.roles || [];
            const updatedOldManagerRoles = oldManagerRoles.filter((r: string) => r !== "team_leader");
            if (updatedOldManagerRoles.length === 0) {
              updatedOldManagerRoles.push("viewer"); // En azından viewer rolü olsun
            }
            await updateFirebaseUserProfile(oldManager.id, {
              role: updatedOldManagerRoles,
            });
          }
        }
      }
      
      // Yeni manager'ı departmana ata
      await updateDepartment(departmentId, {
        managerId: userId,
      }, user?.id || null);

      // Permission cache'i temizle
      try {
        const { clearPermissionCache } = await import("@/services/firebase/rolePermissionsService");
        clearPermissionCache();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Permission cache temizleme hatası:", error);
        }
      }

      toast.success(`${targetUser.full_name || targetUser.email} kullanıcısı "${targetDepartment.name}" departmanının lideri olarak atandı`);
      
      // Kullanıcı listesini yenile
      fetchData();
    } catch (error: unknown) {
      toast.error("Ekip lideri atanırken hata: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    }
  };

  const handleDepartmentChange = async (userId: string, departmentId: string) => {
    try {
      await updateFirebaseUserProfile(userId, {
        departmentId: departmentId === "none" ? null : departmentId,
      });

      toast.success("Kullanıcı departmanı başarıyla güncellendi");
      fetchData();
    } catch (error: unknown) {
      toast.error("Departman güncellenemedi: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserRole = (user: User) => {
    return user.roles?.[0] || "viewer";
  };

  const getRoleBadgeColor = (roleKey: string) => {
    const roleDef = roles.find(r => r.key === roleKey);
    return roleDef ? roleDef.color.replace("bg-", "bg-") : "bg-gray-500"; // Use the color class directly
  };

  const getRoleLabel = (roleKey: string) => {
    const roleDef = roles.find(r => r.key === roleKey);
    return roleDef ? roleDef.label : roleKey;
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !user) return;
    
    try {
      setDeleting(true);
      await deleteUser(selectedUser.id, user.id);
      toast.success("Kullanıcı başarıyla silindi");
      setShowDeleteConfirmDialog(false);
      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchData();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Delete user error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Kullanıcı silinirken hata oluştu");
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <span className="text-lg sm:text-xl md:text-2xl">Kullanıcılar ({users.length})</span>
            <SearchInput
              placeholder="Kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              containerClassName="w-full sm:w-72"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table className="min-w-[800px] sm:min-w-0">
              <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Kullanıcı</TableHead>
                <TableHead className="hidden md:table-cell min-w-[180px]">Email</TableHead>
                <TableHead className="min-w-[140px]">Departman</TableHead>
                <TableHead className="min-w-[100px] max-w-[140px]">Rol</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[120px]">Son Giriş</TableHead>
                <TableHead className="text-right min-w-[120px]">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((tableUser) => (
                <TableRow key={tableUser.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarFallback className="text-xs sm:text-sm">{getInitials(tableUser.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm sm:text-base truncate">{tableUser.full_name}</div>
                        {tableUser.phone && (
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">{formatPhoneForDisplay(tableUser.phone)}</div>
                        )}
                        <div className="text-xs text-muted-foreground md:hidden truncate">{tableUser.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{tableUser.email}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <div className="flex flex-col gap-1.5">
                        <Select
                          value={tableUser.department_id || "none"}
                          onValueChange={(value) => handleDepartmentChange(tableUser.id, value)}
                        >
                          <SelectTrigger className="w-full min-w-[120px] sm:min-w-[140px] sm:w-[180px] text-xs sm:text-sm h-8 sm:h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Atanmamış</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-7 sm:h-8"
                          onClick={() => {
                            const deptId = tableUser.department_id || departments[0]?.id;
                            if (deptId && deptId !== "none") {
                              handleAssignTeamLeader(tableUser.id, deptId);
                            } else {
                              toast.error("Lütfen önce bir departman seçin");
                            }
                          }}
                          disabled={!tableUser.department_id || tableUser.department_id === "none"}
                        >
                          Ekip Lideri Ata
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm text-muted-foreground truncate block">
                        {departments.find(d => d.id === tableUser.department_id)?.name || "Atanmamış"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[100px] max-w-[140px]">
                    <div className="flex items-center justify-start">
                      <Badge className={`${getRoleBadgeColor(getUserRole(tableUser))} text-white hover:opacity-80 text-xs px-2 py-0.5 whitespace-nowrap truncate max-w-full`}>
                        {getRoleLabel(getUserRole(tableUser))}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const isOnline = isUserOnline(tableUser.last_login_at);
                        const lastLoginText = formatLastLogin(tableUser.last_login_at);
                        const lastLoginDate = tableUser.last_login_at 
                          ? (tableUser.last_login_at instanceof Timestamp 
                              ? tableUser.last_login_at.toDate() 
                              : typeof tableUser.last_login_at === 'object' && 'toDate' in tableUser.last_login_at && typeof (tableUser.last_login_at as { toDate: () => Date }).toDate === 'function'
                              ? (tableUser.last_login_at as { toDate: () => Date }).toDate()
                              : new Date(tableUser.last_login_at))
                          : null;
                        return (
                          <>
                            {isOnline && (
                              <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500 animate-pulse" />
                            )}
                            <span 
                              className={
                                isOnline 
                                  ? "text-green-600 dark:text-green-400 font-medium text-xs sm:text-sm" 
                                  : lastLoginText === "Hiç giriş yapmamış"
                                  ? "text-muted-foreground italic text-xs sm:text-sm"
                                  : "text-muted-foreground text-xs sm:text-sm"
                              }
                              title={lastLoginDate ? `Son giriş: ${lastLoginDate.toLocaleString("tr-TR")}` : "Hiç giriş yapılmamış"}
                            >
                              {isOnline ? "Çevrimiçi" : lastLoginText}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
                      {isSuperAdmin && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 sm:h-9 sm:w-auto sm:min-w-[120px] sm:min-h-0 text-xs sm:text-sm p-0 sm:px-3"
                            onClick={() => {
                              setSelectedUser(tableUser);
                              setNewRole(getUserRole(tableUser));
                              setShowRoleDialog(true);
                            }}
                          >
                            <Shield className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Rol Değiştir</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 sm:h-9 sm:w-auto sm:min-w-[80px] sm:min-h-0 text-destructive hover:text-destructive hover:bg-destructive/10 p-0 sm:px-3"
                            onClick={() => {
                              // Kendi hesabını silmeye çalışıyorsa engelle
                              if (user && tableUser.id === user.id) {
                                toast.error("Kendi hesabınızı silemezsiniz.");
                                return;
                              }
                              setSelectedUser(tableUser);
                              setShowDeleteDialog(true);
                            }}
                            disabled={user && tableUser.id === user.id}
                          >
                            <Trash2 className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Sil</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Kullanıcı bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcı Rolü Değiştir</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.full_name} için yeni rol seçin
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Rol seçin" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.key} value={role.key}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange}>
              Kaydet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* İlk Silme Onay Dialog'u */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
                <AlertDialogDescription className="mt-2">
                  Bu işlem geri alınamaz!
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>{selectedUser?.full_name}</strong> kullanıcısını silmek istediğinizden emin misiniz?
            </p>
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-destructive">Bu işlem şunları yapacak:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Kullanıcı veritabanından silinecek</li>
                <li>Tüm log kayıtları silinecek</li>
                <li>Kullanıcı tüm görevlerden çıkarılacak</li>
                <li>Kullanıcı adı tüm yerlerden kaldırılacak</li>
                <li>Kullanıcı bir daha giriş yapamayacak</li>
                <li>Eğer göreve kimse kalmamışsa görev havuza alınacak</li>
              </ul>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Son bir kez kontrol et - kendi hesabını silmeye çalışıyorsa engelle
                if (user && selectedUser && selectedUser.id === user.id) {
                  toast.error("Kendi hesabınızı silemezsiniz.");
                  setShowDeleteDialog(false);
                  setSelectedUser(null);
                  return;
                }
                setShowDeleteDialog(false);
                setShowDeleteConfirmDialog(true);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Devam Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* İkinci Silme Onay Dialog'u */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>Son Onay</AlertDialogTitle>
                <AlertDialogDescription className="mt-2">
                  Bu işlemi onaylamak için tekrar tıklayın
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              <strong>{selectedUser?.full_name}</strong> kullanıcısını silmek için son kez onaylıyor musunuz?
            </p>
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm font-semibold text-destructive text-center">
                ⚠️ Bu işlem geri alınamaz!
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Siliniyor..." : "Evet, Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
