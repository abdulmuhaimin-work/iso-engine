import {
  World,
  TileMap,
  Entity,
  BrickModel,
  addMinigameSpot,
  type SceneDefinition,
} from "../engine";
import { createIslandMap, createCaveMap } from "./map";
import { miraDialogue } from "./npcDialogue";
import { PRESETS } from "../builder/presets";

function addBrick(
  world: World,
  x: number,
  y: number,
  preset: keyof typeof PRESETS,
  scale = 0.85,
): Entity {
  const e = world.add(new Entity({ x: x + 0.5, y: y + 0.5 }, { kind: "brick", scale }));
  e.brickModel = BrickModel.fromJSON(PRESETS[preset]!());
  return e;
}

function addNpc(
  world: World,
  x: number,
  y: number,
  color: string,
  name: string,
  lines: string[],
): Entity {
  const npc = world.add(
    new Entity({ x: x + 0.5, y: y + 0.5 }, { kind: "actor", color }),
  );
  npc.interactable = {
    prompt: "Talk",
    name,
    radius: 1.4,
    onInteract: ({ dialogue }) => {
      const nodes: Record<string, { id: string; speaker: string; text: string; next?: string; choices?: Array<{ text: string; end?: boolean; next?: string }> }> = {};
      lines.forEach((text, i) => {
        const id = `n${i}`;
        const next = i < lines.length - 1 ? `n${i + 1}` : undefined;
        nodes[id] = next
          ? { id, speaker: name, text, next }
          : { id, speaker: name, text, choices: [{ text: "Thanks.", end: true }] };
      });
      dialogue.start({ id: name.toLowerCase(), start: "n0", nodes });
    },
  };
  return npc;
}

export function createIslandScene(): SceneDefinition {
  return {
    id: "island",
    name: "Harbor City",
    build: (ctx) => {
      const world = new World(new TileMap(createIslandMap()));

      // Plaza greeter
      const mira = world.add(
        new Entity({ x: 21.5, y: 21.5 }, { kind: "actor", color: "#7ec8e3" }),
      );
      mira.interactable = {
        prompt: "Talk",
        name: "Mira",
        radius: 1.5,
        onInteract: ({ dialogue }) => dialogue.start(miraDialogue),
      };

      // Market crate (dense voxel prop)
      const crate = addBrick(world, 10, 35, "crate", 0.95);
      crate.interactable = {
        prompt: "Inspect",
        name: "Market crate",
        radius: 1.25,
        onInteract: ({ dialogue, flags }) => {
          dialogue.start({
            id: "crate",
            start: "look",
            nodes: {
              look: {
                id: "look",
                speaker: "Crate",
                text: flags.get("crate_looted")
                  ? "Empty. Someone beat you to it."
                  : "A stamped harbor crate. Pry it open?",
                choices: flags.get("crate_looted")
                  ? [{ text: "Leave it.", end: true }]
                  : [
                      { text: "Open it", next: "loot" },
                      { text: "Leave it.", end: true },
                    ],
              },
              loot: {
                id: "loot",
                text: "Inside: a copper coin and a shipping tag to the north caves.",
                setFlags: { crate_looted: true, coins: 1 },
                choices: [{ text: "Pocket the coin.", end: true }],
              },
            },
          });
        },
      };

      // Park trees
      for (const [tx, ty] of [
        [5, 6],
        [6, 9],
        [8, 5],
        [9, 8],
        [10, 6],
        [7, 10],
      ] as const) {
        addBrick(world, tx, ty, "tree", 0.75 + ((tx + ty) % 3) * 0.05);
      }

      // Street trees along avenues
      for (const [tx, ty] of [
        [5, 15],
        [5, 23],
        [5, 31],
        [13, 7],
        [21, 7],
        [29, 7],
        [13, 37],
        [21, 33],
        [29, 33],
        [37, 15],
        [37, 25],
      ] as const) {
        addBrick(world, tx, ty, "tree", 0.7);
      }

      // Plaza / district props
      addBrick(world, 19, 19, "rock", 0.85);
      addBrick(world, 24, 24, "rock", 0.8);

      // Market stalls + storefronts (dense voxel meshes)
      for (const [x, y, scale] of [
        [9, 34, 0.9],
        [12, 34, 0.95],
        [15, 35, 0.88],
        [11, 36, 0.92],
      ] as const) {
        addBrick(world, x, y, "stall", scale);
      }

      // Scattered dense city props (houses / columns / crates)
      const cityProps: Array<[number, number, keyof typeof PRESETS, number]> = [
        [16, 16, "house", 0.72],
        [26, 16, "house", 0.68],
        [16, 26, "column", 0.95],
        [27, 27, "house", 0.7],
        [8, 22, "column", 0.9],
        [30, 14, "crate", 0.85],
        [14, 30, "stall", 0.82],
      ];
      for (const [x, y, preset, scale] of cityProps) {
        addBrick(world, x, y, preset, scale);
      }

      addNpc(world, 12, 20, "#e8b86d", "Courier", [
        "Parcels for the north terrace — watch the canal bridges.",
        "If you see Mira in the plaza, tell her the flower stall restocked.",
      ]);
      addNpc(world, 28, 22, "#d4a0c8", "Vendor", [
        "Fresh bread, cheap maps, questionable advice.",
        "The overlook up northeast has the best sunset in the city.",
      ]);
      addNpc(world, 22, 35, "#9ad0c2", "Dockhand", [
        "Ships come in at dusk. Don't stand on the sand when the tide turns.",
        "If you brought a line, the south beach is biting. Walk to the water and press E.",
      ]);
      if (ctx.minigames) {
        addMinigameSpot(world, 22, 43, ctx.minigames, "fishing", {
          name: "South beach",
          prompt: "Fish",
          color: "#6b5344",
        });
      }
      addNpc(world, 40, 8, "#c4a882", "Guard", [
        "Terrace is clear. Cave mouth is further up — sealed for a reason.",
      ]);

      // Cave mouth on NE terrace
      addBrick(world, 44, 9, "column", 1.1);
      addBrick(world, 45, 9, "rock", 0.9);

      // Endless exploration gate on west edge of the plaza
      const explore = addBrick(world, 17, 21, "house", 0.78);
      explore.interactable = {
        prompt: "Explore",
        name: "Wilderness gate",
        radius: 1.55,
        onInteract: ({ flags }) => {
          flags.set("proc_started", true);
          ctx.manager.change("proc-1", { spawn: "default" });
        },
      };

      return {
        world,
        spawns: {
          default: { x: 21.5, y: 22.5 },
          from_cave: { x: 43.5, y: 11.5 },
          from_proc: { x: 18.5, y: 22.5 },
        },
        portals: [
          {
            tile: { x: 44, y: 9 },
            targetScene: "cave",
            targetSpawn: "entrance",
            mode: "interact",
            prompt: "Enter",
            name: "Cave mouth",
          },
        ],
        onEnter: () => {
          void ctx;
        },
      };
    },
  };
}

