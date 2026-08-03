import { createDiv } from '../../../renderer/dom-utils';
import type { TimeUnit } from '../time/calendar';
import { visibleSlotWindow, type SlotAxis, type SlotWindow } from '../time/slot-axis';
import type { HeaderCell, ResolvedHeaderBand, Timeline } from '../time/timeline-engine';
import type { SchedulerModule, SchedulerRuntime } from '../scheduler-runtime';

/** Root class of the header. Fixed by `scheduler-styles.ts`. */
const HEADER_CLASS = 'pg-scheduler-header';
const INNER_CLASS = 'pg-scheduler-header__inner';
const BAND_CLASS = 'pg-scheduler-header__band';
const CELL_CLASS = 'pg-scheduler-header__cell';
const CELL_SLOT_CLASS = 'pg-scheduler-header__cell--slot';
const CELL_TODAY_CLASS = 'pg-scheduler-header__cell--today';
const CELL_NONWORKING_CLASS = 'pg-scheduler-header__cell--nonworking';

/**
 * Extra slot cells built either side of the viewport.
 *
 * Two, matching the grid's own column buffer and `visibleSlotWindow`'s default,
 * so the header and the grid's column virtualization extend their windows on the
 * same scroll positions rather than alternating.
 */
const SLOT_BUFFER = 2;

/**
 * Ceiling on retired header cells kept for reuse.
 *
 * A header row is bounded by the viewport width divided by the minimum useful
 * slot width, so a few hundred covers even a very wide monitor at minute
 * granularity; beyond that, retaining nodes would cost more than recreating the
 * handful that overflow.
 */
const MAX_POOLED_CELLS = 400;

/** Milliseconds in a day, for the ISO week arithmetic. */
const DAY_MS = 86_400_000;

/** Last values written to one header cell, so a reused cell writes nothing when nothing changed. */
interface CellState {
  left: number;
  width: number;
  text: string;
  today: boolean;
  nonWorking: boolean;
}

/** Empty window, used before the first render and whenever the axis is degenerate. */
const EMPTY_WINDOW: SlotWindow = { start: 0, end: 0 };

/**
 * The timeline header: one row per configured band, plus the slot row.
 *
 * ## Why it is not part of the grid's own header renderer
 *
 * The grid's header is a column header -- it exists to name and manipulate
 * `ColumnDef`s. A timeline header names *time*, has a variable number of stacked
 * rows, and its cells do not correspond to columns at all. Modelling slots as
 * columns would push thousands of synthetic `ColumnDef`s through the grid's
 * pipeline on every view change; instead the plugin gives this class a container
 * inside the header region and it paints into it directly.
 *
 * ## What makes it cheap
 *
 * The band rows are rebuilt only when the {@link Timeline} reference changes,
 * which the timeline engine guarantees happens only on a genuine view or range
 * change -- a scroll never touches them. The slot row is virtualized like the
 * bars are, and panning is a single `translateX` on one wrapper rather than a
 * reposition of every cell, so a horizontal scroll costs exactly one style write
 * no matter how many slots exist. Cells are pooled and every write is diffed
 * against the last value, so a cell that scrolls out and back in unchanged
 * writes nothing at all.
 *
 * Nothing here measures the DOM: widths and offsets come from the axis, and the
 * band rows are sized as a percentage of the container, so the header never
 * forces layout.
 */
export class SchedulerHeader implements SchedulerModule {
  /** The panned wrapper. Created on first render and reused for the header's lifetime. */
  private inner: HTMLElement | null = null;
  /** The virtualized slot row, the last child of {@link inner}. */
  private slotRow: HTMLElement | null = null;

  /** Slot cells currently mounted, keyed by slot index. */
  private readonly slotLive = new Map<number, HTMLElement>();
  /** Band cells currently mounted, flat across every band, for wholesale recycling. */
  private readonly bandCells: HTMLElement[] = [];
  /** Retired cells available for reuse, shared by the bands and the slot row. */
  private readonly cellPool: HTMLElement[] = [];
  /** Per-cell diff state. See {@link CellState}. */
  private readonly cellStates = new WeakMap<HTMLElement, CellState>();

