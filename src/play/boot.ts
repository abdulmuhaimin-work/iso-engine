import {
  Game,
  Entity,
  PathFollower,
  SpriteAnimator,
  Flags,
  DialogueRunner,
  DialogueUI,
  WebPageViewer,
  InteractionSystem,
  SceneManager,
  pickTile,
  type SceneDefinition,
} from "../engine";
import { createDemoHeroSheet } from "../demo/heroSheet";

export interface PlayableOptions {
  scenes: SceneDefinition[];
  startScene: string;
  startSpawn?: string;
  zoom?: number;
  clearColor?: string;
  atmosphere?: (sceneId: string | null) => string;
  hudExtra?: (flags: Flags) => string;
}

/**
 * Shared click-to-move / interact / scene loop used by resume + demo.
 */
export function bootPlayable(options: PlayableOptions): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#game");
  const hud = document.querySelector<HTMLDivElement>("#hud");
  const promptEl = document.querySelector<HTMLDivElement>("#prompt");
  const dialogueRoot = document.querySelector<HTMLElement>("#dialogue-root");
  const fadeEl = document.querySelector<HTMLElement>("#fade");
  const webpageRoot = document.querySelector<HTMLElement>("#webpage-root");
  if (!canvas || !hud || !promptEl || !dialogueRoot || !fadeEl) {
    throw new Error("Missing required DOM nodes");
  }

  const webpage = webpageRoot
    ? new WebPageViewer({ root: webpageRoot })
    : undefined;

  const clearColor = options.clearColor ?? "#152028";
  const game = new Game({
    canvas,
    camera: { zoom: options.zoom ?? 1.1 },
    renderer: { clearColor, showGrid: true },
  });

  const flags = new Flags();
  const dialogue = new DialogueRunner(flags);
  new DialogueUI({ root: dialogueRoot, runner: dialogue });

  const heroArt = createDemoHeroSheet();
  game.assets.registerSheet("hero", heroArt.sheet);

  const player = new Entity({ x: 8.5, y: 7.5 }, { kind: "sheet", scale: 1.15 });
  player.animator = new SpriteAnimator({
    sheet: heroArt.sheet,
    animations: heroArt.animations,
    initial: "idle",
    scale: 1.15,
  });

  const scenes = new SceneManager({
    flags,
    dialogue,
    assets: game.assets,
    player,
    webpage,
    fadeElement: fadeEl,
  });
  scenes.registerAll(options.scenes);
  scenes.enter(options.startScene, options.startSpawn ?? "default");

  const interactions = new InteractionSystem({
    world: scenes.world,
    flags,
    dialogue,
    webpage,
  });
  const mover = new PathFollower({ mode: "cardinal", speed: 3.2, maxClimb: 1 });
  game.camera.lookAt(player.position);

  function applySceneAtmosphere(): void {
    interactions.world = scenes.world;
    game.renderer.clearColor =
      options.atmosphere?.(scenes.sceneId) ?? clearColor;
    game.camera.lookAt(player.position);
    mover.clear();
    game.renderer.pathTiles = null;
  }

  applySceneAtmosphere();
  let lastSceneId = scenes.sceneId;

  function syncHeroAnim(moving: boolean, dx: number, dy: number): void {
    const anim = player.animator;
    if (!anim) return;

    if (Math.abs(dx) + Math.abs(dy) > 0.001) {
      const facingNorth = dy < -0.01 || (Math.abs(dy) < 0.01 && dx < 0);
      anim.flipX = dx < -0.01;
      anim.play(
        moving ? (facingNorth ? "walk_n" : "walk") : facingNorth ? "idle_n" : "idle",
      );
    } else {
      const north = anim.current.endsWith("_n");
      anim.play(moving ? (north ? "walk_n" : "walk") : north ? "idle_n" : "idle");
    }
  }

  game.onUpdate = ({ dt, camera, input }) => {
    scenes.update(dt);
    if (scenes.sceneId !== lastSceneId) {
      lastSceneId = scenes.sceneId;
      applySceneAtmosphere();
    }

    if (scenes.transitioning) {
      mover.clear();
      syncHeroAnim(false, 0, 0);
      player.animator?.update(dt);
      game.renderer.pathTiles = null;
      game.renderer.hoverTile = null;
      promptEl.classList.add("hidden");
      interactions.focus = null;
      return;
    }

    if (dialogue.active || webpage?.active) {
      if (input.justPressed("Space") || input.justPressed("Enter")) {
        if (dialogue.active) {
          const node = dialogue.currentNode;
          if (node && dialogue.visibleChoices(node).length === 0) {
            dialogue.continue();
          }
        }
      }
      if (input.justPressed("Escape")) {
        if (webpage?.active) webpage.close();
        else dialogue.end();
      }
      mover.clear();
      syncHeroAnim(false, 0, 0);
      player.animator?.update(dt);
      game.renderer.pathTiles = null;
      game.renderer.hoverTile = null;
      promptEl.classList.add("hidden");
      interactions.focus = null;
      return;
    }

    const world = scenes.world;
    const axis = input.moveAxis();
    if (axis.x !== 0 || axis.y !== 0) {
      const panSpeed = (4.5 / camera.zoom) * dt;
      camera.panWorld({
        x: (axis.x + axis.y) * panSpeed,
        y: (-axis.x + axis.y) * panSpeed,
      });
    }

    if (input.wheelDelta !== 0) {
      camera.zoomBy(input.wheelDelta > 0 ? 0.9 : 1.1);
    }

    if (input.justPressed("Space")) camera.lookAt(player.position);

    const hover = pickTile(camera, input.mouse);
    game.renderer.hoverTile = hover;

    if (input.mousePressed) {
      const dest = world.clampWalkable(hover.x, hover.y);
      if (dest) mover.setGoal(world, player, dest);
    }

    if (input.justPressed("KeyE")) interactions.tryInteract(player);

    const prev = { x: player.position.x, y: player.position.y };
    mover.update(world, player, dt);
    syncHeroAnim(mover.active, player.position.x - prev.x, player.position.y - prev.y);

    scenes.checkStepPortals();
    interactions.update(player);
    const prompt = interactions.promptText();
    if (prompt) {
      promptEl.textContent = prompt;
      promptEl.classList.remove("hidden");
    } else {
      promptEl.classList.add("hidden");
    }

    player.animator?.update(dt);
    game.renderer.pathTiles = mover.active ? mover.tiles : null;
  };

  game.onRender = ({ camera, renderer, assets, elapsed }) => {
    const world = scenes.world;
    renderer.render(world, camera, assets, elapsed);

    const tile = pickTile(camera, game.input.mouse);
    const def = world.map.getDef(tile.x, tile.y);
    const remaining = mover.tiles.length;
    const extra = options.hudExtra?.(flags) ?? "";
    const status = scenes.transitioning
      ? "traveling"
      : dialogue.active || webpage?.active
        ? "reading"
        : remaining > 0
          ? `path ${remaining}`
          : "idle";
    hud.textContent =
      [
        scenes.sceneName ?? "?",
        renderer.backend,
        `tile ${tile.x},${tile.y}${def ? ` · ${def.name}` : ""}`,
        status,
      ].join("  ·  ") + extra;
  };

  game.start();
}
