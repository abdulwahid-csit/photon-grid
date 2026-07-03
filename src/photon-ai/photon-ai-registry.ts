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
export class PhotonAICommandRegistry {
  private readonly intents = new Map<string, IntentDefinition>();

  /** Registers an intent, replacing any existing one with the same `key`. */
  register(intent: IntentDefinition): void {
    this.intents.set(intent.key, intent);
  }

  /** Registers several intents in one call — a small convenience for a feature's `registerAI()` entry point. */
  registerAll(intents: readonly IntentDefinition[]): void {
    for (const intent of intents) this.register(intent);
  }

  unregister(key: string): void {
    this.intents.delete(key);
  }

  get(key: string): IntentDefinition | undefined {
    return this.intents.get(key);
  }

  getAll(): IntentDefinition[] {
    return Array.from(this.intents.values());
  }

  has(key: string): boolean {
    return this.intents.has(key);
  }

  clear(): void {
    this.intents.clear();
  }
}
