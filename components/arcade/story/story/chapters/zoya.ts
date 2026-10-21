// Chapter 4 · The day Tab went down (Zoya): an easy morning with Tab, then an afternoon without it.
import { audio } from "../../engine/audio";
import { C } from "../../engine/palette";
import { Actor } from "../../engine/rig";
import { buildOffice, ROOM_FEET } from "../../world/scenes";
import type { Game } from "../core";
import { resetWorld, sit } from "../script";
import { chapterCard, eraCard, fadeTab, giveKeepsake, spots, tabAt, tidyOffice, walkIn } from "./kit";

export async function zoya(g: Game) {
  await g.enter(C.cobalt, async () => {
    g.setScene(buildOffice("now"), 794);
    resetWorld(g);
    g.playerName = "Zoya";
    g.you.kind = "zoya";
    tidyOffice(g);
    spots(g, []);
    g.env.clock = 14 * 60 + 20;
    g.env.evening = 0.1;
    g.env.light = true;
    sit(g, 794);
    g.you.anim = "type";
    g.you.posture = 0.9;
    g.you.setMood("happy");
    tabAt(g, 862, 150);
    g.npc("sen", new Actor("sen", 160, ROOM_FEET, 91));
    g.ui.set({ chapter: "Ch 4 · The day Tab went down" });
    await chapterCard(g, 4, "Zoya", "The day Tab went down");
    await eraCard(g, "ai", "2026 · with AI", "Zoya is 22. First job. She has never coded without AI.");
  });
  g.checkpoint("zoya");
  g.setGoal("Finish your first ticket.");
  const s = g.npcs.sen;
  await g.say("tab", "Your first ticket? Done. Your second one too.", { tab: "proud" });
  await g.say("you", "Easy. Why did everyone say this job is hard?", { mood: "happy" });
  await g.say("narrator", "Half her class stopped learning to code. 'AI does it,' they said.");
  await walkIn(g, s, 700);
  s.facing = 1;
  g.you.anim = "sit";
  g.you.facing = -1;
  await g.say("sen", "Welcome, Zoya. Ask me anything.");
  await g.say("you", "It's okay. Tab answers everything.");
  s.posture = 0.55;
  await g.say("sen", "Yeah. It does.", { mood: "tired" });

  // Tab goes down
  g.world.monitor = "error";
  g.env.clock = 15 * 60 + 10;
  g.env.evening = 0.3;
  g.you.facing = 1;
  g.you.anim = "type";
  for (let i = 0; i < 3; i++) {
    audio.ui("buzz");
    await g.wait(0.35);
  }
  await g.say("narrator", "3:10 pm. The checkout page is down. Customers can't pay.");
  const glitch = g.tab.glitch;
  g.tab.glitch = 0.8;
  await g.say("tab", "I'm… having… some… trouble…", { tab: "sad" });
  await fadeTab(g, true);
  g.tab.glitch = glitch;
  await g.say("narrator", "Tab is down. Everywhere.");
  await eraCard(g, "off", "2026 · without AI", "For one afternoon, there is no Tab.");
  g.setGoal("Fix the checkout. Without Tab.");
  await g.say("you", "Okay. No Tab. Um.", { mood: "worried" });
  const c = await g.choose([{ text: "Wait for Tab to come back" }, { text: "Read the error myself" }]);
  if (c === 0) {
    for (let i = 0; i < 2; i++) {
      await g.press("Refresh");
      audio.ui("buzz");
      await g.say("narrator", "Still down.");
    }
    g.you.facing = -1;
    g.you.anim = "sit";
    await g.say("sen", "Customers are leaving, Zoya.");
    g.you.facing = 1;
    g.you.anim = "type";
  }
  for (;;) {
    const i = await g.choose(
      [{ text: "Error: something went wrong" }, { text: "TypeError: price is undefined (cart.ts, line 88)" }, { text: "Warning: 400 old warnings" }],
      "Which line matters?",
    );
    if (i === 1) break;
    g.you.facing = -1;
    g.you.anim = "sit";
    await g.say("sen", "Read the whole error. Not the first line.");
    g.you.facing = 1;
    g.you.anim = "type";
  }
  g.run.understanding++;
  await g.say("you", "Price is undefined… the new item has no price!", { mood: "surprised" });
  await g.press("Add the price");
  audio.ui("accept");
  g.world.monitor = "ok";
  g.env.clock = 15 * 60 + 52;
  await g.say("narrator", "3:52 pm. Customers can pay again.");
  g.you.setMood("proud");
  g.you.facing = -1;
  g.you.anim = "sit";
  await g.say("sen", "You read the error. The whole error.");
  await g.say("you", "Is that what you all did? Before?");
  s.posture = 1;
  await g.say("sen", "Every single day.", { mood: "happy" });
  g.you.facing = 1;
  g.you.anim = "type";
  await fadeTab(g, false);
  await g.say("tab", "I'm back! Did I miss anything?", { tab: "eager" });
  await g.say("you", "Nope. Handled it.", { mood: "proud" });
  await g.say("you", "Next week I join the live-location team. With Anukul.");
  await giveKeepsake(g, "read");
}
