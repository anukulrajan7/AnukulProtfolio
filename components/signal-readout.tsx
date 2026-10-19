"use client";

import { useEffect, useState } from "react";
import { Frame } from "@/components/ui/frame";

interface SignalReadoutProps {
  status: string;
  className?: string;
}

const COORDS = "17.385°N 78.486°E";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function SignalReadout({ status, className = "" }: SignalReadoutProps) {
  const [now, setNow] = useState<Date | undefined>(undefined);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = now ? timeFormat.format(now) : "--:--:--";
  const date = now ? dateFormat.format(now).replaceAll("-", ".") : "----.--.--";

  return (
    <Frame className={`font-mono text-[11px] leading-none tracking-[0.04em] ${className}`}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="flex items-center gap-2.5">
          <span className="ping" aria-hidden />
          <span className="label text-fg">signal</span>
        </span>
        <span className="label">HYD · IST</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-3 py-3 text-fg">
        <dt className="label">time</dt>
        <dd className="tabular-nums" suppressHydrationWarning>
          {time}
        </dd>
        <dt className="label">date</dt>
        <dd className="tabular-nums" suppressHydrationWarning>
          {date}
        </dd>
        <dt className="label">fix</dt>
        <dd className="tabular-nums">{COORDS}</dd>
        <dt className="label">currently</dt>
        <dd className="leading-[1.5]">{status}</dd>
      </dl>
    </Frame>
  );
}
