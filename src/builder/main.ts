import { brickToScreen } from "../engine/render/BrickModel";
import { BrickRenderer } from "../engine/render/BrickRenderer";
import { loadPreset } from "./presets";

const canvas = document.querySelector<HTMLCanvasElement>("#view")!;
const ctx = canvas.getContext("2d")!;
const statusEl = document.querySelector("#status")!;
const cursorEl = document.querySelector("#cursor-info")!;
const statsEl = document.querySelector("#stats")!;
const jsonOut = document.querySelector<HTMLTextAreaElement>("#json-out")!;
const layerYInput = document.querySelector<HTMLInputElement>("#layer-y")!;
const layerYVal = document.querySelector("#layer-y-val")!;
const colorInput = document.querySelector<HTMLInputElement>("#color")!;
const nameInput = document.querySelector<HTMLInputElement>("#model-name")!;
const idInput = document.querySelector<HTMLInputElement>("#model-id")!;

const renderer = new BrickRenderer();
let model = loadPreset("tree");
nameInput.value = model.name;
idInput.value = model.id;

let mode: "place" | "erase" = "place";
let layerY = 0;
let scale = 1.6;
let origin = { x: 0, y: 0 };
let panning = false;
let lastPan = { x: 0, y: 0 };
let painting = false;
let hover: { x: number; z: number } | null = null;
let dirtyJson = true;

const SWATCHES = [
  "#3f8f4a",
  "#2f6f3a",
  "#8b5a2b",
  "#e8b86d",
  "#f3d7a8",
  "#3d5a4c",
  "#8b909a",
  "#c45c48",
  "#7ec8e3",
  "#ffe08a",
  "#7b5ea7",
  "#d4a0c8",
];

function fitCanvas(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  origin = { x: w / 2, y: h * 0.62 };
}

function syncMeta(): void {
  model.name = nameInput.value.trim() || model.name;
  model.id = idInput.value.trim() || model.id;
}

function refreshJson(): void {
  if (!dirtyJson) return;
  syncMeta();
  jsonOut.value = JSON.stringify(model.toJSON(), null, 2);
  statsEl.textContent = `${model.count} bricks`;
  dirtyJson = false;
}

function markDirty(): void {
  dirtyJson = true;
}

function pointer(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

/** Pick grid x,z on the current Y layer from a canvas point. */
function pickCell(screenX: number, screenY: number): { x: number; z: number } {
  const m = {
    tileWidth: model.metrics.tileWidth * scale,
    tileHeight: model.metrics.tileHeight * scale,
    brickHeight: model.metrics.brickHeight * scale,
  };
  const sx = screenX - origin.x;
  const sy = screenY - origin.y + layerY * m.brickHeight;
  const x = (sx / m.tileWidth + sy / m.tileHeight) / 2;
  const z = (sy / m.tileHeight - sx / m.tileWidth) / 2;
  return { x: Math.round(x), z: Math.round(z) };
}

function clampCell(x: number, z: number): boolean {
  return x >= -8 && x <= 8 && z >= -8 && z <= 8;
}

function applyAt(x: number, z: number): void {
  if (!clampCell(x, z)) return;
  if (mode === "erase") {
    model.removeBrick(x, layerY, z);
  } else {
    model.setBrick(x, layerY, z, colorInput.value);
  }
  markDirty();
}

function setMode(next: "place" | "erase"): void {
  mode = next;
  document.querySelector("#btn-place")!.classList.toggle("active", mode === "place");
  document.querySelector("#btn-erase")!.classList.toggle("active", mode === "erase");
}

function renderSwatches(): void {
  const root = document.querySelector("#swatches")!;
  root.replaceChildren();
  for (const c of SWATCHES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.background = c;
    btn.title = c;
    btn.addEventListener("click", () => {
      colorInput.value = c;
    });
    root.appendChild(btn);
  }
}

async function downloadPng(): Promise<void> {
  syncMeta();
  const blob = await renderer.toPngBlob(model, { scale: 3, padding: 12 });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${model.id || "brick"}.png`;
  a.click();
  URL.revokeObjectURL(url);
  statusEl.textContent = `Downloaded ${model.id}.png`;
}

function downloadJson(): void {
  syncMeta();
  refreshJson();
  const blob = new Blob([jsonOut.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${model.id || "brick"}.json`;
  a.click();
  URL.revokeObjectURL(url);
  statusEl.textContent = `Downloaded ${model.id}.json`;
}

async function copyJson(): Promise<void> {
  syncMeta();
  refreshJson();
  await navigator.clipboard.writeText(jsonOut.value);
  statusEl.textContent = "Copied brick JSON";
}

function drawLayerGuide(): void {
  // Soft diamonds on the active height layer for aiming
  const m = {
    tileWidth: model.metrics.tileWidth * scale,
    tileHeight: model.metrics.tileHeight * scale,
    brickHeight: model.metrics.brickHeight * scale,
  };
  ctx.save();
  ctx.globalAlpha = 0.18;
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      const p = brickToScreen(x, layerY, z, m);
      const cx = origin.x + p.x;
      const cy = origin.y + p.y;
      ctx.beginPath();
      ctx.moveTo(cx, cy - m.tileHeight);
      ctx.lineTo(cx + m.tileWidth, cy);
      ctx.lineTo(cx, cy + m.tileHeight);
      ctx.lineTo(cx - m.tileWidth, cy);
      ctx.closePath();
      ctx.strokeStyle = "#ffe08a";
      ctx.stroke();
    }
  }
  ctx.restore();
}

