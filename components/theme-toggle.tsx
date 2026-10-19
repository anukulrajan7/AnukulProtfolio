"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

// Cycles system -> light -> dark, so a visitor can always get back to
// following their OS setting after picking a theme by hand.
const order = ["system", "light", "dark"] as const;
type Mode = (typeof order)[number];

const meta: Record<Mode, { icon: typeof Sun; label: string }> = {
  system: { icon: Monitor, label: "Theme: system" },
  light: { icon: Sun, label: "Theme: light" },
  dark: { icon: Moon, label: "Theme: dark" },
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <span className="inline-block w-10 h-10" aria-hidden />;

  const current: Mode = order.includes(theme as Mode) ? (theme as Mode) : "system";
  const next = order[(order.indexOf(current) + 1) % order.length];
  const { icon: Icon, label } = meta[current];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-fg text-fg hover:bg-fg hover:text-bg transition-colors"
      aria-label={`${label}. Switch to ${next}.`}
      title={`${label} (click for ${next})`}
    >
      <Icon size={16} />
    </button>
  );
}
