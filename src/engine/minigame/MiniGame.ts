import type { Flags } from "../dialogue/Flags";
import type { Input } from "../Input";

export interface MiniGamePointer {
  x: number;
  y: number;
  down: boolean;
  pressed: boolean;
}

/**
 * Per-frame services passed to a running minigame.
 * Width/height are CSS pixels.
 */
export interface MiniGameContext {
  flags: Flags;
  /** Shared keyboard/mouse from the world canvas (keys are window-level). */
  input: Input;
  /** Pointer on the overlay canvas, in CSS pixels. */
  pointer: MiniGamePointer;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dt: number;
  elapsed: number;
  quit: () => void;
}

export interface MiniGame {
  readonly id: string;
  readonly name: string;
  start(ctx: MiniGameContext): void;
  update(ctx: MiniGameContext): void;
  render(ctx: MiniGameContext): void;
  end(): void;
}

export type MiniGameFactory = () => MiniGame;