  /**
   * One `Intl.DateTimeFormat` per unit, built on first use.
   *
   * Constructing a formatter is expensive -- it resolves a locale and compiles a
   * pattern -- and doing it per cell would dominate the cost of a view change.
   * `null` marks a unit whose label is computed arithmetically (week, quarter)
   * and therefore needs no formatter, so the miss is not retried every time.
   */
  private readonly formatters = new Map<TimeUnit, Intl.DateTimeFormat | null>();

  /** Local midnights of configured holidays, for O(1) lookup per slot. */
  private readonly holidayDays: ReadonlySet<number>;
  /** Weekend day indices, hoisted out of the config for the per-slot test. */
  private readonly weekendDays: readonly number[];
  /** Whether any non-working shading is wanted at all. */
  private readonly shadeNonWorking: boolean;

  /**
   * Reused `Date` for calendar field extraction.
   *
   * `getDay()` and `getDate()` need a `Date`, and allocating one per slot per
   * view change is pure garbage; `setTime` on a single instance is the same
   * arithmetic without the allocation. Safe because every use is synchronous and
   * the value is consumed before the next `setTime`.
   */
  private readonly scratchDate = new Date();

  /** Timeline the current DOM was built from. Reference equality is the rebuild trigger. */
  private builtTimeline: Timeline | null = null;
  /** Slot window the slot row currently covers. */
  private builtWindow: SlotWindow = EMPTY_WINDOW;
  /** Last width written to {@link inner}. */
  private builtWidth = Number.NaN;
  /** Last horizontal offset written, so a repeated scroll event writes nothing. */
  private scrollX = Number.NaN;

  /**
   * @param runtime - Shared scheduler state; the header reads the timeline and
   *   the non-working config and never mutates either.
   * @param hostEl - Container the plugin created inside the grid's header
   *   region. The header takes ownership of its children but not of the element
   *   itself, so the plugin remains responsible for placing and sizing it.
   */
  constructor(
    private readonly runtime: SchedulerRuntime,
    private readonly hostEl: HTMLElement,
  ) {
    const { nonWorking } = runtime.config;
    this.weekendDays = nonWorking.weekendDays;
    this.shadeNonWorking = nonWorking.shade;

    // Holidays arrive as arbitrary instants ("some time on the 25th"), but the
    // test is per day, so they are normalised once here rather than per slot.
    const days = new Set<number>();
    for (const holiday of nonWorking.holidays) days.add(startOfLocalDay(holiday, this.scratchDate));
    this.holidayDays = days;
  }

  /**
   * Builds or refreshes the header.
   *
   * Called once per rendered frame by the plugin. Almost every call is the cheap
   * path: the timeline is unchanged, so only the slot row is re-virtualized, and
   * if the visible slot window is also unchanged the method writes nothing.
   */
  render(): void {
    const inner = this.ensureInner();
    const timeline = this.runtime.timeline;

    if (this.builtTimeline !== timeline) {
      this.rebuild(inner, timeline);
      this.builtTimeline = timeline;
    }

    const { axis } = timeline;
    const totalPx = axis.totalPx;
    if (this.builtWidth !== totalPx) {
      inner.style.width = `${totalPx}px`;
      this.builtWidth = totalPx;
    }

    // Cached metrics, not a measurement: `getScrollMetrics` reads numbers the
    // scroll controller already holds and forces no layout.
    const metrics = this.runtime.ctx.getScrollMetrics();
    this.renderSlotRow(axis, metrics.scrollLeft, metrics.viewportWidth, timeline.config.unit);
  }

  /**
   * Pans the header to match the body's horizontal scroll.
   *
   * Called from the plugin's scroll listener, which fires synchronously during
   * the scroll -- ahead of the animation frame the grid books -- so this must stay
   * a single composited write. It is, and it is skipped entirely when the offset
   * has not moved, which matters because scroll events fire far more often than
   * the position actually changes on trackpads and momentum scrolling.
   *
   * When the pan uncovers slots outside the built window, a render is requested
   * rather than performed: building cells during a scroll event would extend the
   * event handler, whereas requesting one lets the work land in the frame the
   * grid was already going to render.
   */
  setScrollX(px: number): void {
    if (this.scrollX === px) return;
    this.scrollX = px;

    if (this.inner !== null) this.inner.style.transform = `translateX(${-px}px)`;

    const axis = this.runtime.timeline.axis;
    const { viewportWidth } = this.runtime.ctx.getScrollMetrics();
    const next = visibleSlotWindow(axis, px, viewportWidth, SLOT_BUFFER);
    if (next.start < this.builtWindow.start || next.end > this.builtWindow.end) {
      this.runtime.requestRender();
    }
  }

