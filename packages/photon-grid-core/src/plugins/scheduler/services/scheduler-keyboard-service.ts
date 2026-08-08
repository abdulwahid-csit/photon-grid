import type { SchedulerEvent } from '../data/scheduler.types';
import type { SchedulerModule, SchedulerRuntime } from '../scheduler-runtime';
import { SchedulerEventName } from '../scheduler-runtime';
import { barEventId, closestBar, type BarSource } from './event-selection-service';

/**
 * The slice of {@link EventSelectionService} this service drives.
 *
 * Structural, like {@link BarSource}, and for the same reason: keyboard
 * navigation needs to *ask* for selection changes, not own them, and typing the
 * dependency this narrowly means the two services can be constructed in either
 * order and tested apart. The real service satisfies it without declaring that
 * it does.
 */
export interface SchedulerSelectionPort {
  /** Replaces (or extends) the selection. */
  select(ids: string[], additive?: boolean): void;
  /** Clears the selection. */
  clear(): void;
  /** The currently selected events. */
  getSelected(): readonly SchedulerEvent[];
}

/** Payload of {@link SchedulerEventName.BeforeDelete} and `AfterDelete`. */
export interface SchedulerDeletePayload {
  readonly event: SchedulerEvent;
}

/**
 * Keyboard navigation, selection and deletion over event bars.
 *
 * Bars carry `tabindex=0`, so the browser's own focus model does the hard part;
 * this service only translates keys into focus moves and selection calls. Every
 * handled key calls `preventDefault`, which is what stops Space from scrolling
 * the page and the arrows from scrolling the grid out from under the focused
 * bar.
 *
 * ## Two different notions of "next"
 *
 * Horizontal movement is a **model** question -- the next event on this resource
 * by start time -- and is answered through the event index, bounded by the
 * timeline's own range. It therefore reaches events that are scrolled out of
 * view, which is what makes arrowing along a resource usable.
 *
 * Vertical movement is a **visual** question -- the adjacent row -- and rows only
 * exist in the rendered placements, in the grid's row order. So Up/Down walk the
 * resources that have bars in the current frame. The consequence, deliberate and
 * worth knowing: a resource with no events in view is skipped rather than
 * focused, because there is nothing on it to focus.
 */
export class SchedulerKeyboardService implements SchedulerModule {
  private readonly abort = new AbortController();
  private readonly bars: BarSource;
  private readonly selection: SchedulerSelectionPort;

  /** Reused by index queries so a held-down arrow key allocates nothing. */
  private readonly queryScratch: number[] = [];

  /**
   * @param runtime - Shared scheduler state; the index is read for navigation
   *   and written by deletion.
   * @param layerEl - Layer holding the bars. The listener is delegated here, so
   *   it only ever sees keys pressed while focus is inside the scheduler and
   *   cannot hijack typing anywhere else in the grid.
   * @param bars - Renderer accessor, used to move focus and to read row order.
   * @param selection - Selection service, typed as {@link SchedulerSelectionPort}.
   */
  constructor(
    private readonly runtime: SchedulerRuntime,
    layerEl: HTMLElement,
    bars: BarSource,
    selection: SchedulerSelectionPort,
  ) {
    this.bars = bars;
    this.selection = selection;
    layerEl.addEventListener('keydown', this.onKeyDown, { signal: this.abort.signal });
  }

  /** Moves DOM focus to an event's bar, when that bar is currently rendered. */
  focusEvent(id: string): boolean {
    const el = this.bars.getBarElement(id);
    if (el === null) return false;
    el.focus();
    return true;
  }

  /** Removes the listener. Focus is left wherever the user put it. */
  destroy(): void {
    this.abort.abort();
  }

