// Learn-track correctness: every JS snippet shown to players really prints
// what the level claims, the Pingback bug order matches real event-loop
// order, and the copy stays inside the doc's text budget.
// Run: npx vitest run components/arcade/learn

import ts from "typescript";
import { describe, expect, it } from "vitest";
import { GLOSSARY, LEARN } from "../../games/concepts";
import { cityMap } from "../../games/concepts/route";
import { FILTERS, gapAnswer, hiddenBy } from "../../games/concepts/types";
import type { PingbackScript, RouteScript, StackerScript } from "../../games/concepts/types";
import type { LevelDef } from "../../games/levels";
import { starsFor, starReason } from "../../games/levels";
import type { MiniGameId } from "../../types";

interface RunResult {
  out: string;
  error?: string;
}

type SnippetTest = NonNullable<NonNullable<LevelDef["copy"]>["test"]>;

/** TS snippets are shown with their types; strip them before running (no type check, just erase). */
function stripTypes(src: string): string {
  return ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
}

/** Run a snippet with a mocked console, then let timers and microtasks drain. */
async function run(snippet: string, t: SnippetTest, lang: "js" | "ts" | "sql" = "js"): Promise<RunResult> {
  const out: string[] = [];
  const mock = { log: (...a: unknown[]) => out.push(a.map((v) => (v === undefined ? "undefined" : String(v))).join(" ")) };
  const raw = `${t.prelude ?? ""}\n${snippet}\n${t.postlude ?? ""}`;
  const body = lang === "ts" ? stripTypes(raw) : raw;
  let error: string | undefined;
  try {
    if (t.async) {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => (c: typeof mock) => Promise<void>;
      await new AsyncFunction("console", body)(mock);
    } else {
      new Function("console", body)(mock);
    }
  } catch (e) {
    error = (e as Error).name;
  }
  await new Promise((r) => setTimeout(r, 40));
  return { out: out.join(" "), error };
}

const GAMES: MiniGameId[] = ["stacker", "pingback", "route"];
const all = GAMES.flatMap((g) => LEARN[g].map((l) => ({ game: g, level: l })));

const sentences = (s: string) => s.split(/(?<=[.!?])\s+/).filter((x) => x.trim().length > 0).length;
const words = (s: string) => s.trim().split(/\s+/).length;

describe("snippets print what the level says", () => {
  for (const { game, level } of all) {
    const copy = level.copy!;
    if (!copy.test) continue;
    const t = copy.test;
    it(`${game} ${level.id} · ${level.name}`, async () => {
      const r = await run(copy.snippet, t, copy.lang);
      if (t.throws) {
        expect(r.error).toBe(t.throws);
      } else {
        expect(r.error).toBeUndefined();
        expect(r.out).toBe(t.expect);
      }
    });
  }

  it("S5 learn-more claim: `var f = function` hoists only the name (TypeError)", async () => {
    const r = await run("f();\nvar f = function () {};", {});
    expect(r.error).toBe("TypeError");
  });

  it("S6 learn-more claim: typeof throws inside the TDZ", async () => {
    const r = await run("typeof total;\nlet total = 0;", {});
    expect(r.error).toBe("ReferenceError");
  });
});

describe("pingback bug order matches the real console", () => {
  for (const level of LEARN.pingback) {
    const s = level.script as PingbackScript;
    const ordered = s.bugs.filter((b) => b.order > 0);
    if (ordered.length === 0 || !level.copy?.test?.expect) continue;
    it(`${level.id}: bugs pop in console order`, () => {
      const byOrder = [...ordered].sort((a, b) => a.order - b.order).map((b) => b.id);
      expect(byOrder.join(" ")).toBe(level.copy!.test!.expect);
      expect(level.goal.target).toBe(ordered.length);
    });
    it(`${level.id}: spawned bugs come after their parent`, () => {
      for (const b of s.bugs) {
        if (!b.spawnedBy) continue;
        const parent = s.bugs.find((x) => x.id === b.spawnedBy);
        expect(parent, `${b.id} parent`).toBeDefined();
        expect(b.order).toBeGreaterThan(parent!.order);
      }
    });
  }
});

describe("copy stays inside the text budget", () => {
  for (const { game, level } of all) {
    const c = level.copy!;
    it(`${level.id}`, () => {
      expect(level.track).toBe("learn");
      expect(sentences(c.intro), "intro ≤ 2 sentences").toBeLessThanOrEqual(2);
      expect(sentences(c.learned), "learned ≤ 2 lines").toBeLessThanOrEqual(2);
      expect(c.snippet.split("\n").length, "snippet ≤ 6 lines").toBeLessThanOrEqual(6);
      if (c.learnMore) expect(words(c.learnMore), "learn more ≤ 80 words").toBeLessThanOrEqual(80);
      expect(c.misconception.length).toBeGreaterThan(0);
      for (const id of c.glossary) expect(GLOSSARY[game].some((t) => t.id === id), `glossary ${id}`).toBe(true);
    });
  }

  it("level ids are unique and numbered 1..n per game", () => {
    for (const g of GAMES) {
      const ids = LEARN[g].map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
      LEARN[g].forEach((l, i) => expect(l.n).toBe(i + 1));
    }
  });
});

