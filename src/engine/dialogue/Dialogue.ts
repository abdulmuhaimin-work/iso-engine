import type { FlagValue } from "./Flags";

export interface DialogueChoice {
  text: string;
  /** Next node id. Omit (or end dialogue) when missing and no `end`. */
  next?: string;
  /** End the conversation after this choice. */
  end?: boolean;
  setFlags?: Record<string, FlagValue>;
  /** Choice only shown when all flags match. */
  requireFlags?: Record<string, FlagValue>;
  /** Choice hidden when all flags match. */
  hideIfFlags?: Record<string, FlagValue>;
}

export interface DialogueNode {
  id: string;
  speaker?: string;
  text: string;
  /**
   * If present (even empty after filtering), show as choice menu.
   * If omitted, node advances via continue → `next` (or ends).
   */
  choices?: DialogueChoice[];
  next?: string;
  setFlags?: Record<string, FlagValue>;
}

export interface DialogueScript {
  id: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}

export function getNode(script: DialogueScript, id: string): DialogueNode {
  const node = script.nodes[id];
  if (!node) throw new Error(`Dialogue "${script.id}" missing node "${id}"`);
  return node;
}
