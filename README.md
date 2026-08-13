# iso-engine

TypeScript + Vite framework for **isometric Canvas 2D** web games.

## Quick start

```bash
npm install
npm run dev
```

Build for production: `npm run build` · preview: `npm run preview`

## Controls (demo)

| Input | Action |
| --- | --- |
| Click tile | Move player |
| E | Interact / enter portals |
| Walk pale stones (cave) | Step portal back to island |
| WASD / arrows | Pan camera |
| Scroll | Zoom |
| Space | Recenter on player (or continue dialogue) |
| Esc | Close dialogue |

## Engine layout

```
src/engine/ …
src/editor/        # tilemap + tile palette editor
src/builder/       # lego-style isometric brick/prop builder
src/demo/ …
builder.html
editor.html
index.html
```

Import from the barrel:

```ts
import {
  Game, World, TileMap, Entity, PathFollower,
  SpriteSheet, SpriteAnimator, pickTile,
  Flags, DialogueRunner, DialogueUI, InteractionSystem,
  SceneManager,
} from "./engine";
```

Click-to-move uses **A\*** on walkable tiles (4-way by default). The player steps tile → tile along the shortest grid path. Use `mode: "octile"` for 8-way diagonals.

## Height map + overlays

Each cell can have an integer **height** and an optional **overlay** tile:

```ts
new TileMap({
  width, height,
  tiles,                 // surface tile ids
  heights,               // 0 = ground, 1+ = terraces
  overlays,              // 0 = none, else tile id on top
  defs,
  layerHeight: 16,       // screen px per height level at zoom 1
});
```

- Renderer stacks prism strata per height level and draws overlays on the surface.
- Entities stand at `map.elevationPx(tx, ty)` and are drawn in iso order with cliffs.
- A* uses `maxClimb` (default 1) and optional `climbCost` so units take ramps, not cliffs.

## Sprite sheets

```ts
const img = assets.get("hero"); // after assets.loadImages({ hero: "/hero.png" })
const sheet = SpriteSheet.fromGrid(img, { frameWidth: 32, frameHeight: 48 });
assets.registerSheet("hero", sheet);

entity.animator = new SpriteAnimator({
  sheet,
  animations: {
    idle: { frames: [0, 1], fps: 4, loop: true },
    walk: { frames: [2, 3, 4, 5], fps: 10, loop: true },
  },
  initial: "idle",
  scale: 1,
});

entity.animator.play("walk");
entity.animator.flipX = true;
entity.animator.update(dt);
```

Frames are drawn foot-anchored (bottom-center). Static frames: set `sprite.sheetKey` + `sprite.frame` without an animator. The demo uses a procedural sheet in `src/demo/heroSheet.ts`.

## Interactions & dialogue

Attach an `interactable` to any entity. `InteractionSystem` finds the nearest target in range (press **E**):

```ts
npc.interactable = {
  prompt: "Talk",
  name: "Mira",
  onInteract: ({ dialogue }) => dialogue.start(miraScript),
};
```

Dialogue is a node graph with optional **choices**, flag gates, and a DOM UI:

```ts
const flags = new Flags();
const dialogue = new DialogueRunner(flags);
new DialogueUI({ root: dialogueRoot, runner: dialogue });

dialogue.start({
  id: "shop",
  start: "hi",
  nodes: {
    hi: {
      id: "hi",
      speaker: "Vendor",
      text: "Need anything?",
      choices: [
        { text: "Buy a potion", next: "buy", setFlags: { potion: true } },
        { text: "Goodbye", end: true },
      ],
    },
    buy: { id: "buy", text: "Pleasure doing business.", choices: [{ text: "Leave", end: true }] },
  },
});
```

`requireFlags` / `hideIfFlags` on choices let conversations branch from prior decisions.

## Brick / prop builder (lego-style)

Open **[/builder.html](http://localhost:5173/builder.html)** (or `npm run builder`):

- Stack isometric cubes like LEGO to build trees, rocks, characters, props
- Edit one height layer at a time (`[` / `]` or the Y slider)
- Presets: Tree, Hero, Rock
- Export **PNG** (sprite) or **JSON** (`BrickModel` data)

Use in-game either way:

```ts
// Live brick model on an entity
const tree = world.add(new Entity({ x: 3.5, y: 9.5 }, { kind: "brick", scale: 0.85 }));
tree.brickModel = BrickModel.fromJSON(myTreeJson);

// Or rasterize in the builder → save under public/ → sprite
await assets.loadImages({ tree: "/props/tree.png" });
entity.sprite = { imageKey: "tree", scale: 1 };
```

## Asset / map editor

Open **[/editor.html](http://localhost:5173/editor.html)** (or `npm run editor`):

- Paint ground tiles, overlays, and height levels on a live isometric preview
- Create / edit tile types (color, walkable, prop elevation)
- Resize map, export / copy / download `TileMapData` JSON, import existing maps
- Shortcuts: `B` paint · `G` fill · `O` overlay · `X` erase overlay · `=`/`-` height · `I` pick · Space recenter  
  Pan with **Alt-drag** or **RMB**; scroll to zoom

Load exported JSON in game code:

```ts
import mapJson from "./maps/island.json";
const world = new World(new TileMap(mapJson));
```

## Scenes / map changes

Register scene definitions, keep one persistent player, and swap worlds with a fade:

```ts
const scenes = new SceneManager({ flags, dialogue, assets, player, fadeElement });
scenes.register({
  id: "cave",
  name: "Cave",
  build: (ctx) => ({
    world: new World(new TileMap(caveData)),
    spawns: { entrance: { x: 3.5, y: 4.5 } },
    portals: [{
      tile: { x: 3, y: 7 },
      targetScene: "island",
      targetSpawn: "from_cave",
      mode: "step", // or "interact" + E
    }],
  }),
});

scenes.enter("island", "default");     // boot, no fade
scenes.change("cave", { spawn: "entrance" }); // fade transition

// each frame:
scenes.update(dt);
scenes.checkStepPortals();
renderer.render(scenes.world, camera, assets);
```

The player entity is detached/re-attached across scenes; flags and dialogue state persist.

## Building your game

1. Define tile defs (`walkable`, `color`, optional prop `elevation`).
2. Create a `TileMap` with `tiles` / optional `heights` + `overlays`.
3. Create a `World`, add `Entity` instances.
4. Construct `Game` with your canvas; set `onUpdate` / `onRender`.
5. In `onRender`, call `renderer.render(world, camera, assets)`.
6. Optionally load sprite sheets and attach `SpriteAnimator`.

World positions use **continuous tile coordinates** (e.g. `{ x: 3.5, y: 2.5 }` is the center of tile 3,2). Depth sorting uses iso order (`x + y`) with height-aware drawing.

## Projection

Classic 2:1 iso (`DEFAULT_ISO`: half-width 32, half-height 16):

- screen.x = (world.x − world.y) × tileWidth × zoom
- screen.y = (world.x + world.y) × tileHeight × zoom

Camera keeps `position` (world) at the viewport center.
