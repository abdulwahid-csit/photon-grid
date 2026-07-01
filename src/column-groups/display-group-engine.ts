import type { ColumnDef, ColumnPinPosition } from '../types/column.types';
import type { ColumnStyleManager } from '../renderer/column-style-manager';
import type { EventBus } from '../event-bus/event-bus';
import type { ColumnModel } from '../core/column-model';
import type { IconRenderer } from '../icons/icon-renderer';
import type { GridStore } from '../core/grid-store';
import type { DisplayHeaderTree, GroupCollapseState } from './display-group.types';
import { GridEventType } from '../types/event.types';
import { LogicalGroupRegistry } from './logical-group-registry';
import { DisplayGroupBuilder } from './display-group-builder';
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
export class DisplayGroupEngine {
  /** Immutable registry of logical groups and column paths. */
  private readonly registry: LogicalGroupRegistry;
  /** Stateless tree builder — reused across every rebuild. */
  private readonly builder:  DisplayGroupBuilder;
  /**
   * DOM builder — exposed publicly so `HeaderRenderer` can call
   * `buildGroupRows` / `updateGroupRows` directly.
   */
  readonly headerBuilder: DisplayGroupHeaderBuilder;
  /** Drag handler — created lazily on first `createDragHandler()` call. */
  private dragHandler:    DisplayGroupDragHandler | null = null;

  /**
   * Per-instance collapse state.
   * Keyed by stable `instanceId` (`"${logicalGroupId}:${firstLeafColId}"`).
   * Persisted across header rebuilds.
   */
  private readonly collapseState = new Map<string, boolean>();

  /**
   * Cache of leaf colIds that were visible just before a group instance was
   * collapsed.  Used on expand to restore exactly the pre-collapse visibility
   * rather than making ALL registry leaves visible (which would conflict with
   * columns that were manually hidden before the collapse).
   */
  private readonly instanceLeaveCache = new Map<string, readonly string[]>();

  /**
   * Snapshot of `store.columns` taken at the moment a group drag is activated.
   * Every live preview move is applied against this base so intermediate preview
   * states don't compound — the final position is always relative to the original
   * column order, not the previous preview frame.
   * Cleared on drop confirmation.
   */
  private previewBaseColumns: ColumnDef[] | null = null;

  constructor(
    private readonly colStyles:    ColumnStyleManager,
    private readonly eventBus:     EventBus,
    private readonly columnModel:  ColumnModel,
    private readonly store:        GridStore,
    private readonly iconRenderer: IconRenderer,
  ) {
    this.registry      = new LogicalGroupRegistry();
    this.builder       = new DisplayGroupBuilder();
    this.headerBuilder = new DisplayGroupHeaderBuilder(iconRenderer);
  }

  // ── Initialization ────────────────────────────────────────────────────────

  /**
   * Parse the top-level column definition array and populate the logical
   * group registry.  Must be called before any `buildTree()` invocations.
   *
   * Group `ColumnDef` entries (those with a `.children` array) are recorded as
   * `LogicalGroupDef` objects.  Leaf columns receive their full group path.
   *
   * @param columns - Top-level `ColumnDef[]`, possibly containing nested groups.
   */
  parse(columns: ColumnDef[]): void {
    this.registry.parse(columns);
  }

  /**
   * `true` when the parsed column definitions contained at least one group.
   * Use this to decide whether group header rows should be rendered.
   */
  get hasGroups(): boolean { return this.registry.hasGroups; }

  /**
   * `true` while a group header drag is currently in progress.
   * Used by the `GridRenderer` store-watcher to skip the full header
   * destroy / rebuild cycle during live-preview drag, preventing flicker.
   */
  get isDraggingGroup(): boolean { return this.dragHandler?.isDraggingGroup ?? false; }

  /**
   * Returns `true` when the given column has no group ancestry — it is a flat
   * (ungrouped) leaf column rendered alongside grouped columns.
   *
   * @param colId - Leaf column ID to check.
   */
  isFlat(colId: string): boolean { return this.registry.getPath(colId).length === 0; }

  // ── Display tree building ─────────────────────────────────────────────────

