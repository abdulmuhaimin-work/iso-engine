import type { TileMapData, Vec2 } from "../engine";
import { Rng } from "./rng";
import { PT, themeTileDefs, type LayoutStyle, type SceneTheme } from "./themes";

export interface LayoutResult {
  map: TileMapData;
  /** Walkable open cells suitable for props / NPCs. */
  openCells: Vec2[];
  /** Preferred entrance near map edge. */
  entrance: Vec2;
  /** Preferred exit toward opposite side. */
  exit: Vec2;
  /** Water-adjacent walkable cells. */
  shoreCells: Vec2[];
}

export function generateLayout(theme: SceneTheme, seed: number, size = 28): LayoutResult {
  const rng = new Rng(seed);
  const width = size;
  const height = size;
  const cells = width * height;
  const tiles = new Array(cells).fill(PT.ground);
  const heights = new Array(cells).fill(0);
  const overlays = new Array(cells).fill(0);
  const idx = (x: number, y: number) => y * width + x;
  const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
  const set = (x: number, y: number, id: number) => {
    if (inB(x, y)) tiles[idx(x, y)] = id;
  };
  const setH = (x: number, y: number, h: number) => {
    if (inB(x, y)) heights[idx(x, y)] = Math.max(0, h);
  };
  const setO = (x: number, y: number, id: number) => {
    if (inB(x, y)) overlays[idx(x, y)] = id;
  };

  // Soft border wall / hedge so the player stays in bounds.
  for (let x = 0; x < width; x++) {
    set(x, 0, PT.wall);
    set(x, height - 1, PT.wall);
  }
  for (let y = 0; y < height; y++) {
    set(0, y, PT.wall);
    set(width - 1, y, PT.wall);
  }

  switch (theme.layout as LayoutStyle) {
    case "grid":
      paintGrid(rng, width, height, set, setH, theme);
      break;
    case "caves":
      paintCaves(rng, width, height, set, setH, theme);
      break;
    case "island":
      paintIsland(rng, width, height, set, setH, theme);
      break;
    case "ring":
      paintRing(rng, width, height, set, setH, theme);
      break;
    case "ridge":
      paintRidge(rng, width, height, set, setH, theme);
      break;
    case "organic":
    default:
      paintOrganic(rng, width, height, set, setH, theme);
      break;
  }

  // Scatter accent overlays.
  for (let i = 0; i < Math.floor(cells * 0.04); i++) {
    const x = rng.int(2, width - 3);
    const y = rng.int(2, height - 3);
    if (tiles[idx(x, y)] === PT.ground && rng.chance(0.55)) setO(x, y, PT.flower);
  }

  // Ensure a clear entrance / exit corridor on south and north edges.
  const entranceX = rng.int(Math.floor(width * 0.35), Math.floor(width * 0.65));
  const exitX = rng.int(Math.floor(width * 0.3), Math.floor(width * 0.7));
  for (let y = height - 4; y < height; y++) {
    set(entranceX, y, PT.path);
    set(entranceX - 1, y, PT.path);
    setH(entranceX, y, 0);
    setH(entranceX - 1, y, 0);
  }
  for (let y = 0; y < 4; y++) {
    set(exitX, y, PT.path);
    set(exitX + 1, y, PT.path);
    setH(exitX, y, 0);
    setH(exitX + 1, y, 0);
  }
  // Carve a rough path between them.
  carvePath(entranceX, height - 3, exitX, 3, set, rng);

  const openCells: Vec2[] = [];
  const shoreCells: Vec2[] = [];
  const walkableIds = new Set([PT.ground, PT.path, PT.dirt, PT.flower]);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const id = tiles[idx(x, y)]!;
      if (!walkableIds.has(id)) continue;
      openCells.push({ x, y });
      const nearWater =
        tiles[idx(x + 1, y)] === PT.water ||
        tiles[idx(x - 1, y)] === PT.water ||
        tiles[idx(x, y + 1)] === PT.water ||
        tiles[idx(x, y - 1)] === PT.water;
      if (nearWater) shoreCells.push({ x, y });
    }
  }

  return {
    map: {
      width,
      height,
      tiles,
      heights,
      overlays,
      defs: themeTileDefs(theme),
      layerHeight: 14,
    },
    openCells,
    entrance: { x: entranceX, y: height - 3 },
    exit: { x: exitX, y: 2 },
    shoreCells,
  };
}

