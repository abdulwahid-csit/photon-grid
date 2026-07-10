# photon-grid-vue

Vue 3 wrapper for [Photon Grid](https://github.com/abdulwahid-csit/photon-grid) — an
enterprise-grade, framework-agnostic TypeScript data grid.

## Install

```bash
npm install photon-grid-vue photon-grid-core vue
```

`vue` and `photon-grid-core` are peer dependencies.

## Usage

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';
import type { ColumnDef, GridApi } from 'photon-grid-vue';
import 'photon-grid-core/styles/photon-grid.css';

const columns: ColumnDef[] = [
  { colId: 'name', field: 'name', header: 'Name', type: 'string' },
  { colId: 'age', field: 'age', header: 'Age', type: 'number' },
];
const rows = [{ name: 'Ada', age: 36 }, { name: 'Alan', age: 41 }];

function onReady(api: GridApi) {
  console.log('rows:', api.getVisibleRows().length);
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

## Props

| Prop      | Type                        | Description                          |
| --------- | --------------------------- | ------------------------------------ |
| `columns` | `ColumnDef[]`               | Column definitions.                  |
| `dataSet` | `Record<string, unknown>[]` | Row data.                            |
| `options` | `Partial<GridOptions>`      | Theme, selection, and feature flags. |

## Events

`gridReady`, `dataChanged`, `rowClicked`, `rowDoubleClicked`, `rowSelected`,
`cellClicked`, `cellDoubleClicked`, `cellValueChanged`, `cellSelectionChanged`,
`columnResized`, `columnMoved`, `sortChanged`, `filterChanged`, `pageChanged`,
`columnsStateChanged`, `themeChanged`, `exportComplete`.

## License

MIT
