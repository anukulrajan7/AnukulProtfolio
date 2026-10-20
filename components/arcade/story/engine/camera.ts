import { clamp, damp, lerp } from "./rng";
import { W } from "./palette";

const DEADZONE = 96;

export class Camera {
  x = 0;
  zoom = 1;
  private targetZoom = 1;
  private shakeT = 0;
  shakeX = 0;
  shakeY = 0;
  reduced = false;

  snapTo(px: number, sceneW: number) {
    this.x = clamp(px - W / 2, 0, Math.max(0, sceneW - W));
  }

  follow(px: number, sceneW: number, dt: number) {
    const left = this.x + W / 2 - DEADZONE / 2;
    const right = this.x + W / 2 + DEADZONE / 2;
    let tx = this.x;
    if (px < left) tx = px - (W / 2 - DEADZONE / 2);
    else if (px > right) tx = px - (W / 2 + DEADZONE / 2);
    tx = clamp(tx, 0, Math.max(0, sceneW - W));
    this.x = lerp(this.x, tx, damp(0.12, dt));
    if (Math.abs(this.x - tx) < 0.05) this.x = tx;
    this.zoom = this.reduced ? 1 : lerp(this.zoom, this.targetZoom, damp(0.1, dt));
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = Math.min(2, this.shakeT * 10);
      this.shakeX = (Math.random() * 2 - 1) * a;
      this.shakeY = (Math.random() * 2 - 1) * a;
    } else this.shakeX = this.shakeY = 0;
  }

  punchIn(on: boolean) {
    this.targetZoom = on ? 1.06 : 1;
  }

  shake(s = 0.3) {
    if (!this.reduced) this.shakeT = s;
  }

  /** Apply the transform for a parallax layer with factor f. */
  apply(ctx: CanvasRenderingContext2D, f: number) {
    ctx.translate(W / 2 + this.shakeX, 180 + this.shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-W / 2, -180);
    ctx.translate(-this.x * f, 0);
  }

  /** World (play layer) → logical screen coords. */
  toScreen(wx: number, wy: number): [number, number] {
    return [(wx - this.x - W / 2) * this.zoom + W / 2 + this.shakeX, (wy - 180) * this.zoom + 180 + this.shakeY];
  }

  toWorld(sx: number, sy: number): [number, number] {
    return [(sx - W / 2) / this.zoom + W / 2 + this.x, (sy - 180) / this.zoom + 180];
  }
}
