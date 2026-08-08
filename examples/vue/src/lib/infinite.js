/**
 * Mock backend + column definitions for the Infinite Scrolling demo.
 *
 * Rows are generated from their absolute index rather than stored, which is the
 * whole point of the demo: neither the "server" nor the grid ever holds a
 * million rows in memory.
 */

/** Rows in the simulated backend. Large enough that materialising them all is impossible. */
export const TOTAL_ROWS = 1_000_000;

/** Artificial latency, so skeletons are actually visible while scrolling. */
export const LATENCY_MS = 260;

/** LRU ceiling on cached pages — the reason memory stays flat. */
export const MAX_CACHED_PAGES = 15;

export const EMPTY_INFINITE_STATS = {
  totalRows: 0, pageSize: 0, cachedPages: 0, inFlight: 0, queued: 0,
  cacheHits: 0, cacheMisses: 0, pagesLoaded: 0, pagesFailed: 0,
};

const REGIONS = ['EMEA', 'AMER', 'APAC', 'LATAM'];
const STATUSES = ['Active', 'Pending', 'Suspended', 'Closed'];

/**
 * Deterministic pseudo-data derived from the absolute row index.
 *
 * @param {{ startRow: number, endRow: number }} request
 * @returns {Record<string, unknown>[]}
 */
export function generateRows(request) {
  const end = Math.min(request.endRow, TOTAL_ROWS);
  const rows = [];

  for (let index = request.startRow; index < end; index++) {
    const seed = (index * 2654435761) % 1000003;
    rows.push({
      __photon_id__: `row-${index}`,
      id: index + 1,
      reference: `TXN-${String(index).padStart(7, '0')}`,
      customer: `Customer ${(seed % 9973).toString(36).toUpperCase()}`,
      region: REGIONS[seed % REGIONS.length],
      status: STATUSES[(seed >> 3) % STATUSES.length],
      amount: Math.round((seed % 250000) / 100) * 100,
      opened: new Date(2020, 0, 1 + (seed % 1800)).toISOString().slice(0, 10),
    });
  }
  return rows;
}

export function buildColumns() {
  return [
    { colId: 'id', field: 'id', header: '#', type: 'number', width: 110, pinned: 'left' },
    { colId: 'reference', field: 'reference', header: 'Reference', type: 'string', width: 170, rowDrag: true },
    { colId: 'customer', field: 'customer', header: 'Customer', type: 'string', width: 220, filterable: true, configurable: true },
    { colId: 'region', field: 'region', header: 'Region', type: 'string', width: 130, filterable: true },
    { colId: 'status', field: 'status', header: 'Status', type: 'string', width: 140, filterable: true },
    { colId: 'amount', field: 'amount', header: 'Amount', type: 'currency', width: 150, textAlign: 'right' },
    { colId: 'opened', field: 'opened', header: 'Opened', type: 'date', minWidth: 140, flex: 1 },
  ];
}
