import Image from "next/image";
import Link from "next/link";
import { getBlogPosts } from "@/lib/blog";
import { projects, roles, selectedProjectIds, site } from "@/lib/site-data";
import { formatLogDate } from "@/lib/format";
import { ContourField } from "@/components/contour-field";
import { SignalReadout } from "@/components/signal-readout";
import { RouteTimeline } from "@/components/route-timeline";
import { SectionLabel } from "@/components/ui/section-label";
import { Frame } from "@/components/ui/frame";
import { ProjectRow } from "@/components/project-row";

export default function Home() {
  const posts = getBlogPosts()
    .sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime())
    .slice(0, 3);

  const selected = selectedProjectIds
    .map((id) => projects.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  const routePreview = roles.map((r) => ({
    id: r.id,
    code: r.code,
    span: r.span,
    title: r.company,
    subtitle: `${r.title} — ${r.summary}`,
    current: r.current,
  }));

  return (
    <div className="space-y-24 md:space-y-32">
      {/* Hero */}
      <section className="relative -mx-5 md:-mx-8 px-5 md:px-8 pt-6 pb-10 md:pt-10 md:pb-16 overflow-hidden">
        <ContourField
          className="absolute inset-0 w-full h-full"
          seed={17385}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 30% 40%, transparent 30%, var(--c-bg) 85%)",
          }}
        />

        <div className="relative grid grid-cols-12 gap-x-6 gap-y-10">
          <div className="col-span-12 lg:col-span-8">
            <p className="label rise" style={{ "--i": 0 } as React.CSSProperties}>
              §00 — field log · Hyderabad, IN
            </p>
            <h1
              className="display mt-6 text-[3.4rem] sm:text-[4.6rem] md:text-[6rem] rise"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              Anukul <span className="italic">Raj</span>
            </h1>
            <p
              className="mt-8 max-w-[34ch] text-[1.2rem] md:text-[1.45rem] leading-[1.4] rise"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              {site.heroLine}
            </p>
          </div>

          <div className="col-span-12 sm:col-span-8 lg:col-span-4 lg:pt-10 rise" style={{ "--i": 3 } as React.CSSProperties}>
            <SignalReadout status={site.status} />
          </div>

          <div
            className="col-span-12 lg:col-span-8 flex items-start gap-4 pt-2 border-t border-border rise"
            style={{ "--i": 4 } as React.CSSProperties}
          >
            <Image
              src="/avatar.jpg"
              alt="Anukul Raj"
              width={44}
              height={44}
              className="shrink-0 mt-3 border border-border p-[2px] bg-card"
              priority
            />
            <p className="mt-3 text-[15px] text-muted max-w-[60ch]">
              <span className="label text-fg mr-3">now</span>
              {site.now}
            </p>
          </div>
        </div>
      </section>

      {/* Work preview */}
      <section id="work">
        <SectionLabel index="01" name="Work" aside={<Link href="/work" className="hover:text-fg transition-colors">full route →</Link>} />
        <div className="mt-10 md:grid md:grid-cols-12 md:gap-8">
          <p className="md:col-span-4 text-muted max-w-[36ch]">
            Four stops so far. Two internships, a startup frontend from zero, and a real-time workspace
            where I now own tasks, chat and the calling and tracking features around them.
          </p>
          <div className="mt-10 md:mt-0 md:col-span-8">
            <RouteTimeline waypoints={routePreview} dense />
          </div>
        </div>
      </section>

      {/* Selected projects */}
      <section id="projects">
        <SectionLabel index="02" name="Projects" aside={<Link href="/projects" className="hover:text-fg transition-colors">all entries →</Link>} />
        <div className="mt-10 md:grid md:grid-cols-12 md:gap-8">
          <h2 className="display text-[2rem] md:text-[2.4rem] md:col-span-4 max-w-[14ch]">
            What I run <span className="italic">myself</span>, outside work.
          </h2>
          <ol className="mt-8 md:mt-0 md:col-span-8 border-t border-border">
            {selected.map((p, i) => (
              <ProjectRow key={p.id} project={p} index={i} />
            ))}
          </ol>
        </div>
      </section>

      {/* Writing */}
      {posts.length > 0 ? (
        <section id="writing">
          <SectionLabel index="03" name="Writing" aside={<Link href="/blog" className="hover:text-fg transition-colors">all entries →</Link>} />
          <ul className="mt-10 grid gap-px md:grid-cols-3 bg-border border border-border">
            {posts.map((post) => (
              <li key={post.slug} className="bg-bg">
                <Link href={`/blog/${post.slug}`} className="group block h-full p-6 hover:bg-card transition-colors">
                  <time className="label tabular-nums" dateTime={post.metadata.date}>
                    {formatLogDate(post.metadata.date)}
                  </time>
                  <h3 className="display text-[1.35rem] mt-4 group-hover:text-accent transition-colors">
                    {post.metadata.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted line-clamp-3">{post.metadata.summary}</p>
                  <span className="label block mt-6">{post.metadata.readingTime}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : undefined}

      {/* Arcade teaser */}
      <section id="arcade">
        <SectionLabel index="04" name="Arcade" />
        <Frame className="mt-10 grid md:grid-cols-12 gap-6 p-6 md:p-8">
          <div className="md:col-span-7">
            <h2 className="display text-[1.8rem] md:text-[2.2rem]">
              Games. <span className="italic">Small</span> ones.
            </h2>
            <p className="mt-4 text-muted max-w-[52ch]">
              A few games on a CRT-style panel, same paper and ink as the rest of the site. For
              breaks between entries.
            </p>
          </div>
          <div className="md:col-span-5 flex md:justify-end items-end">
            <Link
              href="/arcade"
              className="inline-flex items-center gap-3 border border-fg px-4 h-11 label text-fg hover:bg-fg hover:text-bg transition-colors"
            >
              insert coin
              <span aria-hidden>→</span>
            </Link>
          </div>
        </Frame>
      </section>
    </div>
  );
}
