---
title: "Theme Customization"
description: "Create a custom Photon Grid theme by overriding its --pg-* CSS variables. Complete reference of every design token — colors, typography, spacing, sizing, borders, shadows, and transitions — with descriptions and light/dark defaults."
keywords:
  - photon grid custom theme
  - css variables data grid
  - --pg design tokens
  - customize grid colors
  - grid theme variables reference
  - override grid styles
  - create custom theme
  - data grid design tokens
---

# Theme Customization

Every color, size, font, radius, shadow, and transition in Photon Grid is driven
by a **design token** — a CSS custom property named `--pg-*`. Override these
variables with your own CSS and you have a fully custom theme, without forking a
stylesheet or touching the grid internals.

This page explains how the token system works, the fastest way to create your own
theme, and a **complete reference of every variable** with its purpose and
default values.

## How theming works

When a grid mounts, its active [mode](./themes.md) (light or dark) is injected as
a block of CSS custom properties:

- **Scoped to the grid container** — so multiple grids on one page can use
  different themes.
- **Mirrored onto `:root`** — so portaled UI (context menus, dropdowns, dialogs,
  tooltips appended to `<body>`) inherits the same palette.

Every internal style then reads from those variables, e.g. `color: var(--pg-colors-text-primary)`.
Redefining a variable anywhere in the cascade re-themes everything that uses it.

### Variable naming

Token names follow a predictable pattern:

```
--pg-<group>-<token>
```

The `group` is one of `colors`, `typography`, `spacing`, `sizing`, `borders`,
`shadows`, or `transitions`, and the `token` is the camelCase key rendered in
kebab-case. For example:

| Token | CSS variable |
|-------|--------------|
| `colors.primary` | `--pg-colors-primary` |
| `colors.rowSelectedBorder` | `--pg-colors-row-selected-border` |
| `typography.fontSizeMd` | `--pg-typography-font-size-md` |
| `sizing.headerRowHeight` | `--pg-sizing-header-row-height` |
| `borders.radiusPill` | `--pg-borders-radius-pill` |

## Create your own theme

### Method 1 — Override CSS variables (recommended)

Add a class to the page, and redefine any `--pg-*` variables on the grid's inner
`.pg-grid` element inside it. Setting the tokens on `.pg-grid` (a descendant of
the container) reliably overrides the injected mode tokens, and every cell,
header, and menu inside picks them up. This is the exact mechanism the built-in
variants use.

```css
/* your-theme.css */
.brand-theme .pg-grid {
  /* Accent identity */
  --pg-colors-primary: #7c3aed;
  --pg-colors-primary-hover: #6d28d9;
  --pg-colors-primary-active: #5b21b6;

  /* Selection + focus follow the accent */
  --pg-colors-row-selected: #f5f3ff;
  --pg-colors-border-focus: #7c3aed;
  --pg-colors-checkbox-checked-background: #7c3aed;

  /* Typography + density */
  --pg-typography-font-family: 'Poppins', system-ui, sans-serif;
  --pg-sizing-header-row-height: 52px;
  --pg-borders-radius-md: 10px;
}
```

Then add the class to the element that hosts the grid:

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```html
<div class="brand-theme">
  <div id="grid" style="width:100%;height:500px;"></div>
</div>
```

```js
import "./your-theme.css";

new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import './your-theme.css';
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  return (
    <div className="brand-theme" style={{ width: '100%', height: 500 }}>
      <PhotonGrid columns={columns} dataSet={rowData} />
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
  styleUrls: ['./your-theme.css'],
  template: `
    <div class="brand-theme" style="width: 100%; height: 500px;">
      <photon-grid [columns]="columns" [dataSet]="rowData"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = columns;
  rowData = rowData;
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';
</script>

<template>
  <div class="brand-theme" style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" />
  </div>
</template>

<style>
@import './your-theme.css';
</style>
```

</TabItem>
</FrameworkTabs>

### Method 2 — Make it dark-mode aware

The active mode sets a `data-pg-mode` attribute (`light` or `dark`) on the grid
container. Scope overrides to that attribute to give your custom theme distinct
light and dark palettes:

```css
/* Shared (structure) */
.brand-theme .pg-grid {
  --pg-colors-primary: #7c3aed;
  --pg-borders-radius-md: 10px;
}

/* Light-only surfaces */
.brand-theme[data-pg-mode="light"] .pg-grid,
.brand-theme [data-pg-mode="light"].pg-grid {
  --pg-colors-background: #faf5ff;
  --pg-colors-row-hover: #f5f3ff;
}

