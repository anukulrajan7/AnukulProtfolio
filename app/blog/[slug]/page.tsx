import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getBlogPost, getBlogPosts } from "@/lib/blog";
import { MDXContent } from "@/components/mdx";
import { formatLogDate, formatLongDate } from "@/lib/format";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    title: post.metadata.title,
    description: post.metadata.summary,
    openGraph: {
      title: post.metadata.title,
      description: post.metadata.summary,
      type: "article",
      publishedTime: post.metadata.date,
      url: `https://anukulraj.com/blog/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.metadata.title,
      description: post.metadata.summary,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) notFound();

  const all = getBlogPosts().sort(
    (a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime()
  );
  const index = all.findIndex((p) => p.slug === slug);
  const entryNo = String(all.length - index).padStart(2, "0");
  const next = index > 0 ? all[index - 1] : undefined;
  const prev = index < all.length - 1 ? all[index + 1] : undefined;

  return (
    <div className="md:grid md:grid-cols-12 md:gap-8">
      <aside className="md:col-span-3">
        <div className="md:sticky md:top-8 flex flex-col gap-3 label">
          <Link href="/blog" className="hover:text-fg transition-colors w-fit">
            ← writing
          </Link>
          <span className="rule w-8" aria-hidden />
          <span className="text-fg">entry {entryNo}</span>
          <time dateTime={post.metadata.date} className="tabular-nums">
            {formatLogDate(post.metadata.date)}
          </time>
          <span>{post.metadata.readingTime}</span>
        </div>
      </aside>

      <div className="md:col-span-9 mt-10 md:mt-0">
        <header className="max-w-[68ch]">
          <h1 className="display text-[2.4rem] md:text-[3.2rem]">{post.metadata.title}</h1>
          {post.metadata.summary ? (
            <p className="mt-5 font-display italic text-[1.2rem] leading-snug text-muted">
              {post.metadata.summary}
            </p>
          ) : undefined}
          <p className="label mt-6 pb-6 border-b border-border">
            logged {formatLongDate(post.metadata.date)}
          </p>
        </header>

        <div className="mt-10">
          <MDXContent source={post.content} />
        </div>

        <nav className="mt-16 pt-6 border-t border-border grid gap-4 sm:grid-cols-2 max-w-[68ch]" aria-label="Adjacent entries">
          {prev ? (
            <Link href={`/blog/${prev.slug}`} className="group">
              <span className="label">← earlier</span>
              <span className="block mt-1 display text-[1.1rem] group-hover:text-accent transition-colors">
                {prev.metadata.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/blog/${next.slug}`} className="group sm:text-right">
              <span className="label">later →</span>
              <span className="block mt-1 display text-[1.1rem] group-hover:text-accent transition-colors">
                {next.metadata.title}
              </span>
            </Link>
          ) : undefined}
        </nav>
      </div>
    </div>
  );
}
