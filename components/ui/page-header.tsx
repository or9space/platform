import { cn } from "@/lib/cn";
import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

/**
 * Top-of-page header strip applying MFD chrome consistently (ported from FG):
 *   [ ICON ]  [ TITLE ]                    actions / readout
 *             subtitle
 * Title = .text-stencil + red bracket corner-marks. Subtitle = .mfd-label.
 * Bottom border primary/30 anchors the section.
 */
export function PageHeader({
  title, subtitle, icon: Icon, actions, readout, className,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  readout?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-3 border-b border-primary/30 pb-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-stencil text-2xl text-primary sm:text-3xl">
            <span className="text-primary">[ </span>
            <span className="text-fg-cream">{title}</span>
            <span className="text-primary"> ]</span>
          </h1>
          {subtitle && <p className="mt-1 mfd-label">{subtitle}</p>}
        </div>
      </div>
      {(actions || readout) && (
        <div className="flex items-center gap-3 sm:shrink-0">
          {readout && (
            <span className="mfd-readout text-base font-semibold tabular-nums">{readout}</span>
          )}
          {actions}
        </div>
      )}
    </header>
  );
}
