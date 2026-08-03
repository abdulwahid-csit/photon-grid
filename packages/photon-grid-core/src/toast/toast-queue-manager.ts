/**
 * The **Toast Queue Manager** — decides which toasts are *visible* versus
 * *pending* for each screen position, enforcing a per-position `maxVisible`
 * cap so a burst of notifications never floods the viewport.
 *
 * It is pure bookkeeping over opaque string ids (no DOM, no timers), which
 * keeps it trivially unit-testable and lets the {@link ToastService} own all
 * rendering. Each position maintains an ordered visible list and a FIFO pending
 * queue; dismissing a visible toast promotes the next pending one.
 *
 * @packageDocumentation
 */

import { ToastPosition } from './toast.types';

/** Per-position visible/pending bookkeeping. */
interface PositionQueue {
  /** Currently mounted ids, in insertion order. */
  visible: string[];
  /** Waiting ids (FIFO), shown as visible slots free up. */
  pending: string[];
}

/** The outcome of enqueuing a toast. */
export interface EnqueueResult {
  /** `true` when the toast can be shown immediately (a visible slot was free). */
  readonly visible: boolean;
}

/** Pure, DOM-free visibility scheduler for toasts. */
export class ToastQueueManager {
  private readonly queues = new Map<ToastPosition, PositionQueue>();

  /**
   * @param maxVisible - Max simultaneously-visible toasts per position (min 1).
   */
  constructor(private maxVisible: number) {
    this.maxVisible = Math.max(1, maxVisible);
  }

  /** Updates the per-position visible cap (min 1). Does not retro-actively hide. */
  setMaxVisible(maxVisible: number): void {
    this.maxVisible = Math.max(1, maxVisible);
  }

  /** Lazily gets (creating if needed) the queue for a position. */
  private queueFor(position: ToastPosition): PositionQueue {
    let q = this.queues.get(position);
    if (!q) {
      q = { visible: [], pending: [] };
      this.queues.set(position, q);
    }
    return q;
  }

  /**
   * Registers a toast id at a position, marking it visible when a slot is free
   * or pending otherwise.
   *
   * @param id       - The toast id.
   * @param position - The docked position.
   * @returns Whether the toast is immediately visible.
   */
  enqueue(id: string, position: ToastPosition): EnqueueResult {
    const q = this.queueFor(position);
    if (q.visible.length < this.maxVisible) {
      q.visible.push(id);
      return { visible: true };
    }
    q.pending.push(id);
    return { visible: false };
  }

  /**
   * Removes a toast id from its position (whether visible or pending) and
   * returns the id promoted from pending to visible as a result, if any.
   *
   * @param id       - The toast id to remove.
   * @param position - The docked position.
   * @returns The newly-promoted id, or `null` when nothing was promoted.
   */
  remove(id: string, position: ToastPosition): string | null {
    const q = this.queues.get(position);
    if (!q) return null;

    const vIdx = q.visible.indexOf(id);
    if (vIdx !== -1) {
      q.visible.splice(vIdx, 1);
      // A visible slot freed — promote the oldest pending toast.
      const next = q.pending.shift();
      if (next !== undefined) {
        q.visible.push(next);
        return next;
      }
      return null;
    }

    const pIdx = q.pending.indexOf(id);
    if (pIdx !== -1) q.pending.splice(pIdx, 1);
    return null;
  }

  /** @returns `true` if the id is currently in the visible set for its position. */
  isVisible(id: string, position: ToastPosition): boolean {
    return this.queues.get(position)?.visible.includes(id) ?? false;
  }

  /** @returns The ordered visible ids for a position. */
  getVisible(position: ToastPosition): readonly string[] {
    return this.queues.get(position)?.visible ?? [];
  }

  /** @returns Every live id (visible + pending) across all positions. */
  getAll(): string[] {
    const all: string[] = [];
    for (const q of this.queues.values()) all.push(...q.visible, ...q.pending);
    return all;
  }

  /** @returns Every live id at a single position. */
  getAllAt(position: ToastPosition): string[] {
    const q = this.queues.get(position);
    return q ? [...q.visible, ...q.pending] : [];
  }

  /** Clears all bookkeeping (used on destroy). */
  clear(): void {
    this.queues.clear();
  }
}
