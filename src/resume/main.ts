import { bootPlayable } from "../play/boot";
import {
  createLobbyScene,
  createCareerScene,
  createStudioScene,
} from "./scenes";
import { PROFILE } from "./profile";

bootPlayable({
  scenes: [createLobbyScene(), createCareerScene(), createStudioScene()],
  startScene: "lobby",
  startSpawn: "default",
  zoom: 1.2,
  clearColor: "#141820",
  atmosphere: (id) => {
    if (id === "career") return "#161218";
    if (id === "studio") return "#10161c";
    return "#141820";
  },
  hudExtra: (flags) => {
    const bits = [
      flags.get("visited_about") ? "about" : null,
      flags.get("visited_experience") ? "xp" : null,
      flags.get("visited_projects") ? "work" : null,
      flags.get("visited_skills") ? "skills" : null,
      flags.get("visited_contact") ? "contact" : null,
    ].filter(Boolean);
    const fish = flags.get("last_fish");
    const fishBit = fish ? ` · ${fish}` : "";
    return bits.length
      ? `  ·  ${PROFILE.name} · ${bits.join(" · ")}${fishBit}`
      : `  ·  ${PROFILE.name}${fishBit}`;
  },
});
