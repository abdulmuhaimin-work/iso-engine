import type { TileDef } from "../engine";

export type LayoutStyle =
  | "organic"
  | "grid"
  | "caves"
  | "island"
  | "ring"
  | "ridge";

export type PropStyle = "trees" | "rocks" | "ruins" | "stalls" | "crystals" | "mixed";

export interface ThemePalette {
  ground: string;
  path: string;
  water: string;
  accent: string;
  wall: string;
  flower: string;
  structure: string;
}

export interface SceneTheme {
  id: string;
  /** Display name fragments used when naming places. */
  nameParts: string[];
  atmosphere: string;
  layout: LayoutStyle;
  props: PropStyle;
  palette: ThemePalette;
  /** Optional NPC name pool. */
  npcNames: string[];
  /** Flavor lines for NPCs / signs. */
  lines: string[];
  /** Inspectable object names. */
  relics: string[];
  hasWaterBias: number;
  elevationBias: number;
}

/** Tile ids used by the procedural map builder. */
export const PT = {
  ground: 1,
  path: 2,
  water: 3,
  wall: 4,
  flower: 5,
  structure: 6,
  dirt: 7,
} as const;

export function themeTileDefs(theme: SceneTheme): Record<number, TileDef> {
  const p = theme.palette;
  return {
    [PT.ground]: {
      id: PT.ground,
      name: theme.id.includes("cave") || theme.id.includes("ruin") ? "stone" : "grass",
      color: p.ground,
      walkable: true,
    },
    [PT.path]: {
      id: PT.path,
      name: "path",
      color: p.path,
      walkable: true,
    },
    [PT.water]: {
      id: PT.water,
      name: "water",
      color: p.water,
      walkable: false,
    },
    [PT.wall]: {
      id: PT.wall,
      name: theme.layout === "caves" ? "cave wall" : "stone",
      color: p.wall,
      walkable: false,
      elevation: theme.layout === "caves" ? 14 : 10,
    },
    [PT.flower]: {
      id: PT.flower,
      name: "flower",
      color: p.flower,
      walkable: true,
    },
    [PT.structure]: {
      id: PT.structure,
      name: "building",
      color: p.structure,
      walkable: false,
    },
    [PT.dirt]: {
      id: PT.dirt,
      name: "dirt",
      color: p.accent,
      walkable: true,
    },
  };
}

