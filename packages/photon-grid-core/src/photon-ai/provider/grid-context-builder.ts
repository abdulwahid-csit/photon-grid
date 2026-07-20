import type { GridApi } from '../../core/grid-api';
import type { ColumnDef } from '../../types/column.types';
import type { ColumnFilter } from '../../types/filter.types';
import type { PhotonAICommandRegistry } from '../photon-ai-registry';
import type {
  PhotonAICapability,
  PhotonAIColumnContext,
  PhotonAIFilterState,
  PhotonAIGridState,
  PhotonAISortState,
  PhotonGridContext,
} from './ai-provider.types';

/**
 * Distills the live grid into the compact {@link PhotonGridContext} a language
 * model needs to interpret a command: which columns exist, which actions are
 * possible, and what the grid currently looks like.
 *
 * Every piece is read from the *live* {@link GridApi} and
 * {@link PhotonAICommandRegistry} at build time, so the model always reasons
 * over the grid's current shape — including any custom intents a host app
 * registered at runtime (they appear in {@link buildCapabilities} automatically
 * because it reads the registry, never a hard-coded list). This is what keeps
 * the generative back-end in lock-step with the deterministic one: both are
 * driven by the same registry.
 */
export class GridContextBuilder {
  constructor(
    private readonly api: GridApi,
    private readonly registry: PhotonAICommandRegistry,
  ) {}

  /** Builds a fresh snapshot. Cheap enough to call once per prompt. */
  build(): PhotonGridContext {
    return {
      columns: this.buildColumns(),
      capabilities: this.buildCapabilities(),
      state: this.buildState(),
    };
  }

  private buildColumns(): readonly PhotonAIColumnContext[] {
    return this.api.getAllColumns().map((col) => this.toColumnContext(col));
  }

  private toColumnContext(col: ColumnDef): PhotonAIColumnContext {
    const options = this.columnOptions(col);
    return {
      colId: col.colId,
      header: col.header,
      field: col.field,
      type: col.type,
      // These flags default to enabled in the grid, so treat "unset" as `true`.
      sortable: col.sortable !== false,
      filterable: col.filterable !== false,
      groupable: col.groupable !== false,
      pinned: col.pinned ?? null,
      visible: col.visible !== false,
      ...(options ? { options } : {}),
    };
  }

  /** Enumerated values a `dropdown`/`enum` column accepts, so the model filters by a real value. */
  private columnOptions(col: ColumnDef): readonly (string | number)[] | undefined {
    if (col.dropdownOptions?.length) return col.dropdownOptions.map((o) => o.value);
    if (col.enumOptions?.length) return col.enumOptions;
    return undefined;
  }

  /**
   * The catalog of actions the model may emit — one entry per registered
   * intent. Sourced from the registry so it never drifts from what
   * `CommandExecutor` can actually run.
   */
  private buildCapabilities(): readonly PhotonAICapability[] {
    return this.registry
      .getAll()
      .map((intent) => ({ type: intent.key, description: intent.description ?? intent.key }));
  }

  private buildState(): PhotonAIGridState {
    return {
      totalRowCount: this.api.getAllRows().filter((r) => r.type === 'data').length,
      visibleRowCount: this.api.getVisibleRows().filter((r) => r.type === 'data').length,
      sort: this.buildSortState(),
      filters: this.buildFilterState(),
      groupedColumns: [...(this.api.getGridState().groupedColumns ?? [])],
      selectedRowCount: this.api.getSelectedCount(),
    };
  }

  private buildSortState(): readonly PhotonAISortState[] {
    return this.api.getSortConfig().map((s) => ({ colId: s.colId, order: s.order }));
  }

  private buildFilterState(): readonly PhotonAIFilterState[] {
    return Object.values(this.api.getFilterModel()).map((filter) => ({
      colId: filter.colId,
      summary: summarizeFilter(filter),
    }));
  }
}

/** Compresses a column filter into a single human/model-readable phrase. */
function summarizeFilter(filter: ColumnFilter): string {
  if (filter.selectedIds?.length) return `in [${filter.selectedIds.join(', ')}]`;
  const condition = filter.conditions[0];
  if (!condition) return 'active';
  if (condition.operator === 'blank' || condition.operator === 'notBlank') return condition.operator;
  const to = condition.valueTo !== undefined ? `..${String(condition.valueTo)}` : '';
  return `${condition.operator} ${String(condition.value)}${to}`;
}
