import { distance } from "../math/Vec2";
import type { Entity } from "../world/Entity";
import type { World } from "../world/World";
import type { Flags } from "../dialogue/Flags";
import type { DialogueRunner } from "../dialogue/DialogueRunner";
import type { WebPageViewer } from "../ui/WebPageViewer";
import type { MiniGameHost } from "../minigame/MiniGameHost";
import {
  isInteractableEnabled,
  type Interactable,
  type InteractContext,
} from "./Interactable";

export interface InteractionSystemOptions {
  world: World;
  flags: Flags;
  dialogue: DialogueRunner;
  webpage?: WebPageViewer;
  minigames?: MiniGameHost;
  /** Default interact key (KeyboardEvent.code). */
  key?: string;
}

export interface InteractionFocus {
  entity: Entity;
  interactable: Interactable;
  dist: number;
}

/**
 * Finds the nearest enabled interactable in range and handles activate.
 */
export class InteractionSystem {
  world: World;
  flags: Flags;
  dialogue: DialogueRunner;
  webpage?: WebPageViewer;
  minigames?: MiniGameHost;
  key: string;
  focus: InteractionFocus | null = null;

  constructor(options: InteractionSystemOptions) {
    this.world = options.world;
    this.flags = options.flags;
    this.dialogue = options.dialogue;
    this.webpage = options.webpage;
    this.minigames = options.minigames;
    this.key = options.key ?? "KeyE";
  }

  /**
   * Update focus from actor position. Call each frame.
   * Skips scanning while dialogue is open.
   */
  update(actor: Entity): void {
    if (this.dialogue.active || this.webpage?.active || this.minigames?.active) {
      this.focus = null;
      return;
    }

    let best: InteractionFocus | null = null;

    for (const entity of this.world.entities) {
      if (!entity.active || entity === actor) continue;
      const interactable = entity.interactable;
      if (!interactable || !isInteractableEnabled(interactable)) continue;

      const radius = interactable.radius ?? 1.35;
      const dist = distance(actor.position, entity.position);
      if (dist > radius) continue;
      if (!best || dist < best.dist) {
        best = { entity, interactable, dist };
      }
    }

    this.focus = best;
  }

  /** Activate current focus (e.g. on KeyE). Returns true if something ran. */
  tryInteract(actor: Entity): boolean {
    if (this.dialogue.active || this.webpage?.active || this.minigames?.active || !this.focus) {
      return false;
    }
    const { entity, interactable } = this.focus;
    const ctx: InteractContext = {
      world: this.world,
      actor,
      target: entity,
      flags: this.flags,
      dialogue: this.dialogue,
      webpage: this.webpage,
      minigames: this.minigames,
    };
    interactable.onInteract(ctx);
    return true;
  }

  /**
   * @param keyLabel Shown before the prompt (e.g. "[E]" or "Interact").
   */
  promptText(keyLabel = "[E]"): string | null {
    if (!this.focus) return null;
    const { interactable } = this.focus;
    const name = interactable.name ?? "nearby";
    return `${keyLabel} ${interactable.prompt} · ${name}`;
  }
}
