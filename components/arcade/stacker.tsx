"use client";

import { useCallback, useMemo } from "react";
import { BaseGame, card, haptic, roundRectPath, text } from "./engine";
import type { ConceptView, GameOptions, Palette, TouchLayout } from "./engine";
import type { HoistDecl, ListenerDef, StackerScript } from "./games/concepts/types";
import { GameShell, useGameOptions } from "./game-shell";
import type { GameComponentProps } from "./game-shell";

// Story progress for Stacker = lines cleared (each cleared row counts 1).

const COLS = 10;
const ROWS = 22;
const HIDDEN = 2;
const CELL = 24;
const BOARD_X = 150;
const BOARD_Y = 28;
const BOARD_W = COLS * CELL;
const BOARD_H = (ROWS - HIDDEN) * CELL;
const WIDTH = 560;
const HEIGHT = BOARD_H + BOARD_Y * 2;
const SIDE_X = 22;
const SIDE_W = 104;
const RIGHT_X = BOARD_X + BOARD_W + 24;
/** S2 unwind cascade and S5 hoist float, in seconds. */
const UNWIND_STEP = 0.09;
const HOIST_FLOAT = 2;

const DAS = 0.16;
const ARR = 0.035;
const LOCK_DELAY = 0.55;
const MAX_LOCK_RESETS = 15;
const CLEAR_TIME = 0.34;
const SOFT_DROP_FACTOR = 20;
const LINES_PER_LEVEL = 10;

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
const LINE_NAME = ["", "Single", "Double", "Triple", "Tetris!"];

interface Piece {
  kind: Kind;
  rot: number;
  x: number;
  y: number;
  /** Learn: unique piece id (cell ownership). */
  pid: number;
  /** Learn S3: heap frame serial that allocated it. */
  fserial?: number;
  /** Learn S5: a `var` pulled before its assignment (hollow = undefined). */
  hollow?: boolean;
  /** Learn S5/S6: "let total" etc. */
  decl?: string;
  /** Learn S2: the gold `n === 0` piece. */
  gold?: boolean;
  /** Learn S7: captured by the closure or a plain temporary. */
  role?: "count" | "temp";
}

/** Learn per-cell metadata (null for plain cells). */
interface CellMeta {
  pid: number;
  /** S1: frame slab index. */
  slab?: number;
  /** S3: allocating frame serial and allocation index within it. */
  fserial?: number;
  alloc?: number;
  dead?: boolean;
  ret?: boolean;
  /** S5: hollow var cells don't count toward lines. */
  hollow?: boolean;
  /** S2: gold notch piece. */
  gold?: boolean;
  /** S7: closure role. */
  role?: "count" | "temp";
  /** S4/S8: kept alive by this listener. */
  ref?: string;
  /** S8: slab serial of the frame that allocated it. */
  owner?: number;
}

type Frame = { name: string; gapCol: number; row: number; serial: number };

function tileColor(kind: Kind, p: Palette): string {
  switch (kind) {
    case 0:
      return p.accent; // I: cobalt
    case 1:
      return p.sun; // O: sunflower
    case 2:
      return p.lilac; // T
    case 3:
      return p.mint; // S
    case 4:
      return p.route; // Z: coral
    case 5:
      return p.sky; // J
    default:
      return p.paper; // L
  }
}

