"use client";

import { useCallback, useMemo } from "react";
import { BaseGame, fmtTime, haptic, lerp, Rng, roundRectPath, text } from "./engine";
import type { ConceptView, GameOptions, Gesture, Palette, TouchLayout } from "./engine";
import { FILTERS, GAP_OPTIONS, gapAnswer, hiddenBy, POLICIES } from "./games/concepts/types";
import type { FixLike, RouteScript, ZoneKind } from "./games/concepts/types";
import { GameShell, useGameOptions } from "./game-shell";
import type { GameComponentProps } from "./game-shell";

// Story progress for Route = pings collected. Regular pins and bonus pins
// each count 1 toward goal.target.

const N = 22;
const CELL = 24;
const GRID = N * CELL;
const WIDTH = GRID;
const HEIGHT = GRID;
const BASE_INTERVAL = 0.19;
const MIN_INTERVAL = 0.075;
const RAMP = 0.975;
const BONUS_TTL = 6;
const BONUS_GAP_MIN = 6;
const BONUS_GAP_MAX = 11;
/** Seconds you get to turn away after bumping an edge or your own trail. */
const GRACE = 0.26;

interface Cell {
  x: number;
  y: number;
}

interface Bonus extends Cell {
  ttl: number;
}

/** R6: a bad fix thrown by glass. Solid while visible; counts on the raw odometer forever. */
interface Spike extends Cell, FixLike {
  from: Cell;
  ttl: number;
  km: number;
  kind: "jump" | "blob" | "drift";
}

/** R7: a raw pin inside a building with two road candidates. */
interface Snap {
  raw: Cell;
  /** Sub-cell nudge of the raw pin toward the decoy, so it looks nearer in metres. */
  off: Cell;
  good: Cell;
  bad: Cell | null;
  goodM: number;
  badM: number;
}

const key = (c: Cell) => c.y * N + c.x;

type Dir = "up" | "down" | "left" | "right";
const DIRS: Dir[] = ["up", "down", "left", "right"];
const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

