"use client";

// Small UI kit shared by the hub, the play screen and the in-game menus so
// every screen in the arcade speaks the same visual language (Workbench:
// 2px ink borders, hard shadows, Bricolage titles, Satoshi body).

import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { getAudio } from "./audio";

export function Kicker({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "route" | "muted" }) {
  const color = tone === "accent" ? "text-accent-text" : tone === "route" ? "text-route-text" : "text-muted";
  return <p className={`text-[13px] font-bold uppercase tracking-wide ${color}`}>{children}</p>;
}

export function Title({ children, size = "md", className = "" }: { children: ReactNode; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const s =
    size === "xl"
      ? "text-[44px] sm:text-[64px]"
      : size === "lg"
        ? "text-[36px] sm:text-[48px]"
        : size === "md"
          ? "text-[30px] sm:text-[38px]"
          : "text-[22px] sm:text-[26px]";
  return <h2 className={`display leading-[0.98] text-fg ${s} ${className}`}>{children}</h2>;
}

export function Panel({ children, className = "", tone = "fg" }: { children: ReactNode; className?: string; tone?: "fg" | "accent" | "route" }) {
  const ring = tone === "accent" ? "border-accent" : tone === "route" ? "border-route" : "border-fg";
  return (
    <div className={`rounded-2xl border-2 ${ring} bg-card px-5 py-4 shadow-[6px_6px_0_0_var(--c-fg)] sm:px-6 sm:py-5 ${className}`}>
      {children}
    </div>
  );
}

export type MenuVariant = "primary" | "sun" | "ghost" | "quiet";

interface MenuButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: MenuVariant;
  autoFocus?: boolean;
  disabled?: boolean;
  hint?: string;
  className?: string;
  ariaPressed?: boolean;
}

export function MenuButton({ children, onClick, variant = "ghost", autoFocus, disabled, hint, className = "", ariaPressed }: MenuButtonProps) {
  const cls =
    variant === "primary"
      ? "btn btn-primary"
      : variant === "sun"
        ? "btn btn-sun"
        : variant === "quiet"
          ? "inline-flex h-10 items-center rounded-xl px-3 text-[15px] font-bold text-muted hover:bg-surface hover:text-fg"
          : "btn btn-ghost";
  return (
    <button
      type="button"
      onClick={() => {
        getAudio().play("ui-select");
        onClick?.();
      }}
      autoFocus={autoFocus}
      disabled={disabled}
      aria-pressed={ariaPressed}
      data-menu-item
      className={`${cls} ${disabled ? "opacity-50" : ""} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      {children}
      {hint ? <span className="ml-2 hidden text-[12px] font-medium opacity-70 sm:inline">{hint}</span> : null}
    </button>
  );
}

export function Stars({ n, size = 22, max = 3, className = "" }: { n: number; size?: number; max?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} role="img" aria-label={`${n} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6L2.5 9.5l6.6-.8z"
            fill={i < n ? "var(--c-sun)" : "transparent"}
            stroke={i < n ? "var(--ink)" : "var(--c-border)"}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

export function Progress({ value, max, className = "", tone = "accent" }: { value: number; max: number; className?: string; tone?: "accent" | "sun" | "mint" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const fill = tone === "sun" ? "bg-sun" : tone === "mint" ? "bg-p4" : "bg-accent";
  return (
    <span className={`inline-block h-2 overflow-hidden rounded-full bg-border ${className}`} aria-hidden="true">
      <span className={`block h-full rounded-full ${fill} transition-[width] duration-300`} style={{ width: `${pct}%` }} />
    </span>
  );
}

export function Keycap({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border-2 border-fg bg-card px-1.5 font-sans text-[12px] font-bold text-fg">
      {children}
    </kbd>
  );
}

/**
 * Roving focus for menu-like groups: arrow keys move between focusable
 * items, Home/End jump, Escape calls onEscape. Apply the returned handler to
 * the container's onKeyDown and give items `data-menu-item`.
 */
export function useMenuKeys(onEscape?: () => void, opts?: { grid?: boolean; columns?: () => number }) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;
  return useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const root = e.currentTarget;
      const active = document.activeElement as HTMLElement | null;
      // Range inputs own left/right.
      if (active instanceof HTMLInputElement && active.type === "range" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>("[data-menu-item]:not([disabled])"));
      if (items.length === 0) return;
      const idx = items.indexOf(active as HTMLElement);
      const cols = opts?.grid ? Math.max(1, opts.columns?.() ?? 1) : 1;
      let next = -1;
      switch (e.key) {
        case "ArrowDown":
          next = idx < 0 ? 0 : Math.min(items.length - 1, idx + cols);
          break;
        case "ArrowUp":
          next = idx < 0 ? items.length - 1 : Math.max(0, idx - cols);
          break;
        case "ArrowRight":
          next = idx < 0 ? 0 : Math.min(items.length - 1, idx + 1);
          break;
        case "ArrowLeft":
          next = idx < 0 ? items.length - 1 : Math.max(0, idx - 1);
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = items.length - 1;
          break;
        case "Escape":
          if (onEscapeRef.current) {
            e.preventDefault();
            e.stopPropagation();
            getAudio().play("ui-back");
            onEscapeRef.current();
          }
          return;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (next !== idx) getAudio().play("ui-move");
      items[next]?.focus();
    },
    [opts],
  );
}

/** Focus the first `[data-menu-item]` (or `[data-autofocus]`) inside the ref on mount. */
export function useAutoFocus<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!enabled) return;
    const root = ref.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>("[data-autofocus]") ?? root.querySelector<HTMLElement>("[data-menu-item]:not([disabled])");
    el?.focus({ preventScroll: true });
  }, [enabled]);
  return ref;
}

export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
