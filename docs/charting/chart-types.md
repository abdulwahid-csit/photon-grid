---
sidebar_position: 3
title: "Chart Types"
description: "Create column, bar, line, area, and pie charts from grid ranges with Photon Grid integrated charting. Pick a chart type per range in your JS data grid."
keywords: [photon grid, javascript data grid, chart types, column chart, line chart, pie chart]
---

# Chart Types

Photon Grid's integrated charting can render your data as several **chart types** — column, bar, line, area, and pie. You choose the type when you create the chart from a selected range, and you can switch it later with `updateChart`.

## Overview

The chart type controls how a range is visualized. The same selection can be shown as vertical columns, horizontal bars, a trend line, a filled area, or a proportional pie. Choosing the right type depends on the story you want to tell:

| Chart type | Best for |
| --- | --- |
| Column | Comparing a value across categories (vertical bars). |
| Bar | Comparing categories when labels are long (horizontal bars). |
| Line | Showing a trend or change across an ordered dimension. |
| Area | Emphasizing magnitude of a trend over a baseline. |
| Pie | Showing parts of a whole as proportions. |

The type is passed to `createRangeChart` (or `createChart`) at creation time. The `chartType` values shown here are illustrative labels for the common types — use the identifiers your build documents.

## Creating a typed chart

Select a range, then create the chart with the type you want. Keep the config minimal and wrap the call so a missing selection cannot crash the page.

```js
const api = grid.api;

function createTypedChart(chartType) {
  try {
    api.createRangeChart({
      chartType,
      chartContainer: document.getElementById("chart")
    });
  } catch (err) {
    console.warn("Select a range first:", err.message);
  }
}

document.getElementById("column").addEventListener("click", () => createTypedChart("column"));
document.getElementById("line").addEventListener("click", () => createTypedChart("line"));
document.getElementById("pie").addEventListener("click", () => createTypedChart("pie"));
```

To change the type of an existing chart without recreating it, call `updateChart(id, { chartType })`. See [Chart Tool Pannel](/docs/charting/chart-tool-panel) for updating chart settings.

## Live Example

<iframe
  src="/examples/chart-types/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Method | Type | Description |
| --- | --- | --- |
| `api.createRangeChart(config)` | Method | Create a chart from the selected range; pass the desired `chartType`. |
| `api.createChart(config)` | Method | Create a chart programmatically with a given type. |
| `api.updateChart(id, options)` | Method | Change an existing chart's type or options. |

## Related

- [Integrated Charting Overview](/docs/charting/overview)
- [Range Charts](/docs/charting/range-charts)
- [Chart Tool Pannel](/docs/charting/chart-tool-panel)
- [Chart Events](/docs/charting/chart-events)
