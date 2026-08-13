import type { TileDef, TileMapData } from "../engine";
import { TILE_DEFS } from "../demo/map";

export type EditorTool =
  | "paint"
  | "overlay"
  | "eraseOverlay"
  | "heightUp"
  | "heightDown"
  | "eyedropper"
  | "fill";

export interface EditorDocument {
  width: number;
  height: number;
  tiles: number[];
  heights: number[];
  overlays: number[];
  defs: Record<number, TileDef>;
  layerHeight: number;
}

export function createDefaultDocument(
  width = 16,
  height = 16,
): EditorDocument {
  const cells = width * height;
  const grass = 1;
  return {
    width,
    height,
    tiles: new Array(cells).fill(grass),
    heights: new Array(cells).fill(0),
    overlays: new Array(cells).fill(0),
    defs: structuredClone(TILE_DEFS),
    layerHeight: 16,
  };
}

export function toTileMapData(doc: EditorDocument): TileMapData {
  return {
    width: doc.width,
    height: doc.height,
    tiles: doc.tiles.slice(),
    heights: doc.heights.slice(),
    overlays: doc.overlays.slice(),
    defs: structuredClone(doc.defs),
    layerHeight: doc.layerHeight,
  };
}

export function fromTileMapData(data: TileMapData): EditorDocument {
  const cells = data.width * data.height;
  if (data.tiles.length !== cells) {
    throw new Error("Invalid map: tiles length mismatch");
  }
  return {
    width: data.width,
    height: data.height,
    tiles: data.tiles.slice(),
    heights: data.heights?.slice() ?? new Array(cells).fill(0),
    overlays: data.overlays?.slice() ?? new Array(cells).fill(0),
    defs: structuredClone(data.defs),
    layerHeight: data.layerHeight ?? 16,
  };
}

export function indexAt(doc: EditorDocument, x: number, y: number): number {
  return y * doc.width + x;
}

export function inBounds(doc: EditorDocument, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < doc.width && y < doc.height;
}

export function resizeDocument(
  doc: EditorDocument,
  width: number,
  height: number,
  fillId: number,
): EditorDocument {
  const tiles = new Array(width * height).fill(fillId);
  const heights = new Array(width * height).fill(0);
  const overlays = new Array(width * height).fill(0);
  const copyW = Math.min(width, doc.width);
  const copyH = Math.min(height, doc.height);
  for (let y = 0; y < copyH; y++) {
    for (let x = 0; x < copyW; x++) {
      const from = indexAt(doc, x, y);
      const to = y * width + x;
      tiles[to] = doc.tiles[from]!;
      heights[to] = doc.heights[from]!;
      overlays[to] = doc.overlays[from]!;
    }
  }
  return {
    ...doc,
    width,
    height,
    tiles,
    heights,
    overlays,
  };
}

export function nextTileId(defs: Record<number, TileDef>): number {
  const ids = Object.keys(defs).map(Number);
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

export function floodFillTiles(
  doc: EditorDocument,
  startX: number,
  startY: number,
  paintId: number,
): void {
  if (!inBounds(doc, startX, startY)) return;
  const start = indexAt(doc, startX, startY);
  const target = doc.tiles[start]!;
  if (target === paintId) return;

  const stack: Array<[number, number]> = [[startX, startY]];
  const seen = new Set<number>();

  while (stack.length) {
    const [x, y] = stack.pop()!;
    const i = indexAt(doc, x, y);
    if (seen.has(i)) continue;
    seen.add(i);
    if (doc.tiles[i] !== target) continue;
    doc.tiles[i] = paintId;
    const n: Array<[number, number]> = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of n) {
      if (inBounds(doc, nx, ny)) stack.push([nx, ny]);
    }
  }
}
