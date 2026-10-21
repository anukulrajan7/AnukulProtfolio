"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "./engine/audio";
import { clearSave, loadPrefs, loadSave } from "./engine/save";
import { Phone } from "./world/map";
import { buildHome } from "./world/scenes";
import { Game } from "./story/core";
import { runSlice } from "./story/script";
import { freshRun, KEEPSAKES, type Ui } from "./story/types";
import { Bubble, Card, Controls, Hud, KeepIcon, KeepsakeToast, Prompt, Settings, Transcript, useUi } from "./ui/overlay";

const selScreen = (s: Ui) => s.screen;
const selPaused = (s: Ui) => s.paused;
const selPrefs = (s: Ui) => s.prefs;
const selEnd = (s: Ui) => s.end;
const selHasSave = (s: Ui) => s.hasSave;

export default function StoryGame() {
  const rootRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [g, setG] = useState<Game | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const root = rootRef.current!;
    const save = loadSave();
    const game = new Game(canvasRef.current!, hostRef.current!, root, loadPrefs(), !!save && save.checkpoint !== "done");
    // title backdrop: the home desk at night
    game.setScene(buildHome(), 482);
    game.world.laptop = "code";
    game.env.evening = 1;
    game.env.light = false;
    game.you.anim = "type";
    game.you.y = 289;
    game.you.x = 474;
    game.you.posture = 0.2;
    game.tab.visible = false;
    setG(game);
    const ro = new ResizeObserver(() => setCompact(root.clientWidth < 700));
    ro.observe(root);
    const wake = () => audio.resume();
    root.addEventListener("pointerdown", wake);
    root.addEventListener("keydown", wake);
    // dev hook for scripted QA runs
    (window as unknown as { __story?: Game }).__story = game;
    return () => {
      ro.disconnect();
      root.removeEventListener("pointerdown", wake);
      root.removeEventListener("keydown", wake);
      game.destroy();
    };
  }, []);

  return (
    <section ref={rootRef} className="lw" tabIndex={-1} aria-label="The Long Way to OK, a story game" data-compact={compact ? "1" : "0"}>
      {g ? <Shell g={g} compact={compact} rootRef={rootRef} /> : null}
      <div ref={hostRef} className="lw-stage" data-hud={g ? "1" : "0"}>
        <canvas ref={canvasRef} className="lw-canvas" role="img" aria-label={g?.scene?.describe ?? "The game world"} />
        {g ? <StageLayer g={g} compact={compact} /> : null}
      </div>
      {g ? <BottomLayer g={g} compact={compact} /> : null}
    </section>
  );
}

function Shell({ g, compact, rootRef }: { g: Game; compact: boolean; rootRef: React.RefObject<HTMLElement | null> }) {
  const screen = useUi(g, selScreen);
  const prefs = useUi(g, selPrefs);
  useEffect(() => {
    rootRef.current?.setAttribute("data-text", prefs.textSize);
  }, [prefs.textSize, rootRef]);
  void compact;
  if (screen !== "play") return null;
  return <Hud g={g} onPause={() => g.setPaused(true)} />;
}

function StageLayer({ g, compact }: { g: Game; compact: boolean }) {
  const screen = useUi(g, selScreen);
  const paused = useUi(g, selPaused);
  return (
    <div className="lw-layer">
      {screen === "play" ? (
        <>
          {!compact ? <Bubble g={g} anchored /> : null}
          <Prompt g={g} />
          <KeepsakeToast g={g} />
          <Card g={g} />
          <Transcript g={g} />
          {!compact ? <Controls g={g} compact={false} /> : null}
        </>
      ) : null}
      {screen === "title" ? <Title g={g} /> : null}
      {screen === "end" ? <End g={g} /> : null}
      {paused && screen === "play" ? <Pause g={g} /> : null}
    </div>
  );
}

function BottomLayer({ g, compact }: { g: Game; compact: boolean }) {
  const screen = useUi(g, selScreen);
  if (!compact || screen !== "play") return null;
  return <Controls g={g} compact />;
}

function start(g: Game, mode: "new" | "continue") {
  g.resetScripts();
  g.fresh = true;
  g.phone = new Phone();
  let from = "prologue";
  const save = mode === "continue" ? loadSave() : null;
  if (save && save.checkpoint !== "done") {
    g.run = { flags: save.flags, ledger: save.ledger, keepsakes: save.keepsakes, people: save.people, chai: save.chai, understanding: save.understanding, name: save.name };
    g.phone.fixes = save.fixes ?? [];
    from = save.checkpoint;
  } else {
    clearSave();
    g.run = freshRun();
  }
  g.ui.set({ screen: "play", keepsakes: [...g.run.keepsakes], end: null, paused: false });
  g.root.focus({ preventScroll: true });
  void runSlice(g, from);
}

