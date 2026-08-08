import type { RenderWindow } from '../../plugin.types';
import type { SchedulerModule, SchedulerRuntime } from '../scheduler-runtime';
import { visibleSlotWindow } from '../time/slot-axis';
import { startOf } from '../time/calendar';

/**
 * Draws everything behind the event bars: slot columns, row separators,
 * non-working shading, the today column and the current-time marker.
 *
 * Split from the bar renderer because the two have completely different change
 * rates. Bars move whenever an event does; the backdrop only changes when the
 * timeline, the slot window or the row window changes — so keeping them apart
 * means a drag repaints bars without touching a single gridline.
 *
 * ## Why the scheduler draws its own row separators
 *
 * The grid already draws a bottom border on every `.pg-row`, but those rows live
 * inside the column panels. With every resource column pinned left, the centre
 * panel is empty, so there is nothing under the timeline to carry a line. Rather
 * than depend on that accident, the backdrop draws its own separators from the
 * same `RenderWindow.rows` the bars are positioned from — which is what
 * guarantees they line up with the left-hand section exactly, at any scroll
 * offset and with any row height.
 */
export class SchedulerBackdrop implements SchedulerModule {
  private canvasEl: HTMLElement | null = null;

  private readonly colPool: HTMLElement[] = [];
  private readonly liveCols = new Map<number, HTMLElement>();
  private readonly linePool: HTMLElement[] = [];
  private readonly liveLines: HTMLElement[] = [];
  private nowEl: HTMLElement | null = null;

  /** Last-written values, so an unchanged frame writes nothing. */
  private builtWidth = -1;
  private builtSlotStart = -1;
  private builtSlotEnd = -1;
  private builtBandTop = Number.NaN;
  private builtBandHeight = -1;
  private builtRowCount = -1;
  /**
   * Band top as of the last row-line pass.
   *
   * Tracked separately from the column pass: columns run first and update
   * their own `builtBandTop`, so a shared field would always compare equal
   * here and the lines would never move -- they would stay where the first
   * frame put them and drift away from the rows on every scroll.
   */
  private builtLinesBandTop = Number.NaN;
  private builtNowPx = Number.NaN;

  private readonly weekendDays: readonly number[];
  private readonly holidayDays: ReadonlySet<number>;
  private readonly shade: boolean;

  constructor(
    private readonly runtime: SchedulerRuntime,
    private readonly layerEl: HTMLElement,
  ) {
    const { nonWorking } = runtime.config;
    this.weekendDays = nonWorking.weekendDays;
    this.shade = nonWorking.shade;

    const days = new Set<number>();
    for (const holiday of nonWorking.holidays) days.add(startOf('day', holiday));
    this.holidayDays = days;
  }

  /**
   * Repaints the backdrop for one frame.
   *
   * Everything is guarded on a cached value, so a pure horizontal scroll that
   * does not uncover a new slot, and a vertical scroll that does not change the
   * rendered row band, both write nothing at all.
   */
  render(window: RenderWindow): void {
    const canvas = this.ensureCanvas();
    const { axis } = this.runtime.timeline;

    if (this.builtWidth !== axis.totalPx) {
      canvas.style.width = `${axis.totalPx}px`;
      this.builtWidth = axis.totalPx;
    }

    // The vertical band the rendered rows occupy, in the layer's rebased space.
    // Columns are sized to this rather than to the viewport so they can never
    // drift from the rows they sit behind.
    const rows = window.rows;
    const bandTop = rows.length ? rows[0].top - window.rowOriginY : 0;
    const last = rows[rows.length - 1];
    const bandHeight = rows.length
      ? last.top + (last.height ?? window.rowHeight) - window.rowOriginY - bandTop
      : 0;

    this.renderColumns(canvas, window, bandTop, bandHeight);
    this.renderRowLines(canvas, window);
    this.renderNowMarker(canvas, bandTop, bandHeight);
  }

  destroy(): void {
    this.liveCols.clear();
    this.liveLines.length = 0;
    this.colPool.length = 0;
    this.linePool.length = 0;
    this.nowEl = null;
    this.canvasEl?.remove();
    this.canvasEl = null;
  }

  // -- Internals -------------------------------------------------------------

  private ensureCanvas(): HTMLElement {
    if (this.canvasEl) return this.canvasEl;

    const el = document.createElement('div');
    el.className = 'pg-scheduler-canvas';
    // Behind the bars, which the layer appends after this.
    this.layerEl.insertBefore(el, this.layerEl.firstChild);
    this.canvasEl = el;
    return el;
  }

