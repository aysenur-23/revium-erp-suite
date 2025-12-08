import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { UserPersonalInsights } from "@/components/Settings/UserPersonalInsights";
import { formatLastLogin } from "@/utils/formatLastLogin";
import { Timestamp } from "firebase/firestore";
import { User, Mail, Shield, Clock, Calendar } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header Section - Gradient Background */}
        {user && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
            <div className="p-6 sm:p-8 md:p-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 border-4 border-background shadow-lg">
                  <AvatarFallback className="text-2xl sm:text-3xl md:text-4xl font-bold bg-primary text-primary-foreground">
                    {getInitials(user.fullName || user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
                    {user.fullName || user.email}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base mb-3 break-all">
                    {user.email}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(user.roles?.length ? user.roles : ["personnel"]).map((role) => {
                      const roleLabels: Record<string, string> = {
                        super_admin: "Süper Yönetici",
                        admin: "Yönetici",
                        team_leader: "Ekip Lideri",
                        personnel: "Personel",
                        viewer: "Görüntüleyici",
                      };
                      return (
                        <Badge key={role} variant="secondary" className="text-xs sm:text-sm px-3 py-1">
                          {roleLabels[role] || role}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Personal Info Cards */}
        {user && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Ad Soyad</p>
                    <p className="text-base sm:text-lg font-semibold truncate">{user.fullName || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">E-posta</p>
                    <p className="text-base sm:text-lg font-semibold truncate break-all">{user.email || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Rol</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(user.roles?.length ? user.roles : ["personnel"]).slice(0, 2).map((role) => {
                        const roleLabels: Record<string, string> = {
                          super_admin: "Süper Yönetici",
                          admin: "Yönetici",
                          team_leader: "Ekip Lideri",
                          personnel: "Personel",
                          viewer: "Görüntüleyici",
                        };
                        return (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {roleLabels[role] || role}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Son Giriş</p>
                    <p className="text-base sm:text-lg font-semibold">
                      {user.lastLoginAt 
                        ? formatLastLogin(
                            user.lastLoginAt instanceof Timestamp 
                              ? user.lastLoginAt 
                              : (user.lastLoginAt && typeof user.lastLoginAt === 'object' && 'toDate' in user.lastLoginAt)
                              ? (user.lastLoginAt as Timestamp)
                              : (user.lastLoginAt as any)
                          )
                        : "Hiç giriş yapmamış"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <UserPersonalInsights />
      </div>
    </MainLayout>
  );
};

export default Profile;

