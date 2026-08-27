---
title: "Conditional Formatting"
description: "Style Photon Grid cells based on their value — apply CSS classes per row with cellCssClass, or render fully custom cells with renderer.display. Colour negatives red, highlight thresholds, and add badges. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid conditional formatting
  - cellCssClass
  - style cells by value
  - highlight cells data grid
  - colour negative values
  - custom cell renderer
---

# Conditional Formatting

Conditional formatting styles a cell based on its value — turning negative numbers
red, highlighting rows over a threshold, or badging a status. Photon Grid offers
two approaches: a **`cellCssClass` function** for class-based styling, and a
**custom `renderer.display`** for full control over the cell's markup.

## Style with `cellCssClass`

`cellCssClass` can be a fixed string or a **function** that returns a class name
per row. Pair it with CSS in your app to colour or emphasise cells by value.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const columns = [
  { field: "name", header: "Employee", colId: "name", flex: 1 },
  {
    field: "score", header: "Score", colId: "score", type: "number", width: 120,
    // Return a class based on the cell value:
    cellCssClass: ({ value }) => (Number(value) >= 90 ? "cell-pass" : "cell-fail")
  }
];

new PhotonGrid.GridCore(document.getElementById("grid"), { columns, data: rowData });
```

```css
/* your app's stylesheet */
.cell-pass { background: #dcfce7; color: #166534; font-weight: 600; }
.cell-fail { background: #fee2e2; color: #991b1b; }
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';
import './grid-formatting.css'; // .cell-pass / .cell-fail

const columns = [
  { field: 'name', header: 'Employee', colId: 'name', flex: 1 },
  {
    field: 'score', header: 'Score', colId: 'score', type: 'number', width: 120,
    cellCssClass: ({ value }: { value: unknown }) =>
      Number(value) >= 90 ? 'cell-pass' : 'cell-fail',
  },
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
  styleUrls: ['./grid-formatting.css'], // .cell-pass / .cell-fail
  template: `
    <div style="width: 100%; height: 500px;">
      <photon-grid [columns]="columns" [dataSet]="rowData"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = [
    { field: 'name', header: 'Employee', colId: 'name', flex: 1 },
    {
      field: 'score', header: 'Score', colId: 'score', type: 'number', width: 120,
      cellCssClass: ({ value }: { value: unknown }) =>
        Number(value) >= 90 ? 'cell-pass' : 'cell-fail',
    },
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
  { field: 'name', header: 'Employee', colId: 'name', flex: 1 },
  {
    field: 'score', header: 'Score', colId: 'score', type: 'number', width: 120,
    cellCssClass: ({ value }: { value: unknown }) =>
      Number(value) >= 90 ? 'cell-pass' : 'cell-fail',
  },
];
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" />
  </div>
</template>

<style>
.cell-pass { background: #dcfce7; color: #166534; font-weight: 600; }
.cell-fail { background: #fee2e2; color: #991b1b; }
</style>
```

</TabItem>
</FrameworkTabs>

The `cellCssClass` function receives the display renderer params — `value`,
`row`, `colDef`, `rowIndex`, and more — so you can key formatting off any field
in the row, not just the cell's own value:

```js
{
  field: "salary", header: "Salary", type: "currency",
  // Highlight the whole cell when the row's department is Engineering.
  cellCssClass: ({ row }) => (row.department === "Engineering" ? "cell-highlight" : "")
}
```

## Style with a custom renderer

For richer output — coloured text, icons, inline badges, progress bars — return a
DOM node (or HTML string) from `renderer.display`. This keeps styling
self-contained without external CSS.

```js
const columns = [
  {
    field: "change", header: "Change", colId: "change", type: "number", width: 120,
    renderer: {
      display: (p) => {
        const v = Number(p.value);
        const el = document.createElement("span");
        el.textContent = (v >= 0 ? "▲ " : "▼ ") + Math.abs(v).toFixed(2) + "%";
        el.style.color = v >= 0 ? "#16a34a" : "#dc2626";
        el.style.fontWeight = "600";
        return el;
      }
    }
  }
];
```

<LiveGrid preset="finance" height={340} title="Conditional formatting — green gains, red losses, and status badges" />

## Which approach to use

| Approach | Best for |
|----------|----------|
| `cellCssClass` | Class-based theming that lives in your stylesheet; toggling background/colour by value. |
| `renderer.display` | Fully custom cell content — icons, badges, multiple elements, inline styles. |

## Theme-aware colours

Reference Photon Grid's semantic [theme tokens](../styling/theme-customization.md)
in your CSS so conditional colours adapt to light and dark mode — e.g.
`var(--pg-colors-success)`, `var(--pg-colors-error)`, and their `-light` tints.

## Next steps

- [Formatting Cells](./formatting-cells.md) — value formatting by column type.
- [Text Alignment](./text-alignment.md) — align cell content.
- [Column Definitions → Custom rendering](../columns/column-definitions.md#custom-rendering).
