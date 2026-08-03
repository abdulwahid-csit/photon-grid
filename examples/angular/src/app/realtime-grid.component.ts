import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    NgZone,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { PhotonGridComponent } from 'photon-grid-angular';
import type { ColumnDef } from 'photon-grid-angular';
import type {
    CellUpdate,
    DisplayRendererParams,
    GridApi,
    GridOptions,
    RowMenuItemClickedEvent,
    RowMenuItemErrorEvent,
    VDomStats,
} from 'photon-grid-core';
import { GridEventType } from 'photon-grid-core';

/** One instrument in the simulated market feed. */
interface Tick {
    readonly __photon_id__: string;

    readonly ticker: string;
    readonly company: string;
    readonly instrument: string;

    pnl: number;
    roi: number;

    totalValue: number;
    marketValue: number;

    quantity: number;

    spark: number[];

    velocity: number;
}

/** How much of the previous step's direction carries into the next one. */
const MOMENTUM = 0.82;
/** Peak per-tick move as a fraction of price, at full velocity. */
const STEP_AMPLITUDE = 0.012;
/** Number of points retained in each instrument's trend series. */
const SPARK_POINTS = 24;

const SECTORS = ['Technology', 'Financials', 'Energy', 'Healthcare', 'Industrials'];
const SYMBOLS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'JPM', 'V',
    'UNH', 'XOM', 'JNJ', 'WMT', 'MA', 'PG', 'AVGO', 'HD', 'CVX', 'MRK',
    'ABBV', 'COST', 'PEP', 'ADBE', 'KO', 'CSCO', 'CRM', 'TMO', 'ACN', 'MCD',
    'BAC', 'NFLX', 'AMD', 'LIN', 'ABT', 'DIS', 'WFC', 'TXN', 'DHR', 'VZ',
];

/**
 * Real-time streaming demo for the viewport Virtual DOM.
 *
 * A simulated market feed mutates a slice of rows on every tick. Instead of
 * re-running the row pipeline and rebuilding rows, the component hands the
 * changed fields to {@link GridApi.applyCellUpdates}: the grid diffs the
 * rendered window against its virtual mirror and writes only the cells whose
 * values actually moved.
 *
 * What to look for while it runs:
 * - The **Sector** column never repaints — the feed never touches it.
 * - Scrolling stays smooth at full tick rate, because the diff is bounded by
 *   the viewport rather than by the 40-row (or 40 000-row) dataset.
 * - Select a range, hover a row, or open an editor (double-click a cell): none
 *   of it is disturbed by the stream, because no cell element is replaced.
 * - The stats strip shows how many cells were *compared* versus how many were
 *   actually *written*.
 */
