import type { Vec2 } from "../math/Vec2";
import { distance } from "../math/Vec2";
import type { TileMap } from "../world/TileMap";
import { materialFromName } from "../render/textures";

export function isWaterTile(map: TileMap, tx: number, ty: number): boolean {
  const def = map.getDef(tx, ty);
  if (!def) return false;
  if (def.material === "water") return true;
  return materialFromName(def.name) === "water";
}

/** True when `pos` is within `radius` tiles of a water cell center. */
export function nearWater(map: TileMap, pos: Vec2, radius = 2.15): boolean {
  const x0 = Math.floor(pos.x - radius);
  const y0 = Math.floor(pos.y - radius);
  const x1 = Math.floor(pos.x + radius);
  const y1 = Math.floor(pos.y + radius);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isWaterTile(map, tx, ty)) continue;
      if (distance(pos, { x: tx + 0.5, y: ty + 0.5 }) <= radius) return true;
    }
  }
  return false;
}
