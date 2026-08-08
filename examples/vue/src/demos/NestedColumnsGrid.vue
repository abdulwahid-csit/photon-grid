<script setup>
/**
 * Grouped (nested) column headers over a market-data board.
 *
 * Column groups are **auto-detected**: any column definition carrying
 * `children` becomes a group header spanning them, so the multi-row header, its
 * collapse/expand affordances and the group state serialization all come from
 * the same column definitions a flat grid uses. Groups nest arbitrarily deep,
 * and ungrouped columns (Exchange, Country, Currency) sit alongside them in the
 * same header.
 *
 * Also on: row grouping (drag `Sector` into the grouping bar), managed row drag,
 * and the filters tool panel.
 */
import PhotonGrid from 'photon-grid-vue';
import { PhotonAIProviderType } from 'photon-grid-core';

import { environment } from '../environment';
import { buildColumns, generateData } from '../lib/nested-columns';
import './demos.css';

// Plain consts, not refs: neither the board nor its columns ever change, and a
// reactive proxy over 100 rows × 21 fields would cost more than it buys.
const data = generateData();
const columns = buildColumns();

const options = {
  rowHeight: 40,
  showSerialNumber: true,
  showVerticalBorders: false,
  rowShading: false,
  rowDrag: { managed: true },
  filtersToolPanel: { enabled: true, defaultOpen: false },
  showGroupingBar: true,
  grouping: { enabled: true, showGroupCount: true, suppressAutoSize: true },
  mode: 'light',
  photonAI: {
    enabled: true,
    provider: {
      type: PhotonAIProviderType.OpenAI,
      apiKey: environment.groqApiKey,
      apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
    },
  },
};
</script>

<template>
  <header class="demo__header">
    <div>
      <h2 class="demo__title">Grouped Column Headers</h2>
      <p class="demo__subtitle">
        A market-data board whose header is built from nested column definitions: any column
        carrying <code>children</code> becomes a group spanning them. Groups collapse and expand,
        mix freely with ungrouped columns, and serialize with the rest of the column state. Drag
        <strong>Sector</strong> into the grouping bar to row-group as well.
      </p>
    </div>
  </header>

  <section class="demo__grid">
    <PhotonGrid :columns="columns" :data-set="data" :options="options" />
  </section>
</template>
