import type { SpriteSheet } from "./render/SpriteSheet";

export type AssetMap = Record<string, string>;

/**
 * Image + sprite-sheet registry. Paths resolve via Vite / public URLs.
 */
export class Assets {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly sheets = new Map<string, SpriteSheet>();

  async loadImages(map: AssetMap): Promise<void> {
    const entries = Object.entries(map);
    await Promise.all(
      entries.map(async ([key, url]) => {
        const img = await loadImage(url);
        this.images.set(key, img);
      }),
    );
  }

  registerImage(key: string, image: HTMLImageElement): void {
    this.images.set(key, image);
  }

  get(key: string): HTMLImageElement {
    const img = this.images.get(key);
    if (!img) throw new Error(`Asset not loaded: ${key}`);
    return img;
  }

  has(key: string): boolean {
    return this.images.has(key);
  }

  tryGet(key: string): HTMLImageElement | undefined {
    return this.images.get(key);
  }

  registerSheet(key: string, sheet: SpriteSheet): void {
    this.sheets.set(key, sheet);
  }

  getSheet(key: string): SpriteSheet {
    const sheet = this.sheets.get(key);
    if (!sheet) throw new Error(`Sprite sheet not registered: ${key}`);
    return sheet;
  }

  hasSheet(key: string): boolean {
    return this.sheets.has(key);
  }

  tryGetSheet(key: string): SpriteSheet | undefined {
    return this.sheets.get(key);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
