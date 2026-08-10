import type { Vec2 } from "../math/Vec2";
import { distance } from "../math/Vec2";
import { Entity } from "./Entity";
import type { TileMap } from "./TileMap";

export interface MoveOptions {
  speed: number;
  /** Snap destination to tile centers when close enough. */
  arriveEpsilon?: number;
}

/**
 * Holds the tile map + entities and offers movement helpers.
 */
export class World {
  map: TileMap;
  readonly entities: Entity[] = [];
  private readonly byId = new Map<number, Entity>();

  constructor(map: TileMap) {
    this.map = map;
  }

  add(entity: Entity): Entity {
    this.entities.push(entity);
    this.byId.set(entity.id, entity);
    return entity;
  }

  remove(entity: Entity): void {
    const idx = this.entities.indexOf(entity);
    if (idx >= 0) this.entities.splice(idx, 1);
    this.byId.delete(entity.id);
  }

  get(id: number): Entity | undefined {
    return this.byId.get(id);
  }

  sortedEntities(): Entity[] {
    return this.entities
      .filter((e) => e.active)
      .sort((a, b) => a.depth - b.depth);
  }

  /**
   * Move entity toward a world target at constant speed.
   * Returns true when arrived.
   */
  moveToward(entity: Entity, target: Vec2, dt: number, options: MoveOptions): boolean {
    const eps = options.arriveEpsilon ?? 0.05;
    const dx = target.x - entity.position.x;
    const dy = target.y - entity.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= eps) {
      entity.position.x = target.x;
      entity.position.y = target.y;
      return true;
    }
    const step = Math.min(dist, options.speed * dt);
    entity.position.x += (dx / dist) * step;
    entity.position.y += (dy / dist) * step;
    return false;
  }

  /** Clamp a tile destination to walkable in-bounds cells. */
  clampWalkable(tx: number, ty: number): Vec2 | null {
    const x = Math.floor(tx);
    const y = Math.floor(ty);
    if (!this.map.inBounds(x, y) || !this.map.isWalkable(x, y)) return null;
    return { x: x + 0.5, y: y + 0.5 };
  }

  nearestEntity(world: Vec2, maxDist = Infinity): Entity | undefined {
    let best: Entity | undefined;
    let bestD = maxDist;
    for (const e of this.entities) {
      if (!e.active) continue;
      const d = distance(world, e.position);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }
}