describe("star rules = understanding, not speed", () => {
  const lvl = LEARN.pingback[0];
  it("loss is 0, any win is at least 1", () => {
    expect(starsFor(lvl, { won: false, durationMs: 1000 })).toBe(0);
    expect(starsFor(lvl, { won: true, durationMs: 10_000_000, slips: 9 })).toBe(1);
  });
  it("one slip caps at 2 stars even when fast", () => {
    expect(starsFor(lvl, { won: true, durationMs: 1000, slips: 1 })).toBe(2);
  });
  it("0 slips + par gives 3, and the reason names the missing star", () => {
    expect(starsFor(lvl, { won: true, durationMs: 1000, slips: 0 })).toBe(3);
    expect(starsFor(lvl, { won: true, durationMs: lvl.par * 1000 + 1, slips: 0 })).toBe(2);
    expect(starReason(lvl, { won: true, durationMs: 1000, slips: 1, lastSlip: "not yet" })).toMatch(/1 slip/);
  });
  it("meta rules use the level's efficiency metric", () => {
    const p2 = LEARN.pingback[1];
    expect(starsFor(p2, { won: true, durationMs: 1000, slips: 0, meta: { maxFreezeMs: 0 } })).toBe(3);
    expect(starsFor(p2, { won: true, durationMs: 1000, slips: 0, meta: { maxFreezeMs: 2000 } })).toBe(2);
  });
});

describe("route R5 gap labels", () => {
  it("never answers straight line, follows the speed rule", () => {
    expect(gapAnswer({ km: 2.1, min: 40 })).toBe(1);
    expect(gapAnswer({ km: 11, min: 14 })).toBe(2);
    expect(gapAnswer({ km: 240, min: 25 })).toBe(3);
  });
});

describe("route R6 display filters", () => {
  const honest = { acc: 1, spd: 1, still: 0 }; // ≤50 m, 150 km/h, ignore still-drift
  it("the honest setting hides every spike type and keeps real fixes", () => {
    expect(hiddenBy({ acc: 20, kmh: 400, still: false }, honest), "jump").toBe(true);
    expect(hiddenBy({ acc: 250, kmh: 30, still: false }, honest), "wifi blob").toBe(true);
    expect(hiddenBy({ acc: 15, kmh: 8, still: true }, honest), "still drift").toBe(true);
    expect(hiddenBy({ acc: 35, kmh: 45, still: false }, honest), "real delivery").toBe(false);
  });
  it("too strict hides real fixes, too loose keeps spikes", () => {
    expect(hiddenBy({ acc: 35, kmh: 45, still: false }, { acc: 0, spd: 1, still: 0 })).toBe(true);
    expect(hiddenBy({ acc: 35, kmh: 45, still: false }, { acc: 1, spd: 0, still: 0 })).toBe(true);
    expect(hiddenBy({ acc: 20, kmh: 400, still: false }, { acc: 3, spd: 3, still: 1 })).toBe(false);
    expect(FILTERS.acc.options.length).toBe(FILTERS.acc.limits.length);
  });
});

describe("route R7 city map", () => {
  const map = cityMap();
  it("is 22x22, roads every third line, river crossable only at the bridges", () => {
    expect(map.length).toBe(22);
    for (const row of map) expect(row.length).toBe(22);
    expect(map[12][6]).toBe(".");
    expect(map[12][10]).toBe("#");
    expect(map[3][10]).toBe(".");
    expect(map[18][11]).toBe(".");
    expect(map[13][13]).toBe("#");
  });
  it("the start lane (row 12, x 3..6) is road", () => {
    for (let x = 3; x <= 6; x++) expect(map[12][x]).toBe(".");
  });
});

describe("stacker and route scripts are self-consistent", () => {
  it("S2: the goal counts every frame from countdown(from) to countdown(0)", () => {
    const l = LEARN.stacker.find((x) => x.id === "stacker-learn-2")!;
    const s = l.script as StackerScript;
    expect(l.goal.target).toBe(s.recursion!.from + 1);
  });
  it("S4: the win is the survive timer; exactly one listener is leaky", () => {
    const l = LEARN.stacker.find((x) => x.id === "stacker-learn-4")!;
    const s = l.script as StackerScript;
    expect(l.goal.target).toBe(s.listeners!.surviveSec);
    expect(s.listeners!.items.filter((i) => i.leaky).length).toBe(1);
  });
  it("S8: the goal counts the trace's returns", () => {
    const l = LEARN.stacker.find((x) => x.id === "stacker-learn-8")!;
    const s = l.script as StackerScript;
    expect(l.goal.target).toBe(s.trace!.filter((t) => "ret" in t).length);
  });
  it("R2 buildings keep the start lane clear", () => {
    const l = LEARN.route.find((x) => x.id === "route-learn-2")!;
    const s = l.script as RouteScript;
    for (const [x, y, w, h] of s.buildings ?? []) {
      const hitsLane = y <= 12 && y + h > 10 && x <= 16 && x + w > 5;
      expect(hitsLane, `building at ${x},${y}`).toBe(false);
    }
  });
  it("R8 budget can be met at the honest policies", () => {
    const l = LEARN.route.find((x) => x.id === "route-learn-8")!;
    const b = (l.script as RouteScript).budget!;
    // 15 deliveries: 15 uploads, 15 per-delivery snaps, 9 new addresses.
    expect(15 * b.upload + 15 * b.snap + 9 * b.geocode).toBeLessThan(b.cap);
  });
});
