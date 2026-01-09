import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Loader2, Save, Shield, Plus, Trash2, Info, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRoles,
  getRolePermissions,
  updatePermission,
  addRole,
  deleteRole,
  getSubPermissionsForResource,
  updatePermissionsWithSubPermissions,
  RoleDefinition,
  RolePermission,
  onPermissionCacheChange,
  clearPermissionCache,
} from "@/services/firebase/rolePermissionsService";

export const RolePermissions = () => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string>("");
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleKey, setNewRoleKey] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("bg-gray-500");
  const [addingRole, setAddingRole] = useState(false);
  const [deletingRole, setDeletingRole] = useState<string | null>(null);
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());
  const [updatingSubPermissions, setUpdatingSubPermissions] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Listen to permission cache changes for real-time updates
    const unsubscribe = onPermissionCacheChange(() => {
      // Refresh permissions when cache changes
      fetchData();
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesData, permissionsData] = await Promise.all([
        getRoles(),
        getRolePermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
      if (rolesData.length > 0 && !activeRole) {
        setActiveRole(rolesData[0].key);
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Fetch role permissions error:", error);
      }
      toast.error("Rol ve yetkiler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (
    permissionId: string,
    field: "canCreate" | "canRead" | "canUpdate" | "canDelete" | "subPermissions",
    checked: boolean | Record<string, boolean>
  ) => {
    if (!isAdmin) {
      toast.error("Sadece yönetici rol yetkilerini düzenleyebilir");
      return;
    }

    // Super admin rolünün yetkilerini düzenlemeyi engelle (sadece super admin yapabilir)
    const permission = permissions.find(p => p.id === permissionId);
    if (permission && permission.role === "super_admin" && !isSuperAdmin) {
      toast.error("Süper yönetici rolünün yetkileri sadece süper yönetici tarafından düzenlenebilir");
      return;
    }
    
    // Admin rolü kaldırıldı, sadece super admin kontrolü yapılıyor

    // Optimistic update
    const oldPermissions = [...permissions];
    setPermissions((prev) =>
      prev.map((p) => (p.id === permissionId ? { ...p, [field]: checked } : p))
    );

    setSaving(permissionId);
    try {
      if (field === "subPermissions") {
        await updatePermission(permissionId, { subPermissions: checked as Record<string, boolean> });
      } else {
        await updatePermission(permissionId, { [field]: checked as boolean });
      }
      // Cache will be updated by real-time listener automatically
      // No need to clear cache - listener will update it
      // toast.success("Yetki güncellendi"); // Too spammy for toggles
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Update permission error:", error);
      }
      toast.error("Yetki güncellenemedi");
      setPermissions(oldPermissions); // Revert
    } finally {
      setSaving(null);
    }
  };

  const handleSubPermissionChange = async (
    permissionId: string,
    subPermissionKey: string,
    checked: boolean
  ) => {
    if (!isAdmin) {
      toast.error("Sadece yönetici rol yetkilerini düzenleyebilir");
      return;
    }

    const permission = permissions.find(p => p.id === permissionId);
    if (permission && permission.role === "super_admin" && !isSuperAdmin) {
      toast.error("Süper yönetici rolünün yetkileri sadece süper yönetici tarafından düzenlenebilir");
      return;
    }
    
    // Admin rolü kaldırıldı, sadece super admin kontrolü yapılıyor

    // Optimistic update
    const oldPermissions = [...permissions];
    const currentSubPermissions = permission?.subPermissions || {};
    const newSubPermissions = { ...currentSubPermissions, [subPermissionKey]: checked };
    
    setPermissions((prev) =>
      prev.map((p) => (p.id === permissionId ? { ...p, subPermissions: newSubPermissions } : p))
    );

    setSaving(permissionId);
    try {
      await updatePermission(permissionId, { subPermissions: newSubPermissions });
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Update sub-permission error:", error);
      }
      toast.error("Alt yetki güncellenemedi");
      setPermissions(oldPermissions); // Revert
    } finally {
      setSaving(null);
    }
  };

  const handleAddRole = async () => {
    if (!isAdmin) {
      toast.error("Sadece yönetici yeni rol ekleyebilir");
      return;
    }

    if (!newRoleName.trim() || !newRoleKey.trim()) {
      toast.error("Lütfen rol adı ve anahtar girin");
      return;
    }

    setAddingRole(true);
    try {
      await addRole({
        key: newRoleKey.trim().toLowerCase().replace(/\s+/g, "_"),
        label: newRoleName.trim(),
        color: newRoleColor,
      });
      toast.success("Rol başarıyla eklendi");
      setAddRoleOpen(false);
      setNewRoleName("");
      setNewRoleKey("");
      setNewRoleColor("bg-gray-500");
      await fetchData();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Add role error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Rol eklenemedi");
    } finally {
      setAddingRole(false);
    }
  };

  const handleDeleteRole = async (roleKey: string) => {
    if (!isAdmin) {
      toast.error("Sadece yönetici rol silebilir");
      return;
    }

    // Sistem rollerini silmeyi engelle
    if (roleKey === "super_admin" && !isSuperAdmin) {
      toast.error("Sistem rolleri silinemez");
      return;
    }
    
    // Super admin rolünü sadece super admin silebilir
    if (roleKey === "super_admin" && !isSuperAdmin) {
      toast.error("Süper yönetici rolü silinemez");
      return;
    }

    setDeletingRole(roleKey);
    try {
      await deleteRole(roleKey);
      toast.success("Rol başarıyla silindi");
      if (activeRole === roleKey && roles.length > 1) {
        const remainingRoles = roles.filter((r) => r.key !== roleKey);
        setActiveRole(remainingRoles[0]?.key || "");
      }
      await fetchData();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Delete role error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Rol silinemedi");
    } finally {
      setDeletingRole(null);
    }
  };

  const handleUpdateSubPermissions = async () => {
    if (!isAdmin) {
      toast.error("Sadece yönetici alt yetkileri güncelleyebilir");
      return;
    }

    setUpdatingSubPermissions(true);
    try {
      await updatePermissionsWithSubPermissions();
      toast.success("Alt yetkiler başarıyla güncellendi");
      await fetchData();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Update sub-permissions error:", error);
      }
      toast.error(error instanceof Error ? error.message : "Alt yetkiler güncellenemedi");
    } finally {
      setUpdatingSubPermissions(false);
    }
  };

  const getResourceLabel = (resource: string) => {
    const labels: Record<string, string> = {
      tasks: "Görevler",
      users: "Kullanıcılar",
      departments: "Departmanlar",
      orders: "Siparişler",
      production_orders: "Üretim Siparişleri",
      customers: "Müşteriler",
      products: "Ürünler",
      projects: "Projeler",
      audit_logs: "Denetim Kayıtları",
      role_permissions: "Rol Yetkileri",
      raw_materials: "Hammaddeler",
      warranty: "Garanti",
    };
    return labels[resource] || resource;
  };

  const getPermissionDescription = (permissionType: "canCreate" | "canRead" | "canUpdate" | "canDelete", resource: string): string => {
    const resourceLabel = getResourceLabel(resource);
    
    const descriptions: Record<string, Record<string, string>> = {
      canCreate: {
        tasks: `Yeni görevler oluşturma yetkisi. Bu yetkiye sahip kullanıcılar görev listesine yeni görevler ekleyebilir.`,
        users: `Yeni kullanıcı hesapları oluşturma yetkisi. Bu yetkiye sahip kullanıcılar sisteme yeni kullanıcı kaydedebilir.`,
        departments: `Yeni departman/ekip oluşturma yetkisi. Bu yetkiye sahip kullanıcılar yeni ekipler tanımlayabilir.`,
        orders: `Yeni sipariş oluşturma yetkisi. Bu yetkiye sahip kullanıcılar müşterilere sipariş kaydı oluşturabilir.`,
        production_orders: `Yeni üretim siparişi oluşturma yetkisi. Bu yetkiye sahip kullanıcılar üretim için sipariş kaydı oluşturabilir.`,
        customers: `Yeni müşteri kaydı oluşturma yetkisi. Bu yetkiye sahip kullanıcılar müşteri bilgilerini sisteme ekleyebilir.`,
        products: `Yeni ürün kaydı oluşturma yetkisi. Bu yetkiye sahip kullanıcılar ürün bilgilerini sisteme ekleyebilir.`,
        projects: `Yeni proje oluşturma yetkisi. Bu yetkiye sahip kullanıcılar proje kayıtları oluşturabilir.`,
        audit_logs: `Denetim kaydı oluşturma yetkisi. Sistem tarafından otomatik oluşturulur, manuel oluşturma genellikle gerekmez.`,
        role_permissions: `Yeni rol ve yetki tanımı oluşturma yetkisi. Bu yetkiye sahip kullanıcılar yeni roller tanımlayabilir.`,
        raw_materials: `Yeni hammadde kaydı oluşturma yetkisi. Bu yetkiye sahip kullanıcılar hammadde bilgilerini sisteme ekleyebilir.`,
        warranty: `Yeni garanti kaydı oluşturma yetkisi. Bu yetkiye sahip kullanıcılar garanti kayıtları oluşturabilir.`,
      },
      canRead: {
        tasks: `Görevleri görüntüleme yetkisi. Bu yetkiye sahip kullanıcılar görev listesini ve detaylarını görebilir.`,
        users: `Kullanıcı bilgilerini görüntüleme yetkisi. Bu yetkiye sahip kullanıcılar kullanıcı listesini ve profil bilgilerini görebilir.`,
        departments: `Departman/ekip bilgilerini görüntüleme yetkisi. Bu yetkiye sahip kullanıcılar ekip listesini ve detaylarını görebilir.`,
        orders: `Sipariş bilgilerini görüntüleme yetkisi. Bu yetkiye sahip kullanıcılar sipariş listesini ve detaylarını görebilir.`,
        production_orders: `Üretim siparişlerini görüntüleme yetkisi. Bu yetkiye sahip kullanıcılar üretim siparişlerini görebilir.`,
        customers: `Müşteri bilgilerini görüntüleme yetkisi. Bu yetkiye sahip kullanıcılar müşteri listesini ve detaylarını görebilir.`,
        products: `Ürün bilgilerini görüntüleme yetkisi. Bu yetkiye sahip kullanıcılar ürün listesini ve detaylarını görebilir.`,
        projects: `Proje bilgilerini görüntüleme yetkisi. Bu yetkiye sahip kullanıcılar proje listesini ve detaylarını görebilir.`,
        audit_logs: `Denetim kayıtlarını görüntüleme yetkisi. Bu yetkiye sahip kullanıcılar sistem loglarını ve aktivite kayıtlarını görebilir.`,
        role_permissions: `Rol ve yetki tanımlarını görüntüleme yetkisi. Bu yetkiye sahip kullanıcılar rol listesini ve yetki tanımlarını görebilir.`,
        raw_materials: `Hammadde bilgilerini görüntüleme yetkisi. Bu yetkiye sahip kullanıcılar hammadde listesini ve detaylarını görebilir.`,
        warranty: `Garanti kayıtlarını görüntüleme yetkisi. Bu yetkiye sahip kullanıcılar garanti listesini ve detaylarını görebilir.`,
      },
      canUpdate: {
        tasks: `Görevleri düzenleme yetkisi. Bu yetkiye sahip kullanıcılar mevcut görevlerin bilgilerini, durumunu ve atamalarını değiştirebilir.`,
        users: `Kullanıcı bilgilerini düzenleme yetkisi. Bu yetkiye sahip kullanıcılar kullanıcı profil bilgilerini, rollerini ve ekip üyeliklerini güncelleyebilir.`,
        departments: `Departman/ekip bilgilerini düzenleme yetkisi. Bu yetkiye sahip kullanıcılar ekip bilgilerini ve lider atamalarını güncelleyebilir.`,
        orders: `Sipariş bilgilerini düzenleme yetkisi. Bu yetkiye sahip kullanıcılar sipariş detaylarını, durumunu ve kalemlerini güncelleyebilir.`,
        production_orders: `Üretim siparişlerini düzenleme yetkisi. Bu yetkiye sahip kullanıcılar üretim siparişlerinin durumunu ve bilgilerini güncelleyebilir.`,
        customers: `Müşteri bilgilerini düzenleme yetkisi. Bu yetkiye sahip kullanıcılar müşteri kayıtlarını ve iletişim bilgilerini güncelleyebilir.`,
        products: `Ürün bilgilerini düzenleme yetkisi. Bu yetkiye sahip kullanıcılar ürün kayıtlarını, fiyatlarını ve stok bilgilerini güncelleyebilir.`,
        projects: `Proje bilgilerini düzenleme yetkisi. Bu yetkiye sahip kullanıcılar proje detaylarını, durumunu ve üyelerini güncelleyebilir.`,
        audit_logs: `Denetim kayıtlarını düzenleme yetkisi. Genellikle sistem tarafından oluşturulan kayıtlar düzenlenmez, sadece özel durumlarda gerekebilir.`,
        role_permissions: `Rol ve yetki tanımlarını düzenleme yetkisi. Bu yetkiye sahip kullanıcılar rol yetkilerini ve tanımlarını güncelleyebilir.`,
        raw_materials: `Hammadde bilgilerini düzenleme yetkisi. Bu yetkiye sahip kullanıcılar hammadde kayıtlarını, stok bilgilerini ve maliyetlerini güncelleyebilir.`,
        warranty: `Garanti kayıtlarını düzenleme yetkisi. Bu yetkiye sahip kullanıcılar garanti kayıtlarının durumunu ve bilgilerini güncelleyebilir.`,
      },
      canDelete: {
        tasks: `Görevleri silme yetkisi. Bu yetkiye sahip kullanıcılar görevleri silebilir veya arşivleyebilir.`,
        users: `Kullanıcı hesaplarını silme yetkisi. Bu yetkiye sahip kullanıcılar kullanıcı hesaplarını kalıcı olarak silebilir.`,
        departments: `Departman/ekipleri silme yetkisi. Bu yetkiye sahip kullanıcılar ekipleri kalıcı olarak silebilir.`,
        orders: `Siparişleri silme yetkisi. Bu yetkiye sahip kullanıcılar sipariş kayıtlarını silebilir.`,
        production_orders: `Üretim siparişlerini silme yetkisi. Bu yetkiye sahip kullanıcılar üretim siparişlerini silebilir.`,
        customers: `Müşteri kayıtlarını silme yetkisi. Bu yetkiye sahip kullanıcılar müşteri kayıtlarını silebilir.`,
        products: `Ürün kayıtlarını silme yetkisi. Bu yetkiye sahip kullanıcılar ürün kayıtlarını silebilir.`,
        projects: `Projeleri silme yetkisi. Bu yetkiye sahip kullanıcılar proje kayıtlarını silebilir.`,
        audit_logs: `Denetim kayıtlarını silme yetkisi. Bu yetkiye sahip kullanıcılar sistem loglarını silebilir (genellikle önerilmez).`,
        role_permissions: `Rol ve yetki tanımlarını silme yetkisi. Bu yetkiye sahip kullanıcılar rolleri ve yetki tanımlarını silebilir.`,
        raw_materials: `Hammadde kayıtlarını silme yetkisi. Bu yetkiye sahip kullanıcılar hammadde kayıtlarını silebilir.`,
        warranty: `Garanti kayıtlarını silme yetkisi. Bu yetkiye sahip kullanıcılar garanti kayıtlarını silebilir.`,
      },
    };
    
    return descriptions[permissionType]?.[resource] || `${resourceLabel} için ${permissionType} yetkisi.`;
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-[14px] sm:text-[15px] leading-tight">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Rol Yetkileri
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-xs mt-1 leading-snug">
              Rollerin hangi kaynaklara erişebileceğini ve hangi işlemleri yapabileceğini yönetin.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdateSubPermissions}
            disabled={updatingSubPermissions || !isAdmin}
            className="gap-2 w-full sm:w-auto min-h-[44px] sm:min-h-0"
          >
            {updatingSubPermissions ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs sm:text-sm">Güncelleniyor...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Alt Yetkileri Güncelle</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeRole} onValueChange={setActiveRole} className="w-full">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              <TabsList className="flex-wrap h-auto gap-1 min-w-max sm:min-w-0">
                {roles.map((role) => (
                  <TabsTrigger key={role.id} value={role.key} className="min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm min-h-[44px] sm:min-h-0 whitespace-nowrap">
                    {role.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <Dialog open={addRoleOpen} onOpenChange={setAddRoleOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto min-h-[44px] sm:min-h-0" disabled={!isAdmin}>
                  <Plus className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">Yeni Rol Ekle</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Rol Ekle</DialogTitle>
                  <DialogDescription>
                    Yeni bir rol tanımlayın. Rol eklendikten sonra yetkilerini düzenleyebilirsiniz.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
<<<<<<< HEAD
                    <Label htmlFor="roleName" className="text-[11px] sm:text-xs">Rol Adı</Label>
=======
                    <Label htmlFor="roleName">Rol Adı</Label>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                    <Input
                      id="roleName"
                      placeholder="Örn: Satış Temsilcisi"
                      value={newRoleName}
                      onChange={(e) => {
                        setNewRoleName(e.target.value);
                        if (!newRoleKey) {
                          setNewRoleKey(e.target.value.toLowerCase().replace(/\s+/g, "_"));
                        }
                      }}
<<<<<<< HEAD
                      className="min-h-[44px] sm:min-h-0 text-[14px] sm:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roleKey" className="text-[11px] sm:text-xs">Rol Anahtarı</Label>
=======
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roleKey">Rol Anahtarı</Label>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                    <Input
                      id="roleKey"
                      placeholder="Örn: sales_representative"
                      value={newRoleKey}
                      onChange={(e) => setNewRoleKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
<<<<<<< HEAD
                      className="min-h-[44px] sm:min-h-0 text-[14px] sm:text-sm"
                    />
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
=======
                    />
                    <p className="text-xs text-muted-foreground">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      Küçük harf, rakam ve alt çizgi kullanın. Boşluklar otomatik olarak alt çizgiye dönüştürülür.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Rol Rengi</Label>
                    <div className="flex gap-2 flex-wrap">
                      {["bg-gray-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-red-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500"].map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full ${color} border-2 ${newRoleColor === color ? "border-primary" : "border-transparent"}`}
                          onClick={() => setNewRoleColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddRoleOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={handleAddRole} disabled={addingRole || !newRoleName.trim() || !newRoleKey.trim()}>
                    {addingRole ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Ekleniyor...
                      </>
                    ) : (
                      "Rol Ekle"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {roles.map((role) => (
            <TabsContent key={role.id} value={role.key}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${role.color}`} />
                    <h3 className="font-semibold">{role.label}</h3>
                    {role.isSystem && (
                      <span className="text-xs text-muted-foreground">(Sistem Rolü)</span>
                    )}
                  </div>
                  {!role.isSystem && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2" disabled={deletingRole === role.key || !isAdmin || (role.key === "super_admin" && !isSuperAdmin)}>
                          {deletingRole === role.key ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Siliniyor...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              Rolü Sil
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rolü Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{role.label}" rolü ve tüm yetkileri kalıcı olarak silinecektir. Bu işlem geri alınamaz.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteRole(role.key)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Sil
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
<<<<<<< HEAD
                <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <div className="min-w-[600px] sm:min-w-0">
                      <div className="grid grid-cols-5 gap-2 md:gap-4 p-2 md:p-4 font-medium bg-muted/50 text-[10px] sm:text-xs md:text-sm">
=======
                <div className="rounded-md border overflow-x-auto">
                  <div className="min-w-[600px] md:min-w-0">
                    <div className="grid grid-cols-5 gap-2 md:gap-4 p-2 md:p-4 font-medium bg-muted/50 text-xs md:text-sm">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                      <div className="col-span-1 min-w-[120px]">Kaynak</div>
                      <div className="text-center flex items-center justify-center gap-1 min-w-[80px]">
                        <span className="hidden md:inline">Oluşturma</span>
                        <span className="md:hidden">Oluştur</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="font-medium mb-1">Oluşturma Yetkisi</p>
                              <p className="text-xs">Bu yetkiye sahip kullanıcılar yeni kayıtlar oluşturabilir. Örneğin: yeni görev, kullanıcı, sipariş vb. ekleyebilir.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-center flex items-center justify-center gap-1 min-w-[80px]">
                        <span className="hidden md:inline">Okuma</span>
                        <span className="md:hidden">Oku</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="font-medium mb-1">Okuma Yetkisi</p>
                              <p className="text-xs">Bu yetkiye sahip kullanıcılar kayıtları görüntüleyebilir ve okuyabilir. Liste ve detay sayfalarına erişebilir.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-center flex items-center justify-center gap-1 min-w-[80px]">
                        <span className="hidden md:inline">Güncelleme</span>
                        <span className="md:hidden">Güncelle</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="font-medium mb-1">Güncelleme Yetkisi</p>
                              <p className="text-xs">Bu yetkiye sahip kullanıcılar mevcut kayıtları düzenleyebilir. Bilgileri, durumları ve atamaları değiştirebilir.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-center flex items-center justify-center gap-1 min-w-[80px]">
                        <span className="hidden md:inline">Silme</span>
                        <span className="md:hidden">Sil</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="font-medium mb-1">Silme Yetkisi</p>
                              <p className="text-xs">Bu yetkiye sahip kullanıcılar kayıtları silebilir veya arşivleyebilir. Bu işlem genellikle geri alınamaz.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                <div className="divide-y">
                  {(() => {
                    const rolePermissions = permissions.filter((p) => p.role === role.key);
                    const resources = ["tasks", "users", "departments", "orders", "production_orders", "customers", "products", "projects", "audit_logs", "role_permissions", "raw_materials", "warranty"];
                    
                    return resources.map((resource) => {
                      const permission = rolePermissions.find((p) => p.resource === resource);
                      
                      // Eğer permission yoksa, varsayılan değerlerle göster
                      const canCreate = permission?.canCreate ?? false;
                      const canRead = permission?.canRead ?? true;
                      const canUpdate = permission?.canUpdate ?? false;
                      const canDelete = permission?.canDelete ?? false;
                      
                      const resourceKey = `${role.key}-${resource}`;
                      const isExpanded = expandedResources.has(resourceKey);
                      const subPermissions = getSubPermissionsForResource(resource);
                      const subPermissionKeys = Object.keys(subPermissions);
                      const currentSubPermissions = permission?.subPermissions || {};
                      
                      return (
                        <div key={permission?.id || resourceKey}>
<<<<<<< HEAD
                          <div className="min-w-[600px] sm:min-w-0">
=======
                          <div className="min-w-[600px] md:min-w-0">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            <div
                              className="grid grid-cols-5 gap-2 md:gap-4 p-2 md:p-4 items-center hover:bg-muted/20 transition-colors"
                            >
                            <div className="font-medium text-xs md:text-sm flex items-center gap-2 min-w-0">
                              {subPermissionKeys.length > 0 && (
                                <button
                                  className="p-0.5 hover:bg-muted rounded flex-shrink-0"
                                  onClick={() => {
                                    const newSet = new Set(expandedResources);
                                    if (isExpanded) {
                                      newSet.delete(resourceKey);
                                    } else {
                                      newSet.add(resourceKey);
                                    }
                                    setExpandedResources(newSet);
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              <span className="truncate">{getResourceLabel(resource)}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p className="font-medium mb-2">{getResourceLabel(resource)}</p>
                                    <p className="text-xs text-muted-foreground mb-2">{getPermissionDescription("canRead", resource)}</p>
                                    <div className="border-t pt-2 mt-2 space-y-1">
                                      <p className="text-xs font-medium">Yetki Türleri:</p>
                                      <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                                        <li>Oluşturma: {getPermissionDescription("canCreate", resource).split('.')[0]}</li>
                                        <li>Okuma: {getPermissionDescription("canRead", resource).split('.')[0]}</li>
                                        <li>Güncelleme: {getPermissionDescription("canUpdate", resource).split('.')[0]}</li>
                                        <li>Silme: {getPermissionDescription("canDelete", resource).split('.')[0]}</li>
                                      </ul>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          <div className="flex justify-center min-w-[80px]">
                            <Checkbox
                              checked={canCreate}
                              onCheckedChange={async (checked) => {
                                if (permission) {
                                  await handlePermissionChange(permission.id, "canCreate", checked as boolean);
                                } else {
                                  toast.info("Bu kaynak için yetki henüz oluşturulmamış. Lütfen sayfayı yenileyin.");
                                }
                              }}
                              disabled={!!saving || !isAdmin || (role.key === "super_admin" && !isSuperAdmin) || !permission}
<<<<<<< HEAD
                              className="h-5 w-5 sm:h-4 sm:w-4"
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            />
                          </div>
                          <div className="flex justify-center min-w-[80px]">
                            <Checkbox
                              checked={canRead}
                              onCheckedChange={async (checked) => {
                                if (permission) {
                                  await handlePermissionChange(permission.id, "canRead", checked as boolean);
                                } else {
                                  toast.info("Bu kaynak için yetki henüz oluşturulmamış. Lütfen sayfayı yenileyin.");
                                }
                              }}
                              disabled={!!saving || !isAdmin || (role.key === "super_admin" && !isSuperAdmin) || !permission}
<<<<<<< HEAD
                              className="h-5 w-5 sm:h-4 sm:w-4"
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            />
                          </div>
                          <div className="flex justify-center min-w-[80px]">
                            <Checkbox
                              checked={canUpdate}
                              onCheckedChange={async (checked) => {
                                if (permission) {
                                  await handlePermissionChange(permission.id, "canUpdate", checked as boolean);
                                } else {
                                  toast.info("Bu kaynak için yetki henüz oluşturulmamış. Lütfen sayfayı yenileyin.");
                                }
                              }}
                              disabled={!!saving || !isAdmin || (role.key === "super_admin" && !isSuperAdmin) || !permission}
<<<<<<< HEAD
                              className="h-5 w-5 sm:h-4 sm:w-4"
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            />
                          </div>
                          <div className="flex justify-center min-w-[80px]">
                            <Checkbox
                              checked={canDelete}
                              onCheckedChange={async (checked) => {
                                if (permission) {
                                  await handlePermissionChange(permission.id, "canDelete", checked as boolean);
                                } else {
                                  toast.info("Bu kaynak için yetki henüz oluşturulmamış. Lütfen sayfayı yenileyin.");
                                }
                              }}
                              disabled={!!saving || !isAdmin || (role.key === "super_admin" && !isSuperAdmin) || !permission}
<<<<<<< HEAD
                              className="h-5 w-5 sm:h-4 sm:w-4"
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                            />
                          </div>
                            </div>
                          </div>
                        {subPermissionKeys.length > 0 && isExpanded && (
                          <div className="px-2 md:px-4 pb-2 md:pb-4 bg-muted/30 border-t">
                            <div className="pt-3 space-y-2">
                              <div className="text-xs md:text-sm font-medium text-muted-foreground mb-2">Alt Yetkiler</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {subPermissionKeys.map((subKey) => (
                                  <div key={subKey} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={currentSubPermissions[subKey] || false}
                                      onCheckedChange={async (checked) => {
                                        if (permission) {
                                          await handleSubPermissionChange(permission.id, subKey, checked as boolean);
                                        } else {
                                          toast.info("Bu kaynak için yetki henüz oluşturulmamış. Lütfen sayfayı yenileyin.");
                                        }
                                      }}
                                      disabled={!!saving || !isAdmin || (role.key === "super_admin" && !isSuperAdmin) || !permission}
<<<<<<< HEAD
                                      className="h-5 w-5 sm:h-4 sm:w-4"
                                    />
                                    <Label className="text-[11px] sm:text-xs font-normal cursor-pointer">
=======
                                    />
                                    <Label className="text-xs font-normal cursor-pointer">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                                      {subPermissions[subKey]}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    });
                  })()}
<<<<<<< HEAD
                    </div>
                  </div>
=======
                </div>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};