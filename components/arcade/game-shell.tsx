"use client";

import { useEffect, useRef, useState } from "react";
import { readPalette, pad } from "./engine";
import type { Game, Hud, TouchButton, TouchLayout } from "./engine";

interface LegendRow {
  keys: string;
  does: string;
}

interface GameShellProps {
  create: () => Game;
  label: string;
  legend: LegendRow[];
  touch: TouchLayout;
}

const STEP = 1 / 60;

export function GameShell({ create, label, legend, touch }: GameShellProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<Hud>({ score: 0, high: 0, state: "idle" });
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const coarse =
      window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    setIsTouch(coarse);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const game = create();
    gameRef.current = game;
    let palette = readPalette();
    let scale = 1;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastHudKey = "";
    let needsRender = true;
    let lastState = "";

    const resize = () => {
      const cssW = wrap.clientWidth;
      if (cssW <= 0) return;
      const maxH = Math.max(260, window.innerHeight * 0.72);
      let w = cssW;
      let h = (cssW * game.height) / game.width;
      if (h > maxH) {
        h = maxH;
        w = (h * game.width) / game.height;
      }
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      scale = (w / game.width) * dpr;
      needsRender = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const mo = new MutationObserver(() => {
      palette = readPalette();
      needsRender = true;
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.25) dt = 0.25;
      const state = game.hud().state;
      if (state !== lastState) {
        lastState = state;
        needsRender = true;
      }
      const running = state === "playing" && !document.hidden;
      if (!running && !needsRender) {
        acc = 0;
        return;
      }
      if (running) {
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
      needsRender = running;
      const h = game.hud();
      const key = `${h.score}|${h.high}|${h.state}|${h.extra ?? ""}`;
      if (key !== lastHudKey) {
        lastHudKey = key;
        setHud(h);
      }
    };
    raf = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const action = game.keymap[e.code];
      if (!action) return;
      e.preventDefault();
      if (down && e.repeat) return;
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

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      wrap.removeEventListener("keydown", onKeyDown);
      wrap.removeEventListener("keyup", onKeyUp);
      wrap.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibility);
      gameRef.current = null;
    };
  }, [create]);

  const send = (action: string, down: boolean) => {
    gameRef.current?.input(action, down);
  };

  const press = (action: string) => {
    send(action, true);
    send(action, false);
    wrapRef.current?.focus({ preventScroll: true });
  };

  const stateLabel =
    hud.state === "idle"
      ? "READY"
      : hud.state === "playing"
        ? "LIVE"
        : hud.state === "paused"
          ? "PAUSED"
          : "OVER";

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      role="application"
      aria-label={`${label}. Press Enter to start. Press P or Escape to pause.`}
      className="outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      onPointerDown={() => wrapRef.current?.focus({ preventScroll: true })}
    >
      <div className="flex items-center justify-center">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${label} game canvas`}
          className="block max-w-full select-none touch-none"
        />
      </div>

      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.06em] text-muted"
      >
        <div className="flex flex-wrap gap-x-4">
          <span>
            Score <span className="text-fg">{pad(hud.score)}</span>
          </span>
          <span>
            Best <span className="text-fg">{pad(hud.high)}</span>
          </span>
          {hud.extra ? <span>{hud.extra}</span> : null}
          <span aria-live="polite" className={hud.state === "playing" ? "text-route" : "text-accent-text"}>
            {stateLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => press("start")}
          className="border border-border px-2 py-0.5 uppercase tracking-[0.06em] text-fg transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {hud.state === "playing" ? "Pause" : hud.state === "paused" ? "Resume" : "Start"}
        </button>
      </div>

      {isTouch ? (
        <div className="mt-4 flex items-end justify-between gap-6">
          <TouchCluster buttons={touch.left} send={send} />
          <TouchCluster buttons={touch.right} send={send} />
        </div>
      ) : null}

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
        {legend.map((row) => (
          <div key={row.keys} className="contents">
            <dt className="text-fg">{row.keys}</dt>
            <dd>{row.does}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface TouchClusterProps {
  buttons: TouchButton[];
  send: (action: string, down: boolean) => void;
}

function TouchCluster({ buttons, send }: TouchClusterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((b) => (
        <button
          key={b.action + b.label}
          type="button"
          tabIndex={-1}
          aria-label={b.aria}
          className="h-12 min-w-12 touch-none select-none border border-border bg-card px-3 font-mono text-sm text-fg active:border-accent active:text-accent"
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