  /**
   * Build a fresh `DisplayHeaderTree` for the given visible columns.
   *
   * The result is consumed immediately by `DisplayGroupHeaderBuilder` to
   * produce DOM — it should not be stored beyond a single render frame.
   *
   * @param columns - Visible columns for **one panel** in left-to-right order.
   *   Columns with `visible === false` are automatically skipped.
   */
  buildTree(columns: ColumnDef[]): DisplayHeaderTree {
    return this.builder.build(columns, this.registry, this.collapseState, this.colStyles);
  }

  // ── Collapse / expand ─────────────────────────────────────────────────────

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
  toggleGroup(instanceId: string): void {
    const colonIdx      = instanceId.indexOf(':');
    const logicalGroupId = colonIdx >= 0 ? instanceId.slice(0, colonIdx) : instanceId;
    const firstLeafColId = colonIdx >= 0 ? instanceId.slice(colonIdx + 1) : '';

    const wasCollapsed   = this.collapseState.get(instanceId) ?? false;
    const isNowCollapsed = !wasCollapsed;
    this.collapseState.set(instanceId, isNowCollapsed);

    const allCols       = this.store.get('columns') as ColumnDef[];
    const groupLeafIds  = new Set(this.registry.getLeavesForGroup(logicalGroupId));
    const instanceLeaves = this.findInstanceLeaves(allCols, firstLeafColId, groupLeafIds);

    if (isNowCollapsed) {
      // Cache only the leaves that are currently visible so expand doesn't
      // make manually-hidden columns reappear.
      const visibleLeaves = instanceLeaves.filter((c) => c.visible !== false);
      this.instanceLeaveCache.set(instanceId, visibleLeaves.map((c) => c.colId));
      for (let i = 0; i < visibleLeaves.length; i++) {
        this.columnModel.setColumnVisible(visibleLeaves[i].colId, i === 0);
      }
    } else {
      const toRestore = this.instanceLeaveCache.get(instanceId)
        ?? instanceLeaves.map((c) => c.colId);
      for (const colId of toRestore) {
        this.columnModel.setColumnVisible(colId, true);
      }
      this.instanceLeaveCache.delete(instanceId);
    }

    this.eventBus.emit(
      isNowCollapsed
        ? GridEventType.COLUMN_GROUP_HEADER_COLLAPSED
        : GridEventType.COLUMN_GROUP_HEADER_EXPANDED,
      { groupId: logicalGroupId },
    );
  }

  /**
   * Returns `true` when any display instance of the given logical group is
   * currently collapsed.
   *
   * @param logicalGroupId - Logical group ID to inspect.
   */
  isCollapsed(logicalGroupId: string): boolean {
    const prefix = `${logicalGroupId}:`;
    for (const [key, val] of this.collapseState) {
      if (key.startsWith(prefix) && val) return true;
    }
    return false;
  }

  /**
   * Returns a serializable snapshot of the current collapse state.
   * Suitable for persistence or state-save/restore scenarios.
   */
  getCollapseStateSnapshot(): GroupCollapseState[] {
    return Array.from(this.collapseState.entries()).map(([id, collapsed]) => ({
      logicalGroupId: id,
      collapsed,
    }));
  }

  /**
   * Restore collapse state from a previously saved snapshot without triggering
   * a rebuild — the caller must trigger a rebuild after this call if needed.
   *
   * @param states - Array of saved collapse state entries.
   */
  applyCollapseState(states: GroupCollapseState[]): void {
    for (const { logicalGroupId, collapsed } of states) {
      this.collapseState.set(logicalGroupId, collapsed);
    }
  }

