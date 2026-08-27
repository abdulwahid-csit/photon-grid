---
sidebar_position: 6
title: "Theming Icons"
description: "Understand the Photon Grid icon system for sort and filter indicators, how the build provides icons, and how the active theme colors them for light and dark."
keywords: [photon grid, javascript data grid, grid icons, sort icon, filter icon, grid theming]
---

# Theming Icons

Icons give your data grid its interactive cues: sort direction arrows, filter indicators, and other affordances that tell users what a column can do. Photon Grid provides these icons as part of the build, and the active **theme** colors them so they stay visible in both light and dark mode.

## Overview

The grid's icon system is built in. You do not register icon assets to see standard indicators appear; instead, the grid renders the appropriate icons automatically based on column configuration:

- **Sort icons** appear on `sortable` columns and reflect the current sort direction.
- **Filter icons** appear on columns configured with `filter`, indicating filter availability and active state.
- Other structural affordances (such as grouping or expansion indicators) render where relevant.

Because icons are part of the rendered grid, the active theme controls their color and contrast. Switching between `PhotonGrid.lightTheme` and `PhotonGrid.darkTheme` keeps icons legible against the header and cell backgrounds.

## Making icons appear

Icons are driven by column configuration. Enable `sortable` and `filter` on the columns where you want the corresponding indicators.

```js
const columns = [
  { field: "id",         header: "ID",         colId: "id",         width: 80, configurable: false },
  { field: "name",       header: "Employee",   colId: "name",       flex: 1, sortable: true, filter: true },
  { field: "department", header: "Department", colId: "department", flex: 1, sortable: true, filter: true },
  { field: "country",    header: "Country",    colId: "country",    flex: 1, sortable: true, filter: true },
  { field: "salary",     header: "Salary",     colId: "salary",     flex: 1, sortable: true }
];

const grid = new PhotonGrid.GridCore(
  document.getElementById("grid"),
  {
    columns,
    data: rowData,
    headerRowHeight: 48,
    rowHeight: 42,
    theme: PhotonGrid.lightTheme
  }
);

const api = grid.api;
```

## Icons and theming

Since the theme governs icon color, you get correct contrast automatically when you change modes.

```js
// Icons recolor for the dark background:
api.setTheme(PhotonGrid.darkTheme);

// Or toggle between modes:
api.toggleDarkMode();
```

Conceptually, keep in mind:

- **Icons follow the header and cell colors.** Rely on the theme rather than overriding icon colors manually so they remain accessible in both modes.
- **Icons reflect state.** A sort icon indicates ascending or descending order; a filter icon indicates whether a filter is active. This state is driven by user interaction and by the sorting and filtering APIs.

## Live Example

The example renders a themed grid with sortable and filterable columns so you can see the sort and filter icons in the header. Click a header to sort and watch the icon update.

<iframe
  src="/examples/theming-icons/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `sortable` | `boolean` | Column definition flag; enables the sort icon and sorting on that column. |
| `filter` | `boolean` | Column definition flag; enables the filter icon and filtering on that column. |
| `theme` | `object` | Grid option that sets the initial theme, which colors the icons. |
| `api.setTheme(theme)` | `method` | Applies a theme object, recoloring icons for the new background. |
| `api.toggleDarkMode()` | `method` | Toggles light and dark appearance for icon contrast. |

## Related

- [Theming Overview](/docs/more-photon-features/theming-overview)
- [Built-in Themes](/docs/styling/themes)
- [Theming Headers](/docs/more-photon-features/headers)
- [Theming Selections](/docs/more-photon-features/selections)
