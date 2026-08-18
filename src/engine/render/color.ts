/** Shared hex / noise helpers for procedural shading. */

export function parseHex(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return [128, 128, 128];
  const n = parseInt(raw, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function rgb(r: number, g: number, b: number, a = 1): string {
  const rr = clampByte(r);
  const gg = clampByte(g);
  const bb = clampByte(b);
  if (a >= 0.999) return `#${((rr << 16) | (gg << 8) | bb).toString(16).padStart(6, "0")}`;
  return `rgba(${rr},${gg},${bb},${a})`;
}

export function shade(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  return rgb(r + amount, g + amount, b + amount);
}

export function mix(a: string, b: string, t: number): string {
  const A = parseHex(a);
  const B = parseHex(b);
  return rgb(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

export function clampByte(v: number): number {
  return Math.min(255, Math.max(0, v | 0));
}

export function hash2(x: number, y: number, seed = 0): number {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + (seed | 0);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  for (let i = 0; i < octaves; i++) {
    v += amp * valueNoise(x * freq, y * freq, seed + i * 19);
    sum += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return v / sum;
}
