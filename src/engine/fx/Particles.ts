import type { Camera } from "../Camera";
import type { World } from "../world/World";
import { isWaterTile } from "../minigame/water";
import { materialFromName } from "../render/textures";

export type ParticleKind = "mote" | "spray" | "spark" | "pollen" | "ember";

export type AtmospherePreset = "harbor" | "lobby" | "cave" | "plaza";

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  kind: ParticleKind;
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ScreenParticle {
  x: number;
  y: number;
  size: number;
  r: number;
  g: number;
  b: number;
  a: number;
  kind: ParticleKind;
}

const MAX = 220;

/**
 * Cheap world-space atmospheric particles for Canvas2D + WebGL paths.
 */
export class ParticleSystem {
  private particles: Particle[] = [];
  private emitAcc = 0;
  private preset: AtmospherePreset = "harbor";
  private waterCache: Array<{ x: number; y: number }> = [];
  private glowCache: Array<{ x: number; y: number }> = [];
  private foliageCache: Array<{ x: number; y: number }> = [];
  private mapKey = "";

  setPreset(preset: AtmospherePreset): void {
    this.preset = preset;
  }

  clear(): void {
    this.particles.length = 0;
    this.waterCache = [];
    this.glowCache = [];
    this.foliageCache = [];
    this.mapKey = "";
  }

