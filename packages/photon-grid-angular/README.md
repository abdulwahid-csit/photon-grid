# Photon Grid for Angular

<p align="center">
  <img src="https://raw.githubusercontent.com/abdulwahid-csit/photon-grid/main/assets/logo.svg" alt="Photon Grid — Angular Data Grid" width="180"/>
</p>

<p align="center">
    <strong>A high-performance, enterprise-grade Angular data grid built on the zero-dependency Photon Grid engine.</strong>
</p>

<p align="center">

![npm](https://img.shields.io/npm/v/photon-grid-angular)
![license](https://img.shields.io/npm/l/photon-grid-angular)
![typescript](https://img.shields.io/badge/TypeScript-5.x-blue)
![angular](https://img.shields.io/badge/Angular-18%2B-red)

</p>

---

## Overview

**Photon Grid for Angular** (`photon-grid-angular`) is the official Angular wrapper for [Photon Grid Core](https://www.npmjs.com/package/photon-grid-core) — an extremely fast, framework-agnostic TypeScript data grid.

It exposes a single standalone `<photon-grid>` component that binds Angular inputs and outputs to the core engine, giving you virtual scrolling, sorting, filtering, grouping, editing, and custom Angular component/template cell renderers with **zero framework lock-in**.

A modern, lightweight alternative to AG Grid, Handsontable, and PrimeNG Table for Angular applications.

---

## Features

- Standalone Angular component (`<photon-grid>`) and optional `PhotonGridModule`
- Angular component and `TemplateRef` cell renderers
- Strongly-typed `@Input` / `@Output` bindings
- Zero runtime dependencies in the core engine
- Virtual scrolling and virtual columns
- Millions of rows support
- Column pinning, resizing, moving, and auto-size
- Cell selection and range selection
- Clipboard support (copy / paste)
- Keyboard and mouse navigation
- Tree data and row grouping
- Sorting and multi-column sorting
- Filtering and quick filtering
- Custom cell and header renderers
- Context menu and custom context menus
- Pagination, status bar, and tool panels
- Theme support (light, dark, custom)
- Event-driven, API-driven architecture
- High-FPS, memory-efficient rendering

---

## Installation

```bash
npm install photon-grid-angular photon-grid-core
```

or

```bash
yarn add photon-grid-angular photon-grid-core
```

or

```bash
pnpm add photon-grid-angular photon-grid-core
```

`@angular/core`, `@angular/common`, and `photon-grid-core` are peer dependencies.

---

## Basic Usage

`PhotonGridComponent` is standalone — import it directly into any standalone component or NgModule.

```ts
import { Component } from '@angular/core';
import { PhotonGridComponent } from 'photon-grid-angular';
import type { ColumnDef } from 'photon-grid-angular';
import type { GridApi } from 'photon-grid-core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PhotonGridComponent],
  template: `
    <photon-grid
      [columns]="columns"
      [dataSet]="rows"
      [options]="{ theme: 'light' }"
      (gridReady)="onReady($event)"
      (rowClicked)="onRowClicked($event)">
    </photon-grid>
  `,
})
export class AppComponent {
  columns: ColumnDef[] = [
    { colId: 'name', field: 'name', header: 'Name', type: 'string' },
    { colId: 'age', field: 'age', header: 'Age', type: 'number' },
  ];

  rows = [
    { name: 'Ada', age: 36 },
    { name: 'Alan', age: 41 },
  ];

  onReady(api: GridApi): void {
    console.log('visible rows:', api.getVisibleRows().length);
  }

  onRowClicked(event: unknown): void {
    console.log(event);
  }
}
```

> **Styling** is injected automatically by the core engine — no CSS import is required.

### NgModule consumers

Not on standalone APIs yet? Import `PhotonGridModule`, which re-exports the standalone component:

```ts
import { PhotonGridModule } from 'photon-grid-angular';

@NgModule({
  imports: [PhotonGridModule],
})
export class AppModule {}
```

---

## Inputs

| Input     | Type                        | Description                                             |
| --------- | --------------------------- | ------------------------------------------------------ |
| `columns` | `ColumnDef[]`               | Column definitions. Renderer slots accept Angular components/templates in addition to plain functions. |
| `dataSet` | `Record<string, unknown>[]` | Row data.                                              |
| `options` | `Partial<GridOptions>`      | Theme, selection, editing, pagination, and feature flags. |

---

## Outputs

`gridReady`, `dataChanged`, `rowClicked`, `rowDoubleClicked`, `rowSelected`,
`cellClicked`, `cellDoubleClicked`, `cellValueChanged`, `cellSelectionChanged`,
`columnResized`, `columnMoved`, `sortChanged`, `filterChanged`, `pageChanged`,
`columnsStateChanged`, `themeChanged`, `exportComplete`.

`gridReady` emits the `GridApi`, giving you full programmatic control over the grid.

---

## Angular Component & Template Renderers

Cell, header, and editor renderers may be plain functions (identical to the core API), or declarative Angular specs:

```ts
// Component-based renderer
columns: ColumnDef[] = [{
  colId: 'status', field: 'status', header: 'Status', type: 'string',
  renderer: {
    display: {
      kind: 'component',
      component: StatusBadgeComponent,
      inputs: (params) => ({ value: params.value }),
    },
  },
}];
```

```html
<!-- Template-based renderer -->
<ng-template #statusTpl let-params>
  <span class="badge">{{ params.value }}</span>
</ng-template>
```

The wrapper mounts and disposes these views automatically as rows are virtualized and recycled, so nothing leaks.

---

## Why Photon Grid?

- Modern, standalone Angular API
- Fast, virtualized rendering for millions of rows
- Framework-independent core — share grid logic across Angular, React, and Vue
- Modular, extensible, plugin-friendly architecture
- Enterprise capabilities with a simple, predictable API
- Fully typed with built-in declaration files

---

## Browser Support

Supports all modern browsers: Chrome, Edge, Firefox, and Safari.

---

## TypeScript

`photon-grid-angular` is written in TypeScript and ships with built-in declaration files. No additional typings are required.

---

## Ecosystem

| Package | Description |
| ------- | ----------- |
| [`photon-grid-core`](https://www.npmjs.com/package/photon-grid-core) | Framework-agnostic engine |
| [`photon-grid-angular`](https://www.npmjs.com/package/photon-grid-angular) | Angular wrapper (this package) |
| [`photon-grid-react`](https://www.npmjs.com/package/photon-grid-react) | React wrapper |
| [`photon-grid-vue`](https://www.npmjs.com/package/photon-grid-vue) | Vue 3 wrapper |

---

## Contributing

Contributions are welcome. Please submit issues, feature requests, or pull requests through GitHub.

---

## License

MIT License

---

## Author

**Abdul Wahid**

---

## Links

- **GitHub** — https://github.com/abdulwahid-csit/photon-grid
- **Issues** — https://github.com/abdulwahid-csit/photon-grid/issues
- **NPM Angular** — https://www.npmjs.com/package/photon-grid-angular
- **NPM React** — https://www.npmjs.com/package/photon-grid-react
- **NPM Vue** — https://www.npmjs.com/package/photon-grid-vue
- **NPM Core** — https://www.npmjs.com/package/photon-grid-core

---

⭐ If you find Photon Grid useful, consider starring the repository.
