/**
 * The core README's quick-start snippet, verbatim.
 *
 * Kept compiling as part of the repo so the published example cannot silently
 * drift from the API it documents — a README that no longer compiles is worse
 * than no README, because the reader trusts it.
 */
import { createGrid } from 'photon-grid-core';

const grid = createGrid('#grid', {
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

// The options block the README lists under "Common options".
createGrid('#grid', {
  columns: [{ field: 'a' }],
  data: [],
  mode: 'dark',
  variant: 'quantum',
  rowHeight: 40,
  headerRowHeight: 44,
  showSerialNumber: true,
  editing: { mode: 'cell', singleClickEdit: true },
  pagination: { enabled: true, pageSize: 25 },
  formula: { enabled: true },
  rowModel: 'server',
});

export {};
