import type { Vec2 } from "../math/Vec2";
import { depthKey } from "../math/Iso";
import type { SpriteAnimator } from "../render/SpriteAnimator";
import type { Interactable } from "../interaction/Interactable";
import type { BrickModel } from "../render/BrickModel";

export type EntityId = number;

export interface SpriteDraw {
  /** Image key in Assets, or omit for procedural / animator draw. */
  imageKey?: string;
  /** Sprite sheet key in Assets (static frame via `frame`). */
  sheetKey?: string;
  /** Frame index when using `sheetKey` without an animator. */
  frame?: number;
  /** Anchor offset from tile foot (screen px at zoom 1). */
  offsetX?: number;
  offsetY?: number;
  width?: number;
  height?: number;
  /** Draw scale for sheet/image/brick (at zoom 1). */
  scale?: number;
  flipX?: boolean;
  /** Procedural fill when no image/sheet/animator. */
  color?: string;
  /** Draw a simple “billboard” capsule instead of a diamond. */
  kind?: "diamond" | "actor" | "block" | "sheet" | "brick";
}

let nextId = 1;

export class Entity {
  readonly id: EntityId;
  /** Continuous world/tile position (center of tile footprint). */
  position: Vec2;
  /** Optional sprite / procedural appearance. */
  sprite: SpriteDraw;
  /** Optional clip player; takes precedence over static sprite image/sheet. */
  animator: SpriteAnimator | null = null;
  /** Optional lego-style brick model (trees, props, characters). */
  brickModel: BrickModel | null = null;
  /** Optional proximity interaction (talk, inspect, …). */
  interactable: Interactable | null = null;
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
