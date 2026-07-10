export { PhotonGrid, default } from './photon-grid';

// Re-export the core types for convenience so consumers can import column and
// option types straight from the Vue package. Types only — the core runtime is
// a peer dependency, not bundled.
export type * from 'photon-grid-core';
