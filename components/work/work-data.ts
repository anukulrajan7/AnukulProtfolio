import { projects, roles, type ProjectColor, type Role } from "@/lib/site-data";

/**
 * Everything the work pages need beyond the shared Role record.
 * Facts come from portfolio-notes/works.md. Day-job work stays at a public level.
 */

export type RoleVisual = "landing" | "dashboard" | "feed" | "workspace";

export interface RoleExtra {
  /** Tile colour, see --p-1..7 in globals.css. */
  color: ProjectColor;
  visual: RoleVisual;
  /** Short chapter name shown under the company. */
  chapter: string;
  /** Start month, used as the milestone date on the timeline. */
  start: string;
  /** Two or three words for the compact home teaser. */
  teaser: string;
  /** First person. What was hard, in plain words. */
  hardPart: string;
  /** One sentence that stuck. */
  lesson: string;
}

export const roleExtras: Record<string, RoleExtra> = {
  imeet: {
    color: 5,
    visual: "landing",
    chapter: "Learning to ship",
    start: "Apr 2023",
    teaser: "Company site and edtech UI",
    hardPart:
      "My first code that strangers would use. A page looked right at one width and fell apart at the next, so a lot of the job was responsive layouts and learning to ask the design team before guessing.",
    lesson: "Mobile first is not a preference. It is where the layout breaks.",
  },
  echo: {
    color: 2,
    visual: "dashboard",
    chapter: "Charts, spreadsheets and internal tools",
    start: "Jul 2023",
    teaser: "Data dashboards",
    hardPart:
      "Charts are easy until the data shows up as a spreadsheet somebody exported by hand. The hard part was turning xlsx files into shapes Highcharts could draw, and keeping a dashboard readable when the numbers changed shape.",
    lesson: "Most frontend work is data work with a UI on top.",
  },
  socialx: {
    color: 3,
    visual: "feed",
    chapter: "A product frontend from zero",
    start: "Sep 2024",
    teaser: "Frontend from zero",
    hardPart:
      "There was no codebase. Folder structure, data fetching, how a feed updates when someone you follow posts: every decision was mine. The hard part was real-time. New posts, likes and follows arrive while the user is scrolling, and the screen has to stay calm.",
    lesson: "Design the state before the screens.",
  },
  wokay: {
    color: 1,
    visual: "workspace",
    chapter: "Tasks, chat, notifications and a phone in a pocket",
    start: "Jan 2026",
    teaser: "Tasks, chat, notifications, live tracking",
    hardPart:
      "Everything here has a failure mode that only shows up on a real phone. A task list that must stay fast however long it gets. Drag-and-drop that must land in the right status every time. A notification that has to reach the right person once, not three times. Location tracking that must not drain the battery.",
    lesson: "Test on real Android devices, and design the quiet path as carefully as the busy one.",
  },
};

export interface RoleEntry extends Role {
  extra: RoleExtra;
}

/** Roles in chronological order, each with its extras attached. */
export const roleEntries: RoleEntry[] = roles.map((r) => {
  const extra = roleExtras[r.id];
  if (!extra) throw new Error(`Missing work extras for role "${r.id}"`);
  return { ...r, extra };
});

/* ---------------------------------------------------------------------- */
/* Timeline events                                                          */
/* ---------------------------------------------------------------------- */

export type TimelineEvent =
  | { kind: "role"; id: string; date: string; role: RoleEntry }
  | { kind: "lane-start"; id: string; date: string; note: string }
  | { kind: "side"; id: string; date: string; projectId: string; what: string }
  | { kind: "mark"; id: string; date: string; title: string; what: string }
  | { kind: "now"; id: string; date: string };

