import type { Project } from "@/lib/site-data";
import { Tile } from "./tile";
import {
  AdmsFlow,
  BrowserFrame,
  CallGrid,
  InboxMock,
  PhoneMock,
  RouteMap,
  TerminalMock,
} from "./visuals";

interface ProjectVisualProps {
  project: Project;
  className?: string;
  /** For TalkToFriend: show the call-grid mock instead of the screenshot. */
  variant?: "default" | "alt";
}

/** Picks the visual for a project and wraps it in its coloured tile. */
export function ProjectVisual({ project, className = "", variant = "default" }: ProjectVisualProps) {
  return (
    <Tile color={project.color} className={className}>
      <Visual project={project} variant={variant} />
    </Tile>
  );
}

function Visual({ project, variant }: { project: Project; variant: "default" | "alt" }) {
  switch (project.visual) {
    case "route-map":
      return <RouteMap />;
    case "inbox":
      return <InboxMock />;
    case "adms-flow":
      return <AdmsFlow />;
    case "phone":
      return <PhoneMock />;
    case "terminal":
      return <TerminalMock />;
    case "talktofriend":
      if (variant === "alt" || !project.screenshot) return <CallGrid />;
      return <BrowserFrame {...project.screenshot} />;
    case "driveease":
      return project.screenshot ? <BrowserFrame {...project.screenshot} /> : null;
    default:
      return null;
  }
}
