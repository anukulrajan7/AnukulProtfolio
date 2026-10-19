"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const loading = () => (
  <div className="flex aspect-[4/3] w-full items-center justify-center font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
    Loading cartridge…
  </div>
);

const Stacker = dynamic(() => import("./stacker").then((m) => m.Stacker), { ssr: false, loading });
const Pingback = dynamic(() => import("./pingback").then((m) => m.Pingback), { ssr: false, loading });
const Route = dynamic(() => import("./route").then((m) => m.Route), { ssr: false, loading });

interface Cartridge {
  id: string;
  name: string;
  index: string;
  tag: string;
  blurb: string;
  howTo: string;
  Component: React.ComponentType;
}

const cartridges: Cartridge[] = [
  {
    id: "stacker",
    name: "Stacker",
    index: "01",
    tag: "falling blocks",
    blurb: "The classic, done properly. Seven-piece bag, wall kicks, ghost piece, hold slot, three-piece preview, lock delay.",
    howTo:
      "Fill rows to clear them. Every ten lines the drop gets faster. Hard drop with Space when you are sure, soft drop when you are not. Hold stashes a piece for later; you get one swap per piece.",
    Component: Stacker,
  },
  {
    id: "pingback",
    name: "Pingback",
    index: "02",
    tag: "vector shooter",
    blurb: "A signal tower clearing noise. Thrust has inertia, the screen wraps, blobs split when hit.",
    howTo:
      "Turn with the arrows, thrust forward, fire pings. Big blobs break into two smaller ones; the small ones are worth the most. You respawn in the centre once it is clear. Extra tower every 10,000.",
    Component: Pingback,
  },
  {
    id: "route",
    name: "Route",
    index: "03",
    tag: "gps trail",
    blurb: "Snake, as a GPS trail on a contour map. Collect waypoints. The edge of the map is the edge of the map.",
    howTo:
      "Steer with arrows or WASD. Each waypoint adds to the trail and speeds things up. Orange pings with a shrinking ring expire in five seconds and pay five times more. Do not cross your own trail or leave the grid.",
    Component: Route,
  },
];

export function ArcadeCabinet({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(0);
  const cart = cartridges[active];
  const ActiveGame = cart.Component;

  return (
    <div className={`relative border border-border bg-card ${className}`}>
      <Tick className="-left-px -top-px border-l border-t" />
      <Tick className="-right-px -top-px border-r border-t" />
      <Tick className="-bottom-px -left-px border-b border-l" />
      <Tick className="-bottom-px -right-px border-b border-r" />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
        <span>Handheld · REV 1</span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          {cart.index} / {cartridges.length} · {cart.tag}
        </span>
      </div>

      <div role="tablist" aria-label="Choose a game" className="flex border-b border-border">
        {cartridges.map((c, i) => {
          const selected = i === active;
          return (
            <button
              key={c.id}
              role="tab"
              id={`arcade-tab-${c.id}`}
              type="button"
              aria-selected={selected}
              aria-controls={`arcade-panel-${c.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const dir = e.key === "ArrowRight" ? 1 : -1;
                  const next = (i + dir + cartridges.length) % cartridges.length;
                  setActive(next);
                  document.getElementById(`arcade-tab-${cartridges[next].id}`)?.focus();
                }
              }}
              className={`relative flex-1 px-3 py-3 text-left font-mono text-xs uppercase tracking-[0.06em] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                selected ? "text-fg" : "text-muted hover:text-fg"
              } ${i > 0 ? "border-l border-border" : ""}`}
            >
              <span className="text-muted">{c.index} </span>
              {c.name}
              {selected ? (
                <span className="absolute inset-x-0 -bottom-px h-px bg-accent" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`arcade-panel-${cart.id}`}
        aria-labelledby={`arcade-tab-${cart.id}`}
        className="grid gap-6 p-4 md:grid-cols-[minmax(0,1fr)_240px] md:p-6"
      >
        <div className="relative min-w-0 bg-surface p-3 md:p-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply dark:mix-blend-screen"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent 0 2px, var(--c-fg) 2px 3px)",
            }}
          />
          <div className="relative">
            <ActiveGame key={cart.id} />
          </div>
        </div>

        <aside className="min-w-0 text-sm leading-relaxed">
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
            Cartridge {cart.index}
          </p>
          <h2 className="display mt-1 text-2xl">{cart.name}</h2>
          <p className="mt-2 text-muted">{cart.blurb}</p>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">How to play</p>
          <p className="mt-1">{cart.howTo}</p>
          <p className="mt-4 font-mono text-[11px] text-muted">
            Keyboard on desktop. Touch pads show up on phones. Click the screen first so the keys go to the
            game, not the page. High score stays in this browser.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Tick({ className }: { className: string }) {
  return <span aria-hidden="true" className={`absolute h-3 w-3 border-fg ${className}`} />;
}
