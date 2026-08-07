/**
 * Captures the README screenshots.
 *
 * Renders the real grid — the built CDN bundle, not a mock — in headless Chrome
 * and writes PNGs to `assets/screenshots/`. Kept as a script rather than
 * hand-taken screenshots so the images can be regenerated after a visual change
 * instead of slowly drifting away from what the library actually looks like.
 *
 * Usage:
 *   npm run build:core           # produces dist/photon-grid.min.js
 *   node scripts/capture-screenshots.mjs
 *
 * Chrome is used through Playwright's `channel: 'chrome'`, so no browser
 * download is needed on a machine that already has it.
 */

import { chromium } from 'playwright';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = join(ROOT, 'packages/photon-grid-core/dist/photon-grid.min.js');
const OUT_DIR = join(ROOT, 'assets/screenshots');

/** Sample rows, written out rather than generated so the images are identical run to run. */
const ROWS = [
  ['PG-1001', 'Photon Keyboard',   'Hardware',     'Ada Lovelace',      1249,  87, 'In stock',    '2024-01-18'],
  ['PG-1002', 'Quantum Mouse',     'Hardware',     'Grace Hopper',       349, 142, 'In stock',    '2024-02-04'],
  ['PG-1003', 'Nebula Dock',       'Hardware',     'Alan Turing',       2199,  12, 'Low stock',   '2024-02-22'],
  ['PG-1004', 'Ion Display 27"',   'Hardware',     'Katherine Johnson', 5490,  34, 'In stock',    '2024-03-09'],
  ['PG-1005', 'Photon Cloud',      'Subscription', 'Barbara Liskov',     990, 512, 'In stock',    '2024-03-27'],
  ['PG-1006', 'Grid Analytics',    'Software',     'Donald Knuth',      1790,  76, 'In stock',    '2024-04-11'],
  ['PG-1007', 'Support Plan',      'Services',     'Margaret Hamilton',  450, 208, 'In stock',    '2024-05-02'],
  ['PG-1008', 'Neon Cable Kit',    'Hardware',     'Edsger Dijkstra',     89,   4, 'Low stock',   '2024-05-19'],
  ['PG-1009', 'Vector Router',     'Hardware',     'Ada Lovelace',      1590,  61, 'In stock',    '2024-06-07'],
  ['PG-1010', 'Pulse Sensor',      'Hardware',     'Grace Hopper',       230,   0, 'Out of stock','2024-06-25'],
  ['PG-1011', 'Photon Studio',     'Software',     'Alan Turing',       3200,  45, 'In stock',    '2024-07-14'],
  ['PG-1012', 'Onboarding',        'Services',     'Katherine Johnson',  780,  95, 'In stock',    '2024-08-01'],
];

/** The page under test: one script tag, one container, one `createGrid` call. */
function page(bundle, mode) {
  const data = JSON.stringify(
    ROWS.map(([sku, product, category, owner, price, stock, status, released]) => ({
      sku, product, category, owner, price, stock, status, released,
    })),
  );

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; padding: 0; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
      body { background: ${mode === 'dark' ? '#0f172a' : '#ffffff'}; padding: 20px; box-sizing: border-box; }
      #grid { height: 460px; }
    </style>
    <script>${bundle}</script>
  </head>
  <body>
    <div id="grid"></div>
    <script>
      const currency = (v) => '$' + Number(v).toLocaleString('en-US');

      window.grid = PhotonGrid.createGrid('#grid', {
        mode: '${mode}',
        rowHeight: 40,
        headerRowHeight: 44,
        showSerialNumber: true,
        pagination: { enabled: true, pageSize: 10 },
        columns: [
          { field: 'sku',      header: 'SKU',      width: 110, pinned: 'left' },
          { field: 'product',  header: 'Product',  width: 190 },
          { field: 'category', header: 'Category', width: 140 },
          { field: 'owner',    header: 'Owner',    width: 170 },
          { field: 'price',    header: 'Price',    width: 120, type: 'number', valueFormatter: (p) => currency(p.value) },
          { field: 'stock',    header: 'Stock',    width: 100, type: 'number' },
          { field: 'status',   header: 'Status',   width: 130 },
          { field: 'released', header: 'Released', width: 130, type: 'date' },
        ],
        data: ${data},
      });

      // Fills the container rather than leaving a gutter on the right — the
      // same call an application makes after its first layout.
      window.grid.api.sizeColumnsToFit();
    </script>
  </body>
</html>`;
}

async function main() {
  const bundle = await readFile(BUNDLE, 'utf8').catch(() => {
    throw new Error(
      `Missing ${BUNDLE}.\nRun "npm run build:core" first — the screenshots render the real bundle.`,
    );
  });

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const mode of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 520 },
        deviceScaleFactor: 2,
      });
      const tab = await context.newPage();

      const html = join(OUT_DIR, `.page-${mode}.html`);
      await writeFile(html, page(bundle, mode), 'utf8');
      await tab.goto(`file://${html.replace(/\\/g, '/')}`);
      await tab.waitForSelector('.pg-row', { timeout: 15_000 });
      // One frame past first paint, so the header and rows have settled.
      await tab.waitForTimeout(400);

      const file = join(OUT_DIR, `grid-${mode}.png`);
      await tab.locator('#grid').screenshot({ path: file });
      console.log(`wrote ${file}`);

      await rm(html, { force: true });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

await main();
