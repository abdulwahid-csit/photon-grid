/**
 * The Vue README's quick-start snippet — the `<script setup>` body, verbatim.
 *
 * The template half is not type-checkable without `vue-tsc`; the props it binds
 * (`columns`, `data-set`, `options`) are the ones declared below, and the emit
 * names are asserted against the component's own `emits` list.
 *
 * @see ./core-quickstart.ts for why these live in the repo.
 */
import type { ColumnDefInput, GridApi, GridOptions } from 'photon-grid-vue';

export const columns: ColumnDefInput[] = [
  { field: 'sku',      header: 'SKU',      width: 110, pinned: 'left' },
  { field: 'product',  header: 'Product',  width: 190 },
  { field: 'category', header: 'Category', width: 140 },
  { field: 'price',    header: 'Price',    width: 120, type: 'number', editable: true },
  { field: 'released', header: 'Released', width: 130, type: 'date' },
];

export const rows = [
  { sku: 'PG-1001', product: 'Photon Keyboard', category: 'Hardware', price: 1249, released: '2024-01-18' },
  { sku: 'PG-1002', product: 'Quantum Mouse',   category: 'Hardware', price:  349, released: '2024-02-04' },
  { sku: 'PG-1003', product: 'Nebula Dock',     category: 'Hardware', price: 2199, released: '2024-02-22' },
];

export const options: Partial<GridOptions> = {
  mode: 'light',
  rowHeight: 40,
  showSerialNumber: true,
  pagination: { enabled: true, pageSize: 10 },
  editing: { mode: 'cell' },
};

export function onGridReady(api: GridApi): void {
  api.sizeColumnsToFit();
}
