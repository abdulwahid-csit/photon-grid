export * from './photon-grid';
export * from './react-renderer-adapter';

// ── Photon AI configuration ──────────────────────────────────────────────────
// Re-exported so consumers can configure the AI panel (and its optional
// generative provider — Gemini, OpenAI, Anthropic, or a fully Custom endpoint)
// straight from the React package. Configure it via `options.photonAI` — see
// the `options` prop on <PhotonGrid /> for an example.
export { PhotonAIProviderType } from 'photon-grid-core';
export type { PhotonAIConfig, PhotonAIProviderConfig, PhotonAIRequest, PhotonAIResponse } from 'photon-grid-core';

// ── Loading state ────────────────────────────────────────────────────────────
// Drive the overlay with the `loading` prop on <PhotonGrid /> and shape it
// through `options.loadingOverlay`. `LoadingIndicator` and `LoadingBackdrop`
// are enums (runtime values), so they need value re-exports, not just types.
export { LoadingBackdrop, LoadingIndicator } from 'photon-grid-core';
export type {
  LoadingChangedEvent,
  LoadingOverlayConfig,
  ResolvedLoadingOverlayConfig,
} from 'photon-grid-core';
