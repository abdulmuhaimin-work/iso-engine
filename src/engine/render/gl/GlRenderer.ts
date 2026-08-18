import type { Camera } from "../../Camera";
import type { Assets } from "../../Assets";
import type { World } from "../../world/World";
import type { Entity } from "../../world/Entity";
import type { TileDef, TileMap } from "../../world/TileMap";
import type { Vec2 } from "../../math/Vec2";
import { brickToScreen } from "../BrickModel";
import { parseHex, shade } from "../color";
import { materialIdFromDef } from "../textures";
import type { RendererOptions } from "../CanvasRenderer";
import { compileProgram } from "./program";
import {
  ATMOS_FRAG,
  COLOR_FRAG,
  COLOR_VERT,
  FS_VERT,
  ISO_FRAG,
  ISO_VERT,
  SKY_FRAG,
  SPRITE_FRAG,
  SPRITE_VERT,
} from "./shaders";

const ISO_STRIDE = 14;
const COLOR_STRIDE = 10;
const SPRITE_STRIDE = 5;

/**
 * WebGL2 isometric renderer: one terrain draw + GPU material shading.
 */
export class GlRenderer {
  clearColor: string;
  showGrid: boolean;
  hoverTile: Vec2 | null = null;
  pathTiles: Vec2[] | null = null;

  private readonly gl: WebGL2RenderingContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly isoProg: WebGLProgram;
  private readonly colorProg: WebGLProgram;
  private readonly spriteProg: WebGLProgram;
  private readonly skyProg: WebGLProgram;
  private readonly atmosProg: WebGLProgram;
  private readonly isoVbo: WebGLBuffer;
  private readonly colorVbo: WebGLBuffer;
  private readonly spriteVbo: WebGLBuffer;
  private readonly isoVao: WebGLVertexArrayObject;
  private readonly colorVao: WebGLVertexArrayObject;
  private readonly spriteVao: WebGLVertexArrayObject;
  private readonly emptyVao: WebGLVertexArrayObject;
  private readonly isoMesh = new FloatMesh();
  private readonly colorMesh = new FloatMesh();
  private readonly texCache = new Map<object, WebGLTexture>();
  private cachedMap: TileMap | null = null;
  private cachedIsoCount = 0;

  constructor(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.gl = gl;
    this.canvas = canvas;
    this.clearColor = options.clearColor ?? "#1a1f2b";
    this.showGrid = options.showGrid ?? true;

    this.isoProg = compileProgram(gl, ISO_VERT, ISO_FRAG);
    this.colorProg = compileProgram(gl, COLOR_VERT, COLOR_FRAG);
    this.spriteProg = compileProgram(gl, SPRITE_VERT, SPRITE_FRAG);
    this.skyProg = compileProgram(gl, FS_VERT, SKY_FRAG);
    this.atmosProg = compileProgram(gl, FS_VERT, ATMOS_FRAG);

    this.isoVbo = gl.createBuffer()!;
    this.colorVbo = gl.createBuffer()!;
    this.spriteVbo = gl.createBuffer()!;
    this.isoVao = this.makeIsoVao();
    this.colorVao = this.makeColorVao();
    this.spriteVao = this.makeSpriteVao();
    this.emptyVao = gl.createVertexArray()!;

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(_cssWidth: number, _cssHeight: number): void {
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(world: World, camera: Camera, assets?: Assets, time = 0): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearDepth(1);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    this.drawSky();

    if (this.cachedMap !== world.map) {
      this.cachedMap = world.map;
      this.buildTerrain(world.map);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.isoVbo);
      gl.bufferData(gl.ARRAY_BUFFER, this.isoMesh.view(), gl.DYNAMIC_DRAW);
      this.cachedIsoCount = this.isoMesh.count / ISO_STRIDE;
    }

    this.drawTerrain(camera, time);
    this.drawEntitiesAndFx(world, camera, assets);
    this.drawAtmos();
  }

