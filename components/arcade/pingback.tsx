"use client";

import { useCallback } from "react";
import { BaseGame, haptic, roundRectPath, text } from "./engine";
import type { ConceptView, GameOptions, Palette, TouchLayout } from "./engine";
import type { Lane, PingbackBug, PingbackScript } from "./games/concepts/types";
import { GameShell, useGameOptions } from "./game-shell";
import type { GameComponentProps } from "./game-shell";

// Story progress for Pingback = blobs destroyed, any size. Every bullet hit
// that pops a blob (including the fragments of a split) counts 1. Waves were
// too coarse for short chapter goals; "squash 15 bugs" reads better.

const WIDTH = 640;
const HEIGHT = 480;
const TURN_RATE = 4.2;
const THRUST = 300;
const MAX_SPEED = 320;
const BULLET_SPEED = 460;
const BULLET_LIFE = 1.1;
const MAX_BULLETS = 6;
const FIRE_COOLDOWN = 0.14;
const SHIP_R = 12;
const RESPAWN_DELAY = 1.6;
const INVULN = 2.6;
const EXTRA_LIFE_EVERY = 10000;
const START_LIVES = 3;

const BLOB_RADIUS: Record<number, number> = { 3: 38, 2: 23, 1: 13 };
const BLOB_SCORE: Record<number, number> = { 3: 20, 2: 50, 1: 100 };

interface Vec {
  x: number;
  y: number;
}

interface Ship extends Vec {
  vx: number;
  vy: number;
  angle: number;
  alive: boolean;
  respawn: number;
  invuln: number;
}

interface Bullet extends Vec {
  vx: number;
  vy: number;
  life: number;
  /** Learn: reflected by an out-of-order bug; harmless. */
  bounced?: boolean;
  /** Learn P7: Promise.all batch id. */
  batch?: number;
}

/** Learn roles; undefined = classic arcade blob. */
type Role = "noise" | "code" | "heavy" | "crate";

interface Blob extends Vec {
  vx: number;
  vy: number;
  size: number;
  r: number;
  verts: number[];
  angle: number;
  spin: number;
  seed: number;
  blink: number;
  role?: Role;
  bug?: PingbackBug;
  bounceCd?: number;
}

function wrap(v: Vec): void {
  if (v.x < -20) v.x += WIDTH + 40;
  else if (v.x > WIDTH + 20) v.x -= WIDTH + 40;
  if (v.y < -20) v.y += HEIGHT + 40;
  else if (v.y > HEIGHT + 20) v.y -= HEIGHT + 40;
}

function dist2(a: Vec, b: Vec): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function blobColor(size: number, p: Palette): string {
  return size === 3 ? p.lilac : size === 2 ? p.mint : p.sun;
}

