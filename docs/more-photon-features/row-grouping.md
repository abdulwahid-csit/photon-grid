---
sidebar_position: 3
title: "Row Grouping"
description: "Group rows in Photon Grid by any column with groupByColumn and setRowGroupColumns, then expand or collapse all groups and react to group expanded events."
keywords: [photon grid, javascript data grid, row grouping, groupByColumn, expand collapse groups, grouping events]
---

# Grouping

**Row grouping** organizes flat data into collapsible categories, so users can roll up rows by a shared value such as department or country. Photon Grid lets you group by one or more columns and control the expanded state through `grid.api`.

## Overview

When you group by a column, Photon Grid collapses rows that share the same value under a single group header. Users can expand a group to reveal its child rows or collapse it to hide them. Grouping is ideal for summarizing large datasets and for letting users drill into a category on demand.

## Grouping by a column

Call `groupByColumn` with a column id to group rows by that field.

```js
const grid = new PhotonGrid.GridCore(
  document.getElementById("grid"),
  { columns, data: rowData, headerRowHeight: 48, rowHeight: 42 }
);

const api = grid.api;

api.groupByColumn("department");
```

To group by several columns, pass an array of column ids to `setRowGroupColumns`. Each column adds another level of nesting.

```js
api.setRowGroupColumns(["department", "country"]);
```

Remove all grouping with `clearGrouping`.

```js
api.clearGrouping();
```

## Expanding and collapsing groups

You can expand or collapse every group at once, which is handy for "expand all" and "collapse all" toolbar buttons.

```js
api.expandAllGroups();
api.collapseAllGroups();
```

To control a single group, use `expandGroup` and `collapseGroup` with the group key, and read the state with `isGroupExpanded`.

```js
api.expandGroup("Engineering");
api.collapseGroup("Engineering");
api.isGroupExpanded("Engineering"); // true or false
```

## Reacting to group changes

Subscribe to `group:expanded` and `group:collapsed` to run logic whenever a group opens or closes.

```js
api.on("group:expanded", (event) => {
  console.log("Group expanded", event);
});

api.on("group:collapsed", (event) => {
  console.log("Group collapsed", event);
});
```

## Live Example

<iframe
  src="/examples/grouping/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `groupByColumn(colId)` | `method` | Groups rows by a single column. |
| `setRowGroupColumns(cols)` | `method` | Groups rows by an ordered array of columns. |
| `clearGrouping()` | `method` | Removes all row grouping. |
| `expandAllGroups()` | `method` | Expands every group. |
| `collapseAllGroups()` | `method` | Collapses every group. |
| `isGroupExpanded(key)` | `method` | Returns whether a group is expanded. |
| `group:expanded` | `event` | Fires when a group is expanded. |
| `group:collapsed` | `event` | Fires when a group is collapsed. |

## Related

- [Rows Overview](/docs/more-photon-features/rows-overview)
- [Sorting](/docs/rows/rows-sorting)
- [Row Checkboxes](/docs/more-photon-features/row-checkboxes)
- [Quick Start](/docs/more-photon-features/quick-start)
