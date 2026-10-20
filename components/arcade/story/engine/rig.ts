// Procedural character rig: one rig, many silhouettes. No sprite sheets.
// Local space: feet at (0,0), facing +x, drawn at base scale 0.88 (~88 px tall).
import { C, LINE } from "./palette";
import { Rng, clamp, damp, lerp } from "./rng";
import { circlePts, drawShapes, glow, roundRectPts, wobble, type Pt, type ShapeStyle } from "./ink";

export type Kind = "you" | "chintu" | "sen" | "zoya" | "founder" | "manager" | "chaiwala" | "walker";
export type Mood = "neutral" | "happy" | "worried" | "tired" | "surprised" | "proud";
export type Anim = "idle" | "walk" | "sit" | "type" | "phone" | "phoneUp" | "sip" | "scratch" | "stretch" | "slump" | "hop" | "wave" | "carry";
export type Held = null | "phone" | "chai" | "label" | "card";

interface Look {
  body: string;
  legs: string;
  skin: string;
  width: number;
  tall: number;
}

const LOOKS: Record<Kind, Look> = {
  you: { body: C.cobalt, legs: C.coral, skin: C.skin[1], width: 44, tall: 1 },
  chintu: { body: C.sun, legs: C.muted, skin: C.skin[1], width: 52, tall: 0.96 },
  sen: { body: C.lilac, legs: C.muted, skin: C.skin[0], width: 42, tall: 1.15 },
  zoya: { body: C.coral, legs: C.ink, skin: C.skin[2], width: 42, tall: 1 },
  founder: { body: C.ink, legs: C.muted, skin: C.skin[0], width: 46, tall: 1.05 },
  manager: { body: C.sky, legs: C.muted, skin: C.skin[2], width: 46, tall: 1 },
  chaiwala: { body: C.surface, legs: C.muted, skin: C.skin[2], width: 46, tall: 0.98 },
  walker: { body: C.mint, legs: C.ink, skin: C.skin[0], width: 42, tall: 1 },
};

export const RIG_SCALE = 1.12;

export class Actor {
  x: number;
  y: number;
  facing: 1 | -1 = 1;
  anim: Anim = "idle";
  mood: Mood = "neutral";
  held: Held = null;
  /** 0 hunched → 1 upright. */
  posture = 1;
  lanyard = false;
  bag = false;
  speaking = false;
  visible = true;
  /** Walk speed px/s. */
  speed = 72;
  vx = 0;
  private t = Math.random() * 10;
  private blinkAt = 2 + Math.random() * 3;
  private blink = 0;
  private walkPhase = 0;
  private hopT = 0;
  private gestureT = 0;
  private gestureBack: Anim = "idle";
  private moodT = 0;
  private seed: number;
  /** Fired on each footfall while walking. */
  onStep: (() => void) | null = null;
  private lastStep = 0;
  color: string | null = null;
  bob = 0;
  tint = 1;

  constructor(
    public kind: Kind,
    x: number,
    y: number,
    seed = 1,
  ) {
    this.x = x;
    this.y = y;
    this.seed = seed;
  }

  /** Temporary gesture (scratch, stretch, hop, wave, sip) then back to previous anim. */
  gesture(a: Anim, dur = 1.2) {
    if (this.anim !== a) this.gestureBack = this.anim === "hop" || this.gestureT > 0 ? this.gestureBack : this.anim;
    this.anim = a;
    this.gestureT = dur;
    if (a === "hop") this.hopT = 0;
  }

  setMood(m: Mood, hold = 0) {
    this.mood = m;
    this.moodT = hold;
  }

