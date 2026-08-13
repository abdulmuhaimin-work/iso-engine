import { BrickModel, type BrickModelData } from "../engine/render/BrickModel";

/** Starter kits for the brick builder. */
export const PRESETS: Record<string, () => BrickModelData> = {
  empty: () => ({
    id: "empty",
    name: "Empty",
    bricks: [],
  }),

  tree: () => {
    const bricks: BrickModelData["bricks"] = [];
    const trunk = "#8b5a2b";
    const leaf = "#3f8f4a";
    const leafDark = "#2f6f3a";
    // Trunk
    for (let y = 0; y < 3; y++) bricks.push({ x: 0, y, z: 0, color: trunk });
    // Foliage layers
    const layers: Array<[number, string]> = [
      [3, leafDark],
      [4, leaf],
      [5, leaf],
      [6, leafDark],
    ];
    for (const [y, color] of layers) {
      for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
          if (Math.abs(x) + Math.abs(z) > 2) continue;
          bricks.push({ x, y, z, color });
        }
      }
    }
    bricks.push({ x: 0, y: 7, z: 0, color: leaf });
    return { id: "tree", name: "Lego Tree", bricks };
  },

  hero: () => {
    const bricks: BrickModelData["bricks"] = [];
    const skin = "#f3d7a8";
    const shirt = "#e8b86d";
    const pants = "#3d5a4c";
    const hair = "#3d5a4c";
    // Legs
    bricks.push({ x: 0, y: 0, z: 0, color: pants });
    bricks.push({ x: 0, y: 1, z: 0, color: pants });
    // Body
    bricks.push({ x: 0, y: 2, z: 0, color: shirt });
    bricks.push({ x: 0, y: 3, z: 0, color: shirt });
    // Arms
    bricks.push({ x: -1, y: 3, z: 0, color: shirt });
    bricks.push({ x: 1, y: 3, z: 0, color: shirt });
    // Head + hair
    bricks.push({ x: 0, y: 4, z: 0, color: skin });
    bricks.push({ x: 0, y: 5, z: 0, color: hair });
    return { id: "hero", name: "Brick Hero", bricks };
  },

  rock: () => {
    const bricks: BrickModelData["bricks"] = [];
    const c = "#8b909a";
    const d = "#6e737c";
    for (let x = 0; x <= 1; x++) {
      for (let z = 0; z <= 1; z++) {
        bricks.push({ x, y: 0, z, color: c });
      }
    }
    bricks.push({ x: 0, y: 1, z: 0, color: d });
    bricks.push({ x: 1, y: 1, z: 1, color: c });
    return { id: "rock", name: "Rock", bricks };
  },
};

export function loadPreset(name: string): BrickModel {
  const factory = PRESETS[name] ?? PRESETS.empty!;
  return BrickModel.fromJSON(factory());
}
