/**
 * Permissions Utility
 * Yetki kontrolü fonksiyonları
 */

import { UserProfile } from "@/services/firebase/authService";
import { Department } from "@/services/firebase/departmentService";
import { Task } from "@/services/firebase/taskService";
import { Project } from "@/services/firebase/projectService";
import { getPermission } from "@/services/firebase/rolePermissionsService";

/**
 * Ana yönetici kontrolü
 * role_permissions sisteminden kontrol eder
 */
export const isMainAdmin = async (user: UserProfile | null): Promise<boolean> => {
  if (!user) return false;
  // Super admin rolüne sahip mi?
  const hasSuperAdminRole = user.role?.includes("super_admin") || user.role?.includes("main_admin") || false;
  if (!hasSuperAdminRole) return false;
  
  // Super admin her zaman true döner - role_permissions kontrolüne gerek yok
  // Ancak yine de sistemin doğru çalıştığından emin olmak için permission'ı kontrol edelim
  try {
    // Ensure permissions are initialized
    const { getRolePermissions } = await import("@/services/firebase/rolePermissionsService");
    await getRolePermissions(); // This will initialize if needed
    
    const permission = await getPermission("super_admin", "role_permissions", true);
    // Super admin rolü varsa ve yetkisi varsa true döner, yoksa da true döner (super admin her zaman yetkilidir)
    return permission?.canRead === true || hasSuperAdminRole;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error checking super admin permission:", error);
    }
    // Hata durumunda fallback: rol array'inden kontrol et - super admin her zaman true
    return hasSuperAdminRole;
  }
};

/**
 * Admin kontrolü
 * Artık sadece Super Admin için true döner (Admin rolü kaldırıldı)
 */
export const isAdmin = async (user: UserProfile | null): Promise<boolean> => {
  if (!user) return false;
  
  // Sadece Super Admin admin yetkisine sahiptir
  const hasSuperAdminRole = user.role?.includes("super_admin") || user.role?.includes("main_admin") || false;
  return hasSuperAdminRole;
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
  if (await isMainAdmin(user)) return true;
  
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
  if (await isMainAdmin(user)) return true;
  
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
  if (await isMainAdmin(user)) return true;
  
  // Rol yetkilerini kontrol et - tüm yetkiler role_permissions koleksiyonundan gelir
  return await canCreateResource(user, "projects");
};

/**
 * Proje düzenleyebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 * 
 * Kurallar:
 * - Süper yönetici/yönetici: Her zaman düzenleyebilir
 * - Diğer kullanıcılar: Sadece oluşturan düzenleyebilir
 */
export const canEditProject = async (project: Project, user: UserProfile | null): Promise<boolean> => {
  if (!user || !project) return false;
  
  // Süper yönetici/yönetici her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // Ekip lideri her zaman düzenleyebilir
  if (user.role && user.role.includes("team_leader")) return true;
  
  // Projeyi oluşturan kişi düzenleyebilir
  if (project.createdBy === user.id) return true;
  
  // Diğer kullanıcılar düzenleyemez (sadece oluşturan düzenleyebilir)
  return false;
};

/**
 * Proje silebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canDeleteProject = async (project: Project, user: UserProfile | null): Promise<boolean> => {
  if (!user || !project) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // Projeyi oluşturan kişi silebilir
  if (project.createdBy === user.id) return true;
  
  // Rol yetkilerini kontrol et - role_permissions sisteminden kontrol eder
  const hasPermission = await canDeleteResource(user, "projects");
  return hasPermission;
};

/**
 * Görev düzenleyebilir mi? (İçerik değiştirme - başlık, açıklama, etiketler vb.)
 * role_permissions koleksiyonundan yetkileri kontrol eder
 * NOT: Göreve atanan kişiler düzenleme yapamaz, sadece checklist ekleyebilir ve durum değiştirebilir
 */
export const canEditTask = async (task: Task, user: UserProfile | null): Promise<boolean> => {
  if (!user || !task) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // Görevi oluşturan kişi düzenleyebilir
  if (task.createdBy === user.id || (task as { created_by?: string }).created_by === user.id) return true;
  
  // Rol yetkilerini kontrol et - role_permissions sisteminden kontrol eder
  const hasPermission = await canUpdateResource(user, "tasks");
  return hasPermission;
};

/**
 * Görevle etkileşim kurabilir mi? (Taşıma, durum değiştirme, checkbox işaretleme vb.)
 * role_permissions koleksiyonundan yetkileri kontrol eder
 * SISTEM_YETKILERI.md'ye göre:
 * - Super Admin: Tüm görevlerle etkileşim kurabilir
 * - Team Leader: Tüm görevlerle etkileşim kurabilir
 * - Personnel: Sadece atanan görevlerle etkileşim kurabilir
 */
