import type { Vec2 } from "./math/Vec2";

export type KeyCode = string;

/**
 * Keyboard + pointer state for the game canvas.
 * Coordinates are canvas-local CSS pixels (matching canvas width/height attrs).
 */
export class Input {
  private readonly keysDown = new Set<KeyCode>();
  private readonly keysPressed = new Set<KeyCode>();
  private readonly keysReleased = new Set<KeyCode>();

  mouse: Vec2 = { x: 0, y: 0 };
  mouseDown = false;
  mousePressed = false;
  mouseReleased = false;
  wheelDelta = 0;

  private readonly canvas: HTMLCanvasElement;
  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;
  private readonly onPointerMove: (e: PointerEvent) => void;
  private readonly onPointerDown: (e: PointerEvent) => void;
  private readonly onPointerUp: (e: PointerEvent) => void;
  private readonly onPointerCancel: (e: PointerEvent) => void;
  private readonly onWheel: (e: WheelEvent) => void;
  private readonly onContextMenu: (e: Event) => void;
  private activePointerId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.onKeyDown = (e) => {
      if (!this.keysDown.has(e.code)) this.keysPressed.add(e.code);
      this.keysDown.add(e.code);
    };
    this.onKeyUp = (e) => {
      this.keysDown.delete(e.code);
      this.keysReleased.add(e.code);
    };
    this.onPointerMove = (e) => {
      if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
      this.updateMouse(e);
    };
    this.onPointerDown = (e) => {
      // Touch / pen often report button 0; ignore non-primary mouse buttons.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (this.activePointerId !== null) return;
      this.updateMouse(e);
      this.mouseDown = true;
      this.mousePressed = true;
      this.activePointerId = e.pointerId;
      this.canvas.setPointerCapture(e.pointerId);
    };
    this.onPointerUp = (e) => {
      if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      this.updateMouse(e);
      this.mouseDown = false;
      this.mouseReleased = true;
      this.activePointerId = null;
    };
    this.onPointerCancel = (e) => {
      if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
      this.mouseDown = false;
      this.mouseReleased = true;
      this.activePointerId = null;
    };
    this.onWheel = (e) => {
      e.preventDefault();
      this.wheelDelta += e.deltaY;
    };
    this.onContextMenu = (e) => e.preventDefault();

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
    canvas.addEventListener("lostpointercapture", this.onPointerCancel);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("contextmenu", this.onContextMenu);
  }

  private updateMouse(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mouse = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  isDown(code: KeyCode): boolean {
    return this.keysDown.has(code);
  }

  justPressed(code: KeyCode): boolean {
    return this.keysPressed.has(code);
  }

  justReleased(code: KeyCode): boolean {
    return this.keysReleased.has(code);
  }

  /** Axis from WASD / arrow keys. */
  moveAxis(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.isDown("KeyD") || this.isDown("ArrowRight")) x += 1;
    if (this.isDown("KeyA") || this.isDown("ArrowLeft")) x -= 1;
    if (this.isDown("KeyS") || this.isDown("ArrowDown")) y += 1;
    if (this.isDown("KeyW") || this.isDown("ArrowUp")) y -= 1;
    return { x, y };
  }

  /** Call at end of each frame to clear edge-triggered state. */
  endFrame(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.mousePressed = false;
    this.mouseReleased = false;
    this.wheelDelta = 0;
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("lostpointercapture", this.onPointerCancel);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
  }
}
