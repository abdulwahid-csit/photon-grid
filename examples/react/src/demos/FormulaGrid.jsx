import { useCallback, useMemo } from 'react';

import { PhotonGrid } from '../../../../packages/photon-grid-react/src/photon-grid';
import {
  AutoFillDetectorName,
  ColumnGroupResizeStrategy,
  GridEventType,
  HeaderIconDisplay,
  ToastPosition,
  ToolbarSearchPosition,
} from 'photon-grid-core';

import './demos.css';

/**
 * Formula Playground — the Formula Engine over a spreadsheet-shaped grid.
 *
 * Columns are headed `A`, `B`, `C`… so A1-style cell references are easy to
 * reason about: the addressable columns map to `A = product`, `B = day`,
 * `C = quantity`, `D = unitPrice`, `E = total`, `F = taxRate`, `G = grandTotal`,
 * and rows are `1`-based in data order.
 *
 * `total` and `grandTotal` opt in via `ColumnDef.allowFormula` and are
 * `editable`, so you can click a cell, type `=C2*D2` or `=SUM(E1:E8)` and watch
 * it recalculate. The plain input columns are editable too — editing them
 * re-evaluates every dependent formula automatically, because
 * `formula.autoRecalculate` keeps the dependency graph live.
 *
 * Nothing is seeded imperatively: formulas are declared entirely in the column
 * definitions (`ColumnDef.formula`) and in row data (`=`-prefixed values), and
 * the grid discovers and registers them at load. `GridApi.setCellFormula` still
 * works for runtime changes and overrides any declared formula.
 */

/** Number of generated data rows (a TOTAL row is appended on top of these). */
const ROW_COUNT = 1000;
/** Extra spreadsheet-style scratch columns appended after `grandTotal`. */
const EXTRA_COLUMNS = 50;

const PRODUCTS = [
  'Wireless Mouse', 'Mechanical Keyboard', '27" Monitor', 'USB-C Dock',
  'Laptop Stand', 'Webcam 1080p', 'Noise-cancel Headset', 'Desk Lamp',
  'External SSD', 'Gaming Chair', 'Bluetooth Speaker', 'Graphics Tablet',
  'Smartphone Stand', 'Portable Charger', 'Office Chair', 'Microphone',
  'LED Keyboard', 'Wireless Charger', 'HDMI Cable', 'Ethernet Adapter',
];

/** Spreadsheet column name for a zero-based index: 0 → `A`, 26 → `AA`. */
function excelColumnName(index) {
  let name = '';
  let i = index;
  while (i >= 0) {
    name = String.fromCharCode((i % 26) + 65) + name;
    i = Math.floor(i / 26) - 1;
  }
  return name;
}

function buildColumns(extraColumns) {
  const columns = [
    { colId: 'product', field: 'product', header: excelColumnName(0), type: 'string', rowDrag: true, minWidth: 160, width: 160, flex: 1 },
    { colId: 'days', field: 'day', header: excelColumnName(1), type: 'string', editable: true, minWidth: 120, flex: 1 },
    { colId: 'quantity', field: 'quantity', header: excelColumnName(2), type: 'number', editable: true, minWidth: 120, flex: 1 },
    { colId: 'unitPrice', field: 'unitPrice', header: excelColumnName(3), type: 'currency', editable: true, minWidth: 120, flex: 1 },
    {
      colId: 'total', field: 'total', header: excelColumnName(4), type: 'currency',
      editable: true, allowFormula: true, formula: '=quantity * unitPrice', minWidth: 120, flex: 1,
    },
    { colId: 'taxRate', field: 'taxRate', header: excelColumnName(5), type: 'number', editable: true, minWidth: 120, flex: 1 },
    {
      colId: 'grandTotal', field: 'grandTotal', header: excelColumnName(6), type: 'currency',
      editable: true, allowFormula: true, formula: '=total * (1 + taxRate)', minWidth: 120, flex: 1,
    },
  ];

  // Scratch columns, continuing the spreadsheet naming from H onwards.
  const startIndex = columns.length;
  for (let i = 0; i < extraColumns; i++) {
    columns.push({
      colId: `col${startIndex + i}`,
      field: `col${startIndex + i}`,
      header: excelColumnName(startIndex + i),
      type: 'number',
      editable: true,
      minWidth: 120,
      flex: 1,
    });
  }

  return columns;
}

/**
 * Seed rows. `total`/`grandTotal` are **not** set on the product rows — the
 * column formulas fill them. Every tenth row carries a per-row override in its
 * data, and the final `TOTAL` row carries row-data formulas that aggregate the
 * rows above, overriding the column formula for that one row.
 */
function buildData(count) {
  const rows = [];

  for (let i = 0; i < count; i++) {
    const row = {
      product: PRODUCTS[i % PRODUCTS.length],
      quantity: Math.floor(Math.random() * 20) + 1,
      unitPrice: Math.floor(Math.random() * 250) + 20,
      taxRate: Math.random() > 0.5 ? 0.08 : 0.05,
    };

    if ((i + 1) % 10 === 0) {
      row.total = '=quantity * unitPrice * 0.9';
    }

    rows.push(row);
  }

  rows.push({
    product: 'TOTAL',
    total: `=SUM(D1:D${count})`,
    grandTotal: `=SUM(F1:F${count})`,
  });

  return rows;
}