/** Gentle start (0.85s per row), ~20% faster per level, floor 70ms. */
function gravitySeconds(level: number): number {
  return Math.max(0.07, 0.85 * Math.pow(0.8, level - 1));
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
    Space: "hard",
    KeyC: "hold",
    ShiftLeft: "hold",
    KeyR: "remove",
    Digit1: "c1",
    Digit2: "c2",
    Digit3: "c3",
    Digit4: "c4",
    KeyP: "pause",
    Escape: "pause",
    Enter: "start",
  } as const;
  protected readonly title = "Stacker";
  protected readonly defaultNoun = "pieces";
  protected overTitle = "Stacked out";

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
  private glow = 0;
  private landed = 0;
  private moved = false;
  private rotated = false;
  private dropped = false;
  // Learn state
  private cellMeta: (CellMeta | null)[][] = [];
  private pidSeq = 0;
  private frames: Frame[] = [];
  private slabSerial = 0;
  private returned = new Set<number>();
  private traceIdx = 0;
  private returnLog: string[] = [];
  private heapSerial = 0;
  private heapAlloc = 0;
  private sweepTimer = 0;
  private sweeps = 0;
  private sweepAnim = 0;
  private lockCount = 0;
  private shelf: { decl: HoistDecl; used: boolean }[] = [];
  private lastRun: number | undefined;
  private hoistAnim = 0;
  // S2
  private recDepth = 0;
  private recTimer = 0;
  private goldOnShelf = false;
  private unwinding = false;
  private unwindTimer = 0;
  // S4/S8
  private listeners: (ListenerDef & { attached: boolean })[] = [];
  private leakTimer = 0;
  private choice: NonNullable<ConceptView["choice"]> | null = null;
  // S7
  private closureClears = 0;

  constructor(opts: GameOptions) {
    super("stacker", opts);
    this.reset();
  }

  progressLabel(): string {
    const s = this.learn ? (this.script as StackerScript) : null;
    if (s?.trace || s?.recursion) return "frames returned";
    if (s?.listeners) return "seconds";
    if (s?.closure) return "closure clears";
    if (s?.hoist?.tetrisWithin) return "Tetris";
    return "lines";
  }

  protected tips(touch: boolean): string[] {
    const n = this.noun;
    const s = this.learn ? (this.script as StackerScript) : null;
    if (s) {
      const move = touch ? "Arrows move, ↻ rotates, Drop slams it down." : "← → move, ↑ rotates, Space drops it.";
      if (s.trace && s.listeners) return [move, touch ? "Shelf pulls the hoisted const. Remove cuts a listener. Fill the top frame's gap to return it." : "C pulls the hoisted const, R removes a listener. Fill the top frame's gap to return it."];
      if (s.hoist) return [move, touch ? "Shelf pulls the next declaration off the Hoisted shelf." : "C pulls the next declaration off the Hoisted shelf."];
      if (s.recursion) return [move, touch ? "The n === 0 button pulls the gold piece. Drop it only in countdown(0)'s notch." : "C pulls the gold n === 0 piece. Drop it only in countdown(0)'s notch."];
      if (s.listeners) return [move, touch ? "Remove listener cuts one of the two roots. Pick the one whose component is gone." : "C removes a listener. Pick the one whose component is gone."];
      if (s.closure) return [move, "count pieces survive the GC sweep, temp pieces vanish. Rows that complete after a sweep count."];
      return [move, "The panel shows the call stack and what each frame returned."];
    }
    return touch
      ? [`Stack the ${n}. Arrows move, ↻ rotates, Drop slams it down.`, "Fill a whole row to clear it. Four at once is a Tetris.", `Hold stashes a ${singular(n)} for later. Reach the top and it's over.`]
      : [`Stack the ${n}. ← → move, ↑ rotates, Space drops it.`, "Fill a whole row to clear it. Four at once is a Tetris.", `C holds a ${singular(n)} for later. Reach the top and it's over.`];
  }

  protected reset(): void {
    this.board = Array.from({ length: ROWS }, () => Array<Kind | -1>(COLS).fill(-1));
    this.cellMeta = Array.from({ length: ROWS }, () => this.emptyMetaRow());
    this.pidSeq = 0;
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
    this.glow = 0;
    this.landed = 0;
    this.moved = false;
    this.rotated = false;
    this.dropped = false;
    this.level = Math.max(1, this.params.startLevel ?? 1);
    for (const k of this.params.firstPieces ?? []) this.queue.push(k as Kind);
    while (this.queue.length < 3) this.queue.push(this.drawFromBag());
    // Junk rows with gaps. The tutorial (and garbageGap levels) share one gap so a vertical I clears it.
    this.fillGarbage();
    if (this.learn) this.learnSetup();
    this.spawn(this.nextKind());
    if (this.params.tutorial) {
      const n = singular(this.noun);
      this.tutorial = [
        { desk: `Press ← or → to move the ${n}`, touch: `Tap ← or → to move the ${n}`, done: () => this.moved },
        { desk: "Press ↑ to rotate it", touch: "Tap ↻ to rotate it", done: () => this.rotated },
        { desk: "Line it up with the gap, then Space to drop", touch: "Line it up with the gap, then tap Drop", done: () => this.dropped },
        { desk: "Fill the gap to clear a line", touch: "Fill the gap to clear a line", done: () => this.lines > 0 },
      ];
    }
  }

  protected hudExtra(): string {
    const flags = [this.params.noGhost ? "no ghost" : "", this.params.noHold ? "no hold" : ""].filter(Boolean).join(" · ");
    const base = this.story ? `Level ${this.level}` : `Level ${this.level} · ${this.lines} lines`;
    return flags ? `${base} · ${flags}` : base;
  }

  protected overLines(): string[] {
    return this.story ? [] : [`${this.lines} lines · level ${this.level}`];
  }

  private drawFromBag(): Kind {
    if (this.bag.length === 0) {
      const set = this.params.pieceSet;
      this.bag = set && set.length > 0 ? ([...set] as Kind[]) : [0, 1, 2, 3, 4, 5, 6];
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
        if (by >= 0 && this.board[by][bx] !== -1 && !(this.finale && this.cellMeta[by][bx]?.dead)) return false;
      }
    }
    return true;
  }

  private spawn(kind: Kind): void {
    const size = SHAPES[kind][0].length;
    const x = Math.floor((COLS - size) / 2);
    const piece: Piece = { kind, rot: 0, x, y: 1, pid: ++this.pidSeq, fserial: this.lsc?.heap ? this.heapSerial : undefined };
    piece.role = this.roleFor(piece.pid);
    if (!this.fits(kind, 0, x, 1)) {
      piece.y = 0;
      if (!this.fits(kind, 0, x, 0)) {
        this.piece = piece;
        this.topOut();
        return;
      }
    }
    this.piece = piece;
    this.gravityTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.grounded = !this.fits(kind, 0, x, piece.y + 1);
  }

  private topOut(): void {
    const p = this.paletteHint;
    this.fx.shake(7, 0.4);
    this.fx.flash(p?.route ?? "#ff5b38", 0.25);
    this.sfx.play("topout");
    this.die();
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
        this.rotated = true;
        this.afterMove();
        this.sfx.play("rotate");
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

  private cellCentre(bx: number, by: number): { x: number; y: number } {
    return { x: BOARD_X + bx * CELL + CELL / 2, y: BOARD_Y + (by - HIDDEN) * CELL + CELL / 2 };
  }

  private hardDrop(): void {
    const p = this.piece;
    if (!p) return;
    const gy = this.ghostY();
    const fell = gy - p.y;
    this.score += fell * 2;
    p.y = gy;
    this.dropped = true;
    const pal = this.paletteHint;
    if (fell > 0 && pal) {
      this.fx.shake(Math.min(4, 1 + fell * 0.2), 0.12);
      const m = SHAPES[p.kind][p.rot];
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m.length; c++) {
          if (!m[r][c]) continue;
          if (r + 1 < m.length && m[r + 1][c]) continue; // only bottom-facing cells
          const { x, y } = this.cellCentre(p.x + c, p.y + r);
          this.fx.burst(x, y + CELL / 2, 3, { color: [pal.muted, pal.border], speed: 60, size: 3, life: 0.3, angle: -Math.PI / 2, spread: Math.PI });
        }
      }
    }
    this.sfx.play("drop");
    this.lock();
  }

  private hold(): void {
    const p = this.piece;
    if (this.lsc?.hoist) {
      this.takeShelf();
      return;
    }
    if (this.lsc?.recursion) {
      this.takeGold();
      return;
    }
    if (this.lsc?.listeners) {
      this.openListenerPick();
      return;
    }
    if (this.lsc?.trace || this.lsc?.heap || this.lsc?.closure) return;
    if (!p || !this.canHold || this.params.noHold) return;
    const swap = this.holdKind;
    this.holdKind = p.kind;
    this.canHold = false;
    this.sfx.play("rotate");
    this.spawn(swap === null ? this.nextKind() : swap);
  }

  private lock(): void {
    const p = this.piece;
    if (!p) return;
    const m = SHAPES[p.kind][p.rot];
    let lockOut = true;
    const cells: { x: number; y: number }[] = [];
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m.length; c++) {
        if (!m[r][c]) continue;
        const by = p.y + r;
        const bx = p.x + c;
        if (by >= HIDDEN) lockOut = false;
        cells.push({ x: bx, y: by });
        if (by >= 0 && by < ROWS) {
          this.board[by][bx] = p.kind;
          this.cellMeta[by][bx] = this.learn
            ? {
                pid: p.pid,
                fserial: p.fserial,
                alloc: p.fserial !== undefined ? this.heapAlloc + 1 : undefined,
                hollow: p.hollow || undefined,
                gold: p.gold || undefined,
                role: p.role,
                owner: this.finale ? this.frames[this.frames.length - 1]?.serial : undefined,
                ref: this.finale ? this.listeners.find((l) => l.leaky && l.attached)?.name : undefined,
              }
            : null;
        }
      }
    }
    this.piece = null;
    this.landed = 1;
    if (lockOut) {
      this.topOut();
      return;
    }
    this.hoistAfterLock();
    if (this.lsc?.trace && !this.finale) {
      this.s1Lock(p.pid, cells);
      return;
    }
    if (this.finale && this.finaleLock(cells)) return;
    if (this.lsc?.recursion && this.recLock(p, cells)) return;
    this.heapAfterLock();
    const full: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.isFull(r)) full.push(r);
    }
    if (this.hoistWindowMissed(full.length)) {
      this.spawn(this.nextKind());
      return;
    }
    if (this.stackOverflow(cells, full)) return;
    this.canHold = true;
    if (full.length > 0) {
      this.onLinesCleared(full);
    } else {
      this.sfx.play("lock");
      this.spawn(this.nextKind());
    }
  }

  private onLinesCleared(full: number[]): void {
    const n = full.length;
    const pal = this.paletteHint;
    this.clearing = full;
    this.clearTimer = 0;
    const gained = LINE_SCORE[n] * this.level;
    this.score += gained;
    this.lines += n;
    const newLevel = Math.floor(this.lines / LINES_PER_LEVEL) + 1;
    this.glow = 1;
    this.sfx.play(n >= 4 ? "big" : "clear");
    haptic(n >= 4 ? [40, 30, 40] : 25);
    this.fx.shake(1.5 + n * 1.8, 0.18 + n * 0.05);
    if (pal) {
      for (const r of full) {
        for (let c = 0; c < COLS; c++) {
          const k = this.board[r][c];
          const { x, y } = this.cellCentre(c, r);
          this.fx.burst(x, y, 2, { color: k === -1 ? pal.fg : tileColor(k, pal), speed: 170, size: 6, shape: "square", gravity: 420, life: 0.7 });
        }
      }
      const midRow = full[Math.floor(full.length / 2)];
      const centre = this.cellCentre(COLS / 2 - 0.5, midRow);
      this.fx.pop(centre.x, centre.y - 6, `${LINE_NAME[n]} +${gained}`, n >= 4 ? pal.route : pal.accent, n >= 4 ? 26 : 20);
      if (n >= 4) this.fx.flash(pal.sun, 0.3);
    }
    if (newLevel !== this.level) {
      this.level = newLevel;
      this.sfx.play("level");
      if (pal) this.fx.pop(BOARD_X + BOARD_W / 2, BOARD_Y + 60, `Level ${newLevel}`, pal.fg, 22);
    }
    const tetrisGoal = this.lsc?.hoist?.tetrisWithin;
    if (tetrisGoal) {
      if (n >= 4) {
        this.announce("Tetris with the hoisted function.");
        this.addProgress(1);
      }
    } else if (this.lsc?.closure || this.lsc?.recursion || this.finale) {
      // Lines are housekeeping here; progress comes from the concept rule.
    } else this.addProgress(n);
    if (this.state === "over") this.collapseRows();
  }

  private collapseRows(): void {
    const rows = new Set(this.clearing);
    const kept = this.board.filter((_, r) => !rows.has(r));
    const keptMeta = this.cellMeta.filter((_, r) => !rows.has(r));
    while (kept.length < ROWS) {
      kept.unshift(Array<Kind | -1>(COLS).fill(-1));
      keptMeta.unshift(this.emptyMetaRow());
    }
    this.board = kept;
    this.cellMeta = keptMeta;
    this.clearing = [];
    this.syncSlabRows();
  }

  private finishClear(): void {
    this.collapseRows();
    this.spawn(this.nextKind());
  }

  protected onAction(action: string, down: boolean): void {
    if (this.choice) {
      const m = down ? /^c([1-4])$/.exec(action) : null;
      if (m) this.pickListener(Number(m[1]));
      return;
    }
    if (action === "left" || action === "right") {
      const dir = action === "left" ? -1 : 1;
      if (down) {
        this.dasDir = dir;
        this.dasTimer = 0;
        this.arrTimer = 0;
        if (this.state === "playing" && this.piece && this.tryMove(dir, 0)) {
          this.moved = true;
          this.sfx.play("move");
        }
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
    else if (action === "remove" && this.lsc?.listeners) this.openListenerPick();
  }

  protected step(dt: number): void {
    if (this.glow > 0) this.glow = Math.max(0, this.glow - dt * 2.5);
    if (this.landed > 0) this.landed = Math.max(0, this.landed - dt * 6);
    if (this.sweepAnim > 0) this.sweepAnim = Math.max(0, this.sweepAnim - dt * 1.6);
    // Listener pick open: play waits for the player.
    if (this.choice) return;
    // S5/S6/S8: declarations float up to the shelf before the first piece falls.
    if (this.hoistAnim > 0) {
      this.hoistAnim = Math.max(0, this.hoistAnim - dt);
      return;
    }
    if (this.unwinding) {
      this.unwindStep(dt);
      return;
    }
    const gc = this.gcConf();
    if (gc && this.clearing.length === 0) {
      this.sweepTimer += dt;
      if (this.sweepTimer >= gc.gcEvery) {
        this.sweepTimer = 0;
        this.gcSweep();
        if (this.state !== "playing") return;
      }
    }
    if (this.learnTimers(dt)) return;

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
        if (this.softHeld) {
          this.score += 1;
          this.sfx.play("soft");
        }
        this.grounded = !this.fits(p.kind, p.rot, p.x, p.y + 1);
      } else {
        this.grounded = true;
        this.gravityTimer = 0;
        break;
      }
    }

    if (this.grounded && this.piece) {
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY) {
        this.sfx.play("lock");
        this.lock();
      }
    } else {
      this.lockTimer = 0;
    }
  }


  /* ================================================================ */
  /* Learn track: the JS memory model (concept-levels.md §2)          */
  /* ================================================================ */

  private get lsc(): StackerScript | null {
    return this.learn ? (this.script as StackerScript) : null;
  }

  /** S8: frame slabs plus listener roots. Missed pieces stay as heap allocations and dead cells are passable. */
  private get finale(): boolean {
    const s = this.lsc;
    return !!(s?.trace && s.listeners);
  }

  private gcConf(): { gcEvery: number; limitRow?: number } | null {
    const s = this.lsc;
    if (!s) return null;
    if (s.heap) return { gcEvery: s.heap.gcEvery, limitRow: s.heap.limitRow };
    if (s.listeners) return { gcEvery: s.listeners.gcEvery, limitRow: s.listeners.limitRow };
    if (s.closure) return { gcEvery: s.closure.gcEvery };
    return null;
  }

  private emptyMetaRow(): (CellMeta | null)[] {
    return Array<CellMeta | null>(COLS).fill(null);
  }

  private isFull(r: number): boolean {
    return this.board[r].every((v) => v !== -1) && !this.cellMeta[r].some((m) => m?.hollow || m?.slab !== undefined);
  }

  /** Called from reset() before the first spawn. */
  private learnSetup(): void {
    const s = this.lsc;
    if (!s) return;
    this.frames = [];
    this.traceIdx = 0;
    this.returnLog = [];
    this.heapSerial = 0;
    this.heapAlloc = 0;
    this.sweepTimer = 0;
    this.sweeps = 0;
    this.sweepAnim = 0;
    this.lockCount = 0;
    this.shelf = [];
    this.lastRun = undefined;
    this.hoistAnim = 0;
    this.slabSerial = 0;
    this.returned = new Set();
    this.recDepth = 0;
    this.recTimer = 0;
    this.goldOnShelf = false;
    this.unwinding = false;
    this.unwindTimer = 0;
    this.listeners = [];
    this.leakTimer = 0;
    this.choice = null;
    this.closureClears = 0;
    this.overTitle = "Stacked out";
    if (s.heap) this.meta.sweepHoles = 0;
    if (s.trace) this.processTrace();
    if (s.hoist) {
      this.shelf = s.hoist.decls.map((d) => ({ decl: d, used: false }));
      this.hoistAnim = this.fx.reduced ? 0 : HOIST_FLOAT;
      this.announce(s.trace ? "const theme hoisted to the shelf, locked until its line runs." : "Declarations hoisted to the shelf. Press C to pull one out.");
    }
    if (s.heap) this.announce(`${this.heapFrameName()} is allocating. Unreachable pieces get swept every ${s.heap.gcEvery} seconds.`);
    if (s.recursion) {
      this.goldOnShelf = true;
      this.recTimer = s.recursion.every * 0.6;
      this.overTitle = "RangeError: Maximum call stack size exceeded";
      this.pushRecSlab();
    }
    if (s.listeners) {
      this.listeners = s.listeners.items.map((l) => ({ ...l, attached: true }));
      this.overTitle = "Out of memory";
      if (!s.trace) this.announce(`Two listeners are attached: ${this.listeners.map((l) => `${l.name} from ${l.owner}`).join(" and ")}. One keeps allocating.`);
    }
    if (s.closure) {
      this.overTitle = "Stacked out";
      this.announce(`makeCounter() returned. Pieces marked count are in inc's backpack and survive the sweep every ${s.closure.gcEvery} seconds; temp pieces are swept.`);
    }
  }

  /** Where the next slab goes: on top of everything (S2/S8), or the next stack row (S1, where nothing else persists). */
  private slabRow(): number {
    if (!this.finale && !this.lsc?.recursion) return ROWS - 1 - this.frames.length;
    return this.topFilledRow() - 1;
  }

  private topFilledRow(): number {
    for (let r = 0; r < ROWS; r++) if (this.board[r].some((v) => v !== -1)) return r;
    return ROWS;
  }

  /** Write a labelled slab row with one gap (gapCol < 0 = sealed; `wide` cells of gap). */
  private pushSlab(name: string, gapCol: number, wide = 1): Frame {
    const row = Math.max(0, this.slabRow());
    const serial = ++this.slabSerial;
    for (let c = 0; c < COLS; c++) {
      const gap = gapCol >= 0 && c >= gapCol && c < gapCol + wide;
      this.board[row][c] = gap ? -1 : 6;
      this.cellMeta[row][c] = gap ? null : { pid: -1, slab: serial };
    }
    const f: Frame = { name, gapCol, row, serial };
    this.frames.push(f);
    this.liftPiece();
    return f;
  }

  /** Rows moved under the slabs (line clear, settle): refresh their positions from the cells. */
  private syncSlabRows(): void {
    for (const f of this.frames) {
      const r = this.cellMeta.findIndex((row) => row.some((m) => m?.slab === f.serial));
      if (r >= 0) f.row = r;
    }
  }

  /** The board rose under the falling piece: lift it until it fits (or top out). */
  private liftPiece(): void {
    const p = this.piece;
    if (!p) return;
    let guard = 0;
    while (!this.fits(p.kind, p.rot, p.x, p.y) && guard++ < ROWS) p.y--;
    if (!this.fits(p.kind, p.rot, p.x, p.y)) this.topOut();
  }

  /** Per-frame Learn timers. Returns true when the step should stop here. */
  private learnTimers(dt: number): boolean {
    const s = this.lsc;
    if (!s) return false;
    if (s.recursion && this.recDepth <= s.recursion.from && this.clearing.length === 0) {
      this.recTimer += dt;
      if (this.recTimer >= s.recursion.every) {
        this.recTimer = 0;
        this.pushRecSlab();
        if (this.state !== "playing") return true;
      }
    }
    if (s.listeners?.leakEvery && this.clearing.length === 0) {
      const leaky = this.listeners.find((l) => l.leaky);
      if (leaky?.attached) {
        this.leakTimer += dt;
        if (this.leakTimer >= s.listeners.leakEvery) {
          this.leakTimer = 0;
          this.leakRow(leaky.name);
          if (this.state !== "playing") return true;
        }
      }
      const sec = Math.min(s.listeners.surviveSec ?? 0, Math.floor(this.elapsed));
      if (sec > this.progress) {
        this.addProgress(sec - this.progress);
        if (this.state !== "playing") return true;
        if (sec >= (s.listeners.surviveSec ?? 0) && leaky?.attached) this.announce("90 seconds, but the leak is still attached. Remove the listener to finish.");
      }
    }
    return false;
  }

  /* ---------------- S2: recursion + base case ---------------- */

  private pushRecSlab(): void {
    const r = this.lsc?.recursion;
    if (!r) return;
    const n = r.from - this.recDepth;
    const base = n === 0;
    const f = this.pushSlab(`${r.fn}(${n})`, base ? r.notchCol : -1, 2);
    this.recDepth++;
    const pal = this.paletteHint;
    if (pal) this.fx.pop(BOARD_X + BOARD_W / 2, BOARD_Y + Math.max(0, f.row - HIDDEN) * CELL - 10, base ? `${f.name}: the base case` : `${f.name} called`, base ? pal.sun : pal.muted, base ? 18 : 15);
    this.sfx.play(base ? "level" : "lock");
    this.announce(base ? `${f.name} is on top with a gold notch. Drop the n === 0 piece in it.` : `${f.name} called. It can't return until the call inside it does.`);
    if (f.row < HIDDEN + r.limitRow) this.rangeError();
  }

  private rangeError(): void {
    const pal = this.paletteHint;
    if (pal) {
      this.fx.flash(pal.route, 0.3);
      this.fx.pop(BOARD_X + BOARD_W / 2, BOARD_Y + 60, "RangeError", pal.route, 22);
    }
    this.fx.shake(7, 0.4);
    this.sfx.play("topout");
    this.announce("RangeError: Maximum call stack size exceeded. The frames reached the stack limit.");
    this.die();
  }

  /** S2 after a normal lock: a cell resting above the stack limit is an overflow. */
  private stackOverflow(cells: { x: number; y: number }[], full: number[]): boolean {
    const r = this.lsc?.recursion;
    if (!r) return false;
    if (cells.some((c) => c.y < HIDDEN + r.limitRow && !full.includes(c.y))) {
      this.rangeError();
      return true;
    }
    return false;
  }

  private takeGold(): void {
    const p = this.piece;
    if (!p) return;
    if (!this.goldOnShelf) {
      this.sfx.play("bump");
      return;
    }
    this.goldOnShelf = false;
    this.queue.unshift(p.kind);
    this.queue.pop();
    this.spawn(1);
    if (this.piece) {
      this.piece.gold = true;
      this.piece.decl = "n === 0";
    }
    this.sfx.play("rotate");
    this.announce("Gold piece in hand. It only answers in countdown(0)'s notch.");
  }

  /** S2 lock rule for the gold piece. Returns true when the unwind started (no spawn). */
  private recLock(p: Piece, cells: { x: number; y: number }[]): boolean {
    const r = this.lsc?.recursion;
    if (!r || !p.gold) return false;
    const top = this.frames[this.frames.length - 1];
    const hit = top && top.gapCol >= 0 && cells.some((c) => c.y === top.row && c.x >= r.notchCol && c.x < r.notchCol + 2);
    if (hit) {
      for (const c of cells) {
        if (c.y >= 0 && c.y < ROWS) {
          this.board[c.y][c.x] = -1;
          this.cellMeta[c.y][c.x] = null;
        }
      }
      this.startUnwind();
      return true;
    }
    for (const c of cells) if (c.y >= 0 && c.y < ROWS && this.cellMeta[c.y][c.x]) this.cellMeta[c.y][c.x]!.gold = undefined;
    const cy = cells[0] ? Math.max(HIDDEN, cells[0].y) : HIDDEN;
    this.slip(top && top.gapCol >= 0 ? "missed the notch: shattered to junk" : `${top?.name ?? "this frame"} isn't the base case`, BOARD_X + BOARD_W / 2, BOARD_Y + (cy - HIDDEN) * CELL - 12);
    this.goldOnShelf = true;
    return false;
  }

  private startUnwind(): void {
    this.unwinding = true;
    this.unwindTimer = 0;
    this.piece = null;
    this.lastRun = 1;
    const pal = this.paletteHint;
    if (pal) {
      this.fx.flash(pal.sun, 0.25);
      this.fx.pop(BOARD_X + BOARD_W / 2, BOARD_Y + BOARD_H / 2, "n === 0: unwind!", pal.sun, 24);
    }
    this.sfx.play("big");
    haptic([30, 30, 30]);
    this.announce("Base case reached. countdown(0) returns, and every frame above it can finally finish, newest first.");
    if (this.fx.reduced) this.unwindStep(ROWS * UNWIND_STEP);
  }

  /** The combo cascade: clear the topmost row every UNWIND_STEP, crediting each slab as a return. */
  private unwindStep(dt: number): void {
    this.unwindTimer += dt;
    const pal = this.paletteHint;
    while (this.unwindTimer >= UNWIND_STEP && this.state === "playing") {
      this.unwindTimer -= UNWIND_STEP;
      const r = this.topFilledRow();
      if (r >= ROWS) {
        this.unwinding = false;
        if (this.state === "playing") this.spawn(this.nextKind());
        return;
      }
      const slabIdx = this.frames.findIndex((f) => f.row === r);
      for (let c = 0; c < COLS; c++) {
        const k = this.board[r][c];
        if (k !== -1 && pal) {
          const { x, y } = this.cellCentre(c, r);
          this.fx.burst(x, y, 2, { color: slabIdx >= 0 ? [pal.sun, pal.accent] : [pal.muted, pal.border], speed: 150, size: 5, shape: "square", gravity: 400, life: 0.6 });
        }
        this.board[r][c] = -1;
        this.cellMeta[r][c] = null;
      }
      if (slabIdx >= 0) {
        const f = this.frames.splice(slabIdx, 1)[0];
        this.returnLog.unshift(`← ${f.name} returned`);
        this.score += 150;
        this.sfx.play("clear");
        this.addProgress(1);
      } else this.score += 20;
    }
  }

  /* ---------------- S4/S8: listener roots ---------------- */

  /** S4: the unmounted component's handler keeps allocating: a junk row rises, referenced by the listener. */
  private leakRow(ref: string): void {
    if (this.board[0].some((v) => v !== -1) || this.board[1].some((v) => v !== -1)) {
      this.topOut();
      return;
    }
    const g1 = Math.floor(Math.random() * COLS);
    let g2 = Math.floor(Math.random() * COLS);
    if (g2 === g1) g2 = (g1 + 3) % COLS;
    this.board.shift();
    this.cellMeta.shift();
    this.board.push(Array.from({ length: COLS }, (_, c) => (c === g1 || c === g2 ? -1 : 5)) as (Kind | -1)[]);
    this.cellMeta.push(Array.from({ length: COLS }, (_, c) => (c === g1 || c === g2 ? null : { pid: -1, ref })));
    this.liftPiece();
    const pal = this.paletteHint;
    if (pal) this.fx.pop(BOARD_X + BOARD_W / 2, BOARD_Y + BOARD_H - 16, `scroll event → ${ref} allocates`, pal.muted, 14);
    this.sfx.play("soft");
  }

  private refCount(name?: string): number {
    let n = 0;
    for (const row of this.cellMeta) for (const m of row) if (m?.ref && (!name || m.ref === name)) n++;
    return n;
  }

  private openListenerPick(): void {
    if (this.choice || this.listeners.length === 0) return;
    if (!this.listeners.some((l) => l.leaky && l.attached)) {
      this.sfx.play("bump");
      this.announce("No leak left. onClick belongs to a button that is still on screen.");
      return;
    }
    this.choice = {
      kicker: "Remove listener",
      prompt: "Which listener do you remove?",
      detail: "One component is still on screen. The other unmounted, but its handler kept listening.",
      options: this.listeners.map((l) => `${l.name} · ${l.owner}${l.attached ? "" : " (removed)"}`),
    };
    this.sfx.play("pause");
    this.announce("Remove which listener? 1 for onClick on the mounted button, 2 for the unmounted component's listener.");
  }

  private pickListener(i: number): void {
    const l = this.listeners[i - 1];
    this.choice = null;
    if (!l || !l.attached) return;
    const cx = BOARD_X + BOARD_W / 2;
    if (!l.leaky) {
      this.slip(`${l.name} removed: the button is dead now`, cx, BOARD_Y + 70);
      this.announce(`${l.owner.split(" ")[0]} re-rendered and attached ${l.name} again. That one was never the leak.`);
      return;
    }
    l.attached = false;
    this.meta.fixedBySweep = this.sweeps;
    let freed = 0;
    for (const row of this.cellMeta)
      for (const m of row) {
        if (!m || m.ref !== l.name) continue;
        m.ref = undefined;
        if (!this.finale || (m.owner !== undefined && this.returned.has(m.owner))) {
          m.dead = true;
          freed++;
        }
      }
    const pal = this.paletteHint;
    if (pal) this.fx.pop(cx, BOARD_Y + 70, `${l.name} removed`, pal.accent, 20);
    this.sfx.play("level");
    haptic(25);
    this.announce(`${l.name} removed. ${freed} cells are unreachable now; the next GC sweep frees them.`);
    this.checkWin();
  }

  /* ---------------- S7: closure roles ---------------- */

  private roleFor(pid: number): "count" | "temp" | undefined {
    const roles = this.lsc?.closure?.roles;
    if (!roles) return undefined;
    return roles[(pid - 1) % roles.length];
  }

  /** Cells fall straight down in their column (after a closure sweep). */
  private settleColumns(): void {
    for (let c = 0; c < COLS; c++) {
      const stack: [Kind, CellMeta | null][] = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        const k = this.board[r][c];
        if (k !== -1) stack.push([k, this.cellMeta[r][c]]);
      }
      for (let r = ROWS - 1, i = 0; r >= 0; r--, i++) {
        const it = stack[i];
        this.board[r][c] = it ? it[0] : -1;
        this.cellMeta[r][c] = it ? it[1] : null;
      }
    }
  }

  /** Clear every full row, let cells fall, repeat. Returns rows cleared. */
  private cascadeClears(): number {
    let total = 0;
    const pal = this.paletteHint;
    for (let iter = 0; iter < 8; iter++) {
      const full: number[] = [];
      for (let r = 0; r < ROWS; r++) if (this.isFull(r)) full.push(r);
      if (full.length === 0) break;
      for (const r of full) {
        if (pal) {
          for (let c = 0; c < COLS; c++) {
            const { x, y } = this.cellCentre(c, r);
            this.fx.burst(x, y, 2, { color: [pal.lilac, pal.accent, pal.paper], speed: 170, size: 6, shape: "square", gravity: 420, life: 0.7 });
          }
        }
        this.board[r] = Array<Kind | -1>(COLS).fill(-1);
        this.cellMeta[r] = this.emptyMetaRow();
      }
      total += full.length;
      this.score += LINE_SCORE[Math.min(4, full.length)] * (iter + 1);
      if (pal) this.fx.pop(BOARD_X + BOARD_W / 2, BOARD_Y + (full[0] - HIDDEN) * CELL, `closure combo ×${total}`, pal.lilac, 20 + Math.min(8, total * 2));
      this.settleColumns();
    }
    return total;
  }

  /* ---------------- S8: the finale lock rule ---------------- */

  /** Fill the top frame's gap to return it; bridging over the gap shatters; anything else stays as an allocation. Returns true when it spawned. */
  private finaleLock(cells: { x: number; y: number }[]): boolean {
    const top = this.frames[this.frames.length - 1];
    const pal = this.paletteHint;
    const clearPiece = () => {
      for (const c of cells) {
        if (c.y >= 0 && c.y < ROWS) {
          this.board[c.y][c.x] = -1;
          this.cellMeta[c.y][c.x] = null;
        }
      }
    };
    if (!top) return false;
    const filled = cells.some((c) => c.y === top.row && c.x === top.gapCol);
    if (filled) {
      clearPiece();
      this.returned.add(top.serial);
      let dead = 0;
      let kept = 0;
      for (const row of this.cellMeta)
        for (const m of row) {
          if (!m || m.owner !== top.serial || m.slab !== undefined) continue;
          if (m.ref) kept++;
          else {
            m.dead = true;
            dead++;
          }
        }
      this.clearing = [top.row];
      this.frames.pop();
      const ret = this.lsc?.trace?.[this.traceIdx];
      const value = ret && "ret" in ret ? ret.ret : "undefined";
      this.traceIdx++;
      this.returnLog.unshift(`← ${top.name} returned ${value}`);
      this.score += 200;
      const { x, y } = this.cellCentre(COLS / 2 - 0.5, top.row);
      if (pal) {
        this.fx.burst(x, y, 24, { color: [pal.accent, pal.sun, pal.paper], speed: 180, size: 6, shape: "square", gravity: 300, life: 0.7 });
        this.fx.pop(x, y - 10, `${top.name} returned`, pal.accent, 18);
      }
      this.sfx.play("clear");
      haptic(25);
      this.announce(`${top.name} returned ${value}. ${dead} of its cells are unreachable${kept > 0 ? `, ${kept} stay alive through onResize` : ""}.`);
      this.collapseRows();
      this.processTrace();
      this.addProgress(1);
      if (this.state === "playing") this.spawn(this.nextKind());
      return true;
    }
    const covered = top.row > 0 && this.board[top.row - 1][top.gapCol] !== -1 && !this.cellMeta[top.row - 1][top.gapCol]?.dead;
    if (covered && cells.some((c) => c.y === top.row - 1 && c.x === top.gapCol)) {
      clearPiece();
      if (pal && cells[0]) {
        const c = this.cellCentre(cells[0].x, Math.max(HIDDEN, cells[0].y));
        this.fx.burst(c.x, c.y, 14, { color: [pal.muted, pal.border], speed: 150, size: 5, shape: "square", gravity: 400, life: 0.6 });
      }
      this.slip(`buried ${top.name}: it can't return under junk`, BOARD_X + BOARD_W / 2, BOARD_Y + 80);
      this.spawn(this.nextKind());
      return true;
    }
    return false;
  }

  /** S1: push every call until the next return. */
  private processTrace(): void {
    const s = this.lsc;
    if (!s?.trace) return;
    while (this.traceIdx < s.trace.length) {
      const st = s.trace[this.traceIdx];
      if (!("call" in st)) break;
      this.pushSlab(st.call, st.gapCol);
      this.traceIdx++;
      this.announce(`${st.call} called. Its frame is on top of the stack.`);
    }
  }

  /** S1 lock rule: only filling the top frame's gap returns it; anything else shatters. */
  private s1Lock(pid: number, cells: { x: number; y: number }[]): void {
    const top = this.frames[this.frames.length - 1];
    const s = this.lsc!;
    const clearPiece = () => {
      for (const c of cells) {
        if (c.y >= 0 && c.y < ROWS) {
          this.board[c.y][c.x] = -1;
          this.cellMeta[c.y][c.x] = null;
        }
      }
    };
    const filled = top && cells.some((c) => c.y === top.row && c.x === top.gapCol);
    const pal = this.paletteHint;
    if (top && filled) {
      clearPiece();
      for (let c = 0; c < COLS; c++) {
        this.board[top.row][c] = -1;
        this.cellMeta[top.row][c] = null;
      }
      this.frames.pop();
      const ret = s.trace?.[this.traceIdx];
      const value = ret && "ret" in ret ? ret.ret : "undefined";
      this.traceIdx++;
      this.returnLog.unshift(`← ${top.name} returned ${value}`);
      this.score += 200;
      const { x, y } = this.cellCentre(COLS / 2 - 0.5, top.row);
      if (pal) {
        this.fx.burst(x, y, 24, { color: [pal.accent, pal.sun, pal.paper], speed: 180, size: 6, shape: "square", gravity: 300, life: 0.7 });
        this.fx.pop(x, y - 10, `${top.name} returned`, pal.accent, 18);
      }
      this.sfx.play("clear");
      haptic(25);
      this.announce(`${top.name} returned ${value}.`);
      this.processTrace();
      this.addProgress(1);
      if (this.state === "playing") this.spawn(this.nextKind());
      return;
    }
    clearPiece();
    if (pal && cells[0]) {
      const c = this.cellCentre(cells[0].x, Math.max(HIDDEN, cells[0].y));
      this.fx.burst(c.x, c.y, 14, { color: [pal.muted, pal.border], speed: 150, size: 5, shape: "square", gravity: 400, life: 0.6 });
    }
    this.slip(top ? `missed: only ${top.name} can return` : "nothing is waiting to return", BOARD_X + BOARD_W / 2, BOARD_Y + 80);
    this.spawn(this.nextKind());
  }

  private heapFrameName(): string {
    const fr = this.lsc?.heap?.frames;
    if (!fr || fr.length === 0) return "main()";
    return fr[this.heapSerial % fr.length].name;
  }

  /** S3: called after each lock. A frame that has allocated enough returns. */
  private heapAfterLock(): void {
    const h = this.lsc?.heap;
    if (!h) return;
    const fr = h.frames[this.heapSerial % h.frames.length];
    this.heapAlloc++;
    if (this.heapAlloc < fr.returnsAfter) return;
    let dead = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const m = this.cellMeta[r][c];
        if (!m || m.fserial !== this.heapSerial || m.ret || m.dead) continue;
        if (m.alloc === fr.returnPiece) m.ret = true;
        else {
          m.dead = true;
          dead++;
        }
      }
    }
    this.announce(`${fr.name} returned. ${dead} cells are now unreachable; its return value stays alive.`);
    const pal = this.paletteHint;
    if (pal) this.fx.pop(BOARD_X + BOARD_W / 2, BOARD_Y + 40, `${fr.name} returned`, pal.muted, 16);
    this.heapSerial++;
    this.heapAlloc = 0;
  }

  /**
   * The GC sweep removes unreachable cells. S3/S4/S8: rows that empty out settle.
   * S7: temp cells die first and survivors fall per column, so rows can complete
   * after the sweep (the closure combo).
   */
  private gcSweep(): void {
    const s = this.lsc;
    const conf = this.gcConf();
    if (!s || !conf) return;
    const cl = s.closure;
    if (cl) for (const row of this.cellMeta) for (const m of row) if (m?.role === "temp") m.dead = true;
    const removed: { x: number; y: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.cellMeta[r][c]?.dead) {
          this.board[r][c] = -1;
          this.cellMeta[r][c] = null;
          removed.push({ x: c, y: r });
        }
      }
    }
    if (cl) this.settleColumns();
    else {
      // Settle: drop rows that are now completely empty.
      const keepB: (Kind | -1)[][] = [];
      const keepM: (CellMeta | null)[][] = [];
      for (let r = 0; r < ROWS; r++) {
        if (this.board[r].every((v) => v === -1)) continue;
        keepB.push(this.board[r]);
        keepM.push(this.cellMeta[r]);
      }
      while (keepB.length < ROWS) {
        keepB.unshift(Array<Kind | -1>(COLS).fill(-1));
        keepM.unshift(this.emptyMetaRow());
      }
      this.board = keepB;
      this.cellMeta = keepM;
    }
    this.syncSlabRows();
    // Holes the sweep left behind: empty cells with something above them (S3's third star).
    let holes = 0;
    if (s.heap) {
      for (let c = 0; c < COLS; c++) {
        let roof = false;
        for (let r = 0; r < ROWS; r++) {
          if (this.board[r][c] !== -1) roof = true;
          else if (roof && removed.some((x) => x.x === c)) holes++;
        }
      }
      this.meta.sweepHoles = (this.meta.sweepHoles ?? 0) + holes;
    }
    this.sweeps++;
    this.sweepAnim = 1;
    const pal = this.paletteHint;
    const held = this.refCount();
    if (pal) this.fx.pop(BOARD_X + BOARD_W / 2, BOARD_Y + BOARD_H / 2, removed.length === 0 && held > 0 ? `GC: nothing to free, ${held} cells still referenced` : `GC swept ${removed.length} cells`, pal.accent, removed.length === 0 && held > 0 ? 15 : 18);
    this.sfx.play("level");
    // Any rows the sweep completed clear right away.
    let cleared = 0;
    if (cl) cleared = this.cascadeClears();
    else {
      const full: number[] = [];
      for (let r = 0; r < ROWS; r++) if (this.isFull(r)) full.push(r);
      if (full.length > 0) {
        cleared = full.length;
        this.score += LINE_SCORE[Math.min(4, full.length)];
        const rows = new Set(full);
        this.board = this.board.filter((_, r) => !rows.has(r));
        this.cellMeta = this.cellMeta.filter((_, r) => !rows.has(r));
        while (this.board.length < ROWS) {
          this.board.unshift(Array<Kind | -1>(COLS).fill(-1));
          this.cellMeta.unshift(this.emptyMetaRow());
        }
        this.syncSlabRows();
      }
    }
    this.lines += cleared;
    this.liftPiece();
    // Memory limit check.
    if (conf.limitRow !== undefined) {
      const limit = HIDDEN + conf.limitRow;
      let over = false;
      for (let r = 0; r < limit; r++) if (this.board[r].some((v) => v !== -1)) over = true;
      if (over) this.slip(held > 0 ? "over the memory limit: the leak" : "over the memory limit", BOARD_X + BOARD_W / 2, BOARD_Y + conf.limitRow * CELL - 14);
    }
    this.announce(
      removed.length === 0 && held > 0
        ? `GC sweep ${this.sweeps}: nothing to free. ${held} cells are still referenced by a listener.`
        : `GC sweep ${this.sweeps}: ${removed.length} unreachable cells freed${holes > 0 ? `, ${holes} holes left` : ""}${cleared > 0 ? `, ${cleared} ${cleared === 1 ? "row" : "rows"} completed` : ""}.`,
    );
    if (cl) {
      if (cleared > 0) {
        this.closureClears += cleared;
        this.announce(`Closure combo: ${cleared} ${cleared === 1 ? "row" : "rows"} completed by the survivors.`);
        this.addProgress(cleared);
      }
    } else if (s.heap && cleared > 0) this.addProgress(cleared);
    else this.checkWin();
  }

  /** S5/S6: pull the next hoisted declaration off the shelf. */
  private takeShelf(): void {
    const p = this.piece;
    if (!p) return;
    const item = this.shelf.find((s) => !s.used);
    if (!item) {
      this.sfx.play("bump");
      return;
    }
    const d = item.decl;
    if ((d.kind === "let" || d.kind === "const") && this.lockCount < (d.declaredAt ?? 0)) {
      this.slip(`ReferenceError: ${d.name} is in the TDZ`, BOARD_X + BOARD_W / 2, BOARD_Y + 70);
      this.junkRow();
      return;
    }
    item.used = true;
    this.queue.unshift(p.kind);
    this.queue.pop();
    this.spawn(d.piece as Kind);
    if (this.piece) {
      this.piece.decl = `${d.kind} ${d.name}`;
      this.piece.hollow = d.kind === "var" && this.lockCount < (d.assignedAt ?? 0);
    }
    this.sfx.play("rotate");
    this.announce(d.kind === "var" && this.piece?.hollow ? `var ${d.name} pulled: it exists, but it's undefined (hollow) until its line runs.` : `${d.kind} ${d.name} pulled from the shelf.`);
  }

  /** S6: a ReferenceError shatters into a junk row at the bottom. */
  private junkRow(): void {
    const gap = Math.floor(Math.random() * COLS);
    this.board.shift();
    this.cellMeta.shift();
    this.board.push(Array.from({ length: COLS }, (_, c) => (c === gap ? -1 : 4)) as (Kind | -1)[]);
    this.cellMeta.push(this.emptyMetaRow());
    const p = this.piece;
    if (p && !this.fits(p.kind, p.rot, p.x, p.y)) {
      if (this.fits(p.kind, p.rot, p.x, p.y - 1)) p.y -= 1;
    }
    this.fx.shake(5, 0.25);
  }

  /** S5/S6 bookkeeping after each lock: var assignment and TDZ unlocks. */
  private hoistAfterLock(): void {
    const s = this.lsc?.hoist;
    if (!s) return;
    this.lockCount++;
    for (const item of this.shelf) {
      const d = item.decl;
      if ((d.kind === "let" || d.kind === "const") && this.lockCount === d.declaredAt) {
        this.lastRun = this.codeLineFor(d.name);
        this.announce(`${d.kind} ${d.name}: its line ran, the lock is open.`);
        const pal = this.paletteHint;
        if (pal) this.fx.pop(BOARD_X - 70, BOARD_Y + 60, `${d.name} unlocked`, pal.accent, 15);
      }
      if (d.kind === "var" && this.lockCount === d.assignedAt) {
        let filled = 0;
        for (const row of this.cellMeta)
          for (const m of row)
            if (m?.hollow) {
              m.hollow = false;
              filled++;
            }
        this.lastRun = this.codeLineFor(d.name);
        this.announce(`var ${d.name} was assigned: ${filled > 0 ? "the hollow cells fill in" : "it is no longer undefined"}.`);
      }
    }
  }

  /** S5: the Tetris has to land within the first N pieces, or the attempt resets. */
  private hoistWindowMissed(fullRows: number): boolean {
    const w = this.lsc?.hoist?.tetrisWithin;
    if (!w || this.progress > 0 || fullRows >= 4 || this.lockCount < w) return false;
    this.slip("the I was hoisted: use it early", BOARD_X + BOARD_W / 2, BOARD_Y + 80);
    this.retryHoist();
    return true;
  }

  private codeLineFor(name: string): number | undefined {
    const code = this.lsc?.code ?? [];
    const i = code.findIndex((l) => new RegExp(`(var|let|const)\\s+${name}\\b`).test(l));
    return i >= 0 ? i : undefined;
  }

  /** S5: reset the well for another go at the 5-piece Tetris. */
  private retryHoist(): void {
    this.board = Array.from({ length: ROWS }, () => Array<Kind | -1>(COLS).fill(-1));
    this.cellMeta = Array.from({ length: ROWS }, () => this.emptyMetaRow());
    this.fillGarbage();
    this.queue = [];
    for (const k of this.params.firstPieces ?? []) this.queue.push(k as Kind);
    while (this.queue.length < 3) this.queue.push(this.drawFromBag());
    this.shelf = (this.lsc?.hoist?.decls ?? []).map((d) => ({ decl: d, used: false }));
    this.lockCount = 0;
    this.lastRun = undefined;
  }

  private fillGarbage(): void {
    const garbage = Math.min(10, this.params.garbage ?? 0);
    if (garbage <= 0) return;
    const sharedGap = this.params.tutorial ? 4 : (this.params.garbageGap ?? -1);
    for (let i = 0; i < garbage; i++) {
      const r = ROWS - 1 - i;
      const gap = sharedGap >= 0 ? sharedGap : Math.floor(Math.random() * COLS);
      for (let c = 0; c < COLS; c++) this.board[r][c] = c === gap ? -1 : (((c * 3 + r) % 7) as Kind);
    }
  }

  protected extraWinMet(): boolean {
    const s = this.lsc;
    if (s?.heap) return this.sweeps >= s.heap.sweepsToWin;
    if (s?.listeners && !s.trace) return !this.listeners.some((l) => l.leaky && l.attached);
    return true;
  }

  private nextGcIn(): number {
    const gc = this.gcConf();
    return gc ? Math.max(0, gc.gcEvery - this.sweepTimer) : 0;
  }

  protected conceptView(): ConceptView | undefined {
    const s = this.lsc;
    if (!s) return undefined;
    const choice = this.choice ?? undefined;
    if (s.trace && !s.listeners) {
      const top = this.frames[this.frames.length - 1];
      const fn = top?.name.replace("()", "");
      const active = fn ? s.code.findIndex((l) => l.startsWith(`function ${fn}(`)) : undefined;
      return {
        summary: top ? `Top frame: ${top.name} · ${this.frames.length} on the stack` : "Stack empty",
        code: { lines: s.code, active: active !== undefined && active >= 0 ? active : undefined },
        lanes: [{ id: "stack", label: "Call stack (top first)", items: [...this.frames].reverse().map((f) => f.name), note: "empty" }],
        log: { title: "Returned", items: this.returnLog.slice(0, 6) },
      };
    }
    if (s.recursion) {
      const r = s.recursion;
      const depth = this.frames.length;
      const usable = ROWS - HIDDEN - r.limitRow;
      const used = ROWS - this.topFilledRow();
      return {
        summary: `${r.fn}: depth ${depth} · ${used}/${usable} rows to the limit · base case ${this.goldOnShelf ? "on the shelf" : this.unwinding ? "hit" : "in hand"}`,
        code: { lines: s.code, active: this.unwinding ? 1 : this.recDepth > r.from ? 1 : 2 },
        lanes: [{ id: "stack", label: "Call stack (top first)", items: [...this.frames].reverse().map((f) => f.name), note: "empty" }],
        stats: [
          { label: "Frames on the stack", value: String(depth) },
          { label: "Rows used / stack limit", value: `${used} / ${usable}`, tone: used >= usable - 3 ? "warn" : undefined },
          { label: "Next call in", value: this.recDepth > r.from ? "—" : `${Math.ceil(r.every - this.recTimer)} s` },
          { label: "n === 0 piece", value: this.goldOnShelf ? "on the shelf (C)" : this.unwinding ? "answered" : "in hand" },
          { label: "Returned", value: `${this.progress} / ${this.goal?.target ?? 0}` },
        ],
        log: { title: "Returned", items: this.returnLog.slice(0, 7) },
      };
    }
    if (s.listeners && !s.trace) {
      const leaky = this.listeners.find((l) => l.leaky)!;
      let dead = 0;
      for (const row of this.cellMeta) for (const m of row) if (m?.dead) dead++;
      const held = this.refCount(leaky.name);
      return {
        summary: `${leaky.name} ${leaky.attached ? "attached" : "removed"} · ${held} leaked cells · GC in ${Math.ceil(this.nextGcIn())}s · ${this.progress}/${this.goal?.target ?? 0} s`,
        code: { lines: s.code, active: leaky.attached ? 2 : 3 },
        lanes: [{ id: "roots", label: "Listener roots", items: this.listeners.filter((l) => l.attached).map((l) => `${l.name} · ${l.owner}`), note: "none" }],
        stats: [
          { label: "Survived", value: `${this.progress} / ${this.goal?.target ?? 0} s` },
          { label: `Cells held by ${leaky.name}`, value: String(held), tone: held > 0 ? "warn" : "ok" },
          { label: "Unreachable (next sweep)", value: String(dead) },
          { label: "Next GC sweep", value: `${Math.ceil(this.nextGcIn())} s` },
          { label: "Sweeps", value: String(this.sweeps) },
          { label: "Leak", value: leaky.attached ? `${leaky.name} still attached` : `fixed before sweep ${(this.meta.fixedBySweep ?? 0) + 1}`, tone: leaky.attached ? "bad" : "ok" },
        ],
        choice,
      };
    }
    if (s.closure) {
      let count = 0;
      let temp = 0;
      for (const row of this.cellMeta)
        for (const m of row) {
          if (m?.role === "count") count++;
          else if (m?.role === "temp") temp++;
        }
      const next = this.queue[0] !== undefined ? this.roleFor(this.pidSeq + 1) : undefined;
      return {
        summary: `backpack ${count} cells · temp ${temp} · GC in ${Math.ceil(this.nextGcIn())}s · clears ${this.progress}/${this.goal?.target ?? 0}`,
        code: { lines: s.code, active: this.piece?.role === "count" ? 1 : this.piece?.role === "temp" ? 2 : 3 },
        lanes: [
          { id: "main", label: "main() holds", items: ["inc"] },
          { id: "backpack", label: "inc's backpack", items: [`count ×${count}`] },
          { id: "none", label: "No link", items: temp > 0 ? [`temp ×${temp}`] : [], note: "swept" },
        ],
        stats: [
          { label: "Next GC sweep", value: `${Math.ceil(this.nextGcIn())} s` },
          { label: "This piece", value: this.piece?.role ?? "—" },
          { label: "Next piece", value: next ?? "—" },
          { label: "Rows completed after a sweep", value: `${this.progress} / ${this.goal?.target ?? 0}` },
        ],
      };
    }
    if (this.finale) {
      const top = this.frames[this.frames.length - 1];
      const fn = top?.name.replace("()", "");
      const active = fn ? s.code.findIndex((l) => l.startsWith(`function ${fn}(`)) : undefined;
      const leaky = this.listeners.find((l) => l.leaky)!;
      let alive = 0;
      let dead = 0;
      for (const row of this.cellMeta)
        for (const m of row) {
          if (!m || m.slab !== undefined) continue;
          if (m.dead) dead++;
          else alive++;
        }
      const held = this.refCount(leaky.name);
      const shelf = this.shelf[0];
      const locked = shelf && !shelf.used && this.lockCount < (shelf.decl.declaredAt ?? 0);
      return {
        summary: `${top ? `top ${top.name}` : "stack empty"} · ${leaky.name} ${leaky.attached ? "attached" : "removed"} · GC in ${Math.ceil(this.nextGcIn())}s`,
        code: { lines: s.code, active: active !== undefined && active >= 0 ? active : undefined },
        lanes: [
          { id: "stack", label: "Call stack (top first)", items: [...this.frames].reverse().map((f) => f.name), note: "empty" },
          { id: "roots", label: "Listener roots", items: this.listeners.filter((l) => l.attached).map((l) => l.name), note: "none" },
          { id: "shelf", label: "Hoisted shelf (C)", items: shelf ? [`${shelf.decl.kind} ${shelf.decl.name}: ${shelf.used ? "used" : locked ? `🔒 until #${shelf.decl.declaredAt}` : "ready"}`] : [] },
        ],
        stats: [
          { label: "Frames returned", value: `${this.progress} / ${this.goal?.target ?? 0}` },
          { label: "Allocations alive", value: String(alive) },
          { label: `Kept alive by ${leaky.name}`, value: String(held), tone: held > 0 ? "warn" : "ok" },
          { label: "Unreachable (next sweep)", value: String(dead) },
          { label: "Next GC sweep", value: `${Math.ceil(this.nextGcIn())} s` },
          { label: "Slips", value: String(this.slips), tone: this.slips > 0 ? "warn" : "ok" },
        ],
        log: { title: "Returned", items: this.returnLog.slice(0, 5) },
        choice,
      };
    }
    if (s.heap) {
      let live = 0;
      let dead = 0;
      for (const row of this.cellMeta)
        for (const m of row) {
          if (!m) continue;
          if (m.dead) dead++;
          else live++;
        }
      const next = Math.max(0, s.heap.gcEvery - this.sweepTimer);
      return {
        summary: `Next GC in ${Math.ceil(next)}s · ${dead} unreachable · sweeps ${this.sweeps}/${s.heap.sweepsToWin}`,
        code: { lines: s.code },
        lanes: [{ id: "stack", label: "Call stack", items: [this.heapFrameName(), "main()"] }],
        stats: [
          { label: "Reachable cells", value: String(live) },
          { label: "Unreachable", value: String(dead), tone: dead > 0 ? "warn" : undefined },
          { label: "Next GC sweep", value: `${Math.ceil(next)} s` },
          { label: "Sweeps", value: `${this.sweeps} / ${s.heap.sweepsToWin}`, tone: this.sweeps >= s.heap.sweepsToWin ? "ok" : undefined },
          { label: "Holes left by sweeps", value: String(this.meta.sweepHoles ?? 0), tone: (this.meta.sweepHoles ?? 0) > 0 ? "warn" : "ok" },
        ],
      };
    }
    if (s.hoist) {
      const items = this.shelf.map((it) => {
        const d = it.decl;
        const locked = (d.kind === "let" || d.kind === "const") && this.lockCount < (d.declaredAt ?? 0);
        const undef = d.kind === "var" && this.lockCount < (d.assignedAt ?? 0);
        const state = it.used ? "used" : locked ? `🔒 until #${d.declaredAt}` : undef ? "undefined" : "ready";
        return `${d.kind} ${d.name}: ${state}`;
      });
      const stats: NonNullable<ConceptView["stats"]> = [{ label: "Pieces placed", value: String(this.lockCount) }];
      if (s.hoist.tetrisWithin) stats.push({ label: "Tetris window", value: `${Math.min(this.lockCount, s.hoist.tetrisWithin)} / ${s.hoist.tetrisWithin}`, tone: this.lockCount >= s.hoist.tetrisWithin - 1 ? "warn" : undefined });
      return {
        summary: items.join(" · "),
        code: { lines: s.code, active: this.lastRun },
        lanes: [{ id: "shelf", label: "Hoisted shelf (C)", items }],
        stats,
      };
    }
    return undefined;
  }

  private frameColor(i: number, p: Palette): string {
    return [p.accent, p.lilac, p.mint, p.sky, p.sun][i % 5];
  }

  /** S1: frame slabs are drawn as labelled bars with one gap. */
  private drawSlabs(ctx: CanvasRenderingContext2D, p: Palette, t: number): void {
    this.frames.forEach((f, i) => {
      const y = BOARD_Y + (f.row - HIDDEN) * CELL;
      const isTop = i === this.frames.length - 1;
      const wide = this.lsc?.recursion && f.gapCol >= 0 ? 2 : 1;
      const segs: [number, number][] = f.gapCol < 0 ? [[0, COLS]] : [
        [0, f.gapCol],
        [f.gapCol + wide, COLS],
      ];
      for (const [a, b] of segs) {
        if (b <= a) continue;
        ctx.save();
        ctx.fillStyle = this.frameColor(i, p);
        roundRectPath(ctx, BOARD_X + a * CELL + 1.5, y + 1.5, (b - a) * CELL - 3, CELL - 3, 6);
        ctx.fill();
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
      const left = f.gapCol < 0 || f.gapCol >= 4 ? 0 : f.gapCol + wide;
      text(ctx, p, f.name, BOARD_X + left * CELL + 8, y + CELL / 2 + 1, 13, i === 0 ? p.onAccent : p.ink, "left", 700, "mono");
      if (f.gapCol < 0) text(ctx, p, "sealed", BOARD_X + BOARD_W - 8, y + CELL / 2 + 1, 11, p.ink, "right", 700, "mono");
      if (isTop && f.gapCol >= 0 && this.state === "playing") {
        ctx.save();
        ctx.strokeStyle = wide > 1 ? p.sun : p.route;
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6);
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 3]);
        roundRectPath(ctx, BOARD_X + f.gapCol * CELL + 2, y + 2, CELL * wide - 4, CELL - 4, 5);
        ctx.stroke();
        ctx.restore();
        if (wide > 1) text(ctx, p, "n === 0", BOARD_X + (f.gapCol + 1) * CELL, y + CELL / 2 + 1, 11, p.sun, "center", 800, "mono");
      }
    });
  }

  /** S3/S5 cell overlays: unreachable hatching, frame stripes, return rings, hollow vars. */
  private drawCellMeta(ctx: CanvasRenderingContext2D, p: Palette, m: CellMeta, x: number, y: number): void {
    ctx.save();
    if (m.dead) {
      ctx.fillStyle = p.border;
      roundRectPath(ctx, x + 1.5, y + 1.5, CELL - 3, CELL - 3, 5);
      ctx.fill();
      ctx.clip();
      ctx.strokeStyle = p.muted;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = -CELL; k < CELL * 2; k += 6) {
        ctx.moveTo(x + k, y + CELL);
        ctx.lineTo(x + k + CELL, y);
      }
      ctx.stroke();
    } else if (m.fserial !== undefined || m.owner !== undefined) {
      ctx.fillStyle = m.ret ? p.ink : this.frameColor((m.fserial ?? m.owner ?? 0) % 5, p);
      ctx.fillRect(x + 4, y + 3, CELL - 8, 3);
      if (m.ret) {
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + CELL / 2, y + CELL / 2 + 2, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (m.gold) this.drawGoldMark(ctx, p, x, y);
    if (m.role) this.drawRoleMark(ctx, p, m.role, x, y);
    if (m.ref) {
      // Referenced by a listener: a lilac link dot (never colour alone: dead cells are hatched, these are not).
      ctx.fillStyle = p.lilac;
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + CELL - 6, y + 6, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  /** S2: the gold piece carries a "0" glyph in each cell. */
  private drawGoldMark(ctx: CanvasRenderingContext2D, p: Palette, x: number, y: number): void {
    ctx.save();
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    roundRectPath(ctx, x + 4.5, y + 4.5, CELL - 9, CELL - 9, 4);
    ctx.stroke();
    ctx.restore();
    text(ctx, p, "0", x + CELL / 2, y + CELL / 2 + 1, 13, p.ink, "center", 800, "mono");
  }

  /** S7: count cells wear a dotted backpack bracket; temp cells a hollow ring. */
  private drawRoleMark(ctx: CanvasRenderingContext2D, p: Palette, role: "count" | "temp", x: number, y: number): void {
    ctx.save();
    if (role === "count") {
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      roundRectPath(ctx, x + 5, y + 5, CELL - 10, CELL - 10, 3);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = p.paper;
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + CELL / 2, y + CELL / 2, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Dashed limit line across the well with a label (memory limit / stack limit). */
  private drawLimit(ctx: CanvasRenderingContext2D, p: Palette, row: number, label: string): void {
    const ly = BOARD_Y + row * CELL;
    ctx.save();
    ctx.strokeStyle = p.route;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(BOARD_X, ly);
    ctx.lineTo(BOARD_X + BOARD_W, ly);
    ctx.stroke();
    ctx.restore();
    text(ctx, p, label, BOARD_X + BOARD_W - 6, ly - 9, 11, p.route, "right", 700, "mono");
  }

  private drawSweepLine(ctx: CanvasRenderingContext2D, p: Palette): void {
    if (this.sweepAnim <= 0 || this.fx.reduced) return;
    const sy = BOARD_Y + (1 - this.sweepAnim) * BOARD_H;
    ctx.save();
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(BOARD_X, sy - 10, BOARD_W, 20);
    ctx.globalAlpha = 1;
    ctx.fillRect(BOARD_X, sy - 1.5, BOARD_W, 3);
    ctx.restore();
  }

  /** Shelf card used by S5/S6 and the finale: the declaration, its mini piece and its state. */
  private drawShelfCard(ctx: CanvasRenderingContext2D, p: Palette, it: { decl: HoistDecl; used: boolean }, y: number, floating: boolean): void {
    const d = it.decl;
    const locked = (d.kind === "let" || d.kind === "const") && this.lockCount < (d.declaredAt ?? 0);
    const undef = d.kind === "var" && this.lockCount < (d.assignedAt ?? 0);
    card(ctx, p, SIDE_X, y, SIDE_W + 8, 82, 10, it.used ? p.bg : p.surface);
    text(ctx, p, `${d.kind} ${d.name}`, SIDE_X + 8, y + 14, 12, it.used ? p.muted : p.fg, "left", 700, "mono");
    if (!it.used && !floating) {
      ctx.save();
      if (locked || undef) ctx.globalAlpha = 0.45;
      this.drawMini(ctx, p, d.piece as Kind, SIDE_X + (SIDE_W + 8) / 2, y + 48, false);
      ctx.restore();
    }
    const state = it.used ? "used" : locked ? `🔒 #${d.declaredAt}` : undef ? "undefined" : "ready";
    text(ctx, p, floating ? "hoisting…" : state, SIDE_X + SIDE_W, y + 72, 12, locked ? p.route : undef || floating ? p.muted : p.accent, "right", 700, "mono");
  }

  /** Progress of shelf item i's float from the Next column to the shelf (0..1). */
  private hoistProgress(i: number): number {
    if (this.hoistAnim <= 0) return 1;
    const t = (HOIST_FLOAT - this.hoistAnim) / (HOIST_FLOAT * 0.75) - i * 0.18;
    const k = Math.min(1, Math.max(0, t));
    return 1 - (1 - k) * (1 - k) * (1 - k);
  }

  /** The hoist float: minis glide from the queue to their shelf slots (reduced motion skips it). */
  private drawHoistFloat(ctx: CanvasRenderingContext2D, p: Palette): void {
    if (this.hoistAnim <= 0) return;
    this.shelf.forEach((it, i) => {
      const k = this.hoistProgress(i);
      if (k >= 1) return;
      const fromX = RIGHT_X + SIDE_W / 2;
      const fromY = BOARD_Y + 56 + Math.min(2, i) * 66;
      const toX = SIDE_X + (SIDE_W + 8) / 2;
      const toY = this.shelfY(i) + 48;
      const x = fromX + (toX - fromX) * k;
      const y = fromY + (toY - fromY) * k - Math.sin(k * Math.PI) * 60;
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.45 * k;
      this.drawMini(ctx, p, it.decl.piece as Kind, x, y, false);
      ctx.restore();
      this.tag(ctx, p, `${it.decl.kind} ${it.decl.name} ↑`, x, y - 30);
    });
  }

  private shelfY(i: number): number {
    return BOARD_Y + 22 + i * 92;
  }

  private drawHollow(ctx: CanvasRenderingContext2D, p: Palette, kind: Kind, x: number, y: number): void {
    ctx.save();
    ctx.strokeStyle = tileColor(kind, p);
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 3]);
    roundRectPath(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 5);
    ctx.stroke();
    ctx.restore();
    text(ctx, p, "u", x + CELL / 2, y + CELL / 2 + 1, 12, p.muted, "center", 700, "mono");
  }

  /** Left column for Learn levels: the hoisted shelf, the heap meter, or stack depth. */
  private drawLearnSide(ctx: CanvasRenderingContext2D, p: Palette): void {
    const s = this.lsc!;
    const leftX = SIDE_X;
    if (s.hoist) {
      text(ctx, p, "Hoisted", leftX, BOARD_Y + 8, 13, p.muted, "left", 700);
      this.shelf.forEach((it, i) => this.drawShelfCard(ctx, p, it, this.shelfY(i), this.hoistProgress(i) < 1));
      let y = this.shelfY(this.shelf.length) + 10;
      text(ctx, p, "C pulls", leftX, y, 12, p.muted, "left", 700);
      if (this.finale) {
        y += 28;
        text(ctx, p, "Listeners · R", leftX, y, 13, p.muted, "left", 700);
        this.listeners.forEach((l, i) => {
          const ly = y + 16 + i * 40;
          card(ctx, p, leftX, ly, SIDE_W + 8, 34, 8, l.attached ? p.surface : p.bg);
          text(ctx, p, l.name, leftX + 8, ly + 12, 12, l.attached ? p.fg : p.muted, "left", 700, "mono");
          text(ctx, p, l.attached ? l.owner : "removed", leftX + 8, ly + 25, 10, p.muted, "left", 600);
        });
        y += 16 + this.listeners.length * 40 + 14;
        text(ctx, p, "Next GC", leftX, y, 13, p.muted, "left", 700);
        const next = this.nextGcIn();
        text(ctx, p, `${Math.ceil(next)}s`, leftX, y + 26, 24, next < 4 ? p.route : p.fg, "left", 800, "display");
        y += 58;
        text(ctx, p, "Returned", leftX, y, 13, p.muted, "left", 700);
        text(ctx, p, `${this.progress}/${this.goal?.target ?? 0}`, leftX, y + 26, 24, p.fg, "left", 800, "display");
      }
      return;
    }
    if (s.recursion) {
      const usable = ROWS - HIDDEN - s.recursion.limitRow;
      const used = ROWS - this.topFilledRow();
      text(ctx, p, "Stack depth", leftX, BOARD_Y + 8, 13, p.muted, "left", 700);
      text(ctx, p, String(this.frames.length), leftX, BOARD_Y + 38, 30, p.fg, "left", 800, "display");
      text(ctx, p, "Rows to limit", leftX, BOARD_Y + 82, 13, p.muted, "left", 700);
      text(ctx, p, `${used}/${usable}`, leftX, BOARD_Y + 110, 24, used >= usable - 3 ? p.route : p.fg, "left", 800, "display");
      text(ctx, p, "Base case", leftX, BOARD_Y + 156, 13, p.muted, "left", 700);
      card(ctx, p, leftX, BOARD_Y + 170, SIDE_W + 8, 82, 10, this.goldOnShelf ? p.surface : p.bg);
      text(ctx, p, "n === 0", leftX + 8, BOARD_Y + 184, 12, this.goldOnShelf ? p.fg : p.muted, "left", 700, "mono");
      if (this.goldOnShelf) {
        this.drawMini(ctx, p, 1, leftX + (SIDE_W + 8) / 2, BOARD_Y + 218, false);
        text(ctx, p, "0", leftX + (SIDE_W + 8) / 2 - 8.5, BOARD_Y + 210, 12, p.ink, "center", 800, "mono");
        text(ctx, p, "0", leftX + (SIDE_W + 8) / 2 + 8.5, BOARD_Y + 210, 12, p.ink, "center", 800, "mono");
      }
      text(ctx, p, this.goldOnShelf ? "C pulls" : this.unwinding ? "answered" : "in hand", leftX + SIDE_W, BOARD_Y + 242, 12, p.muted, "right", 700, "mono");
      text(ctx, p, "Returned", leftX, BOARD_Y + 276, 13, p.muted, "left", 700);
      text(ctx, p, `${this.progress}/${this.goal?.target ?? 0}`, leftX, BOARD_Y + 304, 24, p.fg, "left", 800, "display");
      return;
    }
    if (s.listeners) {
      text(ctx, p, "Listeners", leftX, BOARD_Y + 8, 13, p.muted, "left", 700);
      this.listeners.forEach((l, i) => {
        const y = BOARD_Y + 22 + i * 68;
        card(ctx, p, leftX, y, SIDE_W + 8, 60, 10, l.attached ? p.surface : p.bg);
        text(ctx, p, l.name, leftX + 8, y + 14, 12, l.attached ? p.fg : p.muted, "left", 700, "mono");
        text(ctx, p, l.owner, leftX + 8, y + 31, 10, p.muted, "left", 600);
        text(ctx, p, l.attached ? "attached" : "removed", leftX + SIDE_W, y + 48, 11, l.attached ? p.route : p.accent, "right", 700, "mono");
      });
      const y0 = BOARD_Y + 22 + this.listeners.length * 68;
      text(ctx, p, "C removes one", leftX, y0 + 8, 12, p.muted, "left", 700);
      text(ctx, p, "Next GC", leftX, y0 + 40, 13, p.muted, "left", 700);
      const next = this.nextGcIn();
      text(ctx, p, `${Math.ceil(next)}s`, leftX, y0 + 68, 26, next < 4 ? p.route : p.fg, "left", 800, "display");
      text(ctx, p, "Survived", leftX, y0 + 112, 13, p.muted, "left", 700);
      text(ctx, p, `${this.progress}/${this.goal?.target ?? 0}s`, leftX, y0 + 140, 24, p.fg, "left", 800, "display");
      const held = this.refCount();
      text(ctx, p, "Leaked cells", leftX, y0 + 184, 13, p.muted, "left", 700);
      text(ctx, p, String(held), leftX, y0 + 212, 24, held > 0 ? p.route : p.fg, "left", 800, "display");
      return;
    }
    if (s.closure) {
      text(ctx, p, "Next GC", leftX, BOARD_Y + 8, 13, p.muted, "left", 700);
      const next = this.nextGcIn();
      text(ctx, p, `${Math.ceil(next)}s`, leftX, BOARD_Y + 36, 26, next < 4 ? p.route : p.fg, "left", 800, "display");
      text(ctx, p, "After-sweep rows", leftX, BOARD_Y + 80, 13, p.muted, "left", 700);
      text(ctx, p, `${this.progress}/${this.goal?.target ?? 0}`, leftX, BOARD_Y + 108, 24, p.fg, "left", 800, "display");
      const legendY = BOARD_Y + 160;
      text(ctx, p, "Legend", leftX, legendY, 13, p.muted, "left", 700);
      this.drawTile(ctx, p, 2, leftX, legendY + 14, CELL);
      this.drawRoleMark(ctx, p, "count", leftX, legendY + 14);
      text(ctx, p, "count", leftX + CELL + 8, legendY + 20, 12, p.fg, "left", 700, "mono");
      text(ctx, p, "kept (backpack)", leftX + CELL + 8, legendY + 34, 10, p.muted, "left", 600);
      this.drawTile(ctx, p, 2, leftX, legendY + 50, CELL, false, true);
      this.drawRoleMark(ctx, p, "temp", leftX, legendY + 50);
      text(ctx, p, "temp", leftX + CELL + 8, legendY + 56, 12, p.fg, "left", 700, "mono");
      text(ctx, p, "swept by GC", leftX + CELL + 8, legendY + 70, 10, p.muted, "left", 600);
      return;
    }
    if (s.heap) {
      text(ctx, p, "Next GC", leftX, BOARD_Y + 8, 13, p.muted, "left", 700);
      const next = Math.max(0, s.heap.gcEvery - this.sweepTimer);
      text(ctx, p, `${Math.ceil(next)}s`, leftX, BOARD_Y + 36, 26, next < 4 ? p.route : p.fg, "left", 800, "display");
      text(ctx, p, "Sweeps", leftX, BOARD_Y + 80, 13, p.muted, "left", 700);
      text(ctx, p, `${this.sweeps}/${s.heap.sweepsToWin}`, leftX, BOARD_Y + 106, 24, p.fg, "left", 800, "display");
      text(ctx, p, "Lines", leftX, BOARD_Y + 150, 13, p.muted, "left", 700);
      text(ctx, p, `${this.lines}/${this.goal?.target ?? 0}`, leftX, BOARD_Y + 176, 24, p.fg, "left", 800, "display");
      text(ctx, p, "Allocating", leftX, BOARD_Y + 220, 13, p.muted, "left", 700);
      text(ctx, p, this.heapFrameName(), leftX, BOARD_Y + 242, 13, this.frameColor(this.heapSerial, p), "left", 700, "mono");
      return;
    }
    if (s.trace) {
      text(ctx, p, "Stack depth", leftX, BOARD_Y + 8, 13, p.muted, "left", 700);
      text(ctx, p, String(this.frames.length), leftX, BOARD_Y + 38, 30, p.fg, "left", 800, "display");
      text(ctx, p, "Returned", leftX, BOARD_Y + 84, 13, p.muted, "left", 700);
      text(ctx, p, `${this.progress}/${this.goal?.target ?? 0}`, leftX, BOARD_Y + 112, 24, p.fg, "left", 800, "display");
    }
  }

  private drawTile(ctx: CanvasRenderingContext2D, p: Palette, kind: Kind, px: number, py: number, size: number, ghost = false, dim = false): void {
    const color = tileColor(kind, p);
    const inset = Math.max(1, size * 0.06);
    const r = size * 0.22;
    ctx.save();
    if (ghost) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      roundRectPath(ctx, px + inset + 1, py + inset + 1, size - inset * 2 - 2, size - inset * 2 - 2, r);
      ctx.stroke();
    } else {
      if (dim) ctx.globalAlpha = 0.45;
      ctx.fillStyle = color;
      roundRectPath(ctx, px + inset, py + inset, size - inset * 2, size - inset * 2, r);
      ctx.fill();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = Math.max(1.2, size * 0.07);
      ctx.stroke();
      // soft highlight
      ctx.globalAlpha = (dim ? 0.2 : 0.45) * 1;
      ctx.fillStyle = p.paper;
      roundRectPath(ctx, px + inset + size * 0.18, py + inset + size * 0.16, size * 0.3, size * 0.14, size * 0.06);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Small paper tag with mono text (entity labels for curriculum levels). */
  private tag(ctx: CanvasRenderingContext2D, p: Palette, str: string, cx: number, cy: number): void {
    ctx.save();
    ctx.font = `700 11px ${p.mono}`;
    const w = ctx.measureText(str).width + 12;
    ctx.fillStyle = p.paper;
    roundRectPath(ctx, cx - w / 2, cy - 9, w, 18, 6);
    ctx.fill();
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = p.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(str, cx, cy + 0.5);
    ctx.restore();
  }

  private drawMini(ctx: CanvasRenderingContext2D, p: Palette, kind: Kind | null, cx: number, cy: number, dim: boolean): void {
    if (kind === null) return;
    const m = SHAPES[kind][0];
    const size = 17;
    const rows = m.filter((row) => row.some(Boolean)).length;
    const cols = m.length;
    const ox = cx - (cols * size) / 2;
    const oy = cy - (rows * size) / 2 - (kind === 0 ? size / 2 : 0);
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m.length; c++) {
        if (m[r][c]) this.drawTile(ctx, p, kind, ox + c * size, oy + r * size, size, false, dim);
      }
    }
  }

  protected draw(ctx: CanvasRenderingContext2D, p: Palette): void {
    ctx.fillStyle = p.bg;
    ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);

    // Board card
    const squash = this.landed > 0 ? this.landed * 1.5 : 0;
    card(ctx, p, BOARD_X - 2, BOARD_Y - 2 + squash, BOARD_W + 4, BOARD_H + 4 - squash, 12, p.card, 4);
    ctx.save();
    ctx.fillStyle = p.border;
    for (let c = 1; c < COLS; c++) {
      for (let r = 1; r < ROWS - HIDDEN; r++) {
        ctx.fillRect(BOARD_X + c * CELL - 1, BOARD_Y + r * CELL - 1, 2, 2);
      }
    }
    ctx.restore();

    ctx.save();
    roundRectPath(ctx, BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 10);
    ctx.clip();

    const over = this.state === "over" && !this.story;
    for (let r = HIDDEN; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const k = this.board[r]?.[c];
        if (k === undefined || k === -1) continue;
        const m = this.cellMeta[r]?.[c];
        if (m?.slab !== undefined) continue;
        const x = BOARD_X + c * CELL;
        const y = BOARD_Y + (r - HIDDEN) * CELL;
        if (m?.hollow) {
          this.drawHollow(ctx, p, k, x, y);
          continue;
        }
        if (!m?.dead) this.drawTile(ctx, p, k, x, y, CELL, false, (over && this.outcome !== "won") || m?.role === "temp");
        if (m) this.drawCellMeta(ctx, p, m, x, y);
      }
    }
    if (this.lsc?.trace || this.lsc?.recursion) this.drawSlabs(ctx, p, performance.now() / 1000);
    const gc = this.gcConf();
    if (gc?.limitRow !== undefined) this.drawLimit(ctx, p, gc.limitRow, "memory limit");
    if (this.lsc?.recursion) this.drawLimit(ctx, p, this.lsc.recursion.limitRow, "stack limit");
    if (gc) this.drawSweepLine(ctx, p);

    const piece = this.piece;
    if (piece && this.state !== "over") {
      const m = SHAPES[piece.kind][piece.rot];
      const gy = this.ghostY();
      if (gy !== piece.y && !this.params.noGhost) {
        for (let r = 0; r < m.length; r++) {
          for (let c = 0; c < m.length; c++) {
            if (!m[r][c]) continue;
            const by = gy + r - HIDDEN;
            if (by < 0) continue;
            this.drawTile(ctx, p, piece.kind, BOARD_X + (piece.x + c) * CELL, BOARD_Y + by * CELL, CELL, true);
          }
        }
      }
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m.length; c++) {
          if (!m[r][c]) continue;
          const by = piece.y + r - HIDDEN;
          if (by < 0) continue;
          const px = BOARD_X + (piece.x + c) * CELL;
          const py = BOARD_Y + by * CELL;
          if (piece.hollow) this.drawHollow(ctx, p, piece.kind, px, py);
          else {
            this.drawTile(ctx, p, piece.kind, px, py, CELL, false, piece.role === "temp");
            if (piece.gold) this.drawGoldMark(ctx, p, px, py);
            if (piece.role) this.drawRoleMark(ctx, p, piece.role, px, py);
          }
        }
      }
      const lab = piece.decl ?? piece.role ?? (this.lsc?.heap ? this.heapFrameName() : this.finale ? this.frames[this.frames.length - 1]?.name : undefined) ?? this.label(NAMES[piece.kind]);
      if (lab) {
        let top = m.length;
        let left = m.length;
        let right = -1;
        for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++) if (m[r][c]) { top = Math.min(top, r); left = Math.min(left, c); right = Math.max(right, c); }
        const cx = BOARD_X + (piece.x + (left + right + 1) / 2) * CELL;
        const cy = BOARD_Y + (piece.y + top - HIDDEN) * CELL - 12;
        if (cy > BOARD_Y + 6) this.tag(ctx, p, lab, cx, cy);
      }
    }

    if (this.clearing.length > 0) {
      const t = Math.min(1, this.clearTimer / CLEAR_TIME);
      ctx.save();
      for (const r of this.clearing) {
        const inset = (BOARD_W / 2) * t;
        ctx.globalAlpha = 1 - t * 0.5;
        ctx.fillStyle = this.clearing.length >= 4 ? p.sun : p.paper;
        roundRectPath(ctx, BOARD_X + inset, BOARD_Y + (r - HIDDEN) * CELL + 2, Math.max(0, BOARD_W - inset * 2), CELL - 4, 6);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();

    // Left column: Hold + stats (Learn levels draw their own concept column)
    const leftX = 22;
    const leftW = 104;
    if (this.lsc) this.drawLearnSide(ctx, p);
    else {
    text(ctx, p, "Hold", leftX, BOARD_Y + 8, 13, p.muted, "left", 700);
    card(ctx, p, leftX, BOARD_Y + 20, leftW, 72, 10, p.surface);
    this.drawMini(ctx, p, this.holdKind, leftX + leftW / 2, BOARD_Y + 56, !this.canHold);
    if (this.params.noHold) text(ctx, p, "off", leftX + leftW / 2, BOARD_Y + 56, 14, p.muted, "center", 700);
    else if (this.holdKind === null) text(ctx, p, "C", leftX + leftW / 2, BOARD_Y + 56, 16, p.border, "center", 700, "display");

    const statY = BOARD_Y + 126;
    const stats: [string, string][] = this.story
      ? [
          ["Lines", String(this.lines)],
          ["Level", String(this.level)],
          ["Score", this.score.toLocaleString()],
        ]
      : [
          ["Score", this.score.toLocaleString()],
          ["Best", this.high.toLocaleString()],
          ["Level", String(this.level)],
          ["Lines", String(this.lines)],
        ];
    stats.forEach(([k, v], i) => {
      text(ctx, p, k, leftX, statY + i * 58, 13, p.muted, "left", 700);
      const hot = this.glow > 0 && (k === "Score" || k === "Lines");
      text(ctx, p, v, leftX, statY + i * 58 + 24, 24, hot ? p.accent : p.fg, "left", 800, "display");
    });
    }

    // Right column: Next
    const rightX = RIGHT_X;
    text(ctx, p, "Next", rightX, BOARD_Y + 8, 13, p.muted, "left", 700);
    card(ctx, p, rightX, BOARD_Y + 20, leftW, 204, 10, p.surface);
    this.queue.slice(0, 3).forEach((k, i) => {
      this.drawMini(ctx, p, k, rightX + leftW / 2, BOARD_Y + 56 + i * 66, i > 0);
      const lab = this.roleFor(this.pidSeq + 1 + i) ?? this.label(NAMES[k]);
      if (lab) text(ctx, p, lab, rightX + leftW / 2, BOARD_Y + 56 + i * 66 + 26, 10, i > 0 ? p.muted : p.fg, "center", 700, "mono");
    });
    if (this.lsc?.hoist) this.drawHoistFloat(ctx, p);

    const speedY = BOARD_Y + 250;
    text(ctx, p, "Speed", rightX, speedY, 13, p.muted, "left", 700);
    const bars = 10;
    const lit = Math.min(bars, Math.round(((1 - gravitySeconds(this.level) / 0.85) / (1 - 0.07 / 0.85)) * bars));
    for (let i = 0; i < bars; i++) {
      ctx.fillStyle = i < lit ? (i > 6 ? p.route : p.accent) : p.border;
      roundRectPath(ctx, rightX + i * 10, speedY + 14, 7, 10, 2);
      ctx.fill();
    }
    if (this.softHeld && this.state === "playing") text(ctx, p, "Soft drop", rightX, speedY + 44, 12, p.accent, "left", 700);
  }
}

