// Stacker Learn track: the JavaScript memory model, concept-levels.md §2.
// S1 call stack · S2 stack overflow · S3 heap + GC · S4 the leak ·
// S5 hoisting · S6 TDZ · S7 closures · S8 production heap (finale).
// Ids keep the doc's numbering (stacker-learn-N); `n` is the ladder position.

import type { LevelDef } from "../levels";
import type { StackerScript } from "./types";

const S1_SNIPPET = `function main()     { loadPage(); }
function loadPage() { getUser(); render(); }
function getUser()  { return "anu"; }   // returns before loadPage can`;
const S2_SNIPPET = `function countdown(n) {
  if (n === 0) return;      // the gold piece
  countdown(n - 1);
}`;
const S3_SNIPPET = `function getUser() {
  const temp = { raw: bigJson };      // unreachable after return
  return { name: temp.raw.name };     // caller keeps this one
}
const user = getUser();`;
const S4_SNIPPET = `useEffect(() => {
  window.addEventListener("scroll", onScroll);
  return () => window.removeEventListener("scroll", onScroll);
}, []);`;
const S5_SNIPPET = `greet();            // "hi": hoisted with its body
console.log(x);     // undefined, not an error
var x = 5;
function greet() { return "hi"; }`;
const S6_SNIPPET = `console.log(total); // ReferenceError: Cannot access 'total' before initialization
let total = 0;`;
const S7_SNIPPET = `function makeCounter() {
  let count = 0;                 // survives in the backpack
  const temp = new Array(1e6);   // swept: nothing uses it
  return () => ++count;
}
const inc = makeCounter();`;
const S8_SNIPPET = `function loadPage() {
  const data = parse(fetchRaw());     // frames push, then pop
  return render(data);                // heap: the chart + its listener
}
const unmount = loadPage();           // main() holds the cleanup
unmount();                            // cut the listener, let GC do the rest`;

const script = (s: Omit<StackerScript, "kind">): StackerScript => ({ kind: "stacker", ...s });

