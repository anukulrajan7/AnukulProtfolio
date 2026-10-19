"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-ghost btn-sm">
      <Printer size={15} aria-hidden />
      Print or save as PDF
    </button>
  );
}
