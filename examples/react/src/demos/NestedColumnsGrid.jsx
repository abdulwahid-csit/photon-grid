import { useMemo } from 'react';

import { PhotonGrid } from '../../../../packages/photon-grid-react/src/photon-grid';
import { PhotonAIProviderType } from 'photon-grid-core';

import { environment } from '../environment';
import './demos.css';

/**
 * Grouped (nested) column headers over a market-data board.
 *
 * Column groups are **auto-detected**: any `ColumnDef` carrying `children`
 * becomes a group header spanning them, so the multi-row header, its
 * collapse/expand affordances and the group state serialization all come from
 * the same column definitions a flat grid uses. Groups nest arbitrarily deep,
 * and ungrouped columns (Exchange, Country, Currency below) sit alongside them
 * in the same header.
 *
 * Also on: row grouping (drag `Sector` into the grouping bar), managed row
 * drag, and the filters tool panel.
 */

/**
 * Seeded RNG, so the mock board is byte-identical on every reload — which makes
 * screenshots, tests and "did that change?" comparisons meaningful.
 */
function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const intBetween = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
const floatBetween = (rng, min, max) => rng() * (max - min) + min;
const round2 = (n) => Math.round(n * 100) / 100;

const SECTORS = [
  'Technology', 'Healthcare', 'Financial Services', 'Energy',
  'Consumer Discretionary', 'Consumer Staples', 'Industrials',
  'Utilities', 'Real Estate', 'Materials', 'Communication Services',
];

const VENUES = [
  { exchange: 'NASDAQ', country: 'United States', currency: 'USD' },
  { exchange: 'NYSE', country: 'United States', currency: 'USD' },
  { exchange: 'LSE', country: 'United Kingdom', currency: 'GBP' },
  { exchange: 'TSX', country: 'Canada', currency: 'CAD' },
  { exchange: 'XETRA', country: 'Germany', currency: 'EUR' },
  { exchange: 'Euronext', country: 'France', currency: 'EUR' },
  { exchange: 'TSE', country: 'Japan', currency: 'JPY' },
  { exchange: 'ASX', country: 'Australia', currency: 'AUD' },
  { exchange: 'SGX', country: 'Singapore', currency: 'SGD' },
  { exchange: 'PSX', country: 'Pakistan', currency: 'PKR' },
];