  update(dt: number, boil: boolean) {
    this.t += dt;
    if (this.gestureT > 0) {
      this.gestureT -= dt;
      if (this.gestureT <= 0) this.anim = this.gestureBack;
    }
    if (this.moodT > 0) {
      this.moodT -= dt;
      if (this.moodT <= 0) this.mood = "neutral";
    }
    if (this.anim === "hop") this.hopT += dt;
    this.blinkAt -= dt;
    if (this.blinkAt <= 0) {
      this.blink = 0.12;
      this.blinkAt = 3 + Math.random() * 3;
    }
    if (this.blink > 0) this.blink -= dt;
    if (this.anim === "walk") {
      const prev = this.walkPhase;
      this.walkPhase += dt * (this.speed / 64) * 2.2 * Math.PI;
      const a = Math.floor(prev / Math.PI);
      const b = Math.floor(this.walkPhase / Math.PI);
      if (a !== b && this.t - this.lastStep > 0.18) {
        this.lastStep = this.t;
        this.onStep?.();
      }
    } else this.walkPhase = lerp(this.walkPhase, Math.round(this.walkPhase / Math.PI) * Math.PI, damp(0.3, dt));
    void boil;
  }

  /** Move toward a target x with acceleration. Returns true when arrived. */
  moveTo(tx: number, dt: number, min: number, max: number): boolean {
    const d = tx - this.x;
    if (Math.abs(d) < 2) {
      this.vx = 0;
      if (this.anim === "walk") this.anim = "idle";
      return true;
    }
    this.drive(Math.sign(d), dt, min, max);
    return false;
  }

  drive(ax: number, dt: number, min: number, max: number) {
    const target = ax * this.speed;
    this.vx = lerp(this.vx, target, damp(ax ? 0.35 : 0.5, dt));
    if (Math.abs(this.vx) < 1) this.vx = 0;
    this.x = clamp(this.x + this.vx * dt, min, max);
    if (ax) this.facing = ax > 0 ? 1 : -1;
    const walking = Math.abs(this.vx) > 6;
    if (walking && this.anim !== "walk" && this.gestureT <= 0) this.anim = "walk";
    if (!walking && this.anim === "walk") this.anim = "idle";
  }

  headTop(): [number, number] {
    const look = LOOKS[this.kind];
    return [this.x, this.y - 102 * RIG_SCALE * look.tall * (this.anim === "sit" || this.anim === "type" ? 0.72 : 1) - this.bob];
  }

