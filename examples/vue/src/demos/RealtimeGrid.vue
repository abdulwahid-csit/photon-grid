<script setup>
/**
 * Real-time streaming demo for the viewport Virtual DOM.
 *
 * A simulated market feed mutates a slice of rows on every tick. Instead of
 * re-running the row pipeline and rebuilding rows, the component hands the
 * changed fields to `GridApi.applyCellUpdates`: the grid diffs the rendered
 * window against its virtual mirror and writes only the cells whose values
 * actually moved.
 *
 * What to look for while it runs:
 * - The **Instrument** column never repaints — the feed never touches it.
 * - Scrolling stays smooth at full tick rate, because the diff is bounded by
 *   the viewport rather than by the dataset.
 * - Select a range, hover a row, or open an editor: none of it is disturbed by
 *   the stream, because no cell element is ever replaced.
 *
 * Vue specifics: the feed writes through the grid's imperative API, never
 * through reactive state, so a 60 Hz stream triggers **zero** Vue re-renders.
 * The tick array is deliberately held in a plain `const` (not `ref`/`reactive`)
 * — wrapping 100 mutating rows in a reactive proxy would tax every field write
 * for no benefit, since the grid, not Vue, renders them.
 */
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue';

import PhotonGrid from 'photon-grid-vue';
import { GridEventType, PhotonAIProviderType } from 'photon-grid-core';

import { environment } from '../environment';
import {
  advanceTick,
  buildColumns,
  buildTicks,
  EMPTY_VDOM_STATS,
  RATES,
  ROWS_PER_TICK,
} from '../lib/realtime';
import './demos.css';

const rowsPerTick = ROWS_PER_TICK;
const rates = RATES;

const ticks = buildTicks();
const columns = buildColumns();

const options = {
  rowHeight: 40,
  showSerialNumber: false,
  showVerticalBorders: false,
  rowShading: false,
  mode: 'dark',
  variant: 'quantum',
  showGroupingBar: true,
  photonAI: {
    enabled: true,
    provider: {
      // Groq exposes an OpenAI-compatible Chat Completions API, so the built-in
      // OpenAI preset works as-is — just point `apiUrl` at Groq and supply a
      // Groq key + model. No custom transformers needed.
      type: PhotonAIProviderType.OpenAI,
      apiKey: environment.groqApiKey,
      apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
    },
  },
  rowMenu: {},
};

const intervalMs = ref(50);
const running = ref(false);
const updatesPushed = ref(0);
const fps = ref(60);
const lastMenuAction = ref('—');
// `shallowRef`: the stats object is replaced wholesale each second, and its
// fields are never mutated in place, so deep reactivity would only cost proxies.
const stats = shallowRef(EMPTY_VDOM_STATS);

let api = null;
let disposers = [];
let cursor = 0;
let pushed = 0;
let feedHandle = null;
let statsHandle = null;
let frameHandle = 0;
let frameCount = 0;
let lastFpsSample = 0;

const writtenRatio = () => (stats.value.cellsCompared === 0
  ? '0.0'
  : ((stats.value.cellsPatched / stats.value.cellsCompared) * 100).toFixed(1));

function onGridReady(gridApi) {
  api = gridApi;

  // Menu activations are published on the event bus, covering the built-in
  // entries as well as any custom ones — useful for logging or analytics
  // without touching every item definition.
  disposers.push(api.on(GridEventType.ROW_MENU_ITEM_CLICKED, (e) =>
    console.log('[row menu]', e.custom ? 'custom' : 'built-in', e.itemId, e.row?.data)));

  // A rejected async action leaves the menu open and reports here, so an
  // application can surface a toast instead of failing silently.
  disposers.push(api.on(GridEventType.ROW_MENU_ITEM_ERROR, (e) => {
    lastMenuAction.value = `✕ ${String(e.error?.message ?? e.itemId)}`;
  }));

  running.value = true;
}

/** Produces one batch of updates and hands it to the grid in a single call. */
function pushTick() {
  if (!api) return;

  const updates = [];
  for (let i = 0; i < ROWS_PER_TICK; i++) {
    updates.push(advanceTick(ticks[cursor]));
    cursor = (cursor + 1) % ticks.length;
  }

  api.applyCellUpdates(updates);
  pushed += updates.length;
}

