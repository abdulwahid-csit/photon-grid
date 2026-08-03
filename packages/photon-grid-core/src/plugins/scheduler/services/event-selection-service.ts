import type { BarPlacement } from '../layout/bar-layout';
import type { SchedulerEvent } from '../data/scheduler.types';
import type { SchedulerModule, SchedulerRuntime } from '../scheduler-runtime';
import { SchedulerEventName } from '../scheduler-runtime';

/**
 * The slice of the bar renderer the interaction services actually need.
 *
 * Declared structurally, and deliberately **not** imported from the renderer:
 * the services would otherwise pull the whole rendering module graph into their
 * own, which makes them impossible to unit test without a DOM and couples two
 * subsystems that only ever exchange two questions -- "where is the element for
 * this event?" and "what did you paint this frame?". A test supplies a plain
 * object literal; the plugin supplies the real `EventBarRenderer`, which
 * satisfies this shape without declaring that it does.
 *
 * Both members are cheap accessors over state the renderer already holds, so
 * calling them per pointer move costs nothing.
 */
export interface BarSource {
  /** The live element for an event id, or `null` when the bar is not currently rendered. */
  getBarElement(id: string): HTMLElement | null;
  /** This frame's placements, in row order. Read-only -- services never mutate it. */
  getPlacements(): readonly BarPlacement[];
}

/**
 * Selector for an event bar.
 *
 * Mirrors `theme/scheduler-styles.ts` by hand because that module exports one
 * opaque CSS string; there is no structured source to derive the name from. Kept
 * here as the single definition every service imports, so a rename in the
 * stylesheet is a one-line change on this side rather than four.
 */
export const BAR_SELECTOR = '.pg-scheduler-bar';

/** Attribute the renderer stamps each bar with, and the only link from DOM back to the model. */
export const BAR_ID_ATTRIBUTE = 'data-event-id';

/**
 * Walks up from an event target to the bar element that contains it.
 *
 * Delegation is the only viable strategy here: a dense view paints hundreds of
 * bars per frame and recycles them, so per-element listeners would mean hundreds
 * of add/remove pairs per scroll frame and a leak for every recycled node that
 * missed its removal. One listener on the layer costs one `closest` call per
 * user gesture instead.
 *
 * `closest` is feature-detected rather than the target being `instanceof
 * Element`, because the package's tests run in a `node` environment where the
 * `Element` global does not exist and the DOM stub would fail the check.
 */
export function closestBar(target: EventTarget | null): HTMLElement | null {
  const el = target as Element | null;
  if (el === null || typeof el.closest !== 'function') return null;
  return el.closest(BAR_SELECTOR) as HTMLElement | null;
}

/** Reads the event id off a bar element, or `null` when the renderer has not stamped one. */
export function barEventId(el: HTMLElement): string | null {
  const id = el.getAttribute(BAR_ID_ATTRIBUTE);
  return id === null || id === '' ? null : id;
}

/** Payload of {@link SchedulerEventName.SelectionChanged}. */
export interface SchedulerSelectionChangedPayload {
  /** Selected ids, in selection order. */
  readonly ids: readonly string[];
  /** The resolved events, so a listener does not have to look each one up. */
  readonly events: readonly SchedulerEvent[];
}

/** Payload of {@link SchedulerEventName.EventClicked} and `EventDoubleClicked`. */
export interface SchedulerEventPointerPayload {
  readonly event: SchedulerEvent;
  /** The originating DOM event, for hosts that need modifier keys or coordinates. */
  readonly native: MouseEvent;
}

/**
 * Click-driven selection over event bars.
 *
 * ## Ordering used by range (shift-click) selection
 *
 * A range needs a total order over events, and the only order the user perceives
 * is "down the rows, then left to right". This service approximates it by
 * sorting candidates by **`(resourceId, start)` lexicographically** -- resource id
 * ascending as the primary key, event start ascending as the secondary, event id
 * as a final tie-break so the order is total and stable.
 *
 * That is an approximation with one known trade-off: when the grid is sorted or
 * grouped, resource-id order is not row order, so a shift-click can include a
 * resource the user sees elsewhere on screen. The alternative -- deriving order
 * from the rendered placements -- was rejected because placements are
 * virtualized: the same two clicks would select different sets depending on how
 * far the user had scrolled, and a range spanning more rows than fit in the
 * viewport would silently truncate. A stable, complete, slightly abstract order
 * beats an intuitive one that changes under scroll.
 *
 * ## Why the selection set is mutated in place
 *
 * `SchedulerRuntime.selection` is handed to the renderer once and read every
 * frame. Replacing it would leave the renderer holding a stale set, so this
 * service mutates the same instance and announces the change through
 * {@link SchedulerRuntime.requestRender} plus the bus. It is the only writer.
 */
