import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { PhotonGridComponent } from 'photon-grid-angular';
import type { ColumnDef } from 'photon-grid-angular';
import type { GridApi, GridOptions, ValueGetterParams } from 'photon-grid-core';

/**
 * A spreadsheet: 100 lettered columns over as many rows as you ask for.
 *
 * ### The point of the demo
 * A million rows × a hundred columns is a hundred million cells. No grid can
 * hold that, and neither can the browser — so this one does not try. Two ideas
 * carry the whole thing:
 *
 * 1. **The grid renders a window.** Only the rows and columns inside the
 *    viewport exist as DOM, so scroll cost is flat: the thousandth screen costs
 *    what the first one did.
 * 2. **The data is a function, not an array.** A row object holds *one* number —
 *    its index. Every cell value is derived from `(row, column)` by a pure hash
 *    at the moment it is painted, through {@link ColumnDef.valueGetter}. So the
 *    row count decides how many small objects exist, and the column count costs
 *    nothing at all.
 *
 * Together they mean the memory bill is `O(rows)` of one field, not
 * `O(rows × columns)` of values — which is why 1,000,000 × 100 loads in the time
 * it takes to allocate a million integers, rather than not loading at all.
 *
 * ### It is still a real spreadsheet
 * Every cell is editable, and every column opts into the Formula Engine — whose
 * A1 syntax lines up with these headers exactly, because they *are* column
 * letters. Type `=A1+B1` into any cell. An edit is stored on its row and wins
 * over the generated value, so typing costs one field on one object rather than
 * materialising anything.
 */

/** How many lettered columns to build: A … CV. */
const COLUMN_COUNT = 100;

/** Rows generated unless you ask for another count. */
const DEFAULT_ROW_COUNT = 1_000_000;

/**
 * Ceiling on the row count, as a guard rather than a grid limit.
 *
 * The grid does not care — it renders a window either way. What breaks past
 * this is the *browser's* heap: one JS object per row is roughly 50 bytes, so
 * ten million rows is half a gigabyte before a single cell is drawn. Beyond
 * this, a row model that never materialises rows at all is the right tool; see
 * the infinite-scrolling demo, which serves the same million rows from a mock
 * backend and holds only the pages in view.
 */
const MAX_ROW_COUNT = 10_000_000;

/**
 * One row. Deliberately a single field.
 *
 * `r` is the row's absolute index, which is the only thing a cell needs to
 * compute its value. Cells the user has edited are added to this object as
 * ordinary fields keyed by column letter, so an edited sheet costs one property
 * per edit and an untouched one costs nothing.
 */
type SheetRow = {
    r: number;
    [column: string]: unknown;
};

/**
 * The spreadsheet name for a zero-based column index: 0 → A, 25 → Z, 26 → AA.
 *
 * The `- 1` is what makes it base-26 *bijective* rather than ordinary base 26:
 * there is no zero digit, so Z is followed by AA and not by BA.
 */
