import { SpriteSheet } from "../engine/render/SpriteSheet";
import type { AnimClip } from "../engine/render/SpriteAnimator";

const FRAME_W = 32;
const FRAME_H = 48;
const COLS = 4;
const ROWS = 2;

export interface DemoHeroSheet {
  sheet: SpriteSheet;
  animations: Record<string, AnimClip>;
}

/**
 * Procedural hero sheet so the demo works without external art.
 * Row 0: idle (2) + walk (2 more) facing south-east-ish.
 * Row 1: darker variant used as “north” facing (same poses).
 */
export function createDemoHeroSheet(): DemoHeroSheet {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W * COLS;
  canvas.height = FRAME_H * ROWS;
  const ctx = canvas.getContext("2d")!;

  const body = "#e8b86d";
  const bodyDark = "#c4924a";
  const accent = "#3d5a4c";

  for (let row = 0; row < ROWS; row++) {
    const tone = row === 0 ? body : bodyDark;
    for (let col = 0; col < COLS; col++) {
      const ox = col * FRAME_W;
      const oy = row * FRAME_H;
      drawHeroFrame(ctx, ox, oy, tone, accent, col);
    }
  }

  const sheet = SpriteSheet.fromGrid(canvas, {
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
    columns: COLS,
    rows: ROWS,
  });

  const animations: Record<string, AnimClip> = {
    idle: { frames: [0, 1], fps: 3, loop: true },
    walk: { frames: [0, 2, 1, 3], fps: 8, loop: true },
    idle_n: { frames: [4, 5], fps: 3, loop: true },
    walk_n: { frames: [4, 6, 5, 7], fps: 8, loop: true },
  };

  return { sheet, animations };
}

function drawHeroFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  body: string,
  accent: string,
  pose: number,
): void {
  const cx = ox + FRAME_W / 2;
  const footY = oy + FRAME_H - 4;

  // Bob / stride offsets by pose index
  const bob = pose % 2 === 0 ? 0 : -1;
  const stride = pose === 2 ? 2 : pose === 3 ? -2 : 0;
  const arm = pose === 2 ? 3 : pose === 3 ? -3 : 0;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(cx, footY, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 3, footY - 14 + bob);
  ctx.lineTo(cx - 4 - stride, footY - 1);
  ctx.moveTo(cx + 3, footY - 14 + bob);
  ctx.lineTo(cx + 4 + stride, footY - 1);
  ctx.stroke();

  // Body
  ctx.fillStyle = body;
  roundRect(ctx, cx - 7, footY - 30 + bob, 14, 16, 4);
  ctx.fill();

  // Arms
  ctx.strokeStyle = body;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 7, footY - 26 + bob);
  ctx.lineTo(cx - 11, footY - 18 + bob + arm);
  ctx.moveTo(cx + 7, footY - 26 + bob);
  ctx.lineTo(cx + 11, footY - 18 + bob - arm);
  ctx.stroke();

  // Head
  ctx.fillStyle = "#f3d7a8";
  ctx.beginPath();
  ctx.arc(cx, footY - 36 + bob, 6, 0, Math.PI * 2);
  ctx.fill();

  // Hair / hat accent
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(cx, footY - 38 + bob, 6, Math.PI, 0);
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
