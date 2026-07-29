import { describe, it, expect } from 'vitest';
import { ContextRouter, domainsForIntentKey } from '../../src/photon-ai/provider/context-router';
import { GridContextBuilder } from '../../src/photon-ai/provider/grid-context-builder';
import { buildSystemInstruction, serializeGridContext } from '../../src/photon-ai/provider/system-prompt';
import { PhotonAIDomain } from '../../src/photon-ai/provider/ai-provider.types';
import { PhotonAIService } from '../../src/photon-ai/photon-ai-service';
import type { ColumnDef } from '../../src/types/column.types';
import type { GridApi } from '../../src/core/grid-api';

/**
 * Verifies Photon AI's context router: that a prompt is classified into the
 * minimal set of grid domains, that the context and system prompt are narrowed
 * to those domains, and that the narrowing is a real token saving — while an
 * unclassifiable prompt still falls back to the full payload.
 */

const registry = PhotonAIService.createDefaultRegistry();

/** A wide-ish grid, so per-column savings are measurable rather than theoretical. */
const COLUMNS: ColumnDef[] = [
  { colId: 'id', field: 'id', header: 'ID', type: 'number' },
  { colId: 'name', field: 'name', header: 'Name', type: 'string' },
  { colId: 'salary', field: 'salary', header: 'Salary', type: 'currency' },
  { colId: 'department', field: 'department', header: 'Department', type: 'string',
    dropdownOptions: [
      { value: 'eng', label: 'Engineering' },
      { value: 'sales', label: 'Sales' },
      { value: 'hr', label: 'Human Resources' },
    ] },
  { colId: 'hiredAt', field: 'hiredAt', header: 'Hire Date', type: 'date' },
  { colId: 'active', field: 'active', header: 'Active', type: 'boolean' },
];

/** Minimal GridApi stand-in — only the methods GridContextBuilder calls. */
function makeApi(columns: ColumnDef[] = COLUMNS): GridApi {
  return {
    getAllColumns: () => columns,
    getAllRows: () => [{ type: 'data' }, { type: 'data' }],
    getVisibleRows: () => [{ type: 'data' }],
    getSortConfig: () => [{ colId: 'salary', order: 'desc' }],
    getFilterModel: () => ({}),
    getGridState: () => ({ groupedColumns: [] }),
    getSelectedCount: () => 0,
  } as unknown as GridApi;
}

const router = new ContextRouter(registry);
const route = (prompt: string, columns: ColumnDef[] = COLUMNS) => router.route(prompt, columns);

/**
 * Total characters actually sent for one prompt (system instruction + the
 * serialized context block). A proxy for tokens — proportional and, unlike a
 * real tokenizer, dependency-free.
 */
function payloadSize(prompt: string, api: GridApi = makeApi()): number {
  const builder = new GridContextBuilder(api, registry);
  const scope = router.route(prompt, COLUMNS);
  return (
    buildSystemInstruction(undefined, scope).length +
    serializeGridContext(builder.build(scope)).length
  );
}

/** The pre-router baseline: everything, always. */
function fullPayloadSize(api: GridApi = makeApi()): number {
  const builder = new GridContextBuilder(api, registry);
  return buildSystemInstruction().length + serializeGridContext(builder.build()).length;
}

