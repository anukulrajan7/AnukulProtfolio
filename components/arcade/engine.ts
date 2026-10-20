// Shared engine for the arcade mini-games: palette, juice (particles / shake /
// score pops), tiny WebAudio SFX, haptics, and the story-aware BaseGame.
// No React in here; game-shell.tsx owns the DOM.

import type { MiniGameGoal, MiniGameProps, MiniGameResult } from "./types";
import type { LevelParams } from "./games/levels";
import { getAudio } from "./games/audio";
import type { ArcadeAudio } from "./games/audio";

export type GameState = "idle" | "playing" | "paused" | "over";
export type Outcome = "won" | "lost";

/* ------------------------------------------------------------------ */
/* Palette: read from the site's CSS tokens so the games follow the    */
/* theme. Re-read on theme change by the shell (MutationObserver).     */
/* ------------------------------------------------------------------ */

export interface Palette {
  bg: string;
  fg: string;
  accent: string;
  route: string;
  card: string;
  border: string;
  muted: string;
  surface: string;
  sun: string;
  mint: string;
  lilac: string;
  sky: string;
  onAccent: string;
  ink: string;
  paper: string;
  mono: string;
  sans: string;
  display: string;
}

const SANS_FALLBACK = '"Satoshi", ui-sans-serif, system-ui, sans-serif';

export function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    bg: v("--c-bg", "#ffffff"),
    fg: v("--c-fg", "#121217"),
    accent: v("--c-accent", "#2e3bf0"),
    route: v("--c-route", "#ff5b38"),
    card: v("--c-card", "#ffffff"),
    border: v("--c-border", "#dedddc"),
    muted: v("--c-muted", "#55555f"),
    surface: v("--c-surface", "#f2f1ec"),
    sun: v("--c-sun", "#ffc83d"),
    mint: v("--p-4", "#3ddc97"),
    lilac: v("--p-5", "#c3b5ff"),
    sky: v("--p-6", "#8ed1fc"),
    onAccent: v("--c-on-accent", "#ffffff"),
    ink: v("--ink", "#121217"),
    paper: v("--paper", "#ffffff"),
    mono: v("--font-mono", "ui-monospace, SFMono-Regular, Menlo, monospace"),
    sans: v("--font-sans", SANS_FALLBACK),
    display: v("--font-display", SANS_FALLBACK),
  };
}

/* ------------------------------------------------------------------ */
/* Storage helpers                                                     */
/* ------------------------------------------------------------------ */

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export function loadHigh(id: string): number {
  const n = Number(lsGet(`arcade:${id}:high`));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function saveHigh(id: string, value: number): void {
  lsSet(`arcade:${id}:high`, String(value));
}

/** First-run flag: used by the shell to decide how loud the onboarding is. */
export function hasPlayed(id: string): boolean {
  return lsGet(`arcade:${id}:played`) === "1";
}

export function markPlayed(id: string): void {
  lsSet(`arcade:${id}:played`, "1");
}

/* ------------------------------------------------------------------ */
/* Math + drawing helpers                                              */
/* ------------------------------------------------------------------ */

export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
}

export const pad = (n: number, len = 6) => String(Math.max(0, Math.floor(n))).padStart(len, "0");
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export type FontKind = "sans" | "mono" | "display";

