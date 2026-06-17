"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Globe } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { LocationTabs } from "@/components/locations/location-tabs";

// Heavy SVG-driven client component (~1100 lines + coordinate math + animations).
// Lazy-load to keep the sc-tools route's initial bundle lean.
const SystemMap = dynamic(
  () => import("@/components/locations/system-map").then((m) => ({ default: m.SystemMap })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none" />
        Loading system map...
      </div>
    ),
  },
);

// ---------------------------------------------------------------------------
// Static system data
//
// Planet/moon positions come from stanton-coords.ts (real in-game km coords).
// Visual appearance comes from celestial-data.ts.
// No /api/locations needed — the SVG map is purely coordinate-driven.
// Stations are empty arrays (no live station data on the platform).
// The orbital SVG (sun, rings, planets, moons, labels, zoom/pan) renders
// identically to Freedom Guards.
// ---------------------------------------------------------------------------

// SystemMap accepts StarSystem from system-map-types.
// LocationTabs has its own local StarSystem interface (adds wiki/faction, requires code on Planet).
// Use a superset type that satisfies both, defined inline.
interface StaticStation {
  id: number;
  name: string;
  services: string[];
  shopNames?: string[];
  orbitCode: string | null;
  isLagrange: boolean;
}

interface StaticMoon {
  id: number;
  name: string;
  stations: StaticStation[];
}

interface StaticPlanet {
  id: number;
  name: string;
  code: string;
  cities: string[];
  moons: StaticMoon[];
  stations: StaticStation[];
}

interface StaticSystem {
  id: number;
  name: string;
  code: string;
  wiki: string;
  faction: string | null;
  isLive: boolean;
  planets: StaticPlanet[];
  gateways: StaticStation[];
}

const STATIC_SYSTEMS: StaticSystem[] = [
  {
    id: 1,
    name: "Stanton",
    code: "STA",
    wiki: "",
    faction: null,
    isLive: true,
    planets: [
      {
        id: 101,
        name: "Hurston",
        code: "HUR",
        cities: ["Lorville"],
        stations: [],
        moons: [
          { id: 1011, name: "Arial",    stations: [] },
          { id: 1012, name: "Aberdeen", stations: [] },
          { id: 1013, name: "Magda",    stations: [] },
          { id: 1014, name: "Ita",      stations: [] },
        ],
      },
      {
        id: 102,
        name: "Crusader",
        code: "CRU",
        cities: ["Orison"],
        stations: [],
        moons: [
          { id: 1021, name: "Cellin", stations: [] },
          { id: 1022, name: "Daymar", stations: [] },
          { id: 1023, name: "Yela",   stations: [] },
        ],
      },
      {
        id: 103,
        name: "ArcCorp",
        code: "ARC",
        cities: ["Area18"],
        stations: [],
        moons: [
          { id: 1031, name: "Lyria", stations: [] },
          { id: 1032, name: "Wala",  stations: [] },
        ],
      },
      {
        id: 104,
        name: "MicroTech",
        code: "MIC",
        cities: ["New Babbage"],
        stations: [],
        moons: [
          { id: 1041, name: "Calliope", stations: [] },
          { id: 1042, name: "Clio",     stations: [] },
          { id: 1043, name: "Euterpe",  stations: [] },
        ],
      },
    ],
    gateways: [
      { id: 9001, name: "Pyro Gateway (Stanton)", services: [], orbitCode: "STPYJP", isLagrange: false },
      { id: 9002, name: "Terra Gateway (Stanton)", services: [], orbitCode: "STTEJP", isLagrange: false },
      { id: 9003, name: "Nyx Gateway (Stanton)", services: [], orbitCode: "STNYJP", isLagrange: false },
    ],
  },
  {
    id: 2,
    name: "Pyro",
    code: "PYR",
    wiki: "",
    faction: null,
    isLive: true,
    planets: [
      { id: 201, name: "Pyro I",   code: "PYR1", cities: [], stations: [], moons: [] },
      { id: 202, name: "Monox",    code: "MON",  cities: [], stations: [], moons: [] },
      { id: 203, name: "Bloom",    code: "BLO",  cities: [], stations: [], moons: [] },
      { id: 204, name: "Pyro IV",  code: "PYR4", cities: [], stations: [], moons: [] },
      {
        id: 205,
        name: "Pyro V",
        code: "PYR5",
        cities: [],
        stations: [],
        moons: [
          { id: 2051, name: "Ignis", stations: [] },
          { id: 2052, name: "Vatra", stations: [] },
          { id: 2053, name: "Adir",  stations: [] },
          { id: 2054, name: "Fairo", stations: [] },
          { id: 2055, name: "Fuego", stations: [] },
          { id: 2056, name: "Vuur",  stations: [] },
        ],
      },
      { id: 206, name: "Terminus", code: "TER",  cities: [], stations: [], moons: [] },
    ],
    gateways: [
      { id: 9004, name: "Stanton Gateway (Pyro)", services: [], orbitCode: "PYSTJP", isLagrange: false },
      { id: 9005, name: "Nyx Gateway (Pyro)", services: [], orbitCode: "PYNYJP", isLagrange: false },
    ],
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StarMapPage() {
  const [selectedSystem, setSelectedSystem] = useState<StaticSystem>(STATIC_SYSTEMS[0]);

  return (
    <div className="p-3 sm:p-6 animate-page-enter">
      <PageHeader
        icon={Globe}
        title="Star Map"
        subtitle="System layout — Stanton and Pyro orbital data"
      />
      <LocationTabs
        systems={STATIC_SYSTEMS}
        selectedSystem={selectedSystem}
        onSelectSystem={(sys) => {
          const found = STATIC_SYSTEMS.find((s) => s.id === sys.id);
          if (found) setSelectedSystem(found);
        }}
        systemMapView={(activeServices, initialSearch) =>
          <SystemMap
            system={selectedSystem}
            activeServices={activeServices}
            initialSearch={initialSearch}
          />
        }
      />
    </div>
  );
}
