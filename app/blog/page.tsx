import Link from "next/link";
import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/blog";
import { SectionLabel } from "@/components/ui/section-label";
import { formatLogDate } from "@/lib/format";

export const metadata: Metadata = {
  alternates: { canonical: "/blog" },
  title: "Writing",
  description: "Notes from building things: frontend, real-time systems, mistakes I keep making.",
};

export default function BlogPage() {
  const posts = getBlogPosts().sort(
    (a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime()
  );

  return (
    <div>
      <SectionLabel index="03" name="Writing" aside={`${posts.length} entries`} />

      <div className="mt-8 md:grid md:grid-cols-12 md:gap-8">
        <h1 className="display text-[2.6rem] md:text-[3.4rem] md:col-span-5">
          Notes, <span className="italic">mostly</span> about what went wrong.
        </h1>
        <p className="mt-4 md:mt-2 text-muted max-w-[46ch] md:col-span-6 md:col-start-7">
          Short entries on frontend and systems work. Written in the order I learned them, not the order
          that would look best.
        </p>
      </div>

      <ol className="mt-14 border-t border-border">
        {posts.map((post) => (
          <li key={post.slug} className="border-b border-border">
            <Link
              href={`/blog/${post.slug}`}
              className="group grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-2 py-6 md:py-7 hover:bg-card transition-colors -mx-3 px-3"
            >
              <time className="label md:col-span-2 tabular-nums pt-[7px]" dateTime={post.metadata.date}>
                {formatLogDate(post.metadata.date)}
              </time>
              <div className="md:col-span-8">
                <h2 className="display text-[1.45rem] md:text-[1.6rem] group-hover:text-accent transition-colors">
                  {post.metadata.title}
                </h2>
                <p className="mt-2 text-muted text-[15px] max-w-[62ch]">{post.metadata.summary}</p>
              </div>
              <span className="label md:col-span-2 md:text-right pt-[7px]">{post.metadata.readingTime}</span>
            </Link>
          </li>
        ))}
      </ol>

      {posts.length === 0 ? <p className="text-muted mt-10">No entries yet.</p> : undefined}

      <p className="label mt-8">
        <a href="/rss" className="hover:text-fg transition-colors">
          rss feed →
        </a>
      </p>
    </div>
  );
}
