---
title: "Row Heights"
description: "Control row height in Photon Grid — set a fixed height, auto-size rows to their content, vary height per row with a callback, and tune header, footer, and filter row heights. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid row height
  - data grid row height
  - auto row height
  - dynamic row height
  - variable row height
  - rowHeightFn
  - header footer row height
---

# Row Heights

Photon Grid gives you full control over row height: a single fixed height for all
rows, automatic sizing to fit content, or a per-row height computed from the
row's data. Header, footer, and filter rows are sized independently.

## Fixed row height

Set `rowHeight` (in pixels) for a uniform height across all data rows. This is
the default mode and the most performant.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  rowHeight: 56
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid columns={columns} dataSet={rowData} options={{ rowHeight: 56 }} />
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
  options = { rowHeight: 56 };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = { rowHeight: 56 };
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

<LiveGrid preset="quickStart" height={340} options={{rowHeight: 56}} title="rowHeight: 56 — taller, roomier rows" />

## Auto height (fit content)

Set `rowHeightMode: 'auto'` to let each row grow to fit its content — useful for
wrapping text or multi-line cells.

```js
new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  rowHeightMode: "auto"   // rows size themselves to their content
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rowHeight` | `number` | `42` | Fixed height of a data row, in pixels. |
| `rowHeightMode` | `'fixed' \| 'auto'` | `'fixed'` | Use a fixed `rowHeight`, or auto-size each row to its content. |

## Per-row height with a callback

Return a custom height per row from `rowHeightFn`. The function receives the row
data and returns a pixel height — ideal when only some rows need extra space.

```js
new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  // Give "expanded" rows more room; everyone else gets the default.
  rowHeightFn: (row) => (row.expanded ? 96 : 44)
});
```

| Option | Type | Description |
|--------|------|-------------|
| `rowHeightFn` | `(row) => number` | Returns a pixel height for the given row. Overrides `rowHeight` for that row. |

## Header, footer, and filter row heights

Chrome rows are sized independently of data rows:

| Option | Type | Description |
|--------|------|-------------|
| `headerRowHeight` | `number` | Height of the column header row. |
| `footerRowHeight` | `number` | Height of the footer / summary row. |
| `filterRowHeight` | `number` | Height of the inline filter row. |

```js
new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  rowHeight: 44,
  headerRowHeight: 52,
  footerRowHeight: 44,
  filterRowHeight: 40
});
```

## Density presets

Photon Grid ships with row-height design tokens you can reference from a
[custom theme](../styling/theme-customization.md): `--pg-sizing-row-height-sm`
(36px), `--pg-sizing-row-height-md` (48px), and `--pg-sizing-row-height-lg`
(60px). [Variants](../styling/themes.md#cosmetic-variants) such as Balham use the
compact preset for information-dense views.

## Next steps

- [Row Virtualization](./row-virtualization.md) — how dynamic heights interact with virtualization.
- [Theme Customization](../styling/theme-customization.md) — row-height sizing tokens.
- [Configuration options](../getting-started/configuration-options.md#appearance--layout).