function carvePath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  set: (x: number, y: number, id: number) => void,
  rng: Rng,
): void {
  let x = x0;
  let y = y0;
  for (let i = 0; i < 200; i++) {
    set(x, y, PT.path);
    set(x + (rng.chance(0.5) ? 1 : 0), y, PT.path);
    if (x === x1 && y === y1) break;
    if (rng.chance(0.55) && x !== x1) x += Math.sign(x1 - x);
    else if (y !== y1) y += Math.sign(y1 - y);
    else x += Math.sign(x1 - x || 1);
  }
}

function paintOrganic(
  rng: Rng,
  w: number,
  h: number,
  set: (x: number, y: number, id: number) => void,
  setH: (x: number, y: number, h: number) => void,
  theme: SceneTheme,
): void {
  // Water blobs.
  const lakes = rng.int(theme.hasWaterBias > 0.5 ? 1 : 0, theme.hasWaterBias > 0.7 ? 3 : 1);
  for (let i = 0; i < lakes; i++) {
    const cx = rng.int(4, w - 5);
    const cy = rng.int(4, h - 5);
    const r = rng.float(2.2, 4.5);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (Math.hypot(x - cx, y - cy) < r + rng.float(-0.6, 0.6)) set(x, y, PT.water);
      }
    }
  }
  // Elevation mounds.
  const mounds = rng.int(1, 3 + Math.floor(theme.elevationBias * 3));
  for (let i = 0; i < mounds; i++) {
    const cx = rng.int(3, w - 4);
    const cy = rng.int(3, h - 4);
    const r = rng.float(1.5, 3.2);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < r) setH(x, y, d < r * 0.45 ? 2 : 1);
      }
    }
  }
  // Dirt clearings.
  for (let i = 0; i < 4; i++) {
    const cx = rng.int(3, w - 4);
    const cy = rng.int(3, h - 4);
    for (let y = cy - 1; y <= cy + 1; y++) {
      for (let x = cx - 1; x <= cx + 1; x++) set(x, y, PT.dirt);
    }
  }
}

function paintGrid(
  rng: Rng,
  w: number,
  h: number,
  set: (x: number, y: number, id: number) => void,
  setH: (x: number, y: number, h: number) => void,
  theme: SceneTheme,
): void {
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) set(x, y, PT.ground);
  }
  const step = rng.int(5, 7);
  for (let ax = 3; ax < w - 3; ax += step) {
    for (let y = 1; y < h - 1; y++) {
      set(ax, y, PT.path);
      set(ax + 1, y, PT.path);
    }
  }
  for (let ay = 3; ay < h - 3; ay += step) {
    for (let x = 1; x < w - 1; x++) {
      set(x, ay, PT.path);
      set(x, ay + 1, PT.path);
    }
  }
  // Building blocks between avenues.
  for (let by = 5; by < h - 6; by += step) {
    for (let bx = 5; bx < w - 6; bx += step) {
      if (rng.chance(0.65)) {
        for (let y = by; y < by + 2; y++) {
          for (let x = bx; x < bx + 2; x++) {
            set(x, y, PT.structure);
            setH(x, y, rng.int(1, 2 + Math.floor(theme.elevationBias)));
          }
        }
      }
    }
  }
  if (theme.hasWaterBias > 0.5) {
    const canalX = rng.int(Math.floor(w * 0.55), Math.floor(w * 0.75));
    for (let y = 2; y < h - 2; y++) {
      set(canalX, y, PT.water);
      set(canalX + 1, y, PT.water);
    }
    for (const by of [6, 12, 18, 22]) {
      if (by < h - 2) {
        set(canalX, by, PT.path);
        set(canalX + 1, by, PT.path);
      }
    }
  }
}

