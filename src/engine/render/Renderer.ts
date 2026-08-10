import type { Camera } from "../Camera";
import type { Assets } from "../Assets";
import type { World } from "../world/World";
import type { Entity } from "../world/Entity";
import type { TileDef } from "../world/TileMap";
import { worldToTile } from "../math/Iso";
import type { Vec2 } from "../math/Vec2";

export interface RendererOptions {
  clearColor?: string;
  showGrid?: boolean;
  hoverTile?: Vec2 | null;
}

/**
 * Canvas 2D isometric renderer: diamond tiles + depth-sorted entities.
 */
export class Renderer {
  clearColor: string;
  showGrid: boolean;
  hoverTile: Vec2 | null = null;
  /** Optional tile path to highlight (integer coords). */
  pathTiles: Vec2[] | null = null;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    options: RendererOptions = {},
  ) {
    this.clearColor = options.clearColor ?? "#1a1f2b";
    this.showGrid = options.showGrid ?? true;
  }

  clear(width: number, height: number): void {
    const { ctx } = this;
    ctx.fillStyle = this.clearColor;
    ctx.fillRect(0, 0, width, height);
  }

  render(world: World, camera: Camera, assets?: Assets): void {
    const { ctx } = this;
    const vw = camera.viewportWidth;
    const vh = camera.viewportHeight;
    this.clear(vw, vh);

    const tileSize = camera.tileSize();
    const map = world.map;

    // Paint tiles in diamond-traversal order (back → front).
    for (let sum = 0; sum <= map.width + map.height - 2; sum++) {
      for (let tx = 0; tx < map.width; tx++) {
        const ty = sum - tx;
        if (ty < 0 || ty >= map.height) continue;
        const def = map.getDef(tx, ty);
        if (!def) continue;
        this.drawTile(camera, tx, ty, def, tileSize);
      }
    }

    if (this.pathTiles && this.pathTiles.length > 0) {
      this.drawPath(camera, this.pathTiles, tileSize);
    }

    if (this.hoverTile && map.inBounds(this.hoverTile.x, this.hoverTile.y)) {
      this.drawTileOutline(camera, this.hoverTile.x, this.hoverTile.y, tileSize, "#ffe08a");
    }

    for (const entity of world.sortedEntities()) {
      this.drawEntity(entity, camera, assets);
    }

    // Soft vignette for atmosphere
    const g = ctx.createRadialGradient(
      vw / 2,
      vh / 2,
      Math.min(vw, vh) * 0.25,
      vw / 2,
      vh / 2,
      Math.max(vw, vh) * 0.75,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
  }

  private drawTile(
    camera: Camera,
    tx: number,
    ty: number,
    def: TileDef,
    tileSize: { width: number; height: number },
  ): void {
    const { ctx } = this;
    const elev = (def.elevation ?? 0) * camera.zoom;
    const foot = camera.worldToScreen({ x: tx + 0.5, y: ty + 0.5 });
    const cx = foot.x;
    const cy = foot.y - elev;
    const hw = tileSize.width;
    const hh = tileSize.height;

    // Side face for elevated tiles
    if (elev > 0) {
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx, cy + hh + elev);
      ctx.lineTo(cx - hw, cy + elev);
      ctx.closePath();
      ctx.fillStyle = shade(def.color, -25);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx + hw, cy);
      ctx.lineTo(cx, cy + hh);
      ctx.lineTo(cx, cy + hh + elev);
      ctx.lineTo(cx + hw, cy + elev);
      ctx.closePath();
      ctx.fillStyle = shade(def.color, -40);
      ctx.fill();
    }

    // Top diamond
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fillStyle = def.color;
    ctx.fill();

    if (this.showGrid) {
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawPath(
    camera: Camera,
    tiles: Vec2[],
    tileSize: { width: number; height: number },
  ): void {
    const { ctx } = this;
    if (tiles.length === 0) return;

    ctx.save();
    ctx.lineWidth = Math.max(2, 2.5 * camera.zoom);
    ctx.strokeStyle = "rgba(255, 224, 138, 0.85)";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i]!;
      const p = camera.worldToScreen({ x: t.x + 0.5, y: t.y + 0.5 });
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i]!;
      const p = camera.worldToScreen({ x: t.x + 0.5, y: t.y + 0.5 });
      const r = Math.max(2, tileSize.height * 0.35);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle =
        i === tiles.length - 1
          ? "rgba(255, 196, 80, 0.95)"
          : "rgba(255, 224, 138, 0.75)";
      ctx.fill();
    }
    ctx.restore();
  }

  private drawTileOutline(
    camera: Camera,
    tx: number,
    ty: number,
    tileSize: { width: number; height: number },
    color: string,
  ): void {
    const { ctx } = this;
    const foot = camera.worldToScreen({ x: tx + 0.5, y: ty + 0.5 });
    const cx = foot.x;
    const cy = foot.y;
    const hw = tileSize.width;
    const hh = tileSize.height;

    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawEntity(entity: Entity, camera: Camera, assets?: Assets): void {
    const { ctx } = this;
    const screen = camera.worldToScreen(entity.position);
    const sprite = entity.sprite;
    const kind = sprite.kind ?? (sprite.imageKey ? "block" : "actor");
    const ox = (sprite.offsetX ?? 0) * camera.zoom;
    const oy = (sprite.offsetY ?? 0) * camera.zoom;

    if (sprite.imageKey && assets?.has(sprite.imageKey)) {
      const img = assets.get(sprite.imageKey);
      const w = (sprite.width ?? img.width) * camera.zoom;
      const h = (sprite.height ?? img.height) * camera.zoom;
      ctx.drawImage(img, screen.x - w / 2 + ox, screen.y - h + oy, w, h);
      return;
    }

    const color = sprite.color ?? "#f2f2f2";

    if (kind === "actor") {
      const r = 10 * camera.zoom;
      ctx.beginPath();
      ctx.ellipse(screen.x + ox, screen.y + oy, r * 0.7, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(
        screen.x - r * 0.55 + ox,
        screen.y - r * 2.2 + oy,
        r * 1.1,
        r * 1.8,
        r * 0.4,
      );
      ctx.fillStyle = color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(screen.x + ox, screen.y - r * 2.4 + oy, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = shade(color, 20);
      ctx.fill();
      return;
    }

    if (kind === "block") {
      const hw = (sprite.width ?? 18) * camera.zoom * 0.5;
      const h = (sprite.height ?? 28) * camera.zoom;
      ctx.fillStyle = shade(color, -30);
      ctx.fillRect(screen.x - hw + ox, screen.y - h + oy, hw * 2, h);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(screen.x - hw + ox, screen.y - h + oy);
      ctx.lineTo(screen.x + ox, screen.y - h - hw * 0.5 + oy);
      ctx.lineTo(screen.x + hw + ox, screen.y - h + oy);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // diamond marker
    const s = 8 * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(screen.x + ox, screen.y - s + oy);
    ctx.lineTo(screen.x + s + ox, screen.y + oy);
    ctx.lineTo(screen.x + ox, screen.y + s + oy);
    ctx.lineTo(screen.x - s + ox, screen.y + oy);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
}

/** Nudge a hex color by amount (-255..255). */
function shade(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const num = parseInt(raw, 16);
  const r = clampByte(((num >> 16) & 0xff) + amount);
  const g = clampByte(((num >> 8) & 0xff) + amount);
  const b = clampByte((num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function clampByte(v: number): number {
  return Math.min(255, Math.max(0, v | 0));
}

/** Helper: screen hover → integer tile. */
export function pickTile(camera: Camera, screen: Vec2): Vec2 {
  return worldToTile(camera.screenToWorld(screen));
}
