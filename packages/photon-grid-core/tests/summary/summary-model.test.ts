import { describe, it, expect } from 'vitest';
import {
  DERIVED_SUMMARY_ROW_ID,
  SummaryAggregation,
  SummaryModel,
  SummaryPosition,
  SummaryScope,
  type SummaryRowDef,
} from '../../src/summary';
import type { ColumnDef } from '../../src/types/column.types';

function col(colId: string, extra: Partial<ColumnDef> = {}): ColumnDef {
  return { colId, field: colId, header: colId, type: 'number', ...extra } as ColumnDef;
}

describe('SummaryModel — resolution defaults', () => {
  it('falls back row → config → grid rowHeight → constant for height', () => {
    const explicit = new SummaryModel({ rows: [{ id: 'a', height: 11 }] }, 60);
    expect(explicit.getRow('a')!.height).toBe(11);

    const fromConfig = new SummaryModel({ height: 22, rows: [{ id: 'a' }] }, 60);
    expect(fromConfig.getRow('a')!.height).toBe(22);

    const fromGrid = new SummaryModel({ rows: [{ id: 'a' }] }, 60);
    expect(fromGrid.getRow('a')!.height).toBe(60);

    const fromConstant = new SummaryModel({ rows: [{ id: 'a' }] }, undefined);
    expect(fromConstant.getRow('a')!.height).toBe(40);
  });

  it('defaults position to bottom, sticky to true, scope to filtered', () => {
    const model = new SummaryModel({ rows: [{ id: 'a' }] }, 40);
    const row = model.getRow('a')!;
    expect(row.position).toBe(SummaryPosition.Bottom);
    expect(row.sticky).toBe(true);
    expect(row.scope).toBe(SummaryScope.Filtered);
  });

  it('lets a row override every grid-wide default', () => {
    const model = new SummaryModel(
      {
        position: SummaryPosition.Bottom,
        sticky: true,
        scope: SummaryScope.Filtered,
        rows: [{ id: 'a', position: SummaryPosition.Top, sticky: false, scope: SummaryScope.Selected }],
      },
      40,
    );
    const row = model.getRow('a')!;
    expect(row.position).toBe(SummaryPosition.Top);
    expect(row.sticky).toBe(false);
    expect(row.scope).toBe(SummaryScope.Selected);
  });
});

describe('SummaryModel — identity', () => {
  it('generates ids for rows that omit one', () => {
    const model = new SummaryModel({ rows: [{}, {}] }, 40);
    const ids = model.getRows().map((r) => r.id);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });

  it('replaces a duplicate id rather than accepting an ambiguous one', () => {
    // Two rows sharing an id would make update/remove ambiguous.
    const model = new SummaryModel({ rows: [{ id: 'dup' }, { id: 'dup' }] }, 40);
    const ids = model.getRows().map((r) => r.id);
    expect(ids[0]).toBe('dup');
    expect(ids[1]).not.toBe('dup');
  });
});

describe('SummaryModel — band assignment', () => {
  const model = new SummaryModel(
    {
      rows: [
        { id: 'top', position: SummaryPosition.Top },
        { id: 'bottom', position: SummaryPosition.Bottom },
        { id: 'both', position: SummaryPosition.Both },
        { id: 'inline', position: SummaryPosition.Bottom, sticky: false },
      ],
    },
    40,
  );

  it('places a "both" row in the top and the bottom band', () => {
    expect(model.getRowsForBand(SummaryPosition.Top, true).map((r) => r.id)).toEqual(['top', 'both']);
    expect(model.getRowsForBand(SummaryPosition.Bottom, true).map((r) => r.id)).toEqual(['bottom', 'both']);
  });

  it('separates sticky from in-content rows on the same edge', () => {
    expect(model.getRowsForBand(SummaryPosition.Bottom, false).map((r) => r.id)).toEqual(['inline']);
    expect(model.getRowsForBand(SummaryPosition.Top, false)).toEqual([]);
  });
});

