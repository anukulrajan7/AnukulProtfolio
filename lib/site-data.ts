export const site = {
  name: "Anukul Raj",
  url: "https://anukulraj.com",
  email: "anukulraj2004@gmail.com",
  coords: "17.385°N 78.486°E",
  status: "PE2 at Wokay. Go tracking lab after hours.",
  heroLine:
    "I build real-time systems — live location tracking, WebRTC calls, gateways for devices that speak odd protocols — and the interfaces people watch them through.",
  now: "Product Engineer 2 at Wokay, Hyderabad: task and chat modules, audio/video calling, field-force tracking. After hours, a Go location-tracking lab and a Rust inbox agent.",
  github: "https://github.com/anukulrajan7",
  linkedin: "https://linkedin.com/in/anukul-raj-31b6a2193",
  x: "https://x.com/R01202183Raj",
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
      "Field-visit screens for the workforce app.",
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
    what: "A room is a short word code like happy-tiger-42. Chat that persists per room and cleans itself up, reactions, screen share with a picture-in-picture self-preview, keyboard shortcuts. Self-hostable in one deploy script. It started as a week-zero WebRTC warm-up and turned into a product.",
    details: [
      "Hybrid topology: 2–4 peers talk over a WebRTC P2P mesh, so there is no server media cost; at 5+ the room switches to an SFU, automatically as people join and leave.",
      "Two SFU backends behind one flag: mediasoup by default, or a Go/Pion server. 1080p with HD fallback and bitrate caps (2.5 Mbps video, 64 kbps audio); ICE restart on failure; TURN relay with HMAC credentials.",
      "Load tested to 1500 concurrent connections across 500 rooms with zero errors. Per-IP and per-socket rate limits, strict CSP, vendor libraries self-hosted, Prometheus metrics with a Grafana dashboard, optional Telegram alerts.",
      "Dropped better-sqlite3 for Node's built-in sqlite and removed an admin UI that crashed on Node 24.",
    ],
    stack: ["Node.js", "Socket.IO", "mediasoup", "Go", "Pion", "SQLite", "Alpine.js", "Docker", "Traefik"],
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
    oneLine: "Booking site for a Siliguri travel operator: North East India tours and car rental.",
    what: "A marketing and booking site for a travel operator based in Siliguri. Tour packages across Sikkim, Darjeeling, Dooars, Meghalaya and Kaziranga, plus a car-rental fleet for airport transfers, hill-station cabs and multi-day road trips.",
    details: [
      "Built for local search: TravelAgency / LocalBusiness structured data, area-served markup, and descriptive metadata on every page.",
      "Next.js 16 App Router with Tailwind v4, deployed on Vercel.",
    ],
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
    oneLine: "One script that turns Claude Code into a team that remembers between sessions.",
    what: "Claude Code out of the box forgets everything on restart. This installs a tested combination of open-source plugins and 15 hooks so sessions compound: persistent memory in SQLite with vector search, auto-learn hooks that extract patterns from each session, guards against context rot and blind edits, and a think → plan → build → review → ship workflow. Put together after trying 100+ tools in the ecosystem.",
    details: [
      "Three install profiles — minimal (4 plugins), standard (7), full (14) — chosen by token budget. Every combination is tested for conflicts in CI. MIT licensed, versioned releases.",
      "Hooks do the work without commands to remember: load past learnings on session start, snapshot state before compaction, capture wiki pages from significant sessions, block prompt injection and read-before-edit violations.",
      "Two siblings: ai-setup-generic applies the same setup across Claude Code, Codex, Gemini, Cursor, Windsurf, Aider, Continue and Copilot; ai-setup-creative does it for writers, designers, researchers and marketers.",
    ],
    stack: ["Python", "Shell", "Claude Code", "GitHub Actions"],
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
  { when: "2026.04", what: "ai-dev-setup — Claude Code setup, three profiles, 15 hooks", href: "#ai-dev-setup" },
  { when: "2026.04", what: "TalkToFriend v0.1.0 — WebRTC mesh + mediasoup SFU", href: "#talktofriend" },
  { when: "2026.06", what: "DriveEase — tours and car-rental booking site, live on Vercel", href: "#driveease" },
  { when: "2026.07", what: "TalkToFriend — Go/Pion SFU backend, CSP hardening, load test", href: "#talktofriend" },
  { when: "2026.08", what: "PaisaFlow — offline-first expense tracker", href: "#paisaflow" },
  { when: "2026.09", what: "eSSL ADMS Gateway — live in two days", href: "#essl-adms-gateway" },
  { when: "2026.09", what: "Device Tracker — ingest, trackcore, Android lab app", href: "#device-tracker" },
  { when: "2026.09", what: "Wokay — field-force tracking work begins", href: "/work#wokay" },
  { when: "2026.10", what: "Post Room — HR inbox agent shipped", href: "#post-room" },
];

export const skills = [
  "TypeScript",
  "React",
  "Next.js",
  "React Native",
  "Node.js",
  "Go",
  "Rust",
  "SQLite",
  "PostgreSQL",
  "WebRTC / mediasoup",
  "WebSockets / Socket.IO",
  "Android (Kotlin)",
  "Docker",
  "GitHub Actions",
  "Tailwind",
];
