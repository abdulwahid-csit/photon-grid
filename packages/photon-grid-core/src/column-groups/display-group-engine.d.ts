import type { ColumnDef } from '../types/column.types';
import type { ColumnStyleManager } from '../renderer/column-style-manager';
import type { EventBus } from '../event-bus/event-bus';
import type { ColumnModel } from '../core/column-model';
import type { IconRenderer } from '../icons/icon-renderer';
import type { GridStore } from '../core/grid-store';
import type { DisplayHeaderTree, GroupCollapseState } from './display-group.types';
import { DisplayGroupHeaderBuilder } from './display-group-header-builder';
import { DisplayGroupDragHandler } from './display-group-drag-handler';
/**
 * Orchestrates the complete Display Group Engine for one grid instance.
 *
 * ### Responsibilities
 * - Parse column definitions into the immutable {@link LogicalGroupRegistry}.
 * - Build fresh {@link DisplayHeaderTree} instances via {@link DisplayGroupBuilder}.
 * - Manage per-logical-group collapse state.
 * - Handle group-move (drag-drop) by reordering `store.columns`.
 * - Handle group-resize by distributing width proportionally among leaves.
 * - Expose the DOM builder ({@link DisplayGroupHeaderBuilder}) for `HeaderRenderer`.
 * - Create and own the drag handler ({@link DisplayGroupDragHandler}).
 *
 * ### Architecture (Display Group Builder pattern)
 * ```
 * Original Column Tree (IMMUTABLE, stored in LogicalGroupRegistry)
 *   ↓
 * Displayed Column Order (store.columns — changes on drag / pin / show / hide)
 *   ↓
 * DisplayGroupBuilder.build() (walk displayed order, create display instances)
 *   ↓
 * DisplayHeaderTree (flat rows + DisplayGroupNode instances)
 *   ↓
 * DisplayGroupHeaderBuilder.buildGroupRows() (DOM)
 * ```
 *
 * @example
 * ```ts
 * const engine = new DisplayGroupEngine(colStyles, eventBus, columnModel, store, iconRenderer);
 * engine.parse(options.columns);
 * renderer.setDisplayGroupEngine(engine);
 * ```
 */