  draw(ctx: CanvasRenderingContext2D, time: number, boil: boolean) {
    if (!this.visible) return;
    const look = LOOKS[this.kind];
    const rng = new Rng(this.seed + (boil ? Math.floor(time * 4) * 7919 : 0));
    const j = () => (rng.next() * 2 - 1) * 0.6;
    const st = (fill?: string | null, stroke?: string | null, lw?: number): ShapeStyle => ({ fill, stroke, lw });
    const P = (pts: Pt[], s: ShapeStyle, close = true) => ({ p: wobble(rng, pts, close), ...s });
    const R = (x: number, y: number, w: number, h: number, r: number, s: ShapeStyle) => P(roundRectPts(x, y, w, h, r), s);
    const O = (cx: number, cy: number, r: number, s: ShapeStyle) => P(circlePts(cx, cy, r), s);

    const sit = this.anim === "sit" || this.anim === "type";
    const breath = 1 + 0.015 * Math.sin((this.t / 2.4) * Math.PI * 2);
    const bobWalk = this.anim === "walk" ? Math.abs(Math.sin(this.walkPhase)) * 2 : 0;
    const hop = this.anim === "hop" ? Math.max(0, Math.sin(this.hopT * 9)) * 12 : 0;
    const hunch = 1 - this.posture;
    const s = RIG_SCALE * look.tall;

    ctx.save();
    ctx.translate(this.x, this.y - this.bob - hop);
    // shadow
    drawShapes(ctx, [P(ellipse(0, 1, 22, 5), st(C.shadow, null))]);
    ctx.scale(this.facing * s, s);
    ctx.translate(0, -bobWalk);

    const w = look.width;
    const legY = sit ? -14 : -26;
    // legs
    const legs = [];
    if (!sit) {
      const ph = this.walkPhase;
      const swing = this.anim === "walk" ? Math.sin(ph) * 0.31 : 0;
      for (const side of [-1, 1]) {
        const a = swing * side;
        const hx = side * 9;
        const pts = roundRectPts(-5, 0, 10, 26, 5).map(([px, py]): Pt => {
          const cx = px * Math.cos(a) - py * Math.sin(a);
          const cy = px * Math.sin(a) + py * Math.cos(a);
          return [hx + cx, legY + cy];
        });
        legs.push(P(pts, st(look.legs, C.ink)));
      }
    } else {
      // seated legs forward
      legs.push(R(-4, -16, 30, 10, 5, st(look.legs, C.ink)));
      legs.push(R(18, -16, 10, 18, 5, st(look.legs, C.ink)));
    }
    drawShapes(ctx, legs);

    // body (hunch rotates about the hips)
    ctx.save();
    ctx.translate(0, legY + 8);
    ctx.rotate(hunch * 0.22);
    ctx.scale(1, breath);
    ctx.translate(0, -(legY + 8));
    const bodyTop = legY - 40;
    const shapes = [];
    const bodyFill = this.color ?? look.body;
    // hood bump (You)
    if (this.kind === "you") shapes.push(R(-15, bodyTop - 12, 30, 20, 9, st(bodyFill, C.ink)));
    shapes.push(R(-w / 2, bodyTop, w, 48, 14, st(bodyFill, C.ink)));
    // arms by anim
    let hand: Pt | null = null;
    const arm = (sx: number, sy: number, ang: number, len = 24, color = bodyFill) => {
      hand = [sx - Math.sin(ang) * len, sy + Math.cos(ang) * len];
      const pts = roundRectPts(-4.5, 0, 9, len, 4.5).map(([px, py]): Pt => [sx + px * Math.cos(ang) - py * Math.sin(ang), sy + px * Math.sin(ang) + py * Math.cos(ang)]);
      shapes.push(P(pts, st(color, C.ink)));
    };
    const shoulderY = bodyTop + 10;
    const typeA = Math.sin(this.t * 10 * Math.PI) * 0.2;
    switch (this.anim) {
      case "type":
        arm(w / 2 - 4, shoulderY, -1.5 + typeA, 22);
        arm(w / 2 - 10, shoulderY + 2, -1.3 - typeA, 20);
        break;
      case "phone":
        arm(w / 2 - 4, shoulderY, -2.2, 20);
        break;
      case "phoneUp":
        arm(w / 2 - 4, shoulderY, Math.PI + 0.5, 24);
        break;
      case "sip":
        arm(w / 2 - 4, shoulderY, -2.9, 18);
        break;
      case "scratch":
        arm(w / 2 - 4, shoulderY, Math.PI - 0.5 + Math.sin(this.t * 14) * 0.08, 24);
        break;
      case "stretch":
        arm(w / 2 - 6, shoulderY, Math.PI - 0.15, 26);
        arm(-w / 2 + 6, shoulderY, Math.PI + 0.15, 26);
        break;
      case "wave":
        arm(w / 2 - 4, shoulderY, Math.PI - 0.3 + Math.sin(this.t * 12) * 0.25, 24);
        break;
      case "carry":
        arm(w / 2 - 4, shoulderY, -1.6, 22);
        break;
      case "slump":
        arm(w / 2 - 4, shoulderY, 0.3, 24);
        break;
      default:
        if (this.kind === "founder") arm(w / 2 - 4, shoulderY, Math.PI - 0.9, 20);
        else if (this.kind === "sen") arm(w / 2 - 4, shoulderY, -1.9, 20);
        else if (this.held) arm(w / 2 - 6, shoulderY + 2, -1.15 + (this.anim === "walk" ? Math.sin(this.walkPhase) * 0.12 : 0), 20);
    }
    // outfit details
    if (this.lanyard && this.kind === "you") {
      shapes.push(P([[-6, bodyTop + 2], [-2, bodyTop + 26]], st(null, C.sun, 2.5), false));
      shapes.push(P([[6, bodyTop + 2], [2, bodyTop + 26]], st(null, C.sun, 2.5), false));
      shapes.push(R(-6, bodyTop + 24, 12, 14, 2, st(C.paper, C.ink, 1.5)));
    }
    if (this.bag) {
      shapes.push(P([[-w / 2 + 6, bodyTop + 4], [w / 2 - 4, bodyTop + 40]], st(null, C.ink, 2.5), false));
      shapes.push(R(-w / 2 - 10, bodyTop + 36, 22, 16, 3, st(C.muted, C.ink)));
    }
    if (this.kind === "sen") shapes.push(R(w / 2 + 4, shoulderY + 12, 12, 14, 3, st(C.paper, C.ink, 2)));
    if (this.kind === "zoya") {
      shapes.push(P([[-w / 2 + 2, bodyTop + 4], [-w / 2 + 2, bodyTop + 44]], st(null, C.ink, 2), false));
      shapes.push(P([[w / 2 - 2, bodyTop + 4], [w / 2 - 2, bodyTop + 44]], st(null, C.ink, 2), false));
    }
    if (this.kind === "manager") shapes.push(P([[-8, bodyTop], [12, bodyTop + 46]], st(null, C.coral, 2.5), false));
    if (this.kind === "chaiwala") shapes.push(P([[-w / 2, bodyTop + 30], [w / 2, bodyTop + 30]], st(null, C.ink, 2), false));

    // head
    const headCy = bodyTop - 14 + hunch * 8;
    const headCx = hunch * 10;
    const tilt = this.speaking ? Math.sin(this.t * 6) * 0.05 : 0;
    if (this.kind === "zoya") shapes.push(O(headCx - 20, headCy + 2, 9, st(C.ink, C.ink)));
    shapes.push(O(headCx, headCy, 20, st(look.skin, C.ink)));
    // hair caps
    const cap = (pts: Pt[], fill = C.ink) => shapes.push(P(pts, st(fill, C.ink)));
    const hairArc = (from: number, to: number, r: number, cx: number, cy: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 10; i++) {
        const a = from + ((to - from) * i) / 10;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      return pts;
    };
    if (this.kind === "you") cap([...hairArc(Math.PI * 1.05, Math.PI * 1.95, 20, headCx, headCy), [headCx + 6, headCy - 11], [headCx - 4, headCy - 9]]);
    else if (this.kind === "sen") {
      cap(hairArc(Math.PI * 1.08, Math.PI * 1.92, 20, headCx, headCy));
      shapes.push(P([[headCx - 4, headCy - 19], [headCx + 2, headCy - 9]], st(null, C.surface, 2.5), false));
    } else if (this.kind === "zoya") cap([...hairArc(Math.PI * 1.02, Math.PI * 1.98, 20, headCx, headCy), [headCx + 10, headCy - 8], [headCx - 14, headCy - 6]]);
    else if (this.kind === "founder") cap(hairArc(Math.PI * 1.1, Math.PI * 1.9, 20, headCx, headCy));
    else if (this.kind === "manager") cap([...hairArc(Math.PI * 1.0, Math.PI * 2.0, 20, headCx, headCy), [headCx + 14, headCy + 6], [headCx - 18, headCy + 8]]);
    else if (this.kind === "walker") cap(hairArc(Math.PI * 1.15, Math.PI * 1.85, 20, headCx, headCy));
    // face
    const eyeH = this.blink > 0 ? 1.5 : this.mood === "tired" ? 3 : this.mood === "surprised" ? 11 : 9;
    const ex = headCx + 4;
    const eyeY = headCy - 2 - (this.mood === "worried" ? 1 : 0);
    shapes.push(R(ex - 9, eyeY - eyeH / 2, 5, eyeH, 2, st(C.ink, null)));
    shapes.push(R(ex + 5, eyeY - eyeH / 2, 5, eyeH, 2, st(C.ink, null)));
    if (this.mood === "worried") {
      shapes.push(P([[ex - 11, eyeY - 9], [ex - 4, eyeY - 7]], st(null, C.ink, 2), false));
      shapes.push(P([[ex + 11, eyeY - 9], [ex + 4, eyeY - 7]], st(null, C.ink, 2), false));
    }
    if (this.kind === "chintu") {
      shapes.push(O(ex - 6.5, eyeY, 7, st(null, C.ink, 2)));
      shapes.push(O(ex + 7.5, eyeY, 7, st(null, C.ink, 2)));
    }
    if (this.kind === "chaiwala") shapes.push(P([[ex - 6, eyeY + 9], [ex + 8, eyeY + 9]], st(null, C.ink, 3), false));
    if (this.kind === "zoya") {
      // headphones around the neck
      shapes.push(P(hairArc(0.2, Math.PI - 0.2, 16, headCx, headCy + 14), st(null, C.ink, 3), false));
    }
    const my = headCy + 10;
    const talking = this.speaking && Math.floor(this.t * 6) % 2 === 0;
    let mouth: Pt[];
    if (talking) mouth = ellipse(ex + 1, my + 1, 3.5, 2.5);
    else
      switch (this.mood) {
        case "happy":
        case "proud":
          mouth = [[ex - 6, my - 1], [ex - 2, my + 3], [ex + 3, my + 3], [ex + 7, my - 1]];
          break;
        case "worried":
          mouth = [[ex - 6, my + 2], [ex - 2, my - 1], [ex + 2, my + 2], [ex + 6, my]];
          break;
        case "tired":
          mouth = [[ex - 6, my + 2], [ex + 6, my + 2]];
          break;
        case "surprised":
          mouth = ellipse(ex + 1, my + 1, 3, 4);
          break;
        default:
          mouth = [[ex - 5, my], [ex + 5, my]];
      }
    shapes.push(P(mouth, st(talking || this.mood === "surprised" ? C.ink : null, C.ink, 2.5), talking || this.mood === "surprised"));
    if (this.mood === "proud") shapes.push(P([[ex - 12, eyeY - 8], [ex - 4, eyeY - 8]], st(null, C.ink, 2), false));

    // held things sit in the hand at the end of the arm
    const hp: Pt = hand ?? [w / 2 + 10, shoulderY + 14];
    const [hx, hy] = hp;
    const item = this.anim === "phone" || this.anim === "phoneUp" ? "phone" : this.anim === "sip" ? "chai" : this.held;
    if (item === "phone") {
      shapes.push(R(hx - 4.5, hy - 8, 9, 16, 2, st(C.ink, C.ink)));
      shapes.push(R(hx - 3, hy - 6, 6, 11, 1, st(C.sky, null)));
    } else if (item === "chai") {
      shapes.push(R(hx - 5, hy - 9, 10, 14, 2, st(C.paper, C.ink, 2)));
      shapes.push(R(hx - 4, hy - 3, 8, 7, 1, st(C.sun, null)));
    } else if (item === "label") shapes.push(R(hx - 4, hy - 8, 20, 12, 2, st(C.sun, C.ink, 2)));
    else if (item === "card") shapes.push(R(hx - 4, hy - 10, 16, 20, 2, st(C.paper, C.ink, 2)));

    ctx.save();
    ctx.rotate(tilt);
    drawShapes(ctx, shapes);
    ctx.restore();
    ctx.restore();
    ctx.restore();
    void j;
    void LINE;
  }
}

