/**
 * Change detection for cell values.
 *
 * Sits on the hottest path in the grid: at thousands of updates per second it
 * runs once per candidate cell per frame. Every branch is therefore ordered by
 * how often it is taken — the overwhelming majority of comparisons are two
 * primitives — and no branch allocates.
 *
 * @packageDocumentation
 */

/**
 * Returns `true` when two cell values are visually identical and no DOM write
 * is needed.
 *
 * Semantics, in order of frequency:
 * - **Primitives** — strict equality, with `NaN === NaN` treated as unchanged
 *   (`Object.is`) so a numeric column holding `NaN` does not repaint forever.
 * - **`null` / `undefined`** — treated as equal to each other: both render as
 *   an empty cell, so swapping one for the other is not a visible change.
 * - **`Date`** — compared by timestamp, not identity; a re-parsed date with the
 *   same instant must not count as a change.
 * - **Arrays** — compared shallowly by length and element identity. Array cells
 *   (tag/badge columns) are small by construction, and a deep walk would cost
 *   more than the repaint it avoids.
 * - **Other objects** — compared by reference. Immutable updates therefore
 *   diff correctly; in-place mutation of a nested object is a deliberate
 *   non-signal, matching how the row pipeline treats `row.data` identity.
 *
 * @param a - Previously rendered value.
 * @param b - Current value from the row data.
 * @returns `true` when the DOM already shows `b`.
 */
export function isSameCellValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  // Nullish values are indistinguishable once rendered.
  if (a == null || b == null) return a == null && b == null;

  const typeA = typeof a;
  if (typeA !== 'object' || typeof b !== 'object') return false;

  if (a instanceof Date) return b instanceof Date && a.getTime() === b.getTime();
  if (b instanceof Date) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Snapshots a value so a later {@link isSameCellValue} comparison stays correct
 * even if the caller mutates the original in place.
 *
 * Only arrays are copied — and only their top level, matching the comparison
 * depth. Everything else is stored as-is: primitives are immutable, and object
 * cells are compared by reference by design.
 *
 * @param value - Value about to be recorded in the virtual tree.
 * @returns A value safe to retain until the next diff.
 */
export function snapshotCellValue(value: unknown): unknown {
  return Array.isArray(value) ? value.slice() : value;
}
