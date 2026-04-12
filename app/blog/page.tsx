import Link from "next/link";
import { getBlogPosts } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Writing",
  description: "Thoughts on frontend engineering, React, performance, and web development.",
};

export default function BlogPage() {
  const posts = getBlogPosts().sort(
    (a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime()
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Writing</h1>
      <p className="text-muted mt-2">
        Things I've learned about frontend engineering, React, and building for the web.
      </p>

      <div className="mt-10 space-y-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block group"
          >
            <div className="flex justify-between items-baseline">
              <span className="font-medium group-hover:text-accent transition-colors">
                {post.metadata.title}
              </span>
              <span className="text-sm text-muted ml-4 shrink-0">
                {new Date(post.metadata.date).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <p className="text-sm text-muted mt-1">{post.metadata.summary}</p>
          </Link>
        ))}

        {posts.length === 0 && (
          <p className="text-muted">No posts yet. Check back soon.</p>
        )}
      </div>
    </div>
  );
}
