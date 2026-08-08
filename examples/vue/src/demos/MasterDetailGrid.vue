<script setup>
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
 * - **Vue component** (`masterDetail.renderer`) — {@link AccountDetail},
 *   mounted once per expanded row into its own app instance by the wrapper's
 *   detail adapter.
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
 *   bus wrapped with its master row (`bubbleEvents`); a click inside the Vue
 *   panel arrives through `masterDetail.events`.
 */
import { computed, markRaw, ref } from 'vue';

import PhotonGrid from 'photon-grid-vue';
import { GridEventType, PhotonAIProviderType } from 'photon-grid-core';

import AccountDetail from './AccountDetail.vue';
import { environment } from '../environment';
import {
  buildAccountColumns,
  buildBook,
  buildOrderColumns,
  DETAIL_LATENCY_MS,
  DETAIL_MAX_HEIGHT,
} from '../lib/master-detail';
import './demos.css';

/** Which content source the detail rows currently use. */
const DetailMode = Object.freeze({
  /** A fully independent nested Photon Grid of orders. */
  NestedGrid: 'grid',
  /** A Vue component rendered through `masterDetail.renderer`. */
  Component: 'component',
});

const latency = DETAIL_LATENCY_MS;
const maxHeight = DETAIL_MAX_HEIGHT;

const { accounts, ordersByAccount } = buildBook();
const columns = buildAccountColumns();

const detailMode = ref(DetailMode.NestedGrid);
const detailLoads = ref(0);
const lastEvent = ref('expand an account, then click one of its orders');

let api = null;

const withOrders = computed(() => accounts.filter((a) => a.orderCount > 0).length);
const totalArr = computed(() => accounts.reduce((sum, a) => sum + a.arr, 0));
const totalOrders = computed(() => accounts.reduce((sum, a) => sum + a.orderCount, 0));

