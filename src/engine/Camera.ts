import type { Vec2 } from "./math/Vec2";
import { clamp } from "./math/Vec2";
import {
  DEFAULT_ISO,
  screenToWorld,
  worldToScreen,
  type IsoMetrics,
} from "./math/Iso";

export interface CameraOptions {
  metrics?: IsoMetrics;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Maps world ↔ screen using an isometric projection plus pan/zoom.
 * `position` is the world-space point kept at the viewport center.
 */
export class Camera {
  position: Vec2 = { x: 0, y: 0 };
  zoom: number;
  minZoom: number;
  maxZoom: number;
  metrics: IsoMetrics;
  viewportWidth = 1;
  viewportHeight = 1;

  constructor(options: CameraOptions = {}) {
    this.metrics = options.metrics ?? DEFAULT_ISO;
    this.zoom = options.zoom ?? 1;
    this.minZoom = options.minZoom ?? 0.35;
    this.maxZoom = options.maxZoom ?? 3;
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  setZoom(zoom: number): void {
    this.zoom = clamp(zoom, this.minZoom, this.maxZoom);
  }

  zoomBy(factor: number): void {
    this.setZoom(this.zoom * factor);
  }

  panWorld(delta: Vec2): void {
    this.position.x += delta.x;
    this.position.y += delta.y;
  }

  lookAt(world: Vec2): void {
    this.position = { x: world.x, y: world.y };
  }

  /** World → canvas pixel. */
  worldToScreen(world: Vec2): Vec2 {
    const local = worldToScreen(
      {
        x: world.x - this.position.x,
        y: world.y - this.position.y,
      },
      this.metrics,
    );
    return {
      x: local.x * this.zoom + this.viewportWidth / 2,
      y: local.y * this.zoom + this.viewportHeight / 2,
    };
  }

  /** Canvas pixel → world. */
  screenToWorld(screen: Vec2): Vec2 {
    const local = {
      x: (screen.x - this.viewportWidth / 2) / this.zoom,
      y: (screen.y - this.viewportHeight / 2) / this.zoom,
    };
    const world = screenToWorld(local, this.metrics);
    return {
      x: world.x + this.position.x,
      y: world.y + this.position.y,
    };
  }

  /** Effective half-tile sizes at current zoom (for drawing). */
  tileSize(): { width: number; height: number } {
    return {
      width: this.metrics.tileWidth * this.zoom,
      height: this.metrics.tileHeight * this.zoom,
    };
  }
}
