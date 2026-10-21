// Finale: answer the prologue (Anukul, 2026, home → dawn).
import { audio } from "../../engine/audio";
import { C } from "../../engine/palette";
import { loadMemory, writeMemory } from "../../engine/save";
import { buildHome } from "../../world/scenes";
import type { Game } from "../core";
import { KEEPSAKES } from "../types";
import { resetWorld, sit, stand } from "../script";

export async function finale(g: Game) {
  const honest = !!g.run.flags.honest;
  await g.enter(C.night, () => {
    g.setScene(buildHome(), 482);
    resetWorld(g);
    g.env.clock = 92;
    g.env.evening = 1;
    g.env.light = false;
    g.world.laptop = "code";
    g.world.deskThings = [...g.run.keepsakes];
    sit(g, 474);
    g.you.posture = honest ? 1 : 0.6;
    g.tabFollow = false;
    g.tab.size = honest ? 40 : 46;
    g.tab.x = g.tab.targetX = 546;
    g.tab.y = g.tab.targetY = 186;
    g.ui.set({ chapter: "Finale · OK" });
  });
  g.checkpoint("finale");
  g.setGoal("Answer Tab.");
  await g.say("tab", "So. Five people.", { tab: "think" });
  await g.say("tab", "Meera asked real people. Sen knew what to check. Ravi asked why. Zoya read the whole error.", { tab: "neutral" });
  await g.say("tab", "And you wrote it in plain words, then went to look.", { tab: "proud" });
  await g.say("tab", "None of them did what I do. Typing fast.", { tab: "think" });
  if (honest) {
    await g.say("tab", "So that's why it says unknown.", { tab: "think" });
    await g.say("you", "That's why.", { mood: "happy" });
  } else {
    await g.say("tab", "So the line stayed. People kept asking about the lake.", { tab: "think" });
    await g.say("you", "Yeah. I should have looked closer.", { mood: "tired" });
  }
  await g.say("tab", "Okay. Then let me ask again.", { tab: "neutral" });
  g.cam.punchIn(true);
  await g.say("tab", "What do you do?", { tab: "neutral" });
  const pieces = KEEPSAKES.filter((k) => g.run.keepsakes.includes(k.id)).map((k) => ({ id: k.id, text: k.piece }));
  const placed = await g.slot(pieces.length ? "Your answer. Pick what you earned." : "Your answer", pieces, 3);
  const sentence = placed.map((id) => KEEPSAKES.find((k) => k.id === id)!.piece).join(" ") || "I'm still finding out.";
  g.you.setMood("proud");
  g.you.posture = 1;
  await g.say("you", sentence);
  await g.wait(0.5);
  g.tickers.add((dt) => (g.world.dawn = Math.min(1, g.world.dawn + dt / 3)));
  audio.ui("keepsake");
  g.tab.glitch = 0;
  g.tab.react("proud");
  await g.say("tab", "OK.", { tab: "proud" });
  g.you.setMood("happy");
  await g.say("you", "OK.");
  g.cam.punchIn(false);
  stand(g);
  g.you.facing = 1;
  g.you.gesture("stretch", 2.2);
  await g.wait(3.2);
  g.setGoal(null);
  await g.showCard("", "Many people left.", "Some left because it was too hard. Some left because it got too easy. These five stayed, each for a different reason.", C.night, C.paper, 4.5);
  const L = g.run.ledger;
  const mem = loadMemory();
  writeMemory({ ...mem, runs: mem.runs + 1 });
  g.checkpoint("done");
  g.ui.set({
    screen: "end",
    end: {
      accepted: L.acceptGood + L.acceptBad,
      wrong: L.acceptBad,
      caught: L.rejectGood,
      inspected: L.inspected,
      keepsakes: [...g.run.keepsakes],
      honest,
    },
  });
}
