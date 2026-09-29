import { SpriteSheet } from "../engine/render/SpriteSheet";
import type { AnimClip } from "../engine/render/SpriteAnimator";

/** Density-2 design resolution — clear step up from 48×72. */
const FRAME_W = 72;
const FRAME_H = 108;
const COLS = 4;
const ROWS = 2;

const P = {
  outline: "#100c14",
  skin: "#f0c9a0",
  skinShade: "#d4a078",
  skinDeep: "#b88060",
  skinHi: "#f8e0c0",
  hair: "#1c141c",
  hairHi: "#4a3540",
  hairMid: "#352430",
  tunic: "#3d6b5c",
  tunicHi: "#5aaa88",
  tunicMid: "#4a8a70",
  tunicShade: "#2a4a40",
  cloak: "#245068",
  cloakHi: "#3a7898",
  cloakMid: "#2e6480",
  cloakShade: "#183848",
  belt: "#8b5a2b",
  beltHi: "#c49050",
  buckle: "#e8d080",
  pants: "#2c3448",
  pantsHi: "#4a5670",
  pantsShade: "#1c2434",
  boot: "#3a2820",
  bootHi: "#5a4030",
  bootShade: "#241810",
  eye: "#100c14",
  eyeWhite: "#f5efe6",
  blush: "#e8a090",
  shadow: "#0a0810",
  scarf: "#c45c48",
  scarfHi: "#e07868",
  scarfShade: "#8a3028",
  pouch: "#6e4424",
} as const;

export interface DemoHeroSheet {
  sheet: SpriteSheet;
  animations: Record<string, AnimClip>;
}

/**
 * Procedural ultra-dense pixel hero (72×108 frames).
 * Row 0: SE idle/walk · Row 1: north-facing variants.
 */
export function createDemoHeroSheet(): DemoHeroSheet {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W * COLS;
  canvas.height = FRAME_H * ROWS;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      drawHeroFrame(ctx, col * FRAME_W, row * FRAME_H, col, row === 1);
    }
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
      walk: { frames: [0, 2, 1, 3], fps: 10, loop: true },
      idle_n: { frames: [4, 5], fps: 3, loop: true },
      walk_n: { frames: [4, 6, 5, 7], fps: 10, loop: true },
    },
  };
}

function drawHeroFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  pose: number,
  north: boolean,
): void {
  const bob = pose % 2 === 0 ? 0 : -2;
  const stride = pose === 2 ? 4 : pose === 3 ? -4 : 0;
  const armSwing = pose === 2 ? 4 : pose === 3 ? -4 : 0;
  const breath = pose === 1 || pose === 5 ? 1 : 0;

  fillEllipsePx(ctx, ox + 36, oy + 100, 20, 5, P.shadow, 0.45);

  const fy = oy + bob;
  const cloak = north ? P.cloakShade : P.cloak;
  const cloakHi = north ? P.cloakMid : P.cloakHi;
  const tunic = north ? P.tunicShade : P.tunic;
  const tunicHi = north ? P.tunicMid : P.tunicHi;

  // Cloak with layered folds
  px(ctx, ox + 16, fy + 38, 40, 36, cloak);
  px(ctx, ox + 14, fy + 42, 4, 28, P.cloakShade);
  px(ctx, ox + 54, fy + 42, 4, 28, cloakHi);
  px(ctx, ox + 18, fy + 68, 36, 8, P.cloakShade);
  px(ctx, ox + 24, fy + 44, 2, 22, P.cloakShade);
  px(ctx, ox + 34, fy + 46, 2, 20, cloakHi);
  px(ctx, ox + 46, fy + 44, 2, 22, P.cloakShade);
  px(ctx, ox + 28, fy + 60, 8, 3, cloakHi);
  px(ctx, ox + 40, fy + 62, 6, 2, P.cloakMid);

  // Legs
  const ly = fy + 70;
  px(ctx, ox + 24 - stride, ly, 9, 18, P.pants);
  px(ctx, ox + 39 + stride, ly, 9, 18, P.pants);
  px(ctx, ox + 24 - stride, ly, 9, 6, P.pantsHi);
  px(ctx, ox + 39 + stride, ly, 9, 6, P.pantsHi);
  px(ctx, ox + 24 - stride, ly + 12, 9, 3, P.pantsShade);
  px(ctx, ox + 39 + stride, ly + 12, 9, 3, P.pantsShade);

  // Boots
  px(ctx, ox + 22 - stride, ly + 16, 12, 8, P.boot);
  px(ctx, ox + 38 + stride, ly + 16, 12, 8, P.boot);
  px(ctx, ox + 22 - stride, ly + 16, 12, 3, P.bootHi);
  px(ctx, ox + 38 + stride, ly + 16, 12, 3, P.bootHi);
  px(ctx, ox + 20 - stride, ly + 21, 5, 3, P.bootShade);
  px(ctx, ox + 47 + stride, ly + 21, 5, 3, P.bootShade);
  px(ctx, ox + 24 - stride, ly + 18, 3, 2, P.beltHi);
  px(ctx, ox + 45 + stride, ly + 18, 3, 2, P.beltHi);

  // Torso
  const ty = fy + 36 + breath;
  px(ctx, ox + 22, ty, 28, 34, tunic);
  px(ctx, ox + 24, ty + 2, 24, 8, tunicHi);
  px(ctx, ox + 24, ty + 10, 10, 6, P.tunicMid);
  px(ctx, ox + 22, ty + 22, 28, 12, P.tunicShade);
  // Stitch / panel lines
  px(ctx, ox + 36, ty + 8, 1, 14, P.tunicShade);
  px(ctx, ox + 26, ty + 18, 20, 1, P.tunicMid);

  // Collar + neck
  px(ctx, ox + 30, ty, 12, 8, P.skin);
  px(ctx, ox + 32, ty + 5, 8, 4, P.skinShade);

  // Scarf wrap + dangling end
  px(ctx, ox + 26, ty + 6, 20, 4, P.scarf);
  px(ctx, ox + 28, ty + 6, 6, 2, P.scarfHi);
  px(ctx, ox + 42, ty + 10, 5, 10, P.scarfHi);
  px(ctx, ox + 42, ty + 16, 5, 3, P.scarfShade);

  // Belt + buckle + pouch
  px(ctx, ox + 22, ty + 24, 28, 5, P.belt);
  px(ctx, ox + 32, ty + 24, 8, 5, P.buckle);
  px(ctx, ox + 34, ty + 25, 4, 2, P.beltHi);
  px(ctx, ox + 44, ty + 28, 6, 5, P.pouch);
  px(ctx, ox + 45, ty + 28, 4, 2, P.beltHi);

  // Arms + hands
  const ay = ty + 4;
  px(ctx, ox + 14, ay + armSwing, 8, 18, tunic);
  px(ctx, ox + 50, ay - armSwing, 8, 18, tunic);
  px(ctx, ox + 14, ay + 2 + armSwing, 8, 4, tunicHi);
  px(ctx, ox + 50, ay + 2 - armSwing, 8, 4, tunicHi);
  px(ctx, ox + 13, ay + 16 + armSwing, 8, 6, P.skin);
  px(ctx, ox + 51, ay + 16 - armSwing, 8, 6, P.skin);
  px(ctx, ox + 13, ay + 16 + armSwing, 8, 2, P.skinShade);
  px(ctx, ox + 51, ay + 16 - armSwing, 8, 2, P.skinShade);
  // Fingers hint
  px(ctx, ox + 13, ay + 20 + armSwing, 2, 2, P.skinDeep);
  px(ctx, ox + 57, ay + 20 - armSwing, 2, 2, P.skinDeep);

  // Head
  const hy = fy + 10 + bob;
  px(ctx, ox + 24, hy + 6, 24, 22, P.skin);
  px(ctx, ox + 26, hy + 22, 20, 4, P.skinShade);
  px(ctx, ox + 28, hy + 8, 8, 5, P.skinHi);
  px(ctx, ox + 42, hy + 12, 4, 3, P.blush);

  // Hair
  px(ctx, ox + 22, hy, 28, 12, P.hair);
  px(ctx, ox + 24, hy - 3, 24, 5, P.hair);
  px(ctx, ox + 26, hy + 2, 8, 4, P.hairHi);
  px(ctx, ox + 40, hy + 3, 6, 3, P.hairMid);
  px(ctx, ox + 20, hy + 6, 5, 12, P.hair);
  px(ctx, ox + 47, hy + 6, 5, 12, P.hair);
  if (!north) {
    px(ctx, ox + 28, hy + 10, 5, 4, P.hairMid);
    px(ctx, ox + 40, hy + 10, 5, 4, P.hair);
    // Face detail
    px(ctx, ox + 29, hy + 14, 5, 4, P.eyeWhite);
    px(ctx, ox + 40, hy + 14, 5, 4, P.eyeWhite);
    px(ctx, ox + 31, hy + 14, 3, 4, P.eye);
    px(ctx, ox + 42, hy + 14, 3, 4, P.eye);
    px(ctx, ox + 32, hy + 15, 1, 1, P.eyeWhite);
    px(ctx, ox + 43, hy + 15, 1, 1, P.eyeWhite);
    px(ctx, ox + 29, hy + 13, 5, 1, P.hair);
    px(ctx, ox + 40, hy + 13, 5, 1, P.hair);
    px(ctx, ox + 28, hy + 19, 4, 2, P.blush);
    px(ctx, ox + 42, hy + 19, 4, 2, P.blush);
    px(ctx, ox + 34, hy + 20, 6, 2, P.skinDeep);
    px(ctx, ox + 35, hy + 22, 4, 1, P.skinDeep);
    // Nose hint
    px(ctx, ox + 36, hy + 17, 2, 2, P.skinShade);
  } else {
    px(ctx, ox + 24, hy + 8, 24, 16, P.hair);
    px(ctx, ox + 28, hy + 12, 8, 5, P.hairHi);
    px(ctx, ox + 40, hy + 14, 6, 3, P.hairMid);
  }

  // Outline ticks
  px(ctx, ox + 22, hy, 2, 3, P.outline);
  px(ctx, ox + 48, hy, 2, 3, P.outline);
  px(ctx, ox + 22, ty, 2, 28, P.outline);
  px(ctx, ox + 48, ty, 2, 28, P.outline);
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

function fillEllipsePx(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }
  ctx.restore();
}
