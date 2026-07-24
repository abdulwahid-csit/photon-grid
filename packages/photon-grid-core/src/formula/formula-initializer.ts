/**
 * Discovers formulas **declaratively** — from column definitions and from row
 * data — and registers them with the {@link FormulaEngine}, so consumers never
 * have to call `GridApi.setCellFormula` to seed formulas at load time.
 *
 * It is deliberately framework-independent: it operates on the minimal
 * {@link FormulaColumnInfo}/{@link FormulaRowInfo} shapes rather than concrete
 * grid types, so it is unit-testable in isolation and reusable across wrappers
 * (per Photon Core's architecture rules). The grid layer adapts its
 * `ColumnModel`/`RowModel` to these shapes.
 *
 * ### Sources & precedence (lowest → highest)
 * 1. **Column formula** — {@link FormulaColumnInfo.formula}: applied to every row.
 * 2. **Row-data formula** — a `=`-prefixed string in a row's cell: overrides the
 *    column formula for that one row.
 * 3. **Runtime API / manual edit** — a later `setFormula` overrides both (handled
 *    by the engine's last-write-wins store, not here).
 *
 * @packageDocumentation
 */

import type { FormulaEngine } from './formula-engine';
import { isFormulaSource } from './compile';
import { resolveFieldPath } from '../engines/editing/value-accessor';

/** The minimal column shape formula discovery needs. */
export interface FormulaColumnInfo {
  /** Immutable column identity. */
  readonly colId: string;
  /** The column's data `field` (used to read row-data cell values). */
  readonly field: string;
  /** Whether the column opted into the Formula Engine. */
  readonly allowFormula?: boolean;
  /** A declared column-level formula applied to every row. */
  readonly formula?: string;
}

/** The minimal row shape formula discovery needs. */
export interface FormulaRowInfo {
  /** Stable row identity. */
  readonly nodeId: string;
  /** The row's data object. */
  readonly data: Record<string, unknown>;
}

/** A discovered formula ready to register. */
interface FormulaSeed {
  readonly nodeId: string;
  readonly colId: string;
  readonly source: string;
}

/** Configuration for {@link FormulaInitializer}. */
export interface FormulaInitializerOptions {
  /**
   * When `true` (default), a `=`-prefixed value found in a column's row data
   * auto-opts that column into the Formula Engine — even if it did not set
   * `allowFormula` — via {@link markFormulaCapable}. When `false`, only columns
   * that explicitly opted in (`allowFormula` or a column `formula`) are scanned.
   *
   * @default true
   */
  readonly autoDetectDataFormulas?: boolean;
  /**
   * Called when auto-detection promotes a column to formula-capable, so the grid
   * can flip `allowFormula` on the live column model before the engine (which
   * gates on it) registers the formula.
   */
  readonly markFormulaCapable?: (colId: string) => void;
}

/** Empty changed-set singleton. */
const NO_CHANGES: ReadonlySet<string> = new Set<string>();

/**
 * Framework-independent declarative-formula discovery. One instance per grid,
 * driven by the grid layer on load and on structural row changes. Each method
 * returns the set of row `nodeId`s whose value changed, so the caller can repaint
 * precisely.
 */
export class FormulaInitializer {
  private readonly autoDetect: boolean;
  private readonly markFormulaCapable: (colId: string) => void;

  /**
   * @param engine  - The formula engine to register discovered formulas with.
   * @param options - Discovery options.
   */
  constructor(
    private readonly engine: FormulaEngine,
    options: FormulaInitializerOptions = {},
  ) {
    this.autoDetect = options.autoDetectDataFormulas !== false;
    this.markFormulaCapable = options.markFormulaCapable ?? (() => {});
  }

  /**
   * Discovers and registers every formula for a full data load. Purges formulas
   * belonging to rows no longer present (so a data swap leaves no orphans), then
   * seeds the new set in a single recompute.
   *
   * @param columns - All columns in canonical order.
   * @param rows    - All data rows.
   * @returns Row ids whose value changed.
   */
  onLoad(columns: readonly FormulaColumnInfo[], rows: readonly FormulaRowInfo[]): ReadonlySet<string> {
    if (!this.engine.isEnabled()) return NO_CHANGES;
    this.purgeStale(rows);
    const seeds = this.collectSeeds(columns, rows);
    return seeds.length > 0 ? this.engine.setFormulas(seeds).changedNodeIds : NO_CHANGES;
  }

