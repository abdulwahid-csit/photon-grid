---
title: "Row Pagination"
description: "Paginate rows in Photon Grid — enable client-side paging, set page size and page-size options, control the current page, and wire up server-side pagination. With Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid pagination
  - data grid paging
  - page size options
  - server side pagination
  - goToPage setPageSize
  - javascript grid pagination
---

# Row Pagination

Pagination splits rows across pages with a footer navigation bar, keeping the DOM
light and the UI predictable. Photon Grid supports both **client-side** paging
(the grid slices your data) and **server-side** paging (you fetch one page at a
time).

## Enable pagination

Turn it on with the `pagination` option. At minimum set `enabled: true` and a
`pageSize`.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  pagination: {
    enabled: true,
    pageSize: 25,
    pageSizeOptions: [25, 50, 100]
  }
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid
        columns={columns}
        dataSet={rowData}
        options={{
          pagination: { enabled: true, pageSize: 25, pageSizeOptions: [25, 50, 100] },
        }}
      />
    </div>
  );
}
```

</TabItem>
<TabItem value="angular" label="Angular">

```ts
import { Component } from '@angular/core';
import { PhotonGridComponent } from 'photon-grid-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PhotonGridComponent],
  template: `
    <div style="width: 100%; height: 500px;">
      <photon-grid [columns]="columns" [dataSet]="rowData" [options]="options"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = columns;
  rowData = rowData;
  options = {
    pagination: { enabled: true, pageSize: 25, pageSizeOptions: [25, 50, 100] },
  };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = {
  pagination: { enabled: true, pageSize: 25, pageSizeOptions: [25, 50, 100] },
};
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

<LiveGrid preset="quickStart" height={340} options={{pagination: {enabled: true, pageSize: 4, pageSizeOptions: [4, 8]}}} title="Pagination enabled — 4 rows per page" />

## Pagination options

The `pagination` option accepts a partial `PaginationConfig`:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Turn pagination on. |
| `page` | `number` | `0` | Initial page index (zero-based). |
| `pageSize` | `number` | — | Number of rows per page. |
| `pageSizeOptions` | `number[]` | — | Choices shown in the footer page-size selector. |
| `serverSide` | `boolean` | `false` | Enable server-side paging (you supply one page of data at a time). |
| `totalRows` | `number` | — | Total row count across all pages — required when `serverSide` is `true`. |

## Control pagination from the API

| Method | Description |
|--------|-------------|
| `goToPage(page)` | Jump to a zero-based page index. |
| `setPageSize(size)` | Change the number of rows per page. |

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  pagination: { enabled: true, pageSize: 25 }
});

grid.api.goToPage(2);     // jump to the third page (zero-based)
grid.api.setPageSize(50); // switch to 50 rows per page
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  let api: any;
  return (
    <>
      <button onClick={() => api?.goToPage(2)}>Go to page 3</button>
      <div style={{ width: '100%', height: 500 }}>
        <PhotonGrid columns={columns} dataSet={rowData}
          options={{ pagination: { enabled: true, pageSize: 25 }, onReady: (a) => (api = a) }} />
      </div>
    </>
  );
}
```

</TabItem>
<TabItem value="angular" label="Angular">

```ts
import { Component } from '@angular/core';
import { PhotonGridComponent } from 'photon-grid-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PhotonGridComponent],
  template: `
    <button (click)="api?.goToPage(2)">Go to page 3</button>
    <div style="width: 100%; height: 500px;">
      <photon-grid [columns]="columns" [dataSet]="rowData" [options]="options"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  api: any;
  columns = columns;
  rowData = rowData;
  options = { pagination: { enabled: true, pageSize: 25 }, onReady: (a: any) => (this.api = a) };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

let api: any;
const options = { pagination: { enabled: true, pageSize: 25 }, onReady: (a: any) => (api = a) };
</script>

<template>
  <button @click="api?.goToPage(2)">Go to page 3</button>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Server-side pagination

For very large datasets, fetch one page at a time. Set `serverSide: true` and
supply `totalRows` so the grid can render the correct page controls, then load
the matching slice of data whenever the page changes.

```js
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: await fetchPage(0, 25),
  pagination: {
    enabled: true,
    serverSide: true,
    page: 0,
    pageSize: 25,
    totalRows: 10000
  }
});

// When the user navigates, fetch and swap in the new page's rows:
async function loadPage(page) {
  const rows = await fetchPage(page, 25);
  grid.api.setData(rows);
}
```

:::tip Client vs server
Use client-side pagination when all rows are already loaded in the browser — it
is instant and needs no back-end. Switch to server-side once the full dataset is
too large to hold in memory.
:::

## Next steps

- [Row Virtualization](./row-virtualization.md) — an alternative to paging for huge datasets.
- [Row Sorting](./rows-sorting.md) · [Row Hiding](./row-hiding.md)
- [Configuration options](../getting-started/configuration-options.md#pagination) — the pagination reference.
