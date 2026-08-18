import { clampByte, fbm, hash2, parseHex, rgb } from "./color";
import type { TileMaterial } from "../world/TileMap";

export type { TileMaterial };

const SIZE = 96;

/**
 * Cached procedural tile textures + a film-grain overlay.
 * Canvas 2D stand-in for a material shader.
 */
export class TextureBank {
  private readonly patterns = new Map<string, CanvasPattern>();
  private grainPattern: CanvasPattern | null = null;
  private readonly scratch: CanvasRenderingContext2D;

  constructor() {
    const c = document.createElement("canvas");
    c.width = SIZE;
    c.height = SIZE;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.scratch = ctx;
  }

  pattern(material: TileMaterial, color: string): CanvasPattern | null {
    const key = `${material}:${color}`;
    const hit = this.patterns.get(key);
    if (hit) return hit;
    paintMaterial(this.scratch, material, color);
    const copy = document.createElement("canvas");
    copy.width = SIZE;
    copy.height = SIZE;
    copy.getContext("2d")!.drawImage(this.scratch.canvas, 0, 0);
    const pat = this.scratch.createPattern(copy, "repeat");
    if (!pat) return null;
    this.patterns.set(key, pat);
    return pat;
  }

  grain(): CanvasPattern | null {
    if (this.grainPattern) return this.grainPattern;
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(128, 128);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = 90 + ((hash2(i, 17, 4) * 80) | 0);
      d[i] = n;
      d[i + 1] = n;
      d[i + 2] = n;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.grainPattern = ctx.createPattern(c, "repeat");
    return this.grainPattern;
  }
}

export const MATERIAL_ID: Record<TileMaterial, number> = {
  generic: 0,
  grass: 1,
  hedge: 2,
  water: 3,
  wood: 4,
  stone: 5,
  roof: 6,
  dirt: 7,
  sand: 8,
  path: 9,
  carpet: 10,
  road: 11,
  cave: 12,
  flower: 13,
};

export function materialIdFromDef(name: string, material?: TileMaterial): number {
  return MATERIAL_ID[material ?? materialFromName(name)];
}

export function materialFromName(name: string): TileMaterial {
  const n = name.toLowerCase();
  if (n.includes("water") || n.includes("pool")) return "water";
  if (n.includes("hedge")) return "hedge";
  if (n.includes("grass")) return "grass";
  if (n.includes("wood") || n.includes("desk")) return "wood";
  if (n.includes("carpet")) return "carpet";
  if (n.includes("flower")) return "flower";
  if (n.includes("sand")) return "sand";
  if (n.includes("dirt")) return "dirt";
  if (n.includes("path") || n.includes("plaza")) return "path";
  if (n.includes("road")) return "road";
  if (n.includes("roof") || n.includes("building")) return "roof";
  if (n.includes("cave")) return "cave";
  if (n.includes("stone") || n.includes("sidewalk") || n.includes("floor")) return "stone";
  return "generic";
}

function paintMaterial(
  ctx: CanvasRenderingContext2D,
  material: TileMaterial,
  color: string,
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const [cr, cg, cb] = parseHex(color);
  const seed = materialSeed(material);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = sample(material, x, y, seed);
      const i = (y * w + x) * 4;
      d[i] = clampByte(cr * t.r + t.add);
      d[i + 1] = clampByte(cg * t.g + t.add);
      d[i + 2] = clampByte(cb * t.b + t.add);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  overlayStrokes(ctx, material, color, seed);
}

interface Sample {
  r: number;
  g: number;
  b: number;
  add: number;
}

