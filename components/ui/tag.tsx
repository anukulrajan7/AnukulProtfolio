import type { ReactNode } from "react";

interface TagProps {
  children: ReactNode;
  tone?: "route" | "muted" | "accent";
  className?: string;
}

const tones = {
  route: "text-fg bg-surface",
  muted: "text-muted bg-surface",
  accent: "text-on-accent bg-accent",
};

export function Tag({ children, tone = "muted", className = "" }: TagProps) {
  return (
    <span
      className={`inline-flex items-center text-[13px] font-medium leading-none px-2.5 py-[6px] rounded-full ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function TagList({ items, tone }: { items: readonly string[]; tone?: TagProps["tone"] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Tag key={item} tone={tone}>
          {item}
        </Tag>
      ))}
    </span>
  );
}

/** Plain-text stack line: "Go · SQLite · Docker". */
export function StackLine({ items, className = "" }: { items: readonly string[]; className?: string }) {
  return <p className={`text-[15px] text-muted ${className}`}>{items.join(" · ")}</p>;
}
