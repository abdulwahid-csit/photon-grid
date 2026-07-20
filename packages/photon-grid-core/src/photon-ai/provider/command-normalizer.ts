import type { GridApi } from '../../core/grid-api';
import type { ColumnDef, ColumnDataType } from '../../types/column.types';
import type { FilterOperator } from '../../types/filter.types';
import type { PhotonCommand } from '../photon-ai.types';
import type { PhotonAIAction } from './ai-provider.types';

/**
 * Bridges a model-generated {@link PhotonAIAction} to a fully-formed
 * {@link PhotonCommand} the existing `CommandExecutor` can run unchanged.
 *
 * A language model reliably produces the *shape* of a command (an intent key
 * plus the target column and value) but not the incidental details the
 * deterministic builders add for free — the display `header`, `Date` objects
 * for date filters, a default operator, numeric coercion. Rather than force
 * the model to reproduce all of that (fragile, token-heavy), this normalizer
 * backfills it deterministically from the live grid:
 *
 * - resolves `colId`/`colIds` against real columns (tolerating a header used
 *   in place of an id, since models occasionally do that),
 * - backfills the `header` param used by every intent's result message,
 * - coerces `applyFilter` values to the column's type (ISO string → `Date`,
 *   numeric string → `number`) and defaults a sensible operator.
 *
 * It is intentionally the *only* place provider output is reshaped, mirroring
 * the role `CommandBuilder` plays for the deterministic pipeline.
 */
export class CommandNormalizer {
  constructor(private readonly api: GridApi) {}

  /** Reshapes one action into an executable command. Never throws — worst case, the executor reports an unknown/invalid command. */
  normalize(action: PhotonAIAction): PhotonCommand {
    const params: Record<string, unknown> = { ...action.params };

    this.normalizeColumnTargets(params);

    if (action.type === 'applyFilter') {
      this.normalizeFilterParams(params);
    }

    return { type: action.type, params };
  }

  /** Resolves and canonicalizes `colId`/`colIds`, then backfills the human `header` label. */
  private normalizeColumnTargets(params: Record<string, unknown>): void {
    if (typeof params.colId === 'string') {
      const column = this.resolveColumn(params.colId);
      if (column) {
        params.colId = column.colId;
        if (typeof params.header !== 'string') params.header = column.header;
      }
    }

    if (Array.isArray(params.colIds)) {
      const columns = params.colIds
        .map((id) => (typeof id === 'string' ? this.resolveColumn(id) : undefined))
        .filter((c): c is ColumnDef => !!c);
      if (columns.length > 0) {
        params.colIds = columns.map((c) => c.colId);
        if (typeof params.header !== 'string') {
          params.header = columns.map((c) => c.header).join('", "');
        }
      }
    }
  }

  /** Coerces `applyFilter`'s value(s) to the target column's data type and supplies a default operator. */
  private normalizeFilterParams(params: Record<string, unknown>): void {
    const colId = typeof params.colId === 'string' ? params.colId : undefined;
    const column = colId ? this.resolveColumn(colId) : undefined;
    if (!column) return;

    params.colId = column.colId;

    if (typeof params.operator !== 'string') {
      params.operator = defaultOperatorFor(column.type);
    }

    params.value = coerceValue(params.value, column.type);
    if (params.valueTo !== undefined) {
      params.valueTo = coerceValue(params.valueTo, column.type);
    }
  }

  /** Matches by exact colId first, then case-insensitively by header — models sometimes echo the visible header. */
  private resolveColumn(idOrHeader: string): ColumnDef | undefined {
    const byId = this.api.getColumn(idOrHeader);
    if (byId) return byId;
    const needle = idOrHeader.trim().toLowerCase();
    return this.api.getAllColumns().find((c) => c.header.toLowerCase() === needle);
  }
}

/** Default operator when the model omitted one — mirrors the deterministic filter builder. */
function defaultOperatorFor(type: ColumnDataType): FilterOperator {
  if (type === 'number' || type === 'currency' || type === 'percentage') return 'equals';
  if (type === 'date' || type === 'time') return 'equals';
  if (type === 'boolean') return 'equals';
  if (type === 'dropdown') return 'equals';
  return 'contains';
}

/** Coerces a JSON-safe primitive from the model into the runtime type the grid's filter engine expects. */
function coerceValue(value: unknown, type: ColumnDataType): unknown {
  if (value === null || value === undefined) return value;

  if (type === 'date' || type === 'time') {
    if (value instanceof Date) return value;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? value : date;
  }

  if (type === 'number' || type === 'currency' || type === 'percentage') {
    if (typeof value === 'number') return value;
    const num = Number(String(value).replace(/,/g, '').trim());
    return Number.isNaN(num) ? value : num;
  }

  if (type === 'boolean') {
    if (typeof value === 'boolean') return value;
    const text = String(value).trim().toLowerCase();
    if (['true', 'yes', 'active', 'enabled', 'on', '1'].includes(text)) return true;
    if (['false', 'no', 'inactive', 'disabled', 'off', '0'].includes(text)) return false;
    return value;
  }

  return value;
}
