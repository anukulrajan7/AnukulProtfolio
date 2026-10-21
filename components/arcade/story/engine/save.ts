// arcade:story:v3 save + prefs. Older saves (v1, v2) are ignored.
import type { Ledger } from "../story/types";
import type { Fix } from "../world/map";

export const SAVE_KEY = "arcade:story:v3";
export const PREFS_KEY = "arcade:story:prefs:v2";

export interface SaveData {
  v: 3;
  chapter: string;
  checkpoint: string;
  flags: Record<string, boolean | number | string>;
  ledger: Ledger;
  keepsakes: string[];
  people: number;
  chai: number;
  understanding: number;
  name: string;
  endingsSeen: string[];
  runs: number;
  finished: boolean;
  updatedAt: number;
  /** Walk readings, kept so Continue at the replay still has your walk. */
  fixes?: Fix[];
}

export type TextSize = "s" | "m" | "l";
export type Motion = "auto" | "reduce" | "full";

export interface Prefs {
  sound: boolean;
  volume: number;
  storyOnly: boolean;
  textSize: TextSize;
  motion: Motion;
  acceptKey: "tab" | "f";
}

export const defaultPrefs: Prefs = { sound: false, volume: 0.8, storyOnly: false, textSize: "m", motion: "auto", acceptKey: "tab" };

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    // literal list, not CHECKPOINTS: importing script.ts here would be circular
    const ids = ["prologue", "meera", "sen", "ravi", "zoya", "anukul", "office", "street", "replay", "finale", "done"];
    if (d?.v !== 3 || !ids.includes(d.checkpoint) || !Array.isArray(d.keepsakes) || typeof d.ledger !== "object" || typeof d.flags !== "object" || !d.ledger || !d.flags) return null;
    return d;
  } catch {
    return null;
  }
}

export function writeSave(d: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
  } catch {
    /* private mode or full disk: the game still plays */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return { ...defaultPrefs, ...p };
  } catch {
    return defaultPrefs;
  }
}

export function writePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Cross-run memory (Hades-style lines). Survives "New run". */
export interface Memory {
  runs: number;
  lakeLine: boolean;
  honest: boolean;
}
const MEM_KEY = "arcade:story:memory";
export function loadMemory(): Memory {
  try {
    const m = JSON.parse(localStorage.getItem(MEM_KEY) || "null") as Partial<Memory> | null;
    return { runs: m?.runs ?? 0, lakeLine: !!m?.lakeLine, honest: !!m?.honest };
  } catch {
    return { runs: 0, lakeLine: false, honest: false };
  }
}
export function writeMemory(m: Memory) {
  try {
    localStorage.setItem(MEM_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}
