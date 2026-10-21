// Prologue: the question (Anukul, 2026, 1:12 am, home).
import { audio } from "../../engine/audio";
import { C } from "../../engine/palette";
import { buildHome } from "../../world/scenes";
import type { Game } from "../core";
import { resetWorld, sit } from "../script";

export async function prologue(g: Game) {
  await g.enter(C.ink, () => {
    g.setScene(buildHome(), 300);
    resetWorld(g);
    g.world.laptop = "build";
    g.env.clock = 72;
    g.env.evening = 1;
    g.env.light = true;
    g.you.posture = 0.25;
    g.you.setMood("tired");
    g.tab.visible = false;
    g.tab.size = 40;
    g.tabFollow = false;
    g.ui.set({ chapter: "Prologue · The question" });
  });
  g.checkpoint("prologue");
  g.setGoal("Check on your laptop.");
  const f = { laptop: false, light: 0, chai: false };
  // the build progress ticks on its own while you wander
  g.tickers.add((dt) => {
    if (g.world.laptop === "build") g.world.buildT = Math.min(0.92, g.world.buildT + dt * 0.04);
  });
  await g.say("narrator", "It is 1:12 at night. You are at home.");
  await g.say("narrator", "Your laptop has been working on something for a while.");
  g.setHint("Move with A / D or the arrow keys. Press E to use the shiny things.");

  g.on("chai", async () => {
    g.you.gesture("sip", 1.6);
    audio.ui("chai");
    await g.wait(1.2);
    g.run.chai++;
    await g.say("you", f.chai ? "Still cold. Still drinking it." : "Cold. It is always cold when I remember it.", { mood: "tired" });
    f.chai = true;
  });
  g.on("switch", async () => {
    g.env.light = !g.env.light;
    audio.ui("pocket");
    f.light++;
    g.bark("you", g.env.light ? "Too bright. Like at the dentist." : "Better. The lamp is enough.");
    await g.wait(0.3);
  });
  g.on("window", async () => {
    g.you.gesture("stretch", 1.8);
    await g.wait(0.8);
    await g.say("you", "Someone out there is also fixing code at 1 am. Hi.", { mood: "neutral" });
  });
  g.on("bed", async () => {
    g.you.gesture("scratch", 1.4);
    await g.say("you", "Five more minutes, then sleep. That is a lie. We both know it.");
  });
  g.on("laptop", async () => {
    f.laptop = true;
  });
  await g.explore(() => f.laptop, { x: 532, use: "laptop" });
  g.setHint(null);
  g.setGoal(null);

  // sit down; the build finishes; Tab pops out of the screen
  await g.walk(g.you, 474);
  sit(g, 474);
  g.you.anim = "type";
  g.tickers.clear();
  await g.until(() => {
    g.world.buildT = Math.min(1, g.world.buildT + 1 / 60 / 1.4);
    return g.world.buildT >= 1;
  });
  g.world.laptop = "done";
  audio.ui("accept");
  g.you.anim = "sit";
  g.you.setMood("surprised");
  g.tab.x = g.tab.targetX = 546;
  g.tab.y = 230;
  g.tab.targetY = 186;
  g.tab.hide = 1;
  g.tab.visible = true;
  await g.until(() => {
    g.tab.hide = Math.max(0, g.tab.hide - 1 / 60 / 0.5);
    return g.tab.hide <= 0;
  });
  g.tab.react("proud");
  await g.say("tab", "Done. All the checks pass. I wrote them too.", { tab: "eager" });
  await g.say("you", "That took me a week last time.", { mood: "worried" });
  await g.say("tab", "Eight seconds. I counted.", { tab: "proud" });
  await g.say("tab", "I can make almost anything you ask. So, one honest question.", { tab: "think" });
  g.you.posture = 0.12;
  g.cam.punchIn(true);
  await g.say("tab", "What do you do?", { tab: "neutral" });
  await g.slot("Your answer", [], 3);
  g.you.setMood("worried");
  await g.say("you", "…");
  await g.say("you", "I'll get back to you.");
  await g.say("tab", "Take your time. I'm fast, not in a hurry.", { tab: "neutral" });
  g.cam.punchIn(false);
  await g.showCard("", "The Long Way to OK", "Five people who write code. Before AI, and after.", C.paper, C.ink, 3.4);
  g.world.laptop = "code";
  await g.say("tab", "Everyone who makes apps is asking that question now.", { tab: "think" });
  await g.say("you", "Let me tell you about five of them. Four people I know. And me.", { mood: "neutral" });
  await g.say("tab", "I have time. I have so much time.", { tab: "eager" });
}
