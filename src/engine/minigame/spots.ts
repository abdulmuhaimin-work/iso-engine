import { Entity } from "../world/Entity";
import type { World } from "../world/World";
import type { MiniGameHost } from "./MiniGameHost";

/** Visible post that starts a registered minigame (usually fishing). */
export function addMinigameSpot(
  world: World,
  x: number,
  y: number,
  minigames: MiniGameHost,
  gameId: string,
  options: { name?: string; prompt?: string; color?: string } = {},
): Entity {
  const e = world.add(
    new Entity(
      { x: x + 0.5, y: y + 0.5 },
      { kind: "block", color: options.color ?? "#6b5344", width: 16, height: 24 },
    ),
  );
  e.interactable = {
    prompt: options.prompt ?? "Play",
    name: options.name ?? gameId,
    radius: 1.5,
    onInteract: ({ minigames: host }) => {
      (host ?? minigames).play(gameId);
    },
  };
  e.data.minigame = gameId;
  return e;
}
