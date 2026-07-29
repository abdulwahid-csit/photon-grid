/**
 * The **Grid Doctor** — inspects the live grid configuration and reports real,
 * specific problems: duplicate column ids, settings that cost performance,
 * accessibility gaps, and deprecated or contradictory options.
 *
 * Every finding is derived from the actual `GridOptions` and `ColumnDef`s, not
 * guessed by a language model. The model's only job is to phrase the findings —
 * which is what makes "why is my grid slow?" produce *your* misconfiguration
 * rather than a generic listicle.
 *
 * @packageDocumentation
 */

import type { GridApi } from '../../core/grid-api';
import type { GridOptions } from '../../types/grid.types';
import type { ColumnDef } from '../../types/column.types';

/** How serious a finding is. */
export enum DiagnosticSeverity {
  /** Certain to be a bug or a broken behaviour. */
  Error = 'error',
  /** Very likely wrong, or a real cost the user probably did not intend. */
  Warning = 'warning',
  /** Worth knowing; not necessarily wrong. */
  Info = 'info',
}

/** Which lens produced a finding, so a targeted question can filter to it. */
export enum DiagnosticCategory {
  Configuration = 'configuration',
  Performance = 'performance',
  Accessibility = 'accessibility',
  Data = 'data',
}

/** One diagnosed problem. */
export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly category: DiagnosticCategory;
  /** What is wrong, in one sentence. */
  readonly message: string;
  /** What to do about it. */
  readonly fix: string;
}

/** Row count past which client-side sorting and filtering start to feel heavy. */
const LARGE_DATASET_ROWS = 100_000;

/** Column count past which disabling column virtualisation gets expensive. */
const WIDE_GRID_COLUMNS = 30;

/** Inspects a grid and reports configuration, performance, and a11y findings. */
export class GridDoctor {
  constructor(
    private readonly api: GridApi,
    private readonly options: GridOptions,
  ) {}

  /** Runs every check. Ordered most-severe first so a truncated reply keeps the important part. */
  diagnose(): Diagnostic[] {
    const columns = this.api.getAllColumns();
    const rowCount = this.api.getAllRows().filter((r) => r.type === 'data').length;

    const findings: Diagnostic[] = [
      ...this.checkColumns(columns),
      ...this.checkPerformance(columns, rowCount),
      ...this.checkAccessibility(columns),
      ...this.checkDeprecations(),
    ];

    const rank: Record<DiagnosticSeverity, number> = {
      [DiagnosticSeverity.Error]: 0,
      [DiagnosticSeverity.Warning]: 1,
      [DiagnosticSeverity.Info]: 2,
    };
    return findings.sort((a, b) => rank[a.severity] - rank[b.severity]);
  }

  /** Column-definition integrity: duplicate ids, missing fields, conflicting widths. */
  private checkColumns(columns: readonly ColumnDef[]): Diagnostic[] {
    const findings: Diagnostic[] = [];

    const seenIds = new Set<string>();
    const duplicateIds = new Set<string>();
    for (const col of columns) {
      if (seenIds.has(col.colId)) duplicateIds.add(col.colId);
      seenIds.add(col.colId);
    }
    if (duplicateIds.size > 0) {
      findings.push({
        severity: DiagnosticSeverity.Error,
        category: DiagnosticCategory.Configuration,
        message: `Duplicate column ids: ${[...duplicateIds].join(', ')}. Column ids must be unique — the grid keys sort, filter, width, and selection state by them, so duplicates make those operations affect the wrong column.`,
        fix: 'Give each column a distinct colId.',
      });
    }

    const seenFields = new Map<string, string[]>();
    for (const col of columns) {
      const list = seenFields.get(col.field) ?? [];
      list.push(col.colId);
      seenFields.set(col.field, list);
    }
    for (const [field, ids] of seenFields) {
      if (ids.length > 1) {
        findings.push({
          severity: DiagnosticSeverity.Info,
          category: DiagnosticCategory.Configuration,
          message: `Columns ${ids.join(', ')} all read the field "${field}".`,
          fix: 'Intentional for showing one value two ways; otherwise a copy-paste slip.',
        });
      }
    }

    for (const col of columns) {
      if (col.width !== undefined && col.flex !== undefined) {
        findings.push({
          severity: DiagnosticSeverity.Warning,
          category: DiagnosticCategory.Configuration,
          message: `Column "${col.colId}" sets both width and flex; flex wins, so the width is ignored.`,
          fix: 'Drop one — width for a fixed column, flex for one that shares leftover space.',
        });
      }
      if (col.minWidth !== undefined && col.maxWidth !== undefined && col.minWidth > col.maxWidth) {
        findings.push({
          severity: DiagnosticSeverity.Error,
          category: DiagnosticCategory.Configuration,
          message: `Column "${col.colId}" has minWidth (${col.minWidth}) greater than maxWidth (${col.maxWidth}).`,
          fix: 'Swap them, or remove one.',
        });
      }
    }

    return findings;
  }

