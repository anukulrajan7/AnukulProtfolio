"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 h-9 px-3 border border-fg label text-fg hover:bg-fg hover:text-bg transition-colors"
    >
      <Printer size={12} aria-hidden />
      print / save as pdf
    </button>
  );
}
