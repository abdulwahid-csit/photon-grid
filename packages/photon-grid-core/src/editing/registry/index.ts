/**
 * The editing registry: where an editor *comes from*.
 *
 * Three collaborating pieces, deliberately separate:
 *
 * - {@link EditorRegistry} — editors by name (`cellEditor: 'select'`).
 * - {@link EditorAdapterRegistry} — the one framework seam, for editors the core
 *   could not possibly construct itself.
 * - {@link EditorResolver} — the documented priority chain that picks between
 *   them, plus the type → editor map that replaces the old `switch`.
 *
 * Import from this barrel rather than the individual files; the split between
 * them is an implementation detail.
 *
 * @packageDocumentation
 */

export { EditorRegistry } from './editor-registry';
export type { EditorEntry } from './editor-registry';

export { EditorAdapterRegistry } from './editor-adapter-registry';

export {
  DEFAULT_EDITOR_BY_TYPE,
  EditorResolver,
  createDefaultStrategies,
} from './default-editor-resolver';
export type {
  EditorResolution,
  EditorResolutionRequest,
  EditorResolutionStrategy,
  EditorResolverDeps,
} from './default-editor-resolver';
