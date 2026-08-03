import { useCallback, useMemo } from 'react';

import { PhotonGrid } from '../../../../packages/photon-grid-react/src/photon-grid';
import { GridEventType, PhotonAIProviderType } from 'photon-grid-core';

import { generateData } from '../lib/employees';
import { environment } from '../environment';
import './demos.css';

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

/** Rows that live "on the server". */
const SERVER_ROW_COUNT = 5000;
/** Simulated round-trip time. */
const LATENCY_MS = 350;

const SERVER_COLUMNS = [
  { field: 'fullName', header: 'Name' },
  { field: 'department', header: 'Department' },
  { field: 'country', header: 'Country' },
  { field: 'salary', header: 'Salary', type: 'number' },
  { field: 'age', header: 'Age', type: 'number' },
];

/**
 * Pure query: search → filter → sort → page. Stands in for server-side SQL.
 *
 * Filtering and searching narrow the array before the sort runs, so the sort is
 * `O(n log n)` over the *matched* rows rather than the whole table — the same
 * ordering a real backend query planner would pick.
 */
function queryInMemory(source, request) {
  let rows = source;

  // Global search across the demo columns.
  const term = request.searchText.trim().toLowerCase();
  if (term) {
    rows = rows.filter((r) =>
      SERVER_COLUMNS.some((c) => String(r[c.field] ?? '').toLowerCase().includes(term)));
  }

  // Column filters (simple `contains`).
  for (const [field, filter] of Object.entries(request.filterModel)) {
    const value = filter?.filter;
    if (value === undefined || value === null || value === '') continue;
    const needle = String(value).toLowerCase();
    rows = rows.filter((r) => String(r[field] ?? '').toLowerCase().includes(needle));
  }

  const totalRows = rows.length;

  // Multi-sort in priority order.
  if (request.sortModel.length) {
    rows = [...rows].sort((a, b) => {
      for (const s of request.sortModel) {
        const av = a[s.colId];
        const bv = b[s.colId];
        if (av === bv) continue;
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av) > String(bv) ? 1 : -1;
        return s.sort === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }

  return { rows: rows.slice(request.startRow, request.endRow), totalRows };
}

/**
 * Builds an in-memory `ServerSideDatasource` that mimics a real backend: it
 * applies the request's `searchText`, `filterModel`, `sortModel` and page slice
 * over `rows` behind a simulated network delay, and honours `params.signal` so
 * superseded requests are cancelled rather than delivered and discarded.
 */
function createMockDatasource(rows) {
  return {
    getRows: (params) => {
      const timer = setTimeout(() => {
        try {
          params.success(queryInMemory(rows, params.request));
        } catch (err) {
          params.fail(err);
        }
      }, LATENCY_MS);

      params.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
    },
  };
}

export function ServerSideGrid() {
  const columns = useMemo(() => SERVER_COLUMNS, []);

  const options = useMemo(() => {
    const serverData = generateData(SERVER_ROW_COUNT);

    return {
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
  }, []);

  /**
   * Server-side lifecycle events are taken off the grid's event bus rather than
   * wrapper props — the same escape hatch any event without a dedicated prop
   * uses.
   */
  const onGridReady = useCallback((api) => {
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
  }, []);

  return (
    <>
      <header className="demo__header">
        <div>
          <h2 className="demo__title">Server-Side Row Model &amp; AI Theme Engine</h2>
          <p className="demo__subtitle">
            <code>rowModel: &apos;server&apos;</code> — the grid renders only; sorting, filtering,
            searching and pagination are all delegated to a <code>serverSideDatasource</code> (an
            in-memory mock here that simulates a backend with {LATENCY_MS} ms latency and request
            cancellation). Open the <strong>Photon AI</strong> panel and ask it to theme the grid,
            then use the <strong>Theme</strong> button in the top-right tools strip to apply, export
            or reset.
          </p>
        </div>
      </header>

      <section className="demo__grid demo__grid--tall">
        <PhotonGrid columns={columns} options={options} onGridReady={onGridReady} />
      </section>
    </>
  );
}

export default ServerSideGrid;