function paintCaves(
  rng: Rng,
  w: number,
  h: number,
  set: (x: number, y: number, id: number) => void,
  setH: (x: number, y: number, h: number) => void,
  theme: SceneTheme,
): void {
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) set(x, y, PT.wall);
  }
  // Drunk-walk open chambers.
  let cx = Math.floor(w / 2);
  let cy = Math.floor(h / 2);
  for (let step = 0; step < w * h * 0.55; step++) {
    set(cx, cy, PT.ground);
    set(cx + 1, cy, PT.ground);
    if (rng.chance(theme.hasWaterBias * 0.08)) set(cx, cy, PT.water);
    const dir = rng.int(0, 3);
    if (dir === 0) cx = Math.min(w - 3, cx + 1);
    if (dir === 1) cx = Math.max(2, cx - 1);
    if (dir === 2) cy = Math.min(h - 3, cy + 1);
    if (dir === 3) cy = Math.max(2, cy - 1);
  }
  for (let i = 0; i < 8; i++) {
    const x = rng.int(2, w - 3);
    const y = rng.int(2, h - 3);
    if (rng.chance(0.4)) setH(x, y, 1);
  }
}

function paintIsland(
  rng: Rng,
  w: number,
  h: number,
  set: (x: number, y: number, id: number) => void,
  setH: (x: number, y: number, h: number) => void,
  theme: SceneTheme,
): void {
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) set(x, y, PT.water);
  }
  const cx = w / 2;
  const cy = h / 2;
  const rx = w * rng.float(0.28, 0.36);
  const ry = h * rng.float(0.26, 0.34);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny < 1 + rng.float(-0.12, 0.08)) {
        set(x, y, PT.ground);
        if (nx * nx + ny * ny < 0.25 && theme.elevationBias > 0.3) setH(x, y, 1);
      }
    }
  }
  // Oasis / pond near center.
  if (theme.hasWaterBias > 0.4) {
    const px = Math.floor(cx + rng.int(-2, 2));
    const py = Math.floor(cy + rng.int(-2, 2));
    for (let y = py - 1; y <= py + 1; y++) {
      for (let x = px - 1; x <= px + 1; x++) set(x, y, PT.water);
    }
  }
}

function paintRing(
  rng: Rng,
  w: number,
  h: number,
  set: (x: number, y: number, id: number) => void,
  setH: (x: number, y: number, h: number) => void,
  theme: SceneTheme,
): void {
  const cx = w / 2;
  const cy = h / 2;
  const rOuter = Math.min(w, h) * 0.38;
  const rInner = rOuter * 0.45;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > rOuter) set(x, y, theme.hasWaterBias > 0.45 ? PT.water : PT.dirt);
      else if (d < rInner) {
        set(x, y, PT.path);
        if (theme.elevationBias > 0.3 && d < rInner * 0.5) setH(x, y, 1);
      } else {
        set(x, y, PT.ground);
        if (rng.chance(0.08)) set(x, y, PT.structure);
      }
    }
  }
  // Break ring with plazas.
  for (let i = 0; i < 3; i++) {
    const a = rng.float(0, Math.PI * 2);
    const x = Math.floor(cx + Math.cos(a) * ((rInner + rOuter) * 0.5));
    const y = Math.floor(cy + Math.sin(a) * ((rInner + rOuter) * 0.5));
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) set(x + ox, y + oy, PT.path);
    }
  }
}

function paintRidge(
  rng: Rng,
  w: number,
  h: number,
  set: (x: number, y: number, id: number) => void,
  setH: (x: number, y: number, h: number) => void,
  theme: SceneTheme,
): void {
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) set(x, y, PT.ground);
  }
  const ridgeX = (y: number) => Math.floor(w * 0.5 + Math.sin(y * 0.35) * w * 0.12);
  for (let y = 1; y < h - 1; y++) {
    const rx = ridgeX(y);
    for (let x = 1; x < w - 1; x++) {
      const d = Math.abs(x - rx);
      if (d <= 1) {
        set(x, y, PT.path);
        setH(x, y, 2 + Math.floor(theme.elevationBias));
      } else if (d <= 3) setH(x, y, 1);
      else if (d > 7 && theme.hasWaterBias > 0.3 && rng.chance(0.08)) set(x, y, PT.water);
    }
  }
  // Terraces.
  for (let i = 0; i < 5; i++) {
    const y = rng.int(4, h - 5);
    const x0 = ridgeX(y) - rng.int(2, 4);
    for (let x = x0; x < x0 + rng.int(3, 5); x++) {
      set(x, y, PT.dirt);
      setH(x, y, 1);
    }
  }
}
