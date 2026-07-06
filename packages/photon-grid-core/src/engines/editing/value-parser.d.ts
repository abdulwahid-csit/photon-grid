import type { ColumnDef } from '../../types/column.types';
export declare function parseValue(raw: unknown, col: ColumnDef): unknown;
export declare function formatValue(value: unknown, col: ColumnDef, options?: FormatOptions): string;
export declare function validateValue(value: unknown, col: ColumnDef): string | null;
export interface FormatOptions {
    locale?: string;
    dateFormat?: string;
    timeZone?: string;
    currencySymbol?: string;
    currencyFormat?: string;
}
//# sourceMappingURL=value-parser.d.ts.map