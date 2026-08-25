---
sidebar_position: 1
title: "Theming Overview"
description: "Learn the Photon Grid theming model, apply the built-in light and dark themes with the theme option and api.setTheme, and toggle dark mode at runtime."
keywords: [photon grid, javascript data grid, grid theming, dark mode grid, light theme, data grid theme]
---

# Theming Overview

Photon Grid ships with a complete theming model built around two ready-made themes and a small runtime API. Grid theming in Photon Grid lets you switch the entire visual appearance of the grid, including surfaces, header styling, and dark mode, without rewriting your columns or data.

## Overview

A **theme** in Photon Grid is a plain object that describes how the grid renders its surfaces, headers, rows, borders, and interactive states. The library provides two built-in themes:

- `PhotonGrid.lightTheme` — a bright, neutral appearance suited to most applications.
- `PhotonGrid.darkTheme` — a low-light appearance for dark UIs and dashboards.

You apply a theme in one of two ways:

1. **At construction time** with the `theme` grid option.
2. **At runtime** with `api.setTheme(theme)` or `api.toggleDarkMode()`.

Whenever the theme changes, the grid emits a `theme:changed` event so you can keep the rest of your UI (buttons, surrounding chrome, charts) in sync.

Use themes when you want a consistent, centrally-managed look, when you support user-selectable light/dark modes, or when your grid lives inside a product that already has a light and dark experience.

## Applying a theme

Pass a built-in theme to the `theme` option when you create the grid.

```js
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

## Changing the theme at runtime

Call `api.setTheme(theme)` to swap the active theme after the grid is live.

```js
// Switch to the built-in dark theme
api.setTheme(PhotonGrid.darkTheme);

// Switch back to the built-in light theme
api.setTheme(PhotonGrid.lightTheme);
```

## Toggling dark mode

For a simple light/dark switch, `api.toggleDarkMode()` flips between the light and dark appearance in one call.

```js
document.getElementById("toggle").addEventListener("click", () => {
  api.toggleDarkMode();
});
```

## Reacting to theme changes

Subscribe to `theme:changed` to update surrounding UI whenever the theme is applied.

```js
api.on("theme:changed", (event) => {
  console.log("Theme changed", event);
});
```

## Live Example

<iframe
  src="/examples/theming-overview/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `theme` | `object` | Grid option that sets the initial theme, for example `PhotonGrid.lightTheme` or `PhotonGrid.darkTheme`. |
| `PhotonGrid.lightTheme` | `object` | Built-in light theme object. |
| `PhotonGrid.darkTheme` | `object` | Built-in dark theme object. |
| `api.setTheme(theme)` | `method` | Applies a theme object to the live grid. |
| `api.toggleDarkMode()` | `method` | Toggles between the light and dark appearance. |
| `theme:changed` | `event` | Fires whenever the active theme changes. |

## Related

- [Built-in Themes](/docs/styling/themes)
- [Theming Borders](/docs/more-photon-features/borders)
- [Theming Fonts](/docs/more-photon-features/fonts)
- [Theming Headers](/docs/more-photon-features/headers)
- [Theming Selections](/docs/more-photon-features/selections)
