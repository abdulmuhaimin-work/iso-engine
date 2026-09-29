/** Procedural pixel panels for harbor story beats (no external assets). */

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Wax seal on folded letter — Mira's errand. */
export function createHarborSealPanel(): HTMLCanvasElement {
  const W = 160;
  const H = 120;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  px(ctx, 0, 0, W, H, "#0c1420");
  px(ctx, 12, 18, 136, 84, "#1a2438");
  px(ctx, 16, 22, 128, 76, "#243048");

  // Fold lines
  px(ctx, 16, 22, 64, 38, "#2a3850");
  px(ctx, 80, 22, 64, 38, "#1e2a40");
  px(ctx, 16, 60, 128, 38, "#1a2438");

  // Wax seal
  const cx = 96;
  const cy = 72;
  for (let dy = -14; dy <= 14; dy++) {
    for (let dx = -14; dx <= 14; dx++) {
      if (dx * dx + dy * dy <= 196) {
        const edge = dx * dx + dy * dy > 144;
        px(ctx, cx + dx, cy + dy, 1, 1, edge ? "#8a2830" : "#c84050");
      }
    }
  }
  px(ctx, cx - 4, cy - 2, 8, 6, "#ffe08a");
  px(ctx, cx - 2, cy, 4, 2, "#c84050");

  // Harbor hint — tiny waves
  px(ctx, 20, 98, 120, 8, "#121c28");
  for (let x = 20; x < 140; x += 8) {
    px(ctx, x, 100, 4, 2, "#3a5878");
    px(ctx, x + 4, 102, 4, 2, "#2a4868");
  }

  return c;
}

/** Dusk canal — Courier handoff moment. */
export function createHarborCanalPanel(): HTMLCanvasElement {
  const W = 160;
  const H = 120;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // Sky gradient bands
  px(ctx, 0, 0, W, 40, "#1a2848");
  px(ctx, 0, 40, W, 24, "#283858");
  px(ctx, 0, 64, W, 56, "#0a1018");

  // Moon
  px(ctx, 118, 14, 12, 12, "#ffe08a");
  px(ctx, 122, 14, 8, 12, "#1a2848");

  // Iso pier blocks
  const blocks: Array<[number, number, string]> = [
    [24, 72, "#3a5068"],
    [40, 68, "#4a6078"],
    [56, 64, "#3a5068"],
    [72, 60, "#2a4058"],
  ];
  for (const [x, y, col] of blocks) {
    px(ctx, x, y, 20, 8, col);
    px(ctx, x + 4, y - 8, 16, 8, col === "#4a6078" ? "#5a7088" : "#4a6078");
  }

  // Water
  px(ctx, 0, 88, W, 32, "#142838");
  for (let x = 0; x < W; x += 6) {
    px(ctx, x, 92 + (x % 12 === 0 ? 2 : 0), 4, 2, "#2a4868");
  }

  // Two tiny figures
  px(ctx, 48, 56, 4, 10, "#7ec8e3");
  px(ctx, 46, 54, 8, 4, "#243048");
  px(ctx, 62, 58, 4, 10, "#e8b86d");
  px(ctx, 60, 56, 8, 4, "#3a3020");

  return c;
}
