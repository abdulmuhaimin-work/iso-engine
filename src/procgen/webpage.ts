import type { WebPage } from "../engine";
import { Rng } from "./rng";
import type { SceneTheme } from "./themes";

interface PageBlueprint {
  kind: string;
  /** Fake TLD/path style for the address bar. */
  path: string;
  title: (rng: Rng, theme: SceneTheme, place: string) => string;
  html: (rng: Rng, theme: SceneTheme, place: string, title: string) => string;
}

/** Real pages used for Open ↗ / optional iframe (when embeddable). */
const LIVE_URLS = [
  "https://example.com/",
  "https://example.org/",
  "https://info.cern.ch/",
  "https://en.wikipedia.org/wiki/Special:Random",
  "https://commons.wikimedia.org/wiki/Special:Random",
  "https://www.wikipedia.org/",
  "https://developer.mozilla.org/en-US/",
  "https://news.ycombinator.com/",
  "https://www.bbc.com/news",
  "https://www.nasa.gov/",
  "https://www.nationalgeographic.com/",
  "https://openlibrary.org/",
  "https://archive.org/",
  "https://www.gutenberg.org/",
  "https://apod.nasa.gov/apod/astropix.html",
  "https://www.metmuseum.org/",
  "https://www.smithsonianmag.com/",
  "https://www.space.com/",
  "https://www.atlasobscura.com/",
  "https://www.theguardian.com/international",
] as const;

const DOMAINS = [
  "fieldnotes.local",
  "harbornet.io",
  "waystone.press",
  "reedmap.org",
  "duskindex.com",
  "lantern.wiki",
  "quarry.blog",
  "mirage.market",
  "echo.archive",
  "canopy.guide",
] as const;

const BLUEPRINTS: PageBlueprint[] = [
  {
    kind: "news",
    path: "/news/",
    title: (rng, _t, place) =>
      rng.pick([
        `${place} reports unusual weather overnight`,
        `Travel advisory issued near ${place}`,
        `Locals reopen the old road past ${place}`,
        `Missing courier last seen leaving ${place}`,
      ]),
    html: (rng, theme, place, title) => articlePage(rng, theme, place, title, "Field Dispatch"),
  },
  {
    kind: "blog",
    path: "/journal/",
    title: (rng, _t, place) =>
      rng.pick([
        `Three days walking toward ${place}`,
        `Why I keep returning to ${place}`,
        `Sketches from the edge of ${place}`,
        `A quiet morning in ${place}`,
      ]),
    html: (rng, theme, place, title) => blogPage(rng, theme, place, title),
  },
  {
    kind: "wiki",
    path: "/wiki/",
    title: (rng, theme, place) =>
      rng.pick([
        place,
        `${place} (${theme.nameParts[0]})`,
        `History of ${place}`,
        `${rng.pick(theme.relics)} — ${place}`,
      ]),
    html: (rng, theme, place, title) => wikiPage(rng, theme, place, title),
  },
  {
    kind: "shop",
    path: "/market/",
    title: (rng, theme, place) =>
      rng.pick([
        `${place} supply stall`,
        `${rng.pick(theme.relics)} — for sale`,
        `Tonight's listings near ${place}`,
        `${theme.npcNames[0]}'s Goods`,
      ]),
    html: (rng, theme, place, title) => shopPage(rng, theme, place, title),
  },
  {
    kind: "guide",
    path: "/guide/",
    title: (rng, _t, place) =>
      rng.pick([
        `Visitor notes: ${place}`,
        `How not to get lost in ${place}`,
        `Best overlooks around ${place}`,
        `${place} in one afternoon`,
      ]),
    html: (rng, theme, place, title) => guidePage(rng, theme, place, title),
  },
  {
    kind: "forum",
    path: "/board/",
    title: (rng, _t, place) =>
      rng.pick([
        `Anyone else hear that sound near ${place}?`,
        `Trade: maps of ${place}`,
        `Looking for a guide past ${place}`,
        `PSA: bridge out north of ${place}`,
      ]),
    html: (rng, theme, place, title) => forumPage(rng, theme, place, title),
  },
  {
    kind: "classified",
    path: "/ads/",
    title: (rng, theme, place) =>
      rng.pick([
        `Lost: brass token near ${place}`,
        `Wanted: spare lantern (${place})`,
        `Room to let — ${place}`,
        `Found: ${rng.pick(theme.relics).toLowerCase()}`,
      ]),
    html: (rng, theme, place, title) => classifiedPage(rng, theme, place, title),
  },
  {
    kind: "gallery",
    path: "/gallery/",
    title: (rng, _t, place) =>
      rng.pick([
        `Color studies — ${place}`,
        `Photo plate: dusk at ${place}`,
        `Exhibition: stones of ${place}`,
        `Postcards from ${place}`,
      ]),
    html: (rng, theme, place, title) => galleryPage(rng, theme, place, title),
  },
];

