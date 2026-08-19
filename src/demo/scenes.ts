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

const BUILDING_COLORS = [
  "#b85c4a",
  "#4a6f9a",
  "#6e7580",
  "#3d7a72",
  "#8b6a4a",
  "#7b5ea7",
  "#c45c48",
];

function addBrick(
  world: World,
  x: number,
  y: number,
  preset: keyof typeof PRESETS,
  scale = 0.8,
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

      // Market crate
      const crate = world.add(
        new Entity(
          { x: 10.5, y: 35.5 },
          { kind: "block", color: "#c45c48", width: 18, height: 26 },
        ),
      );
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

      // Extra blocky storefronts / stalls near market
      const stalls: Array<[number, number, number, number, number]> = [
        [9, 34, 16, 20, 22],
        [12, 34, 18, 22, 24],
        [15, 35, 14, 18, 26],
        [11, 36, 20, 24, 28],
      ];
      for (const [x, y, w, h, colorIdx] of stalls) {
        world.add(
          new Entity(
            { x: x + 0.5, y: y + 0.5 },
            {
              kind: "block",
              color: BUILDING_COLORS[colorIdx % BUILDING_COLORS.length],
              width: w,
              height: h,
            },
          ),
        );
      }

      // Scattered city props
      for (const [x, y, color] of [
        [16, 16, "#7b5ea7"],
        [26, 16, "#4a6f9a"],
        [16, 26, "#3d7a72"],
        [27, 27, "#8b6a4a"],
        [8, 22, "#6e7580"],
        [30, 14, "#b85c4a"],
        [14, 30, "#c45c48"],
      ] as const) {
        world.add(
          new Entity(
            { x: x + 0.5, y: y + 0.5 },
            { kind: "block", color, width: 18, height: 28 + (x % 5) },
          ),
        );
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
      world.add(
        new Entity(
          { x: 44.5, y: 9.5 },
          { kind: "block", color: "#2a3340", width: 22, height: 30 },
        ),
      );

      return {
        world,
        spawns: {
          default: { x: 21.5, y: 22.5 },
          from_cave: { x: 43.5, y: 11.5 },
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

      world.add(
        new Entity(
          { x: 7.5, y: 3.5 },
          { kind: "block", color: "#5a6a7a", width: 16, height: 22 },
        ),
      );

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
