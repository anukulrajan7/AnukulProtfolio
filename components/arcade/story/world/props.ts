// Shape-data props. Each builds its ink Sketch once; live parts draw per frame.
import { Sketch, glow, inkCircle, inkPoly, inkRect, label, type Pt } from "../engine/ink";
import { C } from "../engine/palette";
import { hash, lerp } from "../engine/rng";
import type { Env, Prop } from "./types";

type Live = (ctx: CanvasRenderingContext2D, env: Env) => void;

let seedN = 1;
/** Room floor line for feet (matches scenes.ROOM_FEET). */
const FEET = 318;
export function prop(x: number, y: number, w: number, h: number, build: (s: Sketch) => void, live?: Live, sort?: number): Prop {
  const s = new Sketch(hash(`${x},${y},${w},${h},${seedN++}`));
  build(s);
  return {
    x,
    y,
    w,
    h,
    sort: sort ?? y,
    draw: (ctx, env) => {
      s.draw(ctx);
      live?.(ctx, env);
    },
  };
}

/* ---------------- room furniture ---------------- */

export const desk = (x: number, y: number, w: number) =>
  prop(
    x,
    y,
    w,
    80,
    (s) => {
      const lh = FEET - y - 10;
      s.rect(x + 8, y + 10, 10, lh, 2, { fill: C.muted, stroke: C.ink });
      s.rect(x + w - 18, y + 10, 10, lh, 2, { fill: C.muted, stroke: C.ink });
      s.rect(x + w - 70, y + 10, 52, lh, 3, { fill: C.surface2, stroke: C.ink });
      s.line(x + w - 70, y + 10 + lh / 3, x + w - 18, y + 10 + lh / 3);
      s.line(x + w - 70, y + 10 + (2 * lh) / 3, x + w - 18, y + 10 + (2 * lh) / 3);
      s.rect(x, y, w, 10, 3, { fill: C.surface, stroke: C.ink });
    },
    undefined,
    FEET - 2,
  );

export const chair = (x: number, y: number) =>
  prop(
    x,
    y,
    40,
    90,
    (s) => {
      s.rect(x - 2, y - 66, 10, 54, 4, { fill: C.muted, stroke: C.ink });
      s.rect(x - 4, y - 14, 44, 10, 4, { fill: C.muted, stroke: C.ink });
      s.rect(x + 2, y - 4, 7, FEET - y + 4, 2, { fill: C.muted, stroke: C.ink });
      s.rect(x + 28, y - 4, 7, FEET - y + 4, 2, { fill: C.muted, stroke: C.ink });
    },
    undefined,
    y - 120,
  );

export const laptop = (x: number, y: number, w: number, screen?: Live) => {
  const h = w * 0.62;
  return prop(
    x,
    y - h,
    w,
    h + 8,
    (s) => {
      s.rect(x, y - h, w, h, 5, { fill: C.surface, stroke: C.ink });
      s.rect(x + 5, y - h + 5, w - 10, h - 10, 2, { fill: C.paper, stroke: null });
      s.rect(x - 8, y - 2, w + 16, 7, 3, { fill: C.muted, stroke: C.ink });
      s.circle(x + w / 2, y - h / 2, 4, { fill: C.surface2, stroke: null });
    },
    (ctx, env) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 5, y - h + 5, w - 10, h - 10);
      ctx.clip();
      screen?.(ctx, env);
      ctx.restore();
    },
    y + 4,
  );
};

export const monitor = (x: number, y: number, w: number, screen?: Live) => {
  const h = w * 0.58;
  return prop(
    x,
    y - h - 20,
    w,
    h + 20,
    (s) => {
      s.rect(x + w / 2 - 16, y - 8, 32, 6, 2, { fill: C.ink, stroke: C.ink });
      s.rect(x + w / 2 - 5, y - 22, 10, 16, 2, { fill: C.muted, stroke: C.ink });
      s.rect(x, y - h - 20, w, h, 5, { fill: C.ink, stroke: C.ink });
      s.rect(x + 5, y - h - 15, w - 10, h - 10, 2, { fill: C.paper, stroke: null });
    },
    (ctx, env) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 5, y - h - 15, w - 10, h - 10);
      ctx.clip();
      screen?.(ctx, env);
      ctx.restore();
    },
    y,
  );
};

