import type { Entity } from "../world/Entity";
import type { World } from "../world/World";
import { PathFollower } from "../path/PathFollower";
import { mix } from "../render/color";

interface WanderState {
  entity: Entity;
  home: { x: number; y: number };
  mover: PathFollower;
  idleFor: number;
  walking: boolean;
}

/**
 * Low-cost living-world touches: foliage sway, light flicker, NPC wander, day tint.
 */
export class WorldDynamics {
  private wanderers: WanderState[] = [];
  private worldRef: World | null = null;
  private time = 0;

  /** Day-cycle phase in [0, 1); slow sine-friendly absolute time. */
  get dayPhase(): number {
    // Full cycle ~150s.
    return (this.time * 0.0067) % 1;
  }

  /** Soft clear-color tint for the current day phase. */
  dayTint(base: string): string {
    const p = this.dayPhase;
    // Dawn → noon → golden hour → dusk wash, then back.
    if (p < 0.25) {
      return mix(base, "#3a2a38", 0.12 + (0.25 - p) * 0.35);
    }
    if (p < 0.5) {
      return mix(base, "#6a90b8", 0.08 + (p - 0.25) * 0.2);
    }
    if (p < 0.75) {
      return mix(base, "#c4884a", 0.06 + (p - 0.5) * 0.28);
    }
    return mix(base, "#2a2038", 0.1 + (p - 0.75) * 0.4);
  }

  /**
   * Rebind when the active scene changes. Tags NPCs with animators as wanderers.
   */
  bind(world: World): void {
    if (this.worldRef === world) return;
    this.worldRef = world;
    this.wanderers = [];
    for (const e of world.entities) {
      if (!e.active || !e.animator || !e.interactable) continue;
      // Skip static props that happen to have sheets.
      if (e.sprite.kind === "brick") continue;
      this.wanderers.push({
        entity: e,
        home: { x: e.position.x, y: e.position.y },
        mover: new PathFollower({ mode: "cardinal", speed: 1.35, maxClimb: 1 }),
        idleFor: 1.5 + Math.random() * 4,
        walking: false,
      });
    }
  }

  update(dt: number, world: World): void {
    this.time += dt;
    this.bind(world);
    this.updateSwayAndFlicker(world);
    this.updateWander(dt, world);
  }

  private updateSwayAndFlicker(world: World): void {
    const t = this.time;
    for (const e of world.entities) {
      if (!e.active) continue;
      const fx = e.data.fx;
      if (fx === "foliage") {
        const id = e.id * 0.37;
        const sway = Math.sin(t * 1.15 + id) * 1.6 + Math.sin(t * 0.55 + id * 2) * 0.8;
        e.sprite.offsetX = sway;
        e.sprite.offsetY = Math.cos(t * 0.9 + id) * 0.45;
      } else if (fx === "glow" || fx === "lantern") {
        const flicker =
          0.85 +
          0.15 * Math.sin(t * 9 + e.id) * Math.sin(t * 13.7 + e.id * 0.5);
        e.data.flicker = flicker;
        // Tiny vertical bob so lanterns feel alive.
        e.sprite.offsetY = (1 - flicker) * -1.5;
      }
    }
  }

  private updateWander(dt: number, world: World): void {
    for (const w of this.wanderers) {
      const e = w.entity;
      if (!e.active) continue;

      if (w.walking) {
        const prev = { x: e.position.x, y: e.position.y };
        w.mover.update(world, e, dt);
        const dx = e.position.x - prev.x;
        const dy = e.position.y - prev.y;
        if (e.animator) {
          if (Math.abs(dx) + Math.abs(dy) > 0.001) {
            e.animator.flipX = dx < -0.01;
            e.animator.play("walk");
          }
          e.animator.update(dt);
        }
        if (!w.mover.active) {
          w.walking = false;
          w.idleFor = 2.5 + Math.random() * 5;
          e.animator?.play("idle");
        }
        continue;
      }

      e.animator?.update(dt);
      w.idleFor -= dt;
      if (w.idleFor > 0) continue;

      // Pick a short wander toward home ± few tiles.
      const radius = 2 + ((e.id % 3) | 0);
      const tx = Math.round(w.home.x + (Math.random() * 2 - 1) * radius);
      const ty = Math.round(w.home.y + (Math.random() * 2 - 1) * radius);
      const dest = world.clampWalkable(tx, ty);
      if (!dest) {
        w.idleFor = 1 + Math.random() * 2;
        continue;
      }
      const from = { x: Math.floor(e.position.x), y: Math.floor(e.position.y) };
      if (dest.x === from.x && dest.y === from.y) {
        w.idleFor = 1 + Math.random();
        continue;
      }
      if (w.mover.setGoal(world, e, dest)) {
        w.walking = true;
      } else {
        w.idleFor = 2 + Math.random() * 2;
      }
    }
  }
}
