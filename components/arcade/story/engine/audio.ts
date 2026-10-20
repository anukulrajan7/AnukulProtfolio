// Sound design, all synthesised in WebAudio (no files). Off by default.
// Buses: music (generative lo-fi, ducks under dialogue), ambient (room tone per
// scene), sfx (steps, UI), voice (Tab blips, typewriter ticks).
export type Bed = "off" | "desk" | "street" | "underpass" | "basement" | "office";
export type Ui = "accept" | "reject" | "inspect" | "keepsake" | "chapter" | "pick" | "glint" | "advance" | "chai" | "buzz" | "pocket";

interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}

export class Audio {
  private ac: AudioContext | null = null;
  private master!: GainNode;
  private comp!: DynamicsCompressorNode;
  private music!: GainNode;
  private amb!: GainNode;
  private sfx!: GainNode;
  private voice!: GainNode;
  private enabled = false;
  private volume = 0.8;
  private bed: Bed = "off";
  private bedNodes: AudioNode[] = [];
  private bedGain: GainNode | null = null;
  private bedTimer = 0;
  private noise: AudioBuffer | null = null;
  private musicTimer = 0;
  private nextBar = 0;
  private bar = 0;
  private ducked = false;
  private stepSide = 1;
  private inspectVoice: Voice | null = null;
  tempo = 74;

