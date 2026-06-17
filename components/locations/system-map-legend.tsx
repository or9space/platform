"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { SERVICE_ICON, ALL_SERVICES } from "./system-map-types";

interface LegendProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Legend({ collapsed, onToggle }: LegendProps) {
  return (
    <div className="absolute bottom-2 left-2 z-10 rounded-md border border-border bg-surface/95 text-[10px]">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-text-secondary hover:text-text-primary"
      >
        <span className="font-medium">Legend</span>
        {collapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {!collapsed && (
        <div className="border-t border-border px-2.5 pb-2 pt-1.5 space-y-2">
          {/* Dot types */}
          <div className="space-y-1">
            <p className="font-medium text-text-secondary">Map Symbols</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <LegendDot color="oklch(65% 0.18 50)" size={7} label="Planet" />
              <LegendDot color="oklch(48% 0.008 60)" size={4} label="Moon" />
              <LegendDot color="oklch(70% 0.13 245)" size={4} label="Lagrange Station" />
              <LegendDot color="oklch(70% 0.13 245)" size={3} label="Orbital Station" />
              <LegendDiamond color="oklch(72% 0.16 75)" label="Gateway" />
              <LegendRing label="Orbital Ring" />
            </div>
          </div>

          {/* Services */}
          <div className="space-y-1">
            <p className="font-medium text-text-secondary">Services</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {ALL_SERVICES.map((svc) => (
                <div key={svc} className="flex items-center gap-1.5 text-text-muted">
                  {SERVICE_ICON[svc]}
                  <span>{svc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend item helpers
// ---------------------------------------------------------------------------

function LegendDot({ color, size, label }: { color: string; size: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-text-muted">
      <svg width={12} height={12} viewBox="0 0 12 12">
        <circle cx={6} cy={6} r={size / 2} fill={color} opacity={0.85} />
      </svg>
      <span>{label}</span>
    </div>
  );
}

function LegendDiamond({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-text-muted">
      <svg width={12} height={12} viewBox="0 0 12 12">
        <polygon points="6,2 10,6 6,10 2,6" fill={color} opacity={0.7} />
      </svg>
      <span>{label}</span>
    </div>
  );
}

function LegendRing({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-text-muted">
      <svg width={12} height={12} viewBox="0 0 12 12">
        <circle cx={6} cy={6} r={4} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="2 2" />
      </svg>
      <span>{label}</span>
    </div>
  );
}
