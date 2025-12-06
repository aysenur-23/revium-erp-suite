/**
 * Permissions Utility
 * Yetki kontrolü fonksiyonları
 */

import { UserProfile } from "@/services/firebase/authService";
import { Department } from "@/services/firebase/departmentService";
import { Task } from "@/services/firebase/taskService";
import { getPermission } from "@/services/firebase/rolePermissionsService";

/**
 * Ana yönetici kontrolü
 */
export const isMainAdmin = (user: UserProfile | null): boolean => {
  if (!user) return false;
  return user.role?.includes("main_admin") || user.role?.includes("super_admin") || false;
};

/**
 * Admin kontrolü
 */
export const isAdmin = (user: UserProfile | null): boolean => {
  if (!user) return false;
  return (
    user.role?.includes("admin") ||
    user.role?.includes("main_admin") ||
    user.role?.includes("super_admin") ||
    false
  );
};

/**
 * Belirli bir ekipte lider mi?
 */
export const isTeamLeader = async (
  userId: string,
  teamId: string,
  departments: Department[]
): Promise<boolean> => {
  const department = departments.find((d) => d.id === teamId);
  return department?.managerId === userId;
};

/**
 * Ekip yönetebilir mi?
 */
export const canManageTeam = async (
  userId: string,
  teamId: string,
  user: UserProfile | null,
  departments: Department[]
): Promise<boolean> => {
  if (!user) return false;
  
  // Ana yöneticiler tüm ekipleri yönetebilir
  if (isMainAdmin(user)) return true;
  
  // Ekip liderleri sadece kendi ekiplerini yönetebilir
  return await isTeamLeader(userId, teamId, departments);
};

/**
 * Görev oluşturabilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canCreateTask = async (
  user: UserProfile | null,
  departments: Department[] = []
): Promise<boolean> => {
  if (!user) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (isMainAdmin(user)) return true;
  
  // Rol yetkilerini kontrol et - tüm yetkiler role_permissions koleksiyonundan gelir
  return await canCreateResource(user, "tasks");
};

/**
 * Proje oluşturabilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canCreateProject = async (
  user: UserProfile | null,
  departments: Department[] = []
): Promise<boolean> => {
  if (!user) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (isMainAdmin(user)) return true;
  
  // Rol yetkilerini kontrol et - tüm yetkiler role_permissions koleksiyonundan gelir
  return await canCreateResource(user, "projects");
};

/**
 * Görev düzenleyebilir mi? (İçerik değiştirme - başlık, açıklama, etiketler vb.)
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canEditTask = async (task: Task, user: UserProfile | null): Promise<boolean> => {
  if (!user || !task) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (isMainAdmin(user)) return true;
  
  // Rol yetkilerini kontrol et
  const hasPermission = await canUpdateResource(user, "tasks");
  return hasPermission;
};

/**
 * Görevle etkileşim kurabilir mi? (Taşıma, durum değiştirme, checkbox işaretleme vb.)
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canInteractWithTask = async (task: Task, user: UserProfile | null, assignedUserIds: string[] = []): Promise<boolean> => {
  if (!user || !task) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (isMainAdmin(user)) return true;
  
  // Rol yetkilerini kontrol et (güncelleme yetkisi varsa etkileşim kurabilir)
  const hasPermission = await canUpdateResource(user, "tasks");
  if (hasPermission) return true;
  
  // Görevde atanan kullanıcılar etkileşim kurabilir (taşıyabilir, işaretleyebilir, checkbox işaretleyebilir)
  if (assignedUserIds.includes(user.id)) return true;
  
  // assignedUsers array'inde varsa etkileşim kurabilir
  if (task.assignedUsers && task.assignedUsers.includes(user.id)) return true;
  
  return false;
};

/**
 * Görevi görüntüleyebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canViewTask = async (task: Task, user: UserProfile | null, assignedUserIds: string[] = []): Promise<boolean> => {
  if (!user || !task) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (isMainAdmin(user)) return true;
  
  // onlyInMyTasks görevleri sadece oluşturan görebilir
  if (task.onlyInMyTasks) {
    return task.createdBy === user.id;
  }
  
  // KRİTİK: Gizli olmayan görevler herkes tarafından görülebilir (yeni kayıt olsalar bile)
  if (!task.isPrivate) {
    return true;
  }
  
  // Gizli görevler için özel kontroller
  if (task.isPrivate) {
    // Rol yetkilerini kontrol et
    const hasReadPermission = await canReadResource(user, "tasks");
    
    // Okuma yetkisi varsa görüntüleyebilir
    if (hasReadPermission) return true;
    
    // Görevde atanan kullanıcılar görebilir
    if (assignedUserIds.includes(user.id)) return true;
    // assignedUsers array'inde varsa görebilir
    if (task.assignedUsers && task.assignedUsers.includes(user.id)) return true;
    // Görevi oluşturan kişi görebilir
    if (task.createdBy === user.id) return true;
    return false;
  }
  
  return false;
};

/**
 * Görev onaylayabilir mi?
 * Tek bir yönetici veya ekip lideri onayı yeterli
 */
