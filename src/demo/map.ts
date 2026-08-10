import type { TileDef, TileMapData } from "../engine";

export const TILE = {
  grass: 1,
  path: 2,
  water: 3,
  stone: 4,
  flower: 5,
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
    color: "#6aa86f",
    walkable: true,
  },
};

/** Small hand-authored demo island. */
export function createDemoMap(): TileMapData {
  const width = 16;
  const height = 16;
  const tiles = new Array(width * height).fill(TILE.grass);

  const set = (x: number, y: number, id: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    tiles[y * width + x] = id;
  };

  // Water border
  for (let x = 0; x < width; x++) {
    set(x, 0, TILE.water);
    set(x, height - 1, TILE.water);
  }
  for (let y = 0; y < height; y++) {
    set(0, y, TILE.water);
    set(width - 1, y, TILE.water);
  }

  // Path
  for (let i = 2; i < 14; i++) set(i, 7, TILE.path);
  for (let i = 3; i < 12; i++) set(8, i, TILE.path);

  // Rocks / flowers
  set(4, 4, TILE.stone);
  set(5, 4, TILE.stone);
  set(4, 5, TILE.stone);
  set(11, 4, TILE.stone);
  set(12, 10, TILE.stone);
  set(3, 11, TILE.flower);
  set(4, 12, TILE.flower);
  set(10, 3, TILE.flower);
  set(13, 12, TILE.flower);
  set(6, 9, TILE.flower);

  // Pond
  set(5, 10, TILE.water);
  set(6, 10, TILE.water);
  set(5, 11, TILE.water);

  return { width, height, tiles, defs: TILE_DEFS };
}
