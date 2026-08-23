import type { MiniGame, MiniGameContext } from "../engine/minigame/MiniGame";
import { clamp } from "../engine/math/Vec2";

type Phase = "ready" | "casting" | "scored" | "missed";

const CAST_MIN = 0.08;
const CAST_MAX = 0.98;
const SPEED_BASE = 0.82;
const SPEED_STEP = 0.14;
const SPEED_CAP = 2.2;

interface Point {
  x: number;
  y: number;
}

/**
 * Arcade casting game:
 * - fish appears at random 2D water position
 * - hold Space / mouse to control cast power
 * - release to throw hook to landing position
 * - score on close hit; miss ends run
 * - cast speed ramps up with score; high score persists
 */
export function createFishingGame(): MiniGame {
  return new FishingGame();
}

class FishingGame implements MiniGame {
  readonly id = "fishing";
  readonly name = "Fishing";

  private flags: MiniGameContext["flags"] | null = null;
  private phase: Phase = "ready";
  private score = 0;
  private highScore = 0;
  private power = CAST_MIN;
  private powerDir = 1;
  private castSpeed = SPEED_BASE;
  private fish: Point = { x: 0, y: 0 };
  private fishRadius = 24;
  private hook: Point = { x: 0, y: 0 };
  private splash = 0;
  private phaseTimer = 0;
  private message = "Hold Space to charge, release to cast";
  private waterRect = { x: 220, y: 180, w: 720, h: 360 };
  private rodPoint: Point = { x: 170, y: 410 };
  private prevHeld = false;
  private lastThrowDistance = 0;
  private landingSpread = 34;

  start(ctx: MiniGameContext): void {
    this.flags = ctx.flags;
    this.highScore = Number(this.flags?.get("fishing_high_score") ?? 0);
    this.resetRun(ctx);
  }

  end(): void {}

  update(ctx: MiniGameContext): void {
    const dt = ctx.dt;
    if (ctx.input.justPressed("Escape")) {
      ctx.quit();
      return;
    }

    this.phaseTimer += dt;
    if (this.splash > 0) this.splash = Math.max(0, this.splash - dt * 1.2);

    if (this.phase === "ready" || this.phase === "casting") {
      this.updateCasting(ctx, dt);
      return;
    }
    if (this.phase === "scored" && this.phaseTimer > 0.65) {
      this.nextFish(ctx);
      return;
    }
    if (this.phase === "missed" && pressed(ctx)) {
      this.resetRun(ctx);
    }
  }

  render(ctx: MiniGameContext): void {
    const { ctx: g, width: w, height: h } = ctx;
    this.layout(w, h);
    drawSky(g, w, h, this.waterRect.y);
    drawHills(g, w, this.waterRect.y);
    drawWater(g, this.waterRect, this.splash, this.hook, this.phase === "scored");
    drawPier(g, this.rodPoint, this.waterRect, w, h);
    drawRod(g, this.rodPoint, this.hook, this.phase === "casting" || this.phase === "ready");

    drawFish(g, this.fish, this.fishRadius, this.phase !== "missed");
    if (this.phase !== "ready") drawHook(g, this.hook);

    this.drawHud(g, w, h);
  }

  private updateCasting(ctx: MiniGameContext, dt: number): void {
    const held = isHeld(ctx);
    const justPressed = held && !this.prevHeld;
    const justReleased = !held && this.prevHeld;

    if (justPressed && this.phase === "ready") {
      this.phase = "casting";
      this.message = "Release to cast";
      this.phaseTimer = 0;
    }

    if (this.phase === "casting" && held) {
      this.power += this.powerDir * this.castSpeed * dt;
      if (this.power >= CAST_MAX) {
        this.power = CAST_MAX;
        this.powerDir = -1;
      } else if (this.power <= CAST_MIN) {
        this.power = CAST_MIN;
        this.powerDir = 1;
      }
    }

    if (this.phase === "casting" && justReleased) {
      this.resolveCast();
    }

    this.prevHeld = held;
  }

  private resolveCast(): void {
    this.hook = this.powerToLanding(this.power);
    this.splash = 1;
    this.lastThrowDistance = distance(this.hook, this.fish);
    const hitRadius = this.currentHitRadius();
    if (this.lastThrowDistance <= hitRadius) {
      this.score += 1;
      this.flags?.set("fish_count", this.score);
      this.flags?.set("fish_caught", true);
      this.flags?.set("last_fish", `Catch x${this.score}`);
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.flags?.set("fishing_high_score", this.highScore);
      }
      this.phase = "scored";
      this.phaseTimer = 0;
      this.message = "Hit! New fish incoming…";
      this.castSpeed = Math.min(SPEED_CAP, SPEED_BASE + this.score * SPEED_STEP);
      this.landingSpread = Math.max(12, 34 - this.score * 1.6);
      return;
    }

