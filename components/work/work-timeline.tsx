import Link from "next/link";
import type { CSSProperties } from "react";
import { site } from "@/lib/site-data";
import { Tile } from "@/components/tile";
import { Tag } from "@/components/ui/tag";
import { HandNote } from "@/components/hand-note";
import { Timeline } from "./timeline";
import { RoleVisualFor } from "./role-visuals";
import { projectFor, timelineEvents, type RoleEntry, type TimelineEvent } from "./work-data";
import "./work.css";

const tileVar = (c: number) => `var(--p-${c})`;

/** The main-lane colour at a point in the flow is the role active then. */
function laneColours(events: TimelineEvent[]): string[] {
  let current = "var(--c-fg)";
  return events.map((ev) => {
    if (ev.kind === "role") current = tileVar(ev.role.extra.color);
    return current;
  });
}

export function WorkTimeline({ className = "" }: { className?: string }) {
  const lanes = laneColours(timelineEvents);
  const firstSide = timelineEvents.findIndex((e) => e.kind === "lane-start");

  return (
    <Timeline label="Career timeline, April 2023 to now" className={className}>
      {timelineEvents.map((ev, i) => {
        const seg = lanes[i];
        const sideLane = firstSide >= 0 && i > firstSide;
        switch (ev.kind) {
          case "role":
            return <RoleItem key={ev.id} ev={ev} seg={seg} />;
          case "lane-start":
            return <LaneStart key={ev.id} ev={ev} seg={seg} />;
          case "side":
            return <SideItem key={ev.id} ev={ev} seg={seg} sideLane={sideLane} />;
          case "mark":
            return <MarkItem key={ev.id} ev={ev} seg={seg} sideLane={sideLane} />;
          case "now":
            return <NowItem key={ev.id} ev={ev} seg={seg} />;
        }
      })}
    </Timeline>
  );
}

/* ---------------------------------------------------------------- items */

function Rail({ seg, sideLane, children }: { seg: string; sideLane?: boolean; children?: React.ReactNode }) {
  return (
    <div className="wt-rail" aria-hidden>
      <span className="wt-seg" data-seg style={{ "--seg": seg } as CSSProperties} />
      {sideLane ? <span className="wt-side-lane" /> : undefined}
      {children}
    </div>
  );
}

