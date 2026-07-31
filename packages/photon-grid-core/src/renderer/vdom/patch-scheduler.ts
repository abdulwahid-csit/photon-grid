/**
 * Frame-aligned batching for Virtual DOM patches.
 *
 * A real-time feed delivers updates on its own schedule — a WebSocket can push
 * hundreds of messages between two paints. Writing to the DOM on each of them
 * would interleave reads and writes and thrash layout for frames the user never
 * sees. The scheduler collapses every update that arrives within one frame into
 * a single flush, so the DOM is touched at most once per frame no matter how
 * fast the source runs.
 *
 * @packageDocumentation
 */

/**
 * Coalesces per-row patch requests into one animation-frame flush.
 *
 * The pending set is reused across flushes rather than reallocated, keeping GC
 * pressure flat under sustained high-frequency updates.
 */
export class PatchScheduler {
  private readonly pending = new Set<string>();
  private handle = 0;
  /** Set when a caller requested a full-viewport diff rather than named rows. */
  private pendingAll = false;

  /**
   * @param flush - Applies the patch for the given rows (`null` = every
   *                rendered row). Invoked at most once per animation frame.
   */
  constructor(private readonly flush: (nodeIds: Iterable<string> | null) => void) {}

  /**
   * Queues rows for patching on the next frame.
   *
   * @param nodeIds - Rows to diff, or `null` to diff the whole viewport. A
   *                  `null` request supersedes any queued row ids for that
   *                  frame, since a full diff already covers them.
   */
  schedule(nodeIds: Iterable<string> | null): void {
    if (nodeIds === null) {
      this.pendingAll = true;
      this.pending.clear();
    } else if (!this.pendingAll) {
      for (const id of nodeIds) this.pending.add(id);
    }

    if (this.handle !== 0) return;
    this.handle = requestAnimationFrame(this.run);
  }

  /**
   * Applies any queued work immediately instead of waiting for the frame.
   *
   * Used when the grid must be consistent synchronously — before measuring,
   * exporting, or running an assertion in a test.
   */
  flushNow(): void {
    if (this.handle !== 0) {
      cancelAnimationFrame(this.handle);
      this.handle = 0;
    }
    this.run();
  }

  /** Discards queued work without applying it. */
  cancel(): void {
    if (this.handle !== 0) {
      cancelAnimationFrame(this.handle);
      this.handle = 0;
    }
    this.pending.clear();
    this.pendingAll = false;
  }

  /** `true` when a flush is queued for the next frame. */
  get isPending(): boolean {
    return this.handle !== 0 || this.pendingAll || this.pending.size > 0;
  }

  private readonly run = (): void => {
    this.handle = 0;
    if (this.pendingAll) {
      this.pendingAll = false;
      this.pending.clear();
      this.flush(null);
      return;
    }
    if (this.pending.size === 0) return;

    // Hand the live set to the consumer, then clear it for reuse. The consumer
    // iterates synchronously, so no copy is required.
    this.flush(this.pending);
    this.pending.clear();
  };
}