export declare class DisplayGroupEngine {
    private readonly colStyles;
    private readonly eventBus;
    private readonly columnModel;
    private readonly store;
    private readonly iconRenderer;
    /** Immutable registry of logical groups and column paths. */
    private readonly registry;
    /** Stateless tree builder — reused across every rebuild. */
    private readonly builder;
    /**
     * DOM builder — exposed publicly so `HeaderRenderer` can call
     * `buildGroupRows` / `updateGroupRows` directly.
     */
    readonly headerBuilder: DisplayGroupHeaderBuilder;
    /** Drag handler — created lazily on first `createDragHandler()` call. */
    private dragHandler;
    /**
     * Per-instance collapse state.
     * Keyed by stable `instanceId` (`"${logicalGroupId}:${firstLeafColId}"`).
     * Persisted across header rebuilds.
     */
    private readonly collapseState;
    /**
     * Cache of leaf colIds that were visible just before a group instance was
     * collapsed.  Used on expand to restore exactly the pre-collapse visibility
     * rather than making ALL registry leaves visible (which would conflict with
     * columns that were manually hidden before the collapse).
     */
    private readonly instanceLeaveCache;
    /**
     * Snapshot of `store.columns` taken at the moment a group drag is activated.
     * Every live preview move is applied against this base so intermediate preview
     * states don't compound — the final position is always relative to the original
     * column order, not the previous preview frame.
     * Cleared on drop confirmation.
     */
    private previewBaseColumns;
    constructor(colStyles: ColumnStyleManager, eventBus: EventBus, columnModel: ColumnModel, store: GridStore, iconRenderer: IconRenderer);
    /**
     * Parse the top-level column definition array and populate the logical
     * group registry.  Must be called before any `buildTree()` invocations.
     *
     * Group `ColumnDef` entries (those with a `.children` array) are recorded as
     * `LogicalGroupDef` objects.  Leaf columns receive their full group path.
     *
     * @param columns - Top-level `ColumnDef[]`, possibly containing nested groups.
     */
    parse(columns: ColumnDef[]): void;
    /**
     * `true` when the parsed column definitions contained at least one group.
     * Use this to decide whether group header rows should be rendered.
     */
    get hasGroups(): boolean;
    /**
     * `true` while a group header drag is currently in progress.
     * Used by the `GridRenderer` store-watcher to skip the full header
     * destroy / rebuild cycle during live-preview drag, preventing flicker.
     */
    get isDraggingGroup(): boolean;
    /**
     * Returns `true` when the given column has no group ancestry — it is a flat
     * (ungrouped) leaf column rendered alongside grouped columns.
     *
     * @param colId - Leaf column ID to check.
     */
    isFlat(colId: string): boolean;
    /**
     * Build a fresh `DisplayHeaderTree` for the given visible columns.
     *
     * The result is consumed immediately by `DisplayGroupHeaderBuilder` to
     * produce DOM — it should not be stored beyond a single render frame.
     *
     * @param columns - Visible columns for **one panel** in left-to-right order.
     *   Columns with `visible === false` are automatically skipped.
     */
    buildTree(columns: ColumnDef[]): DisplayHeaderTree;
    /**
     * Toggle the collapsed state of a specific display group instance.
     *
     * The `instanceId` format is `"${logicalGroupId}:${firstLeafColId}"` — the
     * same stable key computed by `DisplayGroupBuilder` when opening each group
     * instance for the first time.
     *
     * When **collapsing**: hides all visible leaves of this instance except the
     * first ("peek") column.  The hidden set is cached so expand can restore
     * exactly the pre-collapse visibility without surfacing columns that were
     * already hidden by other means (e.g. column menu).
     *
     * When **expanding**: restores leaves from the cache.  Falls back to all
     * visible instance leaves if no cache entry exists.
     *
     * @param instanceId - Stable instance ID in `"groupId:firstLeafColId"` format.
     */
    toggleGroup(instanceId: string): void;
    /**
     * Returns `true` when any display instance of the given logical group is
     * currently collapsed.
     *
     * @param logicalGroupId - Logical group ID to inspect.
     */
    isCollapsed(logicalGroupId: string): boolean;
    /**
     * Returns a serializable snapshot of the current collapse state.
     * Suitable for persistence or state-save/restore scenarios.
     */
    getCollapseStateSnapshot(): GroupCollapseState[];
    /**
     * Restore collapse state from a previously saved snapshot without triggering
     * a rebuild — the caller must trigger a rebuild after this call if needed.
     *
     * @param states - Array of saved collapse state entries.
     */
    applyCollapseState(states: GroupCollapseState[]): void;
    /**
     * Move a logical group to a new position in the displayed column order.
     *
     * Gathers all leaves of the group that are currently in `sourcePanel`,
     * removes them from `store.columns`, optionally changes their `pinned`
     * property, then re-inserts them before `insertBeforeColId`.
     *
     * Setting `store.columns` triggers the grid's column-watcher which rebuilds
     * the header automatically.
     *
     * @param logicalGroupId    - The logical group being moved.
     * @param sourcePanel       - The panel the drag originated from.
     * @param targetPanel       - The panel the group is dropped into.
     * @param insertBeforeColId - Leaf column to insert before; `null` = end of panel.
     */
    handleGroupMoved(logicalGroupId: string, sourcePanel: 'left' | null | 'right', targetPanel: 'left' | null | 'right', insertBeforeColId: string | null): void;
    /**
     * Resize a specific display group instance by distributing `newWidth`
     * proportionally among its visible leaf columns.
     *
     * The `instanceId` format is `"${logicalGroupId}:${firstLeafColId}"`.
     * Only the contiguous block of leaves that form THIS instance are resized —
     * split instances of the same logical group are unaffected.
     *
     * Each leaf's new width = `round(oldWidth × newWidth / currentWidth)`,
     * clamped to the leaf's `minWidth`.
     *
     * @param instanceId - Stable instance ID in `"groupId:firstLeafColId"` format.
     * @param newWidth   - New total pixel width for this instance.
     */
    resizeGroup(instanceId: string, newWidth: number): void;
    /**
     * Called by {@link DisplayGroupDragHandler} when the drag activation threshold
     * is crossed.  Saves the current `store.columns` snapshot so every subsequent
     * {@link applyPreviewMove} can rebase from the original order.
     */
    beginDragPreview(): void;
    /**
     * Apply a temporary (preview) group move from the original column snapshot.
     *
     * Called on **every slot change** during a drag — i.e. many times before the
     * user releases the mouse.  Always rebases from `previewBaseColumns` so
     * intermediate positions don't compound.  Updates `store.columns` directly,
     * which triggers the grid's column-watcher and causes the header to rebuild
     * synchronously on the next animation frame.
     *
     * @param logicalGroupId    - The group being dragged.
     * @param sourcePanel       - Panel the drag originated from.
     * @param targetPanel       - Panel currently under the cursor.
     * @param insertBeforeColId - Column to insert the group before; `null` = end.
     */
    applyPreviewMove(logicalGroupId: string, sourcePanel: 'left' | null | 'right', targetPanel: 'left' | null | 'right', insertBeforeColId: string | null): void;
    /**
     * Confirm the drag preview: the store already holds the correct final order
     * from the last {@link applyPreviewMove} call.  This simply clears the snapshot.
     */
    confirmDragPreview(): void;
    /**
     * Create and return the drag handler wired to this engine.
     * Creates a new instance on first call; subsequent calls return the same instance.
     *
     * Group dragging deliberately uses the transform-preview mode rather than the
     * live store-mutation mode. Updating `store.columns` on every hover slot makes
     * body/header virtualization rebuild repeatedly and causes the right-side
     * columns to blink under grouped headers. The final order is committed once on
     * drop, matching AG Grid's stable drag preview behavior.
     *
     * @param gridElGetter - Getter that returns the root `.pg-grid` element.
     *   May return `null` before the grid is mounted.
     */
    createDragHandler(gridElGetter: () => HTMLElement | null): DisplayGroupDragHandler;
    /**
     * Returns the active drag handler, or `null` if `createDragHandler` has not
     * been called yet.
     */
    getDragHandler(): DisplayGroupDragHandler | null;
    /**
     * Expose all leaf column IDs for a logical group.
     * Used by the group context menu to inspect and modify group leaves.
     *
     * @param logicalGroupId - Logical group to inspect.
     */
    getLeavesForGroup(logicalGroupId: string): readonly string[];
    /**
     * Returns the positional state of a group within its current panel.
     * Used by the group context menu to enable or disable move items.
     *
     * @param logicalGroupId - The group to inspect.
     */
    getGroupPositionInfo(logicalGroupId: string): {
        isFirst: boolean;
        isLast: boolean;
        panel: 'left' | null | 'right';
    };
    /**
     * Move the group one column position to the left within its current panel.
     * No-op when the group is already at the start of the panel.
     *
     * @param logicalGroupId - The group to move.
     */
    moveGroupLeft(logicalGroupId: string): void;
    /**
     * Move the group one column position to the right within its current panel.
     * No-op when the group is already at the end of the panel.
     *
     * @param logicalGroupId - The group to move.
     */
    moveGroupRight(logicalGroupId: string): void;
    /**
     * Move the group to the first position within its current panel.
     * No-op when the group is already at the start.
     *
     * @param logicalGroupId - The group to move.
     */
    moveGroupToStart(logicalGroupId: string): void;
    /**
     * Move the group to the last position within its current panel.
     * No-op when the group is already at the end.
     *
     * @param logicalGroupId - The group to move.
     */
    moveGroupToEnd(logicalGroupId: string): void;
    /**
     * Hide all visible leaf columns that belong to this group.
     * Columns that are already hidden are left unchanged.
     *
     * @param logicalGroupId - The group whose leaves should be hidden.
     */
    hideGroupLeaves(logicalGroupId: string): void;
    /**
     * Find the contiguous block of columns that constitute one display instance
     * of a logical group.
     *
     * Scans `allCols` forward from the column with ID `firstLeafColId`.  Columns
     * are included while they belong to `groupLeafIds`; the first non-member
     * column terminates the scan.  Hidden columns (visible === false) are
     * included so that collapse / expand operates on all leaves, not just the
     * currently-visible ones.
     *
     * @param allCols        - Full column array from the store (incl. hidden).
     * @param firstLeafColId - Column ID of the first leaf of the target instance.
     * @param groupLeafIds   - Set of all leaf colIds for the logical group.
     */
    private findInstanceLeaves;
    /**
     * Find the index **one past** the last column in `panel` within `columns`.
     * Returns `columns.length` when no column with the target panel is found
     * (appends to the absolute end of the array).
     *
     * @param columns - Column array to search within.
     * @param panel   - Target panel (`'left'`, `null` for center, `'right'`).
     */
    private findEndOfPanel;
}
//# sourceMappingURL=display-group-engine.d.ts.map