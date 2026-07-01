import type { ColumnModel } from '../core/column-model';
import type { ColumnGroupModel } from './column-group-model';
import type { ColumnGroupSystemState, ColumnGroupSerialState } from './column-group.types';
import type { ColumnState } from '../types/column.types';

/**
 * Result returned by {@link ColumnGroupStateManager.diffState}.
 * Used to determine which parts of the grid need rebuilding.
 */
export interface ColumnGroupStateDiff {
  /** Any column widths changed. */
  widthChanged:      boolean;
  /** Any columns hidden or shown. */
  visibilityChanged: boolean;
  /** Any columns pinned / unpinned. */
  pinChanged:        boolean;
  /** Column order changed. */
  orderChanged:      boolean;
  /** Any group collapse/expand states changed. */
  groupStateChanged: boolean;
  /** `true` when any of the above flags is `true`. */
  anyChanged:        boolean;
}

/**
 * Serializes and restores complete column-group system state.
 *
 * "State" covers two orthogonal dimensions:
 * 1. **Leaf-column state** — width, visibility, pin position, sort order, filter
 *    state for every leaf `ColumnDef`.  Delegated to `ColumnModel`.
 * 2. **Group collapse/expand state** — which `IColumnGroupNode`s are currently
 *    collapsed.  Delegated to `ColumnGroupModel`.
 *
 * ### Usage
 *
 * ```ts
 * // Capture a snapshot
 * const snapshot = stateManager.getState();
 * localStorage.setItem('grid-state', JSON.stringify(snapshot));
 *
 * // Restore a snapshot (e.g. on page load)
 * const saved = JSON.parse(localStorage.getItem('grid-state') ?? '{}');
 * stateManager.applyState(saved);
 * ```
 *
 * ### Partial restore
 *
 * Both `groups` and `columnStates` are optional in the input to `applyState`.
 * Supply only the slice you need to restore.
 */
export class ColumnGroupStateManager {
  constructor(
    private readonly columnModel: ColumnModel,
    private readonly groupModel:  ColumnGroupModel,
  ) {}

  // ── Snapshot ──────────────────────────────────────────────────────────────

  /**
   * Capture the full current state of the column-group system.
   *
   * The returned object is a plain serializable value — safe to pass to
   * `JSON.stringify`.  No DOM references or class instances are included.
   *
   * @returns A {@link ColumnGroupSystemState} snapshot.
   */
  getState(): ColumnGroupSystemState {
    return {
      groups:       this.groupModel.serialize(),
      columnStates: this.columnModel.getColumnStates(),
    };
  }

  // ── Restore ───────────────────────────────────────────────────────────────

  /**
   * Apply a previously captured state snapshot.
   *
   * Both `groups` and `columnStates` are optional — omit a key to skip
   * restoring that slice of state.
   *
   * @param state - Partial or full {@link ColumnGroupSystemState}.
   */
  applyState(state: Partial<ColumnGroupSystemState>): void {
    if (state.groups !== undefined) {
      this.groupModel.deserialize(state.groups);
    }
    if (state.columnStates !== undefined) {
      this.columnModel.applyColumnStates(state.columnStates);
    }
  }

  // ── Diff ──────────────────────────────────────────────────────────────────

  /**
   * Compare two state snapshots and report which dimensions changed.
   *
   * Useful for deciding whether a full re-render is necessary or whether
   * a lighter-weight update (e.g. width-only CSS update) suffices.
   *
   * @param prev - Previous state snapshot.
   * @param next - New state snapshot.
   * @returns A {@link ColumnGroupStateDiff} describing which parts changed.
   */
  diffState(
    prev: ColumnGroupSystemState,
    next: ColumnGroupSystemState,
  ): ColumnGroupStateDiff {
    const widthChanged      = this.colStatesWidthChanged(prev.columnStates, next.columnStates);
    const visibilityChanged = this.colStatesVisibilityChanged(prev.columnStates, next.columnStates);
    const pinChanged        = this.colStatesPinChanged(prev.columnStates, next.columnStates);
    const orderChanged      = this.colStatesOrderChanged(prev.columnStates, next.columnStates);
    const groupStateChanged = this.groupStatesChanged(prev.groups, next.groups);

    return {
      widthChanged,
      visibilityChanged,
      pinChanged,
      orderChanged,
      groupStateChanged,
      anyChanged: widthChanged || visibilityChanged || pinChanged || orderChanged || groupStateChanged,
    };
  }

  // ── Group-only helpers ────────────────────────────────────────────────────

  /**
   * Return the serialized collapse/expand state for all groups.
   * Shorthand for `getState().groups`.
   */
  getGroupStates(): ColumnGroupSerialState[] {
    return this.groupModel.serialize();
  }

  /**
   * Apply only the group collapse/expand states without touching leaf columns.
   *
   * @param groups - Array of {@link ColumnGroupSerialState} objects.
   */
  applyGroupStates(groups: ColumnGroupSerialState[]): void {
    this.groupModel.deserialize(groups);
  }

  // ── Column-only helpers ───────────────────────────────────────────────────

  /**
   * Return the serialized state for all leaf columns.
   * Shorthand for `getState().columnStates`.
   */
  getColumnStates(): ColumnState[] {
    return this.columnModel.getColumnStates();
  }

  /**
   * Apply only the leaf-column states without touching group collapse state.
   *
   * @param states - Array of {@link ColumnState} objects.
   */
  applyColumnStates(states: ColumnState[]): void {
    this.columnModel.applyColumnStates(states);
  }

  // ── Private diff helpers ──────────────────────────────────────────────────

  private colStatesWidthChanged(a: ColumnState[], b: ColumnState[]): boolean {
    if (a.length !== b.length) return true;
    return a.some((s, i) => s.width !== b[i]?.width);
  }

  private colStatesVisibilityChanged(a: ColumnState[], b: ColumnState[]): boolean {
    if (a.length !== b.length) return true;
    return a.some((s, i) => s.visible !== b[i]?.visible);
  }

  private colStatesPinChanged(a: ColumnState[], b: ColumnState[]): boolean {
    if (a.length !== b.length) return true;
    return a.some((s, i) => s.pinned !== b[i]?.pinned);
  }

  private colStatesOrderChanged(a: ColumnState[], b: ColumnState[]): boolean {
    if (a.length !== b.length) return true;
    return a.some((s, i) => s.colId !== b[i]?.colId);
  }

  private groupStatesChanged(a: ColumnGroupSerialState[], b: ColumnGroupSerialState[]): boolean {
    if (a.length !== b.length) return true;
    const mapB = new Map(b.map((s) => [s.groupId, s.collapsed]));
    return a.some((s) => {
      const collapsedB = mapB.get(s.groupId);
      return collapsedB === undefined || collapsedB !== s.collapsed;
    });
  }
}