  // ── Group move (drag-drop) ────────────────────────────────────────────────

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
  handleGroupMoved(
    logicalGroupId:   string,
    sourcePanel:      'left' | null | 'right',
    targetPanel:      'left' | null | 'right',
    insertBeforeColId: string | null,
  ): void {
    const storeColumns = this.store.get('columns') as ColumnDef[];
    const leafIds      = this.registry.getLeavesForGroup(logicalGroupId);

    // All leaves of this group currently in the source panel (including hidden)
    const groupLeaves = storeColumns.filter(
      (c) => leafIds.includes(c.colId) && (c.pinned ?? null) === sourcePanel,
    );
    if (groupLeaves.length === 0) return;

    const groupLeafSet = new Set(groupLeaves.map((c) => c.colId));

    // Column array with the group's leaves removed
    const withoutGroup = storeColumns.filter((c) => !groupLeafSet.has(c.colId));

    // Update pinned for cross-panel moves
    const movedLeaves: ColumnDef[] = groupLeaves.map((c) => ({
      ...c,
      pinned: targetPanel as ColumnPinPosition,
    }));

    // Find insertion index in withoutGroup
    let insertIdx: number;
    if (insertBeforeColId) {
      insertIdx = withoutGroup.findIndex((c) => c.colId === insertBeforeColId);
      if (insertIdx === -1) {
        // Fall back to end of target panel
        insertIdx = this.findEndOfPanel(withoutGroup, targetPanel);
      }
    } else {
      insertIdx = this.findEndOfPanel(withoutGroup, targetPanel);
    }

    const newColumns: ColumnDef[] = [
      ...withoutGroup.slice(0, insertIdx),
      ...movedLeaves,
      ...withoutGroup.slice(insertIdx),
    ];

    this.store.set('columns', newColumns);
  }

  // ── Group resize ──────────────────────────────────────────────────────────

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
  resizeGroup(instanceId: string, newWidth: number): void {
    const colonIdx      = instanceId.indexOf(':');
    const logicalGroupId = colonIdx >= 0 ? instanceId.slice(0, colonIdx) : instanceId;
    const firstLeafColId = colonIdx >= 0 ? instanceId.slice(colonIdx + 1) : '';

    const allCols       = this.store.get('columns') as ColumnDef[];
    const groupLeafIds  = new Set(this.registry.getLeavesForGroup(logicalGroupId));
    const leaves        = this.findInstanceLeaves(allCols, firstLeafColId, groupLeafIds)
      .filter((c) => c.visible !== false);

    if (leaves.length === 0) return;

    const currentWidth = leaves.reduce((s, c) => s + this.colStyles.getWidth(c.colId), 0);
    if (currentWidth <= 0 || Math.abs(newWidth - currentWidth) < 1) return;

    const ratio = newWidth / currentWidth;
    for (const leaf of leaves) {
      const oldW = this.colStyles.getWidth(leaf.colId);
      const newW = Math.max(leaf.minWidth ?? 40, Math.round(oldW * ratio));
      this.colStyles.setWidth(leaf.colId, newW);
      this.columnModel.setColumnWidth(leaf.colId, newW, false);
    }
  }

  // ── Live drag preview (AG Grid-style) ────────────────────────────────────

  /**
   * Called by {@link DisplayGroupDragHandler} when the drag activation threshold
   * is crossed.  Saves the current `store.columns` snapshot so every subsequent
   * {@link applyPreviewMove} can rebase from the original order.
   */
  beginDragPreview(): void {
    this.previewBaseColumns = this.store.get('columns') as ColumnDef[];
  }

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
  applyPreviewMove(
    logicalGroupId:    string,
    sourcePanel:       'left' | null | 'right',
    targetPanel:       'left' | null | 'right',
    insertBeforeColId: string | null,
  ): void {
    const baseColumns = this.previewBaseColumns;
    if (!baseColumns) return;

    const leafIds = this.registry.getLeavesForGroup(logicalGroupId);
    const groupLeaves = baseColumns.filter(
      (c) => leafIds.includes(c.colId) && (c.pinned ?? null) === sourcePanel,
    );
    if (groupLeaves.length === 0) return;

    const groupLeafSet = new Set(groupLeaves.map((c) => c.colId));
    const withoutGroup = baseColumns.filter((c) => !groupLeafSet.has(c.colId));
    const movedLeaves: ColumnDef[] = groupLeaves.map((c) => ({
      ...c,
      pinned: targetPanel as ColumnPinPosition,
    }));

    let insertIdx: number;
    if (insertBeforeColId) {
      insertIdx = withoutGroup.findIndex((c) => c.colId === insertBeforeColId);
      if (insertIdx === -1) insertIdx = this.findEndOfPanel(withoutGroup, targetPanel);
    } else {
      insertIdx = this.findEndOfPanel(withoutGroup, targetPanel);
    }

    this.store.set('columns', [
      ...withoutGroup.slice(0, insertIdx),
      ...movedLeaves,
      ...withoutGroup.slice(insertIdx),
    ]);
  }

