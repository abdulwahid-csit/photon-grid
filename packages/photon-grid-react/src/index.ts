export * from './photon-grid';
export * from './react-renderer-adapter';

// ── Photon AI configuration ──────────────────────────────────────────────────
// Re-exported so consumers can configure the AI panel (and its optional
// generative provider — Gemini, OpenAI, Anthropic, or a fully Custom endpoint)
// straight from the React package. Configure it via `options.photonAI` — see
// the `options` prop on <PhotonGrid /> for an example.
export { PhotonAIProviderType } from 'photon-grid-core';
export type { PhotonAIConfig, PhotonAIProviderConfig, PhotonAIRequest, PhotonAIResponse } from 'photon-grid-core';
