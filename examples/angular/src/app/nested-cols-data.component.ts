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
    RowMenuItemClickedEvent,
    RowMenuItemErrorEvent,
    VDomStats,
} from 'photon-grid-core';
import {GridOptions} from 'photon-grid-angular'
import { GridEventType, PhotonAIProviderType } from 'photon-grid-core';
import { environment } from '../environments/environment';

interface StockRow {
    symbol: string;
    name: string;
    sector: string;
    price: number;
    change: number;
    changePct: number;
    previousClose: number;
    bid: number;
    bidSize: number;
    ask: number;
    askSize: number;
    volume: number;
    avgVolume: number;
    marketCap: number;
    dayRange: string;
    week52Range: string;
    spark: number[];
    exchange: string;
    country: string;
    currency: string;
    watched: boolean;
    halted: boolean;
    alerts: number;
}

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
    selector: 'app-nested-cols',
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

            
        </header>

        <section class="rt__grid">
            <photon-grid-angular
                [columns]="columns"
                [dataSet]="data"
                [options]="options"
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
export class NestedColComponent implements OnInit, OnDestroy {
    /** How many rows each tick touches. */
    readonly rowsPerTick = 12;
    /** Feed period in milliseconds. */
    intervalMs = 100;

    columns: ColumnDef[] = [];
    data: any = [];

    readonly options: GridOptions = {
        rowHeight: 40,
        showSerialNumber: true,
        showVerticalBorders: false,
        rowShading: false,
        rowDrag: {managed: true},
        filtersToolPanel: {enabled: true, defaultOpen: false},
        showGroupingBar: true,
        grouping: {enabled: true, showGroupCount: true, suppressAutoSize:true},
        

        mode: 'light',
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
}

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

    constructor(
        private readonly zone: NgZone,
        private readonly cdr: ChangeDetectorRef,
    ) {}

    /**
     * A deliberately slow action, to show the async lifecycle: the item spins
     * and the menu stays open until the promise settles.
     */
  

    /** Destructive action, gated by the declarative confirmation dialog. */
   

    

    /** Applies a field change to one row and records it in the stats strip. */
   

    /** Shows the most recent menu activation in the stats strip. */
   

    ngOnInit(): void {
        this.data = this.generateData();
        this.columns = this.buildColumns();
    }

