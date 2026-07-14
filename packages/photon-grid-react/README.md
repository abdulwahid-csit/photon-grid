# Photon Grid for React

<p align="center">
  <img src="https://raw.githubusercontent.com/abdulwahid-csit/photon-grid/main/assets/logo.svg" alt="Photon Grid — React Data Grid" width="180"/>
</p>

<p align="center">
    <strong>A high-performance, enterprise-grade React data grid built on the zero-dependency Photon Grid engine.</strong>
</p>

<p align="center">

![npm](https://img.shields.io/npm/v/photon-grid-react)
![license](https://img.shields.io/npm/l/photon-grid-react)
![typescript](https://img.shields.io/badge/TypeScript-5.x-blue)
![react](https://img.shields.io/badge/React-18%2B-61dafb)

</p>

---

## Overview

**Photon Grid for React** (`photon-grid-react`) is the official React wrapper for [Photon Grid Core](https://www.npmjs.com/package/photon-grid-core) — an extremely fast, framework-agnostic TypeScript data grid.

It exposes a single `<PhotonGrid />` component that binds React props and callbacks to the core engine, giving you virtual scrolling, sorting, filtering, grouping, editing, and custom React cell renderers with **zero framework lock-in**.

A modern, lightweight alternative to AG Grid, react-data-grid, TanStack Table, and Handsontable for React applications.

---

## Features

- Single declarative React component (`<PhotonGrid />`)
- Custom React component cell renderers
- Fully typed props and event callbacks
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
npm install photon-grid-react photon-grid-core
```

or

```bash
yarn add photon-grid-react photon-grid-core
```

or

```bash
pnpm add photon-grid-react photon-grid-core
```

`react`, `react-dom` (>= 18) are peer dependencies. `photon-grid-core` is a dependency and is installed automatically.

---

## Basic Usage

```tsx
import { PhotonGrid } from 'photon-grid-react';
import type { PhotonGridColumnDef } from 'photon-grid-react';
import type { GridApi } from 'photon-grid-core';

const columns: PhotonGridColumnDef[] = [
  { colId: 'name', field: 'name', header: 'Name', type: 'string' },
  { colId: 'age', field: 'age', header: 'Age', type: 'number' },
];

const rows = [
  { name: 'Ada', age: 36 },
  { name: 'Alan', age: 41 },
];

export function App() {
  const onReady = (api: GridApi) => {
    console.log('visible rows:', api.getVisibleRows().length);
  };

  return (
    <PhotonGrid
      columns={columns}
      dataSet={rows}
      options={{ theme: 'light' }}
      onGridReady={onReady}
      onRowClicked={(e) => console.log(e)}
    />
  );
}
```

> **Styling** is injected automatically by the core engine — no CSS import is required.

---

## Props

| Prop      | Type                        | Description                                             |
| --------- | --------------------------- | ------------------------------------------------------ |
| `columns` | `PhotonGridColumnDef[]`     | Column definitions. Renderer slots accept React components in addition to plain functions. |
| `dataSet` | `Record<string, unknown>[]` | Row data.                                              |
| `options` | `Partial<GridOptions>`      | Theme, selection, editing, pagination, and feature flags. |

### Event callbacks

`onGridReady`, `onDataChanged`, `onRowClicked`, `onRowDoubleClicked`, `onRowSelected`,
`onCellClicked`, `onCellDoubleClicked`, `onCellValueChanged`, `onCellSelectionChanged`,
`onColumnResized`, `onColumnMoved`, `onSortChanged`, `onFilterChanged`, `onPageChanged`,
`onColumnsStateChanged`, `onThemeChanged`, `onExportComplete`.

`onGridReady` receives the `GridApi`, giving you full programmatic control over the grid.

---

## Why Photon Grid?

- Declarative, idiomatic React API
- Fast, virtualized rendering for millions of rows
- Framework-independent core — share grid logic across React, Angular, and Vue
- Modular, extensible, plugin-friendly architecture
- Enterprise capabilities with a simple, predictable API
- Fully typed with built-in declaration files

---

## Browser Support

Supports all modern browsers: Chrome, Edge, Firefox, and Safari.

---

## TypeScript

`photon-grid-react` is written in TypeScript and ships with built-in declaration files. No additional typings are required.

---

## Ecosystem

| Package | Description | NPM |
| ------- | ----------- | --- |
| [`photon-grid-core`](https://www.npmjs.com/package/photon-grid-core) | Framework-agnostic engine | https://www.npmjs.com/package/photon-grid-core |
| [`photon-grid-react`](https://www.npmjs.com/package/photon-grid-react) | React wrapper (this package) | https://www.npmjs.com/package/photon-grid-react |
| [`photon-grid-angular`](https://www.npmjs.com/package/photon-grid-angular) | Angular wrapper | https://www.npmjs.com/package/photon-grid-angular | 
| [`photon-grid-vue`](https://www.npmjs.com/package/photon-grid-vue) | Vue 3 wrapper | https://www.npmjs.com/package/photon-grid-vue |

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
- **NPM React** — https://www.npmjs.com/package/photon-grid-react
- **NPM Angular** — https://www.npmjs.com/package/photon-grid-angular
- **NPM Vue** — https://www.npmjs.com/package/photon-grid-vue
- **NPM Core** — https://www.npmjs.com/package/photon-grid-core

---

⭐ If you find Photon Grid useful, consider starring the repository.
