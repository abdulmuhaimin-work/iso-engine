export interface Brick {
  /** Grid X (east). */
  x: number;
  /** Grid Y (up). */
  y: number;
  /** Grid Z (south). */
  z: number;
  /** CSS hex color for the brick. */
  color: string;
}

export interface BrickModelData {
  id: string;
  name: string;
  bricks: Brick[];
  /** Half-width of brick top diamond in px. Default 16. */
  tileWidth?: number;
  /** Half-height of brick top diamond in px. Default 8. */
  tileHeight?: number;
  /** Vertical size of one brick in px. Default 16. */
  brickHeight?: number;
}

export interface BrickMetrics {
  tileWidth: number;
  tileHeight: number;
  brickHeight: number;
}

export const DEFAULT_BRICK_METRICS: BrickMetrics = {
  tileWidth: 16,
  tileHeight: 8,
  brickHeight: 16,
};

export function brickKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/**
 * Lego-style isometric brick assembly (voxel props / characters).
 */
export class BrickModel {
  id: string;
  name: string;
  metrics: BrickMetrics;
  private readonly map = new Map<string, Brick>();

  constructor(data: BrickModelData = { id: "prop", name: "Prop", bricks: [] }) {
    this.id = data.id;
    this.name = data.name;
    this.metrics = {
      tileWidth: data.tileWidth ?? DEFAULT_BRICK_METRICS.tileWidth,
      tileHeight: data.tileHeight ?? DEFAULT_BRICK_METRICS.tileHeight,
      brickHeight: data.brickHeight ?? DEFAULT_BRICK_METRICS.brickHeight,
    };
    for (const b of data.bricks) this.setBrick(b.x, b.y, b.z, b.color);
  }

  get bricks(): Brick[] {
    return [...this.map.values()];
  }

  get count(): number {
    return this.map.size;
  }

  has(x: number, y: number, z: number): boolean {
    return this.map.has(brickKey(x, y, z));
  }

  get(x: number, y: number, z: number): Brick | undefined {
    return this.map.get(brickKey(x, y, z));
  }

  setBrick(x: number, y: number, z: number, color: string): void {
    this.map.set(brickKey(x, y, z), { x, y, z, color });
  }

  removeBrick(x: number, y: number, z: number): void {
    this.map.delete(brickKey(x, y, z));
  }

  toggle(x: number, y: number, z: number, color: string): void {
    if (this.has(x, y, z)) this.removeBrick(x, y, z);
    else this.setBrick(x, y, z, color);
  }

  clear(): void {
    this.map.clear();
  }

  /** Axis-aligned bounds of occupied bricks (inclusive). */
  bounds(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  } | null {
    if (this.map.size === 0) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const b of this.map.values()) {
      minX = Math.min(minX, b.x);
      maxX = Math.max(maxX, b.x);
      minY = Math.min(minY, b.y);
      maxY = Math.max(maxY, b.y);
      minZ = Math.min(minZ, b.z);
      maxZ = Math.max(maxZ, b.z);
    }
    return { minX, maxX, minY, maxY, minZ, maxZ };
  }

  /** Painter order: back → front, then bottom → top. */
  sorted(): Brick[] {
    return this.bricks.sort((a, b) => {
      const da = a.x + a.z;
      const db = b.x + b.z;
      if (da !== db) return da - db;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
  }

  toJSON(): BrickModelData {
    return {
      id: this.id,
      name: this.name,
      bricks: this.bricks,
      tileWidth: this.metrics.tileWidth,
      tileHeight: this.metrics.tileHeight,
      brickHeight: this.metrics.brickHeight,
    };
  }

  static fromJSON(data: BrickModelData): BrickModel {
    return new BrickModel(data);
  }
}

/** Screen offset of brick origin (foot of column) relative to model origin. */
export function brickToScreen(
  x: number,
  y: number,
  z: number,
  metrics: BrickMetrics,
): { x: number; y: number } {
  return {
    x: (x - z) * metrics.tileWidth,
    y: (x + z) * metrics.tileHeight - y * metrics.brickHeight,
  };
}
