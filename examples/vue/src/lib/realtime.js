/**
 * Data and column definitions for the Real-Time demo.
 *
 * Kept out of the SFC so the component owns only the feed lifecycle: the
 * generators here are pure, allocate once, and are shaped by the grid's
 * `applyCellUpdates` contract rather than by Vue's reactivity.
 */

/** How many rows each tick touches. */
export const ROWS_PER_TICK = 12;

/** Number of points retained in each instrument's trend series. */
const SPARK_POINTS = 28;

/** Available feed rates, in milliseconds per tick. */
export const RATES = [
  { value: 500, label: '2 / sec' },
  { value: 100, label: '10 / sec' },
  { value: 33, label: '30 / sec' },
  { value: 16, label: '60 / sec' },
];

export const EMPTY_VDOM_STATS = {
  trackedRows: 0, trackedCells: 0, cellsCompared: 0, cellsPatched: 0,
  cellsReRendered: 0, cellsDeferred: 0, flushes: 0, lastFlushMs: 0,
};

/** Rounds to `dp` decimals — keeps streamed values stable for the diff. */
export function round(value, dp) {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/** Constrains `value` to the inclusive `[min, max]` range. */
export function clamp(value, min, max) {
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
 *
 * @param {number} [count]
 * @returns {Record<string, unknown>[]}
 */
export function buildTicks(count = 100) {
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

/** Column definitions for the portfolio board. */
export function buildColumns() {
  return [
    {
      colId: 'ticker',
      field: 'ticker',
      header: 'Ticker',
      width: 340,
      type: 'string',
      renderer: {
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
  ];
}

/**
 * Advances one instrument and returns the `CellUpdate` for it.
 *
 * Only the fields that moved are included — the grid diffs them anyway, but a
 * narrow payload keeps the comparison cost proportional to the change rather
 * than to the row width. The tick is mutated in place, so a 60 Hz feed
 * allocates one small update object per row and nothing else.
 *
 * @param {Record<string, unknown>} tick - Mutated in place.
 * @returns {{ nodeId: string, values: Record<string, unknown> }}
 */
export function advanceTick(tick) {
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

  return {
    nodeId: tick.ticker,
    values: {
      pnl: tick.pnl,
      roi: tick.roi,
      totalValue: tick.totalValue,
      marketValue: tick.marketValue,
      quantity: tick.quantity,
      spark: tick.spark,
    },
  };
}
