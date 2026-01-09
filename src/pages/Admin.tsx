import { useEffect, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, FileText, UserCheck } from "lucide-react";
import { UserManagement } from "@/components/Admin/UserManagement";
import { SystemSettings } from "@/components/Admin/SystemSettings";
import { RolePermissions } from "@/components/Admin/RolePermissions";
import { AuditLogs } from "@/components/Admin/AuditLogs";
import { UserInsights } from "@/components/Admin/UserInsights";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Shield } from "lucide-react";

// ...

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "users");

  useEffect(() => {
    const urlTab = searchParams.get("tab") || "users";
    setActiveTab((prev) => (prev === urlTab ? prev : urlTab));
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    setSearchParams(params, { replace: true });
  };

  return (
    <MainLayout>
      <div className="space-y-2 sm:space-y-4 w-full sm:w-[95%] md:w-[90%] lg:max-w-[1400px] mx-auto px-1 sm:px-0">
        <div>
          <h1 className="text-[16px] sm:text-[18px] md:text-xl font-semibold text-foreground leading-tight">Admin Paneli</h1>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-2 sm:space-y-4">
          <div className="w-full pb-2 sm:pb-0 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <TabsList className="flex h-auto p-1 gap-1 sm:gap-2 w-full sm:w-auto min-w-max sm:min-w-0">
              <TabsTrigger value="users" className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-[11px] sm:text-xs min-h-[44px] sm:min-h-0 whitespace-nowrap">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Kullanıcılar</span>
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-[11px] sm:text-xs min-h-[44px] sm:min-h-0 whitespace-nowrap">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Rol Yetkileri</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-[11px] sm:text-xs min-h-[44px] sm:min-h-0 whitespace-nowrap">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Audit Loglar</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-[11px] sm:text-xs min-h-[44px] sm:min-h-0 whitespace-nowrap">
                <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Kullanıcı Analizi</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-[11px] sm:text-xs min-h-[44px] sm:min-h-0 whitespace-nowrap">
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Ayarlar</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="space-y-2">
            <UserManagement />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-2">
            <RolePermissions />
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-2">
            <AuditLogs />
          </TabsContent>

          <TabsContent value="insights" className="space-y-2">
            <UserInsights />
          </TabsContent>

          <TabsContent value="settings" className="space-y-2">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Admin;
