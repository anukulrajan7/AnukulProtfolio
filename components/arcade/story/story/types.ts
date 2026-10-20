import type { Prefs } from "../engine/save";
import type { Seg, Stamp } from "../world/map";

export interface Ledger {
  acceptGood: number;
  acceptBad: number;
  rejectGood: number;
  rejectBad: number;
  inspected: number;
}

export const freshLedger = (): Ledger => ({ acceptGood: 0, acceptBad: 0, rejectGood: 0, rejectBad: 0, inspected: 0 });

export interface RunState {
  flags: Record<string, boolean | number | string>;
  ledger: Ledger;
  keepsakes: string[];
  people: number;
  chai: number;
  understanding: number;
  name: string;
}

export const freshRun = (name = ""): RunState => ({ flags: {}, ledger: freshLedger(), keepsakes: [], people: 0, chai: 0, understanding: 0, name });

export type Who = "you" | "tab" | "zoya" | "chaiwala" | "walker" | "narrator";

export interface KeepsakeDef {
  id: string;
  name: string;
  meaning: string;
  piece: string;
}

/** Seven shelf slots across the full game; the slice can earn three. */
export const KEEPSAKES: KeepsakeDef[] = [
  { id: "look", name: "The scuffed test phone", meaning: "I go and look.", piece: "I go and look." },
  { id: "sorry", name: "A card: moved back, sorry", meaning: "I tell the truth when I'm wrong.", piece: "I tell the truth when I'm wrong." },
  { id: "unknown", name: "A map label that says unknown", meaning: "I say unknown when I don't know.", piece: "I say unknown when I don't know." },
];
export const SHELF_SLOTS = 7;

export interface BubbleUi {
  id: number;
  who: Who;
  name: string;
  text: string;
  shown: number;
  kind: "human" | "tab" | "narration";
  blocking: boolean;
  voice?: string;
}

export interface ChoiceUi {
  id: number;
  prompt?: string;
  options: { text: string; voice?: string }[];
}

export interface SuggestUi {
  id: number;
  title: string;
  inspecting: boolean;
  inspected: boolean;
}

export interface CardUi {
  kicker: string;
  title: string;
  sub?: string;
  bg: string;
  fg: string;
}

export interface SlotUi {
  id: number;
  prompt: string;
  pieces: { id: string; text: string }[];
  placed: string[];
  max: number;
}

export interface StampUi {
  id: number;
  selected: Seg;
  stamps: Partial<Record<Seg, Stamp>>;
}

export interface EndUi {
  accepted: number;
  wrong: number;
  caught: number;
  inspected: number;
  keepsakes: string[];
  honest: boolean;
}

export interface Ui {
  screen: "title" | "play" | "end";
  chapter: string;
  bubble: BubbleUi | null;
  choices: ChoiceUi | null;
  prompt: { id: string; label: string; verb: string } | null;
  action: { label: string } | null;
  suggest: SuggestUi | null;
  card: CardUi | null;
  slot: SlotUi | null;
  stamp: StampUi | null;
  end: EndUi | null;
  hint: string | null;
  keepsakes: string[];
  newKeepsake: string | null;
  paused: boolean;
  prefs: Prefs;
  hasSave: boolean;
  log: { who: string; text: string }[];
}
