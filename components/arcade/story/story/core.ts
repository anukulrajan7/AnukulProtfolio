// The runtime: owns the loop, world, actors and the async script primitives.
// React only renders the DOM overlay from `ui` and calls the public methods.
import { audio } from "../engine/audio";
import { Camera } from "../engine/camera";
import { fonts, glow, inkPoly, label } from "../engine/ink";
import { Input, type Actions } from "../engine/input";
import { Loop } from "../engine/loop";
import { C, H, W } from "../engine/palette";
import { Actor, Tab, type Mood, type TabMood } from "../engine/rig";
import { clamp, damp, lerp } from "../engine/rng";
import { defaultPrefs, writePrefs, writeSave, type Prefs } from "../engine/save";
import { Stage } from "../engine/stage";
import { createStore, type Store } from "../engine/store";
import { drawMiniMap, drawReplay, Phone, SEGS, type ReplayView, type Seg, type Stamp } from "../world/map";
import { freshWorld, PARALLAX, type Env, type Prop, type Scene, type WorldState } from "../world/types";
import { freshRun, type ChoiceUi, type RunState, type Ui, type Who } from "./types";

export class Abort extends Error {}

type Waiter = { test: () => boolean; resolve: () => void; reject: (e: unknown) => void };
const STEP = 1 / 60;
const NAMES: Record<Who, string> = {
  you: "You",
  tab: "Tab",
  zoya: "Zoya",
  chaiwala: "Chai stall",
  walker: "Stranger",
  narrator: "",
  chintu: "Chintu",
  sen: "Sen bhaiya",
  arjun: "Arjun",
  boss: "Boss",
  customer: "Customer",
  dad: "Dad",
};

export interface Goal {
  x: number;
  use?: string;
}

export class Game {
  stage: Stage;
  cam = new Camera();
  input: Input;
  loop: Loop;
  ui: Store<Ui>;
  world: WorldState = freshWorld();
  env: Env;
  scene!: Scene;
  private layers: Prop[][] = [[], [], [], []];
  you = new Actor("you", 200, 318, 11);
  tab = new Tab(240, 220, 32);
  npcs: Record<string, Actor> = {};
  phone = new Phone();
  run: RunState = freshRun();
  /** Who "you" is in the current chapter (speech bubble name). */
  playerName = "Anukul";
  prefs: Prefs = defaultPrefs;
  reduced = false;
  time = 0;

  mode: "cut" | "free" = "cut";
  busy = false;
  handlers = new Map<string, () => Promise<void>>();
  /** Contextual action under E when no hotspot is near (hold phone up, eat…). */
  action: { label: string; press: () => void } | null = null;
  walkTarget: number | null = null;
  private pendingUse: string | null = null;
  private autoAt = -1;
  goal: Goal | (() => Goal | null) | null = null;
  fresh = true;
  private pressId = 0;
  private pressedId = 0;
  private fidget = 0;
  /** Shown under the map card while Inspect is held on the street. */
  inspectNote: string | null = null;
  idle = 0;
  tabFollow = true;
  tabScreen = false;
  tickers = new Set<(dt: number) => void>();
  private waiters: Waiter[] = [];

  showMap = false;
  replay: ReplayView | null = null;
  basement: { bites: number; t: number } | null = null;
  inspectAmt = 0;
  private suggestState: { id: number; result: "accept" | "reject" | null; inspected: boolean } | null = null;
  private slotDone = 0;
  private stampDone = 0;
  private advancedId = 0;
  private chosen: { id: number; index: number } | null = null;
  private wipe = { a: 0, dir: 0 as -1 | 0 | 1, color: C.cobalt as string, out: false };
  private seq = 0;
  private dead = false;
  private lastShown = 0;
  private longPress = 0;
  private pointerDown: { x: number; y: number; t: number; id: number } | null = null;
  els: { bubble?: HTMLElement | null; prompt?: HTMLElement | null } = {};
  checkpointId = "prologue";
  private touchMoved = false;
  /** Ignore keys briefly when a decision appears, so a double-tap on a line can't skip it. */
  private guardUntil = 0;

  constructor(
    canvas: HTMLCanvasElement,
    host: HTMLElement,
    public root: HTMLElement,
    prefs: Prefs,
    hasSave: boolean,
  ) {
    this.stage = new Stage(canvas, host);
    this.input = new Input(root);
    this.env = { t: 0, evening: 0, light: true, reduced: false, px: 0, clock: 22 * 60 + 47, w: this.world };
    this.ui = createStore<Ui>({
      screen: "title",
      chapter: "",
      goal: null,
      bubble: null,
      choices: null,
      prompt: null,
      action: null,
      suggest: null,
      card: null,
      slot: null,
      stamp: null,
      end: null,
      hint: null,
      keepsakes: [],
      newKeepsake: null,
      paused: false,
      prefs,
      hasSave,
      log: [],
    });
    this.input.capturesTab = () => !!this.ui.get().suggest;
    this.setPrefs(prefs, false);
    this.loop = new Loop(
      (dt) => this.update(dt),
      () => this.render(),
    );
    this.you.onStep = () => audio.step(this.scene?.id === "street" ? (this.zone() === "underpass" ? "stairs" : "street") : "floor");
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    document.addEventListener("visibilitychange", this.onVis);
    this.loop.start();
  }

