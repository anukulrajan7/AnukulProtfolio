// Fixed-step 60 Hz update with a render per animation frame. Pauses on tab blur.
const STEP = 1 / 60;

export class Loop {
  private raf = 0;
  private last = 0;
  private acc = 0;
  running = false;
  /** Smoothed render fps for the dev overlay. */
  fps = 60;
  private frames = 0;
  private fpsT = 0;
  time = 0;

  constructor(
    private update: (dt: number) => void,
    private render: (t: number) => void,
  ) {}

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    const tick = (now: number) => {
      if (!this.running) return;
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.25) dt = 0.25;
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 5) {
        this.update(STEP);
        this.time += STEP;
        this.acc -= STEP;
        n++;
      }
      if (n === 5) this.acc = 0;
      this.render(this.time + this.acc);
      this.frames++;
      this.fpsT += dt;
      if (this.fpsT >= 0.5) {
        this.fps = Math.round(this.frames / this.fpsT);
        this.frames = 0;
        this.fpsT = 0;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
