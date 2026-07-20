import type { PhotonAIProviderConfig } from '../../types/photon-ai.types';
import { PhotonAIProviderType } from '../../types/photon-ai.types';
import { HttpAIProvider } from './http-ai-provider';
import type { PhotonAIProvider } from './ai-provider.types';

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
} from './ai-provider.types';
export { PhotonAIErrorKind, PhotonAIProviderError, describeProviderError } from './ai-provider.types';
export { HttpAIProvider } from './http-ai-provider';
export { GridContextBuilder } from './grid-context-builder';
export { CommandNormalizer } from './command-normalizer';
export { buildSystemInstruction, serializeGridContext } from './system-prompt';
export { getPreset, coerceGeneration, parseGenerationText, type ProviderPreset } from './presets';
export { buildUserPromptText, normalizeActions } from './response-parsing';

/**
 * Instantiates the {@link PhotonAIProvider} described by a
 * {@link PhotonAIProviderConfig}. Returns `null` when no *usable* provider can
 * be built — this is the signal for
 * {@link import('../photon-ai-service').PhotonAIService} to stay in its default
 * deterministic mode rather than fail. Configuring a provider is always
 * strictly additive: a missing key or an incomplete custom setup silently
 * keeps the offline pipeline.
 *
 * "Usable" means:
 * - a hosted provider (Gemini/OpenAI/Anthropic) with an API key, or auth
 *   supplied via `headers`; or
 * - a {@link PhotonAIProviderType.Custom} provider with an endpoint and both
 *   transformers.
 *
 * Every provider type routes through the single {@link HttpAIProvider}; adding a
 * new hosted provider is just a new preset, not a new class.
 */
export function createAIProvider(config: PhotonAIProviderConfig | undefined): PhotonAIProvider | null {
  if (!config) return null;

  const type = config.type ?? PhotonAIProviderType.Gemini;

  if (type === PhotonAIProviderType.Custom) {
    if (!config.apiUrl || !config.requestTransformer || !config.responseTransformer) return null;
  } else if (!config.apiKey?.trim() && !config.headers) {
    // A hosted provider with no way to authenticate — fall back to deterministic.
    return null;
  }

  return new HttpAIProvider(config);
}
