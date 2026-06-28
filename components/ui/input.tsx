import { cn } from "@/lib/utils";
import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
    const fallbackId = useId();
    const inputId = id ?? fallbackId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const describedBy = [ariaDescribedBy, errorId, helperId].filter(Boolean).join(" ") || undefined;
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full rounded-md border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted",
            "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            error ? "border-danger" : "border-border",
            className
          )}
          {...props}
        />
        {helperText && !error && (
          <p id={helperId} className="text-xs text-text-muted">{helperText}</p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-danger">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
