export interface TileDef {
  id: number;
  name: string;
  /** CSS color used by the procedural diamond renderer. */
  color: string;
  walkable: boolean;
  /** Optional raised look (screen pixels at zoom 1). */
  elevation?: number;
}

export interface TileMapData {
  width: number;
  height: number;
  /** Row-major tile ids, length = width * height. */
  tiles: number[];
  defs: Record<number, TileDef>;
}

export class TileMap {
  readonly width: number;
  readonly height: number;
  private readonly tiles: number[];
  readonly defs: Map<number, TileDef>;

  constructor(data: TileMapData) {
    this.width = data.width;
    this.height = data.height;
    if (data.tiles.length !== data.width * data.height) {
      throw new Error("TileMap tiles length must equal width * height");
    }
    this.tiles = data.tiles.slice();
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

  getDef(tx: number, ty: number): TileDef | undefined {
    const id = this.getId(tx, ty);
    return this.defs.get(id);
  }

  isWalkable(tx: number, ty: number): boolean {
    const def = this.getDef(tx, ty);
    return !!def?.walkable;
  }

  forEach(callback: (tx: number, ty: number, id: number, def?: TileDef) => void): void {
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
): TileMap {
  return new TileMap({
    width,
    height,
    tiles: new Array(width * height).fill(fillId),
    defs,
  });
}