  /**
   * Refresh emitter anchors from the live world (water edges, tagged props).
   */
  syncWorld(world: World): void {
    const map = world.map;
    const key = `${map.width}x${map.height}:${world.entities.length}`;
    if (key === this.mapKey && this.waterCache.length) return;
    this.mapKey = key;
    this.waterCache = [];
    this.glowCache = [];
    this.foliageCache = [];

    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        if (!isWaterTile(map, tx, ty)) continue;
        // Prefer shoreline cells for spray.
        const edge =
          !isWaterTile(map, tx + 1, ty) ||
          !isWaterTile(map, tx - 1, ty) ||
          !isWaterTile(map, tx, ty + 1) ||
          !isWaterTile(map, tx, ty - 1);
        if (edge || (tx + ty) % 5 === 0) {
          this.waterCache.push({ x: tx + 0.5, y: ty + 0.5 });
        }
      }
    }

    for (const e of world.entities) {
      if (!e.active) continue;
      const fx = e.data.fx;
      if (fx === "glow" || fx === "lantern") {
        this.glowCache.push({ x: e.position.x, y: e.position.y });
      } else if (fx === "foliage") {
        this.foliageCache.push({ x: e.position.x, y: e.position.y });
      }
    }
  }

  update(dt: number, world: World, camera: Camera): void {
    this.syncWorld(world);
    this.emitAcc += dt;

    while (this.emitAcc > 0.05) {
      this.emitAcc -= 0.05;
      this.burst(camera);
    }

    const windX = Math.sin(performance.now() * 0.00035) * 0.15;
    const windY = Math.cos(performance.now() * 0.00028) * 0.08;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += (p.vx + windX) * dt;
      p.y += (p.vy + windY) * dt;
      p.z += p.vz * dt;
      if (p.kind === "mote" || p.kind === "pollen") {
        p.vx += Math.sin(p.life * 3 + p.x) * dt * 0.2;
        p.vy += Math.cos(p.life * 2.4 + p.y) * dt * 0.15;
      }
      if (p.kind === "spray") {
        p.vz -= 4.5 * dt;
        p.a = Math.max(0, p.life / p.maxLife) * 0.55;
      } else if (p.kind === "spark" || p.kind === "ember") {
        p.a = Math.max(0, (p.life / p.maxLife) * 0.9);
        p.size *= 1 - dt * 0.35;
      } else {
        p.a = Math.max(0, (p.life / p.maxLife) * 0.65);
      }
    }
  }

  /** Screen-space draw list for both render backends. */
  toScreen(camera: Camera, world: World): ScreenParticle[] {
    const out: ScreenParticle[] = [];
    const map = world.map;
    for (const p of this.particles) {
      const elev = map.inBounds(Math.floor(p.x), Math.floor(p.y))
        ? map.elevationPx(Math.floor(p.x), Math.floor(p.y))
        : 0;
      const s = camera.worldToScreenElevated({ x: p.x, y: p.y }, elev + p.z);
      out.push({
        x: s.x,
        y: s.y,
        size: Math.max(0.6, p.size * camera.zoom),
        r: p.r,
        g: p.g,
        b: p.b,
        a: p.a,
        kind: p.kind,
      });
    }
    return out;
  }

  private burst(camera: Camera): void {
    if (this.particles.length >= MAX) return;
    const cam = camera.position;
    const viewR = 14 / Math.max(0.55, camera.zoom);

    // Ambient motes / pollen always drift across the view.
    const moteCount = this.preset === "cave" ? 1 : 2;
    for (let i = 0; i < moteCount; i++) {
      if (this.particles.length >= MAX) break;
      const kind: ParticleKind =
        this.preset === "lobby" || this.preset === "plaza"
          ? Math.random() > 0.55
            ? "pollen"
            : "mote"
          : this.preset === "cave"
            ? "mote"
            : Math.random() > 0.7
              ? "pollen"
              : "mote";
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * viewR;
      this.spawn({
        x: cam.x + Math.cos(ang) * dist,
        y: cam.y + Math.sin(ang) * dist * 0.7,
        z: 4 + Math.random() * 28,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.25,
        vz: (Math.random() - 0.5) * 2,
        life: 3.5 + Math.random() * 4,
        maxLife: 7,
        size: kind === "pollen" ? 1.4 + Math.random() : 0.9 + Math.random() * 1.2,
        kind,
        ...(kind === "pollen"
          ? { r: 255, g: 220, b: 140, a: 0.45 }
          : this.preset === "cave"
            ? { r: 180, g: 200, b: 220, a: 0.35 }
            : { r: 230, g: 235, b: 245, a: 0.4 }),
      });
    }

    // Water spray near shoreline in view.
    if (this.preset !== "cave" && this.waterCache.length) {
      for (let i = 0; i < 2; i++) {
        const spot = this.waterCache[(Math.random() * this.waterCache.length) | 0]!;
        if (Math.hypot(spot.x - cam.x, spot.y - cam.y) > viewR) continue;
        this.spawn({
          x: spot.x + (Math.random() - 0.5) * 0.8,
          y: spot.y + (Math.random() - 0.5) * 0.8,
          z: 2 + Math.random() * 6,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          vz: 6 + Math.random() * 10,
          life: 0.45 + Math.random() * 0.4,
          maxLife: 0.85,
          size: 1.2 + Math.random() * 1.6,
          kind: "spray",
          r: 200,
          g: 230,
          b: 245,
          a: 0.55,
        });
      }
    }

    // Sparks / embers near glow props.
    for (const spot of this.glowCache) {
      if (Math.hypot(spot.x - cam.x, spot.y - cam.y) > viewR) continue;
      if (Math.random() > 0.35) continue;
      const ember = this.preset === "cave" || Math.random() > 0.55;
      this.spawn({
        x: spot.x + (Math.random() - 0.5) * 0.35,
        y: spot.y + (Math.random() - 0.5) * 0.35,
        z: 18 + Math.random() * 14,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: 4 + Math.random() * 8,
        life: 0.5 + Math.random() * 0.7,
        maxLife: 1.2,
        size: 1.1 + Math.random(),
        kind: ember ? "ember" : "spark",
        r: ember ? 255 : 255,
        g: ember ? 140 + Math.random() * 60 : 210,
        b: ember ? 60 : 140,
        a: 0.85,
      });
    }

    // Soft leaf glitter near foliage.
    if (this.foliageCache.length && Math.random() > 0.4) {
      const spot = this.foliageCache[(Math.random() * this.foliageCache.length) | 0]!;
      if (Math.hypot(spot.x - cam.x, spot.y - cam.y) <= viewR) {
        this.spawn({
          x: spot.x + (Math.random() - 0.5) * 0.6,
          y: spot.y + (Math.random() - 0.5) * 0.6,
          z: 20 + Math.random() * 18,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0.15 + Math.random() * 0.25,
          vz: -2 - Math.random() * 4,
          life: 2 + Math.random() * 2,
          maxLife: 4,
          size: 1 + Math.random(),
          kind: "pollen",
          r: 160,
          g: 210,
          b: 120,
          a: 0.4,
        });
      }
    }
  }

  private spawn(p: Particle): void {
    if (this.particles.length >= MAX) this.particles.shift();
    this.particles.push(p);
  }
}

/** Surface hint under an actor for footstep SFX. */
export function surfaceAt(world: World, x: number, y: number): "stone" | "dirt" | "wood" | "sand" {
  const def = world.map.getDef(Math.floor(x), Math.floor(y));
  if (!def) return "dirt";
  const mat = def.material ?? materialFromName(def.name);
  if (mat === "wood") return "wood";
  if (mat === "sand") return "sand";
  if (mat === "dirt" || mat === "grass" || mat === "flower" || mat === "hedge") return "dirt";
  return "stone";
}
