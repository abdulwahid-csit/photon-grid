---
title: "Column Types"
description: "Every Photon Grid column data type explained with example data and configuration — string, number, boolean, date, time, dropdown, object, array, image, currency, percentage, email, sparkline, and custom."
keywords:
  - photon grid column type
  - data grid column data types
  - dropdown column
  - currency percentage column
  - date time column
  - image array column
  - sparkline column
  - custom cell type
---

# Column Types

A column's `type` tells Photon Grid how to **render**, **format**, and **edit**
its cells. Set it per column in the column definition:

```js
{ field: "salary", header: "Salary", type: "currency" }
```

If omitted, `type` defaults to `"string"`. This page covers all fourteen built-in
types with example data and configuration for each.

## Overview

| Type | Renders as | Typical value |
|------|-----------|---------------|
| [`string`](#string) | Plain text | `"John Smith"` |
| [`number`](#number) | Locale-formatted number | `85000` |
| [`boolean`](#boolean) | Check-mark icon | `true` |
| [`date`](#date) | Formatted date | `"2024-03-14"` |
| [`time`](#time) | Formatted time | `"14:30"` |
| [`dropdown`](#dropdown) | Colored badge from options | `"active"` |
| [`object`](#object) | Badge resolved via a key | `{ id: 2, name: "Sarah" }` |
| [`array`](#array) | Tag badges (up to 3 shown) | `["react", "node"]` |
| [`image`](#image) | `<img>` thumbnail | `"https://…/a.png"` |
| [`currency`](#currency) | Currency-formatted number | `1299.5` |
| [`percentage`](#percentage) | Percentage-formatted number | `0.42` |
| [`email`](#email) | Plain email text | `"a@b.com"` |
| [`sparkline`](#sparkline) | Mini inline chart | `[3, 5, 8, 6, 9]` |
| [`custom`](#custom) | Your `renderer.display` | anything |

## string

Plain text. The default type — use it for names, labels, and free text.

```js
const columns = [
  { field: "name", header: "Name", type: "string" },
  { field: "city", header: "City" } // type defaults to "string"
];

const rowData = [
  { name: "John Smith", city: "Berlin" },
  { name: "Sarah Johnson", city: "Toronto" }
];
```

## number

Locale-formatted numbers, right-aligned by convention. Supports `min` / `max`
when editable.

```js
const columns = [
  { field: "units", header: "Units", type: "number", textAlign: "right" },
  { field: "rating", header: "Rating", type: "number", editable: true, min: 0, max: 5 }
];

const rowData = [
  { units: 1250, rating: 4 },
  { units: 98,   rating: 5 }
];
```

## boolean

Renders a check-mark for truthy values. As an editable column it becomes a toggle.

```js
const columns = [
  { field: "active", header: "Active", type: "boolean", editable: true }
];

const rowData = [
  { active: true },
  { active: false }
];
```

## date

Formatted date strings. Control the format with `dateFormat` on the column (or
`dateFormat` at the grid level).

```js
const columns = [
  { field: "joined", header: "Joined", type: "date", dateFormat: "DD MMM YYYY" }
];

const rowData = [
  { joined: "2021-03-14" },
  { joined: "2019-11-02" }
];
```

## time

Formatted time values.

```js
const columns = [
  { field: "start", header: "Shift Start", type: "time" }
];

const rowData = [
  { start: "09:00" },
  { start: "14:30" }
];
```

## dropdown

A value chosen from a fixed option set. Each option can carry a `color`, `icon`,
or `image`, and the cell renders as a colored badge. Perfect for statuses,
categories, and priorities.

```js
const columns = [
  {
    field: "status", header: "Status", type: "dropdown", editable: true,
    dropdownOptions: [
      { value: "active",   label: "Active",   color: "#16a34a" },
      { value: "pending",  label: "Pending",  color: "#d97706" },
      { value: "archived", label: "Archived", color: "#64748b" }
    ]
  }
];

const rowData = [
  { status: "active" },
  { status: "pending" },
  { status: "archived" }
];
```

`ColumnDropdownOption` shape:

| Property | Type | Description |
|----------|------|-------------|
| `value` | `string \| number` | Stored value (unique within the list). |
| `label` | `string` | Display label shown in the cell and dropdown. |
| `color` | `string` | Optional badge tint (hex/CSS color). |
| `icon` | `string` | Optional inline SVG/HTML rendered before the label. |
| `image` | `string` | Optional image URL/data-URI before the label (wins over `icon`). |

A simple string list is also supported via `enumOptions`:

```js
{ field: "priority", header: "Priority", type: "dropdown",
  enumOptions: ["Low", "Medium", "High", "Critical"] }
```

## object

For cells whose value is an object. The `objectValueKey` names the property used
to match against `dropdownOptions[].value` (defaults to `"value"`), so the object
renders as a badge/label.

```js
const columns = [
  {
    field: "owner", header: "Owner", type: "object",
    objectValueKey: "id",
    dropdownOptions: [
      { value: 1, label: "John Smith",   color: "#2563eb" },
      { value: 2, label: "Sarah Johnson", color: "#7c3aed" }
    ]
  }
];

const rowData = [
  { owner: { id: 1, name: "John Smith" } },
  { owner: { id: 2, name: "Sarah Johnson" } }
];
```

## array

Array values render as tag badges (up to three visible, with a "+N" overflow).
Great for tags, skills, and labels.

```js
const columns = [
  { field: "tags", header: "Tags", type: "array" }
];

const rowData = [
  { tags: ["react", "typescript", "node", "graphql"] },
  { tags: ["design", "figma"] }
];
```

## image

Renders the cell value as an `<img>` thumbnail. Use a fixed `width` and a taller
`rowHeight` for best results.

```js
const columns = [
  { field: "avatar", header: "Avatar", type: "image", width: 80 },
  { field: "name",   header: "Name" }
];

const rowData = [
  { avatar: "https://i.pravatar.cc/64?img=1", name: "John Smith" },
  { avatar: "https://i.pravatar.cc/64?img=2", name: "Sarah Johnson" }
];
```

## currency

Currency-formatted numbers. Configure the symbol/format at the grid level with
`currencySymbol` / `currencyFormat`, or use `aggFunc: 'sum'` to total the column
in group rows.

```js
const columns = [
  { field: "price", header: "Price", type: "currency", textAlign: "right",
    aggFunc: "sum", showSummary: true, summaryAggregation: "sum" }
];

const rowData = [
  { price: 1299.5 },
  { price: 49.0 },
  { price: 899.99 }
];
```

```js
// Grid-level currency formatting:
new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  currencySymbol: "$",
  locale: "en-US"
});
```

## percentage

Percentage-formatted numbers. Pair with `aggFunc: 'avg'` to average across a group.

```js
const columns = [
  { field: "margin", header: "Margin", type: "percentage", aggFunc: "avg" }
];

const rowData = [
  { margin: 0.42 },
  { margin: 0.18 }
];
```

## email

Plain email text (kept as-is, not linkified by default). Combine with a
`validatorFn` when editable.

```js
const columns = [
  { field: "email", header: "Email", type: "email", editable: true,
    validatorFn: (v) =>
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v)) ? null : "Invalid email" }
];

const rowData = [
  { email: "john.smith@acme.dev" },
  { email: "sarah@acme.dev" }
];
```

## sparkline

A mini inline chart drawn from an array cell value. Requires a `sparkline`
config. Supports `line`, `area`, `bar`, `column`, `win-loss`, `candlestick`, and
`ohlc` styles.

```js
const columns = [
  { field: "metric", header: "Metric", flex: 1 },
  {
    field: "trend", header: "12-month trend", width: 180,
    type: "sparkline",
    sparkline: { type: "area", stroke: "#2563eb", showMarkers: true, lineWidth: 2 }
  }
];

const rowData = [
  { metric: "Revenue", trend: [12, 18, 9, 22, 31, 27, 40, 38, 52, 61, 55, 70] },
  { metric: "Churn",   trend: [9, 8, 8, 7, 6, 6, 5, 5, 4, 4, 3, 3] }
];
```

See the [Sparklines](../sparklines/overview.md) section for every option.

## custom

Full control — the cell is delegated entirely to your `renderer.display`
function, which returns an `HTMLElement` or HTML string.

```js
const columns = [
  {
    field: "progress", header: "Progress", type: "custom", width: 200,
    renderer: {
      display: (p) => {
        const pct = Math.max(0, Math.min(100, Number(p.value)));
        const bar = document.createElement("div");
        bar.className = "progress";
        bar.innerHTML =
          `<div class="progress__fill" style="width:${pct}%"></div>` +
          `<span class="progress__label">${pct}%</span>`;
        return bar;
      }
    }
  }
];

const rowData = [
  { progress: 72 },
  { progress: 35 }
];
```

See [Column Definitions → Custom rendering](./column-definitions.md#custom-rendering)
for the full `renderer` slot reference.

## Next steps

- [Column Definitions](./column-definitions.md) — the full `ColumnDef` reference.
- [Column Summary](./column-summary.md) — aggregate values with `aggFunc`.
- [Configuration options](../getting-started/configuration-options.md) — grid-level `dateFormat`, `currencySymbol`, `locale`.
