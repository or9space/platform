"use client";

import {
  Fuel, Wrench, Cross, Package, FlaskConical,
  Bed, ShoppingBag, ArrowLeftRight, UtensilsCrossed,
} from "lucide-react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Station {
  id: number;
  name: string;
  services: string[];
  shopNames?: string[];
  orbitCode: string | null;
  isLagrange: boolean;
}

export interface Moon {
  id: number;
  name: string;
  stations: Station[];
}

export interface Planet {
  id: number;
  name: string;
  code?: string;
  cities: string[];
  moons: Moon[];
  stations: Station[];
}

export interface StarSystem {
  id: number;
  name: string;
  code: string;
  isLive: boolean;
  planets: Planet[];
  gateways?: Station[];
}

export type Selection =
  | { type: "planet"; planet: Planet }
  | { type: "moon"; moon: Moon; parentPlanet: string }
  | { type: "station"; station: Station; parentName: string }
  | null;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SVG_SIZE = 800;
export const CENTER = SVG_SIZE / 2;
export const MARGIN = 50;
export const MIN_MOON_PX = 22;
export const MAX_MOON_PX = 55;

export const PLANET_COLORS: Record<string, string> = {
  Hurston: "#f97316", Crusader: "#ef4444", ArcCorp: "#22c55e",
  MicroTech: "#3b82f6", microTech: "#3b82f6",
  "Pyro I": "#ef4444", Monox: "#f97316", Bloom: "#22c55e",
  "Pyro IV": "#8b5cf6", "Pyro V": "#06b6d4", Terminus: "#ec4899",
};

export const FALLBACK_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

// ---------------------------------------------------------------------------
// Service icons
// ---------------------------------------------------------------------------

const iconClass = "h-3 w-3";

export const SERVICE_ICON: Record<string, React.ReactNode> = {
  Refuel: createElement(Fuel, { className: `${iconClass} text-tier-nco` }),
  Repair: createElement(Wrench, { className: `${iconClass} text-warning` }),
  Medical: createElement(Cross, { className: `${iconClass} text-fg-red-light` }),
  Cargo: createElement(Package, { className: `${iconClass} text-success` }),
  Refinery: createElement(FlaskConical, { className: `${iconClass} text-warning` }),
  Habitation: createElement(Bed, { className: `${iconClass} text-amber` }),
  Shops: createElement(ShoppingBag, { className: `${iconClass} text-info` }),
  Trade: createElement(ArrowLeftRight, { className: `${iconClass} text-tier-command` }),
  Food: createElement(UtensilsCrossed, { className: `${iconClass} text-warning` }),
};

export const ALL_SERVICES = Object.keys(SERVICE_ICON);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function stationLabel(name: string): string {
  const lMatch = name.match(/^([\w-]+L\d)/);
  if (lMatch) return lMatch[1];
  const pyMatch = name.match(/FARSTAT-(\d)-(\d)/);
  if (pyMatch) return `P${pyMatch[1]}-L${pyMatch[2]}`;
  const supMatch = name.match(/SUPVISR-(\d)-(\d)/);
  if (supMatch) return `P${supMatch[1]}-S${supMatch[2]}`;
  if (name.length <= 14) return name;
  return name.slice(0, 12) + "…";
}
