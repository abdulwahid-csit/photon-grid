import type { ColumnDef } from '../types/column.types';
import type { GridApi } from '../core/grid-api';
import type { EntityResolver } from './entity-resolver';
import type { IntentDefinition, PhotonCommand } from './photon-ai.types';
/** Result of {@link CommandBuilder.build} — exactly one of `command` or `error` is set. */
export interface BuildResult {
    readonly command: PhotonCommand | null;
    readonly error: string | null;
}
/**
 * Turns a matched intent plus its raw remaining tokens into a validated
 * {@link PhotonCommand}. Deliberately thin — entity extraction lives in
 * `EntityResolver`, command shape lives in the intent itself
 * (`IntentDefinition.buildCommand`) — this class exists as the one seam
 * between "resolve" and "build" where validation, logging, or a future
 * confirmation step can be added without touching either side.
 */
export declare class CommandBuilder {
    build(intent: IntentDefinition, tokens: string[], resolver: EntityResolver, columns: ColumnDef[], api: GridApi): BuildResult;
}
//# sourceMappingURL=command-builder.d.ts.map