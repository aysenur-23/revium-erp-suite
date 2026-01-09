/**
 * CreateTaskDialog - Wrapper component
<<<<<<< HEAD
 * Artık tüm görev oluşturma işlemleri TaskInlineForm üzerinden yapılıyor
=======
 * Artık tüm görev oluşturma işlemleri TaskDetailModal üzerinden yapılıyor
 * Bu component geriye dönük uyumluluk için TaskDetailModal'ı açıyor
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
 */

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
<<<<<<< HEAD
import { TaskInlineForm } from "./TaskInlineForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
=======
import { TaskDetailModal } from "./TaskDetailModal";
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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

<<<<<<< HEAD
  // Diğer sayfalarda TaskInlineForm'u Dialog içinde kullan
=======
  // Diğer sayfalarda TaskDetailModal'ı direkt kullan
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
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
<<<<<<< HEAD
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
=======
      <TaskDetailModal
        taskId={null}
        open={taskModalOpen}
        onOpenChange={handleOpenChange}
        onUpdate={handleTaskCreated}
        initialStatus="pending"
      />
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
    </>
  );
};
