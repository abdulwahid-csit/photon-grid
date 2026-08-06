/**
 * Photon Grid — editing system.
 *
 * A framework-agnostic, registry-driven cell editing architecture. Everything a
 * host application needs is exported here; nothing in this module imports a UI
 * framework, and framework support is added from the outside through
 * {@link FrameworkEditorAdapter}.
 *
 * ### The five-second tour
 * ```ts
 * // 1. Nothing to configure — the editor comes from the column type.
 * { field: 'price', type: 'number', editable: true }
 *
 * // 2. Pick a different one.
 * { field: 'status', editable: true, cellEditor: 'select' }
 *
 * // 3. Configure it.
 * { field: 'score', editable: true, cellEditorParams: { min: 0, max: 100, step: 5 } }
 *
 * // 4. Validate it — the grid owns this, not the editor.
 * { field: 'email', type: 'email', editable: true, validation: { required: true } }
 *
 * // 5. Ship your own, with no change to the grid.
 * gridApi.registerEditor('currency', CurrencyEditor);
 * { field: 'total', editable: true, cellEditor: 'currency' }
 * ```
 *
 * @packageDocumentation
 */

// ── Contracts ────────────────────────────────────────────────────────────────
export type {
  BuiltInEditorName,
  CellEditorConstructor,
  CellEditorFactory,
  CellEditorParams,
  CellEditorParamsSpec,
  CellEditorSpec,
  EditTrigger,
  EditableParams,
  EditableSpec,
  FrameworkEditorAdapter,
  ICellEditor,
} from './types/cell-editor.types';

export type {
  CellValidationState,
  ColumnValidation,
  InvalidResult,
  RowValidatorFn,
  ValidResult,
  ValidationContext,
  ValidationResult,
  ValidationSeverity,
  ValidatorFactory,
  ValidatorFn,
} from './types/validation.types';
export { VALID, invalid } from './types/validation.types';

export type {
  EditingConfig,
  InvalidEditBehaviour,
  ResolvedEditingConfig,
  ValidationTrigger,
} from './types/editing-config.types';
export { resolveEditingConfig } from './types/editing-config.types';

// ── Registry & resolution ────────────────────────────────────────────────────
export { EditorRegistry, type EditorEntry } from './registry/editor-registry';
export { EditorAdapterRegistry } from './registry/editor-adapter-registry';
export {
  DEFAULT_EDITOR_BY_TYPE,
  EditorResolver,
  createDefaultStrategies,
  type EditorResolution,
  type EditorResolutionRequest,
  type EditorResolutionStrategy,
  type EditorResolverDeps,
} from './registry/default-editor-resolver';

// ── Validation ───────────────────────────────────────────────────────────────
export { ValidationEngine, type CompiledValidation } from './validation/validation-engine';
export { ValidatorRegistry } from './validation/validator-registry';
export { TYPE_IMPLIED_VALIDATION, impliedValidationFor } from './validation/type-rules';
export { createDefaultValidatorFactories } from './validation/rules';

// ── Session ──────────────────────────────────────────────────────────────────
export {
  EditorManager,
  type EditorManagerDeps,
  type StartEditRequest,
  type CommitReason,
} from './session/editor-manager';
export type { EditSession } from './session/edit-session';

// ── Services ─────────────────────────────────────────────────────────────────
export { EditorHost, type EditorMountOptions, type MountedEditor } from './services/editor-host';
export { FocusManager } from './services/focus-manager';
export {
  KeyboardManager,
  createDefaultKeyBindings,
  type EditorKeyActions,
  type EditorKeyBinding,
} from './services/keyboard-manager';
export { PopupService, type PopupHandle, type PopupOpenOptions } from './services/popup-service';

// ── Built-in editors ─────────────────────────────────────────────────────────
export * from './editors';

// ── Composition ──────────────────────────────────────────────────────────────
export {
  createEditingServices,
  type EditingServices,
  type EditingServicesDeps,
} from './create-editing-services';

// ── Backward compatibility ───────────────────────────────────────────────────
export {
  LegacyDropdownEditor,
  LegacySlotEditor,
  legacyDropdownStrategy,
  legacySlotStrategy,
} from './compat/legacy-editors';
