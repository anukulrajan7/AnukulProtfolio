export const site = {
  name: "Anukul Raj",
  coords: "17.385°N 78.486°E",
  status: "PE2 at Wokay. Go tracking lab after hours.",
  heroLine:
    "I build real-time systems — live location tracking, WebRTC calls, gateways for devices that speak odd protocols — and the interfaces people watch them through.",
  now: "Product Engineer 2 at Wokay, Hyderabad: task and chat modules, audio/video calling, field-force tracking. After hours, a Go location-tracking lab and a Rust inbox agent.",
  github: "https://github.com/anukulrajan7",
};

export interface Role {
  id: string;
  code: string;
  span: string;
  company: string;
  title: string;
  url?: string;
  current?: boolean;
  summary: string;
  points: string[];
  stack: string[];
}

export const roles: Role[] = [
  {
    id: "imeet",
    code: "WP-01",
    span: "2023.04 → 2023.07",
    company: "iMeet Technologies",
    title: "Frontend Developer Intern",
    summary: "Company website and an edtech UI.",
    points: [
      "Built the company website and marketing pages.",
      "Built UI for an edtech platform in React, Next.js and Tailwind.",
      "Worked with the design team on responsive layouts.",
    ],
    stack: ["React", "Next.js", "Tailwind"],
  },
  {
    id: "echo",
    code: "WP-02",
    span: "2023.07 → 2024.05",
    company: "Echo",
    title: "Frontend Engineer Intern",
    summary: "Data dashboards and internal tools.",
    points: [
      "Built data-visualisation dashboards with React, Material UI and Highcharts.",
      "Spreadsheet import and export with the xlsx library.",
      "Looked after the company website and internal software tools.",
    ],
    stack: ["React", "Material UI", "Highcharts", "xlsx"],
  },
  {
    id: "socialx",
    code: "WP-03",
    span: "2024.09 → 2025.12",
    company: "Social X",
    title: "Frontend Engineer",
    summary: "A social product's frontend, from nothing.",
    points: [
      "Built the frontend from the ground up for a social media startup.",
      "Feeds, profiles, follow system and real-time interactions.",
      "Next.js, TypeScript and Tailwind; shipped weekly.",
    ],
    stack: ["Next.js", "TypeScript", "Tailwind"],
  },
  {
    id: "wokay",
    code: "WP-04",
    span: "2026.01 → now",
    company: "Wokay",
    title: "Product Engineer 2",
    url: "https://wokay.com",
    current: true,
    summary: "Tasks, chat, calling and field-force tracking in a real-time workspace.",
    points: [
      "Own the task management module on the frontend end to end: virtualized task lists, faster render paths, and drag-and-drop that stays correct across custom statuses.",
      "Own the chat module alongside tasks.",
      "Built audio/video calling on a mediasoup SFU.",
      "Built background location tracking for the field-force feature in the React Native app, designed around battery life on real Android phones.",
      "Field-visit screens and location tracking for the workforce app.",
    ],
    stack: ["React", "TypeScript", "React Native", "mediasoup", "Android", "iOS"],
  },
];

export type ProjectStatus = "live" | "active" | "built";

export interface Project {
  id: string;
  name: string;
  year: string;
  status: ProjectStatus;
  access: "public" | "private";
  oneLine: string;
  what: string;
  details: string[];
  stack: string[];
  links?: { label: string; href: string }[];
}

