import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
<<<<<<< HEAD
=======
import { testScroll, logScrollTest } from "@/utils/scrollTest";
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
import { SidebarProvider } from "@/contexts/SidebarContext";

interface MainLayoutProps {
  children: ReactNode;
  disableScroll?: boolean; // TaskBoard gibi nested scroll container'lar için
}

export const MainLayout = ({ children, disableScroll = false }: MainLayoutProps) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Site açıldığında varsayılan olarak açık (sadece desktop için)
    if (typeof window !== "undefined") {
      // Desktop'ta varsayılan olarak açık, mobile'da kapalı
      const isDesktop = window.innerWidth >= 768;
      // localStorage kontrolünü kaldırdık - her zaman varsayılan değeri kullan
      return isDesktop;
    }
    return false;
  });

  // Window resize listener - ekran küçüldüğünde sidebar'ı kapat, büyüdüğünde aç
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    let lastWidth = typeof window !== "undefined" ? window.innerWidth : 0;
<<<<<<< HEAD

    const handleResize = () => {
      if (typeof window === "undefined") return;

      const currentWidth = window.innerWidth;
      const MOBILE_BREAKPOINT = 768;

      // Debounce: resize event'lerini sınırla
      clearTimeout(resizeTimeout);

      resizeTimeout = setTimeout(() => {
        if (typeof window !== "undefined") {
          const nowWidth = window.innerWidth;

=======
    
    const handleResize = () => {
      if (typeof window === "undefined") return;
      
      const currentWidth = window.innerWidth;
      const MOBILE_BREAKPOINT = 768;
      
      // Debounce: resize event'lerini sınırla
      clearTimeout(resizeTimeout);
      
      resizeTimeout = setTimeout(() => {
        if (typeof window !== "undefined") {
          const nowWidth = window.innerWidth;
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          // Ekran küçüldüyse (768px altına düştüyse) sidebar'ı kapat
          if (nowWidth < MOBILE_BREAKPOINT && lastWidth >= MOBILE_BREAKPOINT) {
            setSidebarOpen(false);
          }
          // Ekran büyüdüyse (768px üstüne çıktıysa) sidebar'ı aç
          else if (nowWidth >= MOBILE_BREAKPOINT && lastWidth < MOBILE_BREAKPOINT) {
            setSidebarOpen(true);
          }
<<<<<<< HEAD

=======
          
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          lastWidth = nowWidth;
        }
      }, 150); // 150ms debounce
    };

    // İlk yüklemede kontrol et
    if (typeof window !== "undefined") {
      const MOBILE_BREAKPOINT = 768;
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
      lastWidth = window.innerWidth;
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // localStorage kaydetmeyi kaldırdık - her açılışta varsayılan olarak açık gelecek
  // Kullanıcı manuel olarak kapatırsa, o session için kapalı kalır

<<<<<<< HEAD
  // Route değiştiğinde mobilde menüyü kapat (sadece gerçek route değişikliğinde)
  const prevPathnameRef = useRef(location.pathname);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // İlk mount'ta menüyü kapatma - sadece gerçek route değişikliğinde kapat
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevPathnameRef.current = location.pathname;
      return;
    }

    // Sadece pathname gerçekten değiştiyse menüyü kapat
    if (isMobile && sidebarOpen && prevPathnameRef.current !== location.pathname) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile, sidebarOpen]);
=======
  // Route değiştiğinde mobilde menüyü kapat
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll test - development modunda
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && !disableScroll && mainRef.current) {
      // Kısa bir gecikme ile test et (DOM'un render olması için)
      const timeout = setTimeout(() => {
        const result = testScroll(mainRef.current);
        if (!result.isScrollable && result.hasOverflow) {
          if (import.meta.env.DEV) {
            console.warn("⚠️ Scroll Sorunu Tespit Edildi:", {
              issues: result.issues,
              scrollHeight: result.scrollHeight,
              clientHeight: result.clientHeight,
              element: mainRef.current,
            });
            logScrollTest();
          }
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [disableScroll, sidebarOpen]);
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
<<<<<<< HEAD
    // Sadece mobilde ve sidebar açıksa kapat
=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <SidebarProvider closeSidebar={closeSidebar}>
      <div className="h-screen bg-background flex overflow-hidden max-w-full">
        {/* Sidebar - Full Height */}
<<<<<<< HEAD
        <Sidebar
          isMobile={isMobile}
          open={sidebarOpen}
=======
        <Sidebar 
          isMobile={isMobile} 
          open={sidebarOpen} 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          onOpenChange={setSidebarOpen}
          isCollapsed={!isMobile && !sidebarOpen}
        />
        {/* Right Section - Header + Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden max-w-full">
          {/* Header Section - Fixed Height */}
          <div className="flex-shrink-0">
<<<<<<< HEAD
            <Header
=======
            <Header 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
              onMenuClick={handleToggleSidebar}
              sidebarOpen={sidebarOpen}
            />
          </div>
          {/* Content Section - Flexible, Scrollable */}
<<<<<<< HEAD
          <main
=======
          <main 
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
            ref={mainRef}
            className={cn(
              "flex-1",
              disableScroll ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden main-scroll-container",
              "p-2 xs:p-2.5 sm:p-3 md:p-4 lg:p-6 transition-all duration-300",
              "pb-safe",
              // Scroll iyileştirmeleri
              "scroll-smooth",
              "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2",
              "[&::-webkit-scrollbar-track]:bg-transparent",
              "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full",
              "[&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30",
              // Scroll sorunlarını önlemek için
              "overscroll-behavior-contain",
              "-webkit-overflow-scrolling-touch",
              // Küçük ekranlarda taşmaları engelle
              "max-w-full",
              "min-w-0",
              // Responsive width constraints
              "w-full"
            )}
<<<<<<< HEAD
=======
            onClick={closeSidebar}
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          >
            <div className={cn(
              disableScroll ? "h-full" : "w-full",
              !disableScroll && "min-h-0",
              // Küçük ekranlarda taşmaları engelle
              "max-w-full",
              "overflow-x-hidden",
              // Ensure no horizontal overflow
              "min-w-0"
            )}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
