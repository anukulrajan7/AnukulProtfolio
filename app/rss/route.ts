import RSS from "rss";
import { getBlogPosts } from "@/lib/blog";

export async function GET() {
  const feed = new RSS({
    title: "Anukul Raj",
    description: "Notes from Anukul Raj on real-time systems, live location tracking, WebRTC, device gateways and frontend engineering.",
    site_url: "https://anukulraj.com",
    feed_url: "https://anukulraj.com/rss",
    language: "en",
  });

  const posts = getBlogPosts().sort(
    (a, b) =>
      new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime()
  );

  posts.forEach((post) => {
    feed.item({
      title: post.metadata.title,
      url: `https://anukulraj.com/blog/${post.slug}`,
      date: post.metadata.date,
      description: post.metadata.summary,
    });
  });

  return new Response(feed.xml({ indent: true }), {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
