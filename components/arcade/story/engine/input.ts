// Keyboard state → actions. Pointer/touch is handled in game.tsx and fed in via
// the same Actions object (tap-to-walk target, long-press inspect).
export interface Actions {
  ax: number; // -1..1 walk
  ay: number; // -1..1 depth (W/S)
  interact: boolean; // E / Space / Enter edge
  accept: boolean; // Tab / F edge
  reject: boolean; // R edge
  inspect: boolean; // Q held (or long-press)
  pause: boolean; // Esc edge
  num: number; // 1..3 edge, 0 = none
  dx: number; // left/right edge, for menus and stamps
  any: boolean;
}

export class Input {
  private held = new Set<string>();
  private edges = new Set<string>();
  /** Set by the game: true while a suggestion is on screen (Tab is captured). */
  capturesTab = () => false;
  acceptKey: "tab" | "f" = "tab";
  /** Touch long-press sets this. */
  touchInspect = false;
  touchAx = 0;

  constructor(private el: HTMLElement) {
    el.addEventListener("keydown", this.onDown);
    el.addEventListener("keyup", this.onUp);
    el.addEventListener("focusout", this.clear);
    window.addEventListener("blur", this.clear);
  }

  destroy() {
    this.el.removeEventListener("keydown", this.onDown);
    this.el.removeEventListener("keyup", this.onUp);
    this.el.removeEventListener("focusout", this.clear);
    window.removeEventListener("blur", this.clear);
  }

  private clear = () => {
    this.held.clear();
  };

  private isField(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    const tag = t?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  private onDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (this.isField(e)) {
      if (e.key === "Escape") this.edges.add("Escape");
      return;
    }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const onButton = (e.target as HTMLElement | null)?.tagName === "BUTTON";
    if (k === "Tab") {
      if (this.capturesTab() && this.acceptKey === "tab") {
        e.preventDefault();
        if (!this.held.has(k)) this.edges.add(k);
        this.held.add(k);
      }
      return;
    }
    const game = ["a", "d", "w", "s", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "e", " ", "Enter", "f", "q", "r", "Escape", "1", "2", "3"];
    if (!game.includes(k)) return;
    // Let a focused button handle Space/Enter itself (it will click).
    if (onButton && (k === " " || k === "Enter")) return;
    if (k !== "Escape" || !onButton) e.preventDefault();
    if (!this.held.has(k)) this.edges.add(k);
    this.held.add(k);
  };

  private onUp = (e: KeyboardEvent) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    this.held.delete(k);
  };

  /** Called once per update tick; edges are consumed. */
  read(): Actions {
    const h = this.held;
    const e = this.edges;
    let ax = 0;
    if (h.has("a") || h.has("ArrowLeft")) ax -= 1;
    if (h.has("d") || h.has("ArrowRight")) ax += 1;
    if (!ax) ax = this.touchAx;
    let ay = 0;
    if (h.has("w") || h.has("ArrowUp")) ay -= 1;
    if (h.has("s") || h.has("ArrowDown")) ay += 1;
    const a: Actions = {
      ax,
      ay,
      interact: e.has("e") || e.has(" ") || e.has("Enter"),
      accept: (this.acceptKey === "tab" && e.has("Tab")) || e.has("f"),
      reject: e.has("r"),
      inspect: h.has("q") || this.touchInspect,
      pause: e.has("Escape"),
      num: e.has("1") ? 1 : e.has("2") ? 2 : e.has("3") ? 3 : 0,
      dx: e.has("a") || e.has("ArrowLeft") || e.has("w") || e.has("ArrowUp") ? -1 : e.has("d") || e.has("ArrowRight") || e.has("s") || e.has("ArrowDown") ? 1 : 0,
      any: e.size > 0,
    };
    e.clear();
    return a;
  }
}
