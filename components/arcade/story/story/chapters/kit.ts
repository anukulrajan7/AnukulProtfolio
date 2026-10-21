// Small helpers the new chapters share.
import { C } from "../../engine/palette";
import type { Actor } from "../../engine/rig";
import { ROOM_FEET } from "../../world/scenes";
import type { Hotspot } from "../../world/types";
import type { Game } from "../core";

/** Replace the scene's glints with only the ones this beat uses. */
export function spots(g: Game, list: Hotspot[]) {
  g.scene.hotspots = list;
}

export function chapterCard(g: Game, n: number, who: string, title: string) {
  return g.showCard(`Chapter ${n} of 5 · ${who}`, title, "", C.cobalt, C.paper, 2.4);
}

export function eraCard(g: Game, kind: "past" | "ai" | "off", title: string, sub: string) {
  const [bg, fg] = kind === "past" ? ["#EFE2C6", C.ink] : kind === "off" ? [C.ink, C.paper] : [C.cobalt, C.paper];
  return g.showCard("", title, sub, bg, fg, 3.2);
}

/** Before-AI parts and Anukul 2023: Tab is not in the room. */
export function noTab(g: Game) {
  g.tab.visible = false;
  g.tabFollow = false;
}

/** Tab hovers beside the monitor while you sit. */
export function tabAt(g: Game, x: number, y: number) {
  g.tabFollow = false;
  g.tab.size = 32;
  g.tab.x = g.tab.targetX = x;
  g.tab.y = g.tab.targetY = y;
}

/** Office for the new chapters: the board is tidy, nothing of the field test is on the desk. */
export function tidyOffice(g: Game) {
  g.world.boardBack = g.world.boardTarget = 1;
  g.world.idOnDesk = false;
  g.world.phoneOnDesk = false;
}

export async function fadeTab(g: Game, out: boolean) {
  if (out) {
    await g.until(() => (g.tab.hide = Math.min(1, g.tab.hide + 1 / 60 / 0.9)) >= 1);
    g.tab.visible = false;
  } else {
    g.tab.hide = 1;
    g.tab.visible = true;
    await g.until(() => (g.tab.hide = Math.max(0, g.tab.hide - 1 / 60 / 0.9)) <= 0);
  }
}

/** An NPC strolls on from the left, standing on the floor. */
export async function walkIn(g: Game, a: Actor, x: number) {
  a.y = ROOM_FEET;
  a.anim = "idle";
  await g.walk(a, x);
}

/** An NPC leaves to the left and is gone (an empty chair stays). */
export async function walkOut(g: Game, a: Actor, x: number) {
  await g.walk(a, x);
  a.visible = false;
}

/** A glinting thing at the player's desk. */
export function spot(id: string, x: number, gy: number, label: string, kind: Hotspot["kind"] = "use", r = 18): Hotspot {
  return { id, x, r, gy, label, kind };
}

/** Hold a keepsake up for a moment, then pocket it. */
export async function giveKeepsake(g: Game, id: string) {
  g.you.held = "card";
  g.keepsake(id);
  await g.wait(1.6);
  g.you.held = null;
}