  /**
   * Releases the header's DOM and caches.
   *
   * The host element itself is left in place: the plugin created it and may be
   * reusing it, and removing another owner's element from its parent is exactly
   * the kind of cross-ownership teardown that leaves a grid with a hole in it.
   */
  destroy(): void {
    if (this.inner !== null) this.inner.remove();
    this.inner = null;
    this.slotRow = null;

    this.slotLive.clear();
    this.bandCells.length = 0;
    this.cellPool.length = 0;
    this.formatters.clear();

    this.builtTimeline = null;
    this.builtWindow = EMPTY_WINDOW;
    this.builtWidth = Number.NaN;
    this.scrollX = Number.NaN;
  }

  // -- Structure ------------------------------------------------------------

  /** Creates the panned wrapper on first render. */
  private ensureInner(): HTMLElement {
    if (this.inner !== null) return this.inner;

    // Idempotent, and it makes the header self-contained: the theme's custom
    // properties are declared on `.pg-scheduler-header`, so a host container
    // that forgot the class would render unthemed cells.
    this.hostEl.classList.add(HEADER_CLASS);

    const inner = createDiv(INNER_CLASS);
    this.hostEl.appendChild(inner);
    this.inner = inner;
    return inner;
  }

  /**
   * Rebuilds every band row and resets the slot row.
   *
   * Only reached on a view or range change. Band cells are not virtualized
   * because a band is coarse by construction -- the outer rows of a timeline are
   * months, quarters or years, so even a decade-long range produces tens of
   * cells, and virtualizing them would cost more bookkeeping than it saves.
   */
  private rebuild(inner: HTMLElement, timeline: Timeline): void {
    for (const cell of this.bandCells) this.releaseCell(cell);
    this.bandCells.length = 0;
    for (const cell of this.slotLive.values()) this.releaseCell(cell);
    this.slotLive.clear();
    this.builtWindow = EMPTY_WINDOW;

    while (inner.firstChild) inner.removeChild(inner.firstChild);

    // Rows share the header's height evenly. A percentage rather than a pixel
    // value because the header's own height is the grid's business, and reading
    // it back would be a layout-forcing measurement for no gain.
    const rowCount = timeline.bands.length + 1;
    const rowHeight = `${100 / rowCount}%`;

    for (const band of timeline.bands) {
      inner.appendChild(this.buildBand(band, rowHeight));
    }

    const slotRow = createDiv(BAND_CLASS);
    slotRow.style.height = rowHeight;
    inner.appendChild(slotRow);
    this.slotRow = slotRow;
  }

  /** Builds one band row with all of its cells. */
  private buildBand(band: ResolvedHeaderBand, rowHeight: string): HTMLElement {
    const row = createDiv(BAND_CLASS);
    row.style.height = rowHeight;

    for (let i = 0; i < band.cells.length; i++) {
      const cell: HeaderCell = band.cells[i];
      const el = this.acquireCell(false);
      this.applyCell(el, cell.offsetPx, cell.widthPx, this.formatLabel(band.unit, cell.startMs), false, false);
      row.appendChild(el);
      this.bandCells.push(el);
    }

    return row;
  }

  // -- Slot row -------------------------------------------------------------

