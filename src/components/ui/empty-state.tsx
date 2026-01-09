import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: "default" | "card" | "minimal";
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className,
  variant = "default"
}: EmptyStateProps) => {
  if (variant === "card") {
    return (
      <div className={cn(
        "text-center py-12 bg-muted/30 rounded-lg border border-dashed",
        className
      )}>
        <div className="flex flex-col items-center gap-3">
          {Icon && (
            <div className="rounded-full bg-muted p-4">
              <Icon className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          <p className="text-muted-foreground font-medium text-base">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground/70 max-w-md">{description}</p>
          )}
          {action && (
            <Button onClick={action.onClick} variant="outline" size="sm" className="mt-2">
              {action.label}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-8 px-4",
        className
      )}>
        {Icon && (
          <Icon className="h-10 w-10 text-muted-foreground/50 mb-3" />
        )}
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground/70 mt-1 text-center max-w-sm">{description}</p>
        )}
        {action && (
          <Button onClick={action.onClick} variant="outline" size="sm" className="mt-3">
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4", className)}>
      {Icon && (
        <div className="mb-4 rounded-full bg-muted p-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground text-center max-w-md mb-4">{description}</p>}
      {action && (
        <Button onClick={action.onClick} variant="outline" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
};

