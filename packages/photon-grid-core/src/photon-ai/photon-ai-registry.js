/**
 * Catalog of every intent Photon AI can recognize. Pure storage — matching
 * input against the catalog is `IntentParser`'s job, not this class's; this
 * keeps "what intents exist" fully decoupled from "how text is matched to
 * one of them".
 *
 * Any grid feature can extend the catalog at runtime via {@link register} —
 * built-in intents (sort, filter, pin, …) register themselves exactly the
 * same way a future custom feature would, so there is no special-casing
 * between "built-in" and "user-defined" commands.
 */
export class PhotonAICommandRegistry {
    constructor() {
        this.intents = new Map();
    }
    /** Registers an intent, replacing any existing one with the same `key`. */
    register(intent) {
        this.intents.set(intent.key, intent);
    }
    /** Registers several intents in one call — a small convenience for a feature's `registerAI()` entry point. */
    registerAll(intents) {
        for (const intent of intents)
            this.register(intent);
    }
    unregister(key) {
        this.intents.delete(key);
    }
    get(key) {
        return this.intents.get(key);
    }
    getAll() {
        return Array.from(this.intents.values());
    }
    has(key) {
        return this.intents.has(key);
    }
    clear() {
        this.intents.clear();
    }
}
//# sourceMappingURL=photon-ai-registry.js.map