  destroy() {
    this.dead = true;
    this.loop.stop();
    this.input.destroy();
    this.stage.destroy();
    const c = this.stage.canvas;
    c.removeEventListener("pointerdown", this.onPointerDown);
    c.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    document.removeEventListener("visibilitychange", this.onVis);
    this.waiters.forEach((w) => w.reject(new Abort()));
    this.waiters = [];
    audio.setBed("off");
    audio.inspectHold(false);
    audio.duck(false);
    audio.setEnabled(false);
  }

  /** Abort every running script (new run / continue). */
  resetScripts() {
    this.waiters.forEach((w) => w.reject(new Abort()));
    this.waiters = [];
    this.tickers.clear();
    this.handlers.clear();
    this.action = null;
    this.mode = "cut";
    this.busy = false;
    this.replay = null;
    this.basement = null;
    this.showMap = false;
    this.tabScreen = false;
    this.suggestState = null;
    this.ui.set({ bubble: null, choices: null, prompt: null, action: null, suggest: null, card: null, slot: null, stamp: null, end: null, hint: null, goal: null, newKeepsake: null });
  }

  private onVis = () => {
    if (document.hidden) {
      if (this.ui.get().screen === "play" && !this.ui.get().paused) this.setPaused(true);
      audio.suspend();
    } else audio.resume();
  };

  /* ---------------- prefs ---------------- */

  setPrefs(p: Prefs, persist = true) {
    this.prefs = p;
    if (persist) writePrefs(p);
    const osReduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.reduced = p.motion === "reduce" || (p.motion === "auto" && osReduce);
    this.cam.reduced = this.reduced;
    this.env.reduced = this.reduced;
    this.input.acceptKey = p.acceptKey;
    audio.setEnabled(p.sound);
    audio.setVolume(p.volume);
    this.ui.set({ prefs: p });
  }

  setPaused(on: boolean) {
    this.ui.set({ paused: on });
    if (on) {
      audio.suspend();
    } else audio.resume();
  }

  /* ---------------- scene + actors ---------------- */

  setScene(s: Scene, x: number, facing: 1 | -1 = 1) {
    this.scene = s;
    this.layers = s.layers.map((l) => [...l].sort((a, b) => a.sort - b.sort));
    this.npcs = {};
    this.handlers.clear();
    this.you.x = x;
    this.you.y = s.walkY;
    this.you.vx = 0;
    this.you.facing = facing;
    this.you.anim = "idle";
    this.walkTarget = null;
    this.cam.snapTo(x, s.width);
    this.tab.x = this.tab.targetX = x - 40;
    this.tab.y = this.tab.targetY = s.walkY - 110;
    audio.setBed(s.bed);
    s.hotspots.forEach((h) => (h.done = false));
  }

  npc(name: string, a: Actor) {
    this.npcs[name] = a;
    return a;
  }

  zone() {
    const x = this.you.x;
    return this.scene.zones.find((z) => x >= z.from && x < z.to)?.id ?? "open";
  }

  private speaker(who: Who): Actor | Tab | null {
    if (who === "you") return this.you;
    if (who === "tab") return this.tab;
    return this.npcs[who] ?? null;
  }

  /* ---------------- async primitives ---------------- */

  until(test: () => boolean): Promise<void> {
    if (this.dead) return Promise.reject(new Abort());
    return new Promise((resolve, reject) => this.waiters.push({ test, resolve, reject }));
  }

  wait(s: number) {
    const end = this.time + s;
    return this.until(() => this.time >= end);
  }

  /** Blocking line (waits for advance). With `bark`, shows for N seconds and returns at once. */
  say(who: Who, text: string, o: { mood?: Mood; tab?: TabMood; voice?: string; bark?: number } = {}): Promise<void> {
    text = text.replace(/\{name\}/g, this.playerName);
    const id = ++this.seq;
    if (o.mood && who !== "tab" && who !== "narrator") (this.speaker(who) as Actor | null)?.setMood(o.mood);
    if (o.tab) this.tab.mood = o.tab;
    const instant = this.reduced;
    const kind = who === "tab" ? "tab" : who === "narrator" ? "narration" : "human";
    const name = who === "you" ? this.playerName || NAMES.you : NAMES[who];
    this.lastShown = instant ? text.length : 0;
    this.ui.set((s) => ({
      ...s,
      bubble: { id, who, name, text, shown: instant ? text.length : 0, kind, blocking: !o.bark, voice: o.voice },
      log: [...s.log.slice(-8), { who: name, text }],
    }));
    if (o.bark) {
      const end = this.time + o.bark;
      this.until(() => this.time >= end || this.ui.get().bubble?.id !== id)
        .then(() => {
          if (this.ui.get().bubble?.id === id) this.ui.set({ bubble: null });
        })
        .catch(() => {});
      return Promise.resolve();
    }
    return this.until(() => this.advancedId >= id);
  }

  bark(who: Who, text: string, secs = 0) {
    // only if nothing blocking is on screen
    if (this.ui.get().bubble?.blocking) return;
    void this.say(who, text, { bark: secs || 1.6 + text.length * 0.045 });
  }

  /** Complete the line, or advance if it is fully shown. Called by keys, taps and the bubble. */
  advance() {
    const b = this.ui.get().bubble;
    if (!b || !b.blocking) return;
    if (b.shown < b.text.length) {
      this.ui.set({ bubble: { ...b, shown: b.text.length } });
      return;
    }
    this.advancedId = b.id;
    this.ui.set({ bubble: null });
    audio.ui("advance");
  }

