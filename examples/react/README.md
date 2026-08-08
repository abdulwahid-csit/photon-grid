# Photon Grid — React example

<p align="center">
  <img src="../../assets/logo.svg" alt="Photon Grid" width="180"/>
</p>

A runnable React + Vite app demonstrating [`photon-grid-react`](../../packages/photon-grid-react).

## Run it

From the **repository root** — this builds the core in watch mode alongside the app, so a change to the engine is picked up live:

```bash
npm run setup      # once: installs workspaces + example apps
npm run dev:react
```

To run only the app against whatever is already built:

```bash
npm --prefix examples/react run dev
```

Vite prints the local URL it picked.

## Where to look

[`src/App.tsx`](src/App.tsx) holds the grid: columns, row data, options and the React cell renderers passed through the `renderer` slots.