const totalArrLabel = computed(() => totalArr.value.toLocaleString('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}));

/**
 * Stands in for a per-account orders endpoint. Deliberately async: the nested
 * grid shows its own loading overlay until this resolves, which is what the
 * lazy `getDetailData` pairing is for.
 */
function loadOrders(row) {
  return new Promise((resolve) => {
    setTimeout(() => {
      detailLoads.value++;
      resolve(ordersByAccount.get(String(row.id)) ?? []);
    }, DETAIL_LATENCY_MS);
  });
}

/**
 * Everything both modes share; only the detail *content source* differs.
 *
 * `renderer` outranks `detailGrid`, so the two are supplied exclusively rather
 * than both at once — see the priority order on `MasterDetailConfig`. Because
 * this is a `computed`, switching mode produces a fresh object, which is
 * exactly what makes the wrapper recreate the grid with the other content
 * source.
 *
 * `shallowRef`-style discipline matters here: `markRaw` keeps Vue from turning
 * the detail component definition into a reactive proxy, which would break the
 * wrapper's component detection and waste proxies on a static object.
 */
const options = computed(() => ({
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
    // Recently-collapsed panels stay alive, so re-expanding restores the state
    // the user left behind instead of rebuilding.
    keepDetailGridsCount: 8,
    bubbleEvents: [GridEventType.ROW_CLICKED],
    ...(detailMode.value === DetailMode.Component
      ? {
          // `detailResizable` is deliberately absent here: a hand-resized panel
          // and auto-height are mutually exclusive, and this panel should size
          // itself to the component's own content.
          renderer: markRaw(AccountDetail),
          // Re-run on every `ctx.refresh()`. `detailData` is the resolved
          // `getDetailData` payload, so the async fetch/cache lifecycle is
          // shared with the nested-grid mode rather than reimplemented.
          props: (ctx) => ({
            orderCount: (ctx.detailData ?? []).length,
            orders: ctx.detailData ?? [],
          }),
          // Any name the component emits lands here — no registration step.
          events: {
            save: (e) => { lastEvent.value = `Saved ${String(e.data.account)} (${e.type} · ${e.nodeId})`; },
            export: (e) => { lastEvent.value = `Exported ${String(e.data.account)} (${e.type} · ${e.nodeId})`; },
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
}));

function onGridReady(gridApi) {
  api = gridApi;

  // Row clicks inside a *detail* grid are re-emitted here, wrapped with the
  // master row they came from. The parent's own row clicks arrive on the same
  // channel unwrapped, which is how the two are told apart.
  api.on(GridEventType.ROW_CLICKED, (payload) => {
    const sourceNodeId = payload.sourceNodeId;
    if (typeof sourceNodeId !== 'string') return; // a master row, not a detail one

    const order = payload.event?.row?.data;
    if (!order) return;

    const account = accounts.find((a) => sourceNodeId.includes(String(a.id)));
    lastEvent.value = `${String(order.ref)} · ${String(order.status)}`
      + (account ? ` — ${String(account.account)}` : '');
  });
}

/** Switches detail rows between the nested grid and the Vue renderer. */
function setDetailMode(mode) {
  if (detailMode.value === mode) return;
  detailMode.value = mode;
  // The current grid is about to be destroyed; `onGridReady` re-seeds this.
  api = null;
  lastEvent.value = mode === DetailMode.Component
    ? 'expand an account, then use the buttons inside its panel'
    : 'expand an account, then click one of its orders';
}

/** Expands the five largest accounts, to show several panels coexisting. */
function expandTop() {
  if (!api) return;

  const ranked = [...accounts]
    .filter((a) => a.orderCount > 0)
    .sort((a, b) => b.arr - a.arr)
    .slice(0, 5);

  for (const account of ranked) {
    const node = api.getAllRows().find((r) => r.type === 'data' && r.data.id === account.id);
    if (node) api.expandDetail(node.nodeId);
  }
}

function collapseAll() {
  api?.collapseAllDetails();
}
</script>

<template>
  <header class="demo__header">
    <div>
      <h2 class="demo__title">Master / Detail</h2>
      <p class="demo__subtitle">
        Every account expands into a detail panel. Switch its content source between a
        <strong>nested Photon Grid</strong> of orders and a <strong>Vue component</strong> —
        everything around it (lazy fetch at {{ latency }} ms, virtualization, auto-height up to
        {{ maxHeight }} px, expand/collapse) is identical either way.
      </p>
    </div>

    <div class="demo__controls">
      <div class="demo__modes" role="group" aria-label="Detail content source">
        <button
          type="button"
          class="demo__mode"
          :class="{ 'demo__mode--on': detailMode === DetailMode.NestedGrid }"
          :aria-pressed="detailMode === DetailMode.NestedGrid"
          @click="setDetailMode(DetailMode.NestedGrid)"
        >Nested grid</button>
        <button
          type="button"
          class="demo__mode"
          :class="{ 'demo__mode--on': detailMode === DetailMode.Component }"
          :aria-pressed="detailMode === DetailMode.Component"
          @click="setDetailMode(DetailMode.Component)"
        >Vue component</button>
      </div>
      <button type="button" class="demo__btn" @click="expandTop">Expand top 5</button>
      <button type="button" class="demo__btn demo__btn--ghost" @click="collapseAll">
        Collapse all
      </button>
    </div>
  </header>

  <dl class="demo__stats">
    <div class="demo__stat"><dt>Accounts</dt><dd>{{ accounts.length }}</dd></div>
    <div class="demo__stat"><dt>With orders</dt><dd>{{ withOrders }}</dd></div>
    <div class="demo__stat demo__stat--accent"><dt>Total ARR</dt><dd>{{ totalArrLabel }}</dd></div>
    <div class="demo__stat"><dt>Open orders</dt><dd>{{ totalOrders }}</dd></div>
    <div class="demo__stat"><dt>Detail loads</dt><dd>{{ detailLoads }}</dd></div>
    <div class="demo__stat demo__stat--wide">
      <dt>Last detail event</dt>
      <dd class="demo__stat-text">{{ lastEvent }}</dd>
    </div>
  </dl>

  <section class="demo__grid demo__grid--tall">
    <PhotonGrid
      :columns="columns"
      :data-set="accounts"
      :options="options"
      @grid-ready="onGridReady"
    />
  </section>
</template>
