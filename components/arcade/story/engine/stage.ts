// Canvas sizing: logical 640x360, rendered at min(devicePixelRatio, 2),
// scaled to fit the container width.
import { H, W } from "./palette";

export class Stage {
  ctx: CanvasRenderingContext2D;
  /** CSS px per logical px. */
  scale = 1;
  /** Device px per logical px. */
  px = 1;
  private ro: ResizeObserver | null = null;

  constructor(
    public canvas: HTMLCanvasElement,
    public host: HTMLElement,
  ) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.resize();
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(host);
    }
  }

  resize() {
    const w = Math.max(200, this.host.clientWidth);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.scale = w / W;
    this.px = this.scale * dpr;
    const bw = Math.round(W * this.px);
    const bh = Math.round(H * this.px);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
  }

  begin() {
    const c = this.ctx;
    c.setTransform(this.px, 0, 0, this.px, 0, 0);
    c.lineJoin = "round";
    c.lineCap = "round";
    return c;
  }

  /** Client (CSS) coords → logical stage coords. */
  toLogical(clientX: number, clientY: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [((clientX - r.left) / r.width) * W, ((clientY - r.top) / r.height) * H];
  }

  destroy() {
    this.ro?.disconnect();
  }
}
