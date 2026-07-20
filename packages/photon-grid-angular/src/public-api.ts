/*
 * Public API surface of photon-grid-angular.
 */

export * from './library/photon-grid.component';
export * from './library/photon-grid.module';
export * from './library/angular-renderer.types';

// Re-export the most commonly needed core types so consumers can bind the
// wrapper without importing photon-grid-core directly.
export type {
    GridApi,
    GridOptions,
} from 'photon-grid-core';
export { GridEventType } from 'photon-grid-core';

// ── Photon AI configuration ──────────────────────────────────────────────────
// Configure the AI panel (and its optional generative provider — Gemini,
// OpenAI, Anthropic, or a fully Custom endpoint) through the `[options]`
// input's `photonAI` field — see the `options` input on PhotonGridComponent for
// an example. `PhotonAIProviderType` is an enum (a runtime value), so it is
// re-exported as a value, not just a type.
export { PhotonAIProviderType } from 'photon-grid-core';
export type { PhotonAIConfig, PhotonAIProviderConfig, PhotonAIRequest, PhotonAIResponse } from 'photon-grid-core';

