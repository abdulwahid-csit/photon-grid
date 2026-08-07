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
import type {
    CellEditorParams,
    CellValueChangedEvent,
    GridApi,
    GridOptions,
    ICellEditor,
    ValidationResult,
} from 'photon-grid-core';
import { GridEventType, ToastAnimation, ToastPosition } from 'photon-grid-core';

/**
 * One column per built-in cell editor.
 *
 * The point of this demo is coverage: every editor Photon ships gets a column,
 * so the whole set can be exercised side by side and a regression in any one of
 * them is obvious on sight. Alongside that it demonstrates the four things the
 * editing architecture is actually for:
 *
 * 1. **Zero configuration.** Several columns declare only `editable: true` and
 *    a `type`; the editor and its validation are both inferred.
 * 2. **Declarative validation the grid owns.** Rules live on the column, not in
 *    the editor, which is why they behave identically for a built-in editor and
 *    for the custom one below.
 * 3. **Extension without forking.** `StarRatingEditor` is a plain class
 *    registered at runtime; the grid was not modified to support it.
 * 4. **Async and cross-field rules.** A server-style uniqueness check on `sku`,
 *    and a row validator relating two date columns.
 *
 * Double-click (or press Enter on) any cell to edit. Escape cancels, Tab commits
 * and moves on.
 */

// ─── Custom editor ────────────────────────────────────────────────────────────

/** `cellEditorParams` accepted by {@link StarRatingEditor}. */
interface StarRatingEditorParams {
    /** How many stars to draw. @default 5 */
    readonly max?: number;
}

/**
 * A five-star picker, implemented against the same `ICellEditor` interface every
 * built-in editor implements.
 *
 * This is the whole extensibility story in ~40 lines: no base class, no grid
 * internals, no registration ceremony beyond one `registerEditor` call. It gets
 * the column's validation, the popup service, focus restoration and keyboard
 * handling for free, because those belong to the grid rather than to the editor.
 */
class StarRatingEditor implements ICellEditor<number> {
    private gui!: HTMLElement;
    private value = 0;
    private buttons: HTMLButtonElement[] = [];

    init(params: CellEditorParams<number, Record<string, unknown>, StarRatingEditorParams>): void {
        const max = params.params.max ?? 5;
        this.value = Number(params.value ?? 0);

        this.gui = document.createElement('div');
        this.gui.className = 'pg-editor pg-editor--stars star-editor';
        this.gui.setAttribute('role', 'radiogroup');

        for (let i = 1; i <= max; i++) {
            const star = document.createElement('button');
            star.type = 'button';
            star.className = 'star-editor__star';
            star.textContent = '★';
            star.setAttribute('role', 'radio');
            star.setAttribute('aria-label', `${i} of ${max}`);
            star.addEventListener('click', () => {
                this.value = i;
                this.paint();
                params.onValueChange(i);
                // A rating is a single decisive click — committing immediately is
                // what makes it feel like a control rather than a form field.
                params.commit();
            });
            this.buttons.push(star);
            this.gui.appendChild(star);
        }
        this.paint();
    }

    getGui(): HTMLElement {
        return this.gui;
    }

    getValue(): number {
        return this.value;
    }

    focus(): void {
        this.buttons[Math.max(0, this.value - 1)]?.focus();
    }

    destroy(): void {
        // Listeners die with the elements, which the host removes; the array is
        // cleared so a retained editor cannot pin them.
        this.buttons = [];
    }

