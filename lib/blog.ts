import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const contentDir = path.join(process.cwd(), "content", "blog");

export interface BlogPost {
  slug: string;
  metadata: {
    title: string;
    date: string;
    summary: string;
    readingTime: string;
  };
  content: string;
}

export function getBlogPosts(): BlogPost[] {
  if (!fs.existsSync(contentDir)) return [];

  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".mdx"));

  return files.map((file) => {
    const slug = file.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(contentDir, file), "utf-8");
    const { data, content } = matter(raw);
    const stats = readingTime(content);

    return {
      slug,
      metadata: {
        title: data.title || slug,
        date: data.date || "2025-01-01",
        summary: data.summary || "",
        readingTime: stats.text,
      },
      content,
    };
  });
}

export function getBlogPost(slug: string): BlogPost | null {
  const filePath = path.join(contentDir, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const stats = readingTime(content);

  return {
    slug,
    metadata: {
      title: data.title || slug,
      date: data.date || "2025-01-01",
      summary: data.summary || "",
      readingTime: stats.text,
    },
    content,
  };
}