export const lamp = (x: number, y: number, dir = -1) =>
  prop(
    x,
    y - 60,
    40,
    60,
    (s) => {
      s.rect(x - 10, y - 5, 20, 5, 2, { fill: C.ink, stroke: C.ink });
      s.path(
        [
          [x, y - 5],
          [x + dir * 6, y - 40],
          [x + dir * 26, y - 48],
        ],
        { lw: 3 },
      );
      s.poly(
        [
          [x + dir * 18, y - 56],
          [x + dir * 40, y - 46],
          [x + dir * 30, y - 34],
          [x + dir * 12, y - 42],
        ],
        { fill: C.muted, stroke: C.ink },
      );
    },
    undefined,
    y,
  );

/** Flat lamp cone + radial glow, drawn under the furniture. */
export const lampPool = (x: number, y: number, dir = -1): Prop => ({
  x: x - 80,
  y: y - 60,
  w: 160,
  h: 120,
  sort: y - 200,
  draw: (ctx, env) => {
    const base = env.light ? 0.22 : 0.42;
    ctx.save();
    ctx.globalAlpha = base;
    ctx.fillStyle = C.sun;
    ctx.beginPath();
    ctx.moveTo(x + dir * 28, y - 44);
    ctx.lineTo(x + dir * 150, y + 24);
    ctx.lineTo(x - dir * 40, y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    glow(ctx, x + dir * 30, y - 40, 90, C.sun, env.light ? 0.2 : 0.3);
  },
});

export const books = (x: number, y: number) =>
  prop(
    x,
    y - 26,
    50,
    26,
    (s) => {
      s.rect(x, y - 8, 48, 8, 1, { fill: C.cobalt, stroke: C.ink });
      s.rect(x + 4, y - 16, 44, 8, 1, { fill: C.paper, stroke: C.ink });
      s.rect(x + 2, y - 24, 40, 8, 1, { fill: C.coral, stroke: C.ink });
    },
    undefined,
    y,
  );

export const chaiGlass = (x: number, y: number, steam = false) =>
  prop(
    x,
    y - 20,
    14,
    20,
    (s) => {
      s.rect(x, y - 18, 14, 18, 2, { fill: C.paper, stroke: C.ink, lw: 2 });
      s.rect(x + 2, y - 10, 10, 8, 1, { fill: C.sun, stroke: null });
    },
    steam
      ? (ctx, env) => {
          ctx.save();
          ctx.globalAlpha = 0.5;
          const o = (env.t * 10) % 8;
          inkPoly(ctx, 9, [[x + 4, y - 22 - o], [x + 7, y - 28 - o], [x + 4, y - 34 - o]], { stroke: C.muted, lw: 1.5 }, false);
          ctx.restore();
        }
      : undefined,
    y,
  );

export const phoneProp = (x: number, y: number) =>
  prop(x, y - 14, 10, 14, (s) => {
    s.rect(x, y - 14, 9, 14, 2, { fill: C.ink, stroke: C.ink });
    s.rect(x + 1.5, y - 12.5, 6, 11, 1, { fill: C.sky, stroke: null });
  }, undefined, y);

export const windowNight = (x: number, y: number, w: number, h: number, mode: "night" | "evening" = "night") =>
  prop(
    x,
    y,
    w,
    h,
    (s) => {
      s.rect(x - 4, y - 4, w + 8, h + 8, 3, { fill: C.surface2, stroke: C.ink });
    },
    (ctx, env) => {
      const sky = mode === "night" ? C.card : lerpColor("#FFE2B0", C.card, env.evening);
      inkRect(ctx, 17, x, y, w, h, 2, { fill: sky, stroke: C.ink });
      if (mode === "night") {
        ctx.fillStyle = C.paper;
        for (let i = 0; i < 5; i++) ctx.fillRect(x + 8 + ((i * 37) % (w - 14)), y + 10 + ((i * 23) % (h - 20)), 1.5, 1.5);
        inkCircle(ctx, 3, x + w - 16, y + 16, 6, { fill: C.sun, stroke: C.ink, lw: 1.5 });
      }
      inkPoly(ctx, 4, [[x + w / 2, y], [x + w / 2, y + h]], { stroke: C.ink }, false);
      inkPoly(ctx, 5, [[x, y + h / 2], [x + w, y + h / 2]], { stroke: C.ink }, false);
      glow(ctx, x + w / 2, y + h / 2, w, mode === "night" ? C.sky : C.sun, 0.12);
    },
    y - 1000,
  );

export const tubeLight = (x: number, y: number, w: number) =>
  prop(
    x,
    y,
    w,
    10,
    (s) => {
      s.rect(x - 6, y - 2, w + 12, 12, 4, { fill: C.surface2, stroke: C.ink });
    },
    (ctx, env) => {
      inkRect(ctx, 21, x, y, w, 8, 4, { fill: env.light ? C.paper : C.surface2, stroke: C.ink, lw: 2 });
      if (env.light) glow(ctx, x + w / 2, y + 4, w * 0.9, C.paper, 0.4);
    },
    y - 1000,
  );

export const fan = (x: number, y: number): Prop => ({
  x: x - 70,
  y: y - 20,
  w: 140,
  h: 40,
  sort: y - 1000,
  draw: (ctx, env) => {
    inkRect(ctx, 31, x - 2, y - 24, 4, 20, 1, { fill: C.ink, stroke: C.ink });
    const a = env.reduced ? 0.4 : env.t * 9;
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 3; i++) {
      const ang = a + (i * Math.PI * 2) / 3;
      const sx = Math.cos(ang) * 60;
      const sy = Math.sin(ang) * 10;
      inkPoly(ctx, 40 + i, [[0, 0], [sx * 0.3, sy * 0.3 - 5], [sx, sy - 3], [sx, sy + 3], [sx * 0.3, sy * 0.3 + 5]], { fill: C.muted, stroke: C.ink, lw: 2 });
    }
    inkCircle(ctx, 33, 0, 0, 9, { fill: C.ink, stroke: C.ink });
    ctx.restore();
  },
});

