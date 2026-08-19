import type { MiniGame, MiniGameContext } from "../engine/minigame/MiniGame";
import { clamp } from "../engine/math/Vec2";

type Phase = "ready" | "power" | "wait" | "strike" | "fight" | "result";

interface FishKind {
  name: string;
  rarity: "common" | "uncommon" | "rare";
  color: string;
  weight: number;
  pull: number;
}

const FISH: FishKind[] = [
  { name: "Pixel Perch", rarity: "common", color: "#d4a05a", weight: 40, pull: 0.55 },
  { name: "Harbor Minnow", rarity: "common", color: "#9aa8b5", weight: 32, pull: 0.45 },
  { name: "Resume Salmon", rarity: "uncommon", color: "#e07a6a", weight: 18, pull: 0.75 },
  { name: "Debug Bass", rarity: "uncommon", color: "#6aa84f", weight: 14, pull: 0.8 },
  { name: "Golden Ide", rarity: "rare", color: "#f0c14a", weight: 6, pull: 1.05 },
];

/**
 * Side-view fishing: cast power → wait for a bite → strike → keep tension in the green.
 */
export function createFishingGame(): MiniGame {
  return new FishingGame();
}

class FishingGame implements MiniGame {
  readonly id = "fishing";
  readonly name = "Fishing";

  private phase: Phase = "ready";
  private time = 0;
  private power = 0;
  private powerDir = 1;
  private waitFor = 0;
  private bobberX = 0;
  private bobberY = 0;
  private strikeWindow = 0;
  private tension = 0.5;
  private tensionVel = 0;
  private inZone = 0;
  private catchNeed = 2.3;
  private fish: FishKind | null = null;
  private won = false;
  private message = "";
  private splash = 0;
  private flags: MiniGameContext["flags"] | null = null;

  start(ctx: MiniGameContext): void {
    this.flags = ctx.flags;
    this.resetReady();
  }

  end(): void {}

  update(ctx: MiniGameContext): void {
    const dt = ctx.dt;
    this.time += dt;
    if (this.splash > 0) this.splash = Math.max(0, this.splash - dt);

    if (ctx.input.justPressed("Escape")) {
      ctx.quit();
      return;
    }

    const action = pressed(ctx);

    switch (this.phase) {
      case "ready":
        if (action) {
          this.phase = "power";
          this.power = 0.15;
          this.powerDir = 1;
        }
        break;
      case "power":
        this.power += this.powerDir * dt * 0.85;
        if (this.power >= 1) {
          this.power = 1;
          this.powerDir = -1;
        } else if (this.power <= 0) {
          this.power = 0;
          this.powerDir = 1;
        }
        if (action) this.cast(ctx);
        break;
      case "wait":
        this.bobberY += Math.sin(this.time * 3.2) * 6 * dt;
        this.waitFor -= dt;
        if (this.waitFor <= 0) {
          this.phase = "strike";
          this.strikeWindow = 0.78;
          this.splash = 0.45;
        }
        break;
      case "strike":
        this.strikeWindow -= dt;
        if (action) {
          this.beginFight();
        } else if (this.strikeWindow <= 0) {
          this.finish(false, "The fish got away.");
        }
        break;
      case "fight":
        this.stepFight(dt, action);
        break;
      case "result":
        if (action) this.resetReady();
        break;
    }
  }

  render(ctx: MiniGameContext): void {
    const { ctx: g, width: w, height: h } = ctx;
    const horizon = h * 0.42;
    const pierTop = h * 0.62;

    drawSky(g, w, h, horizon);
    drawHills(g, w, horizon);
    drawWater(g, w, h, horizon, this.time, this.splash, this.bobberX, this.bobberY);
    drawPier(g, w, pierTop, h);
    drawAngler(g, w * 0.18, pierTop);

    if (this.phase !== "ready" && this.phase !== "power" && this.phase !== "result") {
      this.drawLine(g, w * 0.22, pierTop - 28);
    }
    if (this.phase === "wait" || this.phase === "strike" || this.phase === "fight") {
      drawBobber(g, this.bobberX, this.bobberY, this.phase === "strike", this.time);
    }

    this.drawHud(g, w, h);
  }

  private resetReady(): void {
    this.phase = "ready";
    this.fish = null;
    this.won = false;
    this.message = "";
    this.power = 0;
    this.tension = 0.5;
    this.inZone = 0;
  }

