<script setup>
/**
 * The baseline demo: one grid over 100 000 client-side rows.
 *
 * The Vue wrapper forwards column definitions to the core untouched, so cell
 * renderers here are plain `(params) => HTMLElement` functions rather than Vue
 * components — see `src/lib/cell-renderers.js` for why that is the right trade
 * for a virtualized cell. Vue *components* are still supported where the
 * lifecycle is coarse enough to pay for itself; the Master/Detail demo uses one
 * for its detail panel.
 *
 * Also on: the configurable toolbar (event-only tabs + global search wired to
 * the quick-filter), the Import engine, row grouping, pagination and the Photon
 * AI panel.
 */
import PhotonGrid from '../../../../packages/photon-grid-vue/src/photon-grid';
import {
  HeaderIconDisplay,
  PhotonAIProviderType,
  ToastPosition,
  ToolbarSearchPosition,
} from 'photon-grid-core';

import { countryCellRenderer, employeeCellRenderer } from '../lib/cell-renderers';
import { COUNTRY_FLAGS, generateData } from '../lib/employees';
import { environment } from '../environment';
import './demos.css';

const ROW_COUNT = 100_000;
const rowCountLabel = ROW_COUNT.toLocaleString();

const data = generateData(ROW_COUNT);

const columns = [
  {
    // Only `field` is required — `colId`, `header` ("Full Name") and `type`
    // ('string') are inferred by the core.
    field: 'fullName',
    rowDrag: true,
    renderer: { display: employeeCellRenderer },
    // The funnel and "⋯" buttons are opt-in per column, so a grid only shows
    // them where they are wanted.
    filterable: true,
    configurable: true,
    filterIconDisplay: HeaderIconDisplay.ALWAYS,
    menuIconDisplay: HeaderIconDisplay.ALWAYS,
  },
  {
    colId: 'email',
    field: 'email',
    header: 'Email',
    type: 'string',
    width: 240,
    renderer: {
      // Building an `HTMLElement` (rather than an HTML string) sidesteps any
      // injection concern for data values.
      display: (params) => {
        const strong = document.createElement('strong');
        strong.textContent = String(params.value ?? '');
        return strong;
      },
    },
  },
  { colId: 'department', field: 'department', header: 'Department', type: 'string', width: 160, groupable: true, filterable: true, configurable: true },
  { colId: 'jobTitle', field: 'jobTitle', header: 'Job Title', type: 'string', width: 180, groupable: true },
  { colId: 'salary', field: 'salary', header: 'Salary', type: 'currency', width: 140, aggFunc: 'max', filterable: true, configurable: true },
  { colId: 'age', field: 'age', header: 'Age', type: 'number', width: 90, aggFunc: 'avg' },
  { colId: 'experience', field: 'experience', header: 'Experience', type: 'number', width: 120, aggFunc: 'avg' },
  {
    colId: 'country',
    field: 'country',
    header: 'Country',
    type: 'dropdown',
    editable: true,
    width: 160,
    groupable: true,
    // The same renderer for the cell and the dropdown's options, so the editor
    // looks exactly like what it edits.
    renderer: { display: countryCellRenderer, option: countryCellRenderer },
    enumOptions: Object.keys(COUNTRY_FLAGS),
  },
  { colId: 'city', field: 'city', header: 'City', type: 'string', minWidth: 150, groupable: true },
  { colId: 'phone', field: 'phone', header: 'Phone', type: 'string', minWidth: 170, flex: 1 },
  { colId: 'joinDate', field: 'joinDate', header: 'Join Date', type: 'date', minWidth: 140, flex: 1 },
  { colId: 'active', field: 'active', header: 'Active', type: 'boolean', minWidth: 100, width: 120 },
  { colId: 'rating', field: 'rating', header: 'Rating', type: 'number', minWidth: 100, width: 120 },
];

const options = {
  mode: 'dark',
  variant: 'neon',
  showCheckboxes: false,
  showSerialNumber: true,
  rowShading: false,
  showGroupingBar: true,
  showVerticalBorders: false,
  showFilterRow: false,
  // Header icons: keep the filter funnel always visible, hide the "⋯" menu.
  headerIcons: {
    filter: HeaderIconDisplay.HIDDEN,
    menu: HeaderIconDisplay.HIDDEN,
  },
  toast: { position: ToastPosition.TopRight },
  rowHeight: 42,
  pagination: { enabled: true, pageSize: 1000 },
  // Import Engine: mounts the top-right "Import ▾" button. CSV/TSV/Clipboard
  // work out of the box. For binary .xlsx/.xls, install the optional `xlsx`
  // peer and register the SheetJS parser in `onGridReady`:
  //
  //   import { SheetJsWorkbookParser } from 'photon-grid-core/import/sheetjs';
  //   import * as XLSX from 'xlsx';
  //   api.registerImportParser(new SheetJsWorkbookParser(XLSX));
  //
  // The core barrel never references `xlsx`, so Grid Core stays zero-dependency
  // either way.
  import: { enabled: true },
  // Toolbar: a configurable strip above the header. Left-aligned tabs
  // (event-only — the host reacts to TOOLBAR_TAB_CHANGED), a left-docked global
  // search wired to the quick-filter, and visibility toggles for the Filters
  // funnel + Import button on the right.
  toolbar: {
    enabled: true,
    showFilterButton: true,
    showImportButton: true,
    search: {
      enabled: true,
      position: ToolbarSearchPosition.Left,
      placeholder: 'Search records…',
    },
    tabs: {
      activeTabId: 'active',
      items: [
        { id: 'active', label: 'Active' },
        { id: 'inactive', label: 'Inactive' },
        { id: 'final', label: 'Final Settlement' },
        { id: 'archived', label: 'Archived', disabled: true },
      ],
    },
  },
  filterRowHeight: 48,
  headerRowHeight: 48,
  selection: { mode: 'multiple', serialColumnSelection: true },
  photonAI: {
    enabled: true,
    provider: {
      type: PhotonAIProviderType.Gemini,
      apiKey: environment.gemeniApiKey,
      model: 'gemini-flash-latest',
    },
  },
};

function onGridReady(api) {
  console.log('[photon-grid] ready — visible rows:', api.getVisibleRows().length);
}

function onRowClicked(event) {
  console.log('[photon-grid] row clicked:', event);
}

function onRowSelected(event) {
  console.log('[photon-grid] selection changed — selected:', event.selectedCount);
}
</script>

<template>
  <header class="demo__header">
    <div>
      <h2 class="demo__title">Basic Grid</h2>
      <p class="demo__subtitle">
        {{ rowCountLabel }} client-side rows with function-based cell renderers, a shared
        display/option renderer for the country dropdown, the configurable toolbar, the Import
        engine, row grouping, pagination and the Photon AI panel.
      </p>
    </div>
  </header>

  <section class="demo__grid demo__grid--tall">
    <PhotonGrid
      :columns="columns"
      :data-set="data"
      :options="options"
      @grid-ready="onGridReady"
      @row-clicked="onRowClicked"
      @row-selected="onRowSelected"
    />
  </section>
</template>
