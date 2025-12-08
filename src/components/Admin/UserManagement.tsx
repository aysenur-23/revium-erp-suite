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
import { getRoles, RoleDefinition } from "@/services/firebase/rolePermissionsService";
import { getDepartments, updateDepartment } from "@/services/firebase/departmentService";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhoneForDisplay } from "@/utils/phoneNormalizer";
import { formatLastLogin, isUserOnline } from "@/utils/formatLastLogin";
import { Circle } from "lucide-react";

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
    
    // Her 60 saniyede bir sadece lastLoginAt bilgilerini güncelle (performans için)
    // Tam fetchData yerine sadece kullanıcı listesini hafifçe güncelle
    const interval = setInterval(async () => {
      try {
        // Sadece kullanıcı listesini güncelle (departments ve roles'i tekrar yükleme)
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers
          .filter((u: UserProfile) => !(u as any).deleted)
          .map((u: UserProfile) => ({
            id: u.id,
            full_name: u.fullName || u.displayName || "",
            email: u.email,
            phone: u.phone || null,
            department_id: u.departmentId || null,
            created_at: u.createdAt || Timestamp.now(),
            roles: u.role || [],
            last_login_at: u.lastLoginAt || null,
          })));
      } catch (error) {
        // Sessizce handle et - interval hatası uygulamayı etkilemesin
        if (import.meta.env.DEV) {
          console.warn("User list update error:", error);
        }
      }
    }, 60000); // 60 saniye (performans için artırıldı)
    
    return () => clearInterval(interval);
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
        .filter((u: UserProfile) => !(u as any).deleted)
        .map((u: UserProfile) => ({
          id: u.id,
          full_name: u.fullName || u.displayName || "",
          email: u.email,
          phone: u.phone || null,
          department_id: u.departmentId || null,
          created_at: u.createdAt || Timestamp.now(),
          roles: u.role || [],
          last_login_at: u.lastLoginAt || null,
        })));

      setRoles(fetchedRoles);

      // Departments collection'ı getir
      const { getDepartments } = await import("@/services/firebase/departmentService");
      const fetchedDepartments = await getDepartments();
      setDepartments(fetchedDepartments.map((d) => ({
        id: d.id,
        name: d.name,
      })));
    } catch (error: any) {
      toast.error("Veriler yüklenirken hata: " + error.message);
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
        displayName: (user as any)?.displayName || user?.fullName || "",
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
      console.error("Permission check error:", error);
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

      // Eğer team_leader rolü atanıyorsa, kullanıcıyı bir departmanın manager'ı olarak ata
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
            } else {
              // Hiç boş departman yoksa uyarı ver
              toast.warning("Kullanıcıya team_leader rolü atandı, ancak boş departman bulunamadı. Lütfen departman yönetiminden manuel olarak atayın.");
            }
          }
        } catch (deptError: any) {
          console.error("Departman atama hatası:", deptError);
          // Departman atama hatası rol güncellemesini engellemez, sadece uyarı ver
          toast.warning("Rol güncellendi, ancak departman ataması yapılamadı. Lütfen departman yönetiminden manuel olarak atayın.");
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
        } catch (deptError: any) {
          console.error("Departman manager kaldırma hatası:", deptError);
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
        console.error("Rol değişikliği bildirimi gönderilemedi:", notifError);
        // Bildirim hatası rol güncellemesini engellemez
      }

      toast.success("Kullanıcı rolü başarıyla güncellendi");
      setShowRoleDialog(false);
      setSelectedUser(null);
      setNewRole("");
      fetchData();
    } catch (error: any) {
      toast.error("Rol güncellenemedi: " + error.message);
    }
  };

  const handleDepartmentChange = async (userId: string, departmentId: string) => {
    try {
      await updateFirebaseUserProfile(userId, {
        departmentId: departmentId === "none" ? null : departmentId,
      });

      toast.success("Kullanıcı departmanı başarıyla güncellendi");
      fetchData();
    } catch (error: any) {
      toast.error("Departman güncellenemedi: " + error.message);
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
    } catch (error: any) {
      console.error("Delete user error:", error);
      toast.error(error.message || "Kullanıcı silinirken hata oluştu");
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
                <TableHead className="min-w-[100px]">Rol</TableHead>
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
                    ) : (
                      <span className="text-xs sm:text-sm text-muted-foreground truncate block">
                        {departments.find(d => d.id === tableUser.department_id)?.name || "Atanmamış"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getRoleBadgeColor(getUserRole(tableUser))} text-white hover:opacity-80 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1`}>
                      {getRoleLabel(getUserRole(tableUser))}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const isOnline = isUserOnline(tableUser.last_login_at);
                        const lastLoginText = formatLastLogin(tableUser.last_login_at);
                        const lastLoginDate = tableUser.last_login_at 
                          ? (tableUser.last_login_at instanceof Timestamp 
                              ? tableUser.last_login_at.toDate() 
                              : typeof tableUser.last_login_at === 'object' && 'toDate' in tableUser.last_login_at
                              ? (tableUser.last_login_at as any).toDate()
                              : new Date(tableUser.last_login_at as any))
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