export function FormulaGrid() {
  const data = useMemo(() => buildData(ROW_COUNT), []);
  const columns = useMemo(() => buildColumns(EXTRA_COLUMNS), []);

  const options = useMemo(() => ({
    mode: 'dark',
    variant: 'neon',
    showCheckboxes: true,
    showSerialNumber: false,
    rowShading: false,
    showVerticalBorders: false,
    rowHeight: 36,
    headerRowHeight: 44,
    showGroupingBar: true,
    showFilterRow: false,
    animateRows: true,
    autofill: {
      detectors: [AutoFillDetectorName.Date],
      enabled: false,
      locale: 'en-US',
    },
    chartThemeOverrides: { aggregation: 'count', categoryColId: 'col' },
    chartToolPanelsDef: { defaultToolPanel: 'chart', panels: ['setup'] },
    columnGroups: {
      defaultCollapsedWidth: 200,
      defaultResizeStrategy: ColumnGroupResizeStrategy.PROPORTIONAL,
      enabled: true,
      suppressOpenByDefault: true,
    },
    columnMenu: {
      customItems: [
        { label: 'Custom Action', icon: 'trash', action: (event) => console.log('Custom action clicked!', event) },
      ],
    },
    // The one feature that differs from a plain grid: enabling this activates
    // the Formula Engine so `allowFormula` columns treat a leading `=` as a
    // formula. `autoRecalculate` keeps dependent cells live as you edit inputs.
    formula: {
      enabled: true,
      autoRecalculate: true,
      enableCaching: true,
    },
    filtersToolPanel: { enabled: true },
    pagination: { enabled: true, pageSize: 10000 },
    editing: { mode: 'none' },
    enableCellSelection: false,
    enableCharts: false,
    enableFullScreen: true,
    toast: { duration: 10000, position: ToastPosition.TopRight },
    selection: {
      serialColumnSelection: true,
      suppressRowDeselection: false,
      mode: 'multiple',
      headerCheckbox: true,
      checkboxSelection: true,
      selectAllOnHeaderClick: true,
    },
    // With the Formula Engine on, imported `=A1+B1` cells register and compute
    // through the one Formula Engine — the importer never evaluates them.
    import: { enabled: true },
    toolbar: {
      enabled: true,
      showFilterButton: true,
      showImportButton: true,
      search: {
        enabled: true,
        position: ToolbarSearchPosition.Right,
        placeholder: 'Search products…',
      },
      tabs: {
        activeTabId: 'overview',
        items: [
          { id: 'overview', label: 'Overview' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'customers', label: 'Customers' },
          { id: 'orders', label: 'Orders' },
          { id: 'products', label: 'Products' },
          { id: 'inventory', label: 'Inventory' },
          { id: 'sales', label: 'Sales' },
          { id: 'marketing', label: 'Marketing' },
          { id: 'support', label: 'Support' },
          { id: 'settings', label: 'Settings' },
        ],
      },
    },
    headerIcons: {
      filter: HeaderIconDisplay.HIDDEN,
      menu: HeaderIconDisplay.HIDDEN,
    },
  }), []);

  /**
   * Toolbar events are not part of the wrapper's fixed prop surface, so they
   * are taken straight off the grid's event bus — the same channel every other
   * feature publishes on, and the escape hatch for any event the wrapper does
   * not expose as a prop.
   */
  const onGridReady = useCallback((api) => {
    // Tabs are event-only, so the host owns the behaviour — here we simply log
    // it, but a real app would swap the data set, apply a filter model, or call
    // an API for the selected view.
    api.on(GridEventType.TOOLBAR_TAB_CHANGED, (event) => {
      console.log(`[photon-grid] tab changed: ${event.previousTabId} → ${event.tabId}`, event.tab);
    });

    // The grid already quick-filters on the toolbar search; this is host-side
    // telemetry only.
    api.on(GridEventType.TOOLBAR_SEARCH_CHANGED, (event) => {
      console.log('[photon-grid] toolbar search:', event.query);
    });
  }, []);

  return (
    <>
      <header className="demo__header">
        <div>
          <h2 className="demo__title">Formula Playground</h2>
          <p className="demo__subtitle">
            A grid with the <code>formula</code> engine enabled. <strong>E</strong> and{' '}
            <strong>G</strong> are declared with formulas (<code>=quantity * unitPrice</code>,{' '}
            <code>=total * (1 + taxRate)</code>) and the TOTAL row uses{' '}
            <code>=SUM(D1:D{ROW_COUNT})</code>. Edit any <strong>C</strong>, <strong>D</strong> or{' '}
            <strong>F</strong> cell — or type your own <code>=</code> formula into a total cell —
            and watch dependents recalculate.
          </p>
        </div>
      </header>

      <section className="demo__grid demo__grid--tall">
        <PhotonGrid
          columns={columns}
          dataSet={data}
          options={options}
          onGridReady={onGridReady}
        />
      </section>
    </>
  );
}

export default FormulaGrid;
