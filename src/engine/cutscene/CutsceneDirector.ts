import type { Camera } from "../Camera";
import type { Flags } from "../dialogue/Flags";
import { CutsceneArtRegistry } from "./CutsceneArt";
import type { CutsceneScript } from "./Cutscene";
import { CutsceneRunner } from "./CutsceneRunner";
import { CutsceneUI } from "./CutsceneUI";

export interface CutsceneDirectorOptions {
  root: HTMLElement;
  flags: Flags;
  fadeElement?: HTMLElement | null;
  scripts?: Record<string, CutsceneScript>;
  art?: CutsceneArtRegistry;
}

/**
 * Facade used by gameplay code: play by id, update each frame, skip/continue input.
 */
export class CutsceneDirector {
  readonly art: CutsceneArtRegistry;
  private readonly runner: CutsceneRunner;
  private readonly scripts = new Map<string, CutsceneScript>();

  constructor(options: CutsceneDirectorOptions) {
    this.art = options.art ?? new CutsceneArtRegistry();
    this.runner = new CutsceneRunner({ flags: options.flags });
    if (options.scripts) {
      for (const [id, script] of Object.entries(options.scripts)) {
        this.scripts.set(id, script);
      }
    }
    new CutsceneUI({
      root: options.root,
      runner: this.runner,
      art: this.art,
      fadeElement: options.fadeElement,
    });
  }

  get active(): boolean {
    return this.runner.active;
  }

  registerScript(script: CutsceneScript): void {
    this.scripts.set(script.id, script);
  }

  registerArt(id: string, factory: () => HTMLCanvasElement): void {
    this.art.register(id, factory);
  }

  play(id: string, onComplete?: () => void): boolean {
    const script = this.scripts.get(id);
    if (!script) {
      console.warn(`Unknown cutscene: ${id}`);
      return false;
    }
    this.runner.play(script, onComplete);
    return true;
  }

  continue(): void {
    this.runner.continue();
  }

  skip(): void {
    this.runner.skip();
  }

  update(dt: number, camera: Camera): void {
    this.runner.update(dt, camera);
  }
}
