// Chapter 5 · The long way (Anukul): 2019 hostel → 2023 internship → 2026 field test (field-test.ts).
import { audio } from "../../engine/audio";
import { C } from "../../engine/palette";
import { Actor } from "../../engine/rig";
import { buildHome, buildOffice, ROOM_FEET } from "../../world/scenes";
import type { Game } from "../core";
import { resetWorld, sit } from "../script";
import { chapterCard, eraCard, giveKeepsake, noTab, spots, tidyOffice, walkIn, walkOut } from "./kit";

export { office, replay, street } from "./field-test";

const STEPS = [
  { id: "rows", text: "For each row, from 1 to 5" },
  { id: "stars", text: "print that many stars" },
  { id: "newline", text: "then go to a new line" },
  { id: "same", text: "print 5 stars every time" },
];
// shown shuffled; the right answer is rows → stars → newline
const SHUFFLED = [STEPS[2], STEPS[3], STEPS[0], STEPS[1]];
const RIGHT = ["rows", "stars", "newline"];

async function planInWords(g: Game): Promise<void> {
  for (;;) {
    const p = g.slot("Write it in plain words first. Put the steps in order.", SHUFFLED, 3);
    p.catch(() => {});
    if (g.prefs.storyOnly) {
      await g.wait(0.9);
      for (const id of RIGHT) {
        g.togglePiece(id);
        await g.wait(0.35);
      }
      g.confirmSlot();
    }
    const placed = await p;
    if (placed.length === RIGHT.length && placed.every((id, i) => id === RIGHT[i])) return;
    await g.say("narrator", "Not yet. Read your own words again.");
  }
}

export async function anukul(g: Game) {
  await g.enter(C.cobalt, async () => {
    g.setScene(buildHome("past"), 300);
    resetWorld(g);
    noTab(g);
    spots(g, []);
    g.world.laptop = "dark";
    g.env.clock = 2 * 60;
    g.env.evening = 1;
    g.env.light = false;
    sit(g, 474);
    g.you.posture = 0.6;
    g.you.setMood("worried");
    g.npc("chintu", new Actor("chintu", 340, ROOM_FEET, 101));
    g.ui.set({ chapter: "Ch 5 · The long way" });
    await chapterCard(g, 5, "Anukul", "The long way");
    await eraCard(g, "past", "2019 · before AI", "Anukul is in college. Programming words feel like another language.");
  });
  g.checkpoint("anukul");
  g.setGoal("Print a triangle of stars.");
  const chintu = g.npcs.chintu;
  chintu.facing = 1;
  g.you.anim = "type";
  await g.say("narrator", "The assignment: print a triangle of stars. Using a for loop.");
  g.setHint("Press E or tap Run.");
  await g.press("Run");
  g.setHint(null);
  g.world.laptop = "line";
  await g.say("narrator", "One long line of stars.");
  await g.press("Run");
  g.world.laptop = "square";
  await g.say("narrator", "A square. Not a triangle.");
  await g.say("chintu", "Bro, it's 2 am. Coding is not for me. I'm doing an MBA.", { mood: "tired" });
  await walkOut(g, chintu, 70);
  g.env.clock = 22 * 60 + 40;
  g.you.posture = 0.4;
  await g.say("narrator", "Day two. Nobody to ask. No AI. Just a notebook.");
  await planInWords(g);
  audio.ui("accept");
  g.world.laptop = "triangle";
  g.you.posture = 0.9;
  await g.wait(0.8);
  await g.say("you", "A triangle. Two days for a triangle.", { mood: "happy" });
  await g.say("you", "I'll never forget how.");
  await giveKeepsake(g, "plain");

  // 2023: AI arrives, but only as a chat window
  await g.transition(C.cobalt, async () => {
    g.setScene(buildOffice("early"), 794);
    resetWorld(g);
    noTab(g);
    tidyOffice(g);
    spots(g, []);
    g.world.monitor = "chat";
    g.env.clock = 15 * 60 + 5;
    g.env.evening = 0.2;
    g.env.light = true;
    sit(g, 794);
    g.you.anim = "type";
    g.you.posture = 0.85;
    g.npc("sen", new Actor("sen", 160, ROOM_FEET, 91));
    g.ui.set({ chapter: "Ch 5 · The long way" });
    await eraCard(g, "ai", "2023 · AI arrives", "Anukul's first internship. Everyone has a new AI chat tool.");
  });
  g.setGoal("Finish your first task.");
  const s = g.npcs.sen;
  await g.say("narrator", "The AI wrote the code in ten seconds. Anukul pasted it. It worked.");
  await walkIn(g, s, 700);
  s.facing = 1;
  g.you.anim = "sit";
  g.you.facing = -1;
  await g.say("sen", "Nice. Explain line 12 to me.");
  const c = await g.choose([{ text: "…The AI wrote it." }, { text: "Read it line by line, in plain words" }]);
  if (c === 0) {
    await g.say("sen", "Then it's the AI's code, not yours. Read it until it's yours.");
  } else {
    g.run.understanding++;
    await g.say("you", "Line 12 waits for the data, then shows it.", { mood: "proud" });
    await g.say("sen", "Good. Now it's yours.", { mood: "happy" });
  }
  await g.say("sen", "The tool is new. The job is old. Know what your code does.");
  await g.say("narrator", "2024. 2025. New jobs. Live maps.");
}
