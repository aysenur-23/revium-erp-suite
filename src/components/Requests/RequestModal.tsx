import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, FileText, X, Save } from "lucide-react";
import { createRequest, Request } from "@/services/firebase/requestService";
import { useAuth } from "@/contexts/AuthContext";
import { Timestamp } from "firebase/firestore";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { CURRENCY_OPTIONS } from "@/utils/currency";

interface RequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const RequestModal = ({ open, onOpenChange, onSuccess }: RequestModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>("purchase");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [requestDate, setRequestDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [managers, setManagers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (open) {
        const fetchManagers = async () => {
            try {
                const users = await getAllUsers();
                // Süper Admin veya Ekip Lideri olanları filtrele
                // role array veya string olabilir, her ikisini de kontrol et
                const eligibleManagers = users.filter(u => {
                    if (!u || !u.role) return false;
                    const roles = (Array.isArray(u.role) ? u.role : [u.role]).map((r) =>
                      r === "admin" ? "super_admin" : r
                    );
                    return roles.some(r => 
                        r === "super_admin" || 
                        r === "team_leader" ||
                        (typeof r === "string" && r.includes("team_leader"))
                    );
                });
                setManagers(eligibleManagers);
            } catch (error: unknown) {
                if (import.meta.env.DEV) {
                  console.error("Yöneticiler yüklenemedi", error);
                }
                toast.error("Yöneticiler yüklenirken hata oluştu: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
                setManagers([]);
            }
        };
        fetchManagers();
    }
  }, [open]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!user) return;
    if (!title.trim() || !description.trim() || !assignedTo) {
        toast.error("Lütfen gerekli alanları doldurun.");
        return;
    }

    setLoading(true);
    try {
      await createRequest({
        type: (type === "overtime" ? "other" : type) as "leave" | "purchase" | "advance" | "expense" | "other",
        title,
        description,
        amount: amount ? parseFloat(amount) : undefined,
        currency: amount ? currency : undefined,
        createdBy: user.id,
        assignedTo,
        startDate: requestDate ? Timestamp.fromDate(new Date(requestDate)) : undefined,
        endDate: endDate ? Timestamp.fromDate(new Date(endDate)) : undefined,
      });

      toast.success("Talep başarıyla oluşturuldu");
      onSuccess?.();
      onOpenChange(false);
      // Reset form
      setTitle("");
      setDescription("");
      setAmount("");
      setRequestDate("");
      setEndDate("");
      setAssignedTo("");
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error("Request creation error:", error);
      }
      toast.error("Talep oluşturulamadı: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[100vw] sm:!max-w-[85vw] !w-[100vw] sm:!w-[85vw] !h-[100vh] sm:!h-[80vh] !max-h-[100vh] sm:!max-h-[80vh] !left-0 sm:!left-[7.5vw] !top-0 sm:!top-[10vh] !right-0 sm:!right-auto !bottom-0 sm:!bottom-auto !translate-x-0 !translate-y-0 overflow-hidden !p-0 gap-0 bg-white flex flex-col !m-0 !rounded-none sm:!rounded-lg !border-0 sm:!border">
        {/* DialogTitle ve DialogDescription DialogContent'in direkt child'ı olmalı (Radix UI gereksinimi) */}
        <DialogTitle className="sr-only">
          Yeni Talep Oluştur
        </DialogTitle>
        <DialogDescription className="sr-only">
          Yeni talep oluşturun
        </DialogDescription>
        
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <DialogHeader className="p-3 sm:p-4 border-b bg-white flex-shrink-0 relative pr-12 sm:pr-16">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 flex-shrink-0">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h2 className="text-[16px] sm:text-[18px] font-semibold text-foreground truncate">
                  Yeni Talep Oluştur
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/20 hover:bg-primary/5 rounded-lg px-3 py-1.5 font-medium text-[11px] sm:text-xs flex-shrink-0 min-h-[36px] sm:min-h-8"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                  İptal
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 font-medium text-[11px] sm:text-xs flex-shrink-0 text-white min-h-[36px] sm:min-h-8"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                  )}
                  Oluştur
                </Button>
              </div>
            </div>
          </DialogHeader>
        
          {/* Content */}
          <div className="flex-1 overflow-hidden bg-gray-50/50 p-3 sm:p-4 min-h-0">
            <div className="max-w-full mx-auto h-full overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[14px] sm:text-[15px]">Talep Bilgileri</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] sm:text-xs">
                        Kime (Yönetici Seçimi) <span className="text-red-500">*</span>
                      </Label>
                      <Select value={assignedTo} onValueChange={setAssignedTo}>
                        <SelectTrigger className="min-h-[44px] sm:min-h-0">
                          <SelectValue placeholder="Yönetici seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {managers.map(manager => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.fullName || manager.displayName || manager.email} ({manager.role.includes('super_admin') || manager.role.includes('main_admin') ? 'Yönetici' : manager.role.includes('team_leader') ? 'Ekip Lideri' : 'Personel'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] sm:text-xs">Talep Türü</Label>
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="min-h-[44px] sm:min-h-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="purchase">Satın Alma Talebi</SelectItem>
                          <SelectItem value="leave">İzin Talebi</SelectItem>
                          <SelectItem value="advance">Avans Talebi</SelectItem>
                          <SelectItem value="expense">Masraf Bildirimi</SelectItem>
                          <SelectItem value="other">Diğer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] sm:text-xs">
                        Başlık <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Talebinizi özetleyin..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="min-h-[44px] sm:min-h-0"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] sm:text-xs">
                        Açıklama <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        placeholder="Detaylı açıklama..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="min-h-[100px] sm:min-h-[120px]"
                        required
                      />
                    </div>

                    {(type === "purchase" || type === "advance" || type === "expense") && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div className="sm:col-span-2 space-y-2">
                          <Label className="text-[11px] sm:text-xs">Tutar</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0"
                            step="0.01"
                            className="min-h-[44px] sm:min-h-0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] sm:text-xs">Para Birimi</Label>
                          <Select value={currency} onValueChange={setCurrency}>
                            <SelectTrigger className="min-h-[44px] sm:min-h-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CURRENCY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {(type === "leave") && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                          <Label className="text-[11px] sm:text-xs">Başlangıç Tarihi</Label>
                          <Input 
                            type="date" 
                            value={requestDate}
                            onChange={(e) => setRequestDate(e.target.value)}
                            className="min-h-[44px] sm:min-h-0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[11px] sm:text-xs">Bitiş Tarihi</Label>
                          <Input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="min-h-[44px] sm:min-h-0"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};