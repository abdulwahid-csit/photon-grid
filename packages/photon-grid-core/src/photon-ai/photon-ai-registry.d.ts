import type { IntentDefinition } from './photon-ai.types';
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
export declare class PhotonAICommandRegistry {
    private readonly intents;
    /** Registers an intent, replacing any existing one with the same `key`. */
    register(intent: IntentDefinition): void;
    /** Registers several intents in one call — a small convenience for a feature's `registerAI()` entry point. */
    registerAll(intents: readonly IntentDefinition[]): void;
    unregister(key: string): void;
    get(key: string): IntentDefinition | undefined;
    getAll(): IntentDefinition[];
    has(key: string): boolean;
    clear(): void;
}
//# sourceMappingURL=photon-ai-registry.d.ts.map