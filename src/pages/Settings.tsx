import { lazy, Suspense } from "react";
import { User, Building2 } from "lucide-react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// Lazy load child components for better performance
const ProfileSettings = lazy(() => import("@/components/Settings/ProfileSettings").then(m => ({ default: m.ProfileSettings })));
const CompanySettings = lazy(() => import("@/components/Settings/CompanySettings").then(m => ({ default: m.CompanySettings })));

const Settings = () => {
  const { user, isSuperAdmin } = useAuth();

  return (
    <MainLayout>
      <div className="space-y-2 w-full sm:w-[95%] md:w-[90%] lg:max-w-[1400px] mx-auto">
        <div>
            <h1 className="text-[16px] sm:text-[18px] font-semibold text-foreground">Ayarlar</h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
            {isSuperAdmin ? "Sistem ve şirket ayarlarını yönetin" : "Profil bilgilerinizi yönetin"}
          </p>
        </div>

        {isSuperAdmin ? (
          <Tabs defaultValue="company" className="w-full space-y-2 sm:space-y-3">
            <TabsList className="grid grid-cols-2 w-full sm:w-auto">
              <TabsTrigger value="company" className="flex items-center gap-1.5 sm:gap-2 text-[14px] sm:text-[15px] min-h-[44px] sm:min-h-0">
                <Building2 className="h-4 w-4" />
                <span className="hidden xs:inline">Şirket Bilgileri</span>
                <span className="xs:hidden">Şirket</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-1.5 sm:gap-2 text-[14px] sm:text-[15px] min-h-[44px] sm:min-h-0">
                <User className="h-4 w-4" />
                Profil
              </TabsTrigger>
            </TabsList>
            <TabsContent value="company" className="w-full">
              <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <CompanySettings />
              </Suspense>
            </TabsContent>
            <TabsContent value="profile" className="w-full">
              <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <ProfileSettings />
              </Suspense>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="w-full space-y-6">
            <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
              <ProfileSettings />
            </Suspense>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Settings;