/**
 * Build one stable-but-random webpage for a procedural scene.
 * Same seed + place → same page; different scenes diverge.
 */
export function randomSceneWebpage(
  seed: number,
  theme: SceneTheme,
  placeName: string,
): WebPage {
  const rng = new Rng(Rng.mix(seed, 0x7e6_b5_a1));
  const blueprint = rng.pick(BLUEPRINTS);
  const domain = rng.pick(DOMAINS);
  const title = blueprint.title(rng, theme, placeName);
  const slug = slugify(title).slice(0, 48) || blueprint.kind;
  const live = rng.pick(LIVE_URLS);
  const fakeUrl = `https://${domain}${blueprint.path}${slug}`;

  // ~40% of scenes also try a live iframe; HTML replica always present as fallback.
  const useIframe = rng.chance(0.4);

  return {
    title,
    urlBar: useIframe ? live : fakeUrl,
    html: blueprint.html(rng, theme, placeName, title),
    iframeUrl: useIframe ? live : undefined,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function esc(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function paragraphs(rng: Rng, theme: SceneTheme, place: string, count: number): string {
  const pool = [
    `Travelers say ${place} changes depending on which path you used to arrive.`,
    `The ${theme.nameParts[0]!.toLowerCase()} keeps its own weather, and maps rarely agree.`,
    `Someone left a note under a stone: “north is honest until dusk.”`,
    `Local color runs toward ${theme.palette.ground}, with lantern accents after dark.`,
    `If you find a ${rng.pick(theme.relics).toLowerCase()}, do not move it twice.`,
    `${rng.pick(theme.npcNames)} still answers questions, but only once per visitor.`,
    `Water near here is ${theme.hasWaterBias > 0.5 ? "common" : "scarce"} — plan accordingly.`,
    `A faded sign points onward and then apologizes for pointing.`,
    `The waystone inscription matches no official registry.`,
    `Bring spare cord. The wind here enjoys collecting hats.`,
  ];
  return rng
    .shuffle(pool)
    .slice(0, count)
    .map((p) => `<p class="rp-lead">${esc(p)}</p>`)
    .join("");
}

function shell(inner: string, kicker: string, title: string, accent: string): string {
  return `
    <div class="rp-hero">
      <p class="rp-kicker">${esc(kicker)}</p>
      <h1>${esc(title)}</h1>
      <p class="rp-title" style="color:${accent}">procedural broadcast</p>
    </div>
    ${inner}
  `;
}

function articlePage(rng: Rng, theme: SceneTheme, place: string, title: string, kicker: string): string {
  return shell(
    paragraphs(rng, theme, place, 3) +
      `<h2>At a glance</h2>
       <ul>
         <li>Location: ${esc(place)}</li>
         <li>Reported by: ${esc(rng.pick(theme.npcNames))}</li>
         <li>Status: ${esc(rng.pick(["unverified", "developing", "archived", "urgent"]))}</li>
       </ul>`,
    kicker,
    title,
    theme.palette.flower,
  );
}

function blogPage(rng: Rng, theme: SceneTheme, place: string, title: string): string {
  return shell(
    paragraphs(rng, theme, place, 4) +
      `<h2>Footnotes</h2>
       <p class="rp-lead">Packed: ${esc(rng.pick(["tea", "chalk", "spare socks", "a cracked lens"]))}.
       Mood: ${esc(rng.pick(["hopeful", "damp", "curious", "tired"]))}.
       Next: another gate.</p>`,
    `Journal · ${rng.pick(theme.npcNames)}`,
    title,
    theme.palette.accent,
  );
}

function wikiPage(rng: Rng, theme: SceneTheme, place: string, title: string): string {
  return shell(
    `<p class="rp-lead"><strong>${esc(place)}</strong> is a documented ${esc(theme.nameParts[0]!.toLowerCase())}
       associated with the ${esc(theme.id.replaceAll("_", " "))} pattern.</p>
     ${paragraphs(rng, theme, place, 2)}
     <h2>Notable features</h2>
     <ul>
       ${rng
         .shuffle(theme.relics)
         .slice(0, 3)
         .map((r) => `<li>${esc(r)}</li>`)
         .join("")}
     </ul>
     <h2>See also</h2>
     <p class="rp-lead">${esc(rng.pick(theme.lines))}</p>`,
    "Lantern Wiki",
    title,
    theme.palette.structure,
  );
}

function shopPage(rng: Rng, theme: SceneTheme, place: string, title: string): string {
  const items = rng.shuffle([
    ...theme.relics,
    "Dried fruit tin",
    "Spare flint",
    "Folded map scrap",
    "Blue glass bead",
    "Coil of good rope",
  ]).slice(0, 4);
  return shell(
    `<p class="rp-lead">Stall open near ${esc(place)}. Prices negotiable after dusk.</p>
     <h2>Stock</h2>
     <ul>
       ${items
         .map((item, i) => `<li>${esc(item)} — ${3 + i * 2 + rng.int(0, 4)} coins</li>`)
         .join("")}
     </ul>
     <p class="rp-lead">Vendor: ${esc(rng.pick(theme.npcNames))}</p>`,
    "Mirage Market",
    title,
    theme.palette.flower,
  );
}

function guidePage(rng: Rng, theme: SceneTheme, place: string, title: string): string {
  return shell(
    `<h2>Do</h2>
     <ul>
       <li>Read the waystone before choosing a road.</li>
       <li>Ask ${esc(rng.pick(theme.npcNames))} once — answers expire.</li>
       <li>${esc(rng.pick(theme.lines))}</li>
     </ul>
     <h2>Don't</h2>
     <ul>
       <li>Follow identical footprints in a circle.</li>
       <li>Drink from unmarked wells after dark.</li>
       <li>Argue with a closed gate.</li>
     </ul>
     ${paragraphs(rng, theme, place, 2)}`,
    "Canopy Guide",
    title,
    theme.palette.path,
  );
}

function forumPage(rng: Rng, theme: SceneTheme, place: string, title: string): string {
  const users = rng.shuffle(theme.npcNames.slice()).slice(0, 3);
  const replies = [
    rng.pick(theme.lines),
    `I passed ${place} twice and the shadows disagreed.`,
    `Bring a spare lantern. ${rng.pick(theme.npcNames)} was right.`,
  ];
  return shell(
    `<p class="rp-lead">Thread opened in ${esc(place)} · ${rng.int(2, 48)} replies</p>
     ${users
       .map(
         (u, i) =>
           `<h3>${esc(u)}</h3><p class="rp-lead">${esc(replies[i] ?? rng.pick(theme.lines))}</p>`,
       )
       .join("")}`,
    "Waystone Board",
    title,
    theme.palette.structure,
  );
}

function classifiedPage(rng: Rng, theme: SceneTheme, place: string, title: string): string {
  return shell(
    paragraphs(rng, theme, place, 2) +
      `<h2>Contact</h2>
       <p class="rp-lead">Leave a note at the ${esc(rng.pick(theme.relics).toLowerCase())}.
       Ask for ${esc(rng.pick(theme.npcNames))}. Cash only.</p>`,
    "Reedmap Classifieds",
    title,
    theme.palette.accent,
  );
}

function galleryPage(rng: Rng, theme: SceneTheme, place: string, title: string): string {
  const swatches = [
    theme.palette.ground,
    theme.palette.path,
    theme.palette.water,
    theme.palette.flower,
    theme.palette.structure,
    theme.palette.accent,
  ];
  return shell(
    `<p class="rp-lead">Plates exposed near ${esc(place)}. Colors sampled from the walkable ground.</p>
     <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.6rem;margin:1rem 0 1.25rem">
       ${swatches
         .map(
           (c, i) =>
             `<div style="background:${c};height:72px;border-radius:6px;border:1px solid rgba(0,0,0,0.15)" title="plate ${i + 1}"></div>`,
         )
         .join("")}
     </div>
     ${paragraphs(rng, theme, place, 2)}`,
    "Echo Archive · Gallery",
    title,
    theme.palette.flower,
  );
}