  choose(options: ChoiceUi["options"], prompt?: string): Promise<number> {
    const id = ++this.seq;
    this.guardUntil = this.time + 0.4;
    this.ui.set({ choices: { id, options, prompt } });
    return this.until(() => this.chosen?.id === id).then(() => {
      const i = this.chosen!.index;
      this.ui.set({ choices: null });
      return i;
    });
  }

  pick(i: number) {
    const c = this.ui.get().choices;
    if (!c || i < 0 || i >= c.options.length) return;
    audio.ui("pick");
    this.chosen = { id: c.id, index: i };
  }

  /** Tab offers a shortcut. Accept / hold-to-Inspect / Reject. */
  suggest(title: string): Promise<{ choice: "accept" | "reject"; inspected: boolean }> {
    const id = ++this.seq;
    this.suggestState = { id, result: null, inspected: false };
    this.guardUntil = this.time + 0.4;
    this.ui.set({ suggest: { id, title, inspecting: false, inspected: false } });
    this.tab.mood = "eager";
    return this.until(() => this.suggestState?.id === id && !!this.suggestState.result).then(() => {
      const st = this.suggestState!;
      this.suggestState = null;
      this.inspectAmt = 0;
      audio.inspectHold(false);
      this.ui.set({ suggest: null });
      return { choice: st.result!, inspected: st.inspected };
    });
  }

  suggestAct(k: "accept" | "reject") {
    if (!this.suggestState || this.suggestState.result) return;
    this.suggestState.result = k;
    audio.ui(k);
    this.tab.react(k);
    if (k === "accept" && navigator.vibrate) navigator.vibrate(12);
    if (k === "reject" && navigator.vibrate) navigator.vibrate([8, 40, 8]);
  }

  touchInspect(on: boolean) {
    this.input.touchInspect = on;
  }

  /** Free walk until `done()` is true. `goal` drives Story-only autopilot. */
  explore(done: () => boolean, goal?: Goal | (() => Goal | null)): Promise<void> {
    this.mode = "free";
    this.goal = goal ?? null;
    return this.until(() => !this.busy && done()).then(() => {
      this.mode = "cut";
      this.goal = null;
      this.walkTarget = null;
      this.pendingUse = null;
      this.ui.set({ prompt: null });
    });
  }

  on(id: string, fn: () => Promise<void>) {
    this.handlers.set(id, fn);
  }
  off(id: string) {
    this.handlers.delete(id);
  }

  walk(a: Actor, x: number) {
    return this.until(() => a.moveTo(x, STEP, -1e9, 1e9));
  }

  /** First scene of a run reveals from a full wipe; later ones wipe across. */
  async enter(color: string, mid: () => void | Promise<void>) {
    if (!this.fresh) return this.transition(color, mid);
    this.fresh = false;
    this.wipe = { a: 1, dir: 0, color, out: true };
    await mid();
    this.wipe.dir = -1;
    await this.until(() => this.wipe.a <= 0);
    this.wipe.dir = 0;
  }

  /** One action chip (E / tap) that the script waits on, e.g. "Eat". */
  press(label: string): Promise<void> {
    const id = ++this.seq;
    this.pressId = id;
    this.ui.set({ action: { label } });
    const t0 = this.time;
    return this.until(() => this.pressedId === id || (this.prefs.storyOnly && this.time - t0 > 0.9)).then(() => {
      this.pressId = 0;
      this.ui.set({ action: this.action ? { label: this.action.label } : null });
    });
  }

  /** Run a beat that stops the walk (e.g. Tab's suggestion on the street). */
  interrupt(fn: () => Promise<void>) {
    if (this.busy) return;
    this.busy = true;
    this.walkTarget = null;
    this.ui.set({ prompt: null });
    fn()
      .catch((e) => {
        if (!(e instanceof Abort)) console.error(e);
      })
      .finally(() => (this.busy = false));
  }

  async transition(color: string, mid: () => void | Promise<void>) {
    this.wipe = { a: 0, dir: 1, color, out: false };
    audio.ui("chapter");
    await this.until(() => this.wipe.a >= 1);
    await mid();
    this.wipe.out = true;
    this.wipe.dir = -1;
    await this.until(() => this.wipe.a <= 0);
    this.wipe.dir = 0;
  }

  async showCard(kicker: string, title: string, sub: string, bg: string, fg: string = C.paper, hold = 2.2) {
    this.ui.set({ card: { kicker, title, sub, bg, fg } });
    const end = this.time + hold;
    let skip = false;
    const t0 = this.time;
    this.cardSkip = () => {
      if (this.time - t0 > 0.6) skip = true;
    };
    await this.until(() => skip || this.time >= end);
    this.cardSkip = null;
    this.ui.set({ card: null });
  }
  cardSkip: (() => void) | null = null;

  slot(prompt: string, pieces: { id: string; text: string }[], max: number): Promise<string[]> {
    const id = ++this.seq;
    this.guardUntil = this.time + 0.4;
    this.ui.set({ slot: { id, prompt, pieces, placed: [], max } });
    return this.until(() => this.slotDone === id).then(() => {
      const placed = this.ui.get().slot?.placed ?? [];
      this.ui.set({ slot: null });
      return placed;
    });
  }

  togglePiece(pid: string) {
    const s = this.ui.get().slot;
    if (!s) return;
    const has = s.placed.includes(pid);
    if (!has && s.placed.length >= s.max) return;
    audio.ui("pick");
    this.ui.set({ slot: { ...s, placed: has ? s.placed.filter((p) => p !== pid) : [...s.placed, pid] } });
  }

