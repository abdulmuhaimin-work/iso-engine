import { SpriteSheet } from "../engine/render/SpriteSheet";
import type { AnimClip } from "../engine/render/SpriteAnimator";

const FRAME_W = 32;
const FRAME_H = 48;
const COLS = 4;
const ROWS = 2;

/** Compact RPG palette — warm skin, teal cloak, ink outlines. */
const P = {
  outline: "#1a1420",
  skin: "#f0c9a0",
  skinShade: "#d4a078",
  skinDeep: "#b88060",
  hair: "#2a1e28",
  hairHi: "#4a3540",
  tunic: "#3d6b5c",
  tunicHi: "#5a9a82",
  tunicShade: "#2a4a40",
  cloak: "#245068",
  cloakHi: "#3a7898",
  cloakShade: "#183848",
  belt: "#8b5a2b",
  beltHi: "#c49050",
  buckle: "#e8d080",
  pants: "#2c3448",
  pantsHi: "#4a5670",
  boot: "#3a2820",
  bootHi: "#5a4030",
  eye: "#1a1420",
  eyeWhite: "#f5efe6",
  blush: "#e8a090",
  shadow: "#0a0810",
  skinHi: "#f8e0c0",
} as const;

export interface DemoHeroSheet {
  sheet: SpriteSheet;
  animations: Record<string, AnimClip>;
}

/**
 * Procedural pixel hero sheet (no external art).
 * Row 0: idle + walk facing camera-ish (SE).
 * Row 1: darker north-facing poses.
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
  pose: number,
  north: boolean,
): void {
  const bob = pose % 2 === 0 ? 0 : -1;
  const stride = pose === 2 ? 2 : pose === 3 ? -2 : 0;
  const armSwing = pose === 2 ? 2 : pose === 3 ? -2 : 0;
  const breath = pose === 1 || pose === 5 ? 1 : 0;

  // Soft elliptical ground shadow (pixel-stepped)
  fillEllipsePx(ctx, ox + 16, oy + 44, 10, 3, P.shadow, 0.4);

  const fy = oy + bob;
  const cloak = north ? P.cloakShade : P.cloak;
  const cloakHi = north ? P.cloak : P.cloakHi;
  const tunic = north ? P.tunicShade : P.tunic;
  const tunicHi = north ? P.tunic : P.tunicHi;

  // Back cloak flap
  px(ctx, ox + 8, fy + 18, 16, 14, cloak);
  px(ctx, ox + 7, fy + 20, 2, 10, P.cloakShade);
  px(ctx, ox + 23, fy + 20, 2, 10, cloakHi);
  px(ctx, ox + 10, fy + 30, 12, 3, P.cloakShade);

  // Legs / pants
  const ly = fy + 30;
  px(ctx, ox + 11 - stride, ly, 4, 8, P.pants);
  px(ctx, ox + 17 + stride, ly, 4, 8, P.pants);
  px(ctx, ox + 11 - stride, ly, 4, 3, P.pantsHi);
  px(ctx, ox + 17 + stride, ly, 4, 3, P.pantsHi);

  // Boots
  px(ctx, ox + 10 - stride, ly + 7, 6, 4, P.boot);
  px(ctx, ox + 16 + stride, ly + 7, 6, 4, P.boot);
  px(ctx, ox + 10 - stride, ly + 7, 6, 1, P.bootHi);
  px(ctx, ox + 16 + stride, ly + 7, 6, 1, P.bootHi);

  // Torso / tunic
  const ty = fy + 16 + breath;
  px(ctx, ox + 10, ty, 12, 14, tunic);
  px(ctx, ox + 11, ty + 1, 10, 3, tunicHi);
  px(ctx, ox + 10, ty + 10, 12, 4, P.tunicShade);
  // Collar / V-cut
  px(ctx, ox + 14, ty, 4, 3, P.skin);
  px(ctx, ox + 15, ty + 2, 2, 2, P.skinShade);

  // Belt + buckle
  px(ctx, ox + 10, ty + 11, 12, 2, P.belt);
  px(ctx, ox + 14, ty + 11, 4, 2, P.buckle);
  px(ctx, ox + 15, ty + 11, 2, 1, P.beltHi);

  // Arms
  const ay = ty + 2;
  px(ctx, ox + 7, ay + armSwing, 3, 8, tunic);
  px(ctx, ox + 22, ay - armSwing, 3, 8, tunic);
  px(ctx, ox + 6, ay + 6 + armSwing, 3, 3, P.skin);
  px(ctx, ox + 23, ay + 6 - armSwing, 3, 3, P.skin);
  px(ctx, ox + 6, ay + 6 + armSwing, 3, 1, P.skinShade);
  px(ctx, ox + 23, ay + 6 - armSwing, 3, 1, P.skinShade);

  // Head
  const hy = fy + 6 + bob;
  px(ctx, ox + 11, hy + 2, 10, 10, P.skin);
  px(ctx, ox + 12, hy + 9, 8, 2, P.skinShade);
  px(ctx, ox + 13, hy + 3, 3, 2, P.skinHi);

  // Hair bowl + fringe
  px(ctx, ox + 10, hy, 12, 5, P.hair);
  px(ctx, ox + 11, hy - 1, 10, 2, P.hair);
  px(ctx, ox + 12, hy + 1, 3, 2, P.hairHi);
  px(ctx, ox + 10, hy + 3, 2, 4, P.hair);
  px(ctx, ox + 20, hy + 3, 2, 4, P.hair);
  if (!north) {
    px(ctx, ox + 13, hy + 4, 2, 2, P.hair);
    px(ctx, ox + 17, hy + 4, 2, 2, P.hair);
  }

  if (!north) {
    // Face: eyes, brow, blush, mouth
    px(ctx, ox + 13, hy + 6, 2, 2, P.eyeWhite);
    px(ctx, ox + 17, hy + 6, 2, 2, P.eyeWhite);
    px(ctx, ox + 14, hy + 6, 1, 2, P.eye);
    px(ctx, ox + 18, hy + 6, 1, 2, P.eye);
    px(ctx, ox + 13, hy + 5, 2, 1, P.hair);
    px(ctx, ox + 17, hy + 5, 2, 1, P.hair);
    px(ctx, ox + 12, hy + 8, 2, 1, P.blush);
    px(ctx, ox + 18, hy + 8, 2, 1, P.blush);
    px(ctx, ox + 15, hy + 9, 2, 1, P.skinDeep);
  } else {
    // Back of head — more hair mass
    px(ctx, ox + 11, hy + 4, 10, 6, P.hair);
    px(ctx, ox + 12, hy + 5, 3, 2, P.hairHi);
  }

  // Outline accents (1px ink silhouette cues)
  px(ctx, ox + 10, hy, 1, 1, P.outline);
  px(ctx, ox + 21, hy, 1, 1, P.outline);
  px(ctx, ox + 10, ty, 1, 12, P.outline);
  px(ctx, ox + 21, ty, 1, 12, P.outline);
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