@Component({
    selector: 'app-realtime-grid',
    standalone: true,
    imports: [PhotonGridComponent, CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // The cell renderers below build DOM inside the grid, not inside this
    // component's template, so scoped styles would never reach them. Every
    // selector in this file is namespaced under `rt-` / `rt__`.
    encapsulation: ViewEncapsulation.None,
    template: `
        <header class="rt__header">
            <div>
                <h2 class="rt__title">Real-Time Virtual DOM</h2>
                <p class="rt__subtitle">
                    A simulated market feed updating
                    <strong>{{ rowsPerTick }}</strong> rows every
                    <strong>{{ intervalMs }} ms</strong> through
                    <code>api.applyCellUpdates()</code>. Only the cells whose values
                    changed are written to the DOM — rows are never rebuilt, so
                    selection, hover and open editors survive the stream.
                </p>
            </div>

            <div class="rt__controls">
                <button type="button" class="rt__btn" (click)="toggle()">
                    {{ running ? 'Pause feed' : 'Start feed' }}
                </button>
                <button type="button" class="rt__btn rt__btn--ghost" (click)="resetStats()">
                    Reset stats
                </button>
                <label class="rt__rate">
                    Rate
                    <select [value]="intervalMs" (change)="onRateChange($event)">
                        <option [value]="500">2 / sec</option>
                        <option [value]="100">10 / sec</option>
                        <option [value]="33">30 / sec</option>
                        <option [value]="16">60 / sec</option>
                    </select>
                </label>
            </div>
        </header>

        <!-- <dl class="rt__stats">
            <div class="rt__stat">
                <dt>Updates pushed</dt>
                <dd>{{ updatesPushed | number }}</dd>
            </div>
            <div class="rt__stat">
                <dt>Cells compared</dt>
                <dd>{{ stats.cellsCompared | number }}</dd>
            </div>
            <div class="rt__stat rt__stat--accent">
                <dt>Cells written</dt>
                <dd>{{ stats.cellsPatched | number }}</dd>
            </div>
            <div class="rt__stat">
                <dt>Written / compared</dt>
                <dd>{{ writtenRatio }}%</dd>
            </div>
            <div class="rt__stat">
                <dt>Tracked cells</dt>
                <dd>{{ stats.trackedCells | number }}</dd>
            </div>
            <div class="rt__stat">
                <dt>Last flush</dt>
                <dd>{{ stats.lastFlushMs.toFixed(2) }} ms</dd>
            </div>
            <div class="rt__stat" [class.rt__stat--warn]="fps < 50">
                <dt>FPS</dt>
                <dd>{{ fps }}</dd>
            </div>
            <div class="rt__stat rt__stat--wide">
                <dt>Last row-menu action</dt>
                <dd class="rt__stat-text">{{ lastMenuAction }}</dd>
            </div>
        </dl> -->

        <section class="rt__grid">
            <photon-grid-angular
                [columns]="columns"
                [dataSet]="data"
                [options]="options"
                (gridReady)="onGridReady($event)"
            ></photon-grid-angular>
        </section>
    `,
    styles: [`
        .rt__header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            flex-wrap: wrap;
            margin: 32px 0 12px;
        }
        .rt__title { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
        .rt__subtitle { margin: 0; max-width: 70ch; color: #64748b; font-size: 13px; line-height: 1.6; }
        .rt__controls { display: flex; align-items: center; gap: 8px; }
        .rt__btn {
            border: 1px solid #cbd5e1;
            background: #2563eb;
            color: #fff;
            border-radius: 6px;
            padding: 7px 14px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
        }
        .rt__btn--ghost { background: #fff; color: #334155; }
        .rt__rate { font-size: 13px; color: #475569; display: flex; align-items: center; gap: 6px; }
        .rt__rate select { padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd5e1; }

        .rt__stats {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 0 0 12px;
        }
        .pg-symbol-cell{
    display:flex;
    align-items:center;
    gap:10px;
    height:100%;
}

.pg-symbol-logo{
    width:34px;
    height:34px;
    border-radius:10px;
    object-fit:cover;
    box-shadow:0 2px 8px rgba(0,0,0,.15);
}

.pg-symbol{
    font-weight:700;
    font-size:13px;
}

.pg-exchange{
    font-size:11px;
    color:#8b8b8b;
}

.pg-company-title{
    font-weight:600;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
}

.pg-company-sub{
    display:flex;
    align-items:center;
    gap:6px;
    font-size:11px;
    color:#888;
}

.pg-live-dot{
    width:8px;
    height:8px;
    border-radius:50%;
    background:#23c552;
    animation: pulse 1.6s infinite;
}

@keyframes pulse{
    0%{transform:scale(.9);box-shadow:0 0 0 0 rgba(35,197,82,.5);}
    70%{transform:scale(1);box-shadow:0 0 0 8px rgba(35,197,82,0);}
    100%{transform:scale(.9);}
}

.pg-status-list{
    display:flex;
    gap:6px;
    flex-wrap:wrap;
}

.pg-status{
    display:inline-flex;
    align-items:center;
    gap:4px;
    padding:3px 8px;
    border-radius:999px;
    font-size:11px;
    font-weight:600;
}

.pg-status.success{
    background:#e8fff0;
    color:#14a44d;
}

.pg-status.warning{
    background:#fff6de;
    color:#d48806;
}

.pg-status.primary{
    background:#e9f3ff;
    color:#1677ff;
}

.pg-status.danger{
    background:#ffeaea;
    color:#d93025;
}
        .rt__stat {
            flex: 1 1 130px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
            background: #f8fafc;
        }
        .rt__stat dt { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
        .rt__stat dd { margin: 2px 0 0; font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; color: #0f172a; }
        .rt__stat--accent dd { color: #2563eb; }
        .rt__stat--wide { flex: 2 1 220px; }
        .rt__stat-text { font-size: 13px; font-weight: 500; }        .rt__stat--warn dd { color: #dc2626; }

        .rt__grid { height: 520px; }

        /* ── Cell renderers ───────────────────────────────────────────────────
           These rules style elements built by the column renderers, which the
           grid creates directly in its own DOM — outside Angular's template.
           They are therefore declared with ViewEncapsulation.None (see the
           component metadata) and namespaced under \`rt-\` so nothing leaks. */

        .rt-price {
            font-variant-numeric: tabular-nums;
            font-weight: 600;
            color: #0f172a;
        }

        .rt-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            min-width: 82px;
            justify-content: flex-end;
            padding: 3px 9px;
            border-radius: 999px;
            border: 1px solid transparent;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.4;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }
        .rt-badge__arrow { font-size: 9px; line-height: 1; }
        .rt-badge__value { letter-spacing: 0.01em; }

        .rt-badge--up {
            background: #dcfce7;
            border-color: #86efac;
            color: #15803d;
        }
        .rt-badge--down {
            background: #fee2e2;
            border-color: #fca5a5;
            color: #b91c1c;
        }
        .rt-badge--flat {
            background: #f1f5f9;
            border-color: #e2e8f0;
            color: #64748b;
        }

        /* Direction tint on the cell itself, driven by \`cellCssClass\`. */
        // .rt-cell--up   { background: rgba(34, 197, 94, 0.05); }
        // .rt-cell--down { background: rgba(239, 68, 68, 0.05); }

        /* Flags column — written only by the row context menu, never by the feed. */
        .rt-flags { display: inline-flex; gap: 4px; }
        .rt-flag {
            display: inline-flex;
            align-items: center;
            padding: 2px 7px;
            border-radius: 999px;
            border: 1px solid transparent;
            font-size: 11px;
            font-weight: 600;
        }
        .rt-flag--watch { background: #e0e7ff; border-color: #a5b4fc; color: #4338ca; }
        .rt-flag--halt  { background: #fef3c7; border-color: #fcd34d; color: #b45309; }

        /* Row-menu extras. The dot is built by a custom \`icon\` renderer; the
           danger class comes from an item's \`cssClass\`. */
        .rt-menu-dot { width: 8px; height: 8px; border-radius: 999px; }
        .rt-menu-danger .pg-context-menu__label { color: #dc2626; }
        .portfolio-company{
    display:flex;
    align-items:center;
    gap:10px;
    height:100%;
}

.portfolio-logo{
    width:28px;
    height:28px;
    border-radius:50%;
    object-fit:cover;
    flex-shrink:0;
    border:1px solid #e6e6e6;
    background:#fff;
}

.portfolio-company-info{
    overflow:hidden;
}

.portfolio-ticker{
    font-weight:700;
    color:#222;
    font-size:14px;
    line-height:18px;
}

.portfolio-company-name{
    color:#666;
    font-size:13px;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
}

.portfolio-value{
    display:flex;
    justify-content:flex-end;
    align-items:center;
    gap:10px;
    width:100%;
}

.portfolio-positive{
    color:#1ea94b;
    font-weight:500;
    font-variant-numeric:tabular-nums;
}

.portfolio-negative{
    color:#ff2b63;
    font-weight:500;
    font-variant-numeric:tabular-nums;
}

.portfolio-badge{
    background:#b9ddb3;
    color:#23402a;
    border-radius:999px;
    padding:3px 10px;
    font-size:13px;
    font-weight:500;
    min-width:58px;
    text-align:center;
    font-variant-numeric:tabular-nums;
}
    `],
})
export class RealtimeGridComponent implements OnInit, OnDestroy {
    /** How many rows each tick touches. */
    readonly rowsPerTick = 12;
    /** Feed period in milliseconds. */
    intervalMs = 50;

    columns: ColumnDef[] = [];
    data: Record<string, unknown>[] = [];

    readonly options: GridOptions = {
        rowHeight: 40,
        showSerialNumber: false,
        showVerticalBorders: false,
        rowShading: false,
        mode: 'light',
        showGroupingBar: true,
        
        
        // variant: 'quantum',

        /**
         * Custom right-click actions for a row.
         *
         * Exercises the whole item surface: `type: 'separator'` entries,
         * checkbox and radio items, dynamic labels and icons, a custom icon
         * renderer, a confirmed destructive action, an async action with a
         * busy state, unbounded nesting, and `disabled` / `hidden` predicates
         * evaluated against the row that was actually clicked.
         */
        rowMenu: {
            // suppressItems: ['paste', 'copy', 'export', 'copyWithHeaders', 'chartRange'],
        //     items: [
        //         {
        //             // A checkbox reads its state from the row. Toggles keep the
        //             // menu open by default; `ctx.close()` overrides that so this
        //             // one dismisses as soon as it is set.
        //             id: 'watch',
        //             type: 'checkbox',
        //             label: 'Watchlist',
        //             icon: 'eye',
        //             kbd: 'W',
        //             checked: (ctx) => this.isWatched(ctx.data),
        //             action: (ctx) => {
        //                 this.setWatched(ctx.data, !this.isWatched(ctx.data));
        //                 ctx.close();
        //             },
        //         },
        //         {
        //             // Left open on purpose, for contrast: halting and un-halting
        //             // several instruments in one visit needs no re-opening.
        //             id: 'halt',
        //             type: 'checkbox',
        //             label: 'Trading halted',
        //             icon: 'lock',
        //             checked: (ctx) => ctx.data?.['halted'] === true,
        //             action: (ctx) => {
        //                 this.toggleHalt(ctx.data);
        //                 ctx.close();
        //             },
        //         },
        //         { type: 'separator' },
        //         {
        //             id: 'trade',
        //             label: (ctx) => `Trade ${String(ctx.data?.['symbol'] ?? '')}`,
        //             // Custom icon renderer: a coloured dot reflecting direction,
        //             // which the icon registry has no equivalent for.
        //             icon: (ctx) => makeDirectionDot(Number(ctx.data?.['change'] ?? 0)),
        //             // Halted instruments cannot be traded — the whole submenu
        //             // greys out, chevron and all.
        //             disabled: (ctx) => ctx.data?.['halted'] === true,
        //             children: [
        //                 { id: 'buy', label: 'Buy', icon: 'add', action: (ctx) => this.trade(ctx.data, 'Buy') },
        //                 { id: 'sell', label: 'Sell', icon: 'minus', action: (ctx) => this.trade(ctx.data, 'Sell') },
        //                 { type: 'separator' },
        //                 {
        //                     id: 'alert',
        //                     label: 'Price alert',
        //                     icon: 'info',
        //                     // Third level — nesting is unbounded.
        //                     children: [
        //                         { id: 'alert-above', label: 'When above last', icon: 'sortAsc', action: (ctx) => this.alert(ctx.data, 'above') },
        //                         { id: 'alert-below', label: 'When below last', icon: 'sortDesc', action: (ctx) => this.alert(ctx.data, 'below') },
        //                     ],
        //                 },
        //             ],
        //         },
        //         {
        //             id: 'lots',
        //             label: 'Default lot size',
        //             icon: 'columns',
        //             // A radio group: one option selected at a time, state owned
        //             // by the application exactly like a checkbox.
        //             children: ([100, 500, 1000] as const).map((size) => ({
        //                 type: 'radio' as const,
        //                 group: 'lotSize',
        //                 id: `lot-${size}`,
        //                 value: String(size),
        //                 label: size.toLocaleString('en-US'),
        //                 checked: () => this.lotSize === size,
        //                 action: () => this.setLotSize(size),
        //             })),
        //         },
        //         { type: 'separator' },
        //         {
        //             id: 'refresh',
        //             // Async action: the item shows a spinner and the menu stays
        //             // open until the promise settles.
        //             label: 'Re-sync from server',
        //             icon: 'refresh',
        //             action: (ctx) => this.resyncInstrument(ctx.data),
        //         },
        //         {
        //             id: 'delist',
        //             label: 'Delist instrument',
        //             icon: 'trash',
        //             cssClass: 'rt-menu-danger',
        //             // Declarative confirmation, rendered by the grid's dialog.
        //             confirm: {
        //                 title: 'Delist instrument?',
        //                 message: (ctx) =>
        //                     `${String(ctx.data?.['symbol'])} will be removed from the board. This cannot be undone.`,
        //                 confirmLabel: 'Delist',
        //                 danger: true,
        //             },
        //             action: (ctx) => this.delist(ctx.data),
        //         },
        //     ],
        //     // Built per open, so the label can name the clicked instrument.
        //     getItems: (ctx) => {
        //         const symbol = ctx.data?.['symbol'];
        //         if (typeof symbol !== 'string') return [];
        //         return [{
        //             id: 'copy-symbol',
        //             label: `Copy "${symbol}"`,
        //             icon: 'copy',
        //             tooltip: 'Copies the ticker to the clipboard',
        //             action: () => void navigator.clipboard?.writeText(symbol),
        //         }];
        //     },
        },
    } ;

    /** Default lot size, driven by the radio group in the row menu. */
    lotSize: 100 | 500 | 1000 = 100;

    /** Last row-menu activation, surfaced in the stats strip. */
    lastMenuAction = '—';

    running = false;
    updatesPushed = 0;
    fps = 60;
    stats: VDomStats = {
        trackedRows: 0, trackedCells: 0, cellsCompared: 0, cellsPatched: 0,
        cellsReRendered: 0, cellsDeferred: 0, flushes: 0, lastFlushMs: 0,
    };

    private api: GridApi | null = null;
    /** Tears down the row-menu event subscription on destroy. */
    private menuUnsubscribe: (() => void) | null = null;
    /** Tears down the row-menu error subscription on destroy. */
    private menuErrorUnsubscribe: (() => void) | null = null;
    private ticks: Tick[] = [];
    private feedHandle: ReturnType<typeof setInterval> | null = null;
    private statsHandle: ReturnType<typeof setInterval> | null = null;
    private frameHandle = 0;
    private frameCount = 0;
    private lastFpsSample = 0;
    private cursor = 0;

    constructor(
        private readonly zone: NgZone,
        private readonly cdr: ChangeDetectorRef,
    ) {}

    get writtenRatio(): string {
        if (this.stats.cellsCompared === 0) return '0.0';
        return ((this.stats.cellsPatched / this.stats.cellsCompared) * 100).toFixed(1);
    }

    // ── Row context-menu handlers ─────────────────────────────────────────────
    // Each one mutates the row through `applyCellUpdates`, the same path the
    // feed uses — so a menu action repaints exactly the cells it changed and
    // never rebuilds the row.

    /** `true` when the instrument is on the watchlist. */
    private isWatched(data: Record<string, unknown> | null): boolean {
        return data?.['watched'] === true;
    }

    private setWatched(data: Record<string, unknown> | null, watched: boolean): void {
        this.pushRowChange(data, { watched }, watched ? 'Watchlist +' : 'Watchlist −');
    }

    private toggleHalt(data: Record<string, unknown> | null): void {
        const halted = data?.['halted'] !== true;
        this.pushRowChange(data, { halted }, halted ? 'Halted' : 'Resumed');
    }

    private trade(data: Record<string, unknown> | null, side: 'Buy' | 'Sell'): void {
        this.noteAction(`${side} ${this.lotSize} ${String(data?.['symbol'] ?? '')}`);
    }

    /** Selects the default lot size — the state the radio group reads. */
    private setLotSize(size: 100 | 500 | 1000): void {
        this.lotSize = size;
        this.noteAction(`Lot size ${size}`);
    }

    /**
     * A deliberately slow action, to show the async lifecycle: the item spins
     * and the menu stays open until the promise settles.
     */
    private async resyncInstrument(data: Record<string, unknown> | null): Promise<void> {
        const symbol = String(data?.['symbol'] ?? '');
        await new Promise((r) => setTimeout(r, 3300));
        // Reject occasionally so ROW_MENU_ITEM_ERROR is observable in the demo.
        if (Math.random() < 0.25) throw new Error(`Re-sync failed for ${symbol}`);
        this.noteAction(`Re-synced ${symbol}`);
    }

    /** Destructive action, gated by the declarative confirmation dialog. */
    private delist(data: Record<string, unknown> | null): void {
        const nodeId = data?.['__photon_id__'];
        if (typeof nodeId !== 'string' || !this.api) return;
        this.api.removeRows([nodeId]);
        this.ticks = this.ticks.filter((t) => t.__photon_id__ !== nodeId);
        this.noteAction(`Delisted ${String(data?.['symbol'] ?? '')}`);
    }

    private alert(data: Record<string, unknown> | null, direction: 'above' | 'below'): void {
        this.noteAction(`Alert ${direction} ${String(data?.['price'] ?? '')}`);
    }

    /** Applies a field change to one row and records it in the stats strip. */
    private pushRowChange(
        data: Record<string, unknown> | null,
        values: Record<string, unknown>,
        note: string,
    ): void {
        const nodeId = data?.['__photon_id__'];
        if (typeof nodeId !== 'string' || !this.api) return;
        this.api.applyCellUpdates([{ nodeId, values }]);
        this.noteAction(`${note} ${String(data?.['symbol'] ?? '')}`);
    }

    /** Shows the most recent menu activation in the stats strip. */
    private noteAction(text: string): void {
        this.lastMenuAction = text;
        this.cdr.markForCheck();
    }

    ngOnInit(): void {
    this.ticks = this.buildData().map(row => ({
        ...row,
        __photon_id__: row.ticker,
        velocity: (Math.random() - 0.5) * 2,
    }));

    this.data = this.ticks as unknown as Record<string, unknown>[];
    this.columns = this.buildColumns();
}

    ngOnDestroy(): void {
        this.stop();
        this.menuUnsubscribe?.();
        this.menuUnsubscribe = null;
        this.menuErrorUnsubscribe?.();
        this.menuErrorUnsubscribe = null;
    }

    onGridReady(api: GridApi): void {
        this.api = api;

        // Menu activations are also published on the event bus, covering the
        // built-in entries as well as the custom ones — useful for logging or
        // analytics without touching every item definition.
        this.menuUnsubscribe = api.on<RowMenuItemClickedEvent>(
            GridEventType.ROW_MENU_ITEM_CLICKED,
            (e) => console.log('[row menu]', e.custom ? 'custom' : 'built-in', e.itemId, e.row?.data),
        );

        // A rejected async action leaves the menu open and reports here, so an
        // application can surface a toast instead of failing silently.
        this.menuErrorUnsubscribe = api.on<RowMenuItemErrorEvent>(
            GridEventType.ROW_MENU_ITEM_ERROR,
            (e) => this.noteAction(`✕ ${String((e.error as Error)?.message ?? e.itemId)}`),
        );

        this.start();
    }

    toggle(): void {
        if (this.running) this.stop();
        else this.start();
    }

    onRateChange(event: Event): void {
        this.intervalMs = Number((event.target as HTMLSelectElement).value);
        if (this.running) { this.stop(); this.start(); }
    }

    resetStats(): void {
        this.updatesPushed = 0;
        this.api?.resetVDomStats();
        this.pullStats();
    }

    /**
     * Starts the feed **outside Angular's zone**.
     *
     * A 60 Hz `setInterval` inside the zone would trigger change detection on
     * every tick and dominate the very cost this demo is about. The grid is not
     * an Angular-rendered view — it patches its own DOM — so the only thing
     * Angular needs to know about is the once-per-second stats refresh.
     */
    private start(): void {
        if (this.running || !this.api) return;
        this.running = true;

        this.zone.runOutsideAngular(() => {
            this.feedHandle = setInterval(() => this.pushTick(), this.intervalMs);

            this.lastFpsSample = performance.now();
            this.frameCount = 0;
            const sampleFrame = (): void => {
                this.frameCount++;
                this.frameHandle = requestAnimationFrame(sampleFrame);
            };
            this.frameHandle = requestAnimationFrame(sampleFrame);
        });

        // Stats are display-only, so they re-enter the zone once a second
        // rather than on every tick.
        this.statsHandle = setInterval(() => this.pullStats(), 1000);
    }

    private stop(): void {
        this.running = false;
        if (this.feedHandle !== null) { clearInterval(this.feedHandle); this.feedHandle = null; }
        if (this.statsHandle !== null) { clearInterval(this.statsHandle); this.statsHandle = null; }
        if (this.frameHandle !== 0) { cancelAnimationFrame(this.frameHandle); this.frameHandle = 0; }
        this.cdr.markForCheck();
    }

    /**
     * Produces one batch of updates.
     *
     * Only the fields that moved are included — the grid diffs them anyway, but
     * sending a narrow payload keeps the comparison cost proportional to the
     * change rather than to the row width.
     */
  private pushTick(): void {
    if (!this.api) return;

    const updates: CellUpdate[] = [];

    for (let i = 0; i < this.rowsPerTick; i++) {

        const tick = this.ticks[this.cursor];
        this.cursor = (this.cursor + 1) % this.ticks.length;

        // Normal movement
        tick.velocity =
            tick.velocity * 0.82 +
            (Math.random() - 0.5) * 0.6;

        // Random market events
        const r = Math.random();

        if (r < 0.03) {
            // Huge spike/crash (3%)
            tick.velocity += (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 6);
        } else if (r < 0.12) {
            // Medium move (9%)
            tick.velocity += (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 3);
        }

        // Don't clamp too aggressively
        tick.velocity = clamp(tick.velocity, -8, 8);

        const pnlDelta = tick.velocity * (2 + Math.random() * 5);

        tick.pnl = round(tick.pnl + pnlDelta, 2);

        tick.roi = Math.max(
            0,
            round(
                tick.roi +
                    pnlDelta * 0.18 +
                    (Math.random() - 0.5) * 2,
                2
            )
        );

        tick.totalValue = round(
            tick.totalValue +
                pnlDelta * (15 + Math.random() * 30),
            2
        );

        tick.marketValue = Math.max(
            0,
            round(
                tick.marketValue +
                    pnlDelta * (8 + Math.random() * 15),
                2
            )
        );

        // Occasionally rebalance holdings
        if (Math.random() < 0.12) {
            tick.quantity = Math.max(
                1,
                tick.quantity + Math.floor(Math.random() * 120 - 60)
            );
        }

        // Make the sparkline jump dramatically sometimes
        const last = tick.spark[tick.spark.length - 1];

        let sparkDelta = tick.velocity * 4 + (Math.random() - 0.5) * 8;

        if (Math.random() < 0.05) {
            sparkDelta += (Math.random() > 0.5 ? 40 : -40);
        }

        const next = Math.max(5, last + sparkDelta);

        tick.spark = [
            ...tick.spark.slice(1),
            round(next, 2),
        ];

        updates.push({
            nodeId: tick.ticker,
            values: {
                pnl: tick.pnl,
                roi: tick.roi,
                totalValue: tick.totalValue,
                marketValue: tick.marketValue,
                quantity: tick.quantity,
                spark: tick.spark,
            },
        });
    }

    this.api.applyCellUpdates(updates);
    this.updatesPushed += updates.length;
}
    /** Copies the grid's counters into the view and samples the frame rate. */
    private pullStats(): void {
        if (!this.api) return;
        this.stats = this.api.getVDomStats();

        const now = performance.now();
        const elapsed = now - this.lastFpsSample;
        if (elapsed > 0) {
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastFpsSample = now;
        }
        this.cdr.markForCheck();
    }

    // private seedTicks(): Tick[] {
    //     return SYMBOLS.map((symbol, i) => {
    //         const open = round(20 + Math.random() * 480, 2);

    //         // Pre-run the same momentum walk the feed uses, so every row starts
    //         // with a trend line that already has character rather than a flat
    //         // band of noise waiting to develop.
    //         const spark: number[] = [];
    //         let price = open;
    //         let velocity = (Math.random() - 0.5) * 2;
    //         for (let p = 0; p < SPARK_POINTS; p++) {
    //             velocity = clamp(velocity * MOMENTUM + (Math.random() - 0.5) * (1 - MOMENTUM) * 2, -1, 1);
    //             price = Math.max(1, price + velocity * price * STEP_AMPLITUDE);
    //             spark.push(round(price, 2));
    //         }

    //         const change = price - open;
    //         return {
    //             __photon_id__: symbol,
    //             symbol,
    //             name: `${symbol} Holdings`,
    //             open,
    //             price: round(price, 2),
    //             velocity,
    //             change: round(change, 2),
    //             changePct: round((change / open) * 100, 2),
    //             bid: round(price - 0.02, 2),
    //             ask: round(price + 0.02, 2),
    //             volume: 100_000 + Math.floor(Math.random() * 900_000),
    //             spark,
    //             watched: false,
    //             halted: false,
    //             sector: SECTORS[i % SECTORS.length],
    //         };
    //     });
    // }

    private buildColumns(): ColumnDef[] {
    return [
        {
    colId: 'ticker',
    field: 'ticker',
    header: 'Ticker',
    width: 340,
    type: 'string',
    renderer: {
        display: (params: DisplayRendererParams) => {
            const row = params.row as any;

            const root = document.createElement('div');
            root.className = 'portfolio-company';

            const logo = document.createElement('img');
            logo.className = 'portfolio-logo';
            logo.src = `https://logo.clearbit.com/${row.company
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .split(' ')[0]
                .toLowerCase()}.com`;

            logo.onerror = () => {
                logo.src = `https://ui-avatars.com/api/?background=random&color=fff&name=${row.ticker}`;
            };

            const content = document.createElement('div');
            content.className = 'portfolio-company-info';

            const ticker = document.createElement('div');
            ticker.className = 'portfolio-ticker';
            ticker.textContent = row.ticker;

            const company = document.createElement('div');
            company.className = 'portfolio-company-name';
            company.textContent = row.company;

            content.append(ticker, company);
            root.append(logo, content);

            return root;
        },
    },
},

        {
                    colId: 'spark',
                    field: 'spark',
                    header: 'Trend',
                    type: 'sparkline',
                    width: 280,
                    minWidth: 280,
                    sortable: false,
                    filterable: false,
                    sparkline: {
                        type: 'column',
                        stroke: '#7bacfa',
                        fill: '#4c8df6',
                    },
                },

        {
                    colId: 'instrument',
                    field: 'instrument',
                    header: 'Instrument',
                    width: 160,
                     flex: 1,
                     textAlign: 'right',
                },
                

        {
    colId: 'pnl',
    field: 'pnl',
    header: 'P&L',
    width: 190,
    textAlign: 'right',
    renderer: {
        display: (params: DisplayRendererParams) => {

            const row = params.row as any;

            const positive = row.pnl >= 0;

            const root = document.createElement('div');
            root.className = 'portfolio-value';

            const value = document.createElement('span');
            value.className = positive
                ? 'portfolio-positive'
                : 'portfolio-negative';

            value.textContent =
                `${positive ? '↑' : '↓'} ${Math.abs(row.pnl).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}`;

            const badge = document.createElement('span');
            badge.className = 'portfolio-badge';
            badge.textContent = row.roi.toLocaleString(undefined, {
                maximumFractionDigits: 2,
            });

            root.append(value, badge);

            return root;
        },
    },
     flex: 1,
},
                {
    colId: 'totalValue',
    field: 'totalValue',
    header: 'Total Value',
    width: 210,
    textAlign: 'right',
    renderer: {
        display: (params: DisplayRendererParams) => {

            const row = params.row as any;

            const positive = row.totalValue >= 0;

            const root = document.createElement('div');
            root.className = 'portfolio-value';

            const value = document.createElement('span');
            value.className = positive
                ? 'portfolio-positive'
                : 'portfolio-negative';

            value.textContent =
                `${positive ? '↑' : '↓'} ${Math.abs(row.totalValue).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}`;

            const badge = document.createElement('span');
            badge.className = 'portfolio-badge';
            badge.textContent = row.marketValue.toLocaleString(undefined, {
                maximumFractionDigits: 2,
            });

            root.append(value, badge);

            return root;
        },
    },
     flex: 1,
},

        {
                    colId: 'quantity',
                    field: 'quantity',
                    header: 'Quantity',
                    width: 120,
                    textAlign: 'right',
                    flex: 1,
                },
    ];
}


 private buildData() {
    const seed = [
        {
            ticker: 'US10Y',
            company: 'U.S. Treasury 10-Year Bond',
            instrument: 'Bond',
            pnl: -136.02,
            roi: 177.28,
            totalValue: -13602.03,
            marketValue: 17727.93,
            quantity: 1000,
        },
        {
            ticker: 'CAD30Y',
            company: 'Canada 30-Year Government Bond',
            instrument: 'Bond',
            pnl: 261.25,
            roi: 0,
            totalValue: 25080.29,
            marketValue: 0,
            quantity: 550,
        },
        {
            ticker: 'MUB',
            company: 'iShares National Muni Bond ETF',
            instrument: 'ETF',
            pnl: 12.47,
            roi: 20.86,
            totalValue: 1434.57,
            marketValue: 2398.52,
            quantity: 75,
        },
        {
            ticker: 'BTC-USD',
            company: 'Bitcoin',
            instrument: 'Crypto',
            pnl: -0.15,
            roi: 0.08,
            totalValue: -4613.8,
            marketValue: 2384.89,
            quantity: 200,
        },
        {
            ticker: 'T',
            company: 'AT&T Inc.',
            instrument: 'Stock',
            pnl: -142.3,
            roi: 81.88,
            totalValue: -2845.99,
            marketValue: 1637.56,
            quantity: 100,
        },
        {
            ticker: 'FRN2027',
            company: 'France Government Bond 2027',
            instrument: 'Bond',
            pnl: 131.84,
            roi: 0,
            totalValue: 13447.48,
            marketValue: 0,
            quantity: 400,
        },
        {
            ticker: 'ADI',
            company: 'Analog Devices Inc.',
            instrument: 'Stock',
            pnl: -6.8,
            roi: 2.08,
            totalValue: -1088.74,
            marketValue: 332.59,
            quantity: 30,
        },
        {
            ticker: 'AIG',
            company: 'American International Group',
            instrument: 'Stock',
            pnl: -13.68,
            roi: 42.19,
            totalValue: -711.39,
            marketValue: 2193.77,
            quantity: 80,
        },
        {
            ticker: 'DAL',
            company: 'Delta Air Lines Inc.',
            instrument: 'Stock',
            pnl: -21.58,
            roi: 31.86,
            totalValue: -863.17,
            marketValue: 1274.47,
            quantity: 70,
        },
        {
            ticker: 'BP',
            company: 'BP plc',
            instrument: 'Stock',
            pnl: 4.01,
            roi: 10.92,
            totalValue: 1221.87,
            marketValue: 3329.25,
            quantity: 75,
        },
        {
            ticker: 'MA',
            company: 'Mastercard Inc.',
            instrument: 'Stock',
            pnl: -0.58,
            roi: 0.82,
            totalValue: -201.45,
            marketValue: 288.23,
            quantity: 15,
        },
        {
            ticker: 'VGT',
            company: 'Vanguard Information Technology ETF',
            instrument: 'ETF',
            pnl: -0.82,
            roi: 2.05,
            totalValue: -304.66,
            marketValue: 758.33,
            quantity: 25,
        },
    ];

    return Array.from({ length: 100 }, (_, index) => {
        const item = seed[index % seed.length];

        return {
            __photon_id__: `${item.ticker}-${index}`,
            ticker: `${item.ticker}${Math.floor(index / seed.length) || ''}`,
            company: item.company,
            instrument: item.instrument,
            pnl: +(item.pnl + (Math.random() - 0.5) * 100).toFixed(2),
            roi: +(item.roi + Math.random() * 25).toFixed(2),
            totalValue: +(item.totalValue + (Math.random() - 0.5) * 5000).toFixed(2),
            marketValue: Math.max(
                0,
                +(item.marketValue + Math.random() * 5000).toFixed(2)
            ),
            quantity: item.quantity + Math.floor(Math.random() * 500),
            spark: randomSpark(),
        };
    });
}
}

/** Rounds to `dp` decimals — keeps streamed values stable for the diff. */
function round(value: number, dp: number): number {
    const f = 10 ** dp;
    return Math.round(value * f) / f;
}

/** A small pill used by the Flags column. */
function makeFlag(text: string, modifier: string): HTMLElement {
    const el = document.createElement('span');
    el.className = `rt-flag ${modifier}`;
    el.textContent = text;
    return el;
}

/**
 * Custom menu icon: a dot tinted by the instrument's direction.
 *
 * Shows the `icon` renderer form — the icon registry has no per-value coloured
 * dot, and returning an element avoids inventing one just for this menu.
 */
function makeDirectionDot(change: number): HTMLElement {
    const el = document.createElement('span');
    el.className = 'rt-menu-dot';
    el.style.background = change > 0 ? '#16a34a' : change < 0 ? '#dc2626' : '#94a3b8';
    return el;
}

/** Constrains `value` to the inclusive `[min, max]` range. */
function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * Modifier for a value's direction, applied to the whole cell.
 *
 * Returned from `cellCssClass`, so the Virtual DOM's patcher swaps it the
 * moment a value crosses zero — without touching the selection, hover or
 * alignment classes that share the same class list.
 */
function directionClass(value: number): string {
    if (value > 0) return 'rt-cell--up';
    if (value < 0) return 'rt-cell--down';
    return 'rt-cell--flat';
}

/**
 * Builds a success / danger pill for a signed delta.
 *
 * Shared by **Chg** and **Chg %** so the two columns can never drift apart
 * visually — the only difference is the pre-formatted text they pass in.
 *
 * The element is created fresh on each patch but lands **inside the existing
 * cell**, so the cell's own state (selection, focus, an open editor) is never
 * disturbed by a value update.
 *
 * @param value - Signed delta, used only to pick the tone and arrow.
 * @param text  - Pre-formatted label (`"1.24"`, `"0.82%"`).
 */
function renderDeltaBadge(value: number, text: string): HTMLElement {
    const tone = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';

    const badge = document.createElement('span');
    badge.className = `rt-badge rt-badge--${tone}`;

    const arrow = document.createElement('span');
    arrow.className = 'rt-badge__arrow';
    arrow.textContent = tone === 'up' ? '▲' : tone === 'down' ? '▼' : '•';
    arrow.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'rt-badge__value';
    // The arrow already carries the sign, so the label shows magnitude only —
    // except at zero, where an unsigned "0.00" is the clearest reading.
    label.textContent = tone === 'flat' ? text : text.replace('-', '');

    badge.appendChild(arrow);
    badge.appendChild(label);
    return badge;


   
}


function randomSpark(): number[] {
    let value = 100;

    return Array.from({ length: 28 }, () => {
        value += (Math.random() - 0.5) * 15;
        return Math.max(10, Math.round(value));
    });
}