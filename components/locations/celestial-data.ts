// ---------------------------------------------------------------------------
// Visual appearance and lore data for planets and moons
// Source: Star Citizen Wiki, RSI Galactapedia, in-game observations
// ---------------------------------------------------------------------------

export interface CelestialInfo {
  description: string;
  type: string;
  /** CSS gradient stops for the dot visual [inner, outer] */
  colors: [string, string];
  /** Optional atmosphere glow color */
  atmosphere?: string;
}

// ---------------------------------------------------------------------------
// Planets
// ---------------------------------------------------------------------------

export const PLANET_INFO: Record<string, CelestialInfo> = {
  // Stanton
  Hurston: {
    type: "Terrestrial",
    description:
      "A polluted, industrialized world owned by Hurston Dynamics. Once a lush savanna biome, its ecosystem has been devastated by weapons manufacturing and mining. Landing zone: Lorville.",
    colors: ["#c2703a", "#8b4513"],
    atmosphere: "#f9731640",
  },
  Crusader: {
    type: "Gas Giant",
    description:
      "A low-mass gas giant with a breathable atmosphere at high altitudes. Home to Orison, a city of floating platforms suspended in pink and orange clouds.",
    colors: ["#e8a87c", "#c06040"],
    atmosphere: "#ef444440",
  },
  ArcCorp: {
    type: "Super-Earth",
    description:
      "An entirely urbanized planet covered in buildings and infrastructure. ArcCorp opened its surface to outside development, creating a massive city-world. Landing zone: Area18.",
    colors: ["#7ec880", "#3a7d44"],
    atmosphere: "#22c55e30",
  },
  MicroTech: {
    type: "Terrestrial",
    description:
      "A frigid world with unnaturally dense cloud cover caused by a terraforming error. Its cold climate is ideal for microTech's data centers. Landing zone: New Babbage.",
    colors: ["#a0c4e8", "#5b8db8"],
    atmosphere: "#3b82f630",
  },
  microTech: {
    type: "Terrestrial",
    description:
      "A frigid world with unnaturally dense cloud cover caused by a terraforming error. Its cold climate is ideal for microTech's data centers. Landing zone: New Babbage.",
    colors: ["#a0c4e8", "#5b8db8"],
    atmosphere: "#3b82f630",
  },

  // Pyro
  "Pyro I": {
    type: "Dwarf Planet",
    description:
      "The closest planet to Pyro's sun — a charred, scorched rock battered by constant solar flares. Extreme heat and atmospheric pressure with violent lightning storms.",
    colors: ["#ff6b35", "#8b1a1a"],
    atmosphere: "#ef444450",
  },
  Monox: {
    type: "Mesoplanet",
    description:
      "A coreless planet with a toxic carbon monoxide atmosphere. Scarred by aggressive historical mining operations that stripped its metal deposits. Temperate but irradiated.",
    colors: ["#b8860b", "#6b4e0a"],
    atmosphere: "#f9731630",
  },
  Bloom: {
    type: "Terrestrial",
    description:
      "An icy terrestrial world with a breathable nitrogen-oxygen atmosphere. Once had a larger ecosystem before an orbital shift. Now a lawless haven for outlaws.",
    colors: ["#88b4d0", "#4a7a8c"],
    atmosphere: "#06b6d430",
  },
  "Pyro IV": {
    type: "Terrestrial",
    description:
      "A warped, cratered world dotted with water-and-ammonia lakes. Collided with a planet-sized mass long ago and is now on a slow collision course with Pyro V.",
    colors: ["#9b7cb8", "#5c3d7a"],
    atmosphere: "#8b5cf630",
  },
  "Pyro V": {
    type: "Gas Giant",
    description:
      "The system's largest planet, a massive gas giant with a striking atmosphere swirled in shades of green and yellow, resembling a mossy boulder in a black sea.",
    colors: ["#8fbc6a", "#4a7a30"],
    atmosphere: "#22c55e40",
  },
  Terminus: {
    type: "Terrestrial",
    description:
      "The outermost world in Pyro — a frigid, barely habitable planet with a methane-laced atmosphere. Home to Ruin Station, a notorious outlaw hub.",
    colors: ["#c878a0", "#7a3050"],
    atmosphere: "#ec489930",
  },
};

// ---------------------------------------------------------------------------
// Moons
// ---------------------------------------------------------------------------

