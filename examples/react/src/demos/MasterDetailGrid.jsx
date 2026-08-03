import { useCallback, useMemo, useRef, useState } from 'react';

import { PhotonGrid } from '../../../../packages/photon-grid-react/src/photon-grid';
import { GridEventType, PhotonAIProviderType } from 'photon-grid-core';

import { environment } from '../environment';
import './demos.css';

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
 * - **React component** (`masterDetail.renderer`) — {@link AccountDetail}
 *   below, mounted once per expanded row into its own React root by the
 *   wrapper's detail adapter. It reads `props` (derived from the fetched detail
 *   data), calls `ctx.emit(...)` to reach the `masterDetail.events` handlers,
 *   and `ctx.collapse()` to close its own row.
 *
 * Four behaviours are worth watching for:
 *
 * - **Lazy** — `getDetailData` is not called until a row is first expanded, and
 *   here it resolves after a delay, so the panel appears with a loading
 *   indicator first. Both modes share that one fetch/cache lifecycle.
 * - **Conditional** — accounts with no orders have nothing to show
 *   (`hasDetail`), so their toggle is not rendered at all.
 * - **Auto-height, clamped** — the detail row measures its content and grows to
 *   fit, up to `detailMaxHeight`; past that it scrolls. In nested-grid mode you
 *   can also drag the handle on its bottom edge (`detailResizable`).
 * - **Events** — a click inside a detail *grid* re-emits on the parent's event
 *   bus wrapped with its master row (`bubbleEvents`); a click inside the React
 *   panel arrives through `masterDetail.events`.
 */

/** Which content source the detail rows currently use. */
const DetailMode = Object.freeze({
  /** A fully independent nested Photon Grid of orders. */
  NestedGrid: 'grid',
  /** A React component rendered through `masterDetail.renderer`. */
  Component: 'component',
});

/** Accounts in the book of business. */
const ACCOUNT_COUNT = 26;
/** Artificial latency on the detail fetch, so the lazy load is actually visible. */
const DETAIL_LATENCY_MS = 320;
/** Detail panels stop growing here and start scrolling. */
const DETAIL_MAX_HEIGHT = 320;

const REGIONS = ['EMEA', 'AMER', 'APAC', 'LATAM'];
const PLANS = ['Enterprise', 'Business', 'Team', 'Starter'];
const ACCOUNT_STATUS = ['Healthy', 'At risk', 'Churn risk'];
const ORDER_STATUS = ['Delivered', 'In transit', 'Processing', 'Backordered'];
const OWNERS = [
  'Amara Okafor', 'Tom Lindqvist', 'Priya Raman', 'Diego Ferreira',
  'Wei Zhang', 'Sofia Marchetti', 'Noah Bergman', 'Leila Haddad',
];
const NOUNS = [
  'Northwind', 'Contoso', 'Fabrikam', 'Adventure', 'Litware', 'Proseware',
  'Tailspin', 'Wingtip', 'Coho', 'Lucerne', 'Trey', 'Woodgrove', 'Alpine',
];
const SUFFIXES = ['Logistics', 'Systems', 'Industries', 'Partners', 'Labs', 'Group'];
const COLOURS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777', '#4f46e5', '#0d9488'];
const CARRIERS = ['DHL', 'FedEx', 'Maersk', 'UPS', 'DB Schenker'];

/** Deterministic 31-bit hash, so every reload shows the same book of business. */
function hash(n) {
  return Math.abs((n * 2654435761) % 1000003);
}

/** Up to two initials from an account name, for the avatar chip. */
function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

/**
 * Escapes interpolated values. The renderers below return an HTML string, so
 * anything originating in data has to be neutralised before it reaches
 * `innerHTML`.
 */
function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** A pill whose modifier class is derived from the label itself. */
function tag(label) {
  const modifier = label.toLowerCase().replace(/[^a-z]+/g, '-');
  return `<span class="md-tag md-tag--${modifier}">${escapeHtml(label)}</span>`;
}

