"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { fmtTime, getSfx, readPalette } from "./engine";
import type { ConceptView, Game, GameOptions, Gesture, Hint, Hud, Intro, Outro, TouchButton, TouchLayout } from "./engine";
import type { MiniGameId, MiniGameProps, MiniGameResult } from "./types";
import { GLOSSARY } from "./games/concepts";
import { GAME_META, starReason, starsFor, starTargets } from "./games/levels";
import type { LevelDef } from "./games/levels";
import { loadProgress, unlockedTerms } from "./games/progress";
import { Kicker, MenuButton, Stars, Title, useAutoFocus, useMenuKeys } from "./games/ui";

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

/** Extra, optional props used by the arcade play screen. Story mode never sets them. */
export interface PlayExtras {
  /** Level ladder entry: implies story mode with the level's goal and params. */
  level?: LevelDef;
  /** Full-screen play layout (top bar, overlay pads, no legend). */
  immersive?: boolean;
  /** Game display name for the top bar. */
  gameName?: string;
  onQuit?: () => void;
  onNext?: () => void;
  onResult?: (result: MiniGameResult, stars: number) => void;
}

export type GameComponentProps = MiniGameProps & PlayExtras;

interface LegendRow {
  keys: string;
  does: string;
}

interface GameShellProps {
  create: () => Game;
  label: string;
  legend: LegendRow[];
  touch: TouchLayout;
  swipeHint?: string;
  extras?: PlayExtras;
}

const STEP = 1 / 60;
const SWIPE_PX = 22;
const RESTART_GUARD_MS = 700;

/**
 * Turns component props into a stable GameOptions object. Callbacks are
 * routed through refs so parent re-renders never remount the game.
 */
export function useGameOptions(props: GameComponentProps): GameOptions {
  const cb = useRef({ onFinish: props.onFinish, onResult: props.onResult });
  cb.current = { onFinish: props.onFinish, onResult: props.onResult };
  const level = props.level;
  const mode: "free" | "story" = level ? "story" : (props.mode ?? "free");
  const label = level?.goal.label ?? props.goal?.label ?? "";
  const target = level?.goal.target ?? props.goal?.target ?? 0;
  const timeLimit = level?.goal.timeLimit ?? props.goal?.timeLimit;
  const title = props.flavor?.title;
  const noun = props.flavor?.noun;
  const immersive = !!props.immersive;
  return useMemo<GameOptions>(
    () => ({
      mode,
      goal: mode === "story" && target > 0 ? { label, target, timeLimit } : undefined,
      flavor: { title, noun },
      params: level?.params,
      labels: level?.labels,
      steps: level?.steps,
      script: level?.track === "learn" ? level.script : undefined,
      restartable: immersive,
      onFinish: (r: MiniGameResult) => {
        cb.current.onFinish?.(r);
      },
      onFinishDetail: (r, d) => {
        if (level) cb.current.onResult?.(r, starsFor(level, { ...r, slips: d.slips, meta: d.meta }));
      },
    }),
    [mode, label, target, timeLimit, title, noun, level, immersive],
  );
}

const IGNORED_START_KEYS = new Set(["Tab", "Shift", "Control", "Alt", "Meta", "CapsLock", "Escape", "ContextMenu", "Dead", "Unidentified"]);

