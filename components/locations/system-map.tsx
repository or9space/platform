"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Plus, Minus, RotateCcw, Crosshair } from "lucide-react";
import {
  PLANET_COORDS,
  MOON_COORDS,
  getStationCoord,
  getGatewayCoord,
  type Coord,
} from "./stanton-coords";
import {
  type Station, type Moon, type Planet, type StarSystem, type Selection,
  SVG_SIZE, CENTER, MARGIN, MIN_MOON_PX, MAX_MOON_PX,
  PLANET_COLORS, FALLBACK_COLORS, SERVICE_ICON,
  stationLabel,
} from "./system-map-types";
import { MapControls, type MatchedItem } from "./system-map-controls";
import { Legend } from "./system-map-legend";
import { PLANET_INFO, MOON_INFO } from "./celestial-data";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildScaler(allCoords: Coord[]) {
  if (allCoords.length === 0) return (_c: Coord) => ({ sx: CENTER, sy: CENTER });
  let maxAbs = 0;
  for (const c of allCoords) {
    maxAbs = Math.max(maxAbs, Math.abs(c.x), Math.abs(c.y));
  }
  const s = (SVG_SIZE / 2 - MARGIN) / (maxAbs || 1);
  return (c: Coord) => ({
    sx: CENTER + c.x * s,
    sy: CENTER - c.y * s,
  });
}

const SHOP_SERVICES = new Set(["Shops", "Trade"]);

function splitServices(services: string[]): { facilities: string[]; shops: string[] } {
  const facilities: string[] = [];
  const shops: string[] = [];
  for (const svc of services) {
    if (SHOP_SERVICES.has(svc)) shops.push(svc);
    else facilities.push(svc);
  }
  return { facilities, shops };
}

