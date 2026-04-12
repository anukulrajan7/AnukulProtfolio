import { notFound } from "next/navigation";
import Link from "next/link";
import { getBlogPost, getBlogPosts } from "@/lib/blog";
import { MDXContent } from "@/components/mdx";
import type { Metadata } from "next";

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

  return (
    <div>
      <Link
        href="/blog"
        className="text-sm text-muted hover:text-foreground transition-colors"
      >
        &larr; back
      </Link>

      <header className="mt-8 mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          {post.metadata.title}
        </h1>
        <div className="flex gap-3 text-sm text-muted mt-2">
          <time>
            {new Date(post.metadata.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </time>
          <span>&middot;</span>
          <span>{post.metadata.readingTime}</span>
        </div>
      </header>

      <MDXContent source={post.content} />
    </div>
  );
}
