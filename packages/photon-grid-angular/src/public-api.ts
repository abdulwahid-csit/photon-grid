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