  private cast(ctx: MiniGameContext): void {
    const w = ctx.width;
    const h = ctx.height;
    const horizon = h * 0.42;
    const t = 0.35 + this.power * 0.5;
    this.bobberX = w * (0.42 + t * 0.38);
    this.bobberY = horizon + 28 + (1 - this.power) * 36;
    this.waitFor = 1.1 + Math.random() * 2.4;
    this.phase = "wait";
    this.splash = 0.25;
  }

  private beginFight(): void {
    this.fish = pickFish(this.power);
    this.phase = "fight";
    this.tension = 0.5;
    this.tensionVel = 0;
    this.inZone = 0;
    this.catchNeed = this.fish.rarity === "rare" ? 2.8 : this.fish.rarity === "uncommon" ? 2.4 : 2.0;
  }

  private stepFight(dt: number, action: boolean): void {
    const fish = this.fish!;
    const yank = (Math.sin(this.time * fish.pull * 3.2) + Math.sin(this.time * 1.7)) * 0.5;
    this.tensionVel += yank * fish.pull * dt * 1.4;
    if (action) this.tensionVel -= 1.65;
    this.tensionVel *= Math.pow(0.18, dt);
    this.tension = clamp(this.tension + this.tensionVel * dt, 0, 1);

    const inGreen = this.tension > 0.34 && this.tension < 0.66;
    if (inGreen) this.inZone += dt;
    else this.inZone = Math.max(0, this.inZone - dt * 0.35);

    if (this.tension <= 0.02 || this.tension >= 0.98) {
      this.finish(false, this.tension >= 0.98 ? "The line snapped." : "It slipped the hook.");
      return;
    }
    if (this.inZone >= this.catchNeed) {
      this.finish(true, `Caught a ${fish.name}!`);
    }
  }

  private finish(won: boolean, message: string): void {
    this.won = won;
    this.message = message;
    this.phase = "result";
    if (won && this.fish && this.flags) {
      const n = Number(this.flags.get("fish_count") ?? 0) + 1;
      this.flags.set("fish_count", n);
      this.flags.set("fish_caught", true);
      this.flags.set("last_fish", this.fish.name);
    }
  }

  private drawLine(g: CanvasRenderingContext2D, ax: number, ay: number): void {
    g.strokeStyle = "rgba(230, 236, 240, 0.55)";
    g.lineWidth = 1.25;
    g.beginPath();
    g.moveTo(ax, ay);
    g.quadraticCurveTo((ax + this.bobberX) * 0.5, ay + 40, this.bobberX, this.bobberY);
    g.stroke();
  }

  private drawHud(g: CanvasRenderingContext2D, w: number, h: number): void {
    g.fillStyle = "rgba(6, 10, 16, 0.55)";
    g.fillRect(0, 0, w, 64);
    g.fillStyle = "#e8eef4";
    g.font = "650 18px system-ui, sans-serif";
    g.fillText("Fishing hole", 24, 32);
    g.font = "13px system-ui, sans-serif";
    g.fillStyle = "rgba(232,238,244,0.7)";
    g.fillText("Esc leaves · Space / click acts", 24, 50);

    const hint = this.hint();
    g.font = "16px system-ui, sans-serif";
    g.fillStyle = "#ffe08a";
    centerText(g, hint, w / 2, h - 36);

    if (this.phase === "power") {
      drawMeter(g, w / 2 - 140, h - 78, 280, 14, this.power, "#7ec8e3", "Cast power");
    }
    if (this.phase === "strike") {
      g.fillStyle = "rgba(255, 196, 80, 0.95)";
      g.font = "700 42px system-ui, sans-serif";
      centerText(g, "NOW!", w / 2, h * 0.36);
    }
    if (this.phase === "fight" && this.fish) {
      drawMeter(g, w / 2 - 160, h - 92, 320, 18, this.tension, this.fish.color, "Tension");
      g.fillStyle = "rgba(110, 180, 120, 0.35)";
      g.fillRect(w / 2 - 160 + 320 * 0.34, h - 92, 320 * 0.32, 18);
      g.strokeStyle = "rgba(140, 210, 150, 0.9)";
      g.strokeRect(w / 2 - 160 + 320 * 0.34, h - 92, 320 * 0.32, 18);
      const p = clamp(this.inZone / this.catchNeed, 0, 1);
      drawMeter(g, w / 2 - 160, h - 64, 320, 8, p, "#ffe08a", "");
    }
    if (this.phase === "result") {
      g.fillStyle = "rgba(8, 12, 18, 0.62)";
      roundRect(g, w / 2 - 200, h * 0.3, 400, 150, 12);
      g.fill();
      g.fillStyle = this.won ? "#b6e3a8" : "#e0a0a0";
      g.font = "650 22px system-ui, sans-serif";
      centerText(g, this.message, w / 2, h * 0.3 + 58);
      if (this.won && this.fish) {
        g.fillStyle = this.fish.color;
        g.font = "14px system-ui, sans-serif";
        centerText(g, this.fish.rarity, w / 2, h * 0.3 + 84);
      }
      g.fillStyle = "rgba(232,238,244,0.75)";
      g.font = "14px system-ui, sans-serif";
      centerText(g, "Space to fish again", w / 2, h * 0.3 + 118);
    }
  }