export const canInteractWithTask = async (task: Task, user: UserProfile | null, assignedUserIds: string[] = []): Promise<boolean> => {
  if (!user || !task) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // Görevi oluşturan kişi etkileşim kurabilir
  if (task.createdBy === user.id || (task as { created_by?: string }).created_by === user.id) return true;
  
  // Personnel ve diğer kullanıcılar için: Sadece atanan görevlerle etkileşim kurabilir
  // Kullanıcı isteği: Göreve üye edilen herkes (ekip lideri, personel, yönetici) görevi ilerletebilmeli
  // Görevde atanan kullanıcılar etkileşim kurabilir (taşıyabilir, işaretleyebilir, checkbox işaretleyebilir)
  // Rejected hariç tüm durumlardaki kullanıcılar (pending, accepted, completed) buton görebilir
  if (assignedUserIds.includes(user.id)) return true;
  
  // assignedUsers array'inde varsa etkileşim kurabilir
  if (task.assignedUsers && task.assignedUsers.includes(user.id)) return true;
  
  // Firestore'dan kontrol: canUpdateResource yetkisi varsa ve canChangeStatus alt yetkisi varsa
  const hasUpdatePermission = await canUpdateResource(user, "tasks");
  if (hasUpdatePermission) {
    // Alt yetki kontrolü: canChangeStatus
    const canChangeStatus = await canPerformSubPermission(user, "tasks", "canChangeStatus");
    if (canChangeStatus) return true;
  }
  
  return false;
};

/**
 * Görevi görüntüleyebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canViewTask = async (task: Task, user: UserProfile | null, assignedUserIds: string[] = []): Promise<boolean> => {
  if (!user || !task) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // onlyInMyTasks görevleri sadece oluşturan görebilir
  if (task.onlyInMyTasks) {
    return task.createdBy === user.id;
  }
  
  // KRİTİK: Gizli olmayan görevler herkes tarafından görülebilir (yeni kayıt olsalar bile)
  if (!task.isPrivate) {
    return true;
  }
  
  // Gizli görevler için özel kontroller - canViewPrivateTask kullan
  if (task.isPrivate) {
    return await canViewPrivateTask(task, user, assignedUserIds);
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
  if (await isMainAdmin(user)) return true;
  
  // Görevi oluşturan kişi onaylayabilir
  if (task.createdBy === user.id) return true;
  
  // Firestore'dan kontrol: canApprove alt yetkisi
  const canApprove = await canPerformSubPermission(user, "tasks", "canApprove");
  if (canApprove) return true;
  
  return false;
};

/**
 * Görev silebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canDeleteTask = async (task: Task, user: UserProfile | null): Promise<boolean> => {
  if (!user || !task) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // Görevi oluşturan kişi silebilir
  if (task.createdBy === user.id) return true;
  
  // Rol yetkilerini kontrol et - role_permissions sisteminden kontrol eder
  const hasPermission = await canDeleteResource(user, "tasks");
  return hasPermission;
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
  if (await isMainAdmin(viewer)) return true;
  
  // Firestore'dan kontrol: canViewAuditLogs alt yetkisi
  const canViewAuditLogs = await canPerformSubPermission(viewer, "users", "canViewAuditLogs");
  if (canViewAuditLogs) return true;
  
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

  // Ensure permissions are initialized before checking
  try {
    const { getRolePermissions } = await import("@/services/firebase/rolePermissionsService");
    await getRolePermissions(); // This will initialize if needed
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error initializing permissions:", error);
    }
    // Continue even if initialization fails - permissions might already exist
  }

  // Kullanıcının tüm rollerini kontrol et
  for (const role of user.role) {
    try {
      const permission = await getPermission(role, resource, true);
      if (permission && permission[operation]) {
        return true;
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error(`Error checking permission for role ${role} and resource ${resource}:`, error);
      }
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
  if (await isMainAdmin(user)) return true;

  // Ensure permissions are initialized before checking
  try {
    const { getRolePermissions } = await import("@/services/firebase/rolePermissionsService");
    await getRolePermissions(); // This will initialize if needed
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Error initializing permissions:", error);
    }
    // Continue even if initialization fails - permissions might already exist
  }

  // Kullanıcının tüm rollerini kontrol et
  for (const role of user.role) {
    try {
      const permission = await getPermission(role, resource, true);
      if (permission && permission.subPermissions && permission.subPermissions[subPermissionKey]) {
        return true;
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error(`Error checking sub-permission for role ${role}, resource ${resource}, subPermission ${subPermissionKey}:`, error);
      }
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
  if (await isMainAdmin(user)) return true;
  
  // Ekip lideri her zaman ekleme yapabilir
  if (user.role && user.role.includes("team_leader")) return true;
  
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
  if (await isMainAdmin(user)) return true;
  
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
  if (await isMainAdmin(user)) return true;
  
  // Ekip lideri her zaman güncelleme yapabilir
  if (user.role && user.role.includes("team_leader")) return true;
  
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
  if (await isMainAdmin(user)) return true;
  
  // Ekip lideri her zaman silme yapabilir
  if (user.role && user.role.includes("team_leader")) return true;
  
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
  if (await isMainAdmin(user)) return true;
  
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
  if (await isMainAdmin(user)) return true;
  
  // Stok işlemi için canCreateTransactions yetkisi gerekli
  return await canPerformSubPermission(user, resource, "canCreateTransactions");
};

/**
 * Checklist ekleyebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 * Göreve atanan kullanıcılar da checklist ekleyebilir
 */
