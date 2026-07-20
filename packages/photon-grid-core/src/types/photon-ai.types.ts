import type { PhotonAIRequest, PhotonAIResponse } from '../photon-ai/provider/ai-provider.types';

/**
 * Configuration for Photon AI — the grid's natural-language command bar.
 *
 * Photon AI runs in one of two interchangeable modes, chosen entirely by this
 * config:
 *
 * - **Deterministic** (default) — a zero-dependency, offline rule-based
 *   interpreter that normalizes text, matches it against a registry of known
 *   intents, and translates the result into calls against the existing
 *   {@link GridApi}. No network calls, no external AI services.
 * - **Generative** — when a {@link PhotonAIProviderConfig} is supplied (via
 *   {@link provider}), the same grid context (columns, capabilities, current
 *   state) is sent to a large-language-model provider, whose structured JSON
 *   response is executed through the *identical* command pipeline. The public
 *   API, intent registry, and command executor are shared between both modes,
 *   so switching backends never changes how consumers call Photon AI.
 *
 * @see {@link PhotonAIService} in `src/photon-ai/photon-ai-service.ts` for the
 * runtime pipeline this config drives.
 */
export interface PhotonAIConfig {
  /** Photon AI is otherwise fully inert — every consumer must opt in explicitly. */
  enabled: boolean;

  /** Placeholder text shown in the empty command input. @default "Ask Photon AI..." */
  placeholder?: string;

  /** Whether the panel starts open on grid mount. @default false */
  defaultOpen?: boolean;

  /**
   * Opt-in generative back-end. When present **and** usable (a valid API key
   * for a hosted provider, or a full {@link PhotonAIProviderType.Custom}
   * setup), Photon AI routes prompts through the configured large-language-
   * model provider instead of the built-in deterministic interpreter. Omit it
   * to keep the fully-offline deterministic behaviour — nothing else changes.
   */
  provider?: PhotonAIProviderConfig;
}

/**
 * Identifies which generative back-end Photon AI should use. Each hosted
 * provider ships with a built-in preset (default endpoint, model, auth scheme,
 * and request/response transformers), so the consumer typically only supplies
 * an {@link PhotonAIProviderConfig.apiKey}. Use {@link Custom} to point Photon
 * AI at any other JSON HTTP endpoint via transformers.
 */
export enum PhotonAIProviderType {
  /** Google Gemini via the public Generative Language REST API. */
  Gemini = 'gemini',
  /** OpenAI (or OpenAI-compatible) Chat Completions API. */
  OpenAI = 'openai',
  /** Anthropic Claude Messages API. */
  Anthropic = 'anthropic',
  /** Any other HTTP JSON endpoint — requires {@link PhotonAIProviderConfig.apiUrl} plus both transformers. */
  Custom = 'custom',
}

/**
 * Connection + behaviour settings for a generative Photon AI back-end,
 * supplied entirely by the consumer app. This is the single source of the API
 * key and endpoint — Photon AI never hard-codes either, and reads them from
 * here at request time.
 *
 * The whole point of this shape is that **the AI is configured completely from
 * the consumer app**: pick a hosted {@link PhotonAIProviderType} and get
 * sensible defaults for every required field (endpoint, model, wire format),
 * or override any of them — including the full request/response wire format via
 * {@link requestTransformer}/{@link responseTransformer} — to talk to any model
 * you like.
 *
 * @remarks
 * For hosted providers the key is sent from the browser, so it must be one you
 * are comfortable exposing client-side (e.g. restricted by allowed origins /
 * referrer). For stricter secrecy, proxy requests through your own backend and
 * point {@link apiUrl} at that proxy (optionally with {@link PhotonAIProviderType.Custom}).
 */
export interface PhotonAIProviderConfig {
  /**
   * Which provider preset to use. Selects the default endpoint, model, auth
   * scheme, and wire transformers. @default {@link PhotonAIProviderType.Gemini}
   */
  type?: PhotonAIProviderType;

  /**
   * The provider API key, read from this config at request time and applied
   * using the provider's auth scheme (Gemini: `?key=`; OpenAI:
   * `Authorization: Bearer`; Anthropic: `x-api-key`). Never logged or persisted
   * by Photon AI. Optional for {@link PhotonAIProviderType.Custom} setups that
   * authenticate via {@link headers} instead.
   */
  apiKey?: string;

  /**
   * Model identifier to invoke. Defaults to the selected provider's
   * recommended fast model when omitted.
   *
   * @default "gemini-2.5-flash" (Gemini) · "gpt-4o-mini" (OpenAI) · "claude-haiku-4-5-20251001" (Anthropic)
   */
  model?: string;

  /**
   * Override the provider's REST endpoint. Defaults to the selected provider's
   * public endpoint. **Required** for {@link PhotonAIProviderType.Custom}. May
   * contain a `{model}` placeholder (substituted with {@link model}) — used by
   * the Gemini preset.
   */
  apiUrl?: string;

  /**
   * Extra HTTP headers merged into every request (after the provider's own
   * auth headers, so these win on conflict). Use for a proxy token, org id,
   * or custom auth in a {@link PhotonAIProviderType.Custom} setup.
   */
  headers?: Record<string, string>;

  /**
   * Extra domain guidance appended to Photon AI's built-in system instruction
   * — e.g. house rules or product vocabulary. The core instruction (output
   * contract, capability catalog) is always sent regardless.
   */
  systemInstruction?: string;

  /**
   * Sampling temperature. Lower is more deterministic — recommended for
   * command interpretation. @default 0
   */
  temperature?: number;

  /**
   * Abort the request if the provider has not responded within this many
   * milliseconds. @default 30000
   */
  requestTimeoutMs?: number;

  /**
   * Fully override how Photon AI builds the request body from the neutral
   * {@link PhotonAIRequest}. Return the exact JSON value POSTed to
   * {@link apiUrl}. When omitted, the selected provider's built-in transformer
   * is used. **Required** for {@link PhotonAIProviderType.Custom}.
   */
  requestTransformer?: (request: PhotonAIRequest) => unknown;

  /**
   * Fully override how Photon AI parses the provider's raw JSON response into
   * the structured {@link PhotonAIResponse} (actions + reply). When omitted,
   * the selected provider's built-in transformer is used. **Required** for
   * {@link PhotonAIProviderType.Custom}.
   */
  responseTransformer?: (response: unknown) => PhotonAIResponse;
}
