"use client";

// Full-screen play mode for one game: title screen -> level select (Learn |
// Arcade tabs) -> play. Pause / results menus live inside GameShell so every
// game shares one UI kit. Escape always goes one step back.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { MiniGameId, MiniGameResult } from "../types";
import { Stacker } from "../stacker";
import { Pingback } from "../pingback";
import { Route } from "../route";
import { loadHigh } from "../engine";
import { getAudio } from "./audio";
import { Cover } from "./covers";
import { CERTIFICATE, GLOSSARY } from "./concepts";
import { GAME_META, starTargets } from "./levels";
import type { LevelDef } from "./levels";
import {
  isUnlocked,
  ladder,
  levelsCleared,
  loadProgress,
  loadTrack,
  nextLevel,
  PROGRESS_EVENT,
  recordLevel,
  saveTrack,
  starsEarned,
  starsPossible,
  unlockedTerms,
} from "./progress";
import type { Progress, Track } from "./progress";
import { fmtClock, Kicker, Stars, Title, useMenuKeys } from "./ui";

type Screen = "title" | "levels" | "play";
type Pick = { kind: "level"; track: Track; n: number } | { kind: "endless" };

interface PlayScreenProps {
  game: MiniGameId;
  onClose: () => void;
  /** Skip the title card (e.g. "Continue" from the hub). */
  start?: Screen;
}

const GAMES = { stacker: Stacker, pingback: Pingback, route: Route } as const;

