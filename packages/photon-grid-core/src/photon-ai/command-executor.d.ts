import type { GridApi } from '../core/grid-api';
import type { PhotonAICommandRegistry } from './photon-ai-registry';
import type { PhotonCommand, PhotonCommandResult } from './photon-ai.types';
/**
 * Executes a validated {@link PhotonCommand} against the live `GridApi`.
 * Never bypasses it — every intent's `execute` (see `IntentDefinition`) is
 * itself written purely in terms of `GridApi` calls, and this class's only
 * job is to look the right one up by `command.type` and run it safely.
 */
export declare class CommandExecutor {
    private registry;
    constructor(registry: PhotonAICommandRegistry);
    execute(command: PhotonCommand, api: GridApi): PhotonCommandResult;
}
//# sourceMappingURL=command-executor.d.ts.map