export const THEMES: SceneTheme[] = [
  {
    id: "emerald_grove",
    nameParts: ["Grove", "Glade", "Thicket", "Canopy"],
    atmosphere: "#102018",
    layout: "organic",
    props: "trees",
    palette: {
      ground: "#2f9a48",
      path: "#d4b078",
      water: "#2e8ec4",
      accent: "#5a9a42",
      wall: "#4a6a40",
      flower: "#e878b8",
      structure: "#667088",
    },
    npcNames: ["Willow", "Ash", "Bramble", "Moss"],
    lines: [
      "The canopy keeps its own weather.",
      "Follow the pale stones — they remember the old road.",
      "Something large moved past here at dawn.",
    ],
    relics: ["Mossy shrine", "Fallen nest", "Root carving"],
    hasWaterBias: 0.55,
    elevationBias: 0.25,
  },
  {
    id: "canal_quarter",
    nameParts: ["Canal", "Quay", "Wharf", "Basin"],
    atmosphere: "#101820",
    layout: "grid",
    props: "stalls",
    palette: {
      ground: "#9aa6b4",
      path: "#3e4450",
      water: "#2e8ec4",
      accent: "#d8c090",
      wall: "#667088",
      flower: "#c44a3a",
      structure: "#3a6aaa",
    },
    npcNames: ["Mira", "Dockhand", "Vendor", "Courier"],
    lines: [
      "Tide charts say the next bridge is safer at dusk.",
      "Parcels for the north quay — watch your step.",
      "Fresh maps, cheap rumors.",
    ],
    relics: ["Locked crate", "Harbor bell", "Tide ledger"],
    hasWaterBias: 0.9,
    elevationBias: 0.1,
  },
  {
    id: "sunken_ruins",
    nameParts: ["Ruins", "Forum", "Arch", "Vault"],
    atmosphere: "#181218",
    layout: "ring",
    props: "ruins",
    palette: {
      ground: "#7e8694",
      path: "#d4b878",
      water: "#2e8a7a",
      accent: "#8a6e48",
      wall: "#3e4450",
      flower: "#d8c090",
      structure: "#c44a3a",
    },
    npcNames: ["Archivist", "Scout", "Warden", "Pilgrim"],
    lines: [
      "These stones predate the harbor maps.",
      "Do not sit on the broken columns — they still listen.",
      "A mural under the dust shows a star chart.",
    ],
    relics: ["Broken column", "Weathered relief", "Sealed urn"],
    hasWaterBias: 0.4,
    elevationBias: 0.45,
  },
  {
    id: "dune_oasis",
    nameParts: ["Oasis", "Dunes", "Well", "Mirage"],
    atmosphere: "#241a10",
    layout: "island",
    props: "rocks",
    palette: {
      ground: "#d4c070",
      path: "#b89850",
      water: "#3a90b8",
      accent: "#e0c878",
      wall: "#9a6e48",
      flower: "#e07060",
      structure: "#c44a3a",
    },
    npcNames: ["Caravaner", "Guide", "Nomad", "Keeper"],
    lines: [
      "Shade is currency out here.",
      "The well is honest — the mirages are not.",
      "Sand remembers every campfire.",
    ],
    relics: ["Sun-bleached chest", "Travel shrine", "Buried amphora"],
    hasWaterBias: 0.7,
    elevationBias: 0.2,
  },
  {
    id: "basalt_caves",
    nameParts: ["Cave", "Grotto", "Depths", "Hollow"],
    atmosphere: "#080c14",
    layout: "caves",
    props: "crystals",
    palette: {
      ground: "#3a4558",
      path: "#454a56",
      water: "#246888",
      accent: "#5a7088",
      wall: "#10161e",
      flower: "#8a5eb8",
      structure: "#5a7088",
    },
    npcNames: ["Hermit", "Miner", "Echo", "Lantern"],
    lines: [
      "Mind the drop — the dark has more than one floor.",
      "Crystal seams hum when you walk past.",
      "Someone left a lamp burning for no one.",
    ],
    relics: ["Crystal node", "Abandoned pick", "Echo shrine"],
    hasWaterBias: 0.35,
    elevationBias: 0.55,
  },
  {
    id: "mist_ridge",
    nameParts: ["Ridge", "Pass", "Overlook", "Crest"],
    atmosphere: "#141c2c",
    layout: "ridge",
    props: "rocks",
    palette: {
      ground: "#667088",
      path: "#a8b0bc",
      water: "#3a6aaa",
      accent: "#4a6a40",
      wall: "#3a4558",
      flower: "#7ad8c4",
      structure: "#667088",
    },
    npcNames: ["Lookout", "Shepherd", "Cartographer", "Wind"],
    lines: [
      "From here you can see three weather systems at once.",
      "The pass only opens when the mist lifts.",
      "Leave a stone on the cairn — travelers keep count.",
    ],
    relics: ["Cairn", "Wind flag", "Survey stake"],
    hasWaterBias: 0.25,
    elevationBias: 0.75,
  },
  {
    id: "blossom_court",
    nameParts: ["Court", "Garden", "Pavilion", "Orchard"],
    atmosphere: "#18141e",
    layout: "ring",
    props: "trees",
    palette: {
      ground: "#4e9850",
      path: "#d4b878",
      water: "#4aa0b8",
      accent: "#9a6e3e",
      wall: "#667088",
      flower: "#e878b8",
      structure: "#8a5eb8",
    },
    npcNames: ["Gardener", "Poet", "Host", "Bell"],
    lines: [
      "Petals fall in the same pattern every evening.",
      "The pavilion is open to anyone who listens.",
      "Please do not step on the painted stones.",
    ],
    relics: ["Petal bowl", "Painted stone", "Garden bell"],
    hasWaterBias: 0.5,
    elevationBias: 0.15,
  },
  {
    id: "ember_market",
    nameParts: ["Market", "Bazaar", "Lantern", "Square"],
    atmosphere: "#1e100c",
    layout: "grid",
    props: "stalls",
    palette: {
      ground: "#8a6e48",
      path: "#3e4450",
      water: "#2e8a7a",
      accent: "#d44838",
      wall: "#5a3e28",
      flower: "#f0c040",
      structure: "#c44a3a",
    },
    npcNames: ["Merchant", "Cook", "Guard", "Jester"],
    lines: [
      "Lanterns stay lit until the last bargain is done.",
      "Try the spice stall — if you can find it twice.",
      "Night markets never use the same aisle twice.",
    ],
    relics: ["Spice chest", "Lantern post", "Bargain board"],
    hasWaterBias: 0.2,
    elevationBias: 0.2,
  },
  {
    id: "marsh_crossing",
    nameParts: ["Marsh", "Crossing", "Fen", "Reed"],
    atmosphere: "#101a16",
    layout: "organic",
    props: "mixed",
    palette: {
      ground: "#3e7a42",
      path: "#8a6e48",
      water: "#267070",
      accent: "#4a6a40",
      wall: "#3a4558",
      flower: "#7ad8c4",
      structure: "#667088",
    },
    npcNames: ["Boatman", "Heron", "Tracker", "Fog"],
    lines: [
      "Stay on the planks — the mud has opinions.",
      "Reeds hide more paths than they reveal.",
      "A lantern on the far bank means someone made it.",
    ],
    relics: ["Reed bundle", "Sunken boot", "Fog bell"],
    hasWaterBias: 0.85,
    elevationBias: 0.15,
  },
  {
    id: "crystal_terrace",
    nameParts: ["Terrace", "Spire", "Shard", "Hall"],
    atmosphere: "#120e24",
    layout: "ridge",
    props: "crystals",
    palette: {
      ground: "#5a7088",
      path: "#a8b0bc",
      water: "#3a6aaa",
      accent: "#8a5eb8",
      wall: "#3a4558",
      flower: "#c890f0",
      structure: "#8a5eb8",
    },
    npcNames: ["Seer", "Glassmith", "Acolyte", "Prism"],
    lines: [
      "Light bends strangely on the upper terrace.",
      "Do not chip the living crystal — it grows back angry.",
      "The hall below sings when it rains.",
    ],
    relics: ["Living shard", "Prism altar", "Tuning fork"],
    hasWaterBias: 0.3,
    elevationBias: 0.65,
  },
];

export function themeById(id: string): SceneTheme | undefined {
  return THEMES.find((t) => t.id === id);
}

export function pickTheme(rng: { pick<T>(items: readonly T[]): T }, avoidId?: string): SceneTheme {
  if (!avoidId) return rng.pick(THEMES);
  const others = THEMES.filter((t) => t.id !== avoidId);
  return rng.pick(others.length ? others : THEMES);
}

export function placeName(theme: SceneTheme, rng: { pick<T>(items: readonly T[]): T; int(a: number, b: number): number }): string {
  const part = rng.pick(theme.nameParts);
  const qualifiers = ["North", "South", "Old", "New", "Hidden", "Upper", "Lower", "Far"];
  if (rng.int(0, 1) === 0) return `${rng.pick(qualifiers)} ${part}`;
  return part;
}