/* Dark-only surfaces */
.brand-theme[data-pg-mode="dark"] .pg-grid,
.brand-theme [data-pg-mode="dark"].pg-grid {
  --pg-colors-background: #1a1030;
  --pg-colors-row-hover: #2a1a4a;
}
```

Combine this with `mode` / `setMode` from [Themes](./themes.md) and your custom
theme automatically follows light/dark switches.

### Method 3 — Set a single variable inline

For a one-off tweak you can set a variable directly on the container element —
inline styles have the highest priority and cascade into the grid:

```js
document.getElementById("grid").style.setProperty("--pg-colors-primary", "#e11d48");
```

## CSS variable reference

Every design token, grouped by category. Use the **CSS variable** column as the
property name in your overrides. Where the light and dark modes differ, both
defaults are shown; where they share a value (typography, spacing, sizing,
borders, transitions), a single **Default** column is shown.

### Colors — `--pg-colors-*`

| CSS variable | Purpose | Light | Dark |
|--------------|---------|-------|------|
| `--pg-colors-primary` | Accent color — sorted-header highlight, links, primary actions, focus base. | `#2563eb` | `#3b82f6` |
| `--pg-colors-primary-hover` | Accent color on hover. | `#1d4ed8` | `#60a5fa` |
| `--pg-colors-primary-active` | Accent color while pressed/active. | `#1e40af` | `#93c5fd` |
| `--pg-colors-primary-text` | Text/icon color on top of the primary accent (e.g. inside a filled checkbox). | `#ffffff` | `#ffffff` |
| `--pg-colors-secondary` | Secondary/muted accent for less prominent controls. | `#64748b` | `#94a3b8` |
| `--pg-colors-secondary-hover` | Secondary accent on hover. | `#475569` | `#cbd5e1` |
| `--pg-colors-surface` | Base surface for panels, menus, dropdowns, and dialogs. | `#ffffff` | `#1e293b` |
| `--pg-colors-surface-raised` | Slightly elevated surface (raised cards/popovers). | `#ffffff` | `#263347` |
| `--pg-colors-surface-overlay` | Surface for overlay layers above the grid. | `#ffffff` | `#1e293b` |
| `--pg-colors-surface-sunken` | Recessed surface for insets/wells. | `#f8fafc` | `#0f172a` |
| `--pg-colors-background` | Grid background behind rows and empty areas. | `#f8fafc` | `#0f172a` |
| `--pg-colors-background-alt` | Alternate background; the "chrome" tint variants use for header/footer/scrollbars. | `#f1f5f9` | `#1e293b` |
| `--pg-colors-border` | Default border and gridline color. | `#e2e8f0` | `#334155` |
| `--pg-colors-border-strong` | Stronger border for emphasis and dividers. | `#cbd5e1` | `#475569` |
| `--pg-colors-border-focus` | Border color of a focused element or cell. | `#2563eb` | `#3b82f6` |
| `--pg-colors-text-primary` | Primary text color for cell content. | `#0f172a` | `#f1f5f9` |
| `--pg-colors-text-secondary` | Secondary/muted text (subtitles, metadata). | `#475569` | `#94a3b8` |
| `--pg-colors-text-disabled` | Disabled and placeholder text. | `#94a3b8` | `#475569` |
| `--pg-colors-text-inverse` | Text color on inverted surfaces. | `#ffffff` | `#0f172a` |
| `--pg-colors-header-background` | Column header row background. | `#f8fafc` | `#1e293b` |
| `--pg-colors-header-text` | Column header text color. | `#374151` | `#cbd5e1` |
| `--pg-colors-header-border` | Border around/under header cells. | `#e2e8f0` | `#334155` |
| `--pg-colors-header-hover` | Header cell background on hover. | `#f1f5f9` | `#263347` |
| `--pg-colors-row-background` | Default data-row background. | `#ffffff` | `#0f172a` |
| `--pg-colors-row-background-alt` | Alternate (zebra) row background when row shading is on. | `#f8fafc` | `#1a2540` |
| `--pg-colors-row-hover` | Row background on hover. | `#f0f7ff` | `#1e3a5f` |
| `--pg-colors-row-selected` | Selected row background. | `#eff6ff` | `#1e3a5f` |
| `--pg-colors-row-selected-border` | Border/accent on a selected row. | `#bfdbfe` | `#3b82f6` |
| `--pg-colors-cell-edit-background` | Background of a cell in edit mode. | `#ffffff` | `#1e293b` |
| `--pg-colors-cell-edit-border` | Border of an active cell editor. | `#2563eb` | `#3b82f6` |
| `--pg-colors-selection-background` | Fill of a cell/range selection rectangle. | `rgba(37,99,235,0.08)` | `rgba(59,130,246,0.15)` |
| `--pg-colors-selection-border` | Border of a cell/range selection rectangle. | `rgba(37,99,235,0.85)` | `rgba(59,130,246,0.8)` |
| `--pg-colors-selection-corner` | Range-selection fill handle ("corner") color. | `#2563eb` | `#3b82f6` |
| `--pg-colors-footer-background` | Footer/summary/pagination bar background. | `#f8fafc` | `#1e293b` |
| `--pg-colors-footer-text` | Footer text color. | `#374151` | `#94a3b8` |
| `--pg-colors-footer-border` | Footer top border. | `#e2e8f0` | `#334155` |
| `--pg-colors-pinned-background` | Background of pinned (frozen) columns. | `#ffffff` | `#0f172a` |
| `--pg-colors-pinned-shadow` | Shadow cast by pinned columns against the scrolling area. | `4px 0 6px -2px rgba(15,23,42,0.08)` | `4px 0 6px -2px rgba(0,0,0,0.4)` |
| `--pg-colors-filter-background` | Filter row / filter input background. | `#f8fafc` | `#1e293b` |
| `--pg-colors-filter-border` | Filter row / input border. | `#e2e8f0` | `#334155` |
| `--pg-colors-filter-active-background` | Background when a column filter is active. | `#eff6ff` | `#1e3a5f` |
| `--pg-colors-filter-active-border` | Border when a column filter is active. | `#93c5fd` | `#3b82f6` |
| `--pg-colors-scrollbar-track` | Custom scrollbar track color. | `#f1f5f9` | `#1e293b` |
| `--pg-colors-scrollbar-thumb` | Custom scrollbar thumb color. | `#cbd5e1` | `#475569` |
| `--pg-colors-scrollbar-thumb-hover` | Scrollbar thumb color on hover. | `#94a3b8` | `#64748b` |
| `--pg-colors-resize-handle-color` | Column resize handle color (idle). | `#e2e8f0` | `#334155` |
| `--pg-colors-resize-handle-active-color` | Column resize handle color while dragging. | `#2563eb` | `#3b82f6` |
| `--pg-colors-drag-preview-background` | Background of the drag-preview chip (column/row drag). | `#ffffff` | `#1e293b` |
| `--pg-colors-drag-preview-border` | Border of the drag-preview chip. | `#e2e8f0` | `#475569` |
| `--pg-colors-drag-over-highlight` | Highlight over a valid drop target while dragging. | `rgba(37,99,235,0.06)` | `rgba(59,130,246,0.1)` |
| `--pg-colors-checkbox-background` | Unchecked checkbox background. | `#ffffff` | `#1e293b` |
| `--pg-colors-checkbox-checked-background` | Checked checkbox background (usually the accent). | `#2563eb` | `#3b82f6` |
| `--pg-colors-checkbox-border` | Checkbox border. | `#cbd5e1` | `#475569` |
| `--pg-colors-badge-background` | Badge/tag/chip background (dropdown & array cells). | `#eff6ff` | `#1e3a5f` |
| `--pg-colors-badge-text` | Badge/tag/chip text color. | `#1d4ed8` | `#93c5fd` |
| `--pg-colors-group-row-background` | Group (aggregate) row background. | `#f8fafc` | `#1e293b` |
| `--pg-colors-group-row-border` | Group row border. | `#e2e8f0` | `#334155` |
| `--pg-colors-tooltip-background` | Tooltip background. | `#1e293b` | `#f1f5f9` |
| `--pg-colors-tooltip-text` | Tooltip text color. | `#f1f5f9` | `#0f172a` |
| `--pg-colors-success` | Success/positive semantic color. | `#16a34a` | `#22c55e` |
| `--pg-colors-warning` | Warning/caution semantic color. | `#d97706` | `#f59e0b` |
| `--pg-colors-error` | Error/danger semantic color. | `#dc2626` | `#ef4444` |
| `--pg-colors-info` | Informational semantic color. | `#0284c7` | `#38bdf8` |
| `--pg-colors-success-light` | Subtle success background tint. | `#dcfce7` | `#052e16` |
| `--pg-colors-warning-light` | Subtle warning background tint. | `#fef3c7` | `#1c1007` |
| `--pg-colors-error-light` | Subtle error background tint. | `#fee2e2` | `#1f0909` |
| `--pg-colors-info-light` | Subtle info background tint. | `#e0f2fe` | `#082f49` |

