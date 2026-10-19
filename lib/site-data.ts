export const site = {
  name: "Anukul Raj",
  url: "https://anukulraj.com",
  email: "anukulraj2004@gmail.com",
  /** Hero photo. Swap for a bigger file (1200x1500 or more) when available. */
  photo: "/avatar.jpg",
  photoWidth: 400,
  photoHeight: 400,
  heroLine: "I build software that keeps working when the network doesn't.",
  heroSub:
    "Video calls for 20 people. Live location on real Android phones. A server that talks to fingerprint machines. Product Engineer at Wokay, Hyderabad.",
  now: "Right now: the geo module and live tracking at Wokay by day. A Rust inbox agent and a hardware integration tool by night.",
  github: "https://github.com/anukulrajan7",
  linkedin: "https://linkedin.com/in/anukul-raj-31b6a2193",
  x: "https://x.com/R01202183Raj",
};

export interface Stat {
  value: string;
  label: string;
  /** Where the number comes from. Not rendered; kept so the number stays honest. */
  source: string;
}

export const stats: Stat[] = [
  {
    value: "1,500",
    label: "concurrent connections in a load test. Zero errors.",
    source: "talktofriend/README.md: Load tested: 1500 concurrent connections, 500 rooms, zero errors",
  },
  {
    value: "895",
    label: "Rust tests behind the inbox agent.",
    source: "email-agents/README.md badge: tests 895 Rust / 306 web",
  },
  {
    value: "2 days",
    label: "from first commit to a live device integration.",
    source: "ADMS Device Gateway git log: 2026-09-24 initial import + CI/CD, 2026-09-25 alerts",
  },
];

export interface Role {
  id: string;
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
    span: "Apr to Jul 2023",
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
    span: "Jul 2023 to May 2024",
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
    span: "Oct to Dec 2024",
    company: "Social X",
    title: "Frontend Engineer",
    summary: "A social product's frontend, from nothing.",
    points: [
      "Built the frontend from the ground up for a social media startup.",
      "Feeds, profiles, a follow system and real-time interactions.",
      "Next.js, TypeScript and Tailwind, with no existing codebase to lean on.",
    ],
    stack: ["Next.js", "TypeScript", "Tailwind"],
  },
  {
    id: "wokay",
    span: "Jan 2025 to now",
    company: "Wokay",
    title: "Product Engineer 2",
    url: "https://wokay.com",
    current: true,
    summary: "Tasks, chat, notifications and live location tracking in a real-time workspace.",
    points: [
      "Own the task management module on the frontend end to end: long task lists that stay fast, and drag-and-drop that stays correct across custom statuses.",
      "Own the chat module alongside tasks.",
      "Built the structure behind notifications: how things that happen in tasks and chat turn into the right notification for the right person.",
      "Working on the geo module now: live location tracking for field teams in the React Native app, designed around battery life on real Android phones.",
      "Field-visit screens for the workforce app.",
    ],
    stack: ["React", "TypeScript", "React Native", "Android", "iOS"],
  },
];

export type ProjectStatus = "live" | "active" | "built";

export type ProjectVisual =
  | "route-map"
  | "inbox"
  | "talktofriend"
  | "adms-flow"
  | "phone"
  | "driveease"
  | "terminal";

/** Index into the --p-1..7 tile palette. */
export type ProjectColor = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Project {
  id: string;
  name: string;
  year: string;
  status: ProjectStatus;
  access: "public" | "private";
  color: ProjectColor;
  visual: ProjectVisual;
  screenshot?: { src: string; alt: string; url: string };
  oneLine: string;
  what: string;
  details: string[];
  stack: string[];
  links?: { label: string; href: string }[];
  /** Set for work done for an employer: shown as a label, and the code stays theirs. */
  builtFor?: string;
}

