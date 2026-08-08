/**
 * Core scheduler data model.
 *
 * Resources and events are stored **separately** and joined by id. Events are
 * never nested inside row data: a row is a resource, and one resource has an
 * unbounded number of events that come and go independently. Nesting them would
 * mean re-running the grid's row pipeline on every event mutation, and would
 * make "all events overlapping this range" a full scan.
 */

/** A row of the scheduler: an employee, machine, room, vehicle, project… */
export interface SchedulerResource {
  readonly id: string;
  /** Arbitrary host fields — rendered by the grid's normal resource columns. */
  readonly [key: string]: unknown;
}

/**
 * One scheduled interval on a resource.
 *
 * `start`/`end` are **epoch milliseconds**, half-open `[start, end)`. Half-open
 * is what makes an event ending at 09:00 and one starting at 09:00 not overlap,
 * which is the behaviour every calendar expects and the reason adjacent shifts
 * do not stack into two lanes.
 */
export interface SchedulerEvent {
  readonly id: string;
  readonly resourceId: string;
  /** Inclusive start, epoch ms. */
  readonly start: number;
  /** Exclusive end, epoch ms. */
  readonly end: number;
  /** Selects the renderer and the palette. Hosts may register their own. */
  readonly type?: string;
  readonly title?: string;
  readonly subtitle?: string;
  /** Bumped by the host on mutation; lets the renderer skip untouched bars. */
  readonly version?: number;
  readonly [key: string]: unknown;
}
