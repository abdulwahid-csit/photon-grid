import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PhotonGrid } from 'photon-grid-react';

import { GridEventType, PhotonAIProviderType } from 'photon-grid-core';

import { environment } from '../environment';
import './demos.css';

/**
 * Real-time streaming demo for the viewport Virtual DOM.
 *
 * A simulated market feed mutates a slice of rows on every tick. Instead of
 * re-running the row pipeline and rebuilding rows, the component hands the
 * changed fields to `GridApi.applyCellUpdates`: the grid diffs the rendered
 * window against its virtual mirror and writes only the cells whose values
 * actually moved.
 *
 * What to look for while it runs:
 * - The **Instrument** column never repaints — the feed never touches it.
 * - Scrolling stays smooth at full tick rate, because the diff is bounded by
 *   the viewport rather than by the dataset.
 * - Select a range, hover a row, or open an editor: none of it is disturbed by
 *   the stream, because no cell element is ever replaced.
 *
 * React specifics: the feed writes through the grid's imperative API, never
 * through React state, so a 60 Hz stream costs **zero** React renders. Only the
 * once-per-second stats strip re-renders, which is why `stats`/`fps` are state
 * and the tick data is a ref.
 */

/** How many rows each tick touches. */
const ROWS_PER_TICK = 12;

/** Number of points retained in each instrument's trend series. */
const SPARK_POINTS = 28;

/** Available feed rates, in milliseconds per tick. */
const RATES = [
  { value: 500, label: '2 / sec' },
  { value: 100, label: '10 / sec' },
  { value: 33, label: '30 / sec' },
  { value: 16, label: '60 / sec' },
];

/** Rounds to `dp` decimals — keeps streamed values stable for the diff. */
function round(value, dp) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/** Constrains `value` to the inclusive `[min, max]` range. */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** A seed trend series with enough character to be worth rendering. */
function randomSpark() {
  let value = 100;
  return Array.from({ length: SPARK_POINTS }, () => {
    value += (Math.random() - 0.5) * 15;
    return Math.max(10, Math.round(value));
  });
}

const SEED = [
  { ticker: 'US10Y', company: 'U.S. Treasury 10-Year Bond', instrument: 'Bond', pnl: -136.02, roi: 177.28, totalValue: -13602.03, marketValue: 17727.93, quantity: 1000 },
  { ticker: 'CAD30Y', company: 'Canada 30-Year Government Bond', instrument: 'Bond', pnl: 261.25, roi: 0, totalValue: 25080.29, marketValue: 0, quantity: 550 },
  { ticker: 'MUB', company: 'iShares National Muni Bond ETF', instrument: 'ETF', pnl: 12.47, roi: 20.86, totalValue: 1434.57, marketValue: 2398.52, quantity: 75 },
  { ticker: 'BTC-USD', company: 'Bitcoin', instrument: 'Crypto', pnl: -0.15, roi: 0.08, totalValue: -4613.8, marketValue: 2384.89, quantity: 200 },
  { ticker: 'T', company: 'AT&T Inc.', instrument: 'Stock', pnl: -142.3, roi: 81.88, totalValue: -2845.99, marketValue: 1637.56, quantity: 100 },
  { ticker: 'FRN2027', company: 'France Government Bond 2027', instrument: 'Bond', pnl: 131.84, roi: 0, totalValue: 13447.48, marketValue: 0, quantity: 400 },
  { ticker: 'ADI', company: 'Analog Devices Inc.', instrument: 'Stock', pnl: -6.8, roi: 2.08, totalValue: -1088.74, marketValue: 332.59, quantity: 30 },
  { ticker: 'AIG', company: 'American International Group', instrument: 'Stock', pnl: -13.68, roi: 42.19, totalValue: -711.39, marketValue: 2193.77, quantity: 80 },
  { ticker: 'DAL', company: 'Delta Air Lines Inc.', instrument: 'Stock', pnl: -21.58, roi: 31.86, totalValue: -863.17, marketValue: 1274.47, quantity: 70 },
  { ticker: 'BP', company: 'BP plc', instrument: 'Stock', pnl: 4.01, roi: 10.92, totalValue: 1221.87, marketValue: 3329.25, quantity: 75 },
  { ticker: 'MA', company: 'Mastercard Inc.', instrument: 'Stock', pnl: -0.58, roi: 0.82, totalValue: -201.45, marketValue: 288.23, quantity: 15 },
  { ticker: 'VGT', company: 'Vanguard Information Technology ETF', instrument: 'ETF', pnl: -0.82, roi: 2.05, totalValue: -304.66, marketValue: 758.33, quantity: 25 },
];

