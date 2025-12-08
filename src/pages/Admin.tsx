import { useEffect, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Settings, LayoutDashboard, FileText, UserCheck } from "lucide-react";
import { UserManagement } from "@/components/Admin/UserManagement";
import { DepartmentManagement } from "@/components/Admin/DepartmentManagement";
import { SystemSettings } from "@/components/Admin/SystemSettings";
import { RolePermissions } from "@/components/Admin/RolePermissions";
import { AuditLogs } from "@/components/Admin/AuditLogs";
import { AdminDashboard } from "@/components/Admin/AdminDashboard";
import { UserInsights } from "@/components/Admin/UserInsights";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Shield } from "lucide-react";

// ...

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "dashboard");

  useEffect(() => {
    const urlTab = searchParams.get("tab") || "dashboard";
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
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Admin Paneli</h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
            Sistem yönetimi ve kullanıcı kontrolü
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3 sm:space-y-4 md:space-y-6">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 scrollbar-hide">
            <TabsList className="flex h-auto p-1 gap-1 sm:gap-2 w-full sm:w-auto">
              <TabsTrigger value="dashboard" className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0 whitespace-nowrap">
                <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0 whitespace-nowrap">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>Kullanıcılar</span>
              </TabsTrigger>
              <TabsTrigger value="departments" className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0 whitespace-nowrap">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span>Departmanlar</span>
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0 whitespace-nowrap">
                <Shield className="h-4 w-4 flex-shrink-0" />
                <span>Rol Yetkileri</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0 whitespace-nowrap">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span>Audit Loglar</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0 whitespace-nowrap">
                <UserCheck className="h-4 w-4 flex-shrink-0" />
                <span>Kullanıcı Analizi</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-0 whitespace-nowrap">
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span>Ayarlar</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-4">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <DepartmentManagement />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <RolePermissions />
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-4">
            <AuditLogs />
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <UserInsights />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Admin;