function singular(noun: string): string {
  return noun.endsWith("s") && noun.length > 3 ? noun.slice(0, -1) : noun;
}

const legend = [
  { keys: "← →", does: "move" },
  { keys: "↑ / X", does: "rotate" },
  { keys: "Z", does: "rotate the other way" },
  { keys: "↓", does: "soft drop" },
  { keys: "Space", does: "hard drop" },
  { keys: "C / Shift", does: "hold (Learn: shelf / base case / remove listener)" },
  { keys: "R", does: "remove a listener (Learn S8)" },
  { keys: "P / Esc", does: "pause" },
];

const touch: TouchLayout = {
  left: [
    { action: "left", label: "←", aria: "Move left" },
    { action: "right", label: "→", aria: "Move right" },
    { action: "soft", label: "↓", aria: "Soft drop" },
  ],
  right: [
    { action: "hold", label: "Hold", aria: "Hold piece", wide: true },
    { action: "cw", label: "↻", aria: "Rotate" },
    { action: "hard", label: "Drop", aria: "Hard drop", wide: true },
  ],
};

/** Learn levels relabel Hold: the hoisted shelf, the base case, or Remove listener (S8 gets a separate Remove pad). */
function learnTouch(s: StackerScript | undefined): TouchLayout {
  if (!s) return touch;
  const right = [...touch.right];
  if (s.hoist) right[0] = { action: "hold", label: "Shelf", aria: "Pull the next declaration off the hoisted shelf", wide: true };
  else if (s.recursion) right[0] = { action: "hold", label: "n === 0", aria: "Pull the base case piece", wide: true };
  else if (s.listeners) right[0] = { action: "hold", label: "Remove listener", aria: "Remove a listener", wide: true };
  if (s.listeners && (s.hoist || s.trace)) right.splice(1, 0, { action: "remove", label: "Remove", aria: "Remove a listener", wide: true });
  return { left: touch.left, right };
}

export function Stacker(props: GameComponentProps) {
  const opts = useGameOptions(props);
  const create = useCallback(() => new StackerGame(opts), [opts]);
  const script = props.level?.track === "learn" ? (props.level.script as StackerScript | undefined) : undefined;
  const pads = useMemo(() => learnTouch(script), [script]);
  return <GameShell create={create} label={props.flavor?.title ?? "Stacker"} legend={legend} touch={pads} extras={{ ...props, gameName: props.gameName ?? "Stacker" }} />;
}
