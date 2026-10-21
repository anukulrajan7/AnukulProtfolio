// Scene shape data. Side view, horizon ~62%, rooms 1.5 screens, street 4.
import { glow, inkCircle, inkPoly, inkRect, label, type Pt } from "../engine/ink";
import { C, H, W } from "../engine/palette";
import { fmtClock, smooth } from "../engine/rng";
import {
  autoRickshaw,
  bench,
  books,
  building,
  chair,
  chaiGlass,
  chaiStall,
  cloud,
  desk,
  doorway,
  fan,
  lake,
  lamp,
  lampPool,
  lamppost,
  laptop,
  lerpColor,
  monitor,
  pigeons,
  pillar,
  plant,
  poster,
  prop,
  railing,
  shelf,
  skyline,
  stairs,
  switchPlate,
  tree,
  tubeLight,
  underpassSlab,
  windowNight,
} from "./props";
import type { Env, Prop, Scene } from "./types";

const FLOOR = 296;
export const ROOM_FEET = 318;
/** Feet y for someone sitting on a room chair. */
export const SIT_Y = 289;

/** "past" = warm sepia memory, "early" = a lighter wash (2023), "now" = as drawn. */
export type Era = "past" | "early" | "now";

function eraWash(ctx: CanvasRenderingContext2D, era: Era, width: number, dark: boolean) {
  if (era === "now") return;
  ctx.save();
  ctx.globalAlpha = era === "past" ? (dark ? 0.2 : 0.14) : dark ? 0.1 : 0.07;
  ctx.fillStyle = dark ? "#8E6B3A" : "#C9A46A";
  ctx.fillRect(-20, -20, width + 40, H + 40);
  ctx.restore();
}

function room(width: number, wall: string, side: string, floor: string): Prop {
  return prop(0, 0, width, H, (s) => {
    s.rect(-4, -4, width + 8, 38, 0, { fill: "#F7F5F0", stroke: null });
    s.rect(36, 30, width - 72, FLOOR - 30, 0, { fill: wall, stroke: C.ink });
    s.poly([[0, -4], [36, 30], [36, FLOOR], [0, FLOOR + 40]], { fill: side, stroke: C.ink });
    s.poly([[width, -4], [width - 36, 30], [width - 36, FLOOR], [width, FLOOR + 40]], { fill: side, stroke: C.ink });
    s.poly([[36, FLOOR], [width - 36, FLOOR], [width + 4, FLOOR + 40], [width + 4, H + 4], [-4, H + 4], [-4, FLOOR + 40]], { fill: floor, stroke: C.ink });
    s.line(36, FLOOR - 7, width - 36, FLOOR - 7, { lw: 1.5, stroke: C.muted });
    for (let x = 120; x < width - 60; x += 140) s.line(x, FLOOR + 2, x - 40 + (x / width) * 80, H + 4, { lw: 1.2, stroke: "rgba(18,18,23,0.18)" });
  }, undefined, -5000);
}

/* ------------------------------------------------------------------ */
/* Home desk: prologue + finale. Present day, night.                   */
/* ------------------------------------------------------------------ */

