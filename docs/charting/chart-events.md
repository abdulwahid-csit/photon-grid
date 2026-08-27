---
sidebar_position: 5
title: "Chart Events"
description: "Subscribe to Photon Grid chart events: chart:created, chart:destroyed, chart:rangeSelectionChanged, and chart:optionsChanged with api.on in a data grid."
keywords: [photon grid, javascript data grid, chart events, chart:created, chart:optionsChanged, api.on]
---

# Chart Events

Photon Grid emits **chart events** across the chart lifecycle so your application can react as charts are created, changed, and removed. You subscribe with `api.on(eventType, handler)` and unsubscribe with `api.off(eventType, handlerId)`.

## Overview

There are four chart events. Together they let you keep your UI, application state, or persistence layer in sync with what the grid's charts are doing:

| Event | Fired when |
| --- | --- |
| `chart:created` | A chart is created (via `createRangeChart` or `createChart`). |
| `chart:destroyed` | A chart is removed (via `destroyChart`). |
| `chart:rangeSelectionChanged` | The cell range backing a chart changes. |
| `chart:optionsChanged` | A chart's options change (for example after `updateChart`). |

Event names are the string values shown above. You can also use the `PhotonGrid.GridEventType` enum constants if you prefer named references.

## Subscribing to chart events

Register handlers with `api.on`. You can subscribe to each event individually or loop over the set and log them to a panel.

```js
const api = grid.api;

const chartEvents = [
  "chart:created",
  "chart:destroyed",
  "chart:rangeSelectionChanged",
  "chart:optionsChanged"
];

chartEvents.forEach((eventName) => {
  api.on(eventName, (event) => {
    console.log(eventName, event);
  });
});
```

`api.on` returns a handler id you can pass to `api.off(eventType, handlerId)` to stop listening — useful when tearing down a view.

## Live Example

The example below wires the toolbar to the chart API and logs every chart event to the panel as it fires.

<iframe
  src="/examples/chart-events/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Method / Event | Type | Description |
| --- | --- | --- |
| `api.on(eventType, handler)` | Method | Subscribe to an event; returns a handler id. |
| `api.off(eventType, handlerId)` | Method | Unsubscribe a previously registered handler. |
| `chart:created` | Event | Fired when a chart is created. |
| `chart:destroyed` | Event | Fired when a chart is destroyed. |
| `chart:rangeSelectionChanged` | Event | Fired when a chart's source range changes. |
| `chart:optionsChanged` | Event | Fired when a chart's options change. |

## Related

- [Integrated Charting Overview](/docs/charting/overview)
- [Range Charts](/docs/charting/range-charts)
- [Chart Tool Pannel](/docs/charting/chart-tool-panel)
- [Saving Charts](/docs/charting/saving-charts)
