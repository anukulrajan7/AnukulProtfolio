import Link from "next/link";
import { MapPin } from "lucide-react";
import { Tag, TagList } from "@/components/ui/tag";
import type { Project } from "@/lib/site-data";

const statusTone = {
  live: "accent",
  active: "route",
  built: "muted",
} as const;

export function StatusTag({ status }: { status: Project["status"] }) {
  return <Tag tone={statusTone[status]}>{status}</Tag>;
}

export function ProjectRow({ project, index }: { project: Project; index: number }) {
  return (
    <li className="border-b border-border">
      <Link
        href={`/projects#${project.id}`}
        className="group grid grid-cols-[2.5rem_1fr] md:grid-cols-12 gap-x-4 md:gap-x-8 gap-y-2 py-5 -mx-3 px-3 hover:bg-card transition-colors"
      >
        <span className="label tabular-nums pt-[6px] md:col-span-1">{String(index + 1).padStart(2, "0")}</span>
        <span className="md:col-span-7 flex items-start gap-2">
          <span>
            <span className="display text-[1.35rem] group-hover:text-accent transition-colors">
              {project.name}
            </span>
            <span className="block mt-1 text-[15px] text-muted">{project.oneLine}</span>
          </span>
          <MapPin size={14} className="row-pin shrink-0 mt-2" aria-hidden />
        </span>
        <span className="col-start-2 md:col-span-4 md:col-start-9 flex flex-wrap items-start justify-start md:justify-end gap-1.5 pt-1">
          <StatusTag status={project.status} />
          <TagList items={project.stack.slice(0, 3)} tone="muted" />
        </span>
      </Link>
    </li>
  );
}
