import { Entity } from "../world/Entity";
import type { World } from "../world/World";
import { BrickModel } from "../render/BrickModel";
import { PRESETS } from "../../builder/presets";
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
    new Entity({ x: x + 0.5, y: y + 0.5 }, { kind: "brick", scale: 0.85 }),
  );
  e.brickModel = BrickModel.fromJSON(PRESETS.crate!());
  void options.color;
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