  /** Slot columns, virtualized to the visible window and recycled. */
  private renderColumns(
    canvas: HTMLElement,
    window: RenderWindow,
    bandTop: number,
    bandHeight: number,
  ): void {
    const { axis } = this.runtime.timeline;
    const { scrollLeft, viewportWidth } = window.scroll;
    const slots = visibleSlotWindow(axis, scrollLeft, viewportWidth, 2);

    const bandChanged = bandTop !== this.builtBandTop || bandHeight !== this.builtBandHeight;
    const windowChanged = slots.start !== this.builtSlotStart || slots.end !== this.builtSlotEnd;
    if (!bandChanged && !windowChanged) return;

    // Recycle anything that scrolled out of the window.
    for (const [index, el] of this.liveCols) {
      if (index < slots.start || index >= slots.end) {
        el.remove();
        this.liveCols.delete(index);
        if (this.colPool.length < 200) this.colPool.push(el);
      }
    }

    for (let i = slots.start; i < slots.end; i++) {
      let el = this.liveCols.get(i);
      const isNew = el === undefined;

      if (!el) {
        el = this.colPool.pop() ?? document.createElement('div');
        el.className = 'pg-scheduler-col';
        this.applyColumnTone(el, axis.timeOf(i));
        canvas.appendChild(el);
        this.liveCols.set(i, el);

        el.style.left = `${axis.offsetOf(i)}px`;
        el.style.width = `${axis.widthOf(i)}px`;
      } else if (windowChanged) {
        // A recycled element may have moved slot; re-tone only then.
        this.applyColumnTone(el, axis.timeOf(i));
      }

      // Position on creation as well as on a band change: a column that
      // scrolls in on a frame where the row band is unchanged would otherwise
      // never get a height and would collapse to nothing.
      if (bandChanged || isNew) {
        el.style.top = `${bandTop}px`;
        el.style.height = `${bandHeight}px`;
      }
    }

    this.builtSlotStart = slots.start;
    this.builtSlotEnd = slots.end;
    this.builtBandTop = bandTop;
    this.builtBandHeight = bandHeight;
  }

  /** Marks a column as weekend, holiday or today. */
  private applyColumnTone(el: HTMLElement, slotStart: number): void {
    el.classList.remove('pg-scheduler-col--nonworking', 'pg-scheduler-col--today');

    const day = startOf('day', slotStart);

    if (this.shade) {
      const dow = new Date(slotStart).getDay();
      if (this.weekendDays.includes(dow) || this.holidayDays.has(day)) {
        el.classList.add('pg-scheduler-col--nonworking');
      }
    }

    if (day === startOf('day', Date.now())) el.classList.add('pg-scheduler-col--today');
  }

  /**
   * Horizontal separators, one per rendered row.
   *
   * Positioned from the same rows the bars use, so they align with the pinned
   * resource columns by construction rather than by matching a row height
   * setting in two places.
   */
  private renderRowLines(canvas: HTMLElement, window: RenderWindow): void {
    const rows = window.rows;

    const bandTop = rows.length ? rows[0].top - window.rowOriginY : 0;
    if (rows.length === this.builtRowCount && bandTop === this.builtLinesBandTop) return;
    this.builtLinesBandTop = bandTop;

    while (this.liveLines.length > rows.length) {
      const el = this.liveLines.pop();
      if (!el) break;
      el.remove();
      if (this.linePool.length < 100) this.linePool.push(el);
    }

    for (let i = 0; i < rows.length; i++) {
      let el = this.liveLines[i];
      if (!el) {
        el = this.linePool.pop() ?? document.createElement('div');
        el.className = 'pg-scheduler-row-line';
        canvas.appendChild(el);
        this.liveLines[i] = el;
      }

      const row = rows[i];
      const bottom = row.top + (row.height ?? window.rowHeight) - window.rowOriginY;
      el.style.transform = `translateY(${bottom - 1}px)`;
    }

    this.builtRowCount = rows.length;
  }

  /** A 2px rule at the current instant, when it falls inside the timeline. */
  private renderNowMarker(canvas: HTMLElement, bandTop: number, bandHeight: number): void {
    if (!this.runtime.config.showNowMarker) return;

    const { axis } = this.runtime.timeline;
    const now = Date.now();

    if (now < axis.startMs || now >= axis.endMs) {
      this.nowEl?.remove();
      this.nowEl = null;
      this.builtNowPx = Number.NaN;
      return;
    }

    if (!this.nowEl) {
      this.nowEl = document.createElement('div');
      this.nowEl.className = 'pg-scheduler-now';
      canvas.appendChild(this.nowEl);
    }

    const px = axis.pxAt(now);
    if (px !== this.builtNowPx) {
      this.nowEl.style.left = `${px}px`;
      this.builtNowPx = px;
    }
    this.nowEl.style.top = `${bandTop}px`;
    this.nowEl.style.height = `${bandHeight}px`;
  }
}