export function buildHome(era: Era = "now"): Scene {
  const width = 960;
  const play: Prop[] = [
    room(width, "#ECE9E1", "#E2DED4", "#DCD6C9"),
    tubeLight(360, 64, 170),
    fan(500, 44),
    switchPlate(346, 186),
    windowNight(770, 96, 92, 124),
    // window becomes dawn in the finale
    {
      x: 770,
      y: 96,
      w: 92,
      h: 124,
      sort: -800,
      draw: (ctx, env) => {
        if (env.w.dawn <= 0) return;
        ctx.save();
        ctx.globalAlpha = env.w.dawn;
        inkRect(ctx, 17, 770, 96, 92, 124, 2, { fill: "#FFE2B0", stroke: C.ink });
        inkCircle(ctx, 18, 816, 190, 18, { fill: C.sun, stroke: C.ink, lw: 2 });
        inkPoly(ctx, 4, [[816, 96], [816, 220]], { stroke: C.ink }, false);
        inkPoly(ctx, 5, [[770, 158], [862, 158]], { stroke: C.ink }, false);
        ctx.restore();
        glow(ctx, 816, 158, 200, C.sun, 0.25 * env.w.dawn);
      },
    },
    poster(230, 120, ["put it live", "(carefully)"], C.sun),
    poster(640, 110, ["send it", "and hope"], C.lilac),
    shelf(270, FLOOR),
    // bed
    prop(60, 230, 190, 90, (s) => {
      s.rect(60, 210, 14, 108, 3, { fill: C.muted, stroke: C.ink });
      s.rect(236, 236, 14, 82, 3, { fill: C.muted, stroke: C.ink });
      s.rect(66, 262, 180, 22, 6, { fill: C.paper, stroke: C.ink });
      s.rect(78, 246, 50, 18, 9, { fill: C.paper, stroke: C.ink });
      s.poly([[118, 258], [240, 256], [246, 300], [114, 304]], { fill: C.coral, stroke: C.ink });
      s.line(130, 270, 236, 268, { lw: 1.5 });
    }, undefined, 300),
    lampPool(640, 256, -1),
    desk(430, 256, 240),
    chair(462, 296),
    laptop(508, 256, 76, (ctx, env) => laptopScreen(ctx, env, 513, 214, 66, 37)),
    chaiGlass(596, 256, false),
    lamp(642, 256, -1),
    books(612, 256),
    // keepsakes on the finale desk (Unpacking)
    {
      x: 440,
      y: 220,
      w: 80,
      h: 30,
      sort: 262,
      draw: (ctx, env) => {
        env.w.deskThings.forEach((k, i) => deskThing(ctx, k, 444 + i * 19, 256));
      },
    },
  ];
  const fore: Prop[] = [plant(40, H + 10, 1.4), plant(1080, H + 10, 1.2)];
  return {
    id: "desk",
    width,
    walkY: ROOM_FEET,
    depth: [ROOM_FEET, ROOM_FEET],
    walkMin: 70,
    walkMax: 890,
    layers: [[], [], play, fore],
    hotspots: [
      { id: "bed", x: 160, r: 60, gy: 236, label: "Bed", kind: "look" },
      { id: "switch", x: 353, r: 26, gy: 176, label: "Light switch", kind: "use" },
      { id: "laptop", x: 532, r: 40, gy: 200, label: "Laptop", kind: "use" },
      { id: "chai", x: 603, r: 22, gy: 226, label: "Chai", kind: "use" },
      { id: "window", x: 816, r: 50, gy: 120, label: "Window", kind: "look" },
    ],
    zones: [],
    bed: "desk",
    sky: (ctx) => {
      ctx.fillStyle = C.paper;
      ctx.fillRect(0, 0, W, H);
    },
    overlay: (ctx, env) => {
      eraWash(ctx, era, width, !env.light);
      if (env.light) return;
      ctx.save();
      ctx.globalAlpha = 0.2 * (1 - env.w.dawn);
      ctx.fillStyle = C.night;
      ctx.fillRect(-20, -20, width + 40, H + 40);
      ctx.restore();
      glow(ctx, 612, 214, 150, C.sun, 0.25 * (1 - env.w.dawn));
    },
    describe: "A small room at night. A bed on the left, a desk in the middle with a laptop, a lamp and a glass of chai, a window on the right.",
  };
}

