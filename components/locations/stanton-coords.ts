// ---------------------------------------------------------------------------
// Real in-game coordinates for known star systems (km from star at origin)
// Source: VerseGuide / Star Citizen game data
// ---------------------------------------------------------------------------

export interface Coord {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Planet coordinates by name (absolute, relative to system star)
// ---------------------------------------------------------------------------

export const PLANET_COORDS: Record<string, Coord> = {
  // Stanton
  Hurston:   { x: 12_851_376_346, y: -771_345 },
  Crusader:  { x: -18_962_176_000, y: -2_664_960_000 },
  ArcCorp:   { x: 18_587_664_740, y: -22_151_916_920 },
  MicroTech: { x: 22_462_085_252, y: 37_185_744_965 },
  microTech: { x: 22_462_085_252, y: 37_185_744_965 },

  // Pyro
  "Pyro I":    { x: -7_920_919_212, y: -2_386_977_493 },
  Monox:       { x: 6_057_267_758, y: -8_724_928_710 },
  Bloom:       { x: -16_103_893_420, y: 7_587_934_811 },
  "Pyro IV":   { x: -3_704_129_439, y: -43_071_653_307 },
  "Pyro V":    { x: -3_912_418_653, y: -42_758_726_678 },
  Terminus:    { x: -48_118_274_995, y: 48_503_115_865 },
};

// ---------------------------------------------------------------------------
// Moon coordinates (absolute)
// ---------------------------------------------------------------------------

export const MOON_COORDS: Record<string, Coord> = {
  // Stanton moons
  Arial:    { x: 12_892_673_309, y: -31_476_129 },
  Aberdeen: { x: 12_905_757_636, y: 40_955_551 },
  Magda:    { x: 12_792_686_359, y: -74_464_581 },
  Ita:      { x: 12_830_194_716, y: 114_913_609 },
  Cellin:   { x: -18_987_611_119, y: -2_709_009_661 },
  Daymar:   { x: -18_930_539_540, y: -2_610_158_765 },
  Yela:     { x: -19_022_916_799, y: -2_613_996_152 },
  Wala:     { x: 18_379_649_310, y: -22_000_466_768 },
  Lyria:    { x: 18_703_607_172, y: -22_121_650_134 },
  Calliope: { x: 22_525_801_197, y: 37_202_649_251 },
  Clio:     { x: 22_447_442_284, y: 37_280_469_855 },
  Euterpe:  { x: 22_436_060_769, y: 37_290_366_365 },

  // Pyro V moons
  Ignis:  { x: -3_965_327_312, y: -42_774_792_832 },
  Vatra:  { x: -3_889_829_129, y: -42_688_062_500 },
  Adir:   { x: -3_815_633_250, y: -42_729_087_632 },
  Fairo:  { x: -3_946_426_939, y: -42_879_832_788 },
  Fuego:  { x: -3_780_104_297, y: -42_827_190_112 },
  Vuur:   { x: -4_049_984_180, y: -42_648_941_424 },
};

// ---------------------------------------------------------------------------
// Lagrange point calculation from planet position
// ---------------------------------------------------------------------------

// L-point ratios (approximate for visual purposes):
// L1: ~88% of planet distance, on planet-star line (between planet and star)
// L2: ~112% of planet distance, on planet-star line (beyond planet)
// L3: opposite side of star, same distance
// L4: 60° ahead of planet, same distance
// L5: 60° behind of planet, same distance

const L_OFFSETS: Record<number, (angle: number, dist: number) => Coord> = {
  1: (angle, dist) => ({
    x: dist * 0.88 * Math.cos(angle),
    y: dist * 0.88 * Math.sin(angle),
  }),
  2: (angle, dist) => ({
    x: dist * 1.12 * Math.cos(angle),
    y: dist * 1.12 * Math.sin(angle),
  }),
  3: (angle, dist) => ({
    x: dist * Math.cos(angle + Math.PI),
    y: dist * Math.sin(angle + Math.PI),
  }),
  4: (angle, dist) => ({
    x: dist * Math.cos(angle + Math.PI / 3),
    y: dist * Math.sin(angle + Math.PI / 3),
  }),
  5: (angle, dist) => ({
    x: dist * Math.cos(angle - Math.PI / 3),
    y: dist * Math.sin(angle - Math.PI / 3),
  }),
};

/**
 * Calculate a lagrange point position from orbit code and planet position.
 * Orbit codes end with L1-L5 (e.g. "ARCL1", "PYR1L2", "HURL3").
 */
export function getLagrangeCoord(
  orbitCode: string,
  planetCoord: Coord,
): Coord | null {
  const match = orbitCode.match(/L(\d)$/);
  if (!match) return null;
  const lNum = parseInt(match[1], 10);
  const fn = L_OFFSETS[lNum];
  if (!fn) return null;

  const angle = Math.atan2(planetCoord.y, planetCoord.x);
  const dist = Math.sqrt(planetCoord.x ** 2 + planetCoord.y ** 2);
  return fn(angle, dist);
}

// ---------------------------------------------------------------------------
// Jump point / gateway coordinates (absolute)
// ---------------------------------------------------------------------------

export const GATEWAY_COORDS: Record<string, Coord> = {
  // Stanton gateways (orbit codes from UEX)
  STPYJP:  { x: 3_310_491_640, y: -27_979_408_221 },   // Pyro Gateway (Stanton)
  STTEJP:  { x: 51_118_221_617, y: -5_269_981_303 },    // Terra Gateway (Stanton)
  STNYJP:  { x: -62_284_282_868, y: 23_467_602_587 },   // Nyx Gateway (Stanton)

  // Pyro gateways
  PYSTJP:  { x: 34_178_631_663, y: 40_591_997_867 },    // Stanton Gateway (Pyro)
  PYNYJP:  { x: -35_275_850_840, y: -36_052_314_188 },  // Nyx Gateway (Pyro)
};

/**
 * Get coordinate for a station given its orbit code and parent planet name.
 * Returns null if no coordinate data is available.
 */
export function getStationCoord(
  orbitCode: string | null,
  isLagrange: boolean,
  planetName: string,
): Coord | null {
  if (!orbitCode) return null;

  // Lagrange station: calculate from planet position
  if (isLagrange) {
    const pc = PLANET_COORDS[planetName];
    if (pc) return getLagrangeCoord(orbitCode, pc);
    return null;
  }

  // Non-lagrange station orbiting a planet: position at the planet
  const pc = PLANET_COORDS[planetName];
  return pc ?? null;
}

/**
 * Get coordinate for a gateway/jump-point station by orbit code.
 */
export function getGatewayCoord(orbitCode: string | null): Coord | null {
  if (!orbitCode) return null;
  return GATEWAY_COORDS[orbitCode] ?? null;
}
