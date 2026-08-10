import type { Vec2 } from "../math/Vec2";
import { depthKey } from "../math/Iso";

export type EntityId = number;

export interface SpriteDraw {
  /** Image key in Assets, or omit for procedural draw. */
  imageKey?: string;
  /** Anchor offset from tile foot (screen px at zoom 1). */
  offsetX?: number;
  offsetY?: number;
  width?: number;
  height?: number;
  /** Procedural fill when no image. */
  color?: string;
  /** Draw a simple “billboard” capsule instead of a diamond. */
  kind?: "diamond" | "actor" | "block";
}

let nextId = 1;

export class Entity {
  readonly id: EntityId;
  /** Continuous world/tile position (center of tile footprint). */
  position: Vec2;
  /** Optional sprite / procedural appearance. */
  sprite: SpriteDraw;
  /** Extra depth bias (e.g. flying units). */
  depthBias = 0;
  /** User data bag for game logic. */
  data: Record<string, unknown> = {};
  active = true;

  constructor(position: Vec2, sprite: SpriteDraw = {}) {
    this.id = nextId++;
    this.position = { x: position.x, y: position.y };
    this.sprite = sprite;
  }

  get depth(): number {
    return depthKey(this.position, this.depthBias);
  }
}