export function text(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  str: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "left",
  weight = 500,
  font: FontKind = "sans",
): void {
  const family = font === "mono" ? p.mono : font === "display" ? p.display : p.sans;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(str, x, y);
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

/** Workbench card: fill + 2px ink border + optional hard shadow. */
export function card(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  shadow = 0,
): void {
  ctx.save();
  if (shadow > 0) {
    ctx.fillStyle = p.fg;
    roundRectPath(ctx, x + shadow, y + shadow, w, h, r);
    ctx.fill();
  }
  ctx.fillStyle = fill;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = p.fg;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Juice: particles, score pops, screen shake, flash.                  */
/* Everything is disabled under prefers-reduced-motion.                */
/* ------------------------------------------------------------------ */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  shape: "dot" | "square" | "spark";
  gravity: number;
  spin: number;
  angle: number;
}

interface Pop {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  max: number;
}

interface BurstOpts {
  color: string | string[];
  speed?: number;
  size?: number;
  shape?: Particle["shape"];
  gravity?: number;
  life?: number;
  spread?: number;
  angle?: number;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export class Fx {
  private particles: Particle[] = [];
  private pops: Pop[] = [];
  private shakeAmp = 0;
  private shakeLeft = 0;
  private shakeDur = 0;
  private flashA = 0;
  private flashColor = "#fff";
  private mql: MediaQueryList | null = null;
  reduced = false;
  private onMql = () => {
    this.reduced = this.mql?.matches ?? false;
    if (this.reduced) this.clear();
  };

  constructor() {
    this.reduced = prefersReducedMotion();
    if (typeof window !== "undefined" && window.matchMedia) {
      this.mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.mql.addEventListener?.("change", this.onMql);
    }
  }

  dispose(): void {
    this.mql?.removeEventListener?.("change", this.onMql);
    this.clear();
  }

  clear(): void {
    this.particles.length = 0;
    this.pops.length = 0;
    this.shakeAmp = 0;
    this.shakeLeft = 0;
    this.flashA = 0;
  }

  active(): boolean {
    return this.particles.length > 0 || this.pops.length > 0 || this.shakeLeft > 0 || this.flashA > 0;
  }

  burst(x: number, y: number, n: number, o: BurstOpts): void {
    if (this.reduced) return;
    const colors = Array.isArray(o.color) ? o.color : [o.color];
    const speed = o.speed ?? 120;
    const spread = o.spread ?? Math.PI * 2;
    const base = o.angle ?? 0;
    for (let i = 0; i < n; i++) {
      const a = base + (Math.random() - 0.5) * spread;
      const s = speed * (0.35 + Math.random() * 0.85);
      const max = (o.life ?? 0.55) * (0.6 + Math.random() * 0.7);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: max,
        max,
        size: (o.size ?? 4) * (0.6 + Math.random() * 0.8),
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: o.shape ?? "dot",
        gravity: o.gravity ?? 0,
        spin: (Math.random() - 0.5) * 10,
        angle: Math.random() * Math.PI * 2,
      });
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  pop(x: number, y: number, str: string, color: string, size = 18): void {
    if (this.reduced) return;
    this.pops.push({ x, y, text: str, color, size, life: 0.9, max: 0.9 });
  }

  shake(amp: number, dur = 0.25): void {
    if (this.reduced) return;
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeLeft = Math.max(this.shakeLeft, dur);
    this.shakeDur = Math.max(this.shakeDur, dur);
  }

  flash(color: string, alpha = 0.35): void {
    if (this.reduced) return;
    this.flashColor = color;
    this.flashA = Math.max(this.flashA, alpha);
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      if (q.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      q.vy += q.gravity * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.97;
      q.vy *= 0.97;
      q.angle += q.spin * dt;
    }
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const q = this.pops[i];
      q.life -= dt;
      if (q.life <= 0) this.pops.splice(i, 1);
      else q.y -= 34 * dt;
    }
    if (this.shakeLeft > 0) {
      this.shakeLeft -= dt;
      if (this.shakeLeft <= 0) {
        this.shakeLeft = 0;
        this.shakeAmp = 0;
        this.shakeDur = 0;
      }
    }
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - dt * 2.2);
  }

  offset(): { x: number; y: number } {
    if (this.shakeLeft <= 0 || this.shakeAmp <= 0) return { x: 0, y: 0 };
    const k = this.shakeDur > 0 ? this.shakeLeft / this.shakeDur : 0;
    const a = this.shakeAmp * k;
    return { x: (Math.random() - 0.5) * 2 * a, y: (Math.random() - 0.5) * 2 * a };
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette): void {
    if (this.particles.length > 0) {
      ctx.save();
      for (const q of this.particles) {
        const k = q.life / q.max;
        ctx.globalAlpha = Math.min(1, k * 1.4);
        ctx.fillStyle = q.color;
        if (q.shape === "dot") {
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.size * (0.4 + 0.6 * k), 0, Math.PI * 2);
          ctx.fill();
        } else if (q.shape === "square") {
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.angle);
          const s = q.size * (0.5 + 0.5 * k);
          ctx.fillRect(-s / 2, -s / 2, s, s);
          ctx.strokeStyle = p.fg;
          ctx.lineWidth = 1;
          ctx.strokeRect(-s / 2, -s / 2, s, s);
          ctx.restore();
        } else {
          ctx.strokeStyle = q.color;
          ctx.lineWidth = Math.max(1, q.size * 0.5);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (this.pops.length > 0) {
      ctx.save();
      for (const q of this.pops) {
        const k = q.life / q.max;
        const grow = 1 + (1 - k) * 0.15;
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.font = `800 ${q.size * grow}px ${p.display}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = 5;
        ctx.strokeStyle = p.bg;
        ctx.strokeText(q.text, q.x, q.y);
        ctx.fillStyle = q.color;
        ctx.fillText(q.text, q.x, q.y);
      }
      ctx.restore();
    }
  }

  drawFlash(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.flashA <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.flashA;
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(-20, -20, w + 40, h + 40);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* Audio lives in games/audio.ts (designed SFX + music). getSfx() keeps  */
/* the old name for the games.                                          */
/* ------------------------------------------------------------------ */

export type { SfxName } from "./games/audio";
export function getSfx(): ArcadeAudio {
  return getAudio();
}

/** Haptics on touch devices only (desktop Chrome logs an intervention otherwise). */
export function haptic(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || typeof window === "undefined") return;
  if (!("vibrate" in navigator)) return;
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}

/* ------------------------------------------------------------------ */
/* Game contract used by the shell                                     */
/* ------------------------------------------------------------------ */

export interface Hint {
  desk: string;
  touch: string;
}

/**
 * DOM concept panel snapshot (Learn levels). Rendered by the shell beside the
 * canvas on desktop and as a collapsible strip above it on phones. Text lives
 * here, not on the canvas, so it stays readable at any canvas scale.
 */
export interface ConceptView {
  /** One-line summary for the collapsed mobile strip. */
  summary: string;
  code?: { lines: string[]; active?: number };
  lanes?: { id: string; label: string; icon?: string; items: string[]; note?: string }[];
  console?: { label?: string; items: string[]; total?: number };
  stats?: { label: string; value: string; tone?: "ok" | "warn" | "bad" }[];
  log?: { title: string; items: string[] };
  /** Blocking choice (e.g. Route gap card). Options map to actions c1..c4 and keys 1-4. */
  choice?: { kicker?: string; prompt: string; detail?: string; options: string[] };
  /**
   * Live settings the player tunes while playing (R6 display filters, R8
   * policies). Picking option j of control `id` sends the action `set:<id>:<j>`.
   * Rendered in the concept panel and in the pause menu.
   */
  controls?: { id: string; label: string; options: string[]; value: number; hint?: string }[];
}

export interface Announce {
  id: number;
  text: string;
}

export interface Hud {
  /** Concept-level mistakes ("slips"). Only Learn levels produce them. */
  slips: number;
  lastSlip?: string;
  /** Learn star meta (battery, freeze ms, batches...). */
  meta: Record<string, number>;
  concept?: ConceptView;
  announce?: Announce;
  score: number;
  high: number;
  state: GameState;
  extra?: string;
  mode: "free" | "story";
  progress: number;
  target?: number;
  timeLeft?: number;
  elapsedMs: number;
  outcome?: Outcome;
  newBest?: boolean;
  /** Tutorial prompt (teach-by-doing); shown as a sticky note by the shell. */
  hint?: Hint;
}

export interface TutorialStep extends Hint {
  done: () => boolean;
}

export interface Intro {
  kicker: string;
  title: string;
  goal?: string;
  timeLimit?: number;
  tips: string[];
}

export interface Outro {
  kicker: string;
  title: string;
  lines: string[];
}

export interface Gesture {
  kind: "tap" | "swipe";
  /** Dominant swipe direction (swipe only). */
  dir?: "up" | "down" | "left" | "right";
  /** Position in game units. */
  x: number;
  y: number;
}

export interface TouchButton {
  action: string;
  label: string;
  aria: string;
  wide?: boolean;
}

export interface TouchLayout {
  left: TouchButton[];
  right: TouchButton[];
}

export interface GameOptions {
  mode: "free" | "story";
  goal?: MiniGameGoal;
  flavor: NonNullable<MiniGameProps["flavor"]>;
  onFinish?: (result: MiniGameResult) => void;
  /** Level twists (play mode). Games read these in reset(). */
  params?: LevelParams;
  /** Allow "start" to begin a fresh run after a story-mode result (play mode). */
  restartable?: boolean;
  /** Labels for in-game entities (curriculum levels), keys are game-specific. */
  labels?: Record<string, string>;
  /** Positional overrides for the game's teach-by-doing step texts. */
  steps?: Hint[];
  /** Learn-track script (game-specific shape, see games/concepts/types.ts). */
  script?: unknown;
  /** Called alongside onFinish with Learn detail (slips, meta). */
  onFinishDetail?: (result: MiniGameResult, detail: { slips: number; meta: Record<string, number>; slipLog: string[] }) => void;
}

export interface Game {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly keymap: Readonly<Record<string, string>>;
  readonly mode: "free" | "story";
  input(action: string, down: boolean): void;
  gesture(g: Gesture): void;
  restart(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D, p: Palette, t: number): void;
  pause(): void;
  releaseAll(): void;
  animating(): boolean;
  hud(): Hud;
  intro(touch: boolean): Intro;
  outro(): Outro;
  progressLabel(): string;
  dispose(): void;
}

export abstract class BaseGame implements Game {
  abstract readonly width: number;
  abstract readonly height: number;
  abstract readonly keymap: Readonly<Record<string, string>>;
  protected abstract readonly title: string;
  protected abstract readonly defaultNoun: string;
  protected overTitle = "Game over";

  state: GameState = "idle";
  score = 0;
  high: number;
  progress = 0;
  elapsed = 0;
  outcome: Outcome | null = null;
  readonly mode: "free" | "story";
  readonly goal?: MiniGameGoal;
  protected readonly flavor: GameOptions["flavor"];
  protected readonly onFinish?: (result: MiniGameResult) => void;
  protected held = new Set<string>();
  protected fx = new Fx();
  protected sfx = getSfx();
  protected readonly params: LevelParams;
  protected readonly restartable: boolean;
  protected readonly labels: Record<string, string>;
  private readonly stepOverrides: Hint[];
  /** Teach-by-doing steps; the first one whose done() is false is the live hint. */
  protected tutorial: TutorialStep[] = [];
  private finished = false;
  private newBest = false;
  protected readonly script: unknown;
  private readonly onFinishDetail?: GameOptions["onFinishDetail"];
  slips = 0;
  protected slipLog: string[] = [];
  protected meta: Record<string, number> = {};
  private announceSeq = 0;
  private announcement: Announce | undefined;

  constructor(
    readonly id: string,
    opts: GameOptions,
  ) {
    this.mode = opts.mode;
    this.goal = opts.mode === "story" ? opts.goal : undefined;
    this.flavor = opts.flavor;
    this.onFinish = opts.onFinish;
    this.params = opts.params ?? {};
    this.restartable = opts.restartable ?? false;
    this.labels = opts.labels ?? {};
    this.stepOverrides = opts.steps ?? [];
    this.script = opts.script;
    this.onFinishDetail = opts.onFinishDetail;
    this.high = opts.mode === "free" ? loadHigh(id) : 0;
  }

  /** True on Learn-track levels (a script was supplied). */
  get learn(): boolean {
    return this.script !== undefined && this.script !== null;
  }

  /**
   * A concept mistake: not lethal. Counts against stars, plays a soft bump,
   * pops the short reason over (x, y) and announces it for screen readers.
   */
  protected slip(reason: string, x?: number, y?: number): void {
    this.slips++;
    this.slipLog.push(reason);
    this.sfx.play("bump");
    haptic(40);
    this.fx.shake(2.5, 0.15);
    const p = this.paletteHint;
    if (p) this.fx.pop(x ?? this.width / 2, y ?? this.height / 2 - 30, reason, p.route, 17);
    this.announce(`Slip: ${reason}`);
  }

  /** Polite screen-reader announcement for concept events. */
  protected announce(text: string): void {
    this.announcement = { id: ++this.announceSeq, text };
  }

  /** Game-specific DOM concept panel snapshot (Learn levels). */
  protected conceptView(): ConceptView | undefined {
    return undefined;
  }

  /** Extra win condition beyond progress >= target (e.g. "and survive 3 sweeps"). */
  protected extraWinMet(): boolean {
    return true;
  }

  /** Re-check the win after an extra condition changes. */
  protected checkWin(): void {
    if (this.state !== "playing") return;
    if (this.story && this.goal && this.progress >= this.goal.target && this.extraWinMet()) this.finish(true);
  }

  protected abstract reset(): void;
  protected abstract step(dt: number): void;
  protected abstract draw(ctx: CanvasRenderingContext2D, p: Palette, t: number): void;
  protected abstract onAction(action: string, down: boolean): void;
  protected abstract tips(touch: boolean): string[];

  /** Plural noun for the thing you collect / clear ("lines", "bugs", "deliveries"). */
  get noun(): string {
    return this.flavor.noun?.trim() || this.defaultNoun;
  }

  get displayTitle(): string {
    return this.flavor.title?.trim() || this.title;
  }

  get story(): boolean {
    return this.mode === "story";
  }

  protected hudExtra(): string | undefined {
    return undefined;
  }

  progressLabel(): string {
    return this.noun;
  }

  gesture(_g: Gesture): void {
    /* games opt in */
  }

  protected overLines(): string[] {
    return [];
  }

  input(action: string, down: boolean): void {
    if (down) this.held.add(action);
    else this.held.delete(action);

    if (!down) {
      this.onAction(action, false);
      return;
    }
    if (action === "pause") {
      if (this.state === "playing") this.pause();
      else if (this.state === "paused") this.resume();
      return;
    }
    if (action === "start") {
      if (this.state === "playing") this.pause();
      else if (this.state === "paused") this.resume();
      else if (this.state === "idle") this.begin();
      else if (this.state === "over" && (!this.story || this.restartable)) this.begin();
      return;
    }
    if (this.state === "idle") {
      // Any action starts the run and is applied immediately.
      this.begin();
      this.onAction(action, true);
      return;
    }
    if (this.state !== "playing") return;
    this.onAction(action, true);
  }

  begin(): void {
    this.score = 0;
    this.progress = 0;
    this.elapsed = 0;
    this.outcome = null;
    this.finished = false;
    this.newBest = false;
    this.slips = 0;
    this.slipLog = [];
    this.meta = {};
    this.announcement = undefined;
    this.fx.clear();
    this.tutorial = [];
    this.reset();
    if (this.stepOverrides.length > 0) {
      this.tutorial = this.tutorial.map((s, i) => (this.stepOverrides[i] ? { ...s, desk: this.stepOverrides[i].desk, touch: this.stepOverrides[i].touch } : s));
    }
    this.state = "playing";
    this.sfx.play("start");
    markPlayed(this.id);
  }

  /** Label for an entity key, if the level provides one. */
  protected label(key: string): string | undefined {
    const v = this.labels[key];
    return v && v.trim() ? v : undefined;
  }

  /** Restart from the result/pause screen (play mode). */
  restart(): void {
    if (this.state === "idle") return;
    this.begin();
  }

  private currentHint(): Hint | undefined {
    while (this.tutorial.length > 0 && this.tutorial[0].done()) {
      this.tutorial.shift();
      if (this.tutorial.length > 0) this.sfx.play("pickup");
    }
    const s = this.tutorial[0];
    return s ? { desk: s.desk, touch: s.touch } : undefined;
  }

  pause(): void {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.sfx.play("pause");
  }

  resume(): void {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.sfx.play("resume");
  }

  /** Story progress hook. Ends the run with a win when the target is reached. */
  protected addProgress(n: number): void {
    this.progress += n;
    this.checkWin();
  }

  /** The player died (or ran out of lives). */
  protected die(): void {
    if (this.story) this.finish(false);
    else this.gameOver();
  }

  private gameOver(): void {
    if (this.state === "over") return;
    this.state = "over";
    if (this.score > this.high) {
      this.high = this.score;
      this.newBest = true;
      saveHigh(this.id, this.high);
    }
    this.sfx.play("lose");
    haptic([60, 40, 60]);
  }

  protected finish(won: boolean): void {
    if (this.state === "over") return;
    this.state = "over";
    this.outcome = won ? "won" : "lost";
    this.sfx.play(won ? "win" : "lose");
    haptic(won ? [30, 30, 30, 30, 80] : [60, 40, 60]);
    if (won) {
      this.fx.flash(this.paletteHint?.sun ?? "#ffc83d", 0.3);
      this.fx.burst(this.width / 2, this.height / 2, 60, {
        color: [this.paletteHint?.accent ?? "#2e3bf0", this.paletteHint?.sun ?? "#ffc83d", this.paletteHint?.route ?? "#ff5b38", this.paletteHint?.mint ?? "#3ddc97"],
        speed: 260,
        size: 7,
        shape: "square",
        gravity: 240,
        life: 1.1,
      });
    }
    if (!this.finished) {
      this.finished = true;
      const result = {
        won,
        score: this.score,
        progress: this.progress,
        durationMs: Math.round(this.elapsed * 1000),
      };
      this.onFinish?.(result);
      this.onFinishDetail?.(result, { slips: this.slips, meta: { ...this.meta }, slipLog: [...this.slipLog] });
    }
  }

  /** Last palette seen by render(); lets logic code pick token colours. */
  protected paletteHint: Palette | null = null;

  releaseAll(): void {
    for (const a of this.held) this.onAction(a, false);
    this.held.clear();
  }

  timeLeft(): number | undefined {
    if (!this.story || !this.goal?.timeLimit) return undefined;
    return Math.max(0, this.goal.timeLimit - this.elapsed);
  }

  update(dt: number): void {
    if (this.state === "playing") {
      this.step(dt);
      if (this.state === "playing") {
        this.elapsed += dt;
        const left = this.timeLeft();
        if (left !== undefined && left <= 0) this.finish(false);
      }
    }
    if (this.state !== "paused") this.fx.update(dt);
  }

  animating(): boolean {
    return this.state !== "paused" && this.fx.active();
  }

  render(ctx: CanvasRenderingContext2D, p: Palette, t: number): void {
    this.paletteHint = p;
    const o = this.fx.offset();
    ctx.save();
    ctx.translate(o.x, o.y);
    this.draw(ctx, p, t);
    this.fx.draw(ctx, p);
    ctx.restore();
    this.fx.drawFlash(ctx, this.width, this.height);
  }

  hud(): Hud {
    return {
      slips: this.slips,
      lastSlip: this.slipLog[this.slipLog.length - 1],
      meta: this.meta,
      concept: this.learn ? this.conceptView() : undefined,
      announce: this.announcement,
      score: this.score,
      high: this.high,
      state: this.state,
      extra: this.hudExtra(),
      mode: this.mode,
      progress: this.progress,
      target: this.goal?.target,
      timeLeft: this.timeLeft(),
      elapsedMs: Math.round(this.elapsed * 1000),
      outcome: this.outcome ?? undefined,
      newBest: this.newBest,
      hint: this.state === "playing" ? this.currentHint() : undefined,
    };
  }

  intro(touch: boolean): Intro {
    return {
      kicker: this.story ? "Challenge" : hasPlayed(this.id) ? "Ready?" : "How to play",
      title: this.displayTitle,
      goal: this.goal?.label,
      timeLimit: this.goal?.timeLimit,
      tips: this.tips(touch),
    };
  }

  outro(): Outro {
    if (this.story) {
      const won = this.outcome === "won";
      const lines = [
        `Score ${this.score.toLocaleString()}`,
        `Time ${fmtTime(this.elapsed)}`,
        ...this.overLines(),
      ];
      return {
        kicker: won ? "Challenge complete" : "Not this time",
        title: won ? "Nice work" : this.timeLeft() === 0 ? "Out of time" : this.overTitle,
        lines,
      };
    }
    return {
      kicker: this.newBest ? "New personal best" : "Run over",
      title: this.overTitle,
      lines: [`Score ${this.score.toLocaleString()}`, `Best ${this.high.toLocaleString()}`, ...this.overLines()],
    };
  }

  dispose(): void {
    this.fx.dispose();
  }
}