export class EventSelectionService implements SchedulerModule {
  /** One controller for every listener, so {@link destroy} is a single `abort()`. */
  private readonly abort = new AbortController();

  /**
   * Anchor for range selection: the last event picked by a plain or additive
   * click. Shift-click deliberately does not move it, which is what lets a user
   * widen and narrow the same range by shift-clicking repeatedly.
   */
  private anchorId: string | null = null;

  private readonly bars: BarSource;

  /**
   * @param runtime - Shared scheduler state. The selection set on it is owned by
   *   this service from construction until {@link destroy}.
   * @param layerEl - The plugin layer holding the bars. Listeners are delegated
   *   here rather than attached per bar.
   * @param bars - Renderer accessor, used only to move DOM focus onto the bar a
   *   click landed on, so keyboard navigation continues from where the pointer
   *   left off.
   */
  constructor(
    private readonly runtime: SchedulerRuntime,
    layerEl: HTMLElement,
    bars: BarSource,
  ) {
    this.bars = bars;
    const { signal } = this.abort;
    layerEl.addEventListener('click', this.onClick, { signal });
    layerEl.addEventListener('dblclick', this.onDoubleClick, { signal });
  }

  /**
   * Selects every event, optionally filtered.
   *
   * Replaces the current selection rather than adding to it, matching the
   * "select all" gesture everywhere else in the grid. In `'single'` mode this
   * necessarily selects only the first match, which is why the loop breaks
   * early rather than selecting and then discarding.
   *
   * @param predicate - Optional filter; return `true` to include the event.
   */
  selectAll(predicate?: (event: SchedulerEvent) => boolean): void {
    if (!this.runtime.config.selection.enabled) return;

    const selection = this.runtime.selection;
    const single = this.runtime.config.selection.mode === 'single';
    selection.clear();

    for (const event of this.runtime.allEvents()) {
      if (predicate !== undefined && !predicate(event)) continue;
      selection.add(event.id);
      if (single) break;
    }

    this.commit();
  }

  /**
   * Clears the selection.
   *
   * No-ops when nothing is selected, so a stray Escape does not cost a render
   * pass or a spurious `selectionChanged` on the host's bus.
   */
  clear(): void {
    if (this.runtime.selection.size === 0) return;
    this.runtime.selection.clear();
    this.anchorId = null;
    this.commit();
  }

  /**
   * Selects the given ids programmatically.
   *
   * Unknown ids are skipped rather than stored: a selection set containing ids
   * with no backing event would make {@link getSelected} lossy and would keep
   * ghosts alive across a data reload.
   *
   * @param ids - Event ids to select.
   * @param additive - When `true`, adds to the current selection instead of
   *   replacing it. Ignored in `'single'` mode, where the last id wins.
   */
  select(ids: readonly string[], additive = false): void {
    if (!this.runtime.config.selection.enabled) return;

    const selection = this.runtime.selection;
    if (!additive) selection.clear();

    for (const id of ids) {
      if (this.runtime.getEvent(id) === undefined) continue;
      selection.add(id);
    }

    this.enforceSingle();
    this.anchorId = ids.length > 0 ? ids[ids.length - 1] : null;
    this.commit();
  }

  /**
   * The selected events, resolved through the runtime.
   *
   * Allocates a fresh array, which is acceptable because this is only ever
   * called on a user gesture or by a host reading state -- never per frame.
   */
  getSelected(): readonly SchedulerEvent[] {
    const events: SchedulerEvent[] = [];
    for (const id of this.runtime.selection) {
      const event = this.runtime.getEvent(id);
      if (event !== undefined) events.push(event);
    }
    return events;
  }

  /** Whether an event id is currently selected. O(1). */
  isSelected(id: string): boolean {
    return this.runtime.selection.has(id);
  }

  /** Removes every listener. The selection set itself is left as-is for the plugin to discard. */
  destroy(): void {
    this.abort.abort();
  }

  // -- Internals -------------------------------------------------------------

  /**
   * Resolves the clicked bar, applies the modifier-appropriate selection change
   * and notifies the host.
   *
   * The click callback fires *after* the selection has settled, so a host
   * reacting to it sees the final state rather than the previous one. Clicks
   * that miss a bar are ignored rather than clearing: the layer also covers the
   * empty timeline background, which future range-create gestures will own, and
   * clearing here would fight them.
   */
  private readonly onClick = (e: MouseEvent): void => {
    const barEl = closestBar(e.target);
    if (barEl === null) return;

    const id = barEventId(barEl);
    if (id === null) return;

    const event = this.runtime.getEvent(id);
    if (event === undefined) return;

    if (this.runtime.config.selection.enabled) {
      const multiple = this.runtime.config.selection.mode === 'multiple';

      if (e.shiftKey && multiple && this.anchorId !== null) {
        this.selectRange(this.anchorId, id);
      } else if ((e.ctrlKey || e.metaKey) && multiple) {
        this.toggle(id);
      } else {
        this.replaceWith(id);
      }

      // Focus follows the pointer so the keyboard service has an origin to
      // navigate from. Bars carry tabindex=0, so this only formalises what the
      // browser would do on a click anyway.
      this.bars.getBarElement(id)?.focus();
    }

    const payload: SchedulerEventPointerPayload = { event, native: e };
    this.runtime.emit(SchedulerEventName.EventClicked, payload);
    this.runtime.raw.onEventClick?.(event, e);
  };

