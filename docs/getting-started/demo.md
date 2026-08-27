---
title: "Demo"
description: "Interactive Photon Grid demos rendered live in the browser, with the exact code behind each one."
---

# Demo

Every grid on this page is a **real, running Photon Grid** — the published
`photon-grid-core` bundle loaded from the CDN and rendered inline. Interact with
them: sort a column, resize, or scroll. Below each demo is the exact code that
produces it, in your chosen framework.

## Basic grid

A minimal grid: four columns, plain row data, default theme.

<LiveGrid preset="quickStart" height={340} title="Basic grid — sortable, resizable, virtualized" />

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```html
<div id="grid" style="width:100%;height:340px;"></div>
<script src="https://cdn.jsdelivr.net/npm/photon-grid-core@latest/photon-grid.min.js"></script>
<script>
  const columns = [
    { field: "id", header: "ID", colId: "id", width: 80 },
    { field: "name", header: "Employee", colId: "name", flex: 1, minWidth: 160 },
    { field: "department", header: "Department", colId: "department", flex: 1, minWidth: 150 },
    { field: "salary", header: "Salary", colId: "salary", type: "number", flex: 1, minWidth: 120 }
  ];

  const rowData = [
  { id: 1, name: "John Smith", department: "Engineering", salary: 85000 },
  { id: 2, name: "Sarah Johnson", department: "Finance", salary: 72000 },
  { id: 3, name: "Michael Brown", department: "Marketing", salary: 68000 },
  { id: 4, name: "Emma Wilson", department: "Human Resources", salary: 61000 },
  { id: 5, name: "David Miller", department: "Engineering", salary: 93000 },
  { id: 6, name: "Olivia Davis", department: "Sales", salary: 74000 },
  { id: 7, name: "James Anderson", department: "IT Support", salary: 65000 },
  { id: 8, name: "Sophia Martinez", department: "Operations", salary: 79000 },
  { id: 9, name: "William Taylor", department: "Legal", salary: 98000 },
  { id: 10, name: "Isabella Thomas", department: "Procurement", salary: 70000 },
  { id: 11, name: "Benjamin Harris", department: "Research", salary: 91000 },
  { id: 12, name: "Mia Clark", department: "Finance", salary: 76000 },
  { id: 13, name: "Lucas Lewis", department: "Engineering", salary: 89000 },
  { id: 14, name: "Charlotte Walker", department: "Marketing", salary: 67000 },
  { id: 15, name: "Henry Hall", department: "Customer Success", salary: 64000 },
  { id: 16, name: "Amelia Allen", department: "Human Resources", salary: 73000 },
  { id: 17, name: "Alexander Young", department: "Engineering", salary: 102000 },
  { id: 18, name: "Evelyn King", department: "Design", salary: 81000 },
  { id: 19, name: "Daniel Wright", department: "Product", salary: 95000 },
  { id: 20, name: "Harper Scott", department: "Quality Assurance", salary: 69000 }
];
  

  new PhotonGrid.GridCore(document.getElementById("grid"), {
    columns,
    data: rowData
  });
</script>
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

const columns = [
  { field: 'id', header: 'ID', colId: 'id', width: 80 },
  { field: 'name', header: 'Employee', colId: 'name', flex: 1, minWidth: 160 },
  { field: 'department', header: 'Department', colId: 'department', flex: 1, minWidth: 150 },
  { field: 'salary', header: 'Salary', colId: 'salary', type: 'number', flex: 1, minWidth: 120 },
];

const rowData = [
  { id: 1, name: "John Smith", department: "Engineering", salary: 85000 },
  { id: 2, name: "Sarah Johnson", department: "Finance", salary: 72000 },
  { id: 3, name: "Michael Brown", department: "Marketing", salary: 68000 },
  { id: 4, name: "Emma Wilson", department: "Human Resources", salary: 61000 },
  { id: 5, name: "David Miller", department: "Engineering", salary: 93000 },
  { id: 6, name: "Olivia Davis", department: "Sales", salary: 74000 },
  { id: 7, name: "James Anderson", department: "IT Support", salary: 65000 },
  { id: 8, name: "Sophia Martinez", department: "Operations", salary: 79000 },
  { id: 9, name: "William Taylor", department: "Legal", salary: 98000 },
  { id: 10, name: "Isabella Thomas", department: "Procurement", salary: 70000 },
  { id: 11, name: "Benjamin Harris", department: "Research", salary: 91000 },
  { id: 12, name: "Mia Clark", department: "Finance", salary: 76000 },
  { id: 13, name: "Lucas Lewis", department: "Engineering", salary: 89000 },
  { id: 14, name: "Charlotte Walker", department: "Marketing", salary: 67000 },
  { id: 15, name: "Henry Hall", department: "Customer Success", salary: 64000 },
  { id: 16, name: "Amelia Allen", department: "Human Resources", salary: 73000 },
  { id: 17, name: "Alexander Young", department: "Engineering", salary: 102000 },
  { id: 18, name: "Evelyn King", department: "Design", salary: 81000 },
  { id: 19, name: "Daniel Wright", department: "Product", salary: 95000 },
  { id: 20, name: "Harper Scott", department: "Quality Assurance", salary: 69000 }
];

export function BasicGrid() {
  return (
    <div style={{ width: '100%', height: 340 }}>
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
  selector: 'app-basic-grid',
  standalone: true,
  imports: [PhotonGridComponent],
  template: `
    <div style="width: 100%; height: 340px;">
      <photon-grid-angular [columns]="columns" [dataSet]="rowData"></photon-grid-angular>
    </div>
  `,
})
export class BasicGridComponent {
  columns = [
    { field: 'id', header: 'ID', colId: 'id', width: 80 },
    { field: 'name', header: 'Employee', colId: 'name', flex: 1, minWidth: 160 },
    { field: 'department', header: 'Department', colId: 'department', flex: 1, minWidth: 150 },
    { field: 'salary', header: 'Salary', colId: 'salary', type: 'number', flex: 1, minWidth: 120 },
  ];

 const rowData = [
  { id: 1, name: "John Smith", department: "Engineering", salary: 85000 },
  { id: 2, name: "Sarah Johnson", department: "Finance", salary: 72000 },
  { id: 3, name: "Michael Brown", department: "Marketing", salary: 68000 },
  { id: 4, name: "Emma Wilson", department: "Human Resources", salary: 61000 },
  { id: 5, name: "David Miller", department: "Engineering", salary: 93000 },
  { id: 6, name: "Olivia Davis", department: "Sales", salary: 74000 },
  { id: 7, name: "James Anderson", department: "IT Support", salary: 65000 },
  { id: 8, name: "Sophia Martinez", department: "Operations", salary: 79000 },
  { id: 9, name: "William Taylor", department: "Legal", salary: 98000 },
  { id: 10, name: "Isabella Thomas", department: "Procurement", salary: 70000 },
  { id: 11, name: "Benjamin Harris", department: "Research", salary: 91000 },
  { id: 12, name: "Mia Clark", department: "Finance", salary: 76000 },
  { id: 13, name: "Lucas Lewis", department: "Engineering", salary: 89000 },
  { id: 14, name: "Charlotte Walker", department: "Marketing", salary: 67000 },
  { id: 15, name: "Henry Hall", department: "Customer Success", salary: 64000 },
  { id: 16, name: "Amelia Allen", department: "Human Resources", salary: 73000 },
  { id: 17, name: "Alexander Young", department: "Engineering", salary: 102000 },
  { id: 18, name: "Evelyn King", department: "Design", salary: 81000 },
  { id: 19, name: "Daniel Wright", department: "Product", salary: 95000 },
  { id: 20, name: "Harper Scott", department: "Quality Assurance", salary: 69000 }
];
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const columns = [
  { field: 'id', header: 'ID', colId: 'id', width: 80 },
  { field: 'name', header: 'Employee', colId: 'name', flex: 1, minWidth: 160 },
  { field: 'department', header: 'Department', colId: 'department', flex: 1, minWidth: 150 },
  { field: 'salary', header: 'Salary', colId: 'salary', type: 'number', flex: 1, minWidth: 120 },
];

const rowData = [
  { id: 1, name: 'John Smith', department: 'Engineering', salary: 85000 },
  { id: 2, name: 'Sarah Johnson', department: 'Finance', salary: 72000 },
  { id: 3, name: 'Michael Brown', department: 'Marketing', salary: 68000 },
  { id: 4, name: 'Emma Wilson', department: 'Human Resources', salary: 61000 },
  { id: 5, name: 'David Miller', department: 'Engineering', salary: 93000 },
];
</script>

<template>
  <div style="width: 100%; height: 340px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Custom cell renderers

Columns can render arbitrary DOM — avatars, badges, and formatted numbers — via
a `renderer.display` function. The renderer receives the cell `value` and the
whole `row`, and returns a DOM node.

<LiveGrid preset="richCells" height={380} title="The same data with avatar, badge, and currency renderers" />

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
function moneyCell(p) {
  const span = document.createElement("span");
  span.textContent = "$" + Number(p.value).toLocaleString();
  return span;
}

const columns = [
  { field: "name", header: "Employee", colId: "name", flex: 1.6, minWidth: 220 },
  { field: "department", header: "Department", colId: "department", flex: 1, minWidth: 150 },
  {
    field: "salary", header: "Salary", colId: "salary", type: "number", width: 140,
    renderer: { display: moneyCell }
  }
];

new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  rowHeight: 52
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

function moneyCell(p: { value: unknown }) {
  const span = document.createElement('span');
  span.textContent = '$' + Number(p.value).toLocaleString();
  return span;
}

const columns = [
  { field: 'name', header: 'Employee', colId: 'name', flex: 1.6, minWidth: 220 },
  { field: 'department', header: 'Department', colId: 'department', flex: 1, minWidth: 150 },
  {
    field: 'salary', header: 'Salary', colId: 'salary', type: 'number', width: 140,
    renderer: { display: moneyCell },
  },
];

export function RichGrid() {
  return (
    <div style={{ width: '100%', height: 380 }}>
      <PhotonGrid columns={columns} dataSet={rowData} options={{ rowHeight: 52, variant: 'ion' }} />
    </div>
  );
}
```

