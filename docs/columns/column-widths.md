---
title: "Column Widths"
description: "Size Photon Grid columns with fixed width, flexible flex, and min/max bounds — plus resizable columns and the grid-level minimum width."
keywords:
  - photon grid column width
  - flex columns data grid
  - min width max width column
  - resizable columns
  - responsive grid columns
---

# Column Widths

Photon Grid gives each column either a **fixed width** or a **flexible width**,
with optional lower and upper bounds. Columns are also resizable by default.

| Property | Type | Description |
|----------|------|-------------|
| `width` | `number` | Fixed initial width in pixels. |
| `minWidth` | `number` | Smallest width the column can shrink to. |
| `maxWidth` | `number` | Largest width the column can grow to. |
| `flex` | `number` | Proportional width — grows to fill remaining space, like CSS `flex-grow`. |
| `resizable` | `boolean` | Allow drag-resizing this column. Default `true`. |

## Fixed width

Set `width` for a precise pixel size. Ideal for IDs, icons, and short codes.

```js
const columns = [
  { field: "id",   header: "ID",   width: 70 },
  { field: "sku",  header: "SKU",  width: 120 },
  { field: "name", header: "Product" }
];
```

## Flexible width with `flex`

`flex` distributes the leftover horizontal space proportionally. A column with
`flex: 2` grows twice as fast as one with `flex: 1`. Combine with `minWidth` so
flexible columns never collapse too far.

```js
const columns = [
  { field: "id",    header: "ID",    width: 70 },          // fixed
  { field: "name",  header: "Name",  flex: 2, minWidth: 160 }, // 2 shares
  { field: "email", header: "Email", flex: 1, minWidth: 200 }  // 1 share
];
```

<LiveGrid preset="quickStart" height={320} title="Flexible columns fill the available width" />

## Bounds with `minWidth` and `maxWidth`

Constrain both fixed and flexible columns so they stay readable at any container
size:

```js
const columns = [
  { field: "title", header: "Title", flex: 1, minWidth: 180 },
  { field: "code",  header: "Code",  width: 120, minWidth: 90, maxWidth: 160 }
];
```

## Resizable columns

Columns can be resized by dragging the header edge. Disable it per column with
`resizable: false`:

```js
const columns = [
  { field: "id",   header: "ID",   width: 70, resizable: false },
  { field: "name", header: "Name", flex: 1 } // resizable by default
];
```

## Grid-level minimum width

The `--pg-sizing-column-min-width` theme token (default `40px`) sets the absolute
floor a column can be resized to. Override it in your [custom theme](../styling/theme-customization.md)
to change the global minimum.

## Putting it together

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const columns = [
  { field: "id",    header: "ID",    width: 70, resizable: false },
  { field: "name",  header: "Name",  flex: 2, minWidth: 160 },
  { field: "email", header: "Email", flex: 1, minWidth: 200 },
  { field: "role",  header: "Role",  width: 130, maxWidth: 180 }
];

new PhotonGrid.GridCore(document.getElementById("grid"), { columns, data: rowData });
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

const columns = [
  { field: 'id',    header: 'ID',    width: 70, resizable: false },
  { field: 'name',  header: 'Name',  flex: 2, minWidth: 160 },
  { field: 'email', header: 'Email', flex: 1, minWidth: 200 },
  { field: 'role',  header: 'Role',  width: 130, maxWidth: 180 },
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
    { field: 'id',    header: 'ID',    width: 70, resizable: false },
    { field: 'name',  header: 'Name',  flex: 2, minWidth: 160 },
    { field: 'email', header: 'Email', flex: 1, minWidth: 200 },
    { field: 'role',  header: 'Role',  width: 130, maxWidth: 180 },
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
  { field: 'id',    header: 'ID',    width: 70, resizable: false },
  { field: 'name',  header: 'Name',  flex: 2, minWidth: 160 },
  { field: 'email', header: 'Email', flex: 1, minWidth: 200 },
  { field: 'role',  header: 'Role',  width: 130, maxWidth: 180 },
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

## Next steps

- [Column Definitions](./column-definitions.md) — the full `ColumnDef` reference.
- [Column Freezing](./column-freezing.md) — pin columns to an edge.