  /**
   * Confirm the drag preview: the store already holds the correct final order
   * from the last {@link applyPreviewMove} call.  This simply clears the snapshot.
   */
  confirmDragPreview(): void {
    this.previewBaseColumns = null;
  }

  // ── Drag handler factory ──────────────────────────────────────────────────

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
  createDragHandler(gridElGetter: () => HTMLElement | null): DisplayGroupDragHandler {
    if (!this.dragHandler) {
      this.dragHandler = new DisplayGroupDragHandler(
        gridElGetter,
        (groupId, src, tgt, before) => this.handleGroupMoved(groupId, src, tgt, before),
        undefined, // previewCallbacks — CSS-transform path is used (no live store mutations)
        (groupId) => this.registry.getLeavesForGroup(groupId),
      );
    }
    return this.dragHandler;
  }

  /**
   * Returns the active drag handler, or `null` if `createDragHandler` has not
   * been called yet.
   */
  getDragHandler(): DisplayGroupDragHandler | null {
    return this.dragHandler;
  }

  // ── Context-menu helpers (used by GroupContextMenu) ──────────────────────

  /**
   * Expose all leaf column IDs for a logical group.
   * Used by the group context menu to inspect and modify group leaves.
   *
   * @param logicalGroupId - Logical group to inspect.
   */
  getLeavesForGroup(logicalGroupId: string): readonly string[] {
    return this.registry.getLeavesForGroup(logicalGroupId);
  }

  /**
   * Returns the positional state of a group within its current panel.
   * Used by the group context menu to enable or disable move items.
   *
   * @param logicalGroupId - The group to inspect.
   */
  getGroupPositionInfo(logicalGroupId: string): {
    isFirst: boolean;
    isLast:  boolean;
    panel:   'left' | null | 'right';
  } {
    const allCols = this.store.get('columns') as ColumnDef[];
    const leafIds = new Set(this.registry.getLeavesForGroup(logicalGroupId));
    const firstLeaf = allCols.find((c) => leafIds.has(c.colId));
    if (!firstLeaf) return { isFirst: true, isLast: true, panel: null };

    const panel = (firstLeaf.pinned ?? null) as 'left' | null | 'right';
    const panelCols = allCols.filter((c) => (c.pinned ?? null) === panel && c.visible !== false);

    // Positions of this group's leaves within the panel column list
    const leafIndices = panelCols.reduce<number[]>((acc, c, i) => {
      if (leafIds.has(c.colId)) acc.push(i);
      return acc;
    }, []);

    if (leafIndices.length === 0) return { isFirst: true, isLast: true, panel };
    return {
      isFirst: leafIndices[0] === 0,
      isLast:  leafIndices[leafIndices.length - 1] === panelCols.length - 1,
      panel,
    };
  }

  /**
   * Move the group one column position to the left within its current panel.
   * No-op when the group is already at the start of the panel.
   *
   * @param logicalGroupId - The group to move.
   */
  moveGroupLeft(logicalGroupId: string): void {
    const allCols = this.store.get('columns') as ColumnDef[];
    const leafIds = new Set(this.registry.getLeavesForGroup(logicalGroupId));
    const firstLeaf = allCols.find((c) => leafIds.has(c.colId));
    if (!firstLeaf) return;

    const panel = (firstLeaf.pinned ?? null) as 'left' | null | 'right';
    const panelCols = allCols.filter((c) => (c.pinned ?? null) === panel);
    const firstLeafIdx = panelCols.findIndex((c) => leafIds.has(c.colId));
    if (firstLeafIdx <= 0) return;

    this.handleGroupMoved(logicalGroupId, panel, panel, panelCols[firstLeafIdx - 1].colId);
  }