  confirmSlot() {
    const s = this.ui.get().slot;
    if (!s) return;
    if (s.pieces.length && !s.placed.length) return;
    this.slotDone = s.id;
  }

  stampAll(initial: Partial<Record<Seg, Stamp>> = {}): Promise<Partial<Record<Seg, Stamp>>> {
    const id = ++this.seq;
    const first = SEGS.find((s) => !initial[s.id])?.id ?? "A";
    this.guardUntil = this.time + 0.4;
    this.ui.set({ stamp: { id, selected: first, stamps: { ...initial } } });
    if (this.replay) this.replay.selected = first;
    return this.until(() => this.stampDone === id).then(() => {
      const st = this.ui.get().stamp!.stamps;
      this.ui.set({ stamp: null });
      if (this.replay) this.replay.selected = null;
      return st;
    });
  }

  selectSeg(s: Seg) {
    const st = this.ui.get().stamp;
    if (!st) return;
    this.ui.set({ stamp: { ...st, selected: s } });
    if (this.replay) this.replay.selected = s;
  }

  stamp(kind: Stamp) {
    const st = this.ui.get().stamp;
    if (!st || !this.replay) return;
    const stamps = { ...st.stamps, [st.selected]: kind };
    this.replay.stamps = stamps;
    this.replay.stampFlash = 1;
    audio.ui(kind === "unknown" ? "keepsake" : "pick");
    this.tab.react(kind === "draw" ? "accept" : "inspect");
    // auto-advance to the next unstamped segment
    const order = SEGS.map((s) => s.id);
    const next = order.find((s) => !stamps[s]) ?? st.selected;
    this.ui.set({ stamp: { ...st, stamps, selected: next } });
    this.replay.selected = next;
  }

  finishStamps(force = false) {
    const st = this.ui.get().stamp;
    if (!st) return;
    if (!force && SEGS.some((s) => !st.stamps[s.id])) return;
    this.stampDone = st.id;
  }

  setHint(h: string | null) {
    this.ui.set({ hint: h });
  }

  setGoal(text: string | null) {
    this.ui.set({ goal: text });
  }

  setAction(label: string | null, press?: () => void) {
    this.action = label && press ? { label, press } : null;
    this.ui.set({ action: label ? { label } : null });
  }

  keepsake(id: string) {
    if (this.run.keepsakes.includes(id)) return;
    this.run.keepsakes.push(id);
    audio.ui("keepsake");
    this.ui.set({ keepsakes: [...this.run.keepsakes], newKeepsake: id });
    const end = this.time + 3.2;
    this.until(() => this.time >= end)
      .then(() => this.ui.get().newKeepsake === id && this.ui.set({ newKeepsake: null }))
      .catch(() => {});
  }

  checkpoint(id: string) {
    this.checkpointId = id;
    writeSave({
      v: 3,
      chapter: chapterOf(id),
      checkpoint: id,
      flags: this.run.flags,
      ledger: this.run.ledger,
      keepsakes: this.run.keepsakes,
      people: this.run.people,
      chai: this.run.chai,
      understanding: this.run.understanding,
      name: this.run.name,
      endingsSeen: [],
      runs: 0,
      finished: id === "done",
      updatedAt: Date.now(),
      fixes: id === "replay" || id === "finale" ? this.phone.fixes : undefined,
    });
    this.ui.set({ hasSave: true });
  }

  /* ---------------- pointer ---------------- */

