import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { history, projects } from "@/lib/site-data";
import { SectionLabel } from "@/components/ui/section-label";
import { TagList } from "@/components/ui/tag";
import { Frame } from "@/components/ui/frame";
import { StatusTag } from "@/components/project-row";

export const metadata: Metadata = {
  alternates: { canonical: "/projects" },
  title: "Projects",
  description:
    "Field-log index of things I have built and run: Post Room, TalkToFriend, Device Tracker, eSSL ADMS Gateway, PaisaFlow, DriveEase, ai-dev-setup.",
};

export default function ProjectsPage() {
  return (
    <div>
      <SectionLabel index="02" name="Projects" aside={`${projects.length} entries`} />

      <div className="mt-8 md:grid md:grid-cols-12 md:gap-8">
        <h1 className="display text-[2.6rem] md:text-[3.4rem] md:col-span-6">
          Built, running, <span className="italic">logged</span>.
        </h1>
        <p className="mt-4 md:mt-2 text-muted max-w-[44ch] md:col-span-5 md:col-start-8">
          Only things that work end to end. Private repos are described, not linked. Employer work is
          not here; it is on the <Link href="/work" className="underline decoration-accent hover:text-accent transition-colors">route</Link>.
        </p>
      </div>

      {/* Index */}
      <ol className="mt-14 border-t border-border">
        {projects.map((p, i) => (
          <li key={p.id} className="border-b border-border">
            <a href={`#${p.id}`} className="group grid grid-cols-[2.5rem_1fr_auto] md:grid-cols-12 gap-x-4 md:gap-x-8 py-3 items-baseline -mx-3 px-3 hover:bg-card transition-colors">
              <span className="label tabular-nums md:col-span-1">{String(i + 1).padStart(2, "0")}</span>
              <span className="md:col-span-5 text-fg group-hover:text-accent transition-colors">{p.name}</span>
              <span className="hidden md:block md:col-span-4 text-sm text-muted truncate">{p.oneLine}</span>
              <span className="label tabular-nums md:col-span-2 md:text-right">{p.year}</span>
            </a>
          </li>
        ))}
      </ol>

      {/* Entries */}
      <div className="mt-20 space-y-16 md:space-y-20">
        {projects.map((p, i) => (
          <article key={p.id} id={p.id} className="scroll-mt-10 md:grid md:grid-cols-12 md:gap-8">
            <header className="md:col-span-4">
              <div className="label flex items-center gap-3">
                <span className="text-fg">{String(i + 1).padStart(2, "0")}</span>
                <span className="rule w-6" aria-hidden />
                <span className="tabular-nums">{p.year}</span>
              </div>
              <h2 className="display text-[2rem] md:text-[2.3rem] mt-4">{p.name}</h2>
              <p className="mt-2 text-muted">{p.oneLine}</p>
              <div className="mt-5 flex flex-wrap items-center gap-1.5">
                <StatusTag status={p.status} />
                <span className="label ml-1">{p.access === "public" ? "public repo" : "private repo"}</span>
              </div>
              {p.links && p.links.length > 0 ? (
                <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                  {p.links.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener"
                        className="label text-fg inline-flex items-center gap-1 hover:text-accent transition-colors"
                      >
                        {l.label}
                        <ArrowUpRight size={11} aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : undefined}
            </header>

            <div className="md:col-span-8 mt-8 md:mt-0">
              <p className="text-[1.0625rem] leading-relaxed max-w-[62ch]">{p.what}</p>
              {p.details.length > 0 ? (
                <Frame className="mt-6 p-5 md:p-6">
                  <p className="label mb-4">notes</p>
                  <ul className="space-y-3 max-w-[62ch]">
                    {p.details.map((d) => (
                      <li key={d} className="relative pl-5 text-[15px] leading-relaxed">
                        <span aria-hidden className="absolute left-0 top-[0.8em] w-2.5 h-px bg-route" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </Frame>
              ) : undefined}
              <div className="mt-6">
                <TagList items={p.stack} />
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* History strip */}
      <section className="mt-28">
        <SectionLabel index="02.1" name="Project history" aside="year.month → entry" />
        <ol className="mt-8 border-t border-border">
          {history.map((h, i) => (
            <li key={`${h.when}-${i}`} className="grid grid-cols-[5.5rem_1fr] md:grid-cols-12 gap-x-4 md:gap-x-8 py-3 border-b border-border items-baseline">
              <span className="label tabular-nums text-fg md:col-span-2">{h.when}</span>
              {h.href ? (
                <Link href={h.href} className="md:col-span-10 text-[15px] hover:text-accent transition-colors">
                  {h.what}
                </Link>
              ) : (
                <span className="md:col-span-10 text-[15px]">{h.what}</span>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
