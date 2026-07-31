---
title: "Row Hiding"
description: "Hide rows in Photon Grid by filtering them out of view — quick filter across all columns, per-column filter models, and API-driven filtering. Rows are hidden, not deleted. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid hide rows
  - filter rows data grid
  - quick filter
  - filter model
  - hide rows by condition
  - setQuickFilter setFilterModel
---

# Row Hiding

In Photon Grid, rows are hidden by **filtering** — the rows stay in the dataset
but are removed from view when they don't match the active filter. This is
non-destructive: clear the filter and the rows reappear. To permanently remove
rows, see [Row Trimming](./row-trimming.md).

## Quick filter

The quickest way to hide non-matching rows is a **quick filter** — a single
search term matched across all columns.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  quickFilter: { term: "engineering" }   // only rows matching "engineering" are shown
});
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
        options={{ quickFilter: { term: 'engineering' } }}
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
      <photon-grid [columns]="columns" [dataSet]="rowData" [options]="options"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = columns;
  rowData = rowData;
  options = { quickFilter: { term: 'engineering' } };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = { quickFilter: { term: 'engineering' } };
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

### Quick filter from the API

Bind the quick filter to a search box using `setQuickFilter`. Pass a list of
fields to restrict which columns are searched.

```js
const grid = new PhotonGrid.GridCore(el, { columns, data: rowData });

searchInput.addEventListener("input", (e) => {
  grid.api.setQuickFilter(e.target.value);
});

// Restrict the search to specific fields:
grid.api.setQuickFilter("john", ["name", "email"]);
```

## Column filters

For structured filtering, use the inline filter row (enable it with
`showFilterRow: true`) or apply a filter model directly. A filter model maps a
column id to a condition.

```js
const grid = new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  showFilterRow: true
});

// Show only rows where salary is greater than 80,000:
grid.api.setFilterModel({
  salary: { operator: "greaterThan", value: 80000 }
});

console.log(grid.api.getFilterModel()); // read the active model
```

Filtering is available per column via the `filterable` flag (on by default). Set
`filterable: false` on a column to exclude it from filtering. See
[Column Filter](../columns/column-filter.md) for the full operator reference.

## Hiding rows by condition (API)

To hide rows based on your own logic, translate the condition into a filter. For
example, keep only active rows:

```js
grid.api.setFilterModel({
  status: { operator: "equals", value: "active" }
});
```

Clearing filters restores every row:

```js
grid.api.setFilterModel({});      // remove column filters
grid.api.setQuickFilter("");      // clear the quick filter
```

## Filtered vs. total rows

Filtering changes the **visible** row set, not the underlying data. Use the API
to read either:

```js
grid.api.getDisplayedRowCount(); // rows currently visible after filtering
grid.api.getAllRows().length;    // every row in the dataset
```

## Next steps

- [Row Trimming](./row-trimming.md) — permanently remove rows from the dataset.
- [Row Sorting](./rows-sorting.md) · [Row Pagination](./rows-pagination.md)
- [Column Filter](../columns/column-filter.md) — per-column filter operators.
