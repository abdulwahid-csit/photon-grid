import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
import type { ExportConfig } from '../../types/grid.types';
import type { EventBus } from '../../event-bus/event-bus';
export declare class ExportEngine {
    private eventBus;
    constructor(eventBus: EventBus);
    exportToCsv(rows: RowNode[], columns: ColumnDef[], config?: Partial<ExportConfig>): void;
    exportToXlsx(rows: RowNode[], columns: ColumnDef[], config?: Partial<ExportConfig>): void;
    private getExportColumns;
    private escapeCsvCell;
    private escapeXml;
    private downloadFile;
    private resolveValue;
}
//# sourceMappingURL=export-engine.d.ts.map