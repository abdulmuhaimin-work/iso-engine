import {
  World,
  TileMap,
  Entity,
  type SceneDefinition,
  type SceneManager,
  type Portal,
} from "../engine";
import { Rng } from "./rng";
import { generateLayout } from "./layout";
import { populateScene } from "./content";
import { pickTheme, placeName, type SceneTheme } from "./themes";

export interface ProcSceneLink {
  previousId?: string;
  previousSpawn?: string;
  depth: number;
  seed: number;
  themeId: string;
}

/** Atmosphere clear colors for registered procedural scenes. */
const atmospheres = new Map<string, string>();
/** Display metadata for HUD. */
const meta = new Map<string, { name: string; depth: number; themeId: string }>();

export function procAtmosphere(sceneId: string | null): string | undefined {
  if (!sceneId) return undefined;
  return atmospheres.get(sceneId);
}

export function procHudExtra(sceneId: string | null, finds: number): string {
  if (!sceneId || !meta.has(sceneId)) {
    return finds ? ` · finds ${finds}` : "";
  }
  const m = meta.get(sceneId)!;
  return ` · ${m.name} · depth ${m.depth}${finds ? ` · finds ${finds}` : ""}`;
}

export function createProceduralScene(options: {
  id: string;
  seed: number;
  depth: number;
  theme?: SceneTheme;
  previousId?: string;
  previousSpawn?: string;
  /** Avoid repeating the previous theme when picking randomly. */
  avoidThemeId?: string;
}): SceneDefinition {
  const rng = new Rng(options.seed);
  const theme = options.theme ?? pickTheme(rng, options.avoidThemeId);
  const name = placeName(theme, rng);
  atmospheres.set(options.id, theme.atmosphere);
  meta.set(options.id, { name, depth: options.depth, themeId: theme.id });

  return {
    id: options.id,
    name,
    build: (ctx) => {
      const layout = generateLayout(theme, options.seed);
      const world = new World(new TileMap(layout.map));

      populateScene(world, ctx, {
        theme,
        seed: options.seed,
        layout,
        sceneId: options.id,
        placeName: name,
      });

      // Exit marker (north) — advances to a new procedural scene.
      const exitGate = world.add(
        new Entity(
          { x: layout.exit.x + 0.5, y: layout.exit.y + 0.5 },
          { kind: "block", color: theme.palette.flower, width: 18, height: 28 },
        ),
      );
      exitGate.interactable = {
        prompt: "Continue",
        name: "Path onward",
        radius: 1.5,
        onInteract: ({ flags }) => {
          const nextId = ensureNextScene(ctx.manager, {
            fromId: options.id,
            fromSpawn: "from_next",
            depth: options.depth + 1,
            parentSeed: options.seed,
            avoidThemeId: theme.id,
          });
          flags.set("proc_depth", options.depth + 1);
          flags.set("proc_last_theme", theme.id);
          ctx.manager.change(nextId, { spawn: "default" });
        },
      };

      const portals: Portal[] = [];
      if (options.previousId) {
        portals.push({
          tile: { x: layout.entrance.x, y: layout.entrance.y },
          targetScene: options.previousId,
          targetSpawn: options.previousSpawn ?? "from_proc",
          mode: "step",
          name: "Return",
          radius: 0.7,
        });
        // Visible return marker
        world.add(
          new Entity(
            { x: layout.entrance.x + 0.5, y: layout.entrance.y + 0.5 },
            { kind: "diamond", color: "#ffe08a" },
          ),
        );
      }

      return {
        world,
        spawns: {
          default: layout.spawnDefault,
          from_next: layout.spawnFromNext,
          entrance: layout.spawnDefault,
        },
        portals,
        onEnter: () => {
          ctx.flags.set("proc_current", options.id);
          ctx.flags.set("proc_depth", options.depth);
          ctx.flags.set("proc_theme", theme.id);
        },
      };
    },
  };
}

/**
 * Register (if needed) and return the id of the next procedural scene
 * linked from `fromId`.
 */
export function ensureNextScene(
  manager: SceneManager,
  options: {
    fromId: string;
    fromSpawn: string;
    depth: number;
    parentSeed: number;
    avoidThemeId?: string;
  },
): string {
  const nextId = `proc-${options.depth}-${(options.parentSeed >>> 0).toString(16)}`;
  if (!manager.has(nextId)) {
    const seed = Rng.mix(options.parentSeed, options.depth * 0x9e3779b9);
    manager.register(
      createProceduralScene({
        id: nextId,
        seed,
        depth: options.depth,
        previousId: options.fromId,
        previousSpawn: options.fromSpawn,
        avoidThemeId: options.avoidThemeId,
      }),
    );
  }
  return nextId;
}

/** First procedural scene reachable from a hand-authored hub. */
export function createFirstProcScene(hubId: string, hubSpawn = "from_proc"): SceneDefinition {
  // Fresh run seed each page load; deeper scenes stay deterministic from this root.
  const seed = (Date.now() ^ ((Math.random() * 0xffffffff) >>> 0)) >>> 0;
  return createProceduralScene({
    id: "proc-1",
    seed,
    depth: 1,
    previousId: hubId,
    previousSpawn: hubSpawn,
  });
}

export function registerProcBootstrap(manager: SceneManager, hubId: string): void {
  if (!manager.has("proc-1")) {
    manager.register(createFirstProcScene(hubId));
  }
}
