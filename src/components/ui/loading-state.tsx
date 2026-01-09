import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingState = ({ 
  message = "Yükleniyor...", 
  className,
  size = "md"
}: LoadingStateProps) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4",
      className
    )}>
      <Loader2 className={cn(
        "animate-spin text-primary mb-3",
        sizeClasses[size]
      )} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

