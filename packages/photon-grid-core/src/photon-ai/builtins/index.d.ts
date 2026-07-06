import type { PhotonAICommandRegistry } from '../photon-ai-registry';
/**
 * Registers every built-in Photon AI intent (sort, filter, pin, column
 * visibility, grouping, selection, column reordering). Each feature owns
 * its own file and registration function — this is purely an aggregator, so
 * adding a new built-in category never means editing a giant switch
 * statement here.
 */
export declare function registerBuiltinCommands(registry: PhotonAICommandRegistry): void;
//# sourceMappingURL=index.d.ts.map