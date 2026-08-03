/**
 * Coordinates the *lifecycle* of Server-Side Row Model requests: cancellation,
 * race-condition safety, and retries. It knows nothing about the grid — it just
 * drives a {@link ServerSideDatasource} — so it stays framework-free and
 * unit-testable.
 *
 * Guarantees:
 *  - **One in-flight request:** issuing a new request aborts the previous one via
 *    `AbortController` (rapid scroll/sort/filter never pile up).
 *  - **Latest-wins:** a response is discarded (`execute` resolves `null`) if a
 *    newer request started while it was in flight, so stale data is never applied.
 *  - **Retry:** failed attempts are retried up to `maxRetries` (with `retryDelay`),
 *    surfacing each attempt through {@link ExecuteHooks.onRetry}.
 *
 * The `AbortController` bridging pattern mirrors the AI provider's
 * `fetchWithTimeout`.
 *
 * @packageDocumentation
 */

import type {
  ServerSideDatasource,
  ServerSideRequest,
  ServerSideResult,
} from '../../types/server-side.types';

/** Optional callbacks fired during {@link ServerRequestController.execute}. */
export interface ExecuteHooks {
  /** Invoked before each retry attempt (1-based) with the previous error. */
  onRetry?(attempt: number, error: unknown): void;
}

/** Manages abort / race / retry for datasource requests. */
export class ServerRequestController {
  private currentController: AbortController | null = null;
  private latestRequestId = 0;

  constructor(
    private readonly maxRetries: number = 0,
    private readonly retryDelay: number = 400,
  ) {}

  /** Aborts any in-flight request (e.g. on grid destroy or when superseded). */
  abort(): void {
    this.currentController?.abort();
    this.currentController = null;
  }

  /**
   * Runs a request against the datasource with abort + retry, returning its
   * result — or `null` if it was aborted or superseded by a newer request.
   */
  async execute<T>(
    request: ServerSideRequest,
    datasource: ServerSideDatasource<T>,
    hooks: ExecuteHooks = {},
  ): Promise<ServerSideResult<T> | null> {
    // A new request supersedes any previous one.
    this.abort();
    const controller = new AbortController();
    this.currentController = controller;
    this.latestRequestId = request.requestId;

    let attempt = 0;
    for (;;) {
      if (this.isSuperseded(request, controller)) return null;
      try {
        const result = await this.runOnce(request, datasource, controller.signal);
        // Guard again: the request may have been superseded while awaiting.
        if (this.isSuperseded(request, controller)) return null;
        return result;
      } catch (error) {
        if (this.isSuperseded(request, controller)) return null;
        if (attempt >= this.maxRetries) throw error;
        attempt += 1;
        hooks.onRetry?.(attempt, error);
        await this.delay(this.retryDelay, controller.signal);
      }
    }
  }

  /** Aborts and forgets any in-flight request. */
  destroy(): void {
    this.abort();
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private isSuperseded(request: ServerSideRequest, controller: AbortController): boolean {
    return controller.signal.aborted || request.requestId !== this.latestRequestId;
  }

  /** Invokes the datasource once, resolving on `success`, rejecting on `fail`/abort/throw. */
  private runOnce<T>(
    request: ServerSideRequest,
    datasource: ServerSideDatasource<T>,
    signal: AbortSignal,
  ): Promise<ServerSideResult<T>> {
    return new Promise<ServerSideResult<T>>((resolve, reject) => {
      let settled = false;
      const success = (result: ServerSideResult<T>): void => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      const fail = (error?: unknown): void => {
        if (settled) return;
        settled = true;
        reject(error ?? new Error('Server-side request failed'));
      };
      const onAbort = (): void => fail(new DOMException('Request aborted', 'AbortError'));

      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });

      try {
        const maybe = datasource.getRows({ request, signal, success, fail });
        // Support async getRows that reject without calling fail().
        if (maybe && typeof (maybe as Promise<void>).then === 'function') {
          (maybe as Promise<void>).catch((error) => fail(error));
        }
      } catch (error) {
        fail(error);
      }
    });
  }

  /** A cancellable delay used between retries. */
  private delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}
