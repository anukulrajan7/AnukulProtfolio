import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getBlogPost, getBlogPosts } from "@/lib/blog";
import { MDXContent } from "@/components/mdx";
import { formatLongDate } from "@/lib/format";
import { JsonLd } from "@/components/json-ld";
import { site } from "@/lib/site-data";

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
    alternates: { canonical: `/blog/${slug}` },
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
  const next = index > 0 ? all[index - 1] : undefined;
  const prev = index < all.length - 1 ? all[index + 1] : undefined;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.metadata.title,
    description: post.metadata.summary,
    datePublished: post.metadata.date,
    url: `${site.url}/blog/${slug}`,
    mainEntityOfPage: `${site.url}/blog/${slug}`,
    author: { "@type": "Person", "@id": `${site.url}/#person`, name: site.name, url: site.url },
    publisher: { "@type": "Person", "@id": `${site.url}/#person`, name: site.name },
    inLanguage: "en",
  };

  return (
    <div className="md:grid md:grid-cols-12 md:gap-8">
      <JsonLd data={articleSchema} />
      <aside className="md:col-span-3">
        <div className="md:sticky md:top-8 flex flex-col gap-2 text-[15px]">
          <Link
            href="/blog"
            className="w-fit font-medium text-accent-text underline decoration-2 underline-offset-4 hover:text-fg transition-colors"
          >
            ← All writing
          </Link>
          <time dateTime={post.metadata.date} className="label mt-3">
            {formatLongDate(post.metadata.date)}
          </time>
          <span className="label">{post.metadata.readingTime}</span>
        </div>
      </aside>

      <div className="md:col-span-9 mt-8 md:mt-0">
        <header className="max-w-[68ch]">
          <h1 className="display text-[2.4rem] md:text-[3.4rem]">{post.metadata.title}</h1>
          {post.metadata.summary ? (
            <p className="mt-5 text-[1.2rem] leading-snug text-muted">{post.metadata.summary}</p>
          ) : undefined}
          <span aria-hidden className="block mt-7 h-1.5 w-20 rounded-full bg-sun" />
        </header>

        <div className="mt-10">
          <MDXContent source={post.content} />
        </div>

        <nav className="mt-16 pt-6 border-t-2 border-fg grid gap-4 sm:grid-cols-2 max-w-[68ch]" aria-label="Adjacent posts">
          {prev ? (
            <Link href={`/blog/${prev.slug}`} className="group">
              <span className="label">← Earlier</span>
              <span className="block mt-1 display-md text-[1.15rem] group-hover:text-accent transition-colors">
                {prev.metadata.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/blog/${next.slug}`} className="group sm:text-right">
              <span className="label">Later →</span>
              <span className="block mt-1 display-md text-[1.15rem] group-hover:text-accent transition-colors">
                {next.metadata.title}
              </span>
            </Link>
          ) : undefined}
        </nav>
      </div>
    </div>
  );
}
