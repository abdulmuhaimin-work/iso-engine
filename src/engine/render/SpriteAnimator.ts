import type { FrameRect, SpriteSheet } from "./SpriteSheet";

export interface AnimClip {
  /** Frame indices into the sprite sheet. */
  frames: number[];
  fps: number;
  loop?: boolean;
}

export interface SpriteAnimatorOptions {
  sheet: SpriteSheet;
  animations: Record<string, AnimClip>;
  /** Initial clip name. */
  initial?: string;
  /** Draw scale vs sheet frame pixels (at zoom 1). */
  scale?: number;
  /** Anchor offset from foot (bottom-center), screen px at zoom 1. */
  offsetX?: number;
  offsetY?: number;
}

/**
 * Plays named clips from a sprite sheet. Call `update(dt)` each frame.
 */
export class SpriteAnimator {
  sheet: SpriteSheet;
  animations: Record<string, AnimClip>;
  scale: number;
  offsetX: number;
  offsetY: number;
  flipX = false;
  playing = true;

  private clipName: string;
  private elapsed = 0;
  private frameCursor = 0;
  private finished = false;

  constructor(options: SpriteAnimatorOptions) {
    this.sheet = options.sheet;
    this.animations = options.animations;
    this.scale = options.scale ?? 1;
    this.offsetX = options.offsetX ?? 0;
    this.offsetY = options.offsetY ?? 0;

    const initial = options.initial ?? Object.keys(options.animations)[0];
    if (!initial || !options.animations[initial]) {
      throw new Error("SpriteAnimator requires at least one animation clip");
    }
    this.clipName = initial;
  }

  get current(): string {
    return this.clipName;
  }

  get frameIndex(): number {
    const clip = this.animations[this.clipName]!;
    return clip.frames[this.frameCursor] ?? clip.frames[0]!;
  }

  get frame(): FrameRect {
    return this.sheet.frame(this.frameIndex);
  }

  get done(): boolean {
    return this.finished;
  }

  play(name: string, opts: { restart?: boolean } = {}): void {
    const clip = this.animations[name];
    if (!clip) throw new Error(`Unknown animation: ${name}`);
    if (this.clipName === name && !opts.restart) {
      this.playing = true;
      return;
    }
    this.clipName = name;
    this.elapsed = 0;
    this.frameCursor = 0;
    this.finished = false;
    this.playing = true;
  }

  stop(): void {
    this.playing = false;
  }

  update(dt: number): void {
    if (!this.playing || this.finished) return;
    const clip = this.animations[this.clipName]!;
    if (clip.frames.length === 0) return;

    this.elapsed += dt;
    const frameDuration = 1 / Math.max(0.001, clip.fps);
    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      if (this.frameCursor + 1 < clip.frames.length) {
        this.frameCursor += 1;
      } else if (clip.loop !== false) {
        this.frameCursor = 0;
      } else {
        this.finished = true;
        this.playing = false;
        break;
      }
    }
  }
}
