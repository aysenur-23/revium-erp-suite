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
  FolderKanban,
  Briefcase,
  FileCheck,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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

        {/* Görevler - Basit Link */}
        <NavLink
          to="/tasks?project=all&filter=all&view=board"
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
          <Briefcase className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium text-xs">Görevler</span>
        </NavLink>

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