function SplitServiceBadges({ services, shopNames }: { services: string[]; shopNames?: string[] }) {
  if (services.length === 0) return null;
  const { facilities, shops } = splitServices(services);
  const hasShopNames = shopNames && shopNames.length > 0;
  return (
    <div className="mt-1 space-y-1">
      {facilities.length > 0 && (
        <div>
          <p className="text-[9px] font-medium text-text-muted">Services</p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {facilities.map((svc) => (
              <span key={svc} className="flex items-center gap-1 rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-text-muted">
                {SERVICE_ICON[svc] ?? null}
                {svc}
              </span>
            ))}
          </div>
        </div>
      )}
      {shops.length > 0 && (
        <div>
          <p className="text-[9px] font-medium text-text-muted">Shops</p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {hasShopNames
              ? shopNames.map((name) => (
                  <span key={name} className="flex items-center gap-1 rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-text-muted">
                    {SERVICE_ICON.Shops}
                    {name}
                  </span>
                ))
              : shops.map((svc) => (
                  <span key={svc} className="flex items-center gap-1 rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-text-muted">
                    {SERVICE_ICON[svc] ?? null}
                    {svc}
                  </span>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Measure types
// ---------------------------------------------------------------------------

interface MeasurePoint {
  svgX: number;
  svgY: number;
  coord: Coord;
  label: string;
}

// ---------------------------------------------------------------------------
// ViewBox type
// ---------------------------------------------------------------------------

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_VIEWBOX: ViewBox = { x: 0, y: 0, w: SVG_SIZE, h: SVG_SIZE };
const MIN_VIEWBOX_W = SVG_SIZE / 8; // 8x zoom
const MAX_VIEWBOX_W = SVG_SIZE;     // 1x zoom
const ZOOM_FACTOR = 1.15;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SystemMapProps {
  system: StarSystem;
  activeServices: ReadonlySet<string>;
  initialSearch?: string;
}

export function SystemMap({ system, activeServices, initialSearch }: SystemMapProps) {
  const [selection, setSelection] = useState<Selection>(null);
  const [viewBox, setViewBox] = useState<ViewBox>(DEFAULT_VIEWBOX);
  const [searchQuery, setSearchQuery] = useState(initialSearch ?? "");
  const [measureMode, setMeasureMode] = useState(false);
  const [measureA, setMeasureA] = useState<MeasurePoint | null>(null);
  const [measureB, setMeasureB] = useState<MeasurePoint | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  // SVG <animate> elements ignore CSS prefers-reduced-motion. Gate via JS.
  const reducedMotion = useReducedMotion();

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const hasRealCoords = system.planets.some((p) => PLANET_COORDS[p.name]);

  // Build coordinate scaler
  const toScale = useMemo(() => {
    if (!hasRealCoords) return [];
    const coords: Coord[] = [];
    for (const p of system.planets) {
      const pc = PLANET_COORDS[p.name];
      if (pc) {
        coords.push(pc);
        for (const st of p.stations) {
          if (st.isLagrange && st.orbitCode) {
            const sc = getStationCoord(st.orbitCode, true, p.name);
            if (sc) coords.push(sc);
          }
        }
      }
    }
    return coords;
  }, [system, hasRealCoords]);

  const scale = useMemo(() => buildScaler(toScale), [toScale]);

  // Inverse scale: convert SVG pixel back to real km coordinates
  const inverseScale = useMemo(() => {
    if (toScale.length === 0) return (_sx: number, _sy: number): Coord => ({ x: 0, y: 0 });
    let maxAbs = 0;
    for (const c of toScale) {
      maxAbs = Math.max(maxAbs, Math.abs(c.x), Math.abs(c.y));
    }
    const s = (SVG_SIZE / 2 - MARGIN) / (maxAbs || 1);
    return (sx: number, sy: number): Coord => ({
      x: (sx - CENTER) / s,
      y: -(sy - CENTER) / s,
    });
  }, [toScale]);

  // -----------------------------------------------------------------------
  // Selection toggle
  // -----------------------------------------------------------------------

  const select = useCallback((next: Selection) => {
    setSelection((prev) => {
      if (
        prev && next && prev.type === next.type &&
        ((prev.type === "planet" && next.type === "planet" && prev.planet.id === next.planet.id) ||
         (prev.type === "moon" && next.type === "moon" && prev.moon.id === next.moon.id) ||
         (prev.type === "station" && next.type === "station" && prev.station.id === next.station.id))
      ) {
        return null;
      }
      return next;
    });
  }, []);

  const selectedId =
    selection?.type === "planet" ? `p-${selection.planet.id}` :
    selection?.type === "moon" ? `m-${selection.moon.id}` :
    selection?.type === "station" ? `s-${selection.station.id}` : null;

  // -----------------------------------------------------------------------
  // Search matching
  // -----------------------------------------------------------------------

  const matchedItems = useMemo((): MatchedItem[] => {
    if (searchQuery.length === 0) return [];
    const q = searchQuery.toLowerCase();
    const items: MatchedItem[] = [];

    for (const planet of system.planets) {
      if (planet.name.toLowerCase().includes(q)) {
        items.push({
          label: planet.name,
          sublabel: "Planet",
          onSelect: () => { setSelection({ type: "planet", planet }); setSearchQuery(""); },
        });
      }
      for (const moon of planet.moons) {
        if (moon.name.toLowerCase().includes(q)) {
          items.push({
            label: moon.name,
            sublabel: `Moon of ${planet.name}`,
            onSelect: () => { setSelection({ type: "moon", moon, parentPlanet: planet.name }); setSearchQuery(""); },
          });
        }
        for (const st of moon.stations) {
          if (st.name.toLowerCase().includes(q)) {
            items.push({
              label: st.name,
              sublabel: `Station at ${moon.name}`,
              onSelect: () => { setSelection({ type: "station", station: st, parentName: moon.name }); setSearchQuery(""); },
            });
          }
        }
      }
      for (const st of planet.stations) {
        if (st.name.toLowerCase().includes(q)) {
          items.push({
            label: st.name,
            sublabel: `Station at ${planet.name}`,
            onSelect: () => { setSelection({ type: "station", station: st, parentName: planet.name }); setSearchQuery(""); },
          });
        }
      }
    }
    for (const gw of system.gateways ?? []) {
      if (gw.name.toLowerCase().includes(q)) {
        items.push({
          label: gw.name,
          sublabel: "Gateway",
          onSelect: () => { setSelection({ type: "station", station: gw, parentName: system.name }); setSearchQuery(""); },
        });
      }
    }

    return items.slice(0, 12);
  }, [searchQuery, system]);

  // Auto-select first match when initialSearch is provided
  const initialSearchApplied = useRef(false);
  useEffect(() => {
    if (initialSearch && matchedItems.length > 0 && !initialSearchApplied.current) {
      initialSearchApplied.current = true;
      matchedItems[0].onSelect();
    }
  }, [initialSearch, matchedItems]);

  function stationMatchesFilter(station: Station): boolean {
    if (activeServices.size === 0) return true;
    return station.services.some((svc) => activeServices.has(svc));
  }

  // -----------------------------------------------------------------------
  // Zoom & Pan
  // -----------------------------------------------------------------------

  function svgPoint(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const ratioX = viewBox.w / rect.width;
    const ratioY = viewBox.h / rect.height;
    return {
      x: viewBox.x + (clientX - rect.left) * ratioX,
      y: viewBox.y + (clientY - rect.top) * ratioY,
    };
  }

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const cursor = svgPoint(e.clientX, e.clientY);
    const zoomIn = e.deltaY < 0;
    setViewBox((prev) => {
      const factor = zoomIn ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
      const newW = Math.min(MAX_VIEWBOX_W, Math.max(MIN_VIEWBOX_W, prev.w * factor));
      const newH = Math.min(MAX_VIEWBOX_W, Math.max(MIN_VIEWBOX_W, prev.h * factor));
      // Keep cursor position stable
      const newX = cursor.x - (cursor.x - prev.x) * (newW / prev.w);
      const newY = cursor.y - (cursor.y - prev.y) * (newH / prev.h);
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (measureMode) return;
    if (e.button !== 0) return;
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
    setIsPanning(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!isPanning || !panStart.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratioX = viewBox.w / rect.width;
    const ratioY = viewBox.h / rect.height;
    const dx = (e.clientX - panStart.current.x) * ratioX;
    const dy = (e.clientY - panStart.current.y) * ratioY;
    setViewBox((prev) => ({
      ...prev,
      x: panStart.current!.vx - dx,
      y: panStart.current!.vy - dy,
    }));
  }

  function handlePointerUp() {
    setIsPanning(false);
    panStart.current = null;
  }

  function zoomIn() {
    setViewBox((prev) => {
      const newW = Math.max(MIN_VIEWBOX_W, prev.w / ZOOM_FACTOR);
      const newH = Math.max(MIN_VIEWBOX_W, prev.h / ZOOM_FACTOR);
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
    });
  }

  function zoomOut() {
    setViewBox((prev) => {
      const newW = Math.min(MAX_VIEWBOX_W, prev.w * ZOOM_FACTOR);
      const newH = Math.min(MAX_VIEWBOX_W, prev.h * ZOOM_FACTOR);
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
    });
  }

  function resetView() {
    setViewBox(DEFAULT_VIEWBOX);
  }

  const zoomPct = Math.round((SVG_SIZE / viewBox.w) * 100);

  // -----------------------------------------------------------------------
  // Distance measurement
  // -----------------------------------------------------------------------

  function handleMeasureClick(svgX: number, svgY: number, coord: Coord, label: string) {
    if (!measureMode) return;
    const point: MeasurePoint = { svgX, svgY, coord, label };
    if (!measureA) {
      setMeasureA(point);
      setMeasureB(null);
    } else if (!measureB) {
      setMeasureB(point);
    } else {
      // Start new measurement
      setMeasureA(point);
      setMeasureB(null);
    }
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!measureMode) return;
    // Only handle clicks on SVG background (not on objects)
    if ((e.target as Element).tagName !== "svg") return;
    const pt = svgPoint(e.clientX, e.clientY);
    const coord = inverseScale(pt.x, pt.y);
    handleMeasureClick(pt.x, pt.y, coord, "Point");
  }

  function formatDistance(a: Coord, b: Coord): string {
    const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    if (dist >= 1_000_000) {
      return `${(dist / 1_000_000).toFixed(1)} Mkm`;
    }
    return `${Math.round(dist).toLocaleString()} km`;
  }

  function toggleMeasure() {
    setMeasureMode((prev) => {
      if (prev) {
        // Exiting measure mode — clear points
        setMeasureA(null);
        setMeasureB(null);
      }
      return !prev;
    });
  }

  // -----------------------------------------------------------------------
  // Highlighted item (from search)
  // -----------------------------------------------------------------------

  const highlightId = useMemo(() => {
    if (!selection) return null;
    if (selection.type === "planet") return `p-${selection.planet.id}`;
    if (selection.type === "moon") return `m-${selection.moon.id}`;
    return `s-${selection.station.id}`;
  }, [selection]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!hasRealCoords) {
    return <FallbackMap system={system} />;
  }

  const svgCursor = measureMode ? "crosshair" : isPanning ? "grabbing" : "grab";

  return (
    <div className="relative">
      <MapControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        matchedItems={matchedItems}
      />

      <div className="relative w-full" style={{ maxHeight: "calc(100vh - 14rem)" }}>
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="h-full w-full max-h-[inherit]"
          style={{ background: "transparent", cursor: svgCursor, touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          onClick={handleSvgClick}
        >
          {/* Orbital rings */}
          {system.planets.map((planet) => {
            const pc = PLANET_COORDS[planet.name];
            if (!pc) return null;
            const dist = Math.sqrt(pc.x ** 2 + pc.y ** 2);
            const { sx } = scale({ x: dist, y: 0 });
            const r = Math.abs(sx - CENTER);
            return (
              <circle key={`ring-${planet.id}`} cx={CENTER} cy={CENTER} r={r}
                fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4"
              />
            );
          })}

          {/* Gradient definitions */}
          <defs>
            <radialGradient id="star-grad">
              <stop offset="0%" stopColor="oklch(85% 0.10 75)" />
              <stop offset="100%" stopColor="oklch(72% 0.16 75)" />
            </radialGradient>
            {system.planets.map((planet) => {
              const info = PLANET_INFO[planet.name];
              if (!info) return null;
              return (
                <radialGradient key={`grad-p-${planet.id}`} id={`grad-p-${planet.id}`} cx="35%" cy="35%">
                  <stop offset="0%" stopColor={info.colors[0]} />
                  <stop offset="100%" stopColor={info.colors[1]} />
                </radialGradient>
              );
            })}
            {system.planets.flatMap((planet) =>
              planet.moons.map((moon) => {
                const info = MOON_INFO[moon.name];
                if (!info) return null;
                return (
                  <radialGradient key={`grad-m-${moon.id}`} id={`grad-m-${moon.id}`} cx="35%" cy="35%">
                    <stop offset="0%" stopColor={info.colors[0]} />
                    <stop offset="100%" stopColor={info.colors[1]} />
                  </radialGradient>
                );
              })
            )}
          </defs>

          {/* Star center */}
          <circle cx={CENTER} cy={CENTER} r={14} fill="url(#star-grad)" opacity={0.9} />
          <circle cx={CENTER} cy={CENTER} r={20} fill="none" stroke="oklch(72% 0.16 75 / 0.25)" strokeWidth="2" />
          <text x={CENTER} y={CENTER + 32} textAnchor="middle" className="fill-text-muted text-[10px]">
            {system.name}
          </text>

          {/* Planets, moons, stations */}
          {system.planets.map((planet, pi) => {
            const pc = PLANET_COORDS[planet.name];
            if (!pc) return null;
            const { sx: px, sy: py } = scale(pc);
            const color = PLANET_COLORS[planet.name] ?? FALLBACK_COLORS[pi % FALLBACK_COLORS.length];
            const isPlanetSelected = selectedId === `p-${planet.id}`;
            const isPlanetHighlighted = highlightId === `p-${planet.id}`;

            // Moon SVG positions
            const moonPositions = planet.moons.map((moon, mi) => {
              const mc = MOON_COORDS[moon.name];
              if (!mc) {
                const fallbackAngle = (mi / planet.moons.length) * Math.PI * 2;
                const fallbackR = MIN_MOON_PX + mi * 10;
                return { mx: px + fallbackR * Math.cos(fallbackAngle), my: py + fallbackR * Math.sin(fallbackAngle) };
              }
              const dx = mc.x - pc.x;
              const dy = mc.y - pc.y;
              const realDist = Math.sqrt(dx ** 2 + dy ** 2);
              const angle = Math.atan2(dy, dx);
              const allDists = planet.moons
                .map((m) => { const c = MOON_COORDS[m.name]; return c ? Math.sqrt((c.x - pc.x) ** 2 + (c.y - pc.y) ** 2) : 0; })
                .filter((d) => d > 0);
              const minD = Math.min(...allDists);
              const maxD = Math.max(...allDists);
              const range = maxD - minD || 1;
              const moonR = allDists.length === 1
                ? (MIN_MOON_PX + MAX_MOON_PX) / 2
                : MIN_MOON_PX + ((realDist - minD) / range) * (MAX_MOON_PX - MIN_MOON_PX);
              return { mx: px + moonR * Math.cos(angle), my: py - moonR * Math.sin(angle) };
            });

            // Separate lagrange vs orbital stations
            const lagrangeStations: { st: Station; sx: number; sy: number }[] = [];
            const orbitalStations: { st: Station; idx: number }[] = [];
            planet.stations.forEach((st) => {
              if (st.isLagrange && st.orbitCode) {
                const coord = getStationCoord(st.orbitCode, true, planet.name);
                if (coord) { const { sx, sy } = scale(coord); lagrangeStations.push({ st, sx, sy }); return; }
              }
              orbitalStations.push({ st, idx: orbitalStations.length });
            });

            // Orbital station base angle
            const orbitalBaseAngle =
              moonPositions.length > 0
                ? Math.atan2(
                    moonPositions.reduce((s, m) => s + (m.my - py), 0) / moonPositions.length,
                    moonPositions.reduce((s, m) => s + (m.mx - px), 0) / moonPositions.length,
                  ) + Math.PI
                : Math.atan2(py - CENTER, px - CENTER);

            const pInfo = PLANET_INFO[planet.name];
            const planetFill = pInfo ? `url(#grad-p-${planet.id})` : color;
            const planetR = isPlanetSelected ? 10 : 7;

            return (
              <g key={planet.id}>
                {/* Atmosphere glow */}
                {pInfo?.atmosphere && (
                  <circle cx={px} cy={py} r={planetR + 4} fill={pInfo.atmosphere} />
                )}
                {/* Planet dot */}
                <circle
                  cx={px} cy={py}
                  r={planetR}
                  fill={planetFill} opacity={0.9}
                  className="cursor-pointer transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (measureMode) {
                      handleMeasureClick(px, py, pc, planet.name);
                    } else {
                      select({ type: "planet", planet });
                    }
                  }}
                />
                {isPlanetSelected && (
                  <>
                    <circle cx={px} cy={py} r={14} fill="none" stroke={color} strokeWidth="2" opacity={0.8} />
                    <circle cx={px} cy={py} r={14} fill="none" stroke={color} strokeWidth="1.5" opacity={0.5}>
                      {!reducedMotion && (
                        <>
                          <animate attributeName="r" values="14;19;14" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
                        </>
                      )}
                    </circle>
                  </>
                )}
                {isPlanetHighlighted && !isPlanetSelected && (
                  <circle cx={px} cy={py} r={14} fill="none" stroke={color} strokeWidth="1.5" opacity={0.6}>
                    {!reducedMotion && (
                      <>
                        <animate attributeName="r" values="12;16;12" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
                      </>
                    )}
                  </circle>
                )}
                <text x={px} y={py - 14} textAnchor="middle" className="fill-text-secondary text-[10px] font-medium pointer-events-none">
                  {planet.name}
                </text>

                {/* Moons */}
                {planet.moons.map((moon, mi) => {
                  const { mx, my } = moonPositions[mi];
                  const isMoonSelected = selectedId === `m-${moon.id}`;
                  const mc = MOON_COORDS[moon.name];
                  const mInfo = MOON_INFO[moon.name];
                  const moonFill = mInfo ? `url(#grad-m-${moon.id})` : (isMoonSelected ? "oklch(88% 0.005 60)" : "oklch(48% 0.008 60)");
                  return (
                    <g key={moon.id}>
                      <line x1={px} y1={py} x2={mx} y2={my} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                      <circle
                        cx={mx} cy={my}
                        r={isMoonSelected ? 5 : 3.5}
                        fill={moonFill}
                        opacity={isMoonSelected ? 0.95 : 0.75}
                        className="cursor-pointer transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (measureMode && mc) {
                            handleMeasureClick(mx, my, mc, moon.name);
                          } else {
                            select({ type: "moon", moon, parentPlanet: planet.name });
                          }
                        }}
                      />
                      {isMoonSelected && (
                        <>
                          <circle cx={mx} cy={my} r={8} fill="none" stroke="oklch(48% 0.008 60)" strokeWidth="1.5" opacity={0.7} />
                          <circle cx={mx} cy={my} r={8} fill="none" stroke="oklch(48% 0.008 60)" strokeWidth="1" opacity={0.4}>
                            {!reducedMotion && (
                              <>
                                <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2s" repeatCount="indefinite" />
                              </>
                            )}
                          </circle>
                        </>
                      )}
                      <text x={mx} y={my - 7} textAnchor="middle" className="fill-text-muted text-[8px] pointer-events-none">
                        {moon.name}
                      </text>
                    </g>
                  );
                })}

                {/* Lagrange stations */}
                {lagrangeStations.map(({ st, sx, sy }) => {
                  const isStSelected = selectedId === `s-${st.id}`;
                  const dimmed = activeServices.size > 0 && !stationMatchesFilter(st);
                  const coord = st.orbitCode ? getStationCoord(st.orbitCode, true, planet.name) : null;
                  return (
                    <g key={st.id} opacity={dimmed ? 0.15 : 1}>
                      <line x1={px} y1={py} x2={sx} y2={sy} stroke="rgba(70,170,220,0.1)" strokeWidth="0.5" strokeDasharray="2 3" />
                      <circle
                        cx={sx} cy={sy}
                        r={isStSelected ? 5 : 3}
                        fill="oklch(70% 0.13 245)"
                        opacity={isStSelected ? 1 : 0.7}
                        className="cursor-pointer transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (measureMode && coord) {
                            handleMeasureClick(sx, sy, coord, st.name);
                          } else {
                            select({ type: "station", station: st, parentName: planet.name });
                          }
                        }}
                      />
                      {isStSelected && (
                        <>
                          <circle cx={sx} cy={sy} r={8} fill="none" stroke="oklch(70% 0.13 245)" strokeWidth="1.5" opacity={0.7} />
                          <circle cx={sx} cy={sy} r={8} fill="none" stroke="oklch(70% 0.13 245)" strokeWidth="1" opacity={0.4}>
                            {!reducedMotion && (
                              <>
                                <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2s" repeatCount="indefinite" />
                              </>
                            )}
                          </circle>
                        </>
                      )}
                      <text x={sx} y={sy - 6} textAnchor="middle" className="fill-info/60 text-[7px] pointer-events-none">
                        {stationLabel(st.name)}
                      </text>
                    </g>
                  );
                })}

                {/* Orbital stations */}
                {orbitalStations.map(({ st, idx }) => {
                  const count = orbitalStations.length;
                  const spread = Math.min(Math.PI * 0.8, 0.4 + count * 0.3);
                  const stAngle = count === 1
                    ? orbitalBaseAngle
                    : orbitalBaseAngle - spread / 2 + (idx / (count - 1)) * spread;
                  const stR = 16 + idx * 8;
                  const osx = px + stR * Math.cos(stAngle);
                  const osy = py + stR * Math.sin(stAngle);
                  const isStSelected = selectedId === `s-${st.id}`;
                  const dimmed = activeServices.size > 0 && !stationMatchesFilter(st);
                  return (
                    <g key={st.id} opacity={dimmed ? 0.15 : 1}>
                      <circle
                        cx={osx} cy={osy}
                        r={isStSelected ? 4 : 2.5}
                        fill="oklch(70% 0.13 245)"
                        opacity={isStSelected ? 1 : 0.7}
                        className="cursor-pointer transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (measureMode) {
                            handleMeasureClick(osx, osy, pc, st.name);
                          } else {
                            select({ type: "station", station: st, parentName: planet.name });
                          }
                        }}
                      />
                      {isStSelected && (
                        <>
                          <circle cx={osx} cy={osy} r={7} fill="none" stroke="oklch(70% 0.13 245)" strokeWidth="1.5" opacity={0.7} />
                          <circle cx={osx} cy={osy} r={7} fill="none" stroke="oklch(70% 0.13 245)" strokeWidth="1" opacity={0.4}>
                            {!reducedMotion && (
                              <>
                                <animate attributeName="r" values="7;11;7" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2s" repeatCount="indefinite" />
                              </>
                            )}
                          </circle>
                        </>
                      )}
                      <text x={osx} y={osy - 5} textAnchor="middle" className="fill-info/50 text-[6px] pointer-events-none">
                        {stationLabel(st.name)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Gateways / Jump Points */}
          {(system.gateways ?? []).map((gw) => {
            const gc = getGatewayCoord(gw.orbitCode);
            if (!gc) return null;
            const angle = Math.atan2(-gc.y, gc.x);
            const edgeR = SVG_SIZE / 2 - MARGIN + 10;
            const gsx = CENTER + edgeR * Math.cos(angle);
            const gsy = CENTER + edgeR * Math.sin(angle);
            const label = gw.name.replace(/\s*\(.*\)/, "").replace("Gateway", "Gate");
            const isGwSelected = selectedId === `s-${gw.id}`;
            const dimmed = activeServices.size > 0 && !stationMatchesFilter(gw);
            return (
              <g key={gw.id} opacity={dimmed ? 0.15 : 1}>
                <line x1={CENTER} y1={CENTER} x2={gsx} y2={gsy} stroke="rgba(180,140,60,0.15)" strokeWidth="0.5" strokeDasharray="3 4" />
                <polygon
                  points={`${gsx},${gsy - 5} ${gsx + 4},${gsy} ${gsx},${gsy + 5} ${gsx - 4},${gsy}`}
                  fill={isGwSelected ? "oklch(80% 0.18 75)" : "oklch(72% 0.16 75)"}
                  opacity={isGwSelected ? 1 : 0.7}
                  className="cursor-pointer transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (measureMode && gc) {
                      handleMeasureClick(gsx, gsy, gc, gw.name);
                    } else {
                      select({ type: "station", station: gw, parentName: system.name });
                    }
                  }}
                />
                {isGwSelected && (
                  <>
                    <circle cx={gsx} cy={gsy} r={10} fill="none" stroke="oklch(72% 0.16 75)" strokeWidth="1.5" opacity={0.7} />
                    <circle cx={gsx} cy={gsy} r={10} fill="none" stroke="oklch(72% 0.16 75)" strokeWidth="1" opacity={0.4}>
                      {!reducedMotion && (
                        <>
                          <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.4;0.05;0.4" dur="2s" repeatCount="indefinite" />
                        </>
                      )}
                    </circle>
                  </>
                )}
                <text x={gsx} y={gsy - 9} textAnchor="middle" className="fill-amber text-[7px] pointer-events-none">
                  {label}
                </text>
              </g>
            );
          })}

          {/* Measure overlay */}
          {measureA && (
            <g>
              {/* Point A marker */}
              <line x1={measureA.svgX - 4} y1={measureA.svgY} x2={measureA.svgX + 4} y2={measureA.svgY} stroke="oklch(72% 0.16 75)" strokeWidth="1" />
              <line x1={measureA.svgX} y1={measureA.svgY - 4} x2={measureA.svgX} y2={measureA.svgY + 4} stroke="oklch(72% 0.16 75)" strokeWidth="1" />
              <text x={measureA.svgX} y={measureA.svgY - 7} textAnchor="middle" className="text-[7px]" fill="oklch(72% 0.16 75)">
                {measureA.label}
              </text>
            </g>
          )}
          {measureA && measureB && (
            <g>
              {/* Line between A and B */}
              <line
                x1={measureA.svgX} y1={measureA.svgY}
                x2={measureB.svgX} y2={measureB.svgY}
                stroke="oklch(72% 0.16 75)" strokeWidth="1" strokeDasharray="4 3" opacity={0.8}
              />
              {/* Point B marker */}
              <line x1={measureB.svgX - 4} y1={measureB.svgY} x2={measureB.svgX + 4} y2={measureB.svgY} stroke="oklch(72% 0.16 75)" strokeWidth="1" />
              <line x1={measureB.svgX} y1={measureB.svgY - 4} x2={measureB.svgX} y2={measureB.svgY + 4} stroke="oklch(72% 0.16 75)" strokeWidth="1" />
              <text x={measureB.svgX} y={measureB.svgY - 7} textAnchor="middle" className="text-[7px]" fill="oklch(72% 0.16 75)">
                {measureB.label}
              </text>
              {/* Distance label at midpoint */}
              <text
                x={(measureA.svgX + measureB.svgX) / 2}
                y={(measureA.svgY + measureB.svgY) / 2 - 6}
                textAnchor="middle"
                className="text-[9px] font-medium"
                fill="oklch(72% 0.16 75)"
              >
                {formatDistance(measureA.coord, measureB.coord)}
              </text>
            </g>
          )}
        </svg>

        {/* Zoom controls — top-right overlay */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          <button onClick={zoomIn} className="rounded bg-surface/90 p-1 text-text-muted hover:text-text-primary border border-border" title="Zoom in">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button onClick={zoomOut} className="rounded bg-surface/90 p-1 text-text-muted hover:text-text-primary border border-border" title="Zoom out">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button onClick={resetView} className="rounded bg-surface/90 p-1 text-text-muted hover:text-text-primary border border-border" title="Reset view">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <span className="text-center text-[9px] text-text-muted">{zoomPct}%</span>
        </div>

        {/* Measure button — below zoom controls */}
        <div className="absolute top-[7.5rem] right-2 z-10">
          <button
            onClick={toggleMeasure}
            className={`rounded p-1 border border-border ${
              measureMode
                ? "bg-warning/20 text-warning ring-1 ring-warning/40"
                : "bg-surface/90 text-text-muted hover:text-text-primary"
            }`}
            title={measureMode ? "Exit measure mode" : "Measure distance"}
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Legend — bottom-left overlay */}
        <Legend collapsed={!legendOpen} onToggle={() => setLegendOpen((p) => !p)} />

        {/* Detail Panel — bottom-right overlay */}
        {selection && (
          <div className="absolute bottom-2 right-2 z-10 w-64 max-h-[70%] overflow-y-auto rounded-md border border-border bg-surface/95 p-3">
            {selection.type === "planet" && (
              <PlanetDetail planet={selection.planet} />
            )}
            {selection.type === "moon" && (
              <MoonDetail moon={selection.moon} parentPlanet={selection.parentPlanet} />
            )}
            {selection.type === "station" && (
              <StationDetail station={selection.station} parentName={selection.parentName} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDist(km: number): string {
  if (km >= 1_000_000_000) return `${(km / 1_000_000_000).toFixed(1)} Bkm`;
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(1)} Mkm`;
  return `${Math.round(km).toLocaleString()} km`;
}

function distFromStar(name: string): string | null {
  const pc = PLANET_COORDS[name];
  if (!pc) return null;
  return formatDist(Math.sqrt(pc.x ** 2 + pc.y ** 2));
}

function distBetween(a: Coord, b: Coord): string {
  return formatDist(Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2));
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[10px]">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-secondary font-medium">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail panels
// ---------------------------------------------------------------------------

function PlanetDetail({ planet }: { planet: Planet }) {
  const dist = distFromStar(planet.name);
  const pInfo = PLANET_INFO[planet.name];
  const totalStations = planet.stations.length +
    planet.moons.reduce((s, m) => s + m.stations.length, 0);
  const allServices = new Set<string>();
  for (const st of planet.stations) st.services.forEach((s) => allServices.add(s));
  for (const m of planet.moons) for (const st of m.stations) st.services.forEach((s) => allServices.add(s));

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary">{planet.name}</h3>
      <p className="text-[10px] text-text-muted">{pInfo?.type ?? "Planet"}</p>
      {pInfo && (
        <p className="mt-1 text-[10px] text-text-secondary leading-relaxed">{pInfo.description}</p>
      )}
      <div className="mt-1.5 space-y-0.5">
        {dist && <InfoRow label="Distance from star" value={dist} />}
        <InfoRow label="Moons" value={planet.moons.length} />
        <InfoRow label="Stations" value={totalStations} />
        {allServices.size > 0 && <InfoRow label="Available services" value={allServices.size} />}
      </div>
      {planet.cities.length > 0 && (
        <p className="mt-1.5 text-[10px] text-text-muted">Cities: {planet.cities.join(", ")}</p>
      )}
      {planet.moons.length > 0 && (
        <div className="mt-1.5">
          <p className="text-[10px] font-medium text-text-secondary">Moons:</p>
          <ul className="mt-0.5 space-y-0.5">
            {planet.moons.map((moon) => (
              <li key={moon.id} className="text-[10px] text-text-muted">
                {moon.name}
                {moon.stations.length > 0 && (
                  <span className="ml-1 text-text-secondary">
                    ({moon.stations.length} station{moon.stations.length > 1 ? "s" : ""})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {planet.stations.length > 0 && (
        <div className="mt-1.5">
          <p className="text-[10px] font-medium text-text-secondary">Stations:</p>
          <ul className="mt-0.5 space-y-1">
            {planet.stations.map((st) => (
              <li key={st.id}>
                <span className="text-[10px] font-medium text-text-primary">{st.name}</span>
                <span className="ml-1 text-[9px] text-text-muted">
                  {st.isLagrange ? "Lagrange" : "Orbital"}
                </span>
                <SplitServiceBadges services={st.services} shopNames={st.shopNames} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MoonDetail({ moon, parentPlanet }: { moon: Moon; parentPlanet: string }) {
  const mc = MOON_COORDS[moon.name];
  const pc = PLANET_COORDS[parentPlanet];
  const dist = mc && pc ? distBetween(pc, mc) : null;
  const starDist = mc ? formatDist(Math.sqrt(mc.x ** 2 + mc.y ** 2)) : null;
  const mInfo = MOON_INFO[moon.name];

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary">{moon.name}</h3>
      <p className="text-[10px] text-text-muted">{mInfo?.type ?? "Moon"} of {parentPlanet}</p>
      {mInfo && (
        <p className="mt-1 text-[10px] text-text-secondary leading-relaxed">{mInfo.description}</p>
      )}
      <div className="mt-1.5 space-y-0.5">
        {dist && <InfoRow label={`Distance from ${parentPlanet}`} value={dist} />}
        {starDist && <InfoRow label="Distance from star" value={starDist} />}
        <InfoRow label="Stations" value={moon.stations.length} />
      </div>
      {moon.stations.length > 0 ? (
        <div className="mt-1.5">
          <p className="text-[10px] font-medium text-text-secondary">Stations:</p>
          <ul className="mt-0.5 space-y-1">
            {moon.stations.map((st) => (
              <li key={st.id}>
                <span className="text-[10px] font-medium text-text-primary">{st.name}</span>
                <SplitServiceBadges services={st.services} shopNames={st.shopNames} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-1 text-[10px] text-text-muted">No stations</p>
      )}
    </div>
  );
}

function StationDetail({ station, parentName }: { station: Station; parentName: string }) {
  const stationType = station.orbitCode?.includes("JP")
    ? "Gateway / Jump Point"
    : station.isLagrange
      ? "Lagrange Station"
      : "Orbital Station";

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary">{station.name}</h3>
      <p className="text-[10px] text-text-muted">{parentName}</p>
      <div className="mt-1.5 space-y-0.5">
        <InfoRow label="Type" value={stationType} />
        {station.orbitCode && <InfoRow label="Orbit" value={station.orbitCode} />}
      </div>
      <SplitServiceBadges services={station.services} shopNames={station.shopNames} />
      {station.services.length === 0 && (
        <p className="mt-1 text-[10px] text-text-muted">No services or shops</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fallback for systems without coordinate data
// ---------------------------------------------------------------------------

function FallbackMap({ system }: { system: StarSystem }) {
  const [selection, setSelection] = useState<Selection>(null);
  const planetCount = system.planets.length;

  const selectedId =
    selection?.type === "planet" ? `p-${selection.planet.id}` :
    selection?.type === "moon" ? `m-${selection.moon.id}` :
    selection?.type === "station" ? `s-${selection.station.id}` : null;

  function toggle(next: Selection) {
    if (selection && next && selection.type === next.type &&
      ((selection.type === "planet" && next.type === "planet" && selection.planet.id === next.planet.id) ||
       (selection.type === "moon" && next.type === "moon" && selection.moon.id === next.moon.id) ||
       (selection.type === "station" && next.type === "station" && selection.station.id === next.station.id))
    ) { setSelection(null); } else { setSelection(next); }
  }

  return (
    <div className="relative">
      <svg viewBox="0 0 600 600" className="w-full max-w-[600px] mx-auto" style={{ background: "transparent" }}>
        {system.planets.map((_, i) => {
          const r = ((i + 1) / (planetCount + 1)) * 250;
          return <circle key={`ring-${i}`} cx={300} cy={300} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />;
        })}
        <circle cx={300} cy={300} r={14} fill="oklch(72% 0.16 75)" opacity={0.9} />
        <text x={300} y={338} textAnchor="middle" className="fill-text-muted text-[10px]">{system.name}</text>
        {system.planets.map((planet, i) => {
          const r = ((i + 1) / (planetCount + 1)) * 250;
          const angle = (i / planetCount) * Math.PI * 2 - Math.PI / 2;
          const px = 300 + r * Math.cos(angle);
          const py = 300 + r * Math.sin(angle);
          const color = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
          const isSelected = selectedId === `p-${planet.id}`;
          return (
            <g key={planet.id}>
              <circle cx={px} cy={py} r={isSelected ? 10 : 7} fill={color} opacity={0.85}
                className="cursor-pointer" onClick={() => toggle({ type: "planet", planet })} />
              <text x={px} y={py - 12} textAnchor="middle" className="fill-text-secondary text-[9px] pointer-events-none">{planet.name}</text>
            </g>
          );
        })}
      </svg>
      {selection?.type === "planet" && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <PlanetDetail planet={selection.planet} />
        </div>
      )}
    </div>
  );
}
