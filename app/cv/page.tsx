import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { projects, roles, site, skills } from "@/lib/site-data";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = {
  title: "CV",
  description: "One-page CV of Anukul Raj, Product Engineer in Hyderabad. Print-ready.",
  alternates: { canonical: "/cv" },
  robots: { index: true, follow: true },
};

const cvProjectIds = ["post-room", "talktofriend", "essl-adms-gateway", "paisaflow"];

export default function CvPage() {
  const picked = cvProjectIds
    .map((id) => projects.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  const timeline = [...roles].reverse();

  return (
    <div>
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4 mb-8">
        <p className="text-[15px] text-muted">
          One page. Prints to A4. The{" "}
          <a href="/resume.pdf" className="text-accent-text font-medium underline decoration-2 underline-offset-4 hover:text-fg transition-colors">
            older PDF
          </a>{" "}
          is still there.
        </p>
        <PrintButton />
      </div>

      <article className="cv card mx-auto bg-card text-fg">
        <header className="cv-grid border-b-2 border-fg pb-5">
          <div>
            <h1 className="display text-[2.4rem] leading-none">Anukul Raj</h1>
            <p className="mt-2 text-[15px]">Product Engineer · real-time web, mobile and the services behind them</p>
          </div>
          <ul className="text-[13.5px] text-fg flex flex-col gap-1 md:text-right">
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
          <h2 className="font-bold text-[15px]">Summary</h2>
          <p className="text-[14.5px] leading-relaxed">
            Three years building products people use all day. At Wokay I own the task and chat modules of a
            real-time workspace, built the structure behind notifications, and now work on the geo module: live
            location tracking in React Native. After hours I write Go and Rust: a biometric device
            gateway, an inbox agent that drafts but never sends on its own.
          </p>
        </section>

        <section className="cv-grid pt-5">
          <h2 className="font-bold text-[15px]">Experience</h2>
          <ol className="space-y-4">
            {timeline.map((r) => (
              <li key={r.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="font-bold text-[15px]">
                    {r.title} <span className="font-normal text-muted">· {r.company}</span>
                  </h3>
                  <span className="label">{r.span}</span>
                </div>
                <ul className="mt-1.5 space-y-1 list-disc pl-4 marker:text-accent">
                  {r.points.slice(0, r.current ? 4 : 2).map((p) => (
                    <li key={p} className="text-[13.5px] leading-snug">
                      {p}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section className="cv-grid pt-5">
          <h2 className="font-bold text-[15px]">Selected projects</h2>
          <ul className="space-y-2.5">
            {picked.map((p) => (
              <li key={p.id} className="text-[13.5px] leading-snug">
                <span className="font-bold">{p.name}</span>
                <span className="text-muted"> · {p.year} · {p.status === "active" ? "building" : p.status}</span>
                {p.links?.[0] ? (
                  <a href={p.links[0].href} className="ml-2 inline-flex items-center gap-0.5 text-accent-text hover:text-fg">
                    {p.links[0].href.replace("https://", "")}
                    <ArrowUpRight size={10} aria-hidden className="print:hidden" />
                  </a>
                ) : undefined}
                <div className="mt-0.5">
                  {p.oneLine} {p.details[0]}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="cv-grid pt-5">
          <h2 className="font-bold text-[15px]">Stack</h2>
          <p className="text-[13.5px] leading-relaxed">{skills.join(" · ")}</p>
        </section>

        <section className="cv-grid pt-5 pb-1">
          <h2 className="font-bold text-[15px]">Writing</h2>
          <p className="text-[13.5px] leading-relaxed">
            Notes on frontend and systems work at{" "}
            <a href={`${site.url}/blog`} className="text-accent-text underline decoration-2 underline-offset-2 hover:text-fg">
              anukulraj.com/blog
            </a>
            : live location tracking, a fingerprint device protocol, long-list rendering in React, CORS, data
            fetching without useEffect.
          </p>
        </section>
      </article>
    </div>
  );
}
