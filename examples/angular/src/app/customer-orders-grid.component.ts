import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { PhotonGridComponent } from 'photon-grid-angular';
import type { ColumnDef } from 'photon-grid-angular';
import type { DisplayRendererParams, GridApi, GridOptions, ThemeMode, ThemeVariant } from 'photon-grid-core';

/** Fulfilment state of an order line. */
enum OrderStatus {
    Delivered = 'Delivered',
    Shipped = 'Shipped',
    Processing = 'Processing',
    Pending = 'Pending',
    Cancelled = 'Cancelled',
}

/**
 * Visual tone a status pill is painted in.
 *
 * Deliberately separate from {@link OrderStatus}: the *meaning* of a status is
 * domain data, the *tone* is presentation. Keeping them apart means a new
 * status only needs a tone assignment, not a new set of CSS rules — and every
 * tone resolves to a Photon theme token, so the pills restyle themselves when
 * the variant changes rather than staying stuck on one palette.
 */
enum StatusTone {
    Success = 'success',
    Info = 'info',
    Primary = 'primary',
    Warning = 'warning',
    Danger = 'danger',
}

/** One order line in the demo dataset. */
interface CustomerOrder {
    readonly __photon_id__: string;
    readonly id: number;
    readonly customer: string;
    readonly email: string;
    readonly product: string;
    readonly sku: string;
    readonly category: string;
    readonly quantity: number;
    readonly price: number;
    readonly status: OrderStatus;
    readonly lastUpdated: Date;
}

/** A selectable cosmetic skin, as offered by the theme picker. */
interface VariantOption {
    readonly value: ThemeVariant;
    readonly label: string;
}

/** Rows in the demo dataset. */
const ORDER_COUNT = 250;

/** Maps each status to the tone its pill is painted in. */
const STATUS_TONES: Readonly<Record<OrderStatus, StatusTone>> = {
    [OrderStatus.Delivered]: StatusTone.Success,
    [OrderStatus.Shipped]: StatusTone.Info,
    [OrderStatus.Processing]: StatusTone.Primary,
    [OrderStatus.Pending]: StatusTone.Warning,
    [OrderStatus.Cancelled]: StatusTone.Danger,
};

const CUSTOMERS = [
    'Amara Okafor', 'Tom Lindqvist', 'Priya Raman', 'Diego Ferreira',
    'Wei Zhang', 'Sofia Marchetti', 'Noah Bergman', 'Leila Haddad',
    'Hannah Whitfield', 'Marcus Osei', 'Yuki Tanaka', 'Elena Petrova',
    'Rahul Mehta', 'Clara Dubois', 'Omar Farouk', 'Grace Mwangi',
];

const PRODUCTS: ReadonlyArray<readonly [product: string, category: string]> = [
    ['Aurora 27" 4K Monitor', 'Displays'],
    ['Vertex Mechanical Keyboard', 'Peripherals'],
    ['Lumen Wireless Mouse', 'Peripherals'],
    ['Nimbus USB-C Dock', 'Accessories'],
    ['Atlas Laptop Stand', 'Accessories'],
    ['Cobalt 1080p Webcam', 'Peripherals'],
    ['Zenith Noise-Cancel Headset', 'Audio'],
    ['Meridian Desk Lamp', 'Accessories'],
    ['Fusion 2TB External SSD', 'Storage'],
    ['Apex Ergonomic Chair', 'Furniture'],
    ['Horizon Bluetooth Speaker', 'Audio'],
    ['Pioneer Graphics Tablet', 'Peripherals'],
    ['Sterling Portable Charger', 'Power'],
    ['Catalyst Studio Microphone', 'Audio'],
    ['Vantage Ultrawide Display', 'Displays'],
    ['Orion NVMe Enclosure', 'Storage'],
];

const STATUSES: readonly OrderStatus[] = [
    OrderStatus.Delivered, OrderStatus.Delivered, OrderStatus.Shipped,
    OrderStatus.Processing, OrderStatus.Pending, OrderStatus.Cancelled,
];

