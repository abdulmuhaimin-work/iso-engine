import { SpriteSheet } from "../engine/render/SpriteSheet";
import type { AnimClip } from "../engine/render/SpriteAnimator";

/** Higher design resolution — denser crafted pixel silhouette. */
const FRAME_W = 48;
const FRAME_H = 72;
const COLS = 4;
const ROWS = 2;

const P = {
  outline: "#141018",
  skin: "#f0c9a0",
  skinShade: "#d4a078",
  skinDeep: "#b88060",
  skinHi: "#f8e0c0",
  hair: "#221820",
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
  eye: "#141018",
  eyeWhite: "#f5efe6",
  blush: "#e8a090",
  shadow: "#0a0810",
  scarf: "#c45c48",
  scarfHi: "#e07868",
} as const;

export interface DemoHeroSheet {
  sheet: SpriteSheet;
  animations: Record<string, AnimClip>;
}

/**
 * Procedural high-density pixel hero (48×72 frames).
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
      walk: { frames: [0, 2, 1, 3], fps: 9, loop: true },
      idle_n: { frames: [4, 5], fps: 3, loop: true },
      walk_n: { frames: [4, 6, 5, 7], fps: 9, loop: true },
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
  const bob = pose % 2 === 0 ? 0 : -1;
  const stride = pose === 2 ? 3 : pose === 3 ? -3 : 0;
  const armSwing = pose === 2 ? 3 : pose === 3 ? -3 : 0;
  const breath = pose === 1 || pose === 5 ? 1 : 0;

  fillEllipsePx(ctx, ox + 24, oy + 67, 14, 4, P.shadow, 0.42);

  const fy = oy + bob;
  const cloak = north ? P.cloakShade : P.cloak;
  const cloakHi = north ? P.cloakMid : P.cloakHi;
  const tunic = north ? P.tunicShade : P.tunic;
  const tunicHi = north ? P.tunicMid : P.tunicHi;

  // Cloak body + folds
  px(ctx, ox + 12, fy + 26, 24, 22, cloak);
  px(ctx, ox + 10, fy + 28, 3, 18, P.cloakShade);
  px(ctx, ox + 35, fy + 28, 3, 18, cloakHi);
  px(ctx, ox + 14, fy + 44, 20, 5, P.cloakShade);
  // Fold lines
  px(ctx, ox + 18, fy + 30, 1, 14, P.cloakShade);
  px(ctx, ox + 29, fy + 32, 1, 12, cloakHi);
  px(ctx, ox + 22, fy + 40, 4, 2, cloakHi);

  // Legs
  const ly = fy + 46;
  px(ctx, ox + 16 - stride, ly, 6, 12, P.pants);
  px(ctx, ox + 26 + stride, ly, 6, 12, P.pants);
  px(ctx, ox + 16 - stride, ly, 6, 4, P.pantsHi);
  px(ctx, ox + 26 + stride, ly, 6, 4, P.pantsHi);
  px(ctx, ox + 16 - stride, ly + 8, 6, 2, P.pantsShade);
  px(ctx, ox + 26 + stride, ly + 8, 6, 2, P.pantsShade);

  // Boots with heel + toe
  px(ctx, ox + 15 - stride, ly + 11, 8, 5, P.boot);
  px(ctx, ox + 25 + stride, ly + 11, 8, 5, P.boot);
  px(ctx, ox + 15 - stride, ly + 11, 8, 2, P.bootHi);
  px(ctx, ox + 25 + stride, ly + 11, 8, 2, P.bootHi);
  px(ctx, ox + 14 - stride, ly + 14, 3, 2, P.bootShade);
  px(ctx, ox + 31 + stride, ly + 14, 3, 2, P.bootShade);

  // Torso
  const ty = fy + 24 + breath;
  px(ctx, ox + 15, ty, 18, 22, tunic);
  px(ctx, ox + 16, ty + 1, 16, 5, tunicHi);
  px(ctx, ox + 16, ty + 6, 6, 4, P.tunicMid);
  px(ctx, ox + 15, ty + 15, 18, 7, P.tunicShade);
  // Collar / neck
  px(ctx, ox + 20, ty, 8, 5, P.skin);
  px(ctx, ox + 22, ty + 3, 4, 3, P.skinShade);
  // Scarf accent
  px(ctx, ox + 18, ty + 4, 12, 2, P.scarf);
  px(ctx, ox + 28, ty + 6, 3, 5, P.scarfHi);

  // Belt + pouch
  px(ctx, ox + 15, ty + 16, 18, 3, P.belt);
  px(ctx, ox + 21, ty + 16, 6, 3, P.buckle);
  px(ctx, ox + 22, ty + 16, 4, 1, P.beltHi);
  px(ctx, ox + 30, ty + 18, 4, 3, P.belt);

  // Arms + hands
  const ay = ty + 3;
  px(ctx, ox + 10, ay + armSwing, 5, 12, tunic);
  px(ctx, ox + 33, ay - armSwing, 5, 12, tunic);
  px(ctx, ox + 10, ay + 1 + armSwing, 5, 3, tunicHi);
  px(ctx, ox + 33, ay + 1 - armSwing, 5, 3, tunicHi);
  px(ctx, ox + 9, ay + 10 + armSwing, 5, 4, P.skin);
  px(ctx, ox + 34, ay + 10 - armSwing, 5, 4, P.skin);
  px(ctx, ox + 9, ay + 10 + armSwing, 5, 1, P.skinShade);
  px(ctx, ox + 34, ay + 10 - armSwing, 5, 1, P.skinShade);

  // Head
  const hy = fy + 8 + bob;
  px(ctx, ox + 16, hy + 4, 16, 14, P.skin);
  px(ctx, ox + 17, hy + 14, 14, 3, P.skinShade);
  px(ctx, ox + 18, hy + 5, 5, 3, P.skinHi);
  px(ctx, ox + 28, hy + 8, 3, 2, P.blush);

  // Hair mass
  px(ctx, ox + 15, hy, 18, 8, P.hair);
  px(ctx, ox + 16, hy - 2, 16, 3, P.hair);
  px(ctx, ox + 17, hy + 1, 5, 3, P.hairHi);
  px(ctx, ox + 26, hy + 2, 4, 2, P.hairMid);
  px(ctx, ox + 14, hy + 4, 3, 7, P.hair);
  px(ctx, ox + 31, hy + 4, 3, 7, P.hair);
  if (!north) {
    px(ctx, ox + 18, hy + 6, 3, 3, P.hairMid);
    px(ctx, ox + 27, hy + 6, 3, 3, P.hair);
    // Face
    px(ctx, ox + 19, hy + 9, 3, 3, P.eyeWhite);
    px(ctx, ox + 26, hy + 9, 3, 3, P.eyeWhite);
    px(ctx, ox + 20, hy + 9, 2, 3, P.eye);
    px(ctx, ox + 27, hy + 9, 2, 3, P.eye);
    px(ctx, ox + 19, hy + 8, 3, 1, P.hair);
    px(ctx, ox + 26, hy + 8, 3, 1, P.hair);
    px(ctx, ox + 18, hy + 12, 3, 1, P.blush);
    px(ctx, ox + 27, hy + 12, 3, 1, P.blush);
    px(ctx, ox + 22, hy + 13, 4, 1, P.skinDeep);
    px(ctx, ox + 23, hy + 14, 2, 1, P.skinDeep);
  } else {
    px(ctx, ox + 16, hy + 6, 16, 10, P.hair);
    px(ctx, ox + 18, hy + 8, 5, 3, P.hairHi);
    px(ctx, ox + 27, hy + 9, 4, 2, P.hairMid);
  }

  // Ink outline ticks
  px(ctx, ox + 15, hy, 1, 2, P.outline);
  px(ctx, ox + 32, hy, 1, 2, P.outline);
  px(ctx, ox + 15, ty, 1, 18, P.outline);
  px(ctx, ox + 32, ty, 1, 18, P.outline);
  px(ctx, ox + 16 - stride, ly + 11, 1, 5, P.outline);
  px(ctx, ox + 32 + stride, ly + 11, 1, 5, P.outline);
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
