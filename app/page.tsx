import Image from "next/image";
import Link from "next/link";
import { Mail, FileDown, ArrowUpRight, ArrowRight } from "lucide-react";
import { GitHubIcon, LinkedInIcon, XIcon } from "@/components/icons";
import { getBlogPosts } from "@/lib/blog";

const socials = [
  { icon: GitHubIcon, href: "https://github.com/anukulrajan7", label: "GitHub" },
  { icon: LinkedInIcon, href: "https://linkedin.com/in/anukul-raj-31b6a2193", label: "LinkedIn" },
  { icon: XIcon, href: "https://x.com/R01202183Raj", label: "X" },
  { icon: Mail, href: "mailto:anukulraj2004@gmail.com", label: "Email" },
];

const work = [
  {
    company: "Wokay",
    roles: [{ title: "Product Engineer 2", period: "Jan 2026 — present" }],
    url: "https://wokay.com",
  },
  {
    company: "Social X",
    roles: [{ title: "Frontend Engineer", period: "Sep 2024 — Dec 2025" }],
    url: null,
  },
  {
    company: "Echo",
    roles: [{ title: "Frontend Engineer Intern", period: "Jul 2023 — May 2024" }],
    url: null,
  },
  {
    company: "iMeet Technologies",
    roles: [{ title: "Frontend Developer Intern", period: "Apr — Jul 2023" }],
    url: null,
  },
];

const projects = [
  {
    name: "Wokay",
    description: "Real-time workspace — chat, tasks, and video calls for teams",
    tags: ["React", "Node.js", "TypeScript", "PostgreSQL"],
    url: "https://wokay.com",
  },
  {
    name: "DoctorBooking",
    description: "Healthcare platform for booking appointments with doctors",
    tags: ["React", "Express", "MongoDB", "Stripe"],
    url: "https://github.com/anukulrajan7/DoctorBooking",
  },
  {
    name: "Social-X",
    description: "Social media app with feeds, profiles, and follow system",
    tags: ["TypeScript", "Next.js", "Tailwind"],
    url: "https://github.com/anukulrajan7/social-x",
  },
  {
    name: "EdTech LMS",
    description: "Learning management system with course creation and dashboards",
    tags: ["React", "Express", "MongoDB"],
    url: "https://github.com/anukulrajan7/edtechLms",
  },
];

export default function Home() {
  const posts = getBlogPosts()
    .sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="fade-in">
        <div className="flex items-start gap-5">
          <Image
            src="/avatar.jpg"
            alt="Anukul Raj"
            width={80}
            height={80}
            className="rounded-full ring-2 border-border shrink-0 mt-1"
            priority
          />
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">
              Anukul Raj
            </h1>
            <p className="text-muted text-sm mt-1">
              Product Engineer 2 at{" "}
              <a href="https://wokay.com" target="_blank" rel="noopener" className="text-accent hover:underline underline-offset-2">
                Wokay
              </a>
              {" "}&middot; Hyderabad, India
            </p>
          </div>
        </div>

        <p className="mt-5 leading-relaxed">
          I build fast, accessible web interfaces for products people use every
          day. Currently owning the task management and chat modules in a
          real-time collaboration platform — handling virtualized rendering,
          state management, and performance at scale.
        </p>

        <div className="flex items-center gap-2 flex-wrap mt-5">
          {socials.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg border border-border rounded-lg px-3 py-1.5 transition-all hover:border-accent/40 hover:bg-surface"
              aria-label={label}
            >
              <Icon size={14} />
              <span>{label}</span>
            </a>
          ))}
          <a
            href="/resume.pdf"
            download
            className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg border border-border rounded-lg px-3 py-1.5 transition-all hover:border-accent/40 hover:bg-surface"
          >
            <FileDown size={14} />
            <span>Resume</span>
          </a>
        </div>
      </section>

      {/* Writing */}
      {posts.length > 0 && (
        <section className="fade-in">
          <h2 className="font-heading text-xs font-bold text-muted uppercase tracking-widest mb-5">
            Writing
          </h2>
          <div className="space-y-2">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="card block group !p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="font-medium group-hover:text-accent transition-colors">
                      {post.metadata.title}
                    </span>
                    <p className="text-xs text-muted mt-1 line-clamp-1">
                      {post.metadata.summary}
                    </p>
                  </div>
                  <span className="text-xs text-muted shrink-0 tabular-nums mt-0.5">
                    {new Date(post.metadata.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/blog" className="inline-flex items-center gap-1 mt-4 text-sm text-muted hover:text-accent transition-colors">
            all posts <ArrowRight size={13} />
          </Link>
        </section>
      )}

      {/* Work */}
      <section className="fade-in">
        <h2 className="font-heading text-xs font-bold text-muted uppercase tracking-widest mb-5">
          Work
        </h2>
        <div className="space-y-5 border-l-2 border-border pl-5 ml-1">
          {work.map((item) => (
            <div key={item.company}>
              <div className="flex items-baseline gap-2">
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noopener" className="font-heading font-bold hover:text-accent transition-colors">
                    {item.company}
                  </a>
                ) : (
                  <span className="font-heading font-bold">{item.company}</span>
                )}
              </div>
              {item.roles.map((role) => (
                <div key={role.title} className="flex justify-between items-baseline mt-1">
                  <span className="text-sm text-muted">{role.title}</span>
                  <span className="text-xs text-muted tabular-nums">{role.period}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <Link href="/work" className="inline-flex items-center gap-1 mt-5 text-sm text-muted hover:text-accent transition-colors">
          full experience <ArrowRight size={13} />
        </Link>
      </section>

      {/* Projects */}
      <section className="fade-in">
        <h2 className="font-heading text-xs font-bold text-muted uppercase tracking-widest mb-5">
          Projects
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map((project) => (
            <a key={project.name} href={project.url} target="_blank" rel="noopener" className="card group">
              <div className="flex items-start justify-between">
                <h3 className="font-heading font-bold group-hover:text-accent transition-colors">
                  {project.name}
                </h3>
                <ArrowUpRight size={14} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
              </div>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">{project.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {project.tags.map((tag) => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-surface border border-border text-muted">
                    {tag}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
        <Link href="/projects" className="inline-flex items-center gap-1 mt-4 text-sm text-muted hover:text-accent transition-colors">
          all projects <ArrowRight size={13} />
        </Link>
      </section>
    </div>
  );
}
