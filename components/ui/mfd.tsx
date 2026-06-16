import { cn } from "@/lib/cn";
import { type HTMLAttributes, type ReactNode } from "react";

/** MFD primitives — spaceship multifunction-display register (ported from FG). */

interface MfdPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  chassis?: "primary" | "amber" | "neutral";
  active?: boolean;
  interactive?: boolean;
  title?: ReactNode;
  titleAside?: ReactNode;
  bodyPadding?: "none" | "sm" | "md" | "lg";
  children: ReactNode;
}

const bodyPad: Record<NonNullable<MfdPanelProps["bodyPadding"]>, string> = {
  none: "", sm: "px-3 py-2", md: "px-4 py-3", lg: "px-5 py-4",
};

export function MfdPanel({
  chassis = "neutral", active = false, interactive = false,
  title, titleAside, bodyPadding = "md", className, children, ...rest
}: MfdPanelProps) {
  const chassisCls = chassis === "primary" ? "" : chassis === "amber" ? "mfd-frame-amber" : "mfd-frame-neutral";
  return (
    <div className={cn("mfd-frame", chassisCls, active && "mfd-frame-active", interactive && "mfd-frame-interactive", className)} {...rest}>
      <div className="mfd-frame-body">
        {title && (
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5">
            <div className="mfd-label flex items-center gap-1.5">{title}</div>
            {titleAside && <div className="flex items-center gap-2 text-xs text-text-muted">{titleAside}</div>}
          </div>
        )}
        <div className={bodyPad[bodyPadding]}>{children}</div>
      </div>
    </div>
  );
}

interface MfdReadoutProps {
  label: string;
  value: ReactNode;
  tone?: "amber" | "primary" | "muted";
  size?: "sm" | "md" | "lg";
  aside?: ReactNode;
  className?: string;
}
const valueSize: Record<NonNullable<MfdReadoutProps["size"]>, string> = { sm: "text-sm", md: "text-base", lg: "text-2xl" };

export function MfdReadout({ label, value, tone = "amber", size = "md", aside, className }: MfdReadoutProps) {
  const toneCls = tone === "amber" ? "text-amber" : tone === "primary" ? "text-primary" : "text-text-secondary";
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="mfd-label">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className={cn("font-mono font-semibold tabular-nums tracking-wide", valueSize[size], toneCls)}>{value}</span>
        {aside && <span className="text-xs text-text-muted">{aside}</span>}
      </span>
    </div>
  );
}
