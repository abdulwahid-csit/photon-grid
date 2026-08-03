/**
 * Photon Grid's viewport Virtual DOM.
 *
 * A lightweight, grid-specific virtual layer that mirrors only the rendered
 * viewport and patches individual cells in place. Framework-independent — no
 * React, Vue or generic reconciler is involved.
 *
 * @packageDocumentation
 */

export { ViewportVDom } from './viewport-vdom';
export { CellPatcher } from './cell-patcher';
export { PatchScheduler } from './patch-scheduler';
export { isSameCellValue, snapshotCellValue } from './cell-value-equality';
export { CellPatchKind } from './vdom.types';
export type {
  CellUpdate,
  CellUpdateResult,
  PanelName,
  RenderedRowRef,
  VDomRenderContext,
  VDomStats,
  VirtualCell,
  VirtualRow,
} from './vdom.types';
