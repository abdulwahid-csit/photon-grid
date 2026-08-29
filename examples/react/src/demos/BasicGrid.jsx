import { useCallback, useMemo } from 'react';

import { PhotonGrid } from 'photon-grid-react'
import {
  HeaderIconDisplay,
  PhotonAIProviderType,
  ToastPosition,
  ToolbarSearchPosition,
} from 'photon-grid-core';

import EmployeeCell from '../components/EmployeeCell';
import CountryCell from '../components/CountryCell';
import { COUNTRY_FLAGS, generateData } from '../lib/employees';
import { environment } from '../environment';
import './demos.css';

/**
 * The baseline demo: one grid over 100 000 client-side rows, exercising the
 * three renderer forms the React wrapper supports side by side.
 *
 * - **Component renderer** — `fullName` mounts {@link EmployeeCell} through a
 *   portal, so a real React component (with hooks, memoization and all) renders
 *   inside a virtualized cell.
 * - **Function renderer** — `email` builds an `HTMLElement` directly. No React
 *   component is needed just to bold a value, and returning an element (rather
 *   than an HTML string) sidesteps any injection concern for data values.
 * - **Shared display/option renderer** — `country` uses {@link CountryCell} for
 *   both the cell and the dropdown editor's options.
 *
 * Also on: the configurable toolbar (event-only tabs + global search wired to
 * the quick-filter), the Import engine, row grouping, pagination and the
 * Photon AI panel.
 */

const ROW_COUNT = 100_000;

export function BasicGrid() {
  const data = useMemo(() => generateData(ROW_COUNT), []);

  const columns = useMemo(() => [
    {
      // Only `field` is required — `colId`, `header` ("Full Name") and `type`
      // ('string') are inferred by the core.
      field: 'fullName',
      rowDrag: true,
      renderer: { display: EmployeeCell },
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
      renderer: { display: CountryCell, option: CountryCell },
      enumOptions: Object.keys(COUNTRY_FLAGS),
    },
    { colId: 'city', field: 'city', header: 'City', type: 'string', minWidth: 150, groupable: true },
    { colId: 'phone', field: 'phone', header: 'Phone', type: 'string', minWidth: 170, flex: 1 },
    { colId: 'joinDate', field: 'joinDate', header: 'Join Date', type: 'date', minWidth: 140, flex: 1 },
    { colId: 'active', field: 'active', header: 'Active', type: 'boolean', minWidth: 100, width: 120 },
    { colId: 'rating', field: 'rating', header: 'Rating', type: 'number', minWidth: 100, width: 120 },
  ], []);

  const options = useMemo(() => ({
    // mode: 'dark',
    // variant: 'neon',
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
    // The core barrel never references `xlsx`, so Grid Core stays
    // zero-dependency either way.
    import: { enabled: true },
    // Toolbar: a configurable strip above the header. Left-aligned tabs
    // (event-only — the host reacts in `onToolbarTabChanged`), a left-docked
    // global search wired to the quick-filter, and visibility toggles for the
    // Filters funnel + Import button on the right.
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
  }), []);

  const onGridReady = useCallback((api) => {
    console.log('[photon-grid] ready — visible rows:', api.getVisibleRows().length);
  }, []);

  const onRowClicked = useCallback((event) => {
    console.log('[photon-grid] row clicked:', event);
  }, []);

  const onRowSelected = useCallback((event) => {
    console.log('[photon-grid] selection changed — selected:', event.selectedCount);
  }, []);

  return (
    <>
      <header className="demo__header">
        <div>
          <h2 className="demo__title">Basic Grid</h2>
          <p className="demo__subtitle">
            {ROW_COUNT.toLocaleString()} client-side rows with component, function and shared
            display/option cell renderers, the configurable toolbar, the Import engine, row
            grouping, pagination and the Photon AI panel.
          </p>
        </div>
      </header>

      <section className="demo__grid demo__grid--tall">
        <PhotonGrid
          columns={columns}
          dataSet={data}
          options={options}
          onGridReady={onGridReady}
          onRowClicked={onRowClicked}
          onRowSelected={onRowSelected}
        />
      </section>
    </>
  );
}

export default BasicGrid;
