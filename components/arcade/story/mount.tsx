"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const load = () => import("./game");
const StoryGame = dynamic(load, {
  ssr: false,
  loading: () => (
    <div className="lw-poster" aria-busy="true">
      <p className="lw-kicker">loading the story…</p>
    </div>
  ),
});

/** SSR'd poster; the game chunk loads only on Play (prefetched on hover/focus). */
export function StoryMount() {
  const [play, setPlay] = useState(false);
  if (play) return <StoryGame />;
  return (
    <div className="lw-poster">
      <div className="lw-poster-inner">
        <p className="lw-kicker">a small story game</p>
        <p className="lw-poster-title">The Long Way to OK</p>
        <p className="lw-poster-sub">A small game about learning to build things, in the years the machines learned too.</p>
        <button
          type="button"
          className="lw-btn lw-btn-primary"
          onPointerEnter={() => void load()}
          onFocus={() => void load()}
          onClick={() => setPlay(true)}
        >
          Play
        </button>
        <p className="lw-poster-meta">About 5 minutes · keyboard or touch · sound is off until you turn it on</p>
      </div>
    </div>
  );
}
