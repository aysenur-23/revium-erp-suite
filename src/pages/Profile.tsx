import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { UserPersonalInsights } from "@/components/Settings/UserPersonalInsights";
import { formatLastLogin } from "@/utils/formatLastLogin";
import { Timestamp } from "firebase/firestore";

const Profile = () => {
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Profil</h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
            Kişisel bilgilerinizi ve görev istatistiklerinizi görüntüleyin
          </p>
        </div>

        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg md:text-xl">Kişisel Bilgiler</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Ad Soyad</p>
                <p className="text-lg font-semibold">{user.fullName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">E-posta</p>
                <p className="text-lg font-semibold break-all">{user.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rol</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(user.roles?.length ? user.roles : ["personnel"]).map((role) => {
                    const roleLabels: Record<string, string> = {
                      super_admin: "Süper Yönetici",
                      admin: "Yönetici",
                      team_leader: "Ekip Lideri",
                      personnel: "Personel",
                      viewer: "Görüntüleyici",
                    };
                    return (
                      <Badge key={role} variant="secondary">
                        {roleLabels[role] || role}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Son Giriş</p>
                <p className="text-lg font-semibold">
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
            </CardContent>
          </Card>
        )}

        <UserPersonalInsights />
      </div>
    </MainLayout>
  );
};

export default Profile;

