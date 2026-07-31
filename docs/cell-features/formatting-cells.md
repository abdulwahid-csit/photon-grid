---
title: "Formatting Cells"
description: "Format cell values in Photon Grid with column data types — numbers, currency, percentages, dates, times, booleans, emails, and more. Control locale, date format, and currency symbol. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid cell formatting
  - format numbers currency dates
  - column data type
  - locale currency symbol date format
  - percentage boolean cell
  - data grid value formatting
---

# Formatting Cells

Photon Grid formats cell values automatically based on each column's **`type`**.
Set the type and the grid renders numbers, currency, percentages, dates, times,
and more in the right shape — no manual formatting required. Grid-level options
control locale, date format, and currency symbol.

## Format with column types

The `type` on a column definition determines how its cells are rendered:

| `type` | Renders as |
|--------|-----------|
| `string` | Plain text |
| `number` | Locale-formatted number |
| `currency` | Currency-formatted number |
| `percentage` | Percentage-formatted number |
| `boolean` | Check-mark icon |
| `date` | Formatted date string |
| `time` | Formatted time string |
| `email` | Email text |
| `dropdown` | Badge from the column's options |
| `array` | Tag badges |
| `image` | Thumbnail image |

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const columns = [
  { field: "product",  header: "Product",  colId: "product", type: "string", flex: 1 },
  { field: "price",    header: "Price",    colId: "price",    type: "currency" },
  { field: "discount", header: "Discount", colId: "discount", type: "percentage" },
  { field: "stock",    header: "In Stock", colId: "stock",    type: "number" },
  { field: "added",    header: "Added",    colId: "added",    type: "date" },
  { field: "active",   header: "Active",   colId: "active",   type: "boolean" }
];

const rowData = [
  { product: "Wireless Mouse", price: 24.99, discount: 0.1,  stock: 1200, added: "2024-01-15", active: true },
  { product: "Mechanical Keyboard", price: 89.0, discount: 0.25, stock: 340, added: "2023-11-02", active: false }
];

new PhotonGrid.GridCore(document.getElementById("grid"), { columns, data: rowData });
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

const columns = [
  { field: 'product', header: 'Product', colId: 'product', type: 'string', flex: 1 },
  { field: 'price', header: 'Price', colId: 'price', type: 'currency' },
  { field: 'discount', header: 'Discount', colId: 'discount', type: 'percentage' },
  { field: 'stock', header: 'In Stock', colId: 'stock', type: 'number' },
  { field: 'added', header: 'Added', colId: 'added', type: 'date' },
  { field: 'active', header: 'Active', colId: 'active', type: 'boolean' },
];

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid columns={columns} dataSet={rowData} />
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
      <photon-grid [columns]="columns" [dataSet]="rowData"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = [
    { field: 'product', header: 'Product', colId: 'product', type: 'string', flex: 1 },
    { field: 'price', header: 'Price', colId: 'price', type: 'currency' },
    { field: 'discount', header: 'Discount', colId: 'discount', type: 'percentage' },
    { field: 'stock', header: 'In Stock', colId: 'stock', type: 'number' },
    { field: 'added', header: 'Added', colId: 'added', type: 'date' },
    { field: 'active', header: 'Active', colId: 'active', type: 'boolean' },
  ];
  rowData = rowData;
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const columns = [
  { field: 'product', header: 'Product', colId: 'product', type: 'string', flex: 1 },
  { field: 'price', header: 'Price', colId: 'price', type: 'currency' },
  { field: 'discount', header: 'Discount', colId: 'discount', type: 'percentage' },
  { field: 'stock', header: 'In Stock', colId: 'stock', type: 'number' },
  { field: 'added', header: 'Added', colId: 'added', type: 'date' },
  { field: 'active', header: 'Active', colId: 'active', type: 'boolean' },
];
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Locale, currency, and date format

Grid-level options control how typed values are formatted across all columns:

| Option | Type | Description |
|--------|------|-------------|
| `locale` | `string` | Locale used for number, currency, and date formatting (e.g. `"en-US"`, `"de-DE"`). |
| `currencySymbol` | `string` | Symbol used for `currency` columns. |
| `currencyFormat` | `string` | Currency format pattern. |
| `dateFormat` | `string` | Default format for `date` columns. |
| `timeZone` | `string` | Time zone used when formatting dates and times. |

```js
new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  locale: "en-US",
  currencySymbol: "$",
  dateFormat: "MMM D, YYYY"
});
```

## Per-column overrides

Individual columns can override the grid defaults:

| Column property | Description |
|-----------------|-------------|
| `isCurrency` | Format a numeric column as currency without changing its `type`. |
| `dateFormat` | Per-column date format, overriding the grid default. |

```js
const columns = [
  { field: "revenue", header: "Revenue", type: "number", isCurrency: true },
  { field: "createdAt", header: "Created", type: "date", dateFormat: "DD/MM/YYYY" }
];
```

## Custom value rendering

When the built-in types aren't enough, provide a custom `renderer.display` to draw
the cell yourself — badges, progress bars, coloured numbers, and so on. See
[Column Definitions → Custom rendering](../columns/column-definitions.md#custom-rendering).

<LiveGrid preset="finance" height={340} title="Type-aware formatting — currency, coloured change %, and badges" />

## Next steps

- [Text Alignment](./text-alignment.md) — align formatted values in their cells.
- [Conditional Formatting](./conditional-formatting.md) — style cells by value.
- [Column Types](../columns/column-definitions.md#identity--data) — the full `type` list.
