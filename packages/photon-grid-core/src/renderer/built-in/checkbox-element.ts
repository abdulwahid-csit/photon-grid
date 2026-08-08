import type { ColumnDef } from '../../types/column.types';

/**
 * The checkbox element a `boolean` cell shows, and the rule for when it is
 * interactive.
 *
 * A **leaf module**: it imports nothing but types. That matters structurally —
 * `built-in/boolean.ts` needs this, and it is reached through
 * `registry.ts → createDefaultRenderers()`, which `renderer-resolver.ts`
 * imports, which `cell-renderer.ts` imports. Leaving these helpers in
 * `cell-renderer.ts` would close that loop and, because the registry singleton
 * is constructed at module scope, turn it into a temporal-dead-zone crash at
 * startup rather than a lazy failure.
 *
 * @packageDocumentation
 */

/**
 * Marker class on the `<input type="checkbox">` a `boolean` column renders.
 *
 * Deliberately **not** `.pg-checkbox` — that class means "row-selection
 * checkbox" to `BodyRenderer`'s delegated click handler and to
 * `updateRowSelection`, both of which would otherwise mistake a data cell's
 * checkbox for the selection one and toggle the wrong thing.
 */
export const BOOLEAN_CELL_CHECKBOX_CLASS = 'pg-cell-checkbox';

/**
 * `true` when a `boolean` cell's checkbox should accept input.
 *
 * A column that is not editable, is locked, or sits in a grid with editing
 * switched off renders its checkbox disabled — the value is still shown, it
 * just cannot be changed by clicking it.
 *
 * A **predicate** `editable` is treated as enabled here, because this runs per
 * cell during rendering and has no row to evaluate it against. That is not a
 * hole: the toggle itself goes through `EditorManager.commitValue`, which
 * resolves the predicate against the real row and refuses the write if it says
 * no. Rendering optimistically and enforcing at commit is the right way round —
 * the alternative disables every checkbox on a column whose editability happens
 * to be dynamic.
 *
 * @param colDef - Column the cell belongs to.
 * @param editingEnabled - Grid-level editing switch; `true` when unspecified.
 */
export function isBooleanCellEditable(colDef: ColumnDef, editingEnabled?: boolean): boolean {
  if (editingEnabled === false || colDef.locked === true) return false;
  return colDef.editable === true || typeof colDef.editable === 'function';
}

/**
 * Builds the checkbox a `boolean` cell displays.
 *
 * A real `<input type="checkbox">` rather than a tick glyph, so the cell shows
 * both states (an unchecked box reads as "false"; an empty cell reads as "no
 * data") and so an editable column is directly toggleable without opening an
 * editor first. The input carries no listeners of its own — `GridCore` handles
 * the toggle through one delegated listener on the grid root, which is what
 * keeps a viewport of thousands of boolean cells free of per-cell handlers.
 *
 * @param value - Logical cell value; coerced with `!!`.
 * @param colDef - Column the cell belongs to.
 * @param editingEnabled - Grid-level editing switch; `true` when unspecified.
 */
export function buildBooleanCellCheckbox(
  value: unknown,
  colDef: ColumnDef,
  editingEnabled?: boolean,
): HTMLInputElement {
  const checked = !!value;
  const editable = isBooleanCellEditable(colDef, editingEnabled);

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = BOOLEAN_CELL_CHECKBOX_CLASS;
  checkbox.checked = checked;
  checkbox.disabled = !editable;
  // A disabled input is not focusable at all; an enabled one must still stay
  // out of the tab order, because the grid owns focus through its own roving
  // cell model and a checkbox per row would otherwise flood it.
  if (editable) checkbox.tabIndex = -1;
  checkbox.setAttribute('data-bool-cell', '');
  checkbox.setAttribute('aria-label', colDef.header ?? colDef.field);
  return checkbox;
}

/**
 * Re-syncs an existing boolean checkbox to a new value.
 *
 * The in-place counterpart to {@link buildBooleanCellCheckbox}: rebuilding the
 * cell would replace the `<input>` the user may be mid-click on.
 *
 * @returns `true` when the element was found and updated.
 */
export function syncBooleanCellCheckbox(
  cellEl: HTMLElement,
  value: unknown,
  colDef: ColumnDef,
  editingEnabled?: boolean,
): boolean {
  const box = cellEl.querySelector<HTMLInputElement>(`input.${BOOLEAN_CELL_CHECKBOX_CLASS}`);
  if (!box) return false;

  const checked = !!value;
  const disabled = !isBooleanCellEditable(colDef, editingEnabled);
  if (box.checked !== checked) box.checked = checked;
  if (box.disabled !== disabled) box.disabled = disabled;

  const span = box.parentElement;
  if (span) {
    span.classList.toggle('pg-cell--bool-true', checked);
    span.classList.toggle('pg-cell--bool-false', !checked);
  }
  return true;
}
