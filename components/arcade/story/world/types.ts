import type { Bed } from "../engine/audio";

/** Per-frame environment the world reacts to. */
export interface Env {
  t: number;
  /** 0 afternoon → 1 evening. Street lights come on past 0.6. */
  evening: number;
  /** Room tube light on/off (desk scene). */
  light: boolean;
  reduced: boolean;
  /** Player x for props that react (pigeons, NPC heads). */
  px: number;
  /** In-world clock, minutes since midnight. */
  clock: number;
  w: WorldState;
}

/** Mutable bits of the world the script flips and props read every frame. */
export interface WorldState {
  laptop: "code" | "build" | "done" | "dark" | "lesson" | "line" | "square" | "triangle" | "error" | "mail";
  buildT: number;
  /** 0 = Tab's 30 cards sit in Done, 1 = moved back. */
  boardBack: number;
  boardTarget: number;
  /** Window sky: 0 night, 1 dawn. */
  dawn: number;
  idOnDesk: boolean;
  phoneOnDesk: boolean;
  /** Keepsakes shown as objects on the finale desk. */
  deskThings: string[];
  monitor: "chat" | "map" | "dark" | "error" | "ok";
  chaiFull: boolean;
}

export const freshWorld = (): WorldState => ({
  laptop: "code",
  buildT: 0,
  boardBack: 0,
  boardTarget: 0,
  dawn: 0,
  idOnDesk: true,
  phoneOnDesk: true,
  deskThings: [],
  monitor: "chat",
  chaiFull: true,
});

export interface Prop {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Depth sort key for the play layer (feet y). */
  sort: number;
  draw: (ctx: CanvasRenderingContext2D, env: Env) => void;
}

export type HotKind = "look" | "use" | "talk" | "door" | "sit";

export interface Hotspot {
  id: string;
  x: number;
  /** Half-width of the trigger area. */
  r: number;
  /** World y of the glint. */
  gy: number;
  label: string;
  kind: HotKind;
  once?: boolean;
  done?: boolean;
}

export type ZoneKind = "open" | "canyon" | "underpass" | "lake";
export interface Zone {
  id: ZoneKind;
  from: number;
  to: number;
}

export interface Scene {
  id: "desk" | "office" | "street";
  width: number;
  /** Feet baseline for actors. */
  walkY: number;
  /** W/S depth range around walkY (street only). */
  depth: [number, number];
  walkMin: number;
  walkMax: number;
  /** Parallax layers: far 0.3, mid 0.6, play 1.0, fore 1.15. */
  layers: [Prop[], Prop[], Prop[], Prop[]];
  hotspots: Hotspot[];
  zones: Zone[];
  bed: Bed;
  /** Screen-space backdrop (sky, walls). */
  sky: (ctx: CanvasRenderingContext2D, env: Env, camX: number) => void;
  /** Play-layer overlay drawn after actors (underpass darkness, lamp pools). */
  overlay?: (ctx: CanvasRenderingContext2D, env: Env) => void;
  describe: string;
}

export const PARALLAX = [0.3, 0.6, 1, 1.15] as const;
