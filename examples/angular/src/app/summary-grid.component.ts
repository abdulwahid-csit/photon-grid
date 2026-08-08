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
import {
    SummaryAggregation,
    SummaryPosition,
    SummaryScope,
} from 'photon-grid-core';
import type {
    GridApi,
    GridOptions,
    SummaryChangedEvent,
    SummaryRowDef,
} from 'photon-grid-core';

const REGIONS = ['EMEA', 'AMER', 'APAC', 'LATAM'];
const CHANNELS = ['Direct', 'Partner', 'Online', 'Retail'];
const STATUSES = ['Won', 'Open', 'Lost'];

/**
 * The "Averages" row, hoisted to a module constant so the remove/restore button
 * puts back exactly the definition that was configured — one definition, two
 * call sites.
 */
const AVERAGES_ROW: SummaryRowDef = {
    id: 'averages',
    cells: {
        region: { value: 'Avg / Median', className: 'sum-cell--label' },
        status: { aggregate: 'winRate', tooltip: 'Share of filtered deals with status "Won"' },
        amount: {
            aggregate: 'median',
            // Decorates the column's own currency formatting rather than
            // reimplementing it.
            formatter: ({ defaultFormattedValue }) => `med ${defaultFormattedValue}`,
        },
        margin: { aggregate: SummaryAggregation.Avg },
        units: { aggregate: SummaryAggregation.Avg },
        closed: { aggregate: SummaryAggregation.Max, tooltip: 'Latest close date in the current filter' },
    },
};

/**
 * Summary Rows demo.
 *
 * Four rows on the same grid, each exercising a different part of the feature:
 *
 * | Row       | Scope      | Anchoring   | Shows |
 * |-----------|------------|-------------|-------|
 * | Page      | `Visible`  | bottom, in-content | Totals only what pagination is showing, and scrolls away with the rows |
 * | Selected  | `Selected` | bottom, sticky | Recomputes on selection alone — no pipeline run involved |
 * | Averages  | `Filtered` | bottom, sticky | `avg`/`min`/`max`, plus a custom `median` aggregation |
 * | Total     | `Filtered` | bottom, sticky | Grand total, with a `colSpan` label and a custom cell renderer |
 *
 * Filter or sort a column and every `Filtered` row follows. Tick some rows and
 * only the `Selected` row moves. Page through the data and only the `Page` row
 * changes — which is the point of having scopes at all.
 */
