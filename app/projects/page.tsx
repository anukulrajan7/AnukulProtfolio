import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { history, projects } from "@/lib/site-data";
import { SectionHeading } from "@/components/ui/section-label";
import { StackLine } from "@/components/ui/tag";
import { StatusPill } from "@/components/project-card";
import { ProjectVisual } from "@/components/project-visual";

export const metadata: Metadata = {
  alternates: { canonical: "/projects" },
  title: "Projects",
  description:
    "Things I have built and run: Post Room, TalkToFriend, ADMS Device Gateway, PaisaFlow, DriveEase, ai-dev-setup.",
};

const dotColor = ["bg-p1", "bg-p2", "bg-p3", "bg-p4", "bg-p5", "bg-p6", "bg-p7"];

export default function ProjectsPage() {
  return (
    <div>
      <div className="md:grid md:grid-cols-12 md:gap-8">
        <div className="md:col-span-7">
          <SectionHeading as="h1" size="lg" name="Things I've built" />
        </div>
        <p className="mt-4 md:mt-3 text-muted max-w-[44ch] md:col-span-5 text-[1.05rem]">
          Only things that work end to end. Private repos are described, not linked. Day-job work is on the{" "}
          <Link href="/work" className="text-accent-text font-medium underline decoration-2 underline-offset-4 hover:text-fg transition-colors">
            work page
          </Link>
          .
        </p>
      </div>

      {/* Index */}
      <ol className="mt-12 border-t-2 border-fg">
        {projects.map((p) => (
          <li key={p.id} className="border-b border-border">
            <a
              href={`#${p.id}`}
              className="group grid grid-cols-[1.25rem_1fr_auto] md:grid-cols-12 gap-x-4 md:gap-x-8 py-3.5 items-center -mx-3 px-3 rounded-lg hover:bg-surface transition-colors"
            >
              <span aria-hidden className={`w-3.5 h-3.5 rounded-full border-2 border-fg ${dotColor[p.color - 1]} md:col-span-1`} />
              <span className="md:col-span-4 font-bold text-fg group-hover:text-accent transition-colors">{p.name}</span>
              <span className="hidden md:block md:col-span-5 text-[15px] text-muted truncate">{p.oneLine}</span>
              <span className="label md:col-span-2 md:text-right">{p.year}</span>
            </a>
          </li>
        ))}
      </ol>

      {/* Case studies */}
      <div className="mt-20 space-y-24 md:space-y-32">
        {projects.map((p) => (
          <article key={p.id} id={p.id} className="scroll-mt-10 md:grid md:grid-cols-12 md:gap-10">
            <div className="md:col-span-7 space-y-6">
              <ProjectVisual project={p} />
              {p.visual === "talktofriend" ? <ProjectVisual project={p} variant="alt" /> : undefined}
            </div>

            <div className="md:col-span-5 mt-8 md:mt-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="display-md text-[2rem] md:text-[2.3rem]">{p.name}</h2>
                <StatusPill status={p.status} />
              </div>
              <p className="mt-1.5 label">
                {p.year} · {p.builtFor ? `built for ${p.builtFor}` : p.access === "public" ? "public repo" : "private repo"}
              </p>
              <p className="mt-4 text-[1.1rem] text-fg">{p.oneLine}</p>

              <h3 className="mt-7 font-bold text-[1.05rem]">What it does</h3>
              <p className="mt-2 text-[1rem] leading-relaxed text-fg">{p.what}</p>

              {p.details.length > 0 ? (
                <>
                  <h3 className="mt-7 font-bold text-[1.05rem]">The hard part</h3>
                  <ul className="mt-2 space-y-2.5 list-disc pl-5 marker:text-accent">
                    {p.details.map((d) => (
                      <li key={d} className="text-[15.5px] leading-relaxed">
                        {d}
                      </li>
                    ))}
                  </ul>
                </>
              ) : undefined}

              <h3 className="mt-7 font-bold text-[1.05rem]">Stack</h3>
              <StackLine items={p.stack} className="mt-1.5" />

              {p.links && p.links.length > 0 ? (
                <ul className="mt-6 flex flex-wrap gap-3">
                  {p.links.map((l, i) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener"
                        className={`btn btn-sm ${i === 0 ? "btn-primary" : "btn-ghost"}`}
                      >
                        {l.label}
                        <ArrowUpRight size={15} aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-fg bg-surface px-4 py-2 text-[14px] font-medium">
                  <Lock size={14} aria-hidden />
                  {p.builtFor
                    ? `Built for ${p.builtFor}, so the code stays theirs. Happy to talk through the approach.`
                    : "Private repo. Happy to walk you through it."}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* History */}
      <section className="mt-28">
        <SectionHeading name="In order" aside="first commit or folder date" />
        <ol className="mt-8 border-t-2 border-fg">
          {history.map((h, i) => (
            <li
              key={`${h.when}-${i}`}
              className="grid grid-cols-[6.5rem_1fr] md:grid-cols-12 gap-x-4 md:gap-x-8 py-3 border-b border-border items-baseline"
            >
              <span className="label text-fg md:col-span-2">{h.when}</span>
              {h.href ? (
                <Link href={h.href} className="md:col-span-10 text-[15.5px] hover:text-accent transition-colors">
                  {h.what}
                </Link>
              ) : (
                <span className="md:col-span-10 text-[15.5px]">{h.what}</span>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
