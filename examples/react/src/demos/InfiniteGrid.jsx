import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PhotonGrid } from '../../../../packages/photon-grid-react/src/photon-grid';
import { GridEventType } from 'photon-grid-core';

import './demos.css';

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

/** Rows in the simulated backend. Large enough that materialising them all is impossible. */
const TOTAL_ROWS = 1_000_000;
/** Artificial latency, so skeletons are actually visible while scrolling. */
const LATENCY_MS = 260;
/** LRU ceiling on cached pages — the reason memory stays flat. */
const MAX_CACHED_PAGES = 15;

const REGIONS = ['EMEA', 'AMER', 'APAC', 'LATAM'];
const STATUSES = ['Active', 'Pending', 'Suspended', 'Closed'];

const EMPTY_STATS = {
  totalRows: 0, pageSize: 0, cachedPages: 0, inFlight: 0, queued: 0,
  cacheHits: 0, cacheMisses: 0, pagesLoaded: 0, pagesFailed: 0,
};

/** Deterministic pseudo-data derived from the absolute row index. */
function generateRows(request) {
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

function buildColumns() {
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

export function InfiniteGrid() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [requestCount, setRequestCount] = useState(0);
  const [lastEvent, setLastEvent] = useState('idle');
  const [failNext, setFailNext] = useState(false);

  const apiRef = useRef(null);
  // Read by the datasource callback, which is built once and must never see a
  // stale closure over the checkbox state.
  const failNextRef = useRef(false);
  const requestCountRef = useRef(0);

  useEffect(() => {
    failNextRef.current = failNext;
  }, [failNext]);

  const columns = useMemo(() => buildColumns(), []);

  const options = useMemo(() => ({
    columns: [],
    rowModel: 'infinite',
    rowHeight: 40,
    showSerialNumber: false,
    /**
     * The mock backend.
     *
     * Rows are generated from their absolute index rather than stored, which is
     * the whole point of the demo: neither the "server" nor the grid ever holds
     * a million rows in memory.
     */
    serverSideDatasource: {
      getRows: ({ request, signal, success, fail }) => {
        requestCountRef.current++;

        const timer = setTimeout(() => {
          if (signal.aborted) return;
          if (failNextRef.current) {
            setFailNext(false);
            fail(new Error(`Simulated failure for rows ${request.startRow}–${request.endRow}`));
            return;
          }
          success({ rows: generateRows(request), totalRows: TOTAL_ROWS });
        }, LATENCY_MS);

        // Honouring the signal is what makes scrolling past a pending page
        // free: the request is dropped rather than delivered and discarded.
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
      onDataRequest: (e) => setLastEvent(`request page ${e.page} (${e.reason})`),
      onDataReceived: (e) => setLastEvent(`page ${e.page} in ${e.durationMs} ms`),
      onCacheHit: (e) => setLastEvent(`cache hit page ${e.page}`),
      onError: (e) => setLastEvent(`✕ page ${e.page}: ${e.message}`),
    },
  }), []);

  const onGridReady = useCallback((api) => {
    apiRef.current = api;

    // Unmanaged row drag: the grid runs the drag and its preview but never
    // reorders — the datasource owns row order here. ROW_DROP arrives as a
    // *request*, which a real app would POST before refreshing. The mock
    // backend has no notion of order, so this only reports the move.
    api.on(GridEventType.ROW_DROP, (e) => {
      setLastEvent(
        `drop ${String(e.draggedRows[0]?.data.reference)} ${e.position} `
        + `${String(e.targetRow.data.reference)} (${e.fromIndex} → ${e.toIndex}, managed: ${e.managed})`,
      );
      // Real backend: await api.moveRow(...) then api.refreshInfinite({ purge: true }).
    });
  }, []);

  // Polled rather than pushed: the stats are a diagnostic overlay, and
  // repainting them on every page event would dominate the very work the demo
  // is measuring.
  useEffect(() => {
    const handle = setInterval(() => {
      const next = apiRef.current?.getInfiniteStats();
      if (next) setStats(next);
      setRequestCount(requestCountRef.current);
    }, 400);
    return () => clearInterval(handle);
  }, []);

  /** Scrolls to a fraction of the dataset, to show that any row is reachable. */
  const jumpTo = useCallback((fraction) => {
    apiRef.current?.ensureIndexVisible(Math.min(TOTAL_ROWS - 1, Math.floor(TOTAL_ROWS * fraction)));
  }, []);

  /** Drops every cached page and reloads what is on screen. */
  const refresh = useCallback(() => {
    apiRef.current?.refreshInfinite({ purge: true });
    setLastEvent('refresh (purged)');
  }, []);

  return (
    <>
      <header className="demo__header">
        <div>
          <h2 className="demo__title">Infinite Scrolling</h2>
          <p className="demo__subtitle">
            <strong>{TOTAL_ROWS.toLocaleString()}</strong> rows behind a mock backend with{' '}
            <strong>{LATENCY_MS} ms</strong> latency. Pages load as they come into view, are
            prefetched one ahead, and are evicted LRU past <strong>{MAX_CACHED_PAGES}</strong>{' '}
            pages — so memory stays flat no matter how far you scroll. Drag the scrollbar to the
            middle: the grid jumps there instantly and fills in.
          </p>
        </div>

        <div className="demo__controls">
          <button type="button" className="demo__btn" onClick={() => jumpTo(0.5)}>Jump to 50%</button>
          <button type="button" className="demo__btn" onClick={() => jumpTo(1)}>Jump to end</button>
          <button type="button" className="demo__btn demo__btn--ghost" onClick={refresh}>
            Refresh (purge)
          </button>
          <label className="demo__toggle">
            <input type="checkbox" checked={failNext} onChange={(e) => setFailNext(e.target.checked)} />
            Fail next request
          </label>
        </div>
      </header>

      <dl className="demo__stats">
        <div className="demo__stat"><dt>Rows</dt><dd>{stats.totalRows.toLocaleString()}</dd></div>
        <div className="demo__stat"><dt>Page size</dt><dd>{stats.pageSize}</dd></div>
        <div className="demo__stat demo__stat--accent"><dt>Cached pages</dt><dd>{stats.cachedPages}</dd></div>
        <div className="demo__stat"><dt>In flight</dt><dd>{stats.inFlight}</dd></div>
        <div className="demo__stat"><dt>Queued</dt><dd>{stats.queued}</dd></div>
        <div className="demo__stat"><dt>Cache hits</dt><dd>{stats.cacheHits.toLocaleString()}</dd></div>
        <div className="demo__stat"><dt>Cache misses</dt><dd>{stats.cacheMisses.toLocaleString()}</dd></div>
        <div className="demo__stat"><dt>Requests</dt><dd>{requestCount.toLocaleString()}</dd></div>
        <div className={`demo__stat${stats.pagesFailed > 0 ? ' demo__stat--warn' : ''}`}>
          <dt>Failed</dt><dd>{stats.pagesFailed}</dd>
        </div>
        <div className="demo__stat demo__stat--wide">
          <dt>Last event</dt>
          <dd className="demo__stat-text">{lastEvent}</dd>
        </div>
      </dl>

      <section className="demo__grid demo__grid--infinite">
        <PhotonGrid columns={columns} options={options} onGridReady={onGridReady} />
      </section>
    </>
  );
}

export default InfiniteGrid;
