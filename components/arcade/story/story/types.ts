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

export type Who = "you" | "tab" | "zoya" | "chaiwala" | "walker" | "narrator" | "chintu" | "sen" | "arjun" | "boss" | "customer" | "dad";

export interface KeepsakeDef {
  id: string;
  name: string;
  meaning: string;
  piece: string;
}

/** Eight shelf slots across the full game. */
export const KEEPSAKES: KeepsakeDef[] = [
  { id: "listen", name: "A sticky note: call the customer", meaning: "I ask the real people.", piece: "I ask the real people." },
  { id: "check", name: "A red pen", meaning: "I know what to check.", piece: "I know what to check." },
  { id: "why", name: "A chai shop bill", meaning: "I ask why before I copy.", piece: "I ask why before I copy." },
  { id: "read", name: "A printed error log", meaning: "I read the whole error.", piece: "I read the whole error." },
  { id: "plain", name: "A notebook page of stars", meaning: "I think in plain words first.", piece: "I think in plain words first." },
  { id: "look", name: "The scuffed test phone", meaning: "I go and look.", piece: "I go and look." },
  { id: "sorry", name: "A card: moved back, sorry", meaning: "I tell the truth when I'm wrong.", piece: "I tell the truth when I'm wrong." },
  { id: "unknown", name: "A map label that says unknown", meaning: "I say unknown when I don't know.", piece: "I say unknown when I don't know." },
];
export const SHELF_SLOTS = 8;

export const PEOPLE = [
  { id: "meera", name: "Meera", years: "2018 → 2026", line: "Started coding late" },
  { id: "sen", name: "Sen", years: "2016 → 2026", line: "The senior everyone asked" },
  { id: "ravi", name: "Ravi", years: "2020 → 2026", line: "Left, then came back" },
  { id: "zoya", name: "Zoya", years: "2026", line: "Never coded without AI" },
  { id: "anukul", name: "Anukul", years: "2019 → 2026", line: "Me" },
] as const;

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
  screen: "title" | "pick" | "play" | "end";
  chapter: string;
  goal: string | null;
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
