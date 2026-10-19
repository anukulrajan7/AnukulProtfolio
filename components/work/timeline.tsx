"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll-driven time flow. The children are server-rendered; this wrapper
 * only measures them and writes two things:
 *   - `--p` (0..1) on every [data-seg], which scales the drawn line
 *   - data-reached on every [data-dot] and [data-item], once the reading
 *     line (about two thirds down the viewport) has passed it
 *
 * Reduced motion and no-JS are handled in work.css: everything is drawn.
 */
export function Timeline({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const segs = Array.from(root.querySelectorAll<HTMLElement>("[data-seg]"));
    const dots = Array.from(root.querySelectorAll<HTMLElement>("[data-dot]"));
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-item]"));
    let raf = 0;

    const update = () => {
      raf = 0;
      const readY = window.innerHeight * 0.66;
      for (const s of segs) {
        const r = s.getBoundingClientRect();
        const p = r.height > 0 ? (readY - r.top) / r.height : 1;
        s.style.setProperty("--p", String(Math.min(1, Math.max(0, p))));
      }
      for (const d of dots) {
        const r = d.getBoundingClientRect();
        d.dataset.reached = r.top + r.height / 2 <= readY ? "true" : "false";
      }
      for (const it of items) {
        const r = it.getBoundingClientRect();
        it.dataset.reached = r.top + 24 <= readY ? "true" : "false";
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <ol ref={ref} aria-label={label} className={`wt ${className}`}>
      {children}
    </ol>
  );
}
