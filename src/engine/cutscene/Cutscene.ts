/** Authoring format for in-engine story beats (JSON-serializable). */

export type CutsceneCaptionStep = {
  type: "caption";
  speaker?: string;
  text: string;
  /** Advance on player input (default) or after N seconds. */
  advance?: "input" | number;
};

export type CutsceneStep =
  | { type: "letterbox"; on: boolean }
  | { type: "fade"; mode: "in" | "out"; duration?: number }
  | { type: "wait"; seconds: number }
  | {
      type: "camera";
      x: number;
      y: number;
      duration?: number;
      zoom?: number;
    }
  | CutsceneCaptionStep
  | { type: "art"; id: string; layout?: "center" | "left" | "right" }
  | { type: "clearArt" }
  | { type: "setFlag"; flags: Record<string, boolean | number | string> };

export interface CutsceneScript {
  id: string;
  /** Allow Esc / Skip control to jump to the end. Default true. */
  skippable?: boolean;
  steps: CutsceneStep[];
}
