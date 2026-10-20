// Route Learn track: live location tracking, concept-levels.md §4.
// R1 accuracy · R2 sampling · R3 outbox · R4 idempotency · R5 honest gaps ·
// R6 cleaning · R7 map matching · R8 cost per user (finale).
// The employer is never named and no numbers from that job appear.

import type { LevelDef } from "../levels";
import type { Rect, RouteScript } from "./types";

const R1_SNIPPET = `db.insert(fix);                                          // raw is the truth
const drawn = fixes.filter((f) => f.accuracy <= 50);     // filter when drawing`;
const R2_SNIPPET = `function nextState(cur: State, signal: State, stableMs: number): State {
  if (rank(signal) > rank(cur)) return signal;                 // up: now
  if (rank(signal) < rank(cur) && stableMs >= COOL_DOWN_MS) return signal;
  return cur;                                                  // down: wait
}`;
const R3_SNIPPET = `await outbox.add({ id: uuid(), seq: nextSeq(), recordedAt: Date.now(), fix });
// later, when online, with backoff on failure:
await post("/events", await outbox.takeBatch(100));`;
const R4_SNIPPET = `insert into events (event_id, recorded_at, received_at, payload)
values (?, ?, ?, ?)
on conflict (event_id) do nothing;`;
const R5_SNIPPET = `gap.cause = events.some((e) => e.type === "tracking_stopped") ? "stopped" : "unknown";
const kmh = gap.km / gap.hours;
gap.style = kmh < 6 ? "dotted" : kmh < 150 ? "likely" : "flag";`;
const R6_SNIPPET = `const d = Math.max(0, dist(a, b) - a.acc - b.acc);
const jump = d / (b.t - a.t) > MAX_SPEED;
if (jump || motion === "still") hide(b);   // the raw row stays in the db`;
const R7_SNIPPET = `score = emission(distToRoad) * transition(routeLen / straightLen);
// OSRM's /match runs this (HMM + Viterbi) across the sequence`;
const R8_SNIPPET = `const key = \`\${lat.toFixed(4)},\${lng.toFixed(4)}\`;    // ~11 m cell
let address = cache.get(key);
if (!address) cache.set(key, (address = await reverseGeocode(lat, lng)));`;

const script = (s: Omit<RouteScript, "kind">): RouteScript => ({ kind: "route", ...s });

/** R2 blocks (x, y, w, h). The start lane (rows 10..12, x 5..16) stays clear. */
const R2_BUILDINGS: Rect[] = [
  [2, 2, 4, 3],
  [9, 2, 3, 3],
  [15, 3, 4, 3],
  [2, 7, 3, 2],
  [8, 7, 3, 2],
  [13, 6, 2, 3],
  [17, 8, 3, 2],
  [3, 14, 4, 3],
  [9, 15, 3, 4],
  [15, 14, 4, 3],
  [6, 19, 3, 2],
];

/**
 * R7 city: roads every third line, 2x2 blocks between, and a river down the
 * middle (columns 10-11) with bridges on rows 3 and 18. The nearest road
 * across the river is often the wrong snap: close as the crow flies, far by road.
 */
export function cityMap(n = 22): string[] {
  const rows: string[] = [];
  for (let y = 0; y < n; y++) {
    let row = "";
    for (let x = 0; x < n; x++) {
      const road = x % 3 === 0 || y % 3 === 0;
      const river = x === 10 || x === 11;
      const bridge = y === 3 || y === 18;
      row += road && (!river || bridge) ? "." : "#";
    }
    rows.push(row);
  }
  return rows;
}

