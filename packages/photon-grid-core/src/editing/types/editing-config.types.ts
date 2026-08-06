/**
 * Grid-level configuration for the editing system.
 *
 * Extends the original three-field `EditingConfig` rather than replacing it, so
 * every existing `GridOptions.editing` object stays valid and every new key is
 * additive with a documented default.
 *
 * @packageDocumentation
 */

import type { RowValidatorFn } from './validation.types';

/**
 * When the grid runs a column's validation rules.
 *
 * `'commit'` is the default and the cheapest: rules run once, when the value is
 * actually being written. `'change'` re-runs them on every reported value, which
 * is what a form-like grid wants for live feedback but costs a rule pass per
 * keystroke — worth it for a handful of columns, not for a wide sheet.
 */
export type ValidationTrigger =
  /** Only when the edit is committed. */
  | 'commit'
  /** On every `onValueChange` from the editor, and again on commit. */
  | 'change'
  /** Never automatically; the application drives it through `GridApi.validateCell`. */
  | 'manual';

/**
 * What a failed validation does to the session.
 *
 * The default keeps the editor open so the user can fix the value in place,
 * which is what every form does. `'revert'` is the AG Grid-ish behaviour of
 * silently discarding the bad value, offered because some data-entry flows
 * prefer it.
 */
export type InvalidEditBehaviour =
  /** Keep the editor open and annotated until the value validates or is cancelled. */
  | 'keep-open'
  /** Close the editor and restore the previous value. */
  | 'revert'
  /** Close the editor and write the value anyway, leaving the cell flagged invalid. */
  | 'accept';

/**
 * Editing configuration, as supplied through `GridOptions.editing`.
 *
 * Every field is optional at the call site (`GridOptions.editing` is a
 * `Partial`); the values documented here are what the grid falls back to.
 *
 * @example
 * ```ts
 * const options: GridOptions = {
 *   editing: {
 *     mode: 'cell',
 *     singleClickEdit: true,
 *     validateOn: 'change',
 *     onInvalid: 'keep-open',
 *     rowValidator: (data) =>
 *       new Date(data.end as string) > new Date(data.start as string)
 *         ? { valid: true }
 *         : { valid: false, message: 'End date must be after the start date' },
 *   },
 * };
 * ```
 */
export interface EditingConfig {
  /**
   * Editing mode for the grid.
   * - `'cell'`  — individual cells are edited one at a time (default).
   * - `'row'`   — an entire row enters edit mode together.
   * - `'none'`  — editing is fully disabled.
   */
  mode: 'cell' | 'row' | 'none';
  /**
   * When `true`, a **single click** activates the cell editor.
   * When `false` (default), a **double-click** is required — matching AG Grid default behaviour.
   */
  singleClickEdit: boolean;
  /**
   * When `true` (default), the active editor commits its value and closes when the
   * grid loses focus.  Set to `false` to keep the editor open until the user
   * explicitly confirms (Enter) or cancels (Escape).
   */
  stopEditingWhenCellsLoseFocus: boolean;
  /**
   * When the grid runs validation.
   *
   * @default 'commit'
   */
  validateOn?: ValidationTrigger;
  /**
   * What happens when a commit fails validation.
   *
   * @default 'keep-open'
   */
  onInvalid?: InvalidEditBehaviour;
  /**
   * Cross-field validation for a whole row. Runs on row-mode commit and through
   * `GridApi.validateRow`; see {@link RowValidatorFn} for the per-field result
   * form that attributes a failure to a specific cell.
   */
  rowValidator?: RowValidatorFn;
  /**
   * When `true` (default), a printable character typed on a focused cell opens
   * the editor seeded with that character, the way a spreadsheet behaves.
   *
   * @default true
   */
  enterStartsEditing?: boolean;
  /**
   * Milliseconds to debounce `validateOn: 'change'` runs. Ignored for `'commit'`.
   * Keeps an expensive custom rule from running on every keystroke.
   *
   * @default 150
   */
  validationDebounceMs?: number;
}

/**
 * The fully-resolved configuration the editing services actually read — every
 * optional key filled in.
 *
 * Resolved once at configure time so the hot path never re-applies defaults;
 * the same pattern `resolveScrollConfig` uses for scrolling.
 */
export interface ResolvedEditingConfig extends Required<Omit<EditingConfig, 'rowValidator'>> {
  readonly rowValidator: RowValidatorFn | null;
}

/** Defaults applied to every unset {@link EditingConfig} key. */
const EDITING_DEFAULTS: ResolvedEditingConfig = Object.freeze({
  mode: 'cell',
  singleClickEdit: false,
  stopEditingWhenCellsLoseFocus: true,
  validateOn: 'commit',
  onInvalid: 'keep-open',
  rowValidator: null,
  enterStartsEditing: true,
  validationDebounceMs: 150,
});

/**
 * Fills in every unset key of a host-supplied editing configuration.
 *
 * @param config - What the application passed to `GridOptions.editing`.
 * @returns A frozen, fully-populated configuration.
 */
export function resolveEditingConfig(config: Partial<EditingConfig> = {}): ResolvedEditingConfig {
  return Object.freeze({
    ...EDITING_DEFAULTS,
    ...config,
    rowValidator: config.rowValidator ?? null,
  });
}