export const MOON_INFO: Record<string, CelestialInfo> = {
  // Hurston moons
  Arial: {
    type: "Volcanic Moon",
    description:
      "A volcanically active moon of Hurston with a reddish-orange surface scarred by lava flows and geothermal vents.",
    colors: ["#d4654a", "#8b3a2a"],
  },
  Aberdeen: {
    type: "Toxic Moon",
    description:
      "A harsh, smog-covered moon named after Aberdeen Hurston. Home to the Klescher Rehabilitation Facility, Star Citizen's prison system.",
    colors: ["#b89a5a", "#6b5a30"],
  },
  Magda: {
    type: "Rocky Moon",
    description:
      "A barren, rocky moon of Hurston with a gray-brown surface and sparse terrain features.",
    colors: ["#8a7a6a", "#5a4a3a"],
  },
  Ita: {
    type: "Rocky Moon",
    description:
      "The smallest moon of Hurston with a rugged, cratered surface of dark gray rock.",
    colors: ["#6a6a6a", "#3a3a3a"],
  },

  // Crusader moons
  Cellin: {
    type: "Volcanic Moon",
    description:
      "A volcanically active moon of Crusader with a gray surface punctuated by geysers and lava flows. Home to several outposts.",
    colors: ["#9a8a7a", "#5a4a3a"],
  },
  Daymar: {
    type: "Desert Moon",
    description:
      "A dusty, arid moon of Crusader covered in sandy deserts and craggy rock formations. Popular for ground vehicle racing.",
    colors: ["#d4b88a", "#8a7040"],
  },
  Yela: {
    type: "Ice Moon",
    description:
      "An icy moon of Crusader with a frozen crust and a unique asteroid belt. Home to Grim HEX, a pirate-controlled former mining station.",
    colors: ["#c8d8e8", "#7a9ab8"],
  },

  // ArcCorp moons
  Wala: {
    type: "Rocky Moon",
    description:
      "A small, tidally-locked rocky moon of ArcCorp with a barren gray surface and minimal atmosphere.",
    colors: ["#808080", "#4a4a4a"],
  },
  Lyria: {
    type: "Ice Moon",
    description:
      "A frozen moon of ArcCorp covered in ice sheets and snow. Contains valuable mining deposits beneath its icy surface.",
    colors: ["#d0e0f0", "#8ab0d0"],
  },

  // MicroTech moons
  Calliope: {
    type: "Rocky Moon",
    description:
      "The first moon of microTech, named after the Greek muse. A rocky world with sparse ice patches and cratered terrain.",
    colors: ["#a0a8b0", "#606870"],
  },
  Clio: {
    type: "Ice Moon",
    description:
      "An icy moon of microTech with a white, frozen surface covered in glaciers and frost-covered plains.",
    colors: ["#d8e8f8", "#90b0d0"],
  },
  Euterpe: {
    type: "Ice Moon",
    description:
      "The smallest moon of microTech with a blue-white icy surface and thin atmosphere.",
    colors: ["#b0d0e8", "#6090b0"],
  },

  // Pyro V moons
  Ignis: {
    type: "Volcanic Moon",
    description:
      "A volcanic moon of Pyro V with a dark, molten surface marked by rivers of lava and volcanic eruptions.",
    colors: ["#c44020", "#5a1a0a"],
  },
  Vatra: {
    type: "Rocky Moon",
    description:
      "A rugged, rocky moon of Pyro V with a reddish-brown surface of craters and ridges.",
    colors: ["#a06040", "#5a3020"],
  },
  Adir: {
    type: "Rocky Moon",
    description:
      "A barren moon of Pyro V with a dark, dusty surface and scattered impact craters.",
    colors: ["#7a6a5a", "#3a3020"],
  },
  Fairo: {
    type: "Rocky Moon",
    description:
      "A small, pale moon of Pyro V with a sandy, windswept surface.",
    colors: ["#c0a878", "#7a6838"],
  },
  Fuego: {
    type: "Volcanic Moon",
    description:
      "A geothermally active moon of Pyro V with a scorched surface and persistent volcanic activity.",
    colors: ["#d05030", "#6a2010"],
  },
  Vuur: {
    type: "Rocky Moon",
    description:
      "The outermost moon of Pyro V with a cold, dark, cratered surface of charcoal-gray rock.",
    colors: ["#5a5a5a", "#2a2a2a"],
  },
};
