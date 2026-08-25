---
sidebar_position: 7
title: "Theming Selections"
description: "See how Photon Grid selection appearance works under light and dark themes, configure selection mode, and respond to row and cell selection change events."
keywords: [photon grid, javascript data grid, row selection, cell selection, selection styling, grid theming]
---

# Theming Selections

Selection styling tells users exactly what they have picked. In Photon Grid, selected rows and cells are highlighted by the active **theme**, so selections stay clear and accessible whether you run the light or dark appearance. You control what can be selected with the `selection` option and react to changes through selection events.

## Overview

Selection has two aspects that work together:

- **Behavior** — the `selection` option sets the mode with `mode: "single"` or `mode: "multiple"`. You can also enable a checkbox column with `checkboxSelection` on a column definition.
- **Appearance** — the active theme colors the selection highlight for rows and cells. The built-in `PhotonGrid.lightTheme` and `PhotonGrid.darkTheme` each provide a selection highlight tuned for their background, so selected content remains distinct in both modes.

Conceptually, selection styling should read as a clear but non-distracting highlight: strong enough to stand out from unselected rows, yet legible so the underlying data remains readable. Letting the theme own this highlight keeps selection accessible when you switch modes.

## Enabling selection

Configure the `selection` option and, optionally, a checkbox column. Apply a theme so the highlight is coordinated with the rest of the grid.

```js
const columns = [
  { field: "id",         header: "ID",         colId: "id",         width: 80, checkboxSelection: true },
  { field: "name",       header: "Employee",   colId: "name",       flex: 1 },
  { field: "department", header: "Department", colId: "department", flex: 1 },
  { field: "country",    header: "Country",    colId: "country",    flex: 1 },
  { field: "salary",     header: "Salary",     colId: "salary",     flex: 1 }
];

const grid = new PhotonGrid.GridCore(
  document.getElementById("grid"),
  {
    columns,
    data: rowData,
    headerRowHeight: 48,
    rowHeight: 42,
    theme: PhotonGrid.lightTheme,
    selection: { mode: "multiple" }
  }
);

const api = grid.api;
```

## Selection appearance under light and dark themes

Because the theme owns the highlight color, toggling dark mode recolors selected rows and cells automatically, keeping them legible against the new background.

```js
document.getElementById("toggle").addEventListener("click", () => {
  api.toggleDarkMode();
});
```

## Responding to selection changes

Subscribe to selection events to keep your UI in sync with what the user has picked.

```js
// Fired when the set of selected rows changes
api.on("row:selected", (event) => {
  console.log("Selected rows:", api.getSelectedRows());
});

// Fired when the cell selection range changes
api.on("cell:selectionChanged", (event) => {
  console.log("Cell selection changed", event);
});
```

You can also drive selection programmatically, for example with `api.selectAll()`, `api.deselectAll()`, or `api.getSelectedCount()`, and the theme highlights the results consistently.

## Live Example

The example enables multiple-row selection with a checkbox column and applies the light theme. Select some rows, then toggle dark mode to see how the selection highlight adapts.

<iframe
  src="/examples/theming-selections/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `selection` | `object` | Selection config; use `mode: "single"` or `mode: "multiple"`. |
| `checkboxSelection` | `boolean` | Column definition flag; adds a selection checkbox to the column. |
| `theme` | `object` | Grid option that sets the initial theme, including the selection highlight. |
| `api.toggleDarkMode()` | `method` | Toggles light and dark appearance for the selection highlight. |
| `api.getSelectedRows()` | `method` | Returns the currently selected rows. |
| `row:selected` | `event` | Fires when a row's selection state changes. |
| `cell:selectionChanged` | `event` | Fires when the cell selection range changes. |

## Related

- [Theming Overview](/docs/more-photon-features/theming-overview)
- [Built-in Themes](/docs/styling/themes)
- [Theming Icons](/docs/more-photon-features/icons)
- [Theming Headers](/docs/more-photon-features/headers)
