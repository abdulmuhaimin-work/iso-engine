import {
  Game,
  World,
  TileMap,
  Entity,
  PathFollower,
  pickTile,
} from "./engine";
import { createDemoMap } from "./demo/map";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
const hud = document.querySelector<HTMLDivElement>("#hud");
if (!canvas || !hud) throw new Error("Missing #game or #hud");

const game = new Game({
  canvas,
  camera: { zoom: 1.35 },
  renderer: { clearColor: "#152028", showGrid: true },
});

const world = new World(new TileMap(createDemoMap()));

const player = world.add(
  new Entity(
    { x: 8.5, y: 7.5 },
    { kind: "actor", color: "#e8b86d" },
  ),
);

world.add(
  new Entity(
    { x: 11.5, y: 8.5 },
    { kind: "block", color: "#7b5ea7", width: 20, height: 32 },
  ),
);
world.add(
  new Entity(
    { x: 6.5, y: 5.5 },
    { kind: "block", color: "#c45c48", width: 18, height: 26 },
  ),
);

const mover = new PathFollower({ mode: "cardinal", speed: 3.2 });
game.camera.lookAt(player.position);

game.onUpdate = ({ dt, camera, input }) => {
  const axis = input.moveAxis();
  if (axis.x !== 0 || axis.y !== 0) {
    const panSpeed = (4.5 / camera.zoom) * dt;
    camera.panWorld({
      x: (axis.x + axis.y) * panSpeed,
      y: (-axis.x + axis.y) * panSpeed,
    });
  }

  if (input.wheelDelta !== 0) {
    const factor = input.wheelDelta > 0 ? 0.9 : 1.1;
    camera.zoomBy(factor);
  }

  if (input.justPressed("Space")) {
    camera.lookAt(player.position);
  }

  const hover = pickTile(camera, input.mouse);
  game.renderer.hoverTile = hover;

  if (input.mousePressed) {
    const dest = world.clampWalkable(hover.x, hover.y);
    if (dest) mover.setGoal(world, player, dest);
  }

  mover.update(world, player, dt);
  game.renderer.pathTiles = mover.active ? mover.tiles : null;
};

game.onRender = ({ camera, renderer, assets }) => {
  renderer.render(world, camera, assets);

  const tile = pickTile(camera, game.input.mouse);
  const def = world.map.getDef(tile.x, tile.y);
  const remaining = mover.tiles.length;
  hud.textContent = [
    `tile ${tile.x},${tile.y}${def ? ` · ${def.name}` : ""}`,
    `zoom ${camera.zoom.toFixed(2)}`,
    remaining > 0 ? `path ${remaining} tiles` : "idle",
  ].join("  ·  ");
};

game.start();
