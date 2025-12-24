import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPendingTeamRequests,
  getAllPendingTeamRequests,
  approveTeamRequest,
  rejectTeamRequest,
  TeamApprovalRequest,
} from "@/services/firebase/teamApprovalService";
import { collection, onSnapshot, Unsubscribe } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { UserProfile } from "@/services/firebase/authService";
import { getDepartments } from "@/services/firebase/departmentService";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const TeamApprovalManagement = () => {
  const { user, isAdmin } = useAuth();
  const [canApprove, setCanApprove] = useState(false);
  
  // Ekip talebi onaylama yetkisi - Firestore'dan kontrol et
  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setCanApprove(false);
        return;
      }
      try {
        const { canApproveTeamRequest } = await import("@/utils/permissions");
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
        const result = await canApproveTeamRequest(userProfile, departments);
        setCanApprove(result);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error("Error checking approve team request permission:", error);
        }
        setCanApprove(false);
      }
    };
    checkPermission();
  }, [user]);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<TeamApprovalRequest[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TeamApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchRequests();
    
    // Dinamik güncelleme için users collection'ını dinle
    if (!user?.id) return;
    
    let unsubscribe: Unsubscribe | null = null;
    let isMounted = true;
    
    // Users collection değiştiğinde talepleri yeniden yükle
    unsubscribe = onSnapshot(
      collection(firestore, "users"),
      () => {
        if (isMounted) {
          fetchRequests();
        }
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.error("Users snapshot error:", error);
        }
      }
    );
    
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user, isAdmin]);

  const fetchRequests = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      let data: TeamApprovalRequest[];
      if (isAdmin) {
        // Ana yöneticiler tüm talepleri görebilir
        data = await getAllPendingTeamRequests();
      } else {
        // Ekip liderleri sadece kendi ekiplerinin taleplerini görebilir
        data = await getPendingTeamRequests(user.id);
      }
      setRequests(data);
    } catch (error: unknown) {
      toast.error("Talepler yüklenirken hata: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: TeamApprovalRequest) => {
    if (!canApprove) {
      toast.error("Ekip talebi onaylama yetkiniz yok.");
      return;
    }
    try {
      await approveTeamRequest(request.userId, request.teamId, user?.id || "");
      toast.success(`${request.userName} kullanıcısı ${request.teamName} ekibine onaylandı`);
      fetchRequests();
    } catch (error: unknown) {
      toast.error("Onaylama hatası: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!canApprove) {
      toast.error("Ekip talebi reddetme yetkiniz yok.");
      return;
    }
    
    try {
      await rejectTeamRequest(selectedRequest.userId, selectedRequest.teamId, rejectReason, user?.id);
      toast.success(`${selectedRequest.userName} kullanıcısının ${selectedRequest.teamName} ekibi talebi reddedildi`);
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason("");
      fetchRequests();
    } catch (error: unknown) {
      toast.error("Reddetme hatası: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const openRejectDialog = (request: TeamApprovalRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          {requests.length > 0 && (
            <div className="mb-4 flex justify-end">
              <Badge variant="secondary">{requests.length} bekleyen talep</Badge>
            </div>
          )}
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Onay bekleyen ekip talebi yok
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={`${request.userId}-${request.teamId}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{request.userName}</p>
                      <Badge variant="outline">{request.teamName}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.userEmail}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Talep tarihi: {request.requestedAt?.toDate().toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(request)}
                      className="gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openRejectDialog(request)}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Reddet
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ekip Talebini Reddet</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRequest && (
                <>
                  <strong>{selectedRequest.userName}</strong> kullanıcısının{" "}
                  <strong>{selectedRequest.teamName}</strong> ekibi talebini reddetmek istediğinizden emin misiniz?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="reject-reason">Red Nedeni (Opsiyonel)</Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Red nedeni..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground">
              Reddet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