export const projects: Project[] = [
  {
    id: "post-room",
    name: "Post Room",
    year: "Oct 2026",
    status: "live",
    access: "private",
    color: 3,
    visual: "inbox",
    oneLine: "An agent for an HR inbox that drafts but never sends on its own.",
    what: "Forwarded or synced HR email is classified and handed to the right helper. A timesheet workflow turns mail into review items and drafts. Nothing goes out automatically: helpers earn autonomy, a guard checks every outgoing action, and an audit trail records it.",
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
    year: "Apr to Jul 2026",
    status: "live",
    access: "public",
    color: 5,
    visual: "talktofriend",
    screenshot: {
      src: "/projects/talktofriend.webp",
      alt: "TalkToFriend landing page: talk to your friends, not forms",
      url: "talktofriend.online",
    },
    oneLine: "Video calls with no sign-up and no tracking, up to 20 people.",
    what: "A room is a short word code like happy-tiger-42. Chat that persists per room and cleans itself up, reactions, screen share with a picture-in-picture self-preview, keyboard shortcuts. Self-hostable in one deploy script. It started as a week-zero WebRTC warm-up and turned into a product.",
    details: [
      "Hybrid topology: 2 to 4 peers talk over a WebRTC P2P mesh, so there is no server media cost. At 5+ the room switches to an SFU, automatically, as people join and leave.",
      "Two SFU backends behind one flag: mediasoup by default, or a Go/Pion server. 1080p with HD fallback and bitrate caps (2.5 Mbps video, 64 kbps audio), ICE restart on failure, TURN relay with HMAC credentials.",
      "Load tested to 1,500 concurrent connections across 500 rooms with zero errors. Per-IP and per-socket rate limits, strict CSP, vendor libraries self-hosted, Prometheus metrics with a Grafana dashboard.",
      "Dropped better-sqlite3 for Node's built-in sqlite and removed an admin UI that crashed on Node 24.",
    ],
    stack: ["Node.js", "Socket.IO", "mediasoup", "Go", "Pion", "SQLite", "Alpine.js", "Docker"],
    links: [
      { label: "Open the app", href: "https://talktofriend.online" },
      { label: "View code on GitHub", href: "https://github.com/anukulrajan7/talktofriend" },
    ],
  },
  {
    id: "essl-adms-gateway",
    name: "ADMS Device Gateway",
    year: "Sep 2026",
    status: "live",
    access: "private",
    color: 2,
    visual: "adms-flow",
    oneLine: "A hardware integration tool: a push API for biometric devices.",
    what: "A Go service that implements the ADMS push protocol biometric terminals use. Stores every raw request byte for byte, parses event lines, answers with exactly what the device expects, queues commands for the device's next poll, and exposes clean webhooks and an API so other apps can integrate with the hardware.",
    details: [
      "Raw-first capture: every request is stored exactly as it arrived, and captured traffic is replayed as tests.",
      "Command queue: the device is the client and the server never connects in, so work is queued and delivered on the next poll.",
      "Signed webhooks with retries, so other apps can react to device events safely.",
      "A live event console over SSE to watch traffic as it arrives.",
    ],
    stack: ["Go", "PostgreSQL", "SSE", "Caddy", "Docker", "GitHub Actions"],
  },
  {
    id: "device-tracker",
    name: "Device Tracker",
    year: "Sep 2026 to now",
    status: "active",
    access: "private",
    builtFor: "Wokay",
    color: 4,
    visual: "route-map",
    oneLine: "Live location research for Wokay: tracking, routing and cost, tested on real phones.",
    what: "Built during research for Wokay's geo module, to answer the hard questions before they reached the product. A Go service takes location batches from an Android test app and a dashboard shows each phone's path, the gaps in it, and routes snapped to real roads.",
    details: [
      "Found that the location source matters more than any filter: the phone's fused location provider gave far steadier tracks than raw GPS alone, so the choice moved into the product.",
      "Self-hosted the map stack instead of paying per call: OSRM for routing and snapping, Photon for place search, VROOM for planning field-visit routes.",
      "Modelled what live tracking costs per user at maximum usage, and which calls could be cached, batched or moved to the self-hosted stack to keep it inside budget.",
    ],
    stack: ["Go", "SQLite", "Android", "OSRM", "Photon", "VROOM", "Docker"],
  },
  {
    id: "paisaflow",
    name: "PaisaFlow",
    year: "Aug 2026",
    status: "built",
    access: "private",
    color: 6,
    visual: "phone",
    oneLine: "Offline-first expense tracker, Android first.",
    what: "All data lives in on-device SQLite and the app works with no network at all. Transactions arrive by SMS auto-tracking or paste import. A money hub covers people, salary, investments and savings. Recurring payments and an app lock round it out.",
    details: [
      "Cloud sync through Supabase and AI spending summaries through OpenRouter are optional layers that never block core tracking.",
      "Built in nine documented phases, with ARCHITECTURE and DATABASE docs written ahead of the code.",
    ],
    stack: ["React Native", "SQLite", "Supabase", "OpenRouter"],
  },
  {
    id: "driveease",
    name: "DriveEase",
    year: "Jun to Jul 2026",
    status: "live",
    access: "public",
    color: 1,
    visual: "driveease",
    screenshot: {
      src: "/projects/driveease.webp",
      alt: "DriveEase home page, branded Siliguri Holidays, with a hero over misty hills and a tour search",
      url: "driveease-hazel.vercel.app",
    },
    oneLine: "Booking site for a Siliguri travel operator: North East India tours and car rental.",
    what: "A marketing and booking site for a travel operator based in Siliguri. Tour packages across Sikkim, Darjeeling, Dooars, Meghalaya and Kaziranga, plus a car-rental fleet for airport transfers, hill-station cabs and multi-day road trips.",
    details: [
      "Built for local search: TravelAgency / LocalBusiness structured data, area-served markup, and descriptive metadata on every page.",
      "Next.js 16 App Router with Tailwind v4, deployed on Vercel.",
    ],
    stack: ["Next.js 16", "Tailwind v4", "TypeScript", "Vercel"],
    links: [
      { label: "Open the site", href: "https://driveease-hazel.vercel.app" },
      { label: "View code on GitHub", href: "https://github.com/anukulrajan7/driveease" },
    ],
  },
  {
    id: "ai-dev-setup",
    name: "ai-dev-setup",
    year: "Apr 2026",
    status: "built",
    access: "public",
    color: 7,
    visual: "terminal",
    oneLine: "One script that turns Claude Code into a team that remembers between sessions.",
    what: "Claude Code out of the box forgets everything on restart. This installs a tested combination of open-source plugins and 15 hooks so sessions compound: persistent memory in SQLite with vector search, auto-learn hooks that extract patterns from each session, guards against context rot and blind edits, and a think, plan, build, review, ship workflow. Put together after trying 100+ tools in the ecosystem.",
    details: [
      "Three install profiles, minimal (4 plugins), standard (7) and full (14), chosen by token budget. Every combination is tested for conflicts in CI. MIT licensed, versioned releases.",
      "Hooks do the work without commands to remember: load past learnings on session start, snapshot state before compaction, capture wiki pages from significant sessions, block prompt injection and read-before-edit violations.",
      "Two siblings: ai-setup-generic applies the same setup across Claude Code, Codex, Gemini, Cursor, Windsurf, Aider, Continue and Copilot. ai-setup-creative does it for writers, designers, researchers and marketers.",
    ],
    stack: ["Python", "Shell", "Claude Code", "GitHub Actions"],
    links: [
      { label: "View code on GitHub", href: "https://github.com/anukulrajan7/ai-dev-setup" },
      { label: "ai-setup-generic", href: "https://github.com/anukulrajan7/ai-setup-generic" },
      { label: "ai-setup-creative", href: "https://github.com/anukulrajan7/ai-setup-creative" },
    ],
  },
];

