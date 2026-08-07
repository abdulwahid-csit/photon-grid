# ⚡ Photon Grid — Data Grid & Data Table for JavaScript, Angular, React and Vue

> **Photon Grid** is a modern, high-performance **TypeScript data grid** for **JavaScript, Angular, React and Vue**: virtual scrolling over millions of rows, Excel-style editing and formulas, grouping, tree data, master/detail, pinning, themes — from one zero-dependency engine.

<p align="center">
  <img src="https://raw.githubusercontent.com/abdulwahid-csit/photon-grid/main/assets/logo.svg" alt="Photon Grid — JavaScript data grid / data table" width="180"/>
</p> 

<p align="center">
  <a href="https://www.npmjs.com/package/photon-grid-core"><img src="https://img.shields.io/npm/v/photon-grid-core?label=photon-grid-core" alt="core version"/></a>
  <a href="https://www.npmjs.com/package/photon-grid-angular"><img src="https://img.shields.io/npm/v/photon-grid-angular?label=angular" alt="angular version"/></a>
  <a href="https://www.npmjs.com/package/photon-grid-react"><img src="https://img.shields.io/npm/v/photon-grid-react?label=react" alt="react version"/></a>
  <a href="https://www.npmjs.com/package/photon-grid-vue"><img src="https://img.shields.io/npm/v/photon-grid-vue?label=vue" alt="vue version"/></a>
  <img src="https://img.shields.io/badge/dependencies-0-success" alt="zero dependencies"/>
  <img src="https://img.shields.io/npm/l/photon-grid-core" alt="license"/>
</p>

---

![Photon Grid data table screenshot — light theme](https://raw.githubusercontent.com/abdulwahid-csit/photon-grid/main/assets/screenshots/grid-light.png)

<details>
<summary>Dark theme</summary>

![Photon Grid data table screenshot — dark theme](https://raw.githubusercontent.com/abdulwahid-csit/photon-grid/main/assets/screenshots/grid-dark.png)

</details>

*Regenerate these with `node scripts/capture-screenshots.mjs` — they render the real built bundle in headless Chrome.*

---

## Packages

| Package | For | npm |
|---|---|---|
| [`photon-grid-core`](packages/photon-grid-core) | Vanilla JS / TypeScript, and the engine behind every wrapper | [![npm](https://img.shields.io/npm/v/photon-grid-core)](https://www.npmjs.com/package/photon-grid-core) |
| [`photon-grid-angular`](packages/photon-grid-angular) | Angular 18+ | [![npm](https://img.shields.io/npm/v/photon-grid-angular)](https://www.npmjs.com/package/photon-grid-angular) |
| [`photon-grid-react`](packages/photon-grid-react) | React 18+ | [![npm](https://img.shields.io/npm/v/photon-grid-react)](https://www.npmjs.com/package/photon-grid-react) |
| [`photon-grid-vue`](packages/photon-grid-vue) | Vue 3.4+ | [![npm](https://img.shields.io/npm/v/photon-grid-vue)](https://www.npmjs.com/package/photon-grid-vue) |

No CSS import is required in any of them — the core injects its own stylesheet on first render.

---

## Quick start

### JavaScript / TypeScript

```bash
npm install photon-grid-core
```

```ts
import { createGrid } from 'photon-grid-core';

const grid = createGrid('#grid', {
  columns: [
    { field: 'sku',     header: 'SKU',     width: 110, pinned: 'left' },
    { field: 'product', header: 'Product', width: 190 },
    { field: 'price',   header: 'Price',   width: 120, type: 'number' },
  ],
  data: rows,
  pagination: { enabled: true, pageSize: 10 },
});

grid.api.sizeColumnsToFit();
```

### Angular

```bash
npm install photon-grid-angular photon-grid-core
```

```html
<photon-grid-angular
  [columns]="columns"
  [dataSet]="rows"
  [options]="options"
  (gridReady)="onGridReady($event)">
</photon-grid-angular>
```

### React

```bash
npm install photon-grid-react
```

```tsx
<PhotonGrid columns={columns} dataSet={rows} options={options} onGridReady={onGridReady} />
```

### Vue

```bash
npm install photon-grid-vue photon-grid-core
```

```vue
<PhotonGrid :columns="columns" :data-set="rows" :options="options" @grid-ready="onGridReady" />
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/photon-grid-core/dist/photon-grid.min.js"></script>
<script>
  PhotonGrid.createGrid('#grid', { columns, data });
</script>
```

Each package's README carries the full example, prop tables and event lists.

---

## Features

**Rendering & scale** — virtual row and column rendering, a Virtual DOM cell patcher for streaming updates, millions of rows, thousands of columns, DOM bounded by viewport rather than data size.

**Columns** — pinning (left/right), resize, reorder, auto-size, size-to-fit, column groups with multi-row headers, visibility, per-column state serialization.

**Data** — sorting and multi-column sorting, filtering, quick filter, filter panels, row grouping with aggregations, tree data, master–detail rows, pagination, and client / server-side / infinite row models.

**Editing** — 15+ cell editors (text, number, date, time, select, autocomplete, checkbox, colour, range …), declarative and async validation, row validators, fill handle, clipboard, undo/redo, and an Excel-style formula engine with A1 references and 55+ functions.

**Presentation** — light/dark modes plus five variants (`classic`, `ion`, `neon`, `photon`, `quantum`), all driven by CSS custom properties; built-in and fully custom cell renderers; summary rows; status bar; context menus; charts.

**Platform** — full keyboard navigation, ARIA roles, screen-reader support, RTL, CSV/Excel export, CSV/Excel/clipboard import, a typed event bus, a documented `GridApi`, and an optional natural-language AI panel.

---

## Use cases

Admin dashboards · CRM · ERP · financial and trading platforms · healthcare systems · HR software · inventory management · analytics and reporting · business intelligence · any data-intensive enterprise application.

---

## Development

```bash
git clone https://github.com/abdulwahid-csit/photon-grid.git
cd photon-grid

npm run setup          # install workspaces + example apps

npm run dev:angular    # core watch + wrapper watch + Angular example
npm run dev:react      # core watch + React example
npm run dev:vue        # core watch + Vue example
npm run dev:vanilla    # core watch + a static server

npm run build          # build every package
npm run typecheck      # type-check the core
```

The monorepo:

```
packages/
├── photon-grid-core      # the engine
├── photon-grid-angular   # Angular wrapper
├── photon-grid-react     # React wrapper
└── photon-grid-vue       # Vue wrapper
examples/
├── angular · react · vue # runnable demo apps
scripts/                  # release + screenshot tooling
```

---

## Status

Photon Grid is under active development; features and performance work land regularly. Issues and feature requests are welcome — please open an issue before a large pull request.

Currently in progress: the documentation website, and pivot tables.

---

## Keywords

grid, data grid, datagrid, table, data table, datatable, table data, javascript grid, javascript data grid, typescript data grid, js table, html table component, angular table, angular data grid, react table, reacttable, react data grid, vue table, vue data grid, spreadsheet, excel grid, excel-like table, editable table, virtual scroll, virtualized table, infinite scroll, large dataset, million rows, tree grid, row grouping, pivot, sorting, filtering, pagination, column pinning, column resize, column reorder, row selection, cell selection, clipboard, csv export, excel export, enterprise data grid, ag-grid alternative, handsontable alternative, tanstack table alternative, zero dependency

---

## License

MIT © **Abdul Wahid**

- **GitHub** — https://github.com/abdulwahid-csit/photon-grid
- **Issues** — https://github.com/abdulwahid-csit/photon-grid/issues

⭐ If Photon Grid helps your project, please consider giving the repository a star.
