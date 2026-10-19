import type { CSSProperties } from "react";
import { growthRows, roleEntries } from "./work-data";
import "./work.css";

/**
 * How the scope grew, role by role. One row per capability, a bar from the
 * role where it started to where it is now. Colour follows the role where it
 * started (same colours as the timeline), the label carries the identity.
 */
export function GrowthStrip({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div className="gs" role="table" aria-label="How the scope grew, by role">
        <span className="hidden md:block" aria-hidden />
        {roleEntries.map((r) => (
          <span key={r.id} className="gs-head" role="columnheader">
            <span className="md:hidden">{r.company.split(" ")[0]}</span>
            <span className="hidden md:inline">{r.company}</span>
            <small>{r.extra.start}</small>
          </span>
        ))}

        {growthRows.map((row) => {
          const startRole = roleEntries[row.from - 1];
          const colour = `var(--p-${startRole.extra.color})`;
          return (
            <GrowthRowView key={row.label} label={row.label} from={row.from} to={row.to} ongoing={row.ongoing} colour={colour} />
          );
        })}
      </div>
      <p className="mt-5 text-[14px] text-muted max-w-[60ch]">
        Each bar starts at the role where that work began. Arrows mean it is still part of the job.
      </p>
    </div>
  );
}

function GrowthRowView({
  label,
  from,
  to,
  ongoing,
  colour,
}: {
  label: string;
  from: number;
  to: number;
  ongoing?: boolean;
  colour: string;
}) {
  // Mobile: 4 columns (1-based). Desktop: label takes column 1, bars shift by one.
  return (
    <>
      <span className="gs-label" role="rowheader">
        {label}
      </span>
      <span
        role="cell"
        className={`gs-bar md:hidden ${ongoing ? "gs-bar-ongoing" : ""}`}
        style={{ gridColumn: `${from} / ${to + 1}`, "--bar": colour } as CSSProperties}
        aria-label={`${roleEntries[from - 1].company} to ${ongoing ? "now" : roleEntries[to - 1].company}`}
      />
      <span
        role="cell"
        className={`gs-bar hidden md:block ${ongoing ? "gs-bar-ongoing" : ""}`}
        style={{ gridColumn: `${from + 1} / ${to + 2}`, "--bar": colour } as CSSProperties}
        aria-hidden
      />
    </>
  );
}