export const shelf = (x: number, y: number) =>
  prop(
    x,
    y - 140,
    70,
    140,
    (s) => {
      s.rect(x, y - 140, 70, 140, 3, { fill: C.surface2, stroke: C.ink });
      for (let i = 1; i < 4; i++) s.line(x, y - 140 + i * 35, x + 70, y - 140 + i * 35);
      const cols = [C.cobalt, C.sun, C.paper, C.coral, C.mint, C.lilac, C.paper, C.cobalt];
      for (let r = 0; r < 3; r++)
        for (let i = 0; i < 4; i++) s.rect(x + 6 + i * 15, y - 140 + r * 35 + 8 + (i % 2) * 3, 11, 24 - (i % 2) * 3, 1, { fill: cols[(r * 4 + i) % cols.length], stroke: C.ink, lw: 2 });
      s.rect(x + 8, y - 30, 54, 24, 3, { fill: C.sky, stroke: C.ink });
    },
    undefined,
    y - 100,
  );

export const plant = (x: number, y: number, k = 1) =>
  prop(
    x - 20 * k,
    y - 70 * k,
    40 * k,
    70 * k,
    (s) => {
      s.rect(x - 14 * k, y - 22 * k, 28 * k, 22 * k, 4 * k, { fill: C.coral, stroke: C.ink });
      for (let i = -2; i <= 2; i++) {
        s.poly([[x, y - 20 * k], [x + i * 10 * k - 6 * k, y - 52 * k - Math.abs(i) * 4 * k], [x + i * 12 * k, y - 66 * k + Math.abs(i) * 8 * k], [x + i * 10 * k + 6 * k, y - 48 * k]], { fill: C.mint, stroke: C.ink });
      }
    },
    undefined,
    y,
  );

export const switchPlate = (x: number, y: number) => ({
  x,
  y,
  w: 14,
  h: 20,
  sort: y - 1000,
  draw: (ctx: CanvasRenderingContext2D, env: Env) => {
    inkRect(ctx, 51, x, y, 14, 20, 2, { fill: C.paper, stroke: C.ink, lw: 2 });
    inkRect(ctx, 52, x + 4, env.light ? y + 4 : y + 10, 6, 6, 1, { fill: env.light ? C.sun : C.muted, stroke: C.ink, lw: 1.5 });
  },
});

