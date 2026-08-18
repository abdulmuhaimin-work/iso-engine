import {
  Camera,
  Renderer,
  World,
  TileMap,
  pickTile,
  type Vec2,
} from "../engine";
import {
  createDefaultDocument,
  floodFillTiles,
  fromTileMapData,
  inBounds,
  indexAt,
  nextTileId,
  resizeDocument,
  toTileMapData,
  type EditorDocument,
  type EditorTool,
} from "./state";
import type { TileDef, TileMapData } from "../engine";

const canvas = document.querySelector<HTMLCanvasElement>("#view")!;
const statusEl = document.querySelector("#status")!;
const cursorEl = document.querySelector("#cursor-info")!;
const paletteEl = document.querySelector("#palette")!;
const toolsEl = document.querySelector("#tools")!;
const toolHintEl = document.querySelector("#tool-hint")!;
const tileForm = document.querySelector("#tile-form")!;
const jsonOut = document.querySelector<HTMLTextAreaElement>("#json-out")!;

const camera = new Camera({ zoom: 1.2 });
const renderer = new Renderer(canvas, { clearColor: "#121820", showGrid: true });

let doc: EditorDocument = createDefaultDocument();
let selectedTileId = Number(Object.keys(doc.defs)[0] ?? 1);
let tool: EditorTool = "paint";
let painting = false;
let panning = false;
let lastPan: Vec2 = { x: 0, y: 0 };
let hover: Vec2 | null = null;
let dirtyJson = true;

const TOOLS: Array<{ id: EditorTool; label: string; hint: string }> = [
  { id: "paint", label: "Paint", hint: "LMB paints the selected ground tile." },
  { id: "fill", label: "Fill", hint: "Flood-fill connected tiles of the same id." },
  { id: "overlay", label: "Overlay", hint: "Paint selected tile as overlay (0 clears)." },
  { id: "eraseOverlay", label: "Erase OVL", hint: "Clear overlay on clicked cells." },
  { id: "heightUp", label: "Height +", hint: "Raise terrain height (max 8)." },
  { id: "heightDown", label: "Height −", hint: "Lower terrain height." },
  { id: "eyedropper", label: "Pick", hint: "Sample ground tile under cursor." },
];

function fitCanvas(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  renderer.resize(w, h);
  camera.resize(w, h);
}

function buildWorld(): World {
  return new World(new TileMap(toTileMapData(doc)));
}

function refreshJson(): void {
  if (!dirtyJson) return;
  jsonOut.value = JSON.stringify(toTileMapData(doc), null, 2);
  dirtyJson = false;
}

