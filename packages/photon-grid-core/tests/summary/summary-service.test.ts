import { describe, it, expect } from 'vitest';
import {
  SummaryAggregation,
  SummaryAggregationEngine,
  SummaryModel,
  SummaryScope,
  SummaryService,
  type SummaryConfig,
  type SummaryDataPort,
} from '../../src/summary';
import type { ColumnDef } from '../../src/types/column.types';
import type { RowNode } from '../../src/types/row.types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function col(colId: string, extra: Partial<ColumnDef> = {}): ColumnDef {
  return { colId, field: colId, header: colId, type: 'number', ...extra } as ColumnDef;
}

function row(data: Record<string, unknown>, type: RowNode['type'] = 'data'): RowNode {
  return { nodeId: String(data.id ?? Math.random()), data, type, rowIndex: 0, top: 0 } as RowNode;
}

const COLUMNS = [col('region', { type: 'string' }), col('qty'), col('price')];

const ALL = [
  row({ id: '1', region: 'North', qty: 10, price: 5 }),
  row({ id: '2', region: 'South', qty: 20, price: 15 }),
  row({ id: '3', region: 'North', qty: 30, price: 25 }),
];

/** Counts port calls so caching can be asserted rather than assumed. */
interface Probe {
  readonly port: SummaryDataPort;
  readonly calls: Record<string, number>;
  getterCalls: number;
}

function makePort(overrides: Partial<SummaryDataPort> = {}, columns = COLUMNS): Probe {
  const calls: Record<string, number> = { all: 0, filtered: 0, visible: 0, selected: 0 };
  const probe: Probe = {
    calls,
    getterCalls: 0,
    port: {
      getAllRows: () => { calls.all++; return ALL; },
      getFilteredRows: () => { calls.filtered++; return ALL.slice(0, 2); },
      getVisibleRows: () => { calls.visible++; return ALL.slice(0, 1); },
      getSelectedRows: () => { calls.selected++; return [ALL[2]]; },
      getColumns: () => columns,
      getApi: () => null,
      getFormatOptions: () => ({ locale: 'en-US' }),
      ...overrides,
    },
  };
  return probe;
}

function build(config: SummaryConfig, probe = makePort()): {
  service: SummaryService;
  model: SummaryModel;
  probe: Probe;
} {
  const engine = new SummaryAggregationEngine();
  engine.registerAll(config.aggregations);
  const model = new SummaryModel(config, 40);
  return { service: new SummaryService(model, engine, probe.port), model, probe };
}

// ─── Scopes ──────────────────────────────────────────────────────────────────

describe('SummaryService — scopes', () => {
  it('aggregates each scope over its own row set', () => {
    const scopes = [
      [SummaryScope.All, 60],
      [SummaryScope.Filtered, 30],
      [SummaryScope.Visible, 10],
      [SummaryScope.Selected, 30],
    ] as const;

    for (const [scope, expected] of scopes) {
      const { service } = build({
        rows: [{ id: 'r', scope, cells: { qty: { aggregate: SummaryAggregation.Sum } } }],
      });
      expect(service.compute()[0].cells.get('qty')!.value).toBe(expected);
    }
  });

  it('defaults to the filtered scope', () => {
    const { service } = build({ rows: [{ id: 'r', cells: { qty: { aggregate: SummaryAggregation.Sum } } }] });
    const snapshot = service.compute()[0];
    expect(snapshot.scope).toBe(SummaryScope.Filtered);
    expect(snapshot.cells.get('qty')!.value).toBe(30);
  });

  it('resolves each distinct scope exactly once per compute, however many rows share it', () => {
    const { service, probe } = build({
      rows: [
        { id: 'a', scope: SummaryScope.All, cells: { qty: { aggregate: SummaryAggregation.Sum } } },
        { id: 'b', scope: SummaryScope.All, cells: { price: { aggregate: SummaryAggregation.Sum } } },
        { id: 'c', scope: SummaryScope.All, cells: { qty: { aggregate: SummaryAggregation.Avg } } },
      ],
    });
    service.compute();
    expect(probe.calls.all).toBe(1);
  });

  it('never touches a scope no row asks for', () => {
    const { service, probe } = build({
      rows: [{ id: 'a', scope: SummaryScope.All, cells: { qty: { aggregate: SummaryAggregation.Sum } } }],
    });
    service.compute();
    expect(probe.calls.selected).toBe(0);
    expect(probe.calls.visible).toBe(0);
    expect(probe.calls.filtered).toBe(0);
  });

  it('excludes group and detail rows from every scope', () => {
    const mixed = [
      row({ id: 'g', qty: 999 }, 'group'),
      row({ id: '1', qty: 10 }),
      row({ id: 'd', qty: 999 }, 'detail'),
      row({ id: '2', qty: 20 }),
    ];
    const probe = makePort({ getAllRows: () => mixed });
    const { service } = build(
      { rows: [{ id: 'r', scope: SummaryScope.All, cells: { qty: { aggregate: SummaryAggregation.Sum } } }] },
      probe,
    );
    const snapshot = service.compute()[0];
    expect(snapshot.cells.get('qty')!.value).toBe(30);
    expect(snapshot.rowCount).toBe(2);
  });

  it('yields empty aggregates for an empty selection rather than throwing', () => {
    const probe = makePort({ getSelectedRows: () => [] });
    const { service } = build(
      {
        rows: [{
          id: 'r',
          scope: SummaryScope.Selected,
          cells: { qty: { aggregate: SummaryAggregation.Sum }, price: { aggregate: SummaryAggregation.Avg } },
        }],
      },
      probe,
    );
    const snapshot = service.compute()[0];
    expect(snapshot.rowCount).toBe(0);
    expect(snapshot.cells.get('qty')!.value).toBe(0);
    expect(snapshot.cells.get('price')!.value).toBeNull();
  });
});

