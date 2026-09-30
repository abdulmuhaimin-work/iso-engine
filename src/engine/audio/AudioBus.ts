/**
 * Lightweight Web Audio bus: procedural SFX + ambient beds.
 * Unlocks on first user gesture (browser autoplay policy).
 */

const STORAGE_MUTE = "iso-audio-mute";
const STORAGE_VOL = "iso-audio-volume";

export type AmbientTheme = "harbor" | "lobby" | "cave" | "none";

export interface AudioBusOptions {
  /** Mount mute/volume controls into this element (optional). */
  controlsRoot?: HTMLElement | null;
}

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];
  private unlocked = false;
  private muted = false;
  private volume = 0.7;
  private theme: AmbientTheme = "none";
  private stepCooldown = 0;
  private readonly unlockHandler: () => void;
  private muteBtn: HTMLButtonElement | null = null;
  private volInput: HTMLInputElement | null = null;

  constructor(options: AudioBusOptions = {}) {
    const storedMute = localStorage.getItem(STORAGE_MUTE);
    const storedVol = localStorage.getItem(STORAGE_VOL);
    if (storedMute !== null) this.muted = storedMute === "1";
    if (storedVol !== null) {
      const v = Number(storedVol);
      if (Number.isFinite(v)) this.volume = Math.min(1, Math.max(0, v));
    }

    this.unlockHandler = () => this.unlock();
    window.addEventListener("pointerdown", this.unlockHandler, { passive: true });
    window.addEventListener("keydown", this.unlockHandler);

    if (options.controlsRoot) this.mountControls(options.controlsRoot);
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get masterVolume(): number {
    return this.volume;
  }

  setMuted(value: boolean): void {
    this.muted = value;
    localStorage.setItem(STORAGE_MUTE, value ? "1" : "0");
    this.applyGains();
    this.syncControls();
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
    localStorage.setItem(STORAGE_VOL, String(this.volume));
    this.applyGains();
    this.syncControls();
  }

  toggleMute(): void {
    this.setMuted(!this.muted);
  }

  /** Call once per frame for footstep rate limiting. */
  update(dt: number): void {
    this.stepCooldown = Math.max(0, this.stepCooldown - dt);
  }

  setAmbient(theme: AmbientTheme): void {
    if (this.theme === theme) return;
    this.theme = theme;
    this.rebuildAmbient();
  }

  playFootstep(surface: "stone" | "dirt" | "wood" | "sand" = "stone"): void {
    if (!this.ready() || this.stepCooldown > 0) return;
    this.stepCooldown = 0.28;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.08);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value =
      surface === "wood" ? 420 : surface === "sand" ? 280 : surface === "dirt" ? 360 : 520;
    filter.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain!);
    src.start(t);
    src.stop(t + 0.09);
  }

  playInteract(kind: "talk" | "fish" | "browse" | "generic" = "generic"): void {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    if (kind === "fish") {
      this.blip(t, 180, 0.12, "triangle", 0.18);
      this.noiseHit(t + 0.04, 0.14, 900, 0.2);
      return;
    }
    if (kind === "talk") {
      this.blip(t, 520, 0.07, "sine", 0.14);
      this.blip(t + 0.06, 690, 0.08, "sine", 0.11);
      return;
    }
    if (kind === "browse") {
      this.blip(t, 880, 0.05, "square", 0.07);
      this.blip(t + 0.05, 660, 0.06, "square", 0.06);
      return;
    }
    this.blip(t, 640, 0.06, "triangle", 0.12);
  }

  playUi(kind: "beep" | "confirm" | "cancel" = "beep"): void {
    if (!this.ready()) return;
    const t = this.ctx!.currentTime;
    if (kind === "confirm") this.blip(t, 740, 0.05, "sine", 0.1);
    else if (kind === "cancel") this.blip(t, 280, 0.07, "triangle", 0.09);
    else this.blip(t, 980, 0.035, "square", 0.05);
  }

  destroy(): void {
    window.removeEventListener("pointerdown", this.unlockHandler);
    window.removeEventListener("keydown", this.unlockHandler);
    this.stopAmbient();
    void this.ctx?.close();
    this.ctx = null;
  }

  private ready(): boolean {
    return this.unlocked && !!this.ctx && !!this.sfxGain && !this.muted;
  }

  private unlock(): void {
    if (this.unlocked) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.sfxGain = ctx.createGain();
    this.ambientGain = ctx.createGain();
    this.sfxGain.connect(this.master);
    this.ambientGain.connect(this.master);
    this.master.connect(ctx.destination);
    this.applyGains();
    this.unlocked = true;
    void ctx.resume().then(() => this.rebuildAmbient());
  }

  private applyGains(): void {
    if (!this.master || !this.sfxGain || !this.ambientGain) return;
    const v = this.muted ? 0 : this.volume;
    this.master.gain.value = v;
    this.sfxGain.gain.value = 1;
    this.ambientGain.gain.value = 0.55;
  }

  private stopAmbient(): void {
    for (const n of this.ambientNodes) {
      try {
        (n as AudioScheduledSourceNode).stop?.();
      } catch {
        /* already stopped */
      }
      n.disconnect();
    }
    this.ambientNodes = [];
  }

  private rebuildAmbient(): void {
    this.stopAmbient();
    if (!this.unlocked || !this.ctx || !this.ambientGain || this.theme === "none") return;

    const ctx = this.ctx;
    const out = this.ambientGain;
    const bed = ctx.createGain();
    bed.gain.value = this.theme === "cave" ? 0.35 : 0.5;
    bed.connect(out);
    this.ambientNodes.push(bed);

    if (this.theme === "harbor") {
      this.ambientNodes.push(...noiseBed(ctx, bed, 0.22, 280, 0.35));
      this.ambientNodes.push(...drone(ctx, bed, 62, 0.045));
      this.ambientNodes.push(...drone(ctx, bed, 93, 0.028));
      this.ambientNodes.push(...drone(ctx, bed, 186, 0.012));
    } else if (this.theme === "lobby") {
      this.ambientNodes.push(...noiseBed(ctx, bed, 0.1, 520, 0.2));
      this.ambientNodes.push(...drone(ctx, bed, 110, 0.035));
      this.ambientNodes.push(...drone(ctx, bed, 165, 0.02));
      this.ambientNodes.push(...drone(ctx, bed, 330, 0.008));
    } else if (this.theme === "cave") {
      this.ambientNodes.push(...noiseBed(ctx, bed, 0.18, 160, 0.45));
      this.ambientNodes.push(...drone(ctx, bed, 48, 0.06));
      this.ambientNodes.push(...drone(ctx, bed, 72, 0.03));
    }
  }

  private blip(
    t: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.72), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseHit(t: number, dur: number, freq: number, gain: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, dur + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private mountControls(root: HTMLElement): void {
    const wrap = document.createElement("div");
    wrap.className = "audio-controls";
    wrap.setAttribute("aria-label", "Audio controls");

    const mute = document.createElement("button");
    mute.type = "button";
    mute.className = "audio-controls__mute";
    mute.title = "Mute / unmute";
    mute.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMute();
      this.playUi(this.muted ? "cancel" : "confirm");
    });

    const vol = document.createElement("input");
    vol.type = "range";
    vol.className = "audio-controls__volume";
    vol.min = "0";
    vol.max = "100";
    vol.step = "1";
    vol.title = "Volume";
    vol.addEventListener("input", () => {
      this.setVolume(Number(vol.value) / 100);
      if (this.muted && this.volume > 0) this.setMuted(false);
    });
    vol.addEventListener("change", () => this.playUi("beep"));

    wrap.append(mute, vol);
    root.append(wrap);
    this.muteBtn = mute;
    this.volInput = vol;
    this.syncControls();
  }

  private syncControls(): void {
    if (this.muteBtn) {
      const off = this.muted || this.volume <= 0.001;
      this.muteBtn.textContent = off ? "sound off" : "sound";
      this.muteBtn.setAttribute("aria-pressed", this.muted ? "true" : "false");
    }
    if (this.volInput) {
      this.volInput.value = String(Math.round(this.volume * 100));
    }
  }
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buf;
}

function noiseBed(
  ctx: AudioContext,
  dest: AudioNode,
  gain: number,
  cutoff: number,
  q: number,
): AudioNode[] {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 2.5);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start();
  return [src, filter, g];
}

function drone(ctx: AudioContext, dest: AudioNode, freq: number, gain: number): AudioNode[] {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.05 + Math.random() * 0.04;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = freq * 0.004;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  const g = ctx.createGain();
  g.gain.value = gain;
  osc.connect(g);
  g.connect(dest);
  osc.start();
  lfo.start();
  return [osc, lfo, lfoGain, g];
}