    /** Reflects the current value onto the stars and their ARIA state. */
    private paint(): void {
        this.buttons.forEach((star, index) => {
            const on = index < this.value;
            star.classList.toggle('star-editor__star--on', on);
            star.setAttribute('aria-checked', String(index + 1 === this.value));
        });
    }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

/**
 * One row. Each field exists to feed exactly one editor.
 *
 * A `type` alias rather than an `interface`, so it picks up the implicit index
 * signature that makes it assignable to the grid's `Record<string, unknown>[]`.
 */
type ProductRow = {
    readonly __photon_id__: string;
    sku: string;              // text        + required / minLength / pattern / async unique
    notes: string;            // textarea    (popup)
    quantity: number;         // number      + params + min/max
    contact: string;          // email       (validation implied by type)
    apiKey: string;           // password
    homepage: string;         // url         (validation implied by type)
    inStock: boolean;         // checkbox    (as an editor)
    notify: boolean;          // switch      (as an editor)
    featured: boolean;        // live in-cell toggle — no editor opens
    category: string;         // select
    owner: string;            // autocomplete (popup, async options)
    releasedOn: string;       // date
    lastAudit: string;        // datetime
    opensAt: string;          // time
    accent: string;           // color
    confidence: number;       // range
    rating: number;           // the custom editor
    discontinued: boolean;    // drives the per-row `editable` predicate
    /**
     * Written by the Formula Engine, never by `buildRows` — the column declares
     * `formula: '=rating'`, and the computed result lands here.
     */
    average?: number;
};

const CATEGORIES = ['Hardware', 'Software', 'Services', 'Subscription'] as const;
const OWNERS = [
    'Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson',
    'Barbara Liskov', 'Donald Knuth', 'Margaret Hamilton', 'Edsger Dijkstra',
];

/** SKUs already taken, for the asynchronous uniqueness rule. */
const TAKEN_SKUS = new Set(['PG-0001', 'PG-0002']);

function buildRows(count: number): ProductRow[] {
    const rows: ProductRow[] = [];
    for (let i = 0; i < count; i++) {
        const n = i + 1;
        rows.push({
            __photon_id__: `p${n}`,
            sku: `PG-${String(1000 + n)}`,
            notes: i % 3 === 0
                ? 'Ships in a padded box. Contains a lithium cell, so it cannot travel by air freight without a declaration.'
                : 'Standard packaging.',
            quantity: (i * 7) % 120,
            contact: `owner${n}@example.com`,
            apiKey: `sk_live_${(n * 7919).toString(36)}`,
            homepage: `https://example.com/products/${n}`,
            inStock: i % 3 !== 0,
            notify: i % 2 === 0,
            featured: i % 5 === 0,
            category: CATEGORIES[i % CATEGORIES.length],
            owner: OWNERS[i % OWNERS.length],
            releasedOn: new Date(2023, i % 12, ((i * 3) % 27) + 1).toISOString(),
            lastAudit: new Date(2024, i % 12, ((i * 5) % 27) + 1, 9 + (i % 8), (i * 13) % 60).toISOString(),
            opensAt: `${String(8 + (i % 9)).padStart(2, '0')}:${String((i * 15) % 60).padStart(2, '0')}`,
            accent: ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed'][i % 5],
            confidence: ((i * 11) % 101),
            rating: (i % 5) + 1,
            discontinued: i % 7 === 6,
        });
    }
    return rows;
}


// <header class="es__header">
//             <div class="es__intro">
//                 <h2 class="es__title">Editing — every built-in editor</h2>
//                 <p class="es__subtitle">
//                     One column per editor. Double-click a cell (or press Enter) to edit;
//                     <code>Escape</code> cancels, <code>Tab</code> commits and moves on.
//                     <strong>Qty</strong>, <strong>Contact</strong> and <strong>SKU</strong> carry
//                     validation — try a negative quantity, a malformed address, or the SKU
//                     <code>PG-0001</code>, which fails an async uniqueness check. Rows marked
//                     <em>discontinued</em> have a read-only <strong>Qty</strong>, via an
//                     <code>editable</code> predicate. <strong>Stars</strong> is a custom editor
//                     registered at runtime with <code>registerEditor</code>.
//                 </p>
//             </div>

//             <div class="es__status" [class.es__status--error]="lastWasError">
//                 <span class="es__status-label">Last edit</span>
//                 <span class="es__status-text">{{ lastEvent }}</span>
//             </div>
//         </header>

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-editing-showcase-grid',
    standalone: true,
    imports: [CommonModule, PhotonGridComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    template: `
        <section class="es__grid">
            <photon-grid-angular
                [columns]="columns"
                [dataSet]="rows"
                [options]="options"
                (gridReady)="onGridReady($event)"
            ></photon-grid-angular>
        </section>
    `,
    styles: [`
        .es__header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            flex-wrap: wrap;
            margin: 32px 0 12px;
        }
        .es__intro { min-width: 0; }
        .es__title { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
        .es__subtitle {
            margin: 0;
            max-width: 88ch;
            color: #64748b;
            font-size: 13px;
            line-height: 1.55;
        }
        .es__subtitle code {
            font-size: 12px;
            background: #f1f5f9;
            padding: 1px 5px;
            border-radius: 4px;
        }
        .es__status {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 260px;
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #f8fafc;
        }
        .es__status--error { border-color: #fecaca; background: #fef2f2; }
        .es__status-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #64748b;
        }
        .es__status-text { font-size: 13px; font-weight: 500; color: #0f172a; }
        .es__status--error .es__status-text { color: #b91c1c; }

        .es__grid { height: 560px; }

        /* The custom editor's own styling. Deliberately here rather than in the
           grid's stylesheet: an application-supplied editor owns its appearance,
           which is exactly the boundary the architecture draws. */
        .star-editor {
            display: flex;
            align-items: center;
            gap: 2px;
            padding: 0 8px;
        }
        .star-editor__star {
            border: none;
            background: transparent;
            padding: 0 1px;
            font-size: 16px;
            line-height: 1;
            cursor: pointer;
            color: #cbd5e1;
        }
        .star-editor__star--on { color: #f59e0b; }
        .star-editor__star:focus-visible { outline: 2px solid #2563eb; border-radius: 3px; }
    `],
})
export class EditingShowcaseGridComponent implements OnInit {
    rows: ProductRow[] = [];
    columns: ColumnDef[] = [];
    options: Partial<GridOptions> = {};

