import {
  BrickModel,
  type BrickModelData,
  type Brick,
} from "../engine/render/BrickModel";

/** Half the classic Lego cell — denser voxel grid for props/characters. */
export const FINE_BRICK = {
  tileWidth: 8,
  tileHeight: 4,
  brickHeight: 8,
} as const;

function pack(
  id: string,
  name: string,
  bricks: Brick[],
): BrickModelData {
  return { id, name, bricks, ...FINE_BRICK };
}

function push(
  bricks: Brick[],
  x: number,
  y: number,
  z: number,
  color: string,
): void {
  bricks.push({ x, y, z, color });
}

function fillBox(
  bricks: Brick[],
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  color: string,
  skip?: (x: number, y: number, z: number) => boolean,
): void {
  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        if (skip?.(x, y, z)) continue;
        push(bricks, x, y, z, color);
      }
    }
  }
}

/** Starter kits for the brick builder + in-game props. */
export const PRESETS: Record<string, () => BrickModelData> = {
  empty: () => pack("empty", "Empty", []),

  tree: () => {
    const bricks: Brick[] = [];
    const bark = "#6e4424";
    const barkHi = "#8b5a2b";
    const barkDeep = "#4a2e18";
    const leaf = "#3fa85a";
    const leafHi = "#5ccc72";
    const leafDark = "#2a7040";
    const leafDeep = "#1e5030";

    // Dense trunk (2×2 column)
    for (let y = 0; y < 7; y++) {
      for (const [x, z] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ] as const) {
        const c = (x + z + y) % 2 === 0 ? barkHi : bark;
        push(bricks, x, y, z, y < 2 ? barkDeep : c);
      }
    }

    // Layered canopy — irregular silhouette
    const canopy: Array<{ y: number; r: number; colors: string[] }> = [
      { y: 6, r: 2, colors: [leafDark, leafDeep] },
      { y: 7, r: 3, colors: [leaf, leafDark] },
      { y: 8, r: 3, colors: [leafHi, leaf] },
      { y: 9, r: 3, colors: [leaf, leafHi] },
      { y: 10, r: 2, colors: [leaf, leafDark] },
      { y: 11, r: 2, colors: [leafDark, leaf] },
      { y: 12, r: 1, colors: [leafHi, leaf] },
      { y: 13, r: 1, colors: [leafDark] },
    ];
    for (const layer of canopy) {
      for (let x = -layer.r; x <= layer.r + 1; x++) {
        for (let z = -layer.r; z <= layer.r + 1; z++) {
          const dx = x - 0.5;
          const dz = z - 0.5;
          const dist = Math.abs(dx) + Math.abs(dz);
          if (dist > layer.r + 0.6) continue;
          if (dist > layer.r - 0.2 && (x + z + layer.y) % 3 === 0) continue;
          const ci = Math.abs(x * 3 + z * 7 + layer.y) % layer.colors.length;
          push(bricks, x, layer.y, z, layer.colors[ci]!);
        }
      }
    }
    push(bricks, 0, 14, 0, leafHi);
    push(bricks, 1, 14, 0, leaf);
    return pack("tree", "Pixel Tree", bricks);
  },

  hero: () => {
    const bricks: Brick[] = [];
    const skin = "#f0c9a0";
    const skinShade = "#d4a078";
    const tunic = "#3d6b5c";
    const tunicHi = "#5a9a82";
    const pants = "#2c3448";
    const boot = "#3a2820";
    const hair = "#2a1e28";
    const cloak = "#245068";
    const belt = "#c49050";

    // Boots + legs
    fillBox(bricks, 0, 0, 0, 1, 0, 1, boot);
    fillBox(bricks, 0, 1, 0, 1, 3, 1, pants);
    // Torso
    fillBox(bricks, 0, 4, 0, 1, 7, 1, tunic);
    push(bricks, 0, 7, 0, tunicHi);
    push(bricks, 1, 7, 1, tunicHi);
    // Belt
    fillBox(bricks, 0, 5, 0, 1, 5, 1, belt);
    // Cloak flaps
    fillBox(bricks, -1, 4, 0, -1, 7, 1, cloak);
    fillBox(bricks, 2, 4, 0, 2, 7, 1, cloak);
    // Arms
    fillBox(bricks, -1, 6, 0, -1, 8, 0, tunic);
    fillBox(bricks, 2, 6, 1, 2, 8, 1, tunic);
    push(bricks, -1, 8, 0, skin);
    push(bricks, 2, 8, 1, skin);
    // Head
    fillBox(bricks, 0, 8, 0, 1, 10, 1, skin);
    push(bricks, 0, 8, 0, skinShade);
    // Hair
    fillBox(bricks, 0, 10, 0, 1, 11, 1, hair);
    push(bricks, -1, 10, 0, hair);
    push(bricks, 2, 10, 1, hair);
    return pack("hero", "Brick Hero", bricks);
  },

  rock: () => {
    const bricks: Brick[] = [];
    const c = "#8a929e";
    const d = "#6a727c";
    const e = "#a8b0bc";
    const moss = "#4a7a48";
    const shape: Array<[number, number, number, string]> = [
      [0, 0, 0, c],
      [1, 0, 0, c],
      [2, 0, 0, d],
      [0, 0, 1, c],
      [1, 0, 1, e],
      [2, 0, 1, c],
      [1, 0, 2, d],
      [2, 0, 2, c],
      [0, 1, 0, d],
      [1, 1, 0, c],
      [2, 1, 0, d],
      [0, 1, 1, c],
      [1, 1, 1, e],
      [1, 1, 2, moss],
      [2, 1, 1, d],
      [1, 2, 0, d],
      [1, 2, 1, c],
      [0, 2, 1, moss],
      [1, 3, 1, d],
    ];
    for (const [x, y, z, color] of shape) push(bricks, x, y, z, color);
    return pack("rock", "Rock", bricks);
  },

  crate: () => {
    const bricks: Brick[] = [];
    const wood = "#9a6e3e";
    const woodDark = "#6e4a28";
    const woodHi = "#c49050";
    const band = "#5a4030";
    fillBox(bricks, 0, 0, 0, 3, 2, 2, wood);
    fillBox(bricks, 0, 0, 0, 3, 0, 2, woodDark);
    fillBox(bricks, 0, 2, 0, 3, 2, 2, woodHi);
    // Straps
    for (let y = 0; y <= 2; y++) {
      push(bricks, 1, y, 0, band);
      push(bricks, 1, y, 2, band);
      push(bricks, 0, y, 1, band);
      push(bricks, 3, y, 1, band);
    }
    return pack("crate", "Crate", bricks);
  },

  stall: () => {
    const bricks: Brick[] = [];
    const post = "#5a3e28";
    const cloth = "#c44a3a";
    const clothHi = "#e07060";
    const clothDark = "#8a3028";
    const counter = "#8b6a45";
    const counterHi = "#b89060";
    const shelf = "#6e5438";

    // Posts
    for (const [x, z] of [
      [0, 0],
      [5, 0],
      [0, 3],
      [5, 3],
    ] as const) {
      for (let y = 0; y < 6; y++) push(bricks, x, y, z, post);
    }
    // Counter
    fillBox(bricks, 0, 2, 0, 5, 2, 3, counter);
    fillBox(bricks, 1, 2, 1, 4, 2, 2, counterHi);
    // Back shelf
    fillBox(bricks, 0, 3, 3, 5, 4, 3, shelf);
    // Awning
    for (let x = 0; x <= 5; x++) {
      for (let z = 0; z <= 3; z++) {
        const stripe = (x + z) % 2 === 0 ? cloth : clothHi;
        push(bricks, x, 6, z, stripe);
        if (z === 0) push(bricks, x, 5, z, clothDark);
      }
    }
    // Awning peak fringe
    for (let x = 1; x <= 4; x++) push(bricks, x, 7, 1, cloth);
    return pack("stall", "Market Stall", bricks);
  },

  house: () => {
    const bricks: Brick[] = [];
    const wall = "#c9b896";
    const wallShade = "#a89070";
    const roof = "#c44a3a";
    const roofDark = "#8a3028";
    const roofHi = "#e07060";
    const door = "#5a3e28";
    const window = "#3a6aaa";
    const trim = "#6e5438";

    // Walls 6×5×6
    fillBox(bricks, 0, 0, 0, 5, 4, 4, wall, (x, y, z) => {
      // Hollow interior
      return x > 0 && x < 5 && z > 0 && z < 4 && y > 0 && y < 4;
    });
    // Shade right/south edges
    for (let y = 0; y <= 4; y++) {
      for (let z = 0; z <= 4; z++) push(bricks, 5, y, z, wallShade);
    }
    // Door
    fillBox(bricks, 2, 0, 0, 3, 2, 0, door);
    // Windows
    push(bricks, 1, 2, 0, window);
    push(bricks, 4, 2, 0, window);
    push(bricks, 1, 3, 0, window);
    push(bricks, 4, 3, 0, window);
    // Trim line
    fillBox(bricks, 0, 4, 0, 5, 4, 4, trim);
    // Pitched roof layers
    for (let layer = 0; layer < 4; layer++) {
      const inset = layer;
      const y = 5 + layer;
      for (let x = inset; x <= 5 - inset; x++) {
        for (let z = Math.max(0, inset - 1); z <= 4 - Math.max(0, inset - 1); z++) {
          const c = layer === 0 ? roofHi : layer === 3 ? roofDark : roof;
          push(bricks, x, y, z, c);
        }
      }
    }
    return pack("house", "Town House", bricks);
  },

  crystal: () => {
    const bricks: Brick[] = [];
    const a = "#8a5eb8";
    const b = "#c890f0";
    const c = "#5a3e88";
    const base = "#3a4558";
    fillBox(bricks, 0, 0, 0, 2, 0, 2, base);
    const shards: Array<[number, number, number, number, string]> = [
      [1, 1, 1, 6, b],
      [0, 1, 1, 4, a],
      [2, 1, 1, 3, c],
      [1, 1, 0, 3, a],
      [1, 1, 2, 4, c],
      [0, 1, 0, 2, c],
      [2, 1, 2, 2, a],
    ];
    for (const [x, y0, z, h, color] of shards) {
      for (let y = y0; y < y0 + h; y++) {
        push(bricks, x, y, z, y === y0 + h - 1 ? b : color);
      }
    }
    return pack("crystal", "Crystal", bricks);
  },

  column: () => {
    const bricks: Brick[] = [];
    const stone = "#8a929e";
    const stoneDark = "#6a727c";
    const stoneHi = "#b0b8c4";
    fillBox(bricks, 0, 0, 0, 1, 0, 1, stoneDark);
    fillBox(bricks, 0, 1, 0, 1, 6, 1, stone);
    fillBox(bricks, 0, 7, 0, 1, 7, 1, stoneHi);
    push(bricks, -1, 7, 0, stoneHi);
    push(bricks, 2, 7, 1, stoneHi);
    push(bricks, 0, 7, -1, stone);
    push(bricks, 1, 7, 2, stone);
    return pack("column", "Column", bricks);
  },
};

export function loadPreset(name: string): BrickModel {
  const factory = PRESETS[name] ?? PRESETS.empty!;
  return BrickModel.fromJSON(factory());
}
