import type { CutsceneArtRegistry } from "./CutsceneArt";
import type { CutsceneRunner, CutsceneRunnerEvent } from "./CutsceneRunner";

export interface CutsceneUIOptions {
  root: HTMLElement;
  runner: CutsceneRunner;
  art: CutsceneArtRegistry;
  fadeElement?: HTMLElement | null;
}

/**
 * Letterbox bars, illustration panel, cinematic captions, skip hint.
 */
export class CutsceneUI {
  readonly element: HTMLElement;
  private readonly runner: CutsceneRunner;
  private readonly art: CutsceneArtRegistry;
  private readonly fadeElement: HTMLElement | null;
  private readonly speakerEl: HTMLElement;
  private readonly textEl: HTMLElement;
  private readonly artWrap: HTMLElement;
  private readonly artCanvas: HTMLCanvasElement;
  private unbind: (() => void) | null = null;

  constructor(options: CutsceneUIOptions) {
    this.runner = options.runner;
    this.art = options.art;
    this.fadeElement = options.fadeElement ?? null;

    this.element = document.createElement("div");
    this.element.id = "cutscene";
    this.element.className = "cutscene hidden";
    this.element.innerHTML = `
      <div class="cutscene__letterbox cutscene__letterbox--top"></div>
      <div class="cutscene__letterbox cutscene__letterbox--bottom"></div>
      <div class="cutscene__art-wrap">
        <canvas class="cutscene__art" width="320" height="180"></canvas>
      </div>
      <div class="cutscene__caption">
        <div class="cutscene__caption-speaker"></div>
        <div class="cutscene__caption-text"></div>
      </div>
      <div class="cutscene__skip">Esc · skip</div>
    `;
    options.root.appendChild(this.element);

    this.speakerEl = this.element.querySelector(".cutscene__caption-speaker")!;
    this.textEl = this.element.querySelector(".cutscene__caption-text")!;
    this.artWrap = this.element.querySelector(".cutscene__art-wrap")!;
    this.artCanvas = this.element.querySelector(".cutscene__art")!;

    this.unbind = this.runner.on((event) => this.onEvent(event));
  }

  destroy(): void {
    this.unbind?.();
    this.element.remove();
  }

  private onEvent(event: CutsceneRunnerEvent): void {
    if (event.type === "start") {
      this.element.classList.remove("hidden");
      return;
    }
    if (event.type === "end") {
      this.element.classList.add("hidden");
      this.artWrap.classList.remove(
        "cutscene__art-wrap--left",
        "cutscene__art-wrap--right",
      );
      if (this.fadeElement) {
        this.fadeElement.style.opacity = "0";
        this.fadeElement.style.pointerEvents = "none";
      }
      return;
    }
    if (event.type === "letterbox") {
      this.element.classList.toggle("cutscene--letterbox", event.on);
      return;
    }
    if (event.type === "fade" && this.fadeElement) {
      this.fadeElement.style.opacity = String(event.opacity);
      this.fadeElement.style.pointerEvents = event.opacity > 0.05 ? "auto" : "none";
      return;
    }
    if (event.type === "art") {
      this.artWrap.classList.remove(
        "cutscene__art-wrap--left",
        "cutscene__art-wrap--right",
      );
      if (event.layout === "left") this.artWrap.classList.add("cutscene__art-wrap--left");
      if (event.layout === "right") this.artWrap.classList.add("cutscene__art-wrap--right");

      if (!event.id) {
        this.artWrap.classList.add("hidden");
        return;
      }
      const source = this.art.create(event.id);
      if (!source) {
        this.artWrap.classList.add("hidden");
        return;
      }
      const ctx = this.artCanvas.getContext("2d");
      if (ctx) {
        this.artCanvas.width = source.width;
        this.artCanvas.height = source.height;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, source.width, source.height);
        ctx.drawImage(source, 0, 0);
      }
      this.artWrap.classList.remove("hidden");
      return;
    }
    if (event.type === "caption") {
      if (!event.visible) {
        this.element.classList.remove("cutscene--caption");
        this.speakerEl.textContent = "";
        this.textEl.textContent = "";
        return;
      }
      this.element.classList.add("cutscene--caption");
      this.speakerEl.textContent = event.speaker ?? "";
      this.speakerEl.style.display = event.speaker ? "block" : "none";
      this.textEl.textContent = event.text;
    }
  }
}
