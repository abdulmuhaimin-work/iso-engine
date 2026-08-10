import type { Vec2 } from "../math/Vec2";
import type { Entity } from "../world/Entity";
import type { World } from "../world/World";
import {
  findPath,
  tilesToWorldCenters,
  type FindPathOptions,
} from "./AStar";

export interface PathFollowerOptions extends FindPathOptions {
  speed?: number;
  arriveEpsilon?: number;
}

/**
 * Steers an entity along an A* tile path, one grid step at a time.
 */
export class PathFollower {
  speed: number;
  arriveEpsilon: number;
  private readonly findOptions: FindPathOptions;

  /** Remaining world-space waypoints (tile centers). */
  waypoints: Vec2[] = [];
  /** Integer tiles for the active route (for debug / drawing). */
  tiles: Vec2[] = [];

  constructor(options: PathFollowerOptions = {}) {
    this.speed = options.speed ?? 3.2;
    this.arriveEpsilon = options.arriveEpsilon ?? 0.04;
    this.findOptions = {
      mode: options.mode ?? "cardinal",
      isBlocked: options.isBlocked,
    };
  }

  get active(): boolean {
    return this.waypoints.length > 0;
  }

  clear(): void {
    this.waypoints = [];
    this.tiles = [];
  }

  /**
   * Plan a grid path from the entity’s current tile to the goal tile.
   * Returns false if no path exists.
   */
  setGoal(world: World, entity: Entity, goalTile: Vec2): boolean {
    const start = {
      x: Math.floor(entity.position.x),
      y: Math.floor(entity.position.y),
    };
    const goal = {
      x: Math.floor(goalTile.x),
      y: Math.floor(goalTile.y),
    };

    const tiles = findPath(world.map, start, goal, this.findOptions);
    if (!tiles) {
      this.clear();
      return false;
    }

    this.tiles = tiles.map((t) => ({ x: t.x, y: t.y }));
    const centers = tilesToWorldCenters(tiles);

    // Drop the starting tile if we're already on/near its center,
    // so we immediately step toward the next cell.
    while (centers.length > 1) {
      const first = centers[0]!;
      const dist = Math.hypot(
        first.x - entity.position.x,
        first.y - entity.position.y,
      );
      if (dist <= this.arriveEpsilon + 0.15) {
        centers.shift();
        this.tiles.shift();
        continue;
      }
      break;
    }

    // Already standing on the only tile
    if (
      centers.length === 1 &&
      Math.hypot(
        centers[0]!.x - entity.position.x,
        centers[0]!.y - entity.position.y,
      ) <= this.arriveEpsilon
    ) {
      this.clear();
      return true;
    }

    this.waypoints = centers;
    return true;
  }

  /**
   * Advance along waypoints. Returns true when the path is finished.
   */
  update(world: World, entity: Entity, dt: number): boolean {
    if (this.waypoints.length === 0) return true;

    const target = this.waypoints[0]!;
    const arrived = world.moveToward(entity, target, dt, {
      speed: this.speed,
      arriveEpsilon: this.arriveEpsilon,
    });

    if (arrived) {
      this.waypoints.shift();
      // Keep `tiles` in sync with remaining route (drop completed tile).
      if (this.tiles.length > 0) this.tiles.shift();
    }

    return this.waypoints.length === 0;
  }
}
