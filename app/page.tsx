import Link from "next/link";
import { getBlogPosts } from "@/lib/blog";
import { projects, roles, selectedProjectIds, site } from "@/lib/site-data";
import { formatLongDate } from "@/lib/format";
import { HeroPhoto } from "@/components/hero-photo";
import { ProofStrip } from "@/components/proof-strip";
import { ProjectCard } from "@/components/project-card";
import { WorkList } from "@/components/work-list";
import { SectionHeading } from "@/components/ui/section-label";
import { HandNote } from "@/components/hand-note";
import { FindMe } from "@/components/find-me";

const postBands = ["bg-p1", "bg-p2", "bg-p3", "bg-p4", "bg-p5", "bg-p6"];

export default function Home() {
  const posts = getBlogPosts()
    .sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime())
    .slice(0, 3);

  const selected = selectedProjectIds
    .map((id) => projects.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  return (
    <div className="space-y-24 md:space-y-32">
      {/* Hero */}
      <section className="grid grid-cols-12 gap-x-6 gap-y-12 md:gap-y-10 pt-2 md:pt-8">
        <div className="col-span-12 md:col-span-7 order-2 md:order-1">
          <HandNote className="rise text-accent-text" style={{ "--i": 0 } as React.CSSProperties} size="lg">
            hi, I&apos;m Anukul
          </HandNote>
          <h1
            className="display mt-3 text-[2.75rem] sm:text-[3.4rem] md:text-[clamp(3rem,5.1vw,4.75rem)] max-w-[15ch] rise"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            I build software that keeps working when the{" "}
            <span className="highlight">network doesn&apos;t.</span>
          </h1>
          <p
            className="mt-7 max-w-[46ch] text-[1.15rem] md:text-[1.25rem] leading-[1.5] text-muted rise"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            {site.heroSub}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 rise" style={{ "--i": 3 } as React.CSSProperties}>
            <Link href="/projects" className="btn btn-primary">
              See what I&apos;ve built
            </Link>
            <a href={`mailto:${site.email}`} className="btn btn-ghost">
              Email me
            </a>
            <a
              href="/resume.pdf"
              target="_blank"
              rel="noopener"
              className="text-[15px] font-medium text-muted underline decoration-2 decoration-border underline-offset-4 hover:text-fg hover:decoration-fg transition-colors sm:ml-2"
            >
              Résumé (PDF)
            </a>
          </div>

          <p className="mt-5 inline-flex items-center gap-2 text-[15px] font-medium text-fg rise" style={{ "--i": 4 } as React.CSSProperties}>
            <span className="pill-dot" aria-hidden />
            Open to opportunities
          </p>

          <div className="mt-8 max-w-[44ch] rise" style={{ "--i": 5 } as React.CSSProperties}>
            <p className="sticky-note inline-block px-5 py-4 text-[15.5px] leading-snug">{site.now}</p>
          </div>
        </div>

        <div className="col-span-12 md:col-span-5 order-1 md:order-2 md:pt-6 pb-16 md:pb-6">
          <HeroPhoto className="md:ml-auto md:max-w-[360px]" />
        </div>
      </section>

      <ProofStrip className="mt-6" />

      {/* Things I've built */}
      <section id="projects">
        <SectionHeading
          name="Things I've built"
          aside={
            <Link href="/projects" className="hover:text-fg transition-colors underline decoration-2 underline-offset-4">
              All {projects.length} projects
            </Link>
          }
        />
        <p className="mt-3 text-muted max-w-[52ch]">
          Side projects I run myself. Each one started with a question I couldn&apos;t answer from reading.
        </p>
        <ul className="mt-10 grid gap-x-8 gap-y-14 md:grid-cols-2">
          {selected.map((p, i) => (
            <ProjectCard key={p.id} project={p} featured={i === 0} />
          ))}
        </ul>
      </section>

      {/* About, in plain voice */}
      <section id="about" className="md:grid md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <SectionHeading name="A bit about me" />
        </div>
        <div className="mt-6 md:mt-2 md:col-span-7 space-y-5 text-[1.1rem] leading-relaxed max-w-[58ch]">
          <p>
            I&apos;ve been paid to write software for about three years. Mostly React for the first two. In
            the last year, more Go, Rust and Android than I planned for.
          </p>
          <p>
            The work I like has a part that only shows up when things go wrong. A phone that lost signal. A
            device that retries forever. An email that must not go out twice. I like being the person who
            has already thought about that part.
          </p>
          <p>
            At Wokay I own the task and chat modules of a real-time workspace, built the structure behind
            notifications, and now work on the geo module: live location tracking in React Native. Evenings go to the
            projects above.
          </p>
          <p className="text-muted">
            I read every message.{" "}
            <a href={`mailto:${site.email}`} className="text-accent-text font-medium underline decoration-2 underline-offset-4 hover:text-fg transition-colors">
              {site.email}
            </a>
          </p>
        </div>
      </section>

      {/* Where I've worked */}
      <section id="work">
        <SectionHeading
          name="Where I've worked"
          aside={
            <Link href="/work" className="hover:text-fg transition-colors underline decoration-2 underline-offset-4">
              The whole story
            </Link>
          }
        />
        <p className="mt-3 text-muted max-w-[52ch]">
          Intern to product engineer in three and a half years. React UI first, then a product frontend from
          zero, then chat, notifications and phones in pockets.
        </p>
        <WorkList roles={roles} className="mt-10" />
      </section>

      {/* Writing */}
      {posts.length > 0 ? (
        <section id="writing">
          <SectionHeading
            name="Writing"
            aside={
              <Link href="/blog" className="hover:text-fg transition-colors underline decoration-2 underline-offset-4">
                All posts
              </Link>
            }
          />
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {posts.map((post, i) => (
              <li key={post.slug} className="card overflow-hidden">
                <Link href={`/blog/${post.slug}`} className="group block h-full">
                  <span aria-hidden className={`block h-3 ${postBands[i % postBands.length]}`} />
                  <div className="p-6">
                    <time className="label" dateTime={post.metadata.date}>
                      {formatLongDate(post.metadata.date)}
                    </time>
                    <h3 className="display-md text-[1.35rem] mt-3 group-hover:text-accent transition-colors">
                      {post.metadata.title}
                    </h3>
                    <p className="mt-3 text-[15px] text-muted line-clamp-3">{post.metadata.summary}</p>
                    <span className="label block mt-5">{post.metadata.readingTime}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : undefined}

      <FindMe />

      {/* Arcade teaser */}
      <section id="arcade">
        <SectionHeading name="Games I made for fun" />
        <div className="mt-8 rounded-[16px] border-2 border-fg bg-sun text-ink p-7 md:p-10 grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8">
            <h3 className="display text-[2rem] md:text-[2.8rem]">Three small games. No libraries.</h3>
            <p className="mt-4 text-[1.05rem] max-w-[52ch]">
              A block stacker, a vector shooter and a snake that thinks it is a GPS trail. Plain TypeScript on a
              canvas. High scores stay in your browser.
            </p>
          </div>
          <div className="md:col-span-4 flex md:justify-end">
            <Link href="/arcade" className="btn btn-ghost !border-ink !text-ink hover:!bg-ink hover:!text-paper">
              Play
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