export const projects: Project[] = [
  {
    id: "post-room",
    name: "Post Room",
    year: "2026.10",
    status: "live",
    access: "private",
    oneLine: "An agent for an HR inbox that drafts but never sends on its own.",
    what: "Forwarded or synced HR email is classified and handed to the right helper; a timesheet workflow turns mail into review items and drafts. Nothing goes out automatically. Helpers earn autonomy, a guard checks every outgoing action, and an audit trail records it.",
    details: [
      "The job queue is a table in SQLite (WAL mode) worked by a Tokio task. No broker to run or babysit.",
      "Reply duties carry a four-working-hour timer and a \"never silent\" rule: ask once, for exactly the missing items.",
      "Password plus OTP login with Argon2id. 895 Rust tests and 306 web tests at last count. Large module splits (agents/tools, jobs/handlers) done with no behaviour change.",
      "LLM reasoning mode stays disabled after one model spent its whole token budget thinking.",
    ],
    stack: ["Rust", "Axum", "SQLx", "SQLite", "Tokio", "React", "Vite", "TanStack Query", "GitHub Actions"],
  },
  {
    id: "talktofriend",
    name: "TalkToFriend",
    year: "2026.04 → 07",
    status: "live",
    access: "public",
    oneLine: "Video calls with no sign-up and no tracking, up to 20 people.",
    what: "A room is a short word code. Chat, emoji reactions, screen share. Self-hostable. Started as the week-zero WebRTC warm-up for a bigger idea and became a product on its own.",
    details: [
      "Hybrid topology: 2–4 peers talk over a WebRTC P2P mesh, so there is no server media cost; at 5+ the room switches to a mediasoup SFU, automatically at the boundary.",
      "Per-IP and per-socket rate limits, a strict CSP, vendor libraries self-hosted.",
      "Dropped better-sqlite3 for Node's built-in sqlite and removed an admin UI that crashed on Node 24. Later moved to a Go SFU behind Caddy with automatic HTTPS, with Prometheus and Grafana alongside.",
    ],
    stack: ["Node.js", "Socket.IO", "mediasoup", "SQLite", "Alpine.js", "Go", "Caddy", "Docker"],
    links: [{ label: "github", href: "https://github.com/anukulrajan7/talktofriend" }],
  },
  {
    id: "device-tracker",
    name: "Device Tracker",
    year: "2026.09 → now",
    status: "active",
    access: "private",
    oneLine: "Go ingest, a trackcore library and an Android lab app for live location tracking.",
    what: "Built to understand live location tracking end to end. Devices register and send event batches — location, heartbeat, tracking-stopped — and the server stores raw events immutably, deriving everything else: cleaned paths, stays, gaps, live distance, snapped routes, health. A read-only dashboard on Google Maps shows devices and timelines.",
    details: [
      "SPEC.md is the source of truth and every rule has an ID with a test named after it. P-01: raw events are never rewritten. P-04: unknown is shown as unknown. P-06: inaccurate samples are stored and filtered only at display time.",
      "Poison-event handling: each event in a batch is validated on its own and bad rows go to a rejected_events table, so one bad event never blocks a device's upload queue. Ingest is idempotent by event id and ordered by a per-install sequence, not the device clock.",
      "trackcore is a set of small Go packages — cleanpath, gaps, filter, drift, snap, livedistance, visits — with a 41-page plain-language guide on GPS error, snapping, gaps and battery, written while learning.",
      "The Kotlin lab app runs a foreground service with a boot keeper, motion profiles, backoff and an upload mirror, to generate real traffic for experiments.",
    ],
    stack: ["Go", "SQLite", "Kotlin", "Android", "OSRM", "Google Maps", "Docker", "GitHub Actions"],
  },
  {
    id: "essl-adms-gateway",
    name: "eSSL ADMS Gateway",
    year: "2026.09",
    status: "live",
    access: "private",
    oneLine: "A Go server that speaks an attendance terminal's push protocol.",
    what: "Talks to an eSSL X2008 (ZKTeco family) biometric device over its ADMS push protocol. Stores every raw request byte for byte, parses attendance and user lines, answers with exactly what the device expects, queues commands back to it, signs webhooks, and serves a read-only attendance report with card and privilege fields hidden.",
    details: [
      "The device is the client. The server never connects in; to send it work you queue a command and wait for the next poll.",
      "Fail-safe storage: if the raw request cannot be persisted the gateway answers 503, so the device keeps its buffer and retries. Never acknowledge what you did not store.",
      "A research log labels every protocol fact DOCUMENTED / OBSERVED ON DEVICE / ASSUMED / UNKNOWN and is updated from captured traffic. A simulator script replays sample requests in tests.",
      "SSE console for live punches, HMAC-signed webhooks with retries, and plain-sentence alerts such as late or absent.",
    ],
    stack: ["Go", "PostgreSQL", "SSE", "Caddy", "Docker", "GitHub Actions"],
  },
  {
    id: "paisaflow",
    name: "PaisaFlow",
    year: "2026.08",
    status: "built",
    access: "private",
    oneLine: "Offline-first expense tracker, Android first.",
    what: "All data lives in on-device SQLite and the app works with no network at all. Transactions arrive by SMS auto-tracking or paste import; a money hub covers people, salary, investments and savings; recurring payments and an app lock round it out.",
    details: [
      "Cloud sync through Supabase and AI spending summaries through OpenRouter are optional layers that never block core tracking.",
      "Built in nine documented phases, with ARCHITECTURE and DATABASE docs written ahead of the code.",
    ],
    stack: ["React Native", "SQLite", "Supabase", "OpenRouter"],
  },
  {
    id: "driveease",
    name: "DriveEase",
    year: "2026.06 → 07",
    status: "live",
    access: "public",
    oneLine: "Travel booking site for North East India.",
    what: "A booking site for travel in North East India, built on Next.js 16 and Tailwind v4 and deployed on Vercel.",
    details: [],
    stack: ["Next.js 16", "Tailwind v4", "TypeScript", "Vercel"],
    links: [
      { label: "live", href: "https://driveease-hazel.vercel.app" },
      { label: "github", href: "https://github.com/anukulrajan7/driveease" },
    ],
  },
  {
    id: "ai-dev-setup",
    name: "ai-dev-setup",
    year: "2026.04",
    status: "built",
    access: "public",
    oneLine: "A Claude Code setup assembled after researching 100+ AI dev tools.",
    what: "14 plugins, 12 hooks, 400+ skills and auto-learning, packaged so a new machine is productive in one command.",
    details: [
      "ai-setup-generic applies the same setup across Claude Code, Codex, Gemini, Cursor, Windsurf, Aider, Continue and Copilot.",
      "ai-setup-creative does the same for writers, designers, researchers and marketers, with no coding required.",
    ],
    stack: ["Python", "Shell", "Claude Code"],
    links: [
      { label: "github", href: "https://github.com/anukulrajan7/ai-dev-setup" },
      { label: "generic", href: "https://github.com/anukulrajan7/ai-setup-generic" },
      { label: "creative", href: "https://github.com/anukulrajan7/ai-setup-creative" },
    ],
  },
];

