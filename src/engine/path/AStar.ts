import type { Vec2 } from "../math/Vec2";
import type { TileMap } from "../world/TileMap";

export type PathNeighborMode = "cardinal" | "octile";

export interface FindPathOptions {
  /**
   * `cardinal` — 4-way grid steps (N/E/S/W). Best for “walk the tiles”.
   * `octile` — 8-way with diagonal cost √2; diagonals blocked if either
   * adjacent orthogonal tile is blocked (no corner cutting).
   */
  mode?: PathNeighborMode;
  /** Optional extra blocked predicate (e.g. occupied tiles). */
  isBlocked?: (tx: number, ty: number) => boolean;
  /**
   * Max absolute height-level difference allowed between adjacent tiles.
   * Default 1 (can step up/down one terrace). Use 0 to forbid any climb.
   */
  maxClimb?: number;
  /** Extra A* cost per height level climbed/dropped. Default 0.25. */
  climbCost?: number;
}

const CARDINAL: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const DIAGONAL: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * A* on the tile grid. Returns integer tile coords from start → goal
 * (inclusive), or `null` if unreachable.
 */
export function findPath(
  map: TileMap,
  start: Vec2,
  goal: Vec2,
  options: FindPathOptions = {},
): Vec2[] | null {
  const mode = options.mode ?? "cardinal";
  const maxClimb = options.maxClimb ?? 1;
  const climbCost = options.climbCost ?? 0.25;
  const sx = Math.floor(start.x);
  const sy = Math.floor(start.y);
  const gx = Math.floor(goal.x);
  const gy = Math.floor(goal.y);

  if (!isTraversable(map, sx, sy, options)) return null;
  if (!isTraversable(map, gx, gy, options)) return null;
  if (sx === gx && sy === gy) return [{ x: sx, y: sy }];

  const width = map.width;
  const size = width * map.height;
  const idx = (x: number, y: number) => y * width + x;

  const gScore = new Float64Array(size).fill(Infinity);
  const fScore = new Float64Array(size).fill(Infinity);
  const cameFrom = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const open: number[] = [];

  const startI = idx(sx, sy);
  const goalI = idx(gx, gy);
  gScore[startI] = 0;
  fScore[startI] = heuristic(sx, sy, gx, gy, mode);
  open.push(startI);

  while (open.length > 0) {
    let bestOpen = 0;
    let bestF = fScore[open[0]!]!;
    for (let i = 1; i < open.length; i++) {
      const f = fScore[open[i]!]!;
      if (f < bestF) {
        bestF = f;
        bestOpen = i;
      }
    }
    const current = open[bestOpen]!;
    open[bestOpen] = open[open.length - 1]!;
    open.pop();

    if (current === goalI) {
      return reconstruct(cameFrom, current, width);
    }

    if (closed[current]) continue;
    closed[current] = 1;

    const cx = current % width;
    const cy = (current / width) | 0;
    const ch = map.getHeight(cx, cy);

    for (const [dx, dy] of CARDINAL) {
      considerNeighbor(
        cx,
        cy,
        ch,
        cx + dx,
        cy + dy,
        1,
        current,
        map,
        options,
        maxClimb,
        climbCost,
        mode,
        gx,
        gy,
        idx,
        gScore,
        fScore,
        cameFrom,
        closed,
        open,
      );
    }

    if (mode === "octile") {
      for (const [dx, dy] of DIAGONAL) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!isTraversable(map, nx, ny, options)) continue;
        if (!isTraversable(map, cx + dx, cy, options)) continue;
        if (!isTraversable(map, cx, cy + dy, options)) continue;
        // Diagonal also respects climb vs the destination cell.
        considerNeighbor(
          cx,
          cy,
          ch,
          nx,
          ny,
          Math.SQRT2,
          current,
          map,
          options,
          maxClimb,
          climbCost,
          mode,
          gx,
          gy,
          idx,
          gScore,
          fScore,
          cameFrom,
          closed,
          open,
        );
      }
    }
  }

  return null;
}

function considerNeighbor(
  cx: number,
  cy: number,
  ch: number,
  nx: number,
  ny: number,
  baseCost: number,
  current: number,
  map: TileMap,
  options: FindPathOptions,
  maxClimb: number,
  climbCost: number,
  mode: PathNeighborMode,
  gx: number,
  gy: number,
  idx: (x: number, y: number) => number,
  gScore: Float64Array,
  fScore: Float64Array,
  cameFrom: Int32Array,
  closed: Uint8Array,
  open: number[],
): void {
  void cx;
  void cy;
  if (!isTraversable(map, nx, ny, options)) return;
  const dh = Math.abs(map.getHeight(nx, ny) - ch);
  if (dh > maxClimb) return;
  const ni = idx(nx, ny);
  if (closed[ni]) return;
  const tentative = gScore[current]! + baseCost + dh * climbCost;
  if (tentative >= gScore[ni]!) return;
  cameFrom[ni] = current;
  gScore[ni] = tentative;
  fScore[ni] = tentative + heuristic(nx, ny, gx, gy, mode);
  open.push(ni);
}

function isTraversable(
  map: TileMap,
  tx: number,
  ty: number,
  options: FindPathOptions,
): boolean {
  if (!map.inBounds(tx, ty) || !map.isWalkable(tx, ty)) return false;
  if (options.isBlocked?.(tx, ty)) return false;
  return true;
}

function heuristic(
  x: number,
  y: number,
  gx: number,
  gy: number,
  mode: PathNeighborMode,
): number {
  const dx = Math.abs(x - gx);
  const dy = Math.abs(y - gy);
  if (mode === "cardinal") return dx + dy;
  return Math.SQRT2 * Math.min(dx, dy) + Math.abs(dx - dy);
}

function reconstruct(cameFrom: Int32Array, current: number, width: number): Vec2[] {
  const path: Vec2[] = [];
  let cur = current;
  while (cur !== -1) {
    path.push({ x: cur % width, y: (cur / width) | 0 });
    cur = cameFrom[cur]!;
  }
  path.reverse();
  return path;
}

/** Integer tiles → world centers used for movement. */
export function tilesToWorldCenters(tiles: Vec2[]): Vec2[] {
  return tiles.map((t) => ({ x: t.x + 0.5, y: t.y + 0.5 }));
}