  private onPointerDown = (e: PointerEvent) => {
    if (this.ui.get().paused || this.ui.get().screen !== "play") return;
    this.root.focus({ preventScroll: true });
    const [x, y] = this.stage.toLogical(e.clientX, e.clientY);
    this.pointerDown = { x, y, t: performance.now(), id: e.pointerId };
    this.touchMoved = false;
    if (this.ui.get().suggest) {
      this.longPress = window.setTimeout(() => this.touchInspect(true), 350);
    } else if (this.mode === "free" && !this.busy && !this.ui.get().bubble?.blocking) {
      this.tapWorld(x, y, true);
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointerDown || e.pointerId !== this.pointerDown.id) return;
    const [x, y] = this.stage.toLogical(e.clientX, e.clientY);
    if (Math.hypot(x - this.pointerDown.x, y - this.pointerDown.y) > 6) this.touchMoved = true;
    if (this.mode === "free" && !this.busy && this.touchMoved) this.tapWorld(x, y, false);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pointerDown || e.pointerId !== this.pointerDown.id) return;
    window.clearTimeout(this.longPress);
    const wasInspect = this.input.touchInspect;
    this.touchInspect(false);
    const d = this.pointerDown;
    this.pointerDown = null;
    if (wasInspect) return;
    if (performance.now() - d.t < 400 && !this.touchMoved) {
      if (this.ui.get().bubble?.blocking) this.advance();
      else if (this.cardSkip) this.cardSkip();
    }
  };

  private tapWorld(sx: number, sy: number, allowUse: boolean) {
    const [wx, wy] = this.cam.toWorld(sx, sy);
    if (allowUse) {
      const h = this.scene.hotspots.find((h) => this.handlers.has(h.id) && !h.done && Math.abs(wx - h.x) < h.r + 12 && wy > h.gy - 50 && wy < this.scene.walkY + 30);
      if (h) {
        this.walkTarget = clamp(h.x, this.scene.walkMin, this.scene.walkMax);
        this.pendingUse = h.id;
        return;
      }
    }
    this.pendingUse = null;
    this.walkTarget = clamp(wx, this.scene.walkMin, this.scene.walkMax);
  }

  useHotspot(id: string) {
    const h = this.scene.hotspots.find((s) => s.id === id);
    if (!h || this.mode !== "free" || this.busy) return;
    if (Math.abs(this.you.x - h.x) <= h.r + 16) this.fire(id);
    else {
      this.walkTarget = h.x;
      this.pendingUse = id;
    }
  }

  doAction() {
    if (this.pressId) {
      this.pressedId = this.pressId;
      audio.ui("pick");
      return;
    }
    if (this.action && this.mode === "free" && !this.busy) this.action.press();
  }

  private fire(id: string) {
    const fn = this.handlers.get(id);
    if (!fn) return;
    const h = this.scene.hotspots.find((s) => s.id === id);
    this.busy = true;
    this.walkTarget = null;
    this.pendingUse = null;
    this.you.vx = 0;
    if (this.you.anim === "walk") this.you.anim = "idle";
    if (h) this.you.facing = h.x >= this.you.x ? 1 : -1;
    this.ui.set({ prompt: null });
    fn()
      .catch((e) => {
        if (!(e instanceof Abort)) console.error(e);
      })
      .finally(() => {
        this.busy = false;
        this.autoAt = this.time;
        if (h?.once) h.done = true;
      });
  }

  /* ---------------- update ---------------- */

  private update(dt: number) {
    const a = this.input.read();
    const ui = this.ui.get();
    if (a.pause && ui.screen === "play") {
      this.setPaused(!ui.paused);
      if (!ui.paused) (document.activeElement as HTMLElement | null)?.blur?.();
      return;
    }
    if (ui.paused || ui.screen === "title") {
      this.idleTitle(dt);
      return;
    }
    this.time += dt;
    this.env.t = this.time;
    this.env.px = this.you.x;

    this.handleKeys(a, ui);
    this.typewriter(dt);
    this.movement(a, dt);

    for (const n of Object.values(this.npcs)) n.update(dt, !this.reduced);
    this.you.update(dt, !this.reduced);
    if (this.tabFollow && !this.tabScreen) {
      this.tab.targetX = this.you.x - this.you.facing * 38;
      this.tab.targetY = this.you.y - 104 - (this.you.anim === "sit" || this.you.anim === "type" ? -14 : 0);
    }
    this.tab.speaking = ui.bubble?.who === "tab" && ui.bubble.shown < ui.bubble.text.length;
    this.tab.update(dt);
    // board, wipe, replay fx
    this.world.boardBack = lerp(this.world.boardBack, this.world.boardTarget, damp(0.05, dt));
    if (this.wipe.dir) this.wipe.a = clamp(this.wipe.a + this.wipe.dir * dt * (this.reduced ? 3 : 2.6), 0, 1);
    if (this.replay) this.replay.stampFlash = Math.max(0, this.replay.stampFlash - dt * 3);
    if (this.basement) this.basement.t += dt;
    if (this.scene.id === "street" && this.showMap) this.phone.update(dt, this.you.x, this.idle, this.env.clock);
    audio.duck(!!ui.bubble?.blocking || !!ui.choices);

    for (const t of [...this.tickers]) t(dt);
    // resolve waiters (each test runs exactly once per tick)
    const ws = this.waiters;
    this.waiters = [];
    for (const w of ws) {
      let ok = false;
      try {
        ok = w.test();
      } catch (e) {
        w.reject(e);
        continue;
      }
      if (ok) w.resolve();
      else this.waiters.push(w);
    }
    if (this.scene) this.cam.follow(this.camTarget(), this.scene.width, dt);
  }

  camFocus: number | null = null;
  private camTarget() {
    return this.camFocus ?? this.you.x;
  }

  private idleTitle(dt: number) {
    // keep the title backdrop alive (breathing, fan) without running the script clock
    this.env.t += dt;
    this.you.update(dt, false);
    this.tab.update(dt);
  }

  private handleKeys(a: Actions, ui: Ui) {
    if (ui.card && (a.interact || a.any) && this.cardSkip) {
      this.cardSkip();
      return;
    }
    if (ui.bubble?.blocking && a.interact) {
      this.advance();
      return;
    }
    if (this.time < this.guardUntil && (ui.choices || ui.slot || ui.stamp || ui.suggest)) return;
    if (ui.choices && a.num) {
      this.pick(a.num - 1);
      return;
    }
    if (this.suggestState && !this.suggestState.result) {
      if (a.accept) this.suggestAct("accept");
      else if (a.reject) this.suggestAct("reject");
      const target = a.inspect ? 1 : 0;
      this.inspectAmt = lerp(this.inspectAmt, target, Math.min(1, (this.reduced ? 1 : 0.18) * (STEP * 60)));
      audio.inspectHold(a.inspect);
      if (a.inspect) {
        this.env.clock += STEP * 1.5; // looking closer costs a little in-world time, never points
        if (this.inspectAmt > 0.5 && !this.suggestState.inspected) {
          this.suggestState.inspected = true;
          this.run.ledger.inspected++;
          this.tab.react("inspect");
          audio.ui("inspect");
        }
      }
      const s = ui.suggest;
      if (s && (s.inspecting !== a.inspect || s.inspected !== this.suggestState.inspected))
        this.ui.set({ suggest: { ...s, inspecting: a.inspect, inspected: this.suggestState.inspected } });
      if (this.replay) this.replay.inspect = this.inspectAmt;
    }
    if (ui.stamp) {
      const order = SEGS.map((s) => s.id);
      if (a.dx) this.selectSeg(order[(order.indexOf(ui.stamp.selected) + a.dx + order.length) % order.length]);
      if (a.num) this.stamp((["draw", "keep", "unknown"] as Stamp[])[a.num - 1]);
      if (a.interact) this.finishStamps();
    }
    if (ui.slot) {
      if (a.num && ui.slot.pieces[a.num - 1]) this.togglePiece(ui.slot.pieces[a.num - 1].id);
      if (a.interact) this.confirmSlot();
    }
    if (this.pressId && a.interact) {
      this.doAction();
      return;
    }
    if (this.mode === "free" && !this.busy && a.interact) {
      const p = ui.prompt;
      if (p) this.fire(p.id);
      else this.doAction();
    }
  }

  private typewriter(dt: number) {
    const b = this.ui.get().bubble;
    if (!b || b.shown >= b.text.length) {
      const sp = b ? this.speaker(b.who) : null;
      if (sp) sp.speaking = false;
      return;
    }
    const cps = 45;
    const next = Math.min(b.text.length, b.shown + dt * cps);
    const from = Math.floor(b.shown);
    const to = Math.floor(next);
    for (let i = from; i < to; i++) {
      const ch = b.text[i];
      if (!/[a-z0-9]/i.test(ch)) continue;
      if (b.who === "tab" && i % 2 === 0) audio.tabBlip(i, this.tab.mood === "eager" ? "eager" : this.tab.mood === "sad" ? "low" : "neutral");
      else if (b.who === "narrator" && i % 2 === 0) audio.tick();
      else if (b.who !== "tab" && b.who !== "narrator" && i % 3 === 0) audio.humBlip(i, b.who === "you" ? 1.1 : b.who === "zoya" ? 1.35 : 0.85);
    }
    const sp = this.speaker(b.who);
    if (sp) sp.speaking = next < b.text.length;
    if (to !== Math.floor(b.shown) || next >= b.text.length) this.ui.set({ bubble: { ...b, shown: next } });
    else b.shown = next; // sub-char progress without re-rendering
  }

  private movement(a: Actions, dt: number) {
    const s = this.scene;
    if (!s) return;
    const free = this.mode === "free" && !this.busy && !this.ui.get().bubble?.blocking && !this.ui.get().choices;
    if (!free) {
      if (this.mode === "free" && this.you.anim === "walk" && !this.busy) this.you.drive(0, dt, s.walkMin, s.walkMax);
      this.ui.get().prompt && this.mode !== "free" && this.ui.set({ prompt: null });
      return;
    }
    let ax = a.ax;
    if (ax) {
      this.walkTarget = null;
      this.pendingUse = null;
    }
    const goal = typeof this.goal === "function" ? this.goal() : this.goal;
    // brief cooldown so explore() sees the handler settle before autopilot fires again
    if (!ax && this.walkTarget === null && this.prefs.storyOnly && goal && this.time - this.autoAt > 0.4) {
      this.walkTarget = goal.x;
      if (goal.use) this.pendingUse = goal.use;
    }
    if (!ax && this.walkTarget !== null) {
      const d = this.walkTarget - this.you.x;
      if (Math.abs(d) < 3) {
        this.walkTarget = null;
        if (this.pendingUse) {
          const id = this.pendingUse;
          this.pendingUse = null;
          if (this.handlers.has(id)) this.fire(id);
          return;
        }
      } else ax = Math.sign(d);
    }
    this.you.drive(ax, dt, s.walkMin, s.walkMax);
    if (a.ay && s.depth[0] !== s.depth[1]) this.you.y = clamp(this.you.y + a.ay * 46 * dt, s.depth[0], s.depth[1]);
    this.idle = Math.abs(this.you.vx) < 2 ? this.idle + dt : 0;
    // small life: fidget when left alone
    this.fidget = this.you.anim === "idle" ? this.fidget + dt : 0;
    if (this.fidget > 5.5) {
      this.fidget = 0;
      const opts: ("scratch" | "stretch" | "phone" | "sip")[] = this.you.held === "chai" ? ["sip"] : this.you.held === "phone" ? ["phone", "scratch", "stretch"] : ["scratch", "stretch"];
      this.you.gesture(opts[Math.floor(Math.random() * opts.length)], 1.5);
    }
    // nearest active hotspot → prompt
    let best: { id: string; label: string; verb: string; d: number } | null = null;
    for (const h of s.hotspots) {
      if (h.done || !this.handlers.has(h.id)) continue;
      const d = Math.abs(this.you.x - h.x);
      if (d <= h.r + 16 && (!best || d < best.d)) best = { id: h.id, label: h.label, verb: verbFor(h.kind), d };
    }
    const cur = this.ui.get().prompt;
    if ((best?.id ?? null) !== (cur?.id ?? null)) {
      this.ui.set({ prompt: best ? { id: best.id, label: best.label, verb: best.verb } : null });
      if (best) audio.ui("glint");
    }
  }

  /* ---------------- render ---------------- */

  private render() {
    const ctx = this.stage.begin();
    if (!this.scene) {
      ctx.fillStyle = C.paper;
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const env = this.env;
    this.scene.sky(ctx, env, this.cam.x);
    const boil = !this.reduced;
    for (let i = 0; i < 4; i++) {
      const f = this.reduced ? 1 : PARALLAX[i];
      ctx.save();
      this.cam.apply(ctx, f);
      const left = this.cam.x * f - 140;
      const right = this.cam.x * f + W + 140;
      const layer = this.layers[i];
      if (i === 2) {
        const actors = [this.you, ...Object.values(this.npcs)].filter((a) => a.visible).sort((a, b) => a.y - b.y);
        let ai = 0;
        for (const p of layer) {
          while (ai < actors.length && actors[ai].y < p.sort) actors[ai++].draw(ctx, this.time, boil);
          if (p.x + p.w < left || p.x > right) continue;
          p.draw(ctx, env);
        }
        while (ai < actors.length) actors[ai++].draw(ctx, this.time, boil);
        this.scene.overlay?.(ctx, env);
        if (!this.tabScreen) this.tab.draw(ctx, this.time, boil, this.reduced);
        this.drawGlints(ctx);
        if (this.mode === "free" && this.walkTarget !== null) this.drawTarget(ctx, this.walkTarget);
      } else {
        for (const p of layer) {
          if (p.x + p.w < left || p.x > right) continue;
          p.draw(ctx, env);
        }
      }
      ctx.restore();
    }
    // screen-space
    ctx.setTransform(this.stage.px, 0, 0, this.stage.px, 0, 0);
    if (this.basement) this.drawBasement(ctx);
    if (this.showMap) drawMiniMap(ctx, this.phone, env.clock, W - 174, 10, 164, 106, this.time);
    if (this.inspectNote && this.inspectAmt > 0.05) {
      // under the map card on the street; top-right elsewhere
      const top = this.showMap ? 122 : 10;
      // wrap by measured width, in the same font label() draws with
      ctx.save();
      ctx.font = `700 8.5px ${fonts().hand}`;
      const lines: string[] = [];
      let line = "";
      for (const w of this.inspectNote.split(" ")) {
        const next = line ? line + " " + w : w;
        if (line && ctx.measureText(next).width > 148) {
          lines.push(line);
          line = w;
        } else line = next;
      }
      lines.push(line);
      ctx.globalAlpha = this.inspectAmt;
      ctx.fillStyle = C.lilac;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(W - 174, top, 164, lines.length * 11 + 10, 6);
      ctx.fill();
      ctx.stroke();
      lines.forEach((l, i) => label(ctx, l, W - 166, top + 11 + i * 11, { size: 8.5, font: "hand", weight: 700 }));
      ctx.restore();
    }
    if (this.replay) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      const tip = drawReplay(ctx, this.phone, this.replay, 50, 10, 540, 262, this.time);
      if (this.tabScreen) {
        if (this.replay.showTabLine && this.replay.tabLine > 0 && this.replay.tabLine < 1) {
          this.tab.targetX = tip[0] + 14;
          this.tab.targetY = tip[1] - 6;
        }
        this.tab.draw(ctx, this.time, boil, this.reduced);
      }
      if (this.replay.inspect > 0.05) this.drawLens(ctx, this.replay.inspect, false);
    } else if (this.inspectAmt > 0.05) this.drawLens(ctx, this.inspectAmt);
    if (this.wipe.a > 0) {
      ctx.fillStyle = this.wipe.color;
      if (this.reduced) {
        ctx.globalAlpha = this.wipe.a;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      } else if (!this.wipe.out) this.paperWipe(ctx, 0, this.wipe.a);
      else this.paperWipe(ctx, 1 - this.wipe.a, 1);
    }
    this.placeDom();
  }

  private paperWipe(ctx: CanvasRenderingContext2D, from: number, to: number) {
    // a torn-paper edge sweeping across in the hue
    const x0 = from * (W + 40) - 20;
    const x1 = to * (W + 40) - 20;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    for (let y = 0; y <= H; y += 24) ctx.lineTo(x1 + ((y / 24) % 2 ? 10 : -6), y);
    ctx.lineTo(x1, H);
    ctx.lineTo(x0, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  private drawLens(ctx: CanvasRenderingContext2D, amt: number, text = true) {
    ctx.save();
    ctx.globalAlpha = amt;
    ctx.strokeStyle = C.lilac;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(7, 7, W - 14, H - 14);
    if (text) label(ctx, "INSPECTING · Q", 18, 20, { size: 9, font: "display", weight: 800, color: C.ink });
    ctx.restore();
  }

  private drawGlints(ctx: CanvasRenderingContext2D) {
    if (this.mode !== "free" || this.busy) return;
    const p = this.ui.get().prompt;
    for (const h of this.scene.hotspots) {
      if (h.done || !this.handlers.has(h.id)) continue;
      const near = p?.id === h.id;
      const pulse = this.reduced ? 1 : 0.75 + 0.25 * Math.sin(this.time * 4 + h.x);
      const r = (near ? 9 : 6) * pulse;
      const x = h.x;
      const y = h.gy - (near ? 6 : 0);
      if (near) glow(ctx, x, y, 26, C.sun, 0.35);
      inkPoly(ctx, h.x, [[x, y - r], [x + r * 0.28, y - r * 0.28], [x + r, y], [x + r * 0.28, y + r * 0.28], [x, y + r], [x - r * 0.28, y + r * 0.28], [x - r, y], [x - r * 0.28, y - r * 0.28]], { fill: C.sun, stroke: C.ink, lw: 1.5 });
    }
  }

  private drawTarget(ctx: CanvasRenderingContext2D, x: number) {
    const y = this.you.y + 2;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawBasement(ctx: CanvasRenderingContext2D) {
    const b = this.basement!;
    ctx.fillStyle = "#2A2638";
    ctx.fillRect(0, 0, W, H);
    glow(ctx, 320, 70, 260, C.sun, 0.25);
    ctx.strokeStyle = C.ink;
    inkPoly(ctx, 600, [[320, 0], [320, 54]], { stroke: C.muted, lw: 2 }, false);
    inkPoly(ctx, 601, [[310, 54], [330, 54], [326, 68], [314, 68]], { fill: C.sun, stroke: C.ink, lw: 2 });
    // floor + table
    inkPoly(ctx, 602, [[0, 290], [W, 290], [W, H], [0, H]], { fill: "#3A3448", stroke: C.ink });
    inkPoly(ctx, 603, [[220, 230], [460, 230], [460, 240], [220, 240]], { fill: C.coral, stroke: C.ink });
    inkPoly(ctx, 604, [[236, 240], [246, 240], [246, 300], [236, 300]], { fill: C.muted, stroke: C.ink });
    inkPoly(ctx, 605, [[434, 240], [444, 240], [444, 300], [434, 300]], { fill: C.muted, stroke: C.ink });
    // bowl with noodles
    const level = 1 - b.bites / 3;
    inkPoly(ctx, 606, [[330, 216], [380, 216], [372, 230], [338, 230]], { fill: C.paper, stroke: C.ink, lw: 2 });
    if (level > 0) {
      ctx.strokeStyle = C.sun;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4 * level + 1; i++) {
        ctx.beginPath();
        const yy = 216 - 2 * level;
        ctx.moveTo(338 + i * 8, yy);
        ctx.quadraticCurveTo(342 + i * 8, yy - 5 * level, 346 + i * 8, yy);
        ctx.stroke();
      }
      if (!this.reduced) {
        ctx.globalAlpha = 0.5;
        const o = (b.t * 12) % 12;
        inkPoly(ctx, 607, [[350, 206 - o], [354, 198 - o], [350, 190 - o]], { stroke: C.paper, lw: 1.5 }, false);
        inkPoly(ctx, 608, [[362, 204 - o], [366, 196 - o], [362, 188 - o]], { stroke: C.paper, lw: 1.5 }, false);
        ctx.globalAlpha = 1;
      }
    }
    // phone face-down on the table
    inkPoly(ctx, 609, [[400, 226], [420, 226], [420, 230], [400, 230]], { fill: C.ink, stroke: C.ink });
    label(ctx, "MAGGI POINT · basement", 24, 26, { size: 13, font: "hand", color: C.sun, weight: 700 });
    // You at the table, drawn in screen space
    const you = this.you;
    const ox = you.x;
    const oy = you.y;
    you.x = 280;
    you.y = 262;
    you.draw(ctx, this.time, !this.reduced);
    you.x = ox;
    you.y = oy;
    const tx = this.tab.x;
    const ty = this.tab.y;
    this.tab.x = 420;
    this.tab.y = 180;
    this.tab.draw(ctx, this.time, !this.reduced, this.reduced);
    this.tab.x = tx;
    this.tab.y = ty;
  }

  /** Anchor the DOM bubble and prompt to world positions (no React re-render). */
  private placeDom() {
    const sc = this.stage.scale;
    const hostW = this.stage.host.clientWidth;
    const b = this.ui.get().bubble;
    const el = this.els.bubble;
    if (b && el) {
      let sx = W / 2;
      let sy = 40;
      if (b.kind !== "narration") {
        if (b.who === "tab" && this.tabScreen) {
          sx = this.tab.x;
          sy = this.tab.y - this.tab.size - 8;
        } else if (b.who === "you" && this.basement) {
          sx = 280;
          sy = 160;
        } else if (b.who === "tab" && this.basement) {
          sx = 420;
          sy = 140;
        } else {
          // a voice with no actor (a phone call) anchors to the player
          const [wx, wy] = (this.speaker(b.who) ?? this.you).headTop();
          [sx, sy] = this.cam.toScreen(wx, wy);
        }
      }
      const bw = el.offsetWidth;
      const bh = el.offsetHeight;
      const px = sx * sc;
      const py = sy * sc;
      const left = clamp(px - bw / 2, 6, Math.max(6, hostW - bw - 6));
      const top = b.kind === "narration" ? 10 : clamp(py - bh - 16, 6, 9999);
      el.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
      el.style.setProperty("--tail", `${clamp(px - left, 16, bw - 16)}px`);
      el.dataset.tail = b.kind !== "narration" && top < py - bh - 4 ? "1" : "0";
    }
    const p = this.ui.get().prompt;
    const pel = this.els.prompt;
    if (p && pel) {
      const h = this.scene.hotspots.find((s) => s.id === p.id);
      if (h) {
        const [sx, sy] = this.cam.toScreen(h.x, h.gy);
        const w = pel.offsetWidth;
        pel.style.transform = `translate3d(${Math.round(clamp(sx * sc - w / 2, 4, hostW - w - 4))}px, ${Math.round(sy * sc - pel.offsetHeight - 14)}px, 0)`;
      }
    }
  }
}

const CHAPTERS = ["prologue", "meera", "sen", "ravi", "zoya", "finale"];
function chapterOf(checkpoint: string) {
  return CHAPTERS.includes(checkpoint) ? checkpoint : checkpoint === "done" ? "finale" : "anukul";
}

function verbFor(k: string) {
  return k === "talk" ? "Talk" : k === "look" ? "Look" : k === "door" ? "Go" : k === "sit" ? "Sit" : "Use";
}
