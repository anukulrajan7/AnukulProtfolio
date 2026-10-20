// Hand-tuned level ladders for the three arcade games, plus the star rule.
// Each level is a story-mode goal (reuses the MiniGameProps contract) with a
// small bag of params the game reads in reset(). Level 1 of every game is a
// short tutorial that teaches by doing.

import type { MiniGameGoal, MiniGameId, MiniGameResult } from "../types";

export interface LevelParams {
  /** Teach-by-doing prompts; the game advances through its tutorial steps. */
  tutorial?: boolean;
  // Stacker
  startLevel?: number;
  garbage?: number;
  /** Column shared by every garbage row (one deep well). */
  garbageGap?: number;
  /** Restrict the bag to these piece kinds (0..6 = I O T S Z J L). */
  pieceSet?: number[];
  noGhost?: boolean;
  noHold?: boolean;
  firstPieces?: number[];
  // Pingback
  speedMul?: number;
  /** Ping speed multiplier (network latency in Learn P7). */
  bulletSpeedMul?: number;
  /** Ping lifetime in seconds (a request timeout). */
  bulletLife?: number;
  startWave?: number;
  lives?: number;
  maxBullets?: number;
  // Route
  obstacles?: number;
  growPer?: number;
}

/** Learn-track copy. Text budget: intro ≤ 2 sentences, learned ≤ 2 lines, snippet ≤ 6 lines, learnMore ≤ 80 words. */
export interface ConceptCopy {
  /** Short concept chip, e.g. "HEAP". */
  chip: string;
  intro: string;
  learned: string;
  snippet: string;
  lang?: "js" | "ts" | "sql";
  misconception: string;
  /** Collapsed "Learn more": includes the honest-simplification note. */
  learnMore?: string;
  /** Glossary term ids unlocked by clearing this level. */
  glossary: string[];
  /**
   * How the snippet test runs it (components/arcade/learn/__tests__):
   * prelude/postlude wrap the snippet, `expect` is the space-joined console
   * output, `throws` the expected error name. Omit for non-JS snippets.
   */
  test?: { prelude?: string; postlude?: string; async?: boolean; expect?: string; throws?: string };
}

/** Third-star rule: under par, "slips" (0 slips is enough), or a meta metric inside [min, max]. */
export type LearnThree = "par" | "slips" | { meta: string; min?: number; max?: number; hint: string };

export interface ConceptCard {
  title: string;
  text: string;
  /** Small code snippet shown in a mono block. */
  code?: string;
  lang?: string;
}

export interface LevelStep {
  desk: string;
  touch: string;
}

/**
 * Data-driven level. The curriculum (concept levels) drops in here: copy,
 * goal, rule modifiers (params), entity labels and the "what you learned"
 * card. Games only read params/labels/steps; everything else is UI.
 */
export interface LevelDef {
  id: string;
  n: number;
  /** Level title. */
  name: string;
  /** One-line twist shown on the level card. */
  blurb: string;
  /** Intro card copy on the start overlay (concept framing). Falls back to blurb. */
  intro?: string;
  goal: MiniGameGoal;
  /** Seconds for two stars; three stars at 70% of par. One star for finishing. */
  par: number;
  /** Rule modifiers read by the game in reset(). */
  params: LevelParams;
  /**
   * Labels for in-game entities, keyed per game:
   * Stacker: I O T S Z J L (piece kinds) · Pingback: ship big mid small · Route: ping bonus obstacle trail.
   */
  labels?: Record<string, string>;
  /** Positional overrides for the game's teach-by-doing prompts (tutorial levels). */
  steps?: LevelStep[];
  /** Pinned concept note over the canvas while playing. */
  concept?: { label: string; note?: string };
  /** "What you learned" card on the results screen after a win. */
  learned?: ConceptCard;
  /** "arcade" (default) or "learn" (concept curriculum). */
  track?: "arcade" | "learn";
  /** Learn-track copy (intro card, learned card, snippet, learn more). */
  copy?: ConceptCopy;
  /** Learn stars = understanding: ★ win, ★★ ≤ maxSlipsFor2 slips, ★★★ 0 slips + `three`. */
  learnStars?: { maxSlipsFor2: number; three: LearnThree };
  /** Game-specific Learn script (see games/concepts/types.ts). */
  script?: unknown;
}

