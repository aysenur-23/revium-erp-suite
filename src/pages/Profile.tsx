import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { UserPersonalInsights } from "@/components/Settings/UserPersonalInsights";
import { formatLastLogin } from "@/utils/formatLastLogin";
import { Timestamp } from "firebase/firestore";
import { User, Mail, Shield, Clock, Settings, Edit2, Calendar, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      super_admin: "Süper Yönetici",
      admin: "Süper Yönetici",
      team_leader: "Ekip Lideri",
      personnel: "Personel",
      viewer: "Görüntüleyici",
    };
    return roleLabels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      super_admin: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      admin: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      team_leader: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      personnel: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      viewer: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
    };
    return roleColors[role] || "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
  };

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-8 w-[90%] max-w-[90%] mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[20px] sm:text-[24px] font-semibold text-foreground">Profilim</h1>
            <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
              Profil bilgilerinizi görüntüleyin ve yönetin
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2 w-full sm:w-auto"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-4 w-4" />
            Ayarları Düzenle
          </Button>
        </div>

        {user && (
          <>
            {/* Profile Header Card */}
            <Card className="border-2 shadow-lg">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-lg">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white text-2xl sm:text-3xl font-bold">
                        {getInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-emerald-500 border-4 border-background shadow-md"></div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h2 className="text-[18px] sm:text-[20px] font-bold text-foreground mb-1.5">
                        {user.fullName || "Kullanıcı"}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        {(user.roles?.length ? user.roles : ["personnel"]).map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className={cn(
                              "text-xs sm:text-sm font-semibold px-2.5 py-1",
                              getRoleColor(role)
                            )}
                          >
                            {getRoleLabel(role)}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground mb-0.5">E-posta</p>
                          <p className="font-medium text-foreground truncate">{user.email || "-"}</p>
                        </div>
                      </div>

                      {user.phone && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground mb-0.5">Telefon</p>
                            <p className="font-medium text-foreground">{user.phone}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                          <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground mb-0.5">Son Giriş</p>
                          <p className="font-medium text-foreground">
                            {user.lastLoginAt
                              ? formatLastLogin(
                                  user.lastLoginAt instanceof Timestamp
                                    ? user.lastLoginAt
                                    : null
                                )
                              : "Hiç giriş yapmamış"}
                          </p>
                        </div>
                      </div>

                      {user.dateOfBirth && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground mb-0.5">Doğum Tarihi</p>
                            <p className="font-medium text-foreground">
                              {new Date(user.dateOfBirth).toLocaleDateString("tr-TR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary group cursor-pointer">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Ad Soyad</p>
                  <p className="text-lg sm:text-xl font-bold text-foreground truncate">
                    {user.fullName || "-"}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 group cursor-pointer">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">E-posta</p>
                  <p className="text-base sm:text-lg font-semibold text-foreground truncate break-all">
                    {user.email || "-"}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500 group cursor-pointer">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Rol</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(user.roles?.length ? user.roles : ["personnel"]).slice(0, 2).map((role) => (
                      <Badge
                        key={role}
                        variant="outline"
                        className={cn("text-xs font-semibold", getRoleColor(role))}
                      >
                        {getRoleLabel(role)}
                      </Badge>
                    ))}
                    {user.roles && user.roles.length > 2 && (
                      <Badge variant="outline" className="text-xs font-semibold">
                        +{user.roles.length - 2}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500 group cursor-pointer">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                      <Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Son Giriş</p>
                  <p className="text-base sm:text-lg font-semibold text-foreground">
                    {user.lastLoginAt
                      ? formatLastLogin(
                          user.lastLoginAt instanceof Timestamp ? user.lastLoginAt : null
                        )
                      : "Hiç giriş yapmamış"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Personal Insights */}
            <UserPersonalInsights />
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Profile;
