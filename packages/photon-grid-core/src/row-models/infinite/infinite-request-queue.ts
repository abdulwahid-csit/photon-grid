/**
 * Concurrency control for Infinite Row Model page fetches.
 *
 * The Server-Side Row Model's
 * {@link import('../server/server-request-controller').ServerRequestController}
 * deliberately keeps **one** request in flight and aborts the previous one on
 * every new request — correct when each request replaces the whole viewport.
 * Infinite scrolling is the opposite: several pages are legitimately in flight
 * at once (the one you are looking at, plus prefetch), and they must not cancel
 * each other.
 *
 * This queue therefore owns:
 *
 * - **Deduplication.** A page already in flight is never requested twice; the
 *   second caller joins the first request's promise.
 * - **A concurrency cap.** Excess pages wait in a queue and start as slots free,
 *   so a fast scroll cannot open dozens of connections.
 * - **Per-page cancellation.** Each page has its own `AbortController`, so
 *   abandoning one page (scrolled away, or the query changed) cancels exactly
 *   that request.
 * - **Retry with delay**, reusing the promise-bridging shape of the SSRM
 *   controller so a datasource's `success` / `fail` / thrown / rejected paths
 *   are all normalised identically.
 * - **Generation stamping.** Every request records the generation it was issued
 *   under; a response arriving after the query changed is dropped instead of
 *   being applied to a dataset it does not belong to.
 *
 * The queue knows nothing about the grid — it only drives a datasource — so it
 * is framework-free and unit-testable.
 *
 * @packageDocumentation
 */

import type {
  ServerSideDatasource,
  ServerSideRequest,
  ServerSideResult,
} from '../../types/server-side.types';

/** Outcome of one page fetch. */
export interface PageFetchOutcome {
  /** Zero-based page index. */
  readonly page: number;
  /** The rows returned, or `null` when the fetch failed or was discarded. */
  readonly result: ServerSideResult | null;
  /** The error, when the fetch failed after exhausting retries. */
  readonly error?: unknown;
  /** Retry attempts made. */
  readonly attempts: number;
  /** `true` when the response was discarded as stale or aborted. */
  readonly discarded: boolean;
}

/** Callbacks the queue fires as a page moves through its lifecycle. */
export interface PageFetchHooks {
  /** Invoked immediately before each attempt (0-based). */
  onAttempt?(page: number, attempt: number): void;
}

/** Everything needed to issue one page request. */
export interface PageFetchTask {
  /** Zero-based page index. */
  readonly page: number;
  /** The request to hand to the datasource. */
  readonly request: ServerSideRequest;
  /** Generation this request belongs to. */
  readonly generation: number;
}

/** Runs page fetches with dedup, a concurrency cap, per-page abort and retry. */
export class InfiniteRequestQueue {
  /** Pages currently being fetched, by page index. */
  private readonly inFlight = new Map<number, AbortController>();
  /** Promises for in-flight pages, so a duplicate request joins rather than re-issues. */
  private readonly joins = new Map<number, Promise<PageFetchOutcome>>();
  /** Pages waiting for a concurrency slot, in request order. */
  private readonly waiting: Array<() => void> = [];
  /** Slots currently reserved. Held separately from `inFlight` so a slot is claimed the moment it is granted. */
  private active = 0;
  private destroyed = false;

  /**
   * @param maxConcurrent - Requests allowed in flight at once.
   * @param maxRetries    - Retry attempts before a page is reported as failed.
   * @param retryDelay    - Milliseconds between attempts.
   */
  constructor(
    private readonly maxConcurrent: number,
    private readonly maxRetries: number,
    private readonly retryDelay: number,
  ) {}

  /** Pages currently being fetched. */
  get inFlightCount(): number {
    return this.inFlight.size;
  }

  /** Pages waiting for a slot. */
  get queuedCount(): number {
    return this.waiting.length;
  }

  /** `true` when the page is already being fetched. */
  isInFlight(page: number): boolean {
    return this.joins.has(page);
  }

  /**
   * Fetches a page, or joins the in-flight request for it.
   *
   * @param task         - The page, request and generation.
   * @param datasource   - Datasource to drive.
   * @param isCurrent    - Predicate telling the queue whether `generation` is
   *                       still the active one; consulted after every await so a
   *                       superseded response is dropped rather than applied.
   * @param hooks        - Optional lifecycle callbacks.
   * @returns The outcome. Never rejects — failures are reported in the outcome.
   */
  fetch(
    task: PageFetchTask,
    datasource: ServerSideDatasource,
    isCurrent: (generation: number) => boolean,
    hooks: PageFetchHooks = {},
  ): Promise<PageFetchOutcome> {
    const existing = this.joins.get(task.page);
    if (existing) return existing;

    const promise = this.run(task, datasource, isCurrent, hooks)
      .finally(() => {
        this.joins.delete(task.page);
        this.inFlight.delete(task.page);
        this.releaseSlot();
      });

    this.joins.set(task.page, promise);
    return promise;
  }