  /** Settings that cost render or data-pipeline time. */
  private checkPerformance(columns: readonly ColumnDef[], rowCount: number): Diagnostic[] {
    const findings: Diagnostic[] = [];
    const o = this.options;

    if (o.rowHeightMode === 'auto') {
      findings.push({
        severity: DiagnosticSeverity.Warning,
        category: DiagnosticCategory.Performance,
        message: 'rowHeightMode is "auto", so every rendered row is measured on each pass. This is the most common cause of scroll jank.',
        fix: 'Set a fixed rowHeight and leave rowHeightMode unset unless rows genuinely vary in height.',
      });
    }

    if (rowCount > LARGE_DATASET_ROWS && o.rowModel !== 'server') {
      findings.push({
        severity: DiagnosticSeverity.Warning,
        category: DiagnosticCategory.Performance,
        message: `${rowCount.toLocaleString()} rows are loaded client-side, so every sort and filter runs over all of them in the browser.`,
        fix: "Switch to rowModel: 'server' with a serverSideDatasource so the database does that work.",
      });
    }

    if (o.suppressColumnVirtualisation && columns.length > WIDE_GRID_COLUMNS) {
      findings.push({
        severity: DiagnosticSeverity.Warning,
        category: DiagnosticCategory.Performance,
        message: `Column virtualisation is disabled with ${columns.length} columns, so every row renders all of them.`,
        fix: 'Remove suppressColumnVirtualisation.',
      });
    }

    const buffer = o.virtualScroll?.rowBuffer;
    if (buffer !== undefined && buffer > 20) {
      findings.push({
        severity: DiagnosticSeverity.Info,
        category: DiagnosticCategory.Performance,
        message: `virtualScroll.rowBuffer is ${buffer}, so a lot of off-screen rows render each frame.`,
        fix: 'Values between 3 and 10 are usually enough.',
      });
    }

    if (rowCount > LARGE_DATASET_ROWS && o.animateRows !== false) {
      findings.push({
        severity: DiagnosticSeverity.Info,
        category: DiagnosticCategory.Performance,
        message: 'Row animations are on with a large dataset; sorting animates the visible rows on every change.',
        fix: 'Set animateRows: false if sorting feels heavy.',
      });
    }

    return findings;
  }

  /** Gaps that would hurt screen-reader or keyboard users. */
  private checkAccessibility(columns: readonly ColumnDef[]): Diagnostic[] {
    const findings: Diagnostic[] = [];

    const unlabelled = columns.filter((c) => !c.header || c.header.trim() === '');
    if (unlabelled.length > 0) {
      findings.push({
        severity: DiagnosticSeverity.Warning,
        category: DiagnosticCategory.Accessibility,
        message: `${unlabelled.length} column(s) have no header text (${unlabelled.map((c) => c.colId).join(', ')}). Screen readers announce the header with every cell, so those cells are read without context.`,
        fix: 'Give each column a descriptive header.',
      });
    }

    const cryptic = columns.filter((c) => c.header && c.header.trim().length <= 2);
    if (cryptic.length > 0) {
      findings.push({
        severity: DiagnosticSeverity.Info,
        category: DiagnosticCategory.Accessibility,
        message: `Very short headers: ${cryptic.map((c) => `"${c.header}"`).join(', ')}. These are announced literally and may not be meaningful.`,
        fix: 'Prefer a full word, and use a tooltip if space is tight.',
      });
    }

    if (!this.options.locale) {
      findings.push({
        severity: DiagnosticSeverity.Info,
        category: DiagnosticCategory.Accessibility,
        message: 'No locale is set, so dates and numbers format with the browser default.',
        fix: "Set locale (e.g. 'en-US') for predictable, correctly-announced formatting.",
      });
    }

    return findings;
  }

  /** Deprecated or contradictory options. */
  private checkDeprecations(): Diagnostic[] {
    const findings: Diagnostic[] = [];
    const o = this.options as GridOptions & { theme?: unknown };

    if (o.theme !== undefined) {
      findings.push({
        severity: DiagnosticSeverity.Warning,
        category: DiagnosticCategory.Configuration,
        message: 'options.theme is deprecated.',
        fix: "Use mode ('light' | 'dark') plus variant ('photon' | 'ion' | 'neon' | 'quantum').",
      });
    }

    if (o.rowModel === 'server' && !o.serverSideDatasource) {
      findings.push({
        severity: DiagnosticSeverity.Error,
        category: DiagnosticCategory.Configuration,
        message: "rowModel is 'server' but no serverSideDatasource was supplied, so the grid has no way to fetch rows.",
        fix: 'Provide serverSideDatasource, or call api.setServerSideDatasource(ds).',
      });
    }

    if (o.enableStateManagement && !o.stateKey) {
      findings.push({
        severity: DiagnosticSeverity.Warning,
        category: DiagnosticCategory.Configuration,
        message: 'State management is enabled without a stateKey, so multiple grids would share one persisted entry.',
        fix: 'Set a unique stateKey per grid.',
      });
    }

    return findings;
  }
}
