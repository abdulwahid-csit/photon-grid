---
title: "Column Hiding"
description: "Show and hide Photon Grid columns with the visible property, and protect essential columns from being hidden using alwaysVisible."
keywords:
  - photon grid hide column
  - show hide columns data grid
  - column visibility
  - alwaysVisible column
  - column chooser
---

# Column Hiding

Control which columns are shown with the `visible` property, and mark essential
columns as `alwaysVisible` so they can never be hidden.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `visible` | `boolean` | `true` | Whether the column is rendered. Set `false` to hide it initially. |
| `alwaysVisible` | `boolean` | `false` | Prevent the column from being hidden — it is excluded from "hide all columns" and stays in the column chooser as locked-on. |

## Hide a column by default

```js
const columns = [
  { field: "id",       header: "ID", width: 70 },
  { field: "name",     header: "Name" },
  { field: "email",    header: "Email" },
  { field: "internalNote", header: "Internal Note", visible: false } // hidden initially
];
```

## Protect a column from hiding

Use `alwaysVisible` for identifier or action columns that must always remain on
screen — even when the user (or an AI command) hides everything else.

```js
const columns = [
  { field: "id",   header: "ID",       alwaysVisible: true, width: 70 },
  { field: "name", header: "Employee", alwaysVisible: true },
  { field: "department", header: "Department" },
  { field: "email",      header: "Email" },
  { field: "phone",      header: "Phone" }
];
```

## Toggle visibility at runtime

Columns can be shown or hidden after load through the grid API and the built-in
column chooser / column menu. With [Photon AI](../ai-tools/photon-ai.md) enabled,
users can also type *"hide the email column"* or *"show all columns"*.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const columns = [
  { field: "id",    header: "ID",    alwaysVisible: true, width: 70 },
  { field: "name",  header: "Name" },
  { field: "email", header: "Email" },
  { field: "notes", header: "Notes", visible: false }
];

new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  showColumnMenu: true // lets users toggle columns from the header "⋯" menu
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

const columns = [
  { field: 'id',    header: 'ID',    alwaysVisible: true, width: 70 },
  { field: 'name',  header: 'Name' },
  { field: 'email', header: 'Email' },
  { field: 'notes', header: 'Notes', visible: false },
];

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid columns={columns} dataSet={rowData} options={{ showColumnMenu: true }} />
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
    { field: 'id',    header: 'ID',    alwaysVisible: true, width: 70 },
    { field: 'name',  header: 'Name' },
    { field: 'email', header: 'Email' },
    { field: 'notes', header: 'Notes', visible: false },
  ];
  rowData = rowData;
  options = { showColumnMenu: true };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const columns = [
  { field: 'id',    header: 'ID',    alwaysVisible: true, width: 70 },
  { field: 'name',  header: 'Name' },
  { field: 'email', header: 'Email' },
  { field: 'notes', header: 'Notes', visible: false },
];
const options = { showColumnMenu: true };
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Next steps

- [Column Definitions](./column-definitions.md) — the full `ColumnDef` reference.
- [Column Menu](./column-menu.md) — the per-column "⋯" menu and column chooser.
