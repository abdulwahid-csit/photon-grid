const SCROLL_ZONE = 60;
const SCROLL_SPEED_MAX = 18;
const RAF_INTERVAL = 16;

export class DragAutoscroll {
  private scrollEl: HTMLElement | null = null;
  private rafId: number | null = null;
  private mouseX = 0;
  private mouseY = 0;

  attach(scrollEl: HTMLElement): void {
    this.scrollEl = scrollEl;
  }

  detach(): void {
    this.stop();
    this.scrollEl = null;
  }

  onMouseMove(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  start(): void {
    if (this.rafId !== null) return;
    const tick = () => {
      this.scroll();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private scroll(): void {
    if (!this.scrollEl) return;
    const rect = this.scrollEl.getBoundingClientRect();

    const relX = this.mouseX - rect.left;
    const relY = this.mouseY - rect.top;

    let dx = 0;
    let dy = 0;

    if (relY < SCROLL_ZONE) {
      dy = -this.calcSpeed(relY);
    } else if (relY > rect.height - SCROLL_ZONE) {
      dy = this.calcSpeed(rect.height - relY);
    }

    if (relX < SCROLL_ZONE) {
      dx = -this.calcSpeed(relX);
    } else if (relX > rect.width - SCROLL_ZONE) {
      dx = this.calcSpeed(rect.width - relX);
    }

    if (dx !== 0 || dy !== 0) {
      this.scrollEl.scrollBy(dx, dy);
    }
  }

  private calcSpeed(distanceFromEdge: number): number {
    const ratio = Math.max(0, Math.min(1, 1 - distanceFromEdge / SCROLL_ZONE));
    return Math.round(ratio * ratio * SCROLL_SPEED_MAX);
  }
}
