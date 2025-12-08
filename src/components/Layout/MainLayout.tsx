import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { testScroll, logScrollTest } from "@/utils/scrollTest";
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

  // Window resize listener - ekran küçüldüğünde sidebar'ı kapat
  // Tek bir optimize edilmiş resize listener
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    let lastWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    
    const handleResize = () => {
      if (typeof window === "undefined") return;
      
      const currentWidth = window.innerWidth;
      
      // Debounce: resize event'lerini sınırla ama küçülme durumunda hemen kapat
      clearTimeout(resizeTimeout);
      
      // Eğer ekran küçüldüyse (768px altına düştüyse) hemen kapat
      if (currentWidth < 768 && lastWidth >= 768) {
        setSidebarOpen(false);
        lastWidth = currentWidth;
        return;
      }
      
      // Diğer durumlarda debounce ile kontrol et
      resizeTimeout = setTimeout(() => {
        if (typeof window !== "undefined") {
          // md breakpoint (768px) - Tailwind'in md breakpoint'i
          if (window.innerWidth < 768) {
            setSidebarOpen(false);
          }
          lastWidth = window.innerWidth;
        }
      }, 150); // 150ms debounce (performans için optimize)
    };

    // İlk yüklemede kontrol et
    if (typeof window !== "undefined") {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
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
          console.warn("⚠️ Scroll Sorunu Tespit Edildi:", {
            issues: result.issues,
            scrollHeight: result.scrollHeight,
            clientHeight: result.clientHeight,
            element: mainRef.current,
          });
          logScrollTest();
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [disableScroll, sidebarOpen]);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <SidebarProvider closeSidebar={closeSidebar}>
      <div className="h-screen bg-background flex overflow-hidden">
        {/* Sidebar - Full Height */}
        <Sidebar 
          isMobile={isMobile} 
          open={sidebarOpen} 
          onOpenChange={setSidebarOpen}
          isCollapsed={!isMobile && !sidebarOpen}
        />
        {/* Right Section - Header + Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header Section - Fixed Height */}
          <div className="flex-shrink-0">
            <Header 
              onMenuClick={handleToggleSidebar}
              sidebarOpen={sidebarOpen}
            />
          </div>
          {/* Content Section - Flexible, Scrollable */}
          <main 
            ref={mainRef}
            className={cn(
              "flex-1",
              disableScroll ? "overflow-hidden" : "overflow-y-auto overflow-x-auto main-scroll-container",
              "p-2 sm:p-3 md:p-4 lg:p-6 transition-all duration-300",
              "pb-safe",
              // Scroll iyileştirmeleri
              "scroll-smooth",
              "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2",
              "[&::-webkit-scrollbar-track]:bg-transparent",
              "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full",
              "[&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30",
              // Scroll sorunlarını önlemek için
              "overscroll-behavior-contain",
              "-webkit-overflow-scrolling-touch"
            )}
            onClick={closeSidebar}
          >
            <div className={cn(
              disableScroll ? "h-full" : "w-full",
              !disableScroll && "min-h-0"
            )}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