export const canAddChecklist = async (
  task: Task,
  user: UserProfile | null,
  assignedUserIds: string[] = []
): Promise<boolean> => {
  if (!user || !task) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // Görevi oluşturan kişi ekleyebilir
  if (task.createdBy === user.id) return true;
  
  // Göreve atanan kullanıcılar ekleyebilir (accepted veya pending durumunda)
  if (assignedUserIds.includes(user.id)) return true;
  if (task.assignedUsers && task.assignedUsers.includes(user.id)) return true;
  
  // Firestore'dan kontrol: canAddChecklist alt yetkisi
  return await canPerformSubPermission(user, "tasks", "canAddChecklist");
};

/**
 * Checklist düzenleyebilir/silebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 * Göreve atanan kullanıcılar da checklist düzenleyebilir/silebilir
 */
export const canEditChecklist = async (
  task: Task,
  user: UserProfile | null,
  assignedUserIds: string[] = []
): Promise<boolean> => {
  if (!user || !task) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // Görevi oluşturan kişi düzenleyebilir/silebilir
  if (task.createdBy === user.id) return true;
  
  // Göreve atanan kullanıcılar düzenleyebilir/silebilir (accepted veya pending durumunda)
  if (assignedUserIds.includes(user.id)) return true;
  if (task.assignedUsers && task.assignedUsers.includes(user.id)) return true;
  
  // Firestore'dan kontrol: canEditChecklist alt yetkisi
  return await canPerformSubPermission(user, "tasks", "canEditChecklist");
};

/**
 * Gizli görevi görüntüleyebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canViewPrivateTask = async (
  task: Task,
  user: UserProfile | null,
  assignedUserIds: string[] = []
): Promise<boolean> => {
  if (!user || !task) return false;
  
  // Gizli olmayan görevler herkes tarafından görülebilir
  if (!task.isPrivate) return true;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // Görevi oluşturan kişi görebilir
  if (task.createdBy === user.id) return true;
  
  // Yöneticiler görebilir (canUpdateResource kontrolü)
  const hasUpdatePermission = await canUpdateResource(user, "tasks");
  if (hasUpdatePermission) return true;
  
  // Kullanıcının rolünü kontrol et
  const userRoles = user.role || [];
  const isTeamLeader = userRoles.includes("team_leader");
  
  // Ekip lideri ise sadece kendisi oluşturduysa görebilir (yukarıda zaten kontrol edildi)
  // Ekip lideri başkasının oluşturduğu gizli görevleri göremez
  
  // Göreve atanan kullanıcılar görebilir (proje üyeleri)
  if (assignedUserIds.includes(user.id)) return true;
  if (task.assignedUsers && task.assignedUsers.includes(user.id)) return true;
  
  // Proje üyeleri kontrolü - görev bir projeye aitse ve kullanıcı projede görev üyesiyse görebilir
  if (task.projectId) {
    try {
      const { getProjectById } = await import("@/services/firebase/projectService");
      const project = await getProjectById(task.projectId);
      if (project) {
        // Proje üyeleri kontrolü - canViewPrivateProject kullan
        const canViewProject = await canViewPrivateProject(project, user);
        if (canViewProject) return true;
      }
    } catch (error: unknown) {
      // Hata durumunda devam et
      if (import.meta.env.DEV) {
        console.error("Error checking project for private task:", error);
      }
    }
  }
  
  // Firestore'dan kontrol: canViewPrivate alt yetkisi
  return await canPerformSubPermission(user, "tasks", "canViewPrivate");
};

/**
 * Gizli projeyi görüntüleyebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 * 
 * Kurallar:
 * - Süper yönetici/yönetici: Her zaman görebilir
 * - Ekip lideri: Kendisi oluşturduysa VEYA görev üyesiyse görebilir
 * - Personel: Sadece görev üyesiyse görebilir
 */
