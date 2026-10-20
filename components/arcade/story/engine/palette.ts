// Fixed "Ink and Tile" palette. The game never reads site CSS tokens, so the
// art looks identical in light and dark site themes.
export const C = {
  paper: "#FFFFFF",
  surface: "#F2F1EC",
  surface2: "#E6E4DC",
  ink: "#121217",
  muted: "#55555F",
  cobalt: "#2E3BF0",
  cobaltLight: "#DCDFFD",
  sun: "#FFC83D",
  coral: "#FF5B38",
  coralText: "#C7390F",
  mint: "#3DDC97",
  lilac: "#C3B5FF",
  lilacDark: "#8C7BE0",
  sky: "#8ED1FC",
  night: "#16182B",
  card: "#1B1E31",
  skin: ["#F2C9A0", "#C98E62", "#8A5A3C"],
  shadow: "rgba(18,18,23,0.10)",
} as const;

export type Hue = "cobalt" | "lilac" | "mint" | "coral" | "sun" | "sky" | "paper" | "night";
export const HUE: Record<Hue, string> = {
  cobalt: C.cobalt,
  lilac: C.lilac,
  mint: C.mint,
  coral: C.coral,
  sun: C.sun,
  sky: C.sky,
  paper: C.paper,
  night: C.night,
};

export const LINE = 2.5;
export const W = 640;
export const H = 360;