    this.phase = "missed";
    this.phaseTimer = 0;
    this.message = "Miss! Press Space to restart or Esc to exit.";
    this.flags?.set("last_fish", `Miss at ${this.score}`);
  }

  private nextFish(ctx: MiniGameContext): void {
    this.phase = "ready";
    this.phaseTimer = 0;
    this.power = CAST_MIN;
    this.powerDir = 1;
    this.fish = this.randomFish();
    this.message = "Hold Space to charge, release to cast";
    this.prevHeld = isHeld(ctx);
  }

  private resetRun(ctx: MiniGameContext): void {
    this.score = 0;
    this.castSpeed = SPEED_BASE;
    this.phase = "ready";
    this.phaseTimer = 0;
    this.power = CAST_MIN;
    this.powerDir = 1;
    this.hook = this.powerToLanding(this.power);
    this.fish = this.randomFish();
    this.splash = 0;
    this.message = "Hold Space to charge, release to cast";
    this.prevHeld = isHeld(ctx);
    this.lastThrowDistance = 0;
    this.landingSpread = 34;
    this.flags?.set("fish_count", 0);
    this.flags?.set("last_fish", "Fishing");
  }

  private layout(width: number, height: number): void {
    const margin = 24;
    this.waterRect = {
      x: Math.max(180, width * 0.24),
      y: Math.max(120, height * 0.26),
      w: Math.max(420, width * 0.7 - margin),
      h: Math.max(220, height * 0.55),
    };
    this.rodPoint = {
      x: this.waterRect.x - 62,
      y: this.waterRect.y + this.waterRect.h * 0.72,
    };
    if (this.phase === "ready" || this.phase === "casting") {
      this.hook = this.powerToLanding(this.power);
    }
  }

  private randomFish(): Point {
    const p = CAST_MIN + Math.random() * (CAST_MAX - CAST_MIN);
    const base = this.powerToLanding(p);
    const offset = (Math.random() * 2 - 1) * this.landingSpread;
    const normal = this.castNormal(p);
    const m = 30;
    return {
      x: clamp(base.x + normal.x * offset, this.waterRect.x + m, this.waterRect.x + this.waterRect.w - m),
      y: clamp(base.y + normal.y * offset, this.waterRect.y + m, this.waterRect.y + this.waterRect.h - m),
    };
  }

  private powerToLanding(power: number): Point {
    const p = clamp(power, CAST_MIN, CAST_MAX);
    const x = this.waterRect.x + this.waterRect.w * p;
    const yCurve = 0.15 + Math.abs(p - 0.5) * 1.25;
    const y = this.waterRect.y + this.waterRect.h * clamp(yCurve, 0.08, 0.95);
    return { x, y };
  }

  private castNormal(power: number): Point {
    const eps = 0.01;
    const a = this.powerToLanding(clamp(power - eps, CAST_MIN, CAST_MAX));
    const b = this.powerToLanding(clamp(power + eps, CAST_MIN, CAST_MAX));
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    // perpendicular to trajectory
    return { x: -ty / len, y: tx / len };
  }

  private currentHitRadius(): number {
    // generous early, tighter later
    return Math.max(22, 44 - this.score * 1.4);
  }

  private drawHud(g: CanvasRenderingContext2D, width: number, height: number): void {
    g.fillStyle = "rgba(6, 10, 16, 0.62)";
    g.fillRect(0, 0, width, 74);
    g.fillStyle = "#e8eef4";
    g.font = "650 18px system-ui, sans-serif";
    g.fillText("Fishing range", 20, 29);
    g.font = "13px system-ui, sans-serif";
    g.fillStyle = "rgba(232,238,244,0.78)";
    g.fillText("Hold Space / mouse, release to cast · Esc exits", 20, 49);

    g.font = "700 16px system-ui, sans-serif";
    g.fillStyle = "#ffe08a";
    g.fillText(`Score ${this.score}`, width - 260, 30);
    g.fillStyle = "#7ec8e3";
    g.fillText(`High ${this.highScore}`, width - 150, 30);
    g.fillStyle = "rgba(232,238,244,0.8)";
    g.font = "12px system-ui, sans-serif";
    g.fillText(`Bar speed ${this.castSpeed.toFixed(2)}x`, width - 260, 50);

    drawMeter(g, width / 2 - 180, height - 68, 360, 16, this.power, "#7ec8e3", "Cast power");
    g.fillStyle = "rgba(232,238,244,0.7)";
    g.font = "12px system-ui, sans-serif";
    g.fillText(`Hit radius ${Math.round(this.currentHitRadius())} px`, width / 2 + 194, height - 55);
    g.fillStyle = this.phase === "missed" ? "#ffb1a2" : "#ffe08a";
    g.font = "16px system-ui, sans-serif";
    centerText(g, this.message, width / 2, height - 28);

    if (this.phase === "missed") {
      g.fillStyle = "rgba(8, 12, 18, 0.7)";
      roundRect(g, width / 2 - 220, height * 0.35, 440, 120, 12);
      g.fill();
      g.fillStyle = "#ffb1a2";
      g.font = "700 24px system-ui, sans-serif";
      centerText(g, "Run over", width / 2, height * 0.35 + 42);
      g.fillStyle = "#e8eef4";
      g.font = "14px system-ui, sans-serif";
      centerText(
        g,
        `Final score ${this.score} · High score ${this.highScore}`,
        width / 2,
        height * 0.35 + 74,
      );
      if (this.lastThrowDistance > 0) {
        centerText(
          g,
          `Last miss by ${Math.round(this.lastThrowDistance)} px`,
          width / 2,
          height * 0.35 + 96,
        );
      }
    }
  }
}

