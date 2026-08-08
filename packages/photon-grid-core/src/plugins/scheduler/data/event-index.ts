import type { SchedulerEvent } from './scheduler.types';

/**
 * Range index over scheduler events.
 *
 * ## The access pattern this is built for
 *
 * Once per frame, for the ~40–60 resources currently in the grid's render
 * window, answer: *which events on this resource overlap `[t0, t1)`?* Plus, on
 * a drag, mutate one event ~60 times a second without re-indexing anything.
 *
 * ## Why per-resource sorted arrays, not an interval tree or time buckets
 *
 * The query is always partitioned on an **exact** resource key, and the visible
 * subset is tiny relative to the whole. That changes which structure wins:
 *
 * - A **global interval tree** would return every resource's events for the
 *   range and leave the caller to discard ~98% of them. With 500k events over
 *   ~5k resources, a week-wide query returns roughly a thousand where a dozen
 *   are wanted — every frame — and it must rebalance on every drag frame.
 * - **Time buckets** over-fetch the same way, force a bucket size that cannot
 *   suit both minute and year views, and require long events to be duplicated
 *   into every bucket they span (a six-month booking lands in 180 day-buckets),
 *   turning 500k events into millions of entries.
 * - **Per-resource sorted arrays** let the `Map` do the 5k → 60 reduction in
 *   hash lookups, leaving a binary search plus a short scan over the ~100 events
 *   on that one resource. Mutation is an array splice, not a rebalance.
 *
 * ## The max-end augmentation
 *
 * Sorting by start alone is not enough: a year-long booking that began far to
 * the left of the window still overlaps it, and a naive scan would have to start
 * at index 0 to find it. `maxEnd[i]` holds `max(ends[0..i])`, which is
 * non-decreasing *because* the array is sorted — and therefore binary
 * searchable. One extra search finds the earliest index that can possibly reach
 * into the window, so the scan stays proportional to the answer rather than to
 * the resource's history.
 *
 * Storage is `Float64Array`/`Int32Array` rather than objects: 500k events cost
 * ~14 MB contiguous, and the hot loops touch numbers only. The event objects
 * themselves live once in a pool and are read for the handful that render.
 */
export class EventIndex {
  /** Dense event pool; an event's numeric handle is its index here. */
  private readonly pool: SchedulerEvent[] = [];
  /** Per-resource sorted columns. */
  private readonly byResource = new Map<string, ResourceIndex>();
  /** Event id -> pool handle, for O(1) update/remove by id. */
  private readonly handleById = new Map<string, number>();
  /**
   * Handles excluded from queries.
   *
   * A drag mutates an event up to 60 times a second; re-indexing each time would
   * be pure waste, since the intermediate positions are never queried. Instead
   * the dragged event is suppressed here, the ghost is drawn from a plain
   * variable, and the index is updated exactly once on drop.
   */
  private readonly suppressed = new Set<number>();
  /**
   * Bumped whenever a resource's events change, so lane layouts can be memoized
   * against it and a pure scroll reuses them.
   */
  private readonly epochs = new Map<string, number>();

  /** Replaces the entire contents. O(n log n). */
  load(events: readonly SchedulerEvent[]): void {
    this.pool.length = 0;
    this.byResource.clear();
    this.handleById.clear();
    this.suppressed.clear();
    this.epochs.clear();

    const grouped = new Map<string, number[]>();

    for (const event of events) {
      const handle = this.pool.length;
      this.pool.push(event);
      this.handleById.set(event.id, handle);

      let bucket = grouped.get(event.resourceId);
      if (!bucket) grouped.set(event.resourceId, (bucket = []));
      bucket.push(handle);
    }

    for (const [resourceId, handles] of grouped) {
      handles.sort((a, b) => this.pool[a].start - this.pool[b].start);
      this.byResource.set(resourceId, this.buildColumns(handles));
      this.epochs.set(resourceId, 0);
    }
  }

  /** Number of indexed events. */
  get size(): number {
    return this.handleById.size;
  }

  /** Resolves a handle to its event. */
  get(handle: number): SchedulerEvent | undefined {
    return this.pool[handle];
  }

  /** Resolves an event id to its handle, or `-1`. */
  handleOf(id: string): number {
    return this.handleById.get(id) ?? -1;
  }

  /** Mutation counter for a resource, for memoizing derived layout. */
  epochOf(resourceId: string): number {
    return this.epochs.get(resourceId) ?? 0;
  }