### Typography — `--pg-typography-*`

Shared across light and dark modes.

| CSS variable | Purpose | Default |
|--------------|---------|---------|
| `--pg-typography-font-family` | Base UI and cell font family. | `'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif` |
| `--pg-typography-font-family-mono` | Monospace font family (numeric/code cells). | `'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace` |
| `--pg-typography-font-size-xs` | Extra-small font size (badges, metadata). | `11px` |
| `--pg-typography-font-size-sm` | Small font size (secondary text, filter inputs). | `12px` |
| `--pg-typography-font-size-md` | Medium/base font size (cell text). | `13px` |
| `--pg-typography-font-size-lg` | Large font size (emphasis). | `14px` |
| `--pg-typography-font-size-xl` | Extra-large font size (titles). | `16px` |
| `--pg-typography-font-weight-regular` | Regular font weight. | `400` |
| `--pg-typography-font-weight-medium` | Medium font weight. | `500` |
| `--pg-typography-font-weight-semi-bold` | Semi-bold font weight (headers). | `600` |
| `--pg-typography-font-weight-bold` | Bold font weight. | `700` |
| `--pg-typography-line-height-tight` | Tight line height (single-line cells). | `1.2` |
| `--pg-typography-line-height-base` | Base line height. | `1.5` |
| `--pg-typography-line-height-relaxed` | Relaxed line height (multi-line content). | `1.75` |
| `--pg-typography-letter-spacing-tight` | Tight letter spacing (large text). | `-0.01em` |
| `--pg-typography-letter-spacing-base` | Default letter spacing. | `0` |
| `--pg-typography-letter-spacing-wide` | Wide letter spacing (uppercase labels). | `0.025em` |