function markDirty(): void {
  dirtyJson = true;
}

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function pointerToCanvas(e: PointerEvent): Vec2 {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function applyTool(tx: number, ty: number): void {
  if (!inBounds(doc, tx, ty)) return;
  const i = indexAt(doc, tx, ty);

  switch (tool) {
    case "paint":
      doc.tiles[i] = selectedTileId;
      break;
    case "fill":
      floodFillTiles(doc, tx, ty, selectedTileId);
      break;
    case "overlay":
      doc.overlays[i] = selectedTileId;
      break;
    case "eraseOverlay":
      doc.overlays[i] = 0;
      break;
    case "heightUp":
      doc.heights[i] = Math.min(8, (doc.heights[i] ?? 0) + 1);
      break;
    case "heightDown":
      doc.heights[i] = Math.max(0, (doc.heights[i] ?? 0) - 1);
      break;
    case "eyedropper": {
      const id = doc.tiles[i]!;
      if (doc.defs[id]) {
        selectedTileId = id;
        renderPalette();
        showTileForm(id);
      }
      break;
    }
  }
  markDirty();
}

function renderTools(): void {
  toolsEl.replaceChildren();
  for (const t of TOOLS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = t.label;
    btn.className = tool === t.id ? "active" : "";
    btn.addEventListener("click", () => {
      tool = t.id;
      toolHintEl.textContent = t.hint;
      renderTools();
    });
    toolsEl.appendChild(btn);
  }
  toolHintEl.textContent = TOOLS.find((t) => t.id === tool)?.hint ?? "";
}

function renderPalette(): void {
  paletteEl.replaceChildren();
  const defs = Object.values(doc.defs).sort((a, b) => a.id - b.id);
  for (const def of defs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `swatch${def.id === selectedTileId ? " selected" : ""}`;
    btn.innerHTML = `
      <span class="chip" style="background:${def.color}"></span>
      <span class="meta">
        <span>${def.name}</span>
        <small>#${def.id}${def.walkable ? "" : " · blocked"}${def.elevation ? ` · +${def.elevation}` : ""}</small>
      </span>
    `;
    btn.addEventListener("click", () => {
      selectedTileId = def.id;
      renderPalette();
      showTileForm(def.id);
    });
    paletteEl.appendChild(btn);
  }
}

function showTileForm(id: number): void {
  const def = doc.defs[id];
  if (!def) {
    tileForm.classList.add("hidden");
    return;
  }
  tileForm.classList.remove("hidden");
  (document.querySelector("#tile-name") as HTMLInputElement).value = def.name;
  (document.querySelector("#tile-color") as HTMLInputElement).value = normalizeHex(def.color);
  (document.querySelector("#tile-walk") as HTMLInputElement).checked = def.walkable;
  (document.querySelector("#tile-elev") as HTMLInputElement).value = String(def.elevation ?? 0);
}

function normalizeHex(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return "#888888";
}

function applyTileForm(): void {
  const def = doc.defs[selectedTileId];
  if (!def) return;
  def.name = (document.querySelector("#tile-name") as HTMLInputElement).value.trim() || def.name;
  def.color = (document.querySelector("#tile-color") as HTMLInputElement).value;
  def.walkable = (document.querySelector("#tile-walk") as HTMLInputElement).checked;
  const elev = Number((document.querySelector("#tile-elev") as HTMLInputElement).value) || 0;
  def.elevation = elev > 0 ? elev : undefined;
  markDirty();
  renderPalette();
  setStatus(`Updated tile #${def.id}`);
}

function addTile(): void {
  const id = nextTileId(doc.defs);
  const def: TileDef = {
    id,
    name: `tile ${id}`,
    color: "#6a8f7a",
    walkable: true,
  };
  doc.defs[id] = def;
  selectedTileId = id;
  markDirty();
  renderPalette();
  showTileForm(id);
  setStatus(`Added tile #${id}`);
}

function deleteTile(): void {
  const ids = Object.keys(doc.defs).map(Number);
  if (ids.length <= 1) {
    setStatus("Keep at least one tile type");
    return;
  }
  const id = selectedTileId;
  delete doc.defs[id];
  const fallback = Number(Object.keys(doc.defs)[0]);
  for (let i = 0; i < doc.tiles.length; i++) {
    if (doc.tiles[i] === id) doc.tiles[i] = fallback;
    if (doc.overlays[i] === id) doc.overlays[i] = 0;
  }
  selectedTileId = fallback;
  markDirty();
  renderPalette();
  showTileForm(fallback);
  setStatus(`Deleted tile #${id}`);
}

function resizeMap(): void {
  const w = clampInt((document.querySelector("#map-w") as HTMLInputElement).value, 2, 64);
  const h = clampInt((document.querySelector("#map-h") as HTMLInputElement).value, 2, 64);
  doc = resizeDocument(doc, w, h, selectedTileId);
  markDirty();
  camera.lookAt({ x: w / 2, y: h / 2 });
  setStatus(`Resized to ${w}×${h}`);
}

function clampInt(raw: string, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(Number(raw) || min)));
}

function exportData(): TileMapData {
  refreshJson();
  return toTileMapData(doc);
}

