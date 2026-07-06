/**
 * Executes a validated {@link PhotonCommand} against the live `GridApi`.
 * Never bypasses it — every intent's `execute` (see `IntentDefinition`) is
 * itself written purely in terms of `GridApi` calls, and this class's only
 * job is to look the right one up by `command.type` and run it safely.
 */
export class CommandExecutor {
    constructor(registry) {
        this.registry = registry;
    }
    execute(command, api) {
        const intent = this.registry.get(command.type);
        if (!intent) {
            return { success: false, message: `No handler registered for "${command.type}".` };
        }
        try {
            const message = intent.execute(command, api);
            return { success: true, message, command };
        }
        catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            return { success: false, message: `Couldn't run that command: ${detail}`, command };
        }
    }
}
//# sourceMappingURL=command-executor.js.map