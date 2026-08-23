import { bootPlayable } from "../play/boot";
import { createIslandScene, createCaveScene } from "./scenes";
import {
  createFirstProcScene,
  procAtmosphere,
  procHudExtra,
} from "../procgen";

bootPlayable({
  scenes: [
    createIslandScene(),
    createCaveScene(),
    createFirstProcScene("island", "from_proc"),
  ],
  startScene: "island",
  startSpawn: "default",
  zoom: 0.95,
  clearColor: "#152028",
  atmosphere: (id) =>
    procAtmosphere(id) ?? (id === "cave" ? "#0c1016" : "#152028"),
  hudExtra: (flags, sceneId) => {
    const coin = flags.get("coins") === 1 ? " · 1 coin" : "";
    const flower = flags.get("has_flower") ? " · flower" : "";
    const fish = flags.get("last_fish") ? ` · ${flags.get("last_fish")}` : "";
    const finds = Number(flags.get("proc_finds") ?? 0);
    const proc = procHudExtra(sceneId, finds);
    return coin + flower + fish + proc;
  },
});
