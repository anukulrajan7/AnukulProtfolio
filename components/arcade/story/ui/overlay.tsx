"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { audio } from "../engine/audio";
import type { Prefs } from "../engine/save";
import type { Game } from "../story/core";
import { KEEPSAKES, SHELF_SLOTS, type Ui } from "../story/types";
import { SEGS, type Stamp } from "../world/map";

export function useUi<T>(g: Game, sel: (s: Ui) => T): T {
  const get = useCallback(() => sel(g.ui.get()), [g, sel]);
  return useSyncExternalStore(g.ui.sub, get, get);
}

const selBubble = (s: Ui) => s.bubble;
const selPrompt = (s: Ui) => s.prompt;
const selChoices = (s: Ui) => s.choices;
const selSuggest = (s: Ui) => s.suggest;
const selCard = (s: Ui) => s.card;
const selSlot = (s: Ui) => s.slot;
const selStamp = (s: Ui) => s.stamp;
const selAction = (s: Ui) => s.action;
const selHint = (s: Ui) => s.hint;
const selChapter = (s: Ui) => s.chapter;
const selGoal = (s: Ui) => s.goal;
const selKeeps = (s: Ui) => s.keepsakes;
const selNew = (s: Ui) => s.newKeepsake;
const selPrefs = (s: Ui) => s.prefs;
const selLog = (s: Ui) => s.log;

/* ---------------- HUD ---------------- */

export function Hud({ g, onPause }: { g: Game; onPause: () => void }) {
  const chapter = useUi(g, selChapter);
  const goal = useUi(g, selGoal);
  const keeps = useUi(g, selKeeps);
  const fresh = useUi(g, selNew);
  const prefs = useUi(g, selPrefs);
  return (
    <header className="lw-hud">
      <span className="lw-hud-left">
        <span className="lw-chapter">{chapter || "The Long Way to OK"}</span>
        <span className="lw-goal" aria-live="polite">
          {goal ? `Goal: ${goal}` : ""}
        </span>
      </span>
      <span className="lw-hud-right">
        <ol className="lw-shelf" aria-label={`Keepsake shelf, ${keeps.length} of ${SHELF_SLOTS}`}>
          {Array.from({ length: SHELF_SLOTS }, (_, i) => {
            const k = keeps[i];
            const def = KEEPSAKES.find((d) => d.id === k);
            return (
              <li key={i} className="lw-slot" data-new={k && k === fresh ? "1" : "0"} title={def ? `${def.name}. ${def.meaning}` : "Empty"}>
                {def ? <KeepIcon id={def.id} /> : null}
                <span className="sr-only">{def ? def.name : "empty"}</span>
              </li>
            );
          })}
        </ol>
        <button type="button" className="lw-hbtn" aria-pressed={prefs.sound} onClick={() => g.setPrefs({ ...prefs, sound: !prefs.sound })}>
          {prefs.sound ? "Sound on" : "Sound off"}
        </button>
        <button type="button" className="lw-hbtn" onClick={onPause} aria-label="Pause (Esc)">
          Pause
        </button>
      </span>
    </header>
  );
}

export function KeepIcon({ id }: { id: string }) {
  if (id === "look")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="7" y="3" width="10" height="18" rx="2" fill="#121217" />
        <rect x="8.6" y="5" width="6.8" height="12" rx="1" fill="#8ED1FC" />
        <path d="M14 3l3 3" stroke="#FFC83D" strokeWidth="2" />
      </svg>
    );
  if (id === "sorry")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" fill="#fff" stroke="#121217" strokeWidth="2" />
        <path d="M7 10h10M7 14h6" stroke="#55555F" strokeWidth="1.6" />
      </svg>
    );
  if (id === "listen")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="#FFC83D" stroke="#121217" strokeWidth="2" />
        <path d="M8 10h8M8 14h5" stroke="#121217" strokeWidth="1.6" />
      </svg>
    );
  if (id === "check")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 18L17 7l2.5 2.5L8.5 20.5H6z" fill="#FF5B38" stroke="#121217" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  if (id === "why")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z" fill="#fff" stroke="#121217" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 9h6M9 13h6" stroke="#55555F" strokeWidth="1.6" />
      </svg>
    );
  if (id === "read")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="3" width="14" height="18" rx="2" fill="#fff" stroke="#121217" strokeWidth="2" />
        <path d="M8 8h8M8 12h8M8 16h5" stroke="#C7390F" strokeWidth="1.6" />
      </svg>
    );
  if (id === "plain")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="3" width="14" height="18" rx="2" fill="#DCDFFD" stroke="#121217" strokeWidth="2" />
        <path d="M8 8h2M8 12h5M8 16h8" stroke="#121217" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="7" width="19" height="10" rx="2" fill="#FFC83D" stroke="#121217" strokeWidth="2" />
      <text x="12" y="14.2" fontSize="5.4" textAnchor="middle" fontFamily="monospace" fontWeight="700" fill="#121217">
        unknown
      </text>
    </svg>
  );
}

