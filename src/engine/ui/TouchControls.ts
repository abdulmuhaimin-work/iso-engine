import type { Vec2 } from "../math/Vec2";

export interface TouchControlsOptions {
  root: HTMLElement;
  /** Force-visible for debugging; otherwise shown on coarse / touch UIs. */
  forceVisible?: boolean;
}

/**
 * On-screen virtual stick + action buttons for phones / tablets.
 * Stick axis is screen-space (x right, y down); map to world in the play loop.
 */
export class TouchControls {
  readonly root: HTMLElement;
  private readonly stick: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly interactBtn: HTMLButtonElement;
  private readonly recenterBtn: HTMLButtonElement;
  private readonly zoomInBtn: HTMLButtonElement;
  private readonly zoomOutBtn: HTMLButtonElement;

  private pointerId: number | null = null;
  private origin: Vec2 = { x: 0, y: 0 };
  private axis: Vec2 = { x: 0, y: 0 };
  private interactQueued = false;
  private recenterQueued = false;
  private zoomQueued = 0;
  private readonly maxRadius: number;
  private readonly media: MediaQueryList;
  private readonly onMediaChange: () => void;

  constructor(options: TouchControlsOptions) {
    this.root = options.root;
    this.root.classList.add("touch-controls");
    this.root.innerHTML = `
      <div class="touch-controls__stick" aria-label="Move">
        <div class="touch-controls__knob"></div>
      </div>
      <div class="touch-controls__actions">
        <button type="button" class="touch-controls__btn touch-controls__btn--zoom" data-action="zoom-out" aria-label="Zoom out">−</button>
        <button type="button" class="touch-controls__btn touch-controls__btn--zoom" data-action="zoom-in" aria-label="Zoom in">+</button>
        <button type="button" class="touch-controls__btn touch-controls__btn--recenter" data-action="recenter" aria-label="Recenter camera">◎</button>
        <button type="button" class="touch-controls__btn touch-controls__btn--interact" data-action="interact" aria-label="Interact">Interact</button>
      </div>
    `;

    this.stick = this.root.querySelector(".touch-controls__stick")!;
    this.knob = this.root.querySelector(".touch-controls__knob")!;
    this.interactBtn = this.root.querySelector('[data-action="interact"]')!;
    this.recenterBtn = this.root.querySelector('[data-action="recenter"]')!;
    this.zoomInBtn = this.root.querySelector('[data-action="zoom-in"]')!;
    this.zoomOutBtn = this.root.querySelector('[data-action="zoom-out"]')!;

    this.maxRadius = 52;
    this.bindStick();
    this.bindButton(this.interactBtn, () => {
      this.interactQueued = true;
    });
    this.bindButton(this.recenterBtn, () => {
      this.recenterQueued = true;
    });
    this.bindButton(this.zoomInBtn, () => {
      this.zoomQueued += 1;
    });
    this.bindButton(this.zoomOutBtn, () => {
      this.zoomQueued -= 1;
    });

    this.media = window.matchMedia("(pointer: coarse), (hover: none)");
    this.onMediaChange = () => this.syncVisibility(options.forceVisible);
    this.media.addEventListener?.("change", this.onMediaChange);
    this.syncVisibility(options.forceVisible);
  }

  /** True when the overlay is shown (touch / coarse pointer). */
  get active(): boolean {
    return this.root.classList.contains("touch-controls--visible");
  }

  /** Screen-space walk axis in [-1, 1]. */
  walkAxis(): Vec2 {
    return { x: this.axis.x, y: this.axis.y };
  }

  consumeInteract(): boolean {
    if (!this.interactQueued) return false;
    this.interactQueued = false;
    return true;
  }

  consumeRecenter(): boolean {
    if (!this.recenterQueued) return false;
    this.recenterQueued = false;
    return true;
  }

  /** Positive = zoom in, negative = zoom out. Cleared when read. */
  consumeZoomSteps(): number {
    const z = this.zoomQueued;
    this.zoomQueued = 0;
    return z;
  }

  /** Hide while modal overlays own the screen. */
  setSuppressed(suppressed: boolean): void {
    this.root.classList.toggle("touch-controls--suppressed", suppressed);
  }

  destroy(): void {
    this.media.removeEventListener?.("change", this.onMediaChange);
    this.root.innerHTML = "";
    this.root.classList.remove("touch-controls", "touch-controls--visible");
  }

  private syncVisibility(forceVisible?: boolean): void {
    // Coarse pointers (phones) and any touch-capable device (iPad, even in
    // "desktop" mode) get on-screen controls. Mouse-only desktops stay clean.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const hasTouch = navigator.maxTouchPoints > 0;
    const touchLikely = Boolean(forceVisible || coarse || hasTouch);
    this.root.classList.toggle("touch-controls--visible", touchLikely);
    this.root.setAttribute("aria-hidden", touchLikely ? "false" : "true");
  }

  private bindStick(): void {
    const onDown = (e: PointerEvent) => {
      if (this.pointerId !== null) return;
      e.preventDefault();
      e.stopPropagation();
      this.pointerId = e.pointerId;
      this.stick.setPointerCapture(e.pointerId);
      this.stick.classList.add("touch-controls__stick--active");
      const rect = this.stick.getBoundingClientRect();
      this.origin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      this.updateStick(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      e.preventDefault();
      this.updateStick(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      e.preventDefault();
      this.pointerId = null;
      this.axis = { x: 0, y: 0 };
      this.knob.style.transform = "translate(-50%, -50%)";
      this.stick.classList.remove("touch-controls__stick--active");
    };

    this.stick.addEventListener("pointerdown", onDown);
    this.stick.addEventListener("pointermove", onMove);
    this.stick.addEventListener("pointerup", onUp);
    this.stick.addEventListener("pointercancel", onUp);
    this.stick.addEventListener("lostpointercapture", onUp);
  }

  private updateStick(clientX: number, clientY: number): void {
    let dx = clientX - this.origin.x;
    let dy = clientY - this.origin.y;
    const len = Math.hypot(dx, dy);
    if (len > this.maxRadius && len > 0) {
      dx = (dx / len) * this.maxRadius;
      dy = (dy / len) * this.maxRadius;
    }
    this.axis = {
      x: dx / this.maxRadius,
      y: dy / this.maxRadius,
    };
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  private bindButton(btn: HTMLButtonElement, onTap: () => void): void {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add("touch-controls__btn--pressed");
      onTap();
    });
    const clear = (e: PointerEvent) => {
      e.preventDefault();
      btn.classList.remove("touch-controls__btn--pressed");
    };
    btn.addEventListener("pointerup", clear);
    btn.addEventListener("pointercancel", clear);
    btn.addEventListener("pointerleave", clear);
  }
}

/**
 * Map a screen-space stick (x right, y down) to a cardinal world step
 * that matches the isometric camera pan convention used by WASD.
 */
export function screenStickToWorldStep(axis: Vec2, deadzone = 0.28): Vec2 | null {
  if (Math.hypot(axis.x, axis.y) < deadzone) return null;
  // Same basis as camera pan: screen right/down → world (x+y, -x+y).
  const wx = axis.x + axis.y;
  const wy = -axis.x + axis.y;
  if (Math.abs(wx) >= Math.abs(wy)) {
    return { x: Math.sign(wx), y: 0 };
  }
  return { x: 0, y: Math.sign(wy) };
}
