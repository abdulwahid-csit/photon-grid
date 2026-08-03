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
    CellButtonClickedEvent,
    CellValueChangedEvent,
    GridApi,
    GridOptions,
} from 'photon-grid-core';
import { GridEventType, getAllCountries } from 'photon-grid-core';

/**
 * One column per built-in cell renderer.
 *
 * The point of this demo is coverage rather than realism: every renderer
 * Photon ships gets a column, so the whole set is visible side by side and a
 * regression in any one of them is obvious on sight. The dataset is shaped
 * backwards from that — each field exists to feed exactly one renderer.
 *
 * Two columns deliberately declare **no** `renderer` (`quantity` and `price`):
 * they demonstrate that a column with a `type` already gets the right renderer
 * inferred, which is the path most real columns take.
 *
 * Every asset is inline. No flag CDN, no placeholder-image service — the demo
 * renders identically offline, and nothing here depends on a third party
 * staying up.
 */

/** Fulfilment state, used by the `badge` column. */
enum ShipmentStatus {
    Delivered = 'delivered',
    InTransit = 'in-transit',
    Delayed = 'delayed',
    Cancelled = 'cancelled',
}

/** Urgency, used by the `chip` column. */
enum Priority {
    Critical = 'critical',
    High = 'high',
    Normal = 'normal',
}

/** Direction of travel, used by the `icon` column. */
enum Trend {
    Up = 'up',
    Down = 'down',
    Flat = 'flat',
}

/**
 * One row. Each field is here to feed exactly one renderer.
 *
 * A `type` alias rather than an `interface` on purpose: the grid's `dataSet`
 * takes `Record<string, unknown>[]`, and only an alias picks up the implicit
 * index signature that makes it assignable.
 */
type ShowcaseRow = {
    readonly __photon_id__: string;
    readonly name: string;             // text
    readonly notes: string;            // multiline
    readonly quantity: number;         // number      (inferred)
    readonly price: number;            // currency    (inferred)
    readonly margin: number;           // percentage
    readonly backordered: boolean;     // boolean
    readonly orderedOn: string;        // date
    readonly updatedAt: string;        // datetime
    readonly shipsAt: string;          // time
    readonly leadTime: number;         // duration (seconds)
    readonly homepage: string;         // link
    readonly email: string;            // email
    readonly phone: string;            // phone
    readonly thumbnail: string;        // image
    readonly owner: string;            // avatar
    readonly country: string;          // country
    active: boolean;                   // checkbox (editable)
    notify: boolean;                   // switch   (editable)
    readonly status: ShipmentStatus;   // badge
    readonly priority: Priority;       // chip
    readonly team: string;             // tag
    readonly trend: Trend;             // icon
    readonly completion: number;       // progress
    readonly rating: number;           // rating
    readonly history: number[];        // sparkline
    readonly tags: string[];           // list
    readonly meta: Record<string, unknown>; // json
    readonly action: string;           // button
    readonly note: string;             // html
};

const ROW_COUNT = 60;

/**
 * A tiny inline SVG thumbnail.
 *
 * A data URI rather than a URL so the `image` column renders with no network
 * at all — a demo that shows broken-image icons when you are offline is
 * demonstrating the wrong thing.
 */
