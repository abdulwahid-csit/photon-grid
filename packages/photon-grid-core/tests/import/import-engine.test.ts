import { describe, it, expect, vi } from 'vitest';
import { ImportEngine } from '../../src/engines/import/import-engine';
import { EventBus } from '../../src/event-bus/event-bus';
import { GridEventType } from '../../src/types/event.types';
import {
  ImportMode,
  ImportSourceType,
  type GridImportSink,
} from '../../src/types/import.types';
import type { ColumnDef, ColumnDefInput } from '../../src/types/column.types';

/** In-memory grid sink capturing what the engine writes. */
class FakeSink implements GridImportSink {
  columns: ColumnDefInput[] = [];
  rows: Record<string, unknown>[] = [];

  seed(columns: ColumnDefInput[], rows: Record<string, unknown>[]): void {
    this.columns = columns;
    this.rows = rows;
  }
  getColumns(): ColumnDef[] {
    return this.columns.map(
      (c) =>
        ({
          colId: c.colId ?? c.field,
          field: c.field,
          header: c.header ?? c.field,
          type: c.type ?? 'string',
        }) as ColumnDef,
    );
  }
  getRowData(): Record<string, unknown>[] {
    return this.rows;
  }
  setColumns(defs: ColumnDefInput[]): void {
    this.columns = defs;
  }
  setData(rows: Record<string, unknown>[]): void {
    this.rows = rows;
  }
  appendData(rows: Record<string, unknown>[]): void {
    this.rows = [...this.rows, ...rows];
  }
}

const CSV = 'Name,Qty,Price\nWidget,3,1200\nGadget,5,800';

describe('ImportEngine — replace + define columns (default)', () => {
  it('replaces columns and data from the file', async () => {
    const engine = new ImportEngine(new EventBus());
    const sink = new FakeSink();
    const result = await engine.importText(CSV, ImportSourceType.Csv, sink);

    expect(result.validation.valid).toBe(true);
    expect(result.rowCount).toBe(2);
    expect(sink.columns.map((c) => c.field)).toEqual(['name', 'qty', 'price']);
    expect(sink.rows[0]).toEqual({ name: 'Widget', qty: 3, price: 1200 });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('ImportEngine — append onto existing columns', () => {
  it('maps imported headers onto existing fields and appends', async () => {
    const engine = new ImportEngine(new EventBus());
    const sink = new FakeSink();
    sink.seed(
      [
        { field: 'name', header: 'Name', type: 'string' },
        { field: 'qty', header: 'Qty', type: 'number' },
        { field: 'price', header: 'Price', type: 'currency' },
      ],
      [{ name: 'Existing', qty: 1, price: 10 }],
    );

    await engine.importText(CSV, ImportSourceType.Csv, sink, {
      mode: ImportMode.Append,
      defineColumns: false,
    });

    expect(sink.rows).toHaveLength(3);
    expect(sink.rows[0]).toEqual({ name: 'Existing', qty: 1, price: 10 });
    expect(sink.rows[1]).toEqual({ name: 'Widget', qty: 3, price: 1200 });
  });
});

describe('ImportEngine — insert at index', () => {
  it('splices imported rows at insertIndex', async () => {
    const engine = new ImportEngine(new EventBus());
    const sink = new FakeSink();
    sink.seed(
      [
        { field: 'name', header: 'Name', type: 'string' },
        { field: 'qty', header: 'Qty', type: 'number' },
        { field: 'price', header: 'Price', type: 'currency' },
      ],
      [{ name: 'A' }, { name: 'B' }],
    );

    await engine.importText(CSV, ImportSourceType.Csv, sink, {
      mode: ImportMode.InsertAtSelection,
      defineColumns: false,
      insertIndex: 1,
    });

    expect(sink.rows.map((r) => r.name)).toEqual(['A', 'Widget', 'Gadget', 'B']);
  });
});

describe('ImportEngine — clipboard', () => {
  it('imports TSV from the clipboard reader', async () => {
    const reader = {
      pasteFromClipboard: async () => [
        ['Name', 'Qty'],
        ['X', '9'],
      ],
    };
    const engine = new ImportEngine(new EventBus(), reader);
    const sink = new FakeSink();
    await engine.importFromClipboard(sink);

    expect(sink.columns.map((c) => c.field)).toEqual(['name', 'qty']);
    expect(sink.rows[0]).toEqual({ name: 'X', qty: 9 });
  });
});

describe('ImportEngine — validation failure', () => {
  it('does not touch the grid and emits IMPORT_ERROR on empty input', async () => {
    const bus = new EventBus();
    const errors: unknown[] = [];
    bus.on(GridEventType.IMPORT_ERROR, (e) => errors.push(e));

    const engine = new ImportEngine(bus);
    const sink = new FakeSink();
    const result = await engine.importText('', ImportSourceType.Csv, sink);

    expect(result.validation.valid).toBe(false);
    expect(sink.columns).toHaveLength(0);
    expect(sink.rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });
});

describe('ImportEngine — lifecycle events', () => {
  it('emits START, PROGRESS and COMPLETE', async () => {
    const bus = new EventBus();
    const start = vi.fn();
    const progress = vi.fn();
    const complete = vi.fn();
    bus.on(GridEventType.IMPORT_START, start);
    bus.on(GridEventType.IMPORT_PROGRESS, progress);
    bus.on(GridEventType.IMPORT_COMPLETE, complete);

    await new ImportEngine(bus).importText(CSV, ImportSourceType.Csv, new FakeSink());

    expect(start).toHaveBeenCalledTimes(1);
    expect(progress).toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(1);
  });
});

describe('ImportEngine — Excel availability', () => {
  it('reports Excel unavailable until a parser is registered', async () => {
    const engine = new ImportEngine(new EventBus());
    expect(engine.isExcelAvailable).toBe(false);

    engine.registerWorkbookParser({ parse: () => ({ sheets: [] }) });
    expect(engine.isExcelAvailable).toBe(true);
  });
});

describe('ImportEngine — large dataset smoke', () => {
  it('imports 100k rows within a reasonable budget', async () => {
    const rows = new Array(100_000);
    for (let i = 0; i < rows.length; i++) rows[i] = `Item${i},${i},${i * 2}`;
    const csv = 'Name,Qty,Price\n' + rows.join('\n');

    const engine = new ImportEngine(new EventBus());
    const sink = new FakeSink();
    const t0 = performance.now();
    const result = await engine.importText(csv, ImportSourceType.Csv, sink);
    const elapsed = performance.now() - t0;

    expect(result.rowCount).toBe(100_000);
    expect(sink.rows).toHaveLength(100_000);
    // Generous ceiling; parsing + mapping 100k×3 should be well under this.
    expect(elapsed).toBeLessThan(5000);
  });
});