  /**
   * Mounts exactly the slot cells the viewport can see, plus the buffer.
   *
   * Keyed by slot index rather than by position, so a cell that stays visible
   * across a scroll keeps its element *and* its cached values -- which is what
   * makes a small scroll write only the handful of cells that genuinely entered
   * or left.
   */
  private renderSlotRow(axis: SlotAxis, scrollLeft: number, viewportWidth: number, unit: TimeUnit): void {
    const row = this.slotRow;
    if (row === null) return;

    const next = visibleSlotWindow(axis, scrollLeft, viewportWidth, SLOT_BUFFER);
    if (next.start === this.builtWindow.start && next.end === this.builtWindow.end) return;

    for (const [index, el] of this.slotLive) {
      if (index >= next.start && index < next.end) continue;
      this.slotLive.delete(index);
      this.releaseCell(el);
    }

    const todayIndex = this.todaySlot(axis);

    for (let i = next.start; i < next.end; i++) {
      let el = this.slotLive.get(i);
      if (el === undefined) {
        el = this.acquireCell(true);
        this.slotLive.set(i, el);
        row.appendChild(el);
      }
      const startMs = axis.timeOf(i);
      this.applyCell(
        el,
        axis.offsetOf(i),
        axis.widthOf(i),
        this.formatLabel(unit, startMs),
        i === todayIndex,
        this.isNonWorking(unit, startMs),
      );
    }

    this.builtWindow = next;
  }

  /** Slot containing the current instant, or `-1` when now falls outside the timeline. */
  private todaySlot(axis: SlotAxis): number {
    const now = Date.now();
    if (now < axis.startMs || now >= axis.endMs) return -1;
    return axis.indexAt(axis.pxAt(now));
  }

  /**
   * Whether a slot is a weekend or a configured holiday.
   *
   * Only asked of day-or-finer units: a month or quarter slot spans both working
   * and non-working days, so shading the whole cell would assert something
   * false. Coarse units therefore always report `false` rather than reporting
   * whatever their first instant happens to be.
   */
  private isNonWorking(unit: TimeUnit, startMs: number): boolean {
    if (!this.shadeNonWorking) return false;
    if (unit !== 'minute' && unit !== 'hour' && unit !== 'day') return false;

    this.scratchDate.setTime(startMs);
    const day = this.scratchDate.getDay();
    for (let i = 0; i < this.weekendDays.length; i++) {
      if (this.weekendDays[i] === day) return true;
    }

    return this.holidayDays.has(startOfLocalDay(startMs, this.scratchDate));
  }

  // -- Cells ----------------------------------------------------------------

  /** Takes a cell from the pool or creates one, with the slot modifier applied as asked. */
  private acquireCell(slot: boolean): HTMLElement {
    const el = this.cellPool.pop() ?? this.createCell();
    // Class is rewritten wholesale rather than toggled: a pooled cell may have
    // come from either row, and one assignment is cheaper than three toggles.
    el.className = slot ? `${CELL_CLASS} ${CELL_SLOT_CLASS}` : CELL_CLASS;

    const state = this.cellStates.get(el) as CellState;
    // The class reset dropped the state modifiers, so the cache must forget
    // them or the next diff would skip re-applying them.
    state.today = false;
    state.nonWorking = false;
    return el;
  }

  /** Detaches a cell and returns it to the pool. */
  private releaseCell(el: HTMLElement): void {
    el.remove();
    if (this.cellPool.length < MAX_POOLED_CELLS) this.cellPool.push(el);
  }

  /** Builds an empty cell along with its diff state. */
  private createCell(): HTMLElement {
    const el = createDiv(CELL_CLASS);
    this.cellStates.set(el, {
      left: Number.NaN,
      width: Number.NaN,
      text: '',
      today: false,
      nonWorking: false,
    });
    return el;
  }

  /**
   * Writes a cell's geometry, label and state modifiers, skipping every value
   * that already holds.
   *
   * Uses `left`/`width` rather than a transform, unlike the event bars: a header
   * cell is inside a wrapper that is itself transformed, so the cell's own
   * position is static from the compositor's point of view and never re-written
   * on a scroll. The bars have no such wrapper per row, which is why they pay for
   * a transform each and these do not.
   */
  private applyCell(
    el: HTMLElement,
    left: number,
    width: number,
    text: string,
    today: boolean,
    nonWorking: boolean,
  ): void {
    const state = this.cellStates.get(el) as CellState;

    if (state.left !== left) {
      el.style.left = `${left}px`;
      state.left = left;
    }
    if (state.width !== width) {
      el.style.width = `${width}px`;
      state.width = width;
    }
    if (state.text !== text) {
      // `textContent`: labels are formatter output today, but a host locale can
      // produce anything and markup must never be a possibility here.
      el.textContent = text;
      state.text = text;
    }
    if (state.today !== today) {
      el.classList.toggle(CELL_TODAY_CLASS, today);
      state.today = today;
    }
    if (state.nonWorking !== nonWorking) {
      el.classList.toggle(CELL_NONWORKING_CLASS, nonWorking);
      state.nonWorking = nonWorking;
    }
  }

