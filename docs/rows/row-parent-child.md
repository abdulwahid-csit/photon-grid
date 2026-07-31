---
title: "Row Parent / Child"
description: "Model hierarchical rows in Photon Grid — Tree Data for self-referential hierarchies (parentId, nested children, data paths) and Master/Detail for expandable rows with nested grids. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid tree data
  - hierarchical rows
  - parent child rows
  - master detail grid
  - nested grid expandable rows
  - treeData parentId children dataPath
  - org chart file tree grid
---

# Row Parent / Child

Photon Grid models parent–child relationships in two complementary ways:

| Feature | Use it for | Shape |
|---------|-----------|-------|
| **Tree Data** | A single hierarchy shown as indented, expandable rows — org charts, file trees, bills of materials. | Rows reference each other (parent/child). |
| **Master / Detail** | An expandable row whose detail section is its own nested grid or custom content. | Each master row owns a separate detail dataset. |

Tree Data and row grouping are mutually exclusive — a grid is either
tree-structured or column-value-grouped, never both at once.

## Tree Data

Enable Tree Data with the `treeData` option. It supports four input shapes via
`mode`; pick the one that matches how your data is structured.

| `mode` | How the hierarchy is derived |
|--------|------------------------------|
| `parentId` | Each flat record has an `id` and a `parentId` pointing at its parent (`null` for roots). |
| `childrenField` | Records are already nested — each has a `children` array. |
| `dataPath` | A `getDataPath(row)` callback returns each row's full ancestor path, e.g. `['Electronics','Phones','iPhone']`. |
| `custom` | You supply a `hierarchyProvider` with `getId` / `getParentKey`. |

### Example — `parentId` mode

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const columns = [
  { field: "name",  header: "Name",  colId: "name", flex: 1 },
  { field: "title", header: "Title", colId: "title", flex: 1 }
];

const rowData = [
  { id: 1, parentId: null, name: "Alice",  title: "CEO" },
  { id: 2, parentId: 1,    name: "Bob",    title: "VP Engineering" },
  { id: 3, parentId: 2,    name: "Carol",  title: "Engineer" },
  { id: 4, parentId: 1,    name: "Dave",   title: "VP Sales" }
];

new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  treeData: {
    enabled: true,
    mode: "parentId",
    idField: "id",
    parentIdField: "parentId",
    defaultExpanded: 1   // expand roots only
  }
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
        options={{
          treeData: {
            enabled: true,
            mode: 'parentId',
            idField: 'id',
            parentIdField: 'parentId',
            defaultExpanded: 1,
          },
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
      <photon-grid [columns]="columns" [dataSet]="rowData" [options]="options"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = columns;
  rowData = rowData;
  options = {
    treeData: {
      enabled: true,
      mode: 'parentId',
      idField: 'id',
      parentIdField: 'parentId',
      defaultExpanded: 1,
    },
  };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = {
  treeData: {
    enabled: true,
    mode: 'parentId',
    idField: 'id',
    parentIdField: 'parentId',
    defaultExpanded: 1,
  },
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

### Example — `childrenField` mode (nested data)

```js
const rowData = [
  {
    name: "Electronics",
    children: [
      { name: "Phones", children: [{ name: "iPhone 15" }, { name: "Pixel 9" }] },
      { name: "Laptops", children: [{ name: "MacBook Air" }] }
    ]
  }
];

new PhotonGrid.GridCore(el, {
  columns: [{ field: "name", header: "Category", flex: 1 }],
  data: rowData,
  treeData: { enabled: true, mode: "childrenField", childrenField: "children" }
});
```

### Example — `dataPath` mode

```js
new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  treeData: {
    enabled: true,
    mode: "dataPath",
    getDataPath: (row) => row.path   // e.g. ["Electronics", "Phones", "iPhone 15"]
  }
});
```

### Tree Data options

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | `boolean` | Master switch. |
| `mode` | `'parentId' \| 'childrenField' \| 'dataPath' \| 'custom'` | How the hierarchy is derived. |
| `idField` | `string` | (`parentId`) Field holding each record's own id. Default `'id'`. |
| `parentIdField` | `string` | (`parentId`) Field holding the parent id. Default `'parentId'`. |
| `childrenField` | `string` | (`childrenField`) Field holding nested children. Default `'children'`. |
| `getDataPath` | `(row) => string[]` | (`dataPath`) Returns the full ancestor path. |
| `hierarchyProvider` | `TreeHierarchyProvider` | (`custom`) Supplies `getId` / `getParentKey`. |
| `toggleColumnId` | `string` | Which column shows the expand toggle & indentation. Defaults to the first visible column. |
| `defaultExpanded` | `boolean \| number` | `true` expands all; a number expands nodes with `level` below it; omitted starts collapsed. |

### Tree Data API

| Method | Description |
|--------|-------------|
| `expandTreeNode(nodeId)` / `collapseTreeNode(nodeId)` | Expand or collapse one node. |
| `expandAllTreeNodes()` / `collapseAllTreeNodes()` | Expand or collapse the whole tree. |
| `getTreeNodeChildren(nodeId)` | Return a node's child rows. |

## Master / Detail

Master/Detail turns each row into an expandable master whose detail section is a
**fully independent nested Photon Grid** (or custom content). Enable it with the
`masterDetail` option.

```js
new PhotonGrid.GridCore(el, {
  columns,                 // master (top-level) columns
  data: rowData,
  masterDetail: {
    enabled: true,
    // Provide the detail grid's config per master row:
    detailGrid: (masterRow) => ({
      columns: [
        { field: "date",   header: "Date" },
        { field: "amount", header: "Amount", type: "currency" }
      ],
      data: masterRow.orders   // this master row's child records
    }),
    defaultExpanded: false
  }
});
```

### Master / Detail options

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | `boolean` | Master switch. |
| `toggleColumnId` | `string` | Which column shows the expand toggle. |
| `hasDetail` | `(rowData) => boolean` | Return `false` to hide the toggle for rows with no detail. |
| `getDetailData` | `(rowData, …) => …` | Supply the detail dataset for a master row. |
| `detailGrid` | `GridOptions \| (rowData) => GridOptions` | Config for the nested detail grid. |
| `detailRendererFn` | `(params) => HTMLElement` | Render custom detail content instead of a grid. |
| `defaultExpanded` | `boolean` | Expand every master row on load. |
| `detailAutoHeight` · `detailFixedHeight` · `detailMinHeight` · `detailMaxHeight` | `boolean` / `number` | Control the detail section's height. |
| `detailResizable` | `boolean` | Let users resize the detail section. |
| `lazy` | `boolean` | Build the detail grid on first expand instead of up front. |

### Master / Detail API

| Method | Description |
|--------|-------------|
| `expandDetail(nodeId)` / `collapseDetail(nodeId)` | Expand or collapse a master row's detail. |
| `collapseAllDetails()` | Collapse every detail section. |
| `getDetailGridApi(nodeId)` | Get the nested grid's API for a master row. |

## Next steps

- [Row Moving](./row-moving.md) — drag rows to re-parent them within a tree.
- [Row Headers](./row-headers.md) — selection in hierarchical grids.
- [Configuration options](../getting-started/configuration-options.md) — `treeData` and `masterDetail`.
