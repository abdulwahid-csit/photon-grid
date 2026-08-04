/**
 * Definition store for the Summary Row feature.
 *
 * Owns the *shape* of the summary — which rows exist, where each is anchored,
 * what scope it aggregates, how tall it is — and nothing about how values are
 * computed (that is {@link import('./summary-service').SummaryService}) or how
 * they are painted (that is
 * {@link import('./summary-row-renderer').SummaryRowRenderer}).
 *
 * Definitions arrive from three places, in precedence order:
 * 1. {@link SummaryModel.setRows} — the runtime API.
 * 2. {@link SummaryConfig.rows} — the initial `GridOptions.summary.rows`.
 * 3. Columns declaring `ColumnDef.showSummary` — a derived fallback that makes
 *    the long-standing per-column summary properties work with no extra setup.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../types/column.types';
import {
  SummaryAggregation,
  SummaryPosition,
  SummaryScope,
  type SummaryCellDef,
  type SummaryConfig,
  type SummaryRowDef,
  type SummaryRowSnapshot,
} from './summary.types';

/** Fallback height when neither the config nor `GridOptions.rowHeight` supplies one. */
const DEFAULT_SUMMARY_ROW_HEIGHT = 40;

/** Id of the row derived from `ColumnDef.showSummary`. Stable, so it can be patched or removed like any other. */
export const DERIVED_SUMMARY_ROW_ID = 'pg-summary-derived-total';

/**
 * A summary row definition with every optional policy resolved against the
 * grid-wide defaults — what the service and renderer consume, so neither has to
 * re-implement the fallback chain.
 */
export interface ResolvedSummaryRow {
  /** Stable id (supplied or generated). */
  readonly id: string;
  /** The originating definition, for cell lookup and patching. */
  readonly def: SummaryRowDef;
  /** Resolved band. */
  readonly position: SummaryPosition;
  /** Resolved stickiness. */
  readonly sticky: boolean;
  /** Resolved row scope. */
  readonly scope: SummaryScope;
  /** Resolved height in pixels. */
  readonly height: number;
  /** Extra class name(s), or `null`. */
  readonly className: string | null;
}

/**
 * Holds and normalizes summary row definitions.
 *
 * Pure state — no DOM, no event bus, no grid context. One instance per grid.
 */
export class SummaryModel {
  /** Normalized rows, in declaration order (which is also paint order within a band). */
  private resolved: ResolvedSummaryRow[] = [];

  /** Last computed values, keyed by row id. Replaced wholesale on every refresh. */
  private snapshots: ReadonlyMap<string, SummaryRowSnapshot> = new Map();

  /**
   * Bumped whenever the *structure* changes — rows added, removed, reordered, or
   * any resolved policy altered. The renderer compares this against what it last
   * painted to decide between a cheap value patch and a full band rebuild.
   */
  private structureVersion = 0;

  /**
   * `true` while the rows are derived from `ColumnDef.showSummary` rather than
   * explicitly configured. Any call to {@link setRows} takes ownership and
   * switches this off permanently, so a later column change cannot silently
   * overwrite host-supplied definitions.
   */
  private derived: boolean;

  /**
   * Column signature the derived row was last built from. Rebuilding is skipped
   * while it is unchanged, so the common case (columns re-published on every
   * pipeline run with the same summary settings) costs one string compare.
   */
  private derivedSignature = '';

  /** Monotonic counter behind generated row ids. */
  private nextGeneratedId = 0;