### Spacing — `--pg-spacing-*`

The spacing scale used for paddings and gaps. Shared across modes.

| CSS variable | Purpose | Default |
|--------------|---------|---------|
| `--pg-spacing-xs` | Extra-small spacing unit (tight paddings/gaps). | `4px` |
| `--pg-spacing-sm` | Small spacing. | `8px` |
| `--pg-spacing-md` | Medium spacing (default cell padding). | `12px` |
| `--pg-spacing-lg` | Large spacing. | `16px` |
| `--pg-spacing-xl` | Extra-large spacing. | `24px` |
| `--pg-spacing-xxl` | Double extra-large spacing. | `32px` |

### Sizing — `--pg-sizing-*`

Structural dimensions. Shared across modes.

| CSS variable | Purpose | Default |
|--------------|---------|---------|
| `--pg-sizing-row-height-sm` | Compact row-height preset. | `36px` |
| `--pg-sizing-row-height-md` | Comfortable row-height preset. | `48px` |
| `--pg-sizing-row-height-lg` | Spacious row-height preset. | `60px` |
| `--pg-sizing-header-row-height` | Default header row height. | `42px` |
| `--pg-sizing-footer-row-height` | Footer/summary row height. | `44px` |
| `--pg-sizing-filter-row-height` | Filter row height. | `36px` |
| `--pg-sizing-scrollbar-width` | Custom scrollbar thickness. | `8px` |
| `--pg-sizing-resize-handle-width` | Column resize-handle hit-area width. | `4px` |
| `--pg-sizing-column-min-width` | Minimum column width floor. | `40px` |
| `--pg-sizing-checkbox-size` | Checkbox width and height. | `16px` |
| `--pg-sizing-icon-size-sm` | Small icon size. | `14px` |
| `--pg-sizing-icon-size-md` | Medium icon size. | `16px` |
| `--pg-sizing-icon-size-lg` | Large icon size. | `20px` |

### Borders — `--pg-borders-*`

Corner radii, widths, and style. Shared across modes.

| CSS variable | Purpose | Default |
|--------------|---------|---------|
| `--pg-borders-radius-sm` | Small corner radius (inputs, cells). | `4px` |
| `--pg-borders-radius-md` | Medium corner radius (panels, menus). | `6px` |
| `--pg-borders-radius-lg` | Large corner radius (dialogs). | `8px` |
| `--pg-borders-radius-pill` | Pill / fully-rounded radius (badges, toggles). | `9999px` |
| `--pg-borders-width-thin` | Thin border width (hairline gridlines). | `1px` |
| `--pg-borders-width-base` | Base/default border width. | `1px` |
| `--pg-borders-width-thick` | Thick border width (emphasis, focus). | `2px` |
| `--pg-borders-style-base` | Base border style. | `solid` |