export function PlayScreen({ game, onClose, start = "title" }: PlayScreenProps) {
  const meta = GAME_META[game];
  const Game = GAMES[game];
  const [screen, setScreen] = useState<Screen>(start);
  const [track, setTrack] = useState<Track>("learn");
  const [pick, setPick] = useState<Pick>({ kind: "level", track: "learn", n: 1 });
  const [run, setRun] = useState(0);
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [best, setBest] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Lock page scroll while the play screen is open.
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overscrollBehavior = prevHtml;
    };
  }, []);

  useEffect(() => {
    setTrack(loadTrack(game));
    const refresh = () => {
      setProgress(loadProgress());
      setBest(loadHigh(game));
    };
    refresh();
    window.addEventListener(PROGRESS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [game]);

  // Focus the screen root so keyboard works immediately.
  useEffect(() => {
    if (screen !== "play") rootRef.current?.focus({ preventScroll: true });
  }, [screen]);

  const goLevels = useCallback(() => setScreen("levels"), []);
  const play = useCallback((p: Pick) => {
    getAudio().ensure();
    getAudio().play("ui-select");
    setPick(p);
    setRun((n) => n + 1);
    setScreen("play");
  }, []);

  const changeTrack = useCallback(
    (t: Track) => {
      setTrack(t);
      saveTrack(game, t);
      getAudio().play("ui-move");
    },
    [game],
  );

  const current: LevelDef | null = pick.kind === "level" ? (ladder(game, pick.track)[pick.n - 1] ?? null) : null;
  const hasNext = current && pick.kind === "level" ? current.n < ladder(game, pick.track).length : false;

  const onResult = useCallback(
    (r: MiniGameResult, stars: number) => {
      if (!current) return;
      recordLevel(game, current.id, stars, r.score, r.durationMs);
    },
    [game, current],
  );

  const onNext = useMemo(() => {
    if (!current || !hasNext || pick.kind !== "level") return undefined;
    return () => play({ kind: "level", track: pick.track, n: current.n + 1 });
  }, [current, hasNext, play, pick]);

  const onTitleKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape") {
      e.preventDefault();
      getAudio().play("ui-back");
      onClose();
      return;
    }
    if (["Shift", "Control", "Alt", "Meta", "Tab", "CapsLock"].includes(e.key)) return;
    e.preventDefault();
    getAudio().ensure();
    getAudio().play("ui-select");
    goLevels();
  };

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="arcade-rise fixed inset-0 z-[70] flex h-[100dvh] flex-col bg-bg text-fg outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={`${meta.name} play screen`}
      onKeyDown={screen === "title" ? onTitleKey : undefined}
    >
      {screen === "title" ? (
        <TitleScreen game={game} best={best} progress={progress} onStart={goLevels} onClose={onClose} />
      ) : screen === "levels" ? (
        <LevelSelect
          game={game}
          track={track}
          onTrack={changeTrack}
          progress={progress}
          best={best}
          onPick={play}
          onBack={() => setScreen("title")}
          onClose={onClose}
        />
      ) : (
        <div className="min-h-0 flex-1">
          {pick.kind === "level" && current ? (
            <Game
              key={`${current.id}-${run}`}
              level={current}
              immersive
              gameName={meta.name}
              onQuit={goLevels}
              onNext={onNext}
              onResult={onResult}
            />
          ) : (
            <Game key={`endless-${run}`} mode="free" immersive gameName={meta.name} onQuit={goLevels} />
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TitleScreen({ game, best, progress, onStart, onClose }: { game: MiniGameId; best: number; progress: Progress; onStart: () => void; onClose: () => void }) {
  const meta = GAME_META[game];
  const learnEarned = starsEarned(progress, game, "learn");
  const learnTotal = ladder(game, "learn").length;
  return (
    <div className="relative flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center overflow-y-auto px-5 py-8" onClick={onStart}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-3 top-3 inline-flex h-10 items-center gap-2 rounded-xl px-3 text-[14px] font-bold text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
        aria-label="Close"
      >
        Close <span className="hidden text-[12px] font-medium text-muted sm:inline">Esc</span>
      </button>
      <div className="w-full max-w-[560px]">
        <div className="arcade-pop overflow-hidden rounded-[18px] border-2 border-fg shadow-[8px_8px_0_0_var(--c-fg)]">
          <div className="aspect-[16/10]">
            <Cover game={game} animate={false} />
          </div>
        </div>
        <div className="mt-7 text-center">
          <p className="hand text-[1.25rem] text-route-text">{meta.learns}</p>
          <Title size="xl" className="mt-1">
            {meta.name}
          </Title>
          <p className="mx-auto mt-3 max-w-[46ch] text-[16px] text-muted">{meta.blurb}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px] text-muted">
            <span>
              Learn{" "}
              <span className="font-bold text-fg">
                {levelsCleared(progress, game, "learn")}/{learnTotal}
              </span>{" "}
              · {learnEarned}★
            </span>
            <span>
              Arcade{" "}
              <span className="font-bold text-fg">
                {levelsCleared(progress, game, "arcade")}/{ladder(game, "arcade").length}
              </span>
            </span>
            <span>
              Best <span className="font-bold text-fg">{best.toLocaleString()}</span>
            </span>
          </div>
          <p className="mt-7 inline-flex items-center gap-3 rounded-full border-2 border-fg bg-sun px-5 py-2 text-[16px] font-bold text-ink">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-ink" aria-hidden="true" />
            Press any key or tap to start
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface LevelSelectProps {
  game: MiniGameId;
  track: Track;
  onTrack: (t: Track) => void;
  progress: Progress;
  best: number;
  onPick: (p: Pick) => void;
  onBack: () => void;
  onClose: () => void;
}

function LevelSelect({ game, track, onTrack, progress, best, onPick, onBack, onClose }: LevelSelectProps) {
  const meta = GAME_META[game];
  const levels = ladder(game, track);
  const next = nextLevel(progress, game, track);
  const earned = starsEarned(progress, game, track);
  const possible = starsPossible(game, track);
  const gridRef = useRef<HTMLDivElement>(null);
  const columns = useCallback(() => {
    const el = gridRef.current;
    if (!el) return 1;
    const first = el.querySelector<HTMLElement>("[data-menu-item]");
    if (!first) return 1;
    const w = first.getBoundingClientRect().width + 12;
    return Math.max(1, Math.floor((el.clientWidth + 12) / w));
  }, []);
  const opts = useMemo(() => ({ grid: true, columns }), [columns]);
  const onKeys = useMenuKeys(onBack, opts);
  const allLearnClear = track === "learn" && levelsCleared(progress, game, "learn") === levels.length;

  useEffect(() => {
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-level="${next}"]`) ?? gridRef.current?.querySelector<HTMLElement>("[data-menu-item]");
    el?.focus({ preventScroll: true });
  }, [next, track]);

  const onTabKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      const t = track === "learn" ? "arcade" : "learn";
      onTrack(t);
      requestAnimationFrame(() => document.getElementById(`track-tab-${t}`)?.focus());
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      gridRef.current?.querySelector<HTMLElement>("[data-menu-item]:not([disabled])")?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onBack();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b-2 border-fg bg-card px-2 sm:px-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 items-center gap-1 rounded-xl px-2 text-[14px] font-bold text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span aria-hidden="true">‹</span> Title
        </button>
        <p className="min-w-0 truncate text-[14px] font-bold">
          {meta.name} <span className="font-medium text-muted">· choose a level</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center rounded-xl px-2 text-[14px] font-bold text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
        >
          Close
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
        <div className="mx-auto max-w-[1040px]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Kicker>{track === "learn" ? meta.learns : "Arcade ladder"}</Kicker>
              <Title size="lg" className="mt-1">
                {meta.name}
              </Title>
            </div>
            <div className="flex items-center gap-4 text-[14px] text-muted">
              <span className="flex items-center gap-2">
                <Stars n={3} size={16} />
                <span className="font-bold text-fg">
                  {earned}/{possible}
                </span>
              </span>
              <span>
                Endless best <span className="font-bold text-fg">{best.toLocaleString()}</span>
              </span>
            </div>
          </div>

          <div role="tablist" aria-label="Track" className="mt-4 inline-flex rounded-full border-2 border-fg bg-surface p-1" onKeyDown={onTabKey}>
            {(["learn", "arcade"] as const).map((t) => (
              <button
                key={t}
                id={`track-tab-${t}`}
                type="button"
                role="tab"
                aria-selected={track === t}
                tabIndex={track === t ? 0 : -1}
                onClick={() => onTrack(t)}
                className={`h-9 rounded-full px-4 text-[14px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  track === t ? "bg-fg text-bg" : "text-fg hover:bg-card"
                }`}
              >
                {t === "learn" ? "Learn" : "Arcade"}
                <span className="ml-1.5 font-medium opacity-70">
                  {levelsCleared(progress, game, t)}/{ladder(game, t).length}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-muted">
            {track === "learn"
              ? "Each level bends one rule so the game behaves like the idea. Stars are for understanding: no slips, then the level's efficiency rule."
              : "Hand-tuned levels with twists. Stars come from speed: finish under par for two, well under it for three."}
          </p>

          <div ref={gridRef} data-menu onKeyDown={onKeys} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {levels.map((l) => {
              const rec = progress[game].levels[l.id];
              const unlocked = isUnlocked(progress, game, l.n, track);
              const stars = rec?.stars ?? 0;
              const isNext = l.n === next && stars === 0;
              const t = starTargets(l);
              return (
                <button
                  key={l.id}
                  type="button"
                  data-menu-item
                  data-level={l.n}
                  disabled={!unlocked}
                  onClick={() => onPick({ kind: "level", track, n: l.n })}
                  aria-label={`Level ${l.n}, ${l.name}${unlocked ? "" : ", locked"}`}
                  className={`group relative flex min-h-[156px] flex-col rounded-2xl border-2 p-3 text-left transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-4 ${
                    unlocked
                      ? `border-fg bg-card hover:-translate-y-1 hover:shadow-[5px_5px_0_0_var(--c-fg)] focus-visible:-translate-y-1 focus-visible:shadow-[5px_5px_0_0_var(--c-fg)] ${isNext ? "ring-4 ring-sun" : ""}`
                      : "cursor-not-allowed border-border bg-surface text-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`display text-[30px] leading-none ${unlocked ? "text-fg" : "text-border"}`}>{String(l.n).padStart(2, "0")}</span>
                    {unlocked ? <Stars n={stars} size={16} /> : <LockIcon />}
                  </div>
                  {l.copy ? (
                    <span className={`mt-2 self-start rounded-md border-2 px-1.5 font-mono text-[11px] font-bold ${unlocked ? "border-fg bg-sun text-ink" : "border-border"}`}>
                      {l.copy.chip}
                    </span>
                  ) : null}
                  <p className={`mt-2 text-[16px] font-bold leading-tight ${unlocked ? "text-fg" : ""}`}>{l.name}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{unlocked ? l.blurb : "Clear the previous level"}</p>
                  <p className="mt-auto pt-2 text-[12px] text-muted">
                    {track === "learn"
                      ? `${rec?.bestMs ? `Best ${fmtClock(rec.bestMs / 1000)} · ` : ""}3★ = 0 slips`
                      : `${rec?.bestMs ? `Best ${fmtClock(rec.bestMs / 1000)} · ` : ""}3★ under ${fmtClock(t.three)}`}
                  </p>
                  {isNext ? <span className="absolute -top-2 right-3 rounded-full border-2 border-ink bg-sun px-2 text-[11px] font-bold text-ink">Up next</span> : null}
                </button>
              );
            })}
            <button
              type="button"
              data-menu-item
              onClick={() => onPick({ kind: "endless" })}
              className="group relative flex min-h-[156px] flex-col rounded-2xl border-2 border-fg bg-accent p-3 text-left text-on-accent transition-transform hover:-translate-y-1 hover:shadow-[5px_5px_0_0_var(--c-fg)] focus-visible:-translate-y-1 focus-visible:shadow-[5px_5px_0_0_var(--c-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-4"
            >
              <span className="display text-[30px] leading-none">∞</span>
              <p className="mt-2 text-[16px] font-bold leading-tight">Endless</p>
              <p className="mt-1 text-[13px] leading-snug opacity-85">Classic arcade. Play for the high score.</p>
              <p className="mt-auto pt-2 text-[12px] opacity-85">Best {best.toLocaleString()}</p>
            </button>
          </div>

          {allLearnClear ? <Certificate game={game} progress={progress} /> : null}
          {track === "learn" ? <Glossary game={game} progress={progress} /> : null}

          <p className="mt-5 text-[13px] text-muted">Arrow keys move, Enter plays, Esc goes back. ← → on the tabs switches track.</p>
        </div>
      </div>
    </div>
  );
}

function Glossary({ game, progress }: { game: MiniGameId; progress: Progress }) {
  const unlocked = unlockedTerms(progress, game);
  const terms = GLOSSARY[game];
  return (
    <section className="mt-8" aria-label="Glossary">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="display-md text-[22px]">Glossary</h3>
        <span className="text-[13px] text-muted">
          {terms.filter((t) => unlocked.has(t.id)).length}/{terms.length} unlocked
        </span>
      </div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {terms.map((t) => {
          const open = unlocked.has(t.id);
          return (
            <div key={t.id} className={`rounded-xl border-2 px-3 py-2 ${open ? "border-fg bg-card" : "border-border bg-surface"}`}>
              <dt className={`font-mono text-[13px] font-bold ${open ? "text-fg" : "text-muted"}`}>{open ? t.term : "????"}</dt>
              <dd className="mt-0.5 text-[13px] leading-snug text-muted">{open ? t.def : "Clear the level that teaches it."}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function Certificate({ game, progress }: { game: MiniGameId; progress: Progress }) {
  const levels = ladder(game, "learn");
  const [copied, setCopied] = useState(false);
  const stars = starsEarned(progress, game, "learn");
  const dates = levels.map((l) => progress[game].levels[l.id]?.clearedAt).filter(Boolean) as string[];
  const date = dates.sort().at(-1) ?? new Date().toISOString().slice(0, 10);
  const textOut = [
    `${CERTIFICATE[game]} (${GAME_META[game].name}, anukulraj.com/arcade)`,
    ...levels.map((l) => `✓ ${l.name}: ${progress[game].levels[l.id]?.stars ?? 0}★`),
    `${stars}/${levels.length * 3} stars · ${date}`,
  ].join("\n");
  return (
    <section className="mt-8 rounded-2xl border-2 border-fg bg-sun px-5 py-4 text-ink shadow-[6px_6px_0_0_var(--c-fg)]" aria-label="Certificate">
      <p className="text-[12px] font-bold uppercase tracking-wide">You now understand</p>
      <h3 className="display mt-1 text-[28px] leading-tight">{CERTIFICATE[game]}</h3>
      <ul className="mt-3 grid gap-1 text-[14px] sm:grid-cols-2">
        {levels.map((l) => (
          <li key={l.id}>
            ✓ {l.name} <span className="opacity-70">· {progress[game].levels[l.id]?.stars ?? 0}★</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
        <span className="font-bold">
          {stars}/{levels.length * 3} stars · {date}
        </span>
        <button
          type="button"
          className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-bold"
          onClick={() => {
            void navigator.clipboard?.writeText(textOut).then(() => setCopied(true));
          }}
        >
          {copied ? "Copied" : "Copy as text"}
        </button>
      </div>
    </section>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
