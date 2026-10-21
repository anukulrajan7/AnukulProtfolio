// The field test (Anukul, 2026): office briefing → walk the block → replay. Chapter 5, third act.
import { audio } from "../../engine/audio";
import { C } from "../../engine/palette";
import { Actor } from "../../engine/rig";
import { fmtClock } from "../../engine/rng";
import { loadMemory, writeMemory } from "../../engine/save";
import { lakeSpan, Phone, SEGS, synthWalk, type Seg, type Stamp } from "../../world/map";
import { buildOffice, buildStreet, SIT_Y, STREET } from "../../world/scenes";
import type { Game } from "../core";
import { resetWorld, sit, stand } from "../script";

/* ------------------------------------------------------------------ */
/* Ch5, 2026: the office                                              */
/* ------------------------------------------------------------------ */

export async function office(g: Game) {
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
    g.ui.set({ chapter: "Ch 5 · The long way" });
    await g.showCard("", "2026 · with AI", "Anukul builds live maps now. Zoya is on the team. Today: test live location on a real street.", C.cobalt, C.paper, 3.2);
  });
  g.checkpoint("office");
  g.setGoal("Talk to Zoya, take your badge and the test phone.");
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
    if (g.run.flags.phone) g.setGoal("Go outside.");
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
    if (g.you.lanyard) g.setGoal("Go outside.");
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

export async function street(g: Game) {
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
    g.setGoal("Walk the street. Watch the map.");
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
  await g.say("tab", "A phone never knows exactly where you are. It guesses. Small circle: it's sure. Big circle: it's guessing.", { tab: "eager" });
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
    g.setGoal("Sit on the bench at the lake.");
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

export async function replay(g: Game) {
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
  g.setGoal("Check Tab's line. Is it true?");
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
    await g.say("narrator", "Now mark each part of the walk. Sure? Draw a line. Not sure? Keep a circle. No signal? Write 'unknown'.");
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
