// Ink helpers: every path gets a seeded ±0.6 px point jitter so the line
// looks hand-drawn, stable per object. Sketches cache Path2D shapes.
import { C, LINE } from "./palette";
import { Rng } from "./rng";

export interface ShapeStyle {
  fill?: string | null;
  stroke?: string | null;
  lw?: number;
  alpha?: number;
  dash?: number[];
}

interface Shape extends ShapeStyle {
  p: Path2D;
}

export type Pt = [number, number];

const JIT = 0.6;
const STEP = 13;

export function roundRectPts(x: number, y: number, w: number, h: number, r = 0): Pt[] {
  r = Math.min(r, w / 2, h / 2);
  if (r <= 0.5)
    return [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ];
  const pts: Pt[] = [];
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    const n = Math.max(3, Math.ceil((r * Math.PI) / 2 / 6));
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  arc(x + w - r, y + r, -Math.PI / 2, 0);
  arc(x + w - r, y + h - r, 0, Math.PI / 2);
  arc(x + r, y + h - r, Math.PI / 2, Math.PI);
  arc(x + r, y + r, Math.PI, Math.PI * 1.5);
  return pts;
}

export function circlePts(cx: number, cy: number, r: number, n = 0): Pt[] {
  n = n || Math.max(10, Math.ceil(r * 0.9));
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** Build a wobbly Path2D from polyline points. */
export function wobble(rng: Rng, pts: Pt[], close: boolean, amp = JIT): Path2D {
  const p = new Path2D();
  const n = pts.length;
  const segs = close ? n : n - 1;
  const j = () => (rng.next() * 2 - 1) * amp;
  const first: Pt = [pts[0][0] + j(), pts[0][1] + j()];
  p.moveTo(first[0], first[1]);
  for (let s = 0; s < segs; s++) {
    const a = pts[s];
    const b = pts[(s + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.ceil(len / STEP));
    for (let i = 1; i <= k; i++) {
      const t = i / k;
      const last = close && s === segs - 1 && i === k;
      if (last) p.lineTo(first[0], first[1]);
      else p.lineTo(a[0] + (b[0] - a[0]) * t + j(), a[1] + (b[1] - a[1]) * t + j());
    }
  }
  if (close) p.closePath();
  return p;
}

export class Sketch {
  shapes: Shape[] = [];
  private rng: Rng;
  constructor(seed: number) {
    this.rng = new Rng(seed);
  }
  poly(pts: Pt[], st: ShapeStyle = {}, close = true) {
    this.shapes.push({ p: wobble(this.rng, pts, close), ...st });
    return this;
  }
  line(x1: number, y1: number, x2: number, y2: number, st: ShapeStyle = {}) {
    return this.poly(
      [
        [x1, y1],
        [x2, y2],
      ],
      { stroke: C.ink, ...st },
      false,
    );
  }
  path(pts: Pt[], st: ShapeStyle = {}) {
    return this.poly(pts, { stroke: C.ink, ...st }, false);
  }
  rect(x: number, y: number, w: number, h: number, r = 0, st: ShapeStyle = {}) {
    return this.poly(roundRectPts(x, y, w, h, r), st);
  }
  circle(cx: number, cy: number, r: number, st: ShapeStyle = {}) {
    return this.poly(circlePts(cx, cy, r), st);
  }
  /** Flat 10% ink shadow ellipse. */
  shadow(cx: number, cy: number, rx: number, ry = rx * 0.3) {
    const pts: Pt[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return this.poly(pts, { fill: C.shadow, stroke: null });
  }
  draw(ctx: CanvasRenderingContext2D, x = 0, y = 0) {
    if (x || y) {
      ctx.save();
      ctx.translate(x, y);
    }
    drawShapes(ctx, this.shapes);
    if (x || y) ctx.restore();
  }
}

export function drawShapes(ctx: CanvasRenderingContext2D, shapes: Shape[]) {
  for (const s of shapes) {
    if (s.alpha !== undefined) ctx.globalAlpha = s.alpha;
    if (s.fill) {
      ctx.fillStyle = s.fill;
      ctx.fill(s.p);
    }
    if (s.stroke !== null && (s.stroke || s.fill)) {
      ctx.strokeStyle = s.stroke ?? C.ink;
      ctx.lineWidth = s.lw ?? LINE;
      if (s.dash) ctx.setLineDash(s.dash);
      ctx.stroke(s.p);
      if (s.dash) ctx.setLineDash([]);
    }
    if (s.alpha !== undefined) ctx.globalAlpha = 1;
  }
}

/** Immediate-mode helpers for animated bits (re-jittered per call). */
export function inkPoly(ctx: CanvasRenderingContext2D, seed: number, pts: Pt[], st: ShapeStyle = {}, close = true) {
  drawShapes(ctx, [{ p: wobble(new Rng(seed), pts, close), ...st }]);
}
export function inkRect(ctx: CanvasRenderingContext2D, seed: number, x: number, y: number, w: number, h: number, r = 0, st: ShapeStyle = {}) {
  inkPoly(ctx, seed, roundRectPts(x, y, w, h, r), st);
}
export function inkCircle(ctx: CanvasRenderingContext2D, seed: number, cx: number, cy: number, r: number, st: ShapeStyle = {}) {
  inkPoly(ctx, seed, circlePts(cx, cy, r), st);
}

/** Radial glow, 25% opacity cap: only lamps and windows use this. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 0.25) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

let fontCache: { sans: string; mono: string; display: string; hand: string } | null = null;
export function fonts() {
  if (fontCache) return fontCache;
  const fb = '"Satoshi", ui-sans-serif, system-ui, sans-serif';
  if (typeof document === "undefined") return { sans: fb, mono: "ui-monospace, monospace", display: fb, hand: "cursive" };
  const s = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f;
  fontCache = {
    sans: v("--font-sans", fb),
    mono: v("--font-mono", "ui-monospace, Menlo, monospace"),
    display: v("--font-display", fb),
    hand: v("--font-hand", "cursive"),
  };
  return fontCache;
}

export function label(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  o: { size?: number; font?: "sans" | "mono" | "display" | "hand"; color?: string; align?: CanvasTextAlign; weight?: number | string; alpha?: number } = {},
) {
  ctx.save();
  ctx.font = `${o.weight ?? 500} ${o.size ?? 11}px ${fonts()[o.font ?? "sans"]}`;
  ctx.fillStyle = o.color ?? C.ink;
  ctx.textAlign = o.align ?? "left";
  ctx.textBaseline = "middle";
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.fillText(str, x, y);
  ctx.restore();
}
