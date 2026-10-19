"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ProjectColor } from "@/lib/site-data";

const tileBg: Record<ProjectColor, string> = {
  1: "bg-p1",
  2: "bg-p2",
  3: "bg-p3",
  4: "bg-p4",
  5: "bg-p5",
  6: "bg-p6",
  7: "bg-p7 tile-ink",
};

interface TileProps {
  color: ProjectColor;
  children: ReactNode;
  className?: string;
}

/**
 * A 16:10 coloured tile. Sets data-inview once it scrolls into view so the
 * visual inside can start its animation (see visuals.css).
 */
export function Tile({ color, children, className = "" }: TileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-inview={inView ? "true" : "false"} className={`tile ${tileBg[color]} ${className}`}>
      {children}
    </div>
  );
}