export const wallBoard = (x: number, y: number, w: number, h: number) =>
  prop(x, y, w, h, (s) => {
    s.rect(x, y, w, h, 4, { fill: C.paper, stroke: C.ink });
    s.line(x + w / 3, y, x + w / 3, y + h);
    s.line(x + (2 * w) / 3, y, x + (2 * w) / 3, y + h);
    const cols = [C.sun, C.paper, C.coral, C.mint, C.paper, C.lilac, C.sun, C.paper];
    for (let i = 0; i < 9; i++) {
      const cx = x + 8 + (i % 3) * (w / 3) + ((i * 7) % 9);
      const cy = y + 10 + Math.floor(i / 3) * ((h - 16) / 3) + ((i * 5) % 7);
      s.rect(cx, cy, w / 3 - 22, 14, 2, { fill: cols[i % cols.length], stroke: C.ink, lw: 1.5 });
    }
  }, undefined, y - 1000);

export const poster = (x: number, y: number, lines: string[], color: string = C.sun) =>
  prop(
    x,
    y,
    46,
    30,
    (s) => {
      s.rect(x, y, 46, 30, 1, { fill: color, stroke: C.ink, lw: 2 });
    },
    (ctx) => {
      lines.forEach((l, i) => label(ctx, l, x + 23, y + 9 + i * 10, { size: 7, font: "hand", align: "center", weight: 700 }));
    },
    y - 1000,
  );

/* ---------------- street ---------------- */

