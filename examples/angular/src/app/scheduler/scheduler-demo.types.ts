/**
 * Local aliases for the scheduler's data shapes.
 *
 * Re-declared here rather than imported from `photon-grid-core/plugins/scheduler`
 * so the demo's mock-data module stays independent of the plugin's build output
 * — the data generator is useful (and testable) whether or not the plugin is
 * present, and this keeps the example compiling if the subpath is not yet built.
 * They are structurally identical to the plugin's own types.
 */

/** A row of the scheduler: one employee. */
export interface SchedulerResource {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly team: string;
  readonly role: string;
  readonly site: string;
  /** Contracted hours per week, shown in the resource columns. */
  readonly capacity: number;
  readonly [key: string]: unknown;
}

/** One scheduled interval, half-open `[start, end)` in epoch milliseconds. */
export interface SchedulerEvent {
  readonly id: string;
  readonly resourceId: string;
  readonly start: number;
  readonly end: number;
  readonly type: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly [key: string]: unknown;
}