function ellipse(cx: number, cy: number, rx: number, ry: number): Pt[] {
  const pts: Pt[] = [];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/* Tab: a lilac rounded caret with a two-dot face. Not humanoid.        */
/* ------------------------------------------------------------------ */

export type TabMood = "eager" | "neutral" | "sad" | "think" | "proud";

export class Tab {
  x: number;
  y: number;
  size = 32;
  mood: TabMood = "neutral";
  squash = 0;
  shake = 0;
  glowAmt = 0;
  /** Blind-accept trust makes Tab bigger and glitchy; calibration makes the glow steady. */
  glitch = 0;
  hide = 0;
  speaking = false;
  visible = true;
  holding: null | "pen" | "map" = null;
  private t = 0;
  private blink = 0;
  private blinkAt = 3;
  targetX: number;
  targetY: number;

  constructor(x: number, y: number, size = 32) {
    this.x = this.targetX = x;
    this.y = this.targetY = y;
    this.size = size;
  }

  headTop(): [number, number] {
    return [this.x, this.y - this.size * 0.6 - 6];
  }

  react(kind: "accept" | "reject" | "inspect" | "proud") {
    if (kind === "accept") this.squash = 1;
    if (kind === "reject") this.shake = 1;
    if (kind === "inspect") this.glowAmt = 1;
    if (kind === "proud") this.squash = 0.6;
  }

  update(dt: number) {
    this.t += dt;
    this.squash = Math.max(0, this.squash - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.glowAmt = Math.max(0, this.glowAmt - dt * 0.8);
    this.x = lerp(this.x, this.targetX, damp(0.08, dt));
    this.y = lerp(this.y, this.targetY, damp(0.08, dt));
    this.blinkAt -= dt;
    if (this.blinkAt <= 0) {
      this.blink = 0.1;
      this.blinkAt = 2.5 + Math.random() * 3;
    }
    if (this.blink > 0) this.blink -= dt;
  }

  draw(ctx: CanvasRenderingContext2D, time: number, boil: boolean, reduced = false) {
    if (!this.visible || this.hide >= 1) return;
    const s = this.size * (1 + this.glitch * 0.25) * (1 - this.hide);
    const bob = reduced ? 0 : Math.sin((this.t / 1.6) * Math.PI * 2) * 2;
    const shakeX = this.shake > 0 && !reduced ? Math.sin(this.t * 60) * 3 * this.shake : 0;
    const sq = this.squash > 0 ? Math.sin(this.squash * Math.PI) * 0.22 : 0;
    const rng = new Rng(4242 + (boil ? Math.floor(time * 4) * 31 : 0));
    const w = s * 0.62;
    const h = s;
    const r = s * 0.22;
    ctx.save();
    ctx.translate(this.x + shakeX, this.y + bob);
    if (this.glowAmt > 0 || this.glitch < 0.2) glow(ctx, 0, -h / 2, s * 1.4, C.lilac, 0.12 + this.glowAmt * 0.2);
    ctx.scale(1 + sq, 1 - sq);
    const shapes = [];
    const body = roundRectPts(-w / 2, -h, w, h, r);
    shapes.push({ p: wobble(rng, body, true), fill: C.lilac, stroke: C.ink });
    // screen (upper part)
    shapes.push({ p: wobble(rng, roundRectPts(-w / 2 + 4, -h + 4, w - 8, h * 0.5, r * 0.6), true), fill: C.lilacDark, stroke: null });
    // eyes
    const eyeY = -h + 4 + h * 0.22;
    const eh = this.blink > 0 ? 1 : this.mood === "eager" || this.mood === "proud" ? s * 0.11 : s * 0.08;
    const ew = s * 0.07;
    const look = this.mood === "think" ? -2 : this.mood === "sad" ? 0 : 1;
    for (const side of [-1, 1]) {
      const ex = side * w * 0.18 + look;
      shapes.push({ p: wobble(rng, roundRectPts(ex - ew / 2, eyeY - eh / 2 + (this.mood === "sad" ? 2 : 0), ew, eh, ew / 2), true), fill: C.ink, stroke: null });
    }
    // tiny mouth
    const my = eyeY + s * 0.14;
    const talking = this.speaking && Math.floor(this.t * 8) % 2 === 0;
    const m: Pt[] =
      talking
        ? ellipse(0, my, s * 0.05, s * 0.04)
        : this.mood === "sad"
          ? [[-s * 0.06, my + 1], [0, my - 1], [s * 0.06, my + 1]]
          : this.mood === "eager" || this.mood === "proud"
            ? [[-s * 0.07, my - 1], [0, my + 2], [s * 0.07, my - 1]]
            : [[-s * 0.04, my], [s * 0.04, my]];
    shapes.push({ p: wobble(rng, m, talking), fill: talking ? C.ink : null, stroke: C.ink, lw: 1.5 });
    if (this.holding === "pen") shapes.push({ p: wobble(rng, [[w / 2 - 2, -h * 0.3], [w / 2 + s * 0.4, -h * 0.1]], false), stroke: C.ink, lw: 3 });
    drawShapes(ctx, shapes);
    // glitch: horizontal slice offsets + a coral flicker
    if (this.glitch > 0.05 && !reduced && Math.sin(time * 13) > 0.6) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-w, -h * 0.7, w * 2, h * 0.18);
      ctx.clip();
      ctx.translate(this.glitch * 4, 0);
      ctx.globalAlpha = 0.9;
      drawShapes(ctx, shapes.slice(0, 2));
      ctx.restore();
      ctx.strokeStyle = C.coral;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6 * this.glitch;
      ctx.stroke(shapes[0].p);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