export function lerpColor(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(lerp((pa >> sh) & 255, (pb >> sh) & 255, t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export const building = (x: number, base: number, w: number, h: number, fill: string, cols: number, rows: number, winFill = C.paper, roof = true) => {
  const day = new Sketch(hash(`bd${x}${base}`));
  const night = new Sketch(hash(`bd${x}${base}`));
  const cw = (w - 16) / cols;
  const rh = (h - 20) / rows;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const lit = (r * 7 + c * 3 + Math.round(x)) % 5 !== 0;
      const args = [x + 8 + c * cw + cw * 0.2, base - h + 12 + r * rh, cw * 0.6, rh * 0.55, 1] as const;
      day.rect(...args, { fill: winFill, stroke: C.ink, lw: 1.5 });
      night.rect(...args, { fill: lit ? C.sun : winFill, stroke: C.ink, lw: 1.5 });
    }
  return prop(
    x,
    base - h - 12,
    w,
    h + 12,
    (s) => {
      s.rect(x, base - h, w, h, 2, { fill, stroke: C.ink });
      if (roof) s.rect(x + w * 0.3, base - h - 12, w * 0.2, 12, 1, { fill, stroke: C.ink });
    },
    (ctx, env) => (env.evening > 0.6 ? night : day).draw(ctx),
    base,
  );
};

export const skyline = (x: number, base: number, w: number) =>
  prop(x, base - 120, w, 120, (s) => {
    let cx = x;
    let i = 0;
    while (cx < x + w) {
      const bw = 40 + ((i * 37) % 50);
      const bh = 40 + ((i * 53) % 80);
      s.rect(cx, base - bh, bw, bh, 1, { fill: C.surface2, stroke: C.muted, lw: 1.5 });
      cx += bw + 6;
      i++;
    }
  }, undefined, base);

export const tree = (x: number, y: number, k = 1) =>
  prop(
    x - 30 * k,
    y - 90 * k,
    60 * k,
    90 * k,
    (s) => {
      s.rect(x - 5 * k, y - 40 * k, 10 * k, 40 * k, 3 * k, { fill: C.muted, stroke: C.ink });
      s.circle(x, y - 62 * k, 26 * k, { fill: C.mint, stroke: C.ink });
      s.circle(x - 18 * k, y - 48 * k, 16 * k, { fill: C.mint, stroke: C.ink });
      s.circle(x + 18 * k, y - 50 * k, 18 * k, { fill: C.mint, stroke: C.ink });
      s.shadow(x, y + 2, 26 * k);
    },
    undefined,
    y,
  );

export const lamppost = (x: number, y: number) =>
  prop(
    x - 10,
    y - 130,
    30,
    130,
    (s) => {
      s.rect(x - 3, y - 120, 6, 120, 2, { fill: C.muted, stroke: C.ink });
      s.rect(x - 10, y - 4, 20, 6, 2, { fill: C.muted, stroke: C.ink });
      s.path([[x, y - 120], [x + 14, y - 128]], { lw: 3 });
      s.rect(x + 8, y - 136, 16, 10, 3, { fill: C.surface2, stroke: C.ink });
    },
    (ctx, env) => {
      if (env.evening > 0.6) {
        inkRect(ctx, x, x + 10, y - 134, 12, 6, 2, { fill: C.sun, stroke: null });
        glow(ctx, x + 16, y - 120, 70, C.sun, 0.22);
      }
    },
    y,
  );

export const autoRickshaw = (x: number, y: number) =>
  prop(
    x,
    y - 60,
    90,
    60,
    (s) => {
      s.shadow(x + 45, y + 2, 44, 6);
      s.poly([[x, y - 10], [x + 6, y - 44], [x + 20, y - 56], [x + 80, y - 56], [x + 90, y - 10]], { fill: C.sun, stroke: C.ink });
      s.rect(x + 8, y - 48, 38, 24, 3, { fill: C.sky, stroke: C.ink });
      s.rect(x + 52, y - 48, 30, 30, 3, { fill: C.ink, stroke: C.ink });
      s.rect(x, y - 24, 90, 14, 3, { fill: C.mint, stroke: C.ink });
      s.circle(x + 18, y - 6, 9, { fill: C.ink, stroke: C.ink });
      s.circle(x + 74, y - 6, 9, { fill: C.ink, stroke: C.ink });
      s.circle(x + 18, y - 6, 3, { fill: C.paper, stroke: null });
      s.circle(x + 74, y - 6, 3, { fill: C.paper, stroke: null });
    },
    undefined,
    y,
  );

export const chaiStall = (x: number, y: number) =>
  prop(
    x,
    y - 130,
    100,
    130,
    (s) => {
      s.rect(x + 6, y - 104, 6, 104, 2, { fill: C.muted, stroke: C.ink });
      s.rect(x + 88, y - 104, 6, 104, 2, { fill: C.muted, stroke: C.ink });
      s.poly([[x - 8, y - 104], [x + 108, y - 104], [x + 98, y - 128], [x + 2, y - 128]], { fill: C.coral, stroke: C.ink });
      for (let i = 0; i < 5; i++) s.poly([[x - 4 + i * 23, y - 104], [x + 19 + i * 23, y - 104], [x + 7.5 + i * 23, y - 93]], { fill: i % 2 ? C.paper : C.coral, stroke: C.ink, lw: 2 });
      s.rect(x, y - 40, 100, 40, 3, { fill: C.sky, stroke: C.ink });
      s.rect(x + 10, y - 54, 30, 14, 3, { fill: C.muted, stroke: C.ink });
      s.rect(x + 50, y - 50, 10, 10, 1, { fill: C.paper, stroke: C.ink, lw: 2 });
      s.rect(x + 64, y - 50, 10, 10, 1, { fill: C.paper, stroke: C.ink, lw: 2 });
      s.rect(x + 78, y - 50, 10, 10, 1, { fill: C.paper, stroke: C.ink, lw: 2 });
    },
    (ctx, env) => {
      const o = env.reduced ? 0 : (env.t * 12) % 10;
      ctx.globalAlpha = 0.5;
      inkPoly(ctx, 77, [[x + 22, y - 58 - o], [x + 26, y - 64 - o], [x + 22, y - 70 - o]], { stroke: C.muted, lw: 1.5 }, false);
      ctx.globalAlpha = 1;
      label(ctx, "CHAI", x + 50, y - 116, { size: 10, font: "display", align: "center", weight: 800, color: C.paper });
    },
    y + 8,
  );

export const railing = (x: number, y: number, w: number) =>
  prop(x, y - 30, w, 30, (s) => {
    s.rect(x, y - 30, w, 5, 2, { fill: C.muted, stroke: C.ink });
    for (let i = 0; i <= w; i += 26) s.rect(x + i - 2, y - 26, 4, 26, 1, { fill: C.muted, stroke: C.ink, lw: 2 });
  }, undefined, y);

export const lake = (x: number, y: number, w: number, h: number): Prop => ({
  x,
  y,
  w,
  h,
  sort: y,
  draw: (ctx, env) => {
    const pts: Pt[] = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([x + t * w, y + Math.sin(t * 7) * 4]);
    }
    pts.push([x + w, y + h], [x, y + h]);
    inkPoly(ctx, 88, pts, { fill: lerpColor(C.sky, "#5C8FE0", env.evening * 0.5), stroke: C.ink });
    // ripples
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 9; i++) {
      const rx = x + 40 + ((i * 97) % (w - 80)) + (env.reduced ? 0 : Math.sin(env.t * 0.8 + i) * 6);
      const ry = y + 14 + ((i * 31) % (h - 24));
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 18, ry);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // a boat bobbing
    const bx = x + w * 0.55 + (env.reduced ? 0 : Math.sin(env.t * 0.3) * 20);
    const by = y + 22 + (env.reduced ? 0 : Math.sin(env.t * 1.3) * 1.5);
    inkPoly(ctx, 89, [[bx - 16, by], [bx + 16, by], [bx + 10, by + 8], [bx - 10, by + 8]], { fill: C.coral, stroke: C.ink, lw: 2 });
    inkPoly(ctx, 90, [[bx, by], [bx, by - 20], [bx + 12, by - 6]], { fill: C.paper, stroke: C.ink, lw: 2 });
    // evening sun reflection
    if (env.evening > 0.3) {
      ctx.globalAlpha = env.evening * 0.5;
      ctx.fillStyle = C.sun;
      for (let i = 0; i < 5; i++) ctx.fillRect(x + w * 0.72 - 12 + (i % 2) * 6, y + 8 + i * 9, 24 - (i % 2) * 8, 3);
      ctx.globalAlpha = 1;
    }
  },
});

