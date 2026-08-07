/**
 * The React README's quick-start snippet, verbatim (minus the surrounding prose).
 *
 * @see ./core-quickstart.ts for why these live in the repo.
 */
import { useCallback } from 'react';
import { PhotonGrid } from 'photon-grid-react';
import type { PhotonGridColumnDef } from 'photon-grid-react';
import type { GridApi, GridOptions } from 'photon-grid-core';

const columns: PhotonGridColumnDef[] = [
  { field: 'sku',      header: 'SKU',      width: 110, pinned: 'left' },
  { field: 'product',  header: 'Product',  width: 190 },
  { field: 'category', header: 'Category', width: 140 },
  { field: 'price',    header: 'Price',    width: 120, type: 'number', editable: true },
  { field: 'released', header: 'Released', width: 130, type: 'date' },
];

const rows = [
  { sku: 'PG-1001', product: 'Photon Keyboard', category: 'Hardware', price: 1249, released: '2024-01-18' },
  { sku: 'PG-1002', product: 'Quantum Mouse',   category: 'Hardware', price:  349, released: '2024-02-04' },
  { sku: 'PG-1003', product: 'Nebula Dock',     category: 'Hardware', price: 2199, released: '2024-02-22' },
];

const options: Partial<GridOptions> = {
  mode: 'light',
  rowHeight: 40,
  showSerialNumber: true,
  pagination: { enabled: true, pageSize: 10 },
  editing: { mode: 'cell' },
};

export function Products() {
  const onGridReady = useCallback((api: GridApi) => {
    api.sizeColumnsToFit();
  }, []);

  return (
    <div style={{ height: 460 }}>
      <PhotonGrid
        columns={columns}
        dataSet={rows}
        options={options}
        onGridReady={onGridReady}
        onCellValueChanged={(e) => console.log('cell changed', e)}
      />
    </div>
  );
}

/** The renderer snippet further down the README. */
const StatusBadge = ({ value }: Record<string, unknown>) => (
  <span className="badge">{String(value)}</span>
);

export const rendererColumns: PhotonGridColumnDef[] = [
  { field: 'status', header: 'Status', renderer: { display: StatusBadge } },
];
