"use client";

import { BaseGame, frameTicks, pad, text } from "./engine";
import type { Palette, TouchLayout } from "./engine";
import { GameShell } from "./game-shell";

const COLS = 10;
const ROWS = 22;
const HIDDEN = 2;
const CELL = 24;
const BOARD_X = 140;
const BOARD_Y = 40;
const BOARD_W = COLS * CELL;
const BOARD_H = (ROWS - HIDDEN) * CELL;
const WIDTH = 540;
const HEIGHT = 560;

const DAS = 0.17;
const ARR = 0.03;
const LOCK_DELAY = 0.5;
const MAX_LOCK_RESETS = 15;
const CLEAR_TIME = 0.32;
const SOFT_DROP_FACTOR = 20;

type Kind = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const NAMES = ["I", "O", "T", "S", "Z", "J", "L"] as const;

const BASE: number[][][] = [
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
];

function rotateCW(m: number[][]): number[][] {
  const n = m.length;
  const out: number[][] = [];
  for (let r = 0; r < n; r++) {
    out.push([]);
    for (let c = 0; c < n; c++) out[r].push(m[n - 1 - c][r]);
  }
  return out;
}

const SHAPES: number[][][][] = BASE.map((base) => {
  const rots = [base];
  for (let i = 1; i < 4; i++) rots.push(rotateCW(rots[i - 1]));
  return rots;
});