</TabItem>
<TabItem value="angular" label="Angular">

```ts
import { Component } from '@angular/core';
import { PhotonGridComponent } from 'photon-grid-angular';

function moneyCell(p: { value: unknown }) {
  const span = document.createElement('span');
  span.textContent = '$' + Number(p.value).toLocaleString();
  return span;
}

@Component({
  selector: 'app-rich-grid',
  standalone: true,
  imports: [PhotonGridComponent],
  template: `
    <div style="width: 100%; height: 380px;">
      <photon-grid [columns]="columns" [dataSet]="rowData" [options]="options"></photon-grid>
    </div>
  `,
})
export class RichGridComponent {
  columns = [
    { field: 'name', header: 'Employee', colId: 'name', flex: 1.6, minWidth: 220 },
    { field: 'department', header: 'Department', colId: 'department', flex: 1, minWidth: 150 },
    {
      field: 'salary', header: 'Salary', colId: 'salary', type: 'number', width: 140,
      renderer: { display: moneyCell },
    },
  ];
  options = { rowHeight: 52 };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

function moneyCell(p: { value: unknown }) {
  const span = document.createElement('span');
  span.textContent = '$' + Number(p.value).toLocaleString();
  return span;
}

const columns = [
  { field: 'name', header: 'Employee', colId: 'name', flex: 1.6, minWidth: 220 },
  { field: 'department', header: 'Department', colId: 'department', flex: 1, minWidth: 150 },
  {
    field: 'salary', header: 'Salary', colId: 'salary', type: 'number', width: 140,
    renderer: { display: moneyCell },
  },
];

const options = { rowHeight: 52 };
</script>

<template>
  <div style="width: 100%; height: 380px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Sortable data grid

Pass more rows and let Photon Grid handle sorting and virtualization. Click a
header to sort; colored badges are rendered per cell.

<LiveGrid preset="finance" height={360} title="Watchlist — click a header to sort" />

## Next steps

- [Installation](./installation.md) — add Photon Grid to your own project.
- [Configuration options](./configuration-options.md) — the full list of grid options.
