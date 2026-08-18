import type { TileDef, TileMapData } from "../engine";

export const RT = {
  floor: 1,
  path: 2,
  hedge: 3,
  water: 4,
  wood: 5,
  carpet: 6,
  desk: 7,
  flower: 8,
  roof: 9,
} as const;

export const RESUME_DEFS: Record<number, TileDef> = {
  [RT.floor]: { id: RT.floor, name: "stone", color: "#8d97a3", walkable: true },
  [RT.path]: { id: RT.path, name: "path", color: "#cbb892", walkable: true },
  [RT.hedge]: { id: RT.hedge, name: "hedge", color: "#3d6b45", walkable: false, elevation: 8 },
  [RT.water]: { id: RT.water, name: "pool", color: "#4a88a8", walkable: false },
  [RT.wood]: { id: RT.wood, name: "wood", color: "#8b6a45", walkable: true },
  [RT.carpet]: { id: RT.carpet, name: "carpet", color: "#6a4a58", walkable: true },
  [RT.desk]: { id: RT.desk, name: "desk", color: "#5a4636", walkable: false, elevation: 6 },
  [RT.flower]: { id: RT.flower, name: "flower", color: "#d4a0c8", walkable: true },
  [RT.roof]: { id: RT.roof, name: "building", color: "#6e7580", walkable: false },
};

function grid(width: number, height: number, fillId: number) {
  const cells = width * height;
  const tiles = new Array(cells).fill(fillId);
  const heights = new Array(cells).fill(0);
  const overlays = new Array(cells).fill(0);
  const idx = (x: number, y: number) => y * width + x;
  const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
  const set = (x: number, y: number, id: number) => {
    if (inB(x, y)) tiles[idx(x, y)] = id;
  };
  const setH = (x: number, y: number, h: number) => {
    if (inB(x, y)) heights[idx(x, y)] = h;
  };
  const setO = (x: number, y: number, id: number) => {
    if (inB(x, y)) overlays[idx(x, y)] = id;
  };
  const fill = (x0: number, y0: number, x1: number, y1: number, id: number, h = 0) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        set(x, y, id);
        if (h) setH(x, y, h);
      }
    }
  };
  const data = (): TileMapData => ({
    width,
    height,
    tiles,
    heights,
    overlays,
    defs: RESUME_DEFS,
    layerHeight: 14,
  });
  return { width, height, set, setH, setO, fill, data };
}

/** Outdoor campus / lobby. */
export function createLobbyMap(): TileMapData {
  const g = grid(24, 20, RT.path);
  // Hedge border
  for (let x = 0; x < 24; x++) {
    g.set(x, 0, RT.hedge);
    g.set(x, 19, RT.hedge);
  }
  for (let y = 0; y < 20; y++) {
    g.set(0, y, RT.hedge);
    g.set(23, y, RT.hedge);
  }
  // Plaza
  g.fill(8, 7, 15, 12, RT.floor);
  g.setO(11, 9, RT.flower);
  g.setO(12, 10, RT.flower);

  // North Career Hall
  g.fill(8, 1, 15, 5, RT.roof, 3);
  g.set(11, 5, RT.wood);
  g.set(12, 5, RT.wood);
  g.setH(11, 5, 0);
  g.setH(12, 5, 0);

  // East Studio
  g.fill(17, 6, 22, 13, RT.roof, 2);
  g.set(17, 9, RT.wood);
  g.set(17, 10, RT.wood);
  g.setH(17, 9, 0);
  g.setH(17, 10, 0);

  // West garden pool
  g.fill(2, 7, 6, 12, RT.path);
  g.fill(3, 8, 5, 10, RT.water);
  g.setO(2, 7, RT.flower);
  g.setO(6, 12, RT.flower);

  // South contact pavilion
  g.fill(9, 14, 14, 17, RT.wood);
  g.fill(10, 15, 13, 16, RT.carpet);

  return g.data();
}

/** Career hall — desks for each job. */
export function createCareerMap(): TileMapData {
  const g = grid(16, 12, RT.carpet);
  for (let x = 0; x < 16; x++) {
    g.set(x, 0, RT.roof);
    g.setH(x, 0, 2);
    g.set(x, 11, RT.roof);
    g.setH(x, 11, 2);
  }
  for (let y = 0; y < 12; y++) {
    g.set(0, y, RT.roof);
    g.setH(0, y, 2);
    g.set(15, y, RT.roof);
    g.setH(15, y, 2);
  }
  g.fill(1, 1, 14, 10, RT.carpet);
  g.fill(6, 10, 9, 10, RT.wood);
  g.setH(6, 10, 0);
  g.setH(7, 10, 0);
  g.setH(8, 10, 0);
  g.setH(9, 10, 0);
  // Desks along the north wall
  g.set(3, 3, RT.desk);
  g.set(6, 3, RT.desk);
  g.set(9, 3, RT.desk);
  g.set(12, 3, RT.desk);
  return g.data();
}

/** Project studio. */
export function createStudioMap(): TileMapData {
  const g = grid(14, 12, RT.wood);
  for (let x = 0; x < 14; x++) {
    g.set(x, 0, RT.roof);
    g.setH(x, 0, 2);
    g.set(x, 11, RT.roof);
    g.setH(x, 11, 2);
  }
  for (let y = 0; y < 12; y++) {
    g.set(0, y, RT.roof);
    g.setH(0, y, 2);
    g.set(13, y, RT.roof);
    g.setH(13, y, 2);
  }
  g.fill(1, 1, 12, 10, RT.wood);
  g.fill(1, 5, 1, 7, RT.carpet);
  g.setH(1, 5, 0);
  g.setH(1, 6, 0);
  g.setH(1, 7, 0);
  g.set(4, 4, RT.desk);
  g.set(8, 4, RT.desk);
  g.set(4, 7, RT.desk);
  g.set(8, 7, RT.desk);
  return g.data();
}
