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
    /**
     * Row identity. `__photon_id__` is the field the core reads to derive
     * `RowNode.nodeId`, so seeding it with the symbol lets the feed address
     * rows by ticker and the grid resolve them in O(1).
     */
    readonly __photon_id__: string;
    readonly symbol: string;
    readonly name: string;
    /** Session opening price — the baseline Chg / Chg % are measured against. */
    readonly open: number;
    price: number;
    /**
     * Current step direction and strength, in `[-1, 1]`.
     *
     * Carried between ticks so the walk has momentum: prices form runs and
     * reversals instead of jittering around a flat line, which is what makes
     * the Trend sparkline show a real shape.
     */
    velocity: number;
    change: number;
    changePct: number;
    bid: number;
    ask: number;
    volume: number;
    spark: number[];
    /** Set from the row context menu — never by the feed. */
    watched: boolean;
    /** Set from the row context menu; blocks the Trade submenu while `true`. */
    halted: boolean;
    /** Not touched by the feed — proves untouched cells are never repainted. */
    readonly sector: string;
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

        <dl class="rt__stats">
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
        </dl>

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
    `],
})
export class RealtimeGridComponent implements OnInit, OnDestroy {
    /** How many rows each tick touches. */
    readonly rowsPerTick = 12;
    /** Feed period in milliseconds. */
    intervalMs = 100;

    columns: ColumnDef[] = [];
    data: Record<string, unknown>[] = [];

    readonly options: GridOptions = {
        columns: [],
        rowHeight: 40,
        showSerialNumber: true,
        showVerticalBorders: false,
        rowShading: false,
        mode: 'light',
        
        
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
            suppressItems: ['paste', 'copy', 'export', 'copyWithHeaders', 'chartRange'],
            items: [
                {
                    // A checkbox reads its state from the row. Toggles keep the
                    // menu open by default; `ctx.close()` overrides that so this
                    // one dismisses as soon as it is set.
                    id: 'watch',
                    type: 'checkbox',
                    label: 'Watchlist',
                    icon: 'eye',
                    kbd: 'W',
                    checked: (ctx) => this.isWatched(ctx.data),
                    action: (ctx) => {
                        this.setWatched(ctx.data, !this.isWatched(ctx.data));
                        ctx.close();
                    },
                },
                {
                    // Left open on purpose, for contrast: halting and un-halting
                    // several instruments in one visit needs no re-opening.
                    id: 'halt',
                    type: 'checkbox',
                    label: 'Trading halted',
                    icon: 'lock',
                    checked: (ctx) => ctx.data?.['halted'] === true,
                    action: (ctx) => {
                        this.toggleHalt(ctx.data);
                        ctx.close();
                    },
                },
                { type: 'separator' },
                {
                    id: 'trade',
                    label: (ctx) => `Trade ${String(ctx.data?.['symbol'] ?? '')}`,
                    // Custom icon renderer: a coloured dot reflecting direction,
                    // which the icon registry has no equivalent for.
                    icon: (ctx) => makeDirectionDot(Number(ctx.data?.['change'] ?? 0)),
                    // Halted instruments cannot be traded — the whole submenu
                    // greys out, chevron and all.
                    disabled: (ctx) => ctx.data?.['halted'] === true,
                    children: [
                        { id: 'buy', label: 'Buy', icon: 'add', action: (ctx) => this.trade(ctx.data, 'Buy') },
                        { id: 'sell', label: 'Sell', icon: 'minus', action: (ctx) => this.trade(ctx.data, 'Sell') },
                        { type: 'separator' },
                        {
                            id: 'alert',
                            label: 'Price alert',
                            icon: 'info',
                            // Third level — nesting is unbounded.
                            children: [
                                { id: 'alert-above', label: 'When above last', icon: 'sortAsc', action: (ctx) => this.alert(ctx.data, 'above') },
                                { id: 'alert-below', label: 'When below last', icon: 'sortDesc', action: (ctx) => this.alert(ctx.data, 'below') },
                            ],
                        },
                    ],
                },
                {
                    id: 'lots',
                    label: 'Default lot size',
                    icon: 'columns',
                    // A radio group: one option selected at a time, state owned
                    // by the application exactly like a checkbox.
                    children: ([100, 500, 1000] as const).map((size) => ({
                        type: 'radio' as const,
                        group: 'lotSize',
                        id: `lot-${size}`,
                        value: String(size),
                        label: size.toLocaleString('en-US'),
                        checked: () => this.lotSize === size,
                        action: () => this.setLotSize(size),
                    })),
                },
                { type: 'separator' },
                {
                    id: 'refresh',
                    // Async action: the item shows a spinner and the menu stays
                    // open until the promise settles.
                    label: 'Re-sync from server',
                    icon: 'refresh',
                    action: (ctx) => this.resyncInstrument(ctx.data),
                },
                {
                    id: 'delist',
                    label: 'Delist instrument',
                    icon: 'trash',
                    cssClass: 'rt-menu-danger',
                    // Declarative confirmation, rendered by the grid's dialog.
                    confirm: {
                        title: 'Delist instrument?',
                        message: (ctx) =>
                            `${String(ctx.data?.['symbol'])} will be removed from the board. This cannot be undone.`,
                        confirmLabel: 'Delist',
                        danger: true,
                    },
                    action: (ctx) => this.delist(ctx.data),
                },
            ],
            // Built per open, so the label can name the clicked instrument.
            getItems: (ctx) => {
                const symbol = ctx.data?.['symbol'];
                if (typeof symbol !== 'string') return [];
                return [{
                    id: 'copy-symbol',
                    label: `Copy "${symbol}"`,
                    icon: 'copy',
                    tooltip: 'Copies the ticker to the clipboard',
                    action: () => void navigator.clipboard?.writeText(symbol),
                }];
            },
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
        this.ticks = this.seedTicks();
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

            // Momentum-driven random walk. A pure per-tick coin flip produces a
            // flat, noisy line; carrying (and slowly mean-reverting) a velocity
            // term makes prices form visible runs and reversals, which is what
            // gives the Trend sparkline real shape.
            tick.velocity = tick.velocity * MOMENTUM + (Math.random() - 0.5) * (1 - MOMENTUM) * 2;
            tick.velocity = clamp(tick.velocity, -1, 1);

            const step = tick.velocity * tick.price * STEP_AMPLITUDE;
            const price = Math.max(1, tick.price + step);
            // Total move against the session's opening price — the number a
            // trading screen actually shows.
            const change = price - tick.open;
            const spread = Math.max(0.01, price * 0.0004);

            tick.price = price;
            tick.change = change;
            tick.spark = [...tick.spark.slice(1), round(price, 2)];

            updates.push({
                nodeId: tick.symbol,
                values: {
                    price: round(price, 2),
                    change: round(change, 2),
                    changePct: round((change / tick.open) * 100, 2),
                    bid: round(price - spread, 2),
                    ask: round(price + spread, 2),
                    volume: tick.volume + Math.floor(Math.random() * 5_000),
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

    private seedTicks(): Tick[] {
        return SYMBOLS.map((symbol, i) => {
            const open = round(20 + Math.random() * 480, 2);

            // Pre-run the same momentum walk the feed uses, so every row starts
            // with a trend line that already has character rather than a flat
            // band of noise waiting to develop.
            const spark: number[] = [];
            let price = open;
            let velocity = (Math.random() - 0.5) * 2;
            for (let p = 0; p < SPARK_POINTS; p++) {
                velocity = clamp(velocity * MOMENTUM + (Math.random() - 0.5) * (1 - MOMENTUM) * 2, -1, 1);
                price = Math.max(1, price + velocity * price * STEP_AMPLITUDE);
                spark.push(round(price, 2));
            }

            const change = price - open;
            return {
                __photon_id__: symbol,
                symbol,
                name: `${symbol} Holdings`,
                open,
                price: round(price, 2),
                velocity,
                change: round(change, 2),
                changePct: round((change / open) * 100, 2),
                bid: round(price - 0.02, 2),
                ask: round(price + 0.02, 2),
                volume: 100_000 + Math.floor(Math.random() * 900_000),
                spark,
                watched: false,
                halted: false,
                sector: SECTORS[i % SECTORS.length],
            };
        });
    }

    private buildColumns(): ColumnDef[] {
        return [
            { colId: 'symbol', field: 'symbol', header: 'Symbol', type: 'string', width: 100, pinned: 'left', filterable: true, configurable: true },
            { colId: 'name', field: 'name', header: 'Instrument', type: 'string', width: 180 },
            {
                colId: 'price',
                field: 'price',
                header: 'Last',
                type: 'number',
                width: 120,
                textAlign: 'right',
                // Custom renderer: rebuilt in place on change, never re-mounted.
                // Its element is created inside the *existing* cell, so the
                // cell's selection/focus state is untouched.
                renderer: {
                    display: (params: DisplayRendererParams) => {
                        const el = document.createElement('span');
                        el.className = 'rt-price';
                        el.style.textAlign = 'right';
                        el.style.width = '100%';
                        el.textContent = Number(params.value ?? 0).toFixed(2);
                        return el;
                    },
                },
            },
            {
                colId: 'change',
                field: 'change',
                header: 'Chg',
                type: 'number',
                width: 130,
                textAlign: 'right',
                // A value-dependent class: the patcher swaps it as the value
                // crosses zero without disturbing the cell's other classes.
                cellCssClass: (params) => directionClass(Number(params.value)),
                renderer: {
                    display: (params: DisplayRendererParams) => {
                        const value = Number(params.value ?? 0);
                        return renderDeltaBadge(value, value.toFixed(2));
                    },
                },
            },
            {
                colId: 'changePct',
                field: 'changePct',
                header: 'Chg %',
                type: 'number',
                width: 130,
                textAlign: 'right',
                cellCssClass: (params) => directionClass(Number(params.value)),
                renderer: {
                    display: (params: DisplayRendererParams) => {
                        const value = Number(params.value ?? 0);
                        return renderDeltaBadge(value, `${value.toFixed(2)}%`);
                    },
                },
            },
            { colId: 'bid', field: 'bid', header: 'Bid', type: 'number', width: 110, textAlign: 'right' },
            { colId: 'ask', field: 'ask', header: 'Ask', type: 'number', width: 110, textAlign: 'right' },
            {
                colId: 'volume',
                field: 'volume',
                header: 'Volume',
                type: 'currency',
                width: 130,
                textAlign: 'right',
                // valueFormatter: (params) => Number(params.value ?? 0).toLocaleString('en-US'),
            },
            {
        
                colId: 'spark',
                field: 'spark',
                header: 'Trend',
                type: 'sparkline',
                filterable: false,
                sortable: false,
                width: 250,
                minWidth: 250,
                sparkline: {
                    type: 'area',
                    // The default 'auto' baseline scales the axis to this
                    // series' own min…max, so the bars encode the price
                    // variation. With `baseline: 'zero'`, a series sitting
                    // around 300 would map onto a 0…305 axis and every bar
                    // would come out the same full height.
                    stroke: '#01500f',
                    fill: 'rgba(71, 163, 255, 0.16)',
                    barSpacing: 0.25,
                    padding: 4,
                    axisMax: 1000,
                    

                },
            },
            // Never touched by the feed — watch it stay perfectly still.
            { colId: 'sector', field: 'sector', header: 'Sector', type: 'string', minWidth: 150, flex: 1, filterable: true, configurable: true },
            // Driven only by the row context menu, so right-clicking a row and
            // choosing an action repaints exactly this one cell.
            {
                colId: 'status',
                field: 'watched',
                header: 'Flags',
                type: 'string',
                width: 120,
                renderer: {
                    display: (params: DisplayRendererParams) => {
                        const row = params.row as Record<string, unknown>;
                        const el = document.createElement('span');
                        el.className = 'rt-flags';
                        if (row['watched'] === true) el.appendChild(makeFlag('Watch', 'rt-flag--watch'));
                        if (row['halted'] === true) el.appendChild(makeFlag('Halted', 'rt-flag--halt'));
                        return el;
                    },
                },
            },
        ] as ColumnDef[];
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