// ─── Value extraction ────────────────────────────────────────────────────────

describe('SummaryService — value extraction', () => {
  it('reads through a column valueGetter, so derived columns total correctly', () => {
    const columns = [
      col('qty'),
      col('double', { valueGetter: ({ data }) => Number(data.qty) * 2 }),
    ];
    const probe = makePort({}, columns);
    const { service } = build(
      { rows: [{ id: 'r', scope: SummaryScope.All, cells: { double: { aggregate: SummaryAggregation.Sum } } }] },
      probe,
    );
    expect(service.compute()[0].cells.get('double')!.value).toBe(120);
  });

  it('extracts a column\'s values once and shares them across summary rows', () => {
    let getterCalls = 0;
    const columns = [col('qty', {
      valueGetter: ({ data }) => { getterCalls++; return data.qty; },
    })];
    const probe = makePort({}, columns);
    const { service } = build(
      {
        rows: [
          { id: 'a', scope: SummaryScope.All, cells: { qty: { aggregate: SummaryAggregation.Sum } } },
          { id: 'b', scope: SummaryScope.All, cells: { qty: { aggregate: SummaryAggregation.Avg } } },
          { id: 'c', scope: SummaryScope.All, cells: { qty: { aggregate: SummaryAggregation.Max } } },
        ],
      },
      probe,
    );
    service.compute();
    // Three rows, three rows of data → one scan (3 calls), not three (9).
    expect(getterCalls).toBe(3);
  });

  it('does not scan rows for a cell with a static value', () => {
    let getterCalls = 0;
    const columns = [col('qty', {
      valueGetter: ({ data }) => { getterCalls++; return data.qty; },
    })];
    const probe = makePort({}, columns);
    const { service } = build(
      { rows: [{ id: 'r', scope: SummaryScope.All, cells: { qty: { value: 'Total' } } }] },
      probe,
    );
    service.compute();
    expect(getterCalls).toBe(0);
  });

  it('re-extracts per scope, since the same column over different rows differs', () => {
    let getterCalls = 0;
    const columns = [col('qty', {
      valueGetter: ({ data }) => { getterCalls++; return data.qty; },
    })];
    const probe = makePort({}, columns);
    const { service } = build(
      {
        rows: [
          { id: 'a', scope: SummaryScope.All, cells: { qty: { aggregate: SummaryAggregation.Sum } } },
          { id: 'b', scope: SummaryScope.Visible, cells: { qty: { aggregate: SummaryAggregation.Sum } } },
        ],
      },
      probe,
    );
    service.compute();
    expect(getterCalls).toBe(3 + 1); // all (3 rows) + visible (1 row)
  });
});

// ─── Cell resolution ─────────────────────────────────────────────────────────