function laptopScreen(ctx: CanvasRenderingContext2D, env: Env, x: number, y: number, w: number, h: number) {
  const st = env.w.laptop;
  if (st === "dark") {
    ctx.fillStyle = C.card;
    ctx.fillRect(x, y, w, h);
    return;
  }
  if (st === "code") {
    const scroll = env.reduced ? 0 : (env.t * 6) % 6;
    for (let i = 0; i < 7; i++) {
      const yy = y + 4 + i * 6 - scroll;
      const lw = 10 + ((i * 17) % 34);
      ctx.fillStyle = i % 3 === 0 ? C.cobalt : i % 3 === 1 ? C.muted : C.lilacDark;
      ctx.fillRect(x + 4 + (i % 2) * 6, yy, lw, 2.5);
    }
    return;
  }
  if (st === "build") {
    label(ctx, "working…", x + w / 2, y + 10, { size: 7, font: "mono", align: "center" });
    inkRect(ctx, 61, x + 6, y + 18, w - 12, 8, 2, { fill: C.paper, stroke: C.ink, lw: 1.5 });
    ctx.fillStyle = C.mint;
    ctx.fillRect(x + 8, y + 20, (w - 16) * smooth(Math.min(1, env.w.buildT)), 4);
    return;
  }
  if (st === "lesson") {
    inkRect(ctx, 64, x + 4, y + 3, w - 8, 22, 2, { fill: C.card, stroke: C.ink, lw: 1 });
    inkPoly(ctx, 65, [[x + w / 2 - 3, y + 8], [x + w / 2 - 3, y + 20], [x + w / 2 + 5, y + 14]], { fill: C.paper, stroke: null });
    inkRect(ctx, 66, x + 4, y + 30, w - 8, 4, 2, { fill: C.paper, stroke: C.ink, lw: 1 });
    ctx.fillStyle = C.coral;
    ctx.fillRect(x + 5, y + 31, (w - 10) * Math.min(1, 0.12 + env.w.buildT * 0.7), 2);
    return;
  }
  if (st === "line" || st === "square" || st === "triangle") {
    const rows = st === "line" ? 1 : 5;
    for (let r = 0; r < rows; r++) {
      const n = st === "triangle" ? r + 1 : 5;
      label(ctx, "*".repeat(n), x + 6, y + (st === "line" ? 20 : 9 + r * 6.4), { size: 8, font: "mono", weight: 700, color: C.sun });
    }
    return;
  }
  if (st === "error") {
    inkRect(ctx, 67, x + 4, y + 6, w - 8, 10, 2, { fill: C.coral, stroke: C.ink, lw: 1 });
    label(ctx, "error", x + w / 2, y + 12, { size: 6.5, font: "mono", align: "center", weight: 700, color: C.paper });
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = C.muted;
      ctx.fillRect(x + 6, y + 21 + i * 5, 24 + ((i * 11) % 18), 2);
    }
    return;
  }
  if (st === "mail") {
    inkRect(ctx, 68, x + w / 2 - 12, y + 4, 24, 15, 2, { fill: C.paper, stroke: C.ink, lw: 1.5 });
    inkPoly(ctx, 69, [[x + w / 2 - 12, y + 5], [x + w / 2, y + 13], [x + w / 2 + 12, y + 5]], { stroke: C.ink, lw: 1.5 }, false);
    label(ctx, "Unfortunately…", x + w / 2, y + 28, { size: 6, font: "mono", align: "center" });
    return;
  }
  inkCircle(ctx, 62, x + w / 2, y + 13, 7, { fill: C.mint, stroke: C.ink, lw: 1.5 });
  inkPoly(ctx, 63, [[x + w / 2 - 3, y + 13], [x + w / 2 - 1, y + 16], [x + w / 2 + 4, y + 10]], { stroke: C.ink, lw: 1.5 }, false);
  label(ctx, "214 checks pass", x + w / 2, y + 28, { size: 6.5, font: "mono", align: "center" });
}

