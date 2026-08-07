# Photon Grid — Vue example

<p align="center">
  <img src="../../assets/logo.svg" alt="Photon Grid" width="180"/>
</p>

A runnable Vue 3 + Vite app demonstrating [`photon-grid-vue`](../../packages/photon-grid-vue).

## Run it

From the **repository root** — this builds the core in watch mode alongside the app, so a change to the engine is picked up live:

```bash
npm run setup    # once: installs workspaces + example apps
npm run dev:vue
```

To run only the app against whatever is already built:

```bash
npm --prefix examples/vue run dev
```

Vite prints the local URL it picked.

## Where to look

[`src/App.vue`](src/App.vue) holds the grid: columns, row data, options and the Vue cell renderers passed through the `renderer` slots.