export const canViewPrivateProject = async (
  project: Project,
  user: UserProfile | null
): Promise<boolean> => {
  if (!user || !project) return false;
  
  // Gizli olmayan projeler herkes tarafından görülebilir
  if (!project.isPrivate) return true;
  
  // Süper yönetici/yönetici her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // Projeyi oluşturan kişi görebilir
  if (project.createdBy === user.id) return true;
  
  // Kullanıcının rolünü kontrol et
  const userRoles = user.role || [];
  const isTeamLeader = userRoles.includes("team_leader");
  const isPersonnel = userRoles.includes("personnel");
  const isAdmin = userRoles.includes("admin") || userRoles.includes("super_admin");
  
  // Admin/yönetici her zaman görebilir (yukarıda zaten kontrol edildi ama ekstra güvenlik için)
  if (isAdmin) return true;
  
  // Projede görevi olan kullanıcıları kontrol et
  try {
    const { getTasks, getTaskAssignments } = await import("@/services/firebase/taskService");
    const projectTasks = await getTasks({ projectId: project.id });
    
    // Kullanıcının bu projede görevi var mı kontrol et
    for (const task of projectTasks) {
      if (!task?.id) continue;
      
      // Görevi oluşturan kişi
      if (task.createdBy === user.id) {
        // Ekip lideri veya personel görebilir
        if (isTeamLeader || isPersonnel) return true;
      }
      
      // Atanan kullanıcılar
      if (task.assignedUsers && Array.isArray(task.assignedUsers) && task.assignedUsers.includes(user.id)) {
        // Ekip lideri veya personel görebilir
        if (isTeamLeader || isPersonnel) return true;
      }
      
      // Assignments kontrolü
      try {
        const assignments = await getTaskAssignments(task.id);
        const isAssigned = assignments.some(
          (a) => a.assignedTo === user.id && (a.status === "accepted" || a.status === "pending")
        );
        if (isAssigned) {
          // Ekip lideri veya personel görebilir
          if (isTeamLeader || isPersonnel) return true;
        }
      } catch (error: unknown) {
        // Hata durumunda devam et
        if (import.meta.env.DEV) {
          console.error("Error checking task assignments:", error);
        }
      }
    }
  } catch (error: unknown) {
    // Hata durumunda devam et
    if (import.meta.env.DEV) {
      console.error("Error checking project tasks:", error);
    }
  }
  
  // Firestore'dan kontrol: canViewPrivate alt yetkisi (ekip lideri için)
  if (isTeamLeader) {
    const canViewPrivate = await canPerformSubPermission(user, "projects", "canViewPrivate");
    if (canViewPrivate) return true;
  }
  
  return false;
};

/**
 * Ekip talebini onaylayabilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canApproveTeamRequest = async (
  user: UserProfile | null,
  departments: Department[] = []
): Promise<boolean> => {
  if (!user) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // Firestore'dan kontrol: canApproveTeamRequest alt yetkisi
  const hasPermission = await canPerformSubPermission(user, "departments", "canApproveTeamRequest");
  if (hasPermission) return true;
  
  // Ekip lideri kendi ekibine ait talepleri onaylayabilir
  const isManager = departments.some((dept) => dept.managerId === user.id);
  return isManager;
};

/**
 * Ekip yönetimi menüsünü görebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canViewTeamManagement = async (
  user: UserProfile | null,
  departments: Department[] = []
): Promise<boolean> => {
  if (!user) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // Firestore'dan kontrol: canViewTeamManagement alt yetkisi
  const hasPermission = await canPerformSubPermission(user, "departments", "canViewTeamManagement");
  if (hasPermission) return true;
  
  // Ekip lideri görebilir
  const isManager = departments.some((dept) => dept.managerId === user.id);
  return isManager;
};

/**
 * Admin paneli menüsünü görebilir mi?
 * role_permissions koleksiyonundan yetkileri kontrol eder
 */
export const canViewAdminPanel = async (
  user: UserProfile | null
): Promise<boolean> => {
  if (!user) return false;
  
  // Super admin her zaman tüm yetkilere sahiptir
  if (await isMainAdmin(user)) return true;
  
  // Firestore'dan kontrol: canViewAdminPanel alt yetkisi
  return await canPerformSubPermission(user, "role_permissions", "canViewAdminPanel");
};

