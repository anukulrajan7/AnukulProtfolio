// Chapter 3 · The one who left (Ravi): 2020 at 2 am → 2026 at his dad's chai shop.
import { audio } from "../../engine/audio";
import { C } from "../../engine/palette";
import { Actor } from "../../engine/rig";
import { buildHome, buildStreet, STREET } from "../../world/scenes";
import type { Game } from "../core";
import { resetWorld, sit } from "../script";
import { chapterCard, eraCard, giveKeepsake, noTab, spots } from "./kit";

function raviSelf(g: Game) {
  g.playerName = "Ravi";
  g.you.kind = "walker";
}

export async function ravi(g: Game) {
  await g.enter(C.cobalt, async () => {
    g.setScene(buildHome("past"), 474);
    resetWorld(g);
    raviSelf(g);
    noTab(g);
    spots(g, []);
    g.world.laptop = "error";
    g.env.clock = 2 * 60 + 4;
    g.env.evening = 1;
    g.env.light = false;
    sit(g, 474);
    g.you.posture = 0.55;
    g.you.setMood("tired");
    g.ui.set({ chapter: "Ch 3 · The one who left" });
    await chapterCard(g, 3, "Ravi", "The one who left");
    await eraCard(g, "past", "2020 · before AI", "Ravi is a developer. It's his third 2 am this week.");
  });
  g.checkpoint("ravi");
  g.setGoal("Fix the server. Again.");
  g.you.anim = "type";
  const nights: [number, string][] = [
    [2 * 60 + 4, "2:04 am. Server down."],
    [2 * 60 + 51, "2:51 am. Down again."],
    [3 * 60 + 30, "3:30 am. Down again."],
  ];
  g.setHint("Press E or tap the button.");
  for (const [clock, line] of nights) {
    g.env.clock = clock;
    await g.press("Fix it");
    g.setHint(null);
    audio.ui("buzz");
    await g.wait(0.6);
    await g.say("narrator", line);
  }
  g.you.anim = "sit";
  g.you.posture = 0.15;
  g.you.setMood("tired");
  await g.say("narrator", "His dad calls. 'Beta, the shop needs help. And you sound tired.'");
  const c = await g.choose([{ text: "Quit. Help Dad's shop." }, { text: "Stay one more year." }]);
  if (c === 1) await g.say("narrator", "He stays one more year. It doesn't get better.");
  await g.press("Close the laptop");
  g.world.laptop = "dark";
  audio.ui("pocket");
  await g.say("narrator", "Ravi left tech in 2020. He didn't write code for five years.");

  // 2026: the chai stall
  await g.transition(C.cobalt, async () => {
    g.setScene(buildStreet(), STREET.chaiX - 70);
    resetWorld(g);
    raviSelf(g);
    spots(g, []);
    g.scene.walkMin = STREET.chaiX - 160;
    g.scene.walkMax = STREET.chaiX + 120;
    g.env.clock = 16 * 60;
    g.env.evening = 0.2;
    g.env.light = true;
    g.you.facing = 1;
    g.you.posture = 0.9;
    g.you.setMood("neutral");
    g.tab.size = 32;
    const dad = g.npc("dad", new Actor("chaiwala", STREET.chaiX + 6, 298, 31));
    dad.facing = -1;
    g.npc("customer", new Actor("manager", STREET.chaiX - 330, 308, 81));
    g.ui.set({ chapter: "Ch 3 · The one who left" });
    await eraCard(g, "ai", "2026 · with AI", "Ravi runs his dad's chai shop now. Something made him curious again.");
  });
  g.setGoal("Make a billing app for the shop.");
  const cust = g.npcs.customer;
  await g.say("you", "Tab, make a billing app. Chai, samosa, total. Simple.");
  await g.say("tab", "Done. Eight seconds.", { tab: "proud" });
  await g.say("you", "In 2020, that was my whole month.", { mood: "happy" });
  await g.walk(cust, STREET.chaiX - 140);
  cust.facing = 1;
  await g.say("customer", "Bhaiya, you charged me two times!");
  g.setGoal("Fix the double bill.");
  g.setHint("Tab key or F: accept · hold Q: look closer · R: not this");
  g.inspectNote = "A wait only hides it. The real bug: every tap on Pay sends a new bill.";
  const r = await g.suggest("Copy Tab's fix: add a 2-second wait");
  g.setHint(null);
  g.inspectNote = null;
  if (r.choice === "accept") {
    g.run.ledger.acceptBad++;
    await g.say("narrator", "The next customer taps three times and is charged three times.");
    await g.say("you", "Okay. Tab, explain it. Plain words.", { mood: "worried" });
  } else {
    g.run.ledger.rejectGood++;
    if (r.inspected) g.run.understanding++;
    g.tab.mood = "neutral";
    await g.say("you", "Explain it first. Plain words.");
  }
  await g.say("tab", "If someone taps Pay twice, I send two bills.", { tab: "think" });
  await g.say("you", "So, one bill per order. Even if they tap ten times.", { mood: "proud" });
  await g.say("tab", "…That's better than mine.", { tab: "sad" });
  await g.say("you", "I left because it was too much. Now it's fast. But I still need to know why.");
  await g.say("dad", "Beta, you look happy. First time in years.", { mood: "happy" });
  await g.say("narrator", "Ravi took small coding jobs again. Daytime only.");
  await giveKeepsake(g, "why");
}
