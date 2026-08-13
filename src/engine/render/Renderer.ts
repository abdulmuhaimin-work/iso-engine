import type { Camera } from "../Camera";
import type { Assets } from "../Assets";
import type { World } from "../world/World";
import type { Entity } from "../world/Entity";
import type { TileDef, TileMap } from "../world/TileMap";
import { worldToTile } from "../math/Iso";
import type { Vec2 } from "../math/Vec2";
import { BrickRenderer } from "./BrickRenderer";

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
  private readonly bricks = new BrickRenderer();

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

    // Bucket entities by floor tile for iso-order interleaving.
    const buckets = new Map<number, Entity[]>();
    const orphan: Entity[] = [];
    for (const entity of world.entities) {
      if (!entity.active) continue;
      const tx = Math.floor(entity.position.x);
      const ty = Math.floor(entity.position.y);
      if (!map.inBounds(tx, ty)) {
        orphan.push(entity);
        continue;
      }
      const key = map.index(tx, ty);
      const list = buckets.get(key);
      if (list) list.push(entity);
      else buckets.set(key, [entity]);
    }

    // Terrain pass (back → front).
    for (let sum = 0; sum <= map.width + map.height - 2; sum++) {
      for (let tx = 0; tx < map.width; tx++) {
        const ty = sum - tx;
        if (ty < 0 || ty >= map.height) continue;
        const def = map.getDef(tx, ty);
        if (!def) continue;
        this.drawTileColumn(camera, map, tx, ty, def, tileSize);
        const overlay = map.getOverlayDef(tx, ty);
        if (overlay) {
          this.drawOverlay(camera, map, tx, ty, overlay, tileSize);
        }
      }
    }

    if (this.pathTiles && this.pathTiles.length > 0) {
      this.drawPath(camera, map, this.pathTiles, tileSize);
    }

    if (this.hoverTile && map.inBounds(this.hoverTile.x, this.hoverTile.y)) {
      this.drawTileOutline(
        camera,
        map,
        this.hoverTile.x,
        this.hoverTile.y,
        tileSize,
        "#ffe08a",
      );
    }

    // Entity pass in the same iso order (occludes correctly with cliffs).
    for (let sum = 0; sum <= map.width + map.height - 2; sum++) {
      for (let tx = 0; tx < map.width; tx++) {
        const ty = sum - tx;
        if (ty < 0 || ty >= map.height) continue;
        const list = buckets.get(map.index(tx, ty));
        if (!list) continue;
        list.sort((a, b) => a.depth - b.depth);
        const elev = map.elevationPx(tx, ty);
        for (const entity of list) {
          this.drawEntity(entity, camera, elev, assets);
        }
      }
    }

    for (const entity of orphan.sort((a, b) => a.depth - b.depth)) {
      this.drawEntity(entity, camera, 0, assets);
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

  private drawTileColumn(
    camera: Camera,
    map: TileMap,
    tx: number,
    ty: number,
    def: TileDef,
    tileSize: { width: number; height: number },
  ): void {
    const levels = map.getHeight(tx, ty);
    const step = map.layerHeight;
    const bonus = def.elevation ?? 0;

    if (levels <= 0 && bonus <= 0) {
      this.drawPrism(camera, tx, ty, 0, def.color, tileSize, true);
      return;
    }

    for (let h = 0; h < levels; h++) {
      const top = (h + 1) * step;
      const bottom = h * step;
      const isTop = h === levels - 1 && bonus <= 0;
      this.drawPrismSlice(
        camera,
        tx,
        ty,
        bottom,
        top,
        h === levels - 1 ? def.color : shade(def.color, -12 - h * 4),
        tileSize,
        isTop,
      );
    }

    if (bonus > 0) {
      const base = levels * step;
      this.drawPrismSlice(
        camera,
        tx,
        ty,
        base,
        base + bonus,
        shade(def.color, 8),
        tileSize,
        true,
      );
    }
  }

  private drawOverlay(
    camera: Camera,
    map: TileMap,
    tx: number,
    ty: number,
    def: TileDef,
    tileSize: { width: number; height: number },
  ): void {
    const elev = map.elevationPx(tx, ty);
    const foot = camera.worldToScreenElevated({ x: tx + 0.5, y: ty + 0.5 }, elev);
    const { ctx } = this;
    const hw = tileSize.width * 0.72;
    const hh = tileSize.height * 0.72;
    ctx.beginPath();
    ctx.moveTo(foot.x, foot.y - hh);
    ctx.lineTo(foot.x + hw, foot.y);
    ctx.lineTo(foot.x, foot.y + hh);
    ctx.lineTo(foot.x - hw, foot.y);
    ctx.closePath();
    ctx.fillStyle = def.color;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawPrism(
    camera: Camera,
    tx: number,
    ty: number,
    elevPx: number,
    color: string,
    tileSize: { width: number; height: number },
    drawTop: boolean,
  ): void {
    this.drawPrismSlice(camera, tx, ty, 0, elevPx, color, tileSize, drawTop);
  }

  private drawPrismSlice(
    camera: Camera,
    tx: number,
    ty: number,
    bottomPx: number,
    topPx: number,
    color: string,
    tileSize: { width: number; height: number },
    drawTop: boolean,
  ): void {
    const { ctx } = this;
    const foot = camera.worldToScreen({ x: tx + 0.5, y: ty + 0.5 });
    const elevTop = topPx * camera.zoom;
    const elevBottom = bottomPx * camera.zoom;
    const cx = foot.x;
    const cyTop = foot.y - elevTop;
    const thickness = elevTop - elevBottom;
    const hw = tileSize.width;
    const hh = tileSize.height;

    if (thickness > 0.5) {
      ctx.beginPath();
      ctx.moveTo(cx - hw, cyTop);
      ctx.lineTo(cx, cyTop + hh);
      ctx.lineTo(cx, cyTop + hh + thickness);
      ctx.lineTo(cx - hw, cyTop + thickness);
      ctx.closePath();
      ctx.fillStyle = shade(color, -25);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx + hw, cyTop);
      ctx.lineTo(cx, cyTop + hh);
      ctx.lineTo(cx, cyTop + hh + thickness);
      ctx.lineTo(cx + hw, cyTop + thickness);
      ctx.closePath();
      ctx.fillStyle = shade(color, -40);
      ctx.fill();
    }

    if (drawTop) {
      ctx.beginPath();
      ctx.moveTo(cx, cyTop - hh);
      ctx.lineTo(cx + hw, cyTop);
      ctx.lineTo(cx, cyTop + hh);
      ctx.lineTo(cx - hw, cyTop);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      if (this.showGrid) {
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  private drawPath(
    camera: Camera,
    map: TileMap,
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
      const elev = map.elevationPx(t.x, t.y);
      const p = camera.worldToScreenElevated({ x: t.x + 0.5, y: t.y + 0.5 }, elev);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i]!;
      const elev = map.elevationPx(t.x, t.y);
      const p = camera.worldToScreenElevated({ x: t.x + 0.5, y: t.y + 0.5 }, elev);
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
    map: TileMap,
    tx: number,
    ty: number,
    tileSize: { width: number; height: number },
    color: string,
  ): void {
    const { ctx } = this;
    const elev = map.elevationPx(tx, ty);
    const foot = camera.worldToScreenElevated({ x: tx + 0.5, y: ty + 0.5 }, elev);
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

  private drawEntity(
    entity: Entity,
    camera: Camera,
    elevationPx: number,
    assets?: Assets,
  ): void {
    const { ctx } = this;
    const screen = camera.worldToScreenElevated(entity.position, elevationPx);
    const sprite = entity.sprite;
    const ox = (sprite.offsetX ?? 0) * camera.zoom;
    const oy = (sprite.offsetY ?? 0) * camera.zoom;

    if (entity.animator) {
      this.drawSheetFrame(
        entity.animator.sheet.image,
        entity.animator.frame,
        screen.x,
        screen.y,
        camera.zoom,
        entity.animator.scale * (sprite.scale ?? 1),
        ox + entity.animator.offsetX * camera.zoom,
        oy + entity.animator.offsetY * camera.zoom,
        entity.animator.flipX || !!sprite.flipX,
      );
      return;
    }

    if (entity.brickModel) {
      this.bricks.draw(ctx, entity.brickModel, {
        originX: screen.x + ox,
        originY: screen.y + oy,
        scale: (sprite.scale ?? 1) * camera.zoom,
      });
      return;
    }

    if (sprite.sheetKey && assets?.hasSheet(sprite.sheetKey)) {
      const sheet = assets.getSheet(sprite.sheetKey);
      const frame = sheet.frame(sprite.frame ?? 0);
      this.drawSheetFrame(
        sheet.image,
        frame,
        screen.x,
        screen.y,
        camera.zoom,
        sprite.scale ?? 1,
        ox,
        oy,
        !!sprite.flipX,
      );
      return;
    }

    if (sprite.imageKey && assets?.has(sprite.imageKey)) {
      const img = assets.get(sprite.imageKey);
      const scale = sprite.scale ?? 1;
      const w = (sprite.width ?? img.width) * scale * camera.zoom;
      const h = (sprite.height ?? img.height) * scale * camera.zoom;
      this.drawImageFoot(img, screen.x + ox, screen.y + oy, w, h, !!sprite.flipX);
      return;
    }

    const kind = sprite.kind ?? "actor";
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

  /** Draw a sheet frame anchored at foot (bottom-center). */
  private drawSheetFrame(
    image: CanvasImageSource,
    frame: { x: number; y: number; w: number; h: number },
    footX: number,
    footY: number,
    zoom: number,
    scale: number,
    offsetX: number,
    offsetY: number,
    flipX: boolean,
  ): void {
    const w = frame.w * scale * zoom;
    const h = frame.h * scale * zoom;
    this.drawImageFoot(
      image,
      footX + offsetX,
      footY + offsetY,
      w,
      h,
      flipX,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
    );
  }

  private drawImageFoot(
    image: CanvasImageSource,
    footX: number,
    footY: number,
    w: number,
    h: number,
    flipX: boolean,
    sx?: number,
    sy?: number,
    sw?: number,
    sh?: number,
  ): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(footX, footY);
    if (flipX) ctx.scale(-1, 1);
    if (sx !== undefined && sy !== undefined && sw !== undefined && sh !== undefined) {
      ctx.drawImage(image, sx, sy, sw, sh, -w / 2, -h, w, h);
    } else {
      ctx.drawImage(image, -w / 2, -h, w, h);
    }
    ctx.restore();
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
