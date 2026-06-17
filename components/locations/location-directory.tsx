"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Orbit,
  MapPin,
  Building2,
  Globe,
  Fuel,
  Wrench,
  Cross,
  ShoppingBag,
  Package,
  FlaskConical,
  Bed,
  Rocket,
  UtensilsCrossed,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (shared)
// ---------------------------------------------------------------------------

interface Station {
  id: number;
  name: string;
  services: string[];
}

interface Moon {
  id: number;
  name: string;
  stations: Station[];
}

interface Planet {
  id: number;
  name: string;
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
}

// ---------------------------------------------------------------------------
// Service icons
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LocationDirectory({ systems }: { systems: StarSystem[] }) {
  const [query, setQuery] = useState("");
  const [expandedSystems, setExpandedSystems] = useState<Set<number>>(
    () => new Set(systems.filter((s) => s.isLive).map((s) => s.id)),
  );

  const filtered = useMemo(() => {
    if (!query) return systems.filter((s) => s.isLive || s.planets.length > 0);
    const q = query.toLowerCase();
    return systems.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.planets.some(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.cities.some((c) => c.toLowerCase().includes(q)) ||
            p.moons.some(
              (m) =>
                m.name.toLowerCase().includes(q) ||
                m.stations.some((st) => st.name.toLowerCase().includes(q)),
            ) ||
            p.stations.some((st) => st.name.toLowerCase().includes(q)),
        ),
    );
  }, [systems, query]);

  function toggleSystem(id: number) {
    setExpandedSystems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search systems, planets, stations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-border bg-surface pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        />
      </div>

      {/* Systems */}
      <div className="space-y-2">
        {filtered.map((sys) => {
          const isExpanded = expandedSystems.has(sys.id);
          return (
            <div
              key={sys.id}
              className="rounded-lg border border-border bg-surface overflow-hidden"
            >
              <button
                onClick={() => toggleSystem(sys.id)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-surface-hover transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                )}
                <Globe className="h-4 w-4 text-primary" />
                <span className="font-semibold text-text-primary">{sys.name}</span>
                <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
                  {sys.code}
                </span>
                {sys.isLive && (
                  <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success/80">
                    LIVE
                  </span>
                )}
                {sys.faction && (
                  <span className="text-xs text-text-muted">{sys.faction}</span>
                )}
                <span className="ml-auto text-xs text-text-muted">
                  {sys.planets.length} planet{sys.planets.length !== 1 ? "s" : ""}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  {sys.planets.length === 0 ? (
                    <p className="text-xs text-text-muted">No accessible planets yet.</p>
                  ) : (
                    sys.planets.map((planet) => (
                      <div key={planet.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Orbit className="h-4 w-4 text-warning" />
                          <span className="font-medium text-text-primary text-sm">
                            {planet.name}
                          </span>
                          {planet.cities.length > 0 && (
                            <span className="text-xs text-text-muted">
                              · {planet.cities.map((c, i) => (
                                <span key={c}>
                                  <span className="text-text-secondary">{c}</span>
                                  {i < planet.cities.length - 1 && ", "}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                        {planet.stations.length > 0 && (
                          <div className="ml-6 space-y-1">
                            {planet.stations.map((st) => (
                              <StationRow key={st.id} station={st} />
                            ))}
                          </div>
                        )}
                        {planet.moons.length > 0 && (
                          <div className="ml-6 space-y-2">
                            {planet.moons.map((moon) => (
                              <div key={moon.id} className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3 text-text-muted" />
                                  <span className="text-xs font-medium text-text-secondary">
                                    {moon.name}
                                  </span>
                                </div>
                                {moon.stations.length > 0 && (
                                  <div className="ml-5 space-y-1">
                                    {moon.stations.map((st) => (
                                      <StationRow key={st.id} station={st} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Service legend */}
      <div className="mt-6 flex flex-wrap gap-3 text-xs text-text-muted">
        {Object.entries(serviceIcon).map(([name, icon]) => (
          <span key={name} className="flex items-center gap-1">
            {icon} {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function StationRow({ station }: { station: { id: number; name: string; services: string[] } }) {
  return (
    <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-surface-elevated">
      <Building2 className="h-3 w-3 text-info" />
      <span className="text-xs text-text-secondary">{station.name}</span>
      <div className="flex gap-1 ml-auto">
        {station.services.map((svc) => (
          <span key={svc} title={svc}>
            {serviceIcon[svc] ?? <span className="text-[10px] text-text-muted">{svc}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