function RoleItem({ ev, seg }: { ev: Extract<TimelineEvent, { kind: "role" }>; seg: string }) {
  const r: RoleEntry = ev.role;
  const n = ["One", "Two", "Three", "Four"][["imeet", "echo", "socialx", "wokay"].indexOf(r.id)] ?? "";
  return (
    <li id={r.id} className="wt-item scroll-mt-24" data-item data-reached="false" style={{ "--seg": seg } as CSSProperties}>
      <div className="wt-date">{ev.date}</div>
      <Rail seg={seg}>
        <span className="wt-dot" data-dot data-reached="false" style={{ "--dot-top": "6px" } as CSSProperties} />
      </Rail>
      <div className="wt-body wt-reveal">
        <p className="label text-fg">
          <span className="md:hidden font-bold">{ev.date} · </span>
          Chapter {n}
        </p>
        <h2 className="display-md text-[1.9rem] md:text-[2.4rem] mt-1 leading-[1.05]">
          <Company role={r} />
          <span className="block text-muted text-[1.1rem] md:text-[1.25rem] font-sans font-medium tracking-normal mt-1">
            {r.title} · {r.span}
          </span>
        </h2>
        <p className="display-md text-[1.3rem] md:text-[1.6rem] mt-4 max-w-[26ch]">{r.extra.chapter}</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            <Tile color={r.extra.color}>
              <RoleVisualFor visual={r.extra.visual} />
            </Tile>
          </div>
          <div className="lg:col-span-6 space-y-6">
            <div>
              <h3 className="font-bold text-[1rem]">What I shipped</h3>
              <ul className="mt-2 space-y-2">
                {r.points.map((p) => (
                  <li key={p} className="flex gap-3 text-[15.5px] leading-relaxed">
                    <span aria-hidden className="mt-[9px] h-[9px] w-[9px] shrink-0 rounded-[2px] border border-fg" style={{ background: seg }} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="wt-hard">
              <h3 className="font-bold text-[1rem]">The hard part</h3>
              <p className="mt-2 text-[15.5px] leading-relaxed">{r.extra.hardPart}</p>
              <p className="mt-3 text-[15.5px] leading-relaxed">
                <span className="highlight font-medium">{r.extra.lesson}</span>
              </p>
            </div>
            <ul className="flex flex-wrap gap-1.5" aria-label="Stack">
              {r.stack.map((s) => (
                <li key={s}>
                  <Tag tone="route">{s}</Tag>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </li>
  );
}

function Company({ role }: { role: RoleEntry }) {
  if (!role.url) return <>{role.company}</>;
  return (
    <a href={role.url} target="_blank" rel="noopener" className="hover:text-accent transition-colors">
      {role.company}
    </a>
  );
}

function LaneStart({ ev, seg }: { ev: Extract<TimelineEvent, { kind: "lane-start" }>; seg: string }) {
  return (
    <li className="wt-item" data-item data-reached="false">
      <div className="wt-date wt-date-muted">{ev.date}</div>
      <Rail seg={seg} sideLane={false}>
        <svg className="wt-branch" viewBox="0 0 28 44" preserveAspectRatio="none" fill="none">
          <path d="M0 0 C 0 24, 28 16, 28 44" stroke="var(--c-muted)" strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
        </svg>
        <span className="wt-side-lane" style={{ top: 44 }} />
      </Rail>
      <div className="wt-body wt-body-tight pt-5">
        <HandNote size="md" className="text-fg -rotate-1">
          {ev.note} →
        </HandNote>
        <p className="mt-1 text-[15px] text-muted max-w-[44ch]">
          From 2026 a second lane shows up. Side projects, each one started with a question the day job raised.
        </p>
      </div>
    </li>
  );
}

function SideItem({ ev, seg, sideLane }: { ev: Extract<TimelineEvent, { kind: "side" }>; seg: string; sideLane: boolean }) {
  const p = projectFor(ev);
  const colour = tileVar(p.color);
  return (
    <li className="wt-item" data-item data-reached="false" style={{ "--seg": seg } as CSSProperties}>
      <div className="wt-date wt-date-muted">{ev.date}</div>
      <Rail seg={seg} sideLane={sideLane}>
        <span className="wt-dot wt-dot-side" data-dot data-reached="false" style={{ "--seg": colour, "--dot-top": "10px" } as CSSProperties} />
      </Rail>
      <div className="wt-body wt-body-tight wt-reveal">
        <Link href={`/projects#${p.id}`} className="group flex gap-3 items-start md:ml-2">
          <span aria-hidden className="mt-[5px] h-[18px] w-[18px] shrink-0 rounded-[5px] border-2 border-fg" style={{ background: colour }} />
          <span className="min-w-0">
            <span className="block text-[15px] text-muted md:hidden">{ev.date}</span>
            <span className="font-bold text-[1.05rem] group-hover:text-accent transition-colors">{p.name}</span>
            <span className="block text-[15px] text-muted leading-snug max-w-[56ch]">{ev.what}</span>
          </span>
        </Link>
      </div>
    </li>
  );
}

function MarkItem({ ev, seg, sideLane }: { ev: Extract<TimelineEvent, { kind: "mark" }>; seg: string; sideLane: boolean }) {
  return (
    <li className="wt-item" data-item data-reached="false" style={{ "--seg": seg } as CSSProperties}>
      <div className="wt-date">{ev.date}</div>
      <Rail seg={seg} sideLane={sideLane}>
        <span className="wt-dot wt-dot-small" data-dot data-reached="false" style={{ "--dot-top": "8px" } as CSSProperties} />
      </Rail>
      <div className="wt-body wt-body-tight wt-reveal">
        <span className="block text-[15px] text-muted md:hidden">{ev.date}</span>
        <p className="font-bold text-[1.05rem]">
          <a href="#wokay" className="hover:text-accent transition-colors">
            {ev.title}
          </a>
        </p>
        <p className="text-[15px] text-muted max-w-[56ch]">{ev.what}</p>
      </div>
    </li>
  );
}

function NowItem({ ev, seg }: { ev: Extract<TimelineEvent, { kind: "now" }>; seg: string }) {
  return (
    <li id="now" className="wt-item" data-item data-reached="false" style={{ "--seg": seg } as CSSProperties}>
      <div className="wt-date">{ev.date}</div>
      <div className="wt-rail" aria-hidden>
        <span className="wt-seg" data-seg style={{ "--seg": seg, bottom: "auto", height: "12px" } as CSSProperties} />
        <span className="wt-dot wt-dot-now" data-dot data-reached="false" style={{ "--dot-top": "4px" } as CSSProperties} />
      </div>
      <div className="wt-body !pb-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="pill pill-building">now</span>
          <HandNote size="md" className="text-fg rotate-[-1.5deg]">
            you are here
          </HandNote>
        </div>
        <p className="mt-3 text-[1.05rem] max-w-[52ch]">
          <span className="md:hidden">{ev.date}. </span>
          Product Engineer 2 at Wokay, Hyderabad. {site.now.replace(/^Right now: /, "")}
        </p>
      </div>
    </li>
  );
}
