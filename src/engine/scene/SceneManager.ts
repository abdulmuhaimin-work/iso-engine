import { Entity } from "../world/Entity";
import type { World } from "../world/World";
import type { Assets } from "../Assets";
import type { Flags } from "../dialogue/Flags";
import type { DialogueRunner } from "../dialogue/DialogueRunner";
import type { Vec2 } from "../math/Vec2";
import { distance } from "../math/Vec2";
import type {
  ActiveScene,
  Portal,
  SceneContext,
  SceneDefinition,
} from "./Scene";

export interface SceneChangeOptions {
  spawn?: string;
  /** Fade duration in seconds (each half). Default 0.35. */
  fadeDuration?: number;
}

export interface SceneManagerOptions {
  flags: Flags;
  dialogue: DialogueRunner;
  assets: Assets;
  player: Entity;
  /** Optional overlay element that receives opacity 0–1 during fades. */
  fadeElement?: HTMLElement | null;
}

type Phase = "idle" | "fadeOut" | "fadeIn";

/**
 * Registers map scenes and transfers the persistent player between them.
 */
export class SceneManager {
  readonly flags: Flags;
  readonly dialogue: DialogueRunner;
  readonly assets: Assets;
  readonly player: Entity;

  private readonly defs = new Map<string, SceneDefinition>();
  private current: ActiveScene | null = null;
  private phase: Phase = "idle";
  private fade = 0;
  private fadeDuration = 0.35;
  private fadeTimer = 0;
  private pending: { sceneId: string; spawn: string } | null = null;
  private readonly fadeElement: HTMLElement | null;

  constructor(options: SceneManagerOptions) {
    this.flags = options.flags;
    this.dialogue = options.dialogue;
    this.assets = options.assets;
    this.player = options.player;
    this.fadeElement = options.fadeElement ?? null;
    this.syncFadeDom();
  }

  get active(): ActiveScene | null {
    return this.current;
  }

  get world(): World {
    if (!this.current) throw new Error("No active scene");
    return this.current.world;
  }

  get sceneId(): string | null {
    return this.current?.def.id ?? null;
  }

  get sceneName(): string | null {
    return this.current?.def.name ?? this.current?.def.id ?? null;
  }

  /** True while a fade transition is running. */
  get transitioning(): boolean {
    return this.phase !== "idle";
  }

  /** Current fade opacity 0 (clear) → 1 (black). */
  get fadeOpacity(): number {
    return this.fade;
  }

  register(def: SceneDefinition): void {
    this.defs.set(def.id, def);
  }

  registerAll(defs: SceneDefinition[]): void {
    for (const def of defs) this.register(def);
  }

  /** Enter a scene immediately (no fade). Use once at boot. */
  enter(sceneId: string, spawn = "default"): void {
    this.applyScene(sceneId, spawn);
    this.phase = "idle";
    this.fade = 0;
    this.pending = null;
    this.syncFadeDom();
  }

  /** Fade out → swap map → fade in. Ignores calls while already transitioning. */
  change(sceneId: string, options: SceneChangeOptions = {}): void {
    if (this.transitioning) return;
    if (!this.defs.has(sceneId)) {
      throw new Error(`Unknown scene: ${sceneId}`);
    }
    this.fadeDuration = options.fadeDuration ?? 0.35;
    this.pending = { sceneId, spawn: options.spawn ?? "default" };
    this.phase = "fadeOut";
    this.fadeTimer = 0;
    if (this.dialogue.active) this.dialogue.end();
  }

  /** Drive fades. Call every frame from the game loop. */
  update(dt: number): void {
    if (this.phase === "idle") return;

    this.fadeTimer += dt;
    const t = Math.min(1, this.fadeTimer / Math.max(0.001, this.fadeDuration));

    if (this.phase === "fadeOut") {
      this.fade = t;
      this.syncFadeDom();
      if (t >= 1 && this.pending) {
        this.applyScene(this.pending.sceneId, this.pending.spawn);
        this.pending = null;
        this.phase = "fadeIn";
        this.fadeTimer = 0;
        this.fade = 1;
        this.syncFadeDom();
      }
      return;
    }

    if (this.phase === "fadeIn") {
      this.fade = 1 - t;
      this.syncFadeDom();
      if (t >= 1) {
        this.phase = "idle";
        this.fade = 0;
        this.syncFadeDom();
      }
    }
  }

  /** Check step-on portals after player movement. */
  checkStepPortals(): void {
    if (!this.current || this.transitioning) return;

    for (const portal of this.current.portals) {
      if ((portal.mode ?? "interact") !== "step") continue;
      const radius = portal.radius ?? 0.55;
      const center = { x: portal.tile.x + 0.5, y: portal.tile.y + 0.5 };
      if (distance(this.player.position, center) <= radius) {
        this.change(portal.targetScene, { spawn: portal.targetSpawn });
        return;
      }
    }
  }

  makePortalInteractable(portal: Portal): {
    prompt: string;
    name: string;
    radius: number;
    onInteract: () => void;
  } {
    return {
      prompt: portal.prompt ?? "Enter",
      name: portal.name ?? "Passage",
      radius: portal.radius ?? 1.35,
      onInteract: () => {
        this.change(portal.targetScene, { spawn: portal.targetSpawn });
      },
    };
  }

  private applyScene(sceneId: string, spawnId: string): void {
    const def = this.defs.get(sceneId);
    if (!def) throw new Error(`Unknown scene: ${sceneId}`);

    if (this.current) {
      this.current.onExit?.();
      this.detachPlayer(this.current.world);
    }

    const ctx: SceneContext = {
      manager: this,
      flags: this.flags,
      dialogue: this.dialogue,
      assets: this.assets,
      player: this.player,
    };
    const built = def.build(ctx);
    const spawn = built.spawns[spawnId] ?? built.spawns.default;
    if (!spawn) {
      throw new Error(`Scene "${sceneId}" missing spawn "${spawnId}"`);
    }

    this.placePlayer(built.world, spawn);
    this.installPortals(built.world, built.portals ?? []);

    this.current = {
      def,
      world: built.world,
      spawns: built.spawns,
      portals: built.portals ?? [],
      onExit: built.onExit,
    };
    built.onEnter?.();
  }

  private detachPlayer(world: World): void {
    world.remove(this.player);
  }

  private placePlayer(world: World, spawn: Vec2): void {
    this.player.position = { x: spawn.x, y: spawn.y };
    if (!world.get(this.player.id)) {
      world.add(this.player);
    }
  }

  private installPortals(world: World, portals: Portal[]): void {
    for (const portal of portals) {
      if ((portal.mode ?? "interact") !== "interact") continue;

      const existing = world.entities.find((e) => {
        return (
          e !== this.player &&
          Math.floor(e.position.x) === portal.tile.x &&
          Math.floor(e.position.y) === portal.tile.y
        );
      });

      const bind = this.makePortalInteractable(portal);
      const interactable = {
        prompt: bind.prompt,
        name: bind.name,
        radius: bind.radius,
        onInteract: () => bind.onInteract(),
      };

      if (existing) {
        existing.interactable = interactable;
      } else {
        const marker = world.add(
          new Entity(
            { x: portal.tile.x + 0.5, y: portal.tile.y + 0.5 },
            { kind: "diamond", color: "#ffe08a" },
          ),
        );
        marker.interactable = interactable;
        marker.data.portal = true;
      }
    }
  }

  private syncFadeDom(): void {
    if (!this.fadeElement) return;
    this.fadeElement.style.opacity = String(this.fade);
    this.fadeElement.style.pointerEvents = this.fade > 0.05 ? "auto" : "none";
  }
}
