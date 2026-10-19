import type { ReactNode } from "react";

interface SectionHeadingProps {
  name: string;
  aside?: ReactNode;
  className?: string;
  as?: "h1" | "h2";
  size?: "md" | "lg";
}

/** Plain section heading: sentence case, Bricolage 700, optional link on the right. */
export function SectionHeading({ name, aside, className = "", as = "h2", size = "md" }: SectionHeadingProps) {
  const Tag = as;
  const sizeClass = size === "lg" ? "text-[2.4rem] md:text-[3.4rem]" : "text-[2rem] md:text-[2.6rem]";
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-2 ${className}`}>
      <Tag className={`display-md ${sizeClass}`}>{name}</Tag>
      {aside ? <span className="text-[15px] font-medium text-muted pb-2">{aside}</span> : undefined}
    </div>
  );
}

/** Kept for call sites that still import the old name. */
export const SectionLabel = SectionHeading;