export const canApproveTask = async (
  task: Task,
  user: UserProfile | null,
  departments: Department[]
): Promise<boolean> => {
  if (!user) return false;
  
  // Ana yöneticiler tüm görevleri onaylayabilir
  if (isMainAdmin(user)) return true;
  
  // Adminler tüm görevleri onaylayabilir
  if (isAdmin(user)) return true;
  
  // Ekip liderleri tüm görevleri onaylayabilir (tek onay yeterli)
  if (user.role?.includes("team_leader")) return true;
  
  // Görevi veren kişi onaylayabilir
  if (task.createdBy === user.id) return true;
  
  return false;
};

/**
 * Ekip üyelerini bul (ekip lideri için)
 */
export const getTeamMembers = async (
  teamLeaderId: string,
  departments: Department[],
  allUsers: UserProfile[]
): Promise<UserProfile[]> => {
  // Ekip liderinin yönettiği ekipleri bul
  const managedTeams = departments.filter((dept) => dept.managerId === teamLeaderId);
  
  if (managedTeams.length === 0) {
    return [];
  }
  
  const teamIds = managedTeams.map((team) => team.id);
  
  // Bu ekiplere ait kullanıcıları bul
  // KRİTİK: approvedTeams, pendingTeams ve departmentId alanlarını kontrol et
  const teamMembers = allUsers.filter((user) => {
    // Kullanıcının onaylanmış ekipleri
    const approvedTeams = user.approvedTeams || [];
    // Kullanıcının bekleyen ekipleri (onaylanmış sayılabilir)
    const pendingTeams = user.pendingTeams || [];
    
    // approvedTeams kontrolü
    if (approvedTeams.some((teamId) => teamIds.includes(teamId))) {
      return true;
    }
    
    // pendingTeams kontrolü
    if (pendingTeams.some((teamId) => teamIds.includes(teamId))) {
      return true;
    }
    
    // departmentId kontrolü (eski sistem uyumluluğu için)
    if (user.departmentId && teamIds.includes(user.departmentId)) {
      return true;
    }
    
    return false;
  });
  
  return teamMembers;
};

/**
 * Log görüntüleme yetkisi var mı?
 */
export const canViewUserLogs = async (
  viewer: UserProfile | null,
  targetUserId: string,
  departments: Department[],
  allUsers: UserProfile[]
): Promise<boolean> => {
  if (!viewer) return false;
  
  // Kullanıcı kendi loglarını görebilir
  if (viewer.id === targetUserId) return true;
  
  // Ana yöneticiler tüm logları görebilir
  if (isMainAdmin(viewer)) return true;
  
  // Adminler tüm logları görebilir
  if (isAdmin(viewer)) return true;
  
  // Ekip liderleri ekip üyelerinin loglarını görebilir
  const teamMembers = await getTeamMembers(viewer.id, departments, allUsers);
  const isTeamMember = teamMembers.some((member) => member.id === targetUserId);
  
  return isTeamMember;
};

