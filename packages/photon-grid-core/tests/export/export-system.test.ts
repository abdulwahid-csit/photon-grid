import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/event-bus/event-bus';
import { ExportDataPreparer } from '../../src/export/export-data-preparer';
import { ExportErrorCode } from '../../src/export/export.types';
import { ExportService } from '../../src/export/export-service';
import { ExporterRegistry } from '../../src/export/exporter-registry';
import { serializeCsv } from '../../src/export/csv-exporter';
import { serializeJson } from '../../src/export/json-exporter';
import type { ColumnDef } from '../../src/types/column.types';
import type { RowNode } from '../../src/types/row.types';

const columns = [
  { colId: 'name', field: 'name', header: 'Name', type: 'string' },
  { colId: 'age', field: 'age', header: 'Age', type: 'number' },
  { colId: 'active', field: 'active', header: 'Active', type: 'boolean', hidden: true },
] as ColumnDef[];

const rows = [
  { type: 'data', data: { name: 'Ada, Lovelace', age: 36, active: true } },
  { type: 'data', data: { name: 'Grace', age: null, active: false } },
] as RowNode[];

function source() {
  return {
    getAllColumns: () => columns,
    getVisibleColumns: () => columns.filter((column) => !column.hidden),
    getVisibleRows: () => rows,
    getFilteredRows: () => rows.slice(1),
    getSelectedRows: () => rows.slice(0, 1),
    getFormatOptions: () => ({}),
    getApi: () => undefined,
  };
}

describe('export preparation and serializers', () => {
  it('keeps column order, visibility, primitive values and nulls consistent', () => {
    const data = new ExportDataPreparer(source()).prepare({ columns: ['active', 'name'] });

    expect(data.headers).toEqual(['Active', 'Name']);
    expect(data.rows[0].cells.map((cell) => cell.value)).toEqual([true, 'Ada, Lovelace']);
    expect(data.rows[1].cells[0].value).toBe(false);
    expect(serializeCsv(data, { format: 'csv', fileName: 'people.csv' })).toBe(
      'Active,Name\r\nYes,"Ada, Lovelace"\r\nNo,Grace',
    );
    expect(JSON.parse(serializeJson(data))).toEqual([
      { active: true, name: 'Ada, Lovelace' },
      { active: false, name: 'Grace' },
    ]);
  });

  it('honours selected and filtered row scopes', () => {
    const preparer = new ExportDataPreparer(source());
    expect(preparer.prepare({ onlySelectedRows: true }).rows).toHaveLength(1);
    expect(preparer.prepare({ onlyFilteredRows: true }).rows).toHaveLength(1);
    expect(preparer.prepare({ includeHiddenColumns: true }).columns).toHaveLength(3);
  });
});

describe('exporter registry and service', () => {
  it('looks up exporters case-insensitively and supports removal', () => {
    const registry = new ExporterRegistry();
    const exporter = { format: 'xml', export: () => undefined };
    registry.register(' XML ', exporter);
    expect(registry.get('xml')).toBe(exporter);
    expect(registry.has('XML')).toBe(true);
    expect(registry.unregister('xml')).toBe(true);
    expect(registry.has('xml')).toBe(false);
  });

  it('passes a resolved custom filename to registered exporters', async () => {
    const exporter = { format: 'xml', extension: 'xml', export: vi.fn() };
    const service = new ExportService({ source: source(), eventBus: new EventBus() });
    service.registerExporter('xml', exporter);

    await service.export('xml', { fileName: 'people' });
    expect(exporter.export).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ fileName: 'people.xml' }));
  });

  it('reports a helpful missing Excel/PDF configuration error through the grid toast', async () => {
    const toast = { error: vi.fn() };
    const service = new ExportService({
      source: source(),
      eventBus: new EventBus(),
      getToasts: () => toast as never,
    });

    await expect(service.export('excel')).rejects.toMatchObject({
      code: ExportErrorCode.ExporterNotRegistered,
      requiredPackages: ['xlsx'],
    });
    await expect(service.export('pdf')).rejects.toMatchObject({
      code: ExportErrorCode.ExporterNotRegistered,
      requiredPackages: ['jspdf', 'jspdf-autotable'],
    });
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Install 'xlsx'"), expect.any(Object));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("'jspdf-autotable'"), expect.any(Object));
  });
});
