---
sidebar_position: 11
title: "Columns State"
description: "Save and restore column layout in Photon Grid, the JavaScript data grid, with getColumnStates, applyColumnStates, resetColumnState, and getGridState for full persistence."
keywords: [photon grid, javascript data grid, column state, save column layout, applyColumnStates, grid state]
---

# Columns State

Column state captures a column's layout — width, order, visibility, and pinning — so you can save it and restore it later. Photon Grid exposes `getColumnStates`, `applyColumnStates`, and `resetColumnState`, plus whole-grid `getGridState` and `applyGridState`, letting you persist a user's preferred layout across sessions in the JavaScript data grid.

## Overview

As users resize, reorder, hide, and pin columns, the grid tracks that arrangement as **column state**. You can read it into a plain object, store it anywhere (a variable, `localStorage`, a backend), and apply it back later to recreate the exact layout. For a broader snapshot that includes more than columns, use the grid-level state APIs.

## Saving column state

`getColumnStates()` returns a serializable snapshot of the current column layout:

```js
let savedState = null;

function saveLayout() {
  savedState = grid.api.getColumnStates();
}
```

Persist `savedState` however you like — it is plain data.

## Restoring column state

`applyColumnStates(state)` reapplies a saved snapshot, restoring widths, order, visibility, and pinning in one call:

```js
function restoreLayout() {
  if (savedState) {
    grid.api.applyColumnStates(savedState);
  }
}
```

## Resetting to defaults

`resetColumnState()` discards any user changes and returns columns to the layout defined in your `columns` array:

```js
grid.api.resetColumnState();
```

## Saving the whole grid state

When you want to persist more than columns, `getGridState()` returns a wider snapshot and `applyGridState(state)` restores it:

```js
const fullState = grid.api.getGridState();
// ...later...
grid.api.applyGridState(fullState);
```

## Responding to state changes

Subscribe to `column:stateChanged` to react whenever the column layout changes — a good hook for auto-saving:

```js
grid.api.on("column:stateChanged", () => {
  savedState = grid.api.getColumnStates();
});
```

## Live Example

<iframe
  src="/examples/columns-state/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Method / Event | Type | Description |
| --- | --- | --- |
| `getColumnStates()` | `method` | Returns a snapshot of the current column layout. |
| `applyColumnStates(state)` | `method` | Restores a saved column layout. |
| `resetColumnState()` | `method` | Resets columns to their defined defaults. |
| `getGridState()` | `method` | Returns a wider grid state snapshot. |
| `applyGridState(state)` | `method` | Restores a saved grid state. |
| `column:stateChanged` | `event` | Fires when the column layout changes. |

## Related

- [Columns Moving](/docs/columns/column-moving)
- [Columns Pinning](/docs/columns/column-freezing)
- [Columns Resizing](/docs/columns/column-widths)
- [Columns Choosing](/docs/columns/column-hiding)
