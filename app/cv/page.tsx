import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { projects, roles, site, skills } from "@/lib/site-data";
import { PrintButton } from "@/components/print-button";
import { Ticks } from "@/components/ui/frame";

export const metadata: Metadata = {
  title: "CV",
  description: "One-page CV of Anukul Raj, Product Engineer in Hyderabad. Print-ready.",
  alternates: { canonical: "/cv" },
  robots: { index: true, follow: true },
};

const cvProjectIds = ["device-tracker", "post-room", "talktofriend", "essl-adms-gateway"];

export default function CvPage() {
  const picked = cvProjectIds
    .map((id) => projects.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  const timeline = [...roles].reverse();

  return (
    <div>
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4 mb-8">
        <p className="label">
          One page. Prints to A4. The <a href="/resume.pdf" className="text-fg hover:text-accent transition-colors">older PDF</a> is still there.
        </p>
        <PrintButton />
      </div>

      <article className="cv frame mx-auto bg-card text-fg">
        <Ticks />

        <header className="cv-grid border-b border-border pb-5">
          <div>
            <h1 className="display text-[2.4rem] leading-none">
              Anukul <span className="italic">Raj</span>
            </h1>
            <p className="mt-2 text-[15px]">Product Engineer · real-time web, mobile and the services behind them</p>
          </div>
          <ul className="label text-fg flex flex-col gap-1 md:text-right">
            <li>Hyderabad, India</li>
            <li>
              <a href={`mailto:${site.email}`} className="hover:text-accent">{site.email}</a>
            </li>
            <li>
              <a href={site.url} className="hover:text-accent">anukulraj.com</a>
            </li>
            <li>
              <a href={site.github} className="hover:text-accent">github.com/anukulrajan7</a>
            </li>
            <li>
              <a href={site.linkedin} className="hover:text-accent">linkedin.com/in/anukul-raj-31b6a2193</a>
            </li>
          </ul>
        </header>

        <section className="cv-grid pt-5">
          <h2 className="label text-fg">Summary</h2>
          <p className="text-[14.5px] leading-relaxed">
            Three years building products people use all day. At Wokay I own the task and chat modules of a
            real-time workspace, built audio/video calling on a mediasoup SFU, and shipped motion-aware
            background location tracking in React Native. After hours I write Go and Rust: a location-tracking
            ingest with a tested spec, a biometric device gateway, an inbox agent that drafts but never sends
            on its own.
          </p>
        </section>

        <section className="cv-grid pt-5">
          <h2 className="label text-fg">Experience</h2>
          <ol className="space-y-4">
            {timeline.map((r) => (
              <li key={r.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="font-bold text-[15px]">
                    {r.title} <span className="font-normal text-muted">· {r.company}</span>
                  </h3>
                  <span className="label tabular-nums">{r.span}</span>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {r.points.slice(0, r.current ? 4 : 2).map((p) => (
                    <li key={p} className="relative pl-4 text-[13.5px] leading-snug">
                      <span aria-hidden className="absolute left-0 top-[0.7em] w-2 h-px bg-route" />
                      {p}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section className="cv-grid pt-5">
          <h2 className="label text-fg">Selected projects</h2>
          <ul className="space-y-2.5">
            {picked.map((p) => (
              <li key={p.id} className="text-[13.5px] leading-snug">
                <span className="font-bold">{p.name}</span>
                <span className="text-muted"> · {p.year} · {p.status}</span>
                {p.links?.[0] ? (
                  <a href={p.links[0].href} className="label ml-2 inline-flex items-center gap-0.5 hover:text-accent">
                    {p.links[0].href.replace("https://", "")}
                    <ArrowUpRight size={10} aria-hidden className="print:hidden" />
                  </a>
                ) : undefined}
                <div className="mt-0.5">{p.oneLine} {p.details[0]}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="cv-grid pt-5">
          <h2 className="label text-fg">Stack</h2>
          <p className="text-[13.5px] leading-relaxed">{skills.join(" · ")}</p>
        </section>

        <section className="cv-grid pt-5 pb-1">
          <h2 className="label text-fg">Writing</h2>
          <p className="text-[13.5px] leading-relaxed">
            Notes on frontend and systems work at <a href={`${site.url}/blog`} className="underline decoration-accent hover:text-accent">anukulraj.com/blog</a> —
            virtualization internals, CORS, data fetching without useEffect, mistakes I keep making.
          </p>
        </section>
      </article>
    </div>
  );
}