export function createCaveScene(): SceneDefinition {
  return {
    id: "cave",
    name: "Cave",
    build: (ctx) => {
      const world = new World(new TileMap(createCaveMap()));

      const hermit = world.add(
        new Entity({ x: 4.5, y: 4.5 }, { kind: "actor", color: "#c4a882" }),
      );
      hermit.interactable = {
        prompt: "Talk",
        name: "Hermit",
        radius: 1.4,
        onInteract: ({ dialogue, flags }) => {
          dialogue.start({
            id: "hermit",
            start: "hi",
            nodes: {
              hi: {
                id: "hi",
                speaker: "Hermit",
                text: flags.get("has_flower")
                  ? "That flower… Mira still hands those out down in the plaza?"
                  : "City noise stops at the stone. Few climb the terrace.",
                choices: [
                  { text: "How do I get back?", next: "exit" },
                  { text: "Sorry to bother you.", end: true },
                ],
              },
              exit: {
                id: "exit",
                speaker: "Hermit",
                text: "South tunnel — the pale stones. Don't mind the drip.",
                choices: [{ text: "Understood.", end: true }],
              },
            },
          });
        },
      };

      addBrick(world, 7, 3, "crystal", 0.95);
      addBrick(world, 8, 4, "rock", 0.8);

      return {
        world,
        spawns: {
          default: { x: 6.5, y: 7.5 },
          entrance: { x: 6.5, y: 7.5 },
        },
        portals: [
          {
            tile: { x: 5, y: 8 },
            targetScene: "island",
            targetSpawn: "from_cave",
            mode: "step",
            name: "Cave exit",
          },
          {
            tile: { x: 6, y: 8 },
            targetScene: "island",
            targetSpawn: "from_cave",
            mode: "step",
            name: "Cave exit",
          },
        ],
        onEnter: () => {
          void ctx;
        },
      };
    },
  };
}
