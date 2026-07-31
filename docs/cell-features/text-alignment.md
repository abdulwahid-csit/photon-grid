---
title: "Text Alignment"
description: "Align cell content in Photon Grid — set left, center, or right text alignment per column with the textAlign property. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid text alignment
  - align cell content
  - textAlign column
  - right align numbers grid
  - center align cells
  - data grid alignment
---

# Text Alignment

Control the horizontal alignment of cell content per column with the `textAlign`
property. A common convention is to right-align numeric and currency columns, and
left-align text — which makes columns of figures easy to scan and compare.

## Set alignment per column

`textAlign` accepts `'left'`, `'center'`, or `'right'`.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const columns = [
  { field: "name",    header: "Product",  colId: "name",   textAlign: "left",   flex: 1 },
  { field: "sku",     header: "SKU",      colId: "sku",    textAlign: "center", width: 120 },
  { field: "price",   header: "Price",    colId: "price",  textAlign: "right",  type: "currency" },
  { field: "stock",   header: "In Stock", colId: "stock",  textAlign: "right",  type: "number" }
];

const rowData = [
  { name: "Wireless Mouse", sku: "WM-100", price: 24.99, stock: 1200 },
  { name: "Keyboard",       sku: "KB-220", price: 89.0,  stock: 340 }
];

new PhotonGrid.GridCore(document.getElementById("grid"), { columns, data: rowData });
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

const columns = [
  { field: 'name', header: 'Product', colId: 'name', textAlign: 'left', flex: 1 },
  { field: 'sku', header: 'SKU', colId: 'sku', textAlign: 'center', width: 120 },
  { field: 'price', header: 'Price', colId: 'price', textAlign: 'right', type: 'currency' },
  { field: 'stock', header: 'In Stock', colId: 'stock', textAlign: 'right', type: 'number' },
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
    { field: 'name', header: 'Product', colId: 'name', textAlign: 'left', flex: 1 },
    { field: 'sku', header: 'SKU', colId: 'sku', textAlign: 'center', width: 120 },
    { field: 'price', header: 'Price', colId: 'price', textAlign: 'right', type: 'currency' },
    { field: 'stock', header: 'In Stock', colId: 'stock', textAlign: 'right', type: 'number' },
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
  { field: 'name', header: 'Product', colId: 'name', textAlign: 'left', flex: 1 },
  { field: 'sku', header: 'SKU', colId: 'sku', textAlign: 'center', width: 120 },
  { field: 'price', header: 'Price', colId: 'price', textAlign: 'right', type: 'currency' },
  { field: 'stock', header: 'In Stock', colId: 'stock', textAlign: 'right', type: 'number' },
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

## Alignment values

| Value | Description |
|-------|-------------|
| `left` | Align content to the left (default for text). |
| `center` | Center content horizontally. |
| `right` | Align content to the right — recommended for numbers, currency, and percentages. |

:::tip Numbers read best right-aligned
Right-aligning numeric columns lines up the digits by place value, making totals
and comparisons far easier to scan.
:::

## Custom alignment via CSS

For finer control (vertical alignment, padding), add a class with
[`cellCssClass`](./conditional-formatting.md) or `headerCssClass` and style it in
your own CSS.

## Next steps

- [Formatting Cells](./formatting-cells.md) — format values by column type.
- [Conditional Formatting](./conditional-formatting.md) — style cells by their value.
- [Column Definitions](../columns/column-definitions.md#alignment--styling) — `textAlign` in context.
