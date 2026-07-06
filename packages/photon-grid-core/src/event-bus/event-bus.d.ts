import type { GridEventType } from '../types/event.types';
export type EventHandler<T = unknown> = (payload: T) => void;
export declare class EventBus {
    private subscriptions;
    private nextId;
    private paused;
    private pendingQueue;
    on<T>(type: GridEventType, handler: EventHandler<T>, priority?: number): () => void;
    once<T>(type: GridEventType, handler: EventHandler<T>): () => void;
    off(type: GridEventType, handler: EventHandler): void;
    emit<T>(type: GridEventType, payload: T): void;
    emitAsync<T>(type: GridEventType, payload: T): Promise<void>;
    pause(): void;
    resume(): void;
    clear(type?: GridEventType): void;
    hasListeners(type: GridEventType): boolean;
    private addSubscription;
    private removeSubscription;
    private dispatch;
}
//# sourceMappingURL=event-bus.d.ts.map