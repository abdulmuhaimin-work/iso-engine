import type { Flags } from "./Flags";
import {
  getNode,
  type DialogueChoice,
  type DialogueNode,
  type DialogueScript,
} from "./Dialogue";

export type DialogueEvent =
  | { type: "start"; script: DialogueScript }
  | { type: "node"; node: DialogueNode; choices: DialogueChoice[] }
  | { type: "end"; script: DialogueScript | null };

export type DialogueListener = (event: DialogueEvent) => void;

/**
 * Runs a dialogue graph against a shared Flags blackboard.
 */
export class DialogueRunner {
  private script: DialogueScript | null = null;
  private nodeId: string | null = null;
  private readonly listeners = new Set<DialogueListener>();

  constructor(readonly flags: Flags) {}

  get active(): boolean {
    return this.script !== null;
  }

  get currentScript(): DialogueScript | null {
    return this.script;
  }

  get currentNode(): DialogueNode | null {
    if (!this.script || !this.nodeId) return null;
    return getNode(this.script, this.nodeId);
  }

  on(listener: DialogueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(script: DialogueScript, startId = script.start): void {
    this.script = script;
    this.nodeId = startId;
    this.emit({ type: "start", script });
    this.enterNode(startId);
  }

  /** Advance a linear node (no choices). */
  continue(): void {
    const node = this.currentNode;
    if (!node || !this.script) return;
    const visible = this.visibleChoices(node);
    if (visible.length > 0) return; // must pick
    if (node.next) this.enterNode(node.next);
    else this.end();
  }

  choose(index: number): void {
    const node = this.currentNode;
    if (!node || !this.script) return;
    const visible = this.visibleChoices(node);
    const choice = visible[index];
    if (!choice) return;

    if (choice.setFlags) this.flags.setMany(choice.setFlags);

    if (choice.end || !choice.next) {
      this.end();
      return;
    }
    this.enterNode(choice.next);
  }

  end(): void {
    const script = this.script;
    this.script = null;
    this.nodeId = null;
    this.emit({ type: "end", script });
  }

  visibleChoices(node: DialogueNode = this.currentNode!): DialogueChoice[] {
    if (!node?.choices) return [];
    return node.choices.filter((choice) => {
      if (choice.requireFlags && !this.flags.matches(choice.requireFlags)) {
        return false;
      }
      if (choice.hideIfFlags && this.flags.matches(choice.hideIfFlags)) {
        return false;
      }
      return true;
    });
  }

  private enterNode(id: string): void {
    if (!this.script) return;
    const node = getNode(this.script, id);
    this.nodeId = id;
    if (node.setFlags) this.flags.setMany(node.setFlags);
    const choices = this.visibleChoices(node);
    this.emit({ type: "node", node, choices });
  }

  private emit(event: DialogueEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
