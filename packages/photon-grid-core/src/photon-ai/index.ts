export { PhotonAIService } from './photon-ai-service';
export { PhotonAIPanel } from './photon-ai-panel';
export { PhotonAICommandRegistry } from './photon-ai-registry';
export { IntentParser } from './intent-parser';
export { EntityResolver } from './entity-resolver';
export type { OperatorMatch, ValueMatch } from './entity-resolver';
export { CommandBuilder } from './command-builder';
export { CommandExecutor } from './command-executor';
export { registerBuiltinCommands } from './builtins';
export { normalizeInput, tokenize, stemWord } from './text-normalizer';
export { splitClauses } from './query-splitter';
export { PhotonAIMemoryStore, columnSignature } from './photon-ai-memory';
export { levenshteinDistance, similarity } from './fuzzy-match';
export type {
  PhotonCommand,
  PhotonCommandResult,
  ResolvedEntities,
  IntentDefinition,
  ParsedIntentMatch,
} from './photon-ai.types';

// ── Generative provider (config-driven HTTP provider + provider-agnostic contracts) ──
export {
  createAIProvider,
  HttpAIProvider,
  GridContextBuilder,
  CommandNormalizer,
  buildSystemInstruction,
  serializeGridContext,
  parseGenerationText,
  coerceGeneration,
  PhotonAIErrorKind,
  PhotonAIProviderError,
  describeProviderError,
} from './provider';
export type {
  PhotonAIProvider,
  PhotonAIProviderRequest,
  PhotonAIRequest,
  PhotonAIResponse,
  PhotonAIGeneration,
  PhotonAIAction,
  PhotonGridContext,
  PhotonAIColumnContext,
  PhotonAICapability,
  PhotonAIGridState,
  PhotonAISortState,
  PhotonAIFilterState,
  ProviderPreset,
} from './provider';
