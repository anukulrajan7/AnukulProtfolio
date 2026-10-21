// Chapter 1 · The late start (Meera): 2018 at night → 2026 at the office.
import { audio } from "../../engine/audio";
import { C } from "../../engine/palette";
import { Actor } from "../../engine/rig";
import { buildHome, buildOffice, ROOM_FEET } from "../../world/scenes";
import type { Game } from "../core";
import { resetWorld, sit, stand } from "../script";
import { chapterCard, eraCard, giveKeepsake, noTab, spot, spots, tabAt, tidyOffice, walkIn } from "./kit";

function meeraSelf(g: Game) {
  g.playerName = "Meera";
  g.you.kind = "manager";
}

export async function meera(g: Game) {
  await g.enter(C.cobalt, async () => {
    g.setScene(buildHome("past"), 300);
    resetWorld(g);
    meeraSelf(g);
    noTab(g);
    g.world.laptop = "lesson";
    g.env.clock = 23 * 60 + 40;
    g.env.evening = 1;
    g.env.light = false;
    g.you.posture = 0.6;
    g.you.setMood("tired");
    spots(g, [spot("bed", 160, 236, "Her son", "look", 60), spot("laptop", 532, 200, "Laptop", "use", 40)]);
    g.ui.set({ chapter: "Ch 1 · The late start" });
    await chapterCard(g, 1, "Meera", "The late start");
    await eraCard(g, "past", "2018 · before AI", "Meera is 31. She works at a bank. At night, she learns to code.");
  });
  g.checkpoint("meera");
  g.setGoal("Finish the video lesson before your son wakes up.");
  const f = { laptop: false };
  await g.say("narrator", "It is 11:40 at night, in 2018.");
  await g.say("narrator", "Meera's bank job ended at 6. Her real work starts now.");
  g.on("bed", async () => {
    g.you.facing = -1;
    g.bark("you", "Sleeping. Good.");
    await g.wait(0.6);
  });
  g.on("laptop", async () => {
    f.laptop = true;
  });
  await g.explore(() => f.laptop, { x: 532, use: "laptop" });
  await g.walk(g.you, 474);
  sit(g, 474);
  g.you.anim = "type";
  g.setHint("Press E or tap the button.");
  await g.press("Play lesson");
  g.setHint(null);
  audio.ui("pick");
  g.world.buildT = 0.3;
  await g.say("narrator", "The teacher talks fast. 'Just use a closure,' he says.");
  await g.say("you", "What is a closure?", { mood: "worried" });
  await g.press("Rewind");
  g.world.buildT = 0.1;
  await g.say("you", "Again.");
  await g.press("Rewind");
  g.world.buildT = 0.1;
  await g.say("you", "Again. Slower, please.");
  g.world.buildT = 0.35;
  await g.say("narrator", "Her son coughs in his sleep.");
  await g.say("you", "Shh. Five more minutes.", { mood: "tired" });
  const c = await g.choose([{ text: "Pause and look it up" }, { text: "Keep watching and hope" }]);
  if (c === 0) {
    g.run.understanding++;
    g.you.gesture("carry", 1.2);
    await g.say("narrator", "Meera writes on a sticky note: 'Closure = code that remembers.'");
  } else {
    await g.say("narrator", "She does not understand. She rewinds anyway.");
  }

  // eight months later: the inbox
  await g.transition(C.ink, async () => {
    g.world.laptop = "mail";
    g.you.posture = 0.45;
    g.env.clock = 21 * 60 + 15;
    await g.showCard("", "Eight months later", "", C.paper, C.ink, 2);
  });
  g.setGoal("Read your emails.");
  const mails = ["We are sorry to tell you…", "We chose other people for this job.", "You have no computer degree, so…"];
  for (const m of mails) {
    await g.press("Open email");
    audio.ui("buzz");
    await g.say("narrator", m);
  }
  await g.say("narrator", "Forty applications. Forty no's.");
  await g.say("narrator", "A friend from her course sends a message.");
  await g.say("narrator", "'I'm stopping. Too old for this. Good luck.'");
  const send = await g.choose([{ text: "Send application 41" }, { text: "Close the laptop" }]);
  if (send === 1) {
    g.world.laptop = "dark";
    await g.say("narrator", "She closes it. Ten minutes later, she opens it again.");
    g.world.laptop = "mail";
  }
  audio.ui("accept");
  await g.say("narrator", "Application 41 said yes.");
  g.you.setMood("happy");
  g.you.posture = 0.8;
  await g.say("you", "Junior developer. At 32. Ha.", { mood: "happy" });

  // 2026: the office
  await g.transition(C.cobalt, async () => {
    g.setScene(buildOffice("now"), 794);
    resetWorld(g);
    meeraSelf(g);
    tidyOffice(g);
    spots(g, []);
    g.env.clock = 10 * 60 + 20;
    g.env.evening = 0.15;
    g.env.light = true;
    sit(g, 794);
    g.you.anim = "type";
    g.you.posture = 0.8;
    tabAt(g, 862, 150);
    g.npc("boss", new Actor("founder", 180, ROOM_FEET, 61));
    g.ui.set({ chapter: "Ch 1 · The late start" });
    await eraCard(g, "ai", "2026 · with AI", "Meera is a developer now. The office is quieter than before.");
  });
  g.setGoal("Finish today's tasks.");
  const b = g.npcs.boss;
  await g.say("tab", "I finished your six tasks. And the team's tasks too. Want next week's too?", { tab: "eager" });
  await walkIn(g, b, 700);
  b.facing = 1;
  await g.say("boss", "Meera, we are not hiring beginners this year. Tab does the beginner work now.");
  g.you.anim = "sit";
  g.you.facing = -1;
  await g.say("you", "I was a beginner three years ago.", { mood: "worried" });
  await g.say("boss", "I know. That's why I'm telling you first.");
  await g.say("narrator", "Two people on her team left that month.");
  await g.walk(b, 940);
  b.facing = -1;
  g.you.facing = 1;
  g.you.anim = "type";

  g.setGoal("Find out why customers are angry.");
  g.setHint("Tab = yes · hold Q = look closer · R = no");
  g.inspectNote = "Tab only read the list of complaints. Nobody talked to a customer.";
  const r = await g.suggest("Tab's fix: make the Pay button bigger");
  g.setHint(null);
  g.inspectNote = null;
  if (r.choice === "accept") {
    g.run.ledger.acceptBad++;
    await g.say("tab", "Done! Bigger button.", { tab: "proud" });
    await g.say("boss", "Complaints went up.");
    await g.say("you", "Okay. I'll call one.", { mood: "worried" });
  } else {
    g.run.ledger.rejectGood++;
    if (r.inspected) g.run.understanding++;
    g.tab.mood = "sad";
    await g.say("you", "Before we fix it, I want to call one.", { mood: "neutral" });
  }
  await g.press("Call a customer");
  g.you.held = "phone";
  g.you.gesture("phone", 1.4);
  await g.say("customer", "It's not the button, beta. I am 60. I can't read this small grey writing.");
  g.you.held = null;
  g.you.anim = "type";
  await g.say("you", "Nobody asked them. Not in the old days. Not now.");
  await g.say("you", "Tab, make the text big and dark.");
  await g.say("tab", "Oh. Nobody wrote that down anywhere.", { tab: "think" });
  await g.say("you", "That's my job. I go and ask.", { mood: "proud" });
  stand(g);
  g.you.facing = 1;
  await giveKeepsake(g, "listen");
}
