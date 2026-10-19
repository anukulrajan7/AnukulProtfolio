import type { CSSProperties, ReactNode } from "react";

interface HandNoteProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "text-[1.05rem]",
  md: "text-[1.35rem] md:text-[1.5rem]",
  lg: "text-[1.6rem] md:text-[1.9rem]",
};

/** Handwritten-style annotation (Kalam). Used three times on the whole site, on purpose. */
export function HandNote({ children, className = "", style, size = "md" }: HandNoteProps) {
  return (
    <span className={`hand inline-block ${sizes[size]} ${className}`} style={style}>
      {children}
    </span>
  );
}

/** A loose hand-drawn arrow. Points right by default; rotate with className. */
export function HandArrow({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 60"
      className={`${className} ${flip ? "-scale-x-100" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 44 C 30 48, 52 30, 70 22 S 100 12, 112 14" />
      <path d="M98 4 C 104 8, 109 12, 113 15 C 108 18, 103 22, 100 28" />
    </svg>
  );
}
