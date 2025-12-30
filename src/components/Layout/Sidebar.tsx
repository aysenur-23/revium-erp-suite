import { NavLink, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect, useCallback } from "react";
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
import { UserProfile } from "@/services/firebase/authService";
import { getDepartments } from "@/services/firebase/departmentService";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import logo from "@/assets/rev-logo.png";

interface SidebarProps {
  isMobile: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCollapsed?: boolean;
}

export const Sidebar = ({ isMobile, open, onOpenChange, isCollapsed = false }: SidebarProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  // Menü öğeleri state'te saklanır - sadece user.id değiştiğinde güncellenir
  // localStorage'dan cache'lenmiş değerleri oku (sayfa yenilendiğinde hızlı gösterim için)
  const getCachedPermissions = (userId: string | undefined) => {
    if (!userId) return { teamManagement: false, admin: false };
    try {
      const cached = localStorage.getItem(`sidebar_permissions_${userId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Cache 5 dakikadan eskiyse geçersiz say
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return { teamManagement: parsed.teamManagement || false, admin: parsed.admin || false };
        }
      }
    } catch (e) {
      // Cache okuma hatası - sessizce devam et
    }
    return { teamManagement: false, admin: false };
  };

  const cachedPerms = getCachedPermissions(user?.id);
  // State'i sadece user.id değiştiğinde güncellemek için useRef kullan
  const [showTeamManagement, setShowTeamManagement] = useState(() => cachedPerms.teamManagement);
  const [showAdminPanel, setShowAdminPanel] = useState(() => cachedPerms.admin);
  const [permissionsLoading, setPermissionsLoading] = useState(false); // Cache'den okuduğumuz için başlangıçta false
  const permissionsCheckedRef = useRef<string | null>(null); // Kullanıcı ID'sini cache'le
  const permissionsCacheRef = useRef<{ teamManagement: boolean; admin: boolean } | null>(null);
  const lastUserIdRef = useRef<string | undefined>(undefined); // Son kullanıcı ID'sini takip et

  // Permission kontrol fonksiyonu - sadece user.id değiştiğinde çalışır
  const checkPermissions = useCallback(async (userId: string | undefined, userRoles: string[] | undefined, userEmail?: string, userEmailVerified?: boolean, userFullName?: string) => {
    if (!userId) {
      setShowTeamManagement(false);
      setShowAdminPanel(false);
      setPermissionsLoading(false);
      permissionsCheckedRef.current = null;
      permissionsCacheRef.current = null;
      lastUserIdRef.current = undefined;
      return;
    }

    // Aynı kullanıcı için zaten kontrol edildiyse ve cache varsa, state'i güncelleme
    if (permissionsCheckedRef.current === userId && permissionsCacheRef.current) {
      // State zaten doğru, sadece loading'i kapat
      setPermissionsLoading(false);
      return;
    }

    // Loading başlat (arka planda güncelleme için)
    setPermissionsLoading(true);

    try {
      const { canViewTeamManagement, canViewAdminPanel } = await import("@/utils/permissions");
      const userProfile: UserProfile = {
        id: userId,
        email: userEmail || "",
        emailVerified: userEmailVerified || false,
        fullName: userFullName || "",
        displayName: userFullName || "",
        phone: null,
        dateOfBirth: null,
        role: userRoles || [],
        createdAt: null,
        updatedAt: null,
      };
      const departments = await getDepartments();
      const [canViewTeam, canViewAdmin] = await Promise.all([
        canViewTeamManagement(userProfile, departments),
        canViewAdminPanel(userProfile),
      ]);
      
      // Sonuçları cache'le
      permissionsCacheRef.current = {
        teamManagement: canViewTeam,
        admin: canViewAdmin,
      };
      permissionsCheckedRef.current = userId;
      
      // localStorage'a da kaydet (sayfa yenilendiğinde hızlı gösterim için)
      try {
        localStorage.setItem(`sidebar_permissions_${userId}`, JSON.stringify({
          teamManagement: canViewTeam,
          admin: canViewAdmin,
          timestamp: Date.now(),
        }));
      } catch (e) {
        // localStorage yazma hatası - sessizce devam et
      }
      
      // State'i güncelle - sadece bu kullanıcı için kontrol ediliyorsa
      // lastUserIdRef ile kontrol et - sadece aynı kullanıcı için güncelle
      if (lastUserIdRef.current === userId) {
        setShowTeamManagement(canViewTeam);
        setShowAdminPanel(canViewAdmin);
      }
      setPermissionsLoading(false);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Error checking sidebar permissions:", error);
      }
      // Hata durumunda sadece aynı kullanıcı için state'i güncelle
      if (lastUserIdRef.current === userId) {
        setShowTeamManagement(false);
        setShowAdminPanel(false);
      }
      setPermissionsLoading(false);
      permissionsCheckedRef.current = userId; // Hata durumunda da cache'le ki tekrar denemesin
      permissionsCacheRef.current = { teamManagement: false, admin: false };
    }
  }, []); // Hiçbir bağımlılık yok, fonksiyon sabit kalır

  // Ekip Yönetimi ve Admin Paneli yetkilerini Firestore'dan kontrol et - Sadece user.id değiştiğinde
  useEffect(() => {
    const userId = user?.id;
    
    // Kullanıcı değişti mi kontrol et - sadece ID'ye bak
    const userChanged = lastUserIdRef.current !== userId;
    
    if (userChanged) {
      // Kullanıcı değişti - cache'i temizle ve state'i cache'den oku
      lastUserIdRef.current = userId;
      permissionsCheckedRef.current = null;
      permissionsCacheRef.current = null;
      
      // Yeni kullanıcı için state'i cache'den oku
      const cachedPerms = getCachedPermissions(userId);
      setShowTeamManagement(cachedPerms.teamManagement);
      setShowAdminPanel(cachedPerms.admin);
      
      // Yeni kullanıcı için yetkileri kontrol et
      if (userId) {
        const userRoles = user?.roles;
        const userEmail = user?.email;
        const userEmailVerified = user?.emailVerified;
        const userFullName = user?.fullName;
        checkPermissions(userId, userRoles, userEmail, userEmailVerified, userFullName);
      } else {
        // Kullanıcı yok - state'i sıfırla
        setShowTeamManagement(false);
        setShowAdminPanel(false);
        setPermissionsLoading(false);
      }
    } else if (userId && permissionsCheckedRef.current !== userId) {
      // Aynı kullanıcı ama henüz kontrol edilmedi - kontrol et
      const userRoles = user?.roles;
      const userEmail = user?.email;
      const userEmailVerified = user?.emailVerified;
      const userFullName = user?.fullName;
      checkPermissions(userId, userRoles, userEmail, userEmailVerified, userFullName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Sadece user.id değiştiğinde çalış

  // Permission cache değişikliklerini dinleme - KALDIRILDI
  // Menü sadece user.id değiştiğinde güncellenmeli, cache değişikliklerinde sabit kalmalı
  // onPermissionCacheChange callback'i menüyü her tıklamada değiştiriyordu, bu yüzden kaldırıldı
  // Menü artık sadece kullanıcı değiştiğinde (login/logout) güncellenir

  const handleNavClick = () => {
    if (isMobile) {
      onOpenChange(false);
    }
  };

  // Prefetch page on hover for faster navigation
  const handlePrefetch = (path: string) => {
    // Critical sayfalar için prefetch
    const prefetchMap: Record<string, () => Promise<unknown>> = {
      '/': () => import("../../pages/Dashboard"),
      '/tasks': () => import("../../pages/Tasks"),
      '/production': () => import("../../pages/Production"),
      '/customers': () => import("../../pages/Customers"),
      '/products': () => import("../../pages/Products"),
      '/orders': () => import("../../pages/Orders"),
      '/raw-materials': () => import("../../pages/RawMaterials"),
      '/warranty': () => import("../../pages/Warranty"),
      '/reports': () => import("../../pages/Reports"),
      '/requests': () => import("../../pages/Requests"),
      '/settings': () => import("../../pages/Settings"),
      '/team-management': () => import("../../pages/TeamManagement"),
      '/admin': () => import("../../pages/Admin"),
      '/projects': () => import("../../pages/Projects"),
      '/notifications': () => import("../../pages/Notifications"),
    };
    
    const prefetchFn = prefetchMap[path];
    if (prefetchFn) {
      prefetchFn().catch(() => {}); // Sessizce hata yoksay
    }
  };

  // Sidebar taşma kontrolü - sadece gerçek taşma durumunda kapat (scroll edilebilir içerik normaldir)
  // Bu kontrolü kaldırdık çünkü scroll edilebilir içerik olması sidebar'ın kapatılması için bir neden değil
  // Kullanıcı scroll yaparak tüm içeriği görebilir

  // Menü öğeleri - hemen oluşturulur, sadece Ekip Yönetimi ve Admin Paneli conditional
  // Diğer menü öğeleri her zaman görünür
  const baseMenuItems = [
    { icon: ShoppingCart, label: "Siparişler", path: "/orders" },
    { icon: Factory, label: "Üretim Siparişleri", path: "/production" },
    { icon: Users, label: "Müşteriler", path: "/customers" },
    { icon: Package, label: "Ürünler", path: "/products" },
    { icon: Building2, label: "Hammaddeler", path: "/raw-materials" },
    { icon: Package, label: "Satış Sonrası Takip", path: "/warranty" },
    { icon: FileText, label: "Raporlar", path: "/reports" },
    { icon: FileCheck, label: "Talepler", path: "/requests" },
    { icon: Settings, label: "Ayarlar", path: "/settings" }
  ];

  const content = (
    <div ref={sidebarRef} className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border overflow-hidden relative z-50">
      {/* Logo Section - Sidebar'ın en üstünde */}
      <div className="flex-shrink-0 bg-sidebar border-b border-sidebar-border pt-4 pb-2 z-[99999] relative">
        <div 
          className="flex items-center gap-2 px-3 sm:px-4 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/");
            }
          }}
          title="Ana sayfaya git"
        >
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
          onMouseEnter={() => handlePrefetch("/")}
        >
          <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium text-xs">Dashboard</span>
        </NavLink>

        {/* Ekip Yönetimi - 3. sıra - state'ten okunur, sadece user.id değiştiğinde güncellenir */}
        {showTeamManagement && (
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
            onMouseEnter={() => handlePrefetch("/team-management")}
          >
            <UserCog className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-xs">Ekip Yönetimi</span>
          </NavLink>
        )}

        {/* Admin Paneli - 4. sıra - state'ten okunur, sadece user.id değiştiğinde güncellenir */}
        {showAdminPanel && (
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
            onMouseEnter={() => handlePrefetch("/admin")}
          >
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-xs">Admin Paneli</span>
          </NavLink>
        )}

        {/* Görevler - Basit Link */}
        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all duration-200",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "touch-manipulation min-h-[44px] sm:min-h-[36px] active:bg-sidebar-accent/80 text-sm sm:text-xs",
              isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
            )
          }
          onClick={handleNavClick}
          onMouseEnter={() => handlePrefetch("/tasks")}
        >
          <Briefcase className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium text-xs">Görevler</span>
        </NavLink>

        {/* Diğer menü öğeleri - hemen görünür */}
        {baseMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all duration-200",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "touch-manipulation min-h-[44px] sm:min-h-[36px] active:bg-sidebar-accent/80 text-[11px] sm:text-xs",
                isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
              )
            }
            onClick={handleNavClick}
            onMouseEnter={() => handlePrefetch(item.path)}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium text-[11px] sm:text-xs">{item.label}</span>
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
