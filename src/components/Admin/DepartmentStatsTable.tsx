import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getDepartments, DepartmentWithStats, Department } from "@/services/firebase/departmentService";
import { subscribeToTasks, Task } from "@/services/firebase/taskService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { DepartmentDetailModal } from "./DepartmentDetailModal";
import { onSnapshot, collection, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface DepartmentStat {
  id: string;
  name: string;
  process_count: number;
  active_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  team_members: number; // Ekip üyesi sayısı
  manager_name?: string; // Ekip lideri adı
}

export const DepartmentStatsTable = () => {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [stats, setStats] = useState<DepartmentStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [departments, setDepartments] = useState<DepartmentWithStats[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // İstatistikleri hesapla
  const calculateStats = useCallback((depts: DepartmentWithStats[], tasks: Task[], users: UserProfile[]) => {
    return depts.map((dept) => {
      // Ekip üyelerini bul (approvedTeams, pendingTeams veya departmentId ile)
      const teamMembers = users.filter((user: UserProfile) => {
        // Direkt departman ID'si eşleşiyorsa
        if (user.departmentId === dept.id) return true;
        // Onaylanmış ekiplerde varsa
        if (user.approvedTeams && user.approvedTeams.includes(dept.id)) return true;
        // Bekleyen ekiplerde varsa
        if (user.pendingTeams && user.pendingTeams.includes(dept.id)) return true;
        return false;
      });

      // Ekip lideri bilgisini al (sadece silinmemiş kullanıcılar)
      const manager = dept.managerId 
        ? users.find((u: UserProfile) => u.id === dept.managerId && !('deleted' in u && u.deleted))
        : null;

      // Ekip üyelerinin ID'lerini al
      const teamMemberIds = new Set(teamMembers.map((u: UserProfile) => u.id));

      // Departmana ait görevleri bul - birden fazla yöntemle
      const allDeptTasks = tasks.filter((task) => {
        // 1. productionProcessId ile direkt bağlantı
        if (task.productionProcessId && task.productionProcessId === dept.id) {
          return true;
        }

        // 2. Görev ekip üyelerinden birine atanmışsa (assignedUsers string array veya object array)
        if (task.assignedUsers && Array.isArray(task.assignedUsers)) {
          const hasAssignedMember = task.assignedUsers.some((u: string | { id?: string; assignedTo?: string; userId?: string }) => {
            // Eğer string ise direkt ID karşılaştırması
            if (typeof u === 'string') {
              return teamMemberIds.has(u);
            }
            // Eğer object ise id field'ına bak
            if (u && typeof u === 'object') {
              const userId = u.id || u.assignedTo || u.userId;
              return userId && teamMemberIds.has(userId);
            }
            return false;
          });
          if (hasAssignedMember) return true;
        }

        // 3. Görev ekip üyelerinden biri tarafından oluşturulmuşsa
        if (task.createdBy && teamMemberIds.has(task.createdBy)) {
          return true;
        }
        
        return false;
      });

      // Aktif görevler: completed ve cancelled olmayanlar
      const activeTasks = allDeptTasks.filter((t) => 
        t.status !== 'completed' && t.status !== 'cancelled'
      ).length;
      // Tamamlanmış görevler: status completed olanlar
      const completedTasks = allDeptTasks.filter((t) => t.status === 'completed').length;
      // İptal edilen görevler
      const cancelledTasks = allDeptTasks.filter((t) => t.status === 'cancelled').length;
      const total = activeTasks + completedTasks + cancelledTasks;
      // Tamamlanma oranı: sadece tamamlanmış görevler / toplam (iptal edilenler dahil değil)
      const completionRate = total > 0 ? (completedTasks / total) * 100 : 0;

      return {
        id: dept.id,
        name: dept.name,
        process_count: 0, // Production processes collection henüz mevcut değil
        active_tasks: activeTasks,
        completed_tasks: completedTasks,
        completion_rate: completionRate,
        team_members: teamMembers.length,
        manager_name: manager?.fullName || manager?.displayName || undefined,
      } as DepartmentStat;
    });
  }, []);

  // Real-time listener'ları kur
  useEffect(() => {
    let unsubscribeTasks: Unsubscribe | null = null;
    let unsubscribeDepartments: Unsubscribe | null = null;
    let unsubscribeUsers: Unsubscribe | null = null;
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        // İlk yüklemede tüm verileri al
        const [depts, users] = await Promise.all([
          getDepartments(),
          getAllUsers(),
        ]);
        
        if (!isMounted) return;
        
        setDepartments(depts);
        setAllUsers(users);
        
        // Görevler için real-time listener başlat
        unsubscribeTasks = subscribeToTasks({}, (tasks) => {
          if (!isMounted) return;
          setAllTasks(tasks);
          setIsLoading(false);
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error loading initial data:", error);
        }
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialData();

    // Departments için real-time listener - cache kullan
    let departmentsCache: Department[] | null = null;
    let departmentsCacheTime = 0;
    const DEPARTMENTS_CACHE_DURATION = 2 * 60 * 1000; // 2 dakika
    
    if (db) {
      unsubscribeDepartments = onSnapshot(
        collection(db, "departments"),
        async (snapshot) => {
          if (!isMounted) return;
          
          // Cache kontrolü
          const now = Date.now();
          if (departmentsCache && (now - departmentsCacheTime) < DEPARTMENTS_CACHE_DURATION) {
            setDepartments(departmentsCache);
            return;
          }
          
          // getDepartments fonksiyonunu kullanarak manager bilgilerini de al
          try {
            const depts = await getDepartments();
            departmentsCache = depts;
            departmentsCacheTime = now;
            setDepartments(depts);
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error("Error fetching departments with manager info:", error);
            }
            // Fallback: sadece temel bilgileri al
            const depts = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            })) as DepartmentWithStats[];
            setDepartments(depts);
          }
        },
        (error) => {
          if (import.meta.env.DEV) {
            console.error("Departments snapshot error:", error);
          }
        }
      );
    }

    // Users için real-time listener - snapshot'dan direkt al (getAllUsers çağrısı yapmadan)
    if (db) {
      unsubscribeUsers = onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          if (!isMounted) return;
          // Snapshot'dan direkt al (getAllUsers çağrısı yapmadan - performans için)
          const users = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as UserProfile[];
          setAllUsers(users);
        },
        (error) => {
          if (import.meta.env.DEV) {
            console.error("Users snapshot error:", error);
          }
        }
      );
    }

    // Cleanup
    return () => {
      isMounted = false;
      if (unsubscribeTasks) unsubscribeTasks();
      if (unsubscribeDepartments) unsubscribeDepartments();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, []);

  // Veriler değiştiğinde istatistikleri güncelle
  useEffect(() => {
    const calculatedStats = calculateStats(departments, allTasks, allUsers);
    setStats(calculatedStats);
  }, [departments, allTasks, allUsers, calculateStats]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Departman İstatistikleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Departman İstatistikleri</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats && stats.length > 0 ? (
            stats.map((stat) => (
              <button
                key={stat.id}
                onClick={() => setSelectedDepartmentId(stat.id)}
                className="w-full text-left p-4 rounded-lg bg-muted/50 space-y-2 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{stat.name}</h4>
                  <span className="text-[11px] sm:text-xs text-muted-foreground">
                    {stat.completion_rate.toFixed(0)}%
                  </span>
                </div>
                <Progress value={stat.completion_rate} className="h-2" />
                <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground flex-wrap gap-2">
                  <span>Üyeler: {stat.team_members}</span>
                  <span>Aktif: {stat.active_tasks}</span>
                  <span>Tamamlanan: {stat.completed_tasks}</span>
                  {stat.manager_name && (
                    <span className="w-full text-right">Lider: {stat.manager_name}</span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Henüz departman bulunmuyor
            </p>
          )}
        </div>
        {selectedDepartmentId && (
          <DepartmentDetailModal
            open={!!selectedDepartmentId}
            onOpenChange={(open) => !open && setSelectedDepartmentId(null)}
            departmentId={selectedDepartmentId}
          />
        )}
      </CardContent>
    </Card>
  );
};
