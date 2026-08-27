---
sidebar_position: 4
title: "Theming Fonts"
description: "Control Photon Grid typography by setting the container font-family with CSS on the host element, then combine it with a built-in theme and dark mode toggle."
keywords: [photon grid, javascript data grid, grid typography, font-family, grid fonts, grid theming]
---

# Theming Fonts

Typography sets the tone and readability of your data grid. In Photon Grid, the grid inherits the font of its host element, so you control the typeface primarily through CSS on the grid container, and pair it with a built-in **theme** for coordinated colors and dark mode.

## Overview

Font choices in a data grid affect density, scannability, and how numeric columns line up. There are two complementary layers to think about:

- **Typeface (font-family)** — set with CSS on the grid's host element. Because the grid renders inside your container, it inherits the container's `font-family`, so a single CSS rule restyles every cell and header.
- **Theme** — the built-in `PhotonGrid.lightTheme` and `PhotonGrid.darkTheme` provide the colors and surfaces that the text sits on. The theme handles contrast for light and dark backgrounds; your CSS handles the typeface.

This separation means you can pick any web font or system font stack and still benefit from the grid's coordinated light and dark theming.

## Setting the container font-family

Apply a `font-family` to the element that hosts the grid. A robust system font stack looks like this:

```css
#grid {
  width: 100%;
  height: 460px;
  font-family: "Inter", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
}
```

Then create the grid inside that container and apply a built-in theme so text and background remain legible together.

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

document.getElementById("toggle").addEventListener("click", () => {
  api.toggleDarkMode();
});
```

## Tips for grid typography

- **Prefer a system font stack** for the fastest render and a native feel, or load a web font (for example via `@font-face` or a `<link>`) before the grid renders.
- **Use tabular figures** where your font supports them (`font-variant-numeric: tabular-nums;`) so numeric columns align vertically.
- **Keep font sizes consistent** with your `rowHeight` and `headerRowHeight` so text has comfortable vertical breathing room.
- **Let the theme own the colors.** Set the typeface with CSS and leave text and background colors to the active theme so light and dark modes stay legible.

## Live Example

The example sets a custom `font-family` on the grid container and applies the light theme, with a button to toggle dark mode.

<iframe
  src="/examples/theming-fonts/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `theme` | `object` | Grid option that sets the initial theme, providing text and background colors. |
| `PhotonGrid.lightTheme` | `object` | Built-in light theme object. |
| `PhotonGrid.darkTheme` | `object` | Built-in dark theme object. |
| `api.toggleDarkMode()` | `method` | Toggles between light and dark appearance for the typeface's background. |
| `font-family` (CSS) | `CSS` | Set on the grid's host element; the grid inherits it for all cells and headers. |

## Related

- [Theming Overview](/docs/more-photon-features/theming-overview)
- [Built-in Themes](/docs/styling/themes)
- [Theming Headers](/docs/more-photon-features/headers)
- [Theming Borders](/docs/more-photon-features/borders)