  /**
   * Collects handles of events on `resourceId` overlapping `[t0, t1)`.
   *
   * Appends into `out` rather than allocating, because this runs once per
   * visible resource per frame and a fresh array each time would be the single
   * largest source of garbage in the renderer.
   *
   * O(log n + k), where k is the number of results.
   */
  query(resourceId: string, t0: number, t1: number, out: number[]): void {
    const ix = this.byResource.get(resourceId);
    if (!ix) return;

    // Nothing starting at or after t1 can overlap. `lowerBound` rather than
    // `upperBound`: intervals are half-open, so an event starting exactly at
    // t1 is outside the range, not the last one inside it.
    const hi = lowerBound(ix.starts, ix.length, t1);
    // Earliest index whose prefix max-end reaches past t0. Everything before it
    // ends too early to matter, however long ago it started. `upperBound` here
    // is correct for the same half-open reason: an event ending exactly at t0
    // does not overlap.
    const lo = upperBound(ix.maxEnd, hi, t0);

    for (let i = lo; i < hi; i++) {
      // maxEnd only proves *some* earlier event reaches past t0, so each
      // candidate still needs its own end checked.
      if (ix.ends[i] <= t0) continue;
      const handle = ix.handles[i];
      if (this.suppressed.has(handle)) continue;
      out.push(handle);
    }
  }

  /** Adds one event. O(n) memmove within its resource. */
  add(event: SchedulerEvent): number {
    const handle = this.pool.length;
    this.pool.push(event);
    this.handleById.set(event.id, handle);
    this.insertHandle(event.resourceId, handle, event.start, event.end);
    return handle;
  }

  /**
   * Replaces an event, re-indexing only if its position actually moved.
   *
   * The common case — a drag committing a new start on the same resource, where
   * the sorted position is unchanged — is two array writes plus a bounded
   * max-end repair.
   */
  update(next: SchedulerEvent): void {
    const handle = this.handleById.get(next.id);
    if (handle === undefined) {
      this.add(next);
      return;
    }

    const prev = this.pool[handle];
    this.pool[handle] = next;

    if (prev.resourceId !== next.resourceId) {
      this.removeHandle(prev.resourceId, handle);
      this.insertHandle(next.resourceId, handle, next.start, next.end);
      return;
    }

    const ix = this.byResource.get(next.resourceId);
    if (!ix) return;

    const at = indexOfHandle(ix, handle);
    if (at === -1) return;

    const stillSorted =
      (at === 0 || ix.starts[at - 1] <= next.start)
      && (at === ix.length - 1 || next.start <= ix.starts[at + 1]);

    if (stillSorted) {
      ix.starts[at] = next.start;
      ix.ends[at] = next.end;
      repairMaxEnd(ix, at);
      this.bumpEpoch(next.resourceId);
      return;
    }

    // Position changed: remove and reinsert, which is one memmove each way.
    this.removeHandle(next.resourceId, handle);
    this.insertHandle(next.resourceId, handle, next.start, next.end);
  }

  /** Removes an event by id. */
  remove(id: string): void {
    const handle = this.handleById.get(id);
    if (handle === undefined) return;

    const event = this.pool[handle];
    this.removeHandle(event.resourceId, handle);
    this.handleById.delete(id);
    this.suppressed.delete(handle);
    // The pool slot is left in place: handles are stable identifiers, and
    // compacting would invalidate every one held elsewhere.
  }

