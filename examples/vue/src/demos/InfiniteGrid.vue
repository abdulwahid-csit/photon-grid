<script setup>
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
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';

import PhotonGrid from '../../../../packages/photon-grid-vue/src/photon-grid';
import { GridEventType } from 'photon-grid-core';

import {
  buildColumns,
  EMPTY_INFINITE_STATS,
  generateRows,
  LATENCY_MS,
  MAX_CACHED_PAGES,
  TOTAL_ROWS,
} from '../lib/infinite';
import './demos.css';

const totalRows = TOTAL_ROWS;
const latency = LATENCY_MS;
const maxCachedPages = MAX_CACHED_PAGES;
const totalRowsLabel = TOTAL_ROWS.toLocaleString();

const columns = buildColumns();

const requestCount = ref(0);
const lastEvent = ref('idle');
const failNext = ref(false);
// Replaced wholesale each poll, never mutated field-by-field — a shallow ref is
// all the reactivity this needs.
const stats = shallowRef(EMPTY_INFINITE_STATS);

let api = null;
let statsHandle = null;
let requests = 0;

const options = {
  columns: [],
  rowModel: 'infinite',
  rowHeight: 40,
  showSerialNumber: false,
  /**
   * The mock backend.
   *
   * Rows are generated from their absolute index rather than stored, which is
   * the whole point of the demo: neither the "server" nor the grid ever holds a
   * million rows in memory.
   */
  serverSideDatasource: {
    getRows: ({ request, signal, success, fail }) => {
      requests++;

      const timer = setTimeout(() => {
        if (signal.aborted) return;
        if (failNext.value) {
          failNext.value = false;
          fail(new Error(`Simulated failure for rows ${request.startRow}–${request.endRow}`));
          return;
        }
        success({ rows: generateRows(request), totalRows: TOTAL_ROWS });
      }, LATENCY_MS);

      // Honouring the signal is what makes scrolling past a pending page free:
      // the request is dropped rather than delivered and discarded.
      signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
    },
  },
  infinite: {
    pageSize: 100,
    preloadPages: 1,
    maxCachedPages: MAX_CACHED_PAGES,
    maxConcurrentRequests: 3,
    debounce: 60,
    maxRetries: 1,
    onDataRequest: (e) => { lastEvent.value = `request page ${e.page} (${e.reason})`; },
    onDataReceived: (e) => { lastEvent.value = `page ${e.page} in ${e.durationMs} ms`; },
    onCacheHit: (e) => { lastEvent.value = `cache hit page ${e.page}`; },
    onError: (e) => { lastEvent.value = `✕ page ${e.page}: ${e.message}`; },
  },
};

function onGridReady(gridApi) {
  api = gridApi;

  // Unmanaged row drag: the grid runs the drag and its preview but never
  // reorders — the datasource owns row order here. ROW_DROP arrives as a
  // *request*, which a real app would POST before refreshing. The mock backend
  // has no notion of order, so this only reports the move.
  api.on(GridEventType.ROW_DROP, (e) => {
    lastEvent.value = `drop ${String(e.draggedRows[0]?.data.reference)} ${e.position} `
      + `${String(e.targetRow.data.reference)} (${e.fromIndex} → ${e.toIndex}, managed: ${e.managed})`;
    // Real backend: await api.moveRow(...) then api.refreshInfinite({ purge: true }).
  });
}

// Polled rather than pushed: the stats are a diagnostic overlay, and repainting
// them on every page event would dominate the very work the demo is measuring.
onMounted(() => {
  statsHandle = setInterval(() => {
    const next = api?.getInfiniteStats();
    if (next) stats.value = next;
    requestCount.value = requests;
  }, 400);
});

onBeforeUnmount(() => {
  if (statsHandle !== null) clearInterval(statsHandle);
  statsHandle = null;
  api = null;
});

/** Scrolls to a fraction of the dataset, to show that any row is reachable. */
function jumpTo(fraction) {
  api?.ensureIndexVisible(Math.min(TOTAL_ROWS - 1, Math.floor(TOTAL_ROWS * fraction)));
}

/** Drops every cached page and reloads what is on screen. */
function refresh() {
  api?.refreshInfinite({ purge: true });
  lastEvent.value = 'refresh (purged)';
}
</script>

<template>
  <header class="demo__header">
    <div>
      <h2 class="demo__title">Infinite Scrolling</h2>
      <p class="demo__subtitle">
        <strong>{{ totalRowsLabel }}</strong> rows behind a mock backend with
        <strong>{{ latency }} ms</strong> latency. Pages load as they come into view, are
        prefetched one ahead, and are evicted LRU past <strong>{{ maxCachedPages }}</strong>
        pages — so memory stays flat no matter how far you scroll. Drag the scrollbar to the
        middle: the grid jumps there instantly and fills in.
      </p>
    </div>

    <div class="demo__controls">
      <button type="button" class="demo__btn" @click="jumpTo(0.5)">Jump to 50%</button>
      <button type="button" class="demo__btn" @click="jumpTo(1)">Jump to end</button>
      <button type="button" class="demo__btn demo__btn--ghost" @click="refresh">Refresh (purge)</button>
      <label class="demo__toggle">
        <input type="checkbox" v-model="failNext" />
        Fail next request
      </label>
    </div>
  </header>

  <dl class="demo__stats">
    <div class="demo__stat"><dt>Rows</dt><dd>{{ stats.totalRows.toLocaleString() }}</dd></div>
    <div class="demo__stat"><dt>Page size</dt><dd>{{ stats.pageSize }}</dd></div>
    <div class="demo__stat demo__stat--accent"><dt>Cached pages</dt><dd>{{ stats.cachedPages }}</dd></div>
    <div class="demo__stat"><dt>In flight</dt><dd>{{ stats.inFlight }}</dd></div>
    <div class="demo__stat"><dt>Queued</dt><dd>{{ stats.queued }}</dd></div>
    <div class="demo__stat"><dt>Cache hits</dt><dd>{{ stats.cacheHits.toLocaleString() }}</dd></div>
    <div class="demo__stat"><dt>Cache misses</dt><dd>{{ stats.cacheMisses.toLocaleString() }}</dd></div>
    <div class="demo__stat"><dt>Requests</dt><dd>{{ requestCount.toLocaleString() }}</dd></div>
    <div class="demo__stat" :class="{ 'demo__stat--warn': stats.pagesFailed > 0 }">
      <dt>Failed</dt><dd>{{ stats.pagesFailed }}</dd>
    </div>
    <div class="demo__stat demo__stat--wide">
      <dt>Last event</dt>
      <dd class="demo__stat-text">{{ lastEvent }}</dd>
    </div>
  </dl>

  <section class="demo__grid demo__grid--infinite">
    <PhotonGrid :columns="columns" :options="options" @grid-ready="onGridReady" />
  </section>
</template>