  private makeIsoVao(): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.isoVbo);
    const stride = ISO_STRIDE * 4;
    bindF(gl, 0, 2, stride, 0);
    bindF(gl, 1, 2, stride, 2);
    bindF(gl, 2, 2, stride, 4);
    bindF(gl, 3, 3, stride, 6);
    bindF(gl, 4, 3, stride, 9);
    bindF(gl, 5, 2, stride, 12);
    gl.bindVertexArray(null);
    return vao;
  }

  private makeColorVao(): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorVbo);
    const stride = COLOR_STRIDE * 4;
    bindF(gl, 0, 2, stride, 0);
    bindF(gl, 1, 4, stride, 2);
    bindF(gl, 2, 2, stride, 6);
    bindF(gl, 3, 2, stride, 8);
    gl.bindVertexArray(null);
    return vao;
  }

  private makeSpriteVao(): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteVbo);
    const stride = SPRITE_STRIDE * 4;
    bindF(gl, 0, 2, stride, 0);
    bindF(gl, 1, 2, stride, 2);
    bindF(gl, 2, 1, stride, 4);
    gl.bindVertexArray(null);
    return vao;
  }

  private drawSky(): void {
    const gl = this.gl;
    const [r, g, b] = parseHex(this.clearColor);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.skyProg);
    gl.bindVertexArray(this.emptyVao);
    gl.uniform3f(gl.getUniformLocation(this.skyProg, "uClear"), r / 255, g / 255, b / 255);
    gl.uniform2f(gl.getUniformLocation(this.skyProg, "uViewport"), this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
  }

  private drawAtmos(): void {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.atmosProg);
    gl.bindVertexArray(this.emptyVao);
    gl.uniform2f(gl.getUniformLocation(this.atmosProg, "uViewport"), this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
  }

  private drawTerrain(camera: Camera, time: number): void {
    const gl = this.gl;
    if (this.cachedIsoCount === 0) return;
    gl.useProgram(this.isoProg);
    gl.bindVertexArray(this.isoVao);
    gl.uniform2f(gl.getUniformLocation(this.isoProg, "uCam"), camera.position.x, camera.position.y);
    gl.uniform2f(gl.getUniformLocation(this.isoProg, "uViewport"), camera.viewportWidth, camera.viewportHeight);
    gl.uniform1f(gl.getUniformLocation(this.isoProg, "uZoom"), camera.zoom);
    gl.uniform1f(gl.getUniformLocation(this.isoProg, "uTileW"), camera.metrics.tileWidth);
    gl.uniform1f(gl.getUniformLocation(this.isoProg, "uTileH"), camera.metrics.tileHeight);
    gl.uniform1f(gl.getUniformLocation(this.isoProg, "uTime"), time);
    gl.uniform1f(gl.getUniformLocation(this.isoProg, "uGrid"), this.showGrid ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, this.cachedIsoCount);
  }

  private buildTerrain(map: TileMap): void {
    const mesh = this.isoMesh;
    mesh.reset();
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const def = map.getDef(tx, ty);
        if (!def) continue;
        this.pushColumn(mesh, map, tx, ty, def);
        const overlay = map.getOverlayDef(tx, ty);
        if (overlay) this.pushTop(mesh, tx, ty, map.elevationPx(tx, ty) + 0.35, overlay, 0.72, aoOf(map, tx, ty));
      }
    }
  }

  private pushColumn(mesh: FloatMesh, map: TileMap, tx: number, ty: number, def: TileDef): void {
    const levels = map.getHeight(tx, ty);
    const step = map.layerHeight;
    const bonus = def.elevation ?? 0;
    const ao = aoOf(map, tx, ty);
    if (levels <= 0 && bonus <= 0) {
      this.pushTop(mesh, tx, ty, 0, def, 1, ao);
      return;
    }
    for (let h = 0; h < levels; h++) {
      const top = (h + 1) * step;
      const bottom = h * step;
      const isTop = h === levels - 1 && bonus <= 0;
      const color = h === levels - 1 ? def.color : shade(def.color, -12 - h * 4);
      this.pushSlice(mesh, tx, ty, bottom, top, { ...def, color }, isTop, ao);
    }
    if (bonus > 0) {
      const base = levels * step;
      this.pushSlice(mesh, tx, ty, base, base + bonus, { ...def, color: shade(def.color, 8) }, true, ao);
    }
  }

  private pushSlice(
    mesh: FloatMesh,
    tx: number,
    ty: number,
    bottom: number,
    top: number,
    def: TileDef,
    drawTop: boolean,
    ao: number,
  ): void {
    const thick = top - bottom;
    const mat = materialIdFromDef(def.name, def.material);
    const [r, g, b] = parseHex(def.color);
    const cr = r / 255;
    const cg = g / 255;
    const cb = b / 255;
    if (thick > 0.5) {
      this.pushFace(mesh, tx, ty, top, thick, cr, cg, cb, mat, 1, ao, 1, [
        [-1, 0],
        [0, 1],
        [0, 1],
        [-1, 0],
      ], true);
      this.pushFace(mesh, tx, ty, top, thick, cr, cg, cb, mat, 2, ao, 1, [
        [1, 0],
        [0, 1],
        [0, 1],
        [1, 0],
      ], true);
    }
    if (drawTop) this.pushTop(mesh, tx, ty, top, def, 1, ao);
  }

  private pushTop(
    mesh: FloatMesh,
    tx: number,
    ty: number,
    elev: number,
    def: TileDef,
    scale: number,
    ao: number,
  ): void {
    const mat = materialIdFromDef(def.name, def.material);
    const [r, g, b] = parseHex(def.color);
    const cr = r / 255;
    const cg = g / 255;
    const cb = b / 255;
    const N: Vec2 = { x: 0, y: -1 };
    const E: Vec2 = { x: 1, y: 0 };
    const S: Vec2 = { x: 0, y: 1 };
    const W: Vec2 = { x: -1, y: 0 };
    this.pushIsoTri(mesh, tx, ty, N, E, S, elev, 0, cr, cg, cb, mat, 0, ao, scale);
    this.pushIsoTri(mesh, tx, ty, N, S, W, elev, 0, cr, cg, cb, mat, 0, ao, scale);
  }

  private pushFace(
    mesh: FloatMesh,
    tx: number,
    ty: number,
    elev: number,
    thick: number,
    cr: number,
    cg: number,
    cb: number,
    mat: number,
    face: number,
    ao: number,
    scale: number,
    corners: number[][],
    dropped: boolean,
  ): void {
    const c0 = corners[0]!;
    const c1 = corners[1]!;
    const c2 = corners[2]!;
    const c3 = corners[3]!;
    const d0 = 0;
    const d1 = 0;
    const d2 = dropped ? thick : 0;
    const d3 = dropped ? thick : 0;
    this.pushIsoVert(mesh, tx, ty, c0[0]!, c0[1]!, elev, d0, cr, cg, cb, mat, face, ao, scale);
    this.pushIsoVert(mesh, tx, ty, c1[0]!, c1[1]!, elev, d1, cr, cg, cb, mat, face, ao, scale);
    this.pushIsoVert(mesh, tx, ty, c2[0]!, c2[1]!, elev, d2, cr, cg, cb, mat, face, ao, scale);
    this.pushIsoVert(mesh, tx, ty, c0[0]!, c0[1]!, elev, d0, cr, cg, cb, mat, face, ao, scale);
    this.pushIsoVert(mesh, tx, ty, c2[0]!, c2[1]!, elev, d2, cr, cg, cb, mat, face, ao, scale);
    this.pushIsoVert(mesh, tx, ty, c3[0]!, c3[1]!, elev, d3, cr, cg, cb, mat, face, ao, scale);
  }

  private pushIsoTri(
    mesh: FloatMesh,
    tx: number,
    ty: number,
    a: Vec2,
    b: Vec2,
    c: Vec2,
    elev: number,
    drop: number,
    cr: number,
    cg: number,
    cb: number,
    mat: number,
    face: number,
    ao: number,
    scale: number,
  ): void {
    this.pushIsoVert(mesh, tx, ty, a.x, a.y, elev, drop, cr, cg, cb, mat, face, ao, scale);
    this.pushIsoVert(mesh, tx, ty, b.x, b.y, elev, drop, cr, cg, cb, mat, face, ao, scale);
    this.pushIsoVert(mesh, tx, ty, c.x, c.y, elev, drop, cr, cg, cb, mat, face, ao, scale);
  }

  private pushIsoVert(
    mesh: FloatMesh,
    tx: number,
    ty: number,
    cx: number,
    cy: number,
    elev: number,
    drop: number,
    cr: number,
    cg: number,
    cb: number,
    mat: number,
    face: number,
    ao: number,
    scale: number,
  ): void {
    mesh.push(tx, ty, cx, cy, elev, drop, cr, cg, cb, mat, face, ao, scale, scale);
  }

  private drawEntitiesAndFx(world: World, camera: Camera, assets?: Assets): void {
    const gl = this.gl;
    const map = world.map;
    this.colorMesh.reset();
    const spriteBatches = new Map<WebGLTexture, FloatMesh>();

    const drawEntity = (entity: Entity, elev: number) => {
      this.pushEntity(entity, camera, elev, assets, spriteBatches);
    };

    const buckets = new Map<number, Entity[]>();
    const orphan: Entity[] = [];
    for (const entity of world.entities) {
      if (!entity.active) continue;
      const tx = Math.floor(entity.position.x);
      const ty = Math.floor(entity.position.y);
      if (!map.inBounds(tx, ty)) {
        orphan.push(entity);
        continue;
      }
      const key = map.index(tx, ty);
      const list = buckets.get(key);
      if (list) list.push(entity);
      else buckets.set(key, [entity]);
    }

    for (let sum = 0; sum <= map.width + map.height - 2; sum++) {
      for (let tx = 0; tx < map.width; tx++) {
        const ty = sum - tx;
        if (ty < 0 || ty >= map.height) continue;
        const list = buckets.get(map.index(tx, ty));
        if (!list) continue;
        const elev = map.elevationPx(tx, ty);
        for (const entity of list) drawEntity(entity, elev);
      }
    }
    for (const entity of orphan) drawEntity(entity, 0);

    this.pushPathAndHover(camera, map);

    if (this.colorMesh.count > 0) {
      gl.useProgram(this.colorProg);
      gl.bindVertexArray(this.colorVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorVbo);
      gl.bufferData(gl.ARRAY_BUFFER, this.colorMesh.view(), gl.STREAM_DRAW);
      gl.uniform2f(
        gl.getUniformLocation(this.colorProg, "uViewport"),
        camera.viewportWidth,
        camera.viewportHeight,
      );
      gl.drawArrays(gl.TRIANGLES, 0, this.colorMesh.count / COLOR_STRIDE);
    }

    if (spriteBatches.size > 0) {
      gl.useProgram(this.spriteProg);
      gl.bindVertexArray(this.spriteVao);
      gl.uniform2f(
        gl.getUniformLocation(this.spriteProg, "uViewport"),
        camera.viewportWidth,
        camera.viewportHeight,
      );
      gl.uniform1i(gl.getUniformLocation(this.spriteProg, "uTex"), 0);
      gl.activeTexture(gl.TEXTURE0);
      for (const [tex, mesh] of spriteBatches) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteVbo);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.view(), gl.STREAM_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count / SPRITE_STRIDE);
      }
    }
  }

  private pushEntity(
    entity: Entity,
    camera: Camera,
    elevationPx: number,
    assets: Assets | undefined,
    spriteBatches: Map<WebGLTexture, FloatMesh>,
  ): void {
    const screen = camera.worldToScreenElevated(entity.position, elevationPx);
    const sprite = entity.sprite;
    const ox = (sprite.offsetX ?? 0) * camera.zoom;
    const oy = (sprite.offsetY ?? 0) * camera.zoom;
    const depth = depthOf(entity.position.x, entity.position.y) - 0.0005;
    const x = screen.x + ox;
    const y = screen.y + oy;

    if (entity.animator) {
      this.pushSheet(
        spriteBatches,
        entity.animator.sheet.image,
        entity.animator.frame,
        x + entity.animator.offsetX * camera.zoom,
        y + entity.animator.offsetY * camera.zoom,
        entity.animator.scale * (sprite.scale ?? 1) * camera.zoom,
        entity.animator.flipX || !!sprite.flipX,
        depth,
      );
      return;
    }

    if (entity.brickModel) {
      const scale = (sprite.scale ?? 1) * camera.zoom;
      for (const brick of entity.brickModel.sorted()) {
        const p = brickToScreen(brick.x, brick.y, brick.z, entity.brickModel.metrics);
        this.pushBrickCube(
          x + p.x * scale,
          y + p.y * scale,
          entity.brickModel.metrics.tileWidth * scale,
          entity.brickModel.metrics.tileHeight * scale,
          entity.brickModel.metrics.brickHeight * scale,
          brick.color,
          depth,
        );
      }
      return;
    }

    if (sprite.sheetKey && assets?.hasSheet(sprite.sheetKey)) {
      const sheet = assets.getSheet(sprite.sheetKey);
      this.pushSheet(
        spriteBatches,
        sheet.image,
        sheet.frame(sprite.frame ?? 0),
        x,
        y,
        (sprite.scale ?? 1) * camera.zoom,
        !!sprite.flipX,
        depth,
      );
      return;
    }

    if (sprite.imageKey && assets?.has(sprite.imageKey)) {
      const img = assets.get(sprite.imageKey);
      const scale = sprite.scale ?? 1;
      const w = (sprite.width ?? img.width) * scale * camera.zoom;
      const h = (sprite.height ?? img.height) * scale * camera.zoom;
      this.pushSprite(spriteBatches, img, x, y, w, h, 0, 0, img.width, img.height, !!sprite.flipX, depth);
      return;
    }

    const kind = sprite.kind ?? "actor";
    const color = sprite.color ?? "#f2f2f2";
    if (kind === "actor") {
      const rad = 10 * camera.zoom;
      this.pushSdf(x, y, rad * 0.7, rad * 0.35, [0, 0, 0, 0.35], 2, depth + 0.0002);
      const [cr, cg, cb] = parseHex(color);
      this.pushSdf(x, y - rad * 1.3, rad * 0.55, rad * 0.95, [cr / 255, cg / 255, cb / 255, 1], 3, depth);
      const [hr, hg, hb] = parseHex(shade(color, 24));
      this.pushSdf(x, y - rad * 2.4, rad * 0.45, rad * 0.45, [hr / 255, hg / 255, hb / 255, 1], 1, depth);
      return;
    }

    if (kind === "block") {
      const hw = (sprite.width ?? 18) * camera.zoom * 0.5;
      const h = (sprite.height ?? 28) * camera.zoom;
      const [cr, cg, cb] = parseHex(color);
      this.pushColorTri(
        x - hw, y, x + hw, y, x + hw, y - h,
        cr / 255 * 0.7, cg / 255 * 0.7, cb / 255 * 0.7, 1, 0, depth,
      );
      this.pushColorTri(
        x - hw, y, x + hw, y - h, x - hw, y - h,
        cr / 255 * 0.7, cg / 255 * 0.7, cb / 255 * 0.7, 1, 0, depth,
      );
      const [lr, lg, lb] = parseHex(shade(color, 28));
      this.pushColorTri(
        x - hw, y - h, x, y - h - hw * 0.5, x + hw, y - h,
        lr / 255, lg / 255, lb / 255, 1, 0, depth,
      );
      return;
    }

    const s = 8 * camera.zoom;
    const [cr, cg, cb] = parseHex(color);
    this.pushColorTri(x, y - s, x + s, y, x, y + s, cr / 255, cg / 255, cb / 255, 1, 0, depth);
    this.pushColorTri(x, y - s, x, y + s, x - s, y, cr / 255, cg / 255, cb / 255, 1, 0, depth);
  }

  private pushSheet(
    batches: Map<WebGLTexture, FloatMesh>,
    image: CanvasImageSource,
    frame: { x: number; y: number; w: number; h: number },
    footX: number,
    footY: number,
    scale: number,
    flipX: boolean,
    depth: number,
  ): void {
    const w = frame.w * scale;
    const h = frame.h * scale;
    this.pushSprite(batches, image, footX, footY, w, h, frame.x, frame.y, frame.w, frame.h, flipX, depth);
  }

  private pushSprite(
    batches: Map<WebGLTexture, FloatMesh>,
    image: CanvasImageSource,
    footX: number,
    footY: number,
    w: number,
    h: number,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    flipX: boolean,
    depth: number,
  ): void {
    const tex = this.textureOf(image);
    let mesh = batches.get(tex);
    if (!mesh) {
      mesh = new FloatMesh();
      batches.set(tex, mesh);
    }
    const size = sourceSize(image);
    let u0 = sx / size.w;
    let u1 = (sx + sw) / size.w;
    const v0 = 1 - sy / size.h;
    const v1 = 1 - (sy + sh) / size.h;
    if (flipX) {
      const t = u0;
      u0 = u1;
      u1 = t;
    }
    const x0 = footX - w / 2;
    const x1 = footX + w / 2;
    const y0 = footY - h;
    const y1 = footY;
    pushSpriteTri(mesh, x0, y0, u0, v0, x1, y0, u1, v0, x0, y1, u0, v1, depth);
    pushSpriteTri(mesh, x1, y0, u1, v0, x1, y1, u1, v1, x0, y1, u0, v1, depth);
  }

  private textureOf(image: CanvasImageSource): WebGLTexture {
    const key = image as object;
    const hit = this.texCache.get(key);
    if (hit) return hit;
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error("Failed to create texture");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image as TexImageSource);
    this.texCache.set(key, tex);
    return tex;
  }

  private pushBrickCube(
    cx: number,
    cy: number,
    tw: number,
    th: number,
    h: number,
    color: string,
    depth: number,
  ): void {
    const topY = cy - h;
    const left = parseHex(shade(color, -22));
    const right = parseHex(shade(color, -48));
    const top = parseHex(shade(color, 24));
    this.pushColorQuad(
      cx - tw, topY, cx, topY + th, cx, topY + th + h, cx - tw, topY + h,
      left[0] / 255, left[1] / 255, left[2] / 255, 1, 0, depth,
    );
    this.pushColorQuad(
      cx + tw, topY, cx, topY + th, cx, topY + th + h, cx + tw, topY + h,
      right[0] / 255, right[1] / 255, right[2] / 255, 1, 0, depth,
    );
    this.pushColorQuad(
      cx, topY - th, cx + tw, topY, cx, topY + th, cx - tw, topY,
      top[0] / 255, top[1] / 255, top[2] / 255, 1, 0, depth,
    );
  }

  private pushPathAndHover(camera: Camera, map: TileMap): void {
    const hw = camera.tileSize().width;
    const hh = camera.tileSize().height;
    if (this.pathTiles && this.pathTiles.length > 0) {
      for (let i = 0; i < this.pathTiles.length; i++) {
        const t = this.pathTiles[i]!;
        const elev = map.elevationPx(t.x, t.y);
        const p = camera.worldToScreenElevated({ x: t.x + 0.5, y: t.y + 0.5 }, elev);
        if (i > 0) {
          const prev = this.pathTiles[i - 1]!;
          const pe = map.elevationPx(prev.x, prev.y);
          const q = camera.worldToScreenElevated({ x: prev.x + 0.5, y: prev.y + 0.5 }, pe);
          this.pushLine(q.x, q.y, p.x, p.y, Math.max(2, 2.5 * camera.zoom), [1, 0.88, 0.54, 0.85], 0.01);
        }
        const last = i === this.pathTiles.length - 1;
        const rad = Math.max(2, hh * 0.35);
        this.pushSdf(
          p.x, p.y, rad, rad,
          last ? [1, 0.77, 0.31, 0.95] : [1, 0.88, 0.54, 0.75],
          1, 0.01,
        );
      }
    }
    if (this.hoverTile && map.inBounds(this.hoverTile.x, this.hoverTile.y)) {
      const elev = map.elevationPx(this.hoverTile.x, this.hoverTile.y);
      const foot = camera.worldToScreenElevated(
        { x: this.hoverTile.x + 0.5, y: this.hoverTile.y + 0.5 },
        elev,
      );
      const n = { x: foot.x, y: foot.y - hh };
      const e = { x: foot.x + hw, y: foot.y };
      const s = { x: foot.x, y: foot.y + hh };
      const w = { x: foot.x - hw, y: foot.y };
      const col: [number, number, number, number] = [1, 0.88, 0.54, 1];
      this.pushLine(n.x, n.y, e.x, e.y, 2, col, 0.01);
      this.pushLine(e.x, e.y, s.x, s.y, 2, col, 0.01);
      this.pushLine(s.x, s.y, w.x, w.y, 2, col, 0.01);
      this.pushLine(w.x, w.y, n.x, n.y, 2, col, 0.01);
    }
  }

  private pushSdf(
    cx: number,
    cy: number,
    hw: number,
    hh: number,
    rgba: number[],
    shape: number,
    depth: number,
  ): void {
    this.pushColorVert(cx - hw, cy - hh, rgba, -1, -1, shape, depth);
    this.pushColorVert(cx + hw, cy - hh, rgba, 1, -1, shape, depth);
    this.pushColorVert(cx - hw, cy + hh, rgba, -1, 1, shape, depth);
    this.pushColorVert(cx + hw, cy - hh, rgba, 1, -1, shape, depth);
    this.pushColorVert(cx + hw, cy + hh, rgba, 1, 1, shape, depth);
    this.pushColorVert(cx - hw, cy + hh, rgba, -1, 1, shape, depth);
  }

  private pushLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    width: number,
    rgba: number[],
    depth: number,
  ): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * (width * 0.5);
    const ny = (dx / len) * (width * 0.5);
    this.pushColorQuad(x0 + nx, y0 + ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny, x0 - nx, y0 - ny, rgba[0]!, rgba[1]!, rgba[2]!, rgba[3]!, 0, depth);
  }

  private pushColorQuad(
    x0: number, y0: number, x1: number, y1: number,
    x2: number, y2: number, x3: number, y3: number,
    r: number, g: number, b: number, a: number, shape: number, depth: number,
  ): void {
    this.pushColorTri(x0, y0, x1, y1, x2, y2, r, g, b, a, shape, depth);
    this.pushColorTri(x0, y0, x2, y2, x3, y3, r, g, b, a, shape, depth);
  }

  private pushColorTri(
    x0: number, y0: number, x1: number, y1: number, x2: number, y2: number,
    r: number, g: number, b: number, a: number, shape: number, depth: number,
  ): void {
    const rgba = [r, g, b, a];
    this.pushColorVert(x0, y0, rgba, 0, 0, shape, depth);
    this.pushColorVert(x1, y1, rgba, 0, 0, shape, depth);
    this.pushColorVert(x2, y2, rgba, 0, 0, shape, depth);
  }

  private pushColorVert(
    x: number,
    y: number,
    rgba: number[],
    u: number,
    v: number,
    shape: number,
    depth: number,
  ): void {
    this.colorMesh.push(x, y, rgba[0]!, rgba[1]!, rgba[2]!, rgba[3]!, u, v, shape, depth);
  }
}