  private hint(): string {
    switch (this.phase) {
      case "ready":
        return "Space to start a cast";
      case "power":
        return "Space when the bar looks right";
      case "wait":
        return "Waiting for a bite…";
      case "strike":
        return "Space to set the hook!";
      case "fight":
        return "Tap Space to keep the marker in the green";
      case "result":
        return this.won ? "Nice catch" : "Try another cast";
    }
  }
}

function pressed(ctx: MiniGameContext): boolean {
  return (
    ctx.input.justPressed("Space") ||
    ctx.input.justPressed("Enter") ||
    ctx.pointer.pressed
  );
}

function pickFish(power: number): FishKind {
  const rareBoost = power > 0.72 ? 1.8 : power > 0.45 ? 1.2 : 0.8;
  const weighted = FISH.map((f) => ({
    f,
    w: f.weight * (f.rarity === "rare" ? rareBoost : f.rarity === "uncommon" ? 1 + (rareBoost - 1) * 0.4 : 1),
  }));
  let total = 0;
  for (const row of weighted) total += row.w;
  let roll = Math.random() * total;
  for (const row of weighted) {
    roll -= row.w;
    if (roll <= 0) return row.f;
  }
  return FISH[0]!;
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
  w: number,
  h: number,
  horizon: number,
  time: number,
  splash: number,
  bx: number,
  by: number,
): void {
  const water = g.createLinearGradient(0, horizon, 0, h);
  water.addColorStop(0, "#3d7a96");
  water.addColorStop(0.4, "#2a5f78");
  water.addColorStop(1, "#163848");
  g.fillStyle = water;
  g.fillRect(0, horizon, w, h - horizon);

  g.strokeStyle = "rgba(180, 220, 230, 0.22)";
  g.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const y = horizon + 18 + i * 28;
    g.beginPath();
    for (let x = 0; x <= w; x += 10) {
      const yy = y + Math.sin(x * 0.02 + time * 1.4 + i) * 4;
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }

  if (splash > 0) {
    g.strokeStyle = `rgba(230, 245, 250, ${splash})`;
    g.beginPath();
    g.ellipse(bx, by + 6, 18 + (0.45 - splash) * 40, 7, 0, 0, Math.PI * 2);
    g.stroke();
  }
}

function drawPier(g: CanvasRenderingContext2D, w: number, top: number, h: number): void {
  g.fillStyle = "#5a4332";
  g.fillRect(0, top, w * 0.34, h - top);
  g.fillStyle = "#6e5240";
  for (let i = 0; i < 8; i++) {
    g.fillRect(12 + i * 28, top - 6, 22, 10);
  }
  g.fillStyle = "#3d2e24";
  g.fillRect(w * 0.08, top - 70, 10, 70);
  g.fillRect(w * 0.22, top - 54, 8, 54);
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
  g.strokeStyle = "#2a3340";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x + 8, footY - 30);
  g.lineTo(x + 36, footY - 62);
  g.stroke();
}

function drawBobber(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  striking: boolean,
  time: number,
): void {
  const dip = striking ? 10 : Math.sin(time * 3.2) * 2;
  g.fillStyle = "#c44536";
  g.beginPath();
  g.arc(x, y + dip, 7, Math.PI, 0);
  g.fill();
  g.fillStyle = "#f4f0ea";
  g.beginPath();
  g.arc(x, y + dip, 7, 0, Math.PI);
  g.fill();
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
