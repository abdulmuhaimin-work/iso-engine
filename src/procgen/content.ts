import {
  World,
  Entity,
  BrickModel,
  addMinigameSpot,
  type SceneContext,
  type Vec2,
} from "../engine";
import { PRESETS } from "../builder/presets";
import { Rng } from "./rng";
import type { LayoutResult } from "./layout";
import type { SceneTheme } from "./themes";
import { randomSceneWebpage } from "./webpage";

export interface ContentOptions {
  theme: SceneTheme;
  seed: number;
  layout: LayoutResult;
  sceneId: string;
  /** Display name used for flavor text / random webpage. */
  placeName: string;
  /** When true, add a fishing post on shore if water exists. */
  allowFishing?: boolean;
}

export function populateScene(world: World, ctx: SceneContext, options: ContentOptions): void {
  const rng = new Rng(Rng.mix(options.seed, 0xc0ffee));
  const { theme, layout } = options;
  const open = rng.shuffle(layout.openCells.slice());
  const take = (): Vec2 | null => open.pop() ?? null;

  // Props
  const propCount = rng.int(6, 14);
  for (let i = 0; i < propCount; i++) {
    const cell = take();
    if (!cell) break;
    if (isNear(cell, layout.entrance, 3) || isNear(cell, layout.exit, 3)) continue;
    placeProp(world, cell, theme, rng);
  }

  // NPCs with theme dialogue
  const npcCount = rng.int(1, 3);
  for (let i = 0; i < npcCount; i++) {
    const cell = take();
    if (!cell) break;
    const name = rng.pick(theme.npcNames);
    const lines = rng.shuffle(theme.lines.slice()).slice(0, rng.int(1, 3));
    addNpc(world, cell.x, cell.y, theme.palette.structure, name, lines, options.sceneId);
  }

  // Interactable relics
  const relicCount = rng.int(1, 3);
  for (let i = 0; i < relicCount; i++) {
    const cell = take();
    if (!cell) break;
    const relic = rng.pick(theme.relics);
    addRelic(world, cell.x, cell.y, relic, theme, options.sceneId, rng);
  }

  // Fishing spot near water
  if (options.allowFishing !== false && ctx.minigames && layout.shoreCells.length > 0) {
    const shore = rng.pick(layout.shoreCells);
    addMinigameSpot(world, shore.x, shore.y, ctx.minigames, "fishing", {
      name: `${theme.nameParts[0]} shore`,
      prompt: "Fish",
      color: theme.palette.accent,
    });
  }

  // Landmark block near center of open space
  const landmark = take();
  if (landmark) {
    addLandmark(world, landmark.x, landmark.y, theme, options.sceneId);
  }

  // One random webpage terminal per scene (seeded → unique per place).
  const terminalCell = take();
  if (terminalCell && ctx.webpage) {
    addWebpageTerminal(
      world,
      terminalCell.x,
      terminalCell.y,
      theme,
      options.seed,
      options.placeName,
    );
  }
}

function placeProp(world: World, cell: Vec2, theme: SceneTheme, rng: Rng): void {
  const style = theme.props;
  let preset: keyof typeof PRESETS = "rock";
  if (style === "trees") preset = "tree";
  else if (style === "rocks") preset = "rock";
  else if (style === "mixed") preset = rng.chance(0.55) ? "tree" : "rock";
  else if (style === "ruins" || style === "stalls" || style === "crystals") {
    // Use colored blocks for stalls/ruins/crystals.
    const colors =
      style === "crystals"
        ? [theme.palette.flower, theme.palette.structure, "#c4a0e8"]
        : style === "stalls"
          ? [theme.palette.structure, theme.palette.flower, theme.palette.accent]
          : [theme.palette.wall, theme.palette.structure, theme.palette.path];
    world.add(
      new Entity(
        { x: cell.x + 0.5, y: cell.y + 0.5 },
        {
          kind: "block",
          color: rng.pick(colors),
          width: rng.int(14, 20),
          height: rng.int(22, 32),
        },
      ),
    );
    return;
  }

  const e = world.add(
    new Entity({ x: cell.x + 0.5, y: cell.y + 0.5 }, { kind: "brick", scale: rng.float(0.65, 0.9) }),
  );
  e.brickModel = BrickModel.fromJSON(PRESETS[preset]!());
}

