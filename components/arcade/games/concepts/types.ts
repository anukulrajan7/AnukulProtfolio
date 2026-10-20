// Learn-track scripts: the game-specific rule changes that make a level
// behave like the concept it teaches. Copy lives on LevelDef.copy.

export type Lane = "sync" | "task" | "micro";

export interface PingbackBug {
  /** What it prints (shown on the bug, pushed to the console). */
  id: string;
  /** Optional on-bug label when it differs from the print, e.g. "load()". */
  tag?: string;
  lane: Lane;
  /** 1-based print order; 0 = any order (Promise.all). */
  order: number;
  /** Code-card line highlighted when it prints. */
  line?: number;
  /** Appears only when this bug id pops (await continuation, nested then). */
  spawnedBy?: string;
  /** Small badge for spawned bugs, e.g. "⏸". */
  badge?: string;
}

export interface PingbackScript {
  kind: "pingback";
  code: string[];
  bugs: PingbackBug[];
  /** Show lane glyphs, shields and queue contents (first level of a concept). */
  showMachinery?: boolean;
  /** A long task that freezes the tower if it reaches you whole. */
  heavy?: { label: string; freezeMs: number; required: boolean };
  /** Pings allowed in flight before Promise.all (default unlimited). */
  inflightCap?: number;
  /** A crate that switches to batched Promise.all mode when shot. */
  promiseAllCrate?: boolean;
  /** Lethal unlabelled noise bugs kept on the field. */
  noise: number;
}

export type TraceStep = { call: string; gapCol: number } | { ret: string };

export interface HoistDecl {
  kind: "function" | "var" | "let" | "const";
  name: string;
  /** Piece kind 0..6 (I O T S Z J L). */
  piece: number;
  /** var: lock count at which its hollow cells fill in. */
  assignedAt?: number;
  /** let/const: lock count at which the TDZ lock opens. */
  declaredAt?: number;
}

export interface ListenerDef {
  name: string;
  /** Who owns it, e.g. "<Chart/> (unmounted)". */
  owner: string;
  /** The one that should be removed. */
  leaky: boolean;
}

export interface StackerScript {
  kind: "stacker";
  code: string[];
  /** S1/S8: frame slabs. S8 (with `listeners`) lets missed pieces stay as heap allocations. */
  trace?: TraceStep[];
  /** S2: `fn(n)` calls itself. A sealed slab every `every` s from n = `from` down to 0; the n = 0 slab has a 2-wide gold notch. */
  recursion?: { fn: string; from: number; every: number; notchCol: number; limitRow: number };
  /** S3: heap allocation + GC sweeps. */
  heap?: {
    /** Rows from the top of the visible well where the memory limit sits. */
    limitRow: number;
    gcEvery: number;
    sweepsToWin: number;
    frames: { name: string; returnsAfter: number; returnPiece: number }[];
  };
  /**
   * S4/S8: listener roots. Hold (or R) opens "Remove listener". S4 alone: the
   * leaky listener's handler allocates a junk row every `leakEvery` s until it
   * is removed; win by surviving `surviveSec` seconds.
   */
  listeners?: { items: ListenerDef[]; gcEvery: number; limitRow: number; leakEvery?: number; surviveSec?: number };
  /** S5/S6/S8: hoisted shelf replaces Hold. */
  hoist?: { decls: HoistDecl[]; tetrisWithin?: number };
  /** S7: pieces take roles in turn; `count` cells are captured and survive the sweep, `temp` cells are swept. Cells fall per column after a sweep. */
  closure?: { roles: ("count" | "temp")[]; gcEvery: number; clearsToWin: number };
}

export type ZoneKind = "noSignal" | "sleep" | "glass";

export type Rect = [x: number, y: number, w: number, h: number];

export interface RouteScript {
  kind: "route";
  /** Code card in the concept panel. */
  code?: string[];
  /** R1: accuracy rings; a Wi-Fi/cell decoy appears every N seconds. */
  decoyEvery?: number;
  /** R3/R5/R6/R8: map zones in grid cells [x, y, w, h]. */
  zones?: { kind: ZoneKind; rect: Rect }[];
  /** R2: the trail is not free. Fix (Space / F / touch button) records a point for `batteryCostPct` battery. */
  manualFix?: { batteryCostPct: number };
  /** R2: solid blocks. A straight server segment through one turns red. */
  buildings?: Rect[];
  /** R6: glass zones throw spike fixes; three display filters clean the picture. */
  filters?: { cellKm: number };
  /** R7: ASCII city, `#` = building, `.` = road. Raw pins land in buildings; pick the reachable candidate. */
  roads?: string[];
  /** R8: coin cost per upload request, snap call and address lookup, and the run's budget. */
  budget?: { upload: number; snap: number; geocode: number; cap: number };
  /** R3: the first in-zone delivery is lost, then the outbox turns on. */
  outbox?: boolean;
  /** R4: chance a delivered event is resent as a ghost pin. */
  dupRate?: number;
  /** R4: deliveries before the ON CONFLICT DO NOTHING key appears. */
  idKeyAt?: number;
  /** R5: scripted gaps (shown on exiting a sleep zone). Answer comes from speed. */
  gaps?: { km: number; min: number }[];
}

/** R6 display filters: option lists and the honest defaults (loosest). */
export const FILTERS = {
  acc: { label: "Accuracy cut-off", options: ["≤ 25 m", "≤ 50 m", "≤ 100 m", "off"], limits: [25, 50, 100, Infinity] },
  spd: { label: "Max speed", options: ["30 km/h", "150 km/h", "500 km/h", "off"], limits: [30, 150, 500, Infinity] },
  still: { label: "While still", options: ["ignore", "keep"] },
} as const;

export interface FixLike {
  acc: number;
  kmh: number;
  still: boolean;
}

/** R6 rule: hide a fix when its accuracy or implied speed is over the cut-off, or it was taken while still and still-drift is ignored. */
export function hiddenBy(f: FixLike, sel: { acc: number; spd: number; still: number }): boolean {
  return f.acc > FILTERS.acc.limits[sel.acc] || f.kmh > FILTERS.spd.limits[sel.spd] || (sel.still === 0 && f.still);
}

/** R8 policy toggles (index 0 is the expensive default). */
export const POLICIES = {
  sampling: { label: "Sampling", options: ["every 2 s", "on turns"] },
  snap: { label: "Snap to roads", options: ["every fix", "per delivery"] },
} as const;

export const GAP_OPTIONS = ["Straight line", 'Dotted "no readings"', "Likely route", "Flag: impossible"] as const;

/** R5 rule from the doc: < 6 km/h dotted, < 150 km/h likely, else flag. Straight is never right. */
export function gapAnswer(g: { km: number; min: number }): 1 | 2 | 3 {
  const kmh = g.km / (g.min / 60);
  return kmh < 6 ? 1 : kmh < 150 ? 2 : 3;
}