function sample(material: TileMaterial, x: number, y: number, seed: number): Sample {
  const n = fbm(x * 0.07, y * 0.07, seed);
  const n2 = fbm(x * 0.18, y * 0.18, seed + 7);

  switch (material) {
    case "grass":
    case "hedge": {
      const patch = n * 0.55 + n2 * 0.45;
      const blade = hash2(x, y, seed) > (material === "hedge" ? 0.55 : 0.72) ? 0.18 : 0;
      const t = 0.72 + patch * 0.45 + blade;
      return { r: t * 0.92, g: t * 1.08, b: t * 0.78, add: material === "hedge" ? -18 : 0 };
    }
    case "water": {
      const wave =
        0.5 +
        0.5 * Math.sin(x * 0.22 + y * 0.08) * Math.sin(x * 0.05 - y * 0.2);
      const caustic = Math.pow(Math.max(0, wave), 3);
      const t = 0.7 + n * 0.2 + caustic * 0.45;
      return { r: t * 0.85, g: t * 1.02, b: t * 1.18, add: caustic * 40 };
    }
    case "wood": {
      const grain = fbm(x * 0.12, y * 0.55, seed);
      const rings = 0.5 + 0.5 * Math.sin(x * 0.38 + grain * 7);
      const knot = n2 > 0.78 ? -0.2 : 0;
      const t = 0.62 + rings * 0.38 + grain * 0.12 + knot;
      return { r: t * 1.08, g: t * 0.95, b: t * 0.72, add: 0 };
    }
    case "stone":
    case "cave": {
      const crack = n2 > 0.82 ? -0.28 : 0;
      const speck = hash2(x, y, seed) * 0.22;
      const t = 0.7 + n * 0.28 + crack + speck - 0.1;
      const cool = material === "cave" ? 0.85 : 1;
      return { r: t * cool, g: t * cool, b: t * 1.05, add: material === "cave" ? -24 : 0 };
    }
    case "roof": {
      const row = Math.floor(y / 7);
      const stagger = (row % 2) * 6;
      const grout = y % 7 === 0 || (x + stagger) % 14 === 0 ? -0.22 : 0;
      const t = 0.78 + n * 0.18 + grout;
      return { r: t, g: t * 0.96, b: t * 0.92, add: 0 };
    }
    case "carpet": {
      const weave = ((x >> 2) + (y >> 2)) % 2 === 0 ? 0.08 : -0.06;
      const t = 0.78 + n * 0.12 + weave;
      return { r: t * 1.05, g: t * 0.9, b: t * 0.98, add: 0 };
    }
    case "path":
    case "dirt":
    case "sand": {
      const pebble = hash2(x >> 1, y >> 1, seed) > 0.88 ? 0.2 : 0;
      const t = 0.74 + n * 0.28 + pebble;
      const warm = material === "sand" ? 1.08 : 1;
      return { r: t * warm, g: t * 0.98, b: t * 0.82, add: material === "sand" ? 8 : 0 };
    }
    case "road": {
      const t = 0.68 + n * 0.22 + (hash2(x, y, seed) > 0.93 ? 0.15 : 0);
      return { r: t, g: t, b: t * 1.04, add: 0 };
    }
    case "flower": {
      const petal = hash2(x >> 2, y >> 2, seed) > 0.7;
      const t = 0.75 + n * 0.2;
      return petal
        ? { r: t * 1.2, g: t * 0.85, b: t * 1.15, add: 20 }
        : { r: t * 0.7, g: t * 1.1, b: t * 0.7, add: 0 };
    }
    default: {
      const t = 0.75 + n * 0.3;
      return { r: t, g: t, b: t, add: 0 };
    }
  }
}

function overlayStrokes(
  ctx: CanvasRenderingContext2D,
  material: TileMaterial,
  color: string,
  seed: number,
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const [cr, cg, cb] = parseHex(color);

  if (material === "grass" || material === "hedge") {
    const count = material === "hedge" ? 420 : 280;
    for (let i = 0; i < count; i++) {
      const x = hash2(i, 1, seed) * w;
      const y = hash2(i, 2, seed) * h;
      const len = 3 + hash2(i, 3, seed) * (material === "hedge" ? 7 : 5);
      ctx.strokeStyle = rgb(
        cr * (0.7 + hash2(i, 4, seed) * 0.5),
        cg * (0.85 + hash2(i, 5, seed) * 0.4),
        cb * (0.55 + hash2(i, 6, seed) * 0.3),
        0.55,
      );
      ctx.lineWidth = material === "hedge" ? 1.2 : 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (hash2(i, 7, seed) - 0.5) * 3, y - len);
      ctx.stroke();
    }
  }

  if (material === "wood") {
    ctx.strokeStyle = rgb(cr * 0.45, cg * 0.4, cb * 0.3, 0.28);
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const x = 6 + i * 9 + hash2(i, 8, seed) * 4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 6) {
        ctx.lineTo(x + Math.sin(y * 0.12 + i) * 2.4, y);
      }
      ctx.stroke();
    }
  }

  if (material === "stone" || material === "cave") {
    ctx.strokeStyle = rgb(20, 22, 28, 0.28);
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      let x = hash2(i, 9, seed) * w;
      let y = hash2(i, 10, seed) * h;
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (hash2(i, 11 + k, seed) - 0.5) * 18;
        y += (hash2(i, 21 + k, seed) - 0.35) * 14;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  if (material === "flower") {
    for (let i = 0; i < 18; i++) {
      const x = hash2(i, 30, seed) * w;
      const y = hash2(i, 31, seed) * h;
      ctx.fillStyle = rgb(
        Math.min(255, cr + 40),
        cg * 0.7,
        Math.min(255, cb + 30),
        0.85,
      );
      ctx.beginPath();
      ctx.arc(x, y, 2.2 + hash2(i, 32, seed) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function materialSeed(material: TileMaterial): number {
  let h = 2166136261;
  for (let i = 0; i < material.length; i++) {
    h ^= material.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}
