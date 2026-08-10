export type AssetMap = Record<string, string>;

/**
 * Simple image loader. Paths are resolved relative to the page / Vite public URL.
 */
export class Assets {
  private readonly images = new Map<string, HTMLImageElement>();

  async loadImages(map: AssetMap): Promise<void> {
    const entries = Object.entries(map);
    await Promise.all(
      entries.map(async ([key, url]) => {
        const img = await loadImage(url);
        this.images.set(key, img);
      }),
    );
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
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
