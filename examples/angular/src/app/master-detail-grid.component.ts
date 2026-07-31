import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnInit,
    TemplateRef,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { PhotonGridComponent } from 'photon-grid-angular';
import type {
    ColumnDef,
    DetailEvent,
    DetailTemplateContext,
    PhotonGridOptions,
    PhotonMasterDetailConfig,
} from 'photon-grid-angular';
import { GridEventType, PhotonAIProviderType } from 'photon-grid-core';
import type { GridApi, GridOptions } from 'photon-grid-core';
import { environment } from '../environments/environment';

/** Which content source the detail rows currently use. */
enum DetailMode {
    /** A fully independent nested Photon Grid of orders. */
    NestedGrid = 'grid',
    /** An Angular `<ng-template>` rendered through `masterDetail.renderer`. */
    Template = 'template',
}

/** Accounts in the book of business. */
const ACCOUNT_COUNT = 26;
/** Artificial latency on the detail fetch, so the lazy load is actually visible. */
const DETAIL_LATENCY_MS = 320;

const REGIONS = ['EMEA', 'AMER', 'APAC', 'LATAM'] as const;
const PLANS = ['Enterprise', 'Business', 'Team', 'Starter'] as const;
const ACCOUNT_STATUS = ['Healthy', 'At risk', 'Churn risk'] as const;
const ORDER_STATUS = ['Delivered', 'In transit', 'Processing', 'Backordered'] as const;
const OWNERS = [
    'Amara Okafor', 'Tom Lindqvist', 'Priya Raman', 'Diego Ferreira',
    'Wei Zhang', 'Sofia Marchetti', 'Noah Bergman', 'Leila Haddad',
] as const;
const NOUNS = [
    'Northwind', 'Contoso', 'Fabrikam', 'Adventure', 'Litware', 'Proseware',
    'Tailspin', 'Wingtip', 'Coho', 'Lucerne', 'Trey', 'Woodgrove', 'Alpine',
];
const SUFFIXES = ['Logistics', 'Systems', 'Industries', 'Partners', 'Labs', 'Group'];

/**
 * Master/Detail demo — a book of accounts, each expanding into a detail panel.
 *
 * The segmented control in the header switches what that panel *is*, which is
 * the point of the demo: everything around the content — virtualization, the
 * lazy `getDetailData` fetch, row height, expand/collapse, the
 * collapsed-instance cache — is identical either way.
 *
 * - **Nested grid** (`detailGrid`) — a fully independent Photon Grid with its
 *   own sorting, filtering, selection, editing and clipboard. Sort the orders
 *   inside one account and the row beside it is unaffected; collapse and
 *   re-expand and that sort is still there, because `keepDetailGridsCount`
 *   keeps recently-collapsed instances alive rather than rebuilding them.
 * - **Custom `<ng-template>`** (`masterDetail.renderer`) — the template below,
 *   stamped once per expanded row. It reads `props` (derived from the fetched
 *   detail data), calls `ctx.emit(...)` to reach the `masterDetail.events`
 *   handlers, and `ctx.collapse()` to close its own row.
 *
 * Four behaviours are worth watching for:
 *
 * - **Lazy** — `getDetailData` is not called until a row is first expanded, and
 *   here it resolves after a delay, so the panel appears with a loading
 *   indicator first. Both modes share that one fetch/cache lifecycle.
 * - **Conditional** — accounts with no orders have nothing to show
 *   (`hasDetail`), so their panel renders the empty state instead of content.
 * - **Auto-height, clamped** — the detail row measures its content and grows to
 *   fit, up to `detailMaxHeight`; past that it scrolls. In nested-grid mode you
 *   can also drag the handle on its bottom edge (`detailResizable`).
 * - **Events** — a click inside a detail *grid* re-emits on the parent's event
 *   bus wrapped with its master row (`bubbleEvents`); a click inside the
 *   *template* arrives through `masterDetail.events`. The status line below
 *   reports both.
 */
