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
  clearColor: "#1a1820",
  atmosphere: (id) => {
    if (id === "career") return "#1a1618";
    if (id === "studio") return "#14181c";
    return "#1a1820";
  },
  hudExtra: (flags) => {
    const bits = [
      flags.get("visited_about") ? "about" : null,
      flags.get("visited_experience") ? "xp" : null,
      flags.get("visited_projects") ? "work" : null,
      flags.get("visited_skills") ? "skills" : null,
      flags.get("visited_contact") ? "contact" : null,
    ].filter(Boolean);
    return bits.length ? `  ·  ${PROFILE.name} · ${bits.join(" · ")}` : `  ·  ${PROFILE.name}`;
  },
});
