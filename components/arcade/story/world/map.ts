// The field-test phone and its map. Only widely known GPS behaviour:
// every reading is a circle, it drifts between tall buildings, freezes in an
// underpass, guesses wildly indoors, and goes quiet when the phone sits still.
import { glow, inkCircle, inkPoly, inkRect, label, type Pt } from "../engine/ink";
import { C } from "../engine/palette";
import { clamp, fmtClock, lerp, Rng } from "../engine/rng";
import { STREET } from "./scenes";

export type Seg = "A" | "B" | "C" | "D" | "E";
export type Stamp = "draw" | "keep" | "unknown";

export interface Fix {
  mx: number;
  my: number;
  acc: number;
  clock: number;
  seg: Seg;
}

export const SEGS: { id: Seg; name: string; hint: string; good: Stamp[] }[] = [
  { id: "A", name: "Office to the chai stall", hint: "small circles, steady", good: ["draw"] },
  { id: "B", name: "Between the tall buildings", hint: "big circles, wandering", good: ["keep"] },
  { id: "C", name: "Under the flyover", hint: "no readings at all", good: ["unknown"] },
  { id: "D", name: "Maggi basement", hint: "two wild guesses, then quiet", good: ["unknown", "keep"] },
  { id: "E", name: "Along the lake", hint: "small circles, steady", good: ["draw"] },
];

const ROUTE: Pt[] = [
  [0.06, 0.8],
  [0.36, 0.8],
  [0.56, 0.8],
  [0.66, 0.64],
  [0.94, 0.64],
];
const ZX = [0, STREET.canyon[0], STREET.under[0], STREET.under[1], STREET.width];
export const LAKE = { cx: 0.8, cy: 0.3, rx: 0.13, ry: 0.15 };
export const BASEMENT: Pt = [0.705, 0.7];

export function routePoint(wx: number): Pt {
  for (let i = 0; i < 4; i++) {
    if (wx <= ZX[i + 1] || i === 3) {
      const t = clamp((wx - ZX[i]) / (ZX[i + 1] - ZX[i]), 0, 1);
      return [lerp(ROUTE[i][0], ROUTE[i + 1][0], t), lerp(ROUTE[i][1], ROUTE[i + 1][1], t)];
    }
  }
  return ROUTE[4];
}

export function segOf(wx: number): Seg {
  return wx < STREET.canyon[0] ? "A" : wx < STREET.under[0] ? "B" : wx < STREET.under[1] ? "C" : "E";
}

export class Phone {
  fixes: Fix[] = [];
  /** Display dot (lerps toward the last fix so jumps read as jumps). */
  dot: Pt = [ROUTE[0][0], ROUTE[0][1]];
  dotAcc = 0.02;
  private timer = 0;
  private drift: Pt = [0, 0];
  private rng = new Rng(77);
  sinceFix = 0;
  quiet = false;
  frozen = false;
  snap = false;
  up = false;
  on = true;
  /** Inside a building: no sky, so no fixes of its own (the script adds the Wi-Fi guesses). */
  indoors = false;
  /** For the "jump" flash when a fix lands far from the dot. */
  jump = 0;

  last(): Fix | null {
    return this.fixes[this.fixes.length - 1] ?? null;
  }

