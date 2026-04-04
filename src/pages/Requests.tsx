import { useEffect, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { getRequests, updateRequestStatus, deleteRequest, Request } from "@/services/firebase/requestService";
import { RequestModal } from "@/components/Requests/RequestModal";
import { Plus, CheckCircle2, XCircle, Clock, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { getAllUsers } from "@/services/firebase/authService";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Requests = () => {
  const { user, isAdmin, isTeamLeader, isSuperAdmin } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("my_requests");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);

  const canManage = isAdmin || isTeamLeader;

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Filtreleme parametrelerini ayarla
      const filters = {
        isSuperAdmin: isSuperAdmin || false,
        createdBy: user.id, // Kullanıcı kendi taleplerini görmeli
        assignedTo: user.id, // Yönetici/Lider kendisine atananları görmeli
      };

      const allRequests = await getRequests(filters);
      
      setRequests(allRequests);

      // Kullanıcı isimlerini al
      const users = await getAllUsers();
      const uMap: Record<string, string> = {};
      users.forEach(u => uMap[u.id] = u.fullName || u.email);
      setUsersMap(uMap);

    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Fetch requests error:", error);
      }
      toast.error("Talepler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Sekmelere göre filtreleme
  const myRequests = requests.filter(r => r.createdBy === user?.id);
  const incomingRequests = canManage ? requests.filter(r => (r.assignedTo === user?.id || isSuperAdmin) && r.status === "pending") : [];
  const historyRequests = canManage ? requests.filter(r => (r.assignedTo === user?.id || isSuperAdmin) && r.status !== "pending") : [];

  const handleStatusUpdate = async (requestId: string, status: "approved" | "rejected") => {
    if (!user) return;
    setProcessingId(requestId);
    try {
      let reason = "";
      if (status === "rejected") {
        reason = prompt("Reddetme sebebi (isteğe bağlı):") || "";
      }

      await updateRequestStatus(requestId, status, user.id, reason);
      toast.success(status === "approved" ? "Talep onaylandı" : "Talep reddedildi");
      fetchData();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Update status error:", error);
      }
      toast.error("İşlem başarısız");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
      if (!requestToDelete) return;
      try {
          await deleteRequest(requestToDelete);
          toast.success("Talep silindi");
          setDeleteConfirmOpen(false);
          setRequestToDelete(null);
          fetchData();
      } catch (error) {
          toast.error("Silme işlemi başarısız");
      }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Onaylandı</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Reddedildi</Badge>;
      default:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"><Clock className="w-3 h-3 mr-1" /> Bekliyor</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
        leave: "İzin",
        purchase: "Satın Alma",
        advance: "Avans",
        expense: "Masraf",
        other: "Diğer"
    };
    return types[type] || type;
  };

  const renderTable = (data: Request[], showActions: boolean = false) => (
    <div className="rounded-md border overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle px-4 sm:px-0">
        <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow>
            <TableHead>Tür</TableHead>
            <TableHead>Başlık</TableHead>
            <TableHead>Talep Eden</TableHead>
            <TableHead>Tarih</TableHead>
            <TableHead>Tutar/Detay</TableHead>
            <TableHead>Durum</TableHead>
            {showActions && <TableHead className="text-right">İşlemler</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="text-center py-8 text-muted-foreground">
                Kayıt bulunamadı
              </TableCell>
            </TableRow>
          ) : (
            data.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium">{getTypeLabel(req.type)}</TableCell>
                <TableCell>
                    <div className="flex flex-col gap-1 max-w-[300px]">
                        <span className="font-medium">{req.title}</span>
                        {req.description && (
                            <span className="text-xs text-muted-foreground whitespace-normal break-words">{req.description}</span>
                        )}
                    </div>
                </TableCell>
                <TableCell>{usersMap[req.createdBy] || "Bilinmiyor"}</TableCell>
                <TableCell>
                  {req.createdAt instanceof Object 
                    ? format(req.createdAt.toDate(), "d MMM yyyy", { locale: tr })
                    : "-"}
                </TableCell>
                <TableCell>
                    {req.amount ? `${req.amount} ${req.currency}` : "-"}
                    {req.startDate && (
                        <div className="text-xs text-muted-foreground">
                            {format(req.startDate.toDate(), "d MMM", { locale: tr })} 
                            {req.endDate ? ` - ${format(req.endDate.toDate(), "d MMM", { locale: tr })}` : ""}
                        </div>
                    )}
                </TableCell>
                <TableCell>
                    <div className="flex flex-col gap-1.5">
                        {getStatusBadge(req.status)}
                        {req.rejectionReason && (
                            <span className="text-xs text-red-600 font-medium max-w-[150px]">{req.rejectionReason}</span>
                        )}
                        {req.approvedBy && (
                            <div className="flex flex-col gap-0.5 mt-1">
                                <span className={cn(
                                    "text-xs font-medium",
                                    req.status === "rejected" ? "text-red-700" : "text-emerald-700"
                                )}>
                                    {req.status === "rejected" ? "Cevaplayan" : "Onaylayan"}: {usersMap[req.approvedBy] || "Bilinmiyor"}
                                </span>
                                {req.approvedAt && (
                                    <span className="text-[10px] text-muted-foreground">
                                        {req.approvedAt instanceof Object 
                                            ? format(req.approvedAt.toDate(), "d MMM yyyy HH:mm", { locale: tr })
                                            : "-"}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {req.status === "pending" && (
                        <>
                            <Button 
                                size="sm" 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 p-0"
                                onClick={() => handleStatusUpdate(req.id, "approved")}
                                disabled={!!processingId}
                            >
                                {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </Button>
                            <Button 
                                size="sm" 
                                variant="destructive"
                                className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 p-0"
                                onClick={() => handleStatusUpdate(req.id, "rejected")}
                                disabled={!!processingId}
                            >
                                {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                )}
                {/* Actions for my requests tab (delete) */}
                {!showActions && req.createdBy === user?.id && req.status === "pending" && (
                    <TableCell className="text-right">
                         <Button
                         size="sm"
                         variant="ghost"
                         className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                         onClick={() => {
                             setRequestToDelete(req.id);
                             setDeleteConfirmOpen(true);
                         }}
                       >
                           <Trash2 className="w-4 h-4" />
                       </Button>
                    </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-3 sm:space-y-4 md:space-y-6 w-[90%] max-w-[90%] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] sm:text-[24px] font-semibold text-foreground">Talep Yönetimi</h1>
            <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
              İzin, satın alma ve diğer taleplerinizi yönetin.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="w-full sm:w-auto min-h-[44px] sm:min-h-10 gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Yeni Talep</span>
            <span className="sm:hidden">Yeni</span>
          </Button>
        </div>

        <Tabs defaultValue="my_requests" onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="my_requests" className="min-h-[44px] sm:min-h-0">Taleplerim</TabsTrigger>
              {canManage && <TabsTrigger value="incoming" className="min-h-[44px] sm:min-h-0">Gelen Talepler ({incomingRequests.length})</TabsTrigger>}
              {canManage && <TabsTrigger value="history" className="min-h-[44px] sm:min-h-0">Talep Geçmişi</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="my_requests" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Taleplerim</CardTitle>
              </CardHeader>
              <CardContent>
                {renderTable(myRequests)}
              </CardContent>
            </Card>
          </TabsContent>

          {canManage && (
            <>
              <TabsContent value="incoming" className="mt-3 sm:mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Onay Bekleyen Talepler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderTable(incomingRequests, true)}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-3 sm:mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Tüm Talep Geçmişi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderTable(historyRequests, false)}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>

        <RequestModal 
            open={modalOpen} 
            onOpenChange={setModalOpen} 
            onSuccess={fetchData}
        />

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Bu talebi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Sil
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </div>
    </MainLayout>
  );
};

export default Requests;