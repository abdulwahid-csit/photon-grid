---
title: "Row Virtualization"
description: "Row virtualization in Photon Grid renders only the rows in view, so the grid stays fast with millions of rows. Configure the row buffer, row height, and dynamic heights, with Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid virtualization
  - row virtualization
  - virtual scrolling data grid
  - millions of rows
  - rowBuffer dynamic row height
  - high performance grid
---

# Row Virtualization

Row virtualization is what lets Photon Grid render **millions of rows** at a high
frame rate. Instead of putting every row in the DOM, the grid renders only the
rows visible in the viewport (plus a small buffer) and recycles them as you
scroll. It is **on by default** — you don't have to do anything to get it.

## How it works

At any moment only the rows inside the scroll viewport exist in the DOM. As you
scroll, off-screen rows are removed and new ones are created just ahead of the
scroll direction. This keeps the DOM small and memory usage flat regardless of
how many rows the dataset contains.

<LiveGrid preset="finance" height={360} title="Virtualized rendering — scrolls smoothly no matter the row count" />

## Configuration

Tune virtualization with the `virtualScroll` option (a partial
`VirtualScrollConfig`):

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Turn virtualization on or off. |
| `rowBuffer` | `number` | — | Extra rows rendered above and below the viewport to smooth fast scrolling. |
| `rowHeight` | `number` | — | Row height used for scroll-height calculations. |
| `dynamicRowHeight` | `boolean` | `false` | Support variable row heights within the virtualized viewport. |

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,          // can be hundreds of thousands of rows
  virtualScroll: {
    enabled: true,
    rowBuffer: 10,
    rowHeight: 42
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
        options={{ virtualScroll: { enabled: true, rowBuffer: 10, rowHeight: 42 } }}
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
  options = { virtualScroll: { enabled: true, rowBuffer: 10, rowHeight: 42 } };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = { virtualScroll: { enabled: true, rowBuffer: 10, rowHeight: 42 } };
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Variable heights under virtualization

If rows have different heights (via [auto height or `rowHeightFn`](./row-heights.md)),
enable `dynamicRowHeight` so the virtualizer measures and positions rows
correctly:

```js
new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  rowHeightMode: "auto",
  virtualScroll: { enabled: true, dynamicRowHeight: true }
});
```

## Tuning the buffer

A larger `rowBuffer` renders more off-screen rows, which reduces the chance of a
brief blank strip during very fast scrolling, at the cost of a few extra DOM
nodes. The default is tuned for smooth scrolling; increase it only if you see
flashing on rapid flings.

## Scrolling programmatically

Bring any row into view — even one that isn't currently rendered — with the
scroll API:

```js
grid.api.scrollToRow(5000); // scrolls row index 5000 into view
grid.api.scrollToTop();     // jump back to the first row
```

:::tip Virtualization vs pagination
Virtualization and [pagination](./rows-pagination.md) both keep the DOM small.
Use **virtualization** for a continuous, infinite-scroll feel over a large
in-memory dataset, and **pagination** when users expect discrete pages or you're
loading one page at a time from a server.
:::

## Column virtualization

Photon Grid also virtualizes columns. To render all columns regardless of the
viewport (e.g. for printing), set `suppressColumnVirtualisation: true` in the
grid options.

## Next steps

- [Row Heights](./row-heights.md) — fixed, auto, and per-row heights.
- [Row Pagination](./rows-pagination.md) — the paged alternative.
- [Configuration options](../getting-started/configuration-options.md#grouping--virtualization).
