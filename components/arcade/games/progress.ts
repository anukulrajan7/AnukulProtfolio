// Level progression saved in localStorage. One JSON blob, versioned.
// Arcade and Learn tracks share the store; Learn ids look like "stacker-learn-3".

import type { MiniGameId } from "../types";
import { GAME_IDS, LEVELS } from "./levels";
import type { LevelDef } from "./levels";
import { LEARN } from "./concepts";

export type Track = "arcade" | "learn";

export interface LevelRecord {
  stars: number;
  bestScore: number;
  bestMs: number;
  plays: number;
  /** ISO date of the first clear (certificate). */
  clearedAt?: string;
}

export interface GameProgress {
  levels: Record<string, LevelRecord>;
}

export type Progress = Record<MiniGameId, GameProgress>;

const KEY = "arcade:progress:v1";
export const PROGRESS_EVENT = "arcade:progress";

export function ladder(game: MiniGameId, track: Track): LevelDef[] {
  return track === "learn" ? LEARN[game] : LEVELS[game];
}

function empty(): Progress {
  return { stacker: { levels: {} }, pingback: { levels: {} }, route: { levels: {} } };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const out = empty();
    for (const g of GAME_IDS) {
      if (parsed[g]?.levels) out[g].levels = parsed[g]!.levels;
    }
    return out;
  } catch {
    return empty();
  }
}

function save(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function recordLevel(game: MiniGameId, levelId: string, stars: number, score: number, ms: number): LevelRecord {
  const p = loadProgress();
  const prev = p[game].levels[levelId] ?? { stars: 0, bestScore: 0, bestMs: 0, plays: 0 };
  const next: LevelRecord = {
    stars: Math.max(prev.stars, stars),
    bestScore: Math.max(prev.bestScore, score),
    bestMs: stars > 0 ? (prev.bestMs > 0 ? Math.min(prev.bestMs, ms) : ms) : prev.bestMs,
    plays: prev.plays + 1,
    clearedAt: prev.clearedAt ?? (stars > 0 ? new Date().toISOString().slice(0, 10) : undefined),
  };
  p[game].levels[levelId] = next;
  save(p);
  return next;
}

export function isUnlocked(p: Progress, game: MiniGameId, n: number, track: Track = "arcade"): boolean {
  if (n <= 1) return true;
  const prev = ladder(game, track)[n - 2];
  return !!prev && (p[game].levels[prev.id]?.stars ?? 0) >= 1;
}

export function starsEarned(p: Progress, game: MiniGameId, track: Track = "arcade"): number {
  return ladder(game, track).reduce((sum, l) => sum + (p[game].levels[l.id]?.stars ?? 0), 0);
}

export function starsPossible(game: MiniGameId, track: Track = "arcade"): number {
  return ladder(game, track).length * 3;
}

/** First level that is unlocked but not yet cleared; falls back to the last. */
export function nextLevel(p: Progress, game: MiniGameId, track: Track = "arcade"): number {
  const ls = ladder(game, track);
  for (const l of ls) {
    if ((p[game].levels[l.id]?.stars ?? 0) === 0 && isUnlocked(p, game, l.n, track)) return l.n;
  }
  return ls.length;
}

export function levelsCleared(p: Progress, game: MiniGameId, track: Track = "arcade"): number {
  return ladder(game, track).filter((l) => (p[game].levels[l.id]?.stars ?? 0) > 0).length;
}

/** Glossary term ids unlocked by cleared Learn levels. */
export function unlockedTerms(p: Progress, game: MiniGameId): Set<string> {
  const out = new Set<string>();
  for (const l of LEARN[game]) {
    if ((p[game].levels[l.id]?.stars ?? 0) > 0) for (const t of l.copy?.glossary ?? []) out.add(t);
  }
  return out;
}

const TRACK_KEY = (g: MiniGameId) => `arcade:${g}:track`;

export function loadTrack(game: MiniGameId): Track {
  try {
    const v = localStorage.getItem(TRACK_KEY(game));
    return v === "arcade" ? "arcade" : "learn";
  } catch {
    return "learn";
  }
}

export function saveTrack(game: MiniGameId, t: Track): void {
  try {
    localStorage.setItem(TRACK_KEY(game), t);
  } catch {
    /* ignore */
  }
}
