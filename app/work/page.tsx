import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/section-label";
import { WorkTimeline } from "@/components/work/work-timeline";
import { GrowthStrip } from "@/components/work/growth-strip";
import { Capabilities } from "@/components/work/capabilities";
import { WorkCta } from "@/components/work/work-cta";
import { roleEntries } from "@/components/work/work-data";

export const metadata: Metadata = {
  alternates: { canonical: "/work" },
  title: "Work",
  description:
    "Three and a half years, in order: intern at iMeet Technologies, intern at Echo, a product frontend from zero at Social X, Product Engineer 2 at Wokay. What I built at each and what was hard.",
};

export default function WorkPage() {
  return (
    <div>
      {/* Intro */}
      <div className="md:grid md:grid-cols-12 md:gap-8">
        <div className="md:col-span-7">
          <SectionHeading as="h1" size="lg" name="Where I've worked" />
          <p className="mt-5 text-[1.15rem] md:text-[1.25rem] leading-[1.5] max-w-[40ch]">
            April 2023 to now, in order. Two internships, a frontend from zero, then a real-time workspace where
            the work moved from lists to chat to GPS.
          </p>
        </div>
        <nav aria-label="Jump to a role" className="mt-6 md:mt-3 md:col-span-5 md:justify-self-end">
          <ol className="flex flex-wrap gap-2">
            {roleEntries.map((r) => (
              <li key={r.id}>
                <a
                  href={`#${r.id}`}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-fg px-3 h-9 text-[14px] font-bold hover:bg-fg hover:text-bg transition-colors"
                >
                  <span aria-hidden className="h-3 w-3 rounded-full border border-fg" style={{ background: `var(--p-${r.extra.color})` }} />
                  {r.company}
                  <span className="font-medium text-muted">{r.extra.start.slice(-4)}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* The time flow */}
      <div className="mt-12 md:mt-16 border-t-2 border-fg pt-10 md:pt-12">
        <p className="label mb-6 md:ml-[128px] md:pl-4">
          Day job on the solid line. Side projects on the dashed one. Scroll and the line draws itself.
        </p>
        <WorkTimeline />
      </div>

      {/* Growth */}
      <section id="growth" className="mt-24 md:mt-32">
        <SectionHeading name="How the scope grew" />
        <p className="mt-3 text-muted max-w-[52ch]">
          React UI first. Then a whole product frontend. Then real-time, notifications, phones, and backends on the
          side when a project needed one.
        </p>
        <GrowthStrip className="mt-10" />
      </section>

      {/* Capabilities */}
      <section id="good-at" className="mt-24 md:mt-32">
        <SectionHeading name="What I'm good at" />
        <p className="mt-3 text-muted max-w-[52ch]">Each one points at the role or project it comes from.</p>
        <Capabilities className="mt-10" />
      </section>

      <WorkCta className="mt-24 md:mt-32" />

      <p className="label mt-10">Day-job work is described at a public level only. The details live in the products.</p>
    </div>
  );
}