@Component({
    selector: 'app-master-detail-grid',
    standalone: true,
    imports: [PhotonGridComponent, CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    template: `
        <header class="md__header">
            <div>
                <h2 class="md__title">Master / Detail</h2>
                <p class="md__subtitle">
                    Every account expands into a detail panel. Switch its content source
                    between a <strong>nested Photon Grid</strong> of orders and a
                    <strong>custom &lt;ng-template&gt;</strong> — everything around it
                    (lazy fetch at {{ latency }} ms, virtualization, auto-height up to
                    {{ maxHeight }} px, expand/collapse) is identical either way.
                </p>
            </div>

            <div class="md__controls">
                <div class="md__modes" role="group" aria-label="Detail content source">
                    <button
                        type="button"
                        class="md__mode"
                        [class.md__mode--on]="detailMode === DetailMode.NestedGrid"
                        [attr.aria-pressed]="detailMode === DetailMode.NestedGrid"
                        (click)="setDetailMode(DetailMode.NestedGrid)"
                    >Nested grid</button>
                    <button
                        type="button"
                        class="md__mode"
                        [class.md__mode--on]="detailMode === DetailMode.Template"
                        [attr.aria-pressed]="detailMode === DetailMode.Template"
                        (click)="setDetailMode(DetailMode.Template)"
                    >Custom &lt;ng-template&gt;</button>
                </div>
                <button type="button" class="md__btn" (click)="expandTop()">Expand top 5</button>
                <button type="button" class="md__btn md__btn--ghost" (click)="collapseAll()">
                    Collapse all
                </button>
            </div>
        </header>

        <!--
            Custom detail renderer. Photon builds this template once per expanded
            row and keeps the embedded view alive across refreshes — \`data\` and
            \`props\` are live accessors, and \`ctx\` is the core DetailContext, so
            \`emit\`/\`collapse\`/\`updateHeight\` are callable straight from the markup.
        -->
        <ng-template #detailTpl let-ctx let-data="data" let-props="props">
            <section class="md-detail">
                <h2 class="md-detail__title">Custom Detail Renderer</h2>
                <p class="md-detail__meta">{{ detailSummary(data, props) }}</p>
                <div class="md-detail__actions">
                    <button type="button" class="md__btn" (click)="ctx.emit('save', data)">Save</button>
                    <button type="button" class="md__btn md__btn--ghost" (click)="ctx.emit('export', data)">Export</button>
                    <button type="button" class="md__btn md__btn--ghost" (click)="ctx.collapse()">Collapse</button>
                </div>
            </section>
        </ng-template>

        <dl class="md__stats">
            <div class="md__stat"><dt>Accounts</dt><dd>{{ accounts.length }}</dd></div>
            <div class="md__stat"><dt>With orders</dt><dd>{{ withOrders }}</dd></div>
            <div class="md__stat md__stat--accent"><dt>Total ARR</dt><dd>{{ totalArr | currency:'USD':'symbol':'1.0-0' }}</dd></div>
            <div class="md__stat"><dt>Open orders</dt><dd>{{ totalOrders }}</dd></div>
            <div class="md__stat"><dt>Detail loads</dt><dd>{{ detailLoads }}</dd></div>
            <div class="md__stat md__stat--wide">
                <dt>Last detail event</dt>
                <dd class="md__stat-text">{{ lastEvent }}</dd>
            </div>
        </dl>

        <section class="md__grid">
            <photon-grid-angular
                [columns]="columns"
                [dataSet]="accounts"
                [options]="options"
                (gridReady)="onGridReady($event)"
            ></photon-grid-angular>
        </section>
    `,
    styles: [`
        .md__header {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 24px; flex-wrap: wrap; margin: 32px 0 12px;
        }
        .md__title { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
        .md__subtitle { margin: 0; max-width: 74ch; color: #64748b; font-size: 13px; line-height: 1.6; }
        .md__controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .md__btn {
            border: 1px solid #cbd5e1; background: #2563eb; color: #fff;
            border-radius: 6px; padding: 7px 14px; font-size: 13px; font-weight: 500; cursor: pointer;
        }
        .md__btn--ghost { background: #fff; color: #334155; }

        /* Segmented control switching the detail content source. */
        .md__modes {
            display: inline-flex; border: 1px solid #cbd5e1; border-radius: 6px;
            overflow: hidden; background: #fff;
        }
        .md__mode {
            border: 0; background: transparent; color: #334155; cursor: pointer;
            padding: 7px 12px; font-size: 13px; font-weight: 500;
        }
        .md__mode + .md__mode { border-left: 1px solid #e2e8f0; }
        .md__mode--on { background: #2563eb; color: #fff; }

        /* ── Custom detail renderer (<ng-template>) ─────────────────────────
           Centred on both axes inside the detail panel. The panel itself is
           auto-height, so its height follows this block's natural size — the
           min-height below is what gives the centring room to be visible. */
        .md-detail {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 10px; width: 100%; min-height: 140px; text-align: center;
        }
        .md-detail__title { margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; }
        .md-detail__meta { margin: 0; font-size: 13px; color: #64748b; }
        .md-detail__actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }

        .md__stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
        .md__stat {
            flex: 1 1 120px; border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 8px 12px; background: #f8fafc;
        }
        .md__stat dt { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
        .md__stat dd {
            margin: 2px 0 0; font-size: 18px; font-weight: 600;
            font-variant-numeric: tabular-nums; color: #0f172a;
        }
        .md__stat--accent dd { color: #2563eb; }
        .md__stat--wide { flex: 2 1 280px; }
        .md__stat-text { font-size: 13px; font-weight: 500; }

        .md__grid { height: 620px; }

        /* ── Cell renderers ────────────────────────────────────────────────
           Class-based rather than inline styles, so a theme change restyles
           them and the markup stays readable. */
        .md-account { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .md-account__badge {
            flex: 0 0 auto; width: 26px; height: 26px; border-radius: 7px;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700; letter-spacing: 0.02em; color: #fff;
        } 
        .md-account__text { min-width: 0; line-height: 1.25; }
        .md-account__name {
            display: block; font-weight: 600; color: #0f172a;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .md-account__domain { display: block; font-size: 11px; color: #94a3b8; }

        .md-tag {
            display: inline-block; padding: 2px 8px; border-radius: 999px;
            font-size: 11px; font-weight: 600; line-height: 1.6;
            border: 1px solid transparent;
        }
        .md-tag--healthy    { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
        .md-tag--at-risk    { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        .md-tag--churn-risk { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
        .md-tag--enterprise { background: #eef2ff; color: #4338ca; border-color: #c7d2fe; }
        .md-tag--business   { background: #f0f9ff; color: #0369a1; border-color: #bae6fd; }
        .md-tag--team       { background: #f5f3ff; color: #6d28d9; border-color: #ddd6fe; }
        .md-tag--starter    { background: #f8fafc; color: #475569; border-color: #e2e8f0; }
        .md-tag--delivered   { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
        .md-tag--in-transit  { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
        .md-tag--processing  { background: #f8fafc; color: #475569; border-color: #e2e8f0; }
        .md-tag--backordered { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }

        .md-progress { display: flex; align-items: center; gap: 8px; }
        .md-progress__track {
            flex: 1 1 auto; height: 6px; border-radius: 999px;
            background: #e2e8f0; overflow: hidden; min-width: 40px;
        }
        .md-progress__fill { display: block; height: 100%; border-radius: 999px; background: #2563eb; }
        .md-progress__fill--done { background: #059669; }
        .md-progress__value {
            flex: 0 0 auto; font-size: 11px; font-weight: 600; color: #475569;
            font-variant-numeric: tabular-nums;
        }
    `],
})
export class MasterDetailGridComponent implements OnInit {
    readonly latency = DETAIL_LATENCY_MS;
    readonly maxHeight = 320;

    /** Re-exported so the template can compare against the enum members. */
    protected readonly DetailMode = DetailMode;

    /**
     * The custom detail renderer. `static: true` because {@link options} is
     * built in `ngOnInit`, which runs before dynamic queries resolve — and the
     * grid reads `options` on its very first render.
     */
    @ViewChild('detailTpl', { static: true })
    private readonly detailTpl!: TemplateRef<DetailTemplateContext>;

    accounts: Record<string, unknown>[] = [];
    columns: ColumnDef[] = [];
    detailLoads = 0;
    lastEvent = 'expand an account, then click one of its orders';

    /** Which content source detail rows use. Switching rebuilds {@link options}. */
    detailMode: DetailMode = DetailMode.NestedGrid;

    /**
     * Rebuilt (as a new object) whenever {@link detailMode} changes — the
     * wrapper has no runtime options setter, so a fresh reference is what makes
     * it recreate the grid with the other detail content source.
     */
    options: Partial<PhotonGridOptions> = {};

    /** Orders keyed by account id, generated once and served by `getDetailData`. */
    private readonly ordersByAccount = new Map<string, Record<string, unknown>[]>();
    private api: GridApi | null = null;

    constructor(private readonly cdr: ChangeDetectorRef) {}

    get withOrders(): number {
        return this.accounts.filter((a) => (a['orderCount'] as number) > 0).length;
    }

    get totalArr(): number {
        return this.accounts.reduce((sum, a) => sum + (a['arr'] as number), 0);
    }

    get totalOrders(): number {
        return this.accounts.reduce((sum, a) => sum + (a['orderCount'] as number), 0);
    }

    ngOnInit(): void {
        this.accounts = this.buildAccounts();
        this.columns = this.buildAccountColumns();
        this.options = this.buildOptions();
    }

    /** Switches detail rows between the nested grid and the `<ng-template>` renderer. */
    setDetailMode(mode: DetailMode): void {
        if (this.detailMode === mode) return;
        this.detailMode = mode;
        this.options = this.buildOptions();
        this.api = null; // the current grid is about to be destroyed; `gridReady` re-seeds this
        this.lastEvent =
            mode === DetailMode.Template
                ? 'expand an account, then use the buttons inside its panel'
                : 'expand an account, then click one of its orders';
    }

    /** One line of context under the custom renderer's heading. */
    detailSummary(data: Record<string, unknown>, props: Record<string, unknown>): string {
        return `${String(data['account'])} · ${String(props['orderCount'] ?? 0)} orders · `
            + 'rendered by an <ng-template>, not a nested grid';
    }

    // ── Options ───────────────────────────────────────────────────────────────

    /**
     * Everything both modes share; only the detail *content source* differs.
     *
     * `renderer` outranks `detailGrid`, so the two are supplied exclusively
     * rather than both at once — see the priority order on `MasterDetailConfig`.
     */
    private buildOptions(): Partial<PhotonGridOptions> {
        const masterDetail: PhotonMasterDetailConfig = {
            enabled: true,
            // The toggle lives on the account column rather than a column of its
            // own, so the chevron reads as part of the account's identity.
            toggleColumnId: 'account',
            // No orders, no toggle — an empty panel is worse than no affordance.
            hasDetail: (row) => (row['orderCount'] as number) > 0,
            getDetailData: (row) => this.loadOrders(row),
            detailMinHeight: 120,
            detailMaxHeight: this.maxHeight,
            // Recently-collapsed panels stay alive, so re-expanding restores the
            // state the user left behind instead of rebuilding.
            keepDetailGridsCount: 8,
            bubbleEvents: [GridEventType.ROW_CLICKED],
            ...(this.detailMode === DetailMode.Template
                ? this.templateDetail()
                : { detailGrid: () => this.detailGridOptions(), detailResizable: true }),
        };

        return {
            columns: [],
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
        },
            rowHeight: 46,
            headerRowHeight: 42,
            showSerialNumber: false,
            rowShading: true,
            masterDetail,
        };
    }

    /**
     * The custom-renderer half of the config: an `<ng-template>`, the props it
     * reads, and handlers for the events it emits.
     *
     * `detailResizable` is deliberately absent — a hand-resized panel and
     * auto-height are mutually exclusive, and this panel should size itself to
     * the template's own content.
     */
    private templateDetail(): Partial<PhotonMasterDetailConfig> {
        return {
            // The TemplateRef itself — no wrapper object, no `kind` field. The
            // same slot takes an Angular component class, a static HTML string,
            // or a `(ctx) => HTML` function.
            renderer: this.detailTpl,
            // Re-run on every ctx.refresh(). `detailData` is the resolved
            // `getDetailData` payload, so the async fetch/cache lifecycle is
            // shared with the nested-grid mode rather than reimplemented.
            props: (ctx) => ({
                orderCount: (ctx.detailData ?? []).length,
                orders: ctx.detailData ?? [],
            }),
            // Any name the template emits lands here — no registration step.
            events: {
                save: (e: DetailEvent<Record<string, unknown>>) => this.reportDetailEvent('Saved', e),
                export: (e: DetailEvent<Record<string, unknown>>) => this.reportDetailEvent('Exported', e),
            },
        };
    }

    /** Shared handler for the custom renderer's events, so the status line shows the payload arriving. */
    private reportDetailEvent(verb: string, event: DetailEvent<Record<string, unknown>>): void {
        this.lastEvent = `${verb} ${String(event.data['account'])} (${event.type} · ${event.nodeId})`;
        this.cdr.markForCheck();
    }

    onGridReady(api: GridApi): void {
        this.api = api;

        // Row clicks inside a *detail* grid are re-emitted here, wrapped with the
        // master row they came from. The parent's own row clicks arrive on the
        // same channel unwrapped, which is how the two are told apart.
        api.on<Record<string, unknown>>(GridEventType.ROW_CLICKED, (payload) => {
            const sourceNodeId = payload['sourceNodeId'];
            if (typeof sourceNodeId !== 'string') return; // a master row, not a detail one

            const inner = payload['event'] as { row?: { data?: Record<string, unknown> } } | undefined;
            const order = inner?.row?.data;
            if (!order) return;

            const account = this.accounts.find((a) => sourceNodeId.includes(String(a['id'])));
            this.lastEvent =
                `${String(order['ref'])} · ${String(order['status'])}`
                + (account ? ` — ${String(account['account'])}` : '');
            this.cdr.markForCheck();
        });
    }

    /** Expands the five largest accounts, to show several panels coexisting. */
    expandTop(): void {
        if (!this.api) return;
        const ranked = [...this.accounts]
            .filter((a) => (a['orderCount'] as number) > 0)
            .sort((a, b) => (b['arr'] as number) - (a['arr'] as number))
            .slice(0, 5);

        for (const account of ranked) {
            const node = this.api.getAllRows()
                .find((r) => r.type === 'data' && r.data['id'] === account['id']);
            if (node) this.api.expandDetail(node.nodeId);
        }
    }

    collapseAll(): void {
        this.api?.collapseAllDetails();
    }

    // ── Detail data ───────────────────────────────────────────────────────────

    /**
     * Stands in for a per-account orders endpoint. Deliberately async: the
     * nested grid shows its own loading overlay until this resolves, which is
     * what the `lazy` + `getDetailData` pairing is for.
     */
    private loadOrders(row: Record<string, unknown>): Promise<Record<string, unknown>[]> {
        const id = String(row['id']);
        return new Promise((resolve) => {
            setTimeout(() => {
                this.detailLoads++;
                this.cdr.markForCheck();
                resolve(this.ordersByAccount.get(id) ?? []);
            }, DETAIL_LATENCY_MS);
        });
    }

    /** Options for every nested orders grid. */
    private detailGridOptions(): GridOptions {
        return {
            columns: this.buildOrderColumns(),
            rowHeight: 36,
            headerRowHeight: 34,
            showSerialNumber: false,
            pagination: { enabled: false },
        } as GridOptions;
    }

    // ── Columns ───────────────────────────────────────────────────────────────

    private buildAccountColumns(): ColumnDef[] {
        return [
            {
                colId: 'account', field: 'account', header: 'Account', type: 'string',
                width: 260, pinned: 'left', sortable: true, filterable: true,
                renderer: {
                    display: ({ value, row }) => {
                        const name = String(value ?? '');
                        return `<span class="md-account">
                            <span class="md-account__badge" style="background:${String(row['colour'])}">${initials(name)}</span>
                            <span class="md-account__text">
                                <span class="md-account__name">${escapeHtml(name)}</span>
                                <span class="md-account__domain">${escapeHtml(String(row['domain']))}</span>
                            </span>
                        </span>`;
                    },
                },
            },
            { colId: 'region', field: 'region', header: 'Region', type: 'string', width: 100, sortable: true, filterable: true, flex: 1 },
            { colId: 'owner', field: 'owner', header: 'Account owner', type: 'string', width: 170, sortable: true, filterable: true, flex: 1 },
            {
                colId: 'plan', field: 'plan', header: 'Plan', type: 'string', width: 130, sortable: true, filterable: true,
                renderer: { display: ({ value }) => tag(String(value ?? '')), }, flex: 1
            },
            { colId: 'seats', field: 'seats', header: 'Seats', type: 'number', width: 100, textAlign: 'right', sortable: true, flex: 1 },
            { colId: 'arr', field: 'arr', header: 'ARR', type: 'currency', width: 130, textAlign: 'right', sortable: true, flex: 1 },
            { colId: 'orderCount', field: 'orderCount', header: 'Orders', type: 'number', width: 100, textAlign: 'right', sortable: true, flex: 1 },
            { colId: 'renewal', field: 'renewal', header: 'Renews', type: 'date', width: 130, sortable: true, flex: 1 },
            {
                colId: 'status', field: 'status', header: 'Health', type: 'string', width: 130, sortable: true, filterable: true, flex: 1,
                renderer: { display: ({ value }) => tag(String(value ?? '')) },
            },
        ];
    }

    private buildOrderColumns(): ColumnDef[] {
        return [
            { colId: 'ref', field: 'ref', header: 'Order', type: 'string', width: 150, sortable: true, flex: 1 },
            { colId: 'placed', field: 'placed', header: 'Placed', type: 'date', width: 120, sortable: true, flex: 1 },
            { colId: 'items', field: 'items', header: 'Items', type: 'number', width: 90, textAlign: 'right', sortable: true, flex: 1 },
            { colId: 'value', field: 'value', header: 'Value', type: 'currency', width: 120, textAlign: 'right', sortable: true, flex: 1 },
            {
                colId: 'fulfilled', field: 'fulfilled', header: 'Fulfilment', type: 'number', width: 170, sortable: true, flex: 1,
                renderer: {
                    display: ({ value }) => {
                        const pct = Math.round(Number(value ?? 0) * 100);
                        const done = pct >= 100 ? ' md-progress__fill--done' : '';
                        return `<span class="md-progress">
                            <span class="md-progress__track">
                                <span class="md-progress__fill${done}" style="width:${pct}%"></span>
                            </span>
                            <span class="md-progress__value">${pct}%</span>
                        </span>`;
                    },
                },
            },
            {
                colId: 'status', field: 'status', header: 'Status', type: 'string', width: 140, sortable: true, filterable: true,
                renderer: { display: ({ value }) => tag(String(value ?? '')) }, flex: 1
            },
            { colId: 'carrier', field: 'carrier', header: 'Carrier', type: 'string', width: 130, sortable: true, flex: 1 },
        ];
    }

    // ── Mock data ─────────────────────────────────────────────────────────────

    private buildAccounts(): Record<string, unknown>[] {
        const accounts: Record<string, unknown>[] = [];

        for (let i = 0; i < ACCOUNT_COUNT; i++) {
            const seed = hash(i + 1);
            const name = `${NOUNS[seed % NOUNS.length]} ${SUFFIXES[(seed >> 4) % SUFFIXES.length]}`;
            const id = `ACC-${String(1000 + i)}`;
            // Every fourth account deliberately has no orders, so `hasDetail`
            // has something to hide a toggle for.
            const orderCount = i % 4 === 3 ? 0 : 3 + (seed % 7);

            this.ordersByAccount.set(id, this.buildOrders(id, orderCount, seed));

            accounts.push({
                __photon_id__: id,
                id,
                account: name,
                domain: `${name.split(' ')[0].toLowerCase()}.com`,
                colour: COLOURS[seed % COLOURS.length],
                region: REGIONS[seed % REGIONS.length],
                owner: OWNERS[(seed >> 2) % OWNERS.length],
                plan: PLANS[(seed >> 6) % PLANS.length],
                seats: 25 + (seed % 950),
                arr: (12 + (seed % 340)) * 1000,
                orderCount,
                renewal: new Date(2026, (seed % 12), 1 + (seed % 27)).toISOString().slice(0, 10),
                status: ACCOUNT_STATUS[(seed >> 8) % ACCOUNT_STATUS.length],
            });
        }
        return accounts;
    }

    private buildOrders(accountId: string, count: number, accountSeed: number): Record<string, unknown>[] {
        const orders: Record<string, unknown>[] = [];
        for (let i = 0; i < count; i++) {
            const seed = hash(accountSeed + i * 7919);
            const status = ORDER_STATUS[seed % ORDER_STATUS.length];
            orders.push({
                __photon_id__: `${accountId}-${i}`,
                ref: `SO-${String(seed % 900000 + 100000)}`,
                placed: new Date(2025, (seed >> 3) % 12, 1 + (seed % 27)).toISOString().slice(0, 10),
                items: 1 + (seed % 40),
                value: (2 + (seed % 90)) * 250,
                // Delivered orders are complete by definition; the rest are partway.
                fulfilled: status === 'Delivered' ? 1 : Math.round((seed % 90) / 10) / 10,
                status,
                carrier: CARRIERS[(seed >> 5) % CARRIERS.length],
            });
        }
        return orders;
    }
}

const COLOURS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777', '#4f46e5', '#0d9488'];
const CARRIERS = ['DHL', 'FedEx', 'Maersk', 'UPS', 'DB Schenker'];

/** Deterministic 31-bit hash, so every reload shows the same book of business. */
function hash(n: number): number {
    return Math.abs((n * 2654435761) % 1000003);
}

/** Up to two initials from an account name, for the avatar chip. */
function initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

/** A pill whose modifier class is derived from the label itself. */
function tag(label: string): string {
    const modifier = label.toLowerCase().replace(/[^a-z]+/g, '-');
    return `<span class="md-tag md-tag--${modifier}">${escapeHtml(label)}</span>`;
}

/**
 * Escapes interpolated values. The renderer returns an HTML string, so anything
 * originating in data has to be neutralised before it reaches `innerHTML`.
 */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
