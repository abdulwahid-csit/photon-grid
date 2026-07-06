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
    widthChanged: boolean;
    /** Any columns hidden or shown. */
    visibilityChanged: boolean;
    /** Any columns pinned / unpinned. */
    pinChanged: boolean;
    /** Column order changed. */
    orderChanged: boolean;
    /** Any group collapse/expand states changed. */
    groupStateChanged: boolean;
    /** `true` when any of the above flags is `true`. */
    anyChanged: boolean;
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
export declare class ColumnGroupStateManager {
    private readonly columnModel;
    private readonly groupModel;
    constructor(columnModel: ColumnModel, groupModel: ColumnGroupModel);
    /**
     * Capture the full current state of the column-group system.
     *
     * The returned object is a plain serializable value — safe to pass to
     * `JSON.stringify`.  No DOM references or class instances are included.
     *
     * @returns A {@link ColumnGroupSystemState} snapshot.
     */
    getState(): ColumnGroupSystemState;
    /**
     * Apply a previously captured state snapshot.
     *
     * Both `groups` and `columnStates` are optional — omit a key to skip
     * restoring that slice of state.
     *
     * @param state - Partial or full {@link ColumnGroupSystemState}.
     */
    applyState(state: Partial<ColumnGroupSystemState>): void;
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
    diffState(prev: ColumnGroupSystemState, next: ColumnGroupSystemState): ColumnGroupStateDiff;
    /**
     * Return the serialized collapse/expand state for all groups.
     * Shorthand for `getState().groups`.
     */
    getGroupStates(): ColumnGroupSerialState[];
    /**
     * Apply only the group collapse/expand states without touching leaf columns.
     *
     * @param groups - Array of {@link ColumnGroupSerialState} objects.
     */
    applyGroupStates(groups: ColumnGroupSerialState[]): void;
    /**
     * Return the serialized state for all leaf columns.
     * Shorthand for `getState().columnStates`.
     */
    getColumnStates(): ColumnState[];
    /**
     * Apply only the leaf-column states without touching group collapse state.
     *
     * @param states - Array of {@link ColumnState} objects.
     */
    applyColumnStates(states: ColumnState[]): void;
    private colStatesWidthChanged;
    private colStatesVisibilityChanged;
    private colStatesPinChanged;
    private colStatesOrderChanged;
    private groupStatesChanged;
}
//# sourceMappingURL=column-group-state-manager.d.ts.map