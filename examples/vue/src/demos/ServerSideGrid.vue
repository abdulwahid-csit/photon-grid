<script setup>
/**
 * Server-Side Row Model + AI Theme Engine.
 *
 * `rowModel: 'server'` turns the grid into a rendering engine: sorting,
 * filtering, searching and pagination are all delegated to the
 * `serverSideDatasource`. The datasource here is an in-memory mock that
 * simulates a backend (latency + abort), but the grid code is identical to
 * talking to a real API — change the page, sort a column or type in the search
 * box and watch the request/response pairs in the console.
 *
 * `themeManager: true` mounts the top-right Theme launcher. Open the **Photon
 * AI** panel and ask it to theme the grid — e.g. *"create a GitHub dark theme"*
 * or *"make the header emerald green"*. The AI only ever sets real Photon design
 * tokens (never arbitrary CSS) and previews instantly; the Theme button applies
 * saved themes, exports, imports or resets.
 */
import PhotonGrid from 'photon-grid-vue';
import { GridEventType, PhotonAIProviderType } from 'photon-grid-core';

import { generateData } from '../lib/employees';
import { createMockDatasource, LATENCY_MS, SERVER_COLUMNS, SERVER_ROW_COUNT } from '../lib/server-side';
import { environment } from '../environment';
import './demos.css';

const latency = LATENCY_MS;
const columns = SERVER_COLUMNS;

// A fixed dataset that lives "on the server". The mock datasource does all
// sorting/filtering/searching/paging over it, exactly like a backend.
const serverData = generateData(SERVER_ROW_COUNT);

const options = {
  mode: 'dark',
  variant: 'quantum',
  rowModel: 'server',
  showSerialNumber: true,
  rowHeight: 40,
  headerRowHeight: 44,
  // Theme Manager launcher (top-right): apply saved themes, export, import,
  // reset. Themes are created through the Photon AI panel.
  themeManager: true,
  photonAI: {
    enabled: true,
    provider: {
      type: PhotonAIProviderType.OpenAI,
      apiKey: environment.groqApiKey,
      apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
    },
  },
  showFilterRow: false,
  pagination: { enabled: true, pageSize: 50 },
  serverSide: {
    debounce: 200,   // coalesce rapid filter/search typing
    cache: true,     // revisiting a page is instant
    maxRetries: 1,
    retryDelay: 300,
  },
  serverSideDatasource: createMockDatasource(serverData),
};

/**
 * Server-side lifecycle events are taken off the grid's event bus rather than
 * wrapper emits — the same escape hatch any event without a dedicated emit uses.
 */
function onGridReady(api) {
  // A fetch is about to run (or was served from cache).
  api.on(GridEventType.SERVER_REQUEST, (event) => {
    console.log(`[photon-grid] server request #${event.request.requestId}`, {
      page: event.request.page,
      sort: event.request.sortModel,
      search: event.request.searchText,
      fromCache: event.fromCache,
    });
  });

  // A slice was applied to the grid.
  api.on(GridEventType.SERVER_SUCCESS, (event) => {
    console.log(
      `[photon-grid] server success #${event.request.requestId}: `
      + `${event.rowCount} rows of ${event.totalRows ?? '?'}${event.fromCache ? ' (cache)' : ''}`,
    );
  });

  // A request failed after retries.
  api.on(GridEventType.SERVER_ERROR, (event) => {
    console.error('[photon-grid] server error:', event.message);
  });
}
</script>

<template>
  <header class="demo__header">
    <div>
      <h2 class="demo__title">Server-Side Row Model &amp; AI Theme Engine</h2>
      <p class="demo__subtitle">
        <code>rowModel: 'server'</code> — the grid renders only; sorting, filtering, searching and
        pagination are all delegated to a <code>serverSideDatasource</code> (an in-memory mock here
        that simulates a backend with {{ latency }} ms latency and request cancellation). Open the
        <strong>Photon AI</strong> panel and ask it to theme the grid, then use the
        <strong>Theme</strong> button in the top-right tools strip to apply, export or reset.
      </p>
    </div>
  </header>

  <section class="demo__grid demo__grid--tall">
    <PhotonGrid :columns="columns" :options="options" @grid-ready="onGridReady" />
  </section>
</template>