/** Copies the grid's counters into the view and samples the frame rate. */
function pullStats() {
  if (!api) return;
  stats.value = api.getVDomStats();
  updatesPushed.value = pushed;

  const now = performance.now();
  const elapsed = now - lastFpsSample;
  if (elapsed > 0) {
    fps.value = Math.round((frameCount * 1000) / elapsed);
    frameCount = 0;
    lastFpsSample = now;
  }
}

function start() {
  stop();

  feedHandle = setInterval(pushTick, intervalMs.value);

  lastFpsSample = performance.now();
  frameCount = 0;
  const sampleFrame = () => {
    frameCount++;
    frameHandle = requestAnimationFrame(sampleFrame);
  };
  frameHandle = requestAnimationFrame(sampleFrame);

  // Stats are display-only, so they re-enter Vue once a second rather than on
  // every tick.
  statsHandle = setInterval(pullStats, 1000);
}

function stop() {
  if (feedHandle !== null) { clearInterval(feedHandle); feedHandle = null; }
  if (statsHandle !== null) { clearInterval(statsHandle); statsHandle = null; }
  if (frameHandle !== 0) { cancelAnimationFrame(frameHandle); frameHandle = 0; }
}

function resetStats() {
  pushed = 0;
  updatesPushed.value = 0;
  api?.resetVDomStats();
  stats.value = api?.getVDomStats() ?? EMPTY_VDOM_STATS;
}

// One watcher covers both switches: toggling the feed and changing its rate
// both mean "tear the current interval down and (maybe) start a new one".
watch([running, intervalMs], () => {
  if (running.value) start();
  else stop();
});

onBeforeUnmount(() => {
  stop();
  for (const dispose of disposers) dispose();
  disposers = [];
  api = null;
});
</script>

<template>
  <header class="demo__header">
    <div>
      <h2 class="demo__title">Real-Time Virtual DOM</h2>
      <p class="demo__subtitle">
        A simulated market feed updating <strong>{{ rowsPerTick }}</strong> rows every
        <strong>{{ intervalMs }} ms</strong> through <code>api.applyCellUpdates()</code>. Only the
        cells whose values changed are written to the DOM — rows are never rebuilt, so selection,
        hover and open editors survive the stream.
      </p>
    </div>

    <div class="demo__controls">
      <button type="button" class="demo__btn" @click="running = !running">
        {{ running ? 'Pause feed' : 'Start feed' }}
      </button>
      <button type="button" class="demo__btn demo__btn--ghost" @click="resetStats">
        Reset stats
      </button>
      <label class="demo__rate">
        Rate
        <select :value="intervalMs" @change="intervalMs = Number($event.target.value)">
          <option v-for="rate in rates" :key="rate.value" :value="rate.value">{{ rate.label }}</option>
        </select>
      </label>
    </div>
  </header>

  <dl class="demo__stats">
    <div class="demo__stat"><dt>Updates pushed</dt><dd>{{ updatesPushed.toLocaleString() }}</dd></div>
    <div class="demo__stat"><dt>Cells compared</dt><dd>{{ stats.cellsCompared.toLocaleString() }}</dd></div>
    <div class="demo__stat demo__stat--accent"><dt>Cells written</dt><dd>{{ stats.cellsPatched.toLocaleString() }}</dd></div>
    <div class="demo__stat"><dt>Written / compared</dt><dd>{{ writtenRatio() }}%</dd></div>
    <div class="demo__stat"><dt>Tracked cells</dt><dd>{{ stats.trackedCells.toLocaleString() }}</dd></div>
    <div class="demo__stat"><dt>Last flush</dt><dd>{{ stats.lastFlushMs.toFixed(2) }} ms</dd></div>
    <div class="demo__stat" :class="{ 'demo__stat--warn': fps < 50 }"><dt>FPS</dt><dd>{{ fps }}</dd></div>
    <div class="demo__stat demo__stat--wide">
      <dt>Last row-menu action</dt>
      <dd class="demo__stat-text">{{ lastMenuAction }}</dd>
    </div>
  </dl>

  <section class="demo__grid">
    <PhotonGrid :columns="columns" :data-set="ticks" :options="options" @grid-ready="onGridReady" />
  </section>
</template>
