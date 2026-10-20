// Seeded RNG + small math helpers (copied from ../engine.ts so story/ stays self-contained).
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** Frame-rate independent lerp factor: `k` per 60 Hz frame. */
export const damp = (k: number, dt: number) => 1 - Math.pow(1 - k, dt * 60);

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const fmtClock = (min: number) => {
  const h24 = Math.floor(min / 60) % 24;
  const h = ((h24 + 11) % 12) + 1;
  const m = Math.floor(min % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
};
