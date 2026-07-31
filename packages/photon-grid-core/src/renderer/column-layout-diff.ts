import type { ColumnDef } from '../types/column.types';

/**
 * Classification of a change between two consecutive `columns` store values.
 *
 * The renderer uses this to pick the cheapest DOM update that is still correct:
 * a width change needs no DOM work at all (the {@link ColumnStyleManager}
 * stylesheet already sized every cell), a pure reorder only needs existing
 * nodes moved, and only a structural change justifies tearing the grid down.
 */
export enum ColumnChangeKind {
  /** Nothing observable changed — the render can be skipped entirely. */
  NONE = 'none',
  /** Only column widths differ. Order, visibility and pinning are identical. */
  WIDTH_ONLY = 'width-only',
  /** At least one panel's columns were permuted; every panel holds the same set. */
  ORDER_ONLY = 'order-only',
  /** Columns were added, removed, hidden, shown or re-pinned. Full rebuild. */
  STRUCTURAL = 'structural',
}

/**
 * Minimal, comparable description of a column layout.
 *
 * Captured once per `columns` store change and diffed against the previous
 * snapshot. Holds only what distinguishes the {@link ColumnChangeKind} values —
 * per-panel ordered ids plus the width map — so a capture is O(n) with a single
 * allocation per panel and never retains `ColumnDef` references.
 */
export interface ColumnLayoutSnapshot {
  /** Visible left-pinned column ids, in display order. */
  readonly left: readonly string[];
  /** Visible unpinned (center) column ids, in display order. */
  readonly center: readonly string[];
  /** Visible right-pinned column ids, in display order. */
  readonly right: readonly string[];
  /** Declared width per visible column id (`undefined` width normalises to `-1`). */
  readonly widths: ReadonlyMap<string, number>;
}

/** Empty snapshot used as the "no previous layout" seed. */
export const EMPTY_COLUMN_LAYOUT: ColumnLayoutSnapshot = {
  left: [],
  center: [],
  right: [],
  widths: new Map<string, number>(),
};

/**
 * Builds a {@link ColumnLayoutSnapshot} from the current column definitions.
 *
 * Hidden columns are excluded: they contribute no DOM, so a change to one that
 * leaves the visible layout untouched is correctly reported as
 * {@link ColumnChangeKind.NONE}.
 *
 * @param columns - The raw `columns` store array (may include hidden columns).
 * @returns A snapshot safe to retain across renders.
 */
export function captureColumnLayout(columns: readonly ColumnDef[]): ColumnLayoutSnapshot {
  const left: string[] = [];
  const center: string[] = [];
  const right: string[] = [];
  const widths = new Map<string, number>();

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (col.visible === false) continue;
    if (col.pinned === 'left') left.push(col.colId);
    else if (col.pinned === 'right') right.push(col.colId);
    else center.push(col.colId);
    widths.set(col.colId, col.width ?? -1);
  }

  return { left, center, right, widths };
}

/**
 * Classifies the difference between two layout snapshots.
 *
 * Ordering of the checks matters: membership is tested before permutation so
 * that an add/remove/hide/pin is never mistaken for a reorder, and widths are
 * only consulted once the arrangement is known to be identical.
 *
 * @param prev - Layout captured on the previous `columns` change.
 * @param next - Layout captured for the incoming `columns` value.
 * @returns The cheapest change kind that still describes the difference.
 */
export function diffColumnLayout(
  prev: ColumnLayoutSnapshot,
  next: ColumnLayoutSnapshot,
): ColumnChangeKind {
  // Different column counts in any panel → membership changed.
  if (
    prev.left.length !== next.left.length ||
    prev.center.length !== next.center.length ||
    prev.right.length !== next.right.length
  ) {
    return ColumnChangeKind.STRUCTURAL;
  }

  // Same counts: a column can still have moved *between* panels (pin change) or
  // been swapped for a brand-new id. Both are structural.
  if (
    !sameMembers(prev.left, next.left) ||
    !sameMembers(prev.center, next.center) ||
    !sameMembers(prev.right, next.right)
  ) {
    return ColumnChangeKind.STRUCTURAL;
  }

  const reordered =
    !sameOrder(prev.left, next.left) ||
    !sameOrder(prev.center, next.center) ||
    !sameOrder(prev.right, next.right);

  if (reordered) return ColumnChangeKind.ORDER_ONLY;

  return sameWidths(prev.widths, next.widths)
    ? ColumnChangeKind.NONE
    : ColumnChangeKind.WIDTH_ONLY;
}

/** Element-wise equality for two same-length id arrays. */
function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Set equality for two same-length id arrays.
 *
 * Column ids are unique per grid, so a length match plus full containment is
 * sufficient — no multiset counting is needed.
 */
function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  if (a.length === 0) return true;
  const set = new Set(a);
  for (let i = 0; i < b.length; i++) {
    if (!set.has(b[i])) return false;
  }
  return true;
}

/** Key-wise equality for two width maps already known to share their key set. */
function sameWidths(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [colId, width] of a) {
    if (b.get(colId) !== width) return false;
  }
  return true;
}