function drawSky(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizon: number,
): void {
  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#1c3148");
  sky.addColorStop(0.55, "#3a5a72");
  sky.addColorStop(1, "#c9a07a");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const sun = g.createRadialGradient(w * 0.78, horizon - 40, 8, w * 0.78, horizon - 40, 160);
  sun.addColorStop(0, "rgba(255, 210, 140, 0.85)");
  sun.addColorStop(1, "rgba(255, 180, 100, 0)");
  g.fillStyle = sun;
  g.fillRect(0, 0, w, horizon);
}

function drawHills(g: CanvasRenderingContext2D, w: number, horizon: number): void {
  g.fillStyle = "#2a4450";
  g.beginPath();
  g.moveTo(0, horizon);
  g.lineTo(0, horizon - 40);
  g.quadraticCurveTo(w * 0.2, horizon - 90, w * 0.4, horizon - 36);
  g.quadraticCurveTo(w * 0.6, horizon - 70, w, horizon - 24);
  g.lineTo(w, horizon);
  g.fill();
}

function drawWater(
  g: CanvasRenderingContext2D,
  waterRect: { x: number; y: number; w: number; h: number },
  splash: number,
  hook: Point,
  hit: boolean,
): void {
  const water = g.createLinearGradient(0, waterRect.y, 0, waterRect.y + waterRect.h);
  water.addColorStop(0, "#3d7a96");
  water.addColorStop(0.4, "#2a5f78");
  water.addColorStop(1, "#163848");
  roundRect(g, waterRect.x, waterRect.y, waterRect.w, waterRect.h, 14);
  g.fillStyle = water;
  g.fill();
  g.strokeStyle = "rgba(200,235,245,0.32)";
  g.lineWidth = 2;
  g.stroke();

  g.strokeStyle = "rgba(180, 220, 230, 0.22)";
  g.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = waterRect.y + 18 + i * ((waterRect.h - 36) / 8);
    g.beginPath();
    for (let x = waterRect.x; x <= waterRect.x + waterRect.w; x += 10) {
      const yy = y + Math.sin(x * 0.022 + performance.now() * 0.0015 + i) * 3;
      if (x === waterRect.x) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }

  if (splash > 0) {
    g.strokeStyle = hit ? `rgba(170, 255, 190, ${splash})` : `rgba(230, 245, 250, ${splash})`;
    g.beginPath();
    g.ellipse(hook.x, hook.y + 4, 16 + (1 - splash) * 24, 7, 0, 0, Math.PI * 2);
    g.stroke();
  }
}

function drawPier(
  g: CanvasRenderingContext2D,
  rodPoint: Point,
  waterRect: { x: number; y: number; w: number; h: number },
  width: number,
  height: number,
): void {
  const top = waterRect.y + waterRect.h * 0.58;
  g.fillStyle = "#5a4332";
  g.fillRect(0, top, Math.max(150, rodPoint.x + 30), height - top);
  g.fillStyle = "#6e5240";
  for (let i = 0; i < 8; i++) {
    g.fillRect(12 + i * 28, top - 6, 22, 10);
  }
  g.fillStyle = "#3d2e24";
  g.fillRect(width * 0.08, top - 70, 10, 70);
  g.fillRect(width * 0.22, top - 54, 8, 54);
}

