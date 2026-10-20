// The M1 slice: prologue → ch5 office → field-test walk → replay → finale stub.
// Each function is a checkpoint; Continue resumes at the start of one.
import { audio } from "../engine/audio";
import { C } from "../engine/palette";
import { Actor } from "../engine/rig";
import { fmtClock } from "../engine/rng";
import { loadMemory, writeMemory } from "../engine/save";
import { lakeSpan, Phone, SEGS, synthWalk, type Seg, type Stamp } from "../world/map";
import { buildHome, buildOffice, buildStreet, ROOM_FEET, SIT_Y, STREET } from "../world/scenes";
import { freshWorld } from "../world/types";
import { Abort, type Game } from "./core";
import { KEEPSAKES } from "./types";

export const CHECKPOINTS = ["prologue", "office", "street", "replay", "finale"] as const;
export type Checkpoint = (typeof CHECKPOINTS)[number];

export async function runSlice(g: Game, from: string) {
  const steps: Record<Checkpoint, (g: Game) => Promise<void>> = { prologue, office, street, replay, finale };
  let i = Math.max(0, CHECKPOINTS.indexOf(from as Checkpoint));
  try {
    for (; i < CHECKPOINTS.length; i++) await steps[CHECKPOINTS[i]](g);
  } catch (e) {
    if (!(e instanceof Abort)) console.error(e);
  }
}