function project(id: string) {
  const p = projects.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown project "${id}"`);
  return p;
}

export function projectFor(ev: Extract<TimelineEvent, { kind: "side" }>) {
  return project(ev.projectId);
}

const byId = Object.fromEntries(roleEntries.map((r) => [r.id, r]));

/**
 * The time flow. Dates come from works.md (role spans, first-commit and
 * release dates). Ordered oldest to newest; the main lane colour at each
 * point is the role that is active then.
 */
export const timelineEvents: TimelineEvent[] = [
  { kind: "role", id: "imeet", date: "Apr 2023", role: byId.imeet },
  { kind: "role", id: "echo", date: "Jul 2023", role: byId.echo },
  { kind: "role", id: "socialx", date: "Sep 2024", role: byId.socialx },
  { kind: "role", id: "wokay", date: "Jan 2026", role: byId.wokay },
  {
    kind: "lane-start",
    id: "lane-side",
    date: "2026",
    note: "nights and weekends",
  },
  {
    kind: "side",
    id: "ev-talktofriend",
    date: "Apr 2026",
    projectId: "talktofriend",
    what: "v0.1.0. WebRTC mesh for small rooms, mediasoup SFU at five and up.",
  },
  {
    kind: "side",
    id: "ev-driveease",
    date: "Jun 2026",
    projectId: "driveease",
    what: "A tours and car-rental booking site for a Siliguri operator, live on Vercel.",
  },
  {
    kind: "side",
    id: "ev-talktofriend-go",
    date: "Jul 2026",
    projectId: "talktofriend",
    what: "Go SFU backend, CSP hardening and a load test: 1,500 connections, zero errors.",
  },
  {
    kind: "side",
    id: "ev-paisaflow",
    date: "Aug 2026",
    projectId: "paisaflow",
    what: "Offline-first expense tracker in React Native. All data on the phone.",
  },
  {
    kind: "mark",
    id: "mark-tracking",
    date: "Sep 2026",
    title: "Geo module research starts at Wokay",
    what: "Device Tracker: a test bed for live location on real phones. Fused location, self-hosted OSRM routing, and what tracking costs per user.",
  },
  {
    kind: "side",
    id: "ev-essl",
    date: "Sep 2026",
    projectId: "essl-adms-gateway",
    what: "A Go service that speaks the ADMS push protocol biometric devices use. First commit to live in two days.",
  },
  {
    kind: "side",
    id: "ev-post-room",
    date: "Oct 2026",
    projectId: "post-room",
    what: "An HR inbox agent in Rust that drafts but never sends on its own. Shipped.",
  },
  { kind: "now", id: "now", date: "Oct 2026" },
];

/* ---------------------------------------------------------------------- */
/* Growth strip                                                             */
/* ---------------------------------------------------------------------- */

export interface GrowthRow {
  label: string;
  /** 1-based index into roleEntries where this started. */
  from: 1 | 2 | 3 | 4;
  /** 1-based index where it ended. 4 means still going. */
  to: 1 | 2 | 3 | 4;
  ongoing?: boolean;
}

/** Derived from the role records and the 2026 side projects only. */
export const growthRows: GrowthRow[] = [
  { label: "React, Next.js and Tailwind UI", from: 1, to: 4, ongoing: true },
  { label: "Charts and spreadsheet data", from: 2, to: 2 },
  { label: "A whole product frontend, owned", from: 3, to: 4, ongoing: true },
  { label: "Real-time features", from: 3, to: 4, ongoing: true },
  { label: "Notifications and live location", from: 4, to: 4, ongoing: true },
  { label: "Mobile: React Native, Android, iOS", from: 4, to: 4, ongoing: true },
  { label: "Go and Rust, on the side", from: 4, to: 4, ongoing: true },
];

/* ---------------------------------------------------------------------- */
/* Capabilities                                                             */
/* ---------------------------------------------------------------------- */

export type CapabilityIcon = "pulse" | "video" | "pin" | "plug" | "list" | "server";

export interface Capability {
  icon: CapabilityIcon;
  color: ProjectColor;
  title: string;
  evidence: string;
  proof: { label: string; href: string }[];
}

export const capabilities: Capability[] = [
  {
    icon: "pulse",
    color: 3,
    title: "Real-time product frontends",
    evidence:
      "Feeds that update while you scroll at Social X. The task and chat modules at Wokay, owned end to end on the frontend.",
    proof: [
      { label: "Social X", href: "#socialx" },
      { label: "Wokay", href: "#wokay" },
    ],
  },
  {
    icon: "video",
    color: 5,
    title: "Calling on WebRTC",
    evidence:
      "Audio and video calling on a mediasoup SFU at Wokay. TalkToFriend does P2P mesh up to four people and switches to an SFU at five, load tested to 1,500 connections.",
    proof: [
      { label: "TalkToFriend", href: "/projects#talktofriend" },
      { label: "Wokay", href: "#wokay" },
    ],
  },
  {
    icon: "pin",
    color: 4,
    title: "Live location on real phones",
    evidence:
      "Background tracking for Wokay's field-force feature in React Native, designed around battery life on real Android phones.",
    proof: [
      { label: "Wokay", href: "#wokay" },
    ],
  },
  {
    icon: "plug",
    color: 2,
    title: "Talking to odd devices",
    evidence:
      "Device integrations: a Go service that speaks the ADMS push protocol biometric devices use, stores every raw request and answers exactly what the device expects. Live two days after the first commit.",
    proof: [{ label: "ADMS Device Gateway", href: "/projects#essl-adms-gateway" }],
  },
  {
    icon: "list",
    color: 6,
    title: "Lists that stay fast",
    evidence:
      "Long task lists and drag-and-drop that stays correct across custom statuses at Wokay. Data dashboards at Echo. I write about frontend performance too.",
    proof: [
      { label: "Wokay", href: "#wokay" },
      { label: "Writing", href: "/blog" },
    ],
  },
  {
    icon: "server",
    color: 1,
    title: "Backends when the product needs one",
    evidence:
      "Go for the device gateway, Rust for Post Room with 895 tests behind it, SQLite for most of it. Enough to own a feature end to end.",
    proof: [
      { label: "Post Room", href: "/projects#post-room" },
      { label: "ADMS Device Gateway", href: "/projects#essl-adms-gateway" },
    ],
  },
];
