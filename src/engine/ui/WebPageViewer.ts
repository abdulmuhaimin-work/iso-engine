export interface WebPage {
  title: string;
  /** Address bar text. */
  urlBar?: string;
  /** Rendered document HTML (trusted app content). */
  html?: string;
  /** Optional live site in an iframe (may be blocked by the remote host). */
  iframeUrl?: string;
}

export interface WebPageViewerOptions {
  root: HTMLElement;
}

/**
 * In-game browser window: HTML document and/or an iframe.
 */
export class WebPageViewer {
  readonly element: HTMLElement;
  private page: WebPage | null = null;
  private readonly frame: HTMLIFrameElement;
  private readonly article: HTMLElement;
  private readonly urlEl: HTMLElement;
  private readonly titleEl: HTMLElement;

  constructor(options: WebPageViewerOptions) {
    this.element = document.createElement("div");
    this.element.id = "webpage";
    this.element.className = "webpage hidden";
    this.element.innerHTML = `
      <div class="webpage__chrome">
        <div class="webpage__bar">
          <span class="webpage__dots" aria-hidden="true"></span>
          <span class="webpage__title"></span>
          <button type="button" class="webpage__close" aria-label="Close">✕</button>
        </div>
        <div class="webpage__address">
          <span class="webpage__url"></span>
          <a class="webpage__external" target="_blank" rel="noreferrer">Open ↗</a>
        </div>
        <div class="webpage__body">
          <article class="webpage__article"></article>
          <iframe class="webpage__iframe hidden" title="Live page" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
        </div>
      </div>
    `;
    options.root.appendChild(this.element);

    this.titleEl = this.element.querySelector(".webpage__title")!;
    this.urlEl = this.element.querySelector(".webpage__url")!;
    this.article = this.element.querySelector(".webpage__article")!;
    this.frame = this.element.querySelector(".webpage__iframe")!;

    this.element.querySelector(".webpage__close")!.addEventListener("click", (e) => {
      e.stopPropagation();
      this.close();
    });
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) this.close();
    });
  }

  get active(): boolean {
    return this.page !== null;
  }

  open(page: WebPage): void {
    this.page = page;
    this.titleEl.textContent = page.title;
    const bar = page.urlBar ?? page.iframeUrl ?? "iso://resume";
    this.urlEl.textContent = bar;

    const ext = this.element.querySelector<HTMLAnchorElement>(".webpage__external")!;
    if (page.iframeUrl) {
      ext.href = page.iframeUrl;
      ext.classList.remove("hidden");
    } else if (bar.startsWith("http")) {
      ext.href = bar;
      ext.classList.remove("hidden");
    } else {
      ext.removeAttribute("href");
      ext.classList.add("hidden");
    }

    if (page.html) {
      this.article.innerHTML = page.html;
      this.article.classList.remove("hidden");
    } else {
      this.article.replaceChildren();
      this.article.classList.add("hidden");
    }

    if (page.iframeUrl) {
      this.frame.src = page.iframeUrl;
      this.frame.classList.remove("hidden");
    } else {
      this.frame.removeAttribute("src");
      this.frame.classList.add("hidden");
    }

    this.element.classList.remove("hidden");
  }

  close(): void {
    this.page = null;
    this.frame.removeAttribute("src");
    this.element.classList.add("hidden");
  }
}
