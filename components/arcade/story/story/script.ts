// Five developers, before AI and after. Each function in chapters/ is a checkpoint; Continue resumes at the start of one.
import { freshWorld } from "../world/types";
import { ROOM_FEET, SIT_Y } from "../world/scenes";
import { anukul } from "./chapters/anukul";
import { finale } from "./chapters/finale";
import { office, replay, street } from "./chapters/field-test";
import { meera } from "./chapters/meera";
import { prologue } from "./chapters/prologue";
import { ravi } from "./chapters/ravi";
import { sen } from "./chapters/sen";
import { zoya } from "./chapters/zoya";
import { clearSave, recordMemory } from "../engine/save";
import { Abort, type Game } from "./core";
import { PEOPLE } from "./types";
import { C } from "../engine/palette";

export const CHECKPOINTS = ["prologue", "meera", "sen", "ravi", "zoya", "anukul", "office", "street", "replay", "finale"] as const;
export type Checkpoint = (typeof CHECKPOINTS)[number];

export const GROUPS: Record<string, Checkpoint[]> = {
  meera: ["meera"],
  sen: ["sen"],
  ravi: ["ravi"],
  zoya: ["zoya"],
  anukul: ["anukul", "office", "street", "replay"],
};

export async function runSlice(g: Game, from: string, only?: string) {
  g.only = only;
  const group = only ? GROUPS[only] : undefined;
  const last = group ? CHECKPOINTS.indexOf(group[group.length - 1]) : CHECKPOINTS.length - 1;
  const steps: Record<Checkpoint, (g: Game) => Promise<void>> = { prologue, meera, sen, ravi, zoya, anukul, office, street, replay, finale };
  let i = Math.max(0, CHECKPOINTS.indexOf(from as Checkpoint));
  try {
    for (; i <= last; i++) await steps[CHECKPOINTS[i]](g);
    if (only) {
      recordMemory([only], g.run.keepsakes);
      clearSave();
      g.ui.set({ hasSave: false });
      const name = PEOPLE.find((p) => p.id === only)?.name ?? "";
      await g.showCard("", `${name}'s story is done.`, "Pick another person, or play the whole story.", C.ink, C.paper, 2.6);
      g.resetScripts();
      g.ui.set({ screen: "pick", card: null, paused: false });
    }
  } catch (e) {
    if (!(e instanceof Abort)) console.error(e);
  }
}

/** Fresh scene state. Chapters set their own player kind/name after calling this. */
export function resetWorld(g: Game) {
  Object.assign(g.world, freshWorld());
  g.tickers.clear();
  g.setAction(null);
  g.setGoal(null);
  g.setHint(null);
  g.inspectNote = null;
  g.camFocus = null;
  g.cam.punchIn(false);
  g.tabScreen = false;
  g.tabFollow = true;
  g.replay = null;
  g.basement = null;
  g.showMap = false;
  g.playerName = "Anukul";
  const y = g.you;
  y.kind = "you";
  y.held = null;
  y.lanyard = false;
  y.bag = false;
  y.speed = 72;
  y.anim = "idle";
  y.visible = true;
  y.setMood("neutral");
  g.tab.visible = true;
  g.tab.hide = 0;
  g.tab.holding = null;
  g.tab.mood = "neutral";
  // Tab's body carries your calibration: blind accepts make it bigger and glitchy.
  const bad = g.run.ledger.acceptBad;
  g.tab.glitch = Math.min(0.8, bad * 0.5);
}

export function sit(g: Game, x: number) {
  g.you.x = x;
  g.you.y = SIT_Y;
  g.you.facing = 1;
  g.you.anim = "sit";
  g.you.vx = 0;
}

export function stand(g: Game) {
  g.you.y = ROOM_FEET;
  g.you.anim = "idle";
}
