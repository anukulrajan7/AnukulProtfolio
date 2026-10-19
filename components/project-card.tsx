import Link from "next/link";
import type { Project } from "@/lib/site-data";
import { ProjectVisual } from "./project-visual";

export function StatusPill({ status }: { status: Project["status"] }) {
  if (status === "live") {
    return (
      <span className="pill pill-live">
        <span className="pill-dot" aria-hidden />
        Live
      </span>
    );
  }
  if (status === "active") {
    return <span className="pill pill-building">Building</span>;
  }
  return <span className="pill">Built</span>;
}

interface ProjectCardProps {
  project: Project;
  featured?: boolean;
}

export function ProjectCard({ project, featured = false }: ProjectCardProps) {
  return (
    <li className={`project-card ${featured ? "md:col-span-2" : ""}`}>
      <Link
        href={`/projects#${project.id}`}
        className={`group block focus-visible:outline-none ${featured ? "md:grid md:grid-cols-12 md:gap-8 md:items-end" : ""}`}
      >
        <ProjectVisual project={project} className={featured ? "md:col-span-8" : ""} />
        <div className={`mt-5 ${featured ? "md:col-span-4 md:mt-0 md:pb-2" : ""}`}>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className={`display-md group-hover:text-accent transition-colors ${featured ? "text-[1.75rem] md:text-[2.2rem]" : "text-[1.75rem]"}`}>
              {project.name}
            </h3>
            <StatusPill status={project.status} />
          </div>
          <p className="mt-2 text-[1.05rem] text-fg max-w-[52ch]">{project.oneLine}</p>
          {featured ? <p className="mt-3 text-[15.5px] text-muted max-w-[40ch] hidden md:block">{project.what}</p> : undefined}
          <p className="mt-3 text-[15px] text-muted">{project.stack.slice(0, 4).join(" · ")}</p>
        </div>
      </Link>
    </li>
  );
}