export const ROUTE_LEARN: LevelDef[] = [
  {
    id: "route-learn-1",
    n: 1,
    track: "learn",
    name: "A dot is a circle",
    blurb: "Tight rings are real. Big round rings are guesses.",
    goal: { label: "Make 8 deliveries", target: 8 },
    par: 75,
    params: { speedMul: 0.8 },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "ACCURACY",
      intro: "A phone never knows exactly where it is. Each location comes with a circle saying how wrong it might be.",
      learned: "Treat a fix as a circle, not a dot. Store every fix; decide what to draw at display time.",
      snippet: R1_SNIPPET,
      lang: "ts",
      misconception: "GPS gives your exact position.",
      learnMore:
        "Android's accuracy is roughly a 68% confidence radius, so the true spot is outside the circle about a third of the time. Indoors the fused provider falls back to Wi-Fi or cell towers, which is where the huge round numbers come from.",
      glossary: ["fix", "accuracy", "fused"],
    },
    script: script({ code: R1_SNIPPET.split("\n"), decoyEvery: 5 }),
  },
  {
    id: "route-learn-2",
    n: 2,
    track: "learn",
    name: "Sample by motion, not by clock",
    blurb: "Fix at the turns. Straights are free.",
    goal: { label: "Make 8 deliveries with no red segments", target: 8 },
    par: 90,
    params: { speedMul: 0.8 },
    learnStars: { maxSlipsFor2: 1, three: { meta: "battery", min: 50, hint: "finish with at least 50% battery. Fix only where the road bends" } },
    copy: {
      chip: "SAMPLING",
      intro: "GPS costs battery. Sample a lot when turning, hardly at all on a straight road.",
      learned: "Pick the rate from how the phone is moving. Switch up fast, switch down slowly, so a red light doesn't flip the mode (hysteresis).",
      snippet: R2_SNIPPET,
      lang: "ts",
      misconception: "More points = better tracking.",
      learnMore:
        "More points mean more battery and more noise, not more truth. Real phones get the motion signal from the activity-recognition API and the accelerometer, then pick a fix interval per state. The game makes you press the button so you feel where the information is: at the turns.",
      glossary: ["sampling", "motion", "hysteresis"],
      test: {
        prelude: 'type State = "still" | "walking" | "driving";\nconst COOL_DOWN_MS = 30_000;\nconst rank = (s: State) => ["still", "walking", "driving"].indexOf(s);',
        postlude: 'console.log(nextState("still", "driving", 0), nextState("driving", "still", 5000), nextState("driving", "still", 30000));',
        expect: "driving driving still",
      },
    },
    script: script({ code: R2_SNIPPET.split("\n"), manualFix: { batteryCostPct: 3 }, buildings: R2_BUILDINGS }),
  },
  {
    id: "route-learn-3",
    n: 3,
    track: "learn",
    name: "Record first, upload later",
    blurb: "Deliveries in dead zones queue on the phone.",
    goal: { label: "Sync 10 deliveries", target: 10 },
    par: 100,
    params: { speedMul: 0.8 },
    learnStars: { maxSlipsFor2: 1, three: { meta: "inZone", min: 3, hint: "make at least 3 deliveries inside dead zones. Be brave" } },
    copy: {
      chip: "OUTBOX",
      intro: "Networks drop out. Write every event to the phone first; a separate job uploads them in batches.",
      learned: "Record always, sync whenever. Keep recordedAt and receivedAt; order by the phone's sequence, not arrival.",
      snippet: R3_SNIPPET,
      lang: "ts",
      misconception: "If the upload fails, the point is gone. And arrival order is real order.",
      learnMore: "A batch that arrives late still belongs in the past: the server sorts by the phone's sequence number and recordedAt, and keeps receivedAt to measure lag. Retry with exponential backoff so a whole fleet coming out of a tunnel doesn't stampede the server.",
      glossary: ["outbox", "batch", "recordedat"],
    },
    script: script({
      code: R3_SNIPPET.split("\n"),
      zones: [
        { kind: "noSignal", rect: [2, 2, 7, 6] },
        { kind: "noSignal", rect: [13, 13, 7, 6] },
      ],
      outbox: true,
    }),
  },
  {
    id: "route-learn-4",
    n: 4,
    track: "learn",
    name: "Safe to retry",
    blurb: "Ghost pins are resends. Don't bill twice.",
    goal: { label: "Make 10 deliveries", target: 10 },
    par: 90,
    params: { speedMul: 0.8 },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "IDEMPOTENCY",
      intro: "On mobile, retries are guaranteed. Give every event an id so the server can say 'already have it'.",
      learned: "Make ingest idempotent: the same event id twice does nothing, so the phone can retry freely.",
      snippet: R4_SNIPPET,
      lang: "sql",
      misconception: "Duplicates are rare.",
      learnMore: "A lost reply looks exactly like a lost request to the phone, so it must resend. Judge each event in a batch on its own, so one bad row never blocks the queue, and generate the id on the phone, not the server.",
      glossary: ["eventid", "idempotent"],
    },
    script: script({ code: R4_SNIPPET.split("\n"), dupRate: 0.65, idKeyAt: 5 }),
  },
  {
    id: "route-learn-5",
    n: 5,
    track: "learn",
    name: "Unknown is an answer",
    blurb: "Battery savers stop the fixes. Label each gap.",
    goal: { label: "Make 8 deliveries and label 4 gaps", target: 8 },
    par: 110,
    params: { speedMul: 0.8 },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "GAPS",
      intro: "Phones go quiet: battery savers, the OS killing your app, a dead battery. When data is missing, say so.",
      learned: "A confident wrong line is worse than an honest gap. Name a cause only with evidence; otherwise it's unknown.",
      snippet: R5_SNIPPET,
      lang: "ts",
      misconception: "No data means they didn't move.",
      learnMore:
        "Staying alive on Android needs a foreground service with a notification, a restart after reboot, and the OEM's autostart setting. Background permission can be declared but not granted. A gap with a known cause (a tracking_stopped event) is still a gap: label it, never fill it in.",
      glossary: ["gap", "foreground"],
    },
    script: script({
      code: R5_SNIPPET.split("\n"),
      zones: [
        { kind: "sleep", rect: [3, 3, 5, 5] },
        { kind: "sleep", rect: [14, 3, 5, 5] },
        { kind: "sleep", rect: [3, 14, 5, 5] },
        { kind: "sleep", rect: [14, 14, 5, 5] },
      ],
      gaps: [
        { km: 2.1, min: 40 },
        { km: 11, min: 14 },
        { km: 240, min: 25 },
        { km: 0.3, min: 35 },
      ],
    }),
  },
  {
    id: "route-learn-6",
    n: 6,
    track: "learn",
    name: "Clean the picture, not the data",
    blurb: "Glass towers throw spikes. Tune three display filters.",
    goal: { label: "10 deliveries, odometer within 10% of true", target: 10 },
    par: 120,
    params: { speedMul: 0.8 },
    learnStars: { maxSlipsFor2: 1, three: { meta: "odoClean", max: 3, hint: "odometer within 3% and no real fix hidden. Loosen the filter that hides deliveries" } },
    copy: {
      chip: "CLEANING",
      intro: "Raw GPS has spikes and slow drift. Clean what you draw, never what you stored.",
      learned: "Hide low-accuracy fixes, impossible jumps (after shrinking the distance by both radii), and drift while the phone is still.",
      snippet: R6_SNIPPET,
      lang: "ts",
      misconception: "Noise averages out.",
      learnMore:
        "It adds up to fake distance: every spike is there-and-back on the odometer. A Kalman filter barely helped in practice, because one confident bad reading still drags the line. Three simple cut-offs, applied only when drawing, removed most of it while the database kept every raw row.",
      glossary: ["spike", "drift"],
      test: {
        prelude: "const MAX_SPEED = 50; // m/s\nconst dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);\nconst a = { x: 0, y: 0, acc: 20, t: 0 };\nconst b = { x: 900, y: 0, acc: 20, t: 2 };\nconst motion = \"moving\";\nconst db = [a, b];\nlet shown = db.length;\nconst hide = () => shown--;",
        postlude: "console.log(shown, db.length);",
        expect: "1 2",
      },
    },
    script: script({
      code: R6_SNIPPET.split("\n"),
      zones: [
        { kind: "glass", rect: [2, 2, 5, 5] },
        { kind: "glass", rect: [14, 3, 5, 5] },
        { kind: "glass", rect: [8, 14, 6, 5] },
      ],
      filters: { cellKm: 0.05 },
    }),
  },
  {
    id: "route-learn-7",
    n: 7,
    track: "learn",
    name: "Snap to roads",
    blurb: "Raw pins land in buildings. Pick the reachable road.",
    goal: { label: "Make 10 correct snaps", target: 10 },
    par: 120,
    params: { speedMul: 0.75, growPer: 0 },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "MAP MATCHING",
      intro: "GPS dots float off the road. Putting them back takes the whole journey, not just the nearest street.",
      learned: "Map matching scores each candidate by distance (emission) and by whether the route from the last point makes sense (transition), over the whole trace.",
      snippet: R7_SNIPPET,
      lang: "ts",
      misconception: "Snap each point to its nearest road.",
      learnMore:
        "The nearest road is wrong whenever a river, a flyover or a one-way street sits between you and it. A hidden Markov model keeps every candidate per point and Viterbi picks the chain with the best total score. OSRM's /match endpoint does this for free if you host it.",
      glossary: ["mapmatching"],
      test: {
        prelude: "const emission = (m) => Math.exp(-m / 20);\nconst transition = (ratio) => Math.exp(-(ratio - 1) * 2);\nlet score;\nlet distToRoad = 12, routeLen = 66, straightLen = 60;   // the reachable candidate",
        postlude: 'const nearest = emission(9) * transition(480 / 60);   // closer, but across the river\nconsole.log(score > nearest ? "reachable wins" : "nearest wins");',
        expect: "reachable wins",
      },
    },
    script: script({ code: R7_SNIPPET.split("\n"), roads: cityMap() }),
  },
  {
    id: "route-learn-8",
    n: 8,
    track: "learn",
    name: "Cost per user",
    blurb: "Uploads, snaps and lookups cost coins. Stay under budget.",
    goal: { label: "15 deliveries under budget", target: 15 },
    par: 150,
    params: { speedMul: 0.85 },
    learnStars: { maxSlipsFor2: 1, three: { meta: "costPct", max: 60, hint: "spend under 60% of the budget. Batch through dead zones and prefer ⚡ pins" } },
    copy: {
      chip: "COST",
      intro: "Every upload, snap call and address lookup costs money. Batch, cache, and only pay for what a human will look at.",
      learned: "The money goes to maps, snapping and geocoding calls, not storage. Snap only finished segments, cache repeat addresses, and self-host OSRM to turn per-call cost into a fixed cost.",
      snippet: R8_SNIPPET,
      lang: "ts",
      misconception: "Storage is the expensive part.",
      learnMore:
        "Per-user cost is a product of policies: fix interval, batch size, when you snap, and what you geocode. The coins here are made up; the levers are real. Rounding coordinates to a grid cell before caching is why repeat addresses are free: a few metres of GPS jitter still hit the same key.",
      glossary: ["geocoding", "cost"],
      test: {
        prelude: 'const cache = new Map();\nlet calls = 0;\nconst reverseGeocode = async () => { calls++; return "12 Market St"; };\nconst lat = 17.38501, lng = 78.48667;',
        postlude: "const again = cache.get(`${(lat + 0.00003).toFixed(4)},${lng.toFixed(4)}`);   // a few metres of jitter\nconsole.log(calls, again === address);",
        async: true,
        expect: "1 true",
      },
    },
    script: script({
      code: R8_SNIPPET.split("\n"),
      zones: [
        { kind: "noSignal", rect: [2, 2, 6, 5] },
        { kind: "noSignal", rect: [14, 14, 6, 5] },
      ],
      outbox: true,
      budget: { upload: 1, snap: 2, geocode: 3, cap: 180 },
    }),
  },
];