/* ---------------- Bubble ---------------- */

export function Bubble({ g, anchored }: { g: Game; anchored: boolean }) {
  const b = useUi(g, selBubble);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (anchored) g.els.bubble = ref.current;
    return () => {
      if (anchored && g.els.bubble === ref.current) g.els.bubble = null;
    };
  });
  if (!b) return null;
  const typing = b.shown < b.text.length;
  return (
    <button
      ref={ref}
      type="button"
      className={`lw-bubble lw-${b.kind}`}
      data-anchored={anchored ? "1" : "0"}
      data-bark={b.blocking ? "0" : "1"}
      onClick={() => g.advance()}
      tabIndex={b.blocking ? 0 : -1}
      aria-label={b.blocking ? (typing ? "Show the whole line" : "Next") : undefined}
    >
      {b.name ? <span className="lw-name">{b.name}</span> : null}
      <span className="lw-text" aria-hidden="true">
        {b.text.slice(0, Math.floor(b.shown))}
        {typing || b.kind === "tab" ? <span className="lw-caret" /> : null}
      </span>
      {b.blocking && !typing ? <span className="lw-next" aria-hidden="true">▸</span> : null}
      {b.voice && !typing ? <span className="lw-voice">{b.voice}</span> : null}
    </button>
  );
}

/** Screen-reader transcript (the visible bubble is aria-hidden while it types). */
export function Transcript({ g }: { g: Game }) {
  const log = useUi(g, selLog);
  const last = log[log.length - 1];
  return (
    <div className="sr-only" aria-live="polite" role="log">
      {last ? `${last.who ? last.who + ": " : ""}${last.text}` : ""}
    </div>
  );
}

/* ---------------- Prompt (near a glint) ---------------- */

export function Prompt({ g }: { g: Game }) {
  const p = useUi(g, selPrompt);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    g.els.prompt = ref.current;
  });
  if (!p) return null;
  return (
    <button ref={ref} type="button" className="lw-prompt" onClick={() => g.useHotspot(p.id)}>
      <kbd>E</kbd> {p.verb} · {p.label}
    </button>
  );
}

/* ---------------- Chapter / title card ---------------- */

export function Card({ g }: { g: Game }) {
  const c = useUi(g, selCard);
  if (!c) return null;
  return (
    <button type="button" className="lw-card" style={{ background: c.bg, color: c.fg }} onClick={() => g.cardSkip?.()}>
      {c.kicker ? <span className="lw-card-kicker">{c.kicker}</span> : null}
      <span className="lw-card-title">{c.title}</span>
      {c.sub ? <span className="lw-card-sub">{c.sub}</span> : null}
    </button>
  );
}

/* ---------------- Controls: choices, suggestion, slot, stamps, action ---------------- */

