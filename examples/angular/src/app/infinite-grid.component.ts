import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { PhotonGridComponent } from 'photon-grid-angular';
import type { ColumnDef } from 'photon-grid-angular';
import { GridEventType } from 'photon-grid-core';
import type {
    GridApi,
    GridOptions,
    InfiniteStats,
    RowDropPayload,
    ServerSideDatasource,
    ServerSideRequest,
} from 'photon-grid-core';

/** Rows in the simulated backend. Large enough that materialising them all is impossible. */
const TOTAL_ROWS = 1_000_000;
/** Artificial latency, so skeletons are actually visible while scrolling. */
const LATENCY_MS = 260;

const REGIONS = ['EMEA', 'AMER', 'APAC', 'LATAM'];
const STATUSES = ['Active', 'Pending', 'Suspended', 'Closed'];

/**
 * Infinite-scrolling demo over a million rows.
 *
 * Nothing is loaded up front: the datasource is asked for pages only as they
 * approach the viewport, responses are cached under an LRU bound, and rows that
 * have not arrived render as skeletons. The stats strip is the evidence — watch
 * `cached pages` stay at its ceiling while `rows` stays at a million, and watch
 * `cache hits` climb when you scroll back over ground you have already covered.
 *
 * The datasource below is the **same `ServerSideDatasource` contract** the
 * server-side row model uses, so switching `rowModel` between `'server'` and
 * `'infinite'` needs no datasource changes at all.
 */