function columnLetter(index: number): string {
    let n = index;
    let name = '';
    do {
        name = String.fromCharCode(65 + (n % 26)) + name;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return name;
}

/**
 * The generated value of a cell, from its coordinates alone.
 *
 * **Purity is the requirement, not an elegance.** A value getter runs on every
 * paint, so anything random here would give a cell a different number each time
 * it scrolled back into view — and would make sorting and filtering meaningless.
 * Two multiplicative hashes mixed with XOR spread the output across the range
 * without a lookup table or any allocation.
 *
 * `Math.imul` rather than `*` because the constants are 32-bit: plain
 * multiplication would overflow into floating point and lose the low bits that
 * carry the variation.
 */
function generatedValue(row: number, column: number): number {
    const mixed = Math.imul(row + 1, 0x9e3779b1) ^ Math.imul(column + 1, 0x85ebca6b);
    return ((mixed >>> 0) % 1_000_000) / 100;
}

@Component({
    selector: 'app-excel-grid',
    standalone: true,
    imports: [PhotonGridComponent, CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    template: `
        <header class="xl__header">
            <div>
                <h2 class="xl__title">Spreadsheet</h2>
                <p class="xl__subtitle">
                    <strong>{{ columnCount }}</strong> lettered columns (A … {{ lastLetter }}) over
                    <strong>{{ rowCount | number }}</strong> rows. Rows hold their index and nothing
                    else — every value is derived from its coordinates when the cell is painted, so
                    the sheet costs one small object per row rather than one value per cell.
                    Cells are editable, and the headers are real A1 references: type
                    <code>=A1+B1</code> anywhere.
                </p>
            </div>

            <div class="xl__controls">
                <label class="xl__field">
                    Rows
                    <input
                        class="xl__input"
                        type="number"
                        min="1"
                        [max]="maxRowCount"
                        step="100000"
                        [value]="pendingRowCount"
                        (input)="onRowCountInput($event)"
                    />
                </label>
                <button type="button" class="xl__btn" (click)="generate()">Generate</button>
                <button type="button" class="xl__btn xl__btn--ghost" (click)="generate(1000)">1 K</button>
                <button type="button" class="xl__btn xl__btn--ghost" (click)="generate(100000)">100 K</button>
                <button type="button" class="xl__btn xl__btn--ghost" (click)="generate(1000000)">1 M</button>
            </div>
        </header>

        <dl class="xl__stats">
            <div class="xl__stat"><dt>Rows</dt><dd>{{ rowCount | number }}</dd></div>
            <div class="xl__stat"><dt>Columns</dt><dd>{{ columnCount }}</dd></div>
            <div class="xl__stat xl__stat--accent"><dt>Cells</dt><dd>{{ cellCount | number }}</dd></div>
            <div class="xl__stat"><dt>Values stored</dt><dd>{{ edits | number }}</dd></div>
            <div class="xl__stat"><dt>Generated in</dt><dd>{{ generateMs }} ms</dd></div>
        </dl>

        <section class="xl__grid">
            <photon-grid-angular
                [columns]="columns"
                [dataSet]="rows"
                [options]="options"
                (gridReady)="onGridReady($event)"
            ></photon-grid-angular>
        </section>
    `,
    styles: [`
        .xl__header {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 24px; flex-wrap: wrap; margin: 32px 0 12px;
        }
        .xl__title { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
        .xl__subtitle { margin: 0; max-width: 74ch; color: #64748b; font-size: 13px; line-height: 1.6; }
        .xl__subtitle code {
            background: #f1f5f9; border-radius: 4px; padding: 1px 5px; font-size: 12px;
        }
        .xl__controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .xl__field { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; }
        .xl__input {
            width: 120px; border: 1px solid #cbd5e1; border-radius: 6px;
            padding: 6px 8px; font-size: 13px; font-variant-numeric: tabular-nums;
        }
        .xl__btn {
            border: 1px solid #cbd5e1; background: #2563eb; color: #fff;
            border-radius: 6px; padding: 7px 14px; font-size: 13px; font-weight: 500; cursor: pointer;
        }
        .xl__btn--ghost { background: #fff; color: #334155; }

        .xl__stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
        .xl__stat {
            flex: 1 1 110px; border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 8px 12px; background: #f8fafc;
        }
        .xl__stat dt { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
        .xl__stat dd {
            margin: 2px 0 0; font-size: 18px; font-weight: 600;
            font-variant-numeric: tabular-nums; color: #0f172a;
        }
        .xl__stat--accent dd { color: #2563eb; }

        .xl__grid { height: 620px; }
    `],
})
export class ExcelGridComponent implements OnInit {
    readonly columnCount = COLUMN_COUNT;
    readonly maxRowCount = MAX_ROW_COUNT;
    readonly lastLetter = columnLetter(COLUMN_COUNT - 1);

    columns: ColumnDef[] = [];
    rows: SheetRow[] = [];
    options: GridOptions = {} as GridOptions;

    /** What the input box holds; applied by {@link generate}. */
    pendingRowCount = DEFAULT_ROW_COUNT;
    rowCount = 0;
    generateMs = 0;
    /** Cells the user has typed into — the only values that exist as data. */
    edits = 0;

    private api: GridApi | null = null;

    get cellCount(): number {
        return this.rowCount * this.columnCount;
    }

    constructor(private readonly cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.columns = this.buildColumns();
        this.options = {
            columns: [],
            // Spreadsheet proportions: short rows, so a screen shows many of them.
            rowHeight: 28,
            headerRowHeight: 30,
            mode: 'light',
            rowShading: false,
            // The row-number gutter, which is half of what makes a grid read as a
            // sheet — and what the row half of an A1 reference counts.
            showSerialNumber: true,
            rowMenu: { enabled: false },
            formula: { enabled: true },
            editing: { mode: 'cell' },
        } as GridOptions;

        this.generate(DEFAULT_ROW_COUNT);
    }

    onGridReady(api: GridApi): void {
        this.api = api;
    }

    onRowCountInput(event: Event): void {
        const raw = Number((event.target as HTMLInputElement).value);
        this.pendingRowCount = Number.isFinite(raw)
            ? Math.min(MAX_ROW_COUNT, Math.max(1, Math.trunc(raw)))
            : DEFAULT_ROW_COUNT;
    }

    /**
     * Builds `count` rows and hands them to the grid.
     *
     * The loop is deliberately plain: `new Array(n)` pre-sized, filled with
     * object literals of one shape. A million iterations of that is a few
     * hundred milliseconds and — because every object has the same hidden class —
     * stays a packed array the engine can walk without megamorphic lookups.
     *
     * @param count - Rows to generate. Defaults to whatever the input box holds.
     */
    generate(count = this.pendingRowCount): void {
        const total = Math.min(MAX_ROW_COUNT, Math.max(1, Math.trunc(count)));
        this.pendingRowCount = total;

        const started = performance.now();
        const rows: SheetRow[] = new Array<SheetRow>(total);
        for (let r = 0; r < total; r++) rows[r] = { r };

        // A new array reference, so the wrapper's input binding sees the change.
        this.rows = rows;
        this.rowCount = total;
        this.edits = 0;
        this.generateMs = Math.round(performance.now() - started);
        this.cdr.markForCheck();
    }

    /**
     * One column per letter.
     *
     * The value getter is the whole trick. It prefers a value the user has
     * typed — an edit writes `data[letter]`, exactly as it would in any column —
     * and falls back to the generated one, so an untouched sheet stores nothing
     * while an edited cell behaves like ordinary data for sorting, filtering,
     * copying and export.
     *
     * `column` is captured per column rather than read from `colDef`, so the
     * getter does no lookup per cell: it runs once per painted cell, and this is
     * the hottest path in the demo.
     */
    private buildColumns(): ColumnDef[] {
        const columns: ColumnDef[] = new Array<ColumnDef>(COLUMN_COUNT);

        for (let column = 0; column < COLUMN_COUNT; column++) {
            const letter = columnLetter(column);
            columns[column] = {
                field: letter,
                header: letter,
                type: 'number',
                width: 96,
                editable: true,
                // The headers are column letters, so A1-style references in the
                // Formula Engine mean exactly what they appear to mean.
                allowFormula: true,
                valueGetter: ({ data }: ValueGetterParams): unknown => {
                    const typed = data[letter];
                    return typed === undefined ? generatedValue(data['r'] as number, column) : typed;
                },
            };
        }

        return columns;
    }
}
