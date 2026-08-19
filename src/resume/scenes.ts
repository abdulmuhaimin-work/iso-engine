import {
  World,
  TileMap,
  Entity,
  BrickModel,
  addMinigameSpot,
  type SceneDefinition,
} from "../engine";
import { PRESETS } from "../builder/presets";
import { PROFILE } from "./profile";
import { resumePage, type ResumeSection } from "./openPage";
import { createLobbyMap, createCareerMap, createStudioMap } from "./map";

function addPage(
  world: World,
  x: number,
  y: number,
  color: string,
  name: string,
  section: ResumeSection,
  flag: string,
  kind: "actor" | "block" = "actor",
): Entity {
  const e = world.add(
    new Entity(
      { x: x + 0.5, y: y + 0.5 },
      kind === "block"
        ? { kind: "block", color, width: 18, height: 26 }
        : { kind: "actor", color },
    ),
  );
  e.interactable = {
    prompt: kind === "block" ? "Read" : "View",
    name,
    radius: 1.45,
    onInteract: ({ webpage, flags }) => {
      flags.set(flag, true);
      webpage?.open(resumePage(section));
    },
  };
  return e;
}

export function createLobbyScene(): SceneDefinition {
  return {
    id: "lobby",
    name: "Campus",
    build: (ctx) => {
      const world = new World(new TileMap(createLobbyMap()));

      addPage(world, 11, 9, "#7ec8e3", "Concierge", "about", "visited_about");

      const tree = world.add(
        new Entity({ x: 3.5, y: 7.5 }, { kind: "brick", scale: 0.75 }),
      );
      tree.brickModel = BrickModel.fromJSON(PRESETS.tree!());
      const tree2 = world.add(
        new Entity({ x: 6.5, y: 11.5 }, { kind: "brick", scale: 0.7 }),
      );
      tree2.brickModel = BrickModel.fromJSON(PRESETS.tree!());

      addPage(world, 4, 11, "#c4a882", "Skills gardener", "skills", "visited_skills");
      addPage(world, 11, 16, "#c9b896", "Mailbox", "contact", "visited_contact", "block");

      if (ctx.minigames) {
        addMinigameSpot(world, 6, 9, ctx.minigames, "fishing", {
          name: "Garden pool",
          prompt: "Fish",
          color: "#5a4636",
        });
      }

      const terminal = world.add(
        new Entity(
          { x: 14.5, y: 10.5 },
          { kind: "block", color: "#2a3344", width: 22, height: 30 },
        ),
      );
      terminal.interactable = {
        prompt: "Open",
        name: "Website kiosk",
        radius: 1.5,
        onInteract: ({ webpage, flags }) => {
          flags.set("visited_about", true);
          webpage?.open(resumePage("site"));
        },
      };

      world.add(
        new Entity(
          { x: 11.5, y: 5.5 },
          { kind: "block", color: "#4a6f9a", width: 20, height: 28 },
        ),
      );
      world.add(
        new Entity(
          { x: 17.5, y: 9.5 },
          { kind: "block", color: "#b85c4a", width: 20, height: 28 },
        ),
      );

      return {
        world,
        spawns: {
          default: { x: 12.5, y: 11.5 },
          from_career: { x: 12.5, y: 6.5 },
          from_studio: { x: 16.5, y: 9.5 },
        },
        portals: [
          {
            tile: { x: 11, y: 5 },
            targetScene: "career",
            targetSpawn: "entrance",
            mode: "interact",
            prompt: "Enter",
            name: "Career Hall",
          },
          {
            tile: { x: 12, y: 5 },
            targetScene: "career",
            targetSpawn: "entrance",
            mode: "interact",
            prompt: "Enter",
            name: "Career Hall",
          },
          {
            tile: { x: 17, y: 9 },
            targetScene: "studio",
            targetSpawn: "entrance",
            mode: "interact",
            prompt: "Enter",
            name: "Project Studio",
          },
          {
            tile: { x: 17, y: 10 },
            targetScene: "studio",
            targetSpawn: "entrance",
            mode: "interact",
            prompt: "Enter",
            name: "Project Studio",
          },
        ],
      };
    },
  };
}

export function createCareerScene(): SceneDefinition {
  return {
    id: "career",
    name: "Career Hall",
    build: () => {
      const world = new World(new TileMap(createCareerMap()));
      const colors = ["#e8b86d", "#7ec8e3", "#d4a0c8", "#9ad0c2"];
      const desks = [
        [3, 4],
        [6, 4],
        [9, 4],
        [12, 4],
      ] as const;

      PROFILE.experience.forEach((job, i) => {
        const pos = desks[i] ?? desks[desks.length - 1]!;
        addPage(
          world,
          pos[0],
          pos[1],
          colors[i % colors.length]!,
          job.company,
          "experience",
          "visited_experience",
        );
      });

      return {
        world,
        spawns: { default: { x: 8.5, y: 9.5 }, entrance: { x: 8.5, y: 9.5 } },
        portals: [
          {
            tile: { x: 7, y: 10 },
            targetScene: "lobby",
            targetSpawn: "from_career",
            mode: "step",
            name: "Exit",
          },
          {
            tile: { x: 8, y: 10 },
            targetScene: "lobby",
            targetSpawn: "from_career",
            mode: "step",
            name: "Exit",
          },
        ],
      };
    },
  };
}

export function createStudioScene(): SceneDefinition {
  return {
    id: "studio",
    name: "Studio",
    build: () => {
      const world = new World(new TileMap(createStudioMap()));
      const colors = ["#4a6f9a", "#3d7a72", "#7b5ea7", "#c45c48"];
      const desks = [
        [4, 5],
        [8, 5],
        [4, 8],
        [8, 8],
      ] as const;

      PROFILE.projects.forEach((project, i) => {
        const pos = desks[i] ?? desks[desks.length - 1]!;
        addPage(
          world,
          pos[0],
          pos[1],
          colors[i % colors.length]!,
          project.name,
          "projects",
          "visited_projects",
          "block",
        );
      });

      return {
        world,
        spawns: { default: { x: 2.5, y: 6.5 }, entrance: { x: 2.5, y: 6.5 } },
        portals: [
          {
            tile: { x: 1, y: 6 },
            targetScene: "lobby",
            targetSpawn: "from_studio",
            mode: "step",
            name: "Exit",
          },
        ],
      };
    },
  };
}
