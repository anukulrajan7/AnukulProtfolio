"use client";

import { BaseGame, frameTicks, pad, text } from "./engine";
import type { Palette, TouchLayout } from "./engine";
import { GameShell } from "./game-shell";

const WIDTH = 640;
const HEIGHT = 480;
const TURN_RATE = 4.4;
const THRUST = 280;
const MAX_SPEED = 330;
const BULLET_SPEED = 440;
const BULLET_LIFE = 1.05;
const MAX_BULLETS = 5;
const FIRE_COOLDOWN = 0.16;
const SHIP_R = 11;
const RESPAWN_DELAY = 1.8;
const INVULN = 2.2;
const EXTRA_LIFE_EVERY = 10000;

const BLOB_RADIUS: Record<number, number> = { 3: 40, 2: 23, 1: 12 };
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
}

interface Blob extends Vec {
  vx: number;
  vy: number;
  size: number;
  r: number;
  verts: number[];
  angle: number;
  spin: number;
  seed: number;
}

interface Particle extends Vec {
  vx: number;
  vy: number;
  life: number;
  max: number;
  accent: boolean;
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

class PingbackGame extends BaseGame {
  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly keymap = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "thrust",
    KeyA: "left",
    KeyD: "right",
    KeyW: "thrust",
    Space: "fire",
    KeyP: "pause",
    Escape: "pause",
    Enter: "start",
  } as const;
  protected readonly title = "Pingback";
  protected readonly startLines = [
    "Enter — start",
    "← → turn · ↑ thrust · Space fire",
    "Clear the noise. Big blobs split.",
  ];
  protected overTitle = "Tower down";

