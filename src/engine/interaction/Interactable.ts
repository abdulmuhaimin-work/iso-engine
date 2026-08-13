import type { Entity } from "../world/Entity";
import type { World } from "../world/World";
import type { Flags } from "../dialogue/Flags";
import type { DialogueRunner } from "../dialogue/DialogueRunner";

export interface InteractContext {
  world: World;
  actor: Entity;
  target: Entity;
  flags: Flags;
  dialogue: DialogueRunner;
}

export interface Interactable {
  /** Short verb shown in the prompt, e.g. "Talk", "Inspect". */
  prompt: string;
  /** Optional display name for the prompt line. */
  name?: string;
  /** Interaction range in tile units. Default 1.35. */
  radius?: number;
  /** When false / returns false, target is ignored. */
  enabled?: boolean | (() => boolean);
  onInteract: (ctx: InteractContext) => void;
}

export function isInteractableEnabled(interactable: Interactable): boolean {
  if (typeof interactable.enabled === "function") return interactable.enabled();
  return interactable.enabled !== false;
}
