export { PhotonGrid, default } from './photon-grid';

// Re-export the core types for convenience so consumers can import column and
// option types straight from the Vue package. Types only — the core runtime is
// a peer dependency, not bundled.
export type * from 'photon-grid-core';

// `PhotonAIProviderType` is an enum (a runtime value, not just a type), so it
// needs a value re-export in addition to the `export type *` above — this is
// what lets consumers write `provider: { type: PhotonAIProviderType.Gemini }`
// when configuring the AI panel's Gemini back-end via `options.photonAI`.
export { PhotonAIProviderType } from 'photon-grid-core';