describe('SummaryModel — mutation', () => {
  const base: SummaryRowDef[] = [
    { id: 'a', label: 'A', cells: { x: { aggregate: SummaryAggregation.Sum }, y: { colSpan: 2 } } },
    { id: 'b' },
  ];

  it('merges cells one level deep on update, keeping untouched columns', () => {
    const model = new SummaryModel({ rows: base }, 40);
    expect(model.updateRow('a', { cells: { x: { aggregate: SummaryAggregation.Avg } } })).toBe(true);

    const cells = model.getRow('a')!.def.cells!;
    expect(cells.x.aggregate).toBe(SummaryAggregation.Avg);
    expect(cells.y.colSpan).toBe(2); // untouched
  });

  it('keeps other row properties on a partial update', () => {
    const model = new SummaryModel({ rows: base }, 40);
    model.updateRow('a', { height: 99 });
    expect(model.getRow('a')!.height).toBe(99);
    expect(model.getRow('a')!.def.label).toBe('A');
  });

  it('refuses to let a patch rename a row', () => {
    const model = new SummaryModel({ rows: base }, 40);
    model.updateRow('a', { id: 'renamed' } as Partial<SummaryRowDef>);
    expect(model.getRow('a')).not.toBeNull();
    expect(model.getRow('renamed')).toBeNull();
  });

  it('reports false for update/remove of an unknown id', () => {
    const model = new SummaryModel({ rows: base }, 40);
    expect(model.updateRow('nope', { height: 1 })).toBe(false);
    expect(model.removeRow('nope')).toBe(false);
  });

  it('removes a row and reports empty once all are gone', () => {
    const model = new SummaryModel({ rows: base }, 40);
    expect(model.removeRow('a')).toBe(true);
    expect(model.getRows().map((r) => r.id)).toEqual(['b']);
    model.removeRow('b');
    expect(model.isEmpty()).toBe(true);
  });

  it('bumps the structure version on every structural change', () => {
    const model = new SummaryModel({ rows: base }, 40);
    const v0 = model.getStructureVersion();
    model.updateRow('a', { height: 5 });
    const v1 = model.getStructureVersion();
    expect(v1).toBeGreaterThan(v0);
    model.removeRow('a');
    expect(model.getStructureVersion()).toBeGreaterThan(v1);
  });
});

describe('SummaryModel — column-derived rows', () => {
  const columns = [
    col('region', { type: 'string', showSummary: false }),
    col('qty', { showSummary: true }),
    col('price', { showSummary: true, summaryAggregation: 'avg' }),
    col('skipped', { showSummary: true, summaryAggregation: 'none' }),
    col('ignored'),
  ];

  it('derives one total row from columns declaring showSummary', () => {
    const model = new SummaryModel({}, 40);
    expect(model.syncDerivedRows(columns)).toBe(true);

    const row = model.getRow(DERIVED_SUMMARY_ROW_ID)!;
    expect(Object.keys(row.def.cells!)).toEqual(['qty', 'price']);
    expect(row.def.cells!.qty.aggregate).toBe(SummaryAggregation.Sum); // defaults to sum
    expect(row.def.cells!.price.aggregate).toBe('avg');
  });

  it("omits columns whose aggregation is 'none'", () => {
    const model = new SummaryModel({}, 40);
    model.syncDerivedRows(columns);
    expect(model.getRow(DERIVED_SUMMARY_ROW_ID)!.def.cells!.skipped).toBeUndefined();
  });

  it('skips the rebuild when the columns\' summary settings are unchanged', () => {
    const model = new SummaryModel({}, 40);
    expect(model.syncDerivedRows(columns)).toBe(true);
    expect(model.syncDerivedRows(columns)).toBe(false);
    // A change unrelated to summaries must not trigger one either.
    expect(model.syncDerivedRows(columns.map((c) => ({ ...c, width: 500 })))).toBe(false);
  });

  it('drops the derived row entirely when no column opts in', () => {
    const model = new SummaryModel({}, 40);
    model.syncDerivedRows(columns);
    expect(model.isEmpty()).toBe(false);
    model.syncDerivedRows([col('a'), col('b')]);
    expect(model.isEmpty()).toBe(true);
  });

  it('stops deriving permanently once setRows takes ownership', () => {
    const model = new SummaryModel({}, 40);
    model.syncDerivedRows(columns);

    model.setRows([{ id: 'mine' }]);
    expect(model.syncDerivedRows(columns)).toBe(false);
    expect(model.getRows().map((r) => r.id)).toEqual(['mine']);
  });

  it('never derives when explicit rows were configured', () => {
    const model = new SummaryModel({ rows: [{ id: 'mine' }] }, 40);
    expect(model.syncDerivedRows(columns)).toBe(false);
    expect(model.getRows().map((r) => r.id)).toEqual(['mine']);
  });

  it('treats an empty rows array as explicit, not as "derive for me"', () => {
    const model = new SummaryModel({ rows: [] }, 40);
    expect(model.syncDerivedRows(columns)).toBe(false);
    expect(model.isEmpty()).toBe(true);
  });
});

describe('SummaryModel — snapshots', () => {
  it('returns snapshots in row declaration order, skipping rows without one', () => {
    const model = new SummaryModel({ rows: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }, 40);
    const make = (id: string): never =>
      ({
        id,
        position: SummaryPosition.Bottom,
        sticky: true,
        scope: SummaryScope.All,
        rowCount: 0,
        height: 40,
        className: null,
        cells: new Map(),
      }) as never;

    // Deliberately out of order, and missing 'b'.
    model.setSnapshots([make('c'), make('a')]);
    expect(model.getSnapshots().map((s) => s.id)).toEqual(['a', 'c']);
    expect(model.getSnapshot('b')).toBeNull();
  });
});
