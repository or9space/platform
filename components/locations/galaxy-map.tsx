"use client";

interface Props<T extends { id: number; name: string; code: string; isLive: boolean; planets: { id: number }[] }> {
  systems: T[];
  onSelectSystem: (system: T) => void;
  selectedSystemId: number | null;
}

export function GalaxyMap<T extends { id: number; name: string; code: string; isLive: boolean; planets: { id: number }[] }>({ systems, onSelectSystem, selectedSystemId }: Props<T>) {
  // Arrange systems in a grid-like pattern
  const liveSystems = systems.filter((s) => s.isLive);
  const otherSystems = systems.filter((s) => !s.isLive && s.planets.length > 0);
  const allSystems = [...liveSystems, ...otherSystems];

  const cols = Math.ceil(Math.sqrt(allSystems.length));
  const spacing = 100;
  const padding = 60;
  const width = cols * spacing + padding * 2;
  const rows = Math.ceil(allSystems.length / cols);
  const height = rows * spacing + padding * 2;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[800px] mx-auto"
        style={{ background: "transparent", minHeight: 300 }}
      >
        {allSystems.map((sys, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = padding + col * spacing + spacing / 2;
          const y = padding + row * spacing + spacing / 2;
          const isSelected = selectedSystemId === sys.id;

          return (
            <g
              key={sys.id}
              className="cursor-pointer"
              onClick={() => onSelectSystem(sys)}
            >
              {/* Glow for live systems */}
              {sys.isLive && (
                <circle
                  cx={x}
                  cy={y}
                  r={24}
                  fill="none"
                  stroke="oklch(62% 0.16 145)"
                  strokeWidth="1"
                  opacity={0.3}
                />
              )}

              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={x}
                  cy={y}
                  r={20}
                  fill="none"
                  stroke="oklch(50% 0.22 18)"
                  strokeWidth="2"
                  opacity={0.7}
                />
              )}

              {/* System dot */}
              <circle
                cx={x}
                cy={y}
                r={sys.isLive ? 8 : 5}
                fill={sys.isLive ? "oklch(72% 0.16 75)" : "oklch(48% 0.008 60)"}
                opacity={sys.isLive ? 0.9 : 0.5}
              />

              {/* Label */}
              <text
                x={x}
                y={y + 20}
                textAnchor="middle"
                className={`text-[9px] ${
                  sys.isLive ? "fill-text-secondary" : "fill-text-muted"
                }`}
              >
                {sys.name}
              </text>
              <text
                x={x}
                y={y + 30}
                textAnchor="middle"
                className="fill-text-muted text-[7px]"
              >
                {sys.planets.length}p
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
