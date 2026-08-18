/** Full-screen sky + atmosphere. */
export const FS_VERT = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 1.0, 1.0);
}
`;

export const SKY_FRAG = `#version 300 es
precision highp float;
uniform vec3 uClear;
uniform vec2 uViewport;
out vec4 fragColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uViewport;
  vec3 top = uClear * 1.35 + vec3(0.04, 0.05, 0.07);
  vec3 bot = uClear * 0.55;
  vec3 col = mix(bot, top, clamp(uv.y, 0.0, 1.0));
  float sun = 1.0 - smoothstep(0.0, 0.55, length(uv - vec2(0.22, 0.88)));
  col += vec3(1.0, 0.78, 0.45) * sun * 0.16;
  fragColor = vec4(col, 1.0);
}
`;

export const ATMOS_FRAG = `#version 300 es
precision highp float;
uniform vec2 uViewport;
out vec4 fragColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uViewport;
  vec2 c = uv - vec2(0.42, 0.68);
  float v = smoothstep(0.18, 0.95, length(c * vec2(1.0, 1.15)));
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  fragColor = vec4(0.02, 0.04, 0.07, v * 0.46 + grain * 0.04);
}
`;

export const ISO_VERT = `#version 300 es
layout(location = 0) in vec2 aTile;
layout(location = 1) in vec2 aCorner;
layout(location = 2) in vec2 aElevDrop;
layout(location = 3) in vec3 aColor;
layout(location = 4) in vec3 aMatFaceAo;
layout(location = 5) in vec2 aScale;

uniform vec2 uCam;
uniform vec2 uViewport;
uniform float uZoom;
uniform float uTileW;
uniform float uTileH;

out vec3 vColor;
out vec2 vCorner;
out vec2 vWorld;
out float vFace;
out float vMat;
out float vAo;

void main() {
  vec2 world = aTile + 0.5;
  vec2 local = world - uCam;
  float sx = (local.x - local.y) * uTileW * uZoom + uViewport.x * 0.5;
  float sy = (local.x + local.y) * uTileH * uZoom + uViewport.y * 0.5 - aElevDrop.x * uZoom;
  sx += aCorner.x * uTileW * uZoom * aScale.x;
  sy += aCorner.y * uTileH * uZoom * aScale.y + aElevDrop.y * uZoom;

  float depth = 1.0 - (aTile.x + aTile.y) * 0.0018;
  depth -= aElevDrop.x * 0.000015;
  depth += aMatFaceAo.y * 0.0002;
  gl_Position = vec4(
    (sx / uViewport.x) * 2.0 - 1.0,
    1.0 - (sy / uViewport.y) * 2.0,
    clamp(depth, 0.02, 0.98),
    1.0
  );

  vColor = aColor;
  vCorner = aCorner;
  vWorld = aTile + aCorner * 0.5;
  vFace = aMatFaceAo.y;
  vMat = aMatFaceAo.x;
  vAo = aMatFaceAo.z;
}
`;

export const ISO_FRAG = `#version 300 es
precision highp float;
uniform float uTime;
uniform float uGrid;
in vec3 vColor;
in vec2 vCorner;
in vec2 vWorld;
in float vFace;
in float vMat;
in float vAo;
out vec4 fragColor;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

vec3 shadeMaterial(float mat, vec3 base, vec2 w, float time) {
  float n = fbm(w * 3.4);
  float n2 = fbm(w * 8.0 + 17.0);
  vec3 col = base;

  if (mat < 0.5) {
    col *= 0.82 + n * 0.32;
  } else if (mat < 2.5) {
    float blade = step(mat < 1.5 ? 0.7 : 0.52, hash21(floor(w * 18.0)));
    col *= 0.72 + n * 0.4 + blade * 0.12;
    col *= vec3(0.92, 1.08, 0.78);
    if (mat >= 1.5) col *= 0.88;
  } else if (mat < 3.5) {
    float wave = 0.5 + 0.5 * sin(w.x * 4.2 + w.y * 1.4 + time * 1.6);
    float cau = pow(max(0.0, 0.5 + 0.5 * sin(w.x * 1.1 - w.y * 3.2 + time * 0.9) * wave), 3.0);
    col *= vec3(0.85, 1.02, 1.18) * (0.72 + n * 0.18);
    col += vec3(0.25, 0.4, 0.45) * cau;
  } else if (mat < 4.5) {
    float grain = fbm(vec2(w.x * 2.2, w.y * 9.0));
    float rings = 0.5 + 0.5 * sin(w.x * 7.0 + grain * 7.0);
    col *= vec3(1.08, 0.95, 0.72) * (0.62 + rings * 0.38);
  } else if (mat < 5.5) {
    float crack = step(0.82, n2);
    col *= 0.7 + n * 0.28 - crack * 0.22;
  } else if (mat < 6.5) {
    float row = floor(w.y * 7.0);
    float grout = step(0.86, fract(w.y * 7.0)) + step(0.9, fract(w.x * 5.0 + row * 0.5));
    col *= 0.78 + n * 0.16 - grout * 0.18;
  } else if (mat < 9.5) {
    float pebble = step(0.88, hash21(floor(w * 10.0)));
    col *= vec3(1.04, 0.98, 0.82) * (0.74 + n * 0.26 + pebble * 0.16);
  } else if (mat < 10.5) {
    float weave = mod(floor(w.x * 8.0) + floor(w.y * 8.0), 2.0);
    col *= 0.78 + n * 0.1 + weave * 0.08;
    col *= vec3(1.05, 0.9, 0.98);
  } else if (mat < 11.5) {
    col *= 0.68 + n * 0.22 + step(0.93, hash21(floor(w * 20.0))) * 0.12;
  } else if (mat < 12.5) {
    float crack = step(0.82, n2);
    col *= (0.7 + n * 0.28 - crack * 0.22) * 0.78;
  } else if (mat < 13.5) {
    float petal = step(0.7, hash21(floor(w * 6.0)));
    col = mix(base * vec3(0.7, 1.1, 0.7), base * vec3(1.2, 0.85, 1.15), petal);
    col *= 0.8 + n * 0.2;
  } else {
    col *= 0.78 + n * 0.28;
  }
  return col;
}

