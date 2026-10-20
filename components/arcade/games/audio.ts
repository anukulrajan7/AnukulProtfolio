// Arcade audio: designed WebAudio SFX (layered envelopes, filtered noise,
// slight random pitch, a short convolution tail) and a light generative music
// loop per game that ducks under big moments. No assets; everything is
// synthesised on first use. Off by default; one preference shared by all
// games, persisted in localStorage.

import type { MiniGameId } from "../types";

export type SfxName =
  // shared
  | "start"
  | "win"
  | "lose"
  | "level"
  | "pause"
  | "resume"
  | "ui-move"
  | "ui-select"
  | "ui-back"
  // stacker
  | "move"
  | "rotate"
  | "soft"
  | "drop"
  | "lock"
  | "clear"
  | "big"
  | "topout"
  // pingback
  | "fire"
  | "hit"
  | "explode"
  | "wave"
  | "life"
  | "die"
  // route
  | "turn"
  | "pickup"
  | "bonus"
  | "bump"
  | "crash";

const KEY_ON = "arcade:sound";
const KEY_VOL = "arcade:volume";
const KEY_MUSIC = "arcade:music";

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string): void {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface ToneOpts {
  f: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  at?: number;
  attack?: number;
  /** Random detune range in cents (applied symmetrically). */
  jitter?: number;
  /** 0..1 send to the reverb tail. */
  send?: number;
  /** Optional lowpass on the voice. */
  lp?: number;
  /** Second detuned oscillator for width. */
  spread?: number;
}

interface NoiseOpts {
  dur: number;
  vol?: number;
  at?: number;
  type?: BiquadFilterType;
  f?: number;
  to?: number;
  q?: number;
  send?: number;
  attack?: number;
}

/* ------------------------------------------------------------------ */
/* Music patterns                                                      */
/* ------------------------------------------------------------------ */

interface MusicStyle {
  bpm: number;
  root: number; // midi
  scale: number[]; // semitone offsets
  chords: number[][]; // scale-degree triads, cycled per bar
  bass: "pulse" | "walk" | "drone";
  lead: OscillatorType;
  leadDensity: number; // 0..1 chance per 8th
  hats: boolean;
  padLevel: number;
}

const STYLES: Record<MiniGameId, MusicStyle> = {
  // Stacker: brisk, puzzle-y, minor pentatonic with a steady pulse.
  stacker: { bpm: 112, root: 57, scale: [0, 3, 5, 7, 10, 12, 15], chords: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]], bass: "pulse", lead: "triangle", leadDensity: 0.55, hats: true, padLevel: 0.5 },
  // Pingback: spacier, dorian, slow bass, sparse sine plucks.
  pingback: { bpm: 92, root: 50, scale: [0, 2, 3, 5, 7, 9, 10, 12, 14], chords: [[0, 2, 4], [3, 5, 0], [1, 3, 5], [4, 6, 1]], bass: "drone", lead: "sine", leadDensity: 0.35, hats: false, padLevel: 0.9 },
  // Route: bouncy major pentatonic, walking bass, light hats.
  route: { bpm: 122, root: 60, scale: [0, 2, 4, 7, 9, 12, 14], chords: [[0, 2, 4], [3, 5, 0], [1, 3, 5], [4, 6, 1]], bass: "walk", lead: "triangle", leadDensity: 0.5, hats: true, padLevel: 0.4 },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/* ------------------------------------------------------------------ */

class ArcadeAudio {
  enabled = false;
  volume = 0.8;
  musicOn = true;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private reverbIn: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private thrustGain: GainNode | null = null;
  private thrustOn = false;
  private lastPlay: Partial<Record<SfxName, number>> = {};

  // music scheduler
  private musicGame: MiniGameId | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private musicLevel = 0.32;
  private duckUntil = 0;

  constructor() {
    this.enabled = lsGet(KEY_ON) === "1";
    const v = Number(lsGet(KEY_VOL));
    this.volume = Number.isFinite(v) && lsGet(KEY_VOL) !== null ? Math.min(1, Math.max(0, v)) : 0.8;
    this.musicOn = lsGet(KEY_MUSIC) !== "0";
  }

  /* ---------------- preferences ---------------- */

