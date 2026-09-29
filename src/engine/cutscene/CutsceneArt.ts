/** Registry of illustration ids → canvas producers (procedural or loaded). */
export type CutsceneArtFactory = () => HTMLCanvasElement;

export class CutsceneArtRegistry {
  private readonly factories = new Map<string, CutsceneArtFactory>();

  register(id: string, factory: CutsceneArtFactory): void {
    this.factories.set(id, factory);
  }

  create(id: string): HTMLCanvasElement | null {
    const fn = this.factories.get(id);
    return fn ? fn() : null;
  }

  has(id: string): boolean {
    return this.factories.has(id);
  }
}
