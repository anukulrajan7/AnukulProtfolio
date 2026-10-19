import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import fs from "fs";
import path from "path";

const contentDir = path.join(process.cwd(), "content", "blog");

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, slug, summary, content } = await req.json();

  if (!title || !slug || !content) {
    return NextResponse.json(
      { error: "Title, slug, and content are required" },
      { status: 400 }
    );
  }

  // Sanitize slug
  const safeSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const date = new Date().toISOString().split("T")[0];

  const mdxContent = `---
title: "${title}"
date: "${date}"
summary: "${summary || ""}"
---

${content}`;

  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }

  const filePath = path.join(contentDir, `${safeSlug}.mdx`);
  fs.writeFileSync(filePath, mdxContent, "utf-8");

  return NextResponse.json({ success: true, slug: safeSlug });
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!fs.existsSync(contentDir)) {
    return NextResponse.json({ posts: [] });
  }

  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".mdx"));
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(contentDir, file), "utf-8");
    const slug = file.replace(/\.mdx$/, "");
    const titleMatch = raw.match(/title:\s*"([^"]+)"/);
    const dateMatch = raw.match(/date:\s*"([^"]+)"/);
    return {
      slug,
      title: titleMatch?.[1] || slug,
      date: dateMatch?.[1] || "",
    };
  });

  return NextResponse.json({
    posts: posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
  });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await req.json();
  if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
  const filePath = path.join(contentDir, `${slug}.mdx`);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Post not found" }, { status: 404 });
}