/** Builds the accounts and their orders in one pass, so ids stay in step. */
function buildBook() {
  const accounts = [];
  const ordersByAccount = new Map();

  for (let i = 0; i < ACCOUNT_COUNT; i++) {
    const seed = hash(i + 1);
    const name = `${NOUNS[seed % NOUNS.length]} ${SUFFIXES[(seed >> 4) % SUFFIXES.length]}`;
    const id = `ACC-${String(1000 + i)}`;
    // Every fourth account deliberately has no orders, so `hasDetail` has
    // something to hide a toggle for.
    const orderCount = i % 4 === 3 ? 0 : 3 + (seed % 7);

    const orders = [];
    for (let o = 0; o < orderCount; o++) {
      const orderSeed = hash(seed + o * 7919);
      const status = ORDER_STATUS[orderSeed % ORDER_STATUS.length];
      orders.push({
        __photon_id__: `${id}-${o}`,
        ref: `SO-${String((orderSeed % 900000) + 100000)}`,
        placed: new Date(2025, (orderSeed >> 3) % 12, 1 + (orderSeed % 27)).toISOString().slice(0, 10),
        items: 1 + (orderSeed % 40),
        value: (2 + (orderSeed % 90)) * 250,
        // Delivered orders are complete by definition; the rest are partway.
        fulfilled: status === 'Delivered' ? 1 : Math.round((orderSeed % 90) / 10) / 10,
        status,
        carrier: CARRIERS[(orderSeed >> 5) % CARRIERS.length],
      });
    }
    ordersByAccount.set(id, orders);

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
      renewal: new Date(2026, seed % 12, 1 + (seed % 27)).toISOString().slice(0, 10),
      status: ACCOUNT_STATUS[(seed >> 8) % ACCOUNT_STATUS.length],
    });
  }

  return { accounts, ordersByAccount };
}