  constructor(
    private readonly config: SummaryConfig,
    /** `GridOptions.rowHeight`, used when neither the row nor the config sets a height. */
    private readonly gridRowHeight: number | undefined,
  ) {
    const rows = config.rows;
    this.derived = rows == null;
    if (rows != null) this.replaceRows(rows);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  /** @returns Every resolved row, in declaration order. */
  getRows(): readonly ResolvedSummaryRow[] {
    return this.resolved;
  }

  /**
   * @param rowId - Id to look up.
   * @returns The resolved row, or `null`.
   */
  getRow(rowId: string): ResolvedSummaryRow | null {
    return this.resolved.find((row) => row.id === rowId) ?? null;
  }

  /**
   * Rows painted in one band, split by stickiness — the exact four buckets the
   * renderer maintains as separate DOM regions.
   *
   * @param position - {@link SummaryPosition.Top} or {@link SummaryPosition.Bottom}.
   * @param sticky   - `true` for the docked band, `false` for the in-content one.
   */
  getRowsForBand(
    position: SummaryPosition.Top | SummaryPosition.Bottom,
    sticky: boolean,
  ): ResolvedSummaryRow[] {
    return this.resolved.filter(
      (row) =>
        row.sticky === sticky &&
        (row.position === position || row.position === SummaryPosition.Both),
    );
  }

  /** @returns `true` when no summary row is defined, so the feature can be skipped wholesale. */
  isEmpty(): boolean {
    return this.resolved.length === 0;
  }

  /** @returns The current structure version. @see {@link structureVersion} */
  getStructureVersion(): number {
    return this.structureVersion;
  }

  // ─── Snapshots ─────────────────────────────────────────────────────────────

  /**
   * Stores the freshly computed values.
   *
   * @param snapshots - One snapshot per resolved row, in the same order.
   */
  setSnapshots(snapshots: readonly SummaryRowSnapshot[]): void {
    const next = new Map<string, SummaryRowSnapshot>();
    for (const snapshot of snapshots) next.set(snapshot.id, snapshot);
    this.snapshots = next;
  }

  /** @returns The last computed snapshots, in row declaration order. */
  getSnapshots(): readonly SummaryRowSnapshot[] {
    const result: SummaryRowSnapshot[] = [];
    for (const row of this.resolved) {
      const snapshot = this.snapshots.get(row.id);
      if (snapshot) result.push(snapshot);
    }
    return result;
  }

  /**
   * @param rowId - Id to look up.
   * @returns That row's last computed snapshot, or `null`.
   */
  getSnapshot(rowId: string): SummaryRowSnapshot | null {
    return this.snapshots.get(rowId) ?? null;
  }

  // ─── Mutation ──────────────────────────────────────────────────────────────

  /**
   * Replaces every row definition. Takes permanent ownership of the definitions
   * away from column-derived mode.
   *
   * @param rows - The new definitions.
   */
  setRows(rows: readonly SummaryRowDef[]): void {
    this.derived = false;
    this.derivedSignature = '';
    this.replaceRows(rows);
  }

  /**
   * Shallow-merges a patch into one row, merging `cells` one level deep so a
   * single column's cell can be replaced without restating the others.
   *
   * @param rowId - Id of the row to patch.
   * @param patch - Properties to overwrite.
   * @returns `true` when the row existed.
   */
  updateRow(rowId: string, patch: Partial<SummaryRowDef>): boolean {
    const index = this.resolved.findIndex((row) => row.id === rowId);
    if (index === -1) return false;

    const current = this.resolved[index].def;
    const merged: SummaryRowDef = {
      ...current,
      ...patch,
      // `id` is the row's identity — a patch must not be able to rename a row
      // out from under the caller that is holding onto it.
      id: rowId,
      cells: patch.cells ? { ...current.cells, ...patch.cells } : current.cells,
    };

    // Replaced rather than mutated: `resolved` entries are readonly, and a fresh
    // object keeps any consumer holding the previous one seeing a consistent
    // snapshot of the pre-patch definition.
    const next = this.resolved.slice();
    next[index] = this.resolve(merged, rowId);
    this.resolved = next;
    this.structureVersion++;
    return true;
  }

  /**
   * Removes one row definition.
   *
   * @param rowId - Id of the row to remove.
   * @returns `true` when the row existed.
   */
  removeRow(rowId: string): boolean {
    const index = this.resolved.findIndex((row) => row.id === rowId);
    if (index === -1) return false;

    const next = this.resolved.slice();
    next.splice(index, 1);
    this.resolved = next;
    this.structureVersion++;
    return true;
  }

  /**
   * Rebuilds the column-derived total row when in derived mode and the columns'
   * summary settings changed.
   *
   * A no-op once {@link setRows} has been called, and a single string compare
   * when the derived signature is unchanged — so this is safe to call on every
   * pipeline run.
   *
   * @param columns - The grid's current leaf columns.
   * @returns `true` when the derived row was rebuilt.
   */
  syncDerivedRows(columns: readonly ColumnDef[]): boolean {
    if (!this.derived) return false;

    const signature = buildDerivedSignature(columns);
    if (signature === this.derivedSignature) return false;
    this.derivedSignature = signature;

    if (signature === '') {
      // No column opts into a summary — drop the derived row entirely rather
      // than leaving an empty band taking up vertical space.
      if (this.resolved.length > 0) {
        this.resolved = [];
        this.structureVersion++;
      }
      return true;
    }

    const cells: Record<string, SummaryCellDef> = {};
    for (const col of columns) {
      if (col.showSummary !== true) continue;
      const aggregation = col.summaryAggregation ?? SummaryAggregation.Sum;
      if (aggregation === 'none') continue;
      cells[col.colId] = {
        aggregate: aggregation,
        // `summaryLabel` predates this feature and reads as a prefix ("Sum:
        // 1,204"), which is how the original engine used it. Honouring that
        // keeps existing column definitions rendering the way they were written
        // for, instead of silently dropping the label. Decorating
        // `defaultFormattedValue` (rather than the raw value) means the column's
        // currency/locale/precision formatting still applies underneath.
        formatter: col.summaryLabel
          ? ({ defaultFormattedValue }) =>
              defaultFormattedValue === ''
                ? col.summaryLabel!
                : `${col.summaryLabel}: ${defaultFormattedValue}`
          : undefined,
      };
    }

    this.resolved = [this.resolve({ id: DERIVED_SUMMARY_ROW_ID, cells }, DERIVED_SUMMARY_ROW_ID)];
    this.structureVersion++;
    return true;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  /** Normalizes and installs a full row list, bumping the structure version once. */
  private replaceRows(rows: readonly SummaryRowDef[]): void {
    const seen = new Set<string>();
    this.resolved = rows.map((def) => {
      const id = this.ensureUniqueId(def.id, seen);
      seen.add(id);
      return this.resolve(def, id);
    });
    this.structureVersion++;
  }

  /**
   * Resolves a definition's optional policy against the grid-wide defaults.
   * Kept in one place so the fallback chain — row → config → grid → constant —
   * is stated exactly once.
   */
  private resolve(def: SummaryRowDef, id: string): ResolvedSummaryRow {
    return {
      id,
      def,
      position: def.position ?? this.config.position ?? SummaryPosition.Bottom,
      sticky: def.sticky ?? this.config.sticky ?? true,
      scope: def.scope ?? this.config.scope ?? SummaryScope.Filtered,
      height:
        def.height ?? this.config.height ?? this.gridRowHeight ?? DEFAULT_SUMMARY_ROW_HEIGHT,
      className: def.className ?? null,
    };
  }

  /**
   * Returns the supplied id when it is present and unused, otherwise generates
   * one. Duplicate ids would make `updateSummaryRow` / `removeSummaryRow`
   * ambiguous, so a collision is resolved rather than accepted.
   */
  private ensureUniqueId(id: string | undefined, seen: ReadonlySet<string>): string {
    if (id != null && id !== '' && !seen.has(id)) return id;
    let generated: string;
    do {
      generated = `pg-summary-${this.nextGeneratedId++}`;
    } while (seen.has(generated));
    return generated;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Compact fingerprint of every column's summary settings.
 *
 * Only the three properties the derived row is built from participate, so
 * unrelated column changes (a width drag, a sort, a pin) do not trigger a
 * needless rebuild.
 */
function buildDerivedSignature(columns: readonly ColumnDef[]): string {
  let signature = '';
  for (const col of columns) {
    if (col.showSummary !== true) continue;
    signature += `${col.colId}:${col.summaryAggregation ?? ''}:${col.summaryLabel ?? ''};`;
  }
  return signature;
}