  setEnabled(on: boolean): void {
    this.enabled = on;
    lsSet(KEY_ON, on ? "1" : "0");
    if (on) {
      this.ensure();
      this.play("ui-select");
      if (this.musicGame) this.startMusic(this.musicGame);
    } else {
      this.stopMusic(true);
      this.setThrust(false);
    }
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    lsSet(KEY_VOL, String(this.volume));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume * this.volume, this.ctx.currentTime, 0.02);
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    lsSet(KEY_MUSIC, on ? "1" : "0");
    if (!on) this.stopMusic(false);
    else if (this.musicGame && this.enabled) this.startMusic(this.musicGame);
  }

  /** Create the graph. Call from a user gesture so the context can start. */
  ensure(): void {
    if (this.ctx || typeof window === "undefined") return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume * this.volume;
      // gentle safety limiter
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 18;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.18;
      this.master.connect(comp);
      comp.connect(ctx.destination);

      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);

      // short, dark convolution tail
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * 1.1);
      const ir = ctx.createBuffer(2, len, sr);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (i < 400 ? i / 400 : 1);
        }
      }
      const conv = ctx.createConvolver();
      conv.buffer = ir;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3200;
      this.reverbIn = ctx.createGain();
      this.reverbIn.gain.value = 1;
      this.reverbIn.connect(conv);
      conv.connect(lp);
      const wet = ctx.createGain();
      wet.gain.value = 0.28;
      lp.connect(wet);
      wet.connect(this.master);

      const nb = ctx.createBuffer(1, sr, sr);
      const nd = nb.getChannelData(0);
      for (let i = 0; i < sr; i++) nd[i] = Math.random() * 2 - 1;
      this.noiseBuf = nb;
    } catch {
      this.ctx = null;
    }
  }

  private ready(): AudioContext | null {
    if (!this.enabled) return null;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return null;
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  /* ---------------- voices ---------------- */

  private tone(o: ToneOpts): void {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus) return;
    const t0 = ctx.currentTime + (o.at ?? 0);
    const vol = o.vol ?? 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack ?? 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    let out: AudioNode = g;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = o.lp;
      g.connect(f);
      out = f;
    }
    out.connect(bus);
    if (o.send && this.reverbIn) {
      const s = ctx.createGain();
      s.gain.value = o.send;
      out.connect(s);
      s.connect(this.reverbIn);
    }
    const det = o.jitter ? rnd(-o.jitter, o.jitter) : 0;
    const voices = o.spread ? [-o.spread, o.spread] : [0];
    for (const sp of voices) {
      const osc = ctx.createOscillator();
      osc.type = o.type ?? "sine";
      osc.frequency.setValueAtTime(o.f, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
      osc.detune.value = det + sp;
      osc.connect(g);
      osc.start(t0);
      osc.stop(t0 + o.dur + 0.05);
    }
  }

  private noise(o: NoiseOpts): void {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus || !this.noiseBuf) return;
    const t0 = ctx.currentTime + (o.at ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.playbackRate.value = rnd(0.9, 1.1);
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? "lowpass";
    f.frequency.setValueAtTime(o.f ?? 1200, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t0 + o.dur);
    f.Q.value = o.q ?? 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t0 + (o.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    if (o.send && this.reverbIn) {
      const s = ctx.createGain();
      s.gain.value = o.send;
      g.connect(s);
      s.connect(this.reverbIn);
    }
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + o.dur + 0.05);
  }

  private arp(notes: number[], gap: number, dur: number, type: OscillatorType, vol: number, send = 0.3, jitter = 6): void {
    notes.forEach((f, i) => this.tone({ f, dur, type, vol, at: i * gap, send, jitter, spread: 4 }));
  }

  /* ---------------- SFX catalogue ---------------- */

  play(name: SfxName): void {
    const ctx = this.ready();
    if (!ctx) return;
    // rate-limit the chattiest ones
    const now = performance.now();
    const minGap = name === "move" || name === "soft" || name === "ui-move" ? 35 : name === "fire" ? 50 : 0;
    if (minGap && now - (this.lastPlay[name] ?? 0) < minGap) return;
    this.lastPlay[name] = now;

    switch (name) {
      /* shared */
      case "start":
        this.arp([523, 659, 784], 0.07, 0.18, "triangle", 0.3, 0.35);
        this.noise({ dur: 0.12, vol: 0.05, type: "highpass", f: 4000, send: 0.3 });
        break;
      case "win":
        this.arp([523, 659, 784, 1046, 1318], 0.09, 0.42, "triangle", 0.32, 0.5);
        this.tone({ f: 261, dur: 0.9, type: "sine", vol: 0.18, at: 0.18, send: 0.4, spread: 6 });
        this.noise({ dur: 0.5, vol: 0.05, type: "highpass", f: 6000, at: 0.3, send: 0.6 });
        this.duck(0.3, 1.0);
        break;
      case "lose":
        this.arp([392, 330, 262], 0.16, 0.5, "triangle", 0.3, 0.5, 4);
        this.noise({ dur: 0.6, vol: 0.1, f: 900, to: 120, send: 0.5 });
        this.duck(0.25, 1.2);
        break;
      case "level":
        this.arp([659, 880, 1174], 0.06, 0.22, "triangle", 0.26, 0.4);
        break;
      case "pause":
        this.tone({ f: 660, to: 440, dur: 0.14, type: "sine", vol: 0.22, send: 0.2 });
        break;
      case "resume":
        this.tone({ f: 440, to: 660, dur: 0.14, type: "sine", vol: 0.22, send: 0.2 });
        break;
      case "ui-move":
        this.tone({ f: 1800, dur: 0.035, type: "sine", vol: 0.1, jitter: 20 });
        this.noise({ dur: 0.03, vol: 0.04, type: "highpass", f: 5000 });
        break;
      case "ui-select":
        this.tone({ f: 660, to: 990, dur: 0.1, type: "sine", vol: 0.22, send: 0.25 });
        this.tone({ f: 1320, dur: 0.12, type: "sine", vol: 0.1, at: 0.05, send: 0.3 });
        break;
      case "ui-back":
        this.tone({ f: 880, to: 587, dur: 0.1, type: "sine", vol: 0.18, send: 0.2 });
        break;

      /* stacker */
      case "move":
        this.noise({ dur: 0.03, vol: 0.12, type: "bandpass", f: 2400, q: 2 });
        this.tone({ f: 240, dur: 0.035, type: "sine", vol: 0.12, jitter: 30 });
        break;
      case "rotate":
        this.tone({ f: 520, to: 760, dur: 0.07, type: "triangle", vol: 0.16, jitter: 25, send: 0.15 });
        this.noise({ dur: 0.03, vol: 0.06, type: "highpass", f: 3500 });
        break;
      case "soft":
        this.tone({ f: 180, dur: 0.03, type: "sine", vol: 0.08, jitter: 40 });
        break;
      case "drop":
        this.noise({ dur: 0.1, vol: 0.3, f: 700, to: 120 });
        this.tone({ f: 110, to: 50, dur: 0.16, type: "sine", vol: 0.5, send: 0.25 });
        this.tone({ f: 330, dur: 0.04, type: "triangle", vol: 0.1 });
        break;
      case "lock":
        this.noise({ dur: 0.06, vol: 0.14, f: 500, to: 150 });
        this.tone({ f: 140, to: 70, dur: 0.1, type: "sine", vol: 0.3, send: 0.15 });
        break;
      case "clear":
        this.arp([523, 659, 784], 0.055, 0.28, "triangle", 0.26, 0.45);
        this.noise({ dur: 0.25, vol: 0.08, type: "highpass", f: 5000, to: 9000, send: 0.5 });
        this.tone({ f: 130, dur: 0.3, type: "sine", vol: 0.25, send: 0.2 });
        this.duck(0.5, 0.4);
        break;
      case "big":
        this.arp([523, 659, 784, 1046], 0.06, 0.4, "square", 0.12, 0.5);
        this.arp([523, 659, 784, 1046], 0.06, 0.5, "triangle", 0.26, 0.6);
        this.noise({ dur: 0.5, vol: 0.12, type: "highpass", f: 3000, to: 10000, send: 0.7 });
        this.tone({ f: 98, dur: 0.6, type: "sine", vol: 0.35, send: 0.3 });
        this.duck(0.3, 0.9);
        break;
      case "topout":
        this.noise({ dur: 0.5, vol: 0.25, f: 1800, to: 90, send: 0.5 });
        this.tone({ f: 220, to: 55, dur: 0.6, type: "sawtooth", vol: 0.16, lp: 900, send: 0.4 });
        this.duck(0.2, 1.2);
        break;

      /* pingback */
      case "fire":
        this.tone({ f: 1100, to: 380, dur: 0.07, type: "square", vol: 0.07, jitter: 60, lp: 2600 });
        this.tone({ f: 1600, to: 600, dur: 0.05, type: "sine", vol: 0.12, jitter: 60 });
        this.noise({ dur: 0.04, vol: 0.08, type: "bandpass", f: 3000, q: 1.5 });
        break;
      case "hit":
        this.noise({ dur: 0.12, vol: 0.22, type: "bandpass", f: 1600, to: 500, q: 1.2, send: 0.3 });
        this.tone({ f: 720, to: 220, dur: 0.12, type: "triangle", vol: 0.2, jitter: 50, send: 0.25 });
        break;
      case "explode":
        this.noise({ dur: 0.38, vol: 0.32, f: 1400, to: 90, send: 0.5 });
        this.tone({ f: 90, to: 32, dur: 0.4, type: "sine", vol: 0.45, send: 0.3 });
        this.tone({ f: 420, to: 140, dur: 0.15, type: "triangle", vol: 0.14, jitter: 80 });
        this.duck(0.5, 0.4);
        break;
      case "wave":
        this.arp([587, 740, 880, 1175], 0.07, 0.3, "triangle", 0.24, 0.5);
        this.noise({ dur: 0.3, vol: 0.06, type: "highpass", f: 5000, send: 0.6 });
        this.duck(0.5, 0.6);
        break;
      case "life":
        this.arp([784, 988, 1175, 1568], 0.06, 0.3, "sine", 0.24, 0.5);
        break;
      case "die":
        this.noise({ dur: 0.6, vol: 0.3, f: 2200, to: 80, send: 0.6 });
        this.tone({ f: 300, to: 60, dur: 0.55, type: "sawtooth", vol: 0.16, lp: 1200, send: 0.4 });
        this.tone({ f: 70, to: 30, dur: 0.5, type: "sine", vol: 0.4 });
        this.duck(0.2, 1.4);
        break;

      /* route */
      case "turn":
        this.tone({ f: 900, dur: 0.03, type: "sine", vol: 0.08, jitter: 40 });
        this.noise({ dur: 0.025, vol: 0.05, type: "highpass", f: 4000 });
        break;
      case "pickup":
        this.tone({ f: 880, dur: 0.08, type: "sine", vol: 0.24, jitter: 15, send: 0.3 });
        this.tone({ f: 1320, dur: 0.16, type: "sine", vol: 0.2, at: 0.05, jitter: 15, send: 0.4 });
        this.noise({ dur: 0.05, vol: 0.05, type: "highpass", f: 6000 });
        break;
      case "bonus":
        this.arp([784, 988, 1318, 1760], 0.05, 0.26, "sine", 0.24, 0.5);
        this.noise({ dur: 0.3, vol: 0.07, type: "highpass", f: 6000, to: 11000, send: 0.6 });
        this.duck(0.55, 0.4);
        break;
      case "bump":
        this.noise({ dur: 0.06, vol: 0.14, f: 600, to: 200 });
        this.tone({ f: 160, to: 90, dur: 0.08, type: "sine", vol: 0.28 });
        break;
      case "crash":
        this.noise({ dur: 0.45, vol: 0.3, f: 1600, to: 100, send: 0.5 });
        this.tone({ f: 200, to: 50, dur: 0.5, type: "sawtooth", vol: 0.14, lp: 1000, send: 0.4 });
        this.tone({ f: 80, to: 35, dur: 0.4, type: "sine", vol: 0.4 });
        this.duck(0.2, 1.2);
        break;
    }
  }

  /** Continuous thruster rumble (Pingback). */
  setThrust(on: boolean): void {
    if (on === this.thrustOn) return;
    this.thrustOn = on;
    const ctx = on ? this.ready() : this.ctx;
    if (!ctx || !this.sfxBus || !this.noiseBuf) return;
    if (on) {
      if (!this.thrustGain) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 420;
        f.Q.value = 1.2;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 18;
        const lfoG = ctx.createGain();
        lfoG.gain.value = 120;
        lfo.connect(lfoG);
        lfoG.connect(f.frequency);
        lfo.start();
        this.thrustGain = ctx.createGain();
        this.thrustGain.gain.value = 0.0001;
        src.connect(f);
        f.connect(this.thrustGain);
        this.thrustGain.connect(this.sfxBus);
        src.start();
      }
      this.thrustGain.gain.cancelScheduledValues(ctx.currentTime);
      this.thrustGain.gain.setTargetAtTime(0.16, ctx.currentTime, 0.05);
    } else if (this.thrustGain) {
      this.thrustGain.gain.cancelScheduledValues(ctx.currentTime);
      this.thrustGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
    }
  }

  /* ---------------- music ---------------- */

  startMusic(game: MiniGameId): void {
    this.musicGame = game;
    if (!this.musicOn) return;
    const ctx = this.ready();
    if (!ctx || !this.musicBus) return;
    if (this.timer !== null) {
      this.musicBus.gain.setTargetAtTime(this.musicLevel, ctx.currentTime, 0.3);
      return;
    }
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(this.musicLevel, ctx.currentTime, 0.6);
    this.timer = window.setInterval(() => this.schedule(), 40);
  }

  stopMusic(hard: boolean): void {
    const ctx = this.ctx;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (ctx && this.musicBus) {
      this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
      this.musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, hard ? 0.05 : 0.25);
    }
  }

  /** Lower the music briefly for a big moment. */
  duck(level = 0.4, hold = 0.5): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus || this.timer === null) return;
    const t = ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(this.musicLevel * level, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.musicLevel, t + hold, 0.5);
    this.duckUntil = t + hold;
  }

  private schedule(): void {
    const ctx = this.ctx;
    const game = this.musicGame;
    if (!ctx || !game || !this.musicBus) return;
    const st = STYLES[game];
    const eighth = 60 / st.bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.2) {
      this.playStep(st, this.step, this.nextTime, eighth);
      this.step++;
      this.nextTime += eighth;
    }
  }

  private mnote(bus: GainNode, f: number, t: number, dur: number, type: OscillatorType, vol: number, lp = 2400, detune = 0): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    osc.detune.value = detune;
    const fl = ctx.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.value = lp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(fl);
    fl.connect(g);
    g.connect(bus);
    if (this.reverbIn) {
      const s = ctx.createGain();
      s.gain.value = 0.35;
      g.connect(s);
      s.connect(this.reverbIn);
    }
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private playStep(st: MusicStyle, step: number, t: number, eighth: number): void {
    const bus = this.musicBus!;
    const bar = Math.floor(step / 8);
    const beat = step % 8;
    const chord = st.chords[bar % st.chords.length];
    const deg = (d: number, oct = 0) => midi(st.root + st.scale[((d % st.scale.length) + st.scale.length) % st.scale.length] + 12 * (oct + Math.floor(d / st.scale.length)));

    // bass
    if (st.bass === "pulse" && (beat === 0 || beat === 4)) this.mnote(bus, deg(chord[0], -1), t, eighth * 1.8, "triangle", 0.5, 600);
    if (st.bass === "walk" && beat % 2 === 0) this.mnote(bus, deg(chord[(beat / 2) % 3], -1), t, eighth * 1.1, "triangle", 0.42, 700);
    if (st.bass === "drone" && beat === 0) this.mnote(bus, deg(chord[0], -1), t, eighth * 7.5, "sine", 0.4, 400);

    // pad (two detuned voices on the root + fifth, once per bar)
    if (beat === 0 && st.padLevel > 0) {
      this.mnote(bus, deg(chord[0]), t, eighth * 7.8, "sine", 0.1 * st.padLevel, 1200, -6);
      this.mnote(bus, deg(chord[2]), t, eighth * 7.8, "sine", 0.08 * st.padLevel, 1200, 6);
    }

    // lead: chord tones, occasional passing note, rests
    const seed = (bar * 31 + beat * 7) % 11;
    if (Math.random() < st.leadDensity && !(bar % 4 === 3 && beat > 4)) {
      const pool = beat % 2 === 0 ? chord : [...chord, chord[0] + 1, chord[1] + 1];
      const d = pool[(seed + Math.floor(Math.random() * pool.length)) % pool.length] + 7;
      this.mnote(bus, deg(d), t, eighth * (Math.random() < 0.3 ? 1.6 : 0.8), st.lead, 0.14, 2200);
    }

    // hats: soft filtered noise on off-beats
    if (st.hats && beat % 2 === 1 && this.noiseBuf) {
      const ctx = this.ctx!;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      src.connect(f);
      f.connect(g);
      g.connect(bus);
      src.start(t, Math.random() * 0.5);
      src.stop(t + 0.08);
    }
  }
}

let singleton: ArcadeAudio | null = null;
export function getAudio(): ArcadeAudio {
  if (!singleton) singleton = new ArcadeAudio();
  return singleton;
}
export type { ArcadeAudio };