export function deskThing(ctx: CanvasRenderingContext2D, k: string, x: number, y: number) {
  if (k === "unknown") {
    inkRect(ctx, 71, x - 2, y - 12, 22, 12, 2, { fill: C.sun, stroke: C.ink, lw: 1.5 });
    label(ctx, "unknown", x + 9, y - 6, { size: 4.5, font: "mono", align: "center", weight: 700 });
  } else if (k === "sorry") {
    inkRect(ctx, 72, x, y - 14, 16, 14, 2, { fill: C.paper, stroke: C.ink, lw: 1.5 });
    inkPoly(ctx, 73, [[x + 3, y - 10], [x + 13, y - 10]], { stroke: C.muted, lw: 1 }, false);
    inkPoly(ctx, 74, [[x + 3, y - 6], [x + 10, y - 6]], { stroke: C.muted, lw: 1 }, false);
  } else if (k === "phone" || k === "look") {
    inkRect(ctx, 75, x, y - 3, 14, 3, 1, { fill: C.ink, stroke: C.ink, lw: 1.5 });
  } else if (k === "listen") {
    inkRect(ctx, 76, x, y - 13, 14, 13, 1, { fill: C.sun, stroke: C.ink, lw: 1.5 });
    inkPoly(ctx, 77, [[x + 3, y - 8], [x + 11, y - 8]], { stroke: C.ink, lw: 1 }, false);
  } else if (k === "check") {
    inkRect(ctx, 78, x, y - 3, 18, 3, 1.5, { fill: C.coral, stroke: C.ink, lw: 1.5 });
  } else if (k === "why") {
    inkRect(ctx, 79, x + 2, y - 15, 10, 15, 1, { fill: C.paper, stroke: C.ink, lw: 1.5 });
    inkPoly(ctx, 80, [[x + 4, y - 11], [x + 10, y - 11]], { stroke: C.muted, lw: 1 }, false);
    inkPoly(ctx, 87, [[x + 4, y - 7], [x + 8, y - 7]], { stroke: C.muted, lw: 1 }, false);
  } else if (k === "read") {
    inkRect(ctx, 88, x, y - 6, 18, 6, 1, { fill: C.paper, stroke: C.ink, lw: 1.5 });
    inkPoly(ctx, 89, [[x + 3, y - 3], [x + 15, y - 3]], { stroke: C.coralText, lw: 1 }, false);
  } else if (k === "plain") {
    inkRect(ctx, 100, x, y - 12, 14, 12, 1, { fill: C.cobaltLight, stroke: C.ink, lw: 1.5 });
    inkPoly(ctx, 101, [[x + 3, y - 8], [x + 9, y - 8]], { stroke: C.ink, lw: 1 }, false);
  }
}

/* ------------------------------------------------------------------ */
/* Office: a real-time workspace company. Cobalt hue.                  */
/* ------------------------------------------------------------------ */

const BOARD = { x: 76, y: 58, w: 360, h: 156 };

function boardProp(): Prop {
  const lanes = ["TO DO", "DOING", "DONE"];
  const cols = [C.sun, C.paper, C.mint, C.lilac, C.paper, C.sky];
  const lw = BOARD.w / 3;
  // 12 cards: home slot vs where Tab piled them in Done (and on the floor)
  const cards = Array.from({ length: 12 }, (_, i) => {
    const lane = i % 3;
    const row = Math.floor(i / 3);
    const home: Pt = [BOARD.x + lane * lw + 12 + (row % 2) * 4, BOARD.y + 30 + row * 28];
    const pile: Pt = lane === 2 ? home : i % 4 === 0 ? [BOARD.x + BOARD.w - 30 + (i % 3) * 14, 300 + (i % 2) * 6] : [BOARD.x + 2 * lw + 8 + (i % 4) * 6, BOARD.y + 22 + (i % 6) * 18];
    return { home, pile, color: cols[i % cols.length], rot: ((i * 37) % 11) / 30 - 0.18 };
  });
  return {
    x: BOARD.x,
    y: BOARD.y,
    w: BOARD.w + 60,
    h: 260,
    sort: -900,
    draw: (ctx, env) => {
      inkRect(ctx, 81, BOARD.x - 8, BOARD.y - 8, BOARD.w + 16, BOARD.h + 16, 6, { fill: C.cobalt, stroke: C.ink });
      inkRect(ctx, 82, BOARD.x, BOARD.y, BOARD.w, BOARD.h, 3, { fill: C.paper, stroke: C.ink });
      for (let i = 1; i < 3; i++) inkPoly(ctx, 83 + i, [[BOARD.x + i * lw, BOARD.y], [BOARD.x + i * lw, BOARD.y + BOARD.h]], { stroke: C.ink, lw: 1.5 }, false);
      lanes.forEach((l, i) => label(ctx, l, BOARD.x + i * lw + lw / 2, BOARD.y + 12, { size: 8, font: "display", align: "center", weight: 800 }));
      const t = smooth(env.w.boardBack);
      cards.forEach((c, i) => {
        const x = c.pile[0] + (c.home[0] - c.pile[0]) * t;
        const y = c.pile[1] + (c.home[1] - c.pile[1]) * t;
        ctx.save();
        ctx.translate(x + 40, y + 9);
        ctx.rotate(c.rot * (1 - t));
        inkRect(ctx, 90 + i, -40, -9, lw - 28, 20, 2, { fill: c.color, stroke: C.ink, lw: 1.5 });
        ctx.fillStyle = C.muted;
        ctx.fillRect(-34, -3, 30 + ((i * 13) % 30), 2);
        ctx.restore();
      });
      if (t < 0.5) label(ctx, "30 → Done (by Tab)", BOARD.x + BOARD.w - 60, BOARD.y + BOARD.h + 18, { size: 9, font: "hand", align: "center", color: C.ink, weight: 700 });
    },
  };
}