function buildAccountColumns() {
  return [
    {
      colId: 'account', field: 'account', header: 'Account', type: 'string',
      width: 260, pinned: 'left', sortable: true, filterable: true,
      renderer: {
        display: ({ value, row }) => {
          const name = String(value ?? '');
          return `<span class="md-account">
            <span class="md-account__badge" style="background:${String(row.colour)}">${initials(name)}</span>
            <span class="md-account__text">
              <span class="md-account__name">${escapeHtml(name)}</span>
              <span class="md-account__domain">${escapeHtml(String(row.domain))}</span>
            </span>
          </span>`;
        },
      },
    },
    { colId: 'region', field: 'region', header: 'Region', type: 'string', width: 100, sortable: true, filterable: true, flex: 1 },
    { colId: 'owner', field: 'owner', header: 'Account owner', type: 'string', width: 170, sortable: true, filterable: true, flex: 1 },
    {
      colId: 'plan', field: 'plan', header: 'Plan', type: 'string', width: 130, sortable: true, filterable: true, flex: 1,
      renderer: { display: ({ value }) => tag(String(value ?? '')) },
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

function buildOrderColumns() {
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
      colId: 'status', field: 'status', header: 'Status', type: 'string', width: 140, sortable: true, filterable: true, flex: 1,
      renderer: { display: ({ value }) => tag(String(value ?? '')) },
    },
    { colId: 'carrier', field: 'carrier', header: 'Carrier', type: 'string', width: 130, sortable: true, flex: 1 },
  ];
}

/**
 * The custom detail renderer.
 *
 * Passed straight into `masterDetail.renderer`: the React wrapper recognises a
 * capitalised component and wraps it in a core `DetailComponent` that owns its
 * own React root, so the panel is properly unmounted when the row collapses.
 *
 * `ctx` is the core `DetailContext`, so `emit` / `collapse` / `updateHeight`
 * are callable straight from the markup.
 */
export function AccountDetail({ ctx, data, props }) {
  const orderCount = Number(props?.orderCount ?? 0);

  return (
    <section className="md-detail">
      <h2 className="md-detail__title">Custom Detail Renderer</h2>
      <p className="md-detail__meta">
        {String(data.account)} · {orderCount} orders · rendered by a React component, not a nested grid
      </p>
      <div className="md-detail__actions">
        <button type="button" className="demo__btn" onClick={() => ctx.emit('save', data)}>Save</button>
        <button type="button" className="demo__btn demo__btn--ghost" onClick={() => ctx.emit('export', data)}>Export</button>
        <button type="button" className="demo__btn demo__btn--ghost" onClick={() => ctx.collapse()}>Collapse</button>
      </div>
    </section>
  );
}

export function MasterDetailGrid() {
  const [detailMode, setDetailMode] = useState(DetailMode.NestedGrid);
  const [detailLoads, setDetailLoads] = useState(0);
  const [lastEvent, setLastEvent] = useState('expand an account, then click one of its orders');

  const apiRef = useRef(null);

  const { accounts, ordersByAccount } = useMemo(() => buildBook(), []);
  const columns = useMemo(() => buildAccountColumns(), []);

  const withOrders = useMemo(() => accounts.filter((a) => a.orderCount > 0).length, [accounts]);
  const totalArr = useMemo(() => accounts.reduce((sum, a) => sum + a.arr, 0), [accounts]);
  const totalOrders = useMemo(() => accounts.reduce((sum, a) => sum + a.orderCount, 0), [accounts]);

  /**
   * Stands in for a per-account orders endpoint. Deliberately async: the nested
   * grid shows its own loading overlay until this resolves, which is what the
   * lazy `getDetailData` pairing is for.
   */
  const loadOrders = useCallback((row) => new Promise((resolve) => {
    setTimeout(() => {
      setDetailLoads((n) => n + 1);
      resolve(ordersByAccount.get(String(row.id)) ?? []);
    }, DETAIL_LATENCY_MS);
  }), [ordersByAccount]);

  /**
   * Everything both modes share; only the detail *content source* differs.
   *
   * `renderer` outranks `detailGrid`, so the two are supplied exclusively
   * rather than both at once — see the priority order on `MasterDetailConfig`.
   * A fresh object per mode is exactly what makes the wrapper recreate the grid
   * with the other content source.
   */
  const options = useMemo(() => ({
    columns: [],
    photonAI: {
      enabled: true,
      provider: {
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
    masterDetail: {
      enabled: true,
      // The toggle lives on the account column rather than a column of its own,
      // so the chevron reads as part of the account's identity.
      toggleColumnId: 'account',
      // No orders, no toggle — an empty panel is worse than no affordance.
      hasDetail: (row) => row.orderCount > 0,
      getDetailData: loadOrders,
      detailMinHeight: 120,
      detailMaxHeight: DETAIL_MAX_HEIGHT,
      // Recently-collapsed panels stay alive, so re-expanding restores the
      // state the user left behind instead of rebuilding.
      keepDetailGridsCount: 8,
      bubbleEvents: [GridEventType.ROW_CLICKED],
      ...(detailMode === DetailMode.Component
        ? {
            // The component itself — no wrapper object, no `kind` field. The
            // same slot takes a core `DetailComponent` class, a static HTML
            // string, or a `(ctx) => HTML` function.
            //
            // `detailResizable` is deliberately absent here: a hand-resized
            // panel and auto-height are mutually exclusive, and this panel
            // should size itself to the component's own content.
            renderer: AccountDetail,
            // Re-run on every `ctx.refresh()`. `detailData` is the resolved
            // `getDetailData` payload, so the async fetch/cache lifecycle is
            // shared with the nested-grid mode rather than reimplemented.
            props: (ctx) => ({
              orderCount: (ctx.detailData ?? []).length,
              orders: ctx.detailData ?? [],
            }),
            // Any name the component emits lands here — no registration step.
            events: {
              save: (e) => setLastEvent(`Saved ${String(e.data.account)} (${e.type} · ${e.nodeId})`),
              export: (e) => setLastEvent(`Exported ${String(e.data.account)} (${e.type} · ${e.nodeId})`),
            },
          }
        : {
            detailGrid: () => ({
              columns: buildOrderColumns(),
              rowHeight: 36,
              headerRowHeight: 34,
              showSerialNumber: false,
              pagination: { enabled: false },
            }),
            detailResizable: true,
          }),
    },
  }), [detailMode, loadOrders]);

  const onGridReady = useCallback((api) => {
    apiRef.current = api;

    // Row clicks inside a *detail* grid are re-emitted here, wrapped with the
    // master row they came from. The parent's own row clicks arrive on the same
    // channel unwrapped, which is how the two are told apart.
    api.on(GridEventType.ROW_CLICKED, (payload) => {
      const sourceNodeId = payload.sourceNodeId;
      if (typeof sourceNodeId !== 'string') return; // a master row, not a detail one

      const order = payload.event?.row?.data;
      if (!order) return;

      const account = accounts.find((a) => sourceNodeId.includes(String(a.id)));
      setLastEvent(
        `${String(order.ref)} · ${String(order.status)}${account ? ` — ${String(account.account)}` : ''}`,
      );
    });
  }, [accounts]);

  /** Switches detail rows between the nested grid and the React renderer. */
  const switchMode = useCallback((mode) => {
    setDetailMode((current) => {
      if (current === mode) return current;
      // The current grid is about to be destroyed; `onGridReady` re-seeds this.
      apiRef.current = null;
      setLastEvent(mode === DetailMode.Component
        ? 'expand an account, then use the buttons inside its panel'
        : 'expand an account, then click one of its orders');
      return mode;
    });
  }, []);

  /** Expands the five largest accounts, to show several panels coexisting. */
  const expandTop = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;

    const ranked = [...accounts]
      .filter((a) => a.orderCount > 0)
      .sort((a, b) => b.arr - a.arr)
      .slice(0, 5);

    for (const account of ranked) {
      const node = api.getAllRows().find((r) => r.type === 'data' && r.data.id === account.id);
      if (node) api.expandDetail(node.nodeId);
    }
  }, [accounts]);

  const collapseAll = useCallback(() => apiRef.current?.collapseAllDetails(), []);

  return (
    <>
      <header className="demo__header">
        <div>
          <h2 className="demo__title">Master / Detail</h2>
          <p className="demo__subtitle">
            Every account expands into a detail panel. Switch its content source between a{' '}
            <strong>nested Photon Grid</strong> of orders and a <strong>React component</strong> —
            everything around it (lazy fetch at {DETAIL_LATENCY_MS} ms, virtualization, auto-height
            up to {DETAIL_MAX_HEIGHT} px, expand/collapse) is identical either way.
          </p>
        </div>

        <div className="demo__controls">
          <div className="demo__modes" role="group" aria-label="Detail content source">
            <button
              type="button"
              className={`demo__mode${detailMode === DetailMode.NestedGrid ? ' demo__mode--on' : ''}`}
              aria-pressed={detailMode === DetailMode.NestedGrid}
              onClick={() => switchMode(DetailMode.NestedGrid)}
            >Nested grid</button>
            <button
              type="button"
              className={`demo__mode${detailMode === DetailMode.Component ? ' demo__mode--on' : ''}`}
              aria-pressed={detailMode === DetailMode.Component}
              onClick={() => switchMode(DetailMode.Component)}
            >React component</button>
          </div>
          <button type="button" className="demo__btn" onClick={expandTop}>Expand top 5</button>
          <button type="button" className="demo__btn demo__btn--ghost" onClick={collapseAll}>
            Collapse all
          </button>
        </div>
      </header>

      <dl className="demo__stats">
        <div className="demo__stat"><dt>Accounts</dt><dd>{accounts.length}</dd></div>
        <div className="demo__stat"><dt>With orders</dt><dd>{withOrders}</dd></div>
        <div className="demo__stat demo__stat--accent">
          <dt>Total ARR</dt>
          <dd>{totalArr.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</dd>
        </div>
        <div className="demo__stat"><dt>Open orders</dt><dd>{totalOrders}</dd></div>
        <div className="demo__stat"><dt>Detail loads</dt><dd>{detailLoads}</dd></div>
        <div className="demo__stat demo__stat--wide">
          <dt>Last detail event</dt>
          <dd className="demo__stat-text">{lastEvent}</dd>
        </div>
      </dl>

      <section className="demo__grid demo__grid--tall">
        <PhotonGrid columns={columns} dataSet={accounts} options={options} onGridReady={onGridReady} />
      </section>
    </>
  );
}

export default MasterDetailGrid;