export function Controls({ g, compact }: { g: Game; compact: boolean }) {
  const choices = useUi(g, selChoices);
  const suggest = useUi(g, selSuggest);
  const slot = useUi(g, selSlot);
  const stamp = useUi(g, selStamp);
  const action = useUi(g, selAction);
  const hint = useUi(g, selHint);
  const prefs = useUi(g, selPrefs);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (choices) first.current?.focus({ preventScroll: true });
  }, [choices]);

  return (
    <div className="lw-controls" data-compact={compact ? "1" : "0"}>
      {compact ? <Bubble g={g} anchored={false} /> : null}
      {choices ? (
        <div className="lw-choices" role="group" aria-label={choices.prompt ?? "Choose what you say"}>
          {choices.prompt ? <p className="lw-choice-prompt">{choices.prompt}</p> : null}
          {choices.options.map((o, i) => (
            <button key={o.text} ref={i === 0 ? first : undefined} type="button" className="lw-choice" onClick={() => g.pick(i)}>
              <kbd>{i + 1}</kbd>
              <span>{o.text}</span>
              {o.voice ? <span className="lw-voice">{o.voice}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      {suggest ? (
        <div className="lw-suggest" role="group" aria-label={`Tab suggests: ${suggest.title}`}>
          <span className="lw-suggest-title">
            <span className="lw-tabdot" aria-hidden="true" />
            {suggest.title}
            {suggest.inspected ? <span className="lw-looked">looked closer</span> : null}
          </span>
          <span className="lw-chips">
            <button type="button" className="lw-chip lw-accept" onClick={() => g.suggestAct("accept")}>
              Accept <kbd>{prefs.acceptKey === "tab" ? "Tab" : "F"}</kbd>
            </button>
            <button
              type="button"
              className="lw-chip lw-inspect"
              data-on={suggest.inspecting ? "1" : "0"}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                g.touchInspect(true);
              }}
              onPointerUp={() => g.touchInspect(false)}
              onPointerCancel={() => g.touchInspect(false)}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  g.touchInspect(true);
                }
              }}
              onKeyUp={() => g.touchInspect(false)}
            >
              Hold to inspect <kbd>Q</kbd>
            </button>
            <button type="button" className="lw-chip lw-reject" onClick={() => g.suggestAct("reject")}>
              Not this <kbd>R</kbd>
            </button>
          </span>
        </div>
      ) : null}
      {slot ? (
        <div className="lw-slotbox" role="group" aria-label={slot.prompt}>
          <p className="lw-choice-prompt">{slot.prompt}</p>
          <div className="lw-answer" aria-hidden="true">
            {Array.from({ length: slot.max }, (_, i) => {
              const id = slot.placed[i];
              const p = slot.pieces.find((x) => x.id === id);
              return (
                <span key={i} className="lw-answer-slot" data-filled={p ? "1" : "0"}>
                  {p ? p.text : ""}
                </span>
              );
            })}
          </div>
          {slot.pieces.length ? (
            <div className="lw-pieces">
              {slot.pieces.map((p, i) => (
                <button key={p.id} type="button" className="lw-piece" aria-pressed={slot.placed.includes(p.id)} onClick={() => g.togglePiece(p.id)}>
                  <kbd>{i + 1}</kbd> {p.text}
                </button>
              ))}
            </div>
          ) : (
            <p className="lw-empty-note">Nothing fits yet.</p>
          )}
          <button type="button" className="lw-chip lw-accept lw-say" disabled={!!slot.pieces.length && !slot.placed.length} onClick={() => g.confirmSlot()}>
            {slot.pieces.length ? "Say it" : "Say nothing"} <kbd>E</kbd>
          </button>
        </div>
      ) : null}
      {stamp ? <Stamps g={g} /> : null}
      {action && !choices && !suggest ? (
        <button type="button" className="lw-chip lw-action" onClick={() => g.doAction()}>
          {action.label} <kbd>E</kbd>
        </button>
      ) : null}
      {hint ? <p className="lw-hint">{hint}</p> : null}
    </div>
  );
}

const STAMP_LABELS: { k: Stamp; label: string; note: string }[] = [
  { k: "draw", label: "Draw it", note: "small circles" },
  { k: "keep", label: "Keep, don't draw", note: "big circles" },
  { k: "unknown", label: "Unknown", note: "no readings" },
];