  // -- Internals -------------------------------------------------------------

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const barEl = closestBar(e.target);
    const currentId = barEl === null ? null : barEventId(barEl);

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        const next = this.horizontal(currentId, e.key === 'ArrowRight' ? 1 : -1);
        if (next !== null && this.focusEvent(next)) e.preventDefault();
        return;
      }

      case 'ArrowUp':
      case 'ArrowDown': {
        const next = this.vertical(currentId, e.key === 'ArrowDown' ? 1 : -1);
        if (next !== null && this.focusEvent(next)) e.preventDefault();
        return;
      }

      case ' ':
      case 'Spacebar':
      case 'Enter': {
        if (currentId === null) return;
        e.preventDefault();
        this.toggle(currentId);
        return;
      }

      case 'Escape': {
        e.preventDefault();
        this.selection.clear();
        return;
      }

      case 'Delete':
      case 'Backspace': {
        this.deleteSelected(e);
        return;
      }

      default:
        return;
    }
  };

  /**
   * The previous or next event on the same resource, by start time.
   *
   * With no bar focused this falls back to the first bar of the frame, so a
   * user who tabs into the layer and presses an arrow lands somewhere sensible
   * instead of nowhere.
   *
   * The index query is bounded by the timeline's own range rather than by
   * infinity: an event outside the current range cannot be scrolled to without
   * changing the view, so focusing it would move focus somewhere invisible.
   *
   * Ties on `start` are broken by id, which keeps the traversal total --
   * otherwise two events starting at the same instant would trap the focus
   * bouncing between them.
   */
  private horizontal(currentId: string | null, direction: 1 | -1): string | null {
    if (currentId === null) return this.firstRenderedEventId();

    const current = this.runtime.getEvent(currentId);
    if (current === undefined) return this.firstRenderedEventId();

    const axis = this.runtime.timeline.axis;
    const hits = this.queryScratch;
    hits.length = 0;

    if (direction === 1) {
      this.runtime.index.query(current.resourceId, current.start, axis.endMs, hits);
    } else {
      // `+ 1` because the range is half-open and events starting at exactly this
      // instant are legitimate backward candidates once the id tie-break runs.
      this.runtime.index.query(current.resourceId, axis.startMs, current.start + 1, hits);
    }

    let best: SchedulerEvent | undefined;

    for (const handle of hits) {
      const candidate = this.runtime.index.get(handle);
      if (candidate === undefined || candidate.id === current.id) continue;
      if (!isBeyond(candidate, current, direction)) continue;
      if (best === undefined || isBeyond(best, candidate, direction)) best = candidate;
    }

    return best?.id ?? null;
  }

  /**
   * The nearest event on the adjacent rendered resource.
   *
   * "Nearest" is measured on `start`, not on pixels, so the choice is stable
   * across zoom levels and view changes -- two bars that look equally close in a
   * year view are not equally close in an hour view, but their start times rank
   * the same either way.
   */
  private vertical(currentId: string | null, direction: 1 | -1): string | null {
    const placements = this.bars.getPlacements();
    if (placements.length === 0) return null;

    const current = currentId === null ? undefined : this.runtime.getEvent(currentId);
    if (current === undefined) return this.firstRenderedEventId();

    // Placements arrive in row order, so the first appearance of each resource
    // id is that resource's row position. Built per keypress rather than cached
    // because the frame it describes is replaced on every scroll.
    const resources: string[] = [];
    for (const placement of placements) {
      if (resources.indexOf(placement.resourceId) === -1) resources.push(placement.resourceId);
    }

    const from = resources.indexOf(current.resourceId);
    if (from === -1) return null;

    const to = from + direction;
    if (to < 0 || to >= resources.length) return null;

    const targetResource = resources[to];

    let bestId: string | null = null;
    let bestDistance = Infinity;

    for (const placement of placements) {
      if (placement.resourceId !== targetResource) continue;

      const candidate = this.runtime.index.get(placement.handle);
      if (candidate === undefined) continue;

      const distance = Math.abs(candidate.start - current.start);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestId = candidate.id;
      }
    }

    return bestId;
  }

  /** First bar of the current frame, used as the entry point for keyboard navigation. */
  private firstRenderedEventId(): string | null {
    const placements = this.bars.getPlacements();
    if (placements.length === 0) return null;

    const event = this.runtime.index.get(placements[0].handle);
    return event?.id ?? null;
  }

  /**
   * Toggles one event in the selection.
   *
   * Expressed through {@link SchedulerSelectionPort.select} rather than a
   * dedicated `toggle`, so the port stays at three members and the selection
   * service remains the only writer of the selection set -- including its
   * single/multiple mode enforcement and its change notification.
   */
  private toggle(id: string): void {
    const ids = this.selection.getSelected().map((event) => event.id);
    const at = ids.indexOf(id);

    if (at === -1) ids.push(id);
    else ids.splice(at, 1);

    this.selection.select(ids);
  }

  /**
   * Deletes the selected events.
   *
   * Gated on `drag.managed` because that flag is the scheduler's single answer
   * to "may this component mutate the data?". An unmanaged host owns
   * persistence, and silently dropping rows out of its index would desynchronise
   * it from its own store.
   *
   * Vetoed events survive and stay selected, so a partial rejection leaves the
   * user looking at exactly what was refused.
   */
  private deleteSelected(e: KeyboardEvent): void {
    if (!this.runtime.config.drag.managed) return;

    const selected = this.selection.getSelected();
    if (selected.length === 0) return;

    e.preventDefault();

    const survivors: string[] = [];
    let removed = 0;

    for (const event of selected) {
      const payload: SchedulerDeletePayload = { event };
      this.runtime.emit(SchedulerEventName.BeforeDelete, payload);

      if (this.runtime.raw.onBeforeDelete?.(event) === false) {
        survivors.push(event.id);
        continue;
      }

      this.runtime.index.remove(event.id);
      removed++;

      this.runtime.emit(SchedulerEventName.AfterDelete, payload);
      this.runtime.raw.onAfterDelete?.(event);
    }

    if (removed === 0) return;

    // Reselecting the survivors both drops the deleted ids from the selection
    // set and triggers the selection service's own repaint and notification, so
    // no extra render request is needed here.
    this.selection.select(survivors);
    this.runtime.emit(SchedulerEventName.EventsChanged, { removed });
  }
}

/**
 * Whether `candidate` lies after (`direction === 1`) or before (`-1`) `origin`
 * in the total order used for horizontal navigation.
 */
function isBeyond(candidate: SchedulerEvent, origin: SchedulerEvent, direction: 1 | -1): boolean {
  if (candidate.start !== origin.start) {
    return direction === 1 ? candidate.start > origin.start : candidate.start < origin.start;
  }
  return direction === 1 ? candidate.id > origin.id : candidate.id < origin.id;
}