    lastEvent = 'double-click any cell to start editing';
    lastWasError = false;

    constructor(private readonly cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.rows = buildRows(500);
        this.columns = this.buildColumns();
        this.options = {
            columns: [],
            rowHeight: 40,
            headerRowHeight: 42,
            mode: 'light',
            rowShading: false,
            showSerialNumber: true,
            rowMenu: { enabled: false },
            // Required before any `ColumnDef.formula` is evaluated at all — the
            // engine is inert without it, which is why the Average column showed
            // nothing.
            formula: { enabled: true },
            toast: {position: ToastPosition.TopRight, duration: 3000, maxVisible: 3, newestOnTop: true, pauseOnHover: true, dismissible: true, animation: ToastAnimation.Slide, showProgress: true, respectReducedMotion: false, gap: 8, },
            editing: {
                mode: 'cell',
                // Failures hold the editor open and annotate it, so the value can
                // be corrected in place rather than silently discarded.
                onInvalid: 'revert',
                validateOn: 'commit',
                singleClickEdit: false,
                enterStartsEditing: true,
                validationDebounceMs: 1000,
                // Cross-field rule no single column can express.
                rowValidator: (data) => {
                    const released = new Date(String(data['releasedOn'])).getTime();
                    const audited = new Date(String(data['lastAudit'])).getTime();
                    return Number.isFinite(released) && Number.isFinite(audited) && audited < released
                        ? { valid: false, message: 'Last audit cannot precede the release date' }
                        : { valid: true };
                },
            },
        };
    }

    onGridReady(api: GridApi): void {
        // ── Extension point 1: a new editor, with no change to the grid ──────
        api.registerEditor('stars', StarRatingEditor);

        // ── Extension point 2: a new validation rule, likewise ───────────────
        // Usable afterwards as `validation: { skuFormat: true }` on any column.
        api.registerValidator('skuFormat', (config) =>
            config === false
                ? null
                : ({ value, label }): ValidationResult =>
                    /^PG-\d{4}$/.test(String(value ?? ''))
                        ? { valid: true }
                        : { valid: false, message: `${label} must look like PG-1234`, code: 'skuFormat' });

        api.on(GridEventType.CELL_VALUE_CHANGED, (e: CellValueChangedEvent) => {
            this.lastWasError = false;
            this.lastEvent = `${e.colDef.header} = ${JSON.stringify(e.newValue)}`;
            this.cdr.markForCheck();
        });

        // A rejected commit reports through CELL_EDIT_STOP with an `error`.
        api.on(GridEventType.CELL_EDIT_STOP, (e: { field?: string; error?: string }) => {
            if (!e.error) return;
            this.lastWasError = true;
            this.lastEvent = e.error;
            this.cdr.markForCheck();
        });
    }

