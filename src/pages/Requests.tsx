import { useEffect, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { getRequests, updateRequestStatus, deleteRequest, Request } from "@/services/firebase/requestService";
import { RequestModal } from "@/components/Requests/RequestModal";
import { Plus, CheckCircle2, XCircle, Clock, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { getAllUsers } from "@/services/firebase/authService";
import { cn } from "@/lib/utils";
import { ResponsiveTable, ResponsiveTableColumn } from "@/components/shared/ResponsiveTable";
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

  const renderTable = (data: Request[], showActions: boolean = false) => {
    const columns: ResponsiveTableColumn<Request>[] = [
      {
        key: "type",
        header: "Tür",
        accessor: (req) => <span className="font-medium">{getTypeLabel(req.type)}</span>,
        priority: "high",
        minWidth: 140,
        headerClassName: "text-left",
        cellClassName: "text-left",
      },
      {
        key: "title",
        header: "Başlık",
        accessor: (req) => (
          <div className="flex flex-col gap-1 max-w-[300px]">
            <span className="font-medium">{req.title}</span>
            {req.description && (
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-normal break-words">
                {req.description}
              </span>
            )}
          </div>
        ),
        priority: "high",
        minWidth: 180,
        headerClassName: "text-left",
        cellClassName: "text-left",
      },
      {
        key: "createdBy",
        header: "Talep Eden",
        accessor: (req) => <span>{usersMap[req.createdBy] || "Bilinmiyor"}</span>,
        priority: "medium",
        minWidth: 140,
        headerClassName: "text-left",
        cellClassName: "text-left",
      },
      {
        key: "date",
        header: "Tarih",
        accessor: (req) => (
          <span>
            {req.createdAt instanceof Object 
              ? format(req.createdAt.toDate(), "d MMM yyyy", { locale: tr })
              : "-"}
          </span>
        ),
        priority: "medium",
        minWidth: 140,
        headerClassName: "text-left",
        cellClassName: "text-left",
      },
      {
        key: "amount",
        header: "Tutar/Detay",
        accessor: (req) => (
          <div>
            {req.amount ? `${req.amount} ${req.currency}` : "-"}
            {req.startDate && (
              <div className="text-xs sm:text-sm text-muted-foreground">
                {format(req.startDate.toDate(), "d MMM", { locale: tr })} 
                {req.endDate ? ` - ${format(req.endDate.toDate(), "d MMM", { locale: tr })}` : ""}
              </div>
            )}
          </div>
        ),
        priority: "low",
        minWidth: 140,
        headerClassName: "text-left",
        cellClassName: "text-left",
      },
      {
        key: "status",
        header: "Durum",
        accessor: (req) => (
          <div className="flex flex-col gap-1.5">
            {getStatusBadge(req.status)}
            {req.rejectionReason && (
              <span className="text-xs sm:text-sm text-red-600 font-medium max-w-[150px]">
                {req.rejectionReason}
              </span>
            )}
            {req.approvedBy && (
              <div className="flex flex-col gap-0.5 mt-1">
                <span className={cn(
                  "text-xs sm:text-sm font-medium",
                  req.status === "rejected" ? "text-red-700" : "text-emerald-700"
                )}>
                  {req.status === "rejected" ? "Cevaplayan" : "Onaylayan"}: {usersMap[req.approvedBy] || "Bilinmiyor"}
                </span>
                {req.approvedAt && (
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {req.approvedAt instanceof Object 
                      ? format(req.approvedAt.toDate(), "d MMM yyyy HH:mm", { locale: tr })
                      : "-"}
                  </span>
                )}
              </div>
            )}
          </div>
        ),
        priority: "high",
        minWidth: 180,
        headerClassName: "text-left",
        cellClassName: "text-left",
      },
    ];

    if (showActions) {
      columns.push({
        key: "actions",
        header: "İşlemler",
        accessor: (req) => (
          <div className="flex justify-start gap-2">
            {req.status === "pending" && (
              <>
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusUpdate(req.id, "approved");
                  }}
                  disabled={!!processingId}
                >
                  {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusUpdate(req.id, "rejected");
                  }}
                  disabled={!!processingId}
                >
                  {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                </Button>
              </>
            )}
          </div>
        ),
        headerClassName: "text-left",
        cellClassName: "text-left",
        priority: "high",
        minWidth: 140,
      });
    }

    return (
      <ResponsiveTable
        data={data}
        columns={columns}
        emptyMessage="Kayıt bulunamadı"
        renderCard={(req) => (
          <Card className="cursor-pointer hover:shadow-lg transition-all">
            <CardContent className="p-3 sm:p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {getTypeLabel(req.type)}
                    </Badge>
                    {getStatusBadge(req.status)}
                  </div>
                  <h3 className="font-semibold text-[11px] sm:text-xs mb-1">{req.title}</h3>
                  {req.description && (
                    <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2">
                      {req.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 pt-2 border-t">
                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="text-muted-foreground">Talep Eden:</span>
                  <span className="font-medium">{usersMap[req.createdBy] || "Bilinmiyor"}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="text-muted-foreground">Tarih:</span>
                  <span>
                    {req.createdAt instanceof Object 
                      ? format(req.createdAt.toDate(), "d MMM yyyy", { locale: tr })
                      : "-"}
                  </span>
                </div>
                {req.amount && (
                  <div className="flex items-center justify-between text-[11px] sm:text-xs">
                    <span className="text-muted-foreground">Tutar:</span>
                    <span className="font-semibold">{req.amount} {req.currency}</span>
                  </div>
                )}
                {req.startDate && (
                  <div className="flex items-center justify-between text-[11px] sm:text-xs">
                    <span className="text-muted-foreground">Tarih Aralığı:</span>
                    <span>
                      {format(req.startDate.toDate(), "d MMM", { locale: tr })} 
                      {req.endDate ? ` - ${format(req.endDate.toDate(), "d MMM", { locale: tr })}` : ""}
                    </span>
                  </div>
                )}
                {showActions && req.status === "pending" && (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button 
                      size="sm" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] flex-1 sm:flex-initial sm:min-h-0 sm:h-8 sm:w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(req.id, "approved");
                      }}
                      disabled={!!processingId}
                    >
                      {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="min-h-[44px] flex-1 sm:flex-initial sm:min-h-0 sm:h-8 sm:w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(req.id, "rejected");
                      }}
                      disabled={!!processingId}
                    >
                      {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
                {!showActions && req.createdBy === user?.id && req.status === "pending" && (
                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRequestToDelete(req.id);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      />
    );
  };

  return (
    <MainLayout>
      <div className="space-y-2 w-full sm:w-[95%] md:w-[90%] lg:max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] sm:text-[18px] font-semibold text-foreground">Talep Yönetimi</h1>
            <p className="text-muted-foreground mt-0.5 text-[11px] sm:text-xs">
              İzin, satın alma ve diğer taleplerinizi yönetin.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="w-full sm:w-auto min-h-[36px] sm:min-h-8 gap-1 text-[11px] sm:text-xs">
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