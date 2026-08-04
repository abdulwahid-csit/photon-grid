/**
 * Mock backend for the Server-Side Row Model demo.
 *
 * The datasource applies the request's `searchText`, `filterModel`, `sortModel`
 * and page slice behind a simulated network delay, and honours `params.signal`
 * so superseded requests are cancelled rather than delivered and discarded —
 * exactly the contract a real endpoint has to satisfy.
 */

/** Rows that live "on the server". */
export const SERVER_ROW_COUNT = 5000;

/** Simulated round-trip time. */
export const LATENCY_MS = 350;

export const SERVER_COLUMNS = [
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
 * ordering a real query planner would pick.
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
 * Builds an in-memory `ServerSideDatasource` over `rows`.
 *
 * @param {Record<string, unknown>[]} rows
 * @returns {{ getRows: (params: unknown) => void }}
 */
export function createMockDatasource(rows) {
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
