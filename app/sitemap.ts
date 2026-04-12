import { getBlogPosts } from "@/lib/blog";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getBlogPosts().map((post) => ({
    url: `https://anukulraj.com/blog/${post.slug}`,
    lastModified: new Date(post.metadata.date),
  }));

  const routes = ["", "/blog", "/work", "/projects"].map((route) => ({
    url: `https://anukulraj.com${route}`,
    lastModified: new Date(),
  }));

  return [...routes, ...posts];
}
