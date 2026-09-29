import type { CutsceneScript } from "../../engine/cutscene/Cutscene";

/** Mira → Courier errand beat in Harbor City plaza / canal. */
export const harborLetterCutscene: CutsceneScript = {
  id: "harbor_letter",
  skippable: true,
  steps: [
    { type: "letterbox", on: true },
    { type: "fade", mode: "out", duration: 0.5 },
    { type: "camera", x: 12.5, y: 20.5, duration: 1.4, zoom: 1.35 },
    { type: "fade", mode: "in", duration: 0.55 },
    { type: "art", id: "harbor_canal", layout: "right" },
    {
      type: "caption",
      speaker: "Courier",
      text: "You're the one Mira sent? Hand it over — gently.",
      advance: "input",
    },
    { type: "art", id: "harbor_seal", layout: "left" },
    {
      type: "caption",
      speaker: "Mira",
      text: "(memory) The seal holds a name the harbor forgot. Don't read it aloud.",
      advance: "input",
    },
    { type: "camera", x: 21.5, y: 21.5, duration: 1.1, zoom: 1.15 },
    {
      type: "caption",
      speaker: "Courier",
      text: "…Same wax as the old lighthouse ledger. I'll run it north tonight.",
      advance: "input",
    },
    { type: "clearArt" },
    {
      type: "caption",
      speaker: "Narrator",
      text: "The city exhales. Somewhere, a flower stall restocks without applause.",
      advance: "input",
    },
    { type: "fade", mode: "out", duration: 0.45 },
    { type: "letterbox", on: false },
    { type: "fade", mode: "in", duration: 0.5 },
    {
      type: "setFlag",
      flags: { harbor_letter_seen: true, courier_errand: false },
    },
  ],
};
