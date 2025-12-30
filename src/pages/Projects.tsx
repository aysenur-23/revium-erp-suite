import { useEffect, useState, useMemo } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, FolderKanban, Loader2, Edit, Trash2, ChevronDown, ChevronUp, X, Save } from "lucide-react";
import { toast } from "sonner";
import { getProjects, createProject, updateProject, deleteProject, Project } from "@/services/firebase/projectService";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { canCreateProject, canCreateTask, canDeleteProject, canViewPrivateProject, isMainAdmin, canDeleteResource, canEditProject } from "@/utils/permissions";
import { getDepartments } from "@/services/firebase/departmentService";
import { onPermissionCacheChange } from "@/services/firebase/rolePermissionsService";
import { UserProfile } from "@/services/firebase/authService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TaskInlineForm } from "@/components/Tasks/TaskInlineForm";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDeleteProjects, setCanDeleteProjects] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "completed" | "archived",
    isPrivate: false,
  });
  const [activeProjectForm, setActiveProjectForm] = useState<string | null>(null);

  const checkPermissions = async () => {
    if (!user) {
      setCanCreate(false);
      setCanEdit(false);
      setCanDeleteProjects(false);
      setIsSuperAdmin(false);
      return;
    }
    try {
      const departments = await getDepartments();
      const { isMainAdmin, canDeleteResource } = await import("@/utils/permissions");
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        fullName: user.fullName,
        displayName: user.fullName,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        role: user.roles,
        createdAt: null,
        updatedAt: null,
      };
      // Dummy project for permission check
      const dummyProject: Project = {
        id: "",
        name: "",
        description: null,
        status: "active",
        isPrivate: false,
        createdBy: user.id,
        createdAt: null,
        updatedAt: null,
      };
      const [hasCreatePermission, hasEditPermission, hasDeletePermission, isMainAdminUser] = await Promise.all([
        canCreateProject(userProfile, departments),
        canEditProject(dummyProject, userProfile),
        canDeleteResource(userProfile, "projects"),
        isMainAdmin(userProfile),
      ]);
      setCanCreate(hasCreatePermission);
      setCanEdit(hasEditPermission);
      setCanDeleteProjects(hasDeletePermission);
      setIsSuperAdmin(isMainAdminUser);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error checking permissions:", error);
      }
      setCanCreate(false);
      setCanEdit(false);
      setCanDeleteProjects(false);
      setIsSuperAdmin(false);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, [user]);

  // Listen to permission changes in real-time
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onPermissionCacheChange(() => {
      // Re-check permissions when they change
      checkPermissions();
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await getProjects();
      
      // Gizli projeleri filtrele: Sadece üst yönetici, yönetici, oluşturan ve projede görevi olanlar görebilir
      // Ekip lideri sadece kendi oluşturduğu gizli projeleri görebilir
      const filteredProjects = await Promise.all(
        projectsData.map(async (project) => {
          if (!project.isPrivate) return project; // Gizli olmayan projeler herkes görebilir
          
          // Gizli projeler için canViewPrivateProject kontrolü
          if (user) {
            try {
              const userProfile: UserProfile = {
                id: user.id,
                email: user.email,
                emailVerified: user.emailVerified,
                fullName: user.fullName,
                displayName: user.fullName,
                phone: user.phone,
                dateOfBirth: user.dateOfBirth,
                role: user.roles,
                createdAt: null,
                updatedAt: null,
              };
              const canView = await canViewPrivateProject(project, userProfile);
              if (canView) return project;
              
              // Projede görevi olan kullanıcılar görebilir (canViewPrivateProject false döndüyse)
              try {
                const { getTasks } = await import("@/services/firebase/taskService");
                const projectTasks = await getTasks({ projectId: project.id });
                
                for (const task of projectTasks) {
                  if (task.createdBy === user.id) return project;
                  if (task.assignedUsers && task.assignedUsers.includes(user.id)) return project;
                  const { getTaskAssignments } = await import("@/services/firebase/taskService");
                  const assignments = await getTaskAssignments(task.id);
                  const isAssigned = assignments.some(
                    (a) => a.assignedTo === user.id && (a.status === "accepted" || a.status === "pending")
                  );
                  if (isAssigned) return project;
                }
              } catch (error: unknown) {
                if (import.meta.env.DEV) {
                  console.error("Error checking project tasks:", error);
                }
              }
            } catch (error: unknown) {
              if (import.meta.env.DEV) {
                console.error("Error checking private project visibility:", error);
              }
            }
          }
          
          return null; // Diğer kullanıcılar gizli projeleri göremez
        })
      );
      
      // Otomatik oluşturulan "Gizli Görevler" projesini listeden kaldır
      // Sadece kullanıcının manuel oluşturduğu gizli projeler gösterilmeli
      const finalProjects = filteredProjects.filter((p): p is typeof projectsData[0] => {
        if (p === null) return false;
        // Otomatik oluşturulan "Gizli Görevler" projesini filtrele
        if (p.name === "Gizli Görevler" && p.isPrivate === true && 
            p.description === "Projesi olmayan gizli görevler için otomatik oluşturulan proje") {
          return false;
        }
        return true;
      });
      
      setProjects(finalProjects);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Fetch projects error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "Projeler yüklenirken hata oluştu";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Proje adı gereklidir");
      return;
    }

    if (!user?.id) {
      toast.error("Kullanıcı bilgisi bulunamadı");
      return;
    }

    try {
      await createProject({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        isPrivate: formData.isPrivate || false,
        createdBy: user.id,
      });
      toast.success("Proje oluşturuldu");
      setCreateDialogOpen(false);
      setFormData({ name: "", description: "", status: "active", isPrivate: false });
      await fetchProjects();
      
      // Eğer returnTo parametresi varsa, o sayfaya geri dön
      const returnTo = searchParams.get("returnTo");
      if (returnTo) {
        setSearchParams({});
        navigate(returnTo);
      }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Create project error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "Proje oluşturulurken hata oluştu";
      toast.error(errorMessage);
    }
  };

  const handleEdit = async () => {
    if (!selectedProject || !formData.name.trim()) {
      toast.error("Proje adı gereklidir");
      return;
    }

    if (!user?.id) {
      toast.error("Kullanıcı bilgisi bulunamadı");
      return;
    }

    try {
      await updateProject(selectedProject.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
      }, user.id);
      toast.success("Proje güncellendi");
      setEditDialogOpen(false);
      setSelectedProject(null);
      setFormData({ name: "", description: "", status: "active", isPrivate: false });
      fetchProjects();
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Update project error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "Proje güncellenirken hata oluştu";
      toast.error(errorMessage);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;

    if (!user?.id) {
      toast.error("Kullanıcı bilgisi bulunamadı");
      return;
    }

    try {
      await deleteProject(selectedProject.id, user.id);
      toast.success("Proje silindi");
      fetchProjects();
      setDeleteDialogOpen(false);
      setSelectedProject(null);
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Delete project error:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "Proje silinirken hata oluştu";
      toast.error(errorMessage);
    }
  };

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      status: project.status,
      isPrivate: project.isPrivate || false,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Aktif</Badge>;
      case "completed":
        return <Badge variant="secondary">Tamamlandı</Badge>;
      case "archived":
        return <Badge variant="outline">Arşivlendi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredProjects = projects.filter((project) => {
    const searchLower = searchTerm.toLocaleLowerCase('tr-TR');
    const projectName = project.name?.toLocaleLowerCase('tr-TR') || "";
    const projectDesc = project.description?.toLocaleLowerCase('tr-TR') || "";
    
    return projectName.includes(searchLower) || projectDesc.includes(searchLower);
  });

  // Proje istatistikleri
  const projectStats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "active").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    const archived = projects.filter((p) => p.status === "archived").length;
    const privateProjects = projects.filter((p) => p.isPrivate === true).length;
    return { total, active, completed, archived, privateProjects };
  }, [projects]);

  if (loading) {
    return (
      <MainLayout>
        <LoadingState message="Projeler yükleniyor..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-2 w-full sm:w-[95%] md:w-[90%] lg:max-w-[1400px] mx-auto overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] sm:text-[18px] font-semibold text-foreground">Projeler</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
              Projelerinizi yönetin ve görevlerinizi takip edin
            </p>
          </div>
          {canCreate && (
            <Button className="gap-1 w-full sm:w-auto min-h-[36px] sm:min-h-8 text-[11px] sm:text-xs" onClick={() => {
              setFormData({ name: "", description: "", status: "active", isPrivate: false });
              setCreateDialogOpen(true);
            }}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Yeni Proje</span>
              <span className="sm:hidden">Yeni</span>
            </Button>
          )}
        </div>

        {/* Proje İstatistikleri */}
        <div className="grid gap-1.5 sm:gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { 
              label: "Toplam Proje", 
              value: projectStats.total, 
              sub: "Tüm projeler", 
              badgeClass: "text-primary",
            },
            { 
              label: "Aktif", 
              value: projectStats.active, 
              sub: "Devam eden projeler", 
              badgeClass: "text-emerald-600",
            },
            { 
              label: "Tamamlanan", 
              value: projectStats.completed, 
              sub: "Kapatılan projeler", 
              badgeClass: "text-blue-600",
            },
            { 
              label: "Arşivlenmiş", 
              value: projectStats.archived, 
              sub: "Arşivdeki projeler", 
              badgeClass: "text-muted-foreground",
            },
            { 
              label: "Gizli", 
              value: projectStats.privateProjects, 
              sub: "Gizli projeler", 
              badgeClass: "text-amber-600",
            },
          ].map((stat) => (
            <Card 
              key={stat.label} 
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50"
            >
              <CardContent className="p-3 sm:p-4">
                <p className="text-[11px] sm:text-xs text-muted-foreground mb-2 truncate">{stat.label}</p>
                <div className="text-lg sm:text-xl font-semibold mb-1">{stat.value}</div>
                <p className={`text-[11px] sm:text-xs font-medium ${stat.badgeClass} line-clamp-1`}>{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtreler */}
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <SearchInput
                placeholder="Proje ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                containerClassName="flex-1 min-w-0 w-full sm:w-auto sm:min-w-[200px] md:min-w-[250px]"
                className="h-9 sm:h-10 text-[11px] sm:text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Proje Listesi */}
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-5 overflow-hidden">
            <div className="space-y-2 sm:space-y-3 w-full max-w-full">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-[11px] sm:text-xs text-muted-foreground">
                  {searchTerm ? "Arama sonucu bulunamadı" : "Henüz proje yok"}
                </div>
              ) : (
                filteredProjects.map((project) => {
                  // Silme yetkisi kontrolü: Firestore'dan - state'ten al
                  const canDelete = isSuperAdmin || canDeleteProjects || project.createdBy === user?.id;
                  
                  return (
                  <div
                    key={project.id}
                    className="flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors w-full max-w-full overflow-hidden"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between w-full max-w-full">
                      <div
                        className="flex-1 cursor-pointer min-w-0"
                        onClick={() => navigate(`/projects/${project.id}/tasks`)}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <FolderKanban className="h-5 w-5 text-primary flex-shrink-0" />
                          <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                          {getStatusBadge(project.status)}
                          {project.isPrivate && (
                            <Badge variant="outline" className="gap-1 flex-shrink-0">
                              <Lock className="h-3 w-3" />
                              <span className="hidden sm:inline">Gizli</span>
                            </Badge>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 break-words">{project.description}</p>
                        )}
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-2">
                          Oluşturulma: {project.createdAt?.toDate?.().toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        {canCreate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              // Double-check permission before opening form
                              if (!user) return;
                              try {
                                const departments = await getDepartments();
                                const userProfile: UserProfile = {
                                  id: user.id,
                                  email: user.email,
                                  emailVerified: user.emailVerified,
                                  fullName: user.fullName,
                                  displayName: user.fullName,
                                  phone: user.phone,
                                  dateOfBirth: user.dateOfBirth,
                                  role: user.roles,
                                  createdAt: null,
                                  updatedAt: null,
                                };
                                // SISTEM_YETKILERI.md'ye göre: Sadece Super Admin ve Team Leader görev oluşturabilir
                                const hasTaskPermission = await canCreateTask(userProfile, departments);
                                if (!hasTaskPermission) {
                                  toast.error("Görev ekleme yetkiniz yok. Sadece yönetici veya ekip lideri görev oluşturabilir.");
                                  return;
                                }
                                setActiveProjectForm((prev) =>
                                  prev === project.id ? null : project.id
                                );
                              } catch (error: unknown) {
                                if (import.meta.env.DEV) {
                                  console.error("Permission check error:", error);
                                }
                                toast.error("Yetki kontrolü yapılamadı");
                              }
                            }}
                          >
                            {activeProjectForm === project.id ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Formu Kapat
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Görev Ekle
                              </>
                            )}
                          </Button>
                        )}
                        {(canEdit || project.createdBy === user?.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(project);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog(project);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {activeProjectForm === project.id && (
                      <Dialog open={true} onOpenChange={() => setActiveProjectForm(null)}>
                        <DialogContent className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
                          {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
                          <DialogTitle className="sr-only">
                            Yeni Görev
                          </DialogTitle>
                          <DialogDescription className="sr-only">
                            Proje için yeni görev oluşturun
                          </DialogDescription>
                          
                          <div className="flex flex-col h-full min-h-0">
                            <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
                              <h2 className="text-[14px] sm:text-[15px] font-semibold text-foreground">Yeni Görev</h2>
                            </DialogHeader>
                            <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
                              <div className="max-w-full mx-auto h-full overflow-y-auto">
                                <TaskInlineForm
                                  mode="create"
                                  projectId={project.id}
                                  defaultStatus="pending"
                                  onCancel={() => setActiveProjectForm(null)}
                                  onSuccess={async (taskId) => {
                                    setActiveProjectForm(null);
                                    // Firestore'da görevin kaydedilmesi için kısa bir gecikme
                                    // Tüm projeler sayfasında yeni görevin görünmesi için bekle
                                    await new Promise(resolve => setTimeout(resolve, 1500));
                                    if (taskId) {
                                      navigate(`/projects/${project.id}/tasks?highlight=${taskId}`);
                                    } else {
                                      fetchProjects();
                                    }
                                  }}
                                  className="border-0 shadow-none p-0"
                                />
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
            {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
            <DialogTitle className="sr-only">
              Yeni Proje
            </DialogTitle>
            <DialogDescription className="sr-only">
              Yeni proje oluşturun
            </DialogDescription>
            
            <div className="flex flex-col h-full min-h-0">
              {/* Header */}
              <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                      <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <h2 className="text-[14px] sm:text-[15px] font-semibold text-foreground truncate">
                      Yeni Proje
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 font-medium text-[11px] sm:text-xs flex-shrink-0"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                      İptal
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 font-medium text-[11px] sm:text-xs flex-shrink-0 text-white"
                      onClick={handleCreate}
                    >
                      <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                      Oluştur
                    </Button>
                  </div>
                </div>
              </DialogHeader>
            
              {/* Content */}
              <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
                <div className="max-w-full mx-auto h-full overflow-y-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-[14px] sm:text-[15px]">Proje Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="create-name" className="text-[11px] sm:text-xs" showRequired>
                          Proje Adı
                        </Label>
                        <Input
                          id="create-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Proje adı"
                          className="min-h-[44px] sm:min-h-0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-description" className="text-[11px] sm:text-xs">Açıklama</Label>
                        <Textarea
                          id="create-description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Proje açıklaması"
                          rows={4}
                          className="min-h-[100px] sm:min-h-[120px]"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="create-status" className="text-[11px] sm:text-xs">Durum</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value: "active" | "completed" | "archived") =>
                              setFormData({ ...formData, status: value })
                            }
                          >
                            <SelectTrigger id="create-status" className="min-h-[44px] sm:min-h-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Aktif</SelectItem>
                              <SelectItem value="completed">Tamamlandı</SelectItem>
                              <SelectItem value="archived">Arşivlendi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-8">
                          <Checkbox
                            id="create-private"
                            checked={formData.isPrivate}
                            onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: checked as boolean })}
                          />
                          <Label
                            htmlFor="create-private"
                            className="text-[11px] sm:text-xs font-normal cursor-pointer text-muted-foreground flex items-center gap-1"
                          >
                            <Lock className="h-3 w-3" />
                            Gizli Proje
                          </Label>
                        </div>
                      </div>
                      <div className="text-[11px] sm:text-xs text-muted-foreground">
                        Gizli projeler sadece oluşturan ve yöneticiler tarafından görülebilir.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
            {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
            <DialogTitle className="sr-only">
              Proje Düzenle
            </DialogTitle>
            <DialogDescription className="sr-only">
              Proje bilgilerini düzenleyin
            </DialogDescription>
            
            <div className="flex flex-col h-full min-h-0">
              {/* Header */}
              <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                      <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <h2 className="text-[14px] sm:text-[15px] font-semibold text-foreground truncate">
                      Proje Düzenle
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 font-medium text-[11px] sm:text-xs flex-shrink-0"
                      onClick={() => setEditDialogOpen(false)}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                      İptal
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 font-medium text-[11px] sm:text-xs flex-shrink-0 text-white"
                      onClick={handleEdit}
                    >
                      <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                      Kaydet
                    </Button>
                  </div>
                </div>
              </DialogHeader>
            
              {/* Content */}
              <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
                <div className="max-w-full mx-auto h-full overflow-y-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-[14px] sm:text-[15px]">Proje Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name" className="text-[11px] sm:text-xs" showRequired>
                          Proje Adı
                        </Label>
                        <Input
                          id="edit-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Proje adı"
                          className="min-h-[44px] sm:min-h-0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-description" className="text-[11px] sm:text-xs">Açıklama</Label>
                        <Textarea
                          id="edit-description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Proje açıklaması"
                          rows={4}
                          className="min-h-[100px] sm:min-h-[120px]"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-status" className="text-[11px] sm:text-xs">Durum</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value: "active" | "completed" | "archived") =>
                              setFormData({ ...formData, status: value })
                            }
                          >
                            <SelectTrigger id="edit-status" className="min-h-[44px] sm:min-h-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Aktif</SelectItem>
                              <SelectItem value="completed">Tamamlandı</SelectItem>
                              <SelectItem value="archived">Arşivlendi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-8">
                          <Checkbox
                            id="edit-private"
                            checked={formData.isPrivate}
                            onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: checked as boolean })}
                          />
                          <Label
                            htmlFor="edit-private"
                            className="text-[11px] sm:text-xs font-normal cursor-pointer text-muted-foreground flex items-center gap-1"
                          >
                            <Lock className="h-3 w-3" />
                            Gizli Proje
                          </Label>
                        </div>
                      </div>
                      <div className="text-[11px] sm:text-xs text-muted-foreground">
                        Gizli projeler sadece oluşturan ve yöneticiler tarafından görülebilir.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Projeyi Sil</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedProject && (
                  <>
                    <strong>{selectedProject.name}</strong> projesini silmek istediğinizden emin misiniz?
                    Bu işlem geri alınamaz.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Projects;

