"use client";

// Code-built cover art for the arcade hub. Pure SVG in the Workbench palette
// (tokens via CSS variables) so the covers follow the theme and stay crisp.

import type { MiniGameId } from "../types";

interface CoverProps {
  game: MiniGameId;
  className?: string;
  /** Plays a subtle motion when the parent is hovered/focused (CSS-driven). */
  animate?: boolean;
}

const INK = "var(--ink)";
const PAPER = "var(--paper)";
const ACCENT = "var(--p-1)";
const SUN = "var(--p-2)";
const CORAL = "var(--p-3)";
const MINT = "var(--p-4)";
const LILAC = "var(--p-5)";
const SKY = "var(--p-6)";

export function Cover({ game, className = "", animate = true }: CoverProps) {
  const cls = `block h-full w-full ${className}`;
  if (game === "stacker") return <StackerCover className={cls} animate={animate} />;
  if (game === "pingback") return <PingbackCover className={cls} animate={animate} />;
  return <RouteCover className={cls} animate={animate} />;
}

function Tile({ x, y, s = 28, fill }: { x: number; y: number; s?: number; fill: string }) {
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} rx={s * 0.22} fill={fill} stroke={INK} strokeWidth="2.5" />
      <rect x={x + s * 0.2} y={y + s * 0.17} width={s * 0.3} height={s * 0.14} rx={s * 0.06} fill={PAPER} opacity="0.55" />
    </g>
  );
}

function StackerCover({ className, animate }: { className: string; animate: boolean }) {
  const s = 30;
  const x0 = 96;
  const y0 = 200 - 2 * 2;
  // bottom rows (with one gap), a falling T piece above
  const rows: (string | null)[][] = [
    [SUN, CORAL, MINT, LILAC, SKY, SUN, null, CORAL],
    [MINT, SKY, SUN, CORAL, LILAC, MINT, null, SKY],
    [CORAL, LILAC, SKY, MINT, SUN, CORAL, LILAC, MINT],
  ];
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="Stacker cover: a well of coloured tiles with a piece falling in">
      <rect width="320" height="200" fill={ACCENT} />
      <g opacity="0.22" fill={PAPER}>
        {Array.from({ length: 8 }, (_, c) => Array.from({ length: 6 }, (_, r) => <rect key={`${c}-${r}`} x={x0 + c * s + s / 2 - 1.5} y={y0 - (r + 1) * s - 1.5} width="3" height="3" rx="1" />))}
      </g>
      <rect x={x0 - 8} y={-10} width={8 * s + 16} height={y0 + 20} rx="14" fill="none" stroke={INK} strokeWidth="3" />
      {rows.map((row, ri) => row.map((f, ci) => (f ? <Tile key={`${ri}-${ci}`} x={x0 + ci * s} y={y0 - (rows.length - ri) * s} s={s} fill={f} /> : null)))}
      <g className={animate ? "arcade-cover-fall" : undefined}>
        <Tile x={x0 + 6 * s} y={y0 - 7 * s} s={s} fill={SKY} />
        <Tile x={x0 + 5 * s} y={y0 - 6 * s} s={s} fill={SKY} />
        <Tile x={x0 + 6 * s} y={y0 - 6 * s} s={s} fill={SKY} />
        <Tile x={x0 + 7 * s} y={y0 - 6 * s} s={s} fill={SKY} />
      </g>
      <g stroke={PAPER} strokeWidth="2.5" strokeDasharray="5 4" opacity="0.8" fill="none">
        <rect x={x0 + 6 * s + 3} y={y0 - 2 * s + 3} width={s - 6} height={s - 6} rx="6" />
        <rect x={x0 + 6 * s + 3} y={y0 - 3 * s + 3} width={s - 6} height={s - 6} rx="6" />
      </g>
      <g>
        <rect x="18" y="154" width="56" height="26" rx="8" fill={SUN} stroke={INK} strokeWidth="2.5" />
        <text x="46" y="172" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="15" fill={INK}>
          +800
        </text>
      </g>
    </svg>
  );
}

function Bug({ x, y, r, fill, look = [1, 0] }: { x: number; y: number; r: number; fill: string; look?: [number, number] }) {
  const pts: string[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.82 + 0.18 * Math.sin(i * 2.3 + r));
    pts.push(`${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`);
  }
  const er = Math.max(2.5, r * 0.16);
  const gap = r * 0.32;
  return (
    <g>
      <polygon points={pts.join(" ")} fill={fill} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {[-1, 1].map((sx) => (
        <g key={sx}>
          <circle cx={x + sx * gap} cy={y} r={er} fill={PAPER} stroke={INK} strokeWidth="1.8" />
          <circle cx={x + sx * gap + look[0] * er * 0.4} cy={y + look[1] * er * 0.4} r={er * 0.5} fill={INK} />
        </g>
      ))}
    </g>
  );
}