  // -- Labels ---------------------------------------------------------------

  /**
   * Formats one cell's label for a unit.
   *
   * Each unit gets the shortest label that stays unambiguous at its own
   * granularity, because header cells are as narrow as the slot width and an
   * ellipsised label communicates nothing. Weeks and quarters are computed
   * rather than formatted: no locale exposes an ISO week number or a quarter
   * label through `Intl` at the precision this needs.
   */
  private formatLabel(unit: TimeUnit, t: number): string {
    switch (unit) {
      case 'week':
        return `W${isoWeekNumber(t)}`;
      case 'quarter': {
        this.scratchDate.setTime(t);
        return `Q${Math.floor(this.scratchDate.getMonth() / 3) + 1}`;
      }
      case 'day': {
        // Day-of-month first, weekday second: the number is what the eye scans
        // for, and it is the part that stays put when the locale changes.
        this.scratchDate.setTime(t);
        const dayOfMonth = this.scratchDate.getDate();
        const formatter = this.getFormatter(unit);
        return formatter === null ? String(dayOfMonth) : `${dayOfMonth} ${formatter.format(t)}`;
      }
      default: {
        const formatter = this.getFormatter(unit);
        return formatter === null ? '' : formatter.format(t);
      }
    }
  }

  /** Returns the cached formatter for a unit, building it on first use. */
  private getFormatter(unit: TimeUnit): Intl.DateTimeFormat | null {
    const cached = this.formatters.get(unit);
    if (cached !== undefined) return cached;

    const formatter = buildFormatter(unit);
    this.formatters.set(unit, formatter);
    return formatter;
  }
}

/** Builds the formatter for a unit, or `null` for units labelled arithmetically. */
function buildFormatter(unit: TimeUnit): Intl.DateTimeFormat | null {
  switch (unit) {
    // `hour12: false` explicitly rather than by locale: the header is a ruler,
    // and a 12-hour ruler repeats every label twice a day.
    case 'minute':
      return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
    case 'hour':
      return new Intl.DateTimeFormat(undefined, { hour: '2-digit', hour12: false });
    case 'day':
      return new Intl.DateTimeFormat(undefined, { weekday: 'short' });
    case 'month':
      return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });
    case 'year':
      return new Intl.DateTimeFormat(undefined, { year: 'numeric' });
    default:
      return null;
  }
}

/**
 * Local midnight of the day containing `t`.
 *
 * Local rather than UTC, deliberately: a holiday is a civil date, and comparing
 * in UTC would move it across a day boundary for every user east or west of
 * Greenwich. Takes a scratch `Date` so callers on the hot path allocate nothing.
 */
function startOfLocalDay(t: number, scratch: Date): number {
  scratch.setTime(t);
  scratch.setHours(0, 0, 0, 0);
  return scratch.getTime();
}

/**
 * ISO-8601 week number of the week containing `t`.
 *
 * Weeks are numbered by the year of their Thursday, which is why the date is
 * shifted before the year is read -- a naive "day of year divided by seven"
 * disagrees with every calendar application in the first and last week of a
 * year. Allocates two `Date`s, which is acceptable because it is only reached
 * for week-unit header cells and only on a view change.
 */
function isoWeekNumber(t: number): number {
  const date = new Date(t);
  date.setHours(0, 0, 0, 0);
  // Move to the Thursday of this ISO week ((day + 6) % 7 makes Monday index 0).
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));

  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const offsetDays = (date.getTime() - firstThursday.getTime()) / DAY_MS;
  return 1 + Math.round((offsetDays - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}
