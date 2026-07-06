/**
 * Turns a matched intent plus its raw remaining tokens into a validated
 * {@link PhotonCommand}. Deliberately thin — entity extraction lives in
 * `EntityResolver`, command shape lives in the intent itself
 * (`IntentDefinition.buildCommand`) — this class exists as the one seam
 * between "resolve" and "build" where validation, logging, or a future
 * confirmation step can be added without touching either side.
 */
export class CommandBuilder {
    build(intent, tokens, resolver, columns, api) {
        const entities = intent.resolveEntities(tokens, resolver, columns, api);
        const validationError = intent.validate?.(entities);
        if (validationError)
            return { command: null, error: validationError };
        return { command: intent.buildCommand(entities), error: null };
    }
}
//# sourceMappingURL=command-builder.js.map