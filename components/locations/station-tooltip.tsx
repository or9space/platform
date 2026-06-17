"use client";

import {
  Fuel,
  Wrench,
  Cross,
  Package,
  FlaskConical,
  Bed,
  ShoppingBag,
  Rocket,
  UtensilsCrossed,
} from "lucide-react";

const serviceIcon: Record<string, React.ReactNode> = {
  Refuel: <Fuel className="h-3 w-3 text-tier-nco" />,
  Repair: <Wrench className="h-3 w-3 text-warning" />,
  Medical: <Cross className="h-3 w-3 text-fg-red-light" />,
  Cargo: <Package className="h-3 w-3 text-success" />,
  Refinery: <FlaskConical className="h-3 w-3 text-warning" />,
  Habitation: <Bed className="h-3 w-3 text-amber" />,
  "FPS Shop": <ShoppingBag className="h-3 w-3 text-info" />,
  "Ship Shop": <Rocket className="h-3 w-3 text-tier-command" />,
  Food: <UtensilsCrossed className="h-3 w-3 text-warning" />,
};

interface Station {
  id: number;
  name: string;
  services: string[];
}

interface Props {
  station: Station;
  x: number;
  y: number;
}

export function StationTooltip({ station, x, y }: Props) {
  return (
    <div
      className="pointer-events-none absolute z-50 rounded-md border border-border bg-surface px-3 py-2 shadow-lg"
      style={{ left: x + 12, top: y - 10 }}
    >
      <p className="text-sm font-medium text-text-primary">{station.name}</p>
      {station.services.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {station.services.map((svc) => (
            <span key={svc} className="flex items-center gap-1 text-xs text-text-muted">
              {serviceIcon[svc] ?? null}
              {svc}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