export const underpassSlab = (x: number, y: number, w: number) =>
  prop(x, y - 70, w, 200, (s) => {
    s.rect(x, y - 70, w, 50, 2, { fill: C.surface2, stroke: C.ink });
    s.rect(x - 10, y - 90, w + 20, 20, 2, { fill: C.muted, stroke: C.ink });
    for (let i = 0; i < w; i += 60) s.rect(x + i + 10, y - 84, 36, 8, 2, { fill: C.surface2, stroke: C.ink, lw: 2 });
    // dark interior back wall
    s.rect(x, y - 20, w, 160, 0, { fill: "#55555F", stroke: C.ink });
  }, undefined, y - 1000);

export const pillar = (x: number, y: number, h: number) =>
  prop(x - 14, y - h, 28, h, (s) => {
    s.rect(x - 14, y - h, 28, h, 2, { fill: C.surface2, stroke: C.ink });
    s.rect(x - 18, y - 6, 36, 8, 2, { fill: C.muted, stroke: C.ink });
  }, undefined, y);

export const graffiti = (x: number, y: number, text: string, color: string = C.coral) => ({
  x,
  y,
  w: 120,
  h: 30,
  sort: y - 1000,
  draw: (ctx: CanvasRenderingContext2D) => {
    label(ctx, text, x, y, { size: 16, font: "hand", color, weight: 700 });
  },
});

export const stairs = (x: number, y: number, sign: string) =>
  prop(
    x,
    y - 50,
    70,
    60,
    (s) => {
      s.rect(x, y - 2, 70, 12, 0, { fill: C.ink, stroke: C.ink });
      for (let i = 0; i < 4; i++) s.rect(x + 8 + i * 4, y + 10 + i * 0, 54 - i * 8, 3, 0, { fill: C.muted, stroke: null });
      s.rect(x + 26, y - 50, 4, 48, 1, { fill: C.muted, stroke: C.ink });
      s.rect(x + 4, y - 66, 60, 22, 3, { fill: C.sun, stroke: C.ink });
      s.rect(x - 4, y - 8, 78, 8, 2, { fill: C.muted, stroke: C.ink });
    },
    (ctx) => label(ctx, sign, x + 34, y - 55, { size: 9, font: "display", align: "center", weight: 800 }),
    y + 8,
  );

export const bench = (x: number, y: number) =>
  prop(x, y - 36, 70, 36, (s) => {
    s.rect(x, y - 30, 70, 8, 3, { fill: C.mint, stroke: C.ink });
    s.rect(x, y - 18, 70, 8, 3, { fill: C.mint, stroke: C.ink });
    s.rect(x + 6, y - 10, 6, 10, 1, { fill: C.ink, stroke: C.ink });
    s.rect(x + 58, y - 10, 6, 10, 1, { fill: C.ink, stroke: C.ink });
  }, undefined, y - 40);

