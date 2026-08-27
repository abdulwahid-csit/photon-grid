---
sidebar_position: 3
title: "Theming Borders"
description: "Customize Photon Grid borders conceptually with a theme object spread over lightTheme, apply a base theme, and toggle dark mode using confirmed grid APIs."
keywords: [photon grid, javascript data grid, grid borders, cell borders, custom theme, grid theming]
---

# Theming Borders

Borders define how clearly cells, rows, and the header separate from one another in your data grid. In Photon Grid, borders are part of the active **theme**, so you control them by choosing a built-in theme or by deriving a custom theme object from one of the built-ins.

## Overview

Borders in a data grid influence readability and density. Heavier borders create a strong spreadsheet-like grid; lighter or absent borders create a cleaner, more modern look. Conceptually, a theme controls border-related appearance such as:

- The **grid outline** around the whole component.
- **Row separators** between data rows.
- **Column separators** between cells.
- The **header border** dividing the header row from the body.

The built-in `PhotonGrid.lightTheme` and `PhotonGrid.darkTheme` already provide coordinated border treatments for their respective backgrounds, so switching themes automatically adjusts borders to remain legible.

## Applying a base theme

The most reliable way to control borders is to start from a built-in theme and apply it with the `theme` option, then let dark mode adjust the borders for you at runtime.

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

## Deriving a custom border theme (illustrative)

If you need borders that differ from the built-ins, derive a new theme object by spreading one of the built-in themes and overriding the border-related properties, then pass the result to the `theme` option or `api.setTheme`.

:::note
The object below is **illustrative only**. It demonstrates the pattern of spreading `PhotonGrid.lightTheme` and overriding properties. The exact border token names are not part of the confirmed public API, so treat the keys shown here as placeholders and confirm the supported keys for your build before relying on them.
:::

```js
// ILLUSTRATIVE — property names are placeholders, not confirmed tokens.
const customBorderTheme = {
  ...PhotonGrid.lightTheme,
  // e.g. a slightly stronger separator between rows and columns:
  borderColor: "#c7ccd4",
  cellBorder: "1px solid #c7ccd4",
  headerBorder: "2px solid #aeb4bd"
};

// Applied through the confirmed theme API:
api.setTheme(customBorderTheme);
```

Because the spread copies every property from `PhotonGrid.lightTheme`, any properties you do not override keep their built-in values, so your custom theme stays consistent with the rest of the grid.

## Live Example

The example applies the built-in light theme and lets you toggle dark mode, which shows how coordinated border colors adjust for each background.

<iframe
  src="/examples/theming-borders/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `theme` | `object` | Grid option that sets the initial theme, including its border treatment. |
| `PhotonGrid.lightTheme` | `object` | Built-in light theme; a base to spread over for a custom border theme. |
| `PhotonGrid.darkTheme` | `object` | Built-in dark theme with dark-appropriate borders. |
| `api.setTheme(theme)` | `method` | Applies a theme object (including a derived one) to the live grid. |
| `api.toggleDarkMode()` | `method` | Toggles between light and dark, adjusting borders for the background. |

## Related

- [Theming Overview](/docs/more-photon-features/theming-overview)
- [Built-in Themes](/docs/styling/themes)
- [Theming Headers](/docs/more-photon-features/headers)
- [Theming Fonts](/docs/more-photon-features/fonts)
