export { PhotonGrid, default } from './photon-grid';

// Vue-flavoured Master/Detail renderers. `PhotonGridOptions` widens the core's
// `masterDetail.renderer` to accept a Vue component; the helpers are exported
// for consumers who want to adapt a renderer themselves (e.g. when building
// options outside a `<PhotonGrid>` binding).
export {
  adaptVueDetailRenderer,
  adaptVueOptions,
  createVueDetailRenderer,
} from './vue-renderer-adapter';
export type {
  PhotonGridOptions,
  VueDetailRenderer,
  VueMasterDetailConfig,
} from './vue-renderer-adapter';

// Re-export the core types for convenience so consumers can import column and
// option types straight from the Vue package. Types only — the core runtime is
// a peer dependency, not bundled.
export type * from 'photon-grid-core';

// `PhotonAIProviderType` is an enum (a runtime value, not just a type), so it
// needs a value re-export in addition to the `export type *` above — this is
// what lets consumers write `provider: { type: PhotonAIProviderType.Gemini }`
// when configuring the AI panel's Gemini back-end via `options.photonAI`.
export { PhotonAIProviderType } from 'photon-grid-core';

// Same reason: `LoadingIndicator` and `LoadingBackdrop` are enums, so the
// `export type *` above does not carry their runtime values. Needed to write
// `loadingOverlay: { indicator: LoadingIndicator.Skeleton }` when shaping the
// overlay behind the `:loading` prop.
export { LoadingBackdrop, LoadingIndicator } from 'photon-grid-core';