function Stamps({ g }: { g: Game }) {
  const st = useUi(g, selStamp)!;
  const all = SEGS.every((s) => st.stamps[s.id]);
  const sel = SEGS.find((s) => s.id === st.selected)!;
  const letItPlay = () => {
    for (const s of SEGS) {
      if (st.stamps[s.id]) continue;
      g.selectSeg(s.id);
      g.stamp(s.good[0]);
    }
    g.finishStamps(true);
  };
  return (
    <div className="lw-stamps" role="group" aria-label="Stamp each stretch of the walk">
      <div className="lw-segs" role="tablist">
        {SEGS.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={st.selected === s.id} className="lw-seg" onClick={() => g.selectSeg(s.id)}>
            <span className="lw-seg-name">{s.name}</span>
            <span className="lw-seg-stamp" data-k={st.stamps[s.id] ?? "none"}>
              {st.stamps[s.id] ? STAMP_LABELS.find((x) => x.k === st.stamps[s.id])!.label : "?"}
            </span>
          </button>
        ))}
      </div>
      <p className="lw-seg-hint">
        <b>{sel.name}:</b> {sel.hint}
      </p>
      <div className="lw-chips">
        {STAMP_LABELS.map((s, i) => (
          <button key={s.k} type="button" className="lw-chip lw-stamp" data-k={s.k} onClick={() => g.stamp(s.k)}>
            <kbd>{i + 1}</kbd> {s.label}
          </button>
        ))}
        <button type="button" className="lw-chip lw-accept" disabled={!all} onClick={() => g.finishStamps()}>
          Done <kbd>Enter</kbd>
        </button>
        <button type="button" className="lw-chip lw-ghost" onClick={letItPlay}>
          Let it play out
        </button>
      </div>
    </div>
  );
}

/* ---------------- Keepsake toast ---------------- */

export function KeepsakeToast({ g }: { g: Game }) {
  const id = useUi(g, selNew);
  const def = KEEPSAKES.find((k) => k.id === id);
  if (!def) return null;
  return (
    <div className="lw-toast" role="status">
      <span className="lw-toast-icon">
        <KeepIcon id={def.id} />
      </span>
      <span>
        <span className="lw-toast-k">Keepsake</span>
        <span className="lw-toast-name">{def.name}</span>
        <span className="lw-toast-m">{def.meaning}</span>
      </span>
    </div>
  );
}

/* ---------------- Settings (pause menu + title) ---------------- */

export function Settings({ g, prefs }: { g: Game; prefs: Prefs }) {
  const set = (p: Partial<Prefs>) => g.setPrefs({ ...prefs, ...p });
  return (
    <div className="lw-settings">
      <label className="lw-row">
        <span>Sound</span>
        <input type="checkbox" checked={prefs.sound} onChange={(e) => set({ sound: e.target.checked })} />
      </label>
      <label className="lw-row">
        <span>Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={prefs.volume}
          onChange={(e) => set({ volume: Number(e.target.value) })}
          onPointerUp={() => audio.ui("pick")}
          disabled={!prefs.sound}
        />
      </label>
      <label className="lw-row">
        <span>
          Story-only mode <small>mechanics play themselves; you still choose</small>
        </span>
        <input type="checkbox" checked={prefs.storyOnly} onChange={(e) => set({ storyOnly: e.target.checked })} />
      </label>
      <div className="lw-row">
        <span>Text size</span>
        <span className="lw-seg3">
          {(["s", "m", "l"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={prefs.textSize === t} onClick={() => set({ textSize: t })}>
              {t.toUpperCase()}
            </button>
          ))}
        </span>
      </div>
      <div className="lw-row">
        <span>Motion</span>
        <span className="lw-seg3">
          {(["auto", "reduce", "full"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={prefs.motion === t} onClick={() => set({ motion: t })}>
              {t === "auto" ? "Auto" : t === "reduce" ? "Reduced" : "Full"}
            </button>
          ))}
        </span>
      </div>
      <div className="lw-row">
        <span>Accept key</span>
        <span className="lw-seg3">
          {(["tab", "f"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={prefs.acceptKey === t} onClick={() => set({ acceptKey: t })}>
              {t === "tab" ? "Tab or F" : "F only"}
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}