export const STACKER_LEARN: LevelDef[] = [
  {
    id: "stacker-learn-1",
    n: 1,
    track: "learn",
    name: "Last in, first out",
    blurb: "Fill a frame's gap to let it return.",
    goal: { label: "Return every frame", target: 4 },
    par: 60,
    params: { pieceSet: [0, 2, 3, 4, 5, 6] },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "CALL STACK",
      intro: "Every function call drops a frame onto the stack. Fill a frame's gap to let it return.",
      learned: "The last function called is the first to finish. That's the call stack: last in, first out.",
      snippet: S1_SNIPPET,
      lang: "js",
      misconception: "Functions finish in the order they're written.",
      learnMore:
        "A frame holds the call's arguments, locals and the address to return to. Real stacks hold thousands of frames, and the engine checks the top one only, which is why a newer slab always covers the one below.",
      glossary: ["callstack", "frame", "return"],
      test: { postlude: "console.log(getUser());", expect: "anu" },
    },
    script: script({
      code: ["function main()     { loadPage(); }", "function loadPage() { getUser(); render(); }", 'function getUser()  { return "anu"; }', "function render()   { /* paint */ }", "", "main();"],
      trace: [
        { call: "main()", gapCol: 2 },
        { call: "loadPage()", gapCol: 7 },
        { call: "getUser()", gapCol: 4 },
        { ret: '"anu"' },
        { call: "render()", gapCol: 5 },
        { ret: "undefined" },
        { ret: "undefined" },
        { ret: "undefined" },
      ],
    }),
  },
  {
    id: "stacker-learn-2",
    n: 2,
    track: "learn",
    name: "Stack overflow",
    blurb: "Keep your junk low until countdown(0) arrives.",
    goal: { label: "Unwind every frame", target: 7 },
    par: 50,
    params: { pieceSet: [0, 2, 3, 5, 6] },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "RECURSION",
      intro: "This function calls itself. Each call is another frame, and none can finish until the base case answers.",
      learned: "Recursion needs a base case it can actually reach. Without one, frames pile up until the engine gives up.",
      snippet: S2_SNIPPET,
      lang: "js",
      misconception: "Recursion is just a loop.",
      learnMore:
        "A loop reuses one frame; recursion adds a frame per call, so depth is memory. Real stacks hold roughly ten thousand frames before RangeError: Maximum call stack size exceeded, and only Safari does tail-call optimisation, so don't count on it.",
      glossary: ["overflow", "basecase"],
      test: { postlude: 'countdown(3); console.log("unwound");', expect: "unwound" },
    },
    script: script({
      code: ["function countdown(n) {", "  if (n === 0) return;      // the gold piece", "  countdown(n - 1);", "}", "countdown(6);"],
      recursion: { fn: "countdown", from: 6, every: 3.2, notchCol: 4, limitRow: 4 },
    }),
  },
  {
    id: "stacker-learn-3",
    n: 3,
    track: "learn",
    name: "Objects live on the heap",
    blurb: "Unreachable pieces get swept. Don't bury them.",
    goal: { label: "Clear 4 lines and survive 3 sweeps", target: 4 },
    par: 90,
    params: {},
    learnStars: { maxSlipsFor2: 1, three: { meta: "sweepHoles", max: 0, hint: "no holes left after any sweep. Stack short-lived pieces on top" } },
    copy: {
      chip: "HEAP",
      intro: "Every piece is an object your code created. When nothing points to it any more, the garbage collector can sweep it away.",
      learned: "Objects live as long as something can reach them, not as long as you 'need' them. Return a value and the caller keeps it alive.",
      snippet: S3_SNIPPET,
      lang: "js",
      misconception: "`= null` frees memory right now.",
      learnMore:
        "The GC decides when. V8's collector is generational and incremental: young objects are swept often, old ones rarely. 'Primitives on the stack, objects on the heap' is a teaching model, since V8 boxes most values. Reachability works exactly as shown.",
      glossary: ["heap", "reference", "reachable", "gc"],
      test: { prelude: 'const bigJson = { name: "anu" };', postlude: "console.log(user.name);", expect: "anu" },
    },
    script: script({
      code: lines(S3_SNIPPET),
      heap: {
        limitRow: 6,
        gcEvery: 20,
        sweepsToWin: 3,
        frames: [
          { name: "getUser()", returnsAfter: 3, returnPiece: 3 },
          { name: "parse()", returnsAfter: 4, returnPiece: 2 },
          { name: "render()", returnsAfter: 3, returnPiece: 1 },
        ],
      },
    }),
  },
  {
    id: "stacker-learn-4",
    n: 4,
    track: "learn",
    name: "The leak",
    blurb: "An unmounted chart still listens. Cut the right one.",
    goal: { label: "Survive 90 s under the memory limit", target: 90 },
    par: 100,
    params: {},
    learnStars: { maxSlipsFor2: 1, three: { meta: "fixedBySweep", max: 1, hint: "remove the leaky listener before the 2nd GC sweep" } },
    copy: {
      chip: "LEAK",
      intro: "A component unmounted, but its scroll listener didn't. Everything it touches is still reachable.",
      learned: "Garbage collection can't free what's still referenced. A leak is a reference you forgot to cut.",
      snippet: S4_SNIPPET,
      lang: "js",
      misconception: "JavaScript has a GC, so it can't leak.",
      learnMore:
        "The GC only frees what nothing can reach. A listener on window, a timer, a cache or a closure keeps its whole object graph alive. In React the effect's cleanup runs on unmount; forget it and every scroll event keeps allocating. The rising rows are that handler's garbage.",
      glossary: ["leak"],
      test: {
        prelude: "let attached = 0;\nconst window = { addEventListener: () => attached++, removeEventListener: () => attached-- };\nconst onScroll = () => {};\nconst cleanups = [];\nconst useEffect = (fn) => { const c = fn(); if (c) cleanups.push(c); };",
        postlude: "console.log(attached); cleanups.forEach((c) => c()); console.log(attached);",
        expect: "1 0",
      },
    },
    script: script({
      code: ["function Chart() {", "  useEffect(() => {", '    window.addEventListener("scroll", onScroll);', "    // no cleanup returned: the leak", "  }, []);", "}"],
      listeners: {
        items: [
          { name: "onClick", owner: "<Button/> mounted", leaky: false },
          { name: "onScroll", owner: "<Chart/> unmounted", leaky: true },
        ],
        gcEvery: 15,
        limitRow: 5,
        leakEvery: 3.4,
        surviveSec: 90,
      },
    }),
  },
  {
    id: "stacker-learn-5",
    n: 5,
    track: "learn",
    name: "Hoisting: var and function",
    blurb: "The I piece is hoisted. Use it before its line.",
    goal: { label: "Score a Tetris within 5 pieces", target: 1 },
    par: 45,
    params: { garbage: 4, garbageGap: 9, firstPieces: [1, 2, 3, 5, 6, 4, 1, 2, 0] },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "HOISTING",
      intro: "Before your code runs, JavaScript hoists every declaration to the top of its scope. Functions arrive ready to use; `var` arrives empty.",
      learned: "Function declarations work before their line. `var` exists early too, but it's `undefined` until assigned.",
      snippet: S5_SNIPPET,
      lang: "js",
      misconception: "You can only use what's written above.",
      learnMore: "Only declarations hoist. `var f = function () {}` hoists the name f (as undefined), not the function, so calling f() early throws TypeError: f is not a function.",
      glossary: ["hoisting", "scope"],
      test: { expect: "undefined" },
    },
    script: script({
      code: ["greet();", "console.log(x);", "var x = 5;            // runs at piece #6", 'function greet() { return "hi"; }'],
      hoist: {
        decls: [
          { kind: "function", name: "greet", piece: 0 },
          { kind: "var", name: "x", piece: 2, assignedAt: 6 },
        ],
        tetrisWithin: 5,
      },
    }),
  },
  {
    id: "stacker-learn-6",
    n: 6,
    track: "learn",
    name: "let, const and the TDZ",
    blurb: "Locked until their line runs. Don't touch early.",
    goal: { label: "Clear 6 lines", target: 6 },
    par: 120,
    params: { garbage: 4, garbageGap: 0, firstPieces: [1, 2, 5, 3, 6, 4] },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "TDZ",
      intro: "`let` and `const` are hoisted too, but locked until their line runs. Touch them early and the code throws.",
      learned: "They exist from the start of the block but can't be read until declared. That gap is the Temporal Dead Zone.",
      snippet: S6_SNIPPET,
      lang: "js",
      misconception: "`let` and `const` aren't hoisted.",
      learnMore: "They are hoisted to the top of their block, which is why an inner `let x` shadows an outer x even on the lines before it. Even `typeof x` throws inside the TDZ.",
      glossary: ["tdz"],
      test: { throws: "ReferenceError" },
    },
    script: script({
      code: ["console.log(total);   // ReferenceError", "let total = 0;        // runs at piece #4", "const max = 10;       // runs at piece #7"],
      hoist: {
        decls: [
          { kind: "let", name: "total", piece: 0, declaredAt: 4 },
          { kind: "const", name: "max", piece: 6, declaredAt: 7 },
        ],
      },
    }),
  },
  {
    id: "stacker-learn-7",
    n: 7,
    track: "learn",
    name: "Closures keep a backpack",
    blurb: "count survives the sweep, temp doesn't. Build for after.",
    goal: { label: "Clear 3 lines after a sweep", target: 3 },
    par: 120,
    params: { pieceSet: [0, 1, 2, 5, 6] },
    learnStars: { maxSlipsFor2: 1, three: "par" },
    copy: {
      chip: "CLOSURE",
      intro: "A function that returns a function packs a backpack: the variables the inner one uses outlive the outer one.",
      learned: "A closure keeps the variables it uses alive after its outer function returns. Great for state, and the root of many leaks.",
      snippet: S7_SNIPPET,
      lang: "js",
      misconception: "Locals always die on return.",
      learnMore:
        "V8 keeps captured variables in one context object per scope, so if any closure in that scope uses `temp`, every closure there keeps it alive. Cells falling straight down after the sweep is a game rule; real heaps don't compact like that.",
      glossary: ["closure"],
      test: { postlude: "console.log(inc(), inc());", expect: "1 2" },
    },
    script: script({
      code: lines(S7_SNIPPET),
      closure: { roles: ["count", "temp", "count", "temp"], gcEvery: 11, clearsToWin: 3 },
    }),
  },
  {
    id: "stacker-learn-8",
    n: 8,
    track: "learn",
    name: "Production heap",
    blurb: "Calls, objects, a leak and a lock. Ship it.",
    goal: { label: "Return main() under the memory limit", target: 5 },
    par: 180,
    params: { pieceSet: [1, 2, 3, 4, 5, 6] },
    learnStars: { maxSlipsFor2: 1, three: "slips" },
    copy: {
      chip: "FINALE",
      intro: "The whole engine at once: calls, objects, a leak and a lock. Ship it.",
      learned: "Frames come and go in order, their objects die when nothing reaches them, and a forgotten listener is the one thing the GC can't fix for you.",
      snippet: S8_SNIPPET,
      lang: "js",
      misconception: "Memory is the engine's problem, not mine.",
      learnMore:
        "Chrome's Memory panel shows it all: take a heap snapshot, look at Retainers for the object that should be gone, and the path back to window is your leak. Allocation timelines show which frame allocates. The game simplifies, but the retainer path is the real tool.",
      glossary: ["callstack", "heap", "leak", "tdz"],
      test: {
        prelude: "let listeners = 0;\nconst fetchRaw = () => '{\"n\":1}';\nconst parse = (raw) => JSON.parse(raw);\nconst render = () => { listeners++; return () => { listeners--; }; };",
        postlude: "console.log(listeners);",
        expect: "0",
      },
    },
    script: script({
      code: [
        "function main()      { loadPage(); }",
        "function loadPage()  { const data = fetchData(); render(data); }",
        "function fetchData() { return parse(raw); }",
        "function parse(raw)  { const theme = config(); return JSON.parse(raw); }",
        "function render(d)   { chart.mount(d); }  // onResize stays attached",
        "main();",
      ],
      trace: [
        { call: "main()", gapCol: 1 },
        { call: "loadPage()", gapCol: 8 },
        { call: "fetchData()", gapCol: 3 },
        { call: "parse()", gapCol: 6 },
        { ret: "{…}" },
        { ret: "{…}" },
        { call: "render()", gapCol: 4 },
        { ret: "undefined" },
        { ret: "undefined" },
        { ret: "undefined" },
      ],
      listeners: {
        items: [
          { name: "onClick", owner: "<Button/> mounted", leaky: false },
          { name: "onResize", owner: "<Chart/> unmounted", leaky: true },
        ],
        gcEvery: 14,
        limitRow: 5,
      },
      hoist: { decls: [{ kind: "const", name: "theme", piece: 0, declaredAt: 3 }] },
    }),
  },
];

function lines(s: string): string[] {
  return s.split("\n");
}
