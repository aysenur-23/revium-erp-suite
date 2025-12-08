import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createDefaultDepartments,
  DepartmentWithStats,
} from "@/services/firebase/departmentService";
import { Plus, Pencil, Trash2, Building2, Users, Loader2, UserPlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getAllUsers, UserProfile, updateFirebaseUserProfile } from "@/services/firebase/authService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

export const DepartmentManagement = () => {
  const { isAdmin, user } = useAuth();
  const [departments, setDepartments] = useState<DepartmentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentWithStats | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assignLeaderOpen, setAssignLeaderOpen] = useState(false);
  const [selectedDeptForLeader, setSelectedDeptForLeader] = useState<DepartmentWithStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [assigningLeader, setAssigningLeader] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      // Geçerli kullanıcıları filtrele (id, fullName veya displayName olmalı)
      const validUsers = allUsers.filter(u => 
        u && u.id && (u.fullName || u.displayName || u.email)
      );
      setUsers(validUsers);
      if (validUsers.length === 0 && allUsers.length > 0) {
        console.warn("Geçerli kullanıcı bulunamadı, tüm kullanıcılar:", allUsers);
      }
    } catch (error: any) {
      console.error("Kullanıcılar yüklenirken hata:", error);
      toast.error("Kullanıcılar yüklenirken hata: " + (error.message || "Bilinmeyen hata"));
      setUsers([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (error: any) {
      toast.error("Departmanlar yüklenirken hata: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      if (editingDept) {
        // Güncelle
        await updateDepartment(editingDept.id, {
          name: formData.name,
          description: formData.description || null,
        }, user?.id || null);
        toast.success("Departman güncellendi");
      } else {
        // Yeni oluştur
        await createDepartment(
          formData.name,
          formData.description || null,
          null,
          user?.id || null
        );
        toast.success("Departman oluşturuldu");
      }

      setOpen(false);
      setEditingDept(null);
      setFormData({ name: "", description: "" });
      fetchDepartments();
    } catch (error: any) {
      toast.error("İşlem sırasında hata: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDepartment(id, user?.id || null);
      toast.success("Departman başarıyla silindi");
      fetchDepartments();
    } catch (error: any) {
      toast.error("Silme hatası: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const openEditDialog = (dept: DepartmentWithStats) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description || "",
    });
    setOpen(true);
  };

  const resetForm = () => {
    setEditingDept(null);
    setFormData({ name: "", description: "" });
  };

  const handleCreateDefaults = async () => {
    try {
      await createDefaultDepartments();
      toast.success("Varsayılan ekipler oluşturuldu");
      fetchDepartments();
    } catch (error: any) {
      toast.error("Varsayılan ekipler oluşturulurken hata: " + error.message);
    }
  };

  const openAssignLeaderDialog = (dept: DepartmentWithStats) => {
    setSelectedDeptForLeader(dept);
    setSelectedUserId(dept.managerId || "");
    setAssignLeaderOpen(true);
  };

  const handleAssignLeader = async () => {
    if (!isAdmin) {
      toast.error("Bu işlem için yönetici yetkisi gereklidir");
      return;
    }

    if (!selectedDeptForLeader || !selectedUserId) {
      toast.error("Lütfen bir kullanıcı seçin");
      return;
    }

    setAssigningLeader(true);
    try {
      const newManagerId = selectedUserId === "none" ? null : selectedUserId;
      
      // Eski manager'ın rolünü güncelle (eğer başka departmanda manager değilse)
      if (selectedDeptForLeader.managerId && selectedDeptForLeader.managerId !== newManagerId) {
        const oldManager = users.find(u => u.id === selectedDeptForLeader.managerId);
        if (oldManager) {
          // Eski manager'ın başka departmanda manager olup olmadığını kontrol et
          const otherDeptAsManager = departments.find(
            d => d.id !== selectedDeptForLeader.id && d.managerId === oldManager.id
          );
          
          // Eğer başka departmanda manager değilse, team_leader rolünü kaldır
          if (!otherDeptAsManager) {
            const currentRoles = oldManager.role || [];
            const updatedRoles = currentRoles.filter((r: string) => r !== "team_leader");
            if (updatedRoles.length === 0) {
              updatedRoles.push("viewer"); // En azından viewer rolü olsun
            }
            await updateFirebaseUserProfile(oldManager.id, {
              role: updatedRoles,
            });
          }
        }
      }
      
      // Yeni manager'ı departmana ata
      await updateDepartment(selectedDeptForLeader.id, {
        managerId: newManagerId,
      }, user?.id || null);
      
      // Yeni manager'ın rolünü team_leader olarak güncelle
      if (newManagerId) {
        const newManager = users.find(u => u.id === newManagerId);
        if (newManager) {
          const currentRoles = newManager.role || [];
          if (!currentRoles.includes("team_leader")) {
            await updateFirebaseUserProfile(newManagerId, {
              role: [...currentRoles, "team_leader"],
            });
          }
        }
      }
      
      toast.success("Ekip lideri başarıyla atandı");
      setAssignLeaderOpen(false);
      setSelectedDeptForLeader(null);
      setSelectedUserId("");
      fetchDepartments();
      fetchUsers(); // Kullanıcı rolleri güncellendi, yeniden yükle
    } catch (error: any) {
      toast.error("Ekip lideri atanırken hata: " + error.message);
    } finally {
      setAssigningLeader(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span>Departmanlar ({departments.length})</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isAdmin && (
                <Button variant="outline" onClick={handleCreateDefaults}>
                  Varsayılan Ekipleri Oluştur
                </Button>
              )}
              {isAdmin && (
                <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni Departman
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingDept ? "Departman Düzenle" : "Yeni Departman"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingDept ? "Mevcut departman bilgilerini güncelleyin." : "Yeni bir departman oluşturun."}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Departman Adı *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Örn: Üretim"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Açıklama</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Departman açıklaması"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                      >
                        İptal
                      </Button>
                      <Button type="submit">
                        {editingDept ? "Güncelle" : "Oluştur"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table className="min-w-[600px] sm:min-w-0">
              <TableHeader>
              <TableRow>
                    <TableHead className="min-w-[150px]">Departman</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[200px]">Açıklama</TableHead>
                    <TableHead className="min-w-[120px]">Kullanıcı Sayısı</TableHead>
                    <TableHead className="min-w-[150px]">Ekip Lideri</TableHead>
                    <TableHead className="text-right min-w-[120px]">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-sm sm:text-base block truncate">{dept.name}</span>
                            {dept.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 md:hidden mt-0.5">
                                {dept.description}
                              </p>
                            )}
                          </div>
                    </div>
                  </TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {dept.description || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm sm:text-base">{dept.userCount || 0}</span>
                    </div>
                  </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{dept.managerName || <span className="text-muted-foreground">Atanmamış</span>}</span>
                  </TableCell>
                  <TableCell className="text-right">
                        <div className="flex justify-end gap-1 sm:gap-2">
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignLeaderDialog(dept)}
                          title="Ekip Lideri Ata (Sadece Yöneticiler)"
                              className="h-8 w-8 sm:h-9 sm:w-auto sm:min-w-[100px] p-0 sm:px-3"
                        >
                              <UserPlus className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Lider Ata</span>
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(dept)}
                          title="Düzenle"
                              className="h-8 w-8 sm:h-9 sm:w-auto sm:min-w-[80px] p-0 sm:px-3"
                        >
                              <Pencil className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Düzenle</span>
                        </Button>
                      )}
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deletingId === dept.id}
                                  className="h-8 w-8 sm:h-9 sm:w-auto sm:min-w-[80px] p-0 sm:px-3"
                            >
                              {deletingId === dept.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                    <>
                                      <Trash2 className="h-4 w-4 sm:mr-2" />
                                      <span className="hidden sm:inline">Sil</span>
                                    </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Departmanı Sil</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{dept.name}" departmanını silmek üzeresiniz. Bu işlem geri alınamaz.
                              {dept.userCount && dept.userCount > 0 && (
                                <span className="block mt-2 text-destructive font-medium">
                                  Uyarı: Bu departmanda {dept.userCount} kullanıcı kayıtlı!
                                </span>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(dept.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Sil
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {departments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Henüz departman eklenmemiş
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ekip Lideri Atama Dialog */}
      <Dialog open={assignLeaderOpen} onOpenChange={setAssignLeaderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ekip Lideri Ata</DialogTitle>
            <DialogDescription>
              Departman için ekip lideri seçin. Bu işlem sadece yöneticiler tarafından yapılabilir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Departman</Label>
              <p className="text-sm font-medium mt-1">
                {selectedDeptForLeader?.name}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leader-select">Ekip Lideri Seç</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger id="leader-select">
                  <SelectValue placeholder="Kullanıcı seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ekip Lideri Yok</SelectItem>
                  {users.length === 0 ? (
                    <SelectItem value="loading" disabled>Yükleniyor...</SelectItem>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName || user.displayName || user.email || "İsimsiz Kullanıcı"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAssignLeaderOpen(false);
                  setSelectedDeptForLeader(null);
                  setSelectedUserId("");
                }}
              >
                İptal
              </Button>
              <Button
                onClick={handleAssignLeader}
                disabled={assigningLeader || !selectedUserId}
              >
                {assigningLeader ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Atanıyor...
                  </>
                ) : (
                  "Ata"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