/**
 * Customer Orders — a presentation-focused demo.
 *
 * Every column carries a custom `display` renderer, so the grid reads like a
 * designed table rather than a spreadsheet: an order reference chip, a customer
 * identity block, a product with its SKU, a category chip, a quantity with a
 * proportional bar, an aligned price, a status pill, and a relative timestamp.
 *
 * Two things are worth noting about how it is built:
 *
 * - **Renderers return elements, not HTML strings.** Every value here comes
 *   from data, and building `HTMLElement`s with `textContent` removes the
 *   escaping question entirely rather than answering it per interpolation.
 * - **Nothing is a hard-coded colour.** Pills, chips and bars are composed from
 *   Photon theme tokens (`--pg-colors-success`, `--pg-borders-radius-pill`, …)
 *   via `color-mix`, so the theme picker in the header restyles the *cell
 *   contents* too — not just the grid chrome around them. That is the point of
 *   the demo: switch between `ion`, `neon`, `photon` and `quantum` and watch
 *   the whole surface follow, without a single re-render.
 */
@Component({
    selector: 'app-customer-orders-grid',
    standalone: true,
    imports: [PhotonGridComponent, CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // The cell renderers below build DOM inside the grid, not inside this
    // component's template, so scoped styles would never reach them. Every
    // selector in this file is namespaced under `co-` / `co__`.
    encapsulation: ViewEncapsulation.None,
    template: `
        <header class="co__header">
            <div class="co__intro">
                <h2 class="co__title">Customer Orders</h2>
                <p class="co__subtitle">
                    Every column is drawn by a custom cell renderer, and every colour in
                    those renderers is a Photon theme token rather than a literal. Change
                    the skin on the right: the pills, chips and bars inside the cells
                    restyle along with the grid, because they were never painted with a
                    palette of their own.
                </p>
            </div>

            <div class="co__controls">
                <label class="co__theme">
                    <span class="co__theme-label">Theme</span>
                    <select
                        class="co__theme-select"
                        [value]="variant"
                        (change)="onVariantChange($event)"
                    >
                        <option *ngFor="let option of variants" [value]="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                </label>

                <!--
                    Mode is the *other* theming axis. A variant is only a skin —
                    it has to render correctly over both palettes — so this
                    toggle is what makes that claim checkable rather than
                    assumed.
                -->
                <button
                    type="button"
                    class="co__mode-btn"
                    [attr.aria-pressed]="mode === 'dark'"
                    (click)="toggleMode()"
                >{{ mode === 'dark' ? '☾ Dark' : '☀ Light' }}</button>
            </div>
        </header>

        <section class="co__grid">
            <photon-grid-angular
                [columns]="columns"
                [dataSet]="orders"
                [options]="options"
                (gridReady)="onGridReady($event)"
            ></photon-grid-angular>
        </section>
    `,
    styles: [`
        /* ── Section chrome ─────────────────────────────────────────────── */

        .co__header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            flex-wrap: wrap;
            margin: 32px 0 12px;
        }
        .co__intro { min-width: 0; }
        .co__title { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
        .co__subtitle {
            margin: 0; max-width: 74ch; color: #64748b;
            font-size: 13px; line-height: 1.6;
        }

        /* Docked to the right of the header, so it sits directly above the
           grid's top-right corner. */
        .co__controls {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            margin-left: auto;
            flex: none;
        }
        .co__theme {
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .co__mode-btn {
            border: 1px solid #cbd5e1;
            background: #fff;
            color: #0f172a;
            border-radius: 8px;
            padding: 8px 14px;
            font: inherit;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            white-space: nowrap;
        }
        .co__mode-btn:focus-visible {
            outline: 2px solid #2563eb;
            outline-offset: 1px;
        }
        .co__theme-label {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #64748b;
        }
        .co__theme-select {
            appearance: none;
            border: 1px solid #cbd5e1;
            background: #fff;
            color: #0f172a;
            border-radius: 8px;
            padding: 8px 34px 8px 12px;
            font: inherit;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            /* Chevron drawn with a gradient pair rather than a background image,
               so there is no asset to ship and no icon to fall out of sync. */
            background-image:
                linear-gradient(45deg, transparent 50%, currentColor 50%),
                linear-gradient(135deg, currentColor 50%, transparent 50%);
            background-position: right 16px center, right 11px center;
            background-size: 5px 5px, 5px 5px;
            background-repeat: no-repeat;
        }
        .co__theme-select:focus-visible {
            outline: 2px solid #2563eb;
            outline-offset: 1px;
        }

        .co__grid { height: 620px; }

        /* ── Cell renderers ─────────────────────────────────────────────────
           Built by the column renderers, which the grid creates directly in
           its own DOM — outside Angular's template. Declared with
           ViewEncapsulation.None (see the component metadata) and namespaced
           under \`co-\` so nothing leaks.

           Every colour below resolves to a Photon theme token, which is what
           lets the theme picker restyle cell *contents* and not just chrome. */

        /* Order reference */
        .co-ref {
            display: inline-flex;
            align-items: center;
            font-family: var(--pg-typography-font-family-mono, ui-monospace, monospace);
            font-size: var(--pg-typography-font-size-xs, 11px);
            font-weight: var(--pg-typography-font-weight-semibold, 600);
            letter-spacing: 0.02em;
            color: var(--pg-colors-text-secondary);
            background: color-mix(in srgb, var(--pg-colors-text-secondary) 10%, transparent);
            border-radius: var(--pg-borders-radius-sm, 4px);
            padding: 2px 7px;
        }

        /* Customer identity block */
        .co-customer {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            height: 100%;
        }
        .co-customer__avatar {
            flex: 0 0 auto;
            width: 30px;
            height: 30px;
            border-radius: var(--pg-borders-radius-pill, 999px);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.02em;
            /* Only the hue is data-derived (set inline per row); saturation,
               lightness and contrast are decided here, once. */
            color: hsl(var(--co-hue) 70% 28%);
            background: hsl(var(--co-hue) 70% 88%);
            box-shadow: inset 0 0 0 1px hsl(var(--co-hue) 55% 76%);
        }
        .co-customer__text { min-width: 0; line-height: 1.25; }
        .co-customer__name {
            display: block;
            font-weight: var(--pg-typography-font-weight-semibold, 600);
            color: var(--pg-colors-text-primary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .co-customer__email {
            display: block;
            font-size: var(--pg-typography-font-size-xs, 11px);
            color: var(--pg-colors-text-secondary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Product + SKU */
        .co-product { min-width: 0; line-height: 1.25; }
        .co-product__name {
            display: block;
            font-weight: var(--pg-typography-font-weight-medium, 500);
            color: var(--pg-colors-text-primary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .co-product__sku {
            display: block;
            font-family: var(--pg-typography-font-family-mono, ui-monospace, monospace);
            font-size: var(--pg-typography-font-size-xs, 11px);
            color: var(--pg-colors-text-disabled, var(--pg-colors-text-secondary));
        }

        /* Category chip */
        .co-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px 3px 8px;
            border-radius: var(--pg-borders-radius-pill, 999px);
            font-size: var(--pg-typography-font-size-xs, 11px);
            font-weight: var(--pg-typography-font-weight-semibold, 600);
            line-height: 1.6;
            color: var(--pg-colors-text-primary);
            background: color-mix(in srgb, var(--pg-colors-text-secondary) 10%, transparent);
            border: 1px solid color-mix(in srgb, var(--pg-colors-border-strong, var(--pg-colors-border)) 70%, transparent);
        }
        .co-chip__dot {
            width: 7px;
            height: 7px;
            flex: none;
            border-radius: var(--pg-borders-radius-pill, 999px);
            background: hsl(var(--co-hue) 62% 52%);
        }

        /* Quantity: number plus a bar giving it a sense of scale */
        .co-qty {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
            width: 100%;
        }
        .co-qty__value {
            font-variant-numeric: tabular-nums;
            font-weight: var(--pg-typography-font-weight-semibold, 600);
            color: var(--pg-colors-text-primary);
            line-height: 1.2;
        }
        .co-qty__track {
            width: 100%;
            height: 3px;
            border-radius: var(--pg-borders-radius-pill, 999px);
            background: color-mix(in srgb, var(--pg-colors-text-secondary) 18%, transparent);
            overflow: hidden;
        }
        .co-qty__fill {
            display: block;
            height: 100%;
            border-radius: inherit;
            background: var(--pg-colors-primary);
        }

        /* Unit price */
        .co-price {
            display: block;
            text-align: right;
            font-variant-numeric: tabular-nums;
            font-weight: var(--pg-typography-font-weight-semibold, 600);
            color: var(--pg-colors-text-primary);
        }

        /* Status pill. One rule set, five tones, each a theme token. */
        .co-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px 3px 8px;
            border-radius: var(--pg-borders-radius-pill, 999px);
            font-size: var(--pg-typography-font-size-xs, 11px);
            font-weight: var(--pg-typography-font-weight-semibold, 600);
            line-height: 1.6;
            white-space: nowrap;
            color: var(--co-tone);
            background: color-mix(in srgb, var(--co-tone) 14%, transparent);
            border: 1px solid color-mix(in srgb, var(--co-tone) 34%, transparent);
        }
        .co-status__dot {
            width: 7px;
            height: 7px;
            flex: none;
            border-radius: var(--pg-borders-radius-pill, 999px);
            background: var(--co-tone);
        }
        .co-status--success { --co-tone: var(--pg-colors-success); }
        .co-status--info    { --co-tone: var(--pg-colors-info); }
        .co-status--primary { --co-tone: var(--pg-colors-primary); }
        .co-status--warning { --co-tone: var(--pg-colors-warning); }
        .co-status--danger  { --co-tone: var(--pg-colors-danger); }

        /* A pulsing dot marks the states that are still in motion. */
        .co-status--primary .co-status__dot,
        .co-status--warning .co-status__dot {
            animation: co-pulse 1.8s ease-in-out infinite;
        }
        @keyframes co-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.45; transform: scale(0.82); }
        }
        @media (prefers-reduced-motion: reduce) {
            .co-status__dot { animation: none !important; }
        }

        /* Relative timestamp */
        .co-time { line-height: 1.25; }
        .co-time__relative {
            display: block;
            font-weight: var(--pg-typography-font-weight-medium, 500);
            color: var(--pg-colors-text-primary);
        }
        .co-time__absolute {
            display: block;
            font-size: var(--pg-typography-font-size-xs, 11px);
            color: var(--pg-colors-text-secondary);
            font-variant-numeric: tabular-nums;
        }
    `],
})
export class CustomerOrdersGridComponent implements OnInit {
    /** The skins offered by the picker — the full `ThemeVariant` union. */
    readonly variants: readonly VariantOption[] = [
        { value: 'ion', label: 'Ion' },
        { value: 'neon', label: 'Neon' },
        { value: 'photon', label: 'Photon' },
        { value: 'quantum', label: 'Quantum' },
    ];

    /** Currently applied skin. Kept in sync with the grid by {@link onVariantChange}. */
    variant: ThemeVariant = 'ion';

    /**
     * Currently applied colour mode — the second theming axis.
     *
     * Every variant is required to render correctly over both palettes, so this
     * exists to make that testable: switch skins in one mode, then flip the mode
     * and confirm each still reads correctly.
     */
    mode: ThemeMode = 'light';

    columns: ColumnDef[] = [];
    orders: Record<string, unknown>[] = [];

    /**
     * `variant` here only seeds the initial skin; the picker changes it at
     * runtime through {@link GridApi.setVariant}, which swaps a CSS class on the
     * container rather than rebuilding the grid — so scroll position, sort,
     * selection and column widths all survive a theme change.
     */
    readonly options: Partial<GridOptions> = {
        mode: this.mode,
        variant: this.variant,
        // `rowHeight` is deliberately not set: with it omitted, each variant
        // supplies its own density (Ion 44 / Neon 40 / Photon 56 / Quantum 52),
        // which is half of what makes the four read as different products. Set
        // it here and every skin collapses to the same rhythm.
        headerRowHeight: 44,
        showSerialNumber: false,
        showVerticalBorders: false,
        rowShading: false,
        showCheckboxes: false,
        showGroupingBar: true,
        pagination: { enabled: true, pageSize: 50 },
        selection: { mode: 'multiple' },
    };

    /** Formats the `price` column. Built once — `Intl` construction is not cheap. */
    private readonly currency = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    /** Formats the absolute half of the `lastUpdated` column. */
    private readonly timestamp = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    /** Largest quantity in the dataset — the denominator for the Qty bars. */
    private maxQuantity = 1;

    private api: GridApi | null = null;

    ngOnInit(): void {
        const orders = this.buildOrders(ORDER_COUNT);
        this.maxQuantity = orders.reduce((max, o) => Math.max(max, o.quantity), 1);

        this.orders = orders as unknown as Record<string, unknown>[];
        this.columns = this.buildColumns();
    }

    onGridReady(api: GridApi): void {
        this.api = api;
    }

    /**
     * Applies the selected skin.
     *
     * `setVariant` is a class swap on the grid container, so this is a paint —
     * not a rebuild. Nothing about the data, the column state or the scroll
     * position is touched.
     */
    onVariantChange(event: Event): void {
        this.variant = (event.target as HTMLSelectElement).value as ThemeVariant;
        this.api?.setVariant(this.variant);
    }

    /**
     * Flips the colour mode without touching the variant.
     *
     * The two axes are independent by design — `setMode` swaps the injected
     * design tokens and leaves the skin class alone, so the current variant
     * re-renders over the other palette. That is exactly the property every
     * variant has to satisfy, and this button is how you check it.
     */
    toggleMode(): void {
        this.mode = this.mode === 'dark' ? 'light' : 'dark';
        this.api?.setMode(this.mode);
    }

    // ── Columns ───────────────────────────────────────────────────────────────

    private buildColumns(): ColumnDef[] {
        return [
            {
                colId: 'id',
                field: 'id',
                header: 'ID',
                type: 'number',
                width: 100,
                sortable: true,
                // renderer: {
                //     display: ({ value }: DisplayRendererParams) =>
                //         el('span', 'co-ref', `#${String(value ?? '').padStart(5, '0')}`),
                // },
            },
            {
                colId: 'customer',
                field: 'customer',
                header: 'Customer',
                type: 'string',
                flex: 1.5,
                minWidth: 220,
                sortable: true,
                filterable: true,
                configurable: true,
                // renderer: { display: (params) => this.renderCustomer(params) },
            },
            {
                colId: 'product',
                field: 'product',
                header: 'Product',
                type: 'string',
                flex: 1.5,
                minWidth: 220,
                sortable: true,
                filterable: true,
                // renderer: { display: (params) => this.renderProduct(params) },
            },
            {
                colId: 'category',
                field: 'category',
                header: 'Category',
                type: 'string',
                flex: 1,
                minWidth: 150,
                sortable: true,
                filterable: true,
                groupable: true,
                // renderer: { display: ({ value }) => renderChip(String(value ?? '')) },
            },
            {
                colId: 'quantity',
                field: 'quantity',
                header: 'Qty',
                // The source spec used AG Grid's `type: 'numericColumn'`, which
                // bundles "numeric" with "right-aligned". Photon keeps the two
                // apart: `type` drives parsing/sorting/formatting, `textAlign`
                // drives layout.
                type: 'number',
                width: 100,
                textAlign: 'right',
                sortable: true,
                aggFunc: 'sum',
                // renderer: { display: (params) => this.renderQuantity(params) },
            },
            {
                colId: 'price',
                field: 'price',
                header: 'Unit Price',
                type: 'currency',
                width: 130,
                textAlign: 'right',
                sortable: true,
                aggFunc: 'avg',
                // renderer: {
                //     display: ({ value }: DisplayRendererParams) =>
                //         el('span', 'co-price', this.currency.format(Number(value ?? 0))),
                // },
            },
            {
                colId: 'status',
                field: 'status',
                header: 'Status',
                type: 'boolean',
                width: 130,
                editable: true,
                sortable: true,
                filterable: true,
                groupable: true,
                // renderer: { display: ({ value }) => renderStatus(String(value ?? '') as OrderStatus) },
            },
            {
                colId: 'lastUpdated',
                field: 'lastUpdated',
                header: 'Last Updated',
                type: 'date',
                width: 180,
                sortable: true,
                // renderer: { display: (params) => this.renderTimestamp(params) },
            },
        ];
    }

    // ── Renderers ─────────────────────────────────────────────────────────────

    /** Avatar chip + name + email. */
    private renderCustomer({ value, row }: DisplayRendererParams): HTMLElement {
        const name = String(value ?? '');

        const root = el('div', 'co-customer');

        const avatar = el('span', 'co-customer__avatar', initials(name));
        // Only the hue travels with the data; the stylesheet decides what to do
        // with it, so a theme can restyle avatars without touching this code.
        avatar.style.setProperty('--co-hue', String(hue(name)));

        const text = el('span', 'co-customer__text');
        text.append(
            el('span', 'co-customer__name', name),
            el('span', 'co-customer__email', String(row['email'] ?? '')),
        );

        root.append(avatar, text);
        return root;
    }

    /** Product name over its SKU. */
    private renderProduct({ value, row }: DisplayRendererParams): HTMLElement {
        const root = el('div', 'co-product');
        root.append(
            el('span', 'co-product__name', String(value ?? '')),
            el('span', 'co-product__sku', String(row['sku'] ?? '')),
        );
        return root;
    }

    /** Quantity with a bar showing it against the largest order in the set. */
    private renderQuantity({ value }: DisplayRendererParams): HTMLElement {
        const quantity = Number(value ?? 0);
        const pct = Math.max(4, Math.round((quantity / this.maxQuantity) * 100));

        const root = el('div', 'co-qty');
        const track = el('span', 'co-qty__track');
        const fill = el('span', 'co-qty__fill');
        fill.style.width = `${pct}%`;
        track.appendChild(fill);

        root.append(el('span', 'co-qty__value', String(quantity)), track);
        return root;
    }

    /** "3h ago" over the exact timestamp. */
    private renderTimestamp({ value }: DisplayRendererParams): HTMLElement {
        const date = value instanceof Date ? value : new Date(String(value));

        const root = el('div', 'co-time');
        root.append(
            el('span', 'co-time__relative', relativeTime(date)),
            el('span', 'co-time__absolute', this.timestamp.format(date)),
        );
        return root;
    }

    // ── Mock data ─────────────────────────────────────────────────────────────

    /**
     * Deterministic order lines, so every reload shows the same book — which is
     * what makes screenshots and "did that change?" comparisons meaningful.
     */
    private buildOrders(count: number): CustomerOrder[] {
        const rng = mulberry32(20260803);
        const now = Date.now();
        const orders: CustomerOrder[] = [];

        for (let i = 0; i < count; i++) {
            const customer = pick(rng, CUSTOMERS);
            const [product, category] = pick(rng, PRODUCTS);
            const status = pick(rng, STATUSES);

            orders.push({
                __photon_id__: `ORD-${1000 + i}`,
                id: 1000 + i,
                customer,
                email: `${customer.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                product,
                sku: `SKU-${String(Math.floor(rng() * 900000) + 100000)}`,
                category,
                quantity: 1 + Math.floor(rng() * 48),
                price: Math.round((12 + rng() * 880) * 100) / 100,
                status,
                // Spread over the last ~14 days, so the relative timestamps show
                // minutes, hours and days rather than all collapsing to one unit.
                lastUpdated: new Date(now - Math.floor(rng() * 14 * 24 * 60 * 60 * 1000)),
            });
        }

        return orders;
    }
}

// ── Element helpers ─────────────────────────────────────────────────────────
// Renderers build elements rather than HTML strings: every value below comes
// from row data, and `textContent` removes the escaping question entirely
// rather than answering it at each interpolation site.

/** Creates an element with a class and optional text. */
function el(tag: string, className: string, text?: string): HTMLElement {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

/** Category chip: a hue-tinted dot beside the label. */
function renderChip(label: string): HTMLElement {
    const root = el('span', 'co-chip');
    const dot = el('span', 'co-chip__dot');
    dot.style.setProperty('--co-hue', String(hue(label)));

    root.append(dot, document.createTextNode(label));
    return root;
}

/**
 * Status pill.
 *
 * The tone is a modifier class, not an inline colour, so the five statuses share
 * one rule set and each resolves its `--co-tone` to a theme token — which is
 * what makes the pills follow a variant change.
 */
function renderStatus(status: OrderStatus): HTMLElement {
    const tone = STATUS_TONES[status] ?? StatusTone.Info;

    const root = el('span', `co-status co-status--${tone}`);
    root.append(el('span', 'co-status__dot'), document.createTextNode(status));
    return root;
}

/** Up to two initials from a name, for the avatar chip. */
function initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

/**
 * Stable hue in `[0, 360)` derived from a string.
 *
 * Deterministic so a customer or category keeps the same colour across reloads,
 * sorts and re-renders — a colour that moves is noise, not identity.
 */
function hue(value: string): number {
    let h = 0;
    for (let i = 0; i < value.length; i++) {
        h = (h * 31 + value.charCodeAt(i)) % 360;
    }
    return h;
}

/** Coarse "time ago" label — the exact timestamp sits underneath it. */
function relativeTime(date: Date): string {
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'yesterday' : `${days} days ago`;
}

/** Seeded RNG, so the mock book is byte-identical on every reload. */
function mulberry32(seed: number): () => number {
    let state = seed;
    return function next(): number {
        state |= 0;
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Picks an element from `arr` using the seeded RNG. */
function pick<T>(rng: () => number, arr: readonly T[]): T {
    return arr[Math.floor(rng() * arr.length)];
}
