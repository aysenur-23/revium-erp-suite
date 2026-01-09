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
  const propsObj = props as Record<string, unknown>;
  const hasTaskModal = ('data-task-modal' in propsObj && propsObj['data-task-modal'] !== undefined) || 
                       ('dataTaskModal' in propsObj && propsObj['dataTaskModal'] !== undefined) ||
                       (typeof className === 'string' && className.includes('task-modal-full-width'));
  
  const sidebarContext = useSidebarContext();
  
  // Dialog açıldığında mobilde menüyü kapat
  // NOT: useEffect kaldırıldı - DialogContent mount olduğunda sidebar'ı kapatmak
  // GlobalSearch gibi her zaman render edilen Dialog'lar sidebar'ı hemen kapatıyordu
  // Artık sadece overlay tıklamasında sidebar kapanacak
  
  // Accessibility: DialogTitle ve DialogDescription kontrolü
  // Eğer children içinde DialogTitle veya DialogDescription yoksa, otomatik olarak sr-only versiyonlarını ekle
  let hasTitle = false;
  let hasDescription = false;
  
  // Recursive function to check for DialogTitle and DialogDescription
  const checkForTitleAndDescription = (node: React.ReactNode, depth: number = 0): void => {
    // Max depth kontrolü (sonsuz döngüyü önlemek için)
    if (depth > 10) return;
    if (!node) return;
    
    // Fragment kontrolü
    if (React.isValidElement(node) && node.type === React.Fragment) {
      if (node.props?.children) {
        React.Children.forEach(node.props.children, (child) => checkForTitleAndDescription(child, depth + 1));
      }
      return;
    }
    
    if (React.isValidElement(node)) {
      // Check if it's a DialogTitle or DialogDescription
      const nodeType = node.type as any;
      const displayName = nodeType?.displayName || nodeType?.name || nodeType?.$$typeof?.toString();
      
      // DialogTitle kontrolü - daha kapsamlı
      // Radix UI'nin Title component'ini kontrol et
      const isTitle = displayName === DialogPrimitive.Title.displayName || 
          displayName === 'DialogTitle' ||
          nodeType === DialogPrimitive.Title ||
          (typeof nodeType === 'function' && (nodeType.displayName === 'DialogTitle' || nodeType.name === 'DialogTitle')) ||
          (node.props && (node.props as any).__isDialogTitle) ||
          // String kontrolü - bazı durumlarda string olarak gelebilir
          (typeof node === 'string' && node.includes('DialogTitle'));
      
      if (isTitle) {
        hasTitle = true;
        // Early return yapma - children'ı da kontrol et
      }
      
      // DialogDescription kontrolü - daha kapsamlı
      // Radix UI'nin Description component'ini kontrol et
      const isDescription = displayName === DialogPrimitive.Description.displayName || 
          displayName === 'DialogDescription' ||
          nodeType === DialogPrimitive.Description ||
          (typeof nodeType === 'function' && (nodeType.displayName === 'DialogDescription' || nodeType.name === 'DialogDescription')) ||
          (node.props && (node.props as any).__isDialogDescription) ||
          // String kontrolü - bazı durumlarda string olarak gelebilir
          (typeof node === 'string' && node.includes('DialogDescription'));
      
      if (isDescription) {
        hasDescription = true;
        // Early return yapma - children'ı da kontrol et
      }
      
      // Eğer hem title hem description bulunduysa, erken çık
      if (hasTitle && hasDescription) {
        return;
      }
      
      // Recursively check children - tüm olası children formatlarını kontrol et
      if (node.props?.children) {
        const childrenArray = React.Children.toArray(node.props.children);
        childrenArray.forEach((child) => checkForTitleAndDescription(child, depth + 1));
      }
    } else if (Array.isArray(node)) {
      node.forEach((item) => checkForTitleAndDescription(item, depth + 1));
    }
  };
  
  // Check all children recursively - React.Children.toArray kullanarak daha güvenli kontrol
  const childrenArray = React.Children.toArray(children);
  childrenArray.forEach((child) => checkForTitleAndDescription(child, 0));
  
  // Eksik DialogTitle veya DialogDescription varsa, otomatik olarak sr-only versiyonlarını ekle
  // Her zaman ekle (Radix UI uyarılarını önlemek için) - duplicate kontrolü zaten yapıldı
  // Not: Radix UI'nin kontrolü render sırasında yapılıyor, bu yüzden her zaman eklemek daha güvenli
  const enhancedChildren = (
    <>
      {/* Her zaman ekle - eğer zaten varsa Radix UI duplicate'i handle edecek */}
      <DialogPrimitive.Title className="sr-only" key="auto-title" aria-hidden={hasTitle ? true : undefined}>
        {hasTitle ? '' : 'Dialog'}
      </DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only" key="auto-description" aria-hidden={hasDescription ? true : undefined}>
        {hasDescription ? '' : 'Dialog içeriği'}
      </DialogPrimitive.Description>
      {children}
    </>
  );
  
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
          // Her zaman fixed olmalı (modal çalışması için gerekli)
          "fixed z-[10001]",
          // Mobil için left-0 right-0 bottom-0 gerekli (modal render edilmesi için)
          // Tablet/desktop için CSS'teki !important kuralları bu class'ları override edecek
          "left-0 right-0 bottom-0",
          "grid w-full gap-3 sm:gap-4 border-t bg-background p-3 sm:p-4 md:p-6 pb-safe shadow-lg duration-200",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          "!max-h-[95vh] sm:!max-h-[80vh] !overflow-hidden",
          "scroll-smooth -webkit-overflow-scrolling-touch overscroll-behavior-contain",
          // Professional mobile optimizations
          "touch-manipulation",
          // Desktop: Centered modal (sadece data-task-modal yoksa)
          // CSS'teki !important kuralları bu class'ları override edecek
          // NOT: sm:left, sm:translate-x gibi positioning class'ları kaldırıldı - CSS'teki !important kuralları çalışsın
          !hasTaskModal && "sm:rounded-lg sm:border sm:border-t",
          !hasTaskModal && "sm:data-[state=closed]:slide-out-to-left sm:data-[state=closed]:slide-out-to-top sm:data-[state=open]:slide-in-from-left sm:data-[state=open]:slide-in-from-top",
          !hasTaskModal && "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {enhancedChildren}
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
