import type { GridEventType } from '../types/event.types';

export type EventHandler<T = unknown> = (payload: T) => void;

interface Subscription {
  id: number;
  type: GridEventType;
  handler: EventHandler;
  once: boolean;
  priority: number;
}

export class EventBus {
  private subscriptions = new Map<GridEventType, Subscription[]>();
  private nextId = 1;
  private paused = false;
  private pendingQueue: Array<{ type: GridEventType; payload: unknown }> = [];

  on<T>(type: GridEventType, handler: EventHandler<T>, priority = 0): () => void {
    const sub: Subscription = {
      id: this.nextId++,
      type,
      handler: handler as EventHandler,
      once: false,
      priority,
    };
    this.addSubscription(sub);
    return () => this.removeSubscription(type, sub.id);
  }

  once<T>(type: GridEventType, handler: EventHandler<T>): () => void {
    const sub: Subscription = {
      id: this.nextId++,
      type,
      handler: handler as EventHandler,
      once: true,
      priority: 0,
    };
    this.addSubscription(sub);
    return () => this.removeSubscription(type, sub.id);
  }

  off(type: GridEventType, handler: EventHandler): void {
    const subs = this.subscriptions.get(type);
    if (!subs) return;
    const index = subs.findIndex((s) => s.handler === handler);
    if (index !== -1) subs.splice(index, 1);
  }

  emit<T>(type: GridEventType, payload: T): void {
    if (this.paused) {
      this.pendingQueue.push({ type, payload });
      return;
    }
    this.dispatch(type, payload);
  }

  emitAsync<T>(type: GridEventType, payload: T): Promise<void> {
    return Promise.resolve().then(() => this.emit(type, payload));
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    const queue = this.pendingQueue.splice(0);
    for (const { type, payload } of queue) {
      this.dispatch(type, payload);
    }
  }

  clear(type?: GridEventType): void {
    if (type) {
      this.subscriptions.delete(type);
    } else {
      this.subscriptions.clear();
    }
  }

  hasListeners(type: GridEventType): boolean {
    const subs = this.subscriptions.get(type);
    return !!subs && subs.length > 0;
  }

  private addSubscription(sub: Subscription): void {
    let subs = this.subscriptions.get(sub.type);
    if (!subs) {
      subs = [];
      this.subscriptions.set(sub.type, subs);
    }
    subs.push(sub);
    subs.sort((a, b) => b.priority - a.priority);
  }

  private removeSubscription(type: GridEventType, id: number): void {
    const subs = this.subscriptions.get(type);
    if (!subs) return;
    const index = subs.findIndex((s) => s.id === id);
    if (index !== -1) subs.splice(index, 1);
  }

  private dispatch(type: GridEventType, payload: unknown): void {
    const subs = this.subscriptions.get(type);
    if (!subs || subs.length === 0) return;

    const toRemove: number[] = [];
    for (const sub of [...subs]) {
      try {
        sub.handler(payload);
      } catch (err) {
        console.error(`[PhotonGrid] EventBus handler error for "${type}":`, err);
      }
      if (sub.once) toRemove.push(sub.id);
    }
    for (const id of toRemove) this.removeSubscription(type, id);
  }
}
