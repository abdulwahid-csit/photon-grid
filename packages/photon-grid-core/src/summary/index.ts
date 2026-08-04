/**
 * Summary Row feature — public surface.
 *
 * Multiple aggregate rows docked above and/or below the grid body, or flowing
 * with its content. Framework-agnostic end to end: the calculation half reads
 * the grid only through {@link SummaryDataPort}, and the render half is plain
 * DOM driven by the grid's own frame.
 *
 * ```text
 *   GridOptions.summary
 *          │
 *          ▼
 *   SummaryModel ────────────── definitions: which rows, where, what scope
 *          │
 *          ▼
 *   SummaryService ─┬───────── SummaryAggregationEngine   (sum/avg/…/custom)
 *          │        └───────── SummaryDataPort            (rows, columns, API)
 *          ▼
 *   SummaryRowSnapshot[] ────── GridApi.getSummary()
 *          │
 *          ▼
 *   SummaryRowRenderer ──────── one band per (top|bottom) × (sticky|inline)
 * ```
 *
 * @packageDocumentation
 */

export { SummaryAggregationEngine } from './aggregation-engine';
export { SummaryModel, DERIVED_SUMMARY_ROW_ID } from './summary-model';
export type { ResolvedSummaryRow } from './summary-model';
export { SummaryService } from './summary-service';
export type { SummaryDataPort } from './summary-data-port';
export { SummaryRowRenderer } from './summary-row-renderer';
export type { SummaryBandLayout, SummaryBandRow } from './summary-row-renderer';

export {
  SummaryAggregation,
  SummaryPosition,
  SummaryScope,
} from './summary.types';
export type {
  SummaryAggregateFn,
  SummaryApi,
  SummaryCellContext,
  SummaryCellDef,
  SummaryCellRendererParams,
  SummaryCellSnapshot,
  SummaryComputedCellContext,
  SummaryConfig,
  SummaryFormatterFn,
  SummaryRendererFn,
  SummaryRowDef,
  SummaryRowSnapshot,
  SummaryTooltipFn,
  SummaryValueFn,
} from './summary.types';