  /**
   * Reports a double click.
   *
   * Selection is untouched: the preceding single click has already set it, and
   * mutating it again here would make an "open the editor" gesture look like a
   * second selection change to anything listening on the bus.
   */
  private readonly onDoubleClick = (e: MouseEvent): void => {
    const barEl = closestBar(e.target);
    if (barEl === null) return;

    const id = barEventId(barEl);
    if (id === null) return;

    const event = this.runtime.getEvent(id);
    if (event === undefined) return;

    const payload: SchedulerEventPointerPayload = { event, native: e };
    this.runtime.emit(SchedulerEventName.EventDoubleClicked, payload);
    this.runtime.raw.onEventDoubleClick?.(event, e);
  };

  /** Replaces the selection with a single id and re-anchors range selection on it. */
  private replaceWith(id: string): void {
    const selection = this.runtime.selection;
    // A repeat click on the sole selected bar is a no-op, not a render.
    if (selection.size === 1 && selection.has(id)) {
      this.anchorId = id;
      return;
    }

    selection.clear();
    selection.add(id);
    this.anchorId = id;
    this.commit();
  }

  /** Adds or removes one id, keeping it as the range anchor either way. */
  private toggle(id: string): void {
    const selection = this.runtime.selection;
    if (selection.has(id)) selection.delete(id);
    else selection.add(id);

    this.enforceSingle();
    this.anchorId = id;
    this.commit();
  }

  /**
   * Selects everything between two events in the order documented on the class.
   *
   * Sorting a copy of every event on each shift-click is O(n log n), which is
   * the one place this service is not constant-time. It is tolerable because the
   * gesture is rare and human-paced; caching the sorted array would mean
   * invalidating it on every add, remove and drag commit, for no perceptible
   * gain.
   */
  private selectRange(fromId: string, toId: string): void {
    const ordered = [...this.runtime.allEvents()].sort(compareVisualOrder);

    let from = -1;
    let to = -1;
    for (let i = 0; i < ordered.length; i++) {
      if (ordered[i].id === fromId) from = i;
      if (ordered[i].id === toId) to = i;
    }
    // The anchor can have been deleted since it was set; fall back to a plain
    // replace rather than silently selecting nothing.
    if (from === -1 || to === -1) {
      this.replaceWith(toId);
      return;
    }

    const lo = from < to ? from : to;
    const hi = from < to ? to : from;

    const selection = this.runtime.selection;
    selection.clear();
    for (let i = lo; i <= hi; i++) selection.add(ordered[i].id);

    this.commit();
  }

  /**
   * Collapses the selection to its most recent entry in `'single'` mode.
   *
   * Applied after the fact rather than guarding every call site, so there is
   * exactly one place the mode is enforced. `Set` preserves insertion order,
   * which is what makes "the last one added" well-defined.
   */
  private enforceSingle(): void {
    const selection = this.runtime.selection;
    if (this.runtime.config.selection.mode !== 'single' || selection.size <= 1) return;

    let last: string | null = null;
    for (const id of selection) last = id;

    selection.clear();
    if (last !== null) selection.add(last);
  }

  /** Repaints and announces the new selection on both the bus and the host callback. */
  private commit(): void {
    const events = this.getSelected();
    const payload: SchedulerSelectionChangedPayload = {
      ids: [...this.runtime.selection],
      events,
    };

    this.runtime.requestRender();
    this.runtime.emit(SchedulerEventName.SelectionChanged, payload);
    this.runtime.raw.onSelectionChanged?.(events);
  }
}

/**
 * Total order over events: resource id, then start, then id.
 *
 * The final id comparison is not cosmetic -- without it two events with the same
 * resource and start would compare equal, and a range between them would depend
 * on the sort's stability, which differs per engine for large arrays.
 */
function compareVisualOrder(a: SchedulerEvent, b: SchedulerEvent): number {
  if (a.resourceId !== b.resourceId) return a.resourceId < b.resourceId ? -1 : 1;
  if (a.start !== b.start) return a.start - b.start;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
