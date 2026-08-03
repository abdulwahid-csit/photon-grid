/**
 * Lane assignment for overlapping events within one resource row.
 *
 * When two events on the same resource overlap in time they cannot share a
 * horizontal band, so the row is split into *lanes* and each event is given one.
 * Pure and DOM-free — the `row-drag-preview.ts` precedent — so it is fully
 * testable in the `node` environment where real geometry is unavailable.
 */

/** The minimum an event must expose to be laid out. */
export interface LaneInput {
  /** Opaque handle, echoed back on the placement. */
  readonly id: number;
  /** Inclusive start. */
  readonly start: number;
  /** Exclusive end. */
  readonly end: number;
}

/** Where one event sits within its row. */
export interface LanePlacement {
  readonly id: number;
  /** Zero-based lane index, top to bottom. */
  readonly lane: number;
  /**
   * Lanes in this event's *cluster* — the divisor for its height.
   *
   * Cluster-wide rather than row-wide so a row with one busy morning and a quiet
   * afternoon does not render every afternoon event at one-third height. Every
   * event in a cluster shares this value, which is what keeps their tops and
   * heights aligned.
   */
  readonly laneCount: number;
}

/**
 * Assigns lanes to a resource's events.
 *
 * Sorted by start ascending, ties broken by end **descending**, so a long event
 * takes a lower lane than a short one starting at the same instant. That is what
 * keeps the layout visually stable while scrolling: the long bar stays put
 * instead of being displaced whenever a shorter neighbour enters the window.
 *
 * Intervals are half-open, so an event ending exactly when another starts does
 * **not** overlap it — adjacent shifts share a lane rather than stacking.
 *
 * Complexity is O(n log n) for the sort plus O(n·L) for the sweep, where L is
 * the number of concurrent lanes. A min-heap would make the sweep O(n log L),
 * but real rows run to a handful of concurrent events and a linear scan over a
 * short `Float64Array` beats a heap on constants. The signature is the contract;
 * swapping the internals later changes nothing for callers.
 *
 * @param events - Any order; not mutated.
 * @returns One placement per input, in input order.
 */
export function layoutLanes(events: readonly LaneInput[]): LanePlacement[] {
  const n = events.length;
  if (n === 0) return [];
  if (n === 1) return [{ id: events[0].id, lane: 0, laneCount: 1 }];

  // Sort indices rather than the input, so the caller's array is untouched and
  // results can be returned in input order.
  const order = new Int32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;

  const sorted = Array.from(order).sort((a, b) => {
    const d = events[a].start - events[b].start;
    if (d !== 0) return d;
    return events[b].end - events[a].end; // longer first
  });

  const lanes: number[] = [];          // lane index -> end time of its last event
  const lane = new Int32Array(n);      // input index -> lane
  const laneCount = new Int32Array(n); // input index -> cluster lane count

  // A cluster is a maximal run of events during which at least one lane is
  // always occupied. Its members share a lane count.
  let clusterStart = 0;
  let clusterMaxLanes = 0;
  let clusterEnd = -Infinity;

  for (let k = 0; k < n; k++) {
    const index = sorted[k];
    const event = events[index];

    // A gap with nothing running closes the cluster and resets the lanes.
    if (event.start >= clusterEnd && k > 0) {
      for (let j = clusterStart; j < k; j++) laneCount[sorted[j]] = clusterMaxLanes;
      clusterStart = k;
      clusterMaxLanes = 0;
      lanes.length = 0;
    }

    // Lowest lane whose occupant has finished. Half-open: `<=` frees a lane at
    // the exact instant the next event begins.
    let assigned = -1;
    for (let l = 0; l < lanes.length; l++) {
      if (lanes[l] <= event.start) { assigned = l; break; }
    }
    if (assigned === -1) {
      assigned = lanes.length;
      lanes.push(0);
    }

    lanes[assigned] = event.end;
    lane[index] = assigned;

    if (lanes.length > clusterMaxLanes) clusterMaxLanes = lanes.length;
    if (event.end > clusterEnd) clusterEnd = event.end;
  }

  // Close the final cluster.
  for (let j = clusterStart; j < n; j++) laneCount[sorted[j]] = clusterMaxLanes;

  const out: LanePlacement[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = { id: events[i].id, lane: lane[i], laneCount: Math.max(1, laneCount[i]) };
  }
  return out;
}