/**
 * Seeds the feed. `__photon_id__` is the field the core reads to derive
 * `RowNode.nodeId`, so keying it by ticker lets the feed address rows in O(1)
 * through `applyCellUpdates`.
 */
function buildTicks(count = 100) {
  return Array.from({ length: count }, (_, index) => {
    const item = SEED[index % SEED.length];
    const ticker = `${item.ticker}${Math.floor(index / SEED.length) || ''}`;

    return {
      __photon_id__: ticker,
      ticker,
      company: item.company,
      instrument: item.instrument,
      pnl: +(item.pnl + (Math.random() - 0.5) * 100).toFixed(2),
      roi: +(item.roi + Math.random() * 25).toFixed(2),
      totalValue: +(item.totalValue + (Math.random() - 0.5) * 5000).toFixed(2),
      marketValue: Math.max(0, +(item.marketValue + Math.random() * 5000).toFixed(2)),
      quantity: item.quantity + Math.floor(Math.random() * 500),
      spark: randomSpark(),
      velocity: (Math.random() - 0.5) * 2,
    };
  });
}

/** Signed value + companion badge, shared by the P&L and Total Value columns. */
function renderSignedPair(value, badgeValue) {
  const positive = value >= 0;

  const root = document.createElement('div');
  root.className = 'portfolio-value';

  const amount = document.createElement('span');
  amount.className = positive ? 'portfolio-positive' : 'portfolio-negative';
  amount.textContent = `${positive ? '↑' : '↓'} ${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const badge = document.createElement('span');
  badge.className = 'portfolio-badge';
  badge.textContent = badgeValue.toLocaleString(undefined, { maximumFractionDigits: 2 });

  root.append(amount, badge);
  return root;
}

const EMPTY_STATS = {
  trackedRows: 0, trackedCells: 0, cellsCompared: 0, cellsPatched: 0,
  cellsReRendered: 0, cellsDeferred: 0, flushes: 0, lastFlushMs: 0,
};

export function RealtimeGrid() {
  const [intervalMs, setIntervalMs] = useState(50);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [updatesPushed, setUpdatesPushed] = useState(0);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [fps, setFps] = useState(60);
  const [lastMenuAction, setLastMenuAction] = useState('—');

  const apiRef = useRef(null);
  const disposersRef = useRef([]);
  const cursorRef = useRef(0);
  const pushedRef = useRef(0);

  // The rows are also the feed's working set: `applyCellUpdates` addresses them
  // by `nodeId`, and mutating them in place keeps the demo allocation-free.
  const ticks = useMemo(() => buildTicks(), []);

  const columns = useMemo(() => [
    {
      colId: 'ticker',
      field: 'ticker',
      header: 'Ticker',
      width: 340,
      type: 'string',
      renderer: {
        // A plain-function renderer rather than a React component: this cell is
        // re-rendered on every patch, and building the DOM directly avoids a
        // portal round-trip per streamed row.
        display: (params) => {
          const row = params.row;

          const root = document.createElement('div');
          root.className = 'portfolio-company';

          const logo = document.createElement('img');
          logo.className = 'portfolio-logo';
          logo.loading = 'lazy';
          logo.src = `https://logo.clearbit.com/${String(row.company)
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .split(' ')[0]
            .toLowerCase()}.com`;
          logo.onerror = () => {
            logo.onerror = null;
            logo.src = `https://ui-avatars.com/api/?background=random&color=fff&name=${row.ticker}`;
          };

          const content = document.createElement('div');
          content.className = 'portfolio-company-info';

          const ticker = document.createElement('div');
          ticker.className = 'portfolio-ticker';
          ticker.textContent = String(row.ticker);

          const company = document.createElement('div');
          company.className = 'portfolio-company-name';
          company.textContent = String(row.company);

          content.append(ticker, company);
          root.append(logo, content);
          return root;
        },
      },
    },
    {
      colId: 'spark',
      field: 'spark',
      header: 'Trend',
      type: 'sparkline',
      width: 280,
      minWidth: 280,
      sortable: false,
      filterable: false,
      sparkline: { type: 'column', stroke: '#7bacfa', fill: '#4c8df6' },
    },
    { colId: 'instrument', field: 'instrument', header: 'Instrument', width: 160, flex: 1, textAlign: 'right' },
    {
      colId: 'pnl',
      field: 'pnl',
      header: 'P&L',
      width: 190,
      textAlign: 'right',
      flex: 1,
      renderer: { display: (params) => renderSignedPair(params.row.pnl, params.row.roi) },
    },
    {
      colId: 'totalValue',
      field: 'totalValue',
      header: 'Total Value',
      width: 210,
      textAlign: 'right',
      flex: 1,
      renderer: { display: (params) => renderSignedPair(params.row.totalValue, params.row.marketValue) },
    },
    { colId: 'quantity', field: 'quantity', header: 'Quantity', width: 120, textAlign: 'right', flex: 1 },
  ], []);

  const options = useMemo(() => ({
    rowHeight: 40,
    showSerialNumber: false,
    showVerticalBorders: false,
    rowShading: false,
    mode: 'light',
    showGroupingBar: true,
    photonAI: {
      enabled: true,
      provider: {
        // Groq exposes an OpenAI-compatible Chat Completions API, so the
        // built-in OpenAI preset works as-is — just point `apiUrl` at Groq and
        // supply a Groq key + model. No custom transformers needed.
        type: PhotonAIProviderType.OpenAI,
        apiKey: environment.groqApiKey,
        apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
      },
    },
    rowMenu: {},
  }), []);

  const onGridReady = useCallback((api) => {
    apiRef.current = api;

    // Menu activations are published on the event bus, covering the built-in
    // entries as well as any custom ones — useful for logging or analytics
    // without touching every item definition.
    const offClicked = api.on(GridEventType.ROW_MENU_ITEM_CLICKED, (e) =>
      console.log('[row menu]', e.custom ? 'custom' : 'built-in', e.itemId, e.row?.data));

    // A rejected async action leaves the menu open and reports here, so an
    // application can surface a toast instead of failing silently.
    const offError = api.on(GridEventType.ROW_MENU_ITEM_ERROR, (e) =>
      setLastMenuAction(`✕ ${String(e.error?.message ?? e.itemId)}`));

    disposersRef.current = [offClicked, offError];
    setReady(true);
    setRunning(true);
  }, []);

  useEffect(() => () => {
    for (const dispose of disposersRef.current) dispose();
    disposersRef.current = [];
    apiRef.current = null;
  }, []);

  /**
   * Produces one batch of updates.
   *
   * Only the fields that moved are included — the grid diffs them anyway, but a
   * narrow payload keeps the comparison cost proportional to the change rather
   * than to the row width.
   */
  const pushTick = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;

    const updates = [];

    for (let i = 0; i < ROWS_PER_TICK; i++) {
      const tick = ticks[cursorRef.current];
      cursorRef.current = (cursorRef.current + 1) % ticks.length;

      tick.velocity = tick.velocity * 0.82 + (Math.random() - 0.5) * 0.6;

      // Random market events: a rare spike/crash, a more common medium move.
      const r = Math.random();
      if (r < 0.03) {
        tick.velocity += (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 6);
      } else if (r < 0.12) {
        tick.velocity += (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 3);
      }

      tick.velocity = clamp(tick.velocity, -8, 8);

      const pnlDelta = tick.velocity * (2 + Math.random() * 5);

      tick.pnl = round(tick.pnl + pnlDelta, 2);
      tick.roi = Math.max(0, round(tick.roi + pnlDelta * 0.18 + (Math.random() - 0.5) * 2, 2));
      tick.totalValue = round(tick.totalValue + pnlDelta * (15 + Math.random() * 30), 2);
      tick.marketValue = Math.max(0, round(tick.marketValue + pnlDelta * (8 + Math.random() * 15), 2));

      if (Math.random() < 0.12) {
        tick.quantity = Math.max(1, tick.quantity + Math.floor(Math.random() * 120 - 60));
      }

      const last = tick.spark[tick.spark.length - 1];
      let sparkDelta = tick.velocity * 4 + (Math.random() - 0.5) * 8;
      if (Math.random() < 0.05) sparkDelta += Math.random() > 0.5 ? 40 : -40;

      tick.spark = [...tick.spark.slice(1), round(Math.max(5, last + sparkDelta), 2)];

      updates.push({
        nodeId: tick.ticker,
        values: {
          pnl: tick.pnl,
          roi: tick.roi,
          totalValue: tick.totalValue,
          marketValue: tick.marketValue,
          quantity: tick.quantity,
          spark: tick.spark,
        },
      });
    }

    api.applyCellUpdates(updates);
    pushedRef.current += updates.length;
  }, [ticks]);

  // The feed itself. Deliberately *not* a React state update loop: at 60 Hz a
  // setState per tick would dominate the very cost this demo measures.
  useEffect(() => {
    if (!running || !ready) return undefined;
    const handle = setInterval(pushTick, intervalMs);
    return () => clearInterval(handle);
  }, [running, ready, intervalMs, pushTick]);

  // Stats are display-only, so they re-enter React once a second rather than on
  // every tick.
  useEffect(() => {
    if (!running || !ready) return undefined;

    let frames = 0;
    let lastSample = performance.now();
    let raf = requestAnimationFrame(function sample() {
      frames++;
      raf = requestAnimationFrame(sample);
    });

    const handle = setInterval(() => {
      const api = apiRef.current;
      if (!api) return;

      setStats(api.getVDomStats());
      setUpdatesPushed(pushedRef.current);

      const now = performance.now();
      const elapsed = now - lastSample;
      if (elapsed > 0) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        lastSample = now;
      }
    }, 1000);

    return () => {
      clearInterval(handle);
      cancelAnimationFrame(raf);
    };
  }, [running, ready]);

  const resetStats = useCallback(() => {
    pushedRef.current = 0;
    setUpdatesPushed(0);
    apiRef.current?.resetVDomStats();
    setStats(apiRef.current?.getVDomStats() ?? EMPTY_STATS);
  }, []);

  const writtenRatio = stats.cellsCompared === 0
    ? '0.0'
    : ((stats.cellsPatched / stats.cellsCompared) * 100).toFixed(1);

  return (
    <>
      <header className="demo__header">
        <div>
          <h2 className="demo__title">Real-Time Virtual DOM</h2>
          <p className="demo__subtitle">
            A simulated market feed updating <strong>{ROWS_PER_TICK}</strong> rows every{' '}
            <strong>{intervalMs} ms</strong> through <code>api.applyCellUpdates()</code>. Only the
            cells whose values changed are written to the DOM — rows are never rebuilt, so
            selection, hover and open editors survive the stream.
          </p>
        </div>

        <div className="demo__controls">
          <button type="button" className="demo__btn" onClick={() => setRunning((on) => !on)}>
            {running ? 'Pause feed' : 'Start feed'}
          </button>
          <button type="button" className="demo__btn demo__btn--ghost" onClick={resetStats}>
            Reset stats
          </button>
          <label className="demo__rate">
            Rate
            <select value={intervalMs} onChange={(e) => setIntervalMs(Number(e.target.value))}>
              {RATES.map((rate) => (
                <option key={rate.value} value={rate.value}>{rate.label}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <dl className="demo__stats">
        <div className="demo__stat"><dt>Updates pushed</dt><dd>{updatesPushed.toLocaleString()}</dd></div>
        <div className="demo__stat"><dt>Cells compared</dt><dd>{stats.cellsCompared.toLocaleString()}</dd></div>
        <div className="demo__stat demo__stat--accent"><dt>Cells written</dt><dd>{stats.cellsPatched.toLocaleString()}</dd></div>
        <div className="demo__stat"><dt>Written / compared</dt><dd>{writtenRatio}%</dd></div>
        <div className="demo__stat"><dt>Tracked cells</dt><dd>{stats.trackedCells.toLocaleString()}</dd></div>
        <div className="demo__stat"><dt>Last flush</dt><dd>{stats.lastFlushMs.toFixed(2)} ms</dd></div>
        <div className={`demo__stat${fps < 50 ? ' demo__stat--warn' : ''}`}><dt>FPS</dt><dd>{fps}</dd></div>
        <div className="demo__stat demo__stat--wide">
          <dt>Last row-menu action</dt>
          <dd className="demo__stat-text">{lastMenuAction}</dd>
        </div>
      </dl>

      <section className="demo__grid">
        <PhotonGrid columns={columns} dataSet={ticks} options={options} onGridReady={onGridReady} />
      </section>
    </>
  );
}

export default RealtimeGrid;
