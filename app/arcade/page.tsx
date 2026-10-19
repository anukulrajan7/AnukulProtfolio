import type { Metadata } from "next";
import { ArcadeCabinet } from "@/components/arcade/arcade-cabinet";

export const metadata: Metadata = {
  title: "Arcade",
  description:
    "Three small canvas games in plain TypeScript: a block stacker, a vector shooter, and a GPS-trail snake.",
};

export default function ArcadePage() {
  return (
    <section>
      <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">§04 — Arcade</p>
      <h1 className="display mt-3 text-[2.6rem] md:text-[3.4rem]">Arcade</h1>
      <p className="mt-4 max-w-[60ch] text-muted">
        Things I built to procrastinate properly. Three games on a canvas, plain TypeScript, no game
        libraries. Fixed-timestep loops, the same colour tokens as the rest of the site, high scores in
        your browser and nowhere else.
      </p>

      <ArcadeCabinet className="mt-10" />

      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
        Tab blur or scrolling away pauses the game. P or Esc also pauses.
      </p>
    </section>
  );
}