class PingbackGame extends BaseGame {
  dispose(): void {
    this.sfx.setThrust(false);
    super.dispose();
  }

  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly keymap = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "thrust",
    ArrowDown: "brake",
    KeyA: "left",
    KeyD: "right",
    KeyW: "thrust",
    KeyS: "brake",
    Space: "fire",
    KeyP: "pause",
    Escape: "pause",
    Enter: "start",
  } as const;
  protected readonly title = "Pingback";
  protected readonly defaultNoun = "blobs";
  protected overTitle = "Tower down";

  private ship: Ship = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, alive: true, respawn: 0, invuln: 0 };
  private bullets: Bullet[] = [];
  private blobs: Blob[] = [];
  private lives = START_LIVES;
  private wave = 0;
  private waveDelay = 0;
  private fireCooldown = 0;
  private firePressed = false;
  private nextLifeAt = EXTRA_LIFE_EVERY;
  private thrusting = false;
  private braking = false;
  private destroyed = 0;
  private waveBanner = 0;
  private turned = false;
  private fired = false;
  private thrusted = false;
  // Learn state
  private ls: PingbackScript | null = null;
  private printed: string[] = [];
  private printedOrdered = 0;
  private activeLine: number | undefined;
  private freezeLeft = 0;
  private freezeBuffer = 0;
  private noiseRespawn = 0;
  private batchMode = false;
  private batchId = 0;
  private batches = new Map<number, { shots: number; hits: { bug: PingbackBug; x: number; y: number }[]; expired: boolean; resolved: boolean }>();
  private heavyLeft = 0;
  /** Job fragments processed by a freeze; credited when the tower unfreezes. */
  private pendingFrags = 0;

  constructor(opts: GameOptions) {
    super("pingback", opts);
    this.reset();
  }

  protected tips(touch: boolean): string[] {
    const n = this.noun;
    const lives = Math.max(1, this.params.lives ?? START_LIVES);
    const towers = lives === 1 ? "You have one tower. No respawns." : `The edges wrap around. You have ${lives} towers.`;
    return touch
      ? [`Turn with the pads, Thrust to move, hold Fire to keep shooting.`, `Big ${n} split into smaller ones. The small ones pay the most.`, towers]
      : [`← → turn, ↑ thrust, Space fires. Hold Space to keep shooting.`, `Big ${n} split into smaller ones. The small ones pay the most.`, towers];
  }

  private get maxBullets(): number {
    if (this.ls) {
      if (this.batchMode) return 3;
      if (this.ls.inflightCap) return this.ls.inflightCap;
    }
    return Math.max(1, this.params.maxBullets ?? MAX_BULLETS);
  }

  progressLabel(): string {
    if (this.ls) return this.ls.heavy?.required ? "chunks" : this.ls.bugs.some((b) => b.order === 0) ? "requests" : "prints";
    return super.progressLabel();
  }

  protected reset(): void {
    this.lives = Math.max(1, this.params.lives ?? START_LIVES);
    this.wave = Math.max(0, (this.params.startWave ?? 1) - 1);
    this.bullets = [];
    this.blobs = [];
    this.fireCooldown = 0;
    this.nextLifeAt = EXTRA_LIFE_EVERY;
    this.destroyed = 0;
    this.waveDelay = 0;
    this.waveBanner = 0;
    this.turned = false;
    this.fired = false;
    this.thrusted = false;
    this.resetShip();
    this.ship.invuln = 1.2;
    this.ls = null;
    if (this.learn) {
      this.learnReset();
      return;
    }
    this.startWave();
    if (this.params.tutorial) {
      this.tutorial = [
        { desk: "Hold ← or → to turn the tower", touch: "Hold ↺ or ↻ to turn the tower", done: () => this.turned },
        { desk: "Hold ↑ to thrust. You drift, so tap it", touch: "Hold Thrust to move. You drift, so tap it", done: () => this.thrusted },
        { desk: "Press Space to fire a ping", touch: "Tap Fire to send a ping", done: () => this.fired },
        { desk: `Pop the ${singularNoun(this.noun)}. Big ones split in two`, touch: `Pop the ${singularNoun(this.noun)}. Big ones split in two`, done: () => this.destroyed > 0 },
      ];
    }
  }

  protected hudExtra(): string {
    if (this.ls) return `${this.lives} ${this.lives === 1 ? "tower" : "towers"}`;
    return `Wave ${this.wave} · ${this.lives} ${this.lives === 1 ? "tower" : "towers"}`;
  }

  protected overLines(): string[] {
    return this.story ? [] : [`Reached wave ${this.wave} · ${this.destroyed} ${this.noun} down`];
  }

  private resetShip(): void {
    this.ship = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      alive: true,
      respawn: 0,
      invuln: INVULN,
    };
  }

  private makeBlob(x: number, y: number, size: number, speed: number): Blob {
    const a = Math.random() * Math.PI * 2;
    const n = 9 + Math.floor(Math.random() * 4);
    const verts: number[] = [];
    for (let i = 0; i < n; i++) verts.push(0.74 + Math.random() * 0.34);
    return {
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      size,
      r: BLOB_RADIUS[size],
      verts,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.4,
      seed: Math.random() * 10,
      blink: 1 + Math.random() * 4,
    };
  }

  private startWave(): void {
    this.wave++;
    this.waveBanner = 1.6;
    // Gentle curve: 2 blobs on wave 1, +1 per wave, capped at 8.
    const mul = this.params.speedMul ?? 1;
    const count = this.params.tutorial && this.wave === 1 ? 1 : Math.min(1 + this.wave, 8);
    const speed = (28 + this.wave * 6) * mul;
    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      let tries = 0;
      do {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) {
          x = Math.random() * WIDTH;
          y = -10;
        } else if (edge === 1) {
          x = WIDTH + 10;
          y = Math.random() * HEIGHT;
        } else if (edge === 2) {
          x = Math.random() * WIDTH;
          y = HEIGHT + 10;
        } else {
          x = -10;
          y = Math.random() * HEIGHT;
        }
        tries++;
      } while (dist2({ x, y }, this.ship) < 200 * 200 && tries < 12);
      this.blobs.push(this.makeBlob(x, y, this.params.tutorial && this.wave === 1 ? 2 : 3, speed * (0.8 + Math.random() * 0.5)));
    }
    if (this.wave > 1) this.sfx.play("level");
  }

  private fire(force = false): void {
    if (!this.ship.alive || this.freezeLeft > 0) return;
    const live = this.bullets.filter((u) => !u.bounced).length;
    if ((!force && this.fireCooldown > 0) || live >= this.maxBullets) return;
    const s = this.ship;
    const nx = Math.cos(s.angle);
    const ny = Math.sin(s.angle);
    const speed = BULLET_SPEED * (this.params.bulletSpeedMul ?? 1);
    let batch: number | undefined;
    if (this.batchMode) {
      const cur = this.batches.get(this.batchId);
      if (!cur || cur.resolved) {
        this.batchId++;
        this.batches.set(this.batchId, { shots: 0, hits: [], expired: false, resolved: false });
      }
      batch = this.batchId;
      this.batches.get(batch)!.shots++;
    }
    this.bullets.push({
      x: s.x + nx * SHIP_R * 1.3,
      y: s.y + ny * SHIP_R * 1.3,
      vx: nx * speed + s.vx * 0.4,
      vy: ny * speed + s.vy * 0.4,
      life: this.params.bulletLife ?? BULLET_LIFE,
      batch,
    });
    this.fireCooldown = FIRE_COOLDOWN;
    this.fired = true;
    this.sfx.play("fire");
  }

  private splitBlob(index: number): void {
    const b = this.blobs[index];
    this.blobs.splice(index, 1);
    const gained = BLOB_SCORE[b.size];
    this.score += gained;
    this.destroyed++;
    const pal = this.paletteHint;
    if (pal) {
      const col = blobColor(b.size, pal);
      this.fx.burst(b.x, b.y, b.size === 3 ? 18 : b.size === 2 ? 12 : 8, {
        color: [col, pal.fg],
        speed: 90 + b.size * 30,
        size: 2 + b.size * 1.5,
        shape: "dot",
        life: 0.5,
      });
      this.fx.pop(b.x, b.y - b.r * 0.6, `+${gained}`, b.size === 1 ? pal.route : pal.fg, b.size === 1 ? 20 : 16);
    }
    this.fx.shake(b.size === 3 ? 3 : b.size === 2 ? 2 : 1.2, 0.14);
    this.sfx.play(b.size === 1 ? "hit" : "explode");
    haptic(b.size === 1 ? 15 : 25);
    if (b.size > 1) {
      const speed = Math.hypot(b.vx, b.vy) * 1.2 + 16;
      for (let i = 0; i < 2; i++) this.blobs.push(this.makeBlob(b.x, b.y, b.size - 1, speed));
    }
    if (this.score >= this.nextLifeAt) {
      this.lives++;
      this.nextLifeAt += EXTRA_LIFE_EVERY;
      if (pal) this.fx.pop(WIDTH / 2, 70, "Extra tower!", pal.accent, 22);
      this.sfx.play("life");
    }
    this.addProgress(1);
  }

  private killShip(): void {
    const s = this.ship;
    s.alive = false;
    s.respawn = RESPAWN_DELAY;
    this.sfx.setThrust(false);
    const pal = this.paletteHint;
    if (pal) {
      this.fx.burst(s.x, s.y, 30, { color: [pal.accent, pal.route, pal.fg], speed: 170, size: 4, shape: "spark", life: 0.7 });
      this.fx.flash(pal.route, 0.28);
    }
    this.fx.shake(9, 0.4);
    this.sfx.play("die");
    haptic([50, 30, 50]);
    this.lives--;
    if (this.lives <= 0) this.die();
  }

  protected onAction(action: string, down: boolean): void {
    if (action === "thrust") {
      this.thrusting = down;
      this.sfx.setThrust(down && this.state === "playing" && this.ship.alive);
    }
    if (action === "brake") this.braking = down;
    if (action === "fire") {
      this.firePressed = down;
      if (down && this.state === "playing" && this.freezeLeft > 0) {
        // Input during a long task waits in line and fires all at once later.
        this.freezeBuffer = Math.min(6, this.freezeBuffer + 1);
        return;
      }
      if (down && this.state === "playing") this.fire();
    }
  }

  protected step(dt: number): void {
    const s = this.ship;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.waveBanner > 0) this.waveBanner -= dt;
    let frozen = false;
    if (this.freezeLeft > 0) {
      this.freezeLeft -= dt;
      frozen = this.freezeLeft > 0;
      if (!frozen) {
        this.freezeLeft = 0;
        const n = this.freezeBuffer;
        this.freezeBuffer = 0;
        for (let k = 0; k < n; k++) this.fire(true);
        if (this.thrusting) this.sfx.setThrust(true);
        this.announce(n > 0 ? `Unfrozen. ${n} queued presses fired at once.` : "Unfrozen.");
        if (this.pendingFrags > 0) {
          const f = this.pendingFrags;
          this.pendingFrags = 0;
          this.addProgress(f);
          if (this.state !== "playing") return;
        }
      }
    }

    if (s.alive) {
      if (!frozen && this.held.has("left")) s.angle -= TURN_RATE * dt;
      if (!frozen && this.held.has("right")) s.angle += TURN_RATE * dt;
      if (this.held.has("left") || this.held.has("right")) this.turned = true;
      if (this.thrusting && !frozen) {
        this.thrusted = true;
        s.vx += Math.cos(s.angle) * THRUST * dt;
        s.vy += Math.sin(s.angle) * THRUST * dt;
        if (!this.fx.reduced && Math.random() < 0.5 && this.paletteHint) {
          const bx = s.x - Math.cos(s.angle) * SHIP_R;
          const by = s.y - Math.sin(s.angle) * SHIP_R;
          this.fx.burst(bx, by, 1, {
            color: [this.paletteHint.route, this.paletteHint.sun],
            speed: 110,
            size: 3,
            life: 0.25,
            angle: s.angle + Math.PI,
            spread: 0.6,
          });
        }
      }
      const damp = Math.pow(this.braking ? 0.05 : 0.45, dt);
      s.vx *= damp;
      s.vy *= damp;
      const sp = Math.hypot(s.vx, s.vy);
      if (sp > MAX_SPEED) {
        s.vx = (s.vx / sp) * MAX_SPEED;
        s.vy = (s.vy / sp) * MAX_SPEED;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      wrap(s);
      s.invuln = Math.max(0, s.invuln - dt);
      if (this.firePressed && !frozen) this.fire();
    } else {
      s.respawn -= dt;
      if (s.respawn <= 0) {
        const center = { x: WIDTH / 2, y: HEIGHT / 2 };
        const clear = this.blobs.every((b) => dist2(b, center) > (b.r + 80) * (b.r + 80));
        if (clear) {
          this.resetShip();
          if (this.thrusting) this.sfx.setThrust(true);
        } else s.respawn = 0.3;
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      if (b.life <= 0) {
        if (b.batch !== undefined && !b.bounced) {
          const bt = this.batches.get(b.batch);
          if (bt) bt.expired = true;
        }
        this.bullets.splice(i, 1);
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      wrap(b);
    }

    if (this.ls) this.resolveBatches();
    if (this.state !== "playing") return;

    for (const b of this.blobs) {
      if (b.role === "heavy" && s.alive) {
        // The long job drifts toward the tower.
        const a = Math.atan2(s.y - b.y, s.x - b.x);
        const sp = (b.size === 3 ? 22 : 30) * (this.params.speedMul ?? 1);
        b.vx += (Math.cos(a) * sp - b.vx) * Math.min(1, dt * 0.8);
        b.vy += (Math.sin(a) * sp - b.vy) * Math.min(1, dt * 0.8);
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.spin * dt;
      b.blink -= dt;
      if (b.blink < -0.12) b.blink = 1.5 + Math.random() * 4;
      wrap(b);
    }

    if (this.ls) {
      this.learnCollide(dt);
      return;
    }

    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const b = this.blobs[i];
      const hitR = b.r * 1.02; // generous for bullets
      let hit = false;
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        if (dist2(b, this.bullets[j]) < hitR * hitR) {
          this.bullets.splice(j, 1);
          hit = true;
          break;
        }
      }
      if (hit) {
        this.splitBlob(i);
        if (this.state !== "playing") return;
        continue;
      }
      if (s.alive && s.invuln <= 0) {
        const rr = b.r * 0.72 + SHIP_R * 0.55; // forgiving for the ship
        if (dist2(b, s) < rr * rr) {
          this.killShip();
          if (this.state !== "playing") return;
        }
      }
    }

    if (this.blobs.length === 0) {
      if (this.waveDelay === 0 && this.paletteHint) {
        this.fx.pop(WIDTH / 2, HEIGHT / 2 - 40, `Wave ${this.wave} clear!`, this.paletteHint.accent, 26);
        this.sfx.play("wave");
      }
      this.waveDelay += dt;
      if (this.waveDelay > 1.5) {
        this.waveDelay = 0;
        this.startWave();
      }
    }
  }


  /* ================================================================ */
  /* Learn track: the event loop (concept-levels.md §3)               */
  /* ================================================================ */

  private learnReset(): void {
    const s = this.script as PingbackScript;
    this.ls = s;
    this.wave = 0;
    this.printed = [];
    this.printedOrdered = 0;
    this.activeLine = undefined;
    this.freezeLeft = 0;
    this.freezeBuffer = 0;
    this.pendingFrags = 0;
    this.noiseRespawn = 0;
    this.batchMode = false;
    this.batchId = 0;
    this.batches.clear();
    this.meta.maxFreezeMs = 0;
    this.meta.singleBatch = 0;
    const roots = s.bugs.filter((b) => !b.spawnedBy);
    roots.forEach((b, i) => {
      const a = -Math.PI / 2 + ((i + 0.5) / roots.length) * Math.PI * 2;
      this.blobs.push(this.makeCodeBug(b, WIDTH / 2 + Math.cos(a) * 230, HEIGHT / 2 + Math.sin(a) * 160));
    });
    for (let i = 0; i < s.noise; i++) this.spawnNoise();
    this.heavyLeft = 0;
    if (s.heavy) {
      this.heavyLeft = 7;
      const h = this.makeBlob(WIDTH / 2, -10, 3, 18 * (this.params.speedMul ?? 1));
      h.role = "heavy";
      this.blobs.push(h);
    }
    if (s.promiseAllCrate) {
      // Top centre is the one spot the three request bugs never start on.
      const c = this.makeBlob(WIDTH / 2, 78, 2, 0);
      c.role = "crate";
      c.r = 22;
      c.spin = 0;
      this.blobs.push(c);
    }
    this.announce(`${s.bugs.length > 0 ? "Pop the bugs in the order the code prints them." : "Break the long job into chunks."}`);
  }

  private makeCodeBug(bug: PingbackBug, x: number, y: number): Blob {
    const b = this.makeBlob(x, y, 2, 12 * (this.params.speedMul ?? 1));
    b.role = "code";
    b.bug = bug;
    b.r = 26;
    b.spin = (Math.random() - 0.5) * 0.4;
    return b;
  }

  private spawnNoise(): void {
    let x = 0;
    let y = 0;
    let tries = 0;
    do {
      const edge = Math.floor(Math.random() * 4);
      x = edge === 1 ? WIDTH + 10 : edge === 3 ? -10 : Math.random() * WIDTH;
      y = edge === 0 ? -10 : edge === 2 ? HEIGHT + 10 : Math.random() * HEIGHT;
      tries++;
    } while (dist2({ x, y }, this.ship) < 220 * 220 && tries < 12);
    const n = this.makeBlob(x, y, 1, 46 * (this.params.speedMul ?? 1));
    n.role = "noise";
    this.blobs.push(n);
  }

  private canPop(bug: PingbackBug): boolean {
    return bug.order === 0 || bug.order === this.printedOrdered + 1;
  }

  private slipReason(bug: PingbackBug): string {
    const next = this.ls?.bugs.find((x) => x.order === this.printedOrdered + 1);
    if (bug.lane === "task") return `not yet: ${bug.id} is in the Tasks queue`;
    if (bug.lane === "micro") return `not yet: ${bug.id} is a microtask`;
    return next ? `not yet: ${next.id} prints first` : "not yet";
  }

  private laneName(l: Lane): string {
    return l === "task" ? "task" : l === "micro" ? "microtask" : "sync line";
  }

  private popCode(i: number, batch?: number): void {
    const b = this.blobs[i];
    const bug = b.bug!;
    this.blobs.splice(i, 1);
    this.printed.push(bug.id);
    if (bug.order > 0) this.printedOrdered++;
    if (bug.line !== undefined) this.activeLine = bug.line;
    this.score += 100;
    const pal = this.paletteHint;
    if (pal) {
      this.fx.burst(b.x, b.y, 14, { color: [pal.mint, pal.accent, pal.fg], speed: 140, size: 4, life: 0.5 });
      this.fx.pop(b.x, b.y - b.r - 6, `log ${bug.id}`, pal.accent, 18);
    }
    this.sfx.play("hit");
    haptic(15);
    this.announce(`Printed ${bug.id}`);
    for (const c of this.ls?.bugs ?? []) {
      if (c.spawnedBy !== bug.id) continue;
      const nb = this.makeCodeBug(c, b.x + (Math.random() - 0.5) * 30, b.y + (Math.random() - 0.5) * 30);
      this.blobs.push(nb);
      if (pal) this.fx.pop(nb.x, nb.y + 30, `${c.id} queued`, pal.muted, 15);
      this.announce(`Printed ${bug.id}. ${c.id} queued as a ${this.laneName(c.lane)}.`);
    }
    if (batch !== undefined) this.batches.get(batch)?.hits.push({ bug, x: b.x, y: b.y });
    this.addProgress(1);
  }

  private bounce(u: Bullet, b: Blob): void {
    const nx = u.x - b.x;
    const ny = u.y - b.y;
    const d = Math.hypot(nx, ny) || 1;
    const dot = (u.vx * nx + u.vy * ny) / d;
    u.vx -= (2 * dot * nx) / d;
    u.vy -= (2 * dot * ny) / d;
    u.bounced = true;
    u.life = Math.min(u.life, 0.5);
    if (!b.bounceCd) {
      this.slip(this.slipReason(b.bug!), b.x, b.y - b.r - 16);
      b.bounceCd = 0.8;
    } else this.sfx.play("bump");
  }

  private popNoise(i: number): void {
    const b = this.blobs[i];
    this.blobs.splice(i, 1);
    this.score += BLOB_SCORE[b.size] ?? 50;
    const pal = this.paletteHint;
    if (pal) this.fx.burst(b.x, b.y, 8, { color: [blobColor(1, pal), pal.fg], speed: 120, size: 3, life: 0.4 });
    this.sfx.play("hit");
  }

  private chunkHeavy(i: number): void {
    const b = this.blobs[i];
    this.blobs.splice(i, 1);
    this.heavyLeft -= 1;
    this.score += 40;
    const pal = this.paletteHint;
    if (pal) {
      this.fx.burst(b.x, b.y, 10 + b.size * 4, { color: [pal.lilac, pal.fg], speed: 100 + b.size * 30, size: 3 + b.size, life: 0.45 });
      this.fx.pop(b.x, b.y - b.r, b.size > 1 ? "split" : "chunk done", pal.fg, 15);
    }
    this.sfx.play(b.size > 1 ? "explode" : "hit");
    if (b.size > 1) {
      for (let k = 0; k < 2; k++) {
        const c = this.makeBlob(b.x, b.y, b.size - 1, 22 * (this.params.speedMul ?? 1));
        c.role = "heavy";
        this.blobs.push(c);
      }
    }
    if (this.ls?.heavy?.required) this.addProgress(1);
  }

  private runWhole(i: number): void {
    const b = this.blobs[i];
    const heavy = this.ls?.heavy;
    if (!heavy) return;
    this.blobs.splice(i, 1);
    const frags = b.size === 3 ? 7 : b.size === 2 ? 3 : 1;
    const ms = b.size === 3 ? heavy.freezeMs : b.size === 2 ? Math.round(heavy.freezeMs * 0.3) : 40;
    this.heavyLeft -= frags;
    this.freezeLeft = ms / 1000;
    this.freezeBuffer = 0;
    this.meta.maxFreezeMs = Math.max(this.meta.maxFreezeMs ?? 0, ms);
    this.sfx.setThrust(false);
    if (ms > 50) this.slip(`long task: froze ${(ms / 1000).toFixed(1)} s`, this.ship.x, this.ship.y - 40);
    else this.announce("Small chunk ran in a blink.");
    // The job finishes when the long task does: credit it after the freeze.
    if (heavy.required) this.pendingFrags += frags;
  }

  private openCrate(i: number): void {
    const b = this.blobs[i];
    this.blobs.splice(i, 1);
    this.batchMode = true;
    const pal = this.paletteHint;
    if (pal) {
      this.fx.burst(b.x, b.y, 18, { color: [pal.sun, pal.ink], speed: 160, size: 5, shape: "square", gravity: 200, life: 0.7 });
      this.fx.pop(b.x, b.y - 34, "Promise.all: 3 in flight", pal.accent, 18);
    }
    this.sfx.play("level");
    this.announce("Promise.all unlocked: three requests can be in flight. One timeout rejects the batch.");
  }

  private resolveBatches(): void {
    for (const [id, bt] of this.batches) {
      if (bt.resolved || this.bullets.some((u) => u.batch === id)) continue;
      bt.resolved = true;
      if (bt.expired && bt.hits.length > 0) {
        for (const h of bt.hits) {
          this.blobs.push(this.makeCodeBug(h.bug, h.x, h.y));
          const k = this.printed.lastIndexOf(h.bug.id);
          if (k >= 0) this.printed.splice(k, 1);
        }
        this.progress -= bt.hits.length;
        this.slip("one timed out: batch rejected", WIDTH / 2, 90);
      } else if (!bt.expired && bt.hits.length >= 3) {
        this.meta.singleBatch = 1;
      }
      this.checkWin();
    }
  }

  protected extraWinMet(): boolean {
    if (!this.ls) return true;
    for (const bt of this.batches.values()) if (!bt.resolved && bt.hits.length > 0) return false;
    return true;
  }

  private learnCollide(dt: number): void {
    const s = this.ship;
    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const b = this.blobs[i];
      if (!b) continue;
      if (b.bounceCd) b.bounceCd = Math.max(0, b.bounceCd - dt);
      const hitR = b.r * 1.05;
      let hit = -1;
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const u = this.bullets[j];
        if (u.bounced) continue;
        if (dist2(b, u) < hitR * hitR) {
          hit = j;
          break;
        }
      }
      if (hit >= 0) {
        const u = this.bullets[hit];
        if (b.role === "code") {
          if (this.canPop(b.bug!)) {
            this.bullets.splice(hit, 1);
            this.popCode(i, u.batch);
          } else this.bounce(u, b);
        } else {
          this.bullets.splice(hit, 1);
          if (b.role === "crate") this.openCrate(i);
          else if (b.role === "heavy") this.chunkHeavy(i);
          else this.popNoise(i);
        }
        if (this.state !== "playing") return;
        continue;
      }
      if (!s.alive || this.freezeLeft > 0) continue;
      if (b.role === "noise" && s.invuln <= 0) {
        const rr = b.r * 0.72 + SHIP_R * 0.55;
        if (dist2(b, s) < rr * rr) {
          this.killShip();
          if (this.state !== "playing") return;
        }
      } else if (b.role === "heavy") {
        const rr = b.r * 0.8 + SHIP_R * 0.6;
        if (dist2(b, s) < rr * rr) {
          this.runWhole(i);
          if (this.state !== "playing") return;
        }
      }
    }
    const ls = this.ls;
    if (ls) {
      const noise = this.blobs.filter((b) => b.role === "noise").length;
      if (noise < ls.noise) {
        this.noiseRespawn -= dt;
        if (this.noiseRespawn <= 0) {
          this.spawnNoise();
          this.noiseRespawn = 2.5;
        }
      }
    }
  }

  protected conceptView(): ConceptView | undefined {
    const s = this.ls;
    if (!s) return undefined;
    const ordered = s.bugs.filter((b) => b.order > 0);
    const waiting = this.blobs.filter((b) => b.role === "code").map((b) => b.bug!);
    const show = !!s.showMachinery;
    const laneItems = (l: Lane) => (show ? waiting.filter((b) => b.lane === l).sort((a, b) => a.order - b.order).map((b) => (b.badge ? `${b.id} ${b.badge}` : b.id)) : []);
    const frozen = this.freezeLeft > 0;
    const stats: NonNullable<ConceptView["stats"]> = [];
    if (s.heavy) {
      stats.push({ label: "Main thread", value: frozen ? "frozen" : "responsive", tone: frozen ? "bad" : "ok" });
      stats.push({ label: "FPS", value: frozen ? "0" : "60", tone: frozen ? "bad" : "ok" });
      stats.push({ label: "Longest freeze", value: `${this.meta.maxFreezeMs ?? 0} ms`, tone: (this.meta.maxFreezeMs ?? 0) > 50 ? "warn" : "ok" });
      if (frozen && this.freezeBuffer > 0) stats.push({ label: "Queued presses", value: String(this.freezeBuffer), tone: "warn" });
    }
    if (s.inflightCap || s.promiseAllCrate) {
      stats.push({ label: "In flight", value: `${this.bullets.filter((u) => !u.bounced).length} / ${this.maxBullets}` });
      stats.push({ label: "Mode", value: this.batchMode ? "Promise.all" : "await one at a time", tone: this.batchMode ? "ok" : undefined });
    }
    return {
      summary: `Console: ${this.printed.join(" ") || "(empty)"}${frozen ? " · FROZEN" : ""}`,
      code: { lines: s.code, active: this.activeLine },
      lanes:
        ordered.length > 0
          ? [
              { id: "stack", label: "Call stack", items: laneItems("sync"), note: show ? undefined : "predict from the code" },
              { id: "micro", label: "Microtasks", icon: "⚡", items: laneItems("micro"), note: show ? undefined : "?" },
              { id: "task", label: "Tasks", icon: "⏱", items: laneItems("task"), note: show ? undefined : "?" },
            ]
          : undefined,
      console: s.bugs.length > 0 ? { items: [...this.printed], total: ordered.length || s.bugs.length } : undefined,
      stats: stats.length > 0 ? stats : undefined,
    };
  }

  private drawCodeBug(ctx: CanvasRenderingContext2D, p: Palette, b: Blob, t: number): void {
    const bug = b.bug!;
    const show = !!this.ls?.showMachinery;
    const fill = show ? (bug.lane === "task" ? p.sun : bug.lane === "micro" ? p.lilac : p.mint) : p.sky;
    this.drawBlob(ctx, p, b, t, fill, true);
    const label = bug.tag ?? bug.id;
    ctx.save();
    ctx.font = `700 ${label.length > 3 ? 15 : 20}px ${p.mono}`;
    const w = Math.max(28, ctx.measureText(label).width + 14);
    ctx.fillStyle = p.paper;
    roundRectPath(ctx, b.x - w / 2, b.y - 13, w, 26, 8);
    ctx.fill();
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = p.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, b.x, b.y + 1);
    if (show && bug.lane !== "sync") {
      text(ctx, p, bug.lane === "task" ? "⏱" : "⚡", b.x + b.r * 0.85, b.y - b.r * 0.8, 18, p.ink, "center", 700);
    }
    if (bug.badge) text(ctx, p, bug.badge, b.x - b.r * 0.85, b.y - b.r * 0.8, 16, p.ink, "center", 700);
    if (show && !this.canPop(bug)) {
      ctx.strokeStyle = p.accent;
      ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 4);
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCrate(ctx: CanvasRenderingContext2D, p: Palette, b: Blob, t: number): void {
    const s = 40 + Math.sin(t * 3) * 2;
    ctx.save();
    ctx.fillStyle = p.sun;
    roundRectPath(ctx, b.x - s / 2, b.y - s / 2, s, s, 8);
    ctx.fill();
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x - s / 2, b.y - s / 2);
    ctx.lineTo(b.x + s / 2, b.y + s / 2);
    ctx.moveTo(b.x + s / 2, b.y - s / 2);
    ctx.lineTo(b.x - s / 2, b.y + s / 2);
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.restore();
    text(ctx, p, "×3", b.x, b.y, 18, p.ink, "center", 800, "display");
    text(ctx, p, "Promise.all", b.x, b.y + s / 2 + 14, 14, p.fg, "center", 700, "mono");
  }

  private drawShip(ctx: CanvasRenderingContext2D, p: Palette, x: number, y: number, angle: number, scale: number, t: number, live: boolean): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    if (live && this.thrusting && this.ship.alive) {
      const f = 0.7 + Math.random() * 0.6;
      ctx.fillStyle = p.route;
      ctx.beginPath();
      ctx.moveTo(-SHIP_R * 0.7, SHIP_R * 0.45);
      ctx.lineTo(-SHIP_R * (0.9 + f), 0);
      ctx.lineTo(-SHIP_R * 0.7, -SHIP_R * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = p.sun;
      ctx.beginPath();
      ctx.moveTo(-SHIP_R * 0.7, SHIP_R * 0.22);
      ctx.lineTo(-SHIP_R * (0.8 + f * 0.6), 0);
      ctx.lineTo(-SHIP_R * 0.7, -SHIP_R * 0.22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = p.accent;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2 / scale;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(SHIP_R * 1.35, 0);
    ctx.lineTo(-SHIP_R * 0.9, SHIP_R * 0.85);
    ctx.lineTo(-SHIP_R * 0.45, 0);
    ctx.lineTo(-SHIP_R * 0.9, -SHIP_R * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.paper;
    ctx.beginPath();
    ctx.arc(SHIP_R * 0.3, 0, SHIP_R * 0.22, 0, Math.PI * 2);
    ctx.fill();
    if (live && this.ship.invuln > 0) {
      ctx.strokeStyle = p.accent;
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 12);
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, SHIP_R * 2.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBlob(ctx: CanvasRenderingContext2D, p: Palette, b: Blob, t: number, fill?: string, noEyes = false): void {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = fill ?? blobColor(b.size, p);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    const n = b.verts.length;
    for (let i = 0; i <= n; i++) {
      const k = i % n;
      const wob = 1 + 0.04 * Math.sin(t * 3 + b.seed + k * 1.7);
      const rad = b.r * b.verts[k] * wob;
      const a = (k / n) * Math.PI * 2;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (noEyes) {
      ctx.restore();
      return;
    }
    // Eyes (they are bugs, after all). Counter-rotate so they stay upright.
    ctx.rotate(-b.angle);
    const er = Math.max(2, b.r * 0.16);
    const gap = b.r * 0.32;
    const blinking = b.blink < 0;
    for (const sx of [-1, 1]) {
      ctx.fillStyle = p.paper;
      ctx.beginPath();
      if (blinking) {
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 2;
        ctx.moveTo(sx * gap - er, 0);
        ctx.lineTo(sx * gap + er, 0);
        ctx.stroke();
        continue;
      }
      ctx.arc(sx * gap, 0, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // pupil looks toward the ship
      const dx = this.ship.x - b.x;
      const dy = this.ship.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      ctx.fillStyle = p.ink;
      ctx.beginPath();
      ctx.arc(sx * gap + (dx / d) * er * 0.4, (dy / d) * er * 0.4, er * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  protected draw(ctx: CanvasRenderingContext2D, p: Palette, t: number): void {
    ctx.fillStyle = p.bg;
    ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);

    // Field card
    ctx.save();
    ctx.fillStyle = p.card;
    roundRectPath(ctx, 1, 1, WIDTH - 2, HEIGHT - 2, 14);
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = p.border;
    for (let x = 40; x < WIDTH; x += 40) {
      for (let y = 40; y < HEIGHT; y += 40) ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    ctx.save();
    ctx.lineCap = "round";
    for (const b of this.bullets) {
      ctx.fillStyle = b.bounced ? p.route : p.accent;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.bounced ? 4 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    for (const b of this.blobs) {
      if (b.role === "code") {
        this.drawCodeBug(ctx, p, b, t);
        continue;
      }
      if (b.role === "crate") {
        this.drawCrate(ctx, p, b, t);
        continue;
      }
      this.drawBlob(ctx, p, b, t, b.role === "heavy" ? p.lilac : undefined);
      if (b.role === "heavy" && this.ls?.heavy) {
        text(ctx, p, b.size === 3 ? this.ls.heavy.label : "chunk", b.x, b.y + b.r + 13, b.size === 3 ? 16 : 13, p.fg, "center", 700, "mono");
      }
      const lab = this.label(b.size === 3 ? "big" : b.size === 2 ? "mid" : "small");
      if (lab) text(ctx, p, lab, b.x, b.y + b.r + 11, 11, p.fg, "center", 700, "mono");
    }
    if (this.ship.alive) {
      const lab = this.label("ship");
      if (lab) text(ctx, p, lab, this.ship.x, this.ship.y + SHIP_R * 2.2, 11, p.fg, "center", 700, "mono");
    }

    if (this.ship.alive && this.state !== "idle") {
      const blink = this.ship.invuln > 0 && Math.floor(t * 10) % 2 === 0;
      if (!blink || this.ship.invuln > INVULN - 0.4) this.drawShip(ctx, p, this.ship.x, this.ship.y, this.ship.angle, 1, t, true);
    } else if (this.state === "idle") {
      this.drawShip(ctx, p, this.ship.x, this.ship.y, this.ship.angle, 1, t, false);
    }

    if (this.freezeLeft > 0 && this.ship.alive) {
      ctx.save();
      ctx.strokeStyle = p.route;
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(this.ship.x, this.ship.y, SHIP_R * 2.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      text(ctx, p, "FROZEN", this.ship.x, this.ship.y - SHIP_R * 3.4, 16, p.route, "center", 800, "display");
      if (this.freezeBuffer > 0) text(ctx, p, `${"›".repeat(this.freezeBuffer)} queued`, this.ship.x, this.ship.y + SHIP_R * 3.4, 14, p.fg, "center", 700, "mono");
    }

    // In-canvas HUD: towers + wave
    for (let i = 0; i < this.lives; i++) {
      this.drawShip(ctx, p, 28 + i * 26, 26, -Math.PI / 2, 0.75, t, false);
    }
    if (this.ls) {
      if (this.ls.bugs.length > 0) text(ctx, p, `> ${this.printed.join(" ")}${this.state === "playing" ? "_" : ""}`, WIDTH - 20, 26, 16, p.fg, "right", 700, "mono");
    } else text(ctx, p, `Wave ${this.wave}`, WIDTH - 20, 26, 15, p.fg, "right", 700);
    if (this.waveBanner > 0 && this.state === "playing") {
      ctx.globalAlpha = Math.min(1, this.waveBanner);
      text(ctx, p, `Wave ${this.wave}`, WIDTH / 2, HEIGHT / 2 + 70, 28, p.muted, "center", 800, "display");
      ctx.globalAlpha = 1;
    }
    if (!this.ls && this.blobs.length === 0 && this.state === "playing") {
      text(ctx, p, `Wave ${this.wave + 1} incoming`, WIDTH / 2, HEIGHT / 2 + 70, 15, p.accent, "center", 700);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = p.fg;
    ctx.lineWidth = 2;
    roundRectPath(ctx, 1, 1, WIDTH - 2, HEIGHT - 2, 14);
    ctx.stroke();
    ctx.restore();
  }
}

const legend = [
  { keys: "← → / A D", does: "turn" },
  { keys: "↑ / W", does: "thrust" },
  { keys: "↓ / S", does: "brake" },
  { keys: "Space", does: "fire (hold to keep firing)" },
  { keys: "P / Esc", does: "pause" },
];

const touch: TouchLayout = {
  left: [
    { action: "left", label: "↺", aria: "Turn left" },
    { action: "right", label: "↻", aria: "Turn right" },
  ],
  right: [
    { action: "thrust", label: "Thrust", aria: "Thrust", wide: true },
    { action: "fire", label: "Fire", aria: "Fire", wide: true },
  ],
};

function singularNoun(noun: string): string {
  return noun.endsWith("s") && noun.length > 3 ? noun.slice(0, -1) : noun;
}

export function Pingback(props: GameComponentProps) {
  const opts = useGameOptions(props);
  const create = useCallback(() => new PingbackGame(opts), [opts]);
  return <GameShell create={create} label={props.flavor?.title ?? "Pingback"} legend={legend} touch={touch} extras={{ ...props, gameName: props.gameName ?? "Pingback" }} />;
}