export const gate = (x: number, y: number, sign: string, color: string = C.cobalt) =>
  prop(
    x,
    y - 150,
    120,
    150,
    (s) => {
      s.rect(x, y - 140, 12, 140, 2, { fill: C.surface2, stroke: C.ink });
      s.rect(x + 108, y - 140, 12, 140, 2, { fill: C.surface2, stroke: C.ink });
      s.rect(x - 6, y - 156, 132, 20, 3, { fill: color, stroke: C.ink });
      s.rect(x + 12, y - 110, 96, 110, 2, { fill: C.paper, stroke: C.ink });
      s.rect(x + 20, y - 100, 36, 100, 2, { fill: C.sky, stroke: C.ink });
      s.rect(x + 64, y - 100, 36, 100, 2, { fill: C.sky, stroke: C.ink });
      s.circle(x + 60, y - 50, 3, { fill: C.ink, stroke: C.ink });
    },
    (ctx) => label(ctx, sign, x + 60, y - 146, { size: 9, font: "display", align: "center", weight: 800, color: C.paper }),
    y - 1000,
  );

export const doorway = (x: number, y: number, sign: string) =>
  prop(
    x,
    y - 120,
    70,
    120,
    (s) => {
      s.rect(x, y - 110, 70, 110, 3, { fill: C.surface2, stroke: C.ink });
      s.rect(x + 8, y - 100, 54, 100, 2, { fill: C.cobalt, stroke: C.ink });
      s.rect(x + 14, y - 90, 42, 40, 2, { fill: C.sky, stroke: C.ink, lw: 2 });
      s.circle(x + 50, y - 46, 3, { fill: C.sun, stroke: C.ink, lw: 1.5 });
      s.rect(x - 4, y - 126, 78, 18, 3, { fill: C.paper, stroke: C.ink });
    },
    (ctx) => label(ctx, sign, x + 35, y - 117, { size: 8, font: "display", align: "center", weight: 800 }),
    y - 1000,
  );

/** Pigeons on the footpath that scatter when the player comes close. */
export const pigeons = (x: number, y: number, n = 4): Prop => {
  const birds = Array.from({ length: n }, (_, i) => ({ ox: i * 14 - (n * 7), fly: 0, dir: i % 2 ? 1 : -1 }));
  return {
    x: x - 40,
    y: y - 60,
    w: 80,
    h: 60,
    sort: y - 1,
    draw: (ctx, env) => {
      const near = Math.abs(env.px - x) < 70;
      for (const b of birds) {
        if (near && b.fly === 0) b.fly = 0.001;
        if (b.fly > 0) b.fly = Math.min(1, b.fly + 0.02);
        if (!near && b.fly >= 1) b.fly = Math.max(0, b.fly - 0.004) === 0 ? 0 : b.fly;
        const bx = x + b.ox + b.fly * b.dir * 70;
        const by = y - b.fly * 90;
        const flap = b.fly > 0 && b.fly < 1 ? Math.sin(env.t * 30) * 4 : 0;
        inkCircle(ctx, 100 + b.ox, bx, by - 5, 5, { fill: C.muted, stroke: C.ink, lw: 1.5 });
        inkCircle(ctx, 101 + b.ox, bx + 4 * b.dir, by - 9, 3, { fill: C.muted, stroke: C.ink, lw: 1.5 });
        if (flap) inkPoly(ctx, 102, [[bx - 6, by - 6 - flap], [bx, by - 6], [bx + 6, by - 6 - flap]], { stroke: C.ink, lw: 1.5 }, false);
      }
    },
  };
};

export const cloud = (x: number, y: number, k = 1) =>
  prop(x, y, 80 * k, 30 * k, (s) => {
    s.circle(x + 20 * k, y + 16 * k, 14 * k, { fill: C.paper, stroke: C.ink, lw: 2 });
    s.circle(x + 40 * k, y + 10 * k, 18 * k, { fill: C.paper, stroke: C.ink, lw: 2 });
    s.circle(x + 60 * k, y + 16 * k, 13 * k, { fill: C.paper, stroke: C.ink, lw: 2 });
    s.rect(x + 20 * k, y + 16 * k, 40 * k, 14 * k, 6 * k, { fill: C.paper, stroke: null });
  }, undefined, y);