const EMPTY_HUD: Hud = { score: 0, high: 0, state: "idle", mode: "free", progress: 0, elapsedMs: 0, slips: 0, meta: {} };

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export function GameShell({ create, label, legend, touch, swipeHint, extras = {} }: GameShellProps) {
  const { immersive = false, level, onQuit, onNext, gameName } = extras;
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const overSinceRef = useRef(0);
  const quitRef = useRef(onQuit);
  quitRef.current = onQuit;

  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [isTouch, setIsTouch] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [intro, setIntro] = useState<Intro | null>(null);
  const [outro, setOutro] = useState<Outro | null>(null);
  const [progressLabel, setProgressLabel] = useState("");

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    setIsTouch(coarse);
    setSoundOn(getSfx().enabled);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const frame = frameRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !frame || !stage || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const game = create();
    gameRef.current = game;
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __arcadeGame?: Game }).__arcadeGame = game;
    }
    let palette = readPalette();
    let scale = 1;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastHudKey = "";
    let needsRender = true;
    let lastState = "";
    let cssW = 0;
    let cssH = 0;

    const touchNow = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    setIntro(game.intro(touchNow));
    setProgressLabel(game.progressLabel());
    setOutro(null);
    setDismissed(false);
    setHud(game.hud());

    const fontsReady = document.fonts?.load?.(`700 16px ${palette.sans}`);
    const displayReady = document.fonts?.load?.(`800 32px ${palette.display}`);
    Promise.all([fontsReady, displayReady].filter(Boolean))
      .then(() => {
        needsRender = true;
      })
      .catch(() => undefined);

    const fit = fitRef.current ?? frame;
    const resize = () => {
      const cs = getComputedStyle(fit);
      const availW = fit.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const availH = immersive
        ? fit.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 44 /* hud row */
        : Math.max(260, window.innerHeight * 0.72);
      if (availW <= 0) return;
      let w = availW;
      let h = (w * game.height) / game.width;
      if (h > availH) {
        h = Math.max(160, availH);
        w = (h * game.width) / game.height;
      }
      const dpr = window.devicePixelRatio || 1;
      cssW = w;
      cssH = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      stage.style.width = `${w}px`;
      stage.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      scale = (w / game.width) * dpr;
      needsRender = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(fit);
    window.addEventListener("orientationchange", resize);

    const mo = new MutationObserver(() => {
      palette = readPalette();
      needsRender = true;
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });

    const frameLoop = (now: number) => {
      raf = requestAnimationFrame(frameLoop);
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.25) dt = 0.25;
      const state = game.hud().state;
      if (state !== lastState) {
        const audio = getSfx();
        if (state === "playing") audio.startMusic(game.id as MiniGameId);
        else if (lastState === "playing") audio.stopMusic(false);
        lastState = state;
        needsRender = true;
        if (state === "over") {
          overSinceRef.current = now;
          setOutro(game.outro());
          setDismissed(false);
        } else if (state === "idle") {
          setIntro(game.intro(touchNow));
        }
      }
      const playing = state === "playing" && !document.hidden;
      const active = playing || (game.animating() && !document.hidden);
      if (!active && !needsRender) {
        acc = 0;
        return;
      }
      if (active) {
        acc += dt;
        while (acc >= STEP) {
          game.update(STEP);
          acc -= STEP;
        }
      } else {
        acc = 0;
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      game.render(ctx, palette, now / 1000);
      needsRender = active;
      const h = game.hud();
      const key = `${h.score}|${h.high}|${h.state}|${h.extra ?? ""}|${h.progress}|${h.target ?? ""}|${h.timeLeft === undefined ? "" : Math.ceil(h.timeLeft)}|${h.outcome ?? ""}|${h.newBest ? 1 : 0}|${h.hint?.desk ?? ""}|${h.slips}|${h.announce?.id ?? 0}|${h.concept ? JSON.stringify(h.concept) : ""}`;
      if (key !== lastHudKey) {
        lastHudKey = key;
        setHud(h);
      }
    };
    raf = requestAnimationFrame(frameLoop);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Menus (pause / results) own their keys.
      if ((e.target as HTMLElement | null)?.closest?.("[data-menu]")) return;
      const state = game.hud().state;
      if (down && e.key === "Escape" && state === "idle" && quitRef.current) {
        e.preventDefault();
        quitRef.current();
        return;
      }
      const action = game.keymap[e.code];
      if (!action) {
        if (down && !e.repeat && state === "idle" && !IGNORED_START_KEYS.has(e.key)) {
          e.preventDefault();
          getSfx().ensure();
          game.input("start", true);
          game.input("start", false);
          needsRender = true;
        }
        return;
      }
      e.preventDefault();
      if (down && e.repeat) return;
      if (down) getSfx().ensure();
      game.input(action, down);
      needsRender = true;
    };
    const onKeyDown = (e: KeyboardEvent) => onKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => onKey(e, false);
    const onFocusOut = (e: FocusEvent) => {
      if (!wrap.contains(e.relatedTarget as Node | null)) game.releaseAll();
    };
    wrap.addEventListener("keydown", onKeyDown);
    wrap.addEventListener("keyup", onKeyUp);
    wrap.addEventListener("focusout", onFocusOut);

    let pStart: { x: number; y: number; id: number } | null = null;
    const toGame = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / Math.max(1, cssW)) * game.width,
        y: ((clientY - r.top) / Math.max(1, cssH)) * game.height,
      };
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      pStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
      if (game.hud().state === "playing") {
        try {
          stage.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!pStart || pStart.id !== e.pointerId) return;
      const dx = e.clientX - pStart.x;
      const dy = e.clientY - pStart.y;
      const start = pStart;
      pStart = null;
      const g = toGame(start.x, start.y);
      let gesture: Gesture;
      if (Math.hypot(dx, dy) >= SWIPE_PX) {
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
        gesture = { kind: "swipe", dir, x: g.x, y: g.y };
      } else {
        gesture = { kind: "tap", x: g.x, y: g.y };
      }
      if (game.hud().state === "playing") {
        game.gesture(gesture);
        needsRender = true;
      }
    };
    const onPointerCancel = () => {
      pStart = null;
    };
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerCancel);

    const pause = () => {
      game.releaseAll();
      game.pause();
      needsRender = true;
    };
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibility);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => !en.isIntersecting)) pause();
      },
      { threshold: 0.25 },
    );
    io.observe(wrap);

    if (immersive) wrap.focus({ preventScroll: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      window.removeEventListener("orientationchange", resize);
      wrap.removeEventListener("keydown", onKeyDown);
      wrap.removeEventListener("keyup", onKeyUp);
      wrap.removeEventListener("focusout", onFocusOut);
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointerup", onPointerUp);
      stage.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibility);
      getSfx().stopMusic(true);
      game.dispose();
      gameRef.current = null;
    };
  }, [create, immersive]);

  const send = useCallback((action: string, down: boolean) => {
    if (down) getSfx().ensure();
    gameRef.current?.input(action, down);
  }, []);

  const focusWrap = useCallback(() => wrapRef.current?.focus({ preventScroll: true }), []);

  const press = useCallback(
    (action: string) => {
      send(action, true);
      send(action, false);
      focusWrap();
    },
    [send, focusWrap],
  );

  const startFromOverlay = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    const s = g.hud().state;
    if (s === "idle" || s === "paused") press("start");
    else if (s === "over" && g.mode === "free") {
      if (performance.now() - overSinceRef.current < RESTART_GUARD_MS) return;
      press("start");
    }
  }, [press]);

  const restart = useCallback(() => {
    getSfx().ensure();
    gameRef.current?.restart();
    focusWrap();
  }, [focusWrap]);

  const toggleSound = useCallback(() => {
    const next = !getSfx().enabled;
    getSfx().setEnabled(next);
    setSoundOn(next);
  }, []);

  const story = hud.mode === "story";
  const target = hud.target ?? 0;
  const pct = story && target > 0 ? Math.min(100, (hud.progress / target) * 100) : 0;
  const showOverlay = hud.state !== "playing" && !(hud.state === "over" && dismissed);
  const stateLabel =
    hud.state === "idle" ? "Ready" : hud.state === "playing" ? "Live" : hud.state === "paused" ? "Paused" : hud.outcome === "won" ? "Won" : hud.outcome === "lost" ? "Lost" : "Over";
  const hint = hud.hint ? (isTouch ? hud.hint.touch : hud.hint.desk) : null;
  const learn = level?.track === "learn";
  const topTitle = level ? `Level ${level.n} · ${level.name}` : immersive ? "Endless" : null;

  const hudRow = (
    <div className={`flex items-center justify-between gap-x-3 gap-y-1 text-[14px] ${immersive ? "h-[44px]" : "mt-3 flex-wrap"}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
        <span className="text-muted">
          Score <span className="font-bold text-fg">{hud.score.toLocaleString()}</span>
        </span>
        {story ? (
          <span className="flex items-center gap-2 text-muted">
            <span className="hidden capitalize sm:inline">{progressLabel}</span>
            <span className="font-bold text-fg">
              {hud.progress} / {target}
            </span>
            <span className="inline-block h-2 w-16 overflow-hidden rounded-full bg-border sm:w-24" aria-hidden="true">
              <span className="block h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
            </span>
          </span>
        ) : (
          <span className="text-muted">
            Best <span className="font-bold text-fg">{hud.high.toLocaleString()}</span>
          </span>
        )}
        {hud.timeLeft !== undefined ? (
          <span className={`font-bold ${hud.timeLeft <= 10 ? "text-route-text" : "text-fg"}`}>{fmtTime(hud.timeLeft)}</span>
        ) : null}
        {hud.extra ? <span className="hidden text-muted sm:inline">{hud.extra}</span> : null}
        {learn ? (
          <span className={hud.slips > 0 ? "font-bold text-route-text" : "text-muted"}>
            {hud.slips} {hud.slips === 1 ? "slip" : "slips"}
          </span>
        ) : null}
        <span aria-live="polite" className={`font-bold ${hud.state === "playing" ? "text-route-text" : "text-accent-text"}`}>
          {stateLabel}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!immersive ? (
          <button
            type="button"
            onClick={() => {
              toggleSound();
              focusWrap();
            }}
            aria-pressed={soundOn}
            className="rounded-full border-2 border-fg bg-card px-3 py-1 text-[13px] font-bold text-fg transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {soundOn ? "Sound on" : "Sound off"}
          </button>
        ) : null}
        {hud.state === "playing" || hud.state === "paused" ? (
          <button
            type="button"
            onClick={() => press("pause")}
            className="rounded-full border-2 border-fg bg-sun px-3 py-1 text-[13px] font-bold text-ink transition-colors hover:bg-fg hover:text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {hud.state === "playing" ? (immersive ? "Menu" : "Pause") : "Resume"}
          </button>
        ) : null}
      </div>
    </div>
  );

  const overlay = showOverlay ? (
    <Overlay
      hud={hud}
      intro={intro}
      outro={outro}
      isTouch={isTouch}
      progressLabel={progressLabel}
      legend={legend}
      level={level}
      immersive={immersive}
      soundOn={soundOn}
      onToggleSound={toggleSound}
      onStart={startFromOverlay}
      onResume={() => press("pause")}
      onRestart={restart}
      onQuit={onQuit}
      onNext={onNext}
      onContinue={() => setDismissed(true)}
      onAction={press}
    />
  ) : null;

  const stage = (
    <div ref={stageRef} className="relative overflow-hidden rounded-[12px]">
      <canvas ref={canvasRef} role="img" aria-label={`${label} game canvas`} className="block max-w-full select-none touch-none" />
      {hint && hud.state === "playing" ? (
        <div key={hint} className="arcade-hint pointer-events-none absolute left-1/2 top-3 w-[min(92%,360px)] -translate-x-1/2" role="status">
          <p className="sticky-note px-4 py-2 text-center text-[15px] font-bold leading-snug sm:text-[17px]">{hint}</p>
        </div>
      ) : null}
      {hud.concept?.choice && hud.state === "playing" ? <ChoiceCard choice={hud.concept.choice} onPick={(i) => press(`c${i}`)} isTouch={isTouch} /> : null}
      {level?.concept && hud.state === "playing" ? (
        <div className="pointer-events-none absolute bottom-3 right-3 max-w-[46%] rounded-xl border-2 border-fg bg-card/95 px-3 py-2 text-left shadow-[3px_3px_0_0_var(--c-fg)] backdrop-blur-sm" aria-label="Concept">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-accent-text">{level.concept.label}</p>
          {level.concept.note ? <p className="mt-0.5 text-[12px] leading-snug text-fg">{level.concept.note}</p> : null}
        </div>
      ) : null}
      {overlay}
    </div>
  );

  const pads = isTouch ? (
    immersive ? (
      <>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3 landscape:inset-y-0 landscape:items-center">
          <div className="pointer-events-auto">
            <TouchCluster buttons={touch.left} send={send} />
          </div>
          <div className="pointer-events-auto">
            <TouchCluster buttons={touch.right} send={send} />
          </div>
        </div>
      </>
    ) : (
      <div className="mt-4 flex items-end justify-between gap-4">
        <TouchCluster buttons={touch.left} send={send} />
        <TouchCluster buttons={touch.right} send={send} />
      </div>
    )
  ) : null;

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      role="application"
      aria-label={`${label}. Press any key or tap to start. Press P or Escape to pause.`}
      className={`outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${immersive ? "flex h-full min-h-0 flex-col" : ""}`}
      onPointerDown={(e) => {
        if (!(e.target as HTMLElement).closest("button")) focusWrap();
      }}
    >
      {immersive ? (
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b-2 border-fg bg-card px-2 sm:px-3">
          <button
            type="button"
            onClick={() => (hud.state === "playing" ? press("pause") : onQuit?.())}
            className="inline-flex h-9 items-center gap-1 rounded-xl px-2 text-[14px] font-bold text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
            aria-label={hud.state === "playing" ? "Open menu" : "Back to levels"}
          >
            <span aria-hidden="true">‹</span> {hud.state === "playing" ? "Menu" : "Levels"}
          </button>
          <p className="min-w-0 truncate text-center text-[14px] font-bold text-fg">
            {gameName ?? label}
            {topTitle ? <span className="font-medium text-muted"> · {topTitle}</span> : null}
          </p>
          <button
            type="button"
            onClick={() => {
              toggleSound();
              focusWrap();
            }}
            aria-pressed={soundOn}
            aria-label={soundOn ? "Sound on" : "Sound off"}
            className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-xl px-2 text-[14px] font-bold text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
          >
            {soundOn ? "Sound on" : "Sound off"}
          </button>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {hud.announce?.text ?? ""}
      </p>

      <div
        ref={frameRef}
        className={immersive ? `relative flex min-h-0 flex-1 ${learn ? "flex-col lg:flex-row" : ""}` : "relative"}
      >
        {immersive && learn ? <ConceptPanel view={hud.concept} level={level} live={hud.state === "playing"} onAction={press} /> : null}
        <div
          ref={fitRef}
          className={
            immersive
              ? `relative flex min-h-0 min-w-0 flex-1 items-center justify-center px-3 pt-2 ${isTouch ? "pb-[108px] landscape:px-[140px] landscape:pb-2" : "pb-2"}`
              : "relative"
          }
        >
          <div className={immersive ? "flex flex-col" : "flex flex-col items-center"}>
            {stage}
            <div className={immersive ? "" : "w-full"}>{hudRow}</div>
          </div>
          {immersive ? pads : null}
        </div>
      </div>

      {!immersive ? pads : null}
      {!immersive && isTouch && swipeHint ? <p className="mt-2 text-[13px] text-muted">{swipeHint}</p> : null}

      {!immersive ? (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px] text-muted">
          {legend.map((row) => (
            <div key={row.keys} className="contents">
              <dt className="font-bold text-fg">{row.keys}</dt>
              <dd>{row.does}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overlays: title / pause menu / results                              */
/* ------------------------------------------------------------------ */

interface OverlayProps {
  hud: Hud;
  intro: Intro | null;
  outro: Outro | null;
  isTouch: boolean;
  progressLabel: string;
  legend: LegendRow[];
  level?: LevelDef;
  immersive: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onQuit?: () => void;
  onNext?: () => void;
  onContinue: () => void;
  /** Send a game action from a menu (Learn controls). */
  onAction?: (action: string) => void;
}

function Overlay(props: OverlayProps) {
  const { hud } = props;
  if (hud.state === "idle") return <IdleOverlay {...props} />;
  if (hud.state === "paused") return <PauseMenu {...props} />;
  return <ResultsMenu {...props} />;
}

function Backdrop({ children, onClick, label }: { children: ReactNode; onClick?: () => void; label?: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-bg/85 p-3 backdrop-blur-[2px] sm:p-5"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? label : undefined}
    >
      {children}
    </div>
  );
}

function Card({ children, tone = "fg", className = "" }: { children: ReactNode; tone?: "fg" | "accent" | "route"; className?: string }) {
  const ring = tone === "accent" ? "border-accent" : tone === "route" ? "border-route" : "border-fg";
  const maxW = className.includes("max-w-") ? "" : "max-w-[400px]";
  return (
    <div
      className={`arcade-pop w-full ${maxW} rounded-2xl border-2 ${ring} bg-card px-5 py-4 shadow-[6px_6px_0_0_var(--c-fg)] sm:px-6 sm:py-5 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function IdleOverlay(props: OverlayProps) {
  const { intro, hud, isTouch, level, immersive, onStart, onQuit } = props;
  const story = hud.mode === "story";
  if (level?.track === "learn" && level.copy) return <LearnIntro {...props} />;
  return (
    <Backdrop onClick={onStart} label={`${intro?.title ?? ""}. Start`}>
      <Card>
        <Kicker>{level ? `Level ${level.n}` : (intro?.kicker ?? "Ready?")}</Kicker>
        <Title size="md" className="mt-1">
          {level ? level.name : (intro?.title ?? "")}
        </Title>
        {story && intro?.goal ? (
          <p className="mt-3 rounded-xl border-2 border-fg bg-sun px-4 py-2 text-[16px] font-bold leading-snug text-ink">
            {intro.goal}
            {intro.timeLimit ? <span className="font-medium"> · {fmtTime(intro.timeLimit)} on the clock</span> : null}
          </p>
        ) : null}
        {level ? <p className="mt-2 text-[14px] leading-snug text-muted">{level.intro ?? level.blurb}</p> : null}
        <ul className="mt-3 space-y-1.5 text-[15px] leading-snug text-fg">
          {(intro?.tips ?? []).map((tip) => (
            <li key={tip} className="flex gap-2">
              <span aria-hidden="true" className="mt-[7px] inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={onStart}>
            Play
          </button>
          <span className="text-[13px] text-muted">{isTouch ? "or tap anywhere" : "or press any key"}</span>
          {immersive && onQuit ? (
            <button type="button" className="ml-auto text-[13px] font-bold text-muted hover:text-fg" onClick={onQuit}>
              Back
            </button>
          ) : null}
        </div>
      </Card>
    </Backdrop>
  );
}

function PauseMenu({ isTouch, legend, intro, hud, level, soundOn, onToggleSound, onResume, onRestart, onQuit, onAction }: OverlayProps) {
  const [howTo, setHowTo] = useState(false);
  const [glossary, setGlossary] = useState(false);
  const [vol, setVol] = useState(() => Math.round(getSfx().volume * 100));
  const [musicOn, setMusicOn] = useState(() => getSfx().musicOn);
  const learn = level?.track === "learn";
  const onKeys = useMenuKeys(() => (howTo ? setHowTo(false) : glossary ? setGlossary(false) : onResume()));
  const ref = useAutoFocus<HTMLDivElement>(true);
  const controls = hud.concept?.controls;
  return (
    <Backdrop>
      <div
        ref={ref}
        data-menu
        onKeyDown={(e) => {
          if (learn && (e.key === "g" || e.key === "G") && !(e.target instanceof HTMLInputElement)) {
            e.preventDefault();
            setGlossary((v) => !v);
            setHowTo(false);
            return;
          }
          onKeys(e);
        }}
        className={`w-full ${glossary ? "max-w-[520px]" : "max-w-[400px]"}`}
      >
        <Card className={glossary ? "max-w-[520px]" : ""}>
          <Kicker>{howTo ? "How to play" : glossary ? "Glossary" : "On hold"}</Kicker>
          <Title size="md" className="mt-1">
            {howTo ? (intro?.title ?? "Controls") : glossary ? (GAME_META[level?.id.split("-")[0] as MiniGameId]?.name ?? "Terms") : "Paused"}
          </Title>
          {glossary && level ? (
            <>
              <GlossaryList level={level} />
              <div className="mt-4">
                <MenuButton variant="primary" onClick={() => setGlossary(false)} autoFocus>
                  Back
                </MenuButton>
              </div>
            </>
          ) : howTo ? (
            <>
              <ul className="mt-3 space-y-1.5 text-[15px] leading-snug text-fg">
                {(intro?.tips ?? []).map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span aria-hidden="true" className="mt-[7px] inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              {!isTouch ? (
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px] text-muted">
                  {legend.map((row) => (
                    <div key={row.keys} className="contents">
                      <dt className="font-bold text-fg">{row.keys}</dt>
                      <dd>{row.does}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <div className="mt-4">
                <MenuButton variant="primary" onClick={() => setHowTo(false)} autoFocus>
                  Back
                </MenuButton>
              </div>
            </>
          ) : (
            <div className="mt-4 grid gap-2">
              <MenuButton variant="primary" onClick={onResume} hint={isTouch ? undefined : "Esc"}>
                Resume
              </MenuButton>
              <MenuButton onClick={onRestart}>Restart</MenuButton>
              {controls && onAction ? (
                <div className="rounded-xl border-2 border-border px-3 py-2">
                  <Controls controls={controls} onAction={onAction} menu />
                </div>
              ) : null}
              <MenuButton onClick={() => setHowTo(true)}>How to play</MenuButton>
              {learn ? (
                <MenuButton onClick={() => setGlossary(true)} hint={isTouch ? undefined : "G"}>
                  Glossary
                </MenuButton>
              ) : null}
              <MenuButton onClick={onToggleSound} ariaPressed={soundOn}>
                {soundOn ? "Sound: on" : "Sound: off"}
              </MenuButton>
              {soundOn ? (
                <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border-2 border-border px-3 py-2">
                  <label className="flex items-center gap-3 text-[14px] font-bold text-fg">
                    <span className="w-14 shrink-0">Volume</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={vol}
                      data-menu-item
                      aria-label="Master volume"
                      className="h-2 w-full accent-[var(--c-accent)]"
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setVol(v);
                        getSfx().setVolume(v / 100);
                      }}
                      onPointerUp={() => getSfx().play("ui-move")}
                    />
                    <span className="w-9 text-right text-[13px] tabular-nums text-muted">{vol}</span>
                  </label>
                  <button
                    type="button"
                    data-menu-item
                    aria-pressed={musicOn}
                    onClick={() => {
                      const next = !musicOn;
                      setMusicOn(next);
                      getSfx().setMusic(next);
                    }}
                    className={`h-9 rounded-full border-2 border-fg px-3 text-[13px] font-bold ${musicOn ? "bg-sun text-ink" : "bg-card text-fg"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
                  >
                    {musicOn ? "Music on" : "Music off"}
                  </button>
                </div>
              ) : null}
              {onQuit ? (
                <MenuButton variant="quiet" onClick={onQuit}>
                  Quit to levels
                </MenuButton>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </Backdrop>
  );
}

function ResultsMenu({ hud, outro, progressLabel, level, immersive, isTouch, onStart, onRestart, onQuit, onNext, onContinue }: OverlayProps) {
  const story = hud.mode === "story";
  const won = hud.outcome === "won";
  const starIn = { won, durationMs: hud.elapsedMs, slips: hud.slips, meta: hud.meta, lastSlip: hud.lastSlip };
  const stars = level ? starsFor(level, starIn) : 0;
  const reason = level ? starReason(level, starIn) : null;
  const learn = level?.track === "learn";
  const targets = level ? starTargets(level) : null;
  const canRestart = immersive;
  const onKeys = useMenuKeys(onQuit ?? (!story ? onStart : undefined));
  const ref = useAutoFocus<HTMLDivElement>(true);
  const tone = won ? "accent" : story ? "route" : "fg";
  const t = hud.elapsedMs / 1000;

  // External story mount: the simple contract overlay.
  if (story && !immersive) {
    return (
      <Backdrop>
        <div ref={ref} data-menu onKeyDown={onKeys} className="w-full max-w-[400px]">
          <Card tone={tone}>
            <Kicker tone={won ? "accent" : "route"}>{outro?.kicker ?? ""}</Kicker>
            <Title size="md" className="mt-1">
              {outro?.title ?? ""}
            </Title>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="display text-[40px] text-fg sm:text-[48px]">{hud.progress}</span>
              <span className="text-[15px] text-muted">
                of {hud.target ?? 0} {progressLabel}
              </span>
            </p>
            <ul className="mt-2 space-y-1 text-[15px] text-fg">
              {(outro?.lines ?? []).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <div className="mt-5">
              <MenuButton variant={won ? "primary" : "ghost"} onClick={onContinue}>
                Continue
              </MenuButton>
            </div>
          </Card>
        </div>
      </Backdrop>
    );
  }

  return (
    <Backdrop onClick={!story ? onStart : undefined} label="Play again">
      <div ref={ref} data-menu onKeyDown={onKeys} className={`w-full ${learn && won ? "max-w-[520px]" : "max-w-[400px]"}`}>
        <Card tone={tone} className={learn && won ? "max-w-[520px]" : ""}>
          <Kicker tone={won ? "accent" : story ? "route" : "accent"}>
            {level ? (won ? `Level ${level.n} cleared` : (outro?.kicker ?? "Not this time")) : (outro?.kicker ?? "Run over")}
          </Kicker>
          <Title size="md" className="mt-1">
            {level && won ? (stars === 3 ? "Perfect run" : stars === 2 ? "Nice work" : "Cleared") : (outro?.title ?? "Game over")}
          </Title>
          {level ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Stars n={stars} size={34} />
              {won ? (
                <span className="text-[13px] text-muted">
                  {learn ? `Done in ${fmtTime(t)}` : stars < 3 && targets ? `3 stars under ${fmtTime(targets.three)}` : `Done in ${fmtTime(t)}`}
                </span>
              ) : (
                <span className="text-[14px] text-fg">
                  {hud.progress} of {hud.target ?? 0} {progressLabel}
                </span>
              )}
            </div>
          ) : null}
          {reason ? <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-[14px] leading-snug text-fg">{reason}</p> : null}
          {learn && !won && hud.lastSlip ? <p className="mt-2 text-[14px] leading-snug text-fg">Last slip: {hud.lastSlip}.</p> : null}
          {learn ? null : (
            <ul className="mt-3 space-y-1 text-[15px] text-fg">
              {(outro?.lines ?? []).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
          {learn && won && level?.copy ? <LearnedCard copy={level.copy} /> : null}
          {level?.learned && won ? (
            <div className="mt-4 rounded-xl border-2 border-fg bg-surface px-4 py-3">
              <p className="text-[12px] font-bold uppercase tracking-wide text-accent-text">What you learned</p>
              <p className="mt-0.5 text-[15px] font-bold text-fg">{level.learned.title}</p>
              <p className="mt-1 text-[14px] leading-snug text-fg">{level.learned.text}</p>
              {level.learned.code ? (
                <pre className="mt-2 overflow-x-auto rounded-lg border-2 border-fg bg-card px-3 py-2 font-mono text-[12px] leading-relaxed text-fg">
                  <code>{level.learned.code}</code>
                </pre>
              ) : null}
            </div>
          ) : null}
          <div className="mt-5 grid gap-2">
            {level && won && onNext ? (
              <MenuButton variant="primary" onClick={onNext}>
                Next level
              </MenuButton>
            ) : null}
            {canRestart ? (
              <MenuButton variant={level && won && onNext ? "sun" : "primary"} onClick={story ? onRestart : onStart}>
                {level ? (won ? "Play again" : "Retry") : "Play again"}
              </MenuButton>
            ) : null}
            {onQuit ? (
              <MenuButton variant="quiet" onClick={onQuit}>
                {level ? "Back to levels" : "Quit"}
              </MenuButton>
            ) : null}
          </div>
          {!story && !isTouch ? <p className="mt-3 text-[12px] text-muted">Enter also restarts.</p> : null}
        </Card>
      </div>
    </Backdrop>
  );
}

/* ------------------------------------------------------------------ */
/* Learn UI: intro card, learned card, concept panel, choice card      */
/* ------------------------------------------------------------------ */

function LearnIntro({ intro, hud, isTouch, level, immersive, onStart, onQuit }: OverlayProps) {
  const copy = level!.copy!;
  const [showTips, setShowTips] = useState(false);
  // Replays start collapsed: chip, title, goal, Play. The intro text is one tap away.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const game = level!.id.split("-")[0] as MiniGameId;
    const rec = loadProgress()[game]?.levels[level!.id];
    setCollapsed((rec?.plays ?? 0) > 0);
  }, [level]);
  return (
    <Backdrop onClick={onStart} label={`${level!.name}. Start`}>
      <Card className="max-w-[460px]">
        <div className="flex items-center gap-2">
          <span className="rounded-md border-2 border-fg bg-sun px-2 py-0.5 font-mono text-[12px] font-bold text-ink">{copy.chip}</span>
          <Kicker>Learn · level {level!.n}</Kicker>
          {collapsed ? <span className="ml-auto text-[12px] font-bold text-muted">Replay</span> : null}
        </div>
        <Title size="md" className="mt-2">
          {level!.name}
        </Title>
        {collapsed ? (
          <button
            type="button"
            className="mt-2 text-[13px] font-bold text-muted underline-offset-2 hover:text-fg hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(false);
            }}
            aria-expanded={false}
          >
            Show intro ▾
          </button>
        ) : (
          <p className="mt-3 text-[17px] leading-snug text-fg">{copy.intro}</p>
        )}
        {hud.target ? (
          <p className="mt-3 rounded-xl border-2 border-fg bg-surface px-4 py-2 text-[15px] font-bold leading-snug text-fg">
            Goal: {level!.goal.label}
            {level!.goal.timeLimit ? <span className="font-medium"> · {fmtTime(level!.goal.timeLimit)}</span> : null}
          </p>
        ) : null}
        <button
          type="button"
          className="mt-3 text-[13px] font-bold text-muted underline-offset-2 hover:text-fg hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            setShowTips((v) => !v);
          }}
          aria-expanded={showTips}
        >
          {showTips ? "Hide controls" : "Controls"}
        </button>
        {showTips ? (
          <ul className="mt-2 space-y-1 text-[14px] leading-snug text-fg">
            {(intro?.tips ?? []).slice(0, 2).map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={onStart}>
            Play
          </button>
          <span className="text-[13px] text-muted">{isTouch ? "or tap anywhere" : "or press Enter"}</span>
          {immersive && onQuit ? (
            <button type="button" className="ml-auto text-[13px] font-bold text-muted hover:text-fg" onClick={onQuit}>
              Back
            </button>
          ) : null}
        </div>
      </Card>
    </Backdrop>
  );
}

function LearnedCard({ copy }: { copy: NonNullable<LevelDef["copy"]> }) {
  const [more, setMore] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "l" || e.key === "L") setMore((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="mt-4 rounded-xl border-2 border-fg bg-surface px-4 py-3">
      <p className="text-[12px] font-bold uppercase tracking-wide text-accent-text">You learned</p>
      <p className="mt-1 text-[16px] leading-snug text-fg">{copy.learned}</p>
      <pre className="mt-2 max-w-full overflow-x-auto rounded-lg border-2 border-fg bg-card px-3 py-2 font-mono text-[12.5px] leading-[1.5] text-fg">
        <code>{copy.snippet}</code>
      </pre>
      <button
        type="button"
        className="mt-2 text-[13px] font-bold text-fg underline-offset-2 hover:underline"
        onClick={() => setMore((v) => !v)}
        aria-expanded={more}
      >
        Learn more {more ? "▴" : "▾"} <span className="font-medium text-muted">(L)</span>
      </button>
      {more ? (
        <div className="mt-1 space-y-1.5 text-[14px] leading-snug text-fg">
          <p>
            <span className="font-bold">Myth:</span> {copy.misconception}
          </p>
          {copy.learnMore ? <p>{copy.learnMore}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

const TONE: Record<string, string> = { ok: "text-fg", warn: "text-route-text", bad: "text-route-text font-bold" };

/**
 * DOM concept panel: code card, queues, console, stats. Beside the canvas on
 * large screens, a collapsible strip above it on phones (one-line summary).
 */
function ConceptPanel({ view, level, live, onAction }: { view?: ConceptView; level?: LevelDef; live: boolean; onAction?: (a: string) => void }) {
  const [open, setOpen] = useState(false);
  const chip = level?.copy?.chip;
  const body = view ? <ConceptBody view={view} onAction={onAction} /> : <p className="text-[14px] text-muted">Press Play to start.</p>;
  return (
    <>
      <div className="shrink-0 border-b-2 border-fg bg-card lg:hidden">
        <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {chip ? <span className="rounded-md border-2 border-fg bg-sun px-1.5 font-mono text-[11px] font-bold text-ink">{chip}</span> : null}
          <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg">{view?.summary ?? level?.goal.label}</span>
          <span className="text-[12px] font-bold text-muted">{open ? "Hide" : "Show"}</span>
        </button>
        {open ? <div className="max-h-[38vh] overflow-y-auto px-3 pb-3">{body}</div> : null}
      </div>
      <aside className={`hidden w-[380px] shrink-0 overflow-y-auto border-l-2 border-fg bg-card px-4 py-4 lg:order-last lg:block ${live ? "" : "opacity-90"}`} aria-label="Concept panel">
        <div className="flex items-center gap-2">
          {chip ? <span className="rounded-md border-2 border-fg bg-sun px-2 py-0.5 font-mono text-[12px] font-bold text-ink">{chip}</span> : null}
          <span className="text-[13px] font-bold text-muted">{level?.goal.label}</span>
        </div>
        <div className="mt-3">{body}</div>
      </aside>
    </>
  );
}

function ConceptBody({ view, onAction }: { view: ConceptView; onAction?: (a: string) => void }) {
  return (
    <div className="space-y-3">
      {view.controls && onAction ? <Controls controls={view.controls} onAction={onAction} /> : null}
      {view.code ? (
        <div className="overflow-hidden rounded-xl border-2 border-fg">
          <p className="border-b-2 border-fg bg-surface px-3 py-1 text-[12px] font-bold text-muted">Code</p>
          <pre className="overflow-x-auto bg-card py-1.5 font-mono text-[12.5px] leading-[1.5] text-fg">
            {view.code.lines.map((ln, i) => (
              <div key={i} className={`px-3 ${view.code!.active === i ? "bg-sun text-ink" : ""}`}>
                {ln || " "}
              </div>
            ))}
          </pre>
        </div>
      ) : null}
      {view.lanes ? (
        <div className="grid grid-cols-3 gap-2">
          {view.lanes.map((l) => (
            <div key={l.id} className="min-h-[72px] rounded-xl border-2 border-fg bg-surface px-2 py-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                {l.icon ? `${l.icon} ` : ""}
                {l.label}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {l.items.map((it, k) => (
                  <span key={`${it}-${k}`} className="rounded-md border-2 border-fg bg-card px-1.5 font-mono text-[13px] font-bold text-fg">
                    {it}
                  </span>
                ))}
                {l.items.length === 0 && l.note ? <span className="text-[12px] text-muted">{l.note}</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {view.console ? (
        <div className="rounded-xl border-2 border-fg bg-ink px-3 py-2 text-paper">
          <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{view.console.label ?? "Console"}</p>
          <p className="mt-0.5 font-mono text-[16px] font-bold">
            {view.console.items.join(" ")}
            {view.console.total !== undefined
              ? Array.from({ length: Math.max(0, view.console.total - view.console.items.length) }, () => " _").join("")
              : null}
          </p>
        </div>
      ) : null}
      {view.stats ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
          {view.stats.map((s) => (
            <div key={s.label} className="contents">
              <dt className="text-muted">{s.label}</dt>
              <dd className={`text-right font-bold tabular-nums ${s.tone ? TONE[s.tone] : "text-fg"}`}>{s.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {view.log ? (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{view.log.title}</p>
          <ul className="mt-1 space-y-0.5 font-mono text-[12px] leading-snug text-fg">
            {view.log.items.map((it, i) => (
              <li key={`${it}-${i}`}>{it}</li>
            ))}
            {view.log.items.length === 0 ? <li className="text-muted">nothing yet</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Segmented live settings (R6 filters, R8 policies). Each pick sends `set:<id>:<j>`. */
function Controls({ controls, onAction, menu = false }: { controls: NonNullable<ConceptView["controls"]>; onAction: (a: string) => void; menu?: boolean }) {
  return (
    <div className="space-y-2" aria-label="Display settings">
      {controls.map((c) => (
        <div key={c.id}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            {c.label}
            {c.hint ? <span className="ml-1 font-medium normal-case tracking-normal">· {c.hint}</span> : null}
          </p>
          <div role="radiogroup" aria-label={c.label} className="mt-1 flex flex-wrap gap-1">
            {c.options.map((o, j) => {
              const on = j === c.value;
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-menu-item={menu ? true : undefined}
                  onClick={() => onAction(`set:${c.id}:${j}`)}
                  className={`min-h-8 rounded-lg border-2 px-2 font-mono text-[12px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    on ? "border-fg bg-fg text-bg" : "border-fg bg-card text-fg hover:bg-surface"
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Glossary for the level's game, reachable from the pause menu (G). Locked terms show as ????. */
function GlossaryList({ level }: { level: LevelDef }) {
  const game = level.id.split("-")[0] as MiniGameId;
  const terms = GLOSSARY[game] ?? [];
  const [unlocked, setUnlocked] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setUnlocked(unlockedTerms(loadProgress(), game));
  }, [game]);
  const mine = new Set(level.copy?.glossary ?? []);
  return (
    <dl className="mt-3 grid max-h-[46vh] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
      {terms.map((t) => {
        const open = unlocked.has(t.id);
        return (
          <div key={t.id} className={`rounded-lg border-2 px-2.5 py-1.5 ${open ? "border-fg bg-card" : "border-border bg-surface"} ${mine.has(t.id) ? "ring-2 ring-sun" : ""}`}>
            <dt className={`font-mono text-[13px] font-bold ${open ? "text-fg" : "text-muted"}`}>{open ? t.term : "????"}</dt>
            <dd className="mt-0.5 text-[12.5px] leading-snug text-muted">{open ? t.def : mine.has(t.id) ? "Clear this level to unlock it." : "Clear the level that teaches it."}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function ChoiceCard({ choice, onPick, isTouch }: { choice: NonNullable<ConceptView["choice"]>; onPick: (i: number) => void; isTouch: boolean }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/70 p-3" role="dialog" aria-label={choice.prompt}>
      <div className="arcade-pop w-full max-w-[420px] rounded-2xl border-2 border-fg bg-card px-5 py-4 shadow-[6px_6px_0_0_var(--c-fg)]">
        <Kicker>{choice.kicker ?? "Gap card"}</Kicker>
        <p className="mt-1 text-[18px] font-bold leading-snug text-fg">{choice.prompt}</p>
        {choice.detail ? <p className="mt-1 text-[14px] text-muted">{choice.detail}</p> : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {choice.options.map((o, i) => (
            <button
              key={o}
              type="button"
              autoFocus={i === 0}
              onClick={() => onPick(i + 1)}
              className="min-h-12 rounded-xl border-2 border-fg bg-card px-3 py-2 text-left text-[15px] font-bold text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {!isTouch ? <span className="mr-1.5 font-mono text-[12px] text-muted">{i + 1}</span> : null}
              {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Touch pads                                                          */
/* ------------------------------------------------------------------ */

interface TouchClusterProps {
  buttons: TouchButton[];
  send: (action: string, down: boolean) => void;
}

function TouchCluster({ buttons, send }: TouchClusterProps) {
  if (buttons.length === 0) return <div />;
  return (
    <div className="flex max-w-[220px] flex-wrap gap-2">
      {buttons.map((b) => (
        <button
          key={b.action + b.label}
          type="button"
          tabIndex={-1}
          aria-label={b.aria}
          className={`h-16 touch-none select-none rounded-2xl border-2 border-fg bg-card/95 text-[20px] font-bold text-fg shadow-[0_3px_0_0_var(--c-fg)] backdrop-blur-sm active:translate-y-[2px] active:bg-sun active:text-ink active:shadow-none ${
            b.wide ? "min-w-24 px-4 text-[15px]" : "min-w-16 px-3"
          }`}
          onPointerDown={(e) => {
            e.preventDefault();
            send(b.action, true);
          }}
          onPointerUp={() => send(b.action, false)}
          onPointerCancel={() => send(b.action, false)}
          onPointerLeave={() => send(b.action, false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

export type { Hint };
