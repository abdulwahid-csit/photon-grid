# Photon Grid — Angular example

<p align="center">
  <img src="../../assets/logo.svg" alt="Photon Grid" width="180"/>
</p>

A runnable Angular 18 app demonstrating [`photon-grid-angular`](../../packages/photon-grid-angular): the editor showcase, renderer showcase, master/detail, summary rows, infinite scrolling, a scheduler plugin, and a 100-column × 1,000,000-row spreadsheet.

## Run it

From the **repository root** — this builds the core and the Angular wrapper in watch mode alongside the app, so a change to either is picked up live:

```bash
npm run setup        # once: installs workspaces + example apps
npm run dev:angular
```

Then open http://localhost:5000.

To run only the app against whatever is already built:

```bash
npm --prefix examples/angular start
```

## Switching demos

Each demo is one component, toggled by commenting it in or out in
[`src/app/app.component.html`](src/app/app.component.html).

## How it resolves the packages

[`tsconfig.json`](tsconfig.json) maps `photon-grid-core` and `photon-grid-angular` to each package's **`dist`** folder — so after changing library source you must rebuild (`npm run build:core`, `npm run build:angular`), or use `npm run dev:angular`, which watches both for you.
