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

// ── Assistant: docs/examples, code generation, data analysis, diagnostics ──
export { PhotonAIAssistant, AssistantRequestKind } from './photon-ai-assistant';
export type { AssistantResult } from './photon-ai-assistant';
export { KNOWLEDGE_ARTICLES } from './knowledge/knowledge-base';
export type { KnowledgeArticle } from './knowledge/knowledge-base';
export { retrieveArticles, serializeArticles } from './knowledge/knowledge-retriever';
export type { RetrievedArticle } from './knowledge/knowledge-retriever';
export { ScaffoldGenerator } from './knowledge/scaffold-generator';
export { DataAnalysisService } from './insight/data-analysis-service';
export type {
  DatasetAnalysis,
  NumericSummary,
  DimensionSummary,
  CategoryBreakdown,
  CorrelationPair,
} from './insight/data-analysis-service';
export { GridDoctor, DiagnosticSeverity, DiagnosticCategory } from './insight/grid-doctor';
export type { Diagnostic } from './insight/grid-doctor';
export { parseMarkdown, parseInline } from './chat/markdown-parser';
export type { MarkdownBlock, InlineSpan } from './chat/markdown-parser';
export { renderMarkdown } from './chat/markdown-renderer';

// ── Generative provider (config-driven HTTP provider + provider-agnostic contracts) ──
export {
  createAIProvider,
  HttpAIProvider,
  GridContextBuilder,
  ContextRouter,
  domainsForIntentKey,
  CommandNormalizer,
  buildSystemInstruction,
  serializeGridContext,
  parseGenerationText,
  coerceGeneration,
  PhotonAIErrorKind,
  PhotonAIProviderError,
  PhotonAIDomain,
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
  PhotonAIContextScope,
  ProviderPreset,
} from './provider';
