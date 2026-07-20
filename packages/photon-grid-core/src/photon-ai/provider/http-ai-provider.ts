import type { PhotonAIProviderConfig } from '../../types/photon-ai.types';
import { PhotonAIProviderType } from '../../types/photon-ai.types';
import { getPreset, type ProviderPreset } from './presets';
import {
  PhotonAIErrorKind,
  PhotonAIProviderError,
  type PhotonAIProvider,
  type PhotonAIProviderRequest,
  type PhotonAIRequest,
  type PhotonAIResponse,
} from './ai-provider.types';

/** Default request deadline. */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * The single, provider-agnostic {@link PhotonAIProvider}. It is driven entirely
 * by a consumer-supplied {@link PhotonAIProviderConfig}: pick a hosted
 * {@link PhotonAIProviderType} for out-of-the-box defaults (endpoint, model,
 * auth, wire format), or override any field — up to and including the full
 * request/response wire format via `requestTransformer`/`responseTransformer` —
 * to talk to any JSON HTTP model endpoint.
 *
 * Uses the native `fetch` API only (no SDK), so it runs in every browser Photon
 * Grid supports. The API key is read from config at request time and applied
 * with the provider's auth scheme; it is never hard-coded, cached, or logged.
 * Every failure mode — HTTP errors, rate limits, auth problems, safety blocks,
 * timeouts, and malformed JSON — surfaces as a categorized
 * {@link PhotonAIProviderError}.
 */
export class HttpAIProvider implements PhotonAIProvider {
  private readonly type: PhotonAIProviderType;
  private readonly preset: ProviderPreset | null;
  private readonly apiKey: string | undefined;
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly headers: Record<string, string>;
  private readonly temperature: number;
  private readonly timeoutMs: number;
  private readonly transformRequest: (request: PhotonAIRequest) => unknown;
  private readonly transformResponse: (response: unknown) => PhotonAIResponse;

  constructor(config: PhotonAIProviderConfig) {
    this.type = config.type ?? PhotonAIProviderType.Gemini;
    this.preset = getPreset(this.type);

    // A Custom provider ships no defaults — it must be fully specified.
    if (!this.preset) {
      if (!config.apiUrl || !config.requestTransformer || !config.responseTransformer) {
        throw new PhotonAIProviderError(
          PhotonAIErrorKind.Http,
          'A custom Photon AI provider requires apiUrl, requestTransformer, and responseTransformer.',
        );
      }
    }

    this.apiKey = config.apiKey?.trim() || undefined;
    this.apiUrl = config.apiUrl?.trim() || this.preset?.defaultApiUrl || '';
    this.model = config.model?.trim() || this.preset?.defaultModel || '';
    this.headers = { ...(config.headers ?? {}) };
    this.temperature = config.temperature ?? 0;
    this.timeoutMs = config.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;

    // Consumer transformers win; otherwise fall back to the preset's. The
    // Custom-provider guard above guarantees both exist when there's no preset.
    this.transformRequest = config.requestTransformer ?? this.preset!.transformRequest;
    this.transformResponse = config.responseTransformer ?? this.preset!.transformResponse;
  }

  async generate(request: PhotonAIProviderRequest): Promise<PhotonAIResponse> {
    const neutral: PhotonAIRequest = {
      systemInstruction: request.systemInstruction,
      userCommand: request.userCommand,
      gridContext: request.gridContext,
      model: this.model,
      temperature: this.temperature,
    };

    const body = this.transformRequest(neutral);
    const url = this.buildUrl();
    const headers = this.buildHeaders();

    const response = await this.fetchWithTimeout(url, headers, body, request.signal);
    const payload = await this.parseHttpResponse(response);
    return this.transformResponse(payload);
  }

  /** Resolves the final URL (auth-in-query for Gemini, plain otherwise). */
  private buildUrl(): string {
    if (this.preset) return this.preset.buildUrl(this.apiUrl, this.model, this.apiKey);
    return this.apiUrl;
  }

  /** Merges Content-Type + provider auth headers + consumer headers (consumer wins). */
  private buildHeaders(): Record<string, string> {
    const auth = this.preset ? this.preset.buildHeaders(this.apiKey) : {};
    return { 'Content-Type': 'application/json', ...auth, ...this.headers };
  }

  /** POSTs the request as JSON, enforcing the configured timeout via `AbortController`. */
  private async fetchWithTimeout(
    url: string,
    headers: Record<string, string>,
    body: unknown,
    external?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onExternalAbort = (): void => controller.abort();
    external?.addEventListener('abort', onExternalAbort, { once: true });

    try {
      return await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
    } catch (err) {
      if (external?.aborted) {
        throw new PhotonAIProviderError(PhotonAIErrorKind.Network, 'Photon AI request was cancelled.');
      }
      if (controller.signal.aborted) {
        throw new PhotonAIProviderError(
          PhotonAIErrorKind.Timeout,
          `The model did not respond within ${this.timeoutMs / 1000}s. Please try again.`,
        );
      }
      const detail = err instanceof Error ? err.message : String(err);
      throw new PhotonAIProviderError(PhotonAIErrorKind.Network, `Couldn't reach the model provider: ${detail}`);
    } finally {
      clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);
    }
  }

  /** Validates the HTTP status, mapping known failure statuses (auth, rate-limit) to categorized errors, and returns the parsed JSON body. */
  private async parseHttpResponse(response: Response): Promise<unknown> {
    if (response.ok) {
      try {
        return await response.json();
      } catch {
        throw new PhotonAIProviderError(
          PhotonAIErrorKind.InvalidResponse,
          'The model provider returned a response that was not valid JSON.',
        );
      }
    }

    const message = await this.readErrorMessage(response);
    const suffix = message ? ` ${message}` : '';

    if (response.status === 429) {
      throw new PhotonAIProviderError(
        PhotonAIErrorKind.RateLimit,
        `Rate limit reached. Please wait a moment and try again.${suffix}`,
        429,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new PhotonAIProviderError(
        PhotonAIErrorKind.Auth,
        `The model provider rejected the API key (HTTP ${response.status}).${suffix}`,
        response.status,
      );
    }
    throw new PhotonAIProviderError(
      PhotonAIErrorKind.Http,
      `The model provider request failed (HTTP ${response.status}).${suffix}`,
      response.status,
    );
  }

  /** Best-effort extraction of a provider error message from a non-2xx body (`{ error: { message } }` or `{ error: "..." }`). */
  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { error?: { message?: string } | string };
      if (typeof payload.error === 'string') return payload.error.trim();
      return payload.error?.message?.trim() ?? '';
    } catch {
      return '';
    }
  }
}