@Component({
    selector: 'app-summary-grid',
    standalone: true,
    imports: [PhotonGridComponent, CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    template: `
        <header class="sum__header">
            <div>
                <h2 class="sum__title">Summary Rows</h2>
                <p class="sum__subtitle">
                    Four summary rows over the same {{ data.length }} deals, each with its own
                    <strong>scope</strong>. Filter a column and the <em>Total</em> and
                    <em>Averages</em> rows follow; tick some checkboxes and only
                    <em>Selected</em> moves; change page and only <em>Page</em> changes.
                    The <em>Page</em> row is <code>sticky: false</code>, so it sits at the end of
                    the scrollable content and scrolls out of view — the other three stay docked.
                </p>
            </div>

            <div class="sum__controls">
                <button type="button" class="sum__btn" (click)="toggleAverages()">
                    {{ averagesVisible ? 'Remove' : 'Add' }} “Averages” row
                </button>
                <button type="button" class="sum__btn sum__btn--ghost" (click)="cycleTotalAggregate()">
                    Total uses: <strong>{{ totalAggregate }}</strong>
                </button>
                <button type="button" class="sum__btn sum__btn--ghost" (click)="moveTotal()">
                    Total at: <strong>{{ totalPosition }}</strong>
                </button>
                <button type="button" class="sum__btn sum__btn--ghost" (click)="refresh()">
                    refreshSummary()
                </button>
            </div>
        </header>

        <dl class="sum__stats">
            <div class="sum__stat"><dt>Recomputes</dt><dd>{{ recomputeCount }}</dd></div>
            <div class="sum__stat"><dt>Summary rows</dt><dd>{{ summaryRowCount }}</dd></div>
            <div class="sum__stat sum__stat--wide">
                <dt>Last SUMMARY_CHANGED</dt>
                <dd class="sum__stat-text">{{ lastSummary }}</dd>
            </div>
        </dl>

        <section class="sum__grid">
            <photon-grid-angular
                [columns]="columns"
                [dataSet]="data"
                [options]="options"
                (gridReady)="onGridReady($event)"
                (summaryChanged)="onSummaryChanged($event)"
            ></photon-grid-angular>
        </section>
    `,
    styles: [`
        .sum__header {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 24px; flex-wrap: wrap; margin: 32px 0 12px;
        }
        .sum__title { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
        .sum__subtitle { margin: 0; max-width: 74ch; color: #64748b; font-size: 13px; line-height: 1.6; }
        .sum__controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sum__btn {
            border: 1px solid #cbd5e1; background: #2563eb; color: #fff;
            border-radius: 6px; padding: 7px 14px; font-size: 13px; font-weight: 500; cursor: pointer;
        }
        .sum__btn--ghost { background: #fff; color: #334155; }

        .sum__stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
        .sum__stat {
            flex: 1 1 130px; border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 8px 12px; background: #f8fafc;
        }
        .sum__stat--wide { flex: 3 1 320px; }
        .sum__stat dt { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
        .sum__stat dd { margin: 2px 0 0; font-size: 16px; font-weight: 600; color: #0f172a; }
        .sum__stat-text { font-size: 12px !important; font-weight: 400 !important; color: #475569 !important; }

        .sum__grid { height: 520px; }

        /* Cells the summary rows target by class name. Colours come from Photon
           theme tokens, so these follow light/dark and every variant instead of
           being pinned to one palette. */
        .sum-cell--label {
            font-weight: 700;
            letter-spacing: .02em;
            text-transform: uppercase;
            font-size: 11px;
            color: var(--pg-colors-text-secondary, #64748b);
        }
        .sum-cell--emphasis { color: var(--pg-colors-accent, #2563eb); }
        .sum-badge {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 2px 10px;
            border-radius: var(--pg-borders-radius-pill, 999px);
            background: var(--pg-colors-accent-soft, rgba(37, 99, 235, .12));
            color: var(--pg-colors-accent, #2563eb);
            font-variant-numeric: tabular-nums;
        }
    `],
})
export class SummaryGridComponent implements OnInit {
    columns: ColumnDef[] = [];
    readonly data = generateDeals(240);

    /** Live counters fed by `SUMMARY_CHANGED`, to make the recompute cadence visible. */
    recomputeCount = 0;
    summaryRowCount = 0;
    lastSummary = '—';

    averagesVisible = true;
    totalAggregate: SummaryAggregation = SummaryAggregation.Sum;
    totalPosition: SummaryPosition = SummaryPosition.Bottom;

    private api?: GridApi;

    /**
     * The component's own copy of the summary definitions.
     *
     * `GridApi` exposes `set` / `update` / `remove` but not a definition *read*
     * (`getSummary()` returns computed values, not the defs), so an app that
     * both patches individual rows and re-sets the whole list has to own the
     * list itself. Every handler below keeps this in step with the grid, which
     * is why cycling the total's aggregate and then toggling the Averages row
     * does not silently revert the cycle.
     */
    private rowDefs: SummaryRowDef[] = [];

    /**
     * The whole feature is configured declaratively here — no imperative setup
     * is needed for the common case. The buttons above exist only to exercise
     * the runtime API.
     */
    readonly options: GridOptions = {
        rowHeight: 40,
        showCheckboxes: true,
        showSerialNumber: true,
        showFilterRow: false,
        showVerticalBorders: true,
        selection: { mode: 'multiple', checkboxSelection: true },
        pagination: { enabled: true, page: 1, pageSize: 25, pageSizeOptions: [10, 25, 50, 100] },

        summary: {
            // Grid-wide defaults; every row below overrides only what it needs.
            // position: SummaryPosition.Top,
            sticky: true,
            scope: SummaryScope.Filtered,
            height: 38,

            // Registered by name, then referenced as `aggregate: 'median'`.
            // Anything pure is fair game — the engine only supplies the values.
            aggregations: {
                median: ({ values }) => {
                    const nums = values
                        .map(Number)
                        .filter(Number.isFinite)
                        .sort((a, b) => a - b);
                    if (nums.length === 0) return null;
                    const mid = nums.length >> 1;
                    return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
                },
                winRate: ({ rows }) => {
                    if (rows.length === 0) return null;
                    const won = rows.filter((r) => r.data['status'] === 'Won').length;
                    return `${Math.round((won / rows.length) * 100)}%`;
                },
            },

            rows: [
                // // ── 1. Page totals, flowing with the content ────────────────
                // // `Visible` sees only the rows pagination is currently showing,
                // // and `sticky: false` puts the band at the end of the scrollable
                // // content rather than docking it — so it scrolls away like a row.
                // {
                //     id: 'page',
                //     scope: SummaryScope.Visible,
                //     sticky: false,
                //     cells: {
                //         region: { value: 'This page', className: 'sum-cell--label' },
                //         amount: { aggregate: SummaryAggregation.Sum },
                //         margin: { aggregate: SummaryAggregation.Avg },
                //         units: { aggregate: SummaryAggregation.Sum },
                //     },
                // },

                // // ── 2. Selection totals ─────────────────────────────────────
                // // Recomputes on selection change alone — no pipeline run is
                // // involved, which is why the grid subscribes to the selection
                // // events separately when a row scopes this way.
                // {
                //     id: 'selected',
                //     scope: SummaryScope.Selected,
                //     cells: {
                //         region: { value: 'Selected', className: 'sum-cell--label' },
                //         // `count` counts rows carrying a value, so it doubles as
                //         // "how many are ticked".
                //         deal: { aggregate: SummaryAggregation.Count },
                //         amount: { aggregate: SummaryAggregation.Sum, className: 'sum-cell--emphasis' },
                //         units: { aggregate: SummaryAggregation.Sum },
                //     },
                // },

                // // ── 3. Averages, incl. the custom aggregations ──────────────
                // AVERAGES_ROW,

                // ── 4. Grand total ──────────────────────────────────────────
                {
                    id: 'total',
                    className: 'sum-row--total',
                    cells: {
                        // Spans its own column plus the next one, so the label
                        // has room without needing an empty neighbour.
                        deal: { value: 'Grand total', colSpan: 3, className: 'sum-cell--label' },
                        amount: {
                            aggregate: SummaryAggregation.Sum,
                            // A renderer owns the cell outright. It receives the
                            // raw value *and* the formatted string, so it can
                            // decorate rather than re-format.
                            // renderer: ({ formattedValue, rows }) =>
                            //     `<span class="sum-badge">${formattedValue} · ${rows.length} deals</span>`,
                            // tooltip: 'Sum of every deal matching the current filter',
                        },
                        margin: { aggregate: SummaryAggregation.Avg },
                        units: { aggregate: SummaryAggregation.Sum },
                    },
                },
            ],
        },
    };

    constructor(private readonly cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.columns = this.buildColumns();
        this.rowDefs = [...(this.options.summary?.rows ?? [])];
    }

    onGridReady(api: GridApi): void {
        this.api = api;
    }

    /**
     * Fires after every recompute, before the bands repaint — so reading
     * `getSummary()` here returns exactly what is about to appear.
     */
    onSummaryChanged(event: SummaryChangedEvent): void {
        this.recomputeCount++;
        this.summaryRowCount = event.summaries.length;

        const total = event.summaries.find((s) => s.id === 'total');
        this.lastSummary = total
            ? `total over ${total.rowCount} rows → ${total.cells.get('amount')?.formattedValue ?? '—'}`
            : `${event.summaries.length} row(s)`;

        this.cdr.markForCheck();
    }

    /** `removeSummaryRow` / `setSummaryRows` — definitions are mutable at runtime. */
    toggleAverages(): void {
        if (!this.api) return;

        if (this.averagesVisible) {
            // A targeted removal: the grid drops that one row and recomputes.
            this.api.removeSummaryRow('averages');
            this.rowDefs = this.rowDefs.filter((r) => r.id !== 'averages');
        } else {
            // `setSummaryRows` replaces the whole set, so the row is spliced
            // back in ahead of the grand total and the full list handed over.
            const insertAt = this.rowDefs.findIndex((r) => r.id === 'total');
            this.rowDefs.splice(insertAt < 0 ? this.rowDefs.length : insertAt, 0, AVERAGES_ROW);
            this.api.setSummaryRows(this.rowDefs);
        }
        this.averagesVisible = !this.averagesVisible;
    }

    /** `updateSummaryRow` — a one-cell patch, leaving the row's other cells intact. */
    cycleTotalAggregate(): void {
        const order = [SummaryAggregation.Sum, SummaryAggregation.Avg, SummaryAggregation.Max];
        this.totalAggregate = order[(order.indexOf(this.totalAggregate) + 1) % order.length];

        const patch: Partial<SummaryRowDef> = {
            cells: { units: { aggregate: this.totalAggregate } },
        };
        this.api?.updateSummaryRow('total', patch);
        this.patchLocal('total', patch);
    }

    /** `updateSummaryRow` again, this time moving the whole band to another edge. */
    moveTotal(): void {
        const order = [SummaryPosition.Bottom, SummaryPosition.Top, SummaryPosition.Both];
        this.totalPosition = order[(order.indexOf(this.totalPosition) + 1) % order.length];

        const patch: Partial<SummaryRowDef> = { position: this.totalPosition };
        this.api?.updateSummaryRow('total', patch);
        this.patchLocal('total', patch);
    }

    /** Only needed with `autoRefresh: false`, or after mutating row data in place. */
    refresh(): void {
        this.api?.refreshSummary();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Mirrors an `updateSummaryRow` patch onto {@link rowDefs}, using the same
     * one-level-deep `cells` merge the grid applies — so a later
     * `setSummaryRows` hands back definitions that match what is on screen.
     */
    private patchLocal(rowId: string, patch: Partial<SummaryRowDef>): void {
        const index = this.rowDefs.findIndex((r) => r.id === rowId);
        if (index === -1) return;
        const current = this.rowDefs[index];
        this.rowDefs[index] = {
            ...current,
            ...patch,
            id: rowId,
            cells: patch.cells ? { ...current.cells, ...patch.cells } : current.cells,
        };
    }

    private buildColumns(): ColumnDef[] {
        return [
            { colId: 'deal', field: 'deal', header: 'Deal', type: 'string', width: 150, pinned: 'left', filterable: true },
            { colId: 'region', field: 'region', header: 'Region', type: 'string', width: 130, filterable: true },
            { colId: 'channel', field: 'channel', header: 'Channel', type: 'string', width: 130, filterable: true },
            { colId: 'status', field: 'status', header: 'Status', type: 'string', width: 120, filterable: true },
            { colId: 'units', field: 'units', header: 'Units', type: 'number', width: 110, textAlign: 'right' },
            { colId: 'amount', field: 'amount', header: 'Amount', type: 'currency', width: 170, textAlign: 'right', filterable: true },
            {
                colId: 'margin', field: 'margin', header: 'Margin', type: 'number', width: 120, textAlign: 'right',
                // The summary's `avg` runs on the same logical values this
                // formatter presents, so the average reads in the same unit as
                // the cells above it.
                valueFormatter: ({ value }) =>
                    typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '',
            },
            { colId: 'closed', field: 'closed', header: 'Closed', type: 'date', minWidth: 140, flex: 1 },
        ] as ColumnDef[];
    }
}

/** Deterministic pseudo-data, so the totals are reproducible across reloads. */
function generateDeals(count: number): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];
    for (let index = 0; index < count; index++) {
        const seed = (index * 2654435761) % 1000003;
        rows.push({
            id: index + 1,
            deal: `DEAL-${String(index + 1).padStart(4, '0')}`,
            region: REGIONS[seed % REGIONS.length],
            channel: CHANNELS[(seed >> 3) % CHANNELS.length],
            status: STATUSES[(seed >> 5) % STATUSES.length],
            units: (seed % 90) + 1,
            amount: Math.round((seed % 480000) / 100) * 100 + 500,
            margin: ((seed % 340) + 40) / 1000,
            closed: new Date(2024, 0, 1 + (seed % 700)).toISOString().slice(0, 10),
        });
    }
    return rows;
}
