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

// ── Master/Detail custom renderers ───────────────────────────────────────────
// The Angular-flavoured `renderer` / `props` / `events` surface lives in
// `angular-renderer.types` (exported above); these are the core types those
// signatures are built from, re-exported so a consumer can annotate a detail
// component or an event handler without importing photon-grid-core directly.
export type {
    DetailComponent,
    DetailContext,
    DetailEvent,
    DetailEventHandler,
    DetailEventHandlerMap,
    MasterDetailConfig,
} from 'photon-grid-core';
export { EmptyDetailToggleMode } from 'photon-grid-core';

// ── Loading state ────────────────────────────────────────────────────────────
// Drive the overlay with the `[loading]` input on PhotonGridComponent and shape
// it through `[options]`' `loadingOverlay` field. `LoadingIndicator` and
// `LoadingBackdrop` are enums (runtime values), so they are re-exported as
// values, not just types.
export { LoadingBackdrop, LoadingIndicator } from 'photon-grid-core';
export type {
    LoadingChangedEvent,
    LoadingOverlayConfig,
    ResolvedLoadingOverlayConfig,
} from 'photon-grid-core';

