/**
 * CreateTaskDialog - Wrapper component
 * Artık tüm görev oluşturma işlemleri TaskInlineForm üzerinden yapılıyor
 */

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TaskInlineForm } from "./TaskInlineForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface CreateTaskDialogProps {
  onTaskCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export const CreateTaskDialog = ({ onTaskCreated, open, onOpenChange, hideTrigger = false }: CreateTaskDialogProps) => {
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Personnel ve İzleyici kontrolü - görev oluşturma yetkisi yok
  const isPersonnelOrViewer = useMemo(() => {
    if (!user?.roles) return false;
    const hasPersonnelRole = user.roles.includes("personnel");
    const hasViewerRole = user.roles.includes("viewer");
    const hasAdminRole = user.roles.includes("super_admin") || user.roles.includes("main_admin") || user.roles.includes("team_leader");
    return (hasPersonnelRole || hasViewerRole) && !hasAdminRole;
  }, [user?.roles]);
  
  // Personnel ve İzleyici için buton gösterilmez
  if (isPersonnelOrViewer) {
    return null;
  }

  // Open state'i kontrol et
  useEffect(() => {
    if (open !== undefined) {
      setTaskModalOpen(open);
    }
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    setTaskModalOpen(next);
    onOpenChange?.(next);
  };

  const handleTaskCreated = () => {
    onTaskCreated?.();
    handleOpenChange(false);
  };

  // Eğer Tasks sayfasındaysak, oradaki modal'ı kullan
  // Değilse, burada modal aç
  if (window.location.pathname === "/tasks") {
    // Tasks sayfasındayız, oradaki modal'ı tetiklemek için navigate kullan
    return (
      <>
        {!hideTrigger && (
          <Button 
            className="gap-2" 
            onClick={() => {
              navigate("/tasks?new=true");
              // Tasks sayfasındaki modal'ı açmak için state güncellemesi yapılabilir
            }}
          >
            <Plus className="h-4 w-4" />
            Yeni Görev
          </Button>
        )}
      </>
    );
  }

  // Diğer sayfalarda TaskInlineForm'u Dialog içinde kullan
  return (
    <>
      {!hideTrigger && (
        <Button 
          className="gap-2" 
          onClick={() => handleOpenChange(true)}
        >
          <Plus className="h-4 w-4" />
          Yeni Görev
        </Button>
      )}
      <Dialog open={taskModalOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Görev Oluştur</DialogTitle>
            <DialogDescription>
              Yeni bir görev oluşturun
            </DialogDescription>
          </DialogHeader>
          <TaskInlineForm
            mode="create"
            onCancel={() => handleOpenChange(false)}
            onSuccess={handleTaskCreated}
            defaultStatus="pending"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
