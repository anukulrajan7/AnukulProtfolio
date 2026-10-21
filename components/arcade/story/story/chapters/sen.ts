// Chapter 2 · All the answers (Sen): 2016, everyone comes to his desk → 2026, nobody does.
import { audio } from "../../engine/audio";
import { C } from "../../engine/palette";
import { Actor } from "../../engine/rig";
import { buildOffice, ROOM_FEET } from "../../world/scenes";
import type { Game } from "../core";
import { resetWorld, sit, stand } from "../script";
import { chapterCard, eraCard, giveKeepsake, noTab, spot, spots, tabAt, tidyOffice, walkIn } from "./kit";

function senSelf(g: Game) {
  g.playerName = "Sen";
  g.you.kind = "sen";
}

export async function sen(g: Game) {
  await g.enter(C.cobalt, async () => {
    g.setScene(buildOffice("past"), 794);
    resetWorld(g);
    senSelf(g);
    noTab(g);
    tidyOffice(g);
    // 2016: no AI chat on the screen
    g.world.monitor = "dark";
    spots(g, []);
    g.env.clock = 11 * 60 + 5;
    g.env.evening = 0.1;
    g.env.light = true;
    sit(g, 794);
    g.you.anim = "type";
    g.you.posture = 0.95;
    g.you.setMood("happy");
    g.npc("arjun", new Actor("manager", 160, ROOM_FEET, 71));
    g.ui.set({ chapter: "Ch 2 · All the answers" });
    await chapterCard(g, 2, "Sen", "All the answers");
    await eraCard(g, "past", "2016 · before AI", "Sen has been coding for ten years. Everyone comes to his desk.");
  });
  g.checkpoint("sen");
  g.setGoal("Help the juniors.");
  const a = g.npcs.arjun;
  await walkIn(g, a, 700);
  a.facing = 1;
  g.you.anim = "sit";
  g.you.facing = -1;
  await g.say("arjun", "Sen bhaiya, the build is broken.");
  await g.say("you", "Line 40. You forgot to wait for the data.");
  const asks: [string, string][] = [
    ["Sen bhaiya, what's a race condition?", "Two people editing one file at once. Someone loses."],
    ["Sen bhaiya, the server is down!", "Restart the queue. Then tell me who changed the config."],
    ["Sen bhaiya, chai?", "Always."],
  ];
  g.setHint("Press E or tap Help.");
  for (const [q, answer] of asks) {
    void g.say("arjun", q, { bark: 12 });
    await g.press("Help");
    audio.ui("pick");
    await g.say("you", answer, { mood: "happy" });
  }
  g.setHint(null);
  await g.say("narrator", "He knows every bug in this building by heart. It feels good to be needed.");

  // 2026
  await g.transition(C.cobalt, async () => {
    g.setScene(buildOffice("now"), 794);
    resetWorld(g);
    senSelf(g);
    tidyOffice(g);
    spots(g, []);
    g.env.clock = 11 * 60 + 5;
    g.env.evening = 0.1;
    g.env.light = true;
    sit(g, 794);
    g.you.anim = "sit";
    g.you.posture = 0.7;
    g.you.setMood("tired");
    tabAt(g, 900, 150);
    g.npc("arjun", new Actor("manager", 160, ROOM_FEET, 71));
    g.ui.set({ chapter: "Ch 2 · All the answers" });
    await eraCard(g, "ai", "2026 · with AI", "Ten years later. Nobody comes to his desk.");
  });
  g.setGoal("Wait for someone to ask you something.");
  const b = g.npcs.arjun;
  await walkIn(g, b, 905);
  b.facing = 1;
  await g.say("arjun", "Tab, why is the build broken?");
  await g.say("tab", "Line 40. You forgot to wait for the data.", { tab: "proud" });
  await g.say("arjun", "Thanks, Tab!");
  g.you.posture = 0.45;
  await g.say("you", "That was my line.", { mood: "tired" });
  await g.walk(b, 330);
  await g.say("narrator", "His old friend Kiran left tech last month. 'The machine knows more than us now,' Kiran said.");

  const f = { mail: false, review: false };
  stand(g);
  g.you.facing = 1;
  g.tabFollow = true;
  spots(g, [spot("mail", 858, 186, "Draft email: Resignation"), spot("review", 930, 224, "Tab's big change (needs review)")]);
  g.on("mail", async () => {
    g.you.facing = 1;
    g.you.gesture("carry", 1.4);
    g.world.monitor = "chat";
    await g.wait(1.2);
    await g.say("narrator", "He doesn't send it. Not yet.");
    g.scene.hotspots.find((h) => h.id === "mail")!.done = true;
    f.mail = true;
  });
  g.on("review", async () => {
    g.setGoal("Review Tab's change.");
    g.you.facing = 1;
    g.setHint("Tab key or F: accept · hold Q: look closer · R: not this");
    g.inspectNote = "Line 1,412 deletes 'old' users. 'Old' means anyone who joined before 2020. That's half the customers.";
    const r = await g.suggest("Ship Tab's database clean-up (2,000 lines)");
    g.setHint(null);
    g.inspectNote = null;
    if (r.choice === "accept") {
      g.run.ledger.acceptBad++;
      g.world.monitor = "error";
      for (let i = 0; i < 3; i++) {
        audio.ui("buzz");
        await g.wait(0.4);
      }
      await walkIn(g, b, 880);
      b.facing = -1;
      await g.say("arjun", "Half the users just vanished!", { mood: "surprised" });
      await g.say("you", "Undo. Now. …I should have read it.", { mood: "worried" });
      await g.say("narrator", "They restore it.");
      g.world.monitor = "ok";
      g.tab.mood = "sad";
    } else {
      g.run.ledger.rejectGood++;
      if (r.inspected) g.run.understanding++;
      await g.say("you", "Line 1,412. You'd delete half our customers.", { mood: "proud" });
      await g.say("tab", "…How did you see that so fast?", { tab: "think" });
      await g.say("you", "Ten years of breaking things.", { mood: "happy" });
    }
    g.scene.hotspots.find((h) => h.id === "review")!.done = true;
    f.review = true;
  });
  await g.explore(() => f.mail && f.review, () => (!f.mail ? { x: 858, use: "mail" } : { x: 930, use: "review" }));
  g.setGoal(null);

  await walkIn(g, b, 710);
  b.facing = 1;
  g.you.facing = -1;
  await g.say("arjun", "Sen bhaiya… can you check mine too?");
  g.you.posture = 1;
  g.you.setMood("happy");
  g.you.gesture("hop", 0.6);
  await g.wait(0.6);
  await g.say("you", "The machine writes. Someone still has to know what to check.", { mood: "proud" });
  await giveKeepsake(g, "check");
}
