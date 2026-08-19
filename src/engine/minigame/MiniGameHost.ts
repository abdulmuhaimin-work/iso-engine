import type { Flags } from "../dialogue/Flags";
import type { Input } from "../Input";
import type { MiniGame, MiniGameFactory, MiniGamePointer } from "./MiniGame";

export interface MiniGameHostOptions {
  root: HTMLElement;
  flags: Flags;
  input: Input;
}

/**
 * Overlay host for self-contained minigames (fishing, etc.).
 * Register factories by id, then `play("fishing")` from anywhere.
 */
export class MiniGameHost {
  private readonly root: HTMLElement;
  private readonly flags: Flags;
  private readonly input: Input;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly factories = new Map<string, MiniGameFactory>();
  private game: MiniGame | null = null;
  private elapsed = 0;
  private cssWidth = 1;
  private cssHeight = 1;
  private readonly pointer: MiniGamePointer = { x: 0, y: 0, down: false, pressed: false };
  private readonly onResize: () => void;
  private readonly onPointerMove: (e: PointerEvent) => void;
  private readonly onPointerDown: (e: PointerEvent) => void;
  private readonly onPointerUp: (e: PointerEvent) => void;
  private readonly onWheel: (e: WheelEvent) => void;

  constructor(options: MiniGameHostOptions) {
    this.root = options.root;
    this.flags = options.flags;
    this.input = options.input;

    this.root.classList.add("minigame-root");
    this.canvas = document.createElement("canvas");
    this.canvas.className = "minigame-canvas";
    this.root.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable for minigame overlay");
    this.ctx = ctx;
    this.hide();

    this.onResize = () => this.fit();
    this.onPointerMove = (e) => this.updatePointer(e);
    this.onPointerDown = (e) => {
      if (e.button !== 0) return;
      this.updatePointer(e);
      this.pointer.down = true;
      this.pointer.pressed = true;
    };
    this.onPointerUp = (e) => {
      if (e.button !== 0) return;
      this.pointer.down = false;
    };
    this.onWheel = (e) => e.preventDefault();

    window.addEventListener("resize", this.onResize);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.fit();
  }

  get active(): boolean {
    return this.game !== null;
  }

  get currentId(): string | null {
    return this.game?.id ?? null;
  }

  register(id: string, factory: MiniGameFactory): void {
    this.factories.set(id, factory);
  }

  /** Start a registered minigame by id. */
  play(id: string): void {
    const factory = this.factories.get(id);
    if (!factory) throw new Error(`Unknown minigame: ${id}`);
    this.start(factory());
  }

  start(game: MiniGame): void {
    if (this.game) this.stop();
    this.elapsed = 0;
    this.game = game;
    this.show();
    this.fit();
    game.start(this.context(0));
  }

  stop(): void {
    if (!this.game) return;
    this.game.end();
    this.game = null;
    this.hide();
  }

  update(dt: number): void {
    if (!this.game) return;
    this.elapsed += dt;
    this.game.update(this.context(dt));
    this.pointer.pressed = false;
  }

  render(): void {
    if (!this.game) return;
    this.game.render(this.context(0));
  }

  private context(dt: number) {
    return {
      flags: this.flags,
      input: this.input,
      pointer: this.pointer,
      canvas: this.canvas,
      ctx: this.ctx,
      width: this.cssWidth,
      height: this.cssHeight,
      dt,
      elapsed: this.elapsed,
      quit: () => this.stop(),
    };
  }

  private fit(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.cssWidth = w;
    this.cssHeight = h;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private updatePointer(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
  }

  private show(): void {
    this.root.classList.add("active");
    this.root.style.pointerEvents = "auto";
  }

  private hide(): void {
    this.root.classList.remove("active");
    this.root.style.pointerEvents = "none";
    this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
  }
}
