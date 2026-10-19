/**
 * Deterministic topographic contour field.
 * Value-noise heightmap → marching squares → chained polylines → SVG path data.
 * Pure function; safe to run on the server at build time.
 */

export interface ContourOptions {
  seed?: number;
  width?: number;
  height?: number;
  cols?: number;
  rows?: number;
  levels?: number;
  scale?: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function makeNoise(seed: number, size: number) {
  const rand = mulberry32(seed);
  const lattice = new Float32Array((size + 1) * (size + 1));
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
  const at = (x: number, y: number) =>
    lattice[((y % (size + 1)) + (size + 1)) % (size + 1) * (size + 1) + (((x % (size + 1)) + (size + 1)) % (size + 1))];
  return (x: number, y: number) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const a = at(x0, y0);
    const b = at(x0 + 1, y0);
    const c = at(x0, y0 + 1);
    const d = at(x0 + 1, y0 + 1);
    const top = a + (b - a) * fx;
    const bottom = c + (d - c) * fx;
    return top + (bottom - top) * fy;
  };
}

type Seg = [number, number, number, number];

export function contourPaths({
  seed = 17385,
  width = 1200,
  height = 720,
  cols = 64,
  rows = 40,
  levels = 9,
  scale = 2.4,
}: ContourOptions = {}): string[] {
  const n1 = makeNoise(seed, 16);
  const n2 = makeNoise(seed + 1, 16);
  const n3 = makeNoise(seed + 2, 16);

  const field = new Float32Array((cols + 1) * (rows + 1));
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const u = (i / cols) * scale;
      const v = (j / rows) * scale * (height / width);
      const h =
        n1(u, v) * 0.6 + n2(u * 2.1, v * 2.1) * 0.28 + n3(u * 4.3, v * 4.3) * 0.12;
      field[j * (cols + 1) + i] = h;
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }

  const cw = width / cols;
  const ch = height / rows;
  const f = (i: number, j: number) => field[j * (cols + 1) + i];
  const lerp = (a: number, b: number, iso: number) => (iso - a) / (b - a || 1e-9);

  const out: string[] = [];

  for (let l = 1; l <= levels; l++) {
    const iso = min + ((max - min) * l) / (levels + 1);
    const segs: Seg[] = [];

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = f(i, j);
        const b = f(i + 1, j);
        const c = f(i + 1, j + 1);
        const d = f(i, j + 1);
        const idx = (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (c > iso ? 2 : 0) | (d > iso ? 1 : 0);
        if (idx === 0 || idx === 15) continue;

        const x = i * cw;
        const y = j * ch;
        const top: [number, number] = [x + lerp(a, b, iso) * cw, y];
        const right: [number, number] = [x + cw, y + lerp(b, c, iso) * ch];
        const bottom: [number, number] = [x + lerp(d, c, iso) * cw, y + ch];
        const left: [number, number] = [x, y + lerp(a, d, iso) * ch];

        const push = (p: [number, number], q: [number, number]) =>
          segs.push([p[0], p[1], q[0], q[1]]);

        switch (idx) {
          case 1: case 14: push(left, bottom); break;
          case 2: case 13: push(bottom, right); break;
          case 3: case 12: push(left, right); break;
          case 4: case 11: push(top, right); break;
          case 5: push(left, top); push(bottom, right); break;
          case 6: case 9: push(top, bottom); break;
          case 7: case 8: push(left, top); break;
          case 10: push(top, right); push(left, bottom); break;
        }
      }
    }

    out.push(chain(segs));
  }

  return out;
}

function key(x: number, y: number) {
  return `${Math.round(x * 4)},${Math.round(y * 4)}`;
}

function fmt(n: number) {
  return (Math.round(n * 10) / 10).toString();
}

function chain(segs: Seg[]): string {
  const byPoint = new Map<string, number[]>();
  segs.forEach((s, idx) => {
    const k1 = key(s[0], s[1]);
    const k2 = key(s[2], s[3]);
    (byPoint.get(k1) ?? byPoint.set(k1, []).get(k1)!).push(idx);
    (byPoint.get(k2) ?? byPoint.set(k2, []).get(k2)!).push(idx);
  });

  const used = new Uint8Array(segs.length);
  const parts: string[] = [];

  const next = (px: number, py: number): number => {
    const list = byPoint.get(key(px, py));
    if (!list) return -1;
    for (const idx of list) if (!used[idx]) return idx;
    return -1;
  };

  for (let start = 0; start < segs.length; start++) {
    if (used[start]) continue;
    used[start] = 1;
    const s = segs[start];
    const pts: [number, number][] = [[s[0], s[1]], [s[2], s[3]]];

    let [cx, cy] = pts[pts.length - 1];
    for (;;) {
      const idx = next(cx, cy);
      if (idx < 0) break;
      used[idx] = 1;
      const t = segs[idx];
      const sameStart = key(t[0], t[1]) === key(cx, cy);
      const nx = sameStart ? t[2] : t[0];
      const ny = sameStart ? t[3] : t[1];
      pts.push([nx, ny]);
      cx = nx;
      cy = ny;
    }

    [cx, cy] = pts[0];
    for (;;) {
      const idx = next(cx, cy);
      if (idx < 0) break;
      used[idx] = 1;
      const t = segs[idx];
      const sameStart = key(t[0], t[1]) === key(cx, cy);
      const nx = sameStart ? t[2] : t[0];
      const ny = sameStart ? t[3] : t[1];
      pts.unshift([nx, ny]);
      cx = nx;
      cy = ny;
    }

    const first = pts[0];
    const last = pts[pts.length - 1];
    const closed = pts.length > 2 && key(first[0], first[1]) === key(last[0], last[1]);
    const body = (closed ? pts.slice(0, -1) : pts)
      .map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p[0])} ${fmt(p[1])}`)
      .join("");
    parts.push(closed ? `${body}Z` : body);
  }

  return parts.join("");
}