describe('SummaryService — cell resolution', () => {
  it('prefers an explicit value over an aggregation', () => {
    const { service } = build({
      rows: [{ id: 'r', cells: { qty: { value: 'Total', aggregate: SummaryAggregation.Sum } } }],
    });
    expect(service.compute()[0].cells.get('qty')!.value).toBe('Total');
  });

  it('accepts a value function receiving the row context', () => {
    const { service } = build({
      rows: [{
        id: 'r',
        scope: SummaryScope.All,
        cells: { region: { value: ({ rows }) => `${rows.length} rows` } },
      }],
    });
    expect(service.compute()[0].cells.get('region')!.value).toBe('3 rows');
  });

  it('falls back to defaultAggregate for columns without a cell', () => {
    const { service } = build({
      rows: [{ id: 'r', scope: SummaryScope.All, defaultAggregate: SummaryAggregation.Sum }],
    });
    const cells = service.compute()[0].cells;
    expect(cells.get('qty')!.value).toBe(60);
    expect(cells.get('price')!.value).toBe(45);
  });

  it('emits no cell at all for columns with nothing to compute', () => {
    const { service } = build({
      rows: [{ id: 'r', cells: { qty: { aggregate: SummaryAggregation.Sum } } }],
    });
    const cells = service.compute()[0].cells;
    expect(cells.has('qty')).toBe(true);
    expect(cells.has('price')).toBe(false);
  });

  it('places the convenience label in the first column without its own cell', () => {
    const { service } = build({
      rows: [{ id: 'r', label: 'Total', cells: { qty: { aggregate: SummaryAggregation.Sum } } }],
    });
    // `region` comes first and has no explicit cell.
    expect(service.compute()[0].cells.get('region')!.value).toBe('Total');
  });

  it('never overwrites an explicit cell with the label', () => {
    const { service } = build({
      rows: [{
        id: 'r',
        label: 'Total',
        cells: { region: { value: 'Mine' }, qty: { aggregate: SummaryAggregation.Sum } },
      }],
    });
    const cells = service.compute()[0].cells;
    expect(cells.get('region')!.value).toBe('Mine');
    expect(cells.get('price')!.value).toBe('Total'); // next free column
  });

  it('computes a cell for an id that is not a column (e.g. a gutter)', () => {
    const { service } = build({
      rows: [{ id: 'r', cells: { 'not-a-column': { value: 'X' } } }],
    });
    expect(service.compute()[0].cells.get('not-a-column')!.value).toBe('X');
  });
});

// ─── Formatting, tooltips, spans ─────────────────────────────────────────────

describe('SummaryService — presentation', () => {
  it('formats through the column\'s own valueFormatter', () => {
    const columns = [col('qty', { valueFormatter: ({ value }) => `[${value}]` })];
    const probe = makePort({}, columns);
    const { service } = build(
      { rows: [{ id: 'r', scope: SummaryScope.All, cells: { qty: { aggregate: SummaryAggregation.Sum } } }] },
      probe,
    );
    expect(service.compute()[0].cells.get('qty')!.formattedValue).toBe('[60]');
  });

  it('hands a custom formatter the default formatting so it can decorate it', () => {
    const columns = [col('qty', { valueFormatter: ({ value }) => `[${value}]` })];
    const probe = makePort({}, columns);
    const { service } = build(
      {
        rows: [{
          id: 'r',
          scope: SummaryScope.All,
          cells: {
            qty: {
              aggregate: SummaryAggregation.Sum,
              formatter: ({ defaultFormattedValue, value }) => `Sum ${defaultFormattedValue} (${value})`,
            },
          },
        }],
      },
      probe,
    );
    expect(service.compute()[0].cells.get('qty')!.formattedValue).toBe('Sum [60] (60)');
  });

  it('renders a null value as an empty string, not "null"', () => {
    const probe = makePort({ getSelectedRows: () => [] });
    const { service } = build(
      {
        rows: [{
          id: 'r',
          scope: SummaryScope.Selected,
          cells: { qty: { aggregate: SummaryAggregation.Avg } },
        }],
      },
      probe,
    );
    expect(service.compute()[0].cells.get('qty')!.formattedValue).toBe('');
  });

  it('passes string values through untouched rather than number-formatting them', () => {
    const { service } = build({ rows: [{ id: 'r', cells: { qty: { value: 'N/A' } } }] });
    expect(service.compute()[0].cells.get('qty')!.formattedValue).toBe('N/A');
  });

  it('resolves both static and computed tooltips', () => {
    const { service } = build({
      rows: [{
        id: 'r',
        scope: SummaryScope.All,
        cells: {
          qty: { aggregate: SummaryAggregation.Sum, tooltip: 'Fixed' },
          price: { aggregate: SummaryAggregation.Sum, tooltip: ({ value }) => `Value ${value}` },
        },
      }],
    });
    const cells = service.compute()[0].cells;
    expect(cells.get('qty')!.tooltip).toBe('Fixed');
    expect(cells.get('price')!.tooltip).toBe('Value 45');
    expect(cells.get('qty')!.colSpan).toBe(1);
  });

  it('clamps colSpan to at least 1 and floors fractional values', () => {
    const { service } = build({
      rows: [{
        id: 'r',
        cells: {
          region: { value: 'a', colSpan: 0 },
          qty: { value: 'b', colSpan: -3 },
          price: { value: 'c', colSpan: 2.7 },
        },
      }],
    });
    const cells = service.compute()[0].cells;
    expect(cells.get('region')!.colSpan).toBe(1);
    expect(cells.get('qty')!.colSpan).toBe(1);
    expect(cells.get('price')!.colSpan).toBe(2);
  });

  it('builds renderer params only for cells that declare a renderer', () => {
    const { service } = build({
      rows: [{
        id: 'r',
        scope: SummaryScope.All,
        cells: {
          qty: { aggregate: SummaryAggregation.Sum },
          price: { aggregate: SummaryAggregation.Sum, renderer: () => 'x' },
        },
      }],
    });
    const cells = service.compute()[0].cells;
    expect(cells.get('qty')!.createRendererParams).toBeNull();

    const params = cells.get('price')!.createRendererParams!();
    expect(params.value).toBe(45);
    expect(params.rows).toHaveLength(3);
    expect(params.values).toEqual([5, 15, 25]); // lazily extracted on access
  });
});