describe('ContextRouter — classification', () => {
  it('routes a sort request to the sort domain only', () => {
    const scope = route('sort by salary descending');
    expect(scope.domains.has(PhotonAIDomain.Sort)).toBe(true);
    expect(scope.domains.has(PhotonAIDomain.Filter)).toBe(false);
    expect(scope.domains.has(PhotonAIDomain.Pinning)).toBe(false);
    expect(scope.fellBack).toBe(false);
  });

  it('routes a filter request to the filter domain', () => {
    const scope = route('filter salary greater than 5000');
    expect(scope.domains.has(PhotonAIDomain.Filter)).toBe(true);
    expect(scope.domains.has(PhotonAIDomain.Pinning)).toBe(false);
  });

  it('routes a pin request to the pinning domain', () => {
    const scope = route('pin the name column to the left');
    expect(scope.domains.has(PhotonAIDomain.Pinning)).toBe(true);
    expect(scope.domains.has(PhotonAIDomain.Filter)).toBe(false);
  });

  it('routes a hide request to the visibility domain', () => {
    const scope = route('hide the id column');
    expect(scope.domains.has(PhotonAIDomain.Visibility)).toBe(true);
    expect(scope.domains.has(PhotonAIDomain.Filter)).toBe(false);
  });

  it('routes a grouping request to the grouping domain', () => {
    const scope = route('group by department');
    expect(scope.domains.has(PhotonAIDomain.Grouping)).toBe(true);
  });

  it('includes every domain mentioned in a compound request', () => {
    const scope = route('hide id and sort by salary descending');
    expect(scope.domains.has(PhotonAIDomain.Visibility)).toBe(true);
    expect(scope.domains.has(PhotonAIDomain.Sort)).toBe(true);
  });

  it('falls back to every domain for an unrecognized prompt', () => {
    const scope = route('what is the meaning of life');
    expect(scope.fellBack).toBe(true);
    // Fallback must be total — the request stays answerable.
    for (const domain of Object.values(PhotonAIDomain)) {
      expect(scope.domains.has(domain)).toBe(true);
    }
  });

  it('narrows to the columns the prompt names', () => {
    expect(route('sort by salary').columnIds).toEqual(['salary']);
  });

  it('matches multi-word headers', () => {
    expect(route('sort by hire date').columnIds).toContain('hiredAt');
  });

  it('reports no column narrowing when none is named', () => {
    expect(route('clear all sorting').columnIds).toEqual([]);
  });

  it('reports no narrowing when every column is named (narrowing conveys nothing)', () => {
    const two: ColumnDef[] = [
      { colId: 'alpha', field: 'alpha', header: 'Alpha', type: 'string' },
      { colId: 'beta', field: 'beta', header: 'Beta', type: 'string' },
    ];
    expect(route('sort alpha and beta', two).columnIds).toEqual([]);
  });
});

describe('domainsForIntentKey', () => {
  it('maps built-in intents onto their domain', () => {
    expect(domainsForIntentKey('sortAscending')).toContain(PhotonAIDomain.Sort);
    expect(domainsForIntentKey('applyFilter')).toContain(PhotonAIDomain.Filter);
    expect(domainsForIntentKey('pinLeft')).toContain(PhotonAIDomain.Pinning);
    expect(domainsForIntentKey('hideColumn')).toContain(PhotonAIDomain.Visibility);
  });

  it('gives selectRowsWhere the filter domain — it takes operators and values', () => {
    expect(domainsForIntentKey('selectRowsWhere')).toContain(PhotonAIDomain.Filter);
  });

  it('returns no domain for an unknown (host-app custom) intent', () => {
    // Callers must read this as "always include", never "exclude".
    expect(domainsForIntentKey('myCompanyExportToSAP')).toEqual([]);
  });
});

