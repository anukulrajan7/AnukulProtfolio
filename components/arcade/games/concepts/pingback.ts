// Pingback Learn track: the JavaScript event loop (P1–P8).
// Source: portfolio-notes/game/concept-levels.md §3. Snippet outputs are
// asserted by components/arcade/learn/__tests__/snippets.test.ts.

import type { LevelDef } from "../levels";
import type { PingbackScript } from "./types";

const lines = (s: string) => s.split("\n");

const P1_SNIPPET = `console.log("A"); console.log("B"); console.log("C"); // A B C, always`;
const P2_SNIPPET = `for (const chunk of chunks) {
  process(chunk);
  await new Promise((r) => setTimeout(r, 0)); // yield (or scheduler.yield())
}`;
const P3_SNIPPET = `console.log(1);
setTimeout(() => console.log(2), 0);
console.log(3);                       // 1 3 2`;
const P4_SNIPPET = `console.log(1);
setTimeout(() => console.log(2));
Promise.resolve().then(() => console.log(3));
console.log(4);                       // 1 4 3 2`;
const P5_SNIPPET = `async function load() { console.log("A"); await null; console.log("C"); }
load();
console.log("B");                     // A B C`;
const P6_SNIPPET = `setTimeout(() => console.log("A"));
Promise.resolve().then(() => {
  console.log("B");
  Promise.resolve().then(() => console.log("C"));
});
console.log("D");                     // D B C A`;
const P7_SNIPPET = `const [user, posts, friends] = await Promise.all([
  getUser(), getPosts(), getFriends(),
]);`;
const P8_SNIPPET = `console.log(1);
setTimeout(() => console.log(2));
(async () => { console.log(3); await null; console.log(4); })();
Promise.resolve().then(() => console.log(5));
console.log(6);                         // 1 3 6 4 5 2`;

const script = (s: Omit<PingbackScript, "kind">): PingbackScript => ({ kind: "pingback", ...s });

