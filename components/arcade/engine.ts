export type GameState = "idle" | "playing" | "paused" | "over";

export interface Palette {
  bg: string;
  fg: string;
  accent: string;
  route: string;
  card: string;
  border: string;
  muted: string;
  surface: string;
  mono: string;
}

export interface Hud {
  score: number;
  high: number;
  state: GameState;
  extra?: string;
}

export interface TouchButton {
  action: string;
  label: string;
  aria: string;
}

export interface TouchLayout {
  left: TouchButton[];
  right: TouchButton[];
}

export interface Game {
  readonly width: number;
  readonly height: number;
  readonly keymap: Readonly<Record<string, string>>;
  input(action: string, down: boolean): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D, p: Palette, t: number): void;
  pause(): void;
  releaseAll(): void;
  hud(): Hud;
}

export function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) =>
    s.getPropertyValue(name).trim() || fallback;
  const accent = v("--c-accent", "#FF4F00");
  return {
    bg: v("--c-bg", "#F1ECE1"),
    fg: v("--c-fg", "#17150F"),
    accent,
    route: v("--c-route", accent),
    card: v("--c-card", "#F8F5EE"),
    border: v("--c-border", "#D6CDBA"),
    muted: v("--c-muted", "#6E675A"),
    surface: v("--c-surface", "#E7E0D1"),
    mono: v("--font-mono", "ui-monospace, monospace"),
  };
}

export function loadHigh(id: string): number {
  try {
    const n = Number(localStorage.getItem(`arcade:${id}:high`));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveHigh(id: string, value: number): void {
  try {
    localStorage.setItem(`arcade:${id}:high`, String(value));
  } catch {
    /* storage unavailable */
  }
}

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

export const pad = (n: number, len = 6) =>
  String(Math.max(0, Math.floor(n))).padStart(len, "0");

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function text(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  str: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "left",
  weight = 400,
): void {
  ctx.font = `${weight} ${size}px ${p.mono}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(str, x, y);
}

export function frameTicks(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
  len = 8,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const pts: [number, number, number, number][] = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of pts) {
    ctx.moveTo(cx + 0.5, cy + sy * len);
    ctx.lineTo(cx + 0.5, cy + 0.5);
    ctx.lineTo(cx + sx * len, cy + 0.5);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  w: number,
  h: number,
  title: string,
  lines: string[],
  kicker?: string,
): void {
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  const cy = h / 2;
  if (kicker) text(ctx, p, kicker.toUpperCase(), w / 2, cy - 54, 11, p.accent, "center", 500);
  text(ctx, p, title.toUpperCase(), w / 2, cy - 22, 26, p.fg, "center", 700);
  lines.forEach((l, i) => text(ctx, p, l, w / 2, cy + 18 + i * 20, 12, p.muted, "center"));
  ctx.restore();
}

export abstract class BaseGame implements Game {
  abstract readonly width: number;
  abstract readonly height: number;
  abstract readonly keymap: Readonly<Record<string, string>>;
  protected abstract readonly title: string;
  protected abstract readonly startLines: string[];
  protected overTitle = "Game over";
  protected startOnAny = false;

  state: GameState = "idle";
  score = 0;
  high: number;
  protected held = new Set<string>();

  constructor(readonly id: string) {
    this.high = loadHigh(id);
  }

  protected abstract reset(): void;
  protected abstract step(dt: number): void;
  protected abstract draw(ctx: CanvasRenderingContext2D, p: Palette, t: number): void;
  protected abstract onAction(action: string, down: boolean): void;
  protected hudExtra(): string | undefined {
    return undefined;
  }
  protected overLines(): string[] {
    return [`Score ${this.score}`, `Best ${this.high}`, "Enter — play again"];
  }

  input(action: string, down: boolean): void {
    if (down) this.held.add(action);
    else this.held.delete(action);

    if (!down) {
      this.onAction(action, false);
      return;
    }
    if (action === "start") {
      if (this.state === "playing") this.pause();
      else if (this.state === "paused") this.resume();
      else this.begin();
      return;
    }
    if (action === "pause") {
      if (this.state === "playing") this.pause();
      else if (this.state === "paused") this.resume();
      return;
    }
    if (this.state === "idle") {
      if (this.startOnAny) {
        this.begin();
        this.onAction(action, true);
      }
      return;
    }
    if (this.state !== "playing") return;
    this.onAction(action, true);
  }

  begin(): void {
    this.score = 0;
    this.reset();
    this.state = "playing";
  }

  pause(): void {
    if (this.state === "playing") this.state = "paused";
  }

  resume(): void {
    if (this.state === "paused") this.state = "playing";
  }

  protected gameOver(): void {
    this.state = "over";
    if (this.score > this.high) {
      this.high = this.score;
      saveHigh(this.id, this.high);
    }
  }

  releaseAll(): void {
    for (const a of this.held) this.onAction(a, false);
    this.held.clear();
  }

  update(dt: number): void {
    if (this.state !== "playing") return;
    this.step(dt);
  }

  render(ctx: CanvasRenderingContext2D, p: Palette, t: number): void {
    this.draw(ctx, p, t);
    if (this.state === "idle") {
      drawOverlay(ctx, p, this.width, this.height, this.title, this.startLines, "ready");
    } else if (this.state === "paused") {
      drawOverlay(ctx, p, this.width, this.height, "Paused", ["P or Esc — resume"], "hold");
    } else if (this.state === "over") {
      drawOverlay(ctx, p, this.width, this.height, this.overTitle, this.overLines(), "signal lost");
    }
  }

  hud(): Hud {
    return { score: this.score, high: this.high, state: this.state, extra: this.hudExtra() };
  }
}
