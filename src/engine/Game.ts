import { Camera, type CameraOptions } from "./Camera";
import { Input } from "./Input";
import { Assets } from "./Assets";
import { Renderer, type RendererOptions } from "./render/Renderer";

export interface GameOptions {
  canvas: HTMLCanvasElement;
  camera?: CameraOptions;
  renderer?: RendererOptions;
  /** Cap delta time (seconds) to avoid spiral-of-death after tab blur. */
  maxDelta?: number;
}

export interface FrameContext {
  dt: number;
  elapsed: number;
  camera: Camera;
  input: Input;
  assets: Assets;
  renderer: Renderer;
  canvas: HTMLCanvasElement;
  /** Present only on the Canvas 2D fallback path. */
  ctx: CanvasRenderingContext2D | null;
}

export type GameHook = (frame: FrameContext) => void;

/**
 * Owns the canvas, RAF loop, camera, input, assets, and renderer.
 * Wire game logic via `onUpdate` / `onRender`.
 */
export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D | null;
  readonly camera: Camera;
  readonly input: Input;
  readonly assets: Assets;
  readonly renderer: Renderer;

  onUpdate: GameHook | null = null;
  onRender: GameHook | null = null;

  private readonly maxDelta: number;
  private raf = 0;
  private running = false;
  private lastTime = 0;
  private elapsed = 0;
  private readonly onResize: () => void;

  constructor(options: GameOptions) {
    this.canvas = options.canvas;
    this.camera = new Camera(options.camera);
    this.input = new Input(this.canvas);
    this.assets = new Assets();
    this.renderer = new Renderer(this.canvas, options.renderer);
    this.ctx = this.renderer.backend === "canvas2d" ? this.canvas.getContext("2d") : null;
    this.maxDelta = options.maxDelta ?? 1 / 20;

    this.onResize = () => this.fitToWindow();
    window.addEventListener("resize", this.onResize);
    this.fitToWindow();
  }

  fitToWindow(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.renderer.resize(w, h);
    this.camera.resize(w, h);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const raw = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(raw, this.maxDelta);
      this.elapsed += dt;

      const frame: FrameContext = {
        dt,
        elapsed: this.elapsed,
        camera: this.camera,
        input: this.input,
        assets: this.assets,
        renderer: this.renderer,
        canvas: this.canvas,
        ctx: this.ctx,
      };

      this.onUpdate?.(frame);
      this.onRender?.(frame);
      this.input.endFrame();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy(): void {
    this.stop();
    this.input.destroy();
    window.removeEventListener("resize", this.onResize);
  }
}
