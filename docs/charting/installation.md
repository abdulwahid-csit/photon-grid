---
sidebar_position: 2
title: "Integrated Charting Installation"
description: "Enable integrated charts in Photon Grid. They ship in the CDN build under PhotonGrid and turn on with the chart grid option, no extra dependencies needed."
keywords: [photon grid, javascript data grid, integrated charts installation, chart option, cdn build, enable charts]
---

# Installing Integrated Charts

Integrated charts are **bundled into the Photon Grid CDN build** — there is no separate charting package to install. Once the grid script is on the page, you turn charting on with the `chart` grid option and start calling the chart API on `grid.api`.

## Overview

Everything you need for integrated charting lives inside the single UMD bundle exposed as the `PhotonGrid` global. The chart engine is part of that bundle, so you do not add another `<script>` tag or npm dependency. You opt in per grid instance with the `chart` option, then create charts through `grid.api`.

## Add the CDN script

Include the Photon Grid bundle. This is the same script used everywhere else in these docs.

```html
<script src="https://cdn.jsdelivr.net/npm/photon-grid-core@latest/photon-grid.min.js"></script>
```

## Enable the chart option

Pass the `chart` option when constructing the grid to enable integrated charting. The object shape is illustrative — an empty object is enough to switch the feature on; add the keys your build documents as needed.

```js
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  selection: { mode: "multiple" },
  chart: {} // enable integrated charts
});

const api = grid.api;

document.getElementById("create").addEventListener("click", () => {
  try {
    api.createRangeChart({
      chartType: "column",
      chartContainer: document.getElementById("chart")
    });
  } catch (err) {
    console.warn(err.message);
  }
});
```

With `chart` enabled and cell selection on, users can highlight a range and you can chart it with a single API call.

## Live Example

<iframe
  src="/examples/charts-installation/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `chart` | `object` | Grid option that enables integrated charting for the grid instance. |
| `selection` | `object` | Selection config (`mode: "single"` or `"multiple"`); enable to let users pick a range to chart. |
| `api.createRangeChart(config)` | Method | Create a chart from the selected cell range. |
| `api.createChart(config)` | Method | Create a chart programmatically. |

## Related

- [Integrated Charting Overview](/docs/charting/overview)
- [Chart Types](/docs/charting/chart-types)
- [Range Charts](/docs/charting/range-charts)
- [Sparklines Installation](/docs/sparklines/installation)
- [Quick Start](/docs/more-photon-features/quick-start)
