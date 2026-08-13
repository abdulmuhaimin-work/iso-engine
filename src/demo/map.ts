import type { TileDef, TileMapData } from "../engine";

export const TILE = {
  grass: 1,
  path: 2,
  water: 3,
  stone: 4,
  flower: 5,
  dirt: 6,
  caveFloor: 7,
  caveWall: 8,
  road: 9,
  sidewalk: 10,
  plaza: 11,
  roofRed: 12,
  roofBlue: 13,
  roofGray: 14,
  roofTeal: 15,
  sand: 16,
} as const;

export const TILE_DEFS: Record<number, TileDef> = {
  [TILE.grass]: {
    id: TILE.grass,
    name: "grass",
    color: "#4f8f5a",
    walkable: true,
  },
  [TILE.path]: {
    id: TILE.path,
    name: "path",
    color: "#c2a878",
    walkable: true,
  },
  [TILE.water]: {
    id: TILE.water,
    name: "water",
    color: "#3a7ca5",
    walkable: false,
  },
  [TILE.stone]: {
    id: TILE.stone,
    name: "stone",
    color: "#8b909a",
    walkable: false,
    elevation: 10,
  },
  [TILE.flower]: {
    id: TILE.flower,
    name: "flower",
    color: "#d4a0c8",
    walkable: true,
  },
  [TILE.dirt]: {
    id: TILE.dirt,
    name: "dirt",
    color: "#7a6a4e",
    walkable: true,
  },
  [TILE.caveFloor]: {
    id: TILE.caveFloor,
    name: "cave floor",
    color: "#3d4550",
    walkable: true,
  },
  [TILE.caveWall]: {
    id: TILE.caveWall,
    name: "cave wall",
    color: "#1c222b",
    walkable: false,
    elevation: 14,
  },
  [TILE.road]: {
    id: TILE.road,
    name: "road",
    color: "#4a4f58",
    walkable: true,
  },
  [TILE.sidewalk]: {
    id: TILE.sidewalk,
    name: "sidewalk",
    color: "#9aa3ad",
    walkable: true,
  },
  [TILE.plaza]: {
    id: TILE.plaza,
    name: "plaza",
    color: "#c9b896",
    walkable: true,
  },
  [TILE.roofRed]: {
    id: TILE.roofRed,
    name: "red roof",
    color: "#b85c4a",
    walkable: false,
  },
  [TILE.roofBlue]: {
    id: TILE.roofBlue,
    name: "blue roof",
    color: "#4a6f9a",
    walkable: false,
  },
  [TILE.roofGray]: {
    id: TILE.roofGray,
    name: "gray roof",
    color: "#6e7580",
    walkable: false,
  },
  [TILE.roofTeal]: {
    id: TILE.roofTeal,
    name: "teal roof",
    color: "#3d7a72",
    walkable: false,
  },
  [TILE.sand]: {
    id: TILE.sand,
    name: "sand",
    color: "#c2b280",
    walkable: true,
  },
};

const ROOFS = [TILE.roofRed, TILE.roofBlue, TILE.roofGray, TILE.roofTeal] as const;

