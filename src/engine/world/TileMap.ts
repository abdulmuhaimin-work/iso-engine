export interface TileDef {
  id: number;
  name: string;
  /** CSS color used by the procedural diamond renderer. */
  color: string;
  walkable: boolean;
  /**
   * Optional extra visual rise in screen px at zoom 1 (on top of map height).
   * Prefer map `heights` for terrain; use this for props like crates.
   */
  elevation?: number;
}

export interface TileMapData {
  width: number;
  height: number;
  /** Row-major surface tile ids, length = width * height. */
  tiles: number[];
  /**
   * Integer height levels per cell (0 = ground). Length = width * height.
   * Visual rise = height × `layerHeight`.
   */
  heights?: number[];
  /**
   * Optional overlay tile ids drawn on the surface (0 / undefined = none).
   * Useful for flowers, paths markings, etc. without replacing the ground.
   */
  overlays?: number[];
  defs: Record<number, TileDef>;
  /** Screen pixels per height level at zoom 1 (default 16). */
  layerHeight?: number;
}

/**
 * Flat tile grid with optional height map + overlay layer.
 */
export class TileMap {
  readonly width: number;
  readonly height: number;
  /** Screen px per height unit at zoom 1. */
  readonly layerHeight: number;
  private readonly tiles: number[];
  private readonly heights: number[];
  private readonly overlays: number[];
  readonly defs: Map<number, TileDef>;

  constructor(data: TileMapData) {
    this.width = data.width;
    this.height = data.height;
    this.layerHeight = data.layerHeight ?? 16;
    const cells = data.width * data.height;
    if (data.tiles.length !== cells) {
      throw new Error("TileMap tiles length must equal width * height");
    }
    if (data.heights && data.heights.length !== cells) {
      throw new Error("TileMap heights length must equal width * height");
    }
    if (data.overlays && data.overlays.length !== cells) {
      throw new Error("TileMap overlays length must equal width * height");
    }
    this.tiles = data.tiles.slice();
    this.heights = data.heights?.slice() ?? new Array(cells).fill(0);
    this.overlays = data.overlays?.slice() ?? new Array(cells).fill(0);
    this.defs = new Map(
      Object.entries(data.defs).map(([id, def]) => [Number(id), def]),
    );
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }

  index(tx: number, ty: number): number {
    return ty * this.width + tx;
  }

  getId(tx: number, ty: number): number {
    if (!this.inBounds(tx, ty)) return -1;
    return this.tiles[this.index(tx, ty)]!;
  }

  setId(tx: number, ty: number, id: number): void {
    if (!this.inBounds(tx, ty)) return;
    this.tiles[this.index(tx, ty)] = id;
  }

  getHeight(tx: number, ty: number): number {
    if (!this.inBounds(tx, ty)) return 0;
    return this.heights[this.index(tx, ty)]!;
  }

  setHeight(tx: number, ty: number, height: number): void {
    if (!this.inBounds(tx, ty)) return;
    this.heights[this.index(tx, ty)] = Math.max(0, height | 0);
  }

  getOverlay(tx: number, ty: number): number {
    if (!this.inBounds(tx, ty)) return 0;
    return this.overlays[this.index(tx, ty)]!;
  }

  setOverlay(tx: number, ty: number, id: number): void {
    if (!this.inBounds(tx, ty)) return;
    this.overlays[this.index(tx, ty)] = id;
  }

  getDef(tx: number, ty: number): TileDef | undefined {
    return this.defs.get(this.getId(tx, ty));
  }

  getOverlayDef(tx: number, ty: number): TileDef | undefined {
    const id = this.getOverlay(tx, ty);
    if (!id) return undefined;
    return this.defs.get(id);
  }

  isWalkable(tx: number, ty: number): boolean {
    const def = this.getDef(tx, ty);
    return !!def?.walkable;
  }

  /**
   * Total visual elevation in screen px at zoom 1
   * (height map × layerHeight + tile def elevation).
   */
  elevationPx(tx: number, ty: number): number {
    const def = this.getDef(tx, ty);
    return this.getHeight(tx, ty) * this.layerHeight + (def?.elevation ?? 0);
  }

  /** Max height present on the map (for loops / culling). */
  maxHeight(): number {
    let max = 0;
    for (const h of this.heights) if (h > max) max = h;
    return max;
  }

  forEach(
    callback: (tx: number, ty: number, id: number, def?: TileDef) => void,
  ): void {
    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        const id = this.getId(tx, ty);
        callback(tx, ty, id, this.defs.get(id));
      }
    }
  }
}

/** Fill a rectangular map with a single tile id. */
export function createFilledMap(
  width: number,
  height: number,
  fillId: number,
  defs: Record<number, TileDef>,
  options: { heights?: number[]; overlays?: number[]; layerHeight?: number } = {},
): TileMap {
  return new TileMap({
    width,
    height,
    tiles: new Array(width * height).fill(fillId),
    heights: options.heights,
    overlays: options.overlays,
    defs,
    layerHeight: options.layerHeight,
  });
}