  /**
   * Hides events from queries without touching the index — the drag path.
   *
   * @param handles - Pass an empty set to clear.
   */
  suppress(handles: Iterable<number>): void {
    this.suppressed.clear();
    for (const h of handles) this.suppressed.add(h);
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private buildColumns(handles: readonly number[]): ResourceIndex {
    const capacity = Math.max(8, Math.ceil(handles.length * 1.5));
    const ix: ResourceIndex = {
      length: handles.length,
      starts: new Float64Array(capacity),
      ends: new Float64Array(capacity),
      maxEnd: new Float64Array(capacity),
      handles: new Int32Array(capacity),
    };

    let runningMax = -Infinity;
    for (let i = 0; i < handles.length; i++) {
      const event = this.pool[handles[i]];
      ix.starts[i] = event.start;
      ix.ends[i] = event.end;
      ix.handles[i] = handles[i];
      runningMax = event.end > runningMax ? event.end : runningMax;
      ix.maxEnd[i] = runningMax;
    }

    return ix;
  }

  private insertHandle(resourceId: string, handle: number, start: number, end: number): void {
    let ix = this.byResource.get(resourceId);
    if (!ix) {
      ix = this.buildColumns([]);
      this.byResource.set(resourceId, ix);
    }
    if (ix.length === ix.starts.length) growColumns(ix);

    const at = upperBound(ix.starts, ix.length, start);

    // Shift the tail right by one. `copyWithin` is a memmove, far cheaper than
    // an element-by-element loop.
    ix.starts.copyWithin(at + 1, at, ix.length);
    ix.ends.copyWithin(at + 1, at, ix.length);
    ix.maxEnd.copyWithin(at + 1, at, ix.length);
    ix.handles.copyWithin(at + 1, at, ix.length);

    ix.starts[at] = start;
    ix.ends[at] = end;
    ix.handles[at] = handle;
    ix.length++;

    repairMaxEnd(ix, at);
    this.bumpEpoch(resourceId);
  }

  private removeHandle(resourceId: string, handle: number): void {
    const ix = this.byResource.get(resourceId);
    if (!ix) return;

    const at = indexOfHandle(ix, handle);
    if (at === -1) return;

    ix.starts.copyWithin(at, at + 1, ix.length);
    ix.ends.copyWithin(at, at + 1, ix.length);
    ix.maxEnd.copyWithin(at, at + 1, ix.length);
    ix.handles.copyWithin(at, at + 1, ix.length);
    ix.length--;

    if (ix.length > 0) repairMaxEnd(ix, Math.min(at, ix.length - 1));
    this.bumpEpoch(resourceId);
  }

  private bumpEpoch(resourceId: string): void {
    this.epochs.set(resourceId, (this.epochs.get(resourceId) ?? 0) + 1);
  }
}

/** One resource's events, as parallel sorted columns. */
interface ResourceIndex {
  length: number;
  /** Ascending event starts. */
  starts: Float64Array;
  ends: Float64Array;
  /** `maxEnd[i] = max(ends[0..i])` — non-decreasing, hence binary searchable. */
  maxEnd: Float64Array;
  handles: Int32Array;
}

/** Grows every column by 1.5x, so repeated inserts amortize. */
function growColumns(ix: ResourceIndex): void {
  const capacity = Math.max(8, Math.ceil(ix.starts.length * 1.5));
  const starts = new Float64Array(capacity); starts.set(ix.starts); ix.starts = starts;
  const ends = new Float64Array(capacity); ends.set(ix.ends); ix.ends = ends;
  const maxEnd = new Float64Array(capacity); maxEnd.set(ix.maxEnd); ix.maxEnd = maxEnd;
  const handles = new Int32Array(capacity); handles.set(ix.handles); ix.handles = handles;
}

/**
 * Recomputes `maxEnd` forward from `at`, stopping as soon as it stops changing.
 *
 * The early break is what keeps a drag O(1) in practice: a moved event usually
 * does not raise the running maximum beyond its immediate neighbours, so the
 * repair touches one or two slots rather than the whole resource.
 */
function repairMaxEnd(ix: ResourceIndex, at: number): void {
  let running = at === 0 ? -Infinity : ix.maxEnd[at - 1];

  for (let i = at; i < ix.length; i++) {
    const next = ix.ends[i] > running ? ix.ends[i] : running;
    if (i > at && next === ix.maxEnd[i]) return;
    ix.maxEnd[i] = next;
    running = next;
  }
}

/** Linear scan for a handle. Bounded by one resource's event count. */
function indexOfHandle(ix: ResourceIndex, handle: number): number {
  for (let i = 0; i < ix.length; i++) if (ix.handles[i] === handle) return i;
  return -1;
}

/**
 * First index in `arr[0..len)` whose value is strictly greater than `target`.
 *
 * Hand-rolled: this is the innermost loop of the per-frame query and must not
 * allocate a comparator closure.
 */
function upperBound(arr: Float64Array, len: number, target: number): number {
  let lo = 0;
  let hi = len;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * First index in `arr[0..len)` whose value is greater than **or equal to**
 * `target`.
 *
 * The counterpart to {@link upperBound}, and the distinction is load-bearing for
 * half-open intervals: this excludes an exact match, `upperBound` includes it.
 */
function lowerBound(arr: Float64Array, len: number, target: number): number {
  let lo = 0;
  let hi = len;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
