import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "emergency";
  size?: "sm" | "md" | "lg" | "xl";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-120 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none active:translate-y-[1px]";

    const variantStyles = {
      primary:
        "bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow-md",
      secondary:
        "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-200",
      outline:
        "bg-transparent text-brand-600 border border-brand-300 hover:bg-brand-50 hover:border-brand-500",
      ghost:
        "bg-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
      danger:
        "bg-semantic-danger text-white hover:opacity-90 shadow-sm",
      emergency:
        "bg-semantic-emergency text-white hover:brightness-110 font-bold shadow-md min-h-[56px] text-lg tracking-wide",
    };

    const sizeStyles = {
      sm: "min-h-[36px] px-3 py-1.5 text-xs rounded-sm",
      md: "min-h-[44px] px-4 py-2 text-sm rounded-md",
      lg: "min-h-[48px] px-6 py-2.5 text-base rounded-md",
      xl: "min-h-[56px] px-8 py-3 text-lg rounded-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
