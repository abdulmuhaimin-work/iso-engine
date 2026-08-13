export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpriteSheetGridOptions {
  frameWidth: number;
  frameHeight: number;
  /** Defaults to floor(imageWidth / frameWidth). */
  columns?: number;
  /** Defaults to floor(imageHeight / frameHeight). */
  rows?: number;
  margin?: number;
  spacing?: number;
  /** Optional named aliases → frame index. */
  names?: Record<string, number>;
}

export type ImageSource = CanvasImageSource & {
  width: number;
  height: number;
};

/**
 * Grid (or custom-rect) sprite sheet over a single image / canvas.
 */
export class SpriteSheet {
  readonly image: ImageSource;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly columns: number;
  readonly rows: number;
  readonly frames: FrameRect[];
  private readonly names = new Map<string, number>();

  private constructor(
    image: ImageSource,
    frameWidth: number,
    frameHeight: number,
    columns: number,
    rows: number,
    frames: FrameRect[],
    names?: Record<string, number>,
  ) {
    this.image = image;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.columns = columns;
    this.rows = rows;
    this.frames = frames;
    if (names) {
      for (const [name, index] of Object.entries(names)) {
        this.names.set(name, index);
      }
    }
  }

  static fromGrid(image: ImageSource, options: SpriteSheetGridOptions): SpriteSheet {
    const margin = options.margin ?? 0;
    const spacing = options.spacing ?? 0;
    const fw = options.frameWidth;
    const fh = options.frameHeight;
    const columns =
      options.columns ??
      Math.floor((image.width - margin * 2 + spacing) / (fw + spacing));
    const rows =
      options.rows ??
      Math.floor((image.height - margin * 2 + spacing) / (fh + spacing));

    const frames: FrameRect[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        frames.push({
          x: margin + col * (fw + spacing),
          y: margin + row * (fh + spacing),
          w: fw,
          h: fh,
        });
      }
    }

    return new SpriteSheet(image, fw, fh, columns, rows, frames, options.names);
  }

  static fromFrames(
    image: ImageSource,
    frames: FrameRect[],
    names?: Record<string, number>,
  ): SpriteSheet {
    const fw = frames[0]?.w ?? 0;
    const fh = frames[0]?.h ?? 0;
    return new SpriteSheet(image, fw, fh, frames.length, 1, frames.slice(), names);
  }

  get frameCount(): number {
    return this.frames.length;
  }

  frame(index: number): FrameRect {
    const f = this.frames[index];
    if (!f) throw new Error(`SpriteSheet frame out of range: ${index}`);
    return f;
  }

  frameAt(col: number, row: number): FrameRect {
    return this.frame(row * this.columns + col);
  }

  frameByName(name: string): FrameRect {
    const index = this.names.get(name);
    if (index === undefined) throw new Error(`Unknown frame name: ${name}`);
    return this.frame(index);
  }

  indexByName(name: string): number {
    const index = this.names.get(name);
    if (index === undefined) throw new Error(`Unknown frame name: ${name}`);
    return index;
  }
}
