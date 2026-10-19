"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface Waypoint {
  id: string;
  code: string;
  span: string;
  title: ReactNode;
  subtitle?: ReactNode;
  current?: boolean;
  children?: ReactNode;
}

interface RouteTimelineProps {
  waypoints: Waypoint[];
  dense?: boolean;
  className?: string;
}

const REVEAL_LINE = 0.72;

export function RouteTimeline({ waypoints, dense = false, className = "" }: RouteTimelineProps) {
  const rootRef = useRef<HTMLOListElement>(null);
  const [revealed, setRevealed] = useState(0);
  const [reached, setReached] = useState<boolean[]>(() => waypoints.map(() => false));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRevealed(1);
      setReached(waypoints.map(() => true));
      return;
    }

    let frame = 0;
    let active = false;

    const measure = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      const line = window.innerHeight * REVEAL_LINE;
      const px = Math.min(rect.height, Math.max(0, line - rect.top));
      const ratio = rect.height > 0 ? px / rect.height : 1;
      setRevealed((prev) => (ratio > prev ? ratio : prev));

      const dots = root.querySelectorAll<HTMLElement>("[data-dot]");
      setReached((prev) => {
        let changed = false;
        const nextState = prev.slice();
        dots.forEach((dot, i) => {
          const top = dot.getBoundingClientRect().top - rect.top + 6;
          if (!nextState[i] && top <= px) {
            nextState[i] = true;
            changed = true;
          }
        });
        return changed ? nextState : prev;
      });
    };

    const onScroll = () => {
      if (!active || frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    const io = new IntersectionObserver(
      (entries) => {
        active = entries.some((e) => e.isIntersecting);
        if (active) measure();
      },
      { rootMargin: "0px 0px 0px 0px" }
    );
    io.observe(root);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    measure();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [waypoints]);

  const gap = dense ? "gap-y-6" : "gap-y-10 md:gap-y-14";

  return (
    <ol ref={rootRef} className={`relative grid ${gap} ${className}`} style={{ paddingLeft: 0 }}>
      <span aria-hidden className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
      <span
        aria-hidden
        className="absolute left-[5px] top-1 bottom-1 w-[1.5px] bg-route"
        style={{
          transform: `scaleY(${revealed})`,
          transformOrigin: "top",
          transition: "transform 0.25s linear",
        }}
      />

      {waypoints.map((wp, i) => (
        <li key={wp.id} className="relative grid grid-cols-[11px_1fr] gap-x-5 md:grid-cols-[11px_180px_1fr] md:gap-x-8">
          <span className="pt-[5px]">
            <span
              data-dot
              data-reached={reached[i] ? "true" : "false"}
              data-current={wp.current ? "true" : "false"}
              className="route-dot block"
            />
          </span>
          <div className="label pt-1 md:pt-[6px] tabular-nums md:text-right">
            <span className="text-fg">{wp.code}</span>
            <span className="mx-1.5">·</span>
            <span>{wp.span}</span>
          </div>
          <div className="col-start-2 md:col-start-3 mt-2 md:mt-0">
            <div className={`display ${dense ? "text-[1.35rem]" : "text-[1.6rem] md:text-[1.9rem]"}`}>
              {wp.title}
            </div>
            {wp.subtitle ? <div className="mt-1 text-sm text-muted">{wp.subtitle}</div> : undefined}
            {wp.children ? <div className="mt-4">{wp.children}</div> : undefined}
          </div>
        </li>
      ))}
    </ol>
  );
}
