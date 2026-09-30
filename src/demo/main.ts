import { bootPlayable } from "../play/boot";
import { createIslandScene, createCaveScene } from "./scenes";
import {
  createFirstProcScene,
  procAtmosphere,
  procHudExtra,
} from "../procgen";
import { harborLetterCutscene } from "./cutscenes/harborLetter";
import {
  createHarborCanalPanel,
  createHarborSealPanel,
} from "./cutsceneArt/harborPanels";

bootPlayable({
  scenes: [
    createIslandScene(),
    createCaveScene(),
    createFirstProcScene("island", "from_proc"),
  ],
  startScene: "island",
  startSpawn: "default",
  zoom: 0.95,
  clearColor: "#121c28",
  atmosphere: (id) =>
    procAtmosphere(id) ?? (id === "cave" ? "#0a0e16" : "#121c28"),
  cutscenes: {
    harbor_letter: harborLetterCutscene,
  },
  registerCutsceneArt: (director) => {
    director.registerArt("harbor_seal", createHarborSealPanel);
    director.registerArt("harbor_canal", createHarborCanalPanel);
  },
  hudExtra: (flags, sceneId) => {
    const coin = flags.get("coins") === 1 ? " · 1 coin" : "";
    const flower = flags.get("has_flower") ? " · flower" : "";
    const seal = flags.get("harbor_letter_seen") ? " · seal sent" : "";
    const fish = flags.get("last_fish") ? ` · ${flags.get("last_fish")}` : "";
    const finds = Number(flags.get("proc_finds") ?? 0);
    const proc = procHudExtra(sceneId, finds);
    return coin + flower + seal + fish + proc;
  },
});
