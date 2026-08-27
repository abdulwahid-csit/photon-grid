---
title: "Column Summary"
description: "Show aggregate values for Photon Grid columns — footer summaries with summaryAggregation and per-group totals with aggFunc (sum, avg, min, max, count)."
keywords:
  - photon grid column summary
  - aggregate column data grid
  - sum avg min max count
  - footer totals
  - group aggregation aggFunc
---

# Column Summary

Photon Grid can compute aggregates for a column in two places:

- **Footer summary row** — a total/aggregate shown at the bottom of the grid,
  controlled by `showSummary`, `summaryAggregation`, and `summaryLabel`.
- **Group rows** — an aggregate shown inside each group header when rows are
  grouped, controlled by `aggFunc`.

| Property | Type | Description |
|----------|------|-------------|
| `showSummary` | `boolean` | Show an aggregate for this column in the footer/summary row. |
| `summaryAggregation` | `'sum' \| 'avg' \| 'min' \| 'max' \| 'count' \| 'none'` | Which aggregate the footer displays. |
| `summaryLabel` | `string` | Custom label shown beside the summary value. |
| `aggFunc` | `'sum' \| 'avg' \| 'min' \| 'max' \| 'count'` | Aggregate applied inside group rows. Honored only for `currency` / `number` columns. |

## Aggregation functions

| Function | Meaning |
|----------|---------|
| `sum` | Sum of all leaf-row values. |
| `avg` | True weighted average across leaf rows. |
| `min` | Minimum leaf-row value. |
| `max` | Maximum leaf-row value. |
| `count` | Count of leaf rows with a finite value. |

## Footer summary

Enable a footer aggregate per column with `showSummary` and choose the function
with `summaryAggregation`. Add `summaryLabel` for a caption.

```js
const columns = [
  { field: "product", header: "Product" },
  { field: "units",   header: "Units", type: "number",
    showSummary: true, summaryAggregation: "sum", summaryLabel: "Total units" },
  { field: "revenue", header: "Revenue", type: "currency",
    showSummary: true, summaryAggregation: "sum", summaryLabel: "Total" },
  { field: "rating",  header: "Avg. rating", type: "number",
    showSummary: true, summaryAggregation: "avg" }
];

const rowData = [
  { product: "Keyboard", units: 120, revenue: 8400, rating: 4.6 },
  { product: "Monitor",  units: 45,  revenue: 13455, rating: 4.8 },
  { product: "Mouse",    units: 210, revenue: 6300, rating: 4.4 }
];
```

Enable the footer on the grid so the summary row is visible:

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  showFooter: true
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid columns={columns} dataSet={rowData} options={{ showFooter: true }} />
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
  options = { showFooter: true };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';
const options = { showFooter: true };
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Per-group aggregation

When rows are grouped, `aggFunc` computes an aggregate for each group header.
Combine a groupable dimension column with numeric/currency measure columns.

```js
const columns = [
  { field: "region",  header: "Region",  groupable: true },
  { field: "channel", header: "Channel" },
  { field: "revenue", header: "Revenue", type: "currency", aggFunc: "sum" },
  { field: "orders",  header: "Orders",  type: "number",   aggFunc: "sum" },
  { field: "margin",  header: "Margin",  type: "percentage", aggFunc: "avg" }
];

const rowData = [
  { region: "EMEA", channel: "Online", revenue: 42000, orders: 320, margin: 0.34 },
  { region: "EMEA", channel: "Retail", revenue: 28000, orders: 190, margin: 0.29 },
  { region: "APAC", channel: "Online", revenue: 51000, orders: 410, margin: 0.31 },
  { region: "APAC", channel: "Retail", revenue: 19000, orders: 130, margin: 0.27 }
];
```

Group by a column to see the aggregates roll up:

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  grouping: { enabled: true, groupedColumns: ["region"], showGroupCount: true },
  showFooter: true
});
```

:::note Numeric columns only
`aggFunc` is honored only when the column's `type` is `currency` or `number`.
For other types, use the footer `summaryAggregation` (e.g. `count`).
:::

## Next steps

- [Column Definitions](./column-definitions.md) — the full `ColumnDef` reference.
- [Column Types](./column-types.md) — `currency`, `number`, and `percentage` columns.
- [Configuration options](../getting-started/configuration-options.md) — `grouping` and `showFooter`.
