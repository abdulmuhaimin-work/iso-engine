import type { DialogueChoice, DialogueNode } from "./Dialogue";
import type { DialogueEvent, DialogueRunner } from "./DialogueRunner";

export interface DialogueUIOptions {
  root: HTMLElement;
  runner: DialogueRunner;
}

/**
 * DOM dialogue panel: speaker, body, continue / choice buttons.
 * Pointer events are enabled only while a conversation is open.
 */
export class DialogueUI {
  readonly element: HTMLElement;
  private readonly runner: DialogueRunner;
  private readonly speakerEl: HTMLElement;
  private readonly textEl: HTMLElement;
  private readonly choicesEl: HTMLElement;
  private readonly continueBtn: HTMLButtonElement;
  private unbind: (() => void) | null = null;

  constructor(options: DialogueUIOptions) {
    this.runner = options.runner;
    this.element = document.createElement("div");
    this.element.id = "dialogue";
    this.element.className = "dialogue hidden";
    this.element.innerHTML = `
      <div class="dialogue__panel">
        <div class="dialogue__speaker"></div>
        <div class="dialogue__text"></div>
        <div class="dialogue__choices"></div>
        <button type="button" class="dialogue__continue">Continue</button>
      </div>
    `;
    options.root.appendChild(this.element);

    this.speakerEl = this.element.querySelector(".dialogue__speaker")!;
    this.textEl = this.element.querySelector(".dialogue__text")!;
    this.choicesEl = this.element.querySelector(".dialogue__choices")!;
    this.continueBtn = this.element.querySelector(".dialogue__continue")!;

    this.continueBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.runner.continue();
    });

    this.unbind = this.runner.on((event) => this.onEvent(event));
  }

  destroy(): void {
    this.unbind?.();
    this.element.remove();
  }

  private onEvent(event: DialogueEvent): void {
    if (event.type === "end") {
      this.element.classList.add("hidden");
      this.choicesEl.replaceChildren();
      return;
    }
    if (event.type === "node") {
      this.showNode(event.node, event.choices);
    }
  }

  private showNode(node: DialogueNode, choices: DialogueChoice[]): void {
    this.element.classList.remove("hidden");
    this.speakerEl.textContent = node.speaker ?? "";
    this.speakerEl.style.display = node.speaker ? "block" : "none";
    this.textEl.textContent = node.text;

    this.choicesEl.replaceChildren();
    if (choices.length > 0) {
      this.continueBtn.classList.add("hidden");
      choices.forEach((choice, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dialogue__choice";
        btn.textContent = choice.text;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.runner.choose(index);
        });
        this.choicesEl.appendChild(btn);
      });
    } else {
      this.continueBtn.classList.remove("hidden");
    }
  }
}
