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
| WASD / arrows | Pan camera |
| Scroll | Zoom |
| Space | Recenter on player |

## Engine layout

```
src/engine/
  Game.ts          # RAF loop, canvas resize, hooks
  Camera.ts        # pan / zoom + world↔screen
  Input.ts         # keyboard + pointer
  Assets.ts        # image loading
  math/Iso.ts      # 2:1 isometric projection
  math/Vec2.ts
  world/TileMap.ts # tile grid + defs
  world/Entity.ts  # positioned sprites
  world/World.ts   # map + entities + moveToward
  path/AStar.ts    # grid A* (cardinal / octile)
  path/PathFollower.ts
  render/Renderer.ts
  index.ts         # public exports
```

Import from the barrel:

```ts
import { Game, World, TileMap, Entity, PathFollower, pickTile } from "./engine";
```

Click-to-move uses **A\*** on walkable tiles (4-way by default). The player steps tile → tile along the shortest grid path. Use `mode: "octile"` for 8-way diagonals.
## Building your game

1. Define tile defs (`walkable`, `color`, optional `elevation`).
2. Create a `TileMap` / `World`, add `Entity` instances.
3. Construct `Game` with your canvas; set `onUpdate` / `onRender`.
4. In `onRender`, call `renderer.render(world, camera, assets)`.
5. Optionally `assets.loadImages({ hero: "/sprites/hero.png" })` and set `sprite.imageKey`.

World positions use **continuous tile coordinates** (e.g. `{ x: 3.5, y: 2.5 }` is the center of tile 3,2). Depth sorting uses `x + y`.

## Projection

Classic 2:1 iso (`DEFAULT_ISO`: half-width 32, half-height 16):

- screen.x = (world.x − world.y) × tileWidth × zoom
- screen.y = (world.x + world.y) × tileHeight × zoom

Camera keeps `position` (world) at the viewport center.
