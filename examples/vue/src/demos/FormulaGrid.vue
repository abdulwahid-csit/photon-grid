<script setup>
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
import PhotonGrid from '../../../../packages/photon-grid-vue/src/photon-grid';
import {
  AutoFillDetectorName,
  ColumnGroupResizeStrategy,
  GridEventType,
  HeaderIconDisplay,
  ToastPosition,
  ToolbarSearchPosition,
} from 'photon-grid-core';

import { buildColumns, buildData, EXTRA_COLUMNS, ROW_COUNT } from '../lib/formula';
import './demos.css';

const rowCount = ROW_COUNT;

const data = buildData(ROW_COUNT);
const columns = buildColumns(EXTRA_COLUMNS);

const options = {
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
  // The one feature that differs from a plain grid: enabling this activates the
  // Formula Engine so `allowFormula` columns treat a leading `=` as a formula.
  // `autoRecalculate` keeps dependent cells live as you edit inputs.
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
};

/**
 * Toolbar events are not part of the wrapper's emit surface, so they are taken
 * straight off the grid's event bus — the same channel every other feature
 * publishes on, and the escape hatch for any event the wrapper does not expose.
 */
function onGridReady(api) {
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
}
</script>

<template>
  <header class="demo__header">
    <div>
      <h2 class="demo__title">Formula Playground</h2>
      <p class="demo__subtitle">
        A grid with the <code>formula</code> engine enabled. <strong>E</strong> and
        <strong>G</strong> are declared with formulas (<code>=quantity * unitPrice</code>,
        <code>=total * (1 + taxRate)</code>) and the TOTAL row uses
        <code>=SUM(D1:D{{ rowCount }})</code>. Edit any <strong>C</strong>, <strong>D</strong> or
        <strong>F</strong> cell — or type your own <code>=</code> formula into a total cell — and
        watch dependents recalculate.
      </p>
    </div>
  </header>

  <section class="demo__grid demo__grid--tall">
    <PhotonGrid
      :columns="columns"
      :data-set="data"
      :options="options"
      @grid-ready="onGridReady"
    />
  </section>
</template>