class FloatMesh {
  data = new Float32Array(4096);
  count = 0;

  reset(): void {
    this.count = 0;
  }

  push(...values: number[]): void {
    this.ensure(values.length);
    this.data.set(values, this.count);
    this.count += values.length;
  }

  view(): Float32Array {
    return this.data.subarray(0, this.count);
  }

  private ensure(n: number): void {
    if (this.count + n <= this.data.length) return;
    const next = new Float32Array(Math.max(this.data.length * 2, this.count + n));
    next.set(this.data.subarray(0, this.count));
    this.data = next;
  }
}

function bindF(gl: WebGL2RenderingContext, loc: number, size: number, stride: number, floatOffset: number): void {
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, floatOffset * 4);
}

function aoOf(map: TileMap, tx: number, ty: number): number {
  const h = map.elevationPx(tx, ty);
  let a = 0;
  if (map.inBounds(tx - 1, ty) && map.elevationPx(tx - 1, ty) > h + 3) a += 0.16;
  if (map.inBounds(tx, ty - 1) && map.elevationPx(tx, ty - 1) > h + 3) a += 0.14;
  if (map.inBounds(tx + 1, ty) && map.elevationPx(tx + 1, ty) > h + 8) a += 0.08;
  if (map.inBounds(tx, ty + 1) && map.elevationPx(tx, ty + 1) > h + 8) a += 0.06;
  return Math.min(0.38, a);
}

function depthOf(x: number, y: number): number {
  return Math.min(0.98, Math.max(0.02, 1 - (x + y) * 0.0018));
}

function sourceSize(image: CanvasImageSource): { w: number; h: number } {
  if ("width" in image && "height" in image) {
    return { w: Number(image.width) || 1, h: Number(image.height) || 1 };
  }
  return { w: 1, h: 1 };
}

function pushSpriteTri(
  mesh: FloatMesh,
  x0: number, y0: number, u0: number, v0: number,
  x1: number, y1: number, u1: number, v1: number,
  x2: number, y2: number, u2: number, v2: number,
  depth: number,
): void {
  mesh.push(x0, y0, u0, v0, depth, x1, y1, u1, v1, depth, x2, y2, u2, v2, depth);
}
