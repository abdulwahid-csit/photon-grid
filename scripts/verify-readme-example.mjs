/**
 * Runs the core README's quick-start example in a real browser.
 *
 * Type-checking proves the snippet compiles; this proves it *works* — the grid
 * mounts, renders rows, and the API call the README makes afterwards succeeds.
 * A published quick start that throws on line one is the worst kind of
 * documentation bug, and the only way to be sure is to run it.
 *
 * Usage:
 *   npm run build:core
 *   node scripts/verify-readme-example.mjs
 */

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = join(ROOT, 'packages/photon-grid-core/dist/photon-grid.min.js');

const bundle = await readFile(BUNDLE, 'utf8').catch(() => {
  throw new Error(`Missing ${BUNDLE}. Run "npm run build:core" first.`);
});

// The README snippet, transliterated from its ESM import to the CDN global.
const SNIPPET = `
const grid = PhotonGrid.createGrid('#grid', {
  columns: [
    { field: 'sku',      header: 'SKU',      width: 110, pinned: 'left' },
    { field: 'product',  header: 'Product',  width: 190 },
    { field: 'category', header: 'Category', width: 140 },
    { field: 'price',    header: 'Price',    width: 120, type: 'number' },
    { field: 'released', header: 'Released', width: 130, type: 'date' },
  ],
  data: [
    { sku: 'PG-1001', product: 'Photon Keyboard', category: 'Hardware', price: 1249, released: '2024-01-18' },
    { sku: 'PG-1002', product: 'Quantum Mouse',   category: 'Hardware', price:  349, released: '2024-02-04' },
    { sku: 'PG-1003', product: 'Nebula Dock',     category: 'Hardware', price: 2199, released: '2024-02-22' },
  ],
  rowHeight: 40,
  headerRowHeight: 44,
  showSerialNumber: true,
  pagination: { enabled: true, pageSize: 10 },
});

grid.api.sizeColumnsToFit();
window.__grid = grid;
`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0} #grid{height:460px}
</style><script>${bundle}</script></head><body>
  <div id="grid" style="height: 460px"></div>
  <script>${SNIPPET}</script>
</body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
try {
  const tab = await browser.newPage();
  tab.on('pageerror', (e) => errors.push(String(e)));
  tab.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await tab.setContent(html);
  // The grid paints on an animation frame, so the count has to be read after
  // the first row exists — not in the same tick as `createGrid`.
  await tab.waitForSelector('.pg-row', { timeout: 15_000 });

  const result = await tab.evaluate(() => ({
    // Distinct node ids, not `.pg-row` elements: a row is rendered once per
    // panel, so a grid with a pinned column has two elements per logical row.
    rows: new Set(
      Array.from(document.querySelectorAll('.pg-row')).map((r) => r.getAttribute('data-node-id')),
    ).size,
    headers: document.querySelectorAll('.pg-th').length,
    hasApi: typeof window.__grid?.api?.sizeColumnsToFit === 'function',
  }));

  if (errors.length) throw new Error(`Console/page errors:\n  ${errors.join('\n  ')}`);
  if (result.rows !== 3) {
    throw new Error(`Expected 3 rendered rows, saw ${result.rows}.`);
  }
  if (!result.hasApi) throw new Error('grid.api is not exposed.');

  console.log(
    `README quick start OK — ${result.rows} rows and ${result.headers} headers rendered, ` +
      'sizeColumnsToFit() clean, no console errors.',
  );
} finally {
  await browser.close();
}
