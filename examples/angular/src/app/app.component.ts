import { ChangeDetectionStrategy, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';

import { PhotonGridComponent } from 'photon-grid-angular';
import type { ColumnDef, RendererContext } from 'photon-grid-angular';
import type { CellRange, DisplayRendererParams, GridApi, GridOptions } from 'photon-grid-core';
import { PhotonAIProviderType, HeaderIconDisplay } from 'photon-grid-core';
import type { RowClickPayload, RowSelectedEvent } from 'photon-grid-core';
// Optional SheetJS adapter — enables binary .xlsx/.xls import. `xlsx` is an
// optional peer dependency (installed in this example). We import it statically
// here and hand it to the parser so the bundler resolves and includes it; the
// core barrel never references `xlsx`, so Grid Core stays zero-dependency.
import { SheetJsWorkbookParser } from 'photon-grid-core/import/sheetjs';
import * as XLSX from 'xlsx';

import { EmployeeCellComponent } from './employee-cell.component';
import { CommonModule } from '@angular/common';
import { environment } from '../environments/environment';

/** Emoji flags for the fixed country list used by `generateData` below. */


/**
 * Minimal demonstration of the `photon-grid-angular` wrapper:
 * `columns`, `dataSet` and `options` inputs plus a couple of output events.
 */
@Component({
    selector: 'app-root',
    standalone: true,
    imports: [PhotonGridComponent, CommonModule],
    templateUrl: './app.component.html', 
    styleUrls: ['./app.component.scss', './linear-theme.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
    readonly title = 'Photon Grid — Angular example';

    /**
     * Template used by the `country` column's renderer (flag + country name).
     * It's a plain top-level `<ng-template>` in this component's own view —
     * not nested inside a structural directive — so `{ static: true }` is
     * valid and the query is resolved before `ngOnInit` runs, which is what
     * lets `columns` (below) reference `countryTpl` directly in `ngOnInit`
     * instead of needing to wait for `ngAfterViewInit`.
     */ 
    @ViewChild('countryTpl', { static: true })
    private readonly countryTpl!: TemplateRef<RendererContext<DisplayRendererParams>>;

    /** Column definitions bound to the grid's `columns` input. Built in
     *  {@link ngOnInit}, once `countryTpl` above is resolved. */
    columns: ColumnDef[] = [];

    /** Row data bound to the grid's `dataSet` input. */
    data: Record<string, unknown>[] = [];

    /**
     * Column definitions for the small "Formula Playground" grid below the main
     * grid. Kept intentionally tiny so A1-style cell references are easy to
     * reason about: with these definitions the addressable columns map to
     * `A = product`, `B = quantity`, `C = unitPrice`, `D = total`,
     * `E = taxRate`, `F = grandTotal`, and rows are `1`-based in data order.
     */
    formulaColumns: ColumnDef[] = [];

    /** Row data bound to the formula grid's `dataSet` input. */
    formulaData: Record<string, unknown>[] = [];

   COUNTRY_FLAGS: Record<string, string> = {
    USA: 'us',
    Canada: 'ca',
    Germany: 'de',
    UK: 'gb',
    Pakistan: 'pk',
    India: 'in',
    Australia: 'au',
    Japan: 'jp',
};


    generateData(count: number): Record<string, unknown>[] {
        const firstNames = [
            'Alice', 'Brian', 'Carla', 'David', 'Ella', 'Frank', 'Grace', 'Henry',
            'Isabella', 'Jack', 'Kevin', 'Linda', 'Michael', 'Nina', 'Oliver',
            'Paul', 'Queen', 'Ryan', 'Sophia', 'Thomas', "Sara" , 
            'Abu',
        ];

        const lastNames = [
            'Johnson', 'Smith', 'Brown', 'Wilson', 'Taylor', 'Anderson', 'Lee',
            'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'Allen', 'King', "Khatak", "Bakkar"
        ];

        const departments = [
            'Engineering', 'Sales', 'Marketing', 'Finance', 'Design', 'HR', 'Support', 'Operations',
        ];

        const jobTitles = [
            'Software Engineer', 'Senior Engineer', 'Product Manager', 'UI Designer',
            'QA Engineer', 'DevOps Engineer', 'Business Analyst', 'Sales Executive',
        ];

        const countries = ['USA', 'Canada', 'Germany', 'UK', 'Pakistan', 'India', 'Australia', 'Japan'];

        const cities = ['New York', 'Toronto', 'Berlin', 'London', 'Lahore', 'Karachi', 'Sydney', 'Tokyo'];

        const performance = ['Excellent', 'Good', 'Average', 'Needs Improvement'];

        const managers = ['Sarah Connor', 'John Carter', 'Emma Watson', 'Chris Evans', 'Sophia Brown'];

        const rand = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

        return Array.from({ length: count }, (_, i) => {
            const firstName = rand(firstNames);
            const lastName = rand(lastNames);

            return {
                id: i + 1,
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
                department: rand(departments),
                jobTitle: rand(jobTitles),
                salary: 50000 + Math.floor(Math.random() * 100000),
                age: 20 + Math.floor(Math.random() * 45),
                experience: Math.floor(Math.random() * 25),
                country: rand(countries),
                city: rand(cities),
                phone: `+1-555-${1000 + Math.floor(Math.random() * 9000)}`,
                joinDate: new Date(
                    2015 + Math.floor(Math.random() * 11),
                    Math.floor(Math.random() * 12),
                    1 + Math.floor(Math.random() * 28),
                ),
                active: Math.random() > 0.25,
                rating: +(Math.random() * 5).toFixed(1),
                bonus: Math.floor(Math.random() * 15000),
                projects: 1 + Math.floor(Math.random() * 20),
                performance: rand(performance),
                manager: rand(managers),
                remote: Math.random() > 0.5,
            };
        });
    }

    /** Remaining grid configuration bound to the grid's `options` input. */
    readonly options: Partial<GridOptions> = {
        mode: 'light',
        variant: 'alpine',
        showCheckboxes: false,
        showSerialNumber: true,
        rowShading: false,
        showGroupingBar: true,
        showVerticalBorders: false,
        showFilterRow: true,
        // Header icons: keep the filter funnel always visible, hide the "⋯" menu.
        headerIcons: {
            filter: HeaderIconDisplay.HIDDEN,
            menu: HeaderIconDisplay.HIDDEN,
        },
        rowHeight: 42,
        pagination: { enabled: true, pageSize: 1000, },
        // Import Engine: mounts the top-right "Import ▾" button. CSV/TSV/Clipboard
        // work out of the box; register a SheetJS parser (see onGridReady) for
        // .xlsx. Default mode replaces data and defines columns from the file.
        import: { enabled: true },
        filterRowHeight: 48,
        headerRowHeight: 48,
        selection: { mode: 'multiple', serialColumnSelection: true },
        photonAI: {
            enabled: true,
            provider: {
                // Groq exposes an OpenAI-compatible Chat Completions API, so the
                // built-in OpenAI preset works as-is — just point apiUrl at Groq
                // and supply the Groq key + a Groq model. No custom transformers
                // needed (Bearer auth + response_format json_object are handled).
                type: PhotonAIProviderType.OpenAI,
                apiKey: environment.groqApiKey,
                apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
                model: 'llama-3.3-70b-versatile',
            },
        }
    };

    /**
     * Options for the "Formula Playground" grid. The only feature that differs
     * from a plain grid is {@link GridOptions.formula} — enabling it activates
     * the Formula Engine so that `allowFormula` columns treat a leading `=` as a
     * formula. `autoRecalculate` keeps dependent cells live as you edit inputs.
     */
    readonly formulaOptions: Partial<GridOptions> = {
        mode: 'light',
        variant: 'alpine',
        showCheckboxes: false,
        showSerialNumber: true,
        rowShading: true,
        showVerticalBorders: true,
        rowHeight: 36,
        headerRowHeight: 44,
        formula: {
            enabled: true,
            autoRecalculate: true,
            enableCaching: true,
        },
        // With the Formula Engine on, imported =A1+B1 cells register and compute
        // through the one Formula Engine — the importer never evaluates them.
        import: { enabled: true },
    };

    ngOnInit(): void {
        this.data = this.generateData(100000);
        this.columns = this.buildColumns();

        this.formulaColumns = this.buildFormulaColumns();
        this.formulaData = this.buildFormulaData();
    }

onGridReady(api: GridApi): void {
    // Enable binary Excel (.xlsx/.xls) import by registering the SheetJS-backed
    // workbook parser, seeded with the statically-imported `xlsx` module so the
    // bundler includes it. CSV/TSV/Clipboard already work without it.
    api.registerImportParser(new SheetJsWorkbookParser(XLSX));
//   console.log('[photon-grid] ready — visible rows:', api.getVisibleRows().length);

//   // Create overlay
//   const overlay = document.createElement('div');
//   overlay.style.position = 'fixed';
//   overlay.style.inset = '0';
//   overlay.style.display = 'flex';
//   overlay.style.alignItems = 'center';
//   overlay.style.justifyContent = 'center';
//   overlay.style.background = 'rgba(0,0,0,0.25)';
//   overlay.style.backdropFilter = 'blur(4px)';
//   overlay.style.zIndex = '9999';

//   // Chart container
//   const chartContainer = document.createElement('div');
//   chartContainer.style.width = '760px';
//   chartContainer.style.height = '520px';
//   chartContainer.style.background = '#ffffff';
//   chartContainer.style.borderRadius = '14px';
//   chartContainer.style.boxShadow =
//     '0 20px 60px rgba(0,0,0,.25)';
//   chartContainer.style.padding = '24px';
//   chartContainer.style.position = 'relative';

//   // Close button
//   const close = document.createElement('button');
//   close.innerHTML = '✕';
//   close.style.position = 'absolute';
//   close.style.top = '12px';
//   close.style.right = '12px';
//   close.style.width = '32px';
//   close.style.height = '32px';
//   close.style.border = 'none';
//   close.style.borderRadius = '50%';
//   close.style.cursor = 'pointer';
//   close.style.fontSize = '16px';
//   close.onclick = () => overlay.remove();

//   chartContainer.appendChild(close);
//   overlay.appendChild(chartContainer);
//   document.body.appendChild(overlay);

//   api.createChart(chartContainer, {
//     chartId: 'salary-department',
//     type: 'bar',

//     labelColId: 'department',
//     valueColIds: ['salary', 'age'],

//     title: 'Department Salary Analysis',

//     width: 700,
//     height: 450,

//     transformOptions: {
//       aggregation: 'avg',
//       sortByValue: true
//     },

//     renderOptions: {
//       padding: 40,

//       showLegend: true,
//       showGrid: true,
//       showValues: true,

//       smooth: true,

//       animationDuration: 700,

//       title: 'Average Salary by Department',
//       subtitle: 'Employee salary comparison',

//       xAxisTitle: 'Department',
//       yAxisTitle: 'Average Salary',

//       titleAlign: 'center',
//       subtitleAlign: 'center',

//       legendPosition: 'bottom',

//       fontFamily: 'Inter, sans-serif',
//       fontSize: 13,
//       titleFontSize: 22,
//       subtitleFontSize: 13,

//       strokeWidth: 3,
//       fillOpacity: 0.85
//     }
//   });
//   api.enterFullScreen();
//   api.toggleDarkMode();
setTimeout(() => {
    // api.scrollToRow(20);
    // const cellRange: CellRange = {
    //     startRowIndex: 2, 
    //     endRowIndex: 4,
    //     startColIndex: 2,
    //     endColIndex: 4

    // }
    // api.setCellRange(cellRange);
    // api.setColumnPin('fullName', 'left');
    // api.setColumnPin('department', 'right');
}, 100);
}

    onRowClicked(event: RowClickPayload): void {
        console.log('[photon-grid] row clicked:', event);
    }

    onRowSelected(event: RowSelectedEvent): void {
        console.log('[photon-grid] selection changed — selected:', event.selectedCount);
    }

    private buildColumns(): ColumnDef[] {
        return [
            {
                // Only `field` is required — `colId`, `header` ("Full Name")
                // and `type` ('string') are inferred by the core.
                field: 'fullName',
                renderer: {
                    // Component-based renderer: avatar + name + gray job title.
                    display: EmployeeCellComponent,
                },
                filterIconDisplay: HeaderIconDisplay.ALWAYS,
                menuIconDisplay: HeaderIconDisplay.ALWAYS
            },
            {
                colId: 'email',
                field: 'email',
                header: 'Email',
                type: 'string', 
                width: 240,
                renderer: {
                    // Plain-function renderer: no Angular component/template
                    // needed just to bold a value. Building an HTMLElement
                    // directly (rather than an HTML string) sidesteps any
                    // injection concern for values.
                    display: (params: DisplayRendererParams) => {
                        const strong = document.createElement('strong');
                        strong.textContent = String(params.value ?? '');
                        return strong;
                    },
                },
            },
            { colId: 'department', field: 'department', header: 'Department', type: 'string', width: 160, groupable: true },
            { colId: 'jobTitle', field: 'jobTitle', header: 'Job Title', type: 'string', width: 180, groupable: true },
            { colId: 'salary', field: 'salary',  aggFunc: 'max', header: 'Salary', type: 'currency', width: 140 },
            { colId: 'age', field: 'age', header: 'Age', aggFunc: 'avg', type: 'number', width: 90 },
            { colId: 'experience', field: 'experience', header: 'Experience', aggFunc: 'avg', type: 'number', width: 120 },
            {
                colId: 'country',
                field: 'country',
                header: 'Country',
                type: 'dropdown',
                editable: true,
                width: 160,
                groupable: true,
                renderer: {
                    // Template-based renderer: flag + country name.
                    display: this.countryTpl,
                    option: this.countryTpl,
                },

                enumOptions: Object.keys(this.COUNTRY_FLAGS),
            },
            { colId: 'city', field: 'city', header: 'City', type: 'string', minWidth: 150, groupable: true },
            { colId: 'phone', field: 'phone', header: 'Phone', type: 'string', minWidth: 170, flex: 1 },
            { colId: 'joinDate', field: 'joinDate', header: 'Join Date', type: 'date', minWidth: 140, flex: 1},
            { colId: 'active', field: 'active', header: 'Active', type: 'boolean', minWidth: 100, width: 120 },
            { colId: 'rating', field: 'rating', header: 'Rating', type: 'number', minWidth: 100, width: 120 },
        ];
    }

    /**
     * Builds the columns for the Formula Playground grid.
     *
     * `total` and `grandTotal` opt into the Formula Engine via
     * {@link ColumnDef.allowFormula} and are `editable`, so you can click a cell,
     * type a formula such as `=B2*C2` or `=SUM(D1:D8)` and see it recalculate.
     * The plain input columns (`quantity`, `unitPrice`, `taxRate`) are editable
     * too — editing them re-evaluates every dependent formula automatically.
     */
    private buildFormulaColumns(): ColumnDef[] {
        return [
            // A — label column, referenced by nothing but keeps the sheet readable.
            { colId: 'product', field: 'product', header: 'Product (A)', type: 'string', minWidth: 160, flex: 1 },
            // B — quantity input.
            { colId: 'quantity', field: 'quantity', header: 'Qty (B)', type: 'number', width: 110, editable: true, flex: 1 },
            // C — unit price input.
            { colId: 'unitPrice', field: 'unitPrice', header: 'Unit Price (C)', type: 'currency', width: 140, editable: true, flex: 1 },
            // D — computed line total. Declared once as a COLUMN FORMULA (field-name
            // syntax) so every row computes automatically — no setCellFormula needed.
            // Still editable, so a user can retype a formula on any cell.
            { colId: 'total', field: 'total', header: 'Total (D)', type: 'currency', width: 150, editable: true, allowFormula: true, formula: '=quantity * unitPrice', flex: 1,  },
            // E — tax rate input (e.g. 0.08 = 8%).
            { colId: 'taxRate', field: 'taxRate', header: 'Tax Rate (E)', type: 'number', width: 120, editable: true, flex: 1 },
            // F — computed grand total. Column formula referencing the computed `total`.
            { colId: 'grandTotal', field: 'grandTotal', header: 'Grand Total (F)', type: 'currency', width: 160, editable: true, allowFormula: true, formula: '=total * (1 + taxRate)', flex: 1 },
        ];
    }

    /**
     * Seed rows for the Formula Playground. `total`/`grandTotal` are **not** set
     * on the product rows — the column formulas fill them automatically. The final
     * `TOTAL` row carries row-data formulas (`=SUM(D1:D8)` / `=SUM(F1:F8)`) that
     * override the column formula for that one row, aggregating the eight rows
     * above. The second row demonstrates a per-row override via a `=`-value in data.
     */
    private buildFormulaData(): Record<string, unknown>[] {
        return [
            { product: 'Wireless Mouse',     quantity: 12, unitPrice: 25,  taxRate: 0.08 },
            // Row-data formula: overrides the column formula for THIS row only.
            { product: 'Mechanical Keyboard', quantity: 7,  unitPrice: 89,  taxRate: 0.08, total: '=quantity * unitPrice * 0.9' },
            { product: '27" Monitor',        quantity: 4,  unitPrice: 240, taxRate: 0.05 },
            { product: 'USB-C Dock',         quantity: 9,  unitPrice: 130, taxRate: 0.08 },
            { product: 'Laptop Stand',       quantity: 15, unitPrice: 45,  taxRate: 0.05 },
            { product: 'Webcam 1080p',       quantity: 6,  unitPrice: 60,  taxRate: 0.08 },
            { product: 'Noise-cancel Headset', quantity: 8, unitPrice: 150, taxRate: 0.08 },
            { product: 'Desk Lamp',          quantity: 20, unitPrice: 30,  taxRate: 0.05 },
            // Totals row — row-data formulas aggregate the eight product rows above.
            { product: 'TOTAL', total: '=SUM(D1:D8)', grandTotal: '=SUM(F1:F8)' },
        ];
    }

    /**
     * Nothing to seed anymore. Formulas are declared entirely in the column
     * definitions (`ColumnDef.formula`) and row data (`=`-prefixed values), and the
     * grid discovers and registers them automatically at load. `GridApi.setCellFormula`
     * still works for runtime changes and overrides any declared formula — e.g.:
     *
     * ```ts
     * // api.setCellFormula(api.getAllRows()[0].nodeId, 'total', '=quantity * unitPrice * 1.2');
     * ```
     */
    onFormulaGridReady(api: GridApi): void {
        // Enable .xlsx import for the formula playground too — imported =A1+B1
        // cells register with the Formula Engine and compute automatically.
        api.registerImportParser(new SheetJsWorkbookParser(XLSX));
    }


   
}