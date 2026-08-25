---
title: "Themes"
description: "Theme Photon Grid with two axes — color mode (light/dark) and cosmetic variant (Quartz, Alpine, Balham, Material). Set them in GridOptions or switch at runtime via the grid API."
keywords:
  - photon grid theme
  - data grid dark mode
  - light and dark theme
  - grid theme variant
  - quartz alpine balham material
  - change theme grid options
  - setMode setVariant
  - javascript data grid theming
---

# Themes

Photon Grid theming is built on **two independent axes**. You can change either
one without touching the other, and every combination is valid:

| Axis | Option | Values | What it controls |
|------|--------|--------|------------------|
| **Mode** | `mode` | `light` · `dark` | The full color palette — surfaces, text, borders, rows, scrollbars. Every grid resolves to exactly one mode. |
| **Variant** | `variant` | `quartz` · `alpine` · `balham` · `material` *(or none)* | A cosmetic skin layered on top of the mode — density, border radii, typography, checkbox shape, motion, and accent color. |

Because a **variant only overrides structural and accent concerns** — the base
surface and text colors always come from the active mode — every variant renders
correctly in both light and dark. Pick a mode for the palette, optionally add a
variant for the look, and the two compose automatically.

## Set the theme in grid options

Set `mode` and (optionally) `variant` when you create the grid.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  mode: "dark",       // "light" | "dark"
  variant: "quartz"   // "quartz" | "alpine" | "balham" | "material" (optional)
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
          mode: 'dark',       // 'light' | 'dark'
          variant: 'quartz',  // 'quartz' | 'alpine' | 'balham' | 'material'
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
    mode: 'dark',       // 'light' | 'dark'
    variant: 'quartz',  // 'quartz' | 'alpine' | 'balham' | 'material'
  };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = {
  mode: 'dark',       // 'light' | 'dark'
  variant: 'quartz',  // 'quartz' | 'alpine' | 'balham' | 'material'
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

## Color modes

The `mode` option drives the entire palette. It is the primary theming axis, and
defaults to `light`.

| Mode | Description |
|------|-------------|
| `light` | Default. Bright surfaces, dark text — tuned for well-lit environments. |
| `dark` | Dark surfaces, light text — reduces glare and pairs with app-wide dark themes. |

Under the hood, each mode is a set of **design tokens** injected as CSS custom
properties (`--pg-*`) scoped to the grid container, and mirrored onto `:root` so
portaled UI (menus, dropdowns, overlays) inherits the same palette. See
[Theme Customization](./theme-customization.md) for the full token reference.

## Cosmetic variants

A `variant` is an optional skin. Omit it for the plain mode look, or pick one of
the four built-ins:

| Variant | Class applied | Character |
|---------|---------------|-----------|
| `quartz` | `pg-quartz-theme` | Clean and modern, flat "chrome" surfaces, blue accent. |
| `alpine` | `pg-alpine-theme` | Crisp and functional with a balanced density. |
| `balham` | `pg-balham-theme` | Compact and information-dense for data-heavy views. |
| `material` | `pg-material-theme` | Material-inspired elevation and accents, with a roomier density. |

Setting `variant` adds the corresponding `pg-<variant>-theme` class to the grid
container. Because variants override only structural/accent tokens, they inherit
the active mode's colors — so `variant: 'quartz'` looks correct whether `mode` is
`light` or `dark`.

<LiveGrid preset="quickStart" options={{variant: 'quartz'}} height={320} title="variant: 'quartz' — follows this page's light/dark theme" />

## Change the theme at runtime

The grid API exposes methods to switch either axis after creation without
rebuilding the grid. Reach the API via the `GridCore` instance (`grid.api`) in
Vanilla JS, or the `onReady` option in the framework wrappers.

| Method | Description |
|--------|-------------|
| `setMode(mode)` | Set the color mode (`'light'` / `'dark'`). Preserves the active variant. |
| `setVariant(variant)` | Set the cosmetic variant, or clear it with `'none'`. Preserves the active mode. |
| `toggleDarkMode()` | Flip between light and dark, keeping the active variant. |

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData
});

grid.api.setMode("dark");        // switch palette to dark
grid.api.setVariant("material"); // apply the Material variant
grid.api.toggleDarkMode();       // flip light <-> dark
grid.api.setVariant("none");     // remove the variant skin
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  let api: any;

  return (
    <>
      <button onClick={() => api?.toggleDarkMode()}>Toggle dark mode</button>
      <div style={{ width: '100%', height: 500 }}>
        <PhotonGrid
          columns={columns}
          dataSet={rowData}
          options={{ onReady: (gridApi) => { api = gridApi; } }}
        />
      </div>
    </>
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
    <button (click)="toggle()">Toggle dark mode</button>
    <div style="width: 100%; height: 500px;">
      <photon-grid [columns]="columns" [dataSet]="rowData" [options]="options"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  private api: any;
  columns = columns;
  rowData = rowData;
  options = { onReady: (gridApi: any) => (this.api = gridApi) };

  toggle() {
    this.api?.toggleDarkMode();
  }
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

let api: any;
const options = { onReady: (gridApi: any) => { api = gridApi; } };
const toggle = () => api?.toggleDarkMode();
</script>

<template>
  <button @click="toggle">Toggle dark mode</button>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Match your app's dark mode

To keep the grid in sync with your application's or the operating system's color
scheme, call `setMode` whenever that scheme changes — for example from a
`prefers-color-scheme` media query:

```js
const grid = new PhotonGrid.GridCore(el, { columns, data: rowData });

const mql = window.matchMedia("(prefers-color-scheme: dark)");
const sync = () => grid.api.setMode(mql.matches ? "dark" : "light");

sync();                            // set the initial mode
mql.addEventListener("change", sync); // follow OS changes
```

## Legacy `theme` option

:::warning Deprecated
The single `theme` string option is deprecated. Prefer the `mode` + `variant`
axes above.
:::

For backward compatibility, a legacy `theme` value (and the deprecated
`api.setTheme(name)` method) is still accepted and mapped onto the two axes —
`'dark'` → `mode: 'dark'`, `'quartz'` → `variant: 'quartz'`, `'quartz-dark'` →
`variant: 'quartz'` + `mode: 'dark'`, and the historical `'pg-quartz-theme'`
class name is understood too. New code should set `mode` and `variant` directly.

## Next steps

- [Theme Customization](./theme-customization.md) — create your own theme and the complete CSS variable reference.
- [Configuration options](../getting-started/configuration-options.md) — every `GridOptions` field.
