import { cn } from "@/lib/cn";
import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-fg-cream/10 text-text-secondary",
  primary: "bg-primary/20 text-primary",
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  danger: "bg-danger/20 text-fg-red-light",
  info: "bg-info/20 text-info",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variantStyles[variant], className)}
      {...props}
    />
  );
}
