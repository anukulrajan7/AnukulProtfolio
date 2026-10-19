import Link from "next/link";
import type { CSSProperties } from "react";
import type { Role } from "@/lib/site-data";
import { projects } from "@/lib/site-data";
import { roleExtras } from "./work/work-data";
import "./work/work.css";

interface WorkListProps {
  roles: Role[];
  className?: string;
}

/**
 * Home teaser: a compact horizontal timeline, April 2023 to now. One node per
 * role, small ticks above the last segment for the 2026 side projects, and a
 * "now" marker. Everything links to /work.
 */
export function WorkList({ roles, className = "" }: WorkListProps) {
  const sideTicks = projects.filter((p) => p.year.includes("2026"));
  return (
    <div className={`wm ${className}`}>
      <ol className="wm-track" aria-label="Career timeline">
        {roles.map((r, i) => {
          const x = roleExtras[r.id];
          const seg = `var(--p-${x.color})`;
          const last = i === roles.length - 1;
          return (
            <li key={r.id} className="rise" style={{ "--i": i + 1 } as CSSProperties}>
              <Link href={`/work#${r.id}`} className="wm-node group" style={{ "--seg": seg } as CSSProperties}>
                <span className="wm-seg" aria-hidden />
                <span className="wm-dot" aria-hidden />
                {last ? (
                  <span className="wm-ticks" aria-hidden>
                    {sideTicks.map((p) => (
                      <span key={p.id} className="wm-tick" style={{ "--tick": `var(--p-${p.color})` } as CSSProperties} />
                    ))}
                  </span>
                ) : undefined}
                <span className="label text-fg block">{r.span}</span>
                <span className="wm-name display-md text-[1.25rem] md:text-[1.4rem] block mt-0.5 transition-colors">{r.company}</span>
                <span className="block text-[14.5px] text-muted mt-1 leading-snug">
                  {r.title}
                  <br />
                  {x.teaser}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="rise" style={{ "--i": roles.length + 1 } as CSSProperties}>
          <Link href="/work#now" className="wm-node wm-now" style={{ "--seg": "var(--c-route)" } as CSSProperties}>
            <span className="wm-dot" aria-hidden />
            <span className="pill pill-building">now</span>
          </Link>
        </li>
      </ol>
      <p className="mt-4 text-[14px] text-muted">
        <span className="md:hidden">Swipe along the line. </span>
        The small dots above 2026 are side projects.{" "}
        <Link href="/work" className="text-accent-text font-medium underline decoration-2 underline-offset-4 hover:text-fg transition-colors">
          Read the whole story
        </Link>
      </p>
    </div>
  );
}
