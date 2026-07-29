import type { GridApi } from '../../core/grid-api';
import type { ColumnDef } from '../../types/column.types';
import type { ColumnFilter } from '../../types/filter.types';
import type { PhotonAICommandRegistry } from '../photon-ai-registry';
import {
  PhotonAIDomain,
  type PhotonAICapability,
  type PhotonAIColumnContext,
  type PhotonAIContextScope,
  type PhotonAIFilterState,
  type PhotonAIGridState,
  type PhotonAISortState,
  type PhotonGridContext,
} from './ai-provider.types';
import { domainsForIntentKey } from './context-router';

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
 *
 * ### Scoping
 * When a {@link PhotonAIContextScope} is supplied (produced by
 * `ContextRouter`), the snapshot is narrowed to it: only in-scope capabilities,
 * only the column fields those domains actually read, and only the state slices
 * they need. A "sort by price" request therefore carries no filter operators,
 * no pin state, and no per-column `filterable`/`groupable` flags — which is
 * where the token saving comes from, since column fields multiply by column
 * count. Omitting the scope reproduces the original full snapshot exactly.
 */
export class GridContextBuilder {
  constructor(
    private readonly api: GridApi,
    private readonly registry: PhotonAICommandRegistry,
  ) {}

  /**
   * Builds a fresh snapshot. Cheap enough to call once per prompt.
   *
   * @param scope - Optional routing result. Omit to include everything.
   */
  build(scope?: PhotonAIContextScope): PhotonGridContext {
    return {
      columns: this.buildColumns(scope),
      capabilities: this.buildCapabilities(scope),
      state: this.buildState(scope),
    };
  }

  private buildColumns(scope?: PhotonAIContextScope): readonly PhotonAIColumnContext[] {
    const all = this.api.getAllColumns();
    // A request that named specific columns only needs those. Everything else
    // in the grid is noise the model must read past to find the target.
    const selected = scope?.columnIds.length
      ? all.filter((c) => scope.columnIds.includes(c.colId))
      : all;
    // Defensive: if the filter emptied the list (a colId that no longer exists),
    // fall back to every column rather than sending the model nothing to act on.
    const columns = selected.length > 0 ? selected : all;
    return columns.map((col) => this.toColumnContext(col, scope));
  }

  /**
   * Projects one column down to the fields the in-scope domains actually read.
   *
   * `colId`, `header`, and `type` are always sent: the model needs an id to echo
   * back, a human name to match the user's wording against, and a type to reason
   * about values. Everything else is per-domain — and since these fields repeat
   * for every column, dropping them is the single biggest lever on payload size
   * for a wide grid.
   */
  private toColumnContext(col: ColumnDef, scope?: PhotonAIContextScope): PhotonAIColumnContext {
    const has = (d: PhotonAIDomain): boolean => !scope || scope.domains.has(d);

    const context: {
      -readonly [K in keyof PhotonAIColumnContext]: PhotonAIColumnContext[K];
    } = {
      colId: col.colId,
      header: col.header,
      type: col.type,
    };

    // `field` only earns its place when it differs from `colId`; when they match
    // it is a duplicated string on every single column.
    if (col.field && col.field !== col.colId) context.field = col.field;

    // These flags default to enabled in the grid, so treat "unset" as `true`.
    if (has(PhotonAIDomain.Sort)) context.sortable = col.sortable !== false;
    if (has(PhotonAIDomain.Filter)) context.filterable = col.filterable !== false;
    if (has(PhotonAIDomain.Grouping)) context.groupable = col.groupable !== false;
    if (has(PhotonAIDomain.Pinning)) context.pinned = col.pinned ?? null;
    if (has(PhotonAIDomain.Visibility)) context.visible = col.visible !== false;

    // Enumerated values matter only where a value is compared or matched.
    if (has(PhotonAIDomain.Filter) || has(PhotonAIDomain.Selection)) {
      const options = this.columnOptions(col);
      if (options) context.options = options;
    }

    return context;
  }

  /** Enumerated values a `dropdown`/`enum` column accepts, so the model filters by a real value. */
  private columnOptions(col: ColumnDef): readonly (string | number)[] | undefined {
    if (col.dropdownOptions?.length) return col.dropdownOptions.map((o) => o.value);
    if (col.enumOptions?.length) return col.enumOptions;
    return undefined;
  }

  /**
   * The catalog of actions the model may emit — one entry per registered
   * intent whose domain is in scope. Sourced from the registry so it never
   * drifts from what `CommandExecutor` can actually run.
   *
   * An intent the router cannot attribute to any domain is always included:
   * that is the signature of a custom intent registered by a host app, and
   * silently withholding it would make third-party commands unreachable
   * through the generative path.
   */
  private buildCapabilities(scope?: PhotonAIContextScope): readonly PhotonAICapability[] {
    return this.registry
      .getAll()
      .filter((intent) => {
        if (!scope) return true;
        const domains = domainsForIntentKey(intent.key);
        if (domains.length === 0) return true;
        return domains.some((d) => scope.domains.has(d));
      })
      .map((intent) => ({ type: intent.key, description: intent.description ?? intent.key }));
  }

  /**
   * Live grid state, narrowed to the slices the in-scope domains need.
   *
   * Row counts are unconditional — they are two numbers, and almost any reply
   * ("sorted 1,200 rows") reads better with them. The rest is omitted rather
   * than emptied, so the model is never told "nothing is filtered" by an empty
   * array when the truth is "filters were not part of this question".
   */
  private buildState(scope?: PhotonAIContextScope): PhotonAIGridState {
    const has = (d: PhotonAIDomain): boolean => !scope || scope.domains.has(d);

    const state: { -readonly [K in keyof PhotonAIGridState]: PhotonAIGridState[K] } = {
      totalRowCount: this.api.getAllRows().filter((r) => r.type === 'data').length,
      visibleRowCount: this.api.getVisibleRows().filter((r) => r.type === 'data').length,
    };

    if (has(PhotonAIDomain.Sort)) state.sort = this.buildSortState();
    if (has(PhotonAIDomain.Filter)) state.filters = this.buildFilterState();
    if (has(PhotonAIDomain.Grouping)) {
      state.groupedColumns = [...(this.api.getGridState().groupedColumns ?? [])];
    }
    if (has(PhotonAIDomain.Selection)) state.selectedRowCount = this.api.getSelectedCount();

    return state;
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
