import Link from "next/link";
import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/blog";
import { SectionHeading } from "@/components/ui/section-label";
import { formatLongDate } from "@/lib/format";

export const metadata: Metadata = {
  alternates: { canonical: "/blog" },
  title: "Writing",
  description: "Notes from building things: frontend, real-time systems, mistakes I keep making.",
};

const bands = ["bg-p1", "bg-p2", "bg-p3", "bg-p4", "bg-p5", "bg-p6"];

export default function BlogPage() {
  const posts = getBlogPosts().sort(
    (a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime()
  );

  return (
    <div>
      <div className="md:grid md:grid-cols-12 md:gap-8">
        <div className="md:col-span-7">
          <SectionHeading as="h1" size="lg" name="Writing" />
        </div>
        <p className="mt-4 md:mt-3 text-muted max-w-[44ch] md:col-span-5 text-[1.05rem]">
          Short notes on frontend and systems work, mostly about what went wrong. Written in the order I learned
          them.
        </p>
      </div>

      <ul className="mt-12 grid gap-6 md:grid-cols-2">
        {posts.map((post, i) => (
          <li key={post.slug} className="card overflow-hidden">
            <Link href={`/blog/${post.slug}`} className="group block h-full">
              <span aria-hidden className={`block h-3 ${bands[i % bands.length]}`} />
              <div className="p-6 md:p-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <time className="label" dateTime={post.metadata.date}>
                    {formatLongDate(post.metadata.date)}
                  </time>
                  <span className="label">{post.metadata.readingTime}</span>
                </div>
                <h2 className="display-md text-[1.5rem] md:text-[1.7rem] mt-3 group-hover:text-accent transition-colors">
                  {post.metadata.title}
                </h2>
                <p className="mt-3 text-[15.5px] text-muted max-w-[60ch]">{post.metadata.summary}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {posts.length === 0 ? <p className="text-muted mt-10">Nothing here yet.</p> : undefined}

      <p className="mt-10 text-[15px]">
        <a href="/rss" className="text-accent-text font-medium underline decoration-2 underline-offset-4 hover:text-fg transition-colors">
          RSS feed
        </a>
      </p>
    </div>
  );
}
