// Learn track registry + per-game glossary + certificate copy.

import type { MiniGameId } from "../../types";
import type { LevelDef } from "../levels";
import { PINGBACK_LEARN } from "./pingback";
import { ROUTE_LEARN } from "./route";
import { STACKER_LEARN } from "./stacker";

export const LEARN: Record<MiniGameId, LevelDef[]> = {
  stacker: STACKER_LEARN,
  pingback: PINGBACK_LEARN,
  route: ROUTE_LEARN,
};

export interface Term {
  id: string;
  term: string;
  def: string;
}

export const GLOSSARY: Record<MiniGameId, Term[]> = {
  stacker: [
    { id: "callstack", term: "call stack", def: "The pile of running function calls. The newest is on top and finishes first." },
    { id: "frame", term: "frame", def: "One function call's slot on the stack: its arguments, locals and where to return to." },
    { id: "return", term: "return", def: "A frame finishing: it pops off the stack and hands a value to its caller." },
    { id: "overflow", term: "stack overflow", def: "Too many frames at once, usually recursion with no reachable base case." },
    { id: "basecase", term: "base case", def: "The input a recursive function answers without calling itself. Every call must get closer to it." },
    { id: "heap", term: "heap", def: "Where objects live. They stay as long as something can reach them." },
    { id: "reference", term: "reference", def: "A pointer from a variable or object to another object." },
    { id: "reachable", term: "reachable", def: "Can be found by following references from a root (stack, globals)." },
    { id: "gc", term: "garbage collection", def: "The engine freeing objects nothing can reach any more, when it decides to." },
    { id: "leak", term: "memory leak", def: "Objects you no longer want that something still references: a listener, a timer, a cache." },
    { id: "hoisting", term: "hoisting", def: "Declarations are set up before any line of the scope runs." },
    { id: "scope", term: "scope", def: "The region of code where a name is visible." },
    { id: "tdz", term: "TDZ", def: "Temporal Dead Zone: a let/const exists but can't be read until its line runs." },
    { id: "closure", term: "closure", def: "A function plus the variables it captured. Those variables live as long as the function does." },
  ],
  pingback: [
    { id: "thread", term: "thread", def: "One line of execution. Your page's JavaScript gets one main thread." },
    { id: "callstack", term: "call stack", def: "What's running right now. The event loop waits for it to empty." },
    { id: "longtask", term: "long task", def: "Work that holds the main thread for more than 50 ms, blocking input and paint." },
    { id: "yield", term: "yield", def: "Pausing on purpose so the browser can handle input and paint." },
    { id: "task", term: "task", def: "A queued job: a timer callback, an event, a message." },
    { id: "taskqueue", term: "task queue", def: "Tasks wait here until the stack is empty and microtasks are drained." },
    { id: "eventloop", term: "event loop", def: "Run a task, drain microtasks, maybe paint, repeat." },
    { id: "microtask", term: "microtask", def: "A promise reaction or await continuation. All of them run before the next task." },
    { id: "promise", term: "promise", def: "A value that will arrive later, with callbacks queued as microtasks." },
    { id: "await", term: "await", def: "Pauses its own async function; the rest resumes as a microtask." },
    { id: "drain", term: "drain", def: "Emptying the microtask queue fully, including microtasks added while draining." },
    { id: "promiseall", term: "Promise.all", def: "Waits for several promises at once; rejects if any one rejects." },
    { id: "concurrency", term: "concurrency", def: "Overlapping waits on one thread, not running code in parallel." },
  ],
  route: [
    { id: "fix", term: "fix", def: "One location reading: lat, lng, accuracy and a timestamp." },
    { id: "accuracy", term: "accuracy radius", def: "How wrong a fix might be, as a circle in metres (about 68% confidence on Android)." },
    { id: "fused", term: "fused provider", def: "Android's blend of GPS, Wi-Fi and cell. Indoors it falls back to rough guesses." },
    { id: "sampling", term: "sampling", def: "How often the phone asks for a fix. Each one costs battery; the turns carry the information." },
    { id: "motion", term: "motion state", def: "Still, walking or driving, from the activity API and accelerometer. It picks the fix interval." },
    { id: "hysteresis", term: "hysteresis", def: "Switch to a faster rate at once, switch down only after a cool-down, so a red light doesn't flip the mode." },
    { id: "outbox", term: "outbox", def: "A queue on the phone. Every event is written here first, then uploaded." },
    { id: "batch", term: "batch", def: "Many events sent in one request, cheaper and kinder to flaky networks." },
    { id: "recordedat", term: "recordedAt / receivedAt", def: "When the phone saw it vs when the server got it. Keep both." },
    { id: "eventid", term: "event id", def: "A unique id made on the phone so resends can be recognised." },
    { id: "idempotent", term: "idempotent", def: "Doing it twice has the same effect as doing it once." },
    { id: "gap", term: "gap", def: "A stretch with no readings. Draw it honestly; don't invent a straight line." },
    { id: "foreground", term: "foreground service", def: "How an Android app keeps tracking in the background, with a visible notification." },
    { id: "spike", term: "spike", def: "A fix that jumps away and back, usually glass or a tunnel mouth. It adds fake distance." },
    { id: "drift", term: "drift", def: "A still phone's fixes wandering around the true spot. Hide them while drawing; keep the rows." },
    { id: "mapmatching", term: "map matching", def: "Snapping a whole trace to roads using distance and route plausibility." },
    { id: "geocoding", term: "geocoding", def: "Turning coordinates into an address (reverse) or back. Paid per call, so cache by grid cell." },
    { id: "cost", term: "cost per user", def: "What one tracked phone costs per month: mostly map, snap and geocode calls, rarely storage." },
  ],
};

export const CERTIFICATE: Record<MiniGameId, string> = {
  stacker: "Certified: knows where the bytes go",
  pingback: "Certified: knows when the code runs",
  route: "Certified: knows what GPS isn't telling you",
};
