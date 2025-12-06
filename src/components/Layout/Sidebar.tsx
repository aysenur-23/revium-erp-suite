import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import logo from "@/assets/rev-logo.png";
import { getProjects, Project } from "@/services/firebase/projectService";

interface SidebarProps {
  isMobile: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCollapsed?: boolean;
}

export const Sidebar = ({ isMobile, open, onOpenChange, isCollapsed = false }: SidebarProps) => {
  const { user, isSuperAdmin, isAdmin, isTeamLeader } = useAuth();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

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
            if (isSuperAdmin) return project; // Üst yöneticiler tüm projeleri görebilir
            if (user?.id && project.createdBy === user.id) return project; // Oluşturan görebilir
            
            // Projede görevi olan kullanıcılar görebilir
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

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    ...(isAdmin || isTeamLeader ? [{ icon: UserCog, label: "Ekip Yönetimi", path: "/team-management" }] : []),
    ...(isAdmin ? [{ icon: Shield, label: "Admin Paneli", path: "/admin" }] : []),
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
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex h-12 sm:h-14 md:h-16 items-start justify-center border-b border-sidebar-border px-3 flex-shrink-0 pt-2">
        <div className="flex items-center justify-center gap-2 w-full">
          <img src={logo} alt="Revium ERP" className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg object-contain bg-white/90 p-1 flex-shrink-0" />
          <span className="text-base sm:text-lg font-bold text-sidebar-foreground">Revium ERP</span>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto flex-1 min-h-0">
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
        {(isAdmin || isTeamLeader) && (
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
        {isAdmin && (
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

        {/* Görevler Collapsible Menü */}
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
              {(isAdmin || isTeamLeader) && (
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
        "h-full transition-all duration-300 flex-shrink-0 overflow-hidden",
        isCollapsed ? "w-0" : "w-64"
      )}
    >
      {!isCollapsed && content}
    </aside>
  );
};
