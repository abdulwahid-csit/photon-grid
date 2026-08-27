---
sidebar_position: 2
title: "Quick Start"
description: "Build your first Photon Grid in less than a minute — in vanilla JS, React, Angular, or Vue."
---

# Quick Start

This guide shows how to create your first Photon Grid. Pick your framework in the tabs below — your choice is remembered across the whole documentation.

## Add Photon Grid

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

Add the Photon Grid script to your page.

```html
<script src="https://cdn.jsdelivr.net/npm/photon-grid-core@latest/photon-grid.min.js"></script>
```

Then add a sized container element:

```html
<div id="grid" style="width:100%;height:500px;"></div>
```

</TabItem>
<TabItem value="react" label="React">

Install the wrapper and the core engine:

```bash
npm install photon-grid-react photon-grid-core
```

</TabItem>
<TabItem value="angular" label="Angular">

Install the wrapper and the core engine:

```bash
npm install photon-grid-angular photon-grid-core
```

</TabItem>
<TabItem value="vue" label="Vue">

Install the wrapper and the core engine:

```bash
npm install photon-grid-vue photon-grid-core
```

</TabItem>
</FrameworkTabs>

## Define columns and data

Columns and row data are plain objects, identical across every framework.

```js
const columns = [
  { field: "id", header: "ID", colId: "id", width: 80 },
  { field: "name", header: "Employee", colId: "name", flex: 1 },
  { field: "department", header: "Department", colId: "department", flex: 1 },
  { field: "salary", header: "Salary", colId: "salary", flex: 1 }
];

const rowData = [
  { id: 1, name: "John Smith", department: "Engineering", salary: 85000 },
  { id: 2, name: "Sarah Johnson", department: "Finance", salary: 72000 },
  { id: 3, name: "Michael Brown", department: "Marketing", salary: 68000 }
];
```

## Create the grid

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(
  document.getElementById("grid"),
  {
    columns,
    data: rowData,
    headerRowHeight: 48,
    rowHeight: 42,
    pagination: {
      enabled: true,
      pageSize: 100
    }
  }
);
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
        options={{
          headerRowHeight: 48,
          rowHeight: 42,
          pagination: { enabled: true, pageSize: 100 },
        }}
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
      <photon-grid
        [columns]="columns"
        [dataSet]="rowData"
        [options]="options">
      </photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = columns;
  rowData = rowData;
  options = {
    headerRowHeight: 48,
    rowHeight: 42,
    pagination: { enabled: true, pageSize: 100 },
  };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = {
  headerRowHeight: 48,
  rowHeight: 42,
  pagination: { enabled: true, pageSize: 100 },
};
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Live Example

The grid below is a **real, running Photon Grid** — the same `photon-grid-core`
bundle loaded from the CDN, rendered inline (try sorting a column):

<LiveGrid preset="quickStart" height={340} title="Quick Start — the exact columns & data from the snippets above" />

Custom cell renderers (avatars, badges, formatted numbers) are just as easy:

<LiveGrid preset="richCells" height={380} title="The same data with avatar, badge and currency renderers" />

## What's Next?

- Column Definitions
- Sorting
- Filtering
- Pagination
- Row Selection
- Cell Editing
- Virtual Scrolling