export interface GameMeta {
  id: MiniGameId;
  name: string;
  tagline: string;
  blurb: string;
  noun: string;
  progressNoun: string;
  cover: "accent" | "lilac" | "mint";
  /** What the Learn track teaches, in the doc's words. */
  learns: string;
}

export const GAME_META: Record<MiniGameId, GameMeta> = {
  stacker: {
    id: "stacker",
    name: "Stacker",
    tagline: "Falling blocks, done properly",
    blurb: "Seven-piece bag, wall kicks, ghost piece, hold slot. Clear lines, climb levels, chase a Tetris.",
    noun: "pieces",
    progressNoun: "lines",
    cover: "accent",
    learns: "Where your data lives",
  },
  pingback: {
    id: "pingback",
    name: "Pingback",
    tagline: "A signal tower vs. the bugs",
    blurb: "Thrust has inertia, the screen wraps, big bugs split into small fast ones. Hold fire and keep moving.",
    noun: "bugs",
    progressNoun: "bugs",
    cover: "lilac",
    learns: "When your code runs",
  },
  route: {
    id: "route",
    name: "Route",
    tagline: "Snake on a GPS map",
    blurb: "Collect pins, grow the trail, do not cross it. Yellow pins pay five times but expire. Swipe to steer on phones.",
    noun: "pings",
    progressNoun: "deliveries",
    cover: "mint",
    learns: "What happens when code meets the real world",
  },
};

const L = (game: MiniGameId, n: number, name: string, blurb: string, goal: MiniGameGoal, par: number, params: LevelParams = {}): LevelDef => ({
  id: `${game}-${n}`,
  n,
  name,
  blurb,
  goal,
  par,
  params,
});

export const LEVELS: Record<MiniGameId, LevelDef[]> = {
  stacker: [
    L("stacker", 1, "First shift", "Move, rotate, drop. Then fill the gap.", { label: "Clear 1 line", target: 1 }, 25, { tutorial: true, garbage: 2, firstPieces: [0, 1, 2] }),
    L("stacker", 2, "Warm up", "No clock. Find your rhythm.", { label: "Clear 5 lines", target: 5 }, 70),
    L("stacker", 3, "Before standup", "Same job, with a clock.", { label: "Clear 6 lines in 1:30", target: 6, timeLimit: 90 }, 60),
    L("stacker", 4, "Garbage day", "Four rows of junk are already in the well.", { label: "Clear 8 lines", target: 8 }, 90, { garbage: 4 }),
    L("stacker", 5, "Faster now", "Starts at level 4 speed.", { label: "Clear 8 lines", target: 8 }, 80, { startLevel: 4 }),
    L("stacker", 6, "Blind drop", "No ghost piece. Trust your eyes.", { label: "Clear 10 lines", target: 10 }, 110, { noGhost: true, startLevel: 2 }),
    L("stacker", 7, "No safety net", "Hold is disabled. Every piece counts.", { label: "Clear 10 lines in 2:00", target: 10, timeLimit: 120 }, 90, { noHold: true, startLevel: 3 }),
    L("stacker", 8, "Deadline", "Level 5 speed, junk in the well, 90 seconds.", { label: "Clear 12 lines in 1:30", target: 12, timeLimit: 90 }, 75, { startLevel: 5, garbage: 3 }),
  ],
  pingback: [
    L("pingback", 1, "Boot sequence", "Turn, thrust, fire. Squash the first bugs.", { label: "Squash 3 bugs", target: 3 }, 30, { tutorial: true, speedMul: 0.6 }),
    L("pingback", 2, "Pest control", "Big bugs split. Chase the small ones.", { label: "Squash 10 bugs", target: 10 }, 60),
    L("pingback", 3, "Night shift", "Same swarm, with a clock.", { label: "Squash 15 bugs in 1:00", target: 15, timeLimit: 60 }, 45),
    L("pingback", 4, "Swarm", "They move faster now.", { label: "Squash 20 bugs", target: 20 }, 80, { speedMul: 1.3 }),
    L("pingback", 5, "One tower", "No respawns. Do not get touched.", { label: "Squash 15 bugs", target: 15 }, 70, { lives: 1 }),
    L("pingback", 6, "Low ammo", "Two pings in the air at a time, that is all.", { label: "Squash 20 bugs", target: 20 }, 90, { maxBullets: 2 }),
    L("pingback", 7, "Fast bugs", "Fast and many.", { label: "Squash 25 bugs in 1:30", target: 25, timeLimit: 90 }, 70, { speedMul: 1.5, startWave: 2 }),
    L("pingback", 8, "Incident call", "Wave 4 from the start, fast, two minutes.", { label: "Squash 30 bugs in 2:00", target: 30, timeLimit: 120 }, 90, { speedMul: 1.6, startWave: 4 }),
  ],
  route: [
    L("route", 1, "First delivery", "Steer with the arrows. Grab the pin.", { label: "Make 3 deliveries", target: 3 }, 30, { tutorial: true, speedMul: 0.75 }),
    L("route", 2, "Morning round", "A slow map. Learn the turns.", { label: "Make 8 deliveries", target: 8 }, 60),
    L("route", 3, "Rush hour", "Same round, with a clock.", { label: "Make 10 deliveries in 1:00", target: 10, timeLimit: 60 }, 45),
    L("route", 4, "Express", "Faster from the first pin.", { label: "Make 10 deliveries", target: 10 }, 55, { speedMul: 1.3 }),
    L("route", 5, "Roadworks", "Blocked cells on the map. Plan the line.", { label: "Make 12 deliveries", target: 12 }, 80, { obstacles: 10 }),
    L("route", 6, "Long haul", "Every pin grows the trail by two.", { label: "Make 15 deliveries", target: 15 }, 95, { growPer: 2 }),
    L("route", 7, "Tight streets", "Fast and cramped.", { label: "Make 12 deliveries in 1:15", target: 12, timeLimit: 75 }, 55, { speedMul: 1.5, obstacles: 6 }),
    L("route", 8, "Final mile", "Everything at once. Two minutes.", { label: "Make 20 deliveries in 2:00", target: 20, timeLimit: 120 }, 95, { speedMul: 1.4, obstacles: 14, growPer: 2 }),
  ],
};

