function emptySnapshot() {
    return { columnAliases: {}, phrases: {} };
}
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
export class PhotonAIMemoryStore {
    constructor(namespace) {
        this.storageKey = `photon-ai:memory:${namespace}`;
        this.snapshot = this.load();
    }
    /** The colId previously learned for this exact free-text phrase, or `null`. */
    getColumnAlias(phrase) {
        return this.snapshot.columnAliases[phrase] ?? null;
    }
    /** Remembers that `phrase` refers to `colId`, persisting immediately. */
    learnColumnAlias(phrase, colId) {
        if (!phrase || this.snapshot.columnAliases[phrase] === colId)
            return;
        this.snapshot.columnAliases[phrase] = colId;
        this.persist();
    }
    /** The commands previously learned for this exact normalized clause, or `null`. */
    getPhraseCommands(clause) {
        return this.snapshot.phrases[clause] ?? null;
    }
    /** Remembers that submitting `clause` should run `commands`, persisting immediately. */
    learnPhrase(clause, commands) {
        if (!clause || commands.length === 0)
            return;
        this.snapshot.phrases[clause] = [...commands];
        this.persist();
    }
    /** Clears every learned column alias and phrase for this namespace. */
    clear() {
        this.snapshot = emptySnapshot();
        this.persist();
    }
    load() {
        try {
            if (typeof localStorage === 'undefined')
                return emptySnapshot();
            const raw = localStorage.getItem(this.storageKey);
            if (!raw)
                return emptySnapshot();
            const parsed = JSON.parse(raw);
            return { columnAliases: parsed.columnAliases ?? {}, phrases: parsed.phrases ?? {} };
        }
        catch {
            return emptySnapshot();
        }
    }
    persist() {
        try {
            if (typeof localStorage === 'undefined')
                return;
            localStorage.setItem(this.storageKey, JSON.stringify(this.snapshot));
        }
        catch {
            // Storage unavailable/full/blocked — learning silently degrades to in-memory-only for this session.
        }
    }
}
/** Builds a stable namespace for a grid's column set, so learned memory doesn't leak between differently-shaped grids sharing an origin. */
export function columnSignature(colIds) {
    return [...colIds].sort().join('|');
}
//# sourceMappingURL=photon-ai-memory.js.map