function thumbnailFor(hue: number): string {
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">` +
        `<rect width="64" height="64" rx="10" fill="hsl(${hue} 65% 55%)"/>` +
        `<circle cx="32" cy="26" r="11" fill="hsl(${hue} 70% 80%)"/>` +
        `<rect x="14" y="42" width="36" height="9" rx="4" fill="hsl(${hue} 70% 80%)"/>` +
        `</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PRODUCTS = [
    'Aurora 27" Monitor', 'Vertex Keyboard', 'Lumen Mouse', 'Nimbus Dock',
    'Atlas Stand', 'Cobalt Webcam', 'Zenith Headset', 'Meridian Lamp',
    'Fusion 2TB SSD', 'Apex Chair', 'Horizon Speaker', 'Solstice Hub',
];

const OWNERS = [
    'Amara Okafor', 'Tom Lindqvist', 'Priya Raman', 'Diego Ferreira',
    'Wei Zhang', 'Sofia Marchetti', 'Noah Bergman', 'Leila Haddad',
];

/**
 * Country values for the `country` column.
 *
 * The full ISO list lives in the core (`getAllCountries`), so the demo samples
 * from that rather than keeping a list of its own — the point being that an
 * application never has to. A handful of hand-written forms are mixed in on
 * purpose: the renderer normalises alpha-2, alpha-3, full names and the
 * informal spellings real data actually contains, and a column of clean ISO
 * codes would hide the part that matters.
 */
function buildCountryPool(): string[] {
  const all = getAllCountries();
  const sampled: string[] = [];
  // Every 12th entry, so the pool spans the whole alphabet rather than
  // clustering in the A's.
  for (let i = 0; i < all.length; i += 12) sampled.push(all[i].alpha2);
  return [
    ...sampled,
    'USA', 'GBR', 'DEU', 'PAK',           // alpha-3
    'Pakistan', 'Germany', 'Japan', 'France', // full names
    'UK', 'UAE', 'Holland', 'South Korea',    // informal aliases
  ];
}

const TEAMS = ['Platform', 'Logistics', 'Retail', 'Support', 'Finance'];
const TAG_POOL = ['urgent', 'bulk', 'fragile', 'refrigerated', 'gift', 'oversized'];
const STATUSES = Object.values(ShipmentStatus);
const PRIORITIES = Object.values(Priority);
const TRENDS = Object.values(Trend);

/**
 * Deterministic pseudo-random source.
 *
 * A seeded generator rather than `Math.random` so the demo looks the same on
 * every reload — which is what makes "did that column change?" a meaningful
 * question when you are eyeballing 29 renderers at once.
 */
function makeRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

function buildRows(count: number): ShowcaseRow[] {
    const random = makeRandom(20260803);
    const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
    const now = Date.now();
    const countries = buildCountryPool();

    return Array.from({ length: count }, (_, i) => {
        const name = PRODUCTS[i % PRODUCTS.length];
        const orderedOn = new Date(now - Math.floor(random() * 120) * 86_400_000);
        const updatedAt = new Date(orderedOn.getTime() + Math.floor(random() * 72) * 3_600_000);
        const owner = pick(OWNERS);

        return {
            __photon_id__: `showcase-${i}`,
            name,
            notes: `${name}\nSKU ${1000 + i} · lot ${String.fromCharCode(65 + (i % 6))}\nHandled by ${owner}`,
            quantity: 1 + Math.floor(random() * 240),
            price: Math.round((25 + random() * 1800) * 100) / 100,
            margin: Math.round(random() * 640) / 10,
            backordered: random() > 0.7,
            orderedOn: orderedOn.toISOString(),
            updatedAt: updatedAt.toISOString(),
            shipsAt: updatedAt.toISOString(),
            leadTime: Math.floor(random() * 172_800),
            homepage: `example.com/products/${1000 + i}`,
            email: `${owner.split(' ')[0].toLowerCase()}@example.com`,
            phone: `+1 (555) ${String(100 + (i % 900)).padStart(3, '0')}-${String(1000 + i * 7).slice(-4)}`,
            thumbnail: thumbnailFor((i * 37) % 360),
            owner,
            country: pick(countries),
            active: random() > 0.35,
            notify: random() > 0.5,
            status: pick(STATUSES),
            priority: pick(PRIORITIES),
            team: pick(TEAMS),
            trend: pick(TRENDS),
            completion: Math.floor(random() * 101),
            rating: 1 + Math.floor(random() * 5),
            history: Array.from({ length: 14 }, () => Math.round(40 + random() * 60)),
            tags: TAG_POOL.filter(() => random() > 0.65).slice(0, 4),
            meta: { lot: String.fromCharCode(65 + (i % 6)), rev: 1 + (i % 4) },
            action: 'Track',
            note: random() > 0.5 ? '<em>Signature</em> required' : '<strong>Leave</strong> at door',
        } satisfies ShowcaseRow;
    });
}

@Component({
    selector: 'app-renderer-showcase-grid',
    standalone: true,
    imports: [PhotonGridComponent, CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // The grid builds its cells outside this component's template, so scoped
    // styles would never reach them. Everything here is namespaced under `rs-`.
    encapsulation: ViewEncapsulation.None,
    template: `
        <header class="rs__header">
            <div class="rs__intro">
                <h2 class="rs__title">Built-in Renderers</h2>
                <p class="rs__subtitle">
                    One column per built-in renderer — {{ columns.length }} of them, in the
                    order they appear in <code>BuiltInRenderer</code>. Each column names its
                    renderer with <code>renderer: '…'</code>, except
                    <strong>Qty</strong> and <strong>Price</strong>, which declare only a
                    <code>type</code> and let the grid infer one. Scroll right for the rest.
                </p>
            </div>

            <div class="rs__status" role="status">
                <span class="rs__status-label">Last event</span>
                <span class="rs__status-text">{{ lastEvent }}</span>
            </div>
        </header>

        <section class="rs__grid">
            <photon-grid-angular
                [columns]="columns"
                [dataSet]="rows"
                [options]="options"
                (gridReady)="onGridReady($event)"
            ></photon-grid-angular>
        </section>
    `,
    styles: [`
        .rs__header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            flex-wrap: wrap;
            margin: 32px 0 12px;
        }
        .rs__intro { min-width: 0; }
        .rs__title { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
        .rs__subtitle {
            margin: 0;
            max-width: 78ch;
            color: #64748b;
            font-size: 13px;
            line-height: 1.5;
        }
        .rs__subtitle code {
            font-size: 12px;
            background: #f1f5f9;
            padding: 1px 5px;
            border-radius: 4px;
        }
        .rs__status {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 220px;
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #f8fafc;
        }
        .rs__status-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #64748b;
        }
        .rs__status-text { font-size: 13px; font-weight: 500; color: #0f172a; }

        .rs__grid { height: 560px; }
    `],
})
export class RendererShowcaseGridComponent implements OnInit {
    rows: ShowcaseRow[] = [];
    columns: ColumnDef[] = [];
    options: Partial<GridOptions> = {};

    lastEvent = 'toggle a checkbox, flip a switch, or press a Track button';

    private api: GridApi | null = null;

    constructor(private readonly cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.rows = buildRows(ROW_COUNT);
        this.columns = this.buildColumns();
        this.options = {
            columns: [],
            rowHeight: 46,
            headerRowHeight: 42,
            rowShading: true,
            showSerialNumber: true,
            // Every toggle column is editable, so the checkbox and switch
            // columns are live rather than a picture of a control.
            editing: { mode: 'cell' },
        };
    }

    onGridReady(api: GridApi): void {
        this.api = api;

        // A button column reports its click and nothing else — the grid has no
        // idea what "Track" means, which is the whole point of the event.
        api.on(GridEventType.CELL_BUTTON_CLICKED, (e: CellButtonClickedEvent) => {
            this.lastEvent = `${e.action} → ${String(e.row.data['name'])}`;
            this.cdr.markForCheck();
        });

        api.on(GridEventType.CELL_VALUE_CHANGED, (e: CellValueChangedEvent) => {
            this.lastEvent = `${e.colDef.header} = ${String(e.newValue)} (${String(e.row.data['name'])})`;
            this.cdr.markForCheck();
        });
    }

    /**
     * One column per renderer, in `BuiltInRenderer` declaration order.
     *
     * Kept as a flat literal rather than generated from the renderer list: each
     * one needs its own field and its own options, so a loop would only move
     * that per-renderer detail into a lookup table without removing it.
     */
    private buildColumns(): ColumnDef[] {
        return [
            { field: 'name', header: 'Text', type: 'string', renderer: 'text', width: 170, pinned: 'left' },

            {
                field: 'notes', header: 'Multiline', type: 'string', width: 220,
                renderer: { name: 'multiline', options: { maxLines: 2 } },
            },

            // No `renderer` — `type: 'number'` infers `number`.
            { field: 'quantity', header: 'Qty', type: 'number', width: 90 },
            // No `renderer` — `type: 'currency'` infers `currency`.
            { field: 'price', header: 'Price', type: 'currency', width: 120 },

            {
                field: 'margin', header: 'Margin', type: 'number', width: 100,
                renderer: { name: 'percentage', options: { maximumFractionDigits: 1 } },
            },

            // The textual Yes/No boolean — the explicit opt-out from the
            // interactive checkbox a `type: 'boolean'` column gets by default.
            { field: 'backordered', header: 'Boolean', type: 'boolean', renderer: 'boolean', width: 100 },

            { field: 'orderedOn', header: 'Date', type: 'date', renderer: 'date', width: 120 },
            { field: 'updatedAt', header: 'Datetime', type: 'datetime', renderer: 'datetime', width: 160 },
            { field: 'shipsAt', header: 'Time', type: 'time', renderer: 'time', width: 100 },

            {
                field: 'leadTime', header: 'Duration', type: 'duration', width: 110,
                renderer: { name: 'duration', options: { unit: 's' } },
            },

            { field: 'homepage', header: 'Link', type: 'url', renderer: 'link', width: 200 },
            { field: 'email', header: 'Email', type: 'email', renderer: 'email', width: 190 },
            { field: 'phone', header: 'Phone', type: 'phone', renderer: 'phone', width: 160 },

            {
                field: 'thumbnail', header: 'Image', type: 'image', width: 90, sortable: false,
                renderer: { name: 'image', options: { width: 30 } },
            },

            // No image data at all — the avatar falls back to coloured initials,
            // which is the state most rows in a real user table are in.
            { field: 'owner', header: 'Avatar', type: 'string', renderer: 'avatar', width: 90, sortable: false },

            {
                field: 'country', header: 'Country', type: 'string', width: 180,
                // Values are a deliberate mix of alpha-2, alpha-3, names and
                // informal forms; all of them resolve.
                renderer: 'country',
            },

            // Editable, so these two commit through the normal edit pipeline.
            { field: 'active', header: 'Checkbox', type: 'boolean', renderer: 'checkbox', editable: true, width: 100 },
            { field: 'notify', header: 'Switch', type: 'boolean', renderer: 'switch', editable: true, width: 90 },

            {
                field: 'status', header: 'Badge', type: 'dropdown', width: 130, renderer: 'badge',
                dropdownOptions: [
                    { value: ShipmentStatus.Delivered, label: 'Delivered', color: '#16a34a' },
                    { value: ShipmentStatus.InTransit, label: 'In transit', color: '#2563eb' },
                    { value: ShipmentStatus.Delayed, label: 'Delayed', color: '#f59e0b' },
                    { value: ShipmentStatus.Cancelled, label: 'Cancelled', color: '#dc2626' },
                ],
            },

            {
                field: 'priority', header: 'Chip', type: 'dropdown', width: 130,
                renderer: {
                    name: 'chip',
                    options: {
                        icon: (value) =>
                            value === Priority.Critical ? 'error'
                                : value === Priority.High ? 'warning'
                                    : 'info',
                    },
                },
                dropdownOptions: [
                    { value: Priority.Critical, label: 'Critical', color: '#dc2626' },
                    { value: Priority.High, label: 'High', color: '#f59e0b' },
                    { value: Priority.Normal, label: 'Normal', color: '#64748b' },
                ],
            },

            // No `dropdownOptions` — `tag` derives a stable colour from the
            // value itself, which is what suits an open-ended vocabulary.
            { field: 'team', header: 'Tag', type: 'string', renderer: 'tag', width: 120 },

            {
                field: 'trend', header: 'Icon', type: 'string', width: 90, sortable: false,
                renderer: {
                    name: 'icon',
                    options: {
                        icon: (value) =>
                            value === Trend.Up ? 'arrowUp' : value === Trend.Down ? 'sortDesc' : 'minus',
                        color: (value) =>
                            value === Trend.Up ? '#16a34a' : value === Trend.Down ? '#dc2626' : '#94a3b8',
                    },
                },
            },

            {
                field: 'completion', header: 'Progress', type: 'number', width: 160,
                renderer: {
                    name: 'progress',
                    options: {
                        max: 100,
                        color: (fraction) =>
                            fraction >= 0.8 ? '#16a34a' : fraction >= 0.4 ? '#2563eb' : '#f59e0b',
                    },
                },
            },

            {
                field: 'rating', header: 'Rating', type: 'number', width: 120,
                renderer: { name: 'rating', options: { max: 5 } },
            },

            {
                field: 'history', header: 'Sparkline', type: 'sparkline', width: 140, sortable: false,
                renderer: 'sparkline',
                sparkline: { type: 'line', showMarkers: false },
            },

            {
                field: 'tags', header: 'List', type: 'array', width: 200, sortable: false,
                renderer: { name: 'list', options: { maxVisible: 2 } },
            },

            { field: 'meta', header: 'JSON', type: 'object', renderer: 'json', width: 160, sortable: false },

            {
                field: 'action', header: 'Button', type: 'string', width: 110, sortable: false,
                renderer: {
                    name: 'button',
                    options: { action: 'track', label: 'Track', icon: 'search', variant: 'secondary' },
                },
            },

            // `html` writes the value with innerHTML and does not sanitise, so
            // it is only ever pointed at markup the application controls.
            { field: 'note', header: 'HTML', type: 'string', renderer: 'html', width: 190, sortable: false },
        ];
    }
}
