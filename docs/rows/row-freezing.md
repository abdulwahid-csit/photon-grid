---
title: "Row Freezing"
description: "Keep important rows in view while scrolling Photon Grid — a pinned summary/footer row, sticky group and tree-ancestor headers, and frozen (pinned) columns. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid freeze rows
  - sticky rows data grid
  - pinned summary row
  - sticky group header
  - frozen columns
  - keep rows in view while scrolling
---

# Row Freezing

Row freezing keeps important context on screen while the rest of the grid
scrolls. Photon Grid does this through a **pinned summary/footer row**, **sticky
group and tree-ancestor headers**, and **frozen (pinned) columns**.

:::note
Photon Grid does not currently expose an option to pin an *arbitrary* data row to
the top or bottom. The features below cover the common cases — a persistent
totals row, sticky section headers, and frozen columns.
:::

## Pinned summary / footer row

The footer/summary row stays fixed at the bottom of the grid while data rows
scroll beneath it — ideal for totals and aggregates. Enable it with `showFooter`,
and mark which columns contribute a summary with `showSummary` on the column.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const columns = [
  { field: "region",  header: "Region",  colId: "region", flex: 1 },
  { field: "revenue", header: "Revenue", colId: "revenue", type: "currency",
    showSummary: true, summaryAggregation: "sum", summaryLabel: "Total" }
];

new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  showFooter: true,
  footerRowHeight: 44
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

const columns = [
  { field: 'region', header: 'Region', colId: 'region', flex: 1 },
  { field: 'revenue', header: 'Revenue', colId: 'revenue', type: 'currency',
    showSummary: true, summaryAggregation: 'sum', summaryLabel: 'Total' },
];

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid columns={columns} dataSet={rowData}
        options={{ showFooter: true, footerRowHeight: 44 }} />
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
  columns = [
    { field: 'region', header: 'Region', colId: 'region', flex: 1 },
    { field: 'revenue', header: 'Revenue', colId: 'revenue', type: 'currency',
      showSummary: true, summaryAggregation: 'sum', summaryLabel: 'Total' },
  ];
  rowData = rowData;
  options = { showFooter: true, footerRowHeight: 44 };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const columns = [
  { field: 'region', header: 'Region', colId: 'region', flex: 1 },
  { field: 'revenue', header: 'Revenue', colId: 'revenue', type: 'currency',
    showSummary: true, summaryAggregation: 'sum', summaryLabel: 'Total' },
];
const options = { showFooter: true, footerRowHeight: 44 };
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

See [Column Summary](../columns/column-summary.md) for the aggregation options.

## Sticky group & tree headers

When rows are [grouped](../more-photon-features/row-grouping.md) or arranged as
[tree data](./row-parent-child.md), the group (or tree-ancestor) header row
**sticks** to the top of the viewport while its children scroll — so you always
know which section you're looking at. This behavior is automatic; no extra
configuration is required beyond enabling grouping or tree data.

## Frozen columns

To keep columns visible while scrolling **horizontally**, pin them to the left or
right with the column `pinned` property:

```js
const columns = [
  { field: "id",   header: "ID",       pinned: "left",  width: 70 },
  { field: "name", header: "Employee", pinned: "left",  width: 200 },
  { field: "dept", header: "Department" },
  { field: "actions", header: "",      pinned: "right", width: 90 }
];
```

Frozen columns are covered in full on the [Column Freezing](../columns/column-freezing.md)
page.

## Next steps

- [Column Freezing](../columns/column-freezing.md) — pin columns left or right.
- [Column Summary](../columns/column-summary.md) — the pinned totals row.
- [Row Parent / Child](./row-parent-child.md) — grouped and tree-structured rows.
