import type { ReactNode } from "react";

interface SectionLabelProps {
  index: string;
  name: string;
  aside?: ReactNode;
  className?: string;
}

export function SectionLabel({ index, name, aside, className = "" }: SectionLabelProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="label text-fg shrink-0">
        <span className="text-muted">§{index}</span>
        <span className="text-muted mx-2">—</span>
        {name}
      </span>
      <span className="rule flex-1" aria-hidden />
      {aside ? <span className="label shrink-0">{aside}</span> : undefined}
    </div>
  );
}