export const selectedProjectIds = ["paisaflow", "post-room", "talktofriend", "essl-adms-gateway"];

export const liveProjectCount = projects.filter((p) => p.status === "live").length;

export interface HistoryEntry {
  when: string;
  what: string;
  href?: string;
}

export const history: HistoryEntry[] = [
  { when: "Apr 2023", what: "iMeet Technologies, intern. Company site and edtech UI.", href: "/work#imeet" },
  { when: "Jul 2023", what: "Echo, intern. Data-viz dashboards.", href: "/work#echo" },
  { when: "Oct 2024", what: "Social X. Frontend from the ground up.", href: "/work#socialx" },
  { when: "Jan 2025", what: "Wokay, Product Engineer 2. Task and chat modules.", href: "/work#wokay" },
  { when: "Apr 2026", what: "ai-dev-setup. Claude Code setup, three profiles, 15 hooks.", href: "#ai-dev-setup" },
  { when: "Apr 2026", what: "TalkToFriend v0.1.0. WebRTC mesh plus mediasoup SFU.", href: "#talktofriend" },
  { when: "Jun 2026", what: "DriveEase. Tours and car-rental booking site, live on Vercel.", href: "#driveease" },
  { when: "Jul 2026", what: "TalkToFriend. Go/Pion SFU backend, CSP hardening, load test.", href: "#talktofriend" },
  { when: "Aug 2026", what: "PaisaFlow. Offline-first expense tracker.", href: "#paisaflow" },
  { when: "Sep 2026", what: "ADMS Device Gateway. Live in two days.", href: "#essl-adms-gateway" },
  { when: "Sep 2026", what: "Wokay. Field-force tracking work begins.", href: "/work#wokay" },
  { when: "Oct 2026", what: "Post Room. HR inbox agent shipped.", href: "#post-room" },
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
  "Android",
  "Docker",
  "GitHub Actions",
  "Tailwind",
];
