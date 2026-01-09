import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./input";
<<<<<<< HEAD
=======
import { Button } from "./button";
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
<<<<<<< HEAD
      <div className="relative" style={{ isolation: 'isolate' }}>
=======
      <div className="relative">
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
        <Input
          type={showPassword ? "text" : "password"}
          className={cn("pr-10", className)}
          ref={ref}
          {...props}
<<<<<<< HEAD
          style={{ 
            position: 'relative',
            zIndex: 1,
            ...props.style 
          }}
        />
        <button
          type="button"
          className="absolute right-0 top-0 bottom-0 h-full px-3 hover:bg-transparent z-10 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation active:!transform-none active:!scale-100 focus:!transform-none focus:!scale-100"
          onClick={() => setShowPassword(!showPassword)}
          disabled={props.disabled}
          style={{ 
            zIndex: 10,
            margin: 0,
            paddingTop: 0,
            paddingBottom: 0,
            paddingRight: '0.75rem',
            paddingLeft: '0.75rem',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            transform: 'none !important',
            position: 'absolute',
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
=======
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          disabled={props.disabled}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
          )}
          <span className="sr-only">
            {showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
          </span>
<<<<<<< HEAD
        </button>
=======
        </Button>
>>>>>>> 2bdcc7331f104f0af420939d7419e34ea46ff9d1
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };

