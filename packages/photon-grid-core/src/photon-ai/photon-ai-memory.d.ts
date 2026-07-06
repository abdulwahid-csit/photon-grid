import type { PhotonCommand } from './photon-ai.types';
/**
 * Persistent "learning" layer for Photon AI. Every grid feature (sort,
 * filter, pin, …) already resolves entities from scratch on every prompt;
 * this store lets two kinds of resolution get *remembered* across page
 * loads so the same or a similar prompt resolves instantly next time,
 * without re-running fuzzy matching:
 *
 * - **Column aliases** — once a free-text phrase (e.g. "emp name") is
 *   fuzzily resolved to a real column (e.g. `colId: "name"`), that mapping
 *   is remembered so the next lookup is an exact hit rather than a fuzzy
 *   guess.
 * - **Phrase → commands** — once a whole clause (e.g. "show active items")
 *   successfully resolves to a set of commands, the exact clause text is
 *   remembered so retyping it later skips parsing entirely.
 *
 * Backed by `localStorage`, namespaced per grid instance (by its column
 * signature) so unrelated grids on the same page/origin never share learned
 * state. Falls back to an in-memory-only store when `localStorage` is
 * unavailable (SSR, privacy mode) or throws — Photon AI must never fail a
 * command because persistence isn't available.
 */
export declare class PhotonAIMemoryStore {
    private readonly storageKey;
    private snapshot;
    constructor(namespace: string);
    /** The colId previously learned for this exact free-text phrase, or `null`. */
    getColumnAlias(phrase: string): string | null;
    /** Remembers that `phrase` refers to `colId`, persisting immediately. */
    learnColumnAlias(phrase: string, colId: string): void;
    /** The commands previously learned for this exact normalized clause, or `null`. */
    getPhraseCommands(clause: string): PhotonCommand[] | null;
    /** Remembers that submitting `clause` should run `commands`, persisting immediately. */
    learnPhrase(clause: string, commands: readonly PhotonCommand[]): void;
    /** Clears every learned column alias and phrase for this namespace. */
    clear(): void;
    private load;
    private persist;
}
/** Builds a stable namespace for a grid's column set, so learned memory doesn't leak between differently-shaped grids sharing an origin. */
export declare function columnSignature(colIds: readonly string[]): string;
//# sourceMappingURL=photon-ai-memory.d.ts.map