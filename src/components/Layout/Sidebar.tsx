import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Package,
  ShoppingCart,
  FileText,
  Settings,
  Building2,
  Factory,
  ClipboardList,
  Shield,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Briefcase,
  FileCheck,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getProjects, Project } from "@/services/firebase/projectService";
import logo from "@/assets/rev-logo.png";

interface SidebarProps {
  isMobile: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCollapsed?: boolean;
}

export const Sidebar = ({ isMobile, open, onOpenChange, isCollapsed = false }: SidebarProps) => {
  const { user, isSuperAdmin, isAdmin, isTeamLeader } = useAuth();
  const { canRead } = usePermissions();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [canAccessTeamManagement, setCanAccessTeamManagement] = useState(false);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Check permissions for menu items
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setCanAccessTeamManagement(false);
        setCanAccessAdmin(false);
        return;
      }

      // Team Management: can read departments or is team leader
      const canReadDepts = await canRead("departments");
      setCanAccessTeamManagement(canReadDepts || isTeamLeader);

      // Admin Panel: can read audit_logs
      const canReadAudit = await canRead("audit_logs");
      setCanAccessAdmin(canReadAudit);
    };

    checkPermissions();
  }, [user, isTeamLeader, canRead]);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const activeProjects = await getProjects({ status: "active" });
        // KRİTİK: Gizli olmayan projeler herkes tarafından görülebilir (yeni kayıt olsalar bile)
        // Gizli projeler için filtreleme yapılmalı
        const filteredProjects = await Promise.all(
          activeProjects.map(async (project) => {
            // Otomatik oluşturulan "Gizli Görevler" projesini filtrele
            if (project.name === "Gizli Görevler" && project.isPrivate === true && 
                project.description === "Projesi olmayan gizli görevler için otomatik oluşturulan proje") {
              return null;
            }
            
            // Gizli olmayan projeler herkes görebilir (yeni kayıt olsalar bile)
            if (!project.isPrivate) return project;
            
            // Gizli projeler için özel kontroller
            // Ekip lideri sadece kendi oluşturduğu gizli projeleri görebilir
            if (isSuperAdmin) return project; // Üst yöneticiler tüm projeleri görebilir
            if (isAdmin) return project; // Yöneticiler tüm projeleri görebilir
            if (user?.id && project.createdBy === user.id) return project; // Oluşturan görebilir
            
            // Ekip lideri için projede görevi olan kullanıcılar kontrolü yapılmaz (sadece kendi oluşturduğu gizli projeleri görebilir)
            const isTeamLeader = user?.roles?.includes("team_leader");
            if (isTeamLeader) {
              return null; // Ekip lideri sadece kendi oluşturduğu gizli projeleri görebilir (yukarıda kontrol edildi)
            }
            
            // Projede görevi olan kullanıcılar görebilir (ekip lideri hariç)
            if (user?.id) {
              try {
                const { getTasks, getTaskAssignments } = await import("@/services/firebase/taskService");
                const projectTasks = await getTasks({ projectId: project.id });
                
                for (const task of projectTasks) {
                  if (task.createdBy === user.id) return project;
                  if (task.assignedUsers && task.assignedUsers.includes(user.id)) return project;
                  
                  const assignments = await getTaskAssignments(task.id);
                  const isAssigned = assignments.some(
                    (a) => a.assignedTo === user.id && (a.status === "accepted" || a.status === "pending")
                  );
                  if (isAssigned) return project;
                }
              } catch (error) {
                console.error("Error checking project tasks:", error);
              }
            }
            
            return null; // Diğer kullanıcılar gizli projeleri göremez
          })
        );
        
        setProjects(filteredProjects.filter((p): p is Project => p !== null));
      } catch (error: any) {
        // Index hatası durumunda sessizce devam et
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
          console.warn("Projects index henüz oluşturulmamış. Firebase Console'da index oluşturun.");
        } else {
          console.error("Projects yüklenirken hata:", error);
        }
        // Hata durumunda boş array kullan
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  const handleNavClick = () => {
    if (isMobile) {
      onOpenChange(false);
    }
  };

  // Sidebar taşma kontrolü - sadece gerçek taşma durumunda kapat (scroll edilebilir içerik normaldir)
  // Bu kontrolü kaldırdık çünkü scroll edilebilir içerik olması sidebar'ın kapatılması için bir neden değil
  // Kullanıcı scroll yaparak tüm içeriği görebilir

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    ...(canAccessTeamManagement ? [{ icon: UserCog, label: "Ekip Yönetimi", path: "/team-management" }] : []),
    ...(canAccessAdmin ? [{ icon: Shield, label: "Admin Paneli", path: "/admin" }] : []),
    { icon: ShoppingCart, label: "Siparişler", path: "/orders" },
    { icon: Factory, label: "Üretim Siparişleri", path: "/production" },
    { icon: Users, label: "Müşteriler", path: "/customers" },
    { icon: Package, label: "Ürünler", path: "/products" },
    { icon: Building2, label: "Hammaddeler", path: "/raw-materials" },
    { icon: Package, label: "Satış Sonrası Takip", path: "/warranty" },
    { icon: FileText, label: "Raporlar", path: "/reports" },
    { icon: FileCheck, label: "Talepler", path: "/requests" },
    { icon: Settings, label: "Ayarlar", path: "/settings" },
  ];

  const content = (
    <div ref={sidebarRef} className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border overflow-hidden relative z-50">
      {/* Logo Section - Sidebar'ın en üstünde */}
      <div className="flex-shrink-0 bg-sidebar border-b border-sidebar-border pt-4 pb-2 z-[99999] relative">
        <div className="flex items-center gap-2 px-3 sm:px-4">
          <img src={logo} alt="Revium ERP" className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-lg object-contain bg-white p-1 flex-shrink-0" />
          <span className="text-base sm:text-lg md:text-xl font-bold text-sidebar-foreground">Revium ERP</span>
        </div>
      </div>

      <nav ref={navRef} className="flex flex-col gap-0.5 px-2 pt-5 pb-2 overflow-y-auto flex-1 min-h-0">
        {/* Dashboard */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all duration-200",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "touch-manipulation min-h-[44px] sm:min-h-[36px] active:bg-sidebar-accent/80 text-sm sm:text-sm",
              isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
            )
          }
          onClick={handleNavClick}
        >
          <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium text-xs">Dashboard</span>
        </NavLink>

        {/* Ekip Yönetimi - 3. sıra */}
        {canAccessTeamManagement && (
          <NavLink
            to="/team-management"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all duration-200",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "touch-manipulation min-h-[44px] sm:min-h-[36px] active:bg-sidebar-accent/80 text-sm sm:text-xs",
                isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
              )
            }
            onClick={handleNavClick}
          >
            <UserCog className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-xs">Ekip Yönetimi</span>
          </NavLink>
        )}

        {/* Admin Paneli - 4. sıra */}
        {canAccessAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all duration-200",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "touch-manipulation min-h-[44px] sm:min-h-[36px] active:bg-sidebar-accent/80 text-sm sm:text-xs",
                isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
              )
            }
            onClick={handleNavClick}
          >
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-xs">Admin Paneli</span>
          </NavLink>
        )}

        {/* Projeler Collapsible Menü */}
        <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
          <CollapsibleTrigger
            className={cn(
              "flex items-center justify-between w-full px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all duration-200",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "touch-manipulation min-h-[44px] sm:min-h-[36px] active:bg-sidebar-accent/80 text-sm sm:text-xs"
            )}
          >
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium text-xs">Projeler</span>
            </div>
            {projectsOpen ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0.5">
            <div className="ml-2 space-y-0.5 border-l-2 border-sidebar-border pl-2">
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg transition-all duration-200",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "touch-manipulation min-h-[40px] sm:min-h-[32px] active:bg-sidebar-accent/80 text-sm sm:text-xs",
                    isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  )
                }
                onClick={handleNavClick}
              >
                <span className="text-xs">Proje Listesi</span>
              </NavLink>
              {loadingProjects ? (
                <div className="px-2.5 py-1 text-xs text-muted-foreground">Yükleniyor...</div>
              ) : projects.length === 0 ? (
                <div className="px-2.5 py-1 text-xs text-muted-foreground">Proje yok</div>
              ) : (
                projects
                  .filter((project) => project.name?.toLowerCase() !== "genel görevler" && project.name?.toLowerCase() !== "genel")
                  .map((project) => (
                    <NavLink
                      key={project.id}
                      to={`/projects/${project.id}/tasks?view=board`}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 px-2.5 py-1 rounded-lg transition-all duration-200",
                          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          "touch-manipulation min-h-[32px] active:bg-sidebar-accent/80",
                          isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                        )
                      }
                      onClick={handleNavClick}
                    >
                      <span className="text-xs truncate">{project.name}</span>
                    </NavLink>
                  ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Görevler Collapsible Menü - Projelerin altında */}
        <Collapsible open={tasksOpen} onOpenChange={setTasksOpen}>
          <CollapsibleTrigger
            className={cn(
              "flex items-center justify-between w-full px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all duration-200",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "touch-manipulation min-h-[44px] sm:min-h-[36px] active:bg-sidebar-accent/80 text-sm sm:text-xs"
            )}
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium text-xs">Görevler</span>
            </div>
            {tasksOpen ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0.5">
            <div className="ml-2 space-y-0.5 border-l-2 border-sidebar-border pl-2">
              <NavLink
                to="/tasks?view=board"
                end
                className={() => {
                  // Sadece pathname /tasks ve query parametresi yoksa veya view=board varsa aktif ol
                  const searchParams = new URLSearchParams(location.search);
                  const isActuallyActive = location.pathname === "/tasks" && (!location.search || searchParams.get("view") === "board");
                  return cn(
                    "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg transition-all duration-200",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "touch-manipulation min-h-[40px] sm:min-h-[32px] active:bg-sidebar-accent/80 text-sm sm:text-xs",
                    isActuallyActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  );
                }}
                onClick={handleNavClick}
              >
                <span className="text-xs">Tüm Görevler</span>
              </NavLink>
              <NavLink
                to="/tasks?filter=my-tasks&view=board"
                className={() => {
                  // Sadece pathname /tasks ve filter=my-tasks query parametresi varsa aktif ol
                  const searchParams = new URLSearchParams(location.search);
                  const isActuallyActive = location.pathname === "/tasks" && searchParams.get("filter") === "my-tasks";
                  return cn(
                    "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg transition-all duration-200",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "touch-manipulation min-h-[40px] sm:min-h-[32px] active:bg-sidebar-accent/80 text-sm sm:text-xs",
                    isActuallyActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  );
                }}
                onClick={handleNavClick}
              >
                <span className="text-xs">Benim Görevlerim</span>
              </NavLink>
              <NavLink
                to="/tasks?type=general&view=board"
                className={() => {
                  // Sadece pathname /tasks ve type=general query parametresi varsa aktif ol
                  const searchParams = new URLSearchParams(location.search);
                  const isActuallyActive = location.pathname === "/tasks" && searchParams.get("type") === "general";
                  return cn(
                    "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg transition-all duration-200",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "touch-manipulation min-h-[40px] sm:min-h-[32px] active:bg-sidebar-accent/80 text-sm sm:text-xs",
                    isActuallyActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  );
                }}
                onClick={handleNavClick}
              >
                <span className="text-xs">Genel Görevler</span>
              </NavLink>
              <NavLink
                to="/task-pool"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg transition-all duration-200",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "touch-manipulation min-h-[40px] sm:min-h-[32px] active:bg-sidebar-accent/80 text-sm sm:text-xs",
                    isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  )
                }
                onClick={handleNavClick}
              >
                <span className="text-xs">Görev Havuzu</span>
              </NavLink>
              {/* Arşiv - Sadece yönetici ve ekip lideri görebilir */}
              {canAccessTeamManagement && (
                <NavLink
                  to="/tasks/archive"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-2.5 py-1 rounded-lg transition-all duration-200",
                      "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      "touch-manipulation min-h-[32px] active:bg-sidebar-accent/80",
                      isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    )
                  }
                  onClick={handleNavClick}
                >
                  <Archive className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-xs">Arşiv</span>
                </NavLink>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Diğer menü öğeleri (Ekip Yönetimi ve Admin Paneli hariç) */}
        {menuItems
          .filter(item => 
            item.path !== "/team-management" && 
            item.path !== "/admin" && 
            item.path !== "/"
          )
          .map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all duration-200",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "touch-manipulation min-h-[44px] sm:min-h-[36px] active:bg-sidebar-accent/80 text-sm sm:text-xs",
                isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
              )
            }
            onClick={handleNavClick}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-xs">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="left" 
          className="p-0 w-64 max-w-[85vw] touch-manipulation overflow-y-auto"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
        >
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside 
      className={cn(
        "h-full transition-all duration-300 flex-shrink-0 overflow-hidden relative z-50",
        isCollapsed ? "w-0" : "w-64"
      )}
    >
      {!isCollapsed && content}
    </aside>
  );
};
