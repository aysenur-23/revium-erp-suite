import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSidebarContext } from "@/contexts/SidebarContext";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[10000] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  // Eğer data-task-modal attribute'u varsa, varsayılan sm:max-w-lg sınıfını kaldır
  // React'te data attribute'ları props'da doğrudan geçer (data-task-modal olarak)
  // Props'tan kontrol et - React'te data attribute'ları props'da doğrudan geçer
  const propsAny = props as any;
  const hasTaskModal = propsAny['data-task-modal'] !== undefined || 
                       propsAny['dataTaskModal'] !== undefined ||
                       (typeof className === 'string' && className.includes('task-modal-full-width'));
  
  const sidebarContext = useSidebarContext();
  
  // Dialog açıldığında mobilde menüyü kapat
  // DialogContent mount olduğunda menüyü kapat (Dialog açıldığında)
  React.useEffect(() => {
    if (sidebarContext) {
      sidebarContext.closeSidebar();
    }
  }, [sidebarContext]);
  
  return (
    <DialogPortal>
      <DialogOverlay 
        className="z-[10000]"
        onClick={() => {
          // Overlay'e tıklandığında mobilde menüyü kapat
          if (sidebarContext) {
            sidebarContext.closeSidebar();
          }
        }}
      />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Mobile: Full screen bottom sheet style with safe area support
          "fixed left-0 right-0 bottom-0 z-[10001] grid w-full gap-3 sm:gap-4 border-t bg-background p-3 sm:p-4 md:p-6 pb-safe shadow-lg duration-200",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          "!max-h-[95vh] sm:!max-h-[90vh] !overflow-hidden",
          "scroll-smooth -webkit-overflow-scrolling-touch overscroll-behavior-contain",
          // Professional mobile optimizations
          "touch-manipulation",
          // Desktop: Centered modal (sadece data-task-modal yoksa)
          !hasTaskModal && "sm:left-[50%] sm:top-[50%] sm:bottom-auto sm:right-auto sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:border-t",
          !hasTaskModal && "sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]",
          !hasTaskModal && "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:!max-h-[85vh]",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3 sm:right-4 top-3 sm:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center z-[10002] active:scale-95">
          <X className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 sm:space-y-2 text-center sm:text-left px-1", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2 sm:space-x-2 pt-2 sm:pt-0", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg sm:text-xl md:text-2xl font-semibold leading-tight tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm sm:text-base text-muted-foreground leading-relaxed mt-1 sm:mt-1.5", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
