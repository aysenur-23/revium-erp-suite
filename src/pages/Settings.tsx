import { useEffect, useState } from "react";
import { Loader2, User, Building2, AlertCircle, Cloud } from "lucide-react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
// apiClient moved to legacy_before_firebase_migration
// Settings page uses Firebase services via child components
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ProfileSettings } from "@/components/Settings/ProfileSettings";
import { CompanySettings } from "@/components/Settings/CompanySettings";
import { DriveSettings } from "@/components/Settings/DriveSettings";
import { LoadingState } from "@/components/ui/loading-state";

const Settings = () => {
  const { user, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <LoadingState message="Ayarlar yükleniyor..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Ayarlar</h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
            {isSuperAdmin ? "Sistem ve şirket ayarlarını yönetin" : "Profil bilgilerinizi yönetin"}
          </p>
        </div>

        {isSuperAdmin ? (
          <Tabs defaultValue="company" className="w-full space-y-3 sm:space-y-4">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="company" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0">
                <Building2 className="h-4 w-4" />
                <span className="hidden xs:inline">Şirket Bilgileri</span>
                <span className="xs:hidden">Şirket</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0">
                <User className="h-4 w-4" />
                Profil
              </TabsTrigger>
              <TabsTrigger value="drive" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0">
                <Cloud className="h-4 w-4" />
                <span className="hidden sm:inline">Google Drive</span>
                <span className="sm:hidden">Drive</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="company" className="w-full">
              <CompanySettings />
            </TabsContent>
            <TabsContent value="profile" className="w-full">
              <ProfileSettings />
            </TabsContent>
            <TabsContent value="drive" className="w-full">
              <DriveSettings />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="w-full space-y-6">
            <ProfileSettings />
            <DriveSettings />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Settings;
