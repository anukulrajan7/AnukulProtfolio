"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <span className="inline-block w-[74px] h-7" aria-hidden />;

  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="inline-flex items-center gap-1.5 h-7 px-2 border border-border label text-fg hover:border-fg transition-colors"
      aria-label={dark ? "Switch to paper theme" : "Switch to night theme"}
    >
      {dark ? <Sun size={12} /> : <Moon size={12} />}
      <span>{dark ? "night" : "paper"}</span>
    </button>
  );
}