function PingbackCover({ className, animate }: { className: string; animate: boolean }) {
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="Pingback cover: a cobalt ship firing at bug-eyed blobs">
      <rect width="320" height="200" fill={LILAC} />
      <g fill={INK} opacity="0.18">
        {Array.from({ length: 8 }, (_, c) => Array.from({ length: 5 }, (_, r) => <rect key={`${c}-${r}`} x={20 + c * 40 - 1.5} y={20 + r * 40 - 1.5} width="3" height="3" rx="1" />))}
      </g>
      <Bug x={238} y={66} r={40} fill={SUN} look={[-1, 0.4]} />
      <Bug x={82} y={150} r={23} fill={MINT} look={[1, -0.4]} />
      <Bug x={286} y={158} r={14} fill={CORAL} look={[-1, -0.2]} />
      <g className={animate ? "arcade-cover-drift" : undefined}>
        <g transform="translate(130 104) rotate(-28)">
          <polygon points="-16,-9 -16,9 -10,0" fill={CORAL} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" transform="translate(-10 0)" />
          <polygon points="22,0 -14,13 -7,0 -14,-13" fill={ACCENT} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="5" cy="0" r="3.2" fill={PAPER} />
        </g>
        <g fill={ACCENT} stroke={INK} strokeWidth="1.5">
          <circle cx="166" cy="86" r="4" />
          <circle cx="190" cy="74" r="4" />
          <circle cx="214" cy="62" r="4" opacity="0.6" />
        </g>
      </g>
      <g>
        <rect x="18" y="154" width="96" height="26" rx="8" fill={PAPER} stroke={INK} strokeWidth="2.5" />
        <text x="66" y="172" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="14" fill={INK}>
          Wave 4 clear!
        </text>
      </g>
    </svg>
  );
}

function Pin({ x, y, fill, big = false }: { x: number; y: number; fill: string; big?: boolean }) {
  const r = big ? 11 : 9;
  return (
    <g>
      <ellipse cx={x} cy={y + 6} rx={r * 0.9} ry="3" fill="none" stroke={fill} strokeWidth="2" opacity="0.6" />
      <path d={`M ${x} ${y + r * 1.4} L ${x - r * 0.85} ${y - r * 0.1} A ${r} ${r} 0 1 1 ${x + r * 0.85} ${y - r * 0.1} Z`} fill={fill} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x} cy={y - r * 0.4} r={r * 0.36} fill={PAPER} />
    </g>
  );
}

function RouteCover({ className, animate }: { className: string; animate: boolean }) {
  const trail = "M 30 150 L 90 150 L 90 100 L 150 100 L 150 60 L 210 60 L 210 120 L 250 120";
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="Route cover: a cobalt GPS trail on a mint map with delivery pins">
      <rect width="320" height="200" fill={MINT} />
      <g fill="none" stroke={INK} strokeWidth="1.5" opacity="0.18">
        <path d="M -10 40 C 60 20, 120 70, 190 40 S 300 10, 340 40" />
        <path d="M -10 90 C 50 70, 110 120, 180 90 S 290 60, 340 95" />
        <path d="M -10 140 C 70 120, 120 170, 200 140 S 300 110, 340 150" />
        <path d="M -10 185 C 60 165, 130 205, 200 180 S 290 160, 340 190" />
      </g>
      <g fill={INK} opacity="0.14">
        {Array.from({ length: 11 }, (_, c) => Array.from({ length: 7 }, (_, r) => <rect key={`${c}-${r}`} x={30 + c * 26 - 1.5} y={20 + r * 26 - 1.5} width="3" height="3" rx="1" />))}
      </g>
      <g className={animate ? "arcade-cover-trail" : undefined} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={trail} stroke={INK} strokeWidth="20" />
        <path d={trail} stroke={ACCENT} strokeWidth="15" />
        <path d={trail} stroke={PAPER} strokeWidth="2" strokeDasharray="5 6" opacity="0.8" />
      </g>
      <circle cx="250" cy="120" r="12" fill={ACCENT} stroke={INK} strokeWidth="2.5" />
      <circle cx="250" cy="120" r="4.5" fill={PAPER} />
      <Pin x={282} y={96} fill={CORAL} />
      <Pin x={64} y={58} fill={SUN} big />
      <Pin x={226} y={170} fill={CORAL} />
      <g>
        <rect x="92" y="38" width="34" height="26" rx="8" fill={PAPER} stroke={INK} strokeWidth="2.5" />
        <text x="109" y="56" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="14" fill={INK}>
          +50
        </text>
      </g>
    </svg>
  );
}