/** Large harbor city (~48×48) with avenues, blocks, parks, and docks. */
export function createIslandMap(): TileMapData {
  const width = 48;
  const height = 48;
  const cells = width * height;
  const tiles = new Array(cells).fill(TILE.grass);
  const heights = new Array(cells).fill(0);
  const overlays = new Array(cells).fill(0);

  const idx = (x: number, y: number) => y * width + x;
  const inB = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height;

  const set = (x: number, y: number, id: number) => {
    if (!inB(x, y)) return;
    tiles[idx(x, y)] = id;
  };
  const setH = (x: number, y: number, h: number) => {
    if (!inB(x, y)) return;
    heights[idx(x, y)] = h;
  };
  const setO = (x: number, y: number, id: number) => {
    if (!inB(x, y)) return;
    overlays[idx(x, y)] = id;
  };
  const fill = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    id: number,
    h = 0,
  ) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        set(x, y, id);
        if (h > 0) setH(x, y, h);
      }
    }
  };

  // Harbor / water frame
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < 3; y++) set(x, y, TILE.water);
    for (let y = height - 4; y < height; y++) set(x, y, TILE.water);
  }
  for (let y = 0; y < height; y++) {
    set(0, y, TILE.water);
    set(1, y, TILE.water);
    set(width - 1, y, TILE.water);
    set(width - 2, y, TILE.water);
  }
  // South beach strip
  for (let x = 2; x < width - 2; x++) {
    set(x, height - 5, TILE.sand);
    set(x, height - 6, TILE.sand);
  }

  // Canal through mid-east
  for (let y = 8; y < height - 6; y++) {
    set(34, y, TILE.water);
    set(35, y, TILE.water);
  }
  // Canal bridges
  for (const by of [12, 20, 28, 36]) {
    set(34, by, TILE.road);
    set(35, by, TILE.road);
    set(34, by + 1, TILE.road);
    set(35, by + 1, TILE.road);
  }

  // Avenue grid (every 8 tiles, 2 tiles wide)
  const avenues = [4, 12, 20, 28, 36, 42];
  for (const ax of avenues) {
    for (let y = 4; y < height - 5; y++) {
      if (tiles[idx(ax, y)] === TILE.water) continue;
      set(ax, y, TILE.road);
      if (ax + 1 < width - 2 && tiles[idx(ax + 1, y)] !== TILE.water) {
        set(ax + 1, y, TILE.road);
      }
    }
  }
  for (const ay of avenues) {
    for (let x = 2; x < width - 2; x++) {
      if (tiles[idx(x, ay)] === TILE.water) continue;
      set(x, ay, TILE.road);
      if (ay + 1 < height - 4 && tiles[idx(x, ay + 1)] !== TILE.water) {
        set(x, ay + 1, TILE.road);
      }
    }
  }

  // Sidewalks beside roads
  for (let y = 3; y < height - 4; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (tiles[idx(x, y)] !== TILE.grass) continue;
      const nearRoad =
        (inB(x - 1, y) && tiles[idx(x - 1, y)] === TILE.road) ||
        (inB(x + 1, y) && tiles[idx(x + 1, y)] === TILE.road) ||
        (inB(x, y - 1) && tiles[idx(x, y - 1)] === TILE.road) ||
        (inB(x, y + 1) && tiles[idx(x, y + 1)] === TILE.road);
      if (nearRoad) set(x, y, TILE.sidewalk);
    }
  }

  // Central plaza
  fill(18, 18, 25, 25, TILE.plaza);
  fill(20, 20, 23, 23, TILE.plaza);
  setO(21, 21, TILE.flower);
  setO(22, 22, TILE.flower);

  // NW park (keep grass, sprinkle flowers, low hills)
  for (let y = 5; y <= 10; y++) {
    for (let x = 5; x <= 10; x++) {
      if (tiles[idx(x, y)] === TILE.road) continue;
      set(x, y, TILE.grass);
      if ((x + y) % 3 === 0) setO(x, y, TILE.flower);
    }
  }
  setH(7, 7, 1);
  setH(8, 7, 1);
  setH(7, 8, 1);

  // NE terrace overlook
  fill(38, 5, 44, 10, TILE.dirt, 0);
  for (let y = 5; y <= 9; y++) {
    for (let x = 39; x <= 43; x++) setH(x, y, 2);
  }
  for (let x = 38; x <= 44; x++) {
    set(x, 10, TILE.dirt);
    setH(x, 10, 1);
  }
  for (let y = 5; y <= 9; y++) {
    set(38, y, TILE.dirt);
    setH(38, y, 1);
  }

  // Building footprints inside blocks
  let buildingSeed = 0;
  const placeBuilding = (
    x0: number,
    y0: number,
    bw: number,
    bh: number,
    floors: number,
  ) => {
    const roof = ROOFS[buildingSeed++ % ROOFS.length]!;
    for (let y = y0; y < y0 + bh; y++) {
      for (let x = x0; x < x0 + bw; x++) {
        if (!inB(x, y)) continue;
        const t = tiles[idx(x, y)];
        if (t === TILE.road || t === TILE.water || t === TILE.plaza) continue;
        set(x, y, roof);
        setH(x, y, floors);
      }
    }
  };

  // City blocks between avenues
  const blockStarts = [6, 14, 22, 30];
  for (const by of blockStarts) {
    for (const bx of blockStarts) {
      // Skip plaza core and canal column
      if (bx >= 18 && bx <= 24 && by >= 18 && by <= 24) continue;
      if (bx >= 30 && bx <= 36) continue;

      // Variety of building footprints per block
      placeBuilding(bx, by, 3, 3, 2 + ((bx + by) % 3));
      placeBuilding(bx + 4, by, 2, 4, 3 + ((bx * 3 + by) % 2));
      if (by + 4 < height - 6) {
        placeBuilding(bx + 1, by + 4, 4, 2, 2 + ((bx + by * 2) % 3));
      }
    }
  }

  // Waterfront warehouses
  placeBuilding(6, 38, 5, 3, 2);
  placeBuilding(14, 39, 4, 2, 3);
  placeBuilding(22, 38, 5, 3, 2);
  placeBuilding(28, 39, 3, 2, 2);

  // Market stalls area (sidewalk plaza near docks)
  fill(8, 34, 16, 36, TILE.plaza);

  // Path to cave under NE terrace
  set(42, 11, TILE.dirt);
  set(43, 11, TILE.path);
  set(44, 11, TILE.path);
  set(44, 10, TILE.path);
  setH(44, 10, 1);
  set(44, 9, TILE.dirt);
  setH(44, 9, 2);

  // Extra flower beds along avenues
  for (let i = 5; i < 40; i += 5) {
    if (tiles[idx(i, 13)] === TILE.sidewalk) setO(i, 13, TILE.flower);
    if (tiles[idx(15, i)] === TILE.sidewalk) setO(15, i, TILE.flower);
    if (tiles[idx(i, 29)] === TILE.sidewalk) setO(i, 29, TILE.flower);
  }

  return {
    width,
    height,
    tiles,
    heights,
    overlays,
    defs: TILE_DEFS,
    layerHeight: 14,
  };
}

/** Compact cave interior. */
export function createCaveMap(): TileMapData {
  const width = 12;
  const height = 10;
  const cells = width * height;
  const tiles = new Array(cells).fill(TILE.caveWall);
  const heights = new Array(cells).fill(0);

  const set = (x: number, y: number, id: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    tiles[y * width + x] = id;
  };
  const setH = (x: number, y: number, h: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    heights[y * width + x] = h;
  };

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      set(x, y, TILE.caveFloor);
    }
  }

  set(3, 3, TILE.caveWall);
  set(3, 6, TILE.caveWall);
  set(8, 3, TILE.caveWall);
  set(8, 6, TILE.caveWall);
  setH(5, 4, 1);
  set(5, 4, TILE.caveFloor);
  setH(6, 5, 1);

  set(5, height - 2, TILE.path);
  set(6, height - 2, TILE.path);

  return {
    width,
    height,
    tiles,
    heights,
    defs: TILE_DEFS,
    layerHeight: 16,
  };
}

/** @deprecated Use createIslandMap */
export const createDemoMap = createIslandMap;
