import Link from "next/link";
import type { CSSProperties } from "react";
import { capabilities, type CapabilityIcon } from "./work-data";

/** "What I'm good at": each card points at the role or project that proves it. */
export function Capabilities({ className = "" }: { className?: string }) {
  return (
    <ul className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {capabilities.map((c) => (
        <li key={c.title} className="card p-6 flex flex-col" style={{ "--cap": `var(--p-${c.color})` } as CSSProperties}>
          <span
            aria-hidden
            className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border-2 border-fg text-ink"
            style={{ background: "var(--cap)" }}
          >
            <Icon name={c.icon} />
          </span>
          <h3 className="display-md text-[1.3rem] mt-4">{c.title}</h3>
          <p className="mt-2 text-[15px] text-muted leading-relaxed flex-1">{c.evidence}</p>
          <p className="mt-4 text-[14px] font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-muted">Proof:</span>
            {c.proof.map((p) => (
              <Link key={p.href + p.label} href={p.href} className="text-accent-text underline decoration-2 underline-offset-4 hover:text-fg transition-colors">
                {p.label}
              </Link>
            ))}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Icon({ name }: { name: CapabilityIcon }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "pulse":
      return (
        <svg {...common}>
          <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
        </svg>
      );
    case "video":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <path d="M16 10l5-3v10l-5-3z" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "plug":
      return (
        <svg {...common}>
          <path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8zM12 16v5" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <path d="M8 6h13M8 12h13M8 18h13" />
          <circle cx="4" cy="6" r="1" />
          <circle cx="4" cy="12" r="1" />
          <circle cx="4" cy="18" r="1" />
        </svg>
      );
    case "server":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="7" rx="2" />
          <rect x="3" y="13" width="18" height="7" rx="2" />
          <path d="M7 7.5h.01M7 16.5h.01" />
        </svg>
      );
  }
}