/**
 * Kullanıcının rolüne göre kaynak için yetki kontrolü
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
const checkRolePermission = async (
  user: UserProfile | null,
  resource: string,
  operation: "canCreate" | "canRead" | "canUpdate" | "canDelete"
): Promise<boolean> => {
  if (!user || !user.role || user.role.length === 0) return false;

  // Kullanıcının tüm rollerini kontrol et
  for (const role of user.role) {
    try {
      const permission = await getPermission(role, resource);
      if (permission && permission[operation]) {
        return true;
      }
    } catch (error) {
      console.error(`Error checking permission for role ${role} and resource ${resource}:`, error);
      // Hata durumunda devam et, diğer rolleri kontrol et
    }
  }

  return false;
};

/**
 * Kullanıcının alt yetkisini kontrol eder
 * role_permissions koleksiyonundan alt yetkileri kontrol eder
 */
export const canPerformSubPermission = async (
  user: UserProfile | null,
  resource: string,
  subPermissionKey: string
): Promise<boolean> => {
  if (!user || !user.role || user.role.length === 0) return false;

  // Super admin her zaman tüm yetkilere sahiptir
  if (isMainAdmin(user)) return true;

  // Kullanıcının tüm rollerini kontrol et
  for (const role of user.role) {
    try {
      const permission = await getPermission(role, resource);
      if (permission && permission.subPermissions && permission.subPermissions[subPermissionKey]) {
        return true;
      }
    } catch (error) {
      console.error(`Error checking sub-permission for role ${role}, resource ${resource}, subPermission ${subPermissionKey}:`, error);
      // Hata durumunda devam et, diğer rolleri kontrol et
    }
  }

  return false;
};

/**
 * Kullanıcı bir kaynağı oluşturabilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canCreateResource = async (
  user: UserProfile | null,
  resource: string
): Promise<boolean> => {
  if (!user) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (isMainAdmin(user)) return true;
  
  // Rol yetkilerini kontrol et
  return await checkRolePermission(user, resource, "canCreate");
};

/**
 * Kullanıcı bir kaynağı okuyabilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 * NOT: Gizli olmayan projeler ve görevler için varsayılan olarak true döner (yeni kullanıcılar dahil)
 */
export const canReadResource = async (
  user: UserProfile | null,
  resource: string
): Promise<boolean> => {
  if (!user) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (isMainAdmin(user)) return true;
  
  // KRİTİK: Projeler ve görevler için gizli olmayanlar herkes tarafından görülebilir
  // Bu kontrol canViewTask ve canViewProject gibi fonksiyonlarda yapılıyor
  // Burada sadece genel yetki kontrolü yapıyoruz
  
  // Rol yetkilerini kontrol et
  return await checkRolePermission(user, resource, "canRead");
};

/**
 * Kullanıcı bir kaynağı güncelleyebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canUpdateResource = async (
  user: UserProfile | null,
  resource: string
): Promise<boolean> => {
  if (!user) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (isMainAdmin(user)) return true;
  
  // Rol yetkilerini kontrol et
  return await checkRolePermission(user, resource, "canUpdate");
};

/**
 * Kullanıcı bir kaynağı silebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canDeleteResource = async (
  user: UserProfile | null,
  resource: string
): Promise<boolean> => {
  if (!user) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (isMainAdmin(user)) return true;
  
  // Rol yetkilerini kontrol et
  return await checkRolePermission(user, resource, "canDelete");
};

/**
 * Kullanıcı hammadde stok girişi yapabilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canEnterStock = async (
  user: UserProfile | null,
  resource: string = "raw_materials"
): Promise<boolean> => {
  if (!user) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (isMainAdmin(user)) return true;
  
  // Stok girişi için canUpdate ve canEditStock yetkileri gerekli
  const canUpdate = await canUpdateResource(user, resource);
  const canEditStock = await canPerformSubPermission(user, resource, "canEditStock");
  
  return canUpdate && canEditStock;
};

/**
 * Kullanıcı stok işlemi oluşturabilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canCreateStockTransaction = async (
  user: UserProfile | null,
  resource: string = "raw_materials"
): Promise<boolean> => {
  if (!user) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (isMainAdmin(user)) return true;
  
  // Stok işlemi için canCreateTransactions yetkisi gerekli
  return await canPerformSubPermission(user, resource, "canCreateTransactions");
};