    /**
     * One column per editor, in `BuiltInEditorName` declaration order.
     *
     * Kept as a flat literal rather than generated: each column needs its own
     * field, params and rules, so a loop would only move that per-editor detail
     * into a lookup table without removing it.
     */
    private buildColumns(): ColumnDef[] {
        return [
            // ── text ── with three rules, one of them asynchronous.
            {
                field: 'sku', header: 'SKU', type: 'string', width: 130, 
                editable: true, cellEditor: 'text',
                cellEditorParams: { maxLength: 12, placeholder: 'PG-1234' },
                validation: {
                    required: true,
                    // The rule registered in `onGridReady` — resolved by name.
                    skuFormat: true,
                    // Server-style uniqueness. Runs only once everything above
                    // passes, so a blank field never costs a round trip.
                    validateAsync: async ({ value, label }) => {
                        await new Promise((r) => setTimeout(r, 350));
                        return TAKEN_SKUS.has(String(value))
                            ? { valid: false, message: `${label} ${String(value)} is already in use`, code: 'unique' }
                            : { valid: true };
                    },
                },
            },

            // ── textarea ── opens as a popup; Enter inserts a newline, Ctrl+Enter commits.
            {
                field: 'notes', header: 'Notes', type: 'string', width: 200,
                editable: true, cellEditor: 'textarea',
                cellEditorParams: { rows: 5, maxLength: 400 },
            },

            // ── number ── params constrain the *control*; validation constrains the *value*.
            {
                field: 'quantity', header: 'Qty', type: 'number', width: 100,
                // Per-row editability: a discontinued product's stock is frozen.
                editable: ({ data }) => data['discontinued'] !== true,
                cellEditorParams: { min: 0, max: 999, step: 5 },
                validation: { required: true, min: 0, max: 999, integer: true },
            },

            // ── email ── no `cellEditor` and no `validation`: `type: 'email'`
            // infers the editor *and* the address rule.
            { field: 'contact', header: 'Contact', type: 'email', width: 210, editable: true },

            // ── password ──
            {
                field: 'apiKey', header: 'API Key', type: 'string', width: 170,
                editable: true, cellEditor: 'password',
                cellEditorParams: { revealToggle: true },
            },

            // ── url ── editor and rule inferred from `type: 'url'`.
            { field: 'homepage', header: 'Homepage', type: 'url', width: 220, editable: true },

            // ── checkbox ── as an *editor*: the textual `boolean` renderer draws
            // no live control, so double-click opens the checkbox editor.
            {
                field: 'inStock', header: 'In Stock', type: 'boolean', width: 110,
                renderer: 'boolean', editable: true, cellEditor: 'checkbox',
            },

            // ── switch ── same arrangement, different control.
            {
                field: 'notify', header: 'Notify', type: 'boolean', width: 100,
                renderer: 'boolean', editable: true, cellEditor: 'switch',
            },

            // ── the other boolean mode ── the default `checkbox` renderer draws a
            // live toggle, so no editor opens: the click *is* the edit, and still
            // runs the full validation / valueSetter / undo pipeline.
            { field: 'featured', header: 'Featured', type: 'boolean', width: 110, editable: true },

            // ── select ── `cellEditor: 'select'` opts into the native control;
            // a `dropdown` column with no `cellEditor` keeps the richer list.
            {
                field: 'category', header: 'Category', type: 'string', width: 140,
                editable: true, cellEditor: 'select',
                cellEditorParams: {
                    options: CATEGORIES.map((c) => ({ value: c, label: c })),
                },
                validation: { required: true },
            },

            // ── autocomplete ── popup, filtered as you type, async source.
            {
                field: 'owner', header: 'Owner', type: 'string', width: 190,
                editable: true, cellEditor: 'autocomplete',
                cellEditorParams: {
                    minChars: 0,
                    debounceMs: 150,
                    multiple: true,
                    freeSolo: false,
                    fetchOptions: async (query: string) => {
                        await new Promise((r) => setTimeout(r, 1500));
                        const q = query.toLowerCase();
                        return OWNERS
                            .filter((o) => o.toLowerCase().includes(q))
                            .map((o) => ({ value: o, label: o }));
                    },
                },
            },

            // ── date ──
            {
                field: 'releasedOn', header: 'Released', type: 'date', width: 140,
                editable: true, validation: { required: true },
            },

            // ── datetime ── the row validator relates this to `releasedOn`.
            { field: 'lastAudit', header: 'Last Audit', type: 'datetime', width: 170, editable: true },

            // ── time ──
            { field: 'opensAt', header: 'Opens At', type: 'string', width: 120, editable: true, cellEditor: 'time' },

            // ── color ── one swatch, nothing else. `presets` and `showHex` are
            // both opt-in; a colour cell wants a picker, not a form.
            { field: 'accent', header: 'Accent', type: 'string', width: 130, editable: true, cellEditor: 'color', renderer: 'color' },

            // ── range ──
            {
                field: 'confidence', header: 'Confidence', type: 'number', width: 160,
                editable: true, cellEditor: 'range',
                cellEditorParams: { min: 0, max: 100, step: 5, showValue: true, suffix: '%' },
            },

            // ── the custom editor, registered in `onGridReady` ──
            {
                field: 'rating', header: 'Stars', type: 'number', width: 130,
                editable: true, cellEditor: 'stars',
                cellEditorParams: { max: 5 },
            },

            // Read-only, and the field the `editable` predicate above branches on.
            {
                field: 'discontinued', header: 'Discontinued', type: 'boolean', width: 130,
                renderer: 'boolean', editable: false,
            },
            // ── formula ── the value is computed, not typed.
            //
            // Row-relative, which is what a column formula has to be: it is
            // applied to every row, so it must mean "this row's Stars". Two
            // syntaxes say that — the field name used here, or the bare column
            // letter `'=Q'` (Stars is the 17th column). What it must *not* be is
            // `=Q1`, which is an absolute reference to the Stars cell of row 1
            // and would give all 40 rows that one row's value.
            {
                field: 'average', header: 'Stars (formula)', type: 'number', width: 150,
                editable: true, allowFormula: true, formula: '=rating+confidence',
            },
        ];
    }
}
