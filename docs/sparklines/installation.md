---
sidebar_position: 2
title: "Sparklines Installation"
description: "Enable Photon Grid sparklines with no extra dependencies. They ship in the CDN build under PhotonGrid and turn on with the sparkline grid option here."
keywords: [photon grid, javascript data grid, sparklines installation, sparkline option, cdn build, in-cell charts]
---

# Installing Sparklines

Sparklines are **included in the Photon Grid CDN build** — there is nothing extra to install. Once the grid script is on the page, you enable in-cell sparklines with the `sparkline` grid option.

## Overview

The sparkline renderer is part of the single `PhotonGrid` bundle, so you do not add another script tag or npm package. You opt in per grid instance with the `sparkline` option, the same way integrated charts are enabled with the `chart` option.

## Add the CDN script

Include the standard Photon Grid bundle.

```html
<script src="https://cdn.jsdelivr.net/npm/photon-grid-core@latest/photon-grid.min.js"></script>
```

## Enable the sparkline option

Pass the `sparkline` option to the grid constructor. The object shown is an illustrative placeholder that references the confirmed option; add documented keys to bind a series and choose a style.

```js
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  headerRowHeight: 48,
  rowHeight: 42,
  sparkline: {} // included in the CDN build; enable it here
});
```

That is all that is required — with the option set, the bundled sparkline renderer is active for the grid.

## Live Example

<iframe
  src="/examples/sparklines-installation/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option | Type | Description |
| --- | --- | --- |
| `sparkline` | `object` | Grid option that enables in-cell sparkline mini charts. |
| `rowHeight` | `number` | Row height; increase to give sparklines room to render. |

## Related

- [Sparklines Overview](/docs/sparklines/overview)
- [Integrated Charting Installation](/docs/charting/installation)
- [Quick Start](/docs/more-photon-features/quick-start)
