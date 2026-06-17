"use client";

import { useState, useCallback } from "react";
import { SERVICE_ICON, ALL_SERVICES } from "./system-map-types";

interface Station {
  id: number;
  name: string;
  services: string[];
  orbitCode: string | null;
  isLagrange: boolean;
}

interface Moon {
  id: number;
  name: string;
  stations: Station[];
}

interface Planet {
  id: number;
  name: string;
  code: string;
  cities: string[];
  moons: Moon[];
  stations: Station[];
}

interface StarSystem {
  id: number;
  name: string;
  code: string;
  wiki: string;
  faction: string | null;
  isLive: boolean;
  planets: Planet[];
  gateways: Station[];
}

interface Props {
  systems: StarSystem[];
  selectedSystem: StarSystem | null;
  onSelectSystem: (system: StarSystem) => void;
  systemMapView: (activeServices: ReadonlySet<string>, initialSearch?: string) => React.ReactNode;
  initialSearch?: string;
}

export function LocationTabs({
  systems,
  selectedSystem,
  onSelectSystem,
  systemMapView,
  initialSearch,
}: Props) {
  const [activeServices, setActiveServices] = useState<Set<string>>(new Set());

  const toggleService = useCallback((svc: string) => {
    setActiveServices((prev) => {
      const next = new Set(prev);
      if (next.has(svc)) next.delete(svc);
      else next.add(svc);
      return next;
    });
  }, []);

  const SYSTEM_ORDER = ["Stanton", "Pyro", "Nyx"];
  const liveSystems = [...systems.filter((s) => s.isLive)].sort((a, b) => {
    const ai = SYSTEM_ORDER.indexOf(a.name);
    const bi = SYSTEM_ORDER.indexOf(b.name);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  const otherSystems = systems.filter((s) => !s.isLive && s.planets.length > 0);

  return (
    <div>
      {/* System tabs + service filters */}
      <div className="mb-4 flex flex-wrap items-center gap-1">
        {liveSystems.map((sys) => (
          <button
            key={sys.id}
            onClick={() => onSelectSystem(sys)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
              selectedSystem?.id === sys.id
                ? "bg-amber-soft text-amber ring-1 ring-amber/40"
                : "bg-surface-elevated text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            }`}
          >
            {sys.name}
          </button>
        ))}
        {otherSystems.length > 0 && (
          <span className="mx-1 self-center text-text-muted text-xs">|</span>
        )}
        {otherSystems.map((sys) => (
          <button
            key={sys.id}
            onClick={() => onSelectSystem(sys)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
              selectedSystem?.id === sys.id
                ? "bg-amber-soft text-amber ring-1 ring-amber/40"
                : "bg-surface-elevated text-text-muted hover:bg-surface-hover hover:text-text-secondary"
            }`}
          >
            {sys.name}
          </button>
        ))}

        <span className="mx-1 self-center text-text-muted text-xs">|</span>

        {ALL_SERVICES.map((svc) => {
          const active = activeServices.has(svc);
          return (
            <button
              key={svc}
              onClick={() => toggleService(svc)}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                active
                  ? "bg-accent/20 text-accent ring-1 ring-accent/40"
                  : "bg-surface-elevated text-text-muted hover:text-text-secondary"
              }`}
            >
              {SERVICE_ICON[svc]}
              {svc}
            </button>
          );
        })}
      </div>

      {/* System map for selected system */}
      {selectedSystem && systemMapView(activeServices, initialSearch)}

      {!selectedSystem && (
        <p className="py-12 text-center text-sm text-text-muted">
          Select a system above to view its star map.
        </p>
      )}
    </div>
  );
}
