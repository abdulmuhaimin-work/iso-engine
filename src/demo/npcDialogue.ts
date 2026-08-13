import type { DialogueScript } from "../engine/dialogue/Dialogue";

/** Branching chat for the demo villager. */
export const miraDialogue: DialogueScript = {
  id: "mira",
  start: "greeting",
  nodes: {
    greeting: {
      id: "greeting",
      speaker: "Mira",
      text: "Oh — a traveler. The plateau path is steep, but the view is worth it.",
      choices: [
        { text: "Any advice for the road?", next: "advice" },
        { text: "Have we met before?", next: "met", requireFlags: { met_mira: true } },
        {
          text: "Just passing through.",
          next: "bye",
        },
      ],
    },
    advice: {
      id: "advice",
      speaker: "Mira",
      text: "Take the dirt ramp on the north-west rise — climbing the cliff face is a bad idea.",
      choices: [
        {
          text: "Thanks. I'll remember that.",
          next: "gift",
          setFlags: { heard_advice: true },
        },
        { text: "I like cliffs, actually.", next: "sassy" },
      ],
    },
    sassy: {
      id: "sassy",
      speaker: "Mira",
      text: "Then I won't watch. Gravity is undefeated.",
      next: "bye",
    },
    gift: {
      id: "gift",
      speaker: "Mira",
      text: "Here — a pressed flower for luck. Don't ask where I got it.",
      setFlags: { has_flower: true, met_mira: true },
      next: "bye",
    },
    met: {
      id: "met",
      speaker: "Mira",
      text: "Of course. You still have that flower? Good.",
      choices: [
        {
          text: "It's my prized possession.",
          next: "bye",
          requireFlags: { has_flower: true },
        },
        {
          text: "I… may have lost it.",
          next: "lost",
          hideIfFlags: { has_flower: true },
        },
        { text: "See you around.", next: "bye" },
      ],
    },
    lost: {
      id: "lost",
      speaker: "Mira",
      text: "Typical. Come back when you've learned pockets exist.",
      choices: [{ text: "Fair.", end: true }],
    },
    bye: {
      id: "bye",
      speaker: "Mira",
      text: "Safe travels. Press E when you're near me if you want to talk again.",
      setFlags: { met_mira: true },
      choices: [{ text: "Goodbye.", end: true }],
    },
  },
};