  update(dt: number, wx: number, idle: number, clock: number) {
    if (!this.on) return;
    this.sinceFix += dt;
    this.jump = Math.max(0, this.jump - dt * 1.5);
    const seg = segOf(wx);
    this.quiet = idle > 4;
    this.frozen = seg === "C";
    const L = this.last();
    if (L) {
      this.dot[0] = lerp(this.dot[0], L.mx, Math.min(1, dt * 5));
      this.dot[1] = lerp(this.dot[1], L.my, Math.min(1, dt * 5));
      this.dotAcc = lerp(this.dotAcc, L.acc, Math.min(1, dt * 4));
    }
    if (this.quiet || this.frozen || this.indoors) return;
    this.timer += dt;
    if (this.timer < 0.9) return;
    this.timer = 0;
    const [rx, ry] = routePoint(wx);
    const n = () => (this.rng.next() * 2 - 1) * 0.004;
    let fx = rx + n();
    let fy = ry + n();
    let acc = 0.016 + this.rng.next() * 0.006;
    if (seg === "B") {
      this.drift[0] = clamp(this.drift[0] + (this.rng.next() * 2 - 1) * 0.012, -0.05, 0.05);
      this.drift[1] = clamp(this.drift[1] + (this.rng.next() * 2 - 1) * 0.02, -0.09, 0.07);
      const k = this.up ? 0.45 : 1;
      fx += this.drift[0] * k;
      fy += this.snap ? 0 : this.drift[1] * k;
      acc = (0.06 + this.rng.next() * 0.035) * (this.up ? 0.55 : 1);
    } else {
      this.drift = [this.drift[0] * 0.5, this.drift[1] * 0.5];
    }
    this.push({ mx: fx, my: fy, acc, clock, seg });
  }

  push(f: Fix) {
    const L = this.last();
    if (L && Math.hypot(f.mx - L.mx, f.my - L.my) > 0.06) this.jump = 1;
    this.fixes.push(f);
    this.sinceFix = 0;
  }

  /** Indoors: two Wi-Fi guesses that land in the lake, then the phone sleeps on the table. */
  basementGuess(i: number, clock: number) {
    const spots: Pt[] = [
      [LAKE.cx - 0.03, LAKE.cy + 0.04],
      [LAKE.cx + 0.05, LAKE.cy - 0.03],
    ];
    const p = spots[i % 2];
    this.push({ mx: p[0], my: p[1], acc: 0.12, clock, seg: "D" });
  }

  segFixes(s: Seg) {
    return this.fixes.filter((f) => f.seg === s);
  }
}

/* ------------------------------------------------------------------ */
/* Drawing                                                             */
/* ------------------------------------------------------------------ */

function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  inkRect(ctx, seed, x + 4, y + 4, w, h, 8, { fill: C.ink, stroke: null });
  inkRect(ctx, seed + 1, x, y, w, h, 8, { fill: C.paper, stroke: C.ink });
}

/** Base map: blocks, lake, flyover, road. (mx,my) in 0..1 → rect. */
function base(ctx: CanvasRenderingContext2D, X: (u: number) => number, Y: (v: number) => number, S: number) {
  const block = (u: number, v: number, w: number, h: number, fill: string, seed: number) =>
    inkRect(ctx, seed, X(u), Y(v), w * S, h * S, 2, { fill, stroke: C.ink, lw: 1.2 });
  // canyon blocks hug the road
  for (let i = 0; i < 4; i++) {
    block(0.37 + i * 0.048, 0.6, 0.04, 0.16, C.surface2, 300 + i);
    block(0.37 + i * 0.048, 0.84, 0.04, 0.12, C.surface2, 310 + i);
  }
  block(0.1, 0.62, 0.08, 0.12, C.surface2, 320);
  block(0.22, 0.6, 0.06, 0.14, C.surface2, 321);
  // lake
  const lake: Pt[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    lake.push([X(LAKE.cx + Math.cos(a) * LAKE.rx * (1 + 0.08 * Math.sin(a * 3))), Y(LAKE.cy + Math.sin(a) * LAKE.ry)]);
  }
  inkPoly(ctx, 330, lake, { fill: C.sky, stroke: C.ink, lw: 1.5 });
  // road
  const road = ROUTE.map(([u, v]): Pt => [X(u), Y(v)]);
  inkPoly(ctx, 331, road, { stroke: C.ink, lw: 0.06 * S + 2.5 }, false);
  inkPoly(ctx, 332, road, { stroke: C.surface, lw: 0.06 * S }, false);
  // flyover crossing the road
  inkRect(ctx, 333, X(0.585), Y(0.56), 0.035 * S, 0.34 * S, 1, { fill: C.muted, stroke: C.ink, lw: 1.2 });
  // basement marker
  inkRect(ctx, 334, X(BASEMENT[0]) - 0.02 * S, Y(BASEMENT[1]) - 0.01 * S, 0.04 * S, 0.035 * S, 1, { fill: C.sun, stroke: C.ink, lw: 1.2 });
}

function accCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, solid: boolean, alpha = 1, color: string = C.cobalt, fill = 0.16) {
  ctx.save();
  ctx.globalAlpha = fill * alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  if (!solid) ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.restore();
}

export function drawMiniMap(ctx: CanvasRenderingContext2D, phone: Phone, clock: number, x: number, y: number, w: number, h: number, t: number) {
  card(ctx, x, y, w, h, 400);
  label(ctx, "LIVE LOCATION · TEST", x + 8, y + 10, { size: 7, font: "display", weight: 800 });
  label(ctx, fmtClock(clock) + " pm", x + w - 8, y + 10, { size: 7, font: "mono", align: "right" });
  const mx = x + 6;
  const my = y + 18;
  const mw = w - 12;
  const mh = h - 24;
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  ctx.fillStyle = "#F7F5EF";
  ctx.fillRect(mx, my, mw, mh);
  const X = (u: number) => mx + u * mw;
  const Y = (v: number) => my + v * mh;
  base(ctx, X, Y, mw);
  // trail
  ctx.fillStyle = C.muted;
  const fx = phone.fixes;
  for (let i = Math.max(0, fx.length - 40); i < fx.length; i++) {
    ctx.globalAlpha = 0.3 + (0.5 * (i - fx.length + 40)) / 40;
    ctx.beginPath();
    ctx.arc(X(fx[i].mx), Y(fx[i].my), 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const dx = X(phone.dot[0]);
  const dy = Y(phone.dot[1]);
  const r = Math.max(4, phone.dotAcc * mw);
  accCircle(ctx, dx, dy, r, phone.dotAcc < 0.04, phone.frozen || phone.quiet ? 0.5 : 1);
  if (phone.jump > 0) glow(ctx, dx, dy, 24, C.coral, 0.3 * phone.jump);
  inkCircle(ctx, 401, dx, dy, 3.5, { fill: phone.frozen || phone.quiet ? C.paper : C.cobalt, stroke: C.ink, lw: 1.5 });
  ctx.restore();
  // status line
  let status = phone.dotAcc < 0.04 ? "small circle · trust it" : "big circle · drifting";
  if (phone.frozen) status = `frozen · last fix ${Math.floor(phone.sinceFix)}s ago`;
  else if (phone.quiet) status = "zz · quiet to save battery";
  else if (phone.snap && phone.dotAcc >= 0.04) status = "snapped to road";
  const blink = phone.frozen && Math.floor(t * 2) % 2 === 0;
  inkRect(ctx, 402, x + 6, y + h - 14, w - 12, 11, 3, { fill: phone.frozen || phone.quiet ? C.sun : C.surface, stroke: null });
  if (!blink) label(ctx, status, x + w / 2, y + h - 8.5, { size: 6.5, font: "mono", align: "center" });
}

export interface ReplayView {
  tabLine: number; // 0..1 drawn
  showTabLine: boolean;
  inspect: number; // 0..1 lens strength
  stamps: Partial<Record<Seg, Stamp>>;
  selected: Seg | null;
  stampFlash: number;
}

function catmull(ctx: CanvasRenderingContext2D, pts: Pt[], upto: number) {
  if (pts.length < 2) return;
  const total = (pts.length - 1) * upto;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1 && i < total; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const steps = 8;
    const lim = Math.min(1, total - i);
    for (let s = 1; s <= steps * lim; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      ctx.lineTo(x, y);
    }
  }
}

/** Thinned fixes Tab smooths through (every few readings, in order). */
export function tabPoints(phone: Phone): Fix[] {
  const out: Fix[] = [];
  phone.fixes.forEach((f, i) => {
    if (f.seg === "D" || i % 4 === 0 || i === phone.fixes.length - 1) out.push(f);
  });
  return out;
}

/** Returns the screen point at the tip of Tab's line (so Tab can ride it). */
export function drawReplay(ctx: CanvasRenderingContext2D, phone: Phone, v: ReplayView, x: number, y: number, w: number, h: number, t: number): Pt {
  card(ctx, x, y, w, h, 500);
  label(ctx, "FIELD TEST · REPLAY", x + 12, y + 14, { size: 9, font: "display", weight: 800 });
  const mx = x + 10;
  const my = y + 24;
  const mw = w - 20;
  const mh = h - 34;
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  ctx.fillStyle = "#F7F5EF";
  ctx.fillRect(mx, my, mw, mh);
  const X = (u: number) => mx + u * mw;
  const Y = (vv: number) => my + vv * mh;
  base(ctx, X, Y, mw);

  // selected segment highlight
  const segSpan: Record<Seg, [Pt, Pt]> = {
    A: [ROUTE[0], ROUTE[1]],
    B: [ROUTE[1], ROUTE[2]],
    C: [ROUTE[2], ROUTE[3]],
    D: [BASEMENT, [LAKE.cx, LAKE.cy]],
    E: [ROUTE[3], ROUTE[4]],
  };
  if (v.selected) {
    const [a, b] = segSpan[v.selected];
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.15 * Math.sin(t * 5);
    ctx.strokeStyle = C.sun;
    ctx.lineWidth = 0.09 * mw;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(X(a[0]), Y(a[1]));
    ctx.lineTo(X(b[0]), Y(b[1]));
    ctx.stroke();
    ctx.restore();
  }

  // readings: always faint dots; circles under the Inspect lens or once stamped
  phone.fixes.forEach((f, i) => {
    const stamped = v.stamps[f.seg];
    const lens = Math.max(v.inspect, stamped === "keep" || stamped === "draw" ? 0.6 : 0, v.selected === f.seg ? 0.5 : 0);
    // thin out the crowd so overlapping circles stay readable
    if (lens > 0 && (f.seg === "D" || i % 3 === 0)) accCircle(ctx, X(f.mx), Y(f.my), f.acc * mw, f.acc < 0.04, lens * 0.55, C.cobalt, 0.07);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(X(f.mx), Y(f.my), 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // honest map: per-segment stamps
  // neighbours in time order: the reading just before a stretch and just after it
  const ends = (s: Seg): [Pt, Pt] | null => {
    const fx = phone.fixes;
    let a = -1;
    let b = -1;
    if (s === "C") {
      a = fx.map((f) => f.seg).lastIndexOf("B");
      b = a >= 0 ? a + 1 : -1;
    } else {
      const first = fx.findIndex((f) => f.seg === s);
      const last = fx.map((f) => f.seg).lastIndexOf(s);
      if (first < 0) return null;
      a = first - 1;
      b = last + 1;
    }
    const prev = fx[a];
    const next = fx[b];
    if (!prev || !next) return null;
    return [
      [X(prev.mx), Y(prev.my)],
      [X(next.mx), Y(next.my)],
    ];
  };
  (Object.keys(v.stamps) as Seg[]).forEach((s) => {
    const st = v.stamps[s];
    const fx = phone.segFixes(s).map((f): Pt => [X(f.mx), Y(f.my)]);
    if (st === "draw") {
      const pts = fx.length >= 2 ? fx : ends(s) ?? [];
      if (s === "D" && pts.length && fx.length) {
        const e = ends(s);
        if (e) pts.unshift(e[0]), pts.push(e[1]);
      }
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    } else if (st === "unknown") {
      const e = ends(s);
      if (e) {
        ctx.save();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        ctx.moveTo(e[0][0], e[0][1]);
        ctx.lineTo(e[1][0], e[1][1]);
        ctx.stroke();
        ctx.restore();
        const cx = (e[0][0] + e[1][0]) / 2;
        const cy = (e[0][1] + e[1][1]) / 2 + (s === "D" ? 16 : -12);
        inkRect(ctx, 510, cx - 24, cy - 7, 48, 13, 2, { fill: C.sun, stroke: C.ink, lw: 1.5 });
        label(ctx, "unknown", cx, cy, { size: 7.5, font: "mono", align: "center", weight: 700 });
      }
    }
  });

  // under the lens: name what the phone could not know
  if (v.inspect > 0.05) {
    ctx.save();
    ctx.globalAlpha = v.inspect;
    const gap = ends("C");
    if (gap) {
      zigzag(ctx, gap[0], gap[1]);
      label(ctx, "no readings", (gap[0][0] + gap[1][0]) / 2, (gap[0][1] + gap[1][1]) / 2 - 16, { size: 8.5, font: "hand", weight: 700, align: "center", color: C.coralText });
    }
    label(ctx, "huge circles: a guess from indoors", X(LAKE.cx), Y(LAKE.cy - LAKE.ry - 0.05), { size: 8, font: "hand", weight: 700, align: "center", color: C.coralText });
    label(ctx, "then quiet: phone asleep on a table", X(BASEMENT[0]) + 8, Y(BASEMENT[1] + 0.16), { size: 8.5, font: "hand", weight: 700, align: "center", color: C.coralText });
    ctx.restore();
  }

  // Tab's smooth line (lilac with ink edge), drawn progressively
  let tip: Pt = [X(ROUTE[0][0]), Y(ROUTE[0][1])];
  if (v.showTabLine && v.tabLine > 0) {
    const pts = tabPoints(phone).map((f): Pt => [X(f.mx), Y(f.my)]);
    if (pts.length >= 2) {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      catmull(ctx, pts, v.tabLine);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = C.lilac;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      const i = Math.min(pts.length - 1, Math.floor((pts.length - 1) * v.tabLine));
      tip = pts[i];
      if (v.inspect > 0.05) {
        // cracks where the line crosses water with no reading under it
        ctx.globalAlpha = v.inspect;
        zigzag(ctx, [X(LAKE.cx - 0.08), Y(LAKE.cy + 0.08)], [X(LAKE.cx + 0.08), Y(LAKE.cy - 0.05)]);
        ctx.globalAlpha = 1;
      }
    }
  }
  if (v.stampFlash > 0) {
    ctx.globalAlpha = v.stampFlash * 0.5;
    ctx.fillStyle = C.sun;
    ctx.fillRect(mx, my, mw, mh);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  return tip;
}

function zigzag(ctx: CanvasRenderingContext2D, a: Pt, b: Pt) {
  const n = 9;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.save();
  ctx.strokeStyle = C.coral;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const o = (i % 2 ? 5 : -5) * (i === 0 || i === n ? 0 : 1);
    const px = a[0] + dx * t + nx * o;
    const py = a[1] + dy * t + ny * o;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/** Time span Tab claims you spent at the lake (first basement fix → first lakeside fix). */
export function lakeSpan(phone: Phone): [number, number] | null {
  const d = phone.segFixes("D");
  if (!d.length) return null;
  const lastD = d[d.length - 1].clock;
  const after = phone.fixes.find((f) => f.seg === "E" && f.clock > lastD);
  return [d[0].clock, after ? after.clock : lastD + 25];
}

/** Rebuild a plausible walk (used when a save has no readings). */
export function synthWalk(phone: Phone) {
  let clock = 16 * 60 + 2;
  for (let x = 110; x < STREET.stairsX; x += 64) {
    phone.update(1, x, 0, clock);
    clock += 0.5;
  }
  phone.basementGuess(0, clock + 10);
  phone.basementGuess(1, clock + 22);
  clock += 37;
  for (let x = STREET.stairsX; x < STREET.benchX; x += 64) {
    phone.update(1, x, 0, clock);
    clock += 0.5;
  }
}
