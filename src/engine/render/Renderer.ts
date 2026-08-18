import type { Camera } from "../Camera";
import type { Assets } from "../Assets";
import type { World } from "../world/World";
import type { Vec2 } from "../math/Vec2";
import { CanvasRenderer, type RendererOptions, pickTile } from "./CanvasRenderer";
import { GlRenderer } from "./gl/GlRenderer";

export type { RendererOptions };
export { pickTile };

export type RenderBackend = "webgl2" | "canvas2d";

type Backend = GlRenderer | CanvasRenderer;

/**
 * Isometric renderer. Uses WebGL2 material shaders when available,
 * otherwise the Canvas 2D path.
 */
export class Renderer {
  readonly backend: RenderBackend;
  private readonly impl: Backend;

  constructor(
    target: HTMLCanvasElement | CanvasRenderingContext2D,
    options: RendererOptions = {},
  ) {
    if (isContext2d(target)) {
      this.impl = new CanvasRenderer(target, options);
      this.backend = "canvas2d";
      return;
    }

    const preferGl = options.webgl !== false;
    const gl = preferGl
      ? target.getContext("webgl2", {
          alpha: false,
          antialias: true,
          depth: true,
          powerPreference: "high-performance",
        })
      : null;

    if (gl) {
      this.impl = new GlRenderer(gl, target, options);
      this.backend = "webgl2";
      return;
    }

    const ctx = target.getContext("2d");
    if (!ctx) throw new Error("No WebGL2 or 2D canvas context available");
    this.impl = new CanvasRenderer(ctx, options);
    this.backend = "canvas2d";
  }

  get clearColor(): string {
    return this.impl.clearColor;
  }
  set clearColor(value: string) {
    this.impl.clearColor = value;
  }

  get showGrid(): boolean {
    return this.impl.showGrid;
  }
  set showGrid(value: boolean) {
    this.impl.showGrid = value;
  }

  get hoverTile(): Vec2 | null {
    return this.impl.hoverTile;
  }
  set hoverTile(value: Vec2 | null) {
    this.impl.hoverTile = value;
  }

  get pathTiles(): Vec2[] | null {
    return this.impl.pathTiles;
  }
  set pathTiles(value: Vec2[] | null) {
    this.impl.pathTiles = value;
  }

  resize(cssWidth: number, cssHeight: number): void {
    this.impl.resize(cssWidth, cssHeight);
  }

  clear(width: number, height: number): void {
    if (this.impl instanceof CanvasRenderer) this.impl.clear(width, height);
  }

  render(world: World, camera: Camera, assets?: Assets, time = 0): void {
    this.impl.render(world, camera, assets, time);
  }
}

function isContext2d(
  target: HTMLCanvasElement | CanvasRenderingContext2D,
): target is CanvasRenderingContext2D {
  return typeof (target as CanvasRenderingContext2D).setTransform === "function";
}
