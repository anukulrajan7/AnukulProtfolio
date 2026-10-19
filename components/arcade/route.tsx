"use client";

import { BaseGame, frameTicks, lerp, pad, Rng, text } from "./engine";
import type { Palette, TouchLayout } from "./engine";
import { GameShell } from "./game-shell";

const N = 22;
const CELL = 24;
const HUD_H = 40;
const GRID = N * CELL;
const WIDTH = GRID;
const HEIGHT = GRID + HUD_H;
const BASE_INTERVAL = 0.165;
const MIN_INTERVAL = 0.062;
const BONUS_TTL = 5;
const BONUS_GAP_MIN = 7;
const BONUS_GAP_MAX = 13;

interface Cell {
  x: number;
  y: number;
}

interface Bonus extends Cell {
  ttl: number;
}

type Dir = "up" | "down" | "left" | "right";
const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

function buildContours(): Path2D {
  const rng = new Rng(20260419);
  const path = new Path2D();
  const lines = 11;
  for (let k = 0; k < lines; k++) {
    const baseY = (k + 0.5) * (GRID / lines);
    const a1 = rng.range(10, 20);
    const a2 = rng.range(4, 9);
    const f1 = rng.range(0.009, 0.014);
    const f2 = rng.range(0.022, 0.03);
    const ph1 = rng.range(0, Math.PI * 2);
    const ph2 = rng.range(0, Math.PI * 2);
    for (let x = 0; x <= GRID; x += 8) {
      const y = baseY + a1 * Math.sin(x * f1 + ph1) + a2 * Math.sin(x * f2 + ph2);
      if (x === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
  }
  return path;
}

class RouteGame extends BaseGame {
  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly keymap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    KeyW: "up",
    KeyS: "down",
    KeyA: "left",
    KeyD: "right",
    Space: "start",
    KeyP: "pause",
    Escape: "pause",
    Enter: "start",
  } as const;
  protected readonly title = "Route";
  protected readonly startLines = [
    "Any arrow — start",
    "Collect waypoints. Edges are off-map.",
    "Orange pings expire. They pay more.",
  ];
  protected overTitle = "Off route";
  protected startOnAny = true;

  private contours: Path2D | null = null;
  private snake: Cell[] = [];
  private prev: Cell[] = [];
  private dir: Dir = "right";
  private queue: Dir[] = [];
  private tick = 0;
  private interval = BASE_INTERVAL;
  private ping: Cell = { x: 0, y: 0 };
  private bonus: Bonus | null = null;
  private bonusTimer = 0;
  private eaten = 0;
  private grow = 0;
  private pulse = 0;
  private deadAt: Cell | null = null;

  constructor() {
    super("route");
    this.reset();
  }

  protected reset(): void {
    const cy = Math.floor(N / 2);
    const cx = Math.floor(N / 2) - 2;
    this.snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
      { x: cx - 3, y: cy },
    ];
    this.prev = this.snake.map((c) => ({ ...c }));
    this.dir = "right";
    this.queue = [];
    this.tick = 0;
    this.interval = BASE_INTERVAL;
    this.eaten = 0;
    this.grow = 0;
    this.bonus = null;
    this.bonusTimer = BONUS_GAP_MIN + Math.random() * (BONUS_GAP_MAX - BONUS_GAP_MIN);
    this.deadAt = null;
    this.pulse = 0;
    this.placePing();
  }

  protected hudExtra(): string {
    return `LEN ${String(this.snake.length).padStart(3, "0")} · ${(BASE_INTERVAL / this.interval).toFixed(1)}x`;
  }

  protected overLines(): string[] {
    return [`Score ${this.score}`, `Best ${this.high}`, `Trail length ${this.snake.length}`, "Enter — play again"];
  }

  private occupied(c: Cell): boolean {
    return (
      this.snake.some((s) => s.x === c.x && s.y === c.y) ||
      (this.ping.x === c.x && this.ping.y === c.y) ||
      (this.bonus !== null && this.bonus.x === c.x && this.bonus.y === c.y)
    );
  }

  private freeCell(): Cell | null {
    for (let i = 0; i < 200; i++) {
      const c = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
      if (!this.occupied(c)) return c;
    }
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (!this.occupied({ x, y })) return { x, y };
      }
    }
    return null;
  }

  private placePing(): void {
    const c = this.freeCell();
    if (c) this.ping = c;
  }

  protected onAction(action: string, down: boolean): void {
    if (!down) return;
    if (action !== "up" && action !== "down" && action !== "left" && action !== "right") return;
    const last = this.queue.length > 0 ? this.queue[this.queue.length - 1] : this.dir;
    if (action === last || action === OPPOSITE[last]) return;
    if (this.queue.length < 2) this.queue.push(action);
  }

  private advance(): void {
    if (this.queue.length > 0) this.dir = this.queue.shift() as Dir;
    const d = DELTA[this.dir];
    const head = this.snake[0];
    const next = { x: head.x + d.x, y: head.y + d.y };

    this.prev = this.snake.map((c) => ({ ...c }));

    if (next.x < 0 || next.y < 0 || next.x >= N || next.y >= N) {
      this.deadAt = head;
      this.gameOver();
      return;
    }
    const willGrow = this.grow > 0;
    const bodyEnd = willGrow ? this.snake.length : this.snake.length - 1;
    for (let i = 0; i < bodyEnd; i++) {
      if (this.snake[i].x === next.x && this.snake[i].y === next.y) {
        this.deadAt = next;
        this.gameOver();
        return;
      }
    }

    this.snake.unshift(next);
    if (willGrow) this.grow--;
    else this.snake.pop();

    if (next.x === this.ping.x && next.y === this.ping.y) {
      this.eaten++;
      this.grow += 1;
      this.score += 10 + Math.floor(this.eaten / 5) * 2;
      this.interval = Math.max(MIN_INTERVAL, BASE_INTERVAL * Math.pow(0.965, this.eaten));
      this.pulse = 1;
      this.placePing();
    }
    if (this.bonus && next.x === this.bonus.x && next.y === this.bonus.y) {
      this.score += 50;
      this.grow += 2;
      this.bonus = null;
      this.pulse = 1;
      this.bonusTimer = BONUS_GAP_MIN + Math.random() * (BONUS_GAP_MAX - BONUS_GAP_MIN);
    }
  }

  protected step(dt: number): void {
    this.pulse = Math.max(0, this.pulse - dt * 2.5);
    this.tick += dt;
    while (this.tick >= this.interval && this.state === "playing") {
      this.tick -= this.interval;
      this.advance();
    }
    if (this.bonus) {
      this.bonus.ttl -= dt;
      if (this.bonus.ttl <= 0) {
        this.bonus = null;
        this.bonusTimer = BONUS_GAP_MIN + Math.random() * (BONUS_GAP_MAX - BONUS_GAP_MIN);
      }
    } else {
      this.bonusTimer -= dt;
      if (this.bonusTimer <= 0) {
        const c = this.freeCell();
        if (c) this.bonus = { ...c, ttl: BONUS_TTL };
      }
    }
  }

  private centre(c: Cell): Cell {
    return { x: c.x * CELL + CELL / 2, y: HUD_H + c.y * CELL + CELL / 2 };
  }

  private drawPin(ctx: CanvasRenderingContext2D, p: Palette, c: Cell, t: number, color: string, label: string): void {
    const { x, y } = this.centre(c);
    const r = 4 + Math.sin(t * 5) * 0.8;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 9 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      ctx.moveTo(x + dx * 11, y + dy * 11);
      ctx.lineTo(x + dx * 14, y + dy * 14);
    }
    ctx.stroke();
    if (label) text(ctx, p, label, x, y - 18, 9, color, "center", 500);
    ctx.restore();
  }

  protected draw(ctx: CanvasRenderingContext2D, p: Palette, t: number): void {
    if (!this.contours) this.contours = buildContours();

    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.translate(0, HUD_H);
    ctx.fillStyle = p.card;
    ctx.fillRect(0, 0, GRID, GRID);
    ctx.strokeStyle = p.fg;
    ctx.globalAlpha = 0.09;
    ctx.lineWidth = 1;
    ctx.stroke(this.contours);
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.border;
    for (let x = 1; x < N; x++) {
      for (let y = 1; y < N; y++) ctx.fillRect(x * CELL - 0.5, y * CELL - 0.5, 1, 1);
    }
    ctx.strokeStyle = p.border;
    ctx.strokeRect(0.5, 0.5, GRID - 1, GRID - 1);
    ctx.restore();
    frameTicks(ctx, p.fg, 2, HUD_H + 2, GRID - 4, GRID - 4, 10);

    const alpha = this.state === "playing" ? Math.min(1, this.tick / this.interval) : 1;
    const pts: Cell[] = this.snake.map((c, i) => {
      const from = this.prev[i] ?? this.prev[this.prev.length - 1] ?? c;
      const a = this.centre(from);
      const b = this.centre(c);
      return { x: lerp(a.x, b.x, alpha), y: lerp(a.y, b.y, alpha) };
    });

    if (pts.length > 0) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = p.route;
      ctx.lineWidth = CELL * 0.55;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      if (pts.length === 1) ctx.lineTo(pts[0].x + 0.01, pts[0].y);
      ctx.stroke();

      ctx.strokeStyle = p.bg;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      const head = pts[0];
      ctx.fillStyle = p.route;
      ctx.beginPath();
      ctx.arc(head.x, head.y, CELL * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.bg;
      ctx.beginPath();
      ctx.arc(head.x, head.y, CELL * 0.14, 0, Math.PI * 2);
      ctx.fill();
      if (this.pulse > 0) {
        ctx.strokeStyle = p.accent;
        ctx.globalAlpha = this.pulse;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(head.x, head.y, CELL * (0.4 + (1 - this.pulse) * 0.8), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      text(ctx, p, `WP-${String(this.snake.length).padStart(2, "0")}`, head.x, head.y - CELL * 0.8, 9, p.fg, "center", 500);
      ctx.restore();
    }

    if (this.deadAt) {
      const c = this.centre(this.deadAt);
      ctx.save();
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x - 8, c.y - 8);
      ctx.lineTo(c.x + 8, c.y + 8);
      ctx.moveTo(c.x + 8, c.y - 8);
      ctx.lineTo(c.x - 8, c.y + 8);
      ctx.stroke();
      ctx.restore();
    }

    this.drawPin(ctx, p, this.ping, t, p.accent, "");
    if (this.bonus) {
      const { x, y } = this.centre(this.bonus);
      const frac = this.bonus.ttl / BONUS_TTL;
      this.drawPin(ctx, p, this.bonus, t * 1.6, p.fg, "+50");
      ctx.save();
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.restore();
    }

    text(ctx, p, "SCORE", 12, 14, 10, p.muted, "left", 500);
    text(ctx, p, pad(this.score), 12, 29, 14, p.fg, "left", 700);
    text(ctx, p, "BEST", 120, 14, 10, p.muted, "left", 500);
    text(ctx, p, pad(this.high), 120, 29, 14, p.fg, "left", 700);
    text(ctx, p, "SPEED", WIDTH / 2 + 30, 14, 10, p.muted, "left", 500);
    text(ctx, p, `${(BASE_INTERVAL / this.interval).toFixed(2)}x`, WIDTH / 2 + 30, 29, 14, p.fg, "left", 700);
    text(ctx, p, "TRAIL", WIDTH - 12, 14, 10, p.muted, "right", 500);
    text(ctx, p, String(this.snake.length).padStart(3, "0"), WIDTH - 12, 29, 14, p.fg, "right", 700);
  }
}

const createRoute = () => new RouteGame();

const legend = [
  { keys: "↑ ↓ ← → / WASD", does: "steer (any arrow starts)" },
  { keys: "Space", does: "start / pause" },
  { keys: "P / Esc", does: "pause" },
  { keys: "Enter", does: "start / restart" },
];

const touch: TouchLayout = {
  left: [
    { action: "left", label: "←", aria: "Steer left" },
    { action: "up", label: "↑", aria: "Steer up" },
    { action: "down", label: "↓", aria: "Steer down" },
    { action: "right", label: "→", aria: "Steer right" },
  ],
  right: [],
};

export function Route() {
  return <GameShell create={createRoute} label="Route" legend={legend} touch={touch} />;
}