export const GAME_IDS: MiniGameId[] = ["stacker", "pingback", "route"];

export function levelById(id: string): LevelDef | undefined {
  for (const g of GAME_IDS) {
    const l = LEVELS[g].find((x) => x.id === id);
    if (l) return l;
  }
  return undefined;
}

export interface StarInput {
  won: boolean;
  durationMs: number;
  slips?: number;
  meta?: Record<string, number>;
}

function threeMet(three: LearnThree, level: LevelDef, r: StarInput): boolean {
  if (three === "par") return r.durationMs / 1000 <= level.par;
  if (three === "slips") return true;
  const v = r.meta?.[three.meta];
  if (v === undefined) return false;
  if (three.min !== undefined && v < three.min) return false;
  if (three.max !== undefined && v > three.max) return false;
  return true;
}

/**
 * Arcade track: 1 for finishing, 2 under par, 3 under 70% of par.
 * Learn track (understanding, not speed): 1 for winning, 2 with at most
 * `maxSlipsFor2` slips, 3 with 0 slips and the level's efficiency rule.
 */
export function starsFor(level: LevelDef, result: StarInput): 0 | 1 | 2 | 3 {
  if (!result.won) return 0;
  if (level.track === "learn" && level.learnStars) {
    const slips = result.slips ?? 0;
    if (slips === 0 && threeMet(level.learnStars.three, level, result)) return 3;
    if (slips <= level.learnStars.maxSlipsFor2) return 2;
    return 1;
  }
  const s = result.durationMs / 1000;
  if (s <= level.par * 0.7) return 3;
  if (s <= level.par) return 2;
  return 1;
}

/** The results line that names the missing star and why (Learn track). */
export function starReason(level: LevelDef, result: StarInput & { lastSlip?: string }): string | null {
  if (!result.won || level.track !== "learn" || !level.learnStars) return null;
  const stars = starsFor(level, result);
  if (stars === 3) return null;
  const slips = result.slips ?? 0;
  if (slips > 0) {
    const what = slips === 1 ? "1 slip" : `${slips} slips`;
    return `${stars}★: ${what}${result.lastSlip ? `. Last one: ${result.lastSlip}` : ""}.`;
  }
  const three = level.learnStars.three;
  if (three === "slips") return null;
  return `${stars}★: ${three === "par" ? `clean run. Finish under ${Math.floor(level.par / 60)}:${String(Math.round(level.par % 60)).padStart(2, "0")} for the third star` : three.hint}.`;
}

export function starTargets(level: LevelDef): { two: number; three: number } {
  return { two: level.par, three: Math.round(level.par * 0.7) };
}
