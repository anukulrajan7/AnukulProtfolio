"use client";

// Arcade hub: a console-style launcher. Three big covers, arrow-key focus
// navigation, best score and star progress per game. Picking a cover opens
// the full-screen play screen (title -> levels -> play).

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { loadHigh } from "./engine";
import { getAudio } from "./games/audio";
import { Cover } from "./games/covers";
import { GAME_IDS, GAME_META, LEVELS } from "./games/levels";
import { LEARN } from "./games/concepts";
import { levelsCleared, loadProgress, nextLevel, PROGRESS_EVENT, starsEarned, starsPossible } from "./games/progress";
import type { Progress } from "./games/progress";
import { Progress as ProgressBar, Stars } from "./games/ui";
import type { MiniGameId } from "./types";
import "./games/arcade.css";

const PlayScreen = dynamic(() => import("./games/play-screen").then((m) => m.PlayScreen), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-bg text-[15px] font-bold text-muted" role="status">
      Loading…
    </div>
  ),
});

export function ArcadeCabinet({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState<MiniGameId | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [highs, setHighs] = useState<Record<MiniGameId, number>>({ stacker: 0, pingback: 0, route: 0 });
  const [focused, setFocused] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<MiniGameId | null>(null);

  const refresh = useCallback(() => {
    setProgress(loadProgress());
    setHighs({ stacker: loadHigh("stacker"), pingback: loadHigh("pingback"), route: loadHigh("route") });
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(PROGRESS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const close = useCallback(() => {
    const id = returnFocus.current;
    setOpen(null);
    refresh();
    requestAnimationFrame(() => {
      if (id) listRef.current?.querySelector<HTMLElement>(`[data-game="${id}"]`)?.focus({ preventScroll: true });
    });
  }, [refresh]);

  const launch = (id: MiniGameId) => {
    getAudio().ensure();
    getAudio().play("ui-select");
    returnFocus.current = id;
    setOpen(id);
  };

  const onKeys = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const n = GAME_IDS.length;
    let next = focused;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (focused + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (focused - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else return;
    e.preventDefault();
    if (next !== focused) getAudio().play("ui-move");
    setFocused(next);
    listRef.current?.querySelector<HTMLElement>(`[data-game="${GAME_IDS[next]}"]`)?.focus();
  };

  return (
    <div className={className}>
      <div ref={listRef} role="list" aria-label="Games" onKeyDown={onKeys} className="grid gap-6 md:grid-cols-3 md:gap-7">
        {GAME_IDS.map((id, i) => {
          const meta = GAME_META[id];
          const earned = progress ? starsEarned(progress, id, "learn") + starsEarned(progress, id, "arcade") : 0;
          const possible = starsPossible(id, "learn") + starsPossible(id, "arcade");
          const learnDone = progress ? levelsCleared(progress, id, "learn") : 0;
          const learnTotal = LEARN[id].length;
          const cleared = progress ? levelsCleared(progress, id, "arcade") : 0;
          const total = LEVELS[id].length;
          const next = progress ? nextLevel(progress, id, "learn") : 1;
          const allClear = learnDone === learnTotal;
          const status = !progress ? "" : learnDone === 0 && cleared === 0 ? "New" : allClear ? "Learn track clear" : `Learn: level ${next} next`;
          return (
            <div key={id} role="listitem" className="min-w-0">
              <button
                type="button"
                data-game={id}
                tabIndex={i === focused ? 0 : -1}
                onFocus={() => setFocused(i)}
                onClick={() => launch(id)}
                aria-label={`${meta.name}. ${meta.tagline}. ${status}`}
                className="arcade-card group block w-full text-left outline-none"
              >
                <div className="arcade-cover relative aspect-[16/10] overflow-hidden rounded-[16px] border-2 border-fg bg-card group-focus-visible:outline-4 group-focus-visible:outline-offset-4 group-focus-visible:outline-accent">
                  <Cover game={id} />
                  <span className="absolute left-3 top-3 rounded-full border-2 border-ink bg-paper px-2.5 py-0.5 text-[12px] font-bold text-ink">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {status ? (
                    <span className={`absolute right-3 top-3 rounded-full border-2 border-ink px-2.5 py-0.5 text-[12px] font-bold text-ink ${allClear ? "bg-p4" : cleared === 0 ? "bg-sun" : "bg-paper"}`}>
                      {status}
                    </span>
                  ) : null}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/35 to-transparent px-4 pb-3 pt-10 text-paper opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="text-[15px] font-bold drop-shadow">Play</span>
                    <span className="text-[13px] font-medium drop-shadow">Enter ↵</span>
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="display-md text-[26px] leading-tight text-fg">{meta.name}</h3>
                    <p className="text-[14px] text-muted">
                      Learn: <span className="font-bold text-fg">{meta.learns.toLowerCase()}</span>
                    </p>
                  </div>
                  <Stars n={Math.min(3, Math.floor((earned / Math.max(1, possible)) * 3 + 0.001))} size={16} className="mt-1 shrink-0" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted tabular-nums">
                  <span>
                    Best <span className="font-bold text-fg">{highs[id].toLocaleString()}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    Learn
                    <span className="font-bold text-fg">
                      {learnDone}/{learnTotal}
                    </span>
                    <ProgressBar value={learnDone} max={learnTotal} className="w-14" tone={allClear ? "mint" : "accent"} />
                  </span>
                  <span>
                    Arcade{" "}
                    <span className="font-bold text-fg">
                      {cleared}/{total}
                    </span>
                  </span>
                  <span>
                    <span className="font-bold text-fg">{earned}</span>/{possible} ★
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-[13px] text-muted">
        Pick a game to open it full screen. Arrow keys browse, Enter plays, Esc backs out. Keyboard on desktop, touch pads and swipe on phones. Scores
        and stars stay in this browser.
      </p>

      {open ? <PlayScreen game={open} onClose={close} /> : null}
    </div>
  );
}
