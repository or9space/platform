import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// Primary + danger get the chamfered MFD corner cut. Secondary + ghost stay
// rounded so their less-prominent role doesn't compete with primary actions.
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-fg-cream hover:bg-primary-hover font-medium mfd-cut-tl-br",
  secondary:
    "bg-surface-elevated text-text-primary border border-border hover:border-primary hover:text-primary rounded-md",
  ghost:
    "text-text-secondary hover:bg-surface-hover hover:text-text-primary rounded-md",
  danger:
    "bg-fg-red text-fg-cream hover:bg-fg-red-light mfd-cut-tl-br",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none",
        variantStyles[variant],
        sizeStyles[size],
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
