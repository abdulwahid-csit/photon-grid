---
title: "Introduction"
description: "Photon Grid — a high-performance, zero-dependency TypeScript data grid engine for Vanilla JS, React, Angular, and Vue."
---

# Introduction

**Photon Grid** is a high-performance, zero-dependency data grid engine written
entirely in TypeScript. It renders millions of rows at a high frame rate through
row and column virtualization, ships with enterprise-grade features out of the
box, and is completely framework-independent — the same engine powers Vanilla
JS, React, Angular, and Vue applications.

The engine is published as [`photon-grid-core`](https://www.npmjs.com/package/photon-grid-core)
and exposes a single entry class, `GridCore`, that mounts into any DOM element.

<LiveGrid preset="quickStart" height={340} title="A real, running Photon Grid — try sorting a column" />

## Why Photon Grid?

- **Zero runtime dependencies** — smaller bundles, faster startup, no version conflicts.
- **Written in TypeScript** — ships with full type declarations, no `@types` package required.
- **Virtualized rendering** — millions of rows and thousands of columns at high FPS.
- **Framework independent** — one engine, first-class wrappers for React, Angular, and Vue.
- **Enterprise features** — sorting, filtering, grouping, pinning, tree data, editing, clipboard, charts, and more.
- **Self-contained styling** — base styles are injected automatically; there is no separate CSS file to import.

## Core capabilities

| Area | Highlights |
|------|------------|
| Rendering | Virtual scrolling, virtual columns, high-FPS repaint, memory efficient |
| Columns | Pinning, resizing, moving, auto-size, groups, custom renderers |
| Rows | Row grouping, tree data, drag & drop, row/range selection |
| Data | Sorting, multi-column sort, filtering, quick filter, pagination |
| Editing | Cell & row editing, validation, clipboard, undo/redo |
| Theming | Light/dark modes, cosmetic variants, custom icons |
| Extensibility | Plugin architecture, event system, fully API-driven |

## Install

Pick your framework — your choice is remembered across the whole documentation.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

Add the bundle from the CDN — no build step required:

```html
<script src="https://cdn.jsdelivr.net/npm/photon-grid-core@latest/photon-grid.min.js"></script>
```

</TabItem>
<TabItem value="react" label="React">

```bash
npm install photon-grid-react photon-grid-core
```

</TabItem>
<TabItem value="angular" label="Angular">

```bash
npm install photon-grid-angular photon-grid-core
```

</TabItem>
<TabItem value="vue" label="Vue">

```bash
npm install photon-grid-vue photon-grid-core
```

</TabItem>
</FrameworkTabs>

See the [Installation](./installation.md) guide for the full setup, or jump
straight to [Configuration options](./configuration-options.md) for the complete
list of grid settings.

## Framework independence

Photon Grid Core is the engine; the framework wrappers are thin adapters that
mount `GridCore` into a component and forward your `columns`, `data`, and
`options`. Column definitions and row data are **plain objects that are
identical across every framework**, so you can move between Vanilla JS, React,
Angular, and Vue without rewriting your grid configuration.

## Browser support

Photon Grid supports all modern browsers — Chrome, Edge, Firefox, and Safari.

## Next steps

- [Demo](./demo.md) — see Photon Grid in action with live, interactive grids.
- [Installation](./installation.md) — add Photon Grid to your project.
- [Configuration options](./configuration-options.md) — every grid option, explained.
