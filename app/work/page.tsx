import type { Metadata } from "next";
import { roles } from "@/lib/site-data";
import { RouteTimeline } from "@/components/route-timeline";
import { SectionLabel } from "@/components/ui/section-label";
import { TagList } from "@/components/ui/tag";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Roles so far: iMeet Technologies, Echo, Social X, Wokay. What I actually built at each.",
};

export default function WorkPage() {
  const waypoints = roles.map((r) => ({
    id: r.id,
    code: r.code,
    span: r.span,
    current: r.current,
    title: r.url ? (
      <a href={r.url} target="_blank" rel="noopener" className="hover:text-accent transition-colors">
        {r.company}
      </a>
    ) : (
      r.company
    ),
    subtitle: r.title,
    children: (
      <div id={r.id} className="scroll-mt-8">
        <ul className="space-y-2.5 max-w-[60ch]">
          {r.points.map((p) => (
            <li key={p} className="relative pl-5 text-[15px] leading-relaxed">
              <span aria-hidden className="absolute left-0 top-[0.8em] w-2.5 h-px bg-route" />
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <TagList items={r.stack} />
        </div>
      </div>
    ),
  }));

  return (
    <div>
      <SectionLabel index="01" name="Work" aside={`${roles.length} waypoints`} />

      <div className="mt-8 md:grid md:grid-cols-12 md:gap-8">
        <h1 className="display text-[2.6rem] md:text-[3.4rem] md:col-span-6">
          The route <span className="italic">so far</span>.
        </h1>
        <p className="mt-4 md:mt-2 text-muted max-w-[44ch] md:col-span-5 md:col-start-8">
          Four stops. The first two were internships, the third a startup frontend from zero, the fourth
          a real-time workspace where the work moved from lists to calls to GPS.
        </p>
      </div>

      <div className="mt-16 md:mt-20">
        <RouteTimeline waypoints={waypoints} />
      </div>

      <p className="label mt-16 pt-6 border-t border-border">
        Employer work is described at a public level only. Details live in the products.
      </p>
    </div>
  );
}