function frame(): void {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  drawLayerGuide();

  const ghost =
    hover && clampCell(hover.x, hover.z)
      ? {
          x: hover.x,
          y: layerY,
          z: hover.z,
          color: mode === "erase" ? "#ff6666" : colorInput.value,
        }
      : null;

  renderer.draw(ctx, model, {
    originX: origin.x,
    originY: origin.y,
    scale,
    ground: true,
    ghost,
  });

  refreshJson();
  requestAnimationFrame(frame);
}

// UI
renderSwatches();
layerYInput.addEventListener("input", () => {
  layerY = Number(layerYInput.value) | 0;
  layerYVal.textContent = String(layerY);
});
document.querySelector("#btn-place")!.addEventListener("click", () => setMode("place"));
document.querySelector("#btn-erase")!.addEventListener("click", () => setMode("erase"));
document.querySelector("#btn-clear")!.addEventListener("click", () => {
  model.clear();
  markDirty();
  statusEl.textContent = "Cleared";
});
document.querySelector("#btn-load-preset")!.addEventListener("click", () => {
  const name = (document.querySelector("#preset") as HTMLSelectElement).value;
  model = loadPreset(name);
  nameInput.value = model.name;
  idInput.value = model.id;
  markDirty();
  statusEl.textContent = `Loaded preset: ${model.name}`;
});
document.querySelector("#btn-png")!.addEventListener("click", () => {
  void downloadPng();
});
document.querySelector("#btn-json")!.addEventListener("click", downloadJson);
document.querySelector("#btn-copy")!.addEventListener("click", () => {
  void copyJson();
});

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
    panning = true;
    lastPan = { x: e.clientX, y: e.clientY };
    return;
  }
  if (e.button !== 0) return;
  painting = true;
  const p = pointer(e);
  const cell = pickCell(p.x, p.y);
  hover = cell;
  applyAt(cell.x, cell.z);
});

canvas.addEventListener("pointermove", (e) => {
  if (panning) {
    origin.x += e.clientX - lastPan.x;
    origin.y += e.clientY - lastPan.y;
    lastPan = { x: e.clientX, y: e.clientY };
    return;
  }
  const p = pointer(e);
  const cell = pickCell(p.x, p.y);
  hover = cell;
  cursorEl.textContent = clampCell(cell.x, cell.z)
    ? `cell ${cell.x}, y${layerY}, ${cell.z}`
    : `out ${cell.x},${cell.z}`;
  if (painting) applyAt(cell.x, cell.z);
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
  scale = Math.min(3.5, Math.max(0.7, scale * (e.deltaY > 0 ? 0.9 : 1.1)));
}, { passive: false });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener("resize", fitCanvas);
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.code === "KeyE") setMode("erase");
  if (e.code === "KeyB") setMode("place");
  if (e.code === "BracketLeft") {
    layerY = Math.max(0, layerY - 1);
    layerYInput.value = String(layerY);
    layerYVal.textContent = String(layerY);
  }
  if (e.code === "BracketRight") {
    layerY = Math.min(12, layerY + 1);
    layerYInput.value = String(layerY);
    layerYVal.textContent = String(layerY);
  }
});

fitCanvas();
statusEl.textContent = "Build with bricks · try Tree / Hero presets";
markDirty();
requestAnimationFrame(frame);
