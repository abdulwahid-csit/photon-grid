# Photon Grid Core

<p align="center">
  <img src="https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/photon-grid/main/assets/logo.png" alt="Photon Grid" width="180"/>
</p>

<p align="center">
    <strong>A high-performance, zero-dependency TypeScript data grid engine.</strong>
</p>

<p align="center">

![npm](https://img.shields.io/npm/v/photon-grid-core)
![license](https://img.shields.io/npm/l/photon-grid-core)
![typescript](https://img.shields.io/badge/TypeScript-5.x-blue)
![dependencies](https://img.shields.io/badge/dependencies-0-success)

</p>

---

## Overview

Photon Grid Core is the rendering and data engine that powers the Photon Grid ecosystem.

It provides an extremely fast, modular, framework-independent grid implementation written entirely in TypeScript with **zero runtime dependencies**.

This package is intended for:

- JavaScript applications
- TypeScript applications
- Framework wrappers
- Custom UI frameworks
- Internal rendering engines

If you're looking for Angular, React, or Vue integration, use the corresponding Photon Grid wrapper package instead.

---

# Features

- Zero runtime dependencies
- Written entirely in TypeScript
- High performance rendering engine
- Virtual Scrolling
- Virtual Columns
- Millions of rows support
- Column Pinning
- Column Resizing
- Column Moving
- Column Auto Size
- Cell Selection
- Range Selection
- Clipboard Support
- Keyboard Navigation
- Mouse Navigation
- Tree Data
- Row Grouping
- Sorting
- Multi Column Sorting
- Filtering
- Quick Filtering
- Custom Cell Renderers
- Custom Header Renderers
- Context Menu
- Custom Context Menu
- Pagination
- Status Bar
- Tool Panels
- Theme Support
- Plugin Architecture
- Event System
- API Driven
- High FPS Rendering
- Memory Efficient
- Zero Framework Lock-in

---

# Installation

```bash
npm install photon-grid-core
```

or

```bash
yarn add photon-grid-core
```

or

```bash
pnpm add photon-grid-core
```

---

# Basic Usage

```ts
import { PhotonGrid } from "photon-grid-core";

const grid = new PhotonGrid({
    element: document.getElementById("grid"),
    columns: [],
    rowData: []
});

grid.render();
```

---

# Package Structure

```
photon-grid-core
│
├── api
├── core
├── chart
├── clipboard
├── column
├── context-menu
├── datasource
├── events
├── export
├── filter
├── grouping
├── header
├── keyboard
├── menu
├── overlay
├── pagination
├── renderer
├── row
├── selection
├── sorting
├── statusbar
├── theme
├── tree
├── utils
└── index.ts
```

---

# Why Photon Grid?

Photon Grid was designed from the ground up to compete with enterprise-grade grid libraries while remaining lightweight and fully extensible.

Goals include:

- Better developer experience
- Modern TypeScript architecture
- Framework independent
- Fast rendering
- Modular design
- Simple API
- Enterprise capabilities

---

# Browser Support

Supports all modern browsers.

- Chrome
- Edge
- Firefox
- Safari

---

# TypeScript

Photon Grid Core is written in TypeScript and ships with built-in declaration files.

No additional typings are required.

---

# Zero Dependencies

Photon Grid Core intentionally avoids runtime dependencies.

Benefits include:

- Smaller bundle size
- Faster startup
- Better tree shaking
- No dependency conflicts
- Easier upgrades

---

# Performance

Photon Grid is optimized for very large datasets using virtualization.

Typical capabilities include:

- Millions of rows
- Thousands of columns
- High FPS scrolling
- Low memory usage

Actual performance depends on browser, hardware, and enabled features.

---

# Framework Wrappers

Photon Grid Core is the engine behind upcoming framework integrations.

Planned packages include:

- photon-grid-angular
- photon-grid-react
- photon-grid-vue
- photon-grid-svelte

---

# Roadmap

Upcoming features include:

- Pivot Tables
- Excel Export
- CSV Export
- Server Side Row Model
- Infinite Row Model
- Master Detail
- Charts
- Sparklines
- Formula Engine
- Undo / Redo
- Aggregations
- Advanced Filtering
- AI Assisted Grid Operations
- Theme Builder

---

# Contributing

Contributions are welcome.

Please submit issues, feature requests, or pull requests through GitHub.

---

# License

MIT License

---

# Author

**Abdul Wahid**

---

# Links

GitHub

https://github.com/YOUR_GITHUB_USERNAME/photon-grid

Issues

https://github.com/YOUR_GITHUB_USERNAME/photon-grid/issues

NPM

https://www.npmjs.com/package/photon-grid-core

---

## Philosophy

Photon Grid is built around a few simple principles.

- Performance first.
- Zero unnecessary dependencies.
- Framework independence.
- Extensible architecture.
- Excellent developer experience.
- Enterprise-grade capabilities.

---

## Status

Photon Grid is under active development.

New features, performance improvements, and framework integrations are added regularly.

If you encounter any issues or have feature requests, please open an issue on GitHub.

⭐ If you find Photon Grid useful, consider starring the repository.