export const selectedProjectIds = ["device-tracker", "post-room", "talktofriend", "essl-adms-gateway"];

export interface HistoryEntry {
  when: string;
  what: string;
  href?: string;
}

export const history: HistoryEntry[] = [
  { when: "2023.04", what: "iMeet Technologies — intern; company site and edtech UI", href: "/work#imeet" },
  { when: "2023.07", what: "Echo — intern; data-viz dashboards", href: "/work#echo" },
  { when: "2024.09", what: "Social X — frontend from the ground up", href: "/work#socialx" },
  { when: "2026.01", what: "Wokay — Product Engineer 2; task and chat modules", href: "/work#wokay" },
  { when: "2026.04", what: "ai-dev-setup — Claude Code setup, open-sourced", href: "#ai-dev-setup" },
  { when: "2026.04", what: "TalkToFriend v0.1.0 — WebRTC mesh + mediasoup SFU", href: "#talktofriend" },
  { when: "2026.06", what: "DriveEase — travel booking site for North East India", href: "#driveease" },
  { when: "2026.07", what: "TalkToFriend — Go SFU, Caddy auto-HTTPS, CSP hardening", href: "#talktofriend" },
  { when: "2026.08", what: "PaisaFlow — offline-first expense tracker", href: "#paisaflow" },
  { when: "2026.09", what: "eSSL ADMS Gateway — live in two days", href: "#essl-adms-gateway" },
  { when: "2026.09", what: "Device Tracker — ingest, trackcore, Android lab app", href: "#device-tracker" },
  { when: "2026.09", what: "Wokay — field-force tracking work begins", href: "/work#wokay" },
  { when: "2026.10", what: "Post Room — HR inbox agent shipped", href: "#post-room" },
];
