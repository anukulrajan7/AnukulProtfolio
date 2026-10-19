import type { ReactNode } from "react";

interface TagProps {
  children: ReactNode;
  tone?: "route" | "muted" | "accent";
  className?: string;
}

const tones = {
  route: "text-route border-route/40",
  muted: "text-muted border-border",
  accent: "text-accent-text border-accent/50",
};

export function Tag({ children, tone = "route", className = "" }: TagProps) {
  return (
    <span
      className={`inline-flex items-center font-mono text-[10.5px] uppercase tracking-[0.06em] leading-none px-1.5 py-[5px] border ${tones[tone]} ${className}`}
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