function downloadJson(): void {
  const blob = new Blob([JSON.stringify(exportData(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tilemap.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Downloaded tilemap.json");
}

async function copyJson(): Promise<void> {
  refreshJson();
  await navigator.clipboard.writeText(jsonOut.value);
  setStatus("Copied JSON to clipboard");
}

function importJson(text: string): void {
  const data = JSON.parse(text) as TileMapData;
  doc = fromTileMapData(data);
  selectedTileId = Number(Object.keys(doc.defs)[0] ?? 1);
  (document.querySelector("#map-w") as HTMLInputElement).value = String(doc.width);
  (document.querySelector("#map-h") as HTMLInputElement).value = String(doc.height);
  (document.querySelector("#layer-h") as HTMLInputElement).value = String(doc.layerHeight);
  markDirty();
  renderPalette();
  showTileForm(selectedTileId);
  camera.lookAt({ x: doc.width / 2, y: doc.height / 2 });
  setStatus(`Imported ${doc.width}×${doc.height} map`);
}

function frame(): void {
  const nextLayer = clampInt(
    (document.querySelector("#layer-h") as HTMLInputElement).value,
    4,
    48,
  );
  if (nextLayer !== doc.layerHeight) {
    doc.layerHeight = nextLayer;
    markDirty();
  }
  const world = buildWorld();
  renderer.hoverTile = hover;
  renderer.pathTiles = null;
  renderer.render(world, camera, undefined, performance.now() / 1000);
  refreshJson();
  requestAnimationFrame(frame);
}

// Events
window.addEventListener("resize", fitCanvas);

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
    panning = true;
    lastPan = { x: e.clientX, y: e.clientY };
    return;
  }
  if (e.button !== 0) return;
  painting = true;
  const screen = pointerToCanvas(e);
  const tile = pickTile(camera, screen);
  hover = tile;
  applyTool(tile.x, tile.y);
});

canvas.addEventListener("pointermove", (e) => {
  if (panning) {
    const dx = e.clientX - lastPan.x;
    const dy = e.clientY - lastPan.y;
    lastPan = { x: e.clientX, y: e.clientY };
    // Screen drag → approx world pan for 2:1 iso
    const s = 0.02 / camera.zoom;
    camera.panWorld({
      x: (-dx - dy) * s,
      y: (dx - dy) * s,
    });
    return;
  }

  const screen = pointerToCanvas(e);
  const tile = pickTile(camera, screen);
  hover = tile;
  if (inBounds(doc, tile.x, tile.y)) {
    const i = indexAt(doc, tile.x, tile.y);
    cursorEl.textContent = `${tile.x},${tile.y} · id ${doc.tiles[i]} · h${doc.heights[i]} · ov ${doc.overlays[i]}`;
  } else {
    cursorEl.textContent = `${tile.x},${tile.y} · out`;
  }

  if (painting && tool !== "fill" && tool !== "eyedropper") {
    applyTool(tile.x, tile.y);
  }
});

canvas.addEventListener("pointerup", () => {
  painting = false;
  panning = false;
});

canvas.addEventListener("pointercancel", () => {
  painting = false;
  panning = false;
});

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  camera.zoomBy(e.deltaY > 0 ? 0.9 : 1.1);
}, { passive: false });

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

document.querySelector("#btn-resize")!.addEventListener("click", resizeMap);
document.querySelector("#btn-add-tile")!.addEventListener("click", addTile);
document.querySelector("#btn-apply-tile")!.addEventListener("click", applyTileForm);
document.querySelector("#btn-delete-tile")!.addEventListener("click", deleteTile);
document.querySelector("#btn-export")!.addEventListener("click", () => {
  refreshJson();
  setStatus("JSON refreshed");
});
document.querySelector("#btn-copy")!.addEventListener("click", () => {
  void copyJson();
});
document.querySelector("#btn-download")!.addEventListener("click", downloadJson);
document.querySelector<HTMLInputElement>("#file-import")!.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    importJson(await file.text());
  } catch (err) {
    setStatus(`Import failed: ${(err as Error).message}`);
  }
  (e.target as HTMLInputElement).value = "";
});

window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  const map: Record<string, EditorTool> = {
    KeyB: "paint",
    KeyG: "fill",
    KeyO: "overlay",
    KeyX: "eraseOverlay",
    Equal: "heightUp",
    Minus: "heightDown",
    KeyI: "eyedropper",
  };
  const next = map[e.code];
  if (next) {
    tool = next;
    renderTools();
  }
  if (e.code === "Space") {
    e.preventDefault();
    camera.lookAt({ x: doc.width / 2, y: doc.height / 2 });
  }
});

// Boot
(document.querySelector("#map-w") as HTMLInputElement).value = String(doc.width);
(document.querySelector("#map-h") as HTMLInputElement).value = String(doc.height);
renderTools();
renderPalette();
showTileForm(selectedTileId);
fitCanvas();
camera.lookAt({ x: doc.width / 2, y: doc.height / 2 });
setStatus("Paint tiles · Alt-drag or RMB pan · scroll zoom");
requestAnimationFrame(frame);