  /**
   * Aborts a single page's request, if it is in flight.
   *
   * @param page - Zero-based page index.
   */
  abortPage(page: number): void {
    this.inFlight.get(page)?.abort();
  }

  /**
   * Aborts every in-flight request and clears the waiting queue.
   *
   * Used when the query changes: those responses describe a dataset that is no
   * longer displayed.
   */
  abortAll(): void {
    for (const controller of this.inFlight.values()) controller.abort();
    this.inFlight.clear();
    // Release anything blocked on a slot so its promise settles as discarded.
    const waiters = this.waiting.splice(0, this.waiting.length);
    for (const release of waiters) release();
  }

  /** Aborts everything and refuses further work. */
  destroy(): void {
    this.destroyed = true;
    this.abortAll();
  }

  // ── internals ──────────────────────────────────────────────────────────────

  /** Awaits a concurrency slot, then runs the request with retries. */
  private async run(
    task: PageFetchTask,
    datasource: ServerSideDatasource,
    isCurrent: (generation: number) => boolean,
    hooks: PageFetchHooks,
  ): Promise<PageFetchOutcome> {
    await this.acquireSlot();

    if (this.destroyed || !isCurrent(task.generation)) {
      return { page: task.page, result: null, attempts: 0, discarded: true };
    }

    const controller = new AbortController();
    this.inFlight.set(task.page, controller);

    let attempt = 0;
    for (;;) {
      hooks.onAttempt?.(task.page, attempt);
      try {
        const result = await runOnce(task.request, datasource, controller.signal);
        // The query may have changed while this was in flight.
        if (controller.signal.aborted || !isCurrent(task.generation)) {
          return { page: task.page, result: null, attempts: attempt, discarded: true };
        }
        return { page: task.page, result, attempts: attempt, discarded: false };
      } catch (error) {
        if (controller.signal.aborted || !isCurrent(task.generation)) {
          return { page: task.page, result: null, attempts: attempt, discarded: true };
        }
        if (attempt >= this.maxRetries) {
          return { page: task.page, result: null, error, attempts: attempt, discarded: false };
        }
        attempt += 1;
        await delay(this.retryDelay, controller.signal);
      }
    }
  }

  /**
   * Resolves once a concurrency slot is free.
   *
   * The slot is reserved **synchronously** on grant. Deriving availability from
   * `inFlight.size` instead would let every caller in a burst pass the check
   * before any of them had recorded itself — `inFlight` is only populated after
   * the await — and the cap would never bind.
   */
  private acquireSlot(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiting.push(() => { this.active++; resolve(); });
    });
  }

  /** Returns a slot and starts the next waiter. */
  private releaseSlot(): void {
    this.active = Math.max(0, this.active - 1);
    this.pump();
  }

  /** Releases waiters while slots remain. */
  private pump(): void {
    while (this.waiting.length > 0 && this.active < this.maxConcurrent) {
      const release = this.waiting.shift();
      release?.();
    }
  }
}

/**
 * Invokes the datasource once, resolving on `success` and rejecting on `fail`,
 * abort, a synchronous throw, or a rejected promise.
 *
 * Mirrors the SSRM controller's bridging so both row models treat a datasource
 * identically — an application never has to reason about which model is calling.
 */
function runOnce(
  request: ServerSideRequest,
  datasource: ServerSideDatasource,
  signal: AbortSignal,
): Promise<ServerSideResult> {
  return new Promise<ServerSideResult>((resolve, reject) => {
    let settled = false;
    const success = (result: ServerSideResult): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const fail = (error?: unknown): void => {
      if (settled) return;
      settled = true;
      reject(error ?? new Error('Infinite row model: page request failed'));
    };
    const onAbort = (): void => fail(new DOMException('Request aborted', 'AbortError'));

    if (signal.aborted) { onAbort(); return; }
    signal.addEventListener('abort', onAbort, { once: true });

    try {
      const maybe = datasource.getRows({ request, signal, success, fail });
      if (maybe && typeof (maybe as Promise<void>).then === 'function') {
        (maybe as Promise<void>).catch((error) => fail(error));
      }
    } catch (error) {
      fail(error);
    }
  });
}

/** A delay that resolves early when the signal aborts. */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}
