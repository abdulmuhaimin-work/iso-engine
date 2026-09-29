import type { Camera } from "../Camera";
import type { Flags } from "../dialogue/Flags";
import { lerp, lerpVec, type Vec2 } from "../math/Vec2";
import type { CutsceneScript } from "./Cutscene";

export type CutsceneRunnerEvent =
  | { type: "start"; script: CutsceneScript }
  | { type: "letterbox"; on: boolean }
  | { type: "art"; id: string | null; layout: "center" | "left" | "right" }
  | { type: "caption"; speaker?: string; text: string; visible: boolean }
  | { type: "fade"; opacity: number }
  | { type: "end"; script: CutsceneScript };

export type CutsceneRunnerListener = (event: CutsceneRunnerEvent) => void;

interface CameraTween {
  from: Vec2;
  to: Vec2;
  fromZoom: number;
  toZoom: number;
  duration: number;
  elapsed: number;
}

export interface CutsceneRunnerOptions {
  flags: Flags;
}

/**
 * Step sequencer for cutscenes: camera, fades, captions, art hooks.
 */
export class CutsceneRunner {
  private script: CutsceneScript | null = null;
  private stepIndex = 0;
  private stepTimer = 0;
  private waitingInput = false;
  private fadeOpacity = 0;
  private cameraTween: CameraTween | null = null;
  private onComplete: (() => void) | null = null;
  private readonly listeners = new Set<CutsceneRunnerListener>();
  private readonly flags: Flags;

  constructor(options: CutsceneRunnerOptions) {
    this.flags = options.flags;
  }

  get active(): boolean {
    return this.script !== null;
  }

  get currentScript(): CutsceneScript | null {
    return this.script;
  }

  get fade(): number {
    return this.fadeOpacity;
  }

  on(listener: CutsceneRunnerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  play(script: CutsceneScript, onComplete?: () => void): void {
    if (this.script) return;
    this.script = script;
    this.stepIndex = 0;
    this.stepTimer = 0;
    this.waitingInput = false;
    this.fadeOpacity = 0;
    this.cameraTween = null;
    this.onComplete = onComplete ?? null;
    this.emit({ type: "start", script });
    this.emit({ type: "fade", opacity: this.fadeOpacity });
    this.beginCurrentStep();
  }

  continue(): void {
    if (!this.waitingInput || !this.script) return;
    this.waitingInput = false;
    this.emit({ type: "caption", speaker: "", text: "", visible: false });
    this.stepIndex += 1;
    this.beginCurrentStep();
  }

  skip(): void {
    const script = this.script;
    if (!script || script.skippable === false) return;
    this.finish(script);
  }

  update(dt: number, camera: Camera): void {
    if (!this.script) return;

    const currentStep = this.script.steps[this.stepIndex];
    if (currentStep?.type === "camera" && !this.cameraTween) {
      this.startCameraStep(camera);
      if (this.cameraTween) return;
    }

    if (this.cameraTween) {
      const tw = this.cameraTween;
      tw.elapsed += dt;
      const t = Math.min(1, tw.elapsed / Math.max(0.001, tw.duration));
      const eased = t * (2 - t);
      camera.position = lerpVec(tw.from, tw.to, eased);
      camera.zoom = lerp(tw.fromZoom, tw.toZoom, eased);
      if (t >= 1) {
        this.cameraTween = null;
        this.stepIndex += 1;
        this.beginCurrentStep();
      }
      return;
    }

    if (this.waitingInput) return;

    const step = this.script.steps[this.stepIndex];
    if (!step) return;

    if (step.type === "wait") {
      this.stepTimer += dt;
      if (this.stepTimer >= step.seconds) {
        this.stepTimer = 0;
        this.stepIndex += 1;
        this.beginCurrentStep();
      }
      return;
    }

    if (step.type === "fade") {
      const duration = step.duration ?? 0.45;
      this.stepTimer += dt;
      const t = Math.min(1, this.stepTimer / duration);
      this.fadeOpacity = step.mode === "out" ? t : 1 - t;
      this.emit({ type: "fade", opacity: this.fadeOpacity });
      if (t >= 1) {
        this.stepTimer = 0;
        this.stepIndex += 1;
        this.beginCurrentStep();
      }
      return;
    }

    if (step.type === "caption" && typeof step.advance === "number") {
      this.stepTimer += dt;
      if (this.stepTimer >= step.advance) {
        this.stepTimer = 0;
        this.emit({ type: "caption", speaker: "", text: "", visible: false });
        this.stepIndex += 1;
        this.beginCurrentStep();
      }
    }
  }

  private beginCurrentStep(): void {
    const script = this.script;
    if (!script) return;

    const step = script.steps[this.stepIndex];
    if (!step) {
      this.finish(script);
      return;
    }

    this.stepTimer = 0;
    this.waitingInput = false;

    switch (step.type) {
      case "letterbox":
        this.emit({ type: "letterbox", on: step.on });
        this.stepIndex += 1;
        this.beginCurrentStep();
        break;
      case "art":
        this.emit({
          type: "art",
          id: step.id,
          layout: step.layout ?? "center",
        });
        this.stepIndex += 1;
        this.beginCurrentStep();
        break;
      case "clearArt":
        this.emit({ type: "art", id: null, layout: "center" });
        this.stepIndex += 1;
        this.beginCurrentStep();
        break;
      case "setFlag":
        this.flags.setMany(step.flags);
        this.stepIndex += 1;
        this.beginCurrentStep();
        break;
      case "camera":
        break;
      case "caption": {
        const wait = step.advance ?? "input";
        this.waitingInput = wait === "input";
        this.emit({
          type: "caption",
          speaker: step.speaker,
          text: step.text,
          visible: true,
        });
        if (wait !== "input") break;
        break;
      }
      case "fade":
      case "wait":
        break;
      default:
        this.stepIndex += 1;
        this.beginCurrentStep();
    }
  }

  /** Start camera tween for the current step (must be type camera). */
  startCameraStep(camera: Camera): void {
    const script = this.script;
    if (!script || this.cameraTween) return;
    const step = script.steps[this.stepIndex];
    if (!step || step.type !== "camera") return;

    const duration = step.duration ?? 1.2;
    if (duration <= 0.001) {
      camera.lookAt({ x: step.x, y: step.y });
      if (step.zoom !== undefined) camera.setZoom(step.zoom);
      this.stepIndex += 1;
      this.beginCurrentStep();
      return;
    }

    this.cameraTween = {
      from: { x: camera.position.x, y: camera.position.y },
      to: { x: step.x, y: step.y },
      fromZoom: camera.zoom,
      toZoom: step.zoom ?? camera.zoom,
      duration,
      elapsed: 0,
    };
  }

  private finish(script: CutsceneScript): void {
    this.script = null;
    this.stepIndex = 0;
    this.cameraTween = null;
    this.waitingInput = false;
    this.fadeOpacity = 0;
    this.emit({ type: "letterbox", on: false });
    this.emit({ type: "art", id: null, layout: "center" });
    this.emit({ type: "caption", speaker: "", text: "", visible: false });
    this.emit({ type: "fade", opacity: 0 });
    this.emit({ type: "end", script });
    const done = this.onComplete;
    this.onComplete = null;
    done?.();
  }

  private emit(event: CutsceneRunnerEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