function Title({ g }: { g: Game }) {
  const prefs = useUi(g, selPrefs);
  const hasSave = useUi(g, selHasSave);
  const [opts, setOpts] = useState(false);
  const go = useCallback((m: "new" | "continue") => start(g, m), [g]);
  return (
    <div className="lw-title">
      <div className="lw-title-card">
        <p className="lw-kicker">a small story game</p>
        <h2 className="lw-title-h">The Long Way to OK</h2>
        <p className="lw-title-sub">Five developers. Before AI, and after.</p>
        <p className="lw-note">Four people you might know. And me. (Anukul)</p>
        <div className="lw-title-actions">
          {hasSave ? (
            <button type="button" className="lw-btn lw-btn-primary" onClick={() => go("continue")} autoFocus>
              Continue
            </button>
          ) : null}
          <button type="button" className={`lw-btn ${hasSave ? "lw-btn-ghost" : "lw-btn-primary"}`} onClick={() => go("new")} autoFocus={!hasSave}>
            {hasSave ? "New run" : "Play"}
          </button>
          <button type="button" className="lw-btn lw-btn-ghost" aria-pressed={prefs.sound} onClick={() => g.setPrefs({ ...prefs, sound: !prefs.sound })}>
            {prefs.sound ? "Sound on" : "Sound off"}
          </button>
          <button type="button" className="lw-btn lw-btn-ghost" aria-expanded={opts} onClick={() => setOpts((o) => !o)}>
            Options
          </button>
        </div>
        {opts ? <Settings g={g} prefs={prefs} /> : null}
        <p className="lw-controls-help">
          Walk <kbd>A</kbd>/<kbd>D</kbd> or arrows · use <kbd>E</kbd> · accept <kbd>Tab</kbd> · inspect hold <kbd>Q</kbd> · reject <kbd>R</kbd> · pause <kbd>Esc</kbd>. On a phone: tap to walk, tap glints, long-press to inspect. About 20 minutes.
        </p>
      </div>
    </div>
  );
}

function Pause({ g }: { g: Game }) {
  const prefs = useUi(g, selPrefs);
  const resume = () => {
    g.setPaused(false);
    g.root.focus({ preventScroll: true });
  };
  return (
    <div className="lw-modal" role="dialog" aria-modal="true" aria-label="Paused">
      <div className="lw-modal-card">
        <h2 className="lw-modal-h">Paused</h2>
        <Settings g={g} prefs={prefs} />
        <div className="lw-title-actions">
          <button type="button" className="lw-btn lw-btn-primary" onClick={resume} autoFocus>
            Resume
          </button>
          <button
            type="button"
            className="lw-btn lw-btn-ghost"
            onClick={() => {
              g.setPaused(false);
              start(g, "continue");
            }}
          >
            Restart this part
          </button>
          <button
            type="button"
            className="lw-btn lw-btn-ghost"
            onClick={() => {
              g.resetScripts();
              g.ui.set({ screen: "title", paused: false });
            }}
          >
            Title screen
          </button>
          <Link className="lw-btn lw-btn-ghost" href="/arcade">
            Leave
          </Link>
        </div>
        <p className="lw-controls-help">Esc pauses and hands the keyboard back to the page. Progress saves at each part.</p>
      </div>
    </div>
  );
}

function End({ g }: { g: Game }) {
  const e = useUi(g, selEnd);
  if (!e) return null;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return (
    <div className="lw-modal lw-end">
      <div className="lw-modal-card lw-end-card">
        <p className="lw-kicker">the end</p>
        <h2 className="lw-modal-h">OK.</h2>
        <div className="lw-ledger">
          <p>
            You accepted {plural(e.accepted, "suggestion")}. {e.wrong} {e.wrong === 1 ? "was" : "were"} wrong. You caught {e.caught}.
          </p>
          <p className="lw-ledger-sub">
            You looked closer {plural(e.inspected, "time")}. {e.honest ? "Your map says unknown where it should." : "Your map still has a line through a lake."}
          </p>
          <ul className="lw-end-keeps">
            {KEEPSAKES.map((k) => (
              <li key={k.id} data-have={e.keepsakes.includes(k.id) ? "1" : "0"}>
                <KeepIcon id={k.id} /> {e.keepsakes.includes(k.id) ? k.meaning : "Not this time."}
              </li>
            ))}
          </ul>
        </div>
        <div className="lw-what">
          <p className="lw-kicker">What actually happened</p>
          <p>
            I work at a real-time workspace company on tasks, chat, notifications and the live location module. Task lists that stay smooth past a thousand items. And
            a map that says unknown when it doesn&apos;t know, because a confident wrong line is worse than an honest gap.
          </p>
          <Link href="/work" className="lw-link">
            See the work page
          </Link>
        </div>
        <p className="lw-note">Thanks for playing. Five developers, one question: what do you do?</p>
        <div className="lw-title-actions">
          <button type="button" className="lw-btn lw-btn-primary" onClick={() => start(g, "new")}>
            Play again
          </button>
          <Link className="lw-btn lw-btn-ghost" href="/arcade">
            Back to the arcade
          </Link>
        </div>
      </div>
    </div>
  );
}