function drawRod(
  g: CanvasRenderingContext2D,
  rodPoint: Point,
  hook: Point,
  showLine: boolean,
): void {
  drawAngler(g, rodPoint.x - 22, rodPoint.y + 40);
  g.strokeStyle = "#2a3340";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(rodPoint.x - 8, rodPoint.y + 12);
  g.lineTo(rodPoint.x + 36, rodPoint.y - 12);
  g.stroke();
  if (!showLine) return;
  g.strokeStyle = "rgba(230, 236, 240, 0.55)";
  g.lineWidth = 1.25;
  g.beginPath();
  g.moveTo(rodPoint.x + 36, rodPoint.y - 12);
  g.quadraticCurveTo((rodPoint.x + hook.x) * 0.5, rodPoint.y - 34, hook.x, hook.y);
  g.stroke();

  // Faint aim lane preview so reachable cast region is visible.
  g.strokeStyle = "rgba(190, 220, 235, 0.15)";
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = hook.x * t + (rodPoint.x + 36) * (1 - t);
    const y =
      (1 - t) * (1 - t) * (rodPoint.y - 12)
      + 2 * (1 - t) * t * (rodPoint.y - 34)
      + t * t * hook.y;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
}

function drawAngler(g: CanvasRenderingContext2D, x: number, footY: number): void {
  g.fillStyle = "rgba(0,0,0,0.28)";
  g.beginPath();
  g.ellipse(x, footY + 4, 16, 5, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#3d5a4c";
  roundRect(g, x - 8, footY - 36, 16, 28, 4);
  g.fill();
  g.fillStyle = "#f3d7a8";
  g.beginPath();
  g.arc(x, footY - 44, 7, 0, Math.PI * 2);
  g.fill();
}

function drawFish(g: CanvasRenderingContext2D, fish: Point, radius: number, alive: boolean): void {
  const alpha = alive ? 1 : 0.35;
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = "#f0c14a";
  g.beginPath();
  g.ellipse(fish.x, fish.y, radius, radius * 0.62, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(fish.x + radius * 0.9, fish.y);
  g.lineTo(fish.x + radius * 1.45, fish.y - radius * 0.45);
  g.lineTo(fish.x + radius * 1.45, fish.y + radius * 0.45);
  g.closePath();
  g.fillStyle = "#dc9d30";
  g.fill();
  g.fillStyle = "#10253a";
  g.beginPath();
  g.arc(fish.x - radius * 0.35, fish.y - radius * 0.1, 2.2, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawHook(g: CanvasRenderingContext2D, hook: Point): void {
  g.fillStyle = "#c44536";
  g.beginPath();
  g.arc(hook.x, hook.y, 6, Math.PI, 0);
  g.fill();
  g.fillStyle = "#f4f0ea";
  g.beginPath();
  g.arc(hook.x, hook.y, 6, 0, Math.PI);
  g.fill();
  g.strokeStyle = "rgba(250, 250, 250, 0.88)";
  g.lineWidth = 1.2;
  g.beginPath();
  g.arc(hook.x + 4.5, hook.y + 4.5, 3.8, -Math.PI / 3, Math.PI * 0.92);
  g.stroke();
}

function drawMeter(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  color: string,
  label: string,
): void {
  g.fillStyle = "rgba(8,12,18,0.55)";
  g.fillRect(x, y, w, h);
  g.fillStyle = color;
  g.fillRect(x, y, w * clamp(t, 0, 1), h);
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.strokeRect(x, y, w, h);
  if (label) {
    g.fillStyle = "rgba(232,238,244,0.8)";
    g.font = "12px system-ui, sans-serif";
    g.fillText(label, x, y - 6);
  }
}

function centerText(g: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  g.textAlign = "center";
  g.fillText(text, x, y);
  g.textAlign = "left";
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isHeld(ctx: MiniGameContext): boolean {
  return ctx.input.isDown("Space") || ctx.pointer.down;
}

function pressed(ctx: MiniGameContext): boolean {
  return (
    ctx.input.justPressed("Space")
    || ctx.input.justPressed("Enter")
    || ctx.pointer.pressed
  );
}

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}
