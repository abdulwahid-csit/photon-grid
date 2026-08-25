---
sidebar_position: 5
title: "Theming Headers"
description: "Style the Photon Grid header row using the headerRowHeight option and built-in themes, with a live example that combines a tall header and dark mode toggle."
keywords: [photon grid, javascript data grid, grid header, header row height, header styling, grid theming]
---

# Theming Headers

The header row is the anchor of your data grid: it labels columns, hosts sort and filter controls, and sets the visual tone for the body beneath it. Photon Grid lets you control header height with the `headerRowHeight` option and header appearance through the active **theme**.

## Overview

Header styling comes from two coordinated sources:

- **Header height** — the `headerRowHeight` option sets the pixel height of the header row. Taller headers give labels and controls more room and create a stronger visual separation from the data.
- **Header appearance** — the active theme controls the header's surface, text, and separators. The built-in `PhotonGrid.lightTheme` and `PhotonGrid.darkTheme` provide header treatments tuned for their backgrounds, so switching themes keeps the header legible.

Conceptually, a well-designed header has clear contrast against the body, comfortable vertical padding relative to `headerRowHeight`, and consistent alignment with the data cells below it.

## Setting the header height

Pass `headerRowHeight` when you create the grid. A larger value produces a more prominent header.

```js
const grid = new PhotonGrid.GridCore(
  document.getElementById("grid"),
  {
    columns,
    data: rowData,
    headerRowHeight: 64,
    rowHeight: 42,
    theme: PhotonGrid.lightTheme
  }
);

const api = grid.api;
```

## Header appearance with themes

Because the header is themed, you do not need to restyle it when switching modes. Toggling dark mode re-renders the header with dark-appropriate colors automatically.

```js
document.getElementById("toggle").addEventListener("click", () => {
  api.toggleDarkMode();
});
```

You can also apply a specific theme directly:

```js
api.setTheme(PhotonGrid.darkTheme);
```

## Guidance

- **Match height to content.** If your headers carry filters or wrap to two lines, a taller `headerRowHeight` (for example 56–72) improves clarity.
- **Keep header and row heights balanced.** A header noticeably taller than `rowHeight` reads as a clear title bar; equal heights read as a denser, spreadsheet-like grid.
- **Rely on the theme for contrast.** Let `PhotonGrid.lightTheme` and `PhotonGrid.darkTheme` handle header color so it stays legible in both modes.

## Live Example

The example uses a tall `headerRowHeight` with the light theme applied, plus a button to toggle dark mode and see the header restyle itself.

<iframe
  src="/examples/theming-headers/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `headerRowHeight` | `number` | Height of the header row in pixels, for example `64`. |
| `rowHeight` | `number` | Height of each data row in pixels; balance against the header height. |
| `theme` | `object` | Grid option that sets the initial theme, including header appearance. |
| `api.setTheme(theme)` | `method` | Applies a theme object to the live grid, restyling the header. |
| `api.toggleDarkMode()` | `method` | Toggles between light and dark header appearance. |

## Related

- [Theming Overview](/docs/more-photon-features/theming-overview)
- [Built-in Themes](/docs/styling/themes)
- [Theming Fonts](/docs/more-photon-features/fonts)
- [Theming Icons](/docs/more-photon-features/icons)