  private ship: Ship = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, alive: true, respawn: 0, invuln: 0 };
  private bullets: Bullet[] = [];
  private blobs: Blob[] = [];
  private particles: Particle[] = [];
  private lives = 3;
  private wave = 0;
  private waveDelay = 0;
  private fireCooldown = 0;
  private firePressed = false;
  private nextLifeAt = EXTRA_LIFE_EVERY;
  private thrusting = false;

  constructor() {
    super("pingback");
    this.reset();
  }

  protected reset(): void {
    this.lives = 3;
    this.wave = 0;
    this.bullets = [];
    this.blobs = [];
    this.particles = [];
    this.fireCooldown = 0;
    this.nextLifeAt = EXTRA_LIFE_EVERY;
    this.resetShip();
    this.ship.invuln = 1;
    this.startWave();
  }

  protected hudExtra(): string {
    return `WAVE ${String(this.wave).padStart(2, "0")} · LIVES ${this.lives}`;
  }

  protected overLines(): string[] {
    return [`Score ${this.score}`, `Best ${this.high}`, `Reached wave ${this.wave}`, "Enter — play again"];
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
    for (let i = 0; i < n; i++) verts.push(0.68 + Math.random() * 0.42);
    return {
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      size,
      r: BLOB_RADIUS[size],
      verts,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.6,
      seed: Math.random() * 10,
    };
  }

  private startWave(): void {
    this.wave++;
    const count = Math.min(3 + this.wave, 11);
    const speed = 36 + this.wave * 7;
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
      } while (dist2({ x, y }, this.ship) < 180 * 180 && tries < 12);
      this.blobs.push(this.makeBlob(x, y, 3, speed * (0.8 + Math.random() * 0.5)));
    }
  }

  private burst(x: number, y: number, n: number, speed: number, accent: boolean): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.9);
      const max = 0.4 + Math.random() * 0.6;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: max, max, accent });
    }
  }

  private fire(): void {
    if (!this.ship.alive || this.fireCooldown > 0 || this.bullets.length >= MAX_BULLETS) return;
    const s = this.ship;
    const nx = Math.cos(s.angle);
    const ny = Math.sin(s.angle);
    this.bullets.push({
      x: s.x + nx * SHIP_R * 1.3,
      y: s.y + ny * SHIP_R * 1.3,
      vx: nx * BULLET_SPEED + s.vx * 0.4,
      vy: ny * BULLET_SPEED + s.vy * 0.4,
      life: BULLET_LIFE,
    });
    this.fireCooldown = FIRE_COOLDOWN;
  }

  private splitBlob(index: number): void {
    const b = this.blobs[index];
    this.blobs.splice(index, 1);
    this.score += BLOB_SCORE[b.size];
    this.burst(b.x, b.y, b.size === 3 ? 14 : b.size === 2 ? 9 : 6, 80 + b.size * 20, b.size === 1);
    if (b.size > 1) {
      const speed = Math.hypot(b.vx, b.vy) * 1.25 + 18;
      for (let i = 0; i < 2; i++) {
        const child = this.makeBlob(b.x, b.y, b.size - 1, speed);
        this.blobs.push(child);
      }
    }
    if (this.score >= this.nextLifeAt) {
      this.lives++;
      this.nextLifeAt += EXTRA_LIFE_EVERY;
    }
  }

  private killShip(): void {
    const s = this.ship;
    s.alive = false;
    s.respawn = RESPAWN_DELAY;
    this.burst(s.x, s.y, 24, 140, true);
    this.lives--;
    if (this.lives <= 0) this.gameOver();
  }

  protected onAction(action: string, down: boolean): void {
    if (action === "thrust") this.thrusting = down;
    if (action === "fire") {
      this.firePressed = down;
      if (down && this.state === "playing") this.fire();
    }
  }

  protected step(dt: number): void {
    const s = this.ship;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    if (s.alive) {
      if (this.held.has("left")) s.angle -= TURN_RATE * dt;
      if (this.held.has("right")) s.angle += TURN_RATE * dt;
      if (this.thrusting) {
        s.vx += Math.cos(s.angle) * THRUST * dt;
        s.vy += Math.sin(s.angle) * THRUST * dt;
        if (Math.random() < 0.6) {
          const bx = s.x - Math.cos(s.angle) * SHIP_R;
          const by = s.y - Math.sin(s.angle) * SHIP_R;
          this.particles.push({
            x: bx,
            y: by,
            vx: -Math.cos(s.angle) * 90 + (Math.random() - 0.5) * 40,
            vy: -Math.sin(s.angle) * 90 + (Math.random() - 0.5) * 40,
            life: 0.25,
            max: 0.25,
            accent: true,
          });
        }
      }
      const damp = Math.pow(0.4, dt);
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
      if (this.firePressed) this.fire();
    } else {
      s.respawn -= dt;
      if (s.respawn <= 0) {
        const center = { x: WIDTH / 2, y: HEIGHT / 2 };
        const clear = this.blobs.every((b) => dist2(b, center) > (b.r + 70) * (b.r + 70));
        if (clear) this.resetShip();
        else s.respawn = 0.3;
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      wrap(b);
    }

    for (const b of this.blobs) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.spin * dt;
      wrap(b);
    }

    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const b = this.blobs[i];
      const hitR = b.r * 0.85;
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
        continue;
      }
      if (s.alive && s.invuln <= 0) {
        const rr = hitR + SHIP_R * 0.8;
        if (dist2(b, s) < rr * rr) {
          this.killShip();
          if (this.state !== "playing") return;
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.98;
      pt.vy *= 0.98;
    }

    if (this.blobs.length === 0) {
      this.waveDelay += dt;
      if (this.waveDelay > 1.6) {
        this.waveDelay = 0;
        this.startWave();
      }
    }
  }

  private drawShip(ctx: CanvasRenderingContext2D, p: Palette, x: number, y: number, angle: number, scale: number, t: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.strokeStyle = p.fg;
    ctx.lineWidth = 1.6 / scale;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(SHIP_R * 1.3, 0);
    ctx.lineTo(-SHIP_R * 0.9, SHIP_R * 0.8);
    ctx.lineTo(-SHIP_R * 0.45, 0);
    ctx.lineTo(-SHIP_R * 0.9, -SHIP_R * 0.8);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(SHIP_R * 0.1, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    if (this.thrusting && this.ship.alive && scale === 1) {
      const f = 0.6 + Math.random() * 0.6;
      ctx.strokeStyle = p.accent;
      ctx.beginPath();
      ctx.moveTo(-SHIP_R * 0.7, SHIP_R * 0.42);
      ctx.lineTo(-SHIP_R * (0.9 + f), 0);
      ctx.lineTo(-SHIP_R * 0.7, -SHIP_R * 0.42);
      ctx.stroke();
    }
    if (this.ship.invuln > 0 && scale === 1) {
      ctx.strokeStyle = p.route;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 12);
      ctx.beginPath();
      ctx.arc(0, 0, SHIP_R * 2.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  protected draw(ctx: CanvasRenderingContext2D, p: Palette, t: number): void {
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.fillStyle = p.border;
    for (let x = 40; x < WIDTH; x += 40) {
      for (let y = 40; y < HEIGHT; y += 40) ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    }
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 + 0.5, 0);
    ctx.lineTo(WIDTH / 2 + 0.5, HEIGHT);
    ctx.moveTo(0, HEIGHT / 2 + 0.5);
    ctx.lineTo(WIDTH, HEIGHT / 2 + 0.5);
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.restore();
    frameTicks(ctx, p.fg, 8, 8, WIDTH - 16, HEIGHT - 16);

    ctx.save();
    ctx.lineWidth = 1.5;
    for (const b of this.blobs) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.strokeStyle = p.fg;
      ctx.beginPath();
      const n = b.verts.length;
      for (let i = 0; i <= n; i++) {
        const k = i % n;
        const wob = 1 + 0.035 * Math.sin(t * 3 + b.seed + k * 1.7);
        const rad = b.r * b.verts[k] * wob;
        const a = (k / n) * Math.PI * 2;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      if (b.size >= 2) {
        ctx.globalAlpha = 0.3;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const k = i % n;
          const rad = b.r * b.verts[(k + 3) % n] * 0.5;
          const a = (k / n) * Math.PI * 2 + 0.4;
          const x = Math.cos(a) * rad;
          const y = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (const b of this.bullets) {
      const len = 6;
      const sp = Math.hypot(b.vx, b.vy) || 1;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - (b.vx / sp) * len, b.y - (b.vy / sp) * len);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    for (const pt of this.particles) {
      const a = pt.life / pt.max;
      ctx.globalAlpha = a;
      ctx.strokeStyle = pt.accent ? p.accent : p.fg;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x - pt.vx * 0.03, pt.y - pt.vy * 0.03);
      ctx.stroke();
    }
    ctx.restore();

    if (this.ship.alive) {
      const blink = this.ship.invuln > 0 && Math.floor(t * 10) % 2 === 0;
      if (!blink) this.drawShip(ctx, p, this.ship.x, this.ship.y, this.ship.angle, 1, t);
    }

    text(ctx, p, "SCORE", 20, 22, 10, p.muted, "left", 500);
    text(ctx, p, pad(this.score), 20, 40, 16, p.fg, "left", 700);
    text(ctx, p, "BEST", 130, 22, 10, p.muted, "left", 500);
    text(ctx, p, pad(this.high), 130, 40, 16, p.fg, "left", 700);
    text(ctx, p, "WAVE", WIDTH - 20, 22, 10, p.muted, "right", 500);
    text(ctx, p, String(this.wave).padStart(2, "0"), WIDTH - 20, 40, 16, p.fg, "right", 700);

    for (let i = 0; i < this.lives; i++) {
      this.drawShip(ctx, p, WIDTH / 2 - 30 + i * 22, 32, -Math.PI / 2, 0.7, t);
    }
    if (this.blobs.length === 0 && this.state === "playing") {
      text(ctx, p, `WAVE ${String(this.wave + 1).padStart(2, "0")} INCOMING`, WIDTH / 2, HEIGHT / 2 + 60, 12, p.accent, "center", 500);
    }
    text(ctx, p, "PINGBACK · NOISE FLOOR", WIDTH - 20, HEIGHT - 16, 9, p.muted, "right");
    text(ctx, p, `SIG ${this.bullets.length}/${MAX_BULLETS}`, 20, HEIGHT - 16, 9, p.muted, "left");
  }
}

const createPingback = () => new PingbackGame();

const legend = [
  { keys: "← → / A D", does: "turn" },
  { keys: "↑ / W", does: "thrust" },
  { keys: "Space", does: "fire (hold for auto)" },
  { keys: "P / Esc", does: "pause" },
  { keys: "Enter", does: "start / restart" },
];

const touch: TouchLayout = {
  left: [
    { action: "left", label: "↺", aria: "Turn left" },
    { action: "right", label: "↻", aria: "Turn right" },
  ],
  right: [
    { action: "thrust", label: "THRUST", aria: "Thrust" },
    { action: "fire", label: "FIRE", aria: "Fire" },
  ],
};

export function Pingback() {
  return <GameShell create={createPingback} label="Pingback" legend={legend} touch={touch} />;
}
