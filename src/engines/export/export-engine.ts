import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
import type { ExportConfig } from '../../types/grid.types';
import type { EventBus } from '../../event-bus/event-bus';
import { GridEventType } from '../../types/event.types';
import { formatValue } from '../editing/value-parser';

export class ExportEngine {
  constructor(private eventBus: EventBus) {}

  exportToCsv(
    rows: RowNode[],
    columns: ColumnDef[],
    config: Partial<ExportConfig> = {},
  ): void {
    const fileName = (config.fileName ?? 'export') + '.csv';
    const exportCols = this.getExportColumns(columns, config);
    const dataRows = rows.filter((r) => r.type === 'data');

    this.eventBus.emit(GridEventType.EXPORT_START, { format: 'csv', fileName, rowCount: dataRows.length });

    const headerRow = exportCols.map((c) => this.escapeCsvCell(c.header)).join(',');
    const bodyRows = dataRows.map((row) =>
      exportCols
        .map((col) => {
          const raw = this.resolveValue(row.data, col.field);
          const formatted = config.processCellValue
            ? config.processCellValue({ value: raw, colDef: col })
            : formatValue(raw, col);
          return this.escapeCsvCell(formatted);
        })
        .join(','),
    );

    const csv = [headerRow, ...bodyRows].join('\r\n');
    this.downloadFile(csv, fileName, 'text/csv;charset=utf-8;');
    this.eventBus.emit(GridEventType.EXPORT_COMPLETE, { format: 'csv', fileName, rowCount: dataRows.length });
  }

  exportToXlsx(
    rows: RowNode[],
    columns: ColumnDef[],
    config: Partial<ExportConfig> = {},
  ): void {
    const fileName = (config.fileName ?? 'export') + '.xlsx';
    const exportCols = this.getExportColumns(columns, config);
    const dataRows = rows.filter((r) => r.type === 'data');

    this.eventBus.emit(GridEventType.EXPORT_START, { format: 'xlsx', fileName, rowCount: dataRows.length });

    const xmlRows: string[] = [];
    const headers = exportCols.map((c) => `<Cell><Data ss:Type="String">${this.escapeXml(c.header)}</Data></Cell>`).join('');
    xmlRows.push(`<Row>${headers}</Row>`);

    for (const row of dataRows) {
      const cells = exportCols.map((col) => {
        const raw = this.resolveValue(row.data, col.field);
        const formatted = config.processCellValue
          ? config.processCellValue({ value: raw, colDef: col })
          : formatValue(raw, col);
        const type = col.type === 'number' || col.type === 'currency' ? 'Number' : 'String';
        return `<Cell><Data ss:Type="${type}">${this.escapeXml(formatted)}</Data></Cell>`;
      });
      xmlRows.push(`<Row>${cells.join('')}</Row>`);
    }

    const xmlContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Sheet1">
    <Table>${xmlRows.join('')}</Table>
  </Worksheet>
</Workbook>`;

    this.downloadFile(xmlContent, fileName, 'application/vnd.ms-excel');
    this.eventBus.emit(GridEventType.EXPORT_COMPLETE, { format: 'xlsx', fileName, rowCount: dataRows.length });
  }

  private getExportColumns(columns: ColumnDef[], config: Partial<ExportConfig>): ColumnDef[] {
    return columns.filter((col) => {
      if (!config.includeHiddenColumns && col.visible === false) return false;
      return true;
    });
  }

  private escapeCsvCell(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private downloadFile(content: string, fileName: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private resolveValue(data: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = data;
    for (const part of parts) {
      if (current == null) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
}