  /**
   * Discovers and registers formulas for newly-inserted rows (incremental —
   * existing rows are untouched).
   *
   * @param columns - All columns in canonical order.
   * @param newRows - Only the rows just added.
   * @returns Row ids whose value changed.
   */
  onRowsAdded(columns: readonly FormulaColumnInfo[], newRows: readonly FormulaRowInfo[]): ReadonlySet<string> {
    if (!this.engine.isEnabled() || newRows.length === 0) return NO_CHANGES;
    const seeds = this.collectSeeds(columns, newRows);
    return seeds.length > 0 ? this.engine.setFormulas(seeds).changedNodeIds : NO_CHANGES;
  }

  /**
   * Removes formulas belonging to deleted rows and recomputes dependents.
   *
   * @param nodeIds - Stable ids of the removed rows.
   * @returns Row ids whose value changed.
   */
  onRowsRemoved(nodeIds: ReadonlySet<string>): ReadonlySet<string> {
    if (!this.engine.isEnabled() || nodeIds.size === 0) return NO_CHANGES;
    return this.engine.purgeNodes(nodeIds).changedNodeIds;
  }

  /**
   * Reacts to an in-place update of a single row's data: re-discovers any newly
   * introduced `=`-formula in the changed fields, then recomputes formula cells
   * that depend on the changed (literal) cells.
   *
   * @param columns       - All columns in canonical order.
   * @param row           - The updated row.
   * @param changedFields - The data fields that changed.
   * @returns Row ids whose value changed.
   */
  onRowDataChanged(
    columns: readonly FormulaColumnInfo[],
    row: FormulaRowInfo,
    changedFields: readonly string[],
  ): ReadonlySet<string> {
    if (!this.engine.isEnabled() || changedFields.length === 0) return NO_CHANGES;
    const changedSet = new Set(changedFields);
    const changed = new Set<string>();

    // (Re)register formulas newly present in the changed cells.
    const seeds = this.collectSeeds(
      columns.filter((c) => changedSet.has(c.field)),
      [row],
    );
    if (seeds.length > 0) {
      for (const id of this.engine.setFormulas(seeds).changedNodeIds) changed.add(id);
    }

    // Recompute dependents of any changed *literal* cells (non-formula edits).
    const literalCells = columns
      .filter((c) => changedSet.has(c.field) && !this.engine.hasFormula(row.nodeId, c.colId))
      .map((c) => ({ nodeId: row.nodeId, colId: c.colId }));
    if (literalCells.length > 0) {
      for (const id of this.engine.onCellsChanged(literalCells).changedNodeIds) changed.add(id);
    }
    return changed;
  }

  /**
   * Builds the seed list: for each row × column, a row-data `=`-formula wins over
   * the column formula (precedence), and auto-detection promotes columns as
   * needed so the engine will accept their formulas.
   */
  private collectSeeds(
    columns: readonly FormulaColumnInfo[],
    rows: readonly FormulaRowInfo[],
  ): FormulaSeed[] {
    const seeds: FormulaSeed[] = [];
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      const declared = col.allowFormula === true || col.formula != null;
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const raw = resolveFieldPath(row.data, col.field);
        const rowFormula = typeof raw === 'string' && isFormulaSource(raw);

        if (rowFormula) {
          // Row-data formula: overrides the column formula for this row. Promote
          // the column if it did not opt in and auto-detection is on.
          if (!declared) {
            if (!this.autoDetect) continue;
            this.markFormulaCapable(col.colId);
          }
          seeds.push({ nodeId: row.nodeId, colId: col.colId, source: raw as string });
        } else if (col.formula != null && declared) {
          // Column formula fallback (only for opted-in columns).
          seeds.push({ nodeId: row.nodeId, colId: col.colId, source: col.formula });
        }
      }
    }
    return seeds;
  }

  /** Drops formula cells whose row is absent from `rows` (data-swap cleanup). */
  private purgeStale(rows: readonly FormulaRowInfo[]): void {
    const state = this.engine.getState();
    if (state.cells.length === 0) return;
    const incoming = new Set<string>();
    for (let i = 0; i < rows.length; i++) incoming.add(rows[i].nodeId);
    const stale = new Set<string>();
    for (const cell of state.cells) {
      if (!incoming.has(cell.nodeId)) stale.add(cell.nodeId);
    }
    if (stale.size > 0) this.engine.purgeNodes(stale);
  }
}
