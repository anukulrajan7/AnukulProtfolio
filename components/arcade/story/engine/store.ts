// Tiny external store so React re-renders only when UI-facing state changes
// (the canvas world updates every frame without touching React).
export interface Store<T> {
  get: () => T;
  set: (patch: Partial<T> | ((prev: T) => T)) => void;
  sub: (fn: () => void) => () => void;
}

export function createStore<T extends object>(init: T): Store<T> {
  let s = init;
  const subs = new Set<() => void>();
  return {
    get: () => s,
    set: (patch) => {
      const next = typeof patch === "function" ? patch(s) : { ...s, ...patch };
      if (next === s) return;
      s = next;
      subs.forEach((f) => f());
    },
    sub: (fn) => {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
}
