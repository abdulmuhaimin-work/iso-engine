import { SpriteSheet } from "../engine/render/SpriteSheet";
import { SpriteAnimator, type AnimClip } from "../engine/render/SpriteAnimator";
import { mix, shade } from "../engine/render/color";

const FRAME_W = 56;
const FRAME_H = 84;
const COLS = 4;
const ROWS = 1;

/**
 * Dense procedural NPC sheet tinted by accent color (cloak/tunic).
 */
export function createNpcSheet(accent: string): {
  sheet: SpriteSheet;
  animations: Record<string, AnimClip>;
} {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W * COLS;
  canvas.height = FRAME_H * ROWS;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const tunic = accent;
  const tunicHi = shade(accent, 28);
  const tunicShade = shade(accent, -28);
  const pants = mix(accent, "#1c2434", 0.65);
  const hair = mix(accent, "#141018", 0.75);

  for (let col = 0; col < COLS; col++) {
    drawNpc(ctx, col * FRAME_W, 0, col, tunic, tunicHi, tunicShade, pants, hair);
  }

  const sheet = SpriteSheet.fromGrid(canvas, {
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
    columns: COLS,
    rows: ROWS,
  });

  return {
    sheet,
    animations: {
      idle: { frames: [0, 1], fps: 3, loop: true },
      walk: { frames: [0, 2, 1, 3], fps: 8, loop: true },
    },
  };
}

export function attachNpcAnimator(
  accent: string,
  scale = 0.95,
): SpriteAnimator {
  const art = createNpcSheet(accent);
  return new SpriteAnimator({
    sheet: art.sheet,
    animations: art.animations,
    initial: "idle",
    scale,
  });
}

function drawNpc(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  pose: number,
  tunic: string,
  tunicHi: string,
  tunicShade: string,
  pants: string,
  hair: string,
): void {
  const bob = pose % 2 === 0 ? 0 : -1;
  const stride = pose === 2 ? 3 : pose === 3 ? -3 : 0;
  const arm = pose === 2 ? 3 : pose === 3 ? -3 : 0;
  const fy = oy + bob;

  px(ctx, ox + 18, oy + 78, 20, 4, "rgba(0,0,0,0.35)");

  // Legs
  px(ctx, ox + 18 - stride, fy + 54, 8, 16, pants);
  px(ctx, ox + 30 + stride, fy + 54, 8, 16, pants);
  px(ctx, ox + 17 - stride, fy + 66, 10, 6, "#3a2820");
  px(ctx, ox + 29 + stride, fy + 66, 10, 6, "#3a2820");

  // Body
  px(ctx, ox + 16, fy + 30, 24, 26, tunic);
  px(ctx, ox + 18, fy + 32, 20, 6, tunicHi);
  px(ctx, ox + 16, fy + 48, 24, 8, tunicShade);
  px(ctx, ox + 24, fy + 30, 8, 6, "#f0c9a0");
  px(ctx, ox + 16, fy + 46, 24, 3, "#8b5a2b");

  // Arms
  px(ctx, ox + 10, fy + 34 + arm, 6, 14, tunic);
  px(ctx, ox + 40, fy + 34 - arm, 6, 14, tunic);
  px(ctx, ox + 9, fy + 46 + arm, 6, 5, "#f0c9a0");
  px(ctx, ox + 41, fy + 46 - arm, 6, 5, "#f0c9a0");

  // Head
  px(ctx, ox + 20, fy + 12, 16, 18, "#f0c9a0");
  px(ctx, ox + 22, fy + 26, 12, 3, "#d4a078");
  px(ctx, ox + 18, fy + 8, 20, 10, hair);
  px(ctx, ox + 20, fy + 6, 16, 4, hair);
  px(ctx, ox + 17, fy + 12, 4, 8, hair);
  px(ctx, ox + 35, fy + 12, 4, 8, hair);
  px(ctx, ox + 23, fy + 18, 3, 3, "#f5efe6");
  px(ctx, ox + 30, fy + 18, 3, 3, "#f5efe6");
  px(ctx, ox + 24, fy + 18, 2, 3, "#141018");
  px(ctx, ox + 31, fy + 18, 2, 3, "#141018");
  px(ctx, ox + 26, fy + 24, 4, 1, "#b88060");
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}