  get on() {
    return this.enabled && !!this.ac;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) {
      this.ensure();
      if (this.ac) {
        void this.ac.resume();
        this.master.gain.setTargetAtTime(this.volume, this.ac.currentTime, 0.05);
        this.startMusic();
        this.applyBed(this.bed, true);
      }
    } else if (this.ac) {
      this.master.gain.setTargetAtTime(0, this.ac.currentTime, 0.05);
      this.stopMusic();
      this.applyBed("off", false);
    }
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ac && this.enabled) this.master.gain.setTargetAtTime(v, this.ac.currentTime, 0.05);
  }

  suspend() {
    if (this.ac && this.ac.state === "running") void this.ac.suspend();
  }
  resume() {
    if (this.ac && this.enabled && this.ac.state === "suspended") void this.ac.resume();
  }

  private ensure() {
    if (this.ac || typeof window === "undefined") return;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ac = new Ctor();
      this.ac = ac;
      this.comp = ac.createDynamicsCompressor();
      this.comp.threshold.value = -18;
      this.comp.knee.value = 20;
      this.comp.ratio.value = 4;
      this.comp.attack.value = 0.01;
      this.comp.release.value = 0.2;
      this.master = ac.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.comp).connect(ac.destination);
      const bus = (g: number) => {
        const n = ac.createGain();
        n.gain.value = g;
        n.connect(this.master);
        return n;
      };
      this.music = bus(0.32);
      this.amb = bus(0.5);
      this.sfx = bus(0.55);
      this.voice = bus(0.45);
      const len = ac.sampleRate * 2;
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      let b = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b = (b + 0.02 * w) / 1.02; // brown-ish
        d[i] = b * 3.5;
      }
      this.noise = buf;
    } catch {
      this.ac = null;
    }
  }

  /* ---------------- ambient beds ---------------- */

  setBed(bed: Bed) {
    if (bed === this.bed) return;
    this.bed = bed;
    if (this.on) this.applyBed(bed, true);
  }

  private applyBed(bed: Bed, fadeIn: boolean) {
    const ac = this.ac!;
    if (this.bedGain) {
      const old = this.bedGain;
      const oldNodes = this.bedNodes;
      old.gain.setTargetAtTime(0, ac.currentTime, 0.3);
      window.setTimeout(() => oldNodes.forEach((n) => (n as OscillatorNode).stop?.()), 1200);
      this.bedGain = null;
      this.bedNodes = [];
    }
    window.clearInterval(this.bedTimer);
    if (bed === "off" || !fadeIn) return;
    const g = ac.createGain();
    g.gain.value = 0;
    g.connect(this.amb);
    g.gain.setTargetAtTime(1, ac.currentTime, 0.6);
    this.bedGain = g;
    const nodes: AudioNode[] = [];
    const src = (gain: number, freq: number, q = 0.7) => {
      const s = ac.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      s.playbackRate.value = 0.7 + Math.random() * 0.3;
      const f = ac.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = freq;
      f.Q.value = q;
      const vg = ac.createGain();
      vg.gain.value = gain;
      s.connect(f).connect(vg).connect(g);
      s.start();
      nodes.push(s);
      return { f, vg };
    };
    const hum = (freq: number, gain: number, type: OscillatorType = "sine") => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const vg = ac.createGain();
      vg.gain.value = gain;
      o.connect(vg).connect(g);
      o.start();
      nodes.push(o);
      return { o, vg };
    };
    const lfo = (param: AudioParam, rate: number, depth: number) => {
      const o = ac.createOscillator();
      o.frequency.value = rate;
      const vg = ac.createGain();
      vg.gain.value = depth;
      o.connect(vg).connect(param);
      o.start();
      nodes.push(o);
    };
    let chirp: () => void = () => {};
    if (bed === "street") {
      const t = src(0.16, 380); // city wash
      lfo(t.f.frequency, 0.08, 120); // traffic swells
      src(0.05, 1800, 0.3);
      chirp = () => (Math.random() < 0.55 ? this.bird() : this.horn());
      this.bedTimer = window.setInterval(chirp, 2600);
    } else if (bed === "underpass") {
      const t = src(0.2, 140, 2);
      lfo(t.f.frequency, 0.15, 40);
      hum(55, 0.02);
      this.bedTimer = window.setInterval(() => this.drip(), 3200);
    } else if (bed === "basement") {
      src(0.1, 220);
      hum(100, 0.012);
      this.bedTimer = window.setInterval(() => this.clink(), 2800);
    } else if (bed === "desk") {
      const fan = hum(62, 0.035);
      lfo(fan.vg.gain, 0.9, 0.012); // fan wobble
      hum(124, 0.012);
      src(0.05, 300);
      this.bedTimer = window.setInterval(() => this.cricket(), 1400);
    } else if (bed === "office") {
      src(0.09, 600);
      hum(120, 0.01, "triangle");
      this.bedTimer = window.setInterval(() => (Math.random() < 0.4 ? this.keyclick() : null), 900);
    }
    this.bedNodes = nodes;
  }

  private tone(bus: GainNode, f0: number, f1: number, dur: number, gain: number, type: OscillatorType = "sine", at = 0, pan = 0) {
    const ac = this.ac!;
    const t = ac.currentTime + at;
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out: AudioNode = g;
    if (pan && ac.createStereoPanner) {
      const p = ac.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      out = p;
    }
    o.connect(g);
    out.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  private burst(bus: GainNode, freq: number, q: number, dur: number, gain: number, pan = 0, type: BiquadFilterType = "bandpass") {
    const ac = this.ac!;
    if (!this.noise) return;
    const s = ac.createBufferSource();
    s.buffer = this.noise;
    s.playbackRate.value = 1.5 + Math.random();
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    const t = ac.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out: AudioNode = g;
    if (pan && ac.createStereoPanner) {
      const p = ac.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      out = p;
    }
    s.connect(f).connect(g);
    out.connect(bus);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.02);
  }

  private bird() {
    if (!this.on) return;
    const n = 2 + Math.floor(Math.random() * 3);
    const base = 2600 + Math.random() * 900;
    for (let i = 0; i < n; i++) this.tone(this.amb, base, base * 1.25, 0.07, 0.03, "sine", i * 0.11, 0.5 - Math.random());
  }
  private horn() {
    if (!this.on) return;
    this.tone(this.amb, 400 + Math.random() * 80, 395, 0.22, 0.012, "triangle", 0, Math.random() - 0.5);
  }
  private drip() {
    if (!this.on) return;
    this.tone(this.amb, 1400, 900, 0.14, 0.02, "sine", 0, Math.random() - 0.5);
  }
  private clink() {
    if (!this.on) return;
    this.tone(this.amb, 2200 + Math.random() * 600, 2100, 0.09, 0.012, "triangle", 0, 0.3);
  }
  private cricket() {
    if (!this.on || Math.random() < 0.3) return;
    for (let i = 0; i < 4; i++) this.tone(this.amb, 4200, 4100, 0.025, 0.006, "sine", i * 0.055, 0.4);
  }
  private keyclick() {
    if (!this.on) return;
    this.burst(this.amb, 2500, 2, 0.02, 0.03, Math.random() - 0.5);
  }

  /* ---------------- sfx ---------------- */

  step(surface: "street" | "floor" | "stairs" = "street") {
    if (!this.on) return;
    this.stepSide = -this.stepSide;
    const f = surface === "floor" ? 220 : surface === "stairs" ? 500 : 340;
    this.burst(this.sfx, f * (0.85 + Math.random() * 0.3), 1.2, 0.07, 0.11, this.stepSide * 0.25, "lowpass");
    this.burst(this.sfx, 1400, 1, 0.025, 0.025, this.stepSide * 0.25);
  }

  tick() {
    if (!this.on) return;
    this.burst(this.voice, 1800 + Math.random() * 1200, 3, 0.012, 0.04);
  }

  /** Tab speaks: one blip per syllable, pentatonic, slightly too eager. */
  tabBlip(i: number, mood: "eager" | "neutral" | "low" = "neutral") {
    if (!this.on) return;
    const scale = [0, 2, 4, 7, 9, 12];
    const base = mood === "eager" ? 660 : mood === "low" ? 440 : 560;
    const n = scale[(i * 7 + Math.floor(Math.random() * 2)) % scale.length];
    const f = base * Math.pow(2, n / 12);
    this.tone(this.voice, f, f * 1.03, 0.06, 0.06, "triangle");
    this.tone(this.voice, f * 2, f * 2, 0.03, 0.015, "sine");
  }

  /** Human mumble: low, lowpassed, soft. */
  humBlip(i: number, pitch = 1) {
    if (!this.on) return;
    const f = (180 + (i % 3) * 22 + Math.random() * 20) * pitch;
    this.tone(this.voice, f, f * 0.96, 0.07, 0.035, "triangle");
  }

  ui(k: Ui) {
    if (!this.on) return;
    const s = this.sfx;
    switch (k) {
      case "accept":
        this.tone(s, 523, 523, 0.12, 0.07);
        this.tone(s, 659, 659, 0.16, 0.06, "sine", 0.08);
        break;
      case "reject":
        this.tone(s, 262, 220, 0.18, 0.06, "triangle");
        break;
      case "inspect":
        this.tone(s, 380, 760, 0.25, 0.03, "sine");
        break;
      case "keepsake":
        [523, 659, 784, 1047].forEach((f, i) => {
          this.tone(s, f, f, 0.35, 0.05, "sine", i * 0.09);
          this.tone(s, f * 2.01, f * 2, 0.2, 0.012, "sine", i * 0.09);
        });
        break;
      case "chapter":
        [196, 294, 392].forEach((f, i) => this.tone(s, f, f, 0.9, 0.04, "triangle", i * 0.05));
        break;
      case "pick":
        this.tone(s, 700, 900, 0.05, 0.04, "triangle");
        break;
      case "glint":
        this.tone(s, 1568, 1568, 0.09, 0.02, "sine");
        break;
      case "advance":
        this.burst(s, 900, 1.5, 0.03, 0.04);
        break;
      case "chai":
        this.tone(s, 1200, 1180, 0.06, 0.03, "triangle");
        this.burst(s, 500, 0.8, 0.25, 0.05, 0, "lowpass");
        break;
      case "buzz":
        this.tone(s, 90, 90, 0.18, 0.06, "square");
        this.tone(s, 90, 90, 0.18, 0.06, "square", 0.25);
        break;
      case "pocket":
        this.burst(s, 600, 0.9, 0.08, 0.06, 0, "lowpass");
        break;
    }
  }

  inspectHold(on: boolean) {
    if (!this.on) {
      this.inspectVoice = null;
      return;
    }
    const ac = this.ac!;
    if (on && !this.inspectVoice) {
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 220;
      const gain = ac.createGain();
      gain.gain.value = 0.0001;
      gain.gain.setTargetAtTime(0.025, ac.currentTime, 0.1);
      osc.frequency.setTargetAtTime(330, ac.currentTime, 0.4);
      osc.connect(gain).connect(this.sfx);
      osc.start();
      this.inspectVoice = { osc, gain };
    } else if (!on && this.inspectVoice) {
      const v = this.inspectVoice;
      v.gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.08);
      v.osc.stop(ac.currentTime + 0.4);
      this.inspectVoice = null;
    }
  }

  /* ---------------- music: generative lo-fi ---------------- */

  duck(on: boolean) {
    if (this.ducked === on) return;
    this.ducked = on;
    if (!this.ac) return;
    this.music.gain.setTargetAtTime(on ? 0.14 : 0.32, this.ac.currentTime, 0.15);
  }

  private startMusic() {
    if (this.musicTimer || !this.ac) return;
    this.nextBar = this.ac.currentTime + 0.2;
    this.bar = 0;
    this.musicTimer = window.setInterval(() => this.schedule(), 120);
  }
  private stopMusic() {
    window.clearInterval(this.musicTimer);
    this.musicTimer = 0;
  }

  private schedule() {
    const ac = this.ac!;
    const barLen = (60 / this.tempo) * 4;
    while (this.nextBar < ac.currentTime + 0.4) {
      this.playBar(this.nextBar, barLen);
      this.nextBar += barLen;
      this.bar++;
    }
  }

  private rhodes(f: number, t: number, dur: number, g: number) {
    const ac = this.ac!;
    const out = ac.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(g, t + 0.015);
    out.gain.exponentialRampToValueAtTime(g * 0.35, t + dur * 0.4);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1600;
    out.connect(lp).connect(this.music);
    const parts: [number, number, OscillatorType][] = [
      [1, 1, "sine"],
      [1.003, 0.5, "sine"],
      [2, 0.22, "sine"],
      [3, 0.05, "triangle"],
    ];
    for (const [m, a, type] of parts) {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = f * m;
      const pg = ac.createGain();
      pg.gain.value = a;
      o.connect(pg).connect(out);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  private kick(t: number) {
    const ac = this.ac!;
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.3);
  }

  private hat(t: number, g = 0.012) {
    const ac = this.ac!;
    if (!this.noise) return;
    const s = ac.createBufferSource();
    s.buffer = this.noise;
    s.playbackRate.value = 3;
    const f = ac.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 6000;
    const vg = ac.createGain();
    vg.gain.setValueAtTime(g, t);
    vg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(vg).connect(this.music);
    s.start(t, Math.random());
    s.stop(t + 0.08);
  }

  private playBar(t: number, barLen: number) {
    // Fmaj7 · Am7 · Dm7 · Gm7(add9) in C, voiced low to mid. Midi numbers.
    const prog = [
      [53, 60, 64, 69],
      [57, 60, 64, 67],
      [50, 57, 60, 65],
      [55, 58, 62, 65],
    ];
    const chord = prog[this.bar % 4];
    const beat = barLen / 4;
    const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    // Pad chord on 1, softly re-struck on the "and" of 3 every other bar.
    for (const m of chord) this.rhodes(hz(m), t + Math.random() * 0.02, beat * 3.2, 0.05);
    if (this.bar % 2 === 1) for (const m of chord.slice(1)) this.rhodes(hz(m + 12), t + beat * 2.5, beat * 1.4, 0.022);
    // A little melody note on beat 4 sometimes.
    if (Math.random() < 0.6) this.rhodes(hz(chord[(this.bar + 1) % 4] + 12), t + beat * 3 + (Math.random() < 0.5 ? 0 : beat / 2), beat * 0.9, 0.03);
    this.kick(t);
    this.kick(t + beat * 2.5);
    if (Math.random() < 0.7) this.kick(t + beat * 3.5);
    for (let i = 0; i < 8; i++) if (i % 2 === 1) this.hat(t + (i * beat) / 2, 0.008 + Math.random() * 0.006);
    // vinyl crackle
    for (let i = 0; i < 3; i++) if (Math.random() < 0.5) this.hat(t + Math.random() * barLen, 0.004);
  }
}

export const audio = new Audio();
