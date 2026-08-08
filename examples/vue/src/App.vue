<script setup>
/**
 * Photon Grid — Vue example.
 *
 * Ports every demo from the Angular example. Each one is code-split behind
 * `defineAsyncComponent` and mounted on demand: the grids here range from a
 * 100 000-row client-side dataset to a million-row infinite feed, and mounting
 * them all at once would measure the page rather than the grid.
 */
import { computed, defineAsyncComponent, h, ref } from 'vue';

/** Placeholder shown while a demo chunk is in flight. */
const DemoLoading = () => h('p', { class: 'page__loading' }, 'Loading demo…');

/**
 * Each demo is a multi-root fragment (header + stats + grid), which `<Suspense>`
 * cannot host, so the loading state is handled by the async component itself
 * rather than by a suspense boundary.
 */
const lazyDemo = (loader) => defineAsyncComponent({ loader, loadingComponent: DemoLoading });

const DEMOS = [
  {
    id: 'realtime',
    label: 'Real-Time',
    blurb: 'Viewport Virtual DOM patched cell-by-cell by a simulated market feed.',
    component: lazyDemo(() => import('./demos/RealtimeGrid.vue')),
  },
  {
    id: 'master-detail',
    label: 'Master / Detail',
    blurb: 'Rows expanding into a nested grid or a Vue component, lazily fetched.',
    component: lazyDemo(() => import('./demos/MasterDetailGrid.vue')),
  },
  {
    id: 'infinite',
    label: 'Infinite',
    blurb: 'A million rows behind a mock backend, LRU-cached and skeleton-filled.',
    component: lazyDemo(() => import('./demos/InfiniteGrid.vue')),
  },
  {
    id: 'basic',
    label: 'Basic',
    blurb: '100 000 client-side rows, function cell renderers, toolbar and import.',
    component: lazyDemo(() => import('./demos/BasicGrid.vue')),
  },
  {
    id: 'formula',
    label: 'Formula',
    blurb: 'Excel-style formulas with a live dependency graph.',
    component: lazyDemo(() => import('./demos/FormulaGrid.vue')),
  },
  {
    id: 'server-side',
    label: 'Server-Side & AI Theme',
    blurb: 'Sorting, filtering and paging delegated to a datasource; AI theming.',
    component: lazyDemo(() => import('./demos/ServerSideGrid.vue')),
  },
  {
    id: 'nested-columns',
    label: 'Grouped Headers',
    blurb: 'Multi-row header built from nested column definitions.',
    component: lazyDemo(() => import('./demos/NestedColumnsGrid.vue')),
  },
];

const activeId = ref(DEMOS[0].id);
const active = computed(() => DEMOS.find((demo) => demo.id === activeId.value) ?? DEMOS[0]);
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">Photon Grid — Vue example</h1>
      <p class="page__subtitle">{{ active.blurb }}</p>
    </header>

    <nav class="page__nav" aria-label="Demos">
      <button
        v-for="demo in DEMOS"
        :key="demo.id"
        type="button"
        class="page__nav-item"
        :class="{ 'page__nav-item--on': demo.id === activeId }"
        :aria-current="demo.id === activeId ? 'page' : undefined"
        @click="activeId = demo.id"
      >{{ demo.label }}</button>
    </nav>

    <!-- Keyed on the demo id so switching unmounts the previous grid outright —
         each demo owns timers, datasources and an event-bus subscription that
         must be torn down, not reused. -->
    <component :is="active.component" :key="active.id" />
  </main>
</template>
