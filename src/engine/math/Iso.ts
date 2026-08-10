import type { Vec2 } from "./Vec2";

/**
 * Classic 2:1 isometric projection.
 * World space uses continuous tile coordinates (x right, y down/south).
 * Screen space is canvas pixels (x right, y down).
 */
export interface IsoMetrics {
  /** Half tile width in screen pixels at zoom 1. */
  tileWidth: number;
  /** Half tile height in screen pixels at zoom 1 (usually tileWidth / 2). */
  tileHeight: number;
}

export const DEFAULT_ISO: IsoMetrics = {
  tileWidth: 32,
  tileHeight: 16,
};

/** World (tile) → screen pixels (before camera). */
export function worldToScreen(world: Vec2, metrics: IsoMetrics = DEFAULT_ISO): Vec2 {
  return {
    x: (world.x - world.y) * metrics.tileWidth,
    y: (world.x + world.y) * metrics.tileHeight,
  };
}

/** Screen pixels (before camera) → world (tile). */
export function screenToWorld(screen: Vec2, metrics: IsoMetrics = DEFAULT_ISO): Vec2 {
  const tw = metrics.tileWidth;
  const th = metrics.tileHeight;
  return {
    x: (screen.x / tw + screen.y / th) / 2,
    y: (screen.y / th - screen.x / tw) / 2,
  };
}

/** Depth key for painter's algorithm — farther (larger x+y) draws later. */
export function depthKey(world: Vec2, layer = 0): number {
  return world.x + world.y + layer * 0.001;
}

/** Snap continuous world coords to integer tile indices. */
export function worldToTile(world: Vec2): Vec2 {
  return {
    x: Math.floor(world.x),
    y: Math.floor(world.y),
  };
}