/** A pool of real, well-known tickers, to seed realistic-looking rows. */
const BASE_COMPANIES = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Consumer Discretionary' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', sector: 'Communication Services' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', sector: 'Consumer Discretionary' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financial Services' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Healthcare' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer Staples' },
  { symbol: 'KO', name: 'The Coca-Cola Company', sector: 'Consumer Staples' },
  { symbol: 'HD', name: 'The Home Depot, Inc.', sector: 'Consumer Discretionary' },
  { symbol: 'BA', name: 'The Boeing Company', sector: 'Industrials' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials' },
  { symbol: 'NEE', name: 'NextEra Energy, Inc.', sector: 'Utilities' },
  { symbol: 'DUK', name: 'Duke Energy Corporation', sector: 'Utilities' },
  { symbol: 'PLD', name: 'Prologis, Inc.', sector: 'Real Estate' },
  { symbol: 'SPG', name: 'Simon Property Group', sector: 'Real Estate' },
  { symbol: 'LIN', name: 'Linde plc', sector: 'Materials' },
  { symbol: 'NEM', name: 'Newmont Corporation', sector: 'Materials' },
  { symbol: 'DIS', name: 'The Walt Disney Company', sector: 'Communication Services' },
  { symbol: 'NFLX', name: 'Netflix, Inc.', sector: 'Communication Services' },
  { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology' },
  { symbol: 'CRM', name: 'Salesforce, Inc.', sector: 'Technology' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology' },
  { symbol: 'INTC', name: 'Intel Corporation', sector: 'Technology' },
];

/** Word banks used to synthesize companies once the base pool runs out. */
const NAME_PREFIXES = [
  'Nexa', 'Vertex', 'Orion', 'Summit', 'Cobalt', 'Lumen', 'Atlas',
  'Quantum', 'Horizon', 'Pioneer', 'Meridian', 'Zenith', 'Fusion',
  'Catalyst', 'Ironclad', 'Apex', 'Nimbus', 'Sterling', 'Bright', 'Vantage',
];
const NAME_SUFFIXES = [
  'Dynamics', 'Holdings', 'Systems', 'Group', 'Industries', 'Labs',
  'Networks', 'Ventures', 'Partners', 'Solutions', 'Technologies',
  'Materials', 'Energy', 'Capital', 'Robotics',
];
const SYMBOL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateData(count = 100) {
  const rng = mulberry32(1337);

  const synthesizeCompany = () => {
    let symbol = '';
    const len = intBetween(rng, 3, 4);
    for (let i = 0; i < len; i++) {
      symbol += SYMBOL_LETTERS[Math.floor(rng() * SYMBOL_LETTERS.length)];
    }
    return {
      symbol,
      name: `${pick(rng, NAME_PREFIXES)} ${pick(rng, NAME_SUFFIXES)}`,
      sector: pick(rng, SECTORS),
    };
  };

  const buildSpark = (basePrice, points = 20) => {
    const spark = [];
    let value = basePrice * floatBetween(rng, 0.9, 1.1);
    for (let i = 0; i < points; i++) {
      value *= 1 + floatBetween(rng, -0.015, 0.015);
      spark.push(round2(Math.max(value, 0.01)));
    }
    // Make the last point line up with the actual current price.
    spark[spark.length - 1] = round2(basePrice);
    return spark;
  };

  const rows = [];

  for (let i = 0; i < count; i++) {
    const company = i < BASE_COMPANIES.length ? BASE_COMPANIES[i] : synthesizeCompany();
    const venue = pick(rng, VENUES);

    const previousClose = round2(floatBetween(rng, 8, 950));
    const changePct = floatBetween(rng, -6, 6);
    const change = round2(previousClose * (changePct / 100));
    const price = round2(previousClose + change);

    const spread = round2(Math.max(price * 0.0005, 0.01));
    const volume = intBetween(rng, 100_000, 50_000_000);
    const sharesOutstanding = intBetween(rng, 5_000_000, 8_000_000_000);

    const dayLow = round2(Math.min(price, previousClose) * floatBetween(rng, 0.97, 1));
    const dayHigh = round2(Math.max(price, previousClose) * floatBetween(rng, 1, 1.03));
    const week52Low = round2(price * floatBetween(rng, 0.55, 0.85));
    const week52High = round2(price * floatBetween(rng, 1.15, 1.6));

    rows.push({
      symbol: company.symbol,
      name: company.name,
      sector: company.sector,
      price,
      change,
      changePct: round2(changePct),
      previousClose,
      bid: round2(price - spread),
      bidSize: intBetween(rng, 1, 50) * 100,
      ask: round2(price + spread),
      askSize: intBetween(rng, 1, 50) * 100,
      volume,
      avgVolume: Math.round(volume * floatBetween(rng, 0.7, 1.3)),
      marketCap: Math.round(price * sharesOutstanding),
      dayRange: `${dayLow.toFixed(2)} - ${dayHigh.toFixed(2)}`,
      week52Range: `${week52Low.toFixed(2)} - ${week52High.toFixed(2)}`,
      spark: buildSpark(price),
      exchange: venue.exchange,
      country: venue.country,
      currency: venue.currency,
      watched: rng() < 0.3,
      halted: rng() < 0.04,
      alerts: rng() < 0.5 ? intBetween(rng, 0, 5) : 0,
    });
  }

  return rows;
}

/**
 * Columns with `children` become group headers. Groups and plain columns mix
 * freely at the top level — the core works out the header row count.
 */
function buildColumns() {
  return [
    {
      colId: 'instrument',
      field: '',
      header: '📈 Instrument',
      children: [
        { colId: 'symbol', field: 'symbol', header: 'Symbol', type: 'string', width: 120, filterable: true, configurable: true },
        { colId: 'name', field: 'name', header: 'Company', type: 'string', width: 220, rowDrag: true },
        { colId: 'sector', field: 'sector', header: 'Sector', type: 'string', width: 170, groupable: true, filterable: true },
      ],
    },
    {
      colId: 'marketData',
      field: '',
      header: '💹 Market Data',
      children: [
        { colId: 'price', field: 'price', header: 'Last', type: 'number', width: 120, textAlign: 'right' },
        { colId: 'change', field: 'change', header: 'Change', type: 'number', width: 120, textAlign: 'right' },
        { colId: 'changePct', field: 'changePct', header: 'Change %', type: 'number', width: 120, textAlign: 'right' },
        { colId: 'previousClose', field: 'previousClose', header: 'Prev Close', type: 'number', width: 130, textAlign: 'right' },
      ],
    },
    {
      colId: 'orderBook',
      field: '',
      header: '📚 Order Book',
      children: [
        { colId: 'bid', field: 'bid', header: 'Bid', type: 'number', width: 120, textAlign: 'right' },
        { colId: 'bidSize', field: 'bidSize', header: 'Bid Size', type: 'number', width: 120, textAlign: 'right' },
        { colId: 'ask', field: 'ask', header: 'Ask', type: 'number', width: 120, textAlign: 'right' },
        { colId: 'askSize', field: 'askSize', header: 'Ask Size', type: 'number', width: 120, textAlign: 'right' },
      ],
    },
    {
      colId: 'statistics',
      field: '',
      header: '📊 Statistics',
      children: [
        { colId: 'volume', field: 'volume', header: 'Volume', type: 'currency', width: 140, textAlign: 'right' },
        { colId: 'avgVolume', field: 'avgVolume', header: 'Avg Volume', type: 'currency', width: 150, textAlign: 'right' },
        { colId: 'marketCap', field: 'marketCap', header: 'Market Cap', type: 'currency', width: 160, textAlign: 'right' },
      ],
    },
    {
      colId: 'performance',
      field: '',
      header: '🚀 Performance',
      children: [
        { colId: 'dayRange', field: 'dayRange', header: 'Day Range', type: 'string', width: 160 },
        { colId: 'week52Range', field: 'week52Range', header: '52W Range', type: 'string', width: 160 },
        {
          colId: 'spark', field: 'spark', header: 'Trend', type: 'sparkline',
          width: 250, minWidth: 250, sortable: false, filterable: false,
          sparkline: { type: 'area', stroke: '#0f9d58', fill: 'rgba(15,157,88,.15)', padding: 4 },
        },
      ],
    },
    { colId: 'exchange', field: 'exchange', header: '🏛 Exchange', type: 'string', width: 140 },
    { colId: 'country', field: 'country', header: '🌍 Country', type: 'string', width: 140 },
    { colId: 'currency', field: 'currency', header: '💲 Currency', type: 'string', width: 120 },
    {
      colId: 'status',
      field: '',
      header: '⚡ Status',
      children: [
        { colId: 'watched', field: 'watched', header: 'Watch', type: 'boolean', width: 100 },
        { colId: 'halted', field: 'halted', header: 'Halted', type: 'boolean', width: 100 },
        { colId: 'alerts', field: 'alerts', header: 'Alerts', type: 'number', width: 100 },
      ],
    },
  ];
}

export function NestedColumnsGrid() {
  const data = useMemo(() => generateData(), []);
  const columns = useMemo(() => buildColumns(), []);

  const options = useMemo(() => ({
    rowHeight: 40,
    showSerialNumber: true,
    showVerticalBorders: false,
    rowShading: false,
    rowDrag: { managed: true },
    filtersToolPanel: { enabled: true, defaultOpen: false },
    showGroupingBar: true,
    grouping: { enabled: true, showGroupCount: true, suppressAutoSize: true },
    mode: 'light',
    photonAI: {
      enabled: true,
      provider: {
        type: PhotonAIProviderType.OpenAI,
        apiKey: environment.groqApiKey,
        apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
      },
    },
  }), []);

  return (
    <>
      <header className="demo__header">
        <div>
          <h2 className="demo__title">Grouped Column Headers</h2>
          <p className="demo__subtitle">
            A market-data board whose header is built from nested column definitions: any column
            carrying <code>children</code> becomes a group spanning them. Groups collapse and
            expand, mix freely with ungrouped columns, and serialize with the rest of the column
            state. Drag <strong>Sector</strong> into the grouping bar to row-group as well.
          </p>
        </div>
      </header>

      <section className="demo__grid">
        <PhotonGrid columns={columns} dataSet={data} options={options} />
      </section>
    </>
  );
}

export default NestedColumnsGrid;
