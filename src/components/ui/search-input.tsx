import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.ComponentPropsWithoutRef<typeof Input> {
  containerClassName?: string;
  iconClassName?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      containerClassName,
      iconClassName,
      className,
      icon: Icon = Search,
      ...props
    },
    ref,
  ) => (
    <div className={cn("relative", containerClassName)}>
      <Icon
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-[1]",
          iconClassName,
        )}
      />
      <Input ref={ref} className={cn("!px-0 !pl-11 !pr-3", className)} {...props} />
    </div>
  ),
);

SearchInput.displayName = "SearchInput";