function addNpc(
  world: World,
  x: number,
  y: number,
  color: string,
  name: string,
  lines: string[],
  sceneId: string,
): void {
  const npc = world.add(
    new Entity({ x: x + 0.5, y: y + 0.5 }, { kind: "actor", color }),
  );
  npc.interactable = {
    prompt: "Talk",
    name,
    radius: 1.4,
    onInteract: ({ dialogue, flags }) => {
      flags.set(`met_${sceneId}_${name}`, true);
      const nodes: Record<
        string,
        {
          id: string;
          speaker: string;
          text: string;
          next?: string;
          choices?: Array<{ text: string; end?: boolean }>;
        }
      > = {};
      lines.forEach((text, i) => {
        const id = `n${i}`;
        const next = i < lines.length - 1 ? `n${i + 1}` : undefined;
        nodes[id] = next
          ? { id, speaker: name, text, next }
          : { id, speaker: name, text, choices: [{ text: "Thanks.", end: true }] };
      });
      dialogue.start({ id: `${sceneId}_${name}`, start: "n0", nodes });
    },
  };
}

function addRelic(
  world: World,
  x: number,
  y: number,
  name: string,
  theme: SceneTheme,
  sceneId: string,
  rng: Rng,
): void {
  const e = world.add(
    new Entity(
      { x: x + 0.5, y: y + 0.5 },
      { kind: "block", color: theme.palette.flower, width: 16, height: 22 },
    ),
  );
  const flag = `relic_${sceneId}_${x}_${y}`;
  const reward = rng.pick(["a pressed leaf", "a brass token", "a scrap of chart", "a smooth pebble"]);
  e.interactable = {
    prompt: "Inspect",
    name,
    radius: 1.3,
    onInteract: ({ dialogue, flags }) => {
      if (flags.get(flag)) {
        dialogue.start({
          id: flag,
          start: "done",
          nodes: {
            done: {
              id: "done",
              speaker: name,
              text: "Nothing new here.",
              choices: [{ text: "Okay.", end: true }],
            },
          },
        });
        return;
      }
      flags.set(flag, true);
      const found = Number(flags.get("proc_finds") ?? 0) + 1;
      flags.set("proc_finds", found);
      dialogue.start({
        id: flag,
        start: "look",
        nodes: {
          look: {
            id: "look",
            speaker: name,
            text: `You find ${reward}. (${found} discoveries)`,
            choices: [{ text: "Take it.", end: true }],
          },
        },
      });
    },
  };
}

function addLandmark(world: World, x: number, y: number, theme: SceneTheme, sceneId: string): void {
  const e = world.add(
    new Entity(
      { x: x + 0.5, y: y + 0.5 },
      { kind: "block", color: theme.palette.structure, width: 22, height: 34 },
    ),
  );
  e.interactable = {
    prompt: "Read",
    name: "Waystone",
    radius: 1.45,
    onInteract: ({ dialogue, flags }) => {
      flags.set("last_waystone", sceneId);
      dialogue.start({
        id: `waystone_${sceneId}`,
        start: "a",
        nodes: {
          a: {
            id: "a",
            speaker: "Waystone",
            text: `This marker names the place: a ${theme.nameParts[0]!.toLowerCase()} of the ${theme.id.replaceAll("_", " ")}.`,
            next: "b",
          },
          b: {
            id: "b",
            speaker: "Waystone",
            text: "The north path leads onward. The south path remembers where you came from.",
            choices: [{ text: "Noted.", end: true }],
          },
        },
      });
    },
  };
}

function addWebpageTerminal(
  world: World,
  x: number,
  y: number,
  theme: SceneTheme,
  seed: number,
  placeName: string,
): void {
  const page = randomSceneWebpage(seed, theme, placeName);
  const labels = ["Signal kiosk", "Relay terminal", "Archive booth", "Public board", "Net shrine"];
  const rng = new Rng(Rng.mix(seed, 0x51_6e_a1));
  const label = rng.pick(labels);
  const e = world.add(
    new Entity(
      { x: x + 0.5, y: y + 0.5 },
      { kind: "block", color: "#2a3344", width: 20, height: 30 },
    ),
  );
  e.interactable = {
    prompt: "Browse",
    name: label,
    radius: 1.5,
    onInteract: ({ webpage, flags }) => {
      flags.set("proc_webpage", page.title);
      webpage?.open(page);
    },
  };
}

function isNear(a: Vec2, b: Vec2, r: number): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= r;
}