// ─── Custom aggregations & lifecycle ─────────────────────────────────────────

describe('SummaryService — custom aggregations and lifecycle', () => {
  it('resolves an aggregation registered by name in the config', () => {
    const { service } = build({
      aggregations: { distinct: ({ values }) => new Set(values).size },
      rows: [{ id: 'r', scope: SummaryScope.All, cells: { region: { aggregate: 'distinct' } } }],
    });
    expect(service.compute()[0].cells.get('region')!.value).toBe(2); // North, South
  });

  it('yields a null value for an unresolvable aggregation name', () => {
    const { service } = build({
      rows: [{ id: 'r', cells: { qty: { aggregate: 'nonexistent' } } }],
    });
    const cell = service.compute()[0].cells.get('qty')!;
    expect(cell.value).toBeNull();
    expect(cell.formattedValue).toBe('');
  });

  it('stores the computed snapshots on the model', () => {
    const { service, model } = build({
      rows: [{ id: 'r', cells: { qty: { aggregate: SummaryAggregation.Sum } } }],
    });
    service.compute();
    expect(model.getSnapshot('r')!.cells.get('qty')!.value).toBe(30);
    expect(model.getSnapshots()).toHaveLength(1);
  });

  it('returns nothing, and stores nothing, when no rows are defined', () => {
    const { service, model } = build({ rows: [] });
    expect(service.compute()).toEqual([]);
    expect(model.getSnapshots()).toEqual([]);
  });

  it('computes the row derived from ColumnDef.showSummary', () => {
    const columns = [
      col('region', { type: 'string' }),
      col('qty', { showSummary: true }),
      col('price', { showSummary: true, summaryAggregation: 'avg' }),
    ];
    const probe = makePort({}, columns);
    const { service } = build({ scope: SummaryScope.All }, probe);

    const snapshot = service.compute()[0];
    expect(snapshot.cells.get('qty')!.value).toBe(60);
    expect(snapshot.cells.get('price')!.value).toBe(15);
  });

  it('prefixes a derived cell with ColumnDef.summaryLabel', () => {
    const columns = [col('qty', { showSummary: true, summaryLabel: 'Sum' })];
    const probe = makePort({}, columns);
    const { service } = build({ scope: SummaryScope.All }, probe);
    expect(service.compute()[0].cells.get('qty')!.formattedValue).toBe('Sum: 60');
  });

  it('reflects a definition change on the next compute', () => {
    const { service, model } = build({
      rows: [{ id: 'r', scope: SummaryScope.All, cells: { qty: { aggregate: SummaryAggregation.Sum } } }],
    });
    expect(service.compute()[0].cells.get('qty')!.value).toBe(60);

    model.updateRow('r', { cells: { qty: { aggregate: SummaryAggregation.Max } } });
    expect(service.compute()[0].cells.get('qty')!.value).toBe(30);
  });
});
