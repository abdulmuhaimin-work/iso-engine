import type { Vec2 } from "../math/Vec2";
import type { World } from "../world/World";
import type { Entity } from "../world/Entity";
import type { Assets } from "../Assets";
import type { Flags } from "../dialogue/Flags";
import type { DialogueRunner } from "../dialogue/DialogueRunner";
import type { SceneManager } from "./SceneManager";

export interface SpawnPoint {
  id: string;
  position: Vec2;
}

/**
 * Door / warp. Prefer `mode: "interact"` for explicit enter,
 * or `mode: "step"` to transfer when the player stands on the tile.
 */
export interface Portal {
  /** Integer tile the portal occupies (or is centered on). */
  tile: Vec2;
  targetScene: string;
  targetSpawn: string;
  mode?: "interact" | "step";
  prompt?: string;
  name?: string;
  /** Optional radius for step detection in tile units. Default 0.55. */
  radius?: number;
}

export interface SceneBuildResult {
  world: World;
  spawns: Record<string, Vec2>;
  portals?: Portal[];
  onEnter?: () => void;
  onExit?: () => void;
}

export interface SceneContext {
  manager: SceneManager;
  flags: Flags;
  dialogue: DialogueRunner;
  assets: Assets;
  /** Persistent player entity — do not recreate; place via spawn. */
  player: Entity;
}

export interface SceneDefinition {
  id: string;
  /** Display name for HUD / fades. */
  name?: string;
  build: (ctx: SceneContext) => SceneBuildResult;
}

export interface ActiveScene {
  def: SceneDefinition;
  world: World;
  spawns: Record<string, Vec2>;
  portals: Portal[];
  onExit?: () => void;
}
