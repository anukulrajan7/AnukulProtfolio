"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, LogOut, Send } from "lucide-react";

interface Post {
  slug: string;
  title: string;
  date: string;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [mode, setMode] = useState<"list" | "write">("list");

  // Write form
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Check auth on mount
  useEffect(() => {
    fetch("/api/blog").then((r) => {
      if (r.ok) {
        setAuthed(true);
        r.json().then((d) => setPosts(d.posts));
      }
    });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      const blogRes = await fetch("/api/blog");
      if (blogRes.ok) {
        const d = await blogRes.json();
        setPosts(d.posts);
      }
    } else {
      setError("Wrong password");
    }
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !content) return;
    setPublishing(true);

    const autoSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const res = await fetch("/api/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug: autoSlug, summary, content }),
    });

    if (res.ok) {
      const blogRes = await fetch("/api/blog");
      if (blogRes.ok) {
        const d = await blogRes.json();
        setPosts(d.posts);
      }
      setTitle("");
      setSlug("");
      setSummary("");
      setContent("");
      setMode("list");
    }
    setPublishing(false);
  }

  async function handleDelete(postSlug: string) {
    if (!confirm(`Delete "${postSlug}"?`)) return;
    const res = await fetch("/api/blog", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: postSlug }),
    });
    if (res.ok) {
      setPosts(posts.filter((p) => p.slug !== postSlug));
    }
  }

  // Auto-generate slug from title
  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  // Login screen
  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-32">
        <h1 className="display text-2xl font-bold tracking-tight mb-6">
          Admin
        </h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-2.5 border border-fg/40 bg-card text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus:border-accent transition-colors"
            autoFocus
          />
          {error && <p className="text-accent-text text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full px-4 py-2.5 bg-fg text-bg font-mono text-xs uppercase tracking-[0.06em] hover:opacity-90 transition-opacity"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  // Write mode
  if (mode === "write") {
    return (
      <div>
        <button
          onClick={() => setMode("list")}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg transition-colors mb-6"
        >
          <ArrowLeft size={14} /> back
        </button>

        <h1 className="display text-2xl font-bold tracking-tight mb-6">
          New Post
        </h1>

        <form onSubmit={handlePublish} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Post title"
            className="w-full px-4 py-2.5 border border-fg/40 bg-card text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus:border-accent transition-colors display font-bold text-lg"
            required
          />
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-slug (auto-generated)"
            className="w-full px-3 py-2 border border-fg/40 bg-card text-muted text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus:border-accent transition-colors font-mono"
          />
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Short summary (for SEO & previews)"
            className="w-full px-4 py-2.5 border border-fg/40 bg-card text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus:border-accent transition-colors text-sm"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your post in Markdown..."
            rows={18}
            className="w-full px-4 py-3 border border-fg/40 bg-card text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus:border-accent transition-colors font-mono text-sm leading-relaxed resize-y"
            required
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={publishing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-fg text-bg font-mono text-xs uppercase tracking-[0.06em] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send size={14} />
              {publishing ? "Publishing..." : "Publish"}
            </button>
            <button
              type="button"
              onClick={() => setMode("list")}
              className="px-5 py-2.5 border border-border text-muted hover:text-fg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // List mode
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="display text-2xl font-bold tracking-tight">
          Blog Admin
        </h1>
        <button
          onClick={() => setMode("write")}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-fg text-bg font-mono text-xs uppercase tracking-[0.06em] hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> New Post
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-muted">No posts yet. Write your first one!</p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.slug}
              className="frame flex items-center justify-between p-4"
            >
              <div>
                <a
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  className="font-medium hover:text-accent transition-colors"
                >
                  {post.title}
                </a>
                <p className="text-xs text-muted mt-0.5">{post.date}</p>
              </div>
              <button
                onClick={() => handleDelete(post.slug)}
                className="p-1.5 text-muted hover:text-accent transition-colors"
                aria-label="Delete post"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
