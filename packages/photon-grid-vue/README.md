# Photon Grid for Vue

<p align="center">
  <img src="https://raw.githubusercontent.com/abdulwahid-csit/photon-grid/main/assets/logo.svg" alt="Photon Grid — Vue 3 Data Grid" width="180"/>
</p>

<p align="center">
    <strong>A high-performance, enterprise-grade Vue 3 data grid built on the zero-dependency Photon Grid engine.</strong>
</p>

<p align="center">

![npm](https://img.shields.io/npm/v/photon-grid-vue)
![license](https://img.shields.io/npm/l/photon-grid-vue)
![typescript](https://img.shields.io/badge/TypeScript-5.x-blue)
![vue](https://img.shields.io/badge/Vue-3.4%2B-42b883)

</p>

---

## Overview

**Photon Grid for Vue** (`photon-grid-vue`) is the official Vue 3 wrapper for [Photon Grid Core](https://www.npmjs.com/package/photon-grid-core) — an extremely fast, framework-agnostic TypeScript data grid.

It exposes a single `<PhotonGrid />` component that binds Vue props and emits to the core engine, giving you virtual scrolling, sorting, filtering, grouping, editing, and custom cell renderers with **zero framework lock-in**.

A modern, lightweight alternative to AG Grid, Handsontable, and vue-good-table for Vue 3 applications.

---

## Features

- Single declarative Vue 3 component (`<PhotonGrid />`)
- Fully typed props and emitted events
- Composition API friendly (`<script setup>`)
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
npm install photon-grid-vue photon-grid-core vue
```

or

```bash
yarn add photon-grid-vue photon-grid-core vue
```

or

```bash
pnpm add photon-grid-vue photon-grid-core vue
```

`vue` (>= 3.4) and `photon-grid-core` are peer dependencies.

---

## Basic Usage

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';
import type { ColumnDef, GridApi } from 'photon-grid-vue';

const columns: ColumnDef[] = [
  { colId: 'name', field: 'name', header: 'Name', type: 'string' },
  { colId: 'age', field: 'age', header: 'Age', type: 'number' },
];

const rows = [
  { name: 'Ada', age: 36 },
  { name: 'Alan', age: 41 },
];

function onReady(api: GridApi) {
  console.log('visible rows:', api.getVisibleRows().length);
}
</script>

<template>
  <PhotonGrid
    :columns="columns"
    :dataSet="rows"
    :options="{ theme: 'light' }"
    @gridReady="onReady"
    @rowClicked="(e) => console.log(e)"
  />
</template>
```

> **Styling** is injected automatically by the core engine — no CSS import is required.

---

## Props

| Prop      | Type                        | Description                                             |
| --------- | --------------------------- | ------------------------------------------------------ |
| `columns` | `ColumnDef[]`               | Column definitions.                                    |
| `dataSet` | `Record<string, unknown>[]` | Row data.                                              |
| `options` | `Partial<GridOptions>`      | Theme, selection, editing, pagination, and feature flags. |

---

## Events

`gridReady`, `dataChanged`, `rowClicked`, `rowDoubleClicked`, `rowSelected`,
`cellClicked`, `cellDoubleClicked`, `cellValueChanged`, `cellSelectionChanged`,
`columnResized`, `columnMoved`, `sortChanged`, `filterChanged`, `pageChanged`,
`columnsStateChanged`, `themeChanged`, `exportComplete`.

`gridReady` emits the `GridApi`, giving you full programmatic control over the grid.

---

## Why Photon Grid?

- Declarative, idiomatic Vue 3 API
- Fast, virtualized rendering for millions of rows
- Framework-independent core — share grid logic across Vue, React, and Angular
- Modular, extensible, plugin-friendly architecture
- Enterprise capabilities with a simple, predictable API
- Fully typed with built-in declaration files

---

## Browser Support

Supports all modern browsers: Chrome, Edge, Firefox, and Safari.

---

## TypeScript

`photon-grid-vue` is written in TypeScript and ships with built-in declaration files. No additional typings are required.

---

## Ecosystem

| Package | Description |
| ------- | ----------- |
| [`photon-grid-core`](https://www.npmjs.com/package/photon-grid-core) | Framework-agnostic engine |
| [`photon-grid-vue`](https://www.npmjs.com/package/photon-grid-vue) | Vue 3 wrapper (this package) |
| [`photon-grid-angular`](https://www.npmjs.com/package/photon-grid-angular) | Angular wrapper |
| [`photon-grid-react`](https://www.npmjs.com/package/photon-grid-react) | React wrapper |

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
- **NPM** — https://www.npmjs.com/package/photon-grid-vue

---

⭐ If you find Photon Grid useful, consider starring the repository.
