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
    atmosphere: "#14241a",
    layout: "organic",
    props: "trees",
    palette: {
      ground: "#3f8f4a",
      path: "#c2a878",
      water: "#3a7ca5",
      accent: "#6a8f4a",
      wall: "#5a6a48",
      flower: "#d4a0c8",
      structure: "#6e7580",
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
    atmosphere: "#152028",
    layout: "grid",
    props: "stalls",
    palette: {
      ground: "#9aa3ad",
      path: "#4a4f58",
      water: "#3a7ca5",
      accent: "#c9b896",
      wall: "#6e7580",
      flower: "#b85c4a",
      structure: "#4a6f9a",
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
    atmosphere: "#1a1618",
    layout: "ring",
    props: "ruins",
    palette: {
      ground: "#8b909a",
      path: "#c9b896",
      water: "#3d7a72",
      accent: "#7a6a4e",
      wall: "#4a4f58",
      flower: "#c4a882",
      structure: "#b85c4a",
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
    atmosphere: "#2a2218",
    layout: "island",
    props: "rocks",
    palette: {
      ground: "#c2b280",
      path: "#a89060",
      water: "#4a88a8",
      accent: "#d4b878",
      wall: "#8b6a4a",
      flower: "#e07a6a",
      structure: "#b85c4a",
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
    atmosphere: "#0c1016",
    layout: "caves",
    props: "crystals",
    palette: {
      ground: "#3d4550",
      path: "#4a4f58",
      water: "#2a5f78",
      accent: "#5a6a7a",
      wall: "#1c222b",
      flower: "#7b5ea7",
      structure: "#5a6a7a",
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
    atmosphere: "#1a2030",
    layout: "ridge",
    props: "rocks",
    palette: {
      ground: "#6e7580",
      path: "#9aa3ad",
      water: "#4a6f9a",
      accent: "#5a6a48",
      wall: "#3d4550",
      flower: "#9ad0c2",
      structure: "#6e7580",
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
    atmosphere: "#1a1820",
    layout: "ring",
    props: "trees",
    palette: {
      ground: "#6a8f5a",
      path: "#c9b896",
      water: "#5a9aaa",
      accent: "#8b6a45",
      wall: "#6e7580",
      flower: "#d4a0c8",
      structure: "#7b5ea7",
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
    atmosphere: "#221612",
    layout: "grid",
    props: "stalls",
    palette: {
      ground: "#7a6a4e",
      path: "#4a4f58",
      water: "#3d7a72",
      accent: "#c45c48",
      wall: "#5a4636",
      flower: "#f0c14a",
      structure: "#b85c4a",
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
    atmosphere: "#14201c",
    layout: "organic",
    props: "mixed",
    palette: {
      ground: "#4a6f4a",
      path: "#7a6a4e",
      water: "#2f6a6a",
      accent: "#5a6a48",
      wall: "#3d4550",
      flower: "#9ad0c2",
      structure: "#6e7580",
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
    atmosphere: "#161028",
    layout: "ridge",
    props: "crystals",
    palette: {
      ground: "#5a6a7a",
      path: "#9aa3ad",
      water: "#4a6f9a",
      accent: "#7b5ea7",
      wall: "#3d4550",
      flower: "#c4a0e8",
      structure: "#7b5ea7",
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