describe('GridContextBuilder — scoped output', () => {
  const builder = new GridContextBuilder(makeApi(), registry);

  it('omits filter state and operators for a sort request', () => {
    const ctx = builder.build(route('sort by salary descending'));
    expect(ctx.state.sort).toBeDefined();
    expect(ctx.state.filters).toBeUndefined();
    expect(ctx.state.groupedColumns).toBeUndefined();
    expect(ctx.columns.every((c) => c.filterable === undefined)).toBe(true);
    expect(ctx.columns.every((c) => c.pinned === undefined)).toBe(true);
  });

  it('includes dropdown options for a filter request', () => {
    const ctx = builder.build(route('filter department equals sales'));
    const dept = ctx.columns.find((c) => c.colId === 'department');
    expect(dept?.options).toEqual(['eng', 'sales', 'hr']);
  });

  it('omits dropdown options for a pin request', () => {
    const ctx = builder.build(route('pin department left'));
    expect(ctx.columns.find((c) => c.colId === 'department')?.options).toBeUndefined();
  });

  it('sends only in-scope capabilities', () => {
    const ctx = builder.build(route('sort by salary descending'));
    const types = ctx.capabilities.map((c) => c.type);
    expect(types).toContain('sortAscending');
    expect(types).not.toContain('applyFilter');
    expect(types).not.toContain('pinLeft');
  });

  it('always sends unattributed (custom) capabilities', () => {
    const custom = PhotonAIService.createDefaultRegistry();
    custom.register({
      key: 'myCompanyExportToSAP',
      aliases: [['export', 'sap']],
      description: 'Export to SAP',
      resolveEntities: () => ({}),
      buildCommand: () => ({ type: 'myCompanyExportToSAP', params: {} }),
      execute: () => 'done',
    });
    const scoped = new GridContextBuilder(makeApi(), custom);
    const scope = new ContextRouter(custom).route('sort by salary', COLUMNS);
    const types = scoped.build(scope).capabilities.map((c) => c.type);
    expect(types).toContain('myCompanyExportToSAP');
  });

  it('sends only the named column', () => {
    const ctx = builder.build(route('sort by salary'));
    expect(ctx.columns.map((c) => c.colId)).toEqual(['salary']);
  });

  it('omits field when it duplicates colId', () => {
    const ctx = builder.build(route('sort by salary'));
    expect(ctx.columns[0].field).toBeUndefined();
  });

  it('keeps field when it differs from colId', () => {
    const api = makeApi([{ colId: 'c1', field: 'employee_salary', header: 'Salary', type: 'currency' }]);
    const ctx = new GridContextBuilder(api, registry).build(route('sort by salary'));
    expect(ctx.columns[0].field).toBe('employee_salary');
  });

  it('reproduces the full snapshot when no scope is given', () => {
    const ctx = builder.build();
    expect(ctx.columns.length).toBe(COLUMNS.length);
    expect(ctx.state.sort).toBeDefined();
    expect(ctx.state.filters).toBeDefined();
    expect(ctx.state.groupedColumns).toBeDefined();
    expect(ctx.state.selectedRowCount).toBeDefined();
  });

  it('falls back to all columns when the scope names a column that no longer exists', () => {
    const scope = { domains: new Set([PhotonAIDomain.Sort]), columnIds: ['ghost'], fellBack: false };
    expect(builder.build(scope).columns.length).toBe(COLUMNS.length);
  });
});

describe('buildSystemInstruction — scoped', () => {
  it('drops the filter-operator table for a sort request', () => {
    const prompt = buildSystemInstruction(undefined, route('sort by salary descending'));
    expect(prompt).not.toContain('FILTER OPERATORS');
    expect(prompt).toContain('sortAscending');
  });

  it('keeps the filter-operator table for a filter request', () => {
    const prompt = buildSystemInstruction(undefined, route('filter salary over 5000'));
    expect(prompt).toContain('FILTER OPERATORS');
  });

  it('keeps the operator table for selectRowsWhere, which needs operators', () => {
    const prompt = buildSystemInstruction(undefined, route('select rows where salary over 5000'));
    expect(prompt).toContain('FILTER OPERATORS');
  });

  it('emits every section when unscoped', () => {
    const prompt = buildSystemInstruction();
    expect(prompt).toContain('FILTER OPERATORS');
    expect(prompt).toContain('pinHalf');
    expect(prompt).toContain('selectRowRange');
  });

  it('still appends host-app extra instructions', () => {
    const prompt = buildSystemInstruction('Always be terse.', route('sort by salary'));
    expect(prompt).toContain('Always be terse.');
  });
});

describe('token optimization', () => {
  it('sends materially less for a sort request than the unrouted baseline', () => {
    const full = fullPayloadSize();
    const routed = payloadSize('sort by salary descending');
    expect(routed).toBeLessThan(full);
    // Report the real number so a regression in routing shows up as a diff.
    const saved = 1 - routed / full;
    // eslint-disable-next-line no-console
    console.log(`[context-router] sort request: ${routed} vs ${full} chars (${(saved * 100).toFixed(1)}% saved)`);
    expect(saved).toBeGreaterThan(0.4);
  });

  it('saves on pin, hide and group requests too', () => {
    const full = fullPayloadSize();
    for (const prompt of ['pin name left', 'hide the id column', 'group by department']) {
      expect(payloadSize(prompt)).toBeLessThan(full);
    }
  });

  it('never exceeds the baseline, even for a filter request', () => {
    expect(payloadSize('filter salary greater than 5000')).toBeLessThanOrEqual(fullPayloadSize());
  });

  it('matches the baseline for an unclassifiable prompt', () => {
    // Fallback must cost exactly what it always did — no regression, no saving.
    expect(payloadSize('what is the meaning of life')).toBe(fullPayloadSize());
  });
});
