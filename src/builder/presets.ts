import {
  BrickModel,
  type BrickModelData,
  type Brick,
} from "../engine/render/BrickModel";

/**
 * Ultra-fine voxel cell (¼ classic Lego / half of prior 8px pass).
 * World footprint stays similar when presets use ~2× grid extents.
 */
export const FINE_BRICK = {
  tileWidth: 4,
  tileHeight: 2,
  brickHeight: 4,
} as const;

function pack(id: string, name: string, bricks: Brick[]): BrickModelData {
  return { id, name, bricks, ...FINE_BRICK };
}

function push(bricks: Brick[], x: number, y: number, z: number, color: string): void {
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

/** Shell walls only — denser facades without filling solid interiors. */
function shellBox(
  bricks: Brick[],
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  color: string,
  shadeColor?: string,
): void {
  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const face =
          x === x0 || x === x1 || z === z0 || z === z1 || y === y0 || y === y1;
        if (!face) continue;
        const edge = x === x1 || z === z1;
        push(bricks, x, y, z, edge && shadeColor ? shadeColor : color);
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

    // Trunk 3×3 × 14 — was 2×2×7 at 8px
    for (let y = 0; y < 14; y++) {
      for (let x = 0; x <= 2; x++) {
        for (let z = 0; z <= 2; z++) {
          if ((x === 0 || x === 2) && (z === 0 || z === 2) && y > 2) continue;
          const c = (x + z + y) % 2 === 0 ? barkHi : bark;
          push(bricks, x, y, z, y < 3 ? barkDeep : c);
        }
      }
    }

    // Canopy — denser layers, thinned outer ring for perf
    const canopy: Array<{ y: number; r: number; colors: string[] }> = [
      { y: 12, r: 3, colors: [leafDark, leafDeep] },
      { y: 13, r: 4, colors: [leafDark, leaf] },
      { y: 14, r: 5, colors: [leaf, leafDark] },
      { y: 15, r: 5, colors: [leafHi, leaf] },
      { y: 16, r: 5, colors: [leaf, leafHi] },
      { y: 17, r: 5, colors: [leaf, leafDark] },
      { y: 18, r: 4, colors: [leafDark, leaf] },
      { y: 19, r: 4, colors: [leaf, leafHi] },
      { y: 20, r: 3, colors: [leafDark, leaf] },
      { y: 21, r: 2, colors: [leafHi, leaf] },
      { y: 22, r: 2, colors: [leafDark] },
      { y: 23, r: 1, colors: [leafHi] },
    ];
    const cx = 1;
    const cz = 1;
    for (const layer of canopy) {
      for (let x = cx - layer.r; x <= cx + layer.r; x++) {
        for (let z = cz - layer.r; z <= cz + layer.r; z++) {
          const dist = Math.abs(x - cx) + Math.abs(z - cz);
          if (dist > layer.r) continue;
          if (dist === layer.r && (x + z + layer.y) % 2 === 0) continue;
          if (dist > layer.r - 1 && (x * 3 + z * 5 + layer.y) % 4 === 0) continue;
          const ci = Math.abs(x * 3 + z * 7 + layer.y) % layer.colors.length;
          push(bricks, x, layer.y, z, layer.colors[ci]!);
        }
      }
    }
    push(bricks, 1, 24, 1, leafHi);
    push(bricks, 0, 24, 1, leaf);
    push(bricks, 2, 24, 1, leaf);
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
    const scarf = "#c45c48";

    fillBox(bricks, 0, 0, 0, 2, 1, 2, boot);
    fillBox(bricks, 0, 2, 0, 2, 6, 2, pants);
    fillBox(bricks, 0, 7, 0, 2, 13, 2, tunic);
    fillBox(bricks, 0, 12, 0, 2, 12, 2, tunicHi);
    fillBox(bricks, 0, 9, 0, 2, 9, 2, belt);
    fillBox(bricks, 1, 10, 0, 1, 10, 0, scarf);
    fillBox(bricks, -2, 7, 0, -1, 13, 2, cloak);
    fillBox(bricks, 3, 7, 0, 4, 13, 2, cloak);
    fillBox(bricks, -2, 11, 0, -1, 14, 1, tunic);
    fillBox(bricks, 3, 11, 1, 4, 14, 2, tunic);
    push(bricks, -2, 14, 0, skin);
    push(bricks, 4, 14, 2, skin);
    fillBox(bricks, 0, 14, 0, 2, 18, 2, skin);
    push(bricks, 0, 14, 0, skinShade);
    fillBox(bricks, 0, 18, 0, 2, 20, 2, hair);
    push(bricks, -1, 18, 0, hair);
    push(bricks, 3, 18, 2, hair);
    return pack("hero", "Brick Hero", bricks);
  },

  rock: () => {
    const bricks: Brick[] = [];
    const c = "#8a929e";
    const d = "#6a727c";
    const e = "#a8b0bc";
    const moss = "#4a7a48";
    // Irregular boulder ~2× prior footprint
    for (let y = 0; y <= 6; y++) {
      const r = y === 0 ? 3 : y < 3 ? 3 : y < 5 ? 2 : 1;
      for (let x = 0; x <= r + 1; x++) {
        for (let z = 0; z <= r; z++) {
          const dist = Math.abs(x - 2) + Math.abs(z - 1);
          if (dist > r + (y === 0 ? 1 : 0)) continue;
          if ((x + z + y) % 5 === 0 && dist >= r) continue;
          let color = c;
          if ((x + z) % 3 === 0) color = d;
          if (dist === 0 && y > 1) color = e;
          if (y >= 2 && (x + z * 2) % 7 === 0) color = moss;
          push(bricks, x, y, z, color);
        }
      }
    }
    return pack("rock", "Rock", bricks);
  },

  crate: () => {
    const bricks: Brick[] = [];
    const wood = "#9a6e3e";
    const woodDark = "#6e4a28";
    const woodHi = "#c49050";
    const band = "#5a4030";
    const nail = "#3a2820";
    shellBox(bricks, 0, 0, 0, 6, 5, 4, wood, woodDark);
    fillBox(bricks, 0, 0, 0, 6, 0, 4, woodDark);
    fillBox(bricks, 0, 5, 0, 6, 5, 4, woodHi);
    for (let y = 0; y <= 5; y++) {
      push(bricks, 2, y, 0, band);
      push(bricks, 4, y, 0, band);
      push(bricks, 2, y, 4, band);
      push(bricks, 4, y, 4, band);
      push(bricks, 0, y, 2, band);
      push(bricks, 6, y, 2, band);
    }
    push(bricks, 1, 5, 1, nail);
    push(bricks, 5, 5, 3, nail);
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
    const goods = "#e8d080";

    for (const [x, z] of [
      [0, 0],
      [1, 0],
      [10, 0],
      [11, 0],
      [0, 6],
      [1, 6],
      [10, 6],
      [11, 6],
    ] as const) {
      for (let y = 0; y < 12; y++) push(bricks, x, y, z, post);
    }
    fillBox(bricks, 0, 4, 0, 11, 5, 6, counter);
    fillBox(bricks, 2, 5, 2, 9, 5, 4, counterHi);
    fillBox(bricks, 0, 6, 6, 11, 9, 6, shelf);
    // Goods on shelf
    for (const [x, y] of [
      [2, 7],
      [4, 7],
      [6, 8],
      [8, 7],
    ] as const) {
      push(bricks, x, y, 6, goods);
      push(bricks, x + 1, y, 6, goods);
    }
    // Striped awning
    for (let x = 0; x <= 11; x++) {
      for (let z = 0; z <= 6; z++) {
        const stripe = Math.floor(x / 2) % 2 === 0 ? cloth : clothHi;
        push(bricks, x, 12, z, stripe);
        if (z <= 1) push(bricks, x, 11, z, clothDark);
      }
    }
    for (let x = 2; x <= 9; x++) {
      push(bricks, x, 13, 2, cloth);
      push(bricks, x, 14, 3, Math.floor(x / 2) % 2 === 0 ? clothHi : cloth);
    }
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
    const doorHi = "#7a5438";
    const window = "#3a6aaa";
    const windowHi = "#6a9ad0";
    const trim = "#6e5438";
    const sill = "#8b6a45";

    // ~2× prior footprint, shell walls
    shellBox(bricks, 0, 0, 0, 11, 9, 8, wall, wallShade);
    fillBox(bricks, 0, 0, 0, 11, 0, 8, wallShade);
    // Door with frame
    fillBox(bricks, 4, 0, 0, 7, 5, 0, door);
    fillBox(bricks, 5, 1, 0, 6, 4, 0, doorHi);
    push(bricks, 6, 3, 0, "#c49050");
    // Windows with sills + panes
    for (const wx of [1, 9]) {
      fillBox(bricks, wx, 4, 0, wx + 1, 6, 0, window);
      push(bricks, wx, 5, 0, windowHi);
      push(bricks, wx + 1, 5, 0, window);
      fillBox(bricks, wx, 3, 0, wx + 1, 3, 0, sill);
    }
    // Side windows
    fillBox(bricks, 0, 4, 3, 0, 6, 4, window);
    fillBox(bricks, 11, 4, 3, 11, 6, 5, window);
    fillBox(bricks, 0, 9, 0, 11, 9, 8, trim);
    // Pitched roof
    for (let layer = 0; layer < 7; layer++) {
      const inset = Math.floor(layer / 1.2);
      const y = 10 + layer;
      for (let x = inset; x <= 11 - inset; x++) {
        for (let z = Math.max(0, inset - 1); z <= 8 - Math.max(0, inset - 1); z++) {
          const c = layer === 0 ? roofHi : layer >= 5 ? roofDark : roof;
          if ((x + z + layer) % 6 === 0 && layer > 0 && layer < 5) {
            push(bricks, x, y, z, roofDark);
          } else {
            push(bricks, x, y, z, c);
          }
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
    const d = "#e0c0ff";
    const base = "#3a4558";
    fillBox(bricks, 0, 0, 0, 4, 1, 4, base);
    const shards: Array<[number, number, number, number, string]> = [
      [2, 2, 2, 12, b],
      [1, 2, 2, 9, a],
      [3, 2, 2, 8, c],
      [2, 2, 1, 7, a],
      [2, 2, 3, 9, c],
      [0, 2, 2, 5, c],
      [4, 2, 2, 6, a],
      [1, 2, 1, 4, c],
      [3, 2, 3, 5, a],
      [2, 2, 0, 4, a],
      [2, 2, 4, 4, c],
    ];
    for (const [x, y0, z, h, color] of shards) {
      for (let y = y0; y < y0 + h; y++) {
        const tip = y === y0 + h - 1;
        push(bricks, x, y, z, tip ? d : color);
        if (!tip && y % 3 === 0) push(bricks, x, y, z, b);
      }
    }
    return pack("crystal", "Crystal", bricks);
  },

  column: () => {
    const bricks: Brick[] = [];
    const stone = "#8a929e";
    const stoneDark = "#6a727c";
    const stoneHi = "#b0b8c4";
    const crack = "#555c66";
    fillBox(bricks, 0, 0, 0, 3, 1, 3, stoneDark);
    for (let y = 2; y <= 14; y++) {
      fillBox(bricks, 1, y, 1, 2, y, 2, stone);
      if (y % 4 === 0) {
        push(bricks, 1, y, 1, stoneDark);
        push(bricks, 2, y, 2, crack);
      }
    }
    fillBox(bricks, 0, 15, 0, 3, 16, 3, stoneHi);
    push(bricks, -1, 16, 1, stoneHi);
    push(bricks, 4, 16, 2, stoneHi);
    push(bricks, 1, 16, -1, stone);
    push(bricks, 2, 16, 4, stone);
    return pack("column", "Column", bricks);
  },
};

export function loadPreset(name: string): BrickModel {
  const factory = PRESETS[name] ?? PRESETS.empty!;
  return BrickModel.fromJSON(factory());
}
