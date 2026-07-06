export class EventBus {
    constructor() {
        this.subscriptions = new Map();
        this.nextId = 1;
        this.paused = false;
        this.pendingQueue = [];
    }
    on(type, handler, priority = 0) {
        const sub = {
            id: this.nextId++,
            type,
            handler: handler,
            once: false,
            priority,
        };
        this.addSubscription(sub);
        return () => this.removeSubscription(type, sub.id);
    }
    once(type, handler) {
        const sub = {
            id: this.nextId++,
            type,
            handler: handler,
            once: true,
            priority: 0,
        };
        this.addSubscription(sub);
        return () => this.removeSubscription(type, sub.id);
    }
    off(type, handler) {
        const subs = this.subscriptions.get(type);
        if (!subs)
            return;
        const index = subs.findIndex((s) => s.handler === handler);
        if (index !== -1)
            subs.splice(index, 1);
    }
    emit(type, payload) {
        if (this.paused) {
            this.pendingQueue.push({ type, payload });
            return;
        }
        this.dispatch(type, payload);
    }
    emitAsync(type, payload) {
        return Promise.resolve().then(() => this.emit(type, payload));
    }
    pause() {
        this.paused = true;
    }
    resume() {
        this.paused = false;
        const queue = this.pendingQueue.splice(0);
        for (const { type, payload } of queue) {
            this.dispatch(type, payload);
        }
    }
    clear(type) {
        if (type) {
            this.subscriptions.delete(type);
        }
        else {
            this.subscriptions.clear();
        }
    }
    hasListeners(type) {
        const subs = this.subscriptions.get(type);
        return !!subs && subs.length > 0;
    }
    addSubscription(sub) {
        let subs = this.subscriptions.get(sub.type);
        if (!subs) {
            subs = [];
            this.subscriptions.set(sub.type, subs);
        }
        subs.push(sub);
        subs.sort((a, b) => b.priority - a.priority);
    }
    removeSubscription(type, id) {
        const subs = this.subscriptions.get(type);
        if (!subs)
            return;
        const index = subs.findIndex((s) => s.id === id);
        if (index !== -1)
            subs.splice(index, 1);
    }
    dispatch(type, payload) {
        const subs = this.subscriptions.get(type);
        if (!subs || subs.length === 0)
            return;
        const toRemove = [];
        for (const sub of [...subs]) {
            try {
                sub.handler(payload);
            }
            catch (err) {
                console.error(`[PhotonGrid] EventBus handler error for "${type}":`, err);
            }
            if (sub.once)
                toRemove.push(sub.id);
        }
        for (const id of toRemove)
            this.removeSubscription(type, id);
    }
}
//# sourceMappingURL=event-bus.js.map