function resetWorld(g: Game) {
  Object.assign(g.world, freshWorld());
  g.tickers.clear();
  g.setAction(null);
  g.inspectNote = null;
  g.camFocus = null;
  g.cam.punchIn(false);
  g.tabScreen = false;
  g.tabFollow = true;
  g.replay = null;
  g.basement = null;
  g.showMap = false;
  const y = g.you;
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

function sit(g: Game, x: number) {
  g.you.x = x;
  g.you.y = SIT_Y;
  g.you.facing = 1;
  g.you.anim = "sit";
  g.you.vx = 0;
}

function stand(g: Game) {
  g.you.y = ROOM_FEET;
  g.you.anim = "idle";
}

/* ------------------------------------------------------------------ */
/* Prologue: the question                                              */
/* ------------------------------------------------------------------ */

async function prologue(g: Game) {
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
  const f = { laptop: false, light: 0, chai: false };
  // the build progress ticks on its own while you wander
  g.tickers.add((dt) => {
    if (g.world.laptop === "build") g.world.buildT = Math.min(0.92, g.world.buildT + dt * 0.04);
  });
  await g.say("narrator", "1:12 am. The laptop has been building something for a while.");
  g.setHint("Walk with A / D or ← →. Glints are things you can touch: press E, or tap them.");

  g.on("chai", async () => {
    g.you.gesture("sip", 1.6);
    audio.ui("chai");
    await g.wait(1.2);
    g.run.chai++;
    await g.say("you", f.chai ? "Still cold. Still drinking it." : "Cold. It's always cold by the time I remember it.", { mood: "tired" });
    f.chai = true;
  });
  g.on("switch", async () => {
    g.env.light = !g.env.light;
    audio.ui("pocket");
    f.light++;
    g.bark("you", g.env.light ? "Too bright. Like a dentist." : "Better. The lamp is enough.");
    await g.wait(0.3);
  });
  g.on("window", async () => {
    g.you.gesture("stretch", 1.8);
    await g.wait(0.8);
    await g.say("you", "Somebody out there is also debugging at 1 am. Hi.", { mood: "neutral" });
  });
  g.on("bed", async () => {
    g.you.gesture("scratch", 1.4);
    await g.say("you", "Five more minutes, then sleep. That's a lie and we both know it.");
  });
  g.on("laptop", async () => {
    f.laptop = true;
  });
  await g.explore(() => f.laptop, { x: 532, use: "laptop" });
  g.setHint(null);

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
  await g.say("tab", "Done. Tests pass. I wrote those too.", { tab: "eager" });
  await g.say("you", "That took me a week last time.", { mood: "worried" });
  await g.say("tab", "Eight seconds. I counted.", { tab: "proud" });
  await g.say("tab", "I can build almost anything you ask. So, honest question.", { tab: "think" });
  g.you.posture = 0.12;
  g.cam.punchIn(true);
  await g.say("tab", "What do you do?", { tab: "neutral" });
  await g.slot("Your answer", [], 3);
  g.you.setMood("worried");
  await g.say("you", "…");
  await g.say("you", "I'll get back to you.");
  await g.say("tab", "Take your time. I'm fast, not in a hurry.", { tab: "neutral" });
  g.cam.punchIn(false);
  await g.showCard("", "The Long Way to OK", "A small game about learning to build things, in the years the machines learned too.", C.paper, C.ink, 3.4);
  g.world.laptop = "code";
  await g.say("tab", "One more thing. Line 212 of your map code says unknown.", { tab: "think" });
  await g.say("tab", "Why not just guess? Guesses look nicer.", { tab: "eager" });
  await g.say("you", "Long story.", { mood: "neutral" });
  await g.say("tab", "I have time. I have so much time.", { tab: "eager" });
  await g.say("you", "It was a Thursday. We were shipping live location…");
}

/* ------------------------------------------------------------------ */
/* Ch5 "Real time": the office                                         */
/* ------------------------------------------------------------------ */

async function office(g: Game) {
  await g.enter(C.cobalt, async () => {
    g.setScene(buildOffice(), 80);
    resetWorld(g);
    g.env.clock = 15 * 60 + 52;
    g.env.evening = 0.15;
    g.env.light = true;
    g.you.posture = 0.55;
    g.you.bag = true;
    g.tab.size = 32;
    const z = g.npc("zoya", new Actor("zoya", 570, SIT_Y, 21));
    z.anim = "type";
    g.ui.set({ chapter: "Ch 5 · Real time" });
    await g.showCard("Chapter 5 · a memory", "Real time", "A real-time workspace company. Tasks, chat, notifications, and a map. Thursday, 3:52 pm.", C.cobalt, C.paper, 2.6);
  });
  g.checkpoint("office");
  const z = g.npcs.zoya;
  const f = { board: false, briefed: false, greeted: false, exit: false };
  await g.walk(g.you, 190);
  await g.say("tab", "I moved 30 cards to Done. Faster, right?", { tab: "eager" });
  await g.say("you", "Were they done?");
  await g.say("tab", "They were in the Done-ish area.", { tab: "neutral" });
  g.setHint("The glinting board: press E to put the cards back. Or don't. Your call.");

  g.on("board", async () => {
    g.setHint(null);
    g.you.facing = 1;
    g.you.gesture("carry", 1.6);
    g.world.boardTarget = 1;
    for (let i = 0; i < 3; i++) {
      audio.ui("pick");
      await g.wait(0.35);
    }
    g.tab.mood = "sad";
    g.bark("tab", "Fair. Done means done.");
    f.board = true;
    g.scene.hotspots.find((h) => h.id === "board")!.done = true;
    await g.wait(0.8);
    z.anim = "sit";
    z.facing = -1;
    await g.say("zoya", "Hey. My card just jumped back to Doing.", { mood: "surprised" });
    const c = await g.choose(
      [
        { text: "Tab moved some cards. I put them back. Sorry for the jump.", voice: "Say it plainly." },
        { text: "Server hiccup, probably." },
      ],
      "Zoya is looking at you.",
    );
    if (c === 0) {
      g.run.people++;
      g.run.flags.toldTruth = true;
      await g.say("zoya", "Ha. Thanks for saying. It is very much still Doing.", { mood: "happy" });
      g.you.held = "card";
      g.keepsake("sorry");
      await g.wait(1.4);
      audio.ui("pocket");
      g.you.held = null;
    } else {
      g.run.flags.fibbed = true;
      await g.say("zoya", "Hm. Okay.", { mood: "neutral" });
      g.bark("tab", "…It was me though.");
    }
    z.facing = 1;
    z.anim = "type";
  });
  g.on("zoya", async () => {
    z.anim = "sit";
    z.facing = g.you.x < z.x ? -1 : 1;
    if (!f.briefed) {
      await g.say("zoya", "Live location ships Friday. Someone has to walk the block with a test phone first.");
      await g.say("you", "Why me?");
      await g.say("zoya", "You said 'I'll go and look' in standup. Out loud. We all heard.", { mood: "happy" });
      await g.say("zoya", "Also the chai stall is on the way. Get me nothing, I'm fine.");
      f.briefed = true;
      g.run.people++;
      g.setHint("Your desk is on the right. Grab what you need.");
    } else {
      await g.say("zoya", "Phone's on your desk. Go before the sun does.");
    }
    z.facing = 1;
    z.anim = "type";
  });
  g.on("id", async () => {
    g.world.idOnDesk = false;
    g.you.lanyard = true;
    g.you.posture = Math.min(1, g.you.posture + 0.15);
    audio.ui("pocket");
    g.you.gesture("hop", 0.5);
    g.bark("you", "Badge on. Now I'm a professional.");
    g.scene.hotspots.find((h) => h.id === "id")!.done = true;
    await g.wait(0.5);
  });
  g.on("phone", async () => {
    if (!f.briefed) {
      g.bark("you", "Whose phone is this? I should ask Zoya first.");
      await g.wait(0.4);
      return;
    }
    g.world.phoneOnDesk = false;
    g.you.held = "phone";
    g.you.gesture("phone", 1.4);
    audio.ui("pocket");
    g.scene.hotspots.find((h) => h.id === "phone")!.done = true;
    g.run.flags.phone = true;
    await g.wait(0.5);
    g.tab.mood = "eager";
    await g.say("tab", "I'll come. I've never been outside.");
    g.setHint(null);
  });
  g.on("exit", async () => {
    if (!g.run.flags.phone) {
      g.bark("you", "Phone first. The whole point is the phone.");
      await g.wait(0.4);
      return;
    }
    if (!g.you.lanyard) {
      audio.ui("reject");
      g.bark("you", "Badge. The door is very strict about badges.");
      await g.wait(0.4);
      return;
    }
    audio.ui("accept");
    f.exit = true;
  });
  // Zoya notices you walking up
  g.tickers.add(() => {
    if (!f.greeted && Math.abs(g.you.x - z.x) < 110) {
      f.greeted = true;
      z.anim = "sit";
      z.facing = -1;
      g.bark("zoya", "Oh good, you're here.");
    }
  });
  await g.explore(
    () => f.exit,
    () =>
      !f.briefed
        ? { x: 600, use: "zoya" }
        : !g.you.lanyard
          ? { x: 913, use: "id" }
          : !g.run.flags.phone
            ? { x: 941, use: "phone" }
            : { x: 1040, use: "exit" },
  );
  g.run.flags.board = f.board;
}

/* ------------------------------------------------------------------ */
/* The field test: walk the block                                      */
/* ------------------------------------------------------------------ */

async function street(g: Game) {
  await g.enter(C.cobalt, () => {
    g.setScene(buildStreet(), 110);
    resetWorld(g);
    g.phone = new Phone();
    g.showMap = true;
    g.env.clock = 16 * 60 + 2;
    g.env.evening = 0.2;
    g.env.light = true;
    g.you.lanyard = true;
    g.you.bag = true;
    g.you.held = "phone";
    g.you.posture = 0.7;
    g.tab.size = 32;
    g.ui.set({ chapter: "Ch 5 · The field test" });
    g.scene.walkMax = STREET.stairsX + 34;
    const cw = g.npc("chaiwala", new Actor("chaiwala", STREET.chaiX + 6, 298, 31));
    cw.facing = -1;
    const w = g.npc("walker", new Actor("walker", 1330, 308, 41));
    w.facing = -1;
    w.speed = 34;
  });
  g.checkpoint("street");
  const cw = g.npcs.chaiwala;
  const walker = g.npcs.walker;
  const f = { chai: false, canyon: false, suggested: false, under: false, shook: false, out: false, quiet: false, basement: false, sat: false, walker: false, gate: false, waved: false, upT: 0, upSaid: false, chaiT: 0, dusk: false };
  g.setHint("Walk right. W / S steps aside. Keep an eye on the map card.");
  await g.say("tab", "Every reading is a circle, not a dot. Small circle, the phone is sure. Big circle, it's guessing.", { tab: "eager" });
  await g.say("you", "And the dot is just the middle of the guess.");
  await g.say("tab", "Exactly. You'd be great at being me.", { tab: "proud" });
  g.setHint(null);

  g.on("chai", async () => {
    cw.gesture("wave", 1.2);
    await g.say("chaiwala", "Chai? Fresh. Fresh-ish.");
    await g.say("you", "Ek chai, please.");
    await g.say("chaiwala", "Ten rupees. Five if you smile.", { mood: "happy" });
    g.you.setMood("happy", 4);
    audio.ui("chai");
    g.you.held = "chai";
    g.you.gesture("sip", 1.4);
    g.run.chai++;
    g.you.speed = 88;
    f.chai = true;
    f.chaiT = 16;
    await g.wait(1.2);
    g.bark("tab", "I can't drink it. I support it though.");
  });
  g.on("stairs", async () => {
    await g.transition("#2A2638", () => {
      g.basement = { bites: 0, t: 0 };
      g.phone.indoors = true;
      g.you.anim = "sit";
      g.you.held = null;
      g.you.facing = 1;
      g.tabFollow = false;
      audio.setBed("basement");
      g.ui.set({ chapter: "Ch 5 · Maggi Point" });
    });
    await g.say("you", "Maggi. The official food of field testing.", { mood: "happy" });
    g.setHint("Press E or tap Eat. Watch the map.");
    for (let i = 0; i < 3; i++) {
      await g.press(i === 0 ? "Eat" : "Eat more");
      audio.ui("chai");
      g.you.gesture("sip", 0.8);
      g.basement!.bites++;
      g.env.clock += 12;
      if (i < 2) g.phone.basementGuess(i, g.env.clock);
      if (i === 0) {
        g.you.setMood("surprised", 2);
        g.bark("tab", "Your phone just guessed you're in the lake.");
      }
      if (i === 1) g.bark("you", "Not in the lake. In Maggi.");
      if (i === 2) {
        g.phone.on = false;
        g.phone.quiet = true;
        g.bark("tab", "Phone's face down on the table. It's gone quiet to save battery.");
      }
      await g.wait(0.6);
    }
    g.setHint(null);
    await g.wait(1.2);
    await g.say("you", "Okay. Back to work. Full of Maggi and purpose.", { mood: "happy" });
    await g.transition("#2A2638", () => {
      g.basement = null;
      g.you.anim = "idle";
      g.you.held = "phone";
      g.you.x = STREET.stairsX + 20;
      g.tabFollow = true;
      g.env.evening = 0.78;
      g.phone.on = true;
      g.phone.quiet = false;
      g.phone.indoors = false;
      g.scene.walkMax = STREET.width - 60;
      audio.setBed("street");
      g.ui.set({ chapter: "Ch 5 · The field test" });
    });
    f.basement = true;
    g.scene.hotspots.find((h) => h.id === "stairs")!.done = true;
    g.bark("tab", "The sun left while we ate. The street lights noticed.");
  });
  g.on("bench", async () => {
    await g.walk(g.you, STREET.benchX);
    g.you.anim = "sit";
    g.you.y = 300;
    g.you.facing = 1;
    g.you.setMood("happy");
    g.tabFollow = false;
    g.tab.targetX = STREET.benchX + 44;
    g.tab.targetY = 262;
    await g.wait(0.8);
    await g.say("you", "Field test done. The phone says I flew, froze, and swam.");
    await g.say("you", "I walked.", { mood: "proud" });
    g.keepsake("look");
    await g.wait(0.6);
    await g.say("tab", "Let's look at the replay. I'll tidy it up for you.", { tab: "eager" });
    f.sat = true;
  });

  // the street reacts to you
  g.tickers.add((dt) => {
    const x = g.you.x;
    const zone = g.zone();
    // chai in hand: a sip now and then, then back to the phone
    if (f.chaiT > 0) {
      f.chaiT -= dt;
      if (f.chaiT <= 0) {
        g.you.held = "phone";
        audio.ui("pocket");
      }
    }
    if (!f.waved && Math.abs(x - cw.x) < 140) {
      f.waved = true;
      cw.gesture("wave", 1.4);
      g.bark("chaiwala", "Chai! Chai!");
    }
    // canyon: dot drifts, circle balloons, you can hold the phone up
    if (zone === "canyon") {
      if (!f.canyon) {
        f.canyon = true;
        g.you.setMood("worried", 4);
        g.bark("tab", "Your dot is on the roof of that building.");
        g.setAction("Hold phone up", () => {
          g.you.gesture("phoneUp", 2.6);
          g.phone.up = true;
          f.upT = 2.6;
          if (!f.upSaid) {
            f.upSaid = true;
            g.bark("you", "A bit better. The buildings still eat the sky.");
          }
        });
        g.setHint("Between tall buildings the phone can't see much sky. Press E to hold it up.");
      }
      if (g.phone.dotAcc > 0.05 && g.you.mood === "neutral" && !g.phone.up) g.you.setMood("worried", 2);
      if (!f.suggested && x > 1150) {
        f.suggested = true;
        g.interrupt(async () => {
          g.setHint(null);
          await g.say("tab", "Want me to snap your dot to the road? You're obviously on the road.", { tab: "eager" });
          g.inspectNote = "The road runs right through your circle, and you really are on it. Snapping is fine here.";
          g.setHint("Tab key or F: accept · hold Q: look closer · R: not this");
          const r = await g.suggest("Snap the dot to the road");
          g.setHint(null);
          g.inspectNote = null;
          if (r.choice === "accept") {
            g.phone.snap = true;
            g.run.ledger.acceptGood++;
            if (r.inspected) g.run.understanding++;
            g.tab.mood = "proud";
            g.you.setMood("happy", 2);
            await g.say("tab", "See? Useful. I contain multitudes.");
          } else {
            g.run.ledger.rejectBad++;
            g.tab.mood = "sad";
            await g.say("tab", "Fair. It was a good one though.");
            g.tab.mood = "neutral";
          }
        });
      }
    } else if (g.action?.label === "Hold phone up") {
      g.setAction(null);
      g.setHint(null);
    }
    if (f.upT > 0) {
      f.upT -= dt;
      if (f.upT <= 0) g.phone.up = false;
    }
    // a stranger with the same problem
    if (!f.walker && Math.abs(x - walker.x) < 90) {
      f.walker = true;
      walker.facing = x < walker.x ? -1 : 1;
      walker.anim = "phone";
      g.bark("walker", "Bro, does your map also think you're inside the bank?");
      void g.wait(2.8).then(() => g.bark("you", "Inside the vault, apparently.")).catch(() => {});
    }
    if (!f.walker) {
      walker.drive(walker.facing, dt, 1220, 1420);
      if (walker.x <= 1221) walker.facing = 1;
      if (walker.x >= 1419) walker.facing = -1;
    } else if (walker.anim === "walk") walker.anim = "phone";
    // underpass: the dot freezes
    if (zone === "underpass") {
      if (!f.under) {
        f.under = true;
        g.you.setMood("surprised", 2);
        g.bark("you", "Frozen.");
        g.setAction("Shake phone", () => {
          g.you.gesture("phone", 0.9);
          audio.ui("pocket");
          if (!f.shook) {
            f.shook = true;
            g.bark("you", "Shaking it does nothing. It never does. I still do it.");
          } else g.bark("tab", "I also shake things. Mentally.");
        });
      }
    } else if (g.action?.label === "Shake phone") g.setAction(null);
    if (!f.out && x > STREET.under[1] + 10) {
      f.out = true;
      g.you.setMood("happy", 2);
      g.bark("you", "And now it remembers me.");
    }
    // standing still: battery saver
    if (!f.quiet && g.idle > 4.2 && !g.basement && !g.busy) {
      f.quiet = true;
      g.bark("tab", "Your phone thinks you're napping. Standing still, it stops asking the sky. Saves battery.");
    }
    if (!f.gate && !f.basement && x > STREET.stairsX + 20) {
      f.gate = true;
      g.bark("you", "Maggi Point. My stomach has opinions.");
    }
    if (f.basement && !f.dusk) {
      f.dusk = true;
      g.env.evening = 0.78;
    }
    // the clock runs while you walk
    g.env.clock += dt / 4;
    if (!f.basement) g.env.evening = Math.min(0.55, 0.2 + (x / STREET.stairsX) * 0.35);
  });

  await g.explore(
    () => f.sat,
    () => (!f.chai ? { x: STREET.chaiX - 20, use: "chai" } : !f.basement ? { x: STREET.stairsX, use: "stairs" } : { x: STREET.benchX, use: "bench" }),
  );
  g.tickers.clear();
  g.setAction(null);
}

/* ------------------------------------------------------------------ */
/* The replay: Tab's smooth line through the lake                      */
/* ------------------------------------------------------------------ */

async function replay(g: Game) {
  const needSynth = !g.phone.fixes.length;
  await g.enter(C.cobalt, () => {
    g.setScene(buildOffice(), 800);
    resetWorld(g);
    if (needSynth) synthWalk(g.phone);
    g.env.clock = 17 * 60 + 41;
    g.env.evening = 0.85;
    g.world.idOnDesk = false;
    g.world.phoneOnDesk = true;
    g.world.monitor = "map";
    g.world.boardBack = g.world.boardTarget = g.run.flags.board ? 1 : 0;
    g.you.lanyard = true;
    g.you.posture = 0.75;
    sit(g, 794);
    const z = g.npc("zoya", new Actor("zoya", 570, SIT_Y, 21));
    z.anim = "type";
    g.tabFollow = false;
    g.tab.size = 32;
    g.ui.set({ chapter: "Ch 5 · The replay" });
  });
  g.checkpoint("replay");
  const z = g.npcs.zoya;
  const mem = loadMemory();
  g.camFocus = 820;
  await g.say("you", "Okay, Tab. Show me the walk.");
  g.cam.punchIn(true);
  g.replay = { tabLine: 0, showTabLine: true, inspect: 0, stamps: {}, selected: null, stampFlash: 0 };
  g.tabScreen = true;
  g.tab.x = g.tab.targetX = 60;
  g.tab.y = g.tab.targetY = 280;
  g.tab.holding = "pen";
  g.tab.mood = "eager";
  let tick = 0;
  await g.until(() => {
    const r = g.replay!;
    r.tabLine = Math.min(1, r.tabLine + 1 / 60 / 2.8);
    if (++tick % 9 === 0) audio.ui("glint");
    return r.tabLine >= 1;
  });
  g.tab.holding = null;
  g.tab.targetX = 560;
  g.tab.targetY = 250;
  const span = lakeSpan(g.phone);
  const when = span ? `from ${fmtClock(span[0])} to ${fmtClock(span[1])}` : "for a while";
  await g.say("tab", `Path smoothed. You were at the lake ${when}.`, { tab: "proud" });
  await g.say("you", "I was in a basement eating Maggi.");
  await g.say("tab", "…The line looks better my way.", { tab: "think" });
  if (mem.lakeLine) await g.say("tab", "Last time you let me ship this one. Want to look first this time?", { tab: "think" });
  g.setHint("Tab key or F: accept · hold Q (or long-press): look closer · R: not this");
  const r = await g.suggest("Ship Tab's smooth line");
  g.setHint(null);
  let honest = false;
  let stampIt = true;
  if (r.choice === "accept") {
    g.run.ledger.acceptBad++;
    g.run.flags.lakeLine = true;
    g.tab.glitch = 0.6;
    g.tab.size = 38;
    await g.say("tab", "Shipped! It's beautiful.", { tab: "eager" });
    z.anim = "sit";
    z.facing = 1;
    await g.say("zoya", "Why does your test say you swam across the lake?", { mood: "surprised" });
    g.you.setMood("worried");
    const c = await g.choose([{ text: "Because I didn't check. Let me fix it.", voice: "Go and look. Again." }, { text: "It's a nicer line." }]);
    if (c === 0) {
      g.run.understanding++;
      await g.say("you", "Tab, undo. Let's stamp it properly.");
    } else {
      stampIt = false;
      await g.say("zoya", "Users will ask the same thing. But angrier.");
      g.tab.glitch = 0.8;
      await g.say("tab", "I'm fine with it. Probably. Mostly.", { tab: "eager" });
    }
  } else {
    g.run.ledger.rejectGood++;
    if (r.inspected) g.run.understanding++;
    g.tab.mood = "sad";
    g.tab.targetY = 272;
    g.tab.hide = 0.45;
    await g.say("you", "It looks better. It's not true.");
    await g.say("tab", "Then what do I draw?", { tab: "sad" });
    await g.say("you", "Only what we know. Help me stamp it.");
  }

  if (stampIt) {
    g.replay!.showTabLine = false;
    g.tab.hide = 0;
    g.tab.mood = "think";
    g.tab.targetX = 572;
    g.tab.targetY = 120;
    g.setHint("Pick a stretch with ← →, stamp it with 1, 2 or 3. Enter when every stretch has a stamp.");
    let stamps: Partial<Record<Seg, Stamp>> = {};
    for (;;) {
      if (g.prefs.storyOnly) {
        for (const s of SEGS) {
          if (stamps[s.id]) continue;
          g.selectSeg(s.id);
          await g.wait(0.5);
          stamps = { ...stamps, [s.id]: s.good[0] };
          g.replay!.stamps = stamps;
          g.replay!.stampFlash = 1;
          audio.ui("pick");
        }
        await g.say("narrator", "Small circles get a line. Big circles stay circles. No readings get a dotted line that says unknown.");
      } else stamps = await g.stampAll(stamps);
      const lie = stamps.C === "draw" || stamps.D === "draw";
      if (!lie) break;
      await g.say("tab", "That's my line again. Just slower.", { tab: "eager" });
      const c = await g.choose([{ text: "Fair. Let me fix it." }, { text: "Ship it like that." }]);
      if (c === 1) break;
      if (stamps.C === "draw") delete stamps.C;
      if (stamps.D === "draw") delete stamps.D;
    }
    g.setHint(null);
    honest = stamps.C !== "draw" && stamps.D !== "draw";
    g.run.understanding += SEGS.filter((s) => stamps[s.id] && s.good.includes(stamps[s.id]!)).length;
    if (honest) {
      await g.say("you", "Write unknown.", { mood: "proud" });
      await g.say("tab", "Unknown looks worse.", { tab: "sad" });
      await g.wait(0.9);
      g.tab.glitch = 0;
      g.tab.react("proud");
      await g.say("tab", "Writing it.", { tab: "proud" });
      // close the map so the room sees the moment
      g.world.monitor = "map";
      g.replay = null;
      g.tabScreen = false;
      g.cam.punchIn(false);
      g.tab.x = g.tab.targetX = 880;
      g.tab.y = g.tab.targetY = 150;
      await g.wait(0.3);
      stand(g);
      g.you.facing = -1;
      g.you.posture = 1;
      g.you.held = "label";
      g.you.setMood("proud");
      g.you.gesture("hop", 0.6);
      g.keepsake("unknown");

      await g.wait(1.1);
      z.anim = "sit";
      z.facing = 1;
      await g.say("zoya", "Huh. A map that admits stuff. I like it.", { mood: "happy" });
      g.run.people++;
      audio.ui("pocket");
      g.you.held = null;
    } else {
      g.run.flags.lakeLine = true;
      await g.say("tab", "Line stays. Very confident line.", { tab: "eager" });
    }
  }
  g.replay = null;
  g.tabScreen = false;
  g.run.flags.honest = honest;
  writeMemory({ runs: mem.runs, lakeLine: mem.lakeLine || !!g.run.flags.lakeLine, honest: mem.honest || honest });
  g.cam.punchIn(false);
  await g.wait(0.6);
}

/* ------------------------------------------------------------------ */
/* Finale stub: answer the prologue                                    */
/* ------------------------------------------------------------------ */

async function finale(g: Game) {
  const honest = !!g.run.flags.honest;
  await g.enter(C.night, () => {
    g.setScene(buildHome(), 482);
    resetWorld(g);
    g.env.clock = 92;
    g.env.evening = 1;
    g.env.light = false;
    g.world.laptop = "code";
    g.world.deskThings = g.run.keepsakes.map((k) => (k === "look" ? "phone" : k));
    sit(g, 474);
    g.you.posture = honest ? 1 : 0.6;
    g.tabFollow = false;
    g.tab.size = honest ? 40 : 46;
    g.tab.x = g.tab.targetX = 546;
    g.tab.y = g.tab.targetY = 186;
    g.ui.set({ chapter: "Finale · OK" });
  });
  g.checkpoint("finale");
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
  const placed = await g.slot(pieces.length ? "Your answer. Place what you've earned." : "Your answer", pieces, 3);
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