function isDir(a: string): a is Dir {
  return (DIRS as string[]).includes(a);
}

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
    Space: "fix",
    KeyF: "fix",
    KeyP: "pause",
    Escape: "pause",
    Enter: "start",
    Digit1: "c1",
    Digit2: "c2",
    Digit3: "c3",
    Digit4: "c4",
  } as const;
  protected readonly title = "Route";
  protected readonly defaultNoun = "pings";
  protected overTitle = "Off route";

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
  private stalled = 0;
  private stallCell: Cell | null = null;
  private obstacles: Cell[] = [];
  private turnedV = false;
  private turnedH = false;
  // Learn state
  private pingAcc = 5;
  private pingId = "";
  private usedIds = new Set<string>();
  private decoys: (Cell & { acc: number; ttl: number })[] = [];
  private decoyTimer = 0;
  private storedNotShown = 0;
  private outboxOn = false;
  private lostOnce = false;
  private outboxQ: { seq: number; rec: number; id: string }[] = [];
  private seq = 0;
  private syncLog: string[] = [];
  private wasInZone = false;
  private ghosts: (Cell & { id: string; ttl: number })[] = [];
  private ghostPlan: { id: string; at: number }[] = [];
  private seen: string[] = [];
  private keyPin: Cell | null = null;
  private keyOn = false;
  private keySpawned = false;
  private wasAsleep = false;
  private gapIdx = 0;
  private gapsDone = 0;
  private gapLog: string[] = [];
  private choice: { km: number; min: number } | null = null;
  // R2
  private fixes: Cell[] = [];
  private segs: { a: Cell; b: Cell; red: boolean }[] = [];
  private battery = 100;
  private turnAt = -9;
  private buildingSet = new Set<number>();
  // R6
  private spikes: Spike[] = [];
  private spikeTimer = 0;
  private spikeCycle = 0;
  private sel = { acc: 3, spd: 3, still: 1 };
  private odoTrue = 0;
  private legKm = 0;
  private realFixes: (FixLike & { legKm: number })[] = [];
  // R7
  private road: boolean[][] | null = null;
  private snapC: Snap | null = null;
  private reach = new Set<number>();
  // R8
  private cost = { upload: 0, snap: 0, geocode: 0 };
  private policy = { sampling: 0, snap: 0 };
  private sampleTimer = 0;
  private lastUploadAt = -9;
  private bolt: Bonus | null = null;
  private boltTimer = 6;
  private cached = 0;
  private keepPing: Cell | null = null;

  constructor(opts: GameOptions) {
    super("route", opts);
    this.reset();
  }

  progressLabel(): string {
    return this.learn ? "deliveries" : super.progressLabel();
  }

  protected tips(touch: boolean): string[] {
    const n = this.noun;
    const s = this.rs;
    if (s) {
      const steer = touch ? "Swipe on the map or use the pads to steer." : "Steer with the arrows or WASD.";
      if (s.manualFix) return [steer, touch ? "Fix records a point and costs battery. The server joins your points with straight lines." : "Space (or F) records a fix and costs battery. The server joins your fixes with straight lines."];
      if (s.filters) return [steer, touch ? "Spikes are solid. Tune the three display filters in the panel above the map." : "Spikes are solid. Tune the three display filters in the panel; keys 1, 2, 3 cycle them."];
      if (s.roads) return [steer, "Raw pins land inside buildings. Drive onto the road candidate inside the glow, not just the nearest one."];
      if (s.budget) return [steer, "Coins tick with every request. Open the panel: Sampling and Snap policies. ⚡ pins are cached addresses."];
      return [steer, "Don't hit the edge or your own trail. The panel shows what the server sees."];
    }
    return touch
      ? [`Swipe anywhere on the map to steer, or use the pad.`, `Collect the coral pins (${n}). Yellow pins pay 5x but expire.`, "Don't hit the edge or your own trail. You get a split second to turn away."]
      : [`Steer with the arrows or WASD.`, `Collect the coral pins (${n}). Yellow pins pay 5x but expire.`, "Don't hit the edge or your own trail. You get a split second to turn away."];
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
    this.stalled = 0;
    this.stallCell = null;
    this.turnedV = false;
    this.turnedH = false;
    this.interval = this.baseInterval();
    this.obstacles = [];
    const want = Math.min(30, this.params.obstacles ?? 0);
    let guard = 0;
    while (this.obstacles.length < want && guard++ < 500) {
      const c = { x: 1 + Math.floor(Math.random() * (N - 2)), y: 1 + Math.floor(Math.random() * (N - 2)) };
      // keep the start lane clear
      if (Math.abs(c.y - cy) <= 1 && c.x >= cx - 4 && c.x <= cx + 6) continue;
      if (this.obstacles.some((o) => Math.abs(o.x - c.x) + Math.abs(o.y - c.y) <= 1)) continue;
      this.obstacles.push(c);
    }
    this.usedIds = new Set<string>();
    this.placePing();
    if (this.learn) this.learnSetup();
    if (this.params.tutorial) {
      const n = this.noun;
      this.tutorial = [
        { desk: "Press ↓ or ↑ to turn", touch: "Swipe down or up to turn", done: () => this.turnedV },
        { desk: "Now ← or →. You cannot reverse", touch: "Now swipe left or right. You cannot reverse", done: () => this.turnedH },
        { desk: "Drive over the coral pin", touch: "Drive over the coral pin", done: () => this.eaten > 0 },
        { desk: `Two more ${n}. Watch your own trail`, touch: `Two more ${n}. Watch your own trail`, done: () => this.eaten > 1 },
      ];
    }
  }

  private baseInterval(): number {
    return BASE_INTERVAL / (this.params.speedMul ?? 1);
  }

  protected hudExtra(): string {
    const s = this.rs;
    if (s?.manualFix) return `Battery ${Math.round(this.battery)}%`;
    if (s?.budget) return `${this.coins()} / ${s.budget.cap} coins`;
    return `Trail ${this.snake.length} · ${(BASE_INTERVAL / this.interval).toFixed(1)}x`;
  }

  protected overLines(): string[] {
    return this.story ? [] : [`Trail length ${this.snake.length}`];
  }

  private occupied(c: Cell): boolean {
    return (
      this.snake.some((s) => s.x === c.x && s.y === c.y) ||
      this.obstacles.some((o) => o.x === c.x && o.y === c.y) ||
      (this.ping.x === c.x && this.ping.y === c.y) ||
      (this.bonus !== null && this.bonus.x === c.x && this.bonus.y === c.y) ||
      this.buildingSet.has(key(c)) ||
      (this.road !== null && !this.road[c.y]?.[c.x]) ||
      this.spikes.some((sp) => sp.ttl > 0 && sp.x === c.x && sp.y === c.y) ||
      (this.bolt !== null && this.bolt.x === c.x && this.bolt.y === c.y) ||
      (this.snapC !== null && ((this.snapC.raw.x === c.x && this.snapC.raw.y === c.y) || (this.snapC.bad?.x === c.x && this.snapC.bad.y === c.y)))
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
    if (this.keepPing) {
      // A ⚡ pin was taken: the regular pin stays where it was.
      this.ping = this.keepPing;
      this.keepPing = null;
      return;
    }
    const c = this.freeCell();
    if (c) this.ping = c;
    if (this.learn && this.rs) this.learnPlacePing();
  }

  private steer(d: Dir): void {
    const last = this.queue.length > 0 ? this.queue[this.queue.length - 1] : this.dir;
    if (d === last || d === OPPOSITE[last]) return;
    if (this.queue.length < 2) this.queue.push(d);
    // While stalled against something, a new direction applies right away.
    if (this.stalled > 0 && this.state === "playing") {
      this.tick = 0;
      this.advance();
    }
  }

  protected onAction(action: string, down: boolean): void {
    if (!down) return;
    if (this.choice) {
      const m = /^c([1-4])$/.exec(action);
      if (m) this.pickGap(Number(m[1]));
      return;
    }
    if (action === "fix") {
      this.manualFix();
      return;
    }
    const set = /^set:(\w+):(\d)$/.exec(action);
    if (set) {
      this.setControl(set[1], Number(set[2]));
      return;
    }
    const cyc = /^c([1-3])$/.exec(action);
    if (cyc) {
      this.cycleControl(Number(cyc[1]) - 1);
      return;
    }
    if (!isDir(action)) return;
    this.steer(action);
  }

  gesture(g: Gesture): void {
    if (this.choice) return;
    if (g.kind === "swipe" && g.dir) {
      this.steer(g.dir);
      return;
    }
    // Tap: steer toward the tapped point, dominant axis relative to the head,
    // ignoring the axis we are already moving along.
    const head = this.centre(this.snake[0]);
    const dx = g.x - head.x;
    const dy = g.y - head.y;
    const horizontal = this.dir === "left" || this.dir === "right";
    if (horizontal) {
      if (Math.abs(dy) > CELL * 0.5) this.steer(dy > 0 ? "down" : "up");
    } else if (Math.abs(dx) > CELL * 0.5) {
      this.steer(dx > 0 ? "right" : "left");
    }
  }

  private blocked(next: Cell): boolean {
    if (next.x < 0 || next.y < 0 || next.x >= N || next.y >= N) return true;
    if (this.obstacles.some((o) => o.x === next.x && o.y === next.y)) return true;
    if (this.buildingSet.has(key(next))) return true;
    if (this.road && !this.road[next.y][next.x]) return true;
    if (this.spikes.some((sp) => sp.ttl > 0 && !this.spikeHidden(sp) && sp.x === next.x && sp.y === next.y)) return true;
    const willGrow = this.grow > 0;
    const bodyEnd = willGrow ? this.snake.length : this.snake.length - 1;
    for (let i = 0; i < bodyEnd; i++) {
      if (this.snake[i].x === next.x && this.snake[i].y === next.y) return true;
    }
    return false;
  }

  private advance(): void {
    const head = this.snake[0];
    let dir = this.queue.length > 0 ? this.queue[0] : this.dir;
    let next = { x: head.x + DELTA[dir].x, y: head.y + DELTA[dir].y };

    if (this.blocked(next)) {
      // Give the player a beat to turn. If the queued turn is itself blocked,
      // keep the stall going; the current heading still counts as blocked.
      if (this.stalled === 0) {
        this.stalled = 0.0001;
        this.stallCell = next;
        this.sfx.play("bump");
        this.fx.shake(2, 0.1);
      }
      if (this.queue.length > 0) {
        // Try the raw heading too, in case the queued turn is the problem.
        const alt = { x: head.x + DELTA[this.dir].x, y: head.y + DELTA[this.dir].y };
        if (!this.blocked(alt)) {
          this.queue.shift();
          dir = this.dir;
          next = alt;
        } else {
          return;
        }
      } else {
        return;
      }
    } else if (this.queue.length > 0) {
      this.queue.shift();
    }

    this.stalled = 0;
    this.stallCell = null;
    if (dir !== this.dir) {
      if (dir === "up" || dir === "down") this.turnedV = true;
      else this.turnedH = true;
      this.sfx.play("turn");
      this.turnAt = this.elapsed;
      if (this.rs?.budget && this.policy.sampling === 1 && this.elapsed - this.lastUploadAt >= 3) this.uploadFix("turn");
    }
    this.dir = dir;
    this.prev = this.snake.map((c) => ({ ...c }));
    const willGrow = this.grow > 0;
    this.snake.unshift(next);
    if (willGrow) this.grow--;
    else this.snake.pop();

    const pal = this.paletteHint;
    if (this.rs) this.learnPickups(next);
    if (this.state !== "playing") return;
    if (this.rs?.filters) {
      this.odoTrue += this.rs.filters.cellKm;
      this.legKm += this.rs.filters.cellKm;
    }
    if (next.x === this.ping.x && next.y === this.ping.y) {
      const counts = this.rs ? this.learnDeliver(next) : true;
      this.eaten++;
      this.grow += this.params.growPer ?? 1;
      const gained = 10 + Math.floor(this.eaten / 5) * 2;
      this.score += gained;
      this.interval = Math.max(MIN_INTERVAL, this.baseInterval() * Math.pow(RAMP, this.eaten));
      this.pulse = 1;
      const c = this.centre(next);
      if (pal) {
        this.fx.burst(c.x, c.y, 10, { color: [pal.route, pal.sun], speed: 110, size: 3.5, life: 0.4 });
        this.fx.pop(c.x, c.y - 14, `+${gained}`, pal.route, 16);
      }
      this.sfx.play("pickup");
      haptic(15);
      this.placePing();
      if (counts) this.addProgress(1);
      if (this.state !== "playing") return;
    }
    if (this.rs) {
      this.learnAfterMove();
      if (this.state !== "playing") return;
    }
    if (this.bonus && next.x === this.bonus.x && next.y === this.bonus.y) {
      this.score += 50;
      this.grow += 1 + (this.params.growPer ?? 1);
      this.bonus = null;
      this.pulse = 1;
      const c = this.centre(next);
      if (pal) {
        this.fx.burst(c.x, c.y, 18, { color: [pal.sun, pal.accent, pal.paper], speed: 160, size: 5, shape: "square", gravity: 300, life: 0.7 });
        this.fx.pop(c.x, c.y - 16, "+50", pal.accent, 22);
      }
      this.fx.shake(2.5, 0.15);
      this.sfx.play("bonus");
      haptic([20, 20, 20]);
      this.bonusTimer = BONUS_GAP_MIN + Math.random() * (BONUS_GAP_MAX - BONUS_GAP_MIN);
      this.addProgress(1);
    }
  }

  private crash(): void {
    const pal = this.paletteHint;
    this.deadAt = this.stallCell ?? this.snake[0];
    const c = this.centre(this.snake[0]);
    if (pal) {
      this.fx.burst(c.x, c.y, 24, { color: [pal.accent, pal.route, pal.fg], speed: 150, size: 4, life: 0.6 });
      this.fx.flash(pal.route, 0.25);
    }
    this.fx.shake(7, 0.35);
    this.sfx.play("crash");
    this.die();
  }

  protected step(dt: number): void {
    this.pulse = Math.max(0, this.pulse - dt * 2.5);
    // R5: play waits while the gap card is open.
    if (this.choice) return;
    if (this.rs) {
      this.learnTimers(dt);
      if (this.state !== "playing") return;
    }
    if (this.stalled > 0) {
      this.stalled += dt;
      if (this.stalled >= GRACE) {
        this.crash();
        return;
      }
    }
    this.tick += dt;
    while (this.tick >= this.interval && this.state === "playing") {
      this.tick -= this.interval;
      this.advance();
      if (this.stalled > 0) {
        this.tick = 0;
        break;
      }
    }
    if (this.rs) return; // Learn levels have no arcade bonus pins.
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
    return { x: c.x * CELL + CELL / 2, y: c.y * CELL + CELL / 2 };
  }


  /* ================================================================ */
  /* Learn track: live tracking (concept-levels.md §4)                */
  /* ================================================================ */

  private get rs(): RouteScript | null {
    return this.learn ? (this.script as RouteScript) : null;
  }

  private learnSetup(): void {
    const s = this.rs;
    if (!s) return;
    this.decoys = [];
    this.decoyTimer = s.decoyEvery ?? 0;
    this.storedNotShown = 0;
    this.outboxOn = false;
    this.lostOnce = false;
    this.outboxQ = [];
    this.seq = 0;
    this.syncLog = [];
    this.wasInZone = false;
    this.ghosts = [];
    this.ghostPlan = [];
    this.seen = [];
    this.keyPin = null;
    this.keyOn = false;
    this.keySpawned = false;
    this.wasAsleep = false;
    this.gapIdx = 0;
    this.gapsDone = 0;
    this.gapLog = [];
    this.choice = null;
    this.meta.inZone = 0;
    this.pingAcc = this.preciseAcc();
    this.pingId = this.newId();
    this.overTitle = "Off route";
    this.fixes = [];
    this.segs = [];
    this.battery = 100;
    this.turnAt = -9;
    this.buildingSet = new Set();
    this.spikes = [];
    this.spikeTimer = 0;
    this.spikeCycle = 0;
    this.sel = { acc: 3, spd: 3, still: 1 };
    this.odoTrue = 0;
    this.legKm = 0;
    this.realFixes = [];
    this.road = null;
    this.snapC = null;
    this.reach = new Set();
    this.cost = { upload: 0, snap: 0, geocode: 0 };
    this.policy = { sampling: 0, snap: 0 };
    this.sampleTimer = 0;
    this.lastUploadAt = -9;
    this.bolt = null;
    this.boltTimer = 6;
    this.cached = 0;
    this.keepPing = null;
    for (const [bx, by, bw, bh] of s.buildings ?? []) for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) this.buildingSet.add(key({ x, y }));
    if (s.manualFix) {
      this.meta.battery = 100;
      this.fixes = [{ ...this.snake[0] }];
      this.announce("The trail is not free now. Press Space or Fix to record a point; each one costs battery.");
    }
    if (s.filters) {
      this.meta.odoErrPct = 0;
      this.meta.odoClean = 0;
      this.announce("Glass towers ahead. Spikes are solid and count on the odometer. Tune the display filters in the panel.");
    }
    if (s.roads) {
      this.road = s.roads.map((row) => row.split("").map((ch) => ch === "."));
      const y = 12;
      this.snake = [
        { x: 6, y },
        { x: 5, y },
        { x: 4, y },
        { x: 3, y },
      ];
      this.prev = this.snake.map((c) => ({ ...c }));
      this.dir = "right";
      this.announce("A city of roads. Raw pins land in buildings; drive to the candidate inside the reach glow.");
    }
    if (s.budget) {
      this.outboxOn = true;
      this.meta.costPct = 0;
      this.announce("The cost meter is running: every upload, snap and address lookup costs coins. Change the policies in the panel.");
    }
    if (s.buildings || s.roads || s.filters) this.placePing();
  }

  /* ---------------- R2: manual fixes, battery, server path ---------------- */

  private manualFix(): void {
    const s = this.rs;
    if (!s?.manualFix || this.state !== "playing" || this.elapsed < 0.4) return;
    const head = this.snake[0];
    const last = this.fixes[this.fixes.length - 1];
    if (last && last.x === head.x && last.y === head.y) return;
    this.battery = Math.max(0, this.battery - s.manualFix.batteryCostPct);
    this.meta.battery = Math.round(this.battery);
    const c = this.centre(head);
    const pal = this.paletteHint;
    if (pal) this.fx.pop(c.x, c.y - 18, `fix −${s.manualFix.batteryCostPct}%`, pal.muted, 14);
    this.sfx.play("turn");
    this.recordFix(head);
    if (this.battery <= 0) {
      this.overTitle = "Battery dead";
      this.announce("Battery dead: tracking stopped.");
      if (pal) this.fx.flash(pal.route, 0.3);
      this.die();
    }
  }

  /** Append a point to the server's path and test the new straight segment against the buildings. */
  private recordFix(cell: Cell): void {
    const prev = this.fixes[this.fixes.length - 1];
    const pt = { ...cell };
    this.fixes.push(pt);
    if (!prev) return;
    const red = this.crossesBuilding(prev, pt);
    this.segs.push({ a: prev, b: pt, red });
    if (red) {
      const mid = this.centre({ x: (prev.x + pt.x) / 2, y: (prev.y + pt.y) / 2 });
      this.slip("the map says you drove through a mall", mid.x, mid.y - 20);
    }
  }

  /** Does the straight line a→b pass through a building? Clipping a corner doesn't count; cutting through the middle does. */
  private crossesBuilding(a: Cell, b: Cell): boolean {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 6));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lerp(a.x, b.x, t);
      const y = lerp(a.y, b.y, t);
      const c = { x: Math.round(x), y: Math.round(y) };
      if (Math.abs(x - c.x) > 0.3 || Math.abs(y - c.y) > 0.3) continue;
      if (this.buildingSet.has(key(c))) return true;
    }
    return false;
  }

  /** R2 motion chip with hysteresis: "turning" switches on at once and off 1.5 s after the last turn. */
  private motion(): "turning" | "straight" {
    return this.elapsed - this.turnAt < 1.5 ? "turning" : "straight";
  }

  /* ---------------- R6: spikes and display filters ---------------- */

  private spikeHidden(sp: FixLike): boolean {
    return hiddenBy(sp, this.sel);
  }

  private nearGlass(c: Cell): boolean {
    return (this.rs?.zones ?? []).some((z) => z.kind === "glass" && c.x >= z.rect[0] - 1 && c.x < z.rect[0] + z.rect[2] + 1 && c.y >= z.rect[1] - 1 && c.y < z.rect[1] + z.rect[3] + 1);
  }

  private spawnSpike(): void {
    const s = this.rs;
    if (!s?.filters) return;
    const head = this.snake[0];
    const kinds: Spike["kind"][] = ["jump", "blob", "drift"];
    const kind = kinds[this.spikeCycle++ % kinds.length];
    const d = kind === "jump" ? 3 + Math.floor(Math.random() * 2) : kind === "blob" ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2);
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
    ].sort(() => Math.random() - 0.5);
    for (const dir of dirs) {
      const c = { x: head.x + dir.x * d, y: head.y + dir.y * d };
      if (c.x < 0 || c.y < 0 || c.x >= N || c.y >= N) continue;
      if (this.occupied(c)) continue;
      const dist = Math.hypot(dir.x * d, dir.y * d);
      const sp: Spike = {
        ...c,
        from: { ...head },
        ttl: 7,
        km: 2 * dist * s.filters.cellKm,
        kind,
        acc: kind === "jump" ? 15 + Math.floor(Math.random() * 15) : kind === "blob" ? 200 + Math.floor(Math.random() * 200) : 10 + Math.floor(Math.random() * 10),
        kmh: kind === "jump" ? 300 + Math.floor(Math.random() * 300) : kind === "blob" ? 20 + Math.floor(Math.random() * 20) : 4 + Math.floor(Math.random() * 6),
        still: kind === "drift",
      };
      this.spikes.push(sp);
      const pc = this.centre(c);
      const pal = this.paletteHint;
      if (pal && !this.spikeHidden(sp)) this.fx.pop(pc.x, pc.y - 20, kind === "jump" ? "spike" : kind === "blob" ? "wifi guess" : "still drift", pal.route, 14);
      this.sfx.play("bump");
      this.announce(`${kind === "jump" ? "Spike" : kind === "blob" ? "Wi-Fi guess" : "Still drift"}: ±${sp.acc} m at ${sp.kmh} km/h${sp.still ? " while still" : ""}. ${this.spikeHidden(sp) ? "Hidden by your filters." : "Shown, and solid."}`);
      this.updateOdo();
      return;
    }
  }

  private odo(): { shown: number; truth: number; errPct: number; realHidden: number } {
    const truth = this.odoTrue;
    let shown = this.legKm;
    let realHidden = 0;
    for (const f of this.realFixes) {
      if (this.spikeHidden(f)) realHidden++;
      else shown += f.legKm;
    }
    for (const sp of this.spikes) if (!this.spikeHidden(sp)) shown += sp.km;
    const errPct = truth > 0.05 ? (Math.abs(shown - truth) / truth) * 100 : 0;
    return { shown, truth, errPct, realHidden };
  }

  private updateOdo(): void {
    const o = this.odo();
    this.meta.odoErrPct = Math.round(o.errPct);
    this.meta.odoClean = o.realHidden > 0 ? 100 : Math.round(o.errPct);
  }

  private setControl(id: string, j: number): void {
    const s = this.rs;
    if (!s) return;
    if (s.filters && (id === "acc" || id === "spd" || id === "still")) {
      const n = id === "still" ? FILTERS.still.options.length : FILTERS[id].options.length;
      if (j < 0 || j >= n) return;
      this.sel = { ...this.sel, [id]: j };
      const o = this.odo();
      this.updateOdo();
      this.sfx.play("ui-move");
      this.announce(`${id === "acc" ? FILTERS.acc.label : id === "spd" ? FILTERS.spd.label : FILTERS.still.label}: ${(id === "still" ? FILTERS.still.options : FILTERS[id].options)[j]}. Odometer ${o.shown.toFixed(1)} km vs ${o.truth.toFixed(1)} true${o.realHidden > 0 ? `, ${o.realHidden} real ${o.realHidden === 1 ? "fix" : "fixes"} hidden` : ""}.`);
      this.checkWin();
      return;
    }
    if (s.budget && (id === "sampling" || id === "snap")) {
      if (j < 0 || j > 1) return;
      this.policy = { ...this.policy, [id]: j };
      this.sfx.play("ui-move");
      this.announce(`${POLICIES[id].label}: ${POLICIES[id].options[j]}.`);
    }
  }

  private cycleControl(i: number): void {
    const s = this.rs;
    if (s?.filters) {
      const ids = ["acc", "spd", "still"] as const;
      const id = ids[i];
      if (!id) return;
      const n = id === "still" ? FILTERS.still.options.length : FILTERS[id].options.length;
      this.setControl(id, (this.sel[id] + 1) % n);
    } else if (s?.budget) {
      const ids = ["sampling", "snap"] as const;
      const id = ids[i];
      if (id) this.setControl(id, (this.policy[id] + 1) % 2);
    }
  }

  /* ---------------- R7: candidates and reach ---------------- */

  /** Road distance from `from` over road cells (the trail is ignored: it moves). */
  private bfs(from: Cell, limit = 60): Map<number, number> {
    const dist = new Map<number, number>();
    if (!this.road) return dist;
    const q: Cell[] = [from];
    dist.set(key(from), 0);
    while (q.length > 0) {
      const c = q.shift()!;
      const d = dist.get(key(c))!;
      if (d >= limit) continue;
      for (const dd of DIRS) {
        const n = { x: c.x + DELTA[dd].x, y: c.y + DELTA[dd].y };
        if (n.x < 0 || n.y < 0 || n.x >= N || n.y >= N || !this.road[n.y][n.x]) continue;
        const k = key(n);
        if (dist.has(k)) continue;
        dist.set(k, d + 1);
        q.push(n);
      }
    }
    return dist;
  }

  private neighbours(c: Cell): Cell[] {
    return DIRS.map((d) => ({ x: c.x + DELTA[d].x, y: c.y + DELTA[d].y })).filter((n) => n.x >= 0 && n.y >= 0 && n.x < N && n.y < N);
  }

  /** Pick a reachable road candidate, a raw pin in a building next to it, and a decoy that is near in metres but far by road. */
  private placeSnap(): void {
    if (!this.road) return;
    const head = this.snake[0];
    const dist = this.bfs(head);
    const onSnake = (c: Cell) => this.snake.some((s) => s.x === c.x && s.y === c.y);
    const roads: Cell[] = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (this.road[y][x]) roads.push({ x, y });
    for (let attempt = 0; attempt < 80; attempt++) {
      const good = roads[Math.floor(Math.random() * roads.length)];
      const dg = dist.get(key(good));
      if (dg === undefined || dg < 5 || dg > 9 || onSnake(good)) continue;
      const walls = this.neighbours(good).filter((n) => !this.road![n.y][n.x]);
      if (walls.length === 0) continue;
      const raw = walls[Math.floor(Math.random() * walls.length)];
      const R = dg + 2;
      const around = [...this.neighbours(raw), ...this.neighbours(raw).flatMap((n) => this.neighbours(n))].filter(
        (n) => this.road![n.y][n.x] && !(n.x === good.x && n.y === good.y) && !onSnake(n) && (dist.get(key(n)) ?? Infinity) > R,
      );
      if (around.length === 0 && attempt < 60) continue;
      const bad = around.length > 0 ? around.sort((a, b) => Math.hypot(a.x - raw.x, a.y - raw.y) - Math.hypot(b.x - raw.x, b.y - raw.y))[0] : null;
      const off = bad ? { x: Math.sign(bad.x - raw.x) * 0.28, y: Math.sign(bad.y - raw.y) * 0.28 } : { x: 0, y: 0 };
      const metres = (c: Cell) => Math.round(Math.hypot(c.x - raw.x - off.x, c.y - raw.y - off.y) * 11);
      this.snapC = { raw, off, good, bad, goodM: metres(good), badM: bad ? metres(bad) : 0 };
      this.ping = good;
      this.reach = new Set([...dist.entries()].filter(([, d]) => d <= R).map(([k]) => k));
      return;
    }
    // Fallback: any reachable road cell, no decoy.
    const any = roads.filter((c) => (dist.get(key(c)) ?? Infinity) >= 4 && !onSnake(c));
    const good = any[Math.floor(Math.random() * any.length)] ?? roads[0];
    this.snapC = { raw: good, off: { x: 0, y: 0 }, good, bad: null, goodM: 0, badM: 0 };
    this.ping = good;
    this.reach = new Set([...dist.entries()].filter(([, d]) => d <= (dist.get(key(good)) ?? 0) + 2).map(([k]) => k));
  }

  /* ---------------- R8: coins ---------------- */

  private coins(): number {
    return this.cost.upload + this.cost.snap + this.cost.geocode;
  }

  private spend(kind: keyof typeof this.cost, n: number, label: string, at?: Cell): void {
    const b = this.rs?.budget;
    if (!b || n <= 0) return;
    this.cost[kind] += n;
    this.meta.costPct = Math.round((this.coins() / b.cap) * 100);
    const pal = this.paletteHint;
    if (pal && at) {
      const c = this.centre(at);
      this.fx.pop(c.x, c.y - 26, `−${n} ${label}`, pal.muted, 13);
    }
    if (this.coins() > b.cap) {
      this.overTitle = "Over budget";
      this.announce(`Over budget: ${this.coins()} coins against ${b.cap}. Finance called.`);
      if (pal) this.fx.flash(pal.route, 0.3);
      this.die();
    }
  }

  /** A sampled fix leaves the phone: queued in a dead zone, one request otherwise (plus a snap call under "every fix"). */
  private uploadFix(why: "clock" | "turn"): void {
    const s = this.rs;
    if (!s?.budget) return;
    const head = this.snake[0];
    this.lastUploadAt = this.elapsed;
    if (this.inZone(head, "noSignal")) {
      this.outboxQ.push({ seq: ++this.seq, rec: this.elapsed, id: why });
      return;
    }
    this.spend("upload", s.budget.upload, "upload", head);
    if (this.policy.snap === 0) this.spend("snap", s.budget.snap, "snap");
  }

  private preciseAcc(): number {
    return [4, 5, 6, 8, 9, 12][Math.floor(Math.random() * 6)];
  }

  private newId(): string {
    for (let i = 0; i < 50; i++) {
      const id = Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, "0");
      if (!this.usedIds.has(id)) {
        this.usedIds.add(id);
        return id;
      }
    }
    return String(++this.seq);
  }

  private inZone(c: Cell, kind: ZoneKind): boolean {
    return (this.rs?.zones ?? []).some((z) => z.kind === kind && c.x >= z.rect[0] && c.x < z.rect[0] + z.rect[2] && c.y >= z.rect[1] && c.y < z.rect[1] + z.rect[3]);
  }

  /** R3: bias pins into dead zones so the outbox matters. R7: pins come with candidates. */
  private learnPlacePing(): void {
    const s = this.rs;
    if (s?.roads && this.road) {
      this.placeSnap();
      this.pingAcc = this.preciseAcc();
      this.pingId = this.newId();
      return;
    }
    const zones = (s?.zones ?? []).filter((z) => z.kind === "noSignal");
    if (zones.length > 0 && Math.random() < 0.45) {
      const z = zones[Math.floor(Math.random() * zones.length)];
      for (let i = 0; i < 40; i++) {
        const c = { x: z.rect[0] + Math.floor(Math.random() * z.rect[2]), y: z.rect[1] + Math.floor(Math.random() * z.rect[3]) };
        if (!this.occupied(c)) {
          this.ping = c;
          break;
        }
      }
    }
    this.pingAcc = this.preciseAcc();
    this.pingId = this.newId();
  }

  /** A real delivery, after the arcade bookkeeping. Returns true when it counts now. */
  private learnDeliver(at: Cell): boolean {
    const s = this.rs!;
    const id = this.pingId;
    if (s.manualFix) this.recordFix(at);
    if (s.filters) {
      this.realFixes.push({ acc: 4 + Math.floor(Math.random() * 32), kmh: 25 + Math.floor(Math.random() * 21), still: false, legKm: this.legKm });
      this.legKm = 0;
      this.updateOdo();
    }
    if (s.roads) {
      const pal = this.paletteHint;
      const c = this.centre(at);
      if (pal) this.fx.pop(c.x, c.y - 24, "snapped", pal.accent, 16);
      this.announce("Snapped to the reachable road. The nearer candidate was across the water.");
    }
    if (s.budget) {
      const fromBolt = this.keepPing !== null;
      if (fromBolt) this.cached++;
      else this.spend("geocode", s.budget.geocode, "geocode", at);
      if (this.policy.snap === 1) this.spend("snap", s.budget.snap, "snap");
      if (this.state !== "playing") return false;
    }
    if (s.dupRate) {
      this.seen.unshift(id);
      this.seen = this.seen.slice(0, 5);
      if (Math.random() < s.dupRate) this.ghostPlan.push({ id, at: this.elapsed + 2 + Math.random() * 2.5 });
    }
    if (s.outbox && this.inZone(at, "noSignal")) {
      const pal = this.paletteHint;
      const c = this.centre(at);
      if (!this.outboxOn) {
        this.outboxOn = true;
        this.lostOnce = true;
        if (pal) this.fx.pop(c.x, c.y - 20, "uploaded straight: lost", pal.route, 16);
        this.announce("That delivery went straight to the network and was lost. The outbox is on now: deliveries in dead zones queue on the phone.");
        return false;
      }
      this.outboxQ.push({ seq: ++this.seq, rec: this.elapsed, id });
      this.meta.inZone = (this.meta.inZone ?? 0) + 1;
      if (pal) this.fx.pop(c.x, c.y - 20, `queued #${this.seq}`, pal.muted, 15);
      this.announce(`Recorded offline as event ${this.seq}. It will sync when you leave the dead zone.`);
      return false;
    }
    if (s.outbox) {
      this.seq++;
      this.syncLog.unshift(`#${this.seq} rec ${fmtTime(this.elapsed)} · recv ${fmtTime(this.elapsed)}`);
      if (s.budget) {
        this.spend("upload", s.budget.upload, "upload");
        if (this.policy.snap === 0) this.spend("snap", s.budget.snap, "snap");
      }
    }
    return true;
  }

  /** Per-tick Learn checks after the head moves. */
  private learnAfterMove(): void {
    const s = this.rs;
    if (!s) return;
    const head = this.snake[0];
    // R3: leaving a dead zone uploads the outbox as one batch.
    const inDead = this.inZone(head, "noSignal");
    if (this.wasInZone && !inDead && this.outboxQ.length > 0) {
      const n = this.outboxQ.length;
      const deliveries = this.outboxQ.filter((e) => e.id !== "clock" && e.id !== "turn").length;
      for (const e of this.outboxQ) this.syncLog.unshift(`#${e.seq} rec ${fmtTime(e.rec)} · recv ${fmtTime(this.elapsed)}`);
      this.outboxQ = [];
      const pal = this.paletteHint;
      const c = this.centre(head);
      if (pal) this.fx.pop(c.x, c.y - 24, `batch of ${n} synced`, pal.accent, 17);
      this.sfx.play("bonus");
      this.announce(`Back online. ${n} queued ${n === 1 ? "event" : "events"} uploaded in one batch${s.budget ? ", one request" : ""}.`);
      if (s.budget) {
        this.spend("upload", s.budget.upload, "upload (batch)", head);
        if (this.policy.snap === 0) this.spend("snap", s.budget.snap * n, "snap");
        if (this.state !== "playing") return;
      }
      if (deliveries > 0) this.addProgress(deliveries);
      if (this.state !== "playing") return;
    }
    this.wasInZone = inDead;
    // R5: leaving a battery-saver zone shows a gap card.
    const asleep = this.inZone(head, "sleep");
    if (this.wasAsleep && !asleep && s.gaps && this.gapIdx < s.gaps.length) {
      this.choice = s.gaps[this.gapIdx];
      this.sfx.play("pause");
      this.announce(`Gap: ${this.choice.km} km in ${this.choice.min} minutes with no readings. Choose how to draw it: 1 to 4.`);
    }
    this.wasAsleep = asleep;
  }

  /** R5: a gap label was chosen (1..4). */
  private pickGap(i: number): void {
    const g = this.choice;
    const s = this.rs;
    if (!g || !s) return;
    const answer = gapAnswer(g) + 1;
    const kmh = Math.round(g.km / (g.min / 60));
    const label = GAP_OPTIONS[i - 1];
    const pal = this.paletteHint;
    const c = this.centre(this.snake[0]);
    if (i === answer) {
      this.score += 30;
      if (pal) this.fx.pop(c.x, c.y - 24, "honest gap", pal.accent, 17);
      this.sfx.play("pickup");
      this.announce(`Correct: ${kmh} km/h, so ${label}.`);
      this.gapLog.unshift(`✓ ${g.km} km / ${g.min} min → ${label}`);
    } else {
      this.slip(i === 1 ? "a straight line is never honest" : `${kmh} km/h: that's ${GAP_OPTIONS[answer - 1]}`, c.x, c.y - 30);
      this.gapLog.unshift(`✗ ${g.km} km / ${g.min} min → ${label}`);
    }
    this.gapIdx++;
    this.gapsDone++;
    this.choice = null;
    this.tick = 0;
    this.checkWin();
  }

  protected extraWinMet(): boolean {
    const s = this.rs;
    if (s?.gaps) return this.gapsDone >= s.gaps.length;
    if (s?.filters) return this.odo().errPct <= 10;
    if (s?.budget) return this.coins() <= s.budget.cap;
    return true;
  }

  /** Per-frame Learn timers: decoys (R1), ghost resends and the key (R4). */
  private learnTimers(dt: number): void {
    const s = this.rs;
    if (!s) return;
    if (s.filters) {
      if (this.nearGlass(this.snake[0])) {
        this.spikeTimer += dt;
        if (this.spikeTimer >= 1.3) {
          this.spikeTimer = 0;
          this.spawnSpike();
        }
      } else this.spikeTimer = Math.min(this.spikeTimer + dt, 1.1);
      for (const sp of this.spikes) if (sp.ttl > 0) sp.ttl -= dt;
    }
    if (s.budget) {
      if (this.policy.sampling === 0) {
        this.sampleTimer += dt;
        if (this.sampleTimer >= 2) {
          this.sampleTimer = 0;
          this.uploadFix("clock");
          if (this.state !== "playing") return;
        }
      }
      if (this.bolt) {
        this.bolt.ttl -= dt;
        if (this.bolt.ttl <= 0) {
          this.bolt = null;
          this.boltTimer = 4 + Math.random() * 3;
        }
      } else {
        this.boltTimer -= dt;
        if (this.boltTimer <= 0) {
          const c = this.freeCell();
          if (c) this.bolt = { ...c, ttl: 9 };
        }
      }
    }
    if (s.decoyEvery) {
      this.decoyTimer -= dt;
      if (this.decoyTimer <= 0 && this.decoys.length < 2) {
        const c = this.freeCell();
        if (c) this.decoys.push({ ...c, acc: [500, 1000, 2000][Math.floor(Math.random() * 3)], ttl: 7 });
        this.decoyTimer = s.decoyEvery;
      }
      for (let i = this.decoys.length - 1; i >= 0; i--) {
        this.decoys[i].ttl -= dt;
        if (this.decoys[i].ttl <= 0) {
          this.decoys.splice(i, 1);
          this.storedNotShown++;
        }
      }
    }
    if (s.dupRate) {
      for (let i = this.ghostPlan.length - 1; i >= 0; i--) {
        if (this.elapsed < this.ghostPlan[i].at) continue;
        const c = this.freeCell();
        if (c) this.ghosts.push({ ...c, id: this.ghostPlan[i].id, ttl: 8 });
        this.ghostPlan.splice(i, 1);
      }
      for (let i = this.ghosts.length - 1; i >= 0; i--) {
        this.ghosts[i].ttl -= dt;
        if (this.ghosts[i].ttl <= 0) this.ghosts.splice(i, 1);
      }
      if (s.idKeyAt && !this.keySpawned && this.progress >= s.idKeyAt) {
        const c = this.freeCell();
        if (c) {
          this.keyPin = c;
          this.keySpawned = true;
          this.announce("The server key appeared: ON CONFLICT DO NOTHING. Grab it.");
        }
      }
    }
  }

  /** Learn pickups the head can land on (decoys, ghosts, key). */
  private learnPickups(next: Cell): void {
    const pal = this.paletteHint;
    const c = this.centre(next);
    if (this.snapC?.bad && this.snapC.bad.x === next.x && this.snapC.bad.y === next.y) {
      this.slip("snapped to the wrong road: not reachable since the last fix", c.x, c.y - 24);
      this.placeSnap();
      return;
    }
    if (this.bolt && this.bolt.x === next.x && this.bolt.y === next.y) {
      // Cached address: treat it as this tick's delivery and keep the regular pin where it is.
      this.bolt = null;
      this.boltTimer = 5 + Math.random() * 3;
      this.keepPing = this.ping;
      this.ping = next;
      if (pal) this.fx.pop(c.x, c.y - 30, "⚡ cached address", pal.accent, 15);
      return;
    }
    const d = this.decoys.findIndex((x) => x.x === next.x && x.y === next.y);
    if (d >= 0) {
      const dec = this.decoys[d];
      this.decoys.splice(d, 1);
      this.slip(`customer not here: ±${dec.acc} m guess`, c.x, c.y - 24);
      return;
    }
    const g = this.ghosts.findIndex((x) => x.x === next.x && x.y === next.y);
    if (g >= 0) {
      const gh = this.ghosts[g];
      this.ghosts.splice(g, 1);
      if (this.keyOn) {
        this.score += 5;
        if (pal) this.fx.pop(c.x, c.y - 20, `ack: already have #${gh.id}`, pal.muted, 15);
        this.sfx.play("turn");
        this.announce(`Resend of ${gh.id} acknowledged. Nothing inserted twice.`);
      } else {
        this.slip(`double billed: #${gh.id} again`, c.x, c.y - 24);
      }
      return;
    }
    if (this.keyPin && this.keyPin.x === next.x && this.keyPin.y === next.y) {
      this.keyPin = null;
      this.keyOn = true;
      if (pal) this.fx.pop(c.x, c.y - 24, "ON CONFLICT DO NOTHING", pal.accent, 16);
      this.sfx.play("level");
      this.announce("Ingest is idempotent now. Resends become harmless acks.");
    }
  }

  protected conceptView(): ConceptView | undefined {
    const s = this.rs;
    if (!s) return undefined;
    const stats: NonNullable<ConceptView["stats"]> = [{ label: "Delivered", value: `${this.progress} / ${this.goal?.target ?? 0}` }];
    let log: ConceptView["log"];
    let lanes: ConceptView["lanes"];
    let summary = `Delivered ${this.progress}/${this.goal?.target ?? 0}`;
    if (s.decoyEvery) {
      stats.push({ label: "Imprecise fixes stored, not shown", value: String(this.storedNotShown) });
      stats.push({ label: "Decoys driven to", value: String(this.slips), tone: this.slips > 0 ? "warn" : "ok" });
      summary += ` · ${this.storedNotShown} imprecise stored`;
    }
    if (s.outbox) {
      stats.push({ label: "Outbox", value: this.outboxOn ? "on" : "off", tone: this.outboxOn ? "ok" : "warn" });
      stats.push({ label: "Queued on phone", value: String(this.outboxQ.length), tone: this.outboxQ.length > 0 ? "warn" : undefined });
      stats.push({ label: "Made inside dead zones", value: String(this.meta.inZone ?? 0) });
      log = { title: "Synced events (recorded · received)", items: this.syncLog.slice(0, 6) };
      summary += ` · outbox ${this.outboxQ.length} queued`;
    }
    if (s.dupRate) {
      stats.push({ label: "Server insert", value: this.keyOn ? "on conflict do nothing" : "plain insert", tone: this.keyOn ? "ok" : "warn" });
      stats.push({ label: "Double counts", value: String(this.slips), tone: this.slips > 0 ? "bad" : "ok" });
      lanes = [{ id: "seen", label: "Seen event ids", items: this.seen.map((x) => `#${x}`), note: "none yet" }];
      summary += this.keyOn ? " · idempotent" : ` · ${this.slips} double counts`;
    }
    if (s.gaps) {
      stats.push({ label: "Gaps labelled", value: `${this.gapsDone} / ${s.gaps.length}` });
      log = { title: "Gap labels", items: this.gapLog.slice(0, 4) };
      summary += ` · gaps ${this.gapsDone}/${s.gaps.length}`;
    }
    let controls: ConceptView["controls"];
    let active: number | undefined;
    if (s.manualFix) {
      const red = this.segs.filter((x) => x.red).length;
      const m = this.motion();
      stats.push({ label: "Battery", value: `${Math.round(this.battery)}%`, tone: this.battery < 50 ? "warn" : "ok" });
      stats.push({ label: "Fixes recorded", value: String(this.fixes.length) });
      stats.push({ label: "Motion", value: m === "turning" ? "turning → fix?" : "straight (cool-down 1.5 s)", tone: m === "turning" ? "warn" : undefined });
      stats.push({ label: "Red segments", value: String(red), tone: red > 0 ? "bad" : "ok" });
      active = m === "turning" ? 1 : 3;
      summary += ` · battery ${Math.round(this.battery)}% · ${red} red`;
    }
    if (s.filters) {
      const o = this.odo();
      const visible = this.spikes.filter((sp) => !this.spikeHidden(sp)).length;
      controls = [
        { id: "acc", label: FILTERS.acc.label, options: [...FILTERS.acc.options], value: this.sel.acc, hint: "1" },
        { id: "spd", label: FILTERS.spd.label, options: [...FILTERS.spd.options], value: this.sel.spd, hint: "2" },
        { id: "still", label: FILTERS.still.label, options: [...FILTERS.still.options], value: this.sel.still, hint: "3" },
      ];
      stats.push({ label: "Odometer shown", value: `${o.shown.toFixed(2)} km`, tone: o.errPct > 10 ? "bad" : o.errPct > 3 ? "warn" : "ok" });
      stats.push({ label: "True distance", value: `${o.truth.toFixed(2)} km` });
      stats.push({ label: "Error", value: `${Math.round(o.errPct)}%`, tone: o.errPct > 10 ? "bad" : o.errPct > 3 ? "warn" : "ok" });
      stats.push({ label: "Spikes shown / stored", value: `${visible} / ${this.spikes.length}` });
      stats.push({ label: "Real fixes hidden", value: String(o.realHidden), tone: o.realHidden > 0 ? "bad" : "ok" });
      summary += ` · odo ${o.shown.toFixed(1)} vs ${o.truth.toFixed(1)} km (${Math.round(o.errPct)}%)`;
    }
    if (s.roads && this.snapC) {
      const sc = this.snapC;
      stats.push({ label: "Reachable candidate", value: `${sc.goodM} m from the raw pin` });
      if (sc.bad) stats.push({ label: "Nearest candidate", value: `${sc.badM} m, outside the reach`, tone: "warn" });
      stats.push({ label: "Reach since last fix", value: `${this.reach.size} road cells` });
      stats.push({ label: "Wrong snaps", value: String(this.slips), tone: this.slips > 0 ? "warn" : "ok" });
      summary += sc.bad ? ` · candidates ${sc.goodM} m (reachable) vs ${sc.badM} m (not)` : "";
    }
    if (s.budget) {
      const b = s.budget;
      const total = this.coins();
      const pct = Math.round((total / b.cap) * 100);
      controls = [
        { id: "sampling", label: POLICIES.sampling.label, options: [...POLICIES.sampling.options], value: this.policy.sampling, hint: `${b.upload} coin per request` },
        { id: "snap", label: POLICIES.snap.label, options: [...POLICIES.snap.options], value: this.policy.snap, hint: `${b.snap} coins per call` },
      ];
      stats.push({ label: "Coins spent", value: `${total} / ${b.cap} (${pct}%)`, tone: pct > 100 ? "bad" : pct > 60 ? "warn" : "ok" });
      stats.push({ label: "Upload requests", value: String(this.cost.upload / b.upload) });
      stats.push({ label: "Snap calls", value: String(this.cost.snap / b.snap) });
      stats.push({ label: `Address lookups (${b.geocode} each)`, value: String(this.cost.geocode / b.geocode) });
      stats.push({ label: "⚡ cached deliveries", value: String(this.cached), tone: "ok" });
      summary += ` · ${total}/${b.cap} coins`;
    }
    return {
      summary,
      code: s.code ? { lines: s.code, active } : undefined,
      lanes,
      stats,
      log,
      controls,
      choice: this.choice
        ? {
            prompt: `${this.choice.km} km in ${this.choice.min} min, no readings`,
            detail: "The battery saver stopped the fixes. How should the map draw this gap?",
            options: [...GAP_OPTIONS],
          }
        : undefined,
    };
  }

  private drawZones(ctx: CanvasRenderingContext2D, p: Palette): void {
    for (const z of this.rs?.zones ?? []) {
      const [zx, zy, zw, zh] = z.rect;
      const x = zx * CELL;
      const y = zy * CELL;
      const w = zw * CELL;
      const h = zh * CELL;
      ctx.save();
      ctx.fillStyle = z.kind === "sleep" ? p.lilac : z.kind === "glass" ? p.sky : p.border;
      ctx.globalAlpha = z.kind === "sleep" ? 0.45 : z.kind === "glass" ? 0.5 : 0.6;
      roundRectPath(ctx, x + 2, y + 2, w - 4, h - 4, 10);
      ctx.fill();
      ctx.clip();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = p.muted;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = -h; k < w + h; k += 10) {
        ctx.moveTo(x + k, y + h);
        ctx.lineTo(x + k + h, y);
      }
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = p.fg;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      roundRectPath(ctx, x + 2, y + 2, w - 4, h - 4, 10);
      ctx.stroke();
      ctx.restore();
      text(ctx, p, z.kind === "sleep" ? "battery saver" : z.kind === "glass" ? "glass towers" : "no signal", x + 8, y + 15, 11, p.fg, "left", 700, "mono");
    }
  }

  /** Accuracy ring + label around a pin (R1). */
  private drawAccuracy(ctx: CanvasRenderingContext2D, p: Palette, c: Cell, acc: number, color: string): void {
    const { x, y } = this.centre(c);
    const r = acc >= 500 ? CELL * (1.8 + Math.log10(acc / 500)) : CELL * (0.55 + acc / 40);
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = acc >= 500 ? 0.12 : 0.18;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash(acc >= 500 ? [6, 5] : []);
    ctx.stroke();
    ctx.restore();
    text(ctx, p, `±${acc} m`, x, y + Math.min(r, CELL * 1.6) + 12, 14, p.fg, "center", 700, "mono");
  }

  /** R2: solid blocks the server's straight lines must not cross. */
  private drawBuildings(ctx: CanvasRenderingContext2D, p: Palette): void {
    const s = this.rs;
    if (!s?.buildings) return;
    s.buildings.forEach(([bx, by, bw, bh], i) => {
      const x = bx * CELL;
      const y = by * CELL;
      ctx.save();
      ctx.fillStyle = p.surface;
      roundRectPath(ctx, x + 2, y + 2, bw * CELL - 4, bh * CELL - 4, 6);
      ctx.fill();
      ctx.strokeStyle = p.fg;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = p.border;
      for (let wy = 0; wy < bh; wy++) for (let wx = 0; wx < bw; wx++) ctx.fillRect(x + wx * CELL + 8, y + wy * CELL + 8, 8, 8);
      ctx.restore();
      if (i === 0 || bw * bh >= 9) text(ctx, p, i === 0 ? "mall" : "office", x + (bw * CELL) / 2, y + bh * CELL - 10, 11, p.muted, "center", 700, "mono");
    });
  }

  /** R2: what the server draws: straight lines between recorded fixes. Red where a line cuts a building. */
  private drawServerPath(ctx: CanvasRenderingContext2D, p: Palette): void {
    if (!this.rs?.manualFix) return;
    ctx.save();
    ctx.lineCap = "round";
    for (const seg of this.segs) {
      const a = this.centre(seg.a);
      const b = this.centre(seg.b);
      ctx.strokeStyle = seg.red ? p.route : p.fg;
      ctx.globalAlpha = seg.red ? 0.95 : 0.4;
      ctx.lineWidth = seg.red ? 4 : 2.5;
      ctx.setLineDash(seg.red ? [] : [6, 5]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    const last = this.fixes[this.fixes.length - 1];
    if (last && this.snake[0]) {
      const a = this.centre(last);
      const b = this.centre(this.snake[0]);
      ctx.strokeStyle = this.crossesBuilding(last, this.snake[0]) ? p.route : p.muted;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    for (const f of this.fixes) {
      const c = this.centre(f);
      ctx.fillStyle = p.paper;
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    // Battery chip
    const w = 92;
    ctx.save();
    ctx.fillStyle = p.card;
    roundRectPath(ctx, GRID - w - 10, 10, w, 26, 8);
    ctx.fill();
    ctx.strokeStyle = p.fg;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = p.border;
    ctx.fillRect(GRID - w - 2, 17, 44, 12);
    ctx.fillStyle = this.battery < 25 ? p.route : this.battery < 50 ? p.sun : p.mint;
    ctx.fillRect(GRID - w - 2, 17, 44 * (this.battery / 100), 12);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(GRID - w - 2, 17, 44, 12);
    ctx.restore();
    text(ctx, p, `${Math.round(this.battery)}%`, GRID - 16, 24, 12, p.fg, "right", 800, "mono");
  }

  /** R6: spikes as jagged there-and-back excursions; hidden ones leave only a stored dot. */
  private drawSpikes(ctx: CanvasRenderingContext2D, p: Palette, t: number): void {
    if (!this.rs?.filters) return;
    for (const sp of this.spikes) {
      if (sp.ttl <= 0) continue;
      const c = this.centre(sp);
      if (this.spikeHidden(sp)) {
        ctx.save();
        ctx.fillStyle = p.muted;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }
      const a = this.centre(sp.from);
      ctx.save();
      ctx.strokeStyle = p.route;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.globalAlpha = Math.min(1, sp.ttl / 1.5);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      const nx = -(c.y - a.y);
      const ny = c.x - a.x;
      const len = Math.hypot(nx, ny) || 1;
      for (let i = 1; i <= 3; i++) {
        const k = i / 4;
        const side = i % 2 === 0 ? 1 : -1;
        ctx.lineTo(lerp(a.x, c.x, k) + (nx / len) * 7 * side, lerp(a.y, c.y, k) + (ny / len) * 7 * side);
      }
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
      // the spike cell: a jagged star
      ctx.fillStyle = p.route;
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 10 : 5;
        const ang = (i / 10) * Math.PI * 2 + t * 2;
        const px = c.x + Math.cos(ang) * r;
        const py = c.y + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      text(ctx, p, sp.still ? "still" : sp.kind === "blob" ? `±${sp.acc}m` : `${sp.kmh}km/h`, c.x, c.y - 17, 12, p.fg, "center", 700, "mono");
    }
    // Odometer chip
    const o = this.odo();
    const w = 200;
    ctx.save();
    ctx.fillStyle = p.card;
    roundRectPath(ctx, 10, 10, w, 26, 8);
    ctx.fill();
    ctx.strokeStyle = p.fg;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    text(ctx, p, `odo ${o.shown.toFixed(2)} · true ${o.truth.toFixed(2)}`, 10 + w / 2, 24, 12, o.errPct > 10 ? p.route : p.fg, "center", 800, "mono");
  }

  /** R7: buildings fill the blocks; the reach glow marks road cells the courier could have reached since the last fix. */
  private drawCity(ctx: CanvasRenderingContext2D, p: Palette): void {
    if (!this.road) return;
    ctx.save();
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (this.road[y][x]) {
          if (this.reach.has(key({ x, y }))) {
            ctx.fillStyle = p.accent;
            ctx.globalAlpha = 0.16;
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            ctx.globalAlpha = 1;
          }
          continue;
        }
        ctx.fillStyle = (x === 10 || x === 11) && y !== 3 && y !== 18 ? p.sky : p.surface;
        ctx.globalAlpha = (x === 10 || x === 11) && y !== 3 && y !== 18 ? 0.55 : 1;
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    text(ctx, p, "river", 11 * CELL, 10 * CELL, 11, p.muted, "center", 700, "mono");
  }

  /** R7: the raw pin in the building, dashed lines to both candidates, candidates with metres. */
  private drawSnap(ctx: CanvasRenderingContext2D, p: Palette, t: number): void {
    const sc = this.snapC;
    if (!sc) return;
    const raw = this.centre({ x: sc.raw.x + sc.off.x, y: sc.raw.y + sc.off.y });
    const cands: [Cell, number][] = [[sc.good, sc.goodM]];
    if (sc.bad) cands.push([sc.bad, sc.badM]);
    ctx.save();
    ctx.strokeStyle = p.fg;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.6;
    for (const [c] of cands) {
      const cc = this.centre(c);
      ctx.beginPath();
      ctx.moveTo(raw.x, raw.y);
      ctx.lineTo(cc.x, cc.y);
      ctx.stroke();
    }
    ctx.restore();
    // raw pin: coral pin with a dotted accuracy ring
    ctx.save();
    ctx.strokeStyle = p.route;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(raw.x, raw.y, CELL * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    this.drawPin(ctx, p, { x: sc.raw.x + sc.off.x, y: sc.raw.y + sc.off.y }, t, p.route, "raw");
    for (const [c, m] of cands) {
      const cc = this.centre(c);
      ctx.save();
      ctx.fillStyle = p.paper;
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cc.x, cc.y, 8 + Math.sin(t * 5) * 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.accent;
      ctx.beginPath();
      ctx.arc(cc.x, cc.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      text(ctx, p, `${m} m`, cc.x, cc.y - 17, 12, p.fg, "center", 700, "mono");
    }
  }

  /** R8: the cost meter and the ⚡ cached-address pin. */
  private drawCost(ctx: CanvasRenderingContext2D, p: Palette, t: number): void {
    const b = this.rs?.budget;
    if (!b) return;
    if (this.bolt) {
      const { x, y } = this.centre(this.bolt);
      this.drawPin(ctx, p, this.bolt, t * 1.4, p.sun, "⚡", true);
      ctx.save();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y + 6, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (this.bolt.ttl / 9));
      ctx.stroke();
      ctx.restore();
    }
    const total = this.coins();
    const w = 170;
    const frac = Math.min(1, total / b.cap);
    ctx.save();
    ctx.fillStyle = p.card;
    roundRectPath(ctx, 10, 10, w, 30, 8);
    ctx.fill();
    ctx.strokeStyle = p.fg;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = p.border;
    roundRectPath(ctx, 18, 28, w - 16, 6, 3);
    ctx.fill();
    ctx.fillStyle = frac > 1 ? p.route : frac > 0.6 ? p.sun : p.mint;
    roundRectPath(ctx, 18, 28, (w - 16) * frac, 6, 3);
    ctx.fill();
    ctx.restore();
    text(ctx, p, `${total} / ${b.cap} coins`, 10 + w / 2, 19, 12, frac > 0.6 ? p.route : p.fg, "center", 800, "mono");
  }

  private drawLearnPins(ctx: CanvasRenderingContext2D, p: Palette, t: number): void {
    const s = this.rs;
    if (!s) return;
    this.drawServerPath(ctx, p);
    this.drawSpikes(ctx, p, t);
    this.drawSnap(ctx, p, t);
    this.drawCost(ctx, p, t);
    if (s.decoyEvery) {
      for (const d of this.decoys) {
        this.drawAccuracy(ctx, p, d, d.acc, p.route);
        this.drawPin(ctx, p, d, t, p.route, "");
      }
      this.drawAccuracy(ctx, p, this.ping, this.pingAcc, p.route);
    }
    for (const g of this.ghosts) {
      const { x, y } = this.centre(g);
      ctx.save();
      ctx.strokeStyle = this.keyOn ? p.muted : p.route;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(x, y - 2, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      text(ctx, p, this.keyOn ? `ack #${g.id}` : `#${g.id}`, x, y - 20, 14, this.keyOn ? p.muted : p.fg, "center", 700, "mono");
    }
    if (this.keyPin) {
      const { x, y } = this.centre(this.keyPin);
      ctx.save();
      ctx.fillStyle = p.sun;
      roundRectPath(ctx, x - 11, y - 11, 22, 22, 6);
      ctx.fill();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      text(ctx, p, "🔑", x, y + 1, 13, p.ink, "center", 700);
      text(ctx, p, "ON CONFLICT", x, y - 20, 13, p.fg, "center", 700, "mono");
    }
  }

  private drawPin(ctx: CanvasRenderingContext2D, p: Palette, c: Cell, t: number, color: string, label: string, big = false): void {
    const { x, y } = this.centre(c);
    const bob = Math.sin(t * 5) * 1.5;
    const r = big ? 8 : 6.5;
    ctx.save();
    // ground ring
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 8 + Math.sin(t * 5) * 1.2, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // pin body
    const py = y - 4 + bob;
    ctx.fillStyle = color;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, py + r * 1.6);
    ctx.lineTo(x - r * 0.85, py + r * 0.2);
    ctx.arc(x, py - r * 0.1, r, Math.PI * 0.85, Math.PI * 2.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.paper;
    ctx.beginPath();
    ctx.arc(x, py - r * 0.1, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    if (label) text(ctx, p, label, x, py - r * 1.9, 12, p.fg, "center", 800, "display");
    ctx.restore();
  }

  protected draw(ctx: CanvasRenderingContext2D, p: Palette, t: number): void {
    if (!this.contours) this.contours = buildContours();

    ctx.fillStyle = p.bg;
    ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);

    ctx.save();
    ctx.fillStyle = p.card;
    roundRectPath(ctx, 1, 1, GRID - 2, GRID - 2, 14);
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = p.accent;
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 1.5;
    ctx.stroke(this.contours);
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.border;
    for (let x = 1; x < N; x++) {
      for (let y = 1; y < N; y++) ctx.fillRect(x * CELL - 1, y * CELL - 1, 2, 2);
    }

    if (this.rs) {
      this.drawCity(ctx, p);
      this.drawZones(ctx, p);
      this.drawBuildings(ctx, p);
    }

    for (const o of this.obstacles) {
      const x = o.x * CELL;
      const y = o.y * CELL;
      ctx.save();
      ctx.fillStyle = p.sun;
      roundRectPath(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 5);
      ctx.fill();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.clip();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = -CELL; k < CELL * 2; k += 8) {
        ctx.moveTo(x + k, y + CELL);
        ctx.lineTo(x + k + CELL, y);
      }
      ctx.globalAlpha = 0.8;
      ctx.stroke();
      ctx.restore();
    }

    const alpha = this.state === "playing" && this.stalled === 0 ? Math.min(1, this.tick / this.interval) : 1;
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
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        if (pts.length === 1) ctx.lineTo(pts[0].x + 0.01, pts[0].y);
      };
      // outline
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = CELL * 0.62 + 4;
      path();
      ctx.stroke();
      ctx.strokeStyle = this.state === "over" && this.outcome !== "won" ? p.muted : p.accent;
      ctx.lineWidth = CELL * 0.62;
      path();
      ctx.stroke();
      // centre dashes
      ctx.strokeStyle = p.paper;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 6]);
      path();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      const head = pts[0];
      const wob = this.stalled > 0 ? Math.sin(t * 40) * 2 : 0;
      ctx.fillStyle = p.accent;
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(head.x + wob, head.y, CELL * 0.44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.paper;
      ctx.beginPath();
      ctx.arc(head.x + wob, head.y, CELL * 0.18, 0, Math.PI * 2);
      ctx.fill();
      if (this.pulse > 0) {
        ctx.strokeStyle = p.route;
        ctx.globalAlpha = this.pulse;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(head.x, head.y, CELL * (0.5 + (1 - this.pulse) * 0.9), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    if (this.stalled > 0 && this.stallCell) {
      const c = this.centre(this.stallCell);
      const k = Math.min(1, this.stalled / GRACE);
      ctx.save();
      ctx.strokeStyle = p.route;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(c.x, c.y, CELL * 0.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k));
      ctx.stroke();
      ctx.restore();
    }

    if (this.deadAt) {
      const c = this.centre(this.deadAt);
      ctx.save();
      ctx.strokeStyle = p.route;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(c.x - 7, c.y - 7);
      ctx.lineTo(c.x + 7, c.y + 7);
      ctx.moveTo(c.x + 7, c.y - 7);
      ctx.lineTo(c.x - 7, c.y + 7);
      ctx.stroke();
      ctx.restore();
    }

    if (this.rs) this.drawLearnPins(ctx, p, t);
    if (!this.rs?.roads) this.drawPin(ctx, p, this.ping, t, p.route, this.rs?.dupRate ? `#${this.pingId}` : (this.label("ping") ?? ""));
    {
      const lab = this.label("trail");
      if (lab && pts.length > 0) text(ctx, p, lab, pts[0].x, pts[0].y - CELL * 0.95, 11, p.fg, "center", 700, "mono");
      const ol = this.label("obstacle");
      if (ol && this.obstacles.length > 0) {
        const o = this.centre(this.obstacles[0]);
        text(ctx, p, ol, o.x, o.y - CELL * 0.8, 11, p.fg, "center", 700, "mono");
      }
    }
    if (this.bonus) {
      const { x, y } = this.centre(this.bonus);
      const frac = this.bonus.ttl / BONUS_TTL;
      this.drawPin(ctx, p, this.bonus, t * 1.6, p.sun, this.label("bonus") ?? "+50", true);
      ctx.save();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y + 6, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = p.fg;
    ctx.lineWidth = 2;
    roundRectPath(ctx, 1, 1, GRID - 2, GRID - 2, 14);
    ctx.stroke();
    ctx.restore();
  }
}

const legend = [
  { keys: "↑ ↓ ← → / WASD", does: "steer (any arrow starts)" },
  { keys: "Swipe / tap", does: "steer on touch screens" },
  { keys: "Space / F", does: "record a fix (Learn R2)" },
  { keys: "1 2 3", does: "cycle display filters / policies (Learn R6, R8)" },
  { keys: "P / Esc", does: "pause" },
];

const touch: TouchLayout = {
  left: [
    { action: "left", label: "←", aria: "Steer left" },
    { action: "right", label: "→", aria: "Steer right" },
  ],
  right: [
    { action: "up", label: "↑", aria: "Steer up" },
    { action: "down", label: "↓", aria: "Steer down" },
  ],
};

export function Route(props: GameComponentProps) {
  const opts = useGameOptions(props);
  const create = useCallback(() => new RouteGame(opts), [opts]);
  const script = props.level?.track === "learn" ? (props.level.script as RouteScript | undefined) : undefined;
  const manual = !!script?.manualFix;
  // R2 adds a wide Fix button to the right-hand pad.
  const pads = useMemo<TouchLayout>(() => (manual ? { left: touch.left, right: [...touch.right, { action: "fix", label: "Fix", aria: "Record a fix", wide: true }] } : touch), [manual]);
  return (
    <GameShell
      create={create}
      label={props.flavor?.title ?? "Route"}
      legend={legend}
      touch={pads}
      swipeHint="Tip: swipe on the map to steer. Tap above or below the trail to turn."
      extras={{ ...props, gameName: props.gameName ?? "Route" }}
    />
  );
}
