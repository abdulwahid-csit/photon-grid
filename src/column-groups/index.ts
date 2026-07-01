/**
 * @module column-groups
 *
 * Public API surface for the Photon Grid column-group system.
 *
 * ```ts
 * import {
 *   ColumnGroupModel,
 *   ColumnGroupHeaderBuilder,
 *   ColumnGroupStateManager,
 *   ColumnGroupNodeType,
 *   ColumnGroupResizeStrategy,
 * } from 'photon-grid/column-groups';
 * ```
 */

// ── Types ────────────────────────────────────────────────────────────────────
export type {
  IColumnGroupNode,
  IColumnLeafNode,
  ColumnTreeNode,
  HeaderGroupCell,
  HeaderGroupRow,
  HeaderGroupLayoutOptions,
  GroupHeaderRendererParams,
  ColumnGroupSerialState,
  ColumnGroupSystemState,
  ColumnGroupHeaderCollapsedEvent,
  ColumnGroupHeaderExpandedEvent,
  ColumnGroupHeaderCreatedEvent,
  ColumnGroupHeaderRemovedEvent,
} from './column-group.types';

// ── Enums ────────────────────────────────────────────────────────────────────
export { ColumnGroupNodeType, ColumnGroupResizeStrategy } from './column-group.types';

// ── Model ────────────────────────────────────────────────────────────────────
export { ColumnGroupModel } from './column-group-model';

// ── Header builder ───────────────────────────────────────────────────────────
export { ColumnGroupHeaderBuilder } from './column-group-header-builder';
export type { GroupCellBuildOptions } from './column-group-header-builder';

// ── Drag handler ─────────────────────────────────────────────────────────────
export { ColumnGroupDragHandler } from './column-group-drag-handler';
export type { GroupDropPosition, GroupDropTarget } from './column-group-drag-handler';

// ── State manager ────────────────────────────────────────────────────────────
export { ColumnGroupStateManager } from './column-group-state-manager';
export type { ColumnGroupStateDiff } from './column-group-state-manager';