export const PINGBACK_LEARN: LevelDef[] = [
  {
    id: "pingback-learn-1",
    n: 1,
    track: "learn",
    name: "One thing at a time",
    blurb: "Pop A, B, C in the order they print.",
    goal: { label: "Print A B C", target: 3 },
    par: 35,
    params: { speedMul: 0.6, lives: 3 },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "THREAD",
      intro: "JavaScript has one thread, like you have one tower. It runs one line, finishes it, then the next.",
      learned: "One call stack, one thing at a time, top to bottom. All the async stuff is built on top of this.",
      snippet: P1_SNIPPET,
      lang: "js",
      misconception: "JS runs my functions in parallel.",
      learnMore:
        "Web Workers and Node's worker_threads do add threads, but each runs its own event loop and shares nothing by default. Your page's code, its event handlers and its rendering all take turns on one main thread.",
      glossary: ["thread", "callstack"],
      test: { expect: "A B C" },
    },
    script: script({
      code: ['console.log("A");', 'console.log("B");', 'console.log("C");'],
      bugs: [
        { id: "A", lane: "sync", order: 1, line: 0 },
        { id: "B", lane: "sync", order: 2, line: 1 },
        { id: "C", lane: "sync", order: 3, line: 2 },
      ],
      showMachinery: true,
      noise: 2,
    }),
  },
  {
    id: "pingback-learn-2",
    n: 2,
    track: "learn",
    name: "Don't freeze the tower",
    blurb: "Chunk the long job before it reaches you.",
    goal: { label: "Process the whole job", target: 7 },
    par: 45,
    params: { speedMul: 0.8, lives: 3 },
    learnStars: { maxSlipsFor2: 1, three: { meta: "maxFreezeMs", max: 50, hint: "no freeze over 50 ms. Shoot the job apart before it reaches you" } },
    copy: {
      chip: "LONG TASK",
      intro: "A long job on the main thread freezes everything: clicks wait, frames stop. Break it up.",
      learned: "Long tasks block input and painting. Chunk the work and yield between pieces so the browser can breathe.",
      snippet: P2_SNIPPET,
      lang: "js",
      misconception: "Putting it in an async function makes it non-blocking.",
      learnMore:
        "A real browser freezes animations too. Here the swarm keeps moving so you feel what the user feels. Nested setTimeout(0) is clamped to about 4 ms, so scheduler.yield() is the modern way to yield where it exists.",
      glossary: ["longtask", "yield"],
      test: { prelude: 'setTimeout(() => console.log("tick"), 0);\nconst chunks = [1, 2, 3];\nconst process = (c) => console.log(c);', async: true, expect: "1 tick 2 3" },
    },
    script: script({
      code: lines(P2_SNIPPET),
      bugs: [],
      heavy: { label: "processAll()", freezeMs: 2000, required: true },
      noise: 2,
    }),
  },
  {
    id: "pingback-learn-3",
    n: 3,
    track: "learn",
    name: "Later means later",
    blurb: "The timer bug waits behind a shield.",
    goal: { label: "Print 1 3 2", target: 3 },
    par: 40,
    params: { speedMul: 0.7, lives: 3 },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "TASK QUEUE",
      intro: "setTimeout doesn't run your code later. It queues it, and the queue waits until the current code is done.",
      learned: "Even a 0 ms timer waits for every line of the current task. The delay is a minimum, not an appointment.",
      snippet: P3_SNIPPET,
      lang: "js",
      misconception: "setTimeout(fn, 0) runs immediately.",
      learnMore: "The event loop picks the next task only when the call stack is empty. Timers, clicks and network callbacks are all tasks waiting their turn, so a busy stack delays every one of them.",
      glossary: ["task", "taskqueue", "eventloop"],
      test: { expect: "1 3 2" },
    },
    script: script({
      code: lines(P3_SNIPPET),
      bugs: [
        { id: "1", lane: "sync", order: 1, line: 0 },
        { id: "2", lane: "task", order: 3, line: 1 },
        { id: "3", lane: "sync", order: 2, line: 2 },
      ],
      showMachinery: true,
      noise: 3,
    }),
  },
  {
    id: "pingback-learn-4",
    n: 4,
    track: "learn",
    name: "Promises cut the line",
    blurb: "No shields now. Predict the order.",
    goal: { label: "Print 1 4 3 2", target: 4 },
    par: 50,
    params: { speedMul: 0.75, lives: 3 },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "MICROTASK",
      intro: "Promises have a VIP lane. When the stack empties, every microtask runs before the next task gets a look.",
      learned: "After each task, the engine drains the microtask queue (promises) before taking the next task (timers, events).",
      snippet: P4_SNIPPET,
      lang: "js",
      misconception: "Timers and promises run in the order written.",
      learnMore: "Microtasks come from promise reactions, await and queueMicrotask. Tasks come from timers, events and messages. Node adds process.nextTick, which runs even before promise microtasks.",
      glossary: ["microtask", "promise"],
      test: { expect: "1 4 3 2" },
    },
    script: script({
      code: lines(P4_SNIPPET),
      bugs: [
        { id: "1", lane: "sync", order: 1, line: 0 },
        { id: "2", lane: "task", order: 4, line: 1 },
        { id: "3", lane: "micro", order: 3, line: 2 },
        { id: "4", lane: "sync", order: 2, line: 3 },
      ],
      noise: 3,
    }),
  },
  {
    id: "pingback-learn-5",
    n: 5,
    track: "learn",
    name: "await pauses the function",
    blurb: "Hit load() and it splits in two.",
    goal: { label: "Print A B C", target: 3 },
    par: 45,
    params: { speedMul: 0.75, lives: 3 },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "AWAIT",
      intro: "await cuts a function in two. The first half runs now; the rest waits in line while everything else carries on.",
      learned: "await pauses only its own function. The caller keeps going, and the rest resumes later as a microtask.",
      snippet: P5_SNIPPET,
      lang: "js",
      misconception: "await blocks everything, like sleep().",
      learnMore: "Even `await null` yields: the rest of the function is queued as a microtask, so the caller's next line always runs first. Awaiting a real promise just waits longer before that microtask is queued.",
      glossary: ["await"],
      test: { expect: "A B C" },
    },
    script: script({
      code: lines(P5_SNIPPET),
      bugs: [
        { id: "A", tag: "load()", lane: "sync", order: 1, line: 1 },
        { id: "B", lane: "sync", order: 2, line: 2 },
        { id: "C", lane: "micro", order: 3, line: 0, spawnedBy: "A", badge: "⏸" },
      ],
      showMachinery: true,
      noise: 3,
    }),
  },
  {
    id: "pingback-learn-6",
    n: 6,
    track: "learn",
    name: "Microtasks drain completely",
    blurb: "Popping B queues C ahead of the timer.",
    goal: { label: "Print D B C A", target: 4 },
    par: 55,
    params: { speedMul: 0.8, lives: 3 },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "DRAIN",
      intro: "A microtask can queue another microtask, and the new one still beats every waiting timer.",
      learned: "The microtask queue is emptied fully, new arrivals included, before the next task or the next paint.",
      snippet: P6_SNIPPET,
      lang: "js",
      misconception: "Tasks and microtasks take turns.",
      learnMore: "An endless .then chain starves rendering completely: the page never gets to paint because the microtask queue never empties. Timers at least give the browser a gap between tasks.",
      glossary: ["drain"],
      test: { expect: "D B C A" },
    },
    script: script({
      code: lines(P6_SNIPPET),
      bugs: [
        { id: "A", lane: "task", order: 4, line: 0 },
        { id: "B", lane: "micro", order: 2, line: 2 },
        { id: "C", lane: "micro", order: 3, line: 3, spawnedBy: "B", badge: "⚡" },
        { id: "D", lane: "sync", order: 1, line: 5 },
      ],
      noise: 3,
    }),
  },
  {
    id: "pingback-learn-7",
    n: 7,
    track: "learn",
    name: "Fire them together",
    blurb: "Shoot the Promise.all crate, then send three at once.",
    goal: { label: "Resolve all three requests", target: 3 },
    par: 50,
    params: { speedMul: 0.4, lives: 3, bulletSpeedMul: 0.5, bulletLife: 1.6 },
    learnStars: { maxSlipsFor2: 1, three: { meta: "singleBatch", min: 1, hint: "resolve all three in one clean Promise.all batch" } },
    copy: {
      chip: "PROMISE.ALL",
      intro: "Three requests that don't depend on each other shouldn't wait in single file. Send them together.",
      learned: "Promise.all runs independent work concurrently and waits for all of it. One rejection fails the batch.",
      snippet: P7_SNIPPET,
      lang: "js",
      misconception: "Promise.all uses extra threads.",
      learnMore:
        "It's still one thread; only the waiting overlaps. The other requests aren't cancelled when one rejects (use AbortController for that), and Promise.allSettled keeps the partial results instead of failing the batch.",
      glossary: ["promiseall", "concurrency"],
      test: {
        prelude: 'const getUser = async () => "u";\nconst getPosts = async () => "p";\nconst getFriends = async () => "f";',
        postlude: "console.log(user, posts, friends);",
        async: true,
        expect: "u p f",
      },
    },
    script: script({
      code: lines(P7_SNIPPET),
      bugs: [
        { id: "user", tag: "getUser", lane: "sync", order: 0 },
        { id: "posts", tag: "getPosts", lane: "sync", order: 0 },
        { id: "friends", tag: "getFriends", lane: "sync", order: 0 },
      ],
      inflightCap: 1,
      promiseAllCrate: true,
      noise: 2,
    }),
  },
  {
    id: "pingback-learn-8",
    n: 8,
    track: "learn",
    name: "The whole loop",
    blurb: "Mixed code, a heavy job and a swarm.",
    goal: { label: "Print 1 3 6 4 5 2", target: 6 },
    par: 80,
    params: { speedMul: 0.9, lives: 3 },
    learnStars: { maxSlipsFor2: 1, three: { meta: "maxFreezeMs", max: 50, hint: "0 bounces and no freeze" } },
    copy: {
      chip: "EVENT LOOP",
      intro: "Everything at once: sync lines, a timer, an await and a promise. Predict the console and keep the tower responsive.",
      learned: "Sync code first, then every microtask (await continuations and promises, in the order queued), then the next task.",
      snippet: P8_SNIPPET,
      lang: "js",
      misconception: "async code runs in the order it is written.",
      learnMore: "4 prints before 5 because `await null` queued its continuation before the later .then did. Microtasks run in the order they were queued, just like tasks; they simply all run first.",
      glossary: ["eventloop"],
      test: { expect: "1 3 6 4 5 2" },
    },
    script: script({
      code: lines(P8_SNIPPET),
      bugs: [
        { id: "1", lane: "sync", order: 1, line: 0 },
        { id: "2", lane: "task", order: 6, line: 1 },
        { id: "3", tag: "async", lane: "sync", order: 2, line: 2 },
        { id: "4", lane: "micro", order: 4, line: 2, spawnedBy: "3", badge: "⏸" },
        { id: "5", lane: "micro", order: 5, line: 3 },
        { id: "6", lane: "sync", order: 3, line: 4 },
      ],
      heavy: { label: "render()", freezeMs: 1500, required: false },
      noise: 4,
    }),
  },
];