type Kick = [number, number][];
const KICKS_JLSTZ: Record<string, Kick> = {
  "01": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "10": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "12": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "21": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "23": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "32": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "30": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "03": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICKS_I: Record<string, Kick> = {
  "01": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "10": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "12": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "21": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "23": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "32": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "30": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "03": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

const LINE_SCORE = [0, 100, 300, 500, 800];

interface Piece {
  kind: Kind;
  rot: number;
  x: number;
  y: number;
}

function cellStyle(kind: Kind, p: Palette): { color: string; alpha: number } {
  switch (kind) {
    case 0:
      return { color: p.accent, alpha: 1 };
    case 2:
      return { color: p.route, alpha: 1 };
    case 1:
      return { color: p.fg, alpha: 0.9 };
    case 5:
      return { color: p.fg, alpha: 0.72 };
    case 3:
      return { color: p.fg, alpha: 0.56 };
    case 6:
      return { color: p.fg, alpha: 0.42 };
    default:
      return { color: p.fg, alpha: 0.3 };
  }
}

function gravitySeconds(level: number): number {
  const l = Math.min(level, 20) - 1;
  return Math.max(0.03, Math.pow(0.8 - l * 0.007, l));
}

class StackerGame extends BaseGame {
  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly keymap = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowDown: "soft",
    ArrowUp: "cw",
    KeyX: "cw",
    KeyZ: "ccw",
    ControlLeft: "ccw",
    Space: "hard",
    KeyC: "hold",
    KeyP: "pause",
    Escape: "pause",
    Enter: "start",
  } as const;
  protected readonly title = "Stacker";
  protected readonly startLines = [
    "Enter — start",
    "← → move · ↓ soft · Space hard drop",
    "↑ / X rotate · Z counter · C hold",
  ];
  protected overTitle = "Stack out";

  private board: (Kind | -1)[][] = [];
  private piece: Piece | null = null;
  private holdKind: Kind | null = null;
  private canHold = true;
  private bag: Kind[] = [];
  private queue: Kind[] = [];
  private level = 1;
  private lines = 0;
  private gravityTimer = 0;
  private lockTimer = 0;
  private lockResets = 0;
  private grounded = false;
  private dasDir = 0;
  private dasTimer = 0;
  private arrTimer = 0;
  private softHeld = false;
  private clearing: number[] = [];
  private clearTimer = 0;
  private flash = 0;

  constructor() {
    super("stacker");
    this.reset();
  }

  protected reset(): void {
    this.board = Array.from({ length: ROWS }, () => Array<Kind | -1>(COLS).fill(-1));
    this.bag = [];
    this.queue = [];
    this.holdKind = null;
    this.canHold = true;
    this.level = 1;
    this.lines = 0;
    this.gravityTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.grounded = false;
    this.dasDir = 0;
    this.dasTimer = 0;
    this.arrTimer = 0;
    this.softHeld = false;
    this.clearing = [];
    this.clearTimer = 0;
    this.flash = 0;
    while (this.queue.length < 3) this.queue.push(this.drawFromBag());
    this.spawn(this.nextKind());
  }

  protected hudExtra(): string {
    return `LVL ${this.level} · LINES ${this.lines}`;
  }

  private drawFromBag(): Kind {
    if (this.bag.length === 0) {
      this.bag = [0, 1, 2, 3, 4, 5, 6];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop() as Kind;
  }

  private nextKind(): Kind {
    const k = this.queue.shift() as Kind;
    this.queue.push(this.drawFromBag());
    return k;
  }

  private fits(kind: Kind, rot: number, x: number, y: number): boolean {
    const m = SHAPES[kind][rot];
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m.length; c++) {
        if (!m[r][c]) continue;
        const bx = x + c;
        const by = y + r;
        if (bx < 0 || bx >= COLS || by >= ROWS) return false;
        if (by >= 0 && this.board[by][bx] !== -1) return false;
      }
    }
    return true;
  }

  private spawn(kind: Kind): void {
    const size = SHAPES[kind][0].length;
    const x = Math.floor((COLS - size) / 2);
    const piece: Piece = { kind, rot: 0, x, y: 1 };
    if (!this.fits(kind, 0, x, 1)) {
      piece.y = 0;
      if (!this.fits(kind, 0, x, 0)) {
        this.piece = piece;
        this.gameOver();
        return;
      }
    }
    this.piece = piece;
    this.gravityTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.grounded = !this.fits(kind, 0, x, piece.y + 1);
  }

  private tryMove(dx: number, dy: number): boolean {
    const p = this.piece;
    if (!p) return false;
    if (!this.fits(p.kind, p.rot, p.x + dx, p.y + dy)) return false;
    p.x += dx;
    p.y += dy;
    this.afterMove();
    return true;
  }

  private afterMove(): void {
    const p = this.piece;
    if (!p) return;
    const nowGrounded = !this.fits(p.kind, p.rot, p.x, p.y + 1);
    if (this.lockResets < MAX_LOCK_RESETS) {
      this.lockTimer = 0;
      if (nowGrounded) this.lockResets++;
    }
    this.grounded = nowGrounded;
  }

  private tryRotate(dir: 1 | -1): void {
    const p = this.piece;
    if (!p || p.kind === 1) return;
    const from = p.rot;
    const to = (p.rot + dir + 4) % 4;
    const table = p.kind === 0 ? KICKS_I : KICKS_JLSTZ;
    const kicks = table[`${from}${to}`];
    for (const [kx, ky] of kicks) {
      const nx = p.x + kx;
      const ny = p.y - ky;
      if (this.fits(p.kind, to, nx, ny)) {
        p.rot = to;
        p.x = nx;
        p.y = ny;
        this.afterMove();
        return;
      }
    }
  }

  private ghostY(): number {
    const p = this.piece;
    if (!p) return 0;
    let y = p.y;
    while (this.fits(p.kind, p.rot, p.x, y + 1)) y++;
    return y;
  }

  private hardDrop(): void {
    const p = this.piece;
    if (!p) return;
    const gy = this.ghostY();
    this.score += (gy - p.y) * 2;
    p.y = gy;
    this.lock();
  }

  private hold(): void {
    const p = this.piece;
    if (!p || !this.canHold) return;
    const swap = this.holdKind;
    this.holdKind = p.kind;
    this.canHold = false;
    this.spawn(swap === null ? this.nextKind() : swap);
  }

  private lock(): void {
    const p = this.piece;
    if (!p) return;
    const m = SHAPES[p.kind][p.rot];
    let lockOut = true;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m.length; c++) {
        if (!m[r][c]) continue;
        const by = p.y + r;
        const bx = p.x + c;
        if (by >= HIDDEN) lockOut = false;
        if (by >= 0 && by < ROWS) this.board[by][bx] = p.kind;
      }
    }
    this.piece = null;
    if (lockOut) {
      this.gameOver();
      return;
    }
    const full: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.board[r].every((v) => v !== -1)) full.push(r);
    }
    this.canHold = true;
    if (full.length > 0) {
      this.clearing = full;
      this.clearTimer = 0;
      this.score += LINE_SCORE[full.length] * this.level;
      this.lines += full.length;
      this.level = Math.floor(this.lines / 10) + 1;
      this.flash = 1;
    } else {
      this.spawn(this.nextKind());
    }
  }

  private finishClear(): void {
    const rows = new Set(this.clearing);
    const kept = this.board.filter((_, r) => !rows.has(r));
    while (kept.length < ROWS) kept.unshift(Array<Kind | -1>(COLS).fill(-1));
    this.board = kept;
    this.clearing = [];
    this.spawn(this.nextKind());
  }

  protected onAction(action: string, down: boolean): void {
    if (action === "left" || action === "right") {
      const dir = action === "left" ? -1 : 1;
      if (down) {
        this.dasDir = dir;
        this.dasTimer = 0;
        this.arrTimer = 0;
        if (this.state === "playing" && this.piece) this.tryMove(dir, 0);
      } else if (this.dasDir === dir) {
        const other = dir === -1 ? "right" : "left";
        this.dasDir = this.held.has(other) ? -dir : 0;
        this.dasTimer = 0;
        this.arrTimer = 0;
      }
      return;
    }
    if (action === "soft") {
      this.softHeld = down;
      return;
    }
    if (!down || this.state !== "playing" || !this.piece) return;
    if (action === "cw") this.tryRotate(1);
    else if (action === "ccw") this.tryRotate(-1);
    else if (action === "hard") this.hardDrop();
    else if (action === "hold") this.hold();
  }

  protected step(dt: number): void {
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);

    if (this.clearing.length > 0) {
      this.clearTimer += dt;
      if (this.clearTimer >= CLEAR_TIME) this.finishClear();
      return;
    }
    const p = this.piece;
    if (!p) return;

    if (this.dasDir !== 0) {
      this.dasTimer += dt;
      if (this.dasTimer >= DAS) {
        this.arrTimer += dt;
        while (this.arrTimer >= ARR) {
          this.arrTimer -= ARR;
          if (!this.tryMove(this.dasDir, 0)) {
            this.arrTimer = 0;
            break;
          }
        }
      }
    }

    const g = gravitySeconds(this.level);
    const cellTime = this.softHeld ? Math.min(g, 1 / SOFT_DROP_FACTOR) : g;
    this.gravityTimer += dt;
    while (this.gravityTimer >= cellTime && this.piece) {
      this.gravityTimer -= cellTime;
      if (this.fits(p.kind, p.rot, p.x, p.y + 1)) {
        p.y++;
        if (this.softHeld) this.score += 1;
        this.grounded = !this.fits(p.kind, p.rot, p.x, p.y + 1);
      } else {
        this.grounded = true;
        this.gravityTimer = 0;
        break;
      }
    }

    if (this.grounded && this.piece) {
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY) this.lock();
    } else {
      this.lockTimer = 0;
    }
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    p: Palette,
    kind: Kind,
    px: number,
    py: number,
    size: number,
    ghost = false,
  ): void {
    const { color, alpha } = cellStyle(kind, p);
    ctx.save();
    if (ghost) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(px + 2.5, py + 2.5, size - 5, size - 5);
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = p.bg;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 3.5, py + 3.5, size - 7, size - 7);
    }
    ctx.restore();
  }

  private drawMini(
    ctx: CanvasRenderingContext2D,
    p: Palette,
    kind: Kind | null,
    cx: number,
    cy: number,
    dim: boolean,
  ): void {
    if (kind === null) return;
    const m = SHAPES[kind][0];
    const size = 16;
    const rows = m.filter((row) => row.some(Boolean)).length;
    const cols = m.length;
    const ox = cx - (cols * size) / 2;
    const oy = cy - (rows * size) / 2 - (kind === 0 ? size / 2 : 0);
    ctx.save();
    if (dim) ctx.globalAlpha = 0.4;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m.length; c++) {
        if (m[r][c]) this.drawCell(ctx, p, kind, ox + c * size, oy + r * size, size);
      }
    }
    ctx.restore();
  }

  protected draw(ctx: CanvasRenderingContext2D, p: Palette): void {
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.fillStyle = p.card;
    ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
    ctx.fillStyle = p.border;
    for (let c = 1; c < COLS; c++) {
      for (let r = 1; r < ROWS - HIDDEN; r++) {
        ctx.fillRect(BOARD_X + c * CELL - 0.5, BOARD_Y + r * CELL - 0.5, 1, 1);
      }
    }
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(BOARD_X + 0.5, BOARD_Y + 0.5, BOARD_W - 1, BOARD_H - 1);
    ctx.restore();
    frameTicks(ctx, p.fg, BOARD_X - 6, BOARD_Y - 6, BOARD_W + 12, BOARD_H + 12);

    ctx.save();
    ctx.beginPath();
    ctx.rect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
    ctx.clip();

    for (let r = HIDDEN; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const k = this.board[r]?.[c];
        if (k === undefined || k === -1) continue;
        this.drawCell(ctx, p, k, BOARD_X + c * CELL, BOARD_Y + (r - HIDDEN) * CELL, CELL);
      }
    }

    const piece = this.piece;
    if (piece && this.state !== "over") {
      const m = SHAPES[piece.kind][piece.rot];
      const gy = this.ghostY();
      if (gy !== piece.y) {
        for (let r = 0; r < m.length; r++) {
          for (let c = 0; c < m.length; c++) {
            if (!m[r][c]) continue;
            const by = gy + r - HIDDEN;
            if (by < 0) continue;
            this.drawCell(ctx, p, piece.kind, BOARD_X + (piece.x + c) * CELL, BOARD_Y + by * CELL, CELL, true);
          }
        }
      }
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m.length; c++) {
          if (!m[r][c]) continue;
          const by = piece.y + r - HIDDEN;
          if (by < 0) continue;
          this.drawCell(ctx, p, piece.kind, BOARD_X + (piece.x + c) * CELL, BOARD_Y + by * CELL, CELL);
        }
      }
    }

    if (this.clearing.length > 0) {
      const t = this.clearTimer / CLEAR_TIME;
      const a = 0.35 + 0.65 * Math.abs(Math.sin(t * Math.PI * 3));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.accent;
      for (const r of this.clearing) {
        const inset = (BOARD_W / 2) * t;
        ctx.fillRect(BOARD_X + inset, BOARD_Y + (r - HIDDEN) * CELL + 1, BOARD_W - inset * 2, CELL - 2);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    const leftX = 24;
    const leftW = 92;
    text(ctx, p, "HOLD", leftX, BOARD_Y + 8, 10, p.muted, "left", 500);
    ctx.strokeStyle = p.border;
    ctx.strokeRect(leftX + 0.5, BOARD_Y + 20.5, leftW, 64);
    this.drawMini(ctx, p, this.holdKind, leftX + leftW / 2, BOARD_Y + 52, !this.canHold);

    const statY = BOARD_Y + 120;
    const rows: [string, string][] = [
      ["SCORE", pad(this.score)],
      ["BEST", pad(this.high)],
      ["LEVEL", String(this.level).padStart(2, "0")],
      ["LINES", String(this.lines).padStart(3, "0")],
    ];
    rows.forEach(([k, v], i) => {
      text(ctx, p, k, leftX, statY + i * 44, 10, p.muted, "left", 500);
      text(ctx, p, v, leftX, statY + i * 44 + 18, 15, i === 0 && this.flash > 0 ? p.accent : p.fg, "left", 700);
    });

    const rightX = BOARD_X + BOARD_W + 24;
    text(ctx, p, "NEXT", rightX, BOARD_Y + 8, 10, p.muted, "left", 500);
    ctx.strokeStyle = p.border;
    ctx.strokeRect(rightX + 0.5, BOARD_Y + 20.5, leftW, 196);
    this.queue.slice(0, 3).forEach((k, i) => {
      this.drawMini(ctx, p, k, rightX + leftW / 2, BOARD_Y + 52 + i * 64, i > 0);
    });

    text(ctx, p, `G ${gravitySeconds(this.level).toFixed(2)}s`, rightX, BOARD_Y + 240, 10, p.muted, "left");
    text(ctx, p, this.softHeld ? "SOFT ▼" : "", rightX, BOARD_Y + 260, 10, p.accent, "left");

    text(ctx, p, "STACKER · REV 1", WIDTH - 24, HEIGHT - 16, 9, p.muted, "right");
    text(ctx, p, NAMES[this.piece?.kind ?? 0] + " BAG " + this.bag.length, 24, HEIGHT - 16, 9, p.muted, "left");
  }
}

const createStacker = () => new StackerGame();

const legend = [
  { keys: "← →", does: "move" },
  { keys: "↓", does: "soft drop" },
  { keys: "Space", does: "hard drop" },
  { keys: "↑ / X", does: "rotate clockwise" },
  { keys: "Z", does: "rotate counter-clockwise" },
  { keys: "C", does: "hold" },
  { keys: "P / Esc", does: "pause" },
  { keys: "Enter", does: "start / restart" },
];

const touch: TouchLayout = {
  left: [
    { action: "left", label: "←", aria: "Move left" },
    { action: "right", label: "→", aria: "Move right" },
    { action: "soft", label: "↓", aria: "Soft drop" },
  ],
  right: [
    { action: "hold", label: "HOLD", aria: "Hold piece" },
    { action: "ccw", label: "↺", aria: "Rotate counter-clockwise" },
    { action: "cw", label: "↻", aria: "Rotate clockwise" },
    { action: "hard", label: "DROP", aria: "Hard drop" },
  ],
};

export function Stacker() {
  return <GameShell create={createStacker} label="Stacker" legend={legend} touch={touch} />;
}
