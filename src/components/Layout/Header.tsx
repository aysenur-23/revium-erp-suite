import { Menu, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationCenter } from "./NotificationCenter";
import { GlobalSearch } from "./GlobalSearch";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
}

export const Header = ({ onMenuClick, sidebarOpen = true }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

<<<<<<< HEAD
  // Mobilde sadece adı göster, desktop'ta tam adı göster
  const getDisplayName = () => {
    if (!user?.fullName) return user?.email || "Kullanıcı";
    if (isMobile) {
      // Sadece ilk kelimeyi (adı) al
      return user.fullName.split(' ')[0];
    }
    return user.fullName;
  };

=======
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
  return (
    <header 
      className={cn(
        "h-12 xs:h-12 sm:h-14 md:h-16 bg-background border-b border-border z-20 flex-shrink-0",
        "w-full max-w-full overflow-hidden"
      )}
    >
      <div className="flex h-full items-center px-2 xs:px-2.5 sm:px-3 md:px-4 lg:px-6 gap-2 xs:gap-2.5 sm:gap-3 w-full min-w-0 max-w-full overflow-hidden">
        {/* Sol taraf - Menu */}
        {onMenuClick && (
          <div className="flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size={isMobile ? "default" : "icon"}
                    className={cn(
                      "touch-manipulation relative flex-shrink-0",
                      "hover:bg-primary hover:text-primary-foreground hover:border-primary",
                      "border-2 transition-all duration-200",
                      "shadow-sm hover:shadow-md active:scale-95",
                      "bg-background",
                      isMobile && "min-h-[44px] min-w-[44px] px-3",
                      !isMobile && "h-10 w-10"
                    )}
                    aria-label={sidebarOpen ? "Menüyü kapat" : "Menüyü aç"}
                    onClick={() => onMenuClick()}
                  >
                    <Menu className={cn(
                      "h-5 w-5 transition-transform duration-300",
                      isMobile && "h-6 w-6",
                      sidebarOpen && "rotate-90"
                    )} />
                    {!sidebarOpen && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full animate-pulse ring-2 ring-primary/20" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px] sm:text-xs">
                  {sidebarOpen ? "Menüyü Kapat" : "Menüyü Aç"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        {/* Orta - Arama Çubuğu (Her zaman görünür, mobile'da kompakt) */}
        <div className={cn(
          "flex-1 flex justify-center max-w-3xl mx-auto px-2 sm:px-4",
          "flex"
        )}>
          <div className={cn(
            "w-full",
            isMobile ? "max-w-xs" : "max-w-2xl"
          )}>
            <GlobalSearch />
          </div>
        </div>
        
        {/* Sağ taraf - Bildirim ve Profil - Her zaman görünür */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
          <NotificationCenter />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size={isMobile ? "default" : "default"}
                className={cn(
                  "touch-manipulation flex-shrink-0 whitespace-nowrap",
                  isMobile && "min-h-[44px] px-2 text-[11px] sm:text-xs",
                  !isMobile && "px-3"
                )}
              >
                <span className="font-medium text-[11px] sm:text-xs truncate" style={{ maxWidth: isMobile ? '80px' : '150px' }}>
<<<<<<< HEAD
                  {getDisplayName()}
=======
                  {user?.fullName || user?.email || "Kullanıcı"}
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="min-w-[200px] !max-h-fit !h-auto !overflow-visible p-1.5"
            >
              <DropdownMenuLabel className="text-[11px] sm:text-xs px-2 py-1.5">
                {user?.fullName || user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/profile")}
                className="min-h-[44px] text-[11px] sm:text-xs touch-manipulation"
              >
                Profilim
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => signOut()}
                className="min-h-[44px] text-[11px] sm:text-xs touch-manipulation"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
