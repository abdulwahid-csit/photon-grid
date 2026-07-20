import { PhotonAIProviderType } from '../../types/photon-ai.types';
import {
  PhotonAIErrorKind,
  PhotonAIProviderError,
  type PhotonAIRequest,
  type PhotonAIResponse,
} from './ai-provider.types';
import { buildUserPromptText, coerceGeneration, parseGenerationText } from './response-parsing';

/**
 * A built-in provider preset: everything Photon AI needs to talk to a hosted
 * LLM out of the box — default endpoint + model, how to place auth, and the
 * request/response wire transformers. A consumer overrides any of these
 * through {@link import('../../types/photon-ai.types').PhotonAIProviderConfig},
 * so a preset is only the *default* wiring, never a hard requirement.
 */
export interface ProviderPreset {
  /** Default REST endpoint. May contain a `{model}` placeholder (Gemini). */
  readonly defaultApiUrl: string;
  /** Default model id for this provider. */
  readonly defaultModel: string;
  /** Builds the final request URL from the resolved endpoint, model, and key. */
  buildUrl(apiUrl: string, model: string, apiKey: string | undefined): string;
  /** Builds provider auth/headers from the key. Merged *under* consumer `headers`. */
  buildHeaders(apiKey: string | undefined): Record<string, string>;
  /** Default request-body transformer (overridable via config). */
  transformRequest(request: PhotonAIRequest): unknown;
  /** Default response parser (overridable via config). */
  transformResponse(response: unknown): PhotonAIResponse;
}

/** Substitutes `{model}` and appends `key=` to a URL, respecting any existing query string. */
function geminiUrl(apiUrl: string, model: string, apiKey: string | undefined): string {
  const withModel = apiUrl.replace('{model}', encodeURIComponent(model));
  if (!apiKey) return withModel;
  const separator = withModel.includes('?') ? '&' : '?';
  return `${withModel}${separator}key=${encodeURIComponent(apiKey)}`;
}

/** Reads a nested text field out of an arbitrary parsed JSON body via a path of keys/indices. Returns '' if any hop is missing. */
function readText(source: unknown, path: readonly (string | number)[]): string {
  let current: unknown = source;
  for (const key of path) {
    if (current == null) return '';
    current = (current as Record<string | number, unknown>)[key];
  }
  return typeof current === 'string' ? current : '';
}

const GEMINI_PRESET: ProviderPreset = {
  defaultApiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
  defaultModel: 'gemini-2.5-flash',
  buildUrl: geminiUrl,
  buildHeaders: () => ({}),
  transformRequest: (request) => ({
    systemInstruction: { parts: [{ text: request.systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: buildUserPromptText(request) }] }],
    generationConfig: {
      // Forces Gemini to always return a parseable JSON object.
      responseMimeType: 'application/json',
      temperature: request.temperature,
    },
  }),
  transformResponse: (response) => {
    const payload = response as {
      promptFeedback?: { blockReason?: string };
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    };
    if (payload.promptFeedback?.blockReason) {
      throw new PhotonAIProviderError(
        PhotonAIErrorKind.Blocked,
        `Gemini blocked the request (${payload.promptFeedback.blockReason}).`,
      );
    }
    const candidate = payload.candidates?.[0];
    if (!candidate) {
      throw new PhotonAIProviderError(PhotonAIErrorKind.Blocked, 'Gemini returned no answer for that request.');
    }
    const text = candidate.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return parseGenerationText(text);
  },
};

const OPENAI_PRESET: ProviderPreset = {
  defaultApiUrl: 'https://api.openai.com/v1/chat/completions',
  defaultModel: 'gpt-4o-mini',
  buildUrl: (apiUrl) => apiUrl,
  buildHeaders: (apiKey) => {
    const headers: Record<string, string> = {};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    return headers;
  },
  transformRequest: (request) => ({
    model: request.model,
    temperature: request.temperature,
    // Forces a JSON object back (system instruction already mentions JSON, as OpenAI requires).
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: request.systemInstruction },
      { role: 'user', content: buildUserPromptText(request) },
    ],
  }),
  transformResponse: (response) => parseGenerationText(readText(response, ['choices', 0, 'message', 'content'])),
};

const ANTHROPIC_PRESET: ProviderPreset = {
  defaultApiUrl: 'https://api.anthropic.com/v1/messages',
  defaultModel: 'claude-haiku-4-5-20251001',
  buildUrl: (apiUrl) => apiUrl,
  buildHeaders: (apiKey) => {
    const headers: Record<string, string> = {
      'anthropic-version': '2023-06-01',
      // Required for calling the Anthropic API directly from a browser.
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    if (apiKey) headers['x-api-key'] = apiKey;
    return headers;
  },
  transformRequest: (request) => ({
    model: request.model,
    max_tokens: 1024,
    temperature: request.temperature,
    system: request.systemInstruction,
    messages: [{ role: 'user', content: buildUserPromptText(request) }],
  }),
  transformResponse: (response) => parseGenerationText(readText(response, ['content', 0, 'text'])),
};

/**
 * Built-in presets by provider type. {@link PhotonAIProviderType.Custom} has no
 * preset — a custom setup must supply its endpoint and both transformers.
 */
const PRESETS: Readonly<Record<PhotonAIProviderType, ProviderPreset | null>> = {
  [PhotonAIProviderType.Gemini]: GEMINI_PRESET,
  [PhotonAIProviderType.OpenAI]: OPENAI_PRESET,
  [PhotonAIProviderType.Anthropic]: ANTHROPIC_PRESET,
  [PhotonAIProviderType.Custom]: null,
};

/** The preset for a provider type, or `null` for {@link PhotonAIProviderType.Custom}. */
export function getPreset(type: PhotonAIProviderType): ProviderPreset | null {
  return PRESETS[type] ?? null;
}

/** Re-exported so a consumer's custom `responseTransformer` can reuse Photon AI's validated JSON→response coercion. */
export { coerceGeneration, parseGenerationText };
