import {
  BrickModel,
  brickToScreen,
  type Brick,
  type BrickMetrics,
} from "./BrickModel";

export interface BrickRenderOptions {
  /** Origin on the canvas where grid (0,0,0) foot sits. */
  originX: number;
  originY: number;
  scale?: number;
  /** Draw a ground diamond under the model. */
  ground?: boolean;
  groundColor?: string;
  /** Optional ghost brick preview. */
  ghost?: Brick | null;
}

/**
 * Draws lego-style isometric cubes for a BrickModel.
 */
export class BrickRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    model: BrickModel,
    options: BrickRenderOptions,
  ): void {
    const scale = options.scale ?? 1;
    const m = scaleMetrics(model.metrics, scale);
    const ox = options.originX;
    const oy = options.originY;

    if (options.ground) {
      drawGround(ctx, ox, oy, m, options.groundColor ?? "rgba(255,255,255,0.08)");
    }

    for (const brick of model.sorted()) {
      const p = brickToScreen(brick.x, brick.y, brick.z, m);
      drawCube(ctx, ox + p.x, oy + p.y, m, brick.color, 1);
    }

    if (options.ghost) {
      const g = options.ghost;
      const p = brickToScreen(g.x, g.y, g.z, m);
      drawCube(ctx, ox + p.x, oy + p.y, m, g.color, 0.45);
    }
  }

  /**
   * Rasterize model to a transparent PNG blob, foot-anchored in the frame.
   * Useful for entity sprites / sprite sheets.
   */
  async toPngBlob(
    model: BrickModel,
    options: { padding?: number; scale?: number } = {},
  ): Promise<Blob> {
    const canvas = this.toCanvas(model, options);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error("Failed to encode PNG"));
        else resolve(blob);
      }, "image/png");
    });
  }

  toCanvas(
    model: BrickModel,
    options: { padding?: number; scale?: number } = {},
  ): HTMLCanvasElement {
    const scale = options.scale ?? 2;
    const padding = options.padding ?? 8;
    const m = scaleMetrics(model.metrics, scale);
    const bounds = model.bounds();
    const canvas = document.createElement("canvas");

    if (!bounds) {
      canvas.width = 32;
      canvas.height = 32;
      return canvas;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const brick of model.bricks) {
      const p = brickToScreen(brick.x, brick.y, brick.z, m);
      // cube extents roughly ±tileWidth / tileHeight+brickHeight
      minX = Math.min(minX, p.x - m.tileWidth);
      maxX = Math.max(maxX, p.x + m.tileWidth);
      minY = Math.min(minY, p.y - m.brickHeight - m.tileHeight);
      maxY = Math.max(maxY, p.y + m.tileHeight);
    }

    const width = Math.ceil(maxX - minX + padding * 2);
    const height = Math.ceil(maxY - minY + padding * 2);
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const ctx = canvas.getContext("2d")!;
    const originX = -minX + padding;
    const originY = -minY + padding;
    this.draw(ctx, model, { originX, originY, scale });
    return canvas;
  }
}

function scaleMetrics(metrics: BrickMetrics, scale: number): BrickMetrics {
  return {
    tileWidth: metrics.tileWidth * scale,
    tileHeight: metrics.tileHeight * scale,
    brickHeight: metrics.brickHeight * scale,
  };
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  m: BrickMetrics,
  color: string,
): void {
  ctx.beginPath();
  ctx.moveTo(ox, oy - m.tileHeight);
  ctx.lineTo(ox + m.tileWidth, oy);
  ctx.lineTo(ox, oy + m.tileHeight);
  ctx.lineTo(ox - m.tileWidth, oy);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawCube(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  m: BrickMetrics,
  color: string,
  alpha = 1,
): void {
  const tw = m.tileWidth;
  const th = m.tileHeight;
  const h = m.brickHeight;
  const topY = cy - h;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Left face
  ctx.beginPath();
  ctx.moveTo(cx - tw, topY);
  ctx.lineTo(cx, topY + th);
  ctx.lineTo(cx, topY + th + h);
  ctx.lineTo(cx - tw, topY + h);
  ctx.closePath();
  ctx.fillStyle = shade(color, -28);
  ctx.fill();

  // Right face
  ctx.beginPath();
  ctx.moveTo(cx + tw, topY);
  ctx.lineTo(cx, topY + th);
  ctx.lineTo(cx, topY + th + h);
  ctx.lineTo(cx + tw, topY + h);
  ctx.closePath();
  ctx.fillStyle = shade(color, -48);
  ctx.fill();

  // Top face
  ctx.beginPath();
  ctx.moveTo(cx, topY - th);
  ctx.lineTo(cx + tw, topY);
  ctx.lineTo(cx, topY + th);
  ctx.lineTo(cx - tw, topY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Subtle edge
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

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
