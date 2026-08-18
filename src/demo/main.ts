import { bootPlayable } from "../play/boot";
import { createIslandScene, createCaveScene } from "./scenes";

bootPlayable({
  scenes: [createIslandScene(), createCaveScene()],
  startScene: "island",
  startSpawn: "default",
  zoom: 0.95,
  clearColor: "#152028",
  atmosphere: (id) => (id === "cave" ? "#0c1016" : "#152028"),
  hudExtra: (flags) => {
    const coin = flags.get("coins") === 1 ? " · 1 coin" : "";
    const flower = flags.get("has_flower") ? " · flower" : "";
    return coin + flower;
  },
});
