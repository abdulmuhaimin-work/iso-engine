import type { Camera } from "../Camera";
import type { Assets } from "../Assets";
import type { World } from "../world/World";
import type { Entity } from "../world/Entity";
import type { TileDef, TileMap } from "../world/TileMap";
import { worldToTile } from "../math/Iso";
import type { Vec2 } from "../math/Vec2";
import { BrickRenderer } from "./BrickRenderer";
import { mix, shade } from "./color";
import { materialFromName, TextureBank, type TileMaterial } from "./textures";

export interface RendererOptions {
  clearColor?: string;
  showGrid?: boolean;
  hoverTile?: Vec2 | null;
  /** Use WebGL2 when constructing from a canvas (default true). */
  webgl?: boolean;
}

/**
 * Canvas 2D isometric renderer (fallback when WebGL2 is unavailable).
 */
export class CanvasRenderer {
  clearColor: string;
  showGrid: boolean;
  hoverTile: Vec2 | null = null;
  /** Optional tile path to highlight (integer coords). */
  pathTiles: Vec2[] | null = null;
  private readonly bricks = new BrickRenderer();
  private readonly textures = new TextureBank();

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    options: RendererOptions = {},
  ) {
    this.clearColor = options.clearColor ?? "#1a1f2b";
    this.showGrid = options.showGrid ?? true;
  }

  resize(cssWidth: number, _cssHeight: number): void {
    const dpr = this.ctx.canvas.width / Math.max(1, cssWidth);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  clear(width: number, height: number): void {
    const { ctx } = this;
    ctx.fillStyle = this.clearColor;
    ctx.fillRect(0, 0, width, height);
  }

  render(world: World, camera: Camera, assets?: Assets, time = 0): void {
    const { ctx } = this;
    ctx.imageSmoothingEnabled = true;
    const vw = camera.viewportWidth;
    const vh = camera.viewportHeight;
    this.drawSky(vw, vh);

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
        this.drawTileColumn(camera, map, tx, ty, def, tileSize, time);
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

    this.drawAtmosphere(vw, vh);
  }

  private drawSky(width: number, height: number): void {
    const { ctx } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, shade(this.clearColor, 48));
    sky.addColorStop(0.42, this.clearColor);
    sky.addColorStop(1, mix(this.clearColor, "#0a1218", 0.45));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const sun = ctx.createRadialGradient(
      width * 0.22,
      height * 0.12,
      8,
      width * 0.22,
      height * 0.12,
      Math.max(width, height) * 0.45,
    );
    sun.addColorStop(0, "rgba(255, 214, 160, 0.22)");
    sun.addColorStop(0.35, "rgba(255, 180, 110, 0.08)");
    sun.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, width, height);
  }

  private drawAtmosphere(width: number, height: number): void {
    const { ctx } = this;
    const g = ctx.createRadialGradient(
      width * 0.42,
      height * 0.32,
      Math.min(width, height) * 0.18,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.78,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.65, "rgba(8, 14, 22, 0.12)");
    g.addColorStop(1, "rgba(6, 10, 16, 0.46)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    const grain = this.textures.grain();
    if (grain) {
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = grain;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  private drawTileColumn(
    camera: Camera,
    map: TileMap,
    tx: number,
    ty: number,
    def: TileDef,
    tileSize: { width: number; height: number },
    time: number,
  ): void {
    const levels = map.getHeight(tx, ty);
    const step = map.layerHeight;
    const bonus = def.elevation ?? 0;
    const material = def.material ?? materialFromName(def.name);

    if (levels <= 0 && bonus <= 0) {
      this.drawPrismSlice(
        camera,
        map,
        tx,
        ty,
        0,
        0,
        def.color,
        material,
        tileSize,
        true,
        time,
      );
      return;
    }

    for (let h = 0; h < levels; h++) {
      const top = (h + 1) * step;
      const bottom = h * step;
      const isTop = h === levels - 1 && bonus <= 0;
      this.drawPrismSlice(
        camera,
        map,
        tx,
        ty,
        bottom,
        top,
        h === levels - 1 ? def.color : shade(def.color, -12 - h * 4),
        material,
        tileSize,
        isTop,
        time,
      );
    }

    if (bonus > 0) {
      const base = levels * step;
      this.drawPrismSlice(
        camera,
        map,
        tx,
        ty,
        base,
        base + bonus,
        shade(def.color, 8),
        material,
        tileSize,
        true,
        time,
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
    const material = def.material ?? materialFromName(def.name);
    const hw = tileSize.width * 0.72;
    const hh = tileSize.height * 0.72;

    if (material === "flower") {
      this.drawFlowerTuft(foot.x, foot.y, hw, def.color);
      return;
    }

    this.fillTexturedDiamond(foot.x, foot.y, hw, hh, def.color, material, tx, ty, 0);
    this.shadeTopFace(foot.x, foot.y, hw, hh, 0.2);
  }

  private drawFlowerTuft(cx: number, cy: number, scale: number, color: string): void {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = "rgba(40, 90, 48, 0.55)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + scale * 0.15, scale * 0.42, scale * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    const petals = [
      { x: 0, y: -0.55, s: 0.28 },
      { x: 0.38, y: -0.18, s: 0.22 },
      { x: -0.34, y: -0.12, s: 0.24 },
      { x: 0.12, y: 0.12, s: 0.2 },
    ];
    for (const p of petals) {
      ctx.beginPath();
      ctx.ellipse(cx + p.x * scale, cy + p.y * scale, scale * p.s, scale * p.s * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = shade(color, 36);
      ctx.beginPath();
      ctx.ellipse(
        cx + p.x * scale - scale * 0.06,
        cy + p.y * scale - scale * 0.05,
        scale * p.s * 0.35,
        scale * p.s * 0.25,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPrismSlice(
    camera: Camera,
    map: TileMap,
    tx: number,
    ty: number,
    bottomPx: number,
    topPx: number,
    color: string,
    material: TileMaterial,
    tileSize: { width: number; height: number },
    drawTop: boolean,
    time: number,
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
      this.fillFace(
        [
          [cx - hw, cyTop],
          [cx, cyTop + hh],
          [cx, cyTop + hh + thickness],
          [cx - hw, cyTop + thickness],
        ],
        shade(color, -22),
        material,
        tx,
        ty,
        "left",
      );
      this.shadeQuad(
        [
          [cx - hw, cyTop],
          [cx, cyTop + hh],
          [cx, cyTop + hh + thickness],
          [cx - hw, cyTop + thickness],
        ],
        "rgba(255, 236, 200, 0.1)",
        "rgba(8, 12, 20, 0.38)",
        cx - hw,
        cyTop,
        cx,
        cyTop + hh + thickness,
      );

      this.fillFace(
        [
          [cx + hw, cyTop],
          [cx, cyTop + hh],
          [cx, cyTop + hh + thickness],
          [cx + hw, cyTop + thickness],
        ],
        shade(color, -44),
        material,
        tx,
        ty,
        "right",
      );
      this.shadeQuad(
        [
          [cx + hw, cyTop],
          [cx, cyTop + hh],
          [cx, cyTop + hh + thickness],
          [cx + hw, cyTop + thickness],
        ],
        "rgba(40, 50, 70, 0.08)",
        "rgba(4, 8, 14, 0.5)",
        cx,
        cyTop,
        cx + hw,
        cyTop + hh + thickness,
      );
    }

    if (drawTop) {
      this.fillTexturedDiamond(cx, cyTop, hw, hh, color, material, tx, ty, time);
      this.shadeTopFace(cx, cyTop, hw, hh, material === "water" ? 0.12 : 0.28);
      this.drawAmbientOcclusion(map, tx, ty, cx, cyTop, hw, hh);

      if (material === "water") {
        this.drawWaterSheen(cx, cyTop, hw, hh, time);
      }

      ctx.lineWidth = 1.15;
      ctx.strokeStyle = "rgba(255, 248, 230, 0.22)";
      ctx.beginPath();
      ctx.moveTo(cx, cyTop - hh);
      ctx.lineTo(cx - hw, cyTop);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.beginPath();
      ctx.moveTo(cx, cyTop - hh);
      ctx.lineTo(cx + hw, cyTop);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
      ctx.beginPath();
      ctx.moveTo(cx - hw, cyTop);
      ctx.lineTo(cx, cyTop + hh);
      ctx.lineTo(cx + hw, cyTop);
      ctx.stroke();

      if (this.showGrid) {
        ctx.beginPath();
        diamond(ctx, cx, cyTop, hw, hh);
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  private fillTexturedDiamond(
    cx: number,
    cy: number,
    hw: number,
    hh: number,
    color: string,
    material: TileMaterial,
    tx: number,
    ty: number,
    time: number,
  ): void {
    const { ctx } = this;
    ctx.beginPath();
    diamond(ctx, cx, cy, hw, hh);
    ctx.fillStyle = this.faceFill(color, material, tx, ty, time);
    ctx.fill();
  }

  private fillFace(
    points: number[][],
    color: string,
    material: TileMaterial,
    tx: number,
    ty: number,
    face: "left" | "right",
  ): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(points[0]![0]!, points[0]![1]!);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]![0]!, points[i]![1]!);
    ctx.closePath();
    ctx.fillStyle = this.faceFill(color, material, tx + (face === "right" ? 3 : 0), ty, 0);
    ctx.fill();
  }

  private faceFill(
    color: string,
    material: TileMaterial,
    tx: number,
    ty: number,
    time: number,
  ): string | CanvasPattern {
    const pat = this.textures.pattern(material, color);
    if (!pat) return color;
    const ox = ((tx * 37 + ty * 19) % 96) + (material === "water" ? Math.sin(time * 0.7) * 10 : 0);
    const oy = ((tx * 13 + ty * 29) % 96) + (material === "water" ? Math.cos(time * 0.55) * 8 : 0);
    pat.setTransform(new DOMMatrix().translateSelf(ox, oy));
    return pat;
  }

  private shadeTopFace(cx: number, cy: number, hw: number, hh: number, amount: number): void {
    const { ctx } = this;
    const light = ctx.createLinearGradient(cx - hw, cy - hh, cx + hw * 0.7, cy + hh);
    light.addColorStop(0, `rgba(255, 246, 220, ${0.42 * amount + 0.12})`);
    light.addColorStop(0.45, "rgba(255,255,255,0.04)");
    light.addColorStop(1, `rgba(16, 26, 44, ${0.55 * amount + 0.12})`);
    ctx.beginPath();
    diamond(ctx, cx, cy, hw, hh);
    ctx.fillStyle = light;
    ctx.fill();
  }

  private shadeQuad(
    points: number[][],
    from: string,
    to: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): void {
    const { ctx } = this;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    ctx.beginPath();
    ctx.moveTo(points[0]![0]!, points[0]![1]!);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]![0]!, points[i]![1]!);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
  }

  private drawAmbientOcclusion(
    map: TileMap,
    tx: number,
    ty: number,
    cx: number,
    cy: number,
    hw: number,
    hh: number,
  ): void {
    const { ctx } = this;
    const h = map.elevationPx(tx, ty);
    let a = 0;
    if (map.inBounds(tx - 1, ty) && map.elevationPx(tx - 1, ty) > h + 3) a += 0.16;
    if (map.inBounds(tx, ty - 1) && map.elevationPx(tx, ty - 1) > h + 3) a += 0.14;
    if (map.inBounds(tx + 1, ty) && map.elevationPx(tx + 1, ty) > h + 8) a += 0.08;
    if (map.inBounds(tx, ty + 1) && map.elevationPx(tx, ty + 1) > h + 8) a += 0.06;
    if (a <= 0) return;
    ctx.beginPath();
    diamond(ctx, cx, cy, hw, hh);
    ctx.fillStyle = `rgba(6, 10, 16, ${Math.min(0.38, a)})`;
    ctx.fill();
  }

  private drawWaterSheen(cx: number, cy: number, hw: number, hh: number, time: number): void {
    const { ctx } = this;
    const t = time * 0.9;
    const gx = cx + Math.sin(t) * hw * 0.35;
    const gy = cy + Math.cos(t * 0.8) * hh * 0.25;
    const sheen = ctx.createRadialGradient(gx, gy, 2, gx, gy, hw * 0.85);
    sheen.addColorStop(0, "rgba(230, 250, 255, 0.28)");
    sheen.addColorStop(0.45, "rgba(160, 210, 230, 0.08)");
    sheen.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    diamond(ctx, cx, cy, hw, hh);
    ctx.fillStyle = sheen;
    ctx.fill();
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

      const body = ctx.createLinearGradient(
        screen.x + ox,
        screen.y - r * 2.2 + oy,
        screen.x + ox,
        screen.y + oy,
      );
      body.addColorStop(0, shade(color, 28));
      body.addColorStop(0.55, color);
      body.addColorStop(1, shade(color, -32));
      ctx.beginPath();
      ctx.roundRect(
        screen.x - r * 0.55 + ox,
        screen.y - r * 2.2 + oy,
        r * 1.1,
        r * 1.8,
        r * 0.4,
      );
      ctx.fillStyle = body;
      ctx.fill();

      const head = ctx.createRadialGradient(
        screen.x - r * 0.12 + ox,
        screen.y - r * 2.55 + oy,
        r * 0.08,
        screen.x + ox,
        screen.y - r * 2.4 + oy,
        r * 0.5,
      );
      head.addColorStop(0, shade(color, 50));
      head.addColorStop(1, shade(color, 8));
      ctx.beginPath();
      ctx.arc(screen.x + ox, screen.y - r * 2.4 + oy, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = head;
      ctx.fill();
      return;
    }

    if (kind === "block") {
      const hw = (sprite.width ?? 18) * camera.zoom * 0.5;
      const h = (sprite.height ?? 28) * camera.zoom;
      const x = screen.x + ox;
      const y = screen.y + oy;
      const left = ctx.createLinearGradient(x - hw, y - h, x, y);
      left.addColorStop(0, shade(color, -8));
      left.addColorStop(1, shade(color, -38));
      ctx.fillStyle = left;
      ctx.fillRect(x - hw, y - h, hw * 2, h);
      const top = ctx.createLinearGradient(x - hw, y - h, x + hw, y - h + hw);
      top.addColorStop(0, shade(color, 36));
      top.addColorStop(1, shade(color, -10));
      ctx.fillStyle = top;
      ctx.beginPath();
      ctx.moveTo(x - hw, y - h);
      ctx.lineTo(x, y - h - hw * 0.5);
      ctx.lineTo(x + hw, y - h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.moveTo(x - hw, y - h);
      ctx.lineTo(x, y - h - hw * 0.5);
      ctx.stroke();
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

function diamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
): void {
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
}

/** Helper: screen hover → integer tile. */
export function pickTile(camera: Camera, screen: Vec2): Vec2 {
  return worldToTile(camera.screenToWorld(screen));
}