    ngOnDestroy(): void {
        this.menuUnsubscribe?.();
        this.menuUnsubscribe = null;
        this.menuErrorUnsubscribe?.();
        this.menuErrorUnsubscribe = null;
    }

  
    private buildColumns(): ColumnDef[] {
    return [
        {
            colId: 'instrument',
            field: '',
            header: '📈 Instrument',
            children: [
                {
                    colId: 'symbol',
                    field: 'symbol',
                    header: 'Symbol',
                    type: 'string',
                    width: 120,
                    filterable: true,
                    configurable: true,
                },
                {
                    colId: 'name',
                    field: 'name',
                    header: 'Company',
                    rowDrag:  true,
                    type: 'string',
                    width: 220,
                },
                {
                    colId: 'sector',
                    field: 'sector',
                    header: 'Sector',
                    groupable: true,
                    type: 'string',
                    width: 170,
                    filterable: true,
                },
            ],
        },

        {
            colId: 'marketData',
            field: '',
            header: '💹 Market Data',
            children: [
                {
                    colId: 'price',
                    field: 'price',
                    header: 'Last',
                    type: 'number',
                    width: 120,
                    textAlign: 'right',
                },
                {
                    colId: 'change',
                    field: 'change',
                    header: 'Change',
                    type: 'number',
                    width: 120,
                    textAlign: 'right',
                },
                {
                    colId: 'changePct',
                    field: 'changePct',
                    header: 'Change %',
                    type: 'number',
                    width: 120,
                    textAlign: 'right',
                },
                {
                    colId: 'previousClose',
                    field: 'previousClose',
                    header: 'Prev Close',
                    type: 'number',
                    width: 130,
                    textAlign: 'right',
                },
            ],
        },

        {
            colId: 'orderBook',
            field: '',
            header: '📚 Order Book',
            children: [
                {
                    colId: 'bid',
                    field: 'bid',
                    header: 'Bid',
                    type: 'number',
                    width: 120,
                    textAlign: 'right',
                },
                {
                    colId: 'bidSize',
                    field: 'bidSize',
                    header: 'Bid Size',
                    type: 'number',
                    width: 120,
                    textAlign: 'right',
                },
                {
                    colId: 'ask',
                    field: 'ask',
                    header: 'Ask',
                    type: 'number',
                    width: 120,
                    textAlign: 'right',
                },
                {
                    colId: 'askSize',
                    field: 'askSize',
                    header: 'Ask Size',
                    type: 'number',
                    width: 120,
                    textAlign: 'right',
                },
            ],
        },

        {
            colId: 'statistics',
            field: '',
            header: '📊 Statistics',
            children: [
                {
                    colId: 'volume',
                    field: 'volume',
                    header: 'Volume',
                    type: 'currency',
                    width: 140,
                    textAlign: 'right',
                },
                {
                    colId: 'avgVolume',
                    field: 'avgVolume',
                    header: 'Avg Volume',
                    type: 'currency',
                    width: 150,
                    textAlign: 'right',
                },
                {
                    colId: 'marketCap',
                    field: 'marketCap',
                    header: 'Market Cap',
                    type: 'currency',
                    width: 160,
                    textAlign: 'right',
                },
            ],
        },

        {
            colId: 'performance',
            field: '',
            header: '🚀 Performance',
            children: [
                {
                    colId: 'dayRange',
                    field: 'dayRange',
                    header: 'Day Range',
                    type: 'string',
                    width: 160,
                },
                {
                    colId: 'week52Range',
                    field: 'week52Range',
                    header: '52W Range',
                    type: 'string',
                    width: 160,
                },
                {
                    colId: 'spark',
                    field: 'spark',
                    header: 'Trend',
                    type: 'sparkline',
                    width: 250,
                    minWidth: 250,
                    sortable: false,
                    filterable: false,
                    sparkline: {
                        type: 'area',
                        stroke: '#0f9d58',
                        fill: 'rgba(15,157,88,.15)',
                        padding: 4,
                    },
                },
            ],
        },

        {
            colId: 'exchange',
            field: 'exchange',
            header: '🏛 Exchange',
            type: 'string',
            width: 140,
        },

        {
            colId: 'country',
            field: 'country',
            header: '🌍 Country',
            type: 'string',
            width: 140,
        },

        {
            colId: 'currency',
            field: 'currency',
            header: '💲 Currency',
            type: 'string',
            width: 120,
        },

        {
            colId: 'status',
            field: '',
            header: '⚡ Status',
            children: [
                {
                    colId: 'watched',
                    field: 'watched',
                    header: 'Watch',
                    type: 'boolean',
                    width: 100,
                },
                {
                    colId: 'halted',
                    field: 'halted',
                    header: 'Halted',
                    type: 'boolean',
                    width: 100,
                },
                {
                    colId: 'alerts',
                    field: 'alerts',
                    header: 'Alerts',
                    type: 'number',
                    width: 100,
                },
            ],
        },
    ];
}


// ---------- Seeded RNG so the mock data is reproducible ----------



private generateData(count: number = 100): StockRow[] {
    const rng = mulberry32(1337);

    const SECTORS = [
        'Technology', 'Healthcare', 'Financial Services', 'Energy',
        'Consumer Discretionary', 'Consumer Staples', 'Industrials',
        'Utilities', 'Real Estate', 'Materials', 'Communication Services'
    ];

    const VENUES = [
        { exchange: 'NASDAQ', country: 'United States', currency: 'USD' },
        { exchange: 'NYSE',   country: 'United States', currency: 'USD' },
        { exchange: 'LSE',    country: 'United Kingdom', currency: 'GBP' },
        { exchange: 'TSX',    country: 'Canada',         currency: 'CAD' },
        { exchange: 'XETRA',  country: 'Germany',        currency: 'EUR' },
        { exchange: 'Euronext', country: 'France',       currency: 'EUR' },
        { exchange: 'TSE',    country: 'Japan',          currency: 'JPY' },
        { exchange: 'ASX',    country: 'Australia',      currency: 'AUD' },
        { exchange: 'SGX',    country: 'Singapore',      currency: 'SGD' },
        { exchange: 'PSX',    country: 'Pakistan',       currency: 'PKR' }
    ];

    // A pool of real, well-known tickers to seed realistic-looking rows
    const BASE_COMPANIES: { symbol: string; name: string; sector: string }[] = [
        { symbol: 'AAPL',  name: 'Apple Inc.',              sector: 'Technology' },
        { symbol: 'MSFT',  name: 'Microsoft Corporation',   sector: 'Technology' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.',           sector: 'Communication Services' },
        { symbol: 'AMZN',  name: 'Amazon.com, Inc.',        sector: 'Consumer Discretionary' },
        { symbol: 'NVDA',  name: 'NVIDIA Corporation',      sector: 'Technology' },
        { symbol: 'META',  name: 'Meta Platforms, Inc.',    sector: 'Communication Services' },
        { symbol: 'TSLA',  name: 'Tesla, Inc.',             sector: 'Consumer Discretionary' },
        { symbol: 'JPM',   name: 'JPMorgan Chase & Co.',    sector: 'Financial Services' },
        { symbol: 'V',     name: 'Visa Inc.',               sector: 'Financial Services' },
        { symbol: 'JNJ',   name: 'Johnson & Johnson',       sector: 'Healthcare' },
        { symbol: 'UNH',   name: 'UnitedHealth Group Inc.', sector: 'Healthcare' },
        { symbol: 'XOM',   name: 'Exxon Mobil Corporation', sector: 'Energy' },
        { symbol: 'CVX',   name: 'Chevron Corporation',     sector: 'Energy' },
        { symbol: 'PG',    name: 'Procter & Gamble Co.',    sector: 'Consumer Staples' },
        { symbol: 'KO',    name: 'The Coca-Cola Company',   sector: 'Consumer Staples' },
        { symbol: 'HD',    name: 'The Home Depot, Inc.',    sector: 'Consumer Discretionary' },
        { symbol: 'BA',    name: 'The Boeing Company',      sector: 'Industrials' },
        { symbol: 'CAT',   name: 'Caterpillar Inc.',        sector: 'Industrials' },
        { symbol: 'NEE',   name: 'NextEra Energy, Inc.',    sector: 'Utilities' },
        { symbol: 'DUK',   name: 'Duke Energy Corporation', sector: 'Utilities' },
        { symbol: 'PLD',   name: 'Prologis, Inc.',          sector: 'Real Estate' },
        { symbol: 'SPG',   name: 'Simon Property Group',    sector: 'Real Estate' },
        { symbol: 'LIN',   name: 'Linde plc',               sector: 'Materials' },
        { symbol: 'NEM',   name: 'Newmont Corporation',     sector: 'Materials' },
        { symbol: 'DIS',   name: 'The Walt Disney Company', sector: 'Communication Services' },
        { symbol: 'NFLX',  name: 'Netflix, Inc.',           sector: 'Communication Services' },
        { symbol: 'ADBE',  name: 'Adobe Inc.',              sector: 'Technology' },
        { symbol: 'CRM',   name: 'Salesforce, Inc.',        sector: 'Technology' },
        { symbol: 'AMD',   name: 'Advanced Micro Devices',  sector: 'Technology' },
        { symbol: 'INTC',  name: 'Intel Corporation',       sector: 'Technology' }
    ];

    // Word banks used to synthesize additional companies once the base pool runs out
    const NAME_PREFIXES = [
        'Nexa', 'Vertex', 'Orion', 'Summit', 'Cobalt', 'Lumen', 'Atlas',
        'Quantum', 'Horizon', 'Pioneer', 'Meridian', 'Zenith', 'Fusion',
        'Catalyst', 'Ironclad', 'Apex', 'Nimbus', 'Sterling', 'Bright', 'Vantage'
    ];
    const NAME_SUFFIXES = [
        'Dynamics', 'Holdings', 'Systems', 'Group', 'Industries', 'Labs',
        'Networks', 'Ventures', 'Partners', 'Solutions', 'Technologies',
        'Materials', 'Energy', 'Capital', 'Robotics'
    ];
    const SYMBOL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    function synthesizeCompany(): { symbol: string; name: string; sector: string } {
        const prefix = pick(rng, NAME_PREFIXES);
        const suffix = pick(rng, NAME_SUFFIXES);
        const sector = pick(rng, SECTORS);

        let symbol = '';
        const len = intBetween(rng, 3, 4);
        for (let i = 0; i < len; i++) {
            symbol += SYMBOL_LETTERS[Math.floor(rng() * SYMBOL_LETTERS.length)];
        }

        return { symbol, name: `${prefix} ${suffix}`, sector };
    }

    function buildSpark(basePrice: number, points: number = 20): number[] {
        const spark: number[] = [];
        let value = basePrice * floatBetween(rng, 0.9, 1.1);

        for (let i = 0; i < points; i++) {
            value = value * (1 + floatBetween(rng, -0.015, 0.015));
            spark.push(round2(Math.max(value, 0.01)));
        }
        // make the last point line up with the actual current price
        spark[spark.length - 1] = round2(basePrice);
        return spark;
    }

    const rows: StockRow[] = [];

    for (let i = 0; i < count; i++) {
        const company = i < BASE_COMPANIES.length
            ? BASE_COMPANIES[i]
            : synthesizeCompany();

        const venue = pick(rng, VENUES);

        const previousClose = round2(floatBetween(rng, 8, 950));
        const changePct = floatBetween(rng, -6, 6);
        const change = round2(previousClose * (changePct / 100));
        const price = round2(previousClose + change);

        const spread = round2(Math.max(price * 0.0005, 0.01));
        const bid = round2(price - spread);
        const ask = round2(price + spread);
        const bidSize = intBetween(rng, 1, 50) * 100;
        const askSize = intBetween(rng, 1, 50) * 100;

        const volume = intBetween(rng, 100_000, 50_000_000);
        const avgVolume = Math.round(volume * floatBetween(rng, 0.7, 1.3));
        const sharesOutstanding = intBetween(rng, 5_000_000, 8_000_000_000);
        const marketCap = Math.round(price * sharesOutstanding);

        const dayLow = round2(Math.min(price, previousClose) * floatBetween(rng, 0.97, 1));
        const dayHigh = round2(Math.max(price, previousClose) * floatBetween(rng, 1, 1.03));
        const dayRange = `${dayLow.toFixed(2)} - ${dayHigh.toFixed(2)}`;

        const week52Low = round2(price * floatBetween(rng, 0.55, 0.85));
        const week52High = round2(price * floatBetween(rng, 1.15, 1.6));
        const week52Range = `${week52Low.toFixed(2)} - ${week52High.toFixed(2)}`;

        rows.push({
            symbol: company.symbol,
            name: company.name,
            sector: company.sector,
            price,
            change,
            changePct: round2(changePct),
            previousClose,
            bid,
            bidSize,
            ask,
            askSize,
            volume,
            avgVolume,
            marketCap,
            dayRange,
            week52Range,
            spark: buildSpark(price),
            exchange: venue.exchange,
            country: venue.country,
            currency: venue.currency,
            watched: rng() < 0.3,
            halted: rng() < 0.04,
            alerts: rng() < 0.5 ? intBetween(rng, 0, 5) : 0
        });
    }

    return rows;
}
}

function pick<T>(rng: () => number, arr: T[]): T {
    return arr[Math.floor(rng() * arr.length)];
}

function intBetween(rng: () => number, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
}

function floatBetween(rng: () => number, min: number, max: number): number {
    return rng() * (max - min) + min;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

function mulberry32(seed: number) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
