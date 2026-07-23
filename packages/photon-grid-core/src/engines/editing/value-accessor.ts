import type { ColumnDef } from '../../types/column.types';
import { formatValue } from './value-parser';
import type { FormatOptions } from './value-parser';

/**
 * Centralized, framework-agnostic value pipeline for Photon Grid.
 *
 * Every feature that needs a cell's value — the renderer, the editor, the sort
 * engine, filtering, grouping and export — routes through these pure functions
 * instead of touching `row.data[field]` directly. This guarantees a single
 * source of truth for how {@link ColumnDef.valueGetter},
 * {@link ColumnDef.valueSetter} and {@link ColumnDef.valueFormatter} behave, so
 * a custom getter/setter defined once is honoured everywhere with no duplicated
 * logic.
 *
 * All functions are allocation-free on the common path (no getter/setter/
 * formatter, no dot in the field name), keeping them safe to call once per
 * visible cell on every frame at millions-of-rows scale.
 *
 * @packageDocumentation
 */

/**
 * Reads a value off a plain object using a dot-notation path.
 *
 * Fast-paths the overwhelmingly common flat-field case (`"salary"`) with a
 * single property read and no array allocation; only paths containing a `.`
 * (`"address.city"`) walk the object graph.
 *
 * @param data  - The row data object (or any nested object) to read from.
 * @param field - Field name or dot-notation path.
 * @returns The resolved value, or `undefined` if any segment along the path is
 *          `null`/`undefined`.
 */
export function resolveFieldPath(data: Record<string, unknown> | null | undefined, field: string): unknown {
  if (data == null) return undefined;
  // Fast path: flat field, no traversal or allocation.
  if (field.indexOf('.') === -1) return data[field];

  const parts = field.split('.');
  let current: unknown = data;
  for (let i = 0; i < parts.length; i++) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[parts[i]];
  }
  return current;
}

/**
 * Writes a value into a plain object using a dot-notation path, creating any
 * missing intermediate objects along the way.
 *
 * Fast-paths the flat-field case with a single assignment. For nested paths,
 * existing non-object segments are replaced with fresh objects so the write
 * always succeeds without throwing.
 *
 * @param data  - The row data object to mutate.
 * @param field - Field name or dot-notation path.
 * @param value - The value to assign at the resolved location.
 */
export function assignFieldPath(data: Record<string, unknown>, field: string, value: unknown): void {
  if (field.indexOf('.') === -1) {
    data[field] = value;
    return;
  }

  const parts = field.split('.');
  let current: Record<string, unknown> = data;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = current[part];
    if (next == null || typeof next !== 'object') {
      const created: Record<string, unknown> = {};
      current[part] = created;
      current = created;
    } else {
      current = next as Record<string, unknown>;
    }
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Resolves a cell's logical value.
 *
 * When {@link ColumnDef.valueGetter} is defined it is invoked with the raw row
 * data; otherwise the value is read directly from `data` via
 * {@link resolveFieldPath} (dot-notation aware). This is the canonical read used
 * across rendering, sorting, filtering, grouping and export so a getter's output
 * stays consistent everywhere.
 *
 * @param data   - The raw row data object.
 * @param colDef - The column whose value is being read.
 * @param api    - The public grid API (passed through to the getter, typed as
 *                 `unknown` to keep the core framework-agnostic).
 * @returns The logical value for the cell.
 */
export function getCellValue(
  data: Record<string, unknown>,
  colDef: ColumnDef,
  api: unknown = null,
): unknown {
  const getter = colDef.valueGetter;
  if (getter) {
    return getter({
      data,
      colDef,
      field: colDef.field,
      getValue: (f) => resolveFieldPath(data, f),
      api,
    });
  }
  return resolveFieldPath(data, colDef.field);
}

/**
 * Commits an edited value into a cell.
 *
 * When {@link ColumnDef.valueSetter} is defined it owns the write (enabling
 * derived, nested or multi-field targets); otherwise the value is assigned
 * directly via {@link assignFieldPath}. A setter may return `false` to signal
 * that nothing changed, in which case callers should skip change events.
 *
 * @param data     - The row data object to mutate.
 * @param colDef   - The column being edited.
 * @param newValue - The parsed, validated value to store.
 * @param api      - The public grid API (passed through to the setter).
 * @returns `true` when the value was applied; `false` when a custom setter
 *          explicitly reported no change.
 */
export function setCellValue(
  data: Record<string, unknown>,
  colDef: ColumnDef,
  newValue: unknown,
  api: unknown = null,
): boolean {
  const setter = colDef.valueSetter;
  if (setter) {
    const oldValue = getCellValue(data, colDef, api);
    // `void`/`undefined` returns are treated as success for author convenience.
    return setter({ data, newValue, oldValue, colDef, field: colDef.field, api }) !== false;
  }
  assignFieldPath(data, colDef.field, newValue);
  return true;
}

/**
 * Produces the human-readable display string for a cell's value.
 *
 * When {@link ColumnDef.valueFormatter} is defined it takes full control of the
 * presentation; otherwise the grid's built-in, type-aware
 * {@link formatValue} is used (number/currency/date/etc. formatting). Formatting
 * is presentation-only and never affects the value used for sorting, filtering
 * or editing.
 *
 * @param data    - The raw row data object.
 * @param colDef  - The column being formatted.
 * @param value   - The logical value to format (typically {@link getCellValue}'s output).
 * @param options - Locale/date/currency options for the built-in fallback formatter.
 * @param api     - The public grid API (passed through to the formatter).
 * @returns The display string for the cell.
 */
export function formatCellValue(
  data: Record<string, unknown>,
  colDef: ColumnDef,
  value: unknown,
  options?: FormatOptions,
  api: unknown = null,
): string {
  const formatter = colDef.valueFormatter;
  if (formatter) {
    return formatter({ value, data, colDef, field: colDef.field, api });
  }
  return formatValue(value, colDef, options);
}