  /**
   * Move the group one column position to the right within its current panel.
   * No-op when the group is already at the end of the panel.
   *
   * @param logicalGroupId - The group to move.
   */
  moveGroupRight(logicalGroupId: string): void {
    const allCols = this.store.get('columns') as ColumnDef[];
    const leafIds = new Set(this.registry.getLeavesForGroup(logicalGroupId));
    const firstLeaf = allCols.find((c) => leafIds.has(c.colId));
    if (!firstLeaf) return;

    const panel = (firstLeaf.pinned ?? null) as 'left' | null | 'right';
    const panelCols = allCols.filter((c) => (c.pinned ?? null) === panel);

    // Find the last leaf index in the panel column list
    let lastLeafIdx = -1;
    for (let i = 0; i < panelCols.length; i++) {
      if (leafIds.has(panelCols[i].colId)) lastLeafIdx = i;
    }
    if (lastLeafIdx === -1 || lastLeafIdx >= panelCols.length - 1) return;

    // Insert BEFORE the column two positions past the last leaf (i.e. after the next non-group col)
    const insertBeforeIdx = lastLeafIdx + 2;
    const insertBefore = insertBeforeIdx < panelCols.length
      ? panelCols[insertBeforeIdx].colId
      : null;
    this.handleGroupMoved(logicalGroupId, panel, panel, insertBefore);
  }

  /**
   * Move the group to the first position within its current panel.
   * No-op when the group is already at the start.
   *
   * @param logicalGroupId - The group to move.
   */
  moveGroupToStart(logicalGroupId: string): void {
    const allCols = this.store.get('columns') as ColumnDef[];
    const leafIds = new Set(this.registry.getLeavesForGroup(logicalGroupId));
    const firstLeaf = allCols.find((c) => leafIds.has(c.colId));
    if (!firstLeaf) return;

    const panel = (firstLeaf.pinned ?? null) as 'left' | null | 'right';
    const panelCols = allCols.filter((c) => (c.pinned ?? null) === panel);
    const firstNonGroup = panelCols.find((c) => !leafIds.has(c.colId));
    if (!firstNonGroup) return;

    this.handleGroupMoved(logicalGroupId, panel, panel, firstNonGroup.colId);
  }

  /**
   * Move the group to the last position within its current panel.
   * No-op when the group is already at the end.
   *
   * @param logicalGroupId - The group to move.
   */
  moveGroupToEnd(logicalGroupId: string): void {
    const allCols = this.store.get('columns') as ColumnDef[];
    const leafIds = new Set(this.registry.getLeavesForGroup(logicalGroupId));
    const firstLeaf = allCols.find((c) => leafIds.has(c.colId));
    if (!firstLeaf) return;

    const panel = (firstLeaf.pinned ?? null) as 'left' | null | 'right';
    this.handleGroupMoved(logicalGroupId, panel, panel, null);
  }

  /**
   * Hide all visible leaf columns that belong to this group.
   * Columns that are already hidden are left unchanged.
   *
   * @param logicalGroupId - The group whose leaves should be hidden.
   */
  hideGroupLeaves(logicalGroupId: string): void {
    const leafIds = this.registry.getLeavesForGroup(logicalGroupId);
    for (const colId of leafIds) {
      this.columnModel.setColumnVisible(colId, false);
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

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
  private findInstanceLeaves(
    allCols:        ColumnDef[],
    firstLeafColId: string,
    groupLeafIds:   Set<string>,
  ): ColumnDef[] {
    const startIdx = allCols.findIndex((c) => c.colId === firstLeafColId);
    if (startIdx === -1) return [];
    const result: ColumnDef[] = [];
    for (let i = startIdx; i < allCols.length; i++) {
      if (!groupLeafIds.has(allCols[i].colId)) break;
      result.push(allCols[i]);
    }
    return result;
  }

  /**
   * Find the index **one past** the last column in `panel` within `columns`.
   * Returns `columns.length` when no column with the target panel is found
   * (appends to the absolute end of the array).
   *
   * @param columns - Column array to search within.
   * @param panel   - Target panel (`'left'`, `null` for center, `'right'`).
   */
  private findEndOfPanel(columns: ColumnDef[], panel: 'left' | null | 'right'): number {
    let lastIdx = -1;
    for (let i = 0; i < columns.length; i++) {
      if ((columns[i].pinned ?? null) === panel) lastIdx = i;
    }
    return lastIdx === -1 ? columns.length : lastIdx + 1;
  }
}