function wallClock(x: number, y: number): Prop {
  return {
    x: x - 20,
    y: y - 20,
    w: 40,
    h: 40,
    sort: -950,
    draw: (ctx, env) => {
      inkCircle(ctx, 120, x, y, 17, { fill: C.paper, stroke: C.ink });
      const m = env.clock % 60;
      const h = (env.clock / 60) % 12;
      const hand = (a: number, len: number, lw: number) => {
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len);
        ctx.stroke();
      };
      hand((h / 12) * Math.PI * 2, 8, 2.5);
      hand((m / 60) * Math.PI * 2, 12, 1.8);
      ctx.fillStyle = C.coral;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

export function buildOffice(era: Era = "now"): Scene {
  const width = 1120;
  const wall = "#DCDFFD";
  const play: Prop[] = [
    room(width, wall, "#C9CEF8", "#E3E1DA"),
    // cobalt wainscot: the chapter hue on a big area
    prop(36, 250, width - 72, 46, (s) => s.rect(36, 250, width - 72, 46, 0, { fill: C.cobalt, stroke: C.ink }), undefined, -4000),
    tubeLight(140, 40, 170),
    tubeLight(560, 40, 170),
    tubeLight(860, 40, 150),
    boardProp(),
    windowNight(486, 76, 96, 110, "evening"),
    wallClock(760, 100),
    poster(640, 92, ["release small", "release often"], C.sun),
    // right door to the street
    prop(1010, 120, 64, 176, (s) => {
      s.rect(1010, 120, 64, 176, 3, { fill: C.surface2, stroke: C.ink });
      s.rect(1018, 128, 48, 168, 2, { fill: C.paper, stroke: C.ink });
      s.rect(1024, 140, 36, 50, 2, { fill: C.sky, stroke: C.ink, lw: 2 });
      s.circle(1058, 216, 3, { fill: C.sun, stroke: C.ink, lw: 1.5 });
      s.rect(1004, 98, 76, 18, 3, { fill: C.mint, stroke: C.ink });
    }, (ctx) => label(ctx, "EXIT", 1042, 107, { size: 8, font: "display", align: "center", weight: 800 }), -900),
    // badge reader
    prop(992, 196, 12, 18, (s) => {
      s.rect(992, 196, 12, 18, 2, { fill: C.ink, stroke: C.ink });
    }, (ctx, env) => inkCircle(ctx, 130, 998, 202, 2.5, { fill: env.w.idOnDesk ? C.coral : C.mint, stroke: null }), -890),
    // Zoya's desk
    desk(520, 256, 200),
    monitor(616, 256, 84, (ctx) => {
      ctx.fillStyle = C.surface;
      ctx.fillRect(621, 192, 74, 39);
      for (let i = 0; i < 4; i++) {
        inkRect(ctx, 140 + i, 626 + (i % 2) * 16, 196 + i * 8.5, 40, 6, 3, { fill: i % 2 ? C.lilac : C.paper, stroke: C.ink, lw: 1 });
      }
    }),
    chair(546, 296),
    plant(536, 256, 0.5),
    // Your desk
    desk(770, 256, 210),
    chair(770, 296),
    monitor(816, 256, 92, (ctx, env) => {
      const x = 821;
      const y = 188;
      if (env.w.monitor === "dark") {
        ctx.fillStyle = C.card;
        ctx.fillRect(x, y, 82, 54);
        return;
      }
      if (env.w.monitor === "error") {
        ctx.fillStyle = "#D93025";
        ctx.fillRect(x, y, 82, 54);
        label(ctx, "500", x + 41, y + 30, { size: 20, font: "mono", align: "center", weight: 800, color: C.paper });
        return;
      }
      if (env.w.monitor === "ok") {
        ctx.fillStyle = C.mint;
        ctx.fillRect(x, y, 82, 54);
        inkPoly(ctx, 158, [[x + 26, y + 28], [x + 37, y + 40], [x + 58, y + 14]], { stroke: C.ink, lw: 4 }, false);
        return;
      }
      if (env.w.monitor === "map") {
        ctx.fillStyle = C.surface;
        ctx.fillRect(x, y, 82, 54);
        inkPoly(ctx, 150, [[x + 6, y + 44], [x + 30, y + 44], [x + 44, y + 30], [x + 76, y + 30]], { stroke: C.muted, lw: 4 }, false);
        inkCircle(ctx, 151, x + 62, y + 16, 10, { fill: C.sky, stroke: C.ink, lw: 1.5 });
        return;
      }
      ctx.fillStyle = C.surface;
      ctx.fillRect(x, y, 82, 54);
      inkRect(ctx, 152, x + 4, y + 4, 22, 46, 2, { fill: C.cobaltLight, stroke: null });
      for (let i = 0; i < 3; i++) inkRect(ctx, 153 + i, x + 30 + (i % 2) * 14, y + 8 + i * 14, 34, 9, 4, { fill: i % 2 ? C.paper : C.lilac, stroke: C.ink, lw: 1 });
      // notification dot pulses
      inkCircle(ctx, 157, x + 76, y + 6, 3 + (env.reduced ? 0 : Math.sin(env.t * 4)), { fill: C.coral, stroke: null });
    }),
    {
      x: 900,
      y: 236,
      w: 60,
      h: 24,
      sort: 260,
      draw: (ctx, env) => {
        if (env.w.idOnDesk) {
          inkPoly(ctx, 160, [[904, 252], [912, 242], [922, 252]], { stroke: C.sun, lw: 2 }, false);
          inkRect(ctx, 161, 906, 246, 14, 10, 2, { fill: C.paper, stroke: C.ink, lw: 1.5 });
        }
        if (env.w.phoneOnDesk) {
          inkRect(ctx, 162, 936, 242, 9, 14, 2, { fill: C.ink, stroke: C.ink });
          inkRect(ctx, 163, 937.5, 244, 6, 10, 1, { fill: C.sky, stroke: null });
        }
        env.w.deskThings.forEach((k, i) => deskThing(ctx, k, 790 + i * 20, 256));
      },
    },
    chaiGlass(960, 256, true),
  ];
  const fore: Prop[] = [plant(30, H + 14, 1.5), plant(1240, H + 14, 1.3)];
  return {
    id: "office",
    width,
    walkY: ROOM_FEET,
    depth: [ROOM_FEET, ROOM_FEET],
    walkMin: 70,
    walkMax: 1060,
    layers: [[], [], play, fore],
    hotspots: [
      { id: "board", x: 256, r: 110, gy: 104, label: "Task board", kind: "use" },
      { id: "zoya", x: 590, r: 46, gy: 176, label: "Zoya", kind: "talk" },
      { id: "id", x: 913, r: 18, gy: 232, label: "Badge", kind: "use" },
      { id: "phone", x: 941, r: 18, gy: 230, label: "Test phone", kind: "use" },
      { id: "exit", x: 1040, r: 34, gy: 190, label: "Exit", kind: "door" },
    ],
    zones: [],
    bed: "office",
    sky: (ctx) => {
      ctx.fillStyle = C.paper;
      ctx.fillRect(0, 0, W, H);
    },
    overlay: (ctx, env) => {
      eraWash(ctx, era, width, env.evening >= 0.6);
      if (env.evening < 0.6) return;
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = C.cobalt;
      ctx.fillRect(-20, -20, width + 40, H + 40);
      ctx.restore();
    },
    describe: "An open office with a light cobalt wall. A task board on the left, Zoya at her desk, your desk with a monitor, a badge and a test phone, and an exit door on the right.",
  };
}

/* ------------------------------------------------------------------ */
/* The field-test street. Four screens, late afternoon into evening.   */
/* ------------------------------------------------------------------ */

export const STREET = {
  width: 2560,
  canyon: [900, 1450] as const,
  under: [1450, 1900] as const,
  stairsX: 1990,
  benchX: 2400,
  chaiX: 600,
};
const PATH_Y = 292;

export function buildStreet(): Scene {
  const { width } = STREET;
  // far 0.3 + mid 0.6 content spans the full width so reduced motion (no parallax) still fills.
  const far: Prop[] = [skyline(0, 250, width)];
  for (let i = 0; i < 9; i++) far.push(cloud(60 + i * 290, 30 + ((i * 37) % 50), 0.8 + (i % 3) * 0.2));
  const mid: Prop[] = [];
  const midCols = [C.surface2, "#F6E7C8", C.cobaltLight, "#E6F5EE", C.surface2];
  for (let x = 0, i = 0; x < 1250; i++) {
    const w = 80 + ((i * 41) % 60);
    const h = 110 + ((i * 59) % 90);
    mid.push(building(x, 272, w, h, midCols[i % midCols.length], 3, 4));
    x += w + 18 + ((i * 13) % 30);
  }
  for (let i = 0; i < 8; i++) mid.push(tree(1290 + i * 70 + ((i * 17) % 30), 268, 0.7 + (i % 3) * 0.12));
  for (let x = 1850; x < width; x += 150) mid.push(building(x, 272, 90, 120 + ((x * 7) % 60), midCols[(x / 150) % 5 | 0], 3, 4));

  const play: Prop[] = [];
  // ground: footpath + road (drawn as one long prop)
  play.push(
    prop(0, PATH_Y, width, H - PATH_Y, (s) => {
      s.rect(-10, PATH_Y, width + 20, 44, 0, { fill: C.surface, stroke: C.ink });
      for (let x = 20; x < width; x += 46) s.line(x, PATH_Y + 2, x - 6, PATH_Y + 42, { lw: 1.2, stroke: "rgba(18,18,23,0.2)" });
      s.rect(-10, PATH_Y + 44, width + 20, 8, 0, { fill: C.surface2, stroke: C.ink });
      s.rect(-10, PATH_Y + 52, width + 20, 30, 0, { fill: "#8A8A92", stroke: C.ink });
      for (let x = 10; x < width; x += 70) s.rect(x, PATH_Y + 63, 34, 4, 1, { fill: C.paper, stroke: null });
    }, undefined, -3000),
  );
  // start: office doorway
  play.push(doorway(30, PATH_Y, "OFFICE"));
  play.push(tree(200, PATH_Y + 2, 1));
  play.push(lamppost(300, PATH_Y + 2));
  play.push(autoRickshaw(380, PATH_Y + 4));
  play.push(chaiStall(STREET.chaiX - 50, PATH_Y + 2));
  play.push(pigeons(800, PATH_Y + 30, 4));
  play.push(lamppost(860, PATH_Y + 2));
  // canyon: tall buildings tight together, tops out of frame
  const canCols = [C.surface2, "#F6E7C8", C.cobaltLight, "#FCE3DC", C.surface2, "#E6F5EE"];
  for (let x = STREET.canyon[0] - 10, i = 0; x < STREET.canyon[1]; i++) {
    const w = 90 + ((i * 29) % 30);
    play.push(building(x, PATH_Y, w, 320, canCols[i % canCols.length], 3, 8, C.paper, false));
    x += w + 4;
  }
  play.push(lamppost(1180, PATH_Y + 2));
  // underpass
  play.push(underpassSlab(STREET.under[0] - 20, 150, STREET.under[1] - STREET.under[0] + 40));
  play.push(pillar(STREET.under[0], PATH_Y + 2, 210));
  play.push(pillar(STREET.under[1], PATH_Y + 2, 210));
  play.push({
    x: 1600,
    y: 200,
    w: 200,
    h: 60,
    sort: -800,
    draw: (ctx) => {
      label(ctx, "no signal", 1620, 214, { size: 18, font: "hand", color: C.sun, weight: 700 });
      label(ctx, "S + Z was here", 1720, 240, { size: 12, font: "hand", color: C.paper, weight: 700, alpha: 0.8 });
    },
  });
  // lakeside
  play.push(stairs(STREET.stairsX - 35, PATH_Y + 4, "MAGGI ↓"));
  play.push(lake(2060, 220, 520, 72));
  play.push(railing(2060, PATH_Y + 2, 520));
  play.push(tree(2100, PATH_Y, 0.9));
  play.push(lamppost(2250, PATH_Y + 2));
  play.push(bench(STREET.benchX - 35, PATH_Y + 30));
  play.push(lamppost(2520, PATH_Y + 2));

  const fore: Prop[] = [
    plant(560, H + 22, 1.5),
    prop(1320, 300, 30, 80, (s) => s.rect(1320, 300, 22, 80, 4, { fill: C.muted, stroke: C.ink }), undefined, 999),
    plant(2210, H + 22, 1.6),
    plant(2950, H + 22, 1.3),
  ];

  return {
    id: "street",
    width,
    walkY: 316,
    depth: [304, 330],
    walkMin: 60,
    walkMax: width - 60,
    layers: [far, mid, play, fore],
    hotspots: [
      { id: "chai", x: STREET.chaiX, r: 40, gy: 236, label: "Chai stall", kind: "use", once: true },
      { id: "stairs", x: STREET.stairsX, r: 34, gy: 240, label: "Stairs down", kind: "door" },
      { id: "bench", x: STREET.benchX, r: 40, gy: 270, label: "Bench", kind: "sit" },
    ],
    zones: [
      { id: "open", from: 0, to: STREET.canyon[0] },
      { id: "canyon", from: STREET.canyon[0], to: STREET.canyon[1] },
      { id: "underpass", from: STREET.under[0], to: STREET.under[1] },
      { id: "lake", from: STREET.under[1], to: width },
    ],
    bed: "street",
    sky: (ctx, env, camX) => {
      ctx.fillStyle = lerpColor("#FFF3D6", "#FFC59E", env.evening);
      ctx.fillRect(0, 0, W, H);
      const sx = 520 - camX * 0.04;
      const sy = 90 + env.evening * 120;
      glow(ctx, sx, sy, 110, env.evening > 0.5 ? C.coral : C.sun, 0.25);
      inkCircle(ctx, 9, sx, sy, 26, { fill: env.evening > 0.5 ? "#FF8A5C" : C.sun, stroke: C.ink });
    },
    overlay: (ctx, env) => {
      // canyon shade, underpass dark, dusk tint
      ctx.save();
      ctx.fillStyle = C.ink;
      ctx.globalAlpha = 0.07;
      ctx.fillRect(STREET.canyon[0], 0, STREET.canyon[1] - STREET.canyon[0], H);
      ctx.globalAlpha = 0.34;
      ctx.fillRect(STREET.under[0], 146, STREET.under[1] - STREET.under[0], H - 146);
      if (env.evening > 0.4) {
        ctx.globalAlpha = (env.evening - 0.4) * 0.18;
        ctx.fillStyle = C.cobalt;
        ctx.fillRect(-20, -20, width + 40, H + 40);
      }
      ctx.restore();
    },
    describe: "A city street in the late afternoon. An office door, a chai stall, tall buildings close together, a road bridge to walk under, stairs down to a Maggi place, and a lake with a bench at the end.",
  };
}

export { fmtClock };
