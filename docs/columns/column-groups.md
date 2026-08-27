---
title: "Column Groups"
description: "Group Photon Grid columns under a shared multi-row header with the children property — with nesting, marry-children, collapsible groups, resize strategies, and custom group headers."
keywords:
  - photon grid column groups
  - grouped column headers
  - multi row header data grid
  - nested columns
  - marryChildren collapsedWidth
  - column group resize strategy
---

# Column Groups

A column becomes a **column group** — a multi-row header spanning several
columns — when its definition has a `children` array instead of reading a data
`field`. Groups can nest to any depth and are built automatically from the column
definitions.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `children` | `ColumnDef[]` | — | Child columns. Presence makes this entry a group header. |
| `openByDefault` | `boolean` | `true` | Group renders expanded on first load. |
| `marryChildren` | `boolean` | `false` | Child columns can't be dragged out of the group individually — dragging any child moves the whole group. |
| `collapsedWidth` | `number` | `26` | Width of the group header when collapsed, in pixels. |
| `groupResizeStrategy` | `ColumnGroupResizeStrategy` | `proportional` | How resize pixels are distributed among children: `proportional`, `equal`, `firstFixed`, `lastFixed`. |
| `groupHeaderRendererFn` | `(params) => HTMLElement \| string` | — | Custom renderer for the group header cell. |

## A basic group

Give a group a `header` and a `children` array. The children are ordinary column
definitions.

```js
const columns = [
  { field: "name", header: "Employee", pinned: "left", width: 200 },
  {
    header: "Compensation",
    children: [
      { field: "salary", header: "Base",  type: "currency" },
      { field: "bonus",  header: "Bonus", type: "currency" },
      { field: "total",  header: "Total", type: "currency" }
    ]
  }
];

const rowData = [
  { name: "John Smith",   salary: 85000, bonus: 8000, total: 93000 },
  { name: "Sarah Johnson", salary: 72000, bonus: 5000, total: 77000 }
];
```

## Nested groups

Children may themselves be groups, to any depth:

```js
const columns = [
  { field: "name", header: "Employee", pinned: "left", width: 200 },
  {
    header: "Contact",
    children: [
      { field: "email", header: "Email", type: "email" },
      {
        header: "Phone",
        children: [
          { field: "mobile", header: "Mobile" },
          { field: "office", header: "Office" }
        ]
      }
    ]
  }
];
```

## Collapsible groups

Groups can collapse to a compact header. Start a group collapsed with
`openByDefault: false`, and set the collapsed width with `collapsedWidth`.

```js
const columns = [
  { field: "name", header: "Employee", pinned: "left" },
  {
    header: "Details",
    openByDefault: false,   // start collapsed
    collapsedWidth: 32,
    children: [
      { field: "email", header: "Email", type: "email" },
      { field: "phone", header: "Phone" },
      { field: "location", header: "Location" }
    ]
  }
];
```

## Keep children together with `marryChildren`

By default a user can drag a single child column out of its group. Set
`marryChildren: true` to keep the group intact — dragging any child moves the
whole group.

```js
const columns = [
  { field: "name", header: "Employee" },
  {
    header: "Compensation",
    marryChildren: true,
    children: [
      { field: "salary", header: "Base",  type: "currency" },
      { field: "bonus",  header: "Bonus", type: "currency" }
    ]
  }
];
```

## Group resize strategy

When a user resizes a group header, `groupResizeStrategy` decides how the
delta is shared among the child columns:

| Strategy | Behavior |
|----------|----------|
| `proportional` | Distribute proportionally to each child's current width (default). |
| `equal` | Split the delta equally across all children. |
| `firstFixed` | Keep the first child fixed; resize the rest. |
| `lastFixed` | Keep the last child fixed; resize the rest. |

```js
const columns = [
  {
    header: "Quarters",
    groupResizeStrategy: "equal",
    children: [
      { field: "q1", header: "Q1", type: "currency" },
      { field: "q2", header: "Q2", type: "currency" },
      { field: "q3", header: "Q3", type: "currency" },
      { field: "q4", header: "Q4", type: "currency" }
    ]
  }
];
```

## Custom group header

Replace the default label + collapse button with your own markup using
`groupHeaderRendererFn`. It receives the group and its collapsed state.

```js
const columns = [
  {
    header: "Compensation",
    groupHeaderRendererFn: ({ group, collapsed }) =>
      `<span class="grp">${group.header} ${collapsed ? "▶" : "▼"}</span>`,
    children: [
      { field: "salary", header: "Base",  type: "currency" },
      { field: "bonus",  header: "Bonus", type: "currency" }
    ]
  }
];
```

## Complete example

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const columns = [
  { field: "name", header: "Employee", pinned: "left", width: 200 },
  {
    header: "Compensation",
    marryChildren: true,
    children: [
      { field: "salary", header: "Base",  type: "currency" },
      { field: "bonus",  header: "Bonus", type: "currency" }
    ]
  },
  {
    header: "Contact",
    openByDefault: false,
    children: [
      { field: "email", header: "Email", type: "email" },
      { field: "phone", header: "Phone" }
    ]
  }
];

new PhotonGrid.GridCore(document.getElementById("grid"), { columns, data: rowData });
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

const columns = [
  { field: 'name', header: 'Employee', pinned: 'left', width: 200 },
  {
    header: 'Compensation',
    marryChildren: true,
    children: [
      { field: 'salary', header: 'Base',  type: 'currency' },
      { field: 'bonus',  header: 'Bonus', type: 'currency' },
    ],
  },
  {
    header: 'Contact',
    openByDefault: false,
    children: [
      { field: 'email', header: 'Email', type: 'email' },
      { field: 'phone', header: 'Phone' },
    ],
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
  template: `
    <div style="width: 100%; height: 500px;">
      <photon-grid [columns]="columns" [dataSet]="rowData"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = [
    { field: 'name', header: 'Employee', pinned: 'left', width: 200 },
    {
      header: 'Compensation',
      marryChildren: true,
      children: [
        { field: 'salary', header: 'Base',  type: 'currency' },
        { field: 'bonus',  header: 'Bonus', type: 'currency' },
      ],
    },
    {
      header: 'Contact',
      openByDefault: false,
      children: [
        { field: 'email', header: 'Email', type: 'email' },
        { field: 'phone', header: 'Phone' },
      ],
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
  { field: 'name', header: 'Employee', pinned: 'left', width: 200 },
  {
    header: 'Compensation',
    marryChildren: true,
    children: [
      { field: 'salary', header: 'Base',  type: 'currency' },
      { field: 'bonus',  header: 'Bonus', type: 'currency' },
    ],
  },
  {
    header: 'Contact',
    openByDefault: false,
    children: [
      { field: 'email', header: 'Email', type: 'email' },
      { field: 'phone', header: 'Phone' },
    ],
  },
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
- [Column Freezing](./column-freezing.md) · [Column Widths](./column-widths.md)