@Component({
    selector: 'app-infinite-grid',
    standalone: true,
    imports: [PhotonGridComponent, CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    template: `
        <header class="inf__header">
            <div>
                <h2 class="inf__title">Infinite Scrolling</h2>
                <p class="inf__subtitle">
                    <strong>{{ totalRows | number }}</strong> rows behind a mock backend with
                    <strong>{{ latency }} ms</strong> latency. Pages load as they come into
                    view, are prefetched one ahead, and are evicted LRU past
                    <strong>{{ maxCachedPages }}</strong> pages — so memory stays flat no
                    matter how far you scroll. Drag the scrollbar to the middle: the grid
                    jumps there instantly and fills in.
                </p>
            </div>

            <div class="inf__controls">
                <button type="button" class="inf__btn" (click)="jumpTo(0.5)">Jump to 50%</button>
                <button type="button" class="inf__btn" (click)="jumpTo(1)">Jump to end</button>
                <button type="button" class="inf__btn inf__btn--ghost" (click)="refresh()">
                    Refresh (purge)
                </button>
                <label class="inf__toggle">
                    <input type="checkbox" [checked]="failNext" (change)="toggleFailure($event)" />
                    Fail next request
                </label>
            </div>
        </header>

        <dl class="inf__stats">
            <div class="inf__stat"><dt>Rows</dt><dd>{{ stats.totalRows | number }}</dd></div>
            <div class="inf__stat"><dt>Page size</dt><dd>{{ stats.pageSize }}</dd></div>
            <div class="inf__stat inf__stat--accent"><dt>Cached pages</dt><dd>{{ stats.cachedPages }}</dd></div>
            <div class="inf__stat"><dt>In flight</dt><dd>{{ stats.inFlight }}</dd></div>
            <div class="inf__stat"><dt>Queued</dt><dd>{{ stats.queued }}</dd></div>
            <div class="inf__stat"><dt>Cache hits</dt><dd>{{ stats.cacheHits | number }}</dd></div>
            <div class="inf__stat"><dt>Cache misses</dt><dd>{{ stats.cacheMisses | number }}</dd></div>
            <div class="inf__stat"><dt>Requests</dt><dd>{{ requestCount | number }}</dd></div>
            <div class="inf__stat" [class.inf__stat--warn]="stats.pagesFailed > 0">
                <dt>Failed</dt><dd>{{ stats.pagesFailed }}</dd>
            </div>
            <div class="inf__stat inf__stat--wide"><dt>Last event</dt>
                <dd class="inf__stat-text">{{ lastEvent }}</dd>
            </div>
        </dl>

        <section class="inf__grid">
            <photon-grid-angular
                [columns]="columns"
                [options]="options"
                (gridReady)="onGridReady($event)"
            ></photon-grid-angular>
        </section>
    `,
    styles: [`
        .inf__header {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 24px; flex-wrap: wrap; margin: 32px 0 12px;
        }
        .inf__title { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
        .inf__subtitle { margin: 0; max-width: 74ch; color: #64748b; font-size: 13px; line-height: 1.6; }
        .inf__controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .inf__btn {
            border: 1px solid #cbd5e1; background: #2563eb; color: #fff;
            border-radius: 6px; padding: 7px 14px; font-size: 13px; font-weight: 500; cursor: pointer;
        }
        .inf__btn--ghost { background: #fff; color: #334155; }
        .inf__toggle { font-size: 13px; color: #475569; display: flex; align-items: center; gap: 6px; }

        .inf__stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
        .inf__stat {
            flex: 1 1 110px; border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 8px 12px; background: #f8fafc;
        }
        .inf__stat dt { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
        .inf__stat dd {
            margin: 2px 0 0; font-size: 18px; font-weight: 600;
            font-variant-numeric: tabular-nums; color: #0f172a;
        }
        .inf__stat--accent dd { color: #2563eb; }
        .inf__stat--warn dd { color: #dc2626; }
        .inf__stat--wide { flex: 2 1 260px; }
        .inf__stat-text { font-size: 13px; font-weight: 500; }

        .inf__grid { height: 560px; }
    `],
})
export class InfiniteGridComponent implements OnInit, OnDestroy {
    readonly totalRows = TOTAL_ROWS;
    readonly latency = LATENCY_MS;
    readonly maxCachedPages = 15;

    columns: ColumnDef[] = [];
    requestCount = 0;
    lastEvent = 'idle';
    failNext = false;

    stats: InfiniteStats = {
        totalRows: 0, pageSize: 0, cachedPages: 0, inFlight: 0, queued: 0,
        cacheHits: 0, cacheMisses: 0, pagesLoaded: 0, pagesFailed: 0,
    };

    /**
     * The mock backend.
     *
     * Rows are generated from their absolute index rather than stored, which is
     * the whole point of the demo: neither the "server" nor the grid ever holds
     * a million rows in memory.
     */
    private readonly datasource: ServerSideDatasource = {
        getRows: ({ request, signal, success, fail }) => {
            this.requestCount++;
            const timer = setTimeout(() => {
                if (signal.aborted) return;
                if (this.failNext) {
                    this.failNext = false;
                    fail(new Error(`Simulated failure for rows ${request.startRow}–${request.endRow}`));
                    return;
                }
                success({ rows: this.generateRows(request), totalRows: TOTAL_ROWS });
            }, LATENCY_MS);

            // Honouring the signal is what makes scrolling past a pending page
            // free: the request is dropped rather than delivered and discarded.
            signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
        },
    };

    readonly options: GridOptions = {
        columns: [],
        rowModel: 'infinite',
        rowHeight: 40,
        showSerialNumber: false,
        serverSideDatasource: this.datasource,
        infinite: {
            pageSize: 100,
            preloadPages: 1,
            maxCachedPages: 15,
            maxConcurrentRequests: 3,
            debounce: 60,
            maxRetries: 1,
            onDataRequest: (e) => this.note(`request page ${e.page} (${e.reason})`),
            onDataReceived: (e) => this.note(`page ${e.page} in ${e.durationMs} ms`),
            onCacheHit: (e) => this.note(`cache hit page ${e.page}`),
            onError: (e) => this.note(`✕ page ${e.page}: ${e.message}`),
        },
    } as GridOptions;

    private api: GridApi | null = null;
    private statsTimer: ReturnType<typeof setInterval> | null = null;

    constructor(private readonly cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.columns = this.buildColumns();
    }

    ngOnDestroy(): void {
        if (this.statsTimer !== null) clearInterval(this.statsTimer);
    }

    onGridReady(api: GridApi): void {
        this.api = api;

        // Unmanaged row drag: the grid runs the drag and its preview but never
        // reorders — the datasource owns row order here. ROW_DROP arrives as a
        // *request*, which a real app would POST before refreshing. The mock
        // backend has no notion of order, so this only reports the move.
        api.on<RowDropPayload>(GridEventType.ROW_DROP, (e) => {
            this.note(
                `drop ${String(e.draggedRows[0]?.data['reference'])} `
                + `${e.position} ${String(e.targetRow.data['reference'])} `
                + `(${e.fromIndex} → ${e.toIndex}, managed: ${e.managed})`,
            );
            this.cdr.markForCheck();
            // Real backend: await api.moveRow(...) then
            // this.api?.refreshInfinite({ purge: true });
        });

        // Polled rather than pushed: the stats are a diagnostic overlay, and
        // repainting them on every page event would dominate the very work the
        // demo is measuring.
        this.statsTimer = setInterval(() => {
            this.stats = api.getInfiniteStats() ?? this.stats;
            this.cdr.markForCheck();
        }, 400);
    }

    /** Scrolls to a fraction of the dataset, to show that any row is reachable. */
    jumpTo(fraction: number): void {
        const index = Math.min(TOTAL_ROWS - 1, Math.floor(TOTAL_ROWS * fraction));
        this.api?.ensureIndexVisible(index);
    }

    /** Drops every cached page and reloads what is on screen. */
    refresh(): void {
        this.api?.refreshInfinite({ purge: true });
        this.note('refresh (purged)');
    }

    toggleFailure(event: Event): void {
        this.failNext = (event.target as HTMLInputElement).checked;
    }

    private note(text: string): void {
        this.lastEvent = text;
    }

    /** Deterministic pseudo-data derived from the absolute row index. */
    private generateRows(request: ServerSideRequest): Record<string, unknown>[] {
        const end = Math.min(request.endRow, TOTAL_ROWS);
        const rows: Record<string, unknown>[] = [];

        for (let index = request.startRow; index < end; index++) {
            const seed = index * 2654435761 % 1000003;
            rows.push({
                __photon_id__: `row-${index}`,
                id: index + 1,
                reference: `TXN-${String(index).padStart(7, '0')}`,
                customer: `Customer ${(seed % 9973).toString(36).toUpperCase()}`,
                region: REGIONS[seed % REGIONS.length],
                status: STATUSES[(seed >> 3) % STATUSES.length],
                amount: Math.round((seed % 250000) / 100) * 100,
                opened: new Date(2020, 0, 1 + (seed % 1800)).toISOString().slice(0, 10),
            });
        }
        return rows;
    }

    private buildColumns(): ColumnDef[] {
        return [
            { colId: 'id', field: 'id', header: '#', type: 'number', width: 110, pinned: 'left' },
            { colId: 'reference', field: 'reference', header: 'Reference', type: 'string', width: 170, rowDrag: true, },
            { colId: 'customer', field: 'customer', header: 'Customer', type: 'string', width: 220, filterable: true, configurable: true },
            { colId: 'region', field: 'region', header: 'Region', type: 'string', width: 130, filterable: true },
            { colId: 'status', field: 'status', header: 'Status', type: 'string', width: 140, filterable: true },
            { colId: 'amount', field: 'amount', header: 'Amount', type: 'currency', width: 150, textAlign: 'right' },
            { colId: 'opened', field: 'opened', header: 'Opened', type: 'date', minWidth: 140, flex: 1 },
        ] as ColumnDef[];
    }
}