### Shadows — `--pg-shadows-*`

Elevation shadows. Values differ between light and dark for correct contrast.

| CSS variable | Purpose | Light | Dark |
|--------------|---------|-------|------|
| `--pg-shadows-none` | No shadow. | `none` | `none` |
| `--pg-shadows-xs` | Extra-small elevation. | `0 1px 2px rgba(15,23,42,0.05)` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--pg-shadows-sm` | Small elevation. | `0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)` | `0 1px 3px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25)` |
| `--pg-shadows-md` | Medium elevation (dropdowns/popovers). | `0 4px 6px -1px rgba(15,23,42,0.08), 0 2px 4px -2px rgba(15,23,42,0.05)` | `0 4px 6px -1px rgba(0,0,0,0.35), 0 2px 4px -2px rgba(0,0,0,0.25)` |
| `--pg-shadows-lg` | Large elevation (dialogs). | `0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.05)` | `0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.3)` |
| `--pg-shadows-pinned-left` | Shadow cast by left-pinned columns. | `4px 0 8px -2px rgba(15,23,42,0.10)` | `4px 0 8px -2px rgba(0,0,0,0.4)` |
| `--pg-shadows-pinned-right` | Shadow cast by right-pinned columns. | `-4px 0 8px -2px rgba(15,23,42,0.10)` | `-4px 0 8px -2px rgba(0,0,0,0.4)` |
| `--pg-shadows-dropdown` | Shadow for dropdown/menu overlays. | `0 8px 24px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.08)` | `0 8px 24px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)` |
| `--pg-shadows-tooltip` | Shadow for tooltips. | `0 4px 12px rgba(15,23,42,0.15)` | `0 4px 12px rgba(0,0,0,0.5)` |
| `--pg-shadows-drag-preview` | Shadow for the drag-preview chip. | `0 8px 24px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.10)` | `0 8px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.35)` |

### Transitions — `--pg-transitions-*`

Animation durations and easing curves. Shared across modes.

| CSS variable | Purpose | Default |
|--------------|---------|---------|
| `--pg-transitions-duration-fast` | Fast transition duration (hovers). | `100ms` |
| `--pg-transitions-duration-base` | Base transition duration. | `150ms` |
| `--pg-transitions-duration-slow` | Slow transition duration (expand/collapse). | `250ms` |
| `--pg-transitions-easing-base` | Standard easing curve. | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--pg-transitions-easing-decelerate` | Decelerate (ease-out) curve for entrances. | `cubic-bezier(0, 0, 0.2, 1)` |
| `--pg-transitions-easing-accelerate` | Accelerate (ease-in) curve for exits. | `cubic-bezier(0.4, 0, 1, 1)` |

## Complete example — a custom brand theme

Putting it together: an accent recolor, custom font, denser radii, and separate
light/dark surfaces.

```css
/* brand-theme.css */
.brand-theme .pg-grid {
  --pg-colors-primary: #7c3aed;
  --pg-colors-primary-hover: #6d28d9;
  --pg-colors-primary-active: #5b21b6;
  --pg-colors-border-focus: #7c3aed;
  --pg-colors-row-selected-border: #c4b5fd;
  --pg-colors-checkbox-checked-background: #7c3aed;
  --pg-colors-badge-background: #f5f3ff;
  --pg-colors-badge-text: #6d28d9;

  --pg-typography-font-family: 'Poppins', system-ui, sans-serif;
  --pg-typography-font-weight-semi-bold: 600;

  --pg-sizing-header-row-height: 52px;
  --pg-sizing-row-height-md: 46px;
  --pg-borders-radius-md: 10px;
  --pg-borders-radius-sm: 6px;
}

.brand-theme[data-pg-mode="light"] .pg-grid {
  --pg-colors-background: #faf5ff;
  --pg-colors-row-hover: #f5f3ff;
  --pg-colors-row-selected: #f5f3ff;
}

.brand-theme[data-pg-mode="dark"] .pg-grid {
  --pg-colors-background: #17111f;
  --pg-colors-surface: #201830;
  --pg-colors-row-hover: #2a1f45;
  --pg-colors-row-selected: #2a1f45;
}
```

```js
import "./brand-theme.css";

// Wrap the grid mount point in <div class="brand-theme"> and the tokens apply.
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  mode: "light" // switch with grid.api.setMode('dark') — the theme follows
});
```

## Next steps

- [Themes](./themes.md) — built-in modes, variants, and runtime switching.
- [Configuration options](../getting-started/configuration-options.md) — every `GridOptions` field.