void main() {
  vec3 col = shadeMaterial(vMat, vColor, vWorld, uTime);
  float lit = 0.58 + 0.42 * clamp(0.55 - vCorner.x * 0.42 - vCorner.y * 0.55, 0.0, 1.0);
  if (vFace > 0.5 && vFace < 1.5) lit *= 0.72;
  if (vFace > 1.5) lit *= 0.5;
  col *= lit;
  col *= 1.0 - vAo;

  if (vFace < 0.5) {
    float edge = abs(abs(vCorner.x) + abs(vCorner.y) - 1.0);
    col += vec3(0.18, 0.14, 0.08) * (1.0 - smoothstep(0.0, 0.12, abs(vCorner.x + 1.0) + abs(vCorner.y + 1.0)));
    if (uGrid > 0.5) col *= mix(vec3(1.0), vec3(0.82), 1.0 - smoothstep(0.0, 0.05, edge));
    col *= mix(vec3(1.0), vec3(0.55, 0.62, 0.72), smoothstep(0.0, 0.18, abs(vCorner.x - 1.0) + abs(vCorner.y - 1.0)));
  }

  if (vMat > 2.5 && vMat < 3.5) {
    float sheen = 1.0 - smoothstep(0.0, 0.8, length(vCorner - vec2(sin(uTime * 0.7) * 0.35, cos(uTime * 0.55) * 0.25)));
    col += vec3(0.35, 0.5, 0.55) * sheen * 0.22;
  }

  fragColor = vec4(col, 1.0);
}
`;

export const COLOR_VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec4 aColor;
layout(location = 2) in vec2 aUv;
layout(location = 3) in vec2 aShapeDepth;

uniform vec2 uViewport;
out vec4 vColor;
out vec2 vUv;
out float vShape;
void main() {
  gl_Position = vec4(
    (aPos.x / uViewport.x) * 2.0 - 1.0,
    1.0 - (aPos.y / uViewport.y) * 2.0,
    clamp(aShapeDepth.y, 0.01, 0.99),
    1.0
  );
  vColor = aColor;
  vUv = aUv;
  vShape = aShapeDepth.x;
}
`;

export const COLOR_FRAG = `#version 300 es
precision highp float;
in vec4 vColor;
in vec2 vUv;
in float vShape;
out vec4 fragColor;

float sdCircle(vec2 p) { return length(p) - 1.0; }
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  float a = vColor.a;
  if (vShape > 0.5 && vShape < 1.5) {
    float d = sdCircle(vUv);
    a *= 1.0 - smoothstep(0.0, 0.08, d);
  } else if (vShape > 1.5 && vShape < 2.5) {
    float d = sdCircle(vUv / vec2(1.0, 0.5));
    a *= 1.0 - smoothstep(0.0, 0.08, d);
  } else if (vShape > 2.5) {
    float d = sdRoundBox(vUv, vec2(0.78, 0.9), 0.28);
    a *= 1.0 - smoothstep(0.0, 0.06, d);
  }
  if (a < 0.02) discard;
  fragColor = vec4(vColor.rgb, a);
}
`;

export const SPRITE_VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aUv;
layout(location = 2) in float aDepth;
uniform vec2 uViewport;
out vec2 vUv;
void main() {
  gl_Position = vec4(
    (aPos.x / uViewport.x) * 2.0 - 1.0,
    1.0 - (aPos.y / uViewport.y) * 2.0,
    clamp(aDepth, 0.01, 0.99),
    1.0
  );
  vUv = aUv;
}
`;

export const SPRITE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec4 c = texture(uTex, vUv);
  if (c.a < 0.08) discard;
  fragColor = c;
